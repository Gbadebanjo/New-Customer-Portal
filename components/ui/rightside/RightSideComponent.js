'use client'
import { useEffect, useState, useCallback } from 'react';
import classes from "./rightSide.module.css";
import ProfilePopUp from "@/components/ui/popups/profilepopup/ProfilePopUp";
import NotificationsBell from "@/components/ui/NotificationsBell/NotificationsBell";
import { shortRoleLabel } from '@/utils/roleLabels';
import { useUser } from '@/components/Context/userContext';

export default function RightSideComponent({ impersonationBanner }) {
    const [profilePopupVisible, setProfilePopupVisible] = useState(false);
    const { user } = useUser();

    const toggleProfilePopup = () => {
        setProfilePopupVisible((prev) => !prev);
    };

    const handleClickOutside = useCallback((event) => {
        if (event.target.closest(`.${classes.rightSide}`) === null && profilePopupVisible) {
            setProfilePopupVisible(false);
        }
    }, [profilePopupVisible]);

    useEffect(() => {
        if (profilePopupVisible) {
            document.addEventListener('click', handleClickOutside);
        }
        return () => {
            document.removeEventListener('click', handleClickOutside);
        };
    }, [profilePopupVisible, handleClickOutside]);

    const roles = user?.roles?.map((r) => r?.name).filter(Boolean) || [];
    const roleLabelFull = roles.join(', ') || 'Profile';

    return (
        <div className={classes.rightSide}>
            <div className={classes.profileBlock}>
                <div className={classes.avatarWrap}>
                    <div className={classes.profileIconDiv} onClick={toggleProfilePopup}>
                        <span className={classes.profileInitial}>
                            {user?.name ? user.name.charAt(0).toUpperCase() : user?.username ? user.username.charAt(0).toUpperCase() : '?'}
                        </span>
                    </div>
                    <div className={classes.bellOverlay}>
                        <NotificationsBell />
                    </div>
                </div>
                <div className={classes.roleBadge} title={roleLabelFull}>
                    {roles.length === 0
                        ? 'Profile'
                        : roles.map(shortRoleLabel).join(' · ')}
                </div>
            </div>
            {profilePopupVisible && <ProfilePopUp />}
            {impersonationBanner}
        </div>
    );
}
