'use client';
import { useEffect, useRef, useState, useTransition } from 'react';
import classes from './login.module.css';
import Link from "next/link";
import { login } from "@/lib/auth/authActions";
import { generateCode } from "@/lib/auth/verificationActions";
import verify2FA from "@/lib/controllers/users/verify2FA";
import getUserById from "@/lib/controllers/users/getUserById";
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

    // 2FA step state
    const [step, setStep] = useState('credentials');
    const [pendingUserId, setPendingUserId] = useState('');
    const [pendingEmail, setPendingEmail] = useState('');
    const [totpCode, setTotpCode] = useState('');
    const [isVerifying, setIsVerifying] = useState(false);

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
                // Show 2FA step inline
                setPendingUserId(result.user.id);
                setPendingEmail(result.user.email);
                setStep('2fa');
            } else if (result.success) {
                // No 2FA — send email verification code
                localStorage.setItem('email', result.user.email);
                localStorage.setItem('userId', result.user.id);
                router.push('/verify');
            }
        });
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
            const userInfo = await getUserById(pendingUserId);
            if (userInfo?.user) setUser(userInfo.user);
            router.push('/dashboard');
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

                            {step === 'credentials' ? (
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
                            ) : (
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
