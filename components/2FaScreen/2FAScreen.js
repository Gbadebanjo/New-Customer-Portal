'use client';

import { useState } from 'react';
import classes from './2FAScreen.module.css';
import Image from 'next/image';
import classes2 from '../Profile/profile.module.css';
import { useUser } from '@/components/Context/userContext';
import startEnable2FA from '@/lib/controllers/users/startEnable2FA';
import confirmEnable2FA from '@/lib/controllers/users/confirmEnable2FA';
import disable2FA from '@/lib/controllers/users/disable2FA';

export default function AuthenticatorSection() {
  const { user, setUser } = useUser();

  const [qrCode, setQrCode] = useState(null);
  const [secretKey, setSecretKey] = useState('');
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [activeTab, setActiveTab] = useState('step1');
  const [copySuccess, setCopySuccess] = useState(false);

  const handleStartEnable = async () => {
    setLoading(true);
    setMessage('');

    try {
      const data = await startEnable2FA(user.id);
      setQrCode(data.qrDataUrl);
      setSecretKey(data.secret || '');
    } catch (error) {
      setMessage('Failed to generate QR code');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyEnable = async () => {
    setLoading(true);
    setMessage('');

    try {
      const data = await confirmEnable2FA(user.id, code);

      if (data.success) {
        setUser({ ...user, totp_enabled: true });
        setMessage('2FA enabled successfully');
        setActiveTab('done');
      } else {
        setMessage(data.message || 'Invalid verification code');
      }
    } catch (error) {
      setMessage('Verification failed');
    } finally {
      setLoading(false);
    }
  };

  const handleDisable = async () => {
    setLoading(true);
    setMessage('');

    try {
      const data = await disable2FA(user.id, password);

      if (data.success) {
        setUser({ ...user, totp_enabled: false });
        setPassword('');
        setQrCode(null);
        setSecretKey('');
        setActiveTab('step1');
        setMessage('2FA disabled successfully');
      } else {
        setMessage(data.message || 'Incorrect password');
      }
    } catch (error) {
      setMessage('Failed to disable 2FA');
    } finally {
      setLoading(false);
    }
  };

  const handleCopySecret = async () => {
    try {
      await navigator.clipboard.writeText(secretKey.replace(/\s/g, ''));
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const handleNextStep = () => {
    if (activeTab === 'step1' && qrCode) {
      setActiveTab('step2');
    } else if (activeTab === 'step2' && code.length === 6) {
      handleVerifyEnable();
    }
  };

  const renderEnableView = () => (
    <>
      {/* Step Navigation */}
      <div className={classes.optionDetails}>
        <div onClick={() => qrCode && setActiveTab('step1')}
          className={`${classes.optionInputTitle} ${activeTab === 'step1' ? classes.active : ''} ${!qrCode ? classes.disabled : ''}`}
        >
          <h4>Step 1</h4>
          <h6>Authenticator App</h6>
        </div>
        <div
          onClick={() => qrCode && setActiveTab('step2')}
          className={`${classes.optionInputTitle} ${activeTab === 'step2' || activeTab === 'done' ? classes.active : ''} ${!qrCode ? classes.disabled : ''}`}
        >
          <h4>Step 2</h4>
          <h6>Verify the authenticator</h6>
        </div>
      </div>

      {/* Step Content */}
      <div className={classes.stepContent}>
        {/* Step 1: Authenticator App */}
        {activeTab === 'step1' && (
          <div className={classes.stepContainer}>
            <div className={classes.stepHeader}>
              <h2 className={classes.stepTitle}>Authenticator App</h2>
              <p className={classes.stepDescription}>
                Open your two factor authentication app and do one of the following actions:
              </p>
            </div>

            {!qrCode ? (
              <button
                className={classes.primaryBtn}
                onClick={handleStartEnable}
                disabled={loading}
              >
                {loading ? 'Generating...' : 'Generate QR Code'}
              </button>
            ) : (
              <>
                <div className={classes.setupContainer}>
                  {/* QR Code Box */}
                  <div className={classes.qrBox}>
                    <h3 className={classes.boxTitle}>Use the QR Code</h3>
                    <div className={classes.qrCodeWrapper}>
                      <Image
                        src={qrCode}
                        alt="Scan QR Code"
                        width={200}
                        height={200}
                        className={classes.qrImage}
                      />
                    </div>
                  </div>

                  {/* Or Divider */}
                  <div className={classes.orDivider}>
                    <span>Or</span>
                  </div>

                  {/* Manual Code Box */}
                  <div className={classes.qrBox}>
                    <h3 className={classes.boxTitle}>Or manually enter the code</h3>
                    <div className={classes.secretKeyWrapper}>
                      <code className={classes.secretKey}>{secretKey}</code>
                      <button className={classes.copyButton} onClick={handleCopySecret}>
                        {copySuccess ? 'Copied!' : 'Copy to clipboard'}
                      </button>
                    </div>
                  </div>
                </div>

                <div className={classes.buttonContainer}>
                  <button className={classes.nextButton} onClick={handleNextStep}>
                    Next step →
                  </button>
                </div>
              </>
            )}
          </div>
        )}

        {/* Step 2: Verify Authenticator */}
        {(activeTab === 'step2' || activeTab === 'done') && (
          <div className={classes.stepContainer}>
            {activeTab === 'done' ? (
              <div className={classes.stepHeader}>
                <h2 className={classes.stepTitle}>2FA Enabled</h2>
                <p className={classes.stepDescription}>
                  Your account is now protected with two-factor authentication.
                </p>
              </div>
            ) : (
              <>
                <div className={classes.stepHeader}>
                  <h2 className={classes.stepTitle}>Verify the authenticator</h2>
                  <p className={classes.stepDescription}>
                    Your two-factor authentication application will generate a code, enter this
                    code in the box below and confirm.
                  </p>
                </div>

                <div className={classes.verifyForm}>
                  <label className={classes.inputLabel}>Code</label>
                  <input
                    type="text"
                    maxLength={6}
                    value={code}
                    onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
                    className={classes.input}
                    placeholder="000000"
                  />
                  <button
                    className={classes.verifyButton}
                    onClick={handleVerifyEnable}
                    disabled={loading || code.length !== 6}
                  >
                    {loading ? 'Verifying...' : 'Verify'}
                  </button>
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* Messages */}
      {message && (
        <p
          className={`${classes.message} ${
            message.includes('success') ? classes.messageSuccess : classes.messageError
          }`}
        >
          {message}
        </p>
      )}
    </>
  );

  const renderDisableView = () => (
    <div className={classes.disableContainer}>
      <div className={classes.enabledBadge}>
        ✓ 2FA is enabled on your account
      </div>

      <div className={classes.disableBox}>
        <label className={classes.inputLabel}>Confirm your password to disable</label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className={classes.input}
          placeholder="Enter your password"
        />

        <button
          className={classes.dangerBtn}
          onClick={handleDisable}
          disabled={loading || !password}
        >
          {loading ? 'Disabling...' : 'Disable 2FA'}
        </button>
      </div>

      {message && (
        <p
          className={`${classes.message} ${
            message.includes('success') ? classes.messageSuccess : classes.messageError
          }`}
        >
          {message}
        </p>
      )}
    </div>
  );

  return (
    <div className={classes.container}>
      <h4 className={classes2.optionInputHead}>Authenticator App</h4>

      {user?.totp_enabled ? renderDisableView() : renderEnableView()}
    </div>
  );
}
