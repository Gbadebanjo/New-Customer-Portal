'use client';
import { useEffect, useRef, useState, useTransition } from 'react';
import Image from 'next/image';
import classes from './login.module.css';
import Link from "next/link";
import { login } from "@/lib/auth/authActions";
import { generateCode } from "@/lib/auth/verificationActions";
import verify2FA from "@/lib/controllers/users/verify2FA";
import startEnable2FA from "@/lib/controllers/users/startEnable2FA";
import enable2FAAndLogin from "@/lib/controllers/users/enable2FAAndLogin";
import { useRouter } from 'next/navigation';
import { CustomerConstants } from "@/utils/constants";
import WarnCircleBigIcon from "@/components/ui/icons/WarnCircleBigIcon";
import { ButtonSaveSubmit } from "@/components/ui/ButtonSaveAndSubmit/ButtonSaveAndSubmit";
import { ButtonDefault } from "@/components/ui/ButtonDefault/ButtonDefault";
import CustomTextField from '@/components/ui/CustomTextField/CustomTextInput';
import CopyRight from '@/components/ui/CopyRight/copyright';
import { useUser } from '@/components/Context/userContext';

function LoginScreen() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [isPending, startTransition] = useTransition();
    const [isCustomAlertModalOpen, setIsCustomAlertModalOpen] = useState(false);
    const [alertMessage, setAlertMessage] = useState('');
    const customAlertPopupRef = useRef(null);
    const router = useRouter();
    const { setUser } = useUser();

    // 2FA step state — 'credentials' | '2fa' | 'setup2FA'
    const [step, setStep] = useState('credentials');
    const [pendingUserId, setPendingUserId] = useState('');
    const [pendingEmail, setPendingEmail] = useState('');
    const [totpCode, setTotpCode] = useState('');
    const [isVerifying, setIsVerifying] = useState(false);

    // First-time setup state
    const [setupQr, setSetupQr] = useState('');
    const [setupSecret, setSetupSecret] = useState('');
    const [setupCode, setSetupCode] = useState('');
    const [setupLoading, setSetupLoading] = useState(false);
    const [setupError, setSetupError] = useState('');
    const [setupCopied, setSetupCopied] = useState(false);

    useEffect(() => {
        if (isCustomAlertModalOpen) {
            customAlertPopupRef.current.showModal();
        } else {
            customAlertPopupRef.current.close();
        }
    }, [isCustomAlertModalOpen]);

    const openCustomAlertPopup = (msg) => {
        setAlertMessage(msg);
        setIsCustomAlertModalOpen(true);
    };

    const closeCustomAlertModal = () => {
        setIsCustomAlertModalOpen(false);
    };

    const handleLogin = (e) => {
        e.preventDefault();

        if (
            email.length < CustomerConstants.CompanyNameMinLength ||
            email.length > CustomerConstants.CompanyNameMaxLength ||
            password.length < CustomerConstants.CompanyNameMinLength ||
            password.length > CustomerConstants.CompanyNameMaxLength
        ) {
            openCustomAlertPopup('Invalid credentials');
            return;
        }

        const formData = new FormData();
        formData.append("email", email);
        formData.append("password", password);

        startTransition(async () => {
            const result = await login(formData);
            if (result?.errors) {
                const errorMessage = result.errors.email || result.errors.password || "Login failed.";
                openCustomAlertPopup(errorMessage);
            } else if (result.require2FA) {
                setPendingUserId(result.user.id);
                setPendingEmail(result.user.email);
                setStep('2fa');
            } else if (result.requireSetup2FA) {
                setPendingUserId(result.user.id);
                setPendingEmail(result.user.email);
                setStep('setup2FA');
                setSetupError('');
                setSetupLoading(true);
                try {
                    const data = await startEnable2FA(result.user.id);
                    setSetupQr(data.qrDataUrl);
                    setSetupSecret(data.secret || '');
                } catch {
                    setSetupError('Could not start 2FA setup. Please try again.');
                } finally {
                    setSetupLoading(false);
                }
            }
        });
    };

    const handleConfirmSetup2FA = async (e) => {
        e.preventDefault();
        if (setupCode.length !== 6) {
            setSetupError('Enter the 6-digit code from your authenticator app.');
            return;
        }
        setSetupLoading(true);
        setSetupError('');
        try {
            const res = await enable2FAAndLogin(pendingUserId, setupCode.trim());
            if (!res?.success) {
                setSetupError(res?.message || 'Verification failed.');
                setSetupLoading(false);
                return;
            }
            if (res.user) setUser(res.user);
            router.push(res.redirectTo || '/dashboard');
        } catch {
            setSetupError('Something went wrong. Please try again.');
            setSetupLoading(false);
        }
    };

    const handleCopySetupSecret = async () => {
        try {
            await navigator.clipboard.writeText(setupSecret.replace(/\s/g, ''));
            setSetupCopied(true);
            setTimeout(() => setSetupCopied(false), 2000);
        } catch {
            /* clipboard unavailable — user can still read the secret */
        }
    };

    const handleVerify2FA = async (e) => {
        e.preventDefault();
        if (!totpCode) {
            openCustomAlertPopup("Please enter the authenticator code.");
            return;
        }
        setIsVerifying(true);
        try {
            const res = await verify2FA(pendingUserId, totpCode.trim());
            if (!res || !res.valid) {
                openCustomAlertPopup("Invalid authenticator code.");
                setIsVerifying(false);
                return;
            }
            if (res.user) setUser(res.user);
            router.push(res.redirectTo || '/dashboard');
        } catch (err) {
            openCustomAlertPopup("Something went wrong. Please try again.");
            setIsVerifying(false);
        }
    };

    const handleUseEmail = async () => {
        try {
            await generateCode(pendingUserId, pendingEmail);
            localStorage.setItem('email', pendingEmail);
            localStorage.setItem('userId', pendingUserId);
            router.push('/verify');
        } catch (err) {
            openCustomAlertPopup("Failed to send verification email. Try again.");
        }
    };

    return (
        <div className={classes.loginPage}>
            <div className={classes.flexContainer}>
                <div className={classes.leftPart}></div>
                <div className={classes.rightPart}>
                    <div className={classes.rightContainer}>
                        <div className={classes.rightPartForm}>
                            <div className={classes.dayStarLogo}></div>

                            {step === 'credentials' && (
                                <>
                                    <div className={classes.loginTextContainer}>
                                        <div className={classes.loginText}>Login</div>
                                        <div className={classes.instructionText}>Enter your e-mail address and password</div>
                                    </div>
                                    <form onSubmit={handleLogin} className={classes.loginForm}>
                                        <CustomTextField
                                            label="Email Address"
                                            value={email}
                                            name="email"
                                            onChange={(e) => setEmail(e.target.value)}
                                        />
                                        <CustomTextField
                                            label="Password"
                                            value={password}
                                            onChange={(e) => setPassword(e.target.value)}
                                            isPassword={true}
                                            name="password"
                                        />
                                        <ButtonDefault
                                            className="btn"
                                            buttonText={'Login'}
                                            type="submit"
                                            loading={isPending}
                                        />
                                    </form>
                                    <div className={classes.forgotPassword}>
                                        <Link href={'/forgot-password'}>Forgot Password?</Link>
                                    </div>
                                </>
                            )}

                            {step === '2fa' && (
                                <>
                                    <div className={classes.loginTextContainer}>
                                        <div className={classes.loginText}>Two-Factor Authentication</div>
                                        <div className={classes.instructionText}>
                                            Enter the code from your authenticator app.
                                        </div>
                                    </div>
                                    <form onSubmit={handleVerify2FA} className={classes.loginForm}>
                                        <CustomTextField
                                            label="Authenticator Code"
                                            value={totpCode}
                                            name="code"
                                            onChange={(e) => setTotpCode(e.target.value.replace(/\D/g, ''))}
                                            inputMode="numeric"
                                            maxLength={6}
                                        />
                                        <ButtonDefault
                                            buttonText={'Verify'}
                                            type="submit"
                                            loading={isVerifying}
                                        />
                                    </form>
                                    <button
                                        type="button"
                                        onClick={handleUseEmail}
                                        className={classes.verifyText}
                                    >
                                        Don&apos;t have access to your authenticator? Verify with email instead.
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => { setStep('credentials'); setTotpCode(''); }}
                                        className={classes.verifyText}
                                    >
                                        ← Back to login
                                    </button>
                                </>
                            )}

                            {step === 'setup2FA' && (
                                <>
                                    <div className={classes.loginTextContainer}>
                                        <div className={classes.loginText}>Set up Two-Factor Authentication</div>
                                        <div className={classes.instructionText}>
                                            Two-factor authentication is required. Scan the QR code with your
                                            authenticator app, then enter the 6-digit code to finish signing in.
                                        </div>
                                    </div>
                                    {setupQr ? (
                                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem', margin: '1rem 0' }}>
                                            <Image src={setupQr} alt="2FA QR code" width={180} height={180} />
                                            <div style={{ textAlign: 'center', fontSize: '0.85rem', color: '#e1e7ed' }}>
                                                Can&apos;t scan? Enter this secret manually:
                                                <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.35rem' }}>
                                                    <code style={{ background: '#123751', color: '#e1e7ed', padding: '6px 10px', borderRadius: '4px', fontSize: '0.9rem', lineHeight: 1 }}>
                                                        {setupSecret}
                                                    </code>
                                                    <button
                                                        type="button"
                                                        onClick={handleCopySetupSecret}
                                                        style={{ background: 'transparent', border: '1px solid #23262a', color: '#e1e7ed', padding: '4px 10px', borderRadius: '4px', fontSize: '0.85rem', lineHeight: 1, cursor: 'pointer' }}
                                                    >
                                                        {setupCopied ? 'Copied' : 'Copy'}
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    ) : (
                                        <div style={{ textAlign: 'center', margin: '1rem 0', opacity: 0.75 }}>
                                            {setupLoading ? 'Preparing your QR code…' : 'Loading…'}
                                        </div>
                                    )}
                                    <form onSubmit={handleConfirmSetup2FA} className={classes.loginForm}>
                                        <CustomTextField
                                            label="Authenticator Code"
                                            value={setupCode}
                                            name="setupCode"
                                            onChange={(e) => setSetupCode(e.target.value.replace(/\D/g, ''))}
                                            inputMode="numeric"
                                            maxLength={6}
                                        />
                                        {setupError && (
                                            <div style={{ color: '#f87171', fontSize: '0.85rem', marginBottom: '0.5rem' }}>
                                                {setupError}
                                            </div>
                                        )}
                                        <ButtonDefault
                                            buttonText={'Enable & Sign in'}
                                            type="submit"
                                            loading={setupLoading}
                                        />
                                    </form>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setStep('credentials');
                                            setSetupCode('');
                                            setSetupError('');
                                            setSetupQr('');
                                            setSetupSecret('');
                                        }}
                                        className={classes.verifyText}
                                    >
                                        ← Cancel
                                    </button>
                                </>
                            )}
                        </div>
                        <CopyRight />
                    </div>
                </div>
            </div>

            <dialog
                id="custom_modal"
                className="modal"
                ref={customAlertPopupRef}
                style={{ display: "flex", alignItems: "center", justifyContent: "center" }}
            >
                <div className="modal-box" style={{ background: '#0D202F', borderColor: '#0D202F', color: '#fff', justifyContent: 'center' }}>
                    <div className="py-4">
                        <form method="dialog">
                            <div aria-labelledby="export-user-modal-tabs_0-tab" id="create-user-modal-tabs_0" role="tabpanel">
                                <div>
                                    <center className="flex flex-col items-center text-white">
                                        <div><WarnCircleBigIcon /></div>
                                        <div><h2 className="font-bold text-xl lg">{alertMessage}</h2></div>
                                        <div>
                                            <div className={classes.buttonContainer}>
                                                <div>
                                                    <ButtonSaveSubmit
                                                        buttonText={'Ok'}
                                                        onClick={closeCustomAlertModal}
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    </center>
                                </div>
                            </div>
                        </form>
                    </div>
                </div>
            </dialog>
        </div>
    );
}

export default LoginScreen;
