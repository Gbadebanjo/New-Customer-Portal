'use client'
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import SettingsIcon from "@/components/ui/icons/SettingsIcon";
import PowerIcon from "@/components/ui/icons/PowerIcon";
import Link from "next/link";
import ReactDOM from 'react-dom';
import classes from './profilepopup.module.css'
import logout from "@/lib/auth/logout";
import { useUser } from '@/components/Context/userContext';

const ProfilePopUp = () => {
    const [isOpen, setIsOpen] = useState(true);
    const [mounted, setMounted] = useState(false);
    const { user, setUser } = useUser();
    const router = useRouter();
    console.log('user:', user);


    useEffect(() => {
        setMounted(true);
    }, []);

    const togglePopup = () => {
        setIsOpen(!isOpen);
    };

    const handleLogout = async () => {
        try {
            await logout();
            window.location.href = '/login';
            setUser(null);
        } catch (error) {
            console.error('Error during logout:', error);
        }
    };

    if (!mounted) return null; // Prevent SSR error

    return ReactDOM.createPortal(
        <div className={`${classes.popup} ${isOpen ? classes.open : ''}`}>
            <div className={classes.popupHeader}>
                <div className={classes.avatar}>
                    <span className={classes.avatarInitial}>
                        {user?.name ? user.name.charAt(0).toUpperCase() : user?.username ? user.username.charAt(0).toUpperCase() : '?'}
                    </span>
                </div>
                <div className={classes.userInfo}>
                    <div className={classes.userName}>
                        {`${user?.name}  ${user?.surname}` || "NA"}
                    </div>
                    <div className={classes.userEmail}>
                        {user?.email}
                    </div>
                </div>
            </div>
            <div className={classes.menuItems}>
                <ul>
                    <li>
                        <Link href="/account/manage">
                            <div>
                                <SettingsIcon />
                                <span>My account</span>
                            </div>
                        </Link>
                    </li>
                    <li>
                        <div onClick={handleLogout} className={classes.logout}>
                            <PowerIcon />
                            <span>Log out</span>
                        </div>
                    </li>
                </ul>
            </div>
        </div>,
        document.body
    );
};

export default ProfilePopUp;
