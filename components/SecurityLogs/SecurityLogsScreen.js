import classes from './securitylogs.module.css';
import HomeIcon from "@/components/ui/icons/HomeIcon";
import Link from "next/link";
import SecurityLogMainDataTable from "@/components/ui/tables/securityLogs/SecurityLogMainDataTable";

export default function SecurityLogsScreen() {
    const thisYear = new Date().getFullYear();
    return (
        <div className={classes.content}>
            <div className={classes.header}>
                <span>
                    <Link href='/dashboard'>
                        <HomeIcon />
                    </Link>
                </span>
                <span><small>| &nbsp; Admin &nbsp; | &nbsp; Security Logs</small></span>
            </div>
            <div className={classes.topCenter}>
                <p className={classes.title}>Security Logs</p>
            </div>
            <div className={classes.centerContent}>
                <SecurityLogMainDataTable />
                <div className={classes.copyright}>
                    {thisYear} © Daystar Power Energy Solutions
                </div>
            </div>
        </div>
    );
}