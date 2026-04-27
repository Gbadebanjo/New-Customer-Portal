'use client';

import classes from './profile.module.css';
import HomeIcon from "@/components/ui/icons/HomeIcon";
import Link from "next/link";
import { useState, useEffect } from 'react';
import AuthenticatorSection from "@/components/2FaScreen/2FAScreen";
import { useUser } from "@/components/Context/userContext";
import { changePassword } from "@/lib/controllers/users/changePassword";
import { updateProfile } from "@/lib/controllers/users/updateProfile";
import { AllTimezones } from "@/utils/constants";
import PasswordStrengthIndicator from "@/components/ui/PasswordStrength/PasswordStrengthIndicator";
import { validatePassword } from "@/utils/passwordValidation";
import EyeIcon from "@/components/ui/icons/EyeIcon";
import EyeSlashIcon from "@/components/ui/icons/EyeSlashIcon";
import BackButton from '@/components/ui/BackButton/BackButton';


export default function ProfileScreen() {
    const { user, setUser } = useUser();
    const [activeTab, setActiveTab] = useState('password');

    // Change Password state
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [passwordMessage, setPasswordMessage] = useState('');
    const [passwordError, setPasswordError] = useState('');
    const [passwordLoading, setPasswordLoading] = useState(false);
    const [showCurrentPwd, setShowCurrentPwd] = useState(false);
    const [showNewPwd, setShowNewPwd] = useState(false);
    const [showConfirmPwd, setShowConfirmPwd] = useState(false);

    // Personal Info state
    const [username, setUsername] = useState('');
    const [name, setName] = useState('');
    const [surname, setSurname] = useState('');
    const [email, setEmail] = useState('');
    const [timezone, setTimezone] = useState('');
    const [profileMessage, setProfileMessage] = useState('');
    const [profileError, setProfileError] = useState('');
    const [profileLoading, setProfileLoading] = useState(false);

    // Populate personal info from user context
    useEffect(() => {
        if (user) {
            setUsername(user.username || '');
            setName(user.name || '');
            setSurname(user.surname || '');
            setEmail(user.email || '');
            setTimezone(user.timezone || '');
        }
    }, [user]);

    // Handle Change Password
    const handleChangePassword = async () => {
        setPasswordMessage('');
        setPasswordError('');

        if (!currentPassword || !newPassword || !confirmPassword) {
            setPasswordError('All fields are required.');
            return;
        }

        const strengthError = validatePassword(newPassword);
        if (strengthError) {
            setPasswordError(strengthError);
            return;
        }

        if (newPassword !== confirmPassword) {
            setPasswordError('New passwords do not match.');
            return;
        }

        setPasswordLoading(true);
        try {
            const result = await changePassword(user.id, { currentPassword, newPassword });
            if (result.success) {
                setPasswordMessage(result.message);
                setCurrentPassword('');
                setNewPassword('');
                setConfirmPassword('');
            } else {
                setPasswordError(result.message);
            }
        } catch {
            setPasswordError('An error occurred. Please try again.');
        } finally {
            setPasswordLoading(false);
        }
    };

    // Handle Update Profile
    const handleUpdateProfile = async () => {
        setProfileMessage('');
        setProfileError('');

        if (!username.trim()) {
            setProfileError('Username is required.');
            return;
        }

        setProfileLoading(true);
        try {
            const result = await updateProfile(user.id, {
                username,
                name,
                surname,
                email,
                timezone,
            });
            if (result.success) {
                setProfileMessage(result.message);
                setUser(result.user);
            } else {
                setProfileError(result.message);
            }
        } catch {
            setProfileError('An error occurred. Please try again.');
        } finally {
            setProfileLoading(false);
        }
    };

    return (
        <div className={classes.container}>
            {/* Header */}
            <div className={classes.header}>
                <span>
                    <Link href='/dashboard'>
                        <HomeIcon />
                    </Link>
                </span>
                <span> | &nbsp;My Profile</span>
                <BackButton />
            </div>
            {/* Content */}
            <div className={classes.content}>
                {/* Top Center */}
                <div className={classes.topCenter}>
                    <h3 className={classes.title}>My Profile</h3>
                </div>
                <div className={classes.mainContent}>
                    {/* LEFT SIDE */}
                    <div className={classes.optionDetails}>
                        <button
                            onClick={() => setActiveTab('password')}
                            className={`${classes.optionInputTitle} ${activeTab === 'password' ? classes.active : ''
                                }`}
                        >
                            Change password
                        </button>

                        <button
                            onClick={() => setActiveTab('personal')}
                            className={`${classes.optionInputTitle} ${activeTab === 'personal' ? classes.active : ''
                                }`}
                        >
                            Personal Information
                        </button>

                        <button
                            onClick={() => setActiveTab('auth')}
                            className={`${classes.optionInputTitle} ${activeTab === 'auth' ? classes.active : ''
                                }`}
                        >
                            Authenticator app
                        </button>
                    </div>

                    {/* RIGHT SIDE */}
                    <div className={classes.optionInputDetails}>
                        {activeTab === 'password' && (
                            <>
                                <h4 className={classes.optionInputHead}>Change password</h4>

                                {passwordMessage && <p className={classes.successMsg}>{passwordMessage}</p>}
                                {passwordError && <p className={classes.errorMsg}>{passwordError}</p>}

                                <div className={classes.inputGroup}>
                                    <label>Current password *</label>
                                    <div style={{ position: 'relative', width: '100%' }}>
                                        <input
                                            type={showCurrentPwd ? 'text' : 'password'}
                                            className={classes.input}
                                            style={{ width: '100%', boxSizing: 'border-box', paddingRight: '44px' }}
                                            value={currentPassword}
                                            onChange={(e) => setCurrentPassword(e.target.value)}
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowCurrentPwd((v) => !v)}
                                            aria-label={showCurrentPwd ? 'Hide password' : 'Show password'}
                                            style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', padding: 0, color: '#8fa0b3', display: 'flex', alignItems: 'center' }}
                                        >
                                            {showCurrentPwd ? <EyeSlashIcon /> : <EyeIcon />}
                                        </button>
                                    </div>
                                </div>

                                <div className={classes.inputGroup}>
                                    <label>New password *</label>
                                    <div style={{ position: 'relative', width: '100%' }}>
                                        <input
                                            type={showNewPwd ? 'text' : 'password'}
                                            className={classes.input}
                                            style={{ width: '100%', boxSizing: 'border-box', paddingRight: '44px' }}
                                            value={newPassword}
                                            onChange={(e) => setNewPassword(e.target.value)}
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowNewPwd((v) => !v)}
                                            aria-label={showNewPwd ? 'Hide password' : 'Show password'}
                                            style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', padding: 0, color: '#8fa0b3', display: 'flex', alignItems: 'center' }}
                                        >
                                            {showNewPwd ? <EyeSlashIcon /> : <EyeIcon />}
                                        </button>
                                    </div>
                                    <PasswordStrengthIndicator password={newPassword} />
                                </div>

                                <div className={classes.inputGroup}>
                                    <label>Confirm new password *</label>
                                    <div style={{ position: 'relative', width: '100%' }}>
                                        <input
                                            type={showConfirmPwd ? 'text' : 'password'}
                                            className={classes.input}
                                            style={{ width: '100%', boxSizing: 'border-box', paddingRight: '44px' }}
                                            value={confirmPassword}
                                            onChange={(e) => setConfirmPassword(e.target.value)}
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowConfirmPwd((v) => !v)}
                                            aria-label={showConfirmPwd ? 'Hide password' : 'Show password'}
                                            style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', padding: 0, color: '#8fa0b3', display: 'flex', alignItems: 'center' }}
                                        >
                                            {showConfirmPwd ? <EyeSlashIcon /> : <EyeIcon />}
                                        </button>
                                    </div>
                                </div>

                                <button
                                    className={classes.submitBtn}
                                    onClick={handleChangePassword}
                                    disabled={passwordLoading}
                                >
                                    {passwordLoading ? 'Submitting...' : 'Submit'}
                                </button>
                            </>
                        )}

                        {activeTab === 'personal' && (
                            <>
                                <h4 className={classes.optionInputHead}>Personal Information</h4>

                                {profileMessage && <p className={classes.successMsg}>{profileMessage}</p>}
                                {profileError && <p className={classes.errorMsg}>{profileError}</p>}

                                <div className={classes.inputGroup}>
                                    <label>User name *</label>
                                    <input
                                        type="text"
                                        className={classes.input}
                                        value={username}
                                        onChange={(e) => setUsername(e.target.value)}
                                    />
                                </div>

                                <div className={classes.inputGroup}>
                                    <label>Name</label>
                                    <input
                                        type="text"
                                        className={classes.input}
                                        value={name}
                                        onChange={(e) => setName(e.target.value)}
                                    />
                                </div>

                                <div className={classes.inputGroup}>
                                    <label>Surname</label>
                                    <input
                                        type="text"
                                        className={classes.input}
                                        value={surname}
                                        onChange={(e) => setSurname(e.target.value)}
                                    />
                                </div>

                                <div className={classes.inputGroup}>
                                    <label>Email</label>
                                    <input
                                        type="email"
                                        disabled
                                        className={`${classes.input} ${classes.emailInput}`}
                                        value={email}
                                        // onChange={(e) => setEmail(e.target.value)}
                                    />
                                </div>

                                <div className={classes.inputGroup}>
                                    <label>Time Zone</label>
                                    <select
                                        className={classes.input}
                                        value={timezone}
                                        name="Timezone"
                                        onChange={(e) => setSelectedTimezone(e.target.value)}
                                    >
                                        <option selected="selected" value="Africa/Lagos">
                                            Africa/Lagos
                                        </option>
                                        <option disabled value="">
                                            -None-
                                        </option>
                                        {AllTimezones.map((singleTimezone) => (
                                            <option
                                                key={singleTimezone.id}
                                                value={singleTimezone.id}
                                            >
                                                {singleTimezone.name}
                                            </option>
                                        ))}
                                    </select>
                                </div>


                                <button
                                    className={classes.submitBtn}
                                    onClick={handleUpdateProfile}
                                    disabled={profileLoading}
                                >
                                    {profileLoading ? 'Submitting...' : 'Submit'}
                                </button>
                            </>
                        )}

                        {activeTab === 'auth' && (
                            <AuthenticatorSection />
                        )}
                    </div>
                </div>

            </div>
        </div>
    );
}
