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
import { getMyPrefs, setWeeklyDigestEnabled, sendMyDigestPreview } from '@/lib/controllers/userPrefs/prefsActions';


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

    // Notifications state — weekly digest opt-in.
    const [digestEnabled, setDigestEnabled] = useState(false);
    const [digestSaving, setDigestSaving] = useState(false);
    const [digestMessage, setDigestMessage] = useState('');
    const [previewSending, setPreviewSending] = useState(false);

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

    // Load notification prefs from the server on mount.
    useEffect(() => {
        let cancelled = false;
        (async () => {
            const prefs = await getMyPrefs();
            if (!cancelled && prefs) setDigestEnabled(Boolean(prefs.weeklyDigestEnabled));
        })();
        return () => { cancelled = true; };
    }, []);

    const handleToggleDigest = async (checked) => {
        setDigestEnabled(checked);
        setDigestSaving(true);
        setDigestMessage('');
        const res = await setWeeklyDigestEnabled(checked);
        setDigestSaving(false);
        if (!res?.ok) {
            setDigestEnabled(!checked);
            setDigestMessage(res?.error || 'Could not save. Try again.');
        } else {
            setDigestMessage(checked
                ? 'You’re signed up — every Monday morning.'
                : 'Weekly digest turned off.');
            setTimeout(() => setDigestMessage(''), 4000);
        }
    };

    const handleSendPreview = async () => {
        setPreviewSending(true);
        setDigestMessage('');
        const res = await sendMyDigestPreview();
        setPreviewSending(false);
        setDigestMessage(res?.ok
            ? `Preview sent to ${res.sentTo}. Check your inbox.`
            : res?.error || 'Could not send preview.');
    };

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

                        <button
                            onClick={() => setActiveTab('notifications')}
                            className={`${classes.optionInputTitle} ${activeTab === 'notifications' ? classes.active : ''
                                }`}
                        >
                            Notifications
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

                        {activeTab === 'notifications' && (
                            <>
                                <h4 className={classes.optionInputHead}>Notifications</h4>
                                {digestMessage && (
                                    <p className={classes.successMsg} style={{ marginBottom: 12 }}>{digestMessage}</p>
                                )}
                                <div style={{
                                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                    gap: 16, padding: '14px 16px',
                                    background: 'rgba(255,255,255,0.03)',
                                    border: '1px solid rgba(255,255,255,0.06)',
                                    borderRadius: 10, marginTop: 8,
                                }}>
                                    <div style={{ minWidth: 0 }}>
                                        <div style={{ color: '#fff', fontWeight: 600, marginBottom: 4 }}>
                                            Weekly solar summary
                                        </div>
                                        <div style={{ color: 'rgba(255,255,255,0.65)', fontSize: '0.85rem' }}>
                                            A short email every Monday morning with your sites&rsquo; production, savings, and CO₂ avoided.
                                        </div>
                                    </div>
                                    <label style={{
                                        position: 'relative', display: 'inline-block',
                                        width: 44, height: 24, flexShrink: 0, cursor: digestSaving ? 'wait' : 'pointer',
                                    }}>
                                        <input
                                            type="checkbox"
                                            checked={digestEnabled}
                                            disabled={digestSaving}
                                            onChange={(e) => handleToggleDigest(e.target.checked)}
                                            style={{ opacity: 0, width: 0, height: 0 }}
                                        />
                                        <span style={{
                                            position: 'absolute', inset: 0,
                                            background: digestEnabled ? '#ff7d70' : 'rgba(255,255,255,0.15)',
                                            borderRadius: 999, transition: 'background 0.15s',
                                        }} />
                                        <span style={{
                                            position: 'absolute', top: 3, left: digestEnabled ? 22 : 3,
                                            width: 18, height: 18, borderRadius: '50%', background: '#fff',
                                            transition: 'left 0.15s',
                                        }} />
                                    </label>
                                </div>

                                <div style={{ marginTop: 12 }}>
                                    <button
                                        type="button"
                                        onClick={handleSendPreview}
                                        disabled={previewSending}
                                        style={{
                                            padding: '8px 16px', borderRadius: 8, cursor: previewSending ? 'wait' : 'pointer',
                                            border: '1px solid rgba(255,125,112,0.4)',
                                            background: 'rgba(255,125,112,0.10)', color: '#ff9770',
                                            fontSize: '0.85rem', fontWeight: 600,
                                        }}
                                    >
                                        {previewSending ? 'Sending…' : 'Send me a preview'}
                                    </button>
                                    <span style={{ marginLeft: 12, color: 'rgba(255,255,255,0.55)', fontSize: '0.8rem' }}>
                                        We&rsquo;ll send today&rsquo;s digest to {email || 'your address on file'}.
                                    </span>
                                </div>
                            </>
                        )}
                    </div>
                </div>

            </div>
        </div>
    );
}
