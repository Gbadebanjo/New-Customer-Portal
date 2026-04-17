'use client'
import classes from "@/components/Dashboard/dashboard.module.css";
import TooManySitesIcon from "@/components/ui/icons/TooManySitesIcon";
import Link from "next/link";

export function TooManyAssetsComponent() {
    const date = new Date();
    const thisYear = date.getFullYear();

    return (
        <div className={classes.centerContent}>
            {/*Content*/}
            <div className="no-assets card">
                <div className="card-body text-center">
                    <div className={classes.noSitesIconContainer}>
                        <div>
                            <TooManySitesIcon />
                        </div>
                    </div>
                    <div>
                        <h1 className={classes.largeText}>Too Many Sites</h1>
                        <p className="mt-3">
                            You have too many sites for us to efficiently show on your dashboard. Please contact Daystar on
                            <Link
                                href="mailto:CAS@daystar-power.com"
                                className={classes.link}
                            >CAS@daystar-power.com</Link> and
                            <Link
                                href="mailto:NOC@daystar-power.com"
                                className={classes.link}
                            >NOC@daystar-power.com</Link>  to understand why.
                        </p>
                    </div>
                </div>
            </div>
            <div className={classes.copyright}>
                {thisYear} © Daystar Power Energy Solutions
            </div>
        </div>
    );
}
