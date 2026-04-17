import classes from './customers.module.css';
import HomeIcon from "@/components/ui/icons/HomeIcon";
import Link from "next/link";
import getAllCustomers from "@/lib/controllers/customers/getAllCustomers";
import CreateCustomerModal from "@/components/ui/modals/creates/createCustomer/CreateCustomerModal";
import CustomerMainDataTable from "@/components/ui/tables/customer/CustomerMainDataTable";
import CopyRight from '../ui/CopyRight/copyright';

export default async function CustomersScreen() {
    const allCustomers = await getAllCustomers();
    // console.log('allCustomers', allCustomers);

    return (
        <div className={classes.content}>
            <div className={classes.header}>
                <span>
                    <Link href='/dashboard'>
                        <HomeIcon />
                    </Link>
                </span>
                <span> | &nbsp; Customers</span>
            </div>
            <div className={classes.topCenter}>
                <CreateCustomerModal />
            </div>
            <div className={classes.centerContent}>
                <CustomerMainDataTable allCustomers={allCustomers} />
            </div>
            <CopyRight />
        </div>
    );
}
