'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { validateCode, generateCode } from "@/lib/auth/verificationActions";
import verify2FA from "@/lib/controllers/users/verify2FA";
import getUserById from '@/lib/controllers/users/getUserById';
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
                openCustomAlertPopup("Invalid authenticator code.");
                setIsSubmitting(false);
                return;
            }

            // fetch fresh user and set context then redirect
            const userInfo = await getUserById(userId);
            if (userInfo?.user) setUser(userInfo.user);
            router.push('/dashboard');
        } catch (err) {
            console.error('2FA verify error:', err);
            openCustomAlertPopup("Something went wrong. Please try again.");
            setIsSubmitting(false);
        }
    };

     const handleUseEmail = async () => {
        try {
            await generateCode(userId, email);
            router.push('/verify');
        } catch (err) {
            // console.error('Generate email code error:', err);
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
                                    // className="btn"
                                    buttonText={'Submit'}
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
