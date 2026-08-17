import classes from './texttemplates.module.css';
import HomeIcon from "@/components/ui/icons/HomeIcon";
import Link from "next/link";
import getAllTextTemplates from "@/lib/controllers/textTemplates/getAllTextTemplates";
import getAllUsers from "@/lib/controllers/users/getAllUsers";
import TextTemplatesClient from "./TextTemplatesClient";
import BackButton from '@/components/ui/BackButton/BackButton';

export default async function TextTemplatesScreen() {
    const date = new Date();
    const thisYear = date.getFullYear();
    const [{ textTemplates }, { users }] = await Promise.all([
        getAllTextTemplates(),
        getAllUsers(),
    ]);
    // Only expose the fields the compose modal needs — never send hashes,
    // roles, or lockout state over the wire to the client.
    const recipients = (users || []).map((u) => ({
        id: u.id,
        name: [u.name, u.surname].filter(Boolean).join(' '),
        username: u.username,
        email: u.email,
        customer: u.customer,
    })).filter((u) => u.email);

    return (
        <div className={classes.content}>
            {/* Breadcrumb */}
            <nav className={classes.header} aria-label="Breadcrumb">
                <Link href="/dashboard" className={classes.crumbHome}>
                    <HomeIcon />
                </Link>
                <span className={classes.crumbSep}>|</span>
                <span className={classes.crumbMuted}>Admin</span>
                <span className={classes.crumbSep}>|</span>
                <span className={classes.crumbCurrent}>Text Templates</span>
                <span className={classes.crumbBack}><BackButton /></span>
            </nav>

            {/* Page header — title, subtitle */}
            <header className={classes.pageHeader}>
                <div className={classes.pageHeaderRow}>
                    <h1 className={classes.title}>Text Templates</h1>
                </div>
                <p className={classes.subtitle}>
                    Reusable email templates the app sends on your behalf — invitations,
                    password resets, report-ready notices, and any custom messages you
                    compose from here.
                </p>
            </header>

            {/* Client component handles search + card grid */}
            <div className={classes.centerContent}>
                <TextTemplatesClient textTemplates={textTemplates} recipients={recipients} />
                <div className={classes.copyright}>
                    {thisYear} © Daystar Power Energy Solutions
                </div>
            </div>
        </div>
    );
}
