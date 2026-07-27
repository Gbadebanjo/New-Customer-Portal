'use server';
import { hashUserPassword, verifyPassword, isLegacyPasswordHash } from "@/lib/auth/hash";
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
import { checkRateLimit } from "@/lib/auth/rateLimiter";
import { logSecurityEvent } from "@/lib/services/logging/logSecurityEvent";
import { validatePassword } from "@/utils/passwordValidation";

const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 60 * 60 * 1000; // 1 hour

export async function login(formData) {
    const email = formData.get('email');
    const password = formData.get('password');

    // Extract request context once — headers() only works at the top level of a server action
    const headersList = await headers();
    const ip = headersList.get('x-forwarded-for')?.split(',')[0]?.trim()
        || headersList.get('x-real-ip')
        || 'unknown';
    const browserInfo = headersList.get('user-agent') || '';

    const existingUser = await getUserByEmail(email);

    if (!existingUser) {
        return { errors: { email: 'Could not authenticate user, please check your credentials.'}};
    }

    // Auto-unlock if lockout period has expired
    if (existingUser.is_locked_out && existingUser.lockout_until) {
        if (new Date() >= new Date(existingUser.lockout_until)) {
            await sequelizeConnection.query(
                `UPDATE users SET is_locked_out = false, failed_login_attempts = 0, lockout_until = NULL WHERE id = :id`,
                { replacements: { id: existingUser.id } }
            );
            existingUser.is_locked_out = false;
        }
    }

    // Block still-locked accounts
    if (existingUser.is_locked_out) {
        await logSecurityEvent({ action: 'LoginAttemptWhileLocked', userId: existingUser.id, userName: existingUser.email, ip, browserInfo });
        return {
            errors: {
                email: `Your account is suspended due to too many failed login attempts. It will automatically unlock in an hour.`,
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

            if (attempts >= MAX_FAILED_ATTEMPTS) {
                const lockoutUntil = new Date(Date.now() + LOCKOUT_DURATION_MS);
                await sequelizeConnection.query(
                    `UPDATE users SET is_locked_out = true, lockout_until = :lockoutUntil WHERE id = :id`,
                    { replacements: { id: existingUser.id, lockoutUntil } }
                );
                await logSecurityEvent({ action: 'AccountLocked', userId: existingUser.id, userName: existingUser.email, ip, browserInfo, extra: { attempts } });
                return {
                    errors: {
                        email: 'Your account has been suspended after 5 failed login attempts. It will automatically unlock in 1 hour.',
                    },
                };
            }

            await logSecurityEvent({ action: 'LoginFailed', userId: existingUser.id, userName: existingUser.email, ip, browserInfo, extra: { attempts } });
            return {
                errors: {
                    password: 'Could not authenticate user, please check your credentials.',
                },
            };
        }

        // Successful login — reset failed attempts
        await sequelizeConnection.query(
            `UPDATE users SET failed_login_attempts = 0, is_locked_out = false, lockout_until = NULL WHERE id = :id`,
            { replacements: { id: existingUser.id } }
        );

        // Transparently upgrade migrated (ASP.NET Identity) hashes to our own
        // format now that we've verified the plaintext password against them.
        if (isLegacyPasswordHash(existingUser.password)) {
            const upgradedHash = hashUserPassword(password);
            await sequelizeConnection.query(
                `UPDATE users SET password = :upgradedHash WHERE id = :id`,
                { replacements: { id: existingUser.id, upgradedHash } }
            );
        }

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

        // No 2FA → email verification
        await generateCode(existingUser.id, existingUser.email);
        await logSecurityEvent({ action: 'LoginSucceeded', userId: existingUser.id, userName: existingUser.email, ip, browserInfo });

        return {
            success: true,
            user: {
                id: existingUser.id,
                email: existingUser.email,
                totp_enabled: false,
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

        // Mark email as confirmed
        await sequelizeConnection.query(
            `UPDATE users SET email_confirmed = true WHERE id = :id`,
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