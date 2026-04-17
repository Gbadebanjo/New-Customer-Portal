import React from 'react';
import classes from '@/components/auth/login/login.module.css'

export default function CopyRight () {
    const date = new Date();
    const thisYear = date.getFullYear();
    return (
        <div className={classes.copyright}>
            {thisYear} © Daystar Power Energy Solutions
        </div>
    );
}