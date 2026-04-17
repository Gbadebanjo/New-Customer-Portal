import classes from './notSites.module.css';
import NavbarComponent from "@/components/ui/Navbar/NavbarContainer";
import HomeIcon from "@/components/ui/icons/HomeIcon";
import Link from "next/link";
import NoSitesIcon from "@/components/ui/icons/NoSitesIcon";
import RightSideComponent from "@/components/ui/rightside/RightSideComponent";

export default function NoSitesScreen() {
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
                                    admin on &nbsp;
                                    <Link
                                        href="mailto:CAS@daystar-power.com"
                                        className={classes.link} // Added className for styling
                                    >
                                        CAS@daystar-power.com
                                    </Link> and <Link
                                    href="mailto:NOC@daystar-power.com"
                                    className={classes.link} // Added className for styling
                                >
                                    NOC@daystar-power.com
                                </Link> for further assistance.
                                </p>


                            </div>
                        </div>
                    </div>
                    <div className={classes.copyright}>
                        {thisYear} © Daystar Power Energy Solutions
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