'use server';
import { hashUserPassword, verifyPassword } from "@/lib/auth/hash";
import {  redirect } from "next/navigation";
import getUserByEmail from "@/lib/controllers/users/getUserByEmail";
import { generateCode, generateLink } from "@/lib/auth/verificationActions";
import { updateUserPasswordById } from "../controllers/users/updateUserPasswordById";
import { MailTypes, sendEmailByType } from "@/lib/services/mail/sendMail";
import { destroySession, verifyAuth } from "@/lib/auth/auth";
import verifyToken from "@/lib/controllers/users/verifyToken";
import VerificationCode from "@/database/models/VerificationCode";
import sequelizeConnection from "@/db_connection";
import { headers } from "next/headers";
import { checkRateLimit, resetRateLimit } from "@/lib/auth/rateLimiter";
import { logSecurityEvent } from "@/lib/services/logging/logSecurityEvent";
import { validatePassword } from "@/utils/passwordValidation";
import { getSettings } from "@/lib/services/settings/settingsStore";

function readLockoutPolicy() {
    const s = getSettings()?.security || {};
    const attempts = Number(s.maxLoginAttempts);
    const minutes  = Number(s.lockoutDurationMinutes);
    return {
        maxAttempts: Number.isFinite(attempts) && attempts >= 1 ? attempts : 3,
        durationMs: (Number.isFinite(minutes) && minutes >= 1 ? minutes : 15) * 60 * 1000,
        durationMinutes: Number.isFinite(minutes) && minutes >= 1 ? minutes : 15,
    };
}

function formatDuration(minutes) {
    if (minutes >= 60 && minutes % 60 === 0) {
        const h = minutes / 60;
        return h === 1 ? '1 hour' : `${h} hours`;
    }
    return minutes === 1 ? '1 minute' : `${minutes} minutes`;
}

