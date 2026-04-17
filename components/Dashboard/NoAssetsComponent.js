'use client'
import classes from "@/components/Dashboard/dashboard.module.css";
import NoSitesIcon from "@/components/ui/icons/NoSitesIcon";
import Link from "next/link";

export function NoAssetsComponent() {
    const date = new Date();
    const thisYear = date.getFullYear();

    return <div className={classes.centerContent}>
        {/*Content*/}
        <div className="no-assets card">
            <div className="card-body text-center">
                <div className={classes.noSitesIconContainer}>
                    <div>
                        <NoSitesIcon/>
                    </div>
                </div>
                <div>
                    <h1 className={classes.largeText}>No Sites active</h1>
                    <p className="mt-3">
                        You currently have no available sites. If this is incorrect, please contact Daystar
                        admin on
                        <Link
                            href="mailto:CAS@daystar-power.com"
                            className={classes.link}
                        > CAS@daystar-power.com</Link> and
                        <Link
                        href="mailto:NOC@daystar-power.com"
                        className={classes.link}
                        > NOC@daystar-power.com</Link> for further
                        assistance.
                    </p>
                </div>
            </div>
        </div>
        <div className={classes.copyright}>

        </div>
    </div>;
}
