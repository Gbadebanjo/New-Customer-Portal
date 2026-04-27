import classes from './settings.module.css';
import HomeIcon from "@/components/ui/icons/HomeIcon";
import Link from "next/link";
import { getSettings } from '@/lib/services/settings/settingsStore';
import SettingsClient from './SettingsClient';
import BackButton from '@/components/ui/BackButton/BackButton';

export default async function SettingsScreen() {
    const thisYear = new Date().getFullYear();
    const settings = getSettings();

    return (
        <div className={classes.content}>
            <div className={classes.header}>
                <span>
                    <Link href='/dashboard'>
                        <HomeIcon />
                    </Link>
                </span>
                <span><small>| &nbsp; Admin &nbsp; | &nbsp; Settings</small></span>
                <BackButton />
            </div>
            <div className={classes.topCenter}>
                <p className={classes.title}>Settings</p>
            </div>
            <div className={classes.centerContent} style={{ minHeight: 500 }}>
                <SettingsClient initialSettings={settings} />
                <div className={classes.copyright}>
                    {thisYear} © Daystar Power Energy Solutions
                </div>
            </div>
        </div>
    );
}
