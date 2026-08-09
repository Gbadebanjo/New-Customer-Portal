'use client';
import { useState } from 'react';
import EyeIcon from '@/components/ui/icons/EyeIcon';
import EyeSlashIcon from '@/components/ui/icons/EyeSlashIcon';
import classes from './formField.module.css';

/**
 * Password input with a show/hide toggle button. Same label/hint/error contract
 * as FormField, but always renders type="password" (or "text" when revealed).
 *
 * Props:
 *   label, required, hint, error, value, onChange, name, id, disabled, placeholder
 */
export default function PasswordField({
    label,
    required,
    hint,
    error,
    value,
    onChange,
    name,
    id,
    disabled,
    placeholder,
    autoComplete = 'current-password',
}) {
    const [visible, setVisible] = useState(false);
    const fieldId = id || name;

    return (
        <div className={classes.group}>
            {label && (
                <label htmlFor={fieldId} className={`${classes.label} ${required ? classes.required : ''}`}>
                    {label}
                </label>
            )}
            <div className={classes.passwordWrap}>
                <input
                    type={visible ? 'text' : 'password'}
                    className={`${classes.input} ${classes.passwordInput}`}
                    id={fieldId}
                    name={name}
                    value={value}
                    onChange={onChange}
                    disabled={disabled}
                    placeholder={placeholder}
                    autoComplete={autoComplete}
                />
                <button
                    type="button"
                    className={classes.togglePassword}
                    onClick={() => setVisible((v) => !v)}
                    aria-label={visible ? 'Hide password' : 'Show password'}
                >
                    {visible ? <EyeSlashIcon /> : <EyeIcon />}
                </button>
            </div>
            {error ? <span className={classes.error}>{error}</span>
                : hint ? <span className={classes.hint}>{hint}</span>
                    : null}
        </div>
    );
}
