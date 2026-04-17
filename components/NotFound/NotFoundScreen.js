import classes from './notFound.module.css';
import NavbarComponent from "@/components/ui/Navbar/NavbarContainer";
import HomeIcon from "@/components/ui/icons/HomeIcon";
import Link from "next/link";
import NoSitesIcon from "@/components/ui/icons/NoSitesIcon";
import RightSideComponent from "@/components/ui/rightside/RightSideComponent";

export default function NotFoundScreen() {
    const date = new Date();
    const thisYear = date.getFullYear();
    return (
        <div className={classes.container}>
            {/* Header */}
            <div className={classes.header}>
               <span>
                   <Link href='/dashboard'>
                       <HomeIcon/>
                   </Link>
                 </span>
                <span> <small> | &nbsp; Dashboard</small></span>

            </div>
            {/* Sidebar */}
            <div className={classes.nav}>
                <div className={classes.sidebar}>
                    {/* Sidebar Header */}
                    <div className={classes.sidebarHeader}>
                        404 | Not Found
                    </div>
                    {/* Sidebar Menu */}
                    <NavbarComponent/>
                </div>
            </div>
            {/* Top Center */}
            {/* Content */}
            <div className={classes.content}>
                <div className={classes.centerContent}>
                    {/*Content*/}
                    <div className="no-assets card">
                        <div className="card-body text-center">
                            <div className={classes.noSitesIconContainer}>
                                <div>
                                    <NoSitesIcon/>
                                </div>
                            </div>
                            <div>
                                <h1 className="mt-3">No Sites active</h1>
                                <p className="mt-3">
                                    You currently have no available sites. If this is incorrect, please contact Daystar
                                    admin on
                                    <a href="mailto:CAS@daystar-power.com">CAS@daystar-power.com</a> and <a
                                    href="mailto:NOC@daystar-power.com">NOC@daystar-power.com</a> for further
                                    assistance.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

            </div>
            {/* Right Side */}
            <div className={classes.rightSide}>
                {/*Right Side*/}
                <RightSideComponent/>
            </div>
        </div>
    );
}