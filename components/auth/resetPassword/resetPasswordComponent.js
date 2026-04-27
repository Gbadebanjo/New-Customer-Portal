'use client';
import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import classes from '../login/login.module.css';
import { ButtonDefault } from "@/components/ui/ButtonDefault/ButtonDefault";
import CustomTextField from '@/components/ui/CustomTextField/CustomTextInput';
import CopyRight from '@/components/ui/CopyRight/copyright';
import { resetPassword } from "@/lib/auth/authActions";
import CustomAlertModal from "@/components/ui/modals/customAlertModal/customAlertModal";
import PasswordStrengthIndicator from "@/components/ui/PasswordStrength/PasswordStrengthIndicator";
import { validatePassword } from "@/utils/passwordValidation";

function ResetPasswordComponent() {
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [alertMessage, setAlertMessage] = useState("");
    const [redirectAfterClose, setRedirectAfterClose] = useState(null);
    const router = useRouter();

    const { token } = useParams();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);

        try {
            const strengthError = validatePassword(password);
            if (strengthError) {
                setAlertMessage(strengthError);
                setIsModalOpen(true);
                setLoading(false);
                return;
            }

            if (password !== confirmPassword) {
                setAlertMessage("Passwords do not match!");
                setIsModalOpen(true);
                setLoading(false);
                return;
            }

            const formData = new FormData();
            formData.append("password", password);
            formData.append("token", token);

            const response = await resetPassword(formData);

            if (response.success) {
                router.push('/login');
                return;
            } else {
                setRedirectAfterClose('/forgot-password');
                setAlertMessage(response.message || "Failed to reset password.");
                setIsModalOpen(true);
            }
        } catch (error) {
            console.error("Error resetting password:", error);
            setAlertMessage("An error occurred while resetting the password.");
            setIsModalOpen(true);
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
                                    Reset Password
                                </div>
                                <div className={classes.instructionText}>
                                    Enter a new password to your reset details.
                                </div>
                            </div>
                            <form onSubmit={handleSubmit} className={classes.loginForm}>
                                <div>
                                    <CustomTextField
                                        label="Password"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        isPassword={true}
                                        name="password"
                                    />
                                    <PasswordStrengthIndicator password={password} />
                                </div>
                                <CustomTextField
                                    label="Confirm Password"
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    isPassword={true}
                                    name="confirm password"
                                />
                                <ButtonDefault
                                    className="btn"
                                    buttonText={'Submit'}
                                    type="submit"
                                    loading={loading}
                                />
                            </form>
                        </div>
                        <CopyRight />
                    </div>
                </div>
            </div>
            <CustomAlertModal
                open={isModalOpen}
                message={alertMessage}
                onClose={() => {
                    setIsModalOpen(false);
                    if (redirectAfterClose) router.push(redirectAfterClose);
                }}
            />
        </div>
    );
}

export default ResetPasswordComponent;
