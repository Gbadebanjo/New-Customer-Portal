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
            {/* Breadcrumb Header */}
            <div className={classes.header}>
                <span>
                    <Link href='/dashboard'>
                        <HomeIcon />
                    </Link>
                </span>
                <span><small> | &nbsp; Admin &nbsp; | &nbsp; Text Templates</small></span>
                <BackButton />
            </div>

            {/* Page Title */}
            <div className={classes.topCenter}>
                <p className={classes.title}>Text Templates</p>
            </div>

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
