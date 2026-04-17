'use client';
import { exitImpersonation } from '@/lib/auth/impersonationActions';
import classes from './exitImpersonation.module.css';

export default function ExitImpersonationButton() {
    const handleExit = async () => {
        await exitImpersonation();
        window.location.href = '/admin/identity/users';
    };

    return (
        <button
            onClick={handleExit}
            title="Go Back to Account"
            className={classes.btn}
        >
            &#8617;
        </button>
    );
}
