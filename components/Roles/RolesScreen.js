import classes from './roles.module.css';
import HomeIcon from "@/components/ui/icons/HomeIcon";
import Link from "next/link";
import getAllUserRoles from "@/lib/controllers/userRoles/getAllUserRoles";
import RolesClient from './RolesClient';

export default async function RolesScreen() {
    const thisYear = new Date().getFullYear();
    const { userRoles } = await getAllUserRoles();

    return (
        <div className={classes.content}>
            <div className={classes.header}>
                <span>
                    <Link href='/dashboard'>
                        <HomeIcon />
                    </Link>
                </span>
                <span><small>| &nbsp; Identity management &nbsp; | &nbsp; Roles</small></span>
            </div>
            <div className={classes.topCenter}>
                <h1 className={classes.title}>User Roles</h1>
            </div>
            <div className={classes.centerContent}>
                <RolesClient initialRoles={userRoles} />
            </div>
            <div className={classes.copyright}>
                {thisYear} © Daystar Power Energy Solutions
            </div>
        </div>
    );
}
