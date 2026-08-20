'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { validateCode, generateCode } from "@/lib/auth/verificationActions";
import verify2FA from "@/lib/controllers/users/verify2FA";
import classes from '../login/login.module.css';
import { ButtonDefault } from "@/components/ui/ButtonDefault/ButtonDefault";
import CustomTextField from '@/components/ui/CustomTextField/CustomTextInput';
import CopyRight from '@/components/ui/CopyRight/copyright';
import CustomAlertModal from '@/components/ui/modals/customAlertModal/customAlertModal';
import { useUser } from '@/components/Context/userContext';

function TwoFactorVerification() {
    const [code, setCode] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isModalOpen, setModalOpen] = useState(false);
    const [verificationSuccess, setVerificationSuccess] = useState(false);
    const [alertMessage, setAlertMessage] = useState('');
    const [email, setEmail] = useState('');
    const [userId, setUserId] = useState('');
    const router = useRouter();
    const { setUser } = useUser();


    useEffect(() => {
        const storedEmail = localStorage.getItem('email')
        const storedUserId = localStorage.getItem('userId')

        if (!storedEmail || !storedUserId) {
            router.push('/login');
            return;
        }

        setEmail(storedEmail);
        setUserId(storedUserId);
    }, [router]);

    const openCustomAlertPopup = (msg) => {
        setAlertMessage(msg);
        setModalOpen(true);
    };

    const closeCustomAlertModal = () => {
        setModalOpen(false);
    }

    // Session-expired = the 10-min login-pending cookie is gone. The
    // user has to restart from /login. We surface the server message,
    // then bounce them shortly after so they see what happened without
    // being trapped on this screen with a generic "invalid code" alert.
    const handleSessionExpired = (msg) => {
        openCustomAlertPopup(msg || 'Session expired. Please log in again.');
        // Clear stored ids so the effect on /login doesn't re-route back
        // here. Small delay so the alert is legible before we navigate.
        try { localStorage.removeItem('email'); localStorage.removeItem('userId'); } catch { /* ignore */ }
        setTimeout(() => router.push('/login'), 1500);
    };

    const handleVerify = async (e) => {
        e.preventDefault();


        if (!code) {
            openCustomAlertPopup("Please enter a valid code.");
            return;
        }
        setIsSubmitting(true);
        try {
            const res = await verify2FA(userId, code.trim());
            if (!res || !res.valid) {
                if (res?.reason === 'session_expired') {
                    handleSessionExpired(res?.message);
                    return;
                }
                openCustomAlertPopup(res?.message || "Invalid authenticator code.");
                setIsSubmitting(false);
                return;
            }

            if (res.user) setUser(res.user);
            router.push(res.redirectTo || '/dashboard');
        } catch (err) {
            console.error('2FA verify error:', err);
            openCustomAlertPopup("Something went wrong. Please try again.");
            setIsSubmitting(false);
        }
    };

     const handleUseEmail = async () => {
        try {
            const res = await generateCode(userId, email);
            if (res?.reason === 'session_expired') {
                handleSessionExpired(res?.message);
                return;
            }
            if (res?.success === false) {
                openCustomAlertPopup(res?.message || "Failed to send verification email. Try again.");
                return;
            }
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
                    <div className={classes.rightContainer} >
                        <div className={classes.rightPartForm}>
                            <div className={classes.dayStarLogo}></div>
                            <div className={classes.loginTextContainer}>
                                <div className={classes.instructionText}>Your login is protected with an authenticator app. Enter below the code from the authenticator app.</div>
                            </div>
                            <form onSubmit={handleVerify} className={classes.loginForm}>
                                <CustomTextField
                                    label="Code"
                                    value={code}
                                    name="code"
                                    onChange={(e) => setCode(e.target.value)}
                                    inputMode="numeric"
                                    maxLength={6}
                                />
                                <ButtonDefault
                                    buttonText={'Submit'}
                                    loadingText={'Verifying…'}
                                    type="submit"
                                    loading={isSubmitting}
                                />
                            </form>
                            <button type="button" onClick={handleUseEmail} className={classes.verifyText}>Don&apos;t have access to your authenticator device? You can verify with a code sent to your email.</button>

                        </div>
                        <CopyRight />
                    </div>
                </div>

            </div>
            <CustomAlertModal
                open={isModalOpen}
                message={alertMessage}
                onClose={closeCustomAlertModal}
            />
        </div >
    );
}

export default TwoFactorVerification;