export async function login(formData) {
    const email = formData.get('email');
    const password = formData.get('password');

    // Extract request context once — headers() only works at the top level of a server action
    const headersList = await headers();
    const ip = headersList.get('x-forwarded-for')?.split(',')[0]?.trim()
        || headersList.get('x-real-ip')
        || 'unknown';
    const browserInfo = headersList.get('user-agent') || '';

    const { maxAttempts, durationMs, durationMinutes } = readLockoutPolicy();
    const durationLabel = formatDuration(durationMinutes);

    // Per-IP throttle — runs BEFORE the user lookup so an attacker typing
    // random emails from one machine hits the same wall as one hammering
    // a single real account. Uses the admin's configured policy so it
    // stays in step with the per-account lockout. Reset on a successful
    // password verify below so shared-IP colleagues aren't penalised.
    const ipRateKey = `login-ip:${ip}`;
    const ipCheck = checkRateLimit(ipRateKey, maxAttempts, durationMs);
    if (ipCheck.limited) {
        await logSecurityEvent({ action: 'LoginRateLimitedByIp', userName: email || '', ip, browserInfo });
        return {
            errors: {
                email: `You've reached ${maxAttempts} failed attempts. Try again in ${durationLabel}.`,
            },
        };
    }

    const existingUser = await getUserByEmail(email);

    if (!existingUser) {
        return { errors: { email: 'Could not authenticate user, please check your credentials.'}};
    }

    // Admin-authoritative lockout window: recompute the effective unlock
    // time from `lockout_started_at + current_admin_duration` on every
    // login check. Dropping the admin setting immediately shortens live
    // locks; raising it lengthens them. `lockout_until` is still written
    // so old queries that read it aren't broken, but this branch is the
    // source of truth.
    if (existingUser.is_locked_out) {
        const startedAt = existingUser.lockout_started_at
            ? new Date(existingUser.lockout_started_at)
            // Older rows don't have started_at — fall back to `until - duration`
            // if we have `until`; otherwise treat as "just locked" so admin
            // change still applies going forward.
            : (existingUser.lockout_until
                ? new Date(new Date(existingUser.lockout_until).getTime() - durationMs)
                : new Date());
        const effectiveUntil = new Date(startedAt.getTime() + durationMs);
        const now = new Date();
        if (now >= effectiveUntil) {
            await sequelizeConnection.query(
                `UPDATE users SET is_locked_out = false, failed_login_attempts = 0, lockout_until = NULL, lockout_started_at = NULL WHERE id = :id`,
                { replacements: { id: existingUser.id } }
            );
            existingUser.is_locked_out = false;
        } else {
            // Keep lockout_until in sync with the admin-driven window so
            // any UI reading it shows the correct remaining time.
            if (!existingUser.lockout_until || Math.abs(new Date(existingUser.lockout_until).getTime() - effectiveUntil.getTime()) > 1000) {
                await sequelizeConnection.query(
                    `UPDATE users SET lockout_until = :until WHERE id = :id`,
                    { replacements: { id: existingUser.id, until: effectiveUntil } }
                );
                existingUser.lockout_until = effectiveUntil;
            }
        }
    }

    // Block still-locked accounts
    if (existingUser.is_locked_out) {
        await logSecurityEvent({ action: 'LoginAttemptWhileLocked', userId: existingUser.id, userName: existingUser.email, ip, browserInfo });
        return {
            errors: {
                email: `You've reached ${maxAttempts} failed attempts. Try again in ${durationLabel}.`,
            },
        };
    }

    try {
        const isValidPassword = verifyPassword(existingUser.password, password);

        if (!isValidPassword) {
            // Atomically increment and return the new count in one query
            const [rows] = await sequelizeConnection.query(
                `UPDATE users SET failed_login_attempts = failed_login_attempts + 1 WHERE id = :id RETURNING failed_login_attempts`,
                { replacements: { id: existingUser.id } }
            );
            const attempts = rows[0]?.failed_login_attempts ?? 1;

            if (attempts >= maxAttempts) {
                const startedAt = new Date();
                const lockoutUntil = new Date(startedAt.getTime() + durationMs);
                await sequelizeConnection.query(
                    `UPDATE users SET is_locked_out = true, lockout_started_at = :startedAt, lockout_until = :lockoutUntil WHERE id = :id`,
                    { replacements: { id: existingUser.id, startedAt, lockoutUntil } }
                );
                await logSecurityEvent({ action: 'AccountLocked', userId: existingUser.id, userName: existingUser.email, ip, browserInfo, extra: { attempts, maxAttempts, durationMinutes } });
                return {
                    errors: {
                        email: `You've reached ${maxAttempts} failed attempts. Try again in ${durationLabel}.`,
                    },
                };
            }

            // Deliberately generic — no "N attempts remaining" hint. That
            // would tell an attacker how close they are to being locked
            // out, which is useful signal for them and no help to a real
            // user who just knows they typed the wrong password.
            const remaining = Math.max(0, maxAttempts - attempts);
            await logSecurityEvent({ action: 'LoginFailed', userId: existingUser.id, userName: existingUser.email, ip, browserInfo, extra: { attempts, remaining } });
            return {
                errors: {
                    password: 'Could not authenticate user, please check your credentials.',
                },
            };
        }

        // Successful login — reset failed attempts + lockout metadata.
        await sequelizeConnection.query(
            `UPDATE users SET failed_login_attempts = 0, is_locked_out = false, lockout_until = NULL, lockout_started_at = NULL WHERE id = :id`,
            { replacements: { id: existingUser.id } }
        );

        // Clear the per-IP counter too — otherwise a legitimate user on a
        // shared IP whose colleagues previously fat-fingered their password
        // would still be one step from a lockout on their next sign-in.
        resetRateLimit(ipRateKey);

        if (existingUser.totp_enabled) {
            await logSecurityEvent({ action: 'LoginRequires2FA', userId: existingUser.id, userName: existingUser.email, ip, browserInfo });
            return {
                require2FA: true,
                user: {
                    id: existingUser.id,
                    email: existingUser.email,
                },
            };
        }

        // Password OK but 2FA not yet set up — force setup before session.
        await logSecurityEvent({ action: 'LoginRequires2FASetup', userId: existingUser.id, userName: existingUser.email, ip, browserInfo });
        return {
            requireSetup2FA: true,
            user: {
                id: existingUser.id,
                email: existingUser.email,
            },
        };

    } catch (error) {
        return {
            errors: {
                password: 'Authentication request cannot be completed.',
            },
        };
    }
}

