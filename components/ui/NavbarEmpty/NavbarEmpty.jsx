'use client';
import {useState} from 'react';
import classes from './navbarEmpty.module.css';
import Image from 'next/image';
import DayStarLogo from '@/public/img/daystar/sidenav-logo-bottom.png';
import {usePathname} from 'next/navigation';

export default function NavbarEmptyComponent() {
    const path = usePathname();
    const [adminMenuOpen, setAdminMenuOpen] = useState(path.includes('/admin/'));
    const [identityMenuOpen, setIdentityMenuOpen] = useState(path.includes('/admin/identity'));

    return (
        <div className={classes.sidebarMenu}>
            {/* Sidebar Menu Items */}

            {/* Image */}
            <div className={classes.dayStarLogoForMenu}>
                <Image src={DayStarLogo} alt='Daystar Logo' priority/>
            </div>
        </div>
    );
}
