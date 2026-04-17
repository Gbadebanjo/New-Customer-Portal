import classes from './403Forbidden.module.css';
import NavbarEmptyComponent from "@/components/ui/NavbarEmpty/NavbarEmpty";
import Link from "next/link";
import LoginIcon from "@/components/ui/icons/LoginIcon";
import FrownIcon from "@/components/ui/icons/FrownIcon";
import Button from "@/components/ui/button/Button";
import ButtonWhite from "@/components/ui/button-white/Button"; // Import the image

export default function Forbidden403Screen() {

    return (
        <div className={classes.container}>
            {/* Header */}
            <div className={classes.header}>
                 <span>

                 </span>
                <span>
                403 |  &nbsp; FORBIDDEN</span>
            </div>
            {/* Sidebar */}
            <div className={classes.nav}>
                <div className={classes.sidebar}>
                    {/* Sidebar Header */}
                    <div className={classes.sidebarHeader}>

                    </div>
                    {/* Sidebar Menu */}
                    <NavbarEmptyComponent/>
                </div>
            </div>
            {/* Top Center */}
            {/* Content */}
            <div className={classes.content}>

                <div className={classes.centerContent}>
                    {/*Content*/}
                    <div className={classes.leftContent}>
                        <FrownIcon/>
                    </div>
                    <div className={classes.rightContent}>
                        <div className="status-content">
                            <h1 className={classes.orangeText}>403</h1>
                            <h2 className={classes.blueButton}>Forbidden</h2>
                            <h5 className="text-muted">Your login may have timed out. Please visit the login
                                page to login again.</h5>
                            <p className="mt-3 mb-4"></p>
                            <div className={classes.backButton}>
                                <ButtonWhite
                                    link={"javascript:history.back()"}
                                    width={237}
                                >
                                    <div
                                        style={{
                                            width: '237px',
                                            height: '50px',
                                            paddingLeft: '16px',
                                            paddingRight: '16px',
                                            paddingTop: '14px',
                                            paddingBottom: '10px',
                                            borderRadius: '5px',
                                            textAlign: 'center',
                                            fontSize: 20,
                                            fontFamily: "sans-serif",
                                            fontWeight: '600',
                                            letterSpacing: 0.50,
                                            wordWrap: 'break-word',
                                        }}
                                    >
                                        Go Back
                                    </div>
                                </ButtonWhite>
                            </div>

                            <div>
                                <Button
                                    link={"/"}
                                    width={237}
                                >
                                    <div style={{
                                        textAlign: 'center',
                                        color: 'white',
                                        fontSize: 20,
                                        fontFamily: "sans-serif",
                                        fontWeight: '500',
                                        letterSpacing: 0.50,
                                        wordWrap: 'break-word'
                                    }}>Go to the homepage
                                    </div>
                                </Button>
                            </div>

                        </div>
                    </div>
                </div>

            </div>
            {/* Right Side */}
            <div className={classes.rightSide}>
                {/*Right Side*/}
                <div className={classes.profileIconDiv}>
                    {/* eslint-disable-next-line react/jsx-no-undef */}
                    <Link className="btn" role="button" href="/login">
                        <LoginIcon/>
                        Login
                    </Link>
                </div>

            </div>
        </div>
    );
}