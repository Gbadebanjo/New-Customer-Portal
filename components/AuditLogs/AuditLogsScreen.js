import classes from './auditlogs.module.css';
import HomeIcon from "@/components/ui/icons/HomeIcon";
import Link from "next/link";
import AuditLogTable from "@/components/ui/tables/auditLogs/AuditLogTable";
import BackButton from '@/components/ui/BackButton/BackButton';

export default function AuditLogsScreen() {
    const thisYear = new Date().getFullYear();
    return (
        <div className={classes.content}>
            <div className={classes.header}>
                <span>
                    <Link href='/dashboard'>
                        <HomeIcon />
                    </Link>
                </span>
                <span><small>| &nbsp; Admin &nbsp; | &nbsp; Audit Logs</small></span>
                <BackButton />
            </div>
            <div className={classes.topCenter}>
                <p className={classes.title}>Audit Logs</p>
            </div>
            <div className={classes.centerContent}>
                <AuditLogTable />
                <div className={classes.copyright}>
                    {thisYear} © Daystar Power Energy Solutions
                </div>
            </div>
        </div>
    );
}