'use client';
import { useState } from "react";
import classes from '../login/login.module.css';
import Button from "@/components/ui/button/Button";
import ButtonWhite from "@/components/ui/button-white/Button";
import CustomTextField from '@/components/ui/CustomTextField/CustomTextInput';
import CopyRight from '@/components/ui/CopyRight/copyright';
import { forgotPassword } from "@/lib/auth/authActions";
import CustomAlertModal from "@/components/ui/modals/customAlertModal/customAlertModal";

function ForgotPasswordComponent() {
    const [email, setEmail] = useState("");
    const [loading, setLoading] = useState(false);
    const [successMsg, setSuccessMsg] = useState("");
    const [errorMsg, setErrorMsg] = useState("");
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [alertMessage, setAlertMessage] = useState("");

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setErrorMsg("");
        setSuccessMsg("");

        const formData = new FormData();
        formData.append("email", email);

        const response = await forgotPassword(formData);

        if (response.success) {
            setSuccessMsg(true);
        } else {
            setIsModalOpen(true);
            setAlertMessage(response.message || "Failed to send reset link.");
        }

        setLoading(false);
    };

    return (
        <div className={classes.loginPage}>
            <div className={classes.flexContainer}>
                <div className={classes.leftPart} />
                <div className={classes.rightPart}>
                    <div className={classes.rightContainer} >
                        <div className={classes.rightPartForm}>
                            <div className={classes.dayStarLogo} />
                            <div className={classes.loginTextContainer}>
                                <div className={classes.loginText}>
                                    Forgot Password?
                                </div>
                                <div className={classes.instructionText}>
                                    Enter your e-mail address and we’ll send you a link to reset your password
                                </div>
                            </div>
                            <form onSubmit={handleSubmit} className={classes.loginForm}>
                                <CustomTextField
                                    label="Email Address"
                                    value={email}
                                    name="email"
                                    onChange={(e) => setEmail(e.target.value)}
                                />
                                {successMsg && (
                                    <p style={{ color: 'green', lineHeight: '1.6' }}>
                                        If an account with <strong>{email}</strong> exists, you&apos;ll receive a reset link shortly.
                                        <br />
                                        Need help? Contact us at{' '}
                                        <a href="mailto:idt-servicedesk@daystar-power.com"
                                            style={{ color: '#4a9fd4', textDecoration: 'underline' }}>
                                            idt-servicedesk@daystar-power.com
                                        </a>
                                    </p>
                                )}
                                {errorMsg && <p style={{ color: 'red' }}>{errorMsg}</p>}

                                <div className={classes.buttonContainer}>
                                    <div style={{ width: '47%' }}>
                                        <ButtonWhite link={"/login"}>
                                            Back
                                        </ButtonWhite>
                                    </div>
                                    <div style={{ width: '47%' }}>
                                        <Button disabled={loading} type="submit" >
                                            {loading ? "Sending..." : "Send"}
                                        </Button>
                                    </div>
                                </div>
                            </form>
                        </div>
                        <CopyRight />
                    </div>
                </div>
            </div>
            <CustomAlertModal
                open={isModalOpen}
                message={alertMessage}
                onClose={() => setIsModalOpen(false)}
            />
        </div>
    )
        ;
}

export default ForgotPasswordComponent;