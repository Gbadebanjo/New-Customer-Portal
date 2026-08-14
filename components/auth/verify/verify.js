'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { validateCode, generateCode } from "@/lib/auth/verificationActions";
import classes from '../login/login.module.css';
import { ButtonDefault } from "@/components/ui/ButtonDefault/ButtonDefault";
import CustomTextField from '@/components/ui/CustomTextField/CustomTextInput';
import CopyRight from '@/components/ui/CopyRight/copyright';
import CustomAlertModal from '@/components/ui/modals/customAlertModal/customAlertModal';
import { useUser } from '@/components/Context/userContext';

function VerifyComponent() {
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

    const resendCode = async () => {
        try {
            const result = await generateCode(userId, email);
            if (!result?.success) {
                openCustomAlertPopup(result?.message || "Failed to resend verification code. Please try again.");
                return;
            }
            openCustomAlertPopup("Verification code resent to your email.");
        }
        catch (error) {
            openCustomAlertPopup("Failed to resend verification code. Please try again.");
        }
    }

    const handleVerify = async (e) => {
        e.preventDefault();

        if (!code || code.length !== 6) {
            openCustomAlertPopup("Please enter a valid code.");
            return;
        }
        setIsSubmitting(true);
        try {
            const result = await validateCode(userId, code);
            if (!result?.success) {
                openCustomAlertPopup(result?.message || "Verification failed.");
                setVerificationSuccess(false);
                setIsSubmitting(false);
                return;
            }
            setVerificationSuccess(true);
            if (result.user) {
                localStorage.setItem('user', JSON.stringify(result.user));
                setUser(result.user);
            }
            router.push(result.redirectTo || '/dashboard');
        } catch (err) {
            openCustomAlertPopup("Something went wrong. Please try again.");
            setIsSubmitting(false);
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
                                <div className={classes.loginText}>Verify Password</div>
                                <div className={classes.instructionText}>A verification code has been sent to <span className={classes.instructionBoldText}>{email}</span>. Enter the code to continue. </div>
                            </div>
                            <form onSubmit={handleVerify} className={classes.loginForm}>
                                <CustomTextField
                                    label="Verification Code"
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
                            <div className={classes.forgotPassword}>
                                <button type="button" onClick={resendCode}>Resend Code</button>
                            </div>
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

export default VerifyComponent;
