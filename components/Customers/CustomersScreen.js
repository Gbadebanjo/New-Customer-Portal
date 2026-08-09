import classes from './customers.module.css';
import HomeIcon from "@/components/ui/icons/HomeIcon";
import Link from "next/link";
import getAllCustomers from "@/lib/controllers/customers/getAllCustomers";
import getAllUsers from "@/lib/controllers/users/getAllUsers";
import CreateCustomerModal from "@/components/ui/modals/creates/createCustomer/CreateCustomerModal";
import CustomerMainDataTable from "@/components/ui/tables/customer/CustomerMainDataTable";
import CopyRight from '../ui/CopyRight/copyright';
import BackButton from '@/components/ui/BackButton/BackButton';

export default async function CustomersScreen({ canWrite = true }) {
    const [allCustomers, { users: allUsers }] = await Promise.all([
        getAllCustomers(),
        getAllUsers(),
    ]);

    return (
        <div className={classes.content}>
            <div className={classes.header}>
                <span>
                    <Link href='/dashboard'>
                        <HomeIcon />
                    </Link>
                </span>
                <span> | &nbsp; Customers</span>
                <BackButton />
            </div>
            {canWrite && (
                <div className={classes.topCenter}>
                    <CreateCustomerModal />
                </div>
            )}
            <div className={classes.centerContent}>
                <CustomerMainDataTable allCustomers={allCustomers} allUsers={allUsers} canWrite={canWrite} />
            </div>
            <CopyRight />
        </div>
    );
}
