import classes from './reports.module.css';
import NavbarComponent from "@/components/ui/Navbar/NavbarContainer";
import HomeIcon from "@/components/ui/icons/HomeIcon";
import Link from "next/link";
import RightSideComponent from "@/components/ui/rightside/RightSideComponent";
import getAllReport from "@/lib/controllers/report/getAllReports";
import getAllCustomers from "@/lib/controllers/customers/getAllCustomers";
import CreateReportModal from "@/components/ui/modals/creates/createReport/CreateReportModal";
import ReportMainDataTable from "@/components/ui/tables/report/ReportMainDataTable";
import EditableReportTable from "@/components/ui/tables/report/EditableReportTable";
import db from '@/database/models';
import BackButton from '@/components/ui/BackButton/BackButton';

export default async function ReportsScreen({ userId }) {
    const date = new Date();
    const thisYear = date.getFullYear();
    // Look up user to determine role
    const user = await db.User.findByPk(userId, { raw: true });
    const roles = user?.roles || [];
    const isCustomerOnly = roles.length > 0 && roles.every(role => role.name === 'Customer');

    const {report} = await getAllReport();
    const allCustomers = isCustomerOnly ? [] : await getAllCustomers();

    return (<div className={classes.content}>
        {/* Header */}
        <div className={classes.header}>
                 <span>
                   <Link href='/dashboard'>
                       <HomeIcon/>
                   </Link>
                 </span>
            <span><small> | &nbsp; Reports</small></span>
                <BackButton />
        </div>

            {/* Top Center - Upload only visible to non-customer roles */}
            <div className={classes.topCenter}>
                <p className={classes.title}>Reports</p>
                {/* {!isCustomerOnly && <CreateReportModal />} */}
            </div>
          
            <div className={classes.centerContent}>
                <EditableReportTable
                    isCustomerOnly={isCustomerOnly}
                    customers={allCustomers}
                    userCustomerId={user?.customer || ''}
                />

                {/*footer area*/}
                <div className={classes.copyright}>
                    {thisYear} © Daystar Power Energy Solutions
                </div>
            </div>
    </div>);
}