export async function forgotPassword(formData) {
    // Rate limit: max 5 requests per IP per hour
    const headersList = await headers();
    const ip = headersList.get('x-forwarded-for')?.split(',')[0]?.trim()
        || headersList.get('x-real-ip')
        || 'unknown';

    const { limited, retryAfterMs } = checkRateLimit(`forgot-password:${ip}`, 5, 60 * 60 * 1000);

    if (limited) {
        const minutes = Math.ceil(retryAfterMs / 60000);
        return {
            success: false,
            message: `Too many requests. Please try again in ${minutes} minute${minutes !== 1 ? 's' : ''}.`,
        };
    }

    const email = formData.get('email');

    try {
        const existingUser = await getUserByEmail(email);

        // Only send the email if the account exists — never reveal which case this is
        if (existingUser) {
            await generateLink(existingUser.id, existingUser.email);
            await logSecurityEvent({ action: 'PasswordResetRequested', userId: existingUser.id, userName: existingUser.email, ip, browserInfo: '' });
        }

        // Always return success to prevent user enumeration
        return { success: true };
    } catch (error) {
        // Still return generic success — don't leak internal errors to the client
        return { success: true };
    }
}

export async function resetPassword(formData) {
    const password = formData.get('password');
    const token = formData.get('token');

    const passwordError = validatePassword(password);
    if (passwordError) {
        return { success: false, message: passwordError };
    }

    const validToken = await verifyToken(token);

    if (!validToken.success) {
        return {
            success: false,
            message: validToken.message || 'Invalid or expired token.',
        };
    }

    try {
        const user = await sequelizeConnection.query(
            `SELECT id, email, email_confirmed FROM users WHERE id = :id LIMIT 1`,
            { replacements: { id: validToken.userId }, type: 'SELECT' }
        );
        const existingUser = user?.[0];

        const isFirstTimeSetup = existingUser && !existingUser.email_confirmed;

        const hashedPassword = hashUserPassword(password);
        await updateUserPasswordById(validToken.userId, hashedPassword);

        // Mark email as confirmed AND clear any lockout state — proving the
        // reset link's ownership of the account is a stronger signal than
        // the prior failed-attempt count, so the user should be able to log
        // in immediately with the new password. Without this, a user who
        // resets while locked out sees "account suspended" on the very
        // next login attempt and reads it as "incorrect password".
        await sequelizeConnection.query(
            `UPDATE users SET email_confirmed = true, is_locked_out = false, failed_login_attempts = 0, lockout_until = NULL, lockout_started_at = NULL WHERE id = :id`,
            { replacements: { id: validToken.userId } }
        );

        await VerificationCode.destroy({ where: { code: token } });
        await logSecurityEvent({
            action: isFirstTimeSetup ? 'AccountActivated' : 'PasswordReset',
            userId: validToken.userId,
            userName: existingUser?.email,
        });

        // Send welcome/confirmation email only on first-time account setup
        if (isFirstTimeSetup && existingUser?.email) {
            try {
                await sendEmailByType(MailTypes.WELCOME, existingUser.email, {
                    baseUrl: process.env.NODE_ENV === 'production' ? (process.env.NEXT_PUBLIC_BASE_URL || '').replace(/^http:\/\//, 'https://') : (process.env.NEXT_PUBLIC_BASE_URL || ''),
                });
            } catch {
                // Don't fail the reset if the welcome email fails
            }
        }

        return { success: true };
    } catch (error) {
        return {
            success: false,
            message: 'An error occurred while resetting the password.',
        };
    }
}

export async function logout() {
    let ip = 'unknown', browserInfo = '';
    try {
        const headersList = await headers();
        ip = headersList.get('x-forwarded-for')?.split(',')[0]?.trim() || headersList.get('x-real-ip') || 'unknown';
        browserInfo = headersList.get('user-agent') || '';
    } catch { /* non-fatal */ }
    try {
        const { user } = await verifyAuth();
        if (user) {
            await logSecurityEvent({ action: 'Logout', userId: user.id, userName: user.username || user.email, ip, browserInfo });
        }
    } catch { /* non-fatal */ }
    await destroySession();
    redirect('/');
}