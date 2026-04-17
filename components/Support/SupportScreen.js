'use server'
import classes from './support.module.css';
import HomeIcon from "@/components/ui/icons/HomeIcon";
import Link from "next/link";
import getAllSupportQueries from "@/lib/controllers/supportQuery/getAllSupportQueries";
import CreateSupportModal from "@/components/ui/modals/creates/createSupportQuerry/CreateSupportModal";
import getAllSupportQueryCategories from "@/lib/controllers/supportQueryCategory/getAllSupportQueryCategories";
import SupportMainDataTable from "@/components/ui/tables/support/SupportMainDataTable";
import getAllSupportQueryStatuses from "@/lib/controllers/supportQueryStatus/getAllSupportQueryStatuses";
import getAllCustomers from "@/lib/controllers/customers/getAllCustomers";


  export default async function SupportScreen({ userId }) {
    const date = new Date();
    const thisYear = date.getFullYear();
    const {supportQueries} = await getAllSupportQueries(userId);
    const {supportQueryCategories} = await getAllSupportQueryCategories();
    const {supportQueryStatuses} = await getAllSupportQueryStatuses();
    const allCustomers = await getAllCustomers();
   

    return (
        <div className={classes.content}>
            {/* Header */}
            <div className={classes.header}>
                 <span>
                   <Link href='/dashboard'>
                       <HomeIcon/>
                   </Link>
                 </span>
                <span> <small>| &nbsp; Support</small></span>
            </div>
            {/* Content */}
            <div className={classes.content}>
                {/* Top Center */}
                <div className={classes.topCenter}>
                    <p className={classes.title}>Support</p>
                    <CreateSupportModal
                        supportQueryCategories={supportQueryCategories}
                    />
                </div>
                <div className={classes.centerContent}>
                   <SupportMainDataTable
                       allSupportQueries={supportQueries}
                       allSupportQueryCategories={supportQueryCategories}
                       allSupportQueryStatuses={supportQueryStatuses}
                       allCustomers={allCustomers}
                   />
                    <div className={classes.copyright}>
                        {thisYear} © Daystar Power Energy Solutions
                    </div>
                </div>
            </div>
        </div>
    );
}