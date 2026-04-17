'use client'
import { useEffect, useState, useCallback } from 'react';
import classes from "./rightSide.module.css";
import ProfilePopUp from "@/components/ui/popups/profilepopup/ProfilePopUp";
import { useUser } from '@/components/Context/userContext';
export default function RightSideComponent({ impersonationBanner }) {
    const [profilePopupVisible, setProfilePopupVisible] = useState(false); // State to manage profile popup visibility
    const { user } = useUser();
   
    const toggleProfilePopup = () => {
        setProfilePopupVisible((prev) => !prev);
    };

    // Function to close profile popup when clicking outside
    const handleClickOutside = useCallback((event) => {
        if (event.target.closest(`.${classes.rightSide}`) === null && profilePopupVisible) {
            setProfilePopupVisible(false);
        }
    }, [profilePopupVisible]);

    useEffect(() => {
        // Attach click event listener to document to detect clicks outside the profile popup
        if (profilePopupVisible) {
            document.addEventListener('click', handleClickOutside);
        }

        // Clean up the event listener when component unmounts
        return () => {
            document.removeEventListener('click', handleClickOutside);
        };
    }, [profilePopupVisible, handleClickOutside]);

    return (
        <div className={classes.rightSide}>
            {/* Right Side */}
            <div className={classes.profileIconDiv} onClick={toggleProfilePopup}>
                <span className={classes.profileInitial}>
                    {user?.name ? user.name.charAt(0).toUpperCase() : user?.username ? user.username.charAt(0).toUpperCase() : '?'}
                </span>
            </div>
            <div className={classes.roleBadge}>
                {user?.roles?.map(r => r.name).join(' / ') || "Profile"}
            </div>
            {/* Render profile popup if visible */}
            {profilePopupVisible && <ProfilePopUp />}
            {impersonationBanner}
        </div>
    );
}
