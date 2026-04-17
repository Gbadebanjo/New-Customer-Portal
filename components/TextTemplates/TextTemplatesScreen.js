import classes from './texttemplates.module.css';
import HomeIcon from "@/components/ui/icons/HomeIcon";
import Link from "next/link";
import getAllTextTemplates from "@/lib/controllers/textTemplates/getAllTextTemplates";
import TextTemplatesClient from "./TextTemplatesClient";

export default async function TextTemplatesScreen() {
    const date = new Date();
    const thisYear = date.getFullYear();
    const { textTemplates } = await getAllTextTemplates();

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
            </div>

            {/* Page Title */}
            <div className={classes.topCenter}>
                <p className={classes.title}>Text Templates</p>
            </div>

            {/* Client component handles search + card grid */}
            <div className={classes.centerContent}>
                <TextTemplatesClient textTemplates={textTemplates} />
                <div className={classes.copyright}>
                    {thisYear} © Daystar Power Energy Solutions
                </div>
            </div>
        </div>
    );
}
