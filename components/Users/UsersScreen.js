import classes from './users.module.css';
import HomeIcon from "@/components/ui/icons/HomeIcon";
import Link from "next/link";
import getAllUsers from "@/lib/controllers/users/getAllUsers";
import CreateUsersComponent from "@/components/ui/modals/creates/createUsers/CreateUsersModal"
// import getAllCustomers from "@/lib/controllers/customers/getAllCustomers";
// import getCustomerById from "@/lib/controllers/customers/getCustomerById";
import UsersMainDataTable from "@/components/ui/tables/users/UsersMainDataTable";
import CopyRight from '../ui/CopyRight/copyright';
import BackButton from '@/components/ui/BackButton/BackButton';

export default async function UsersScreen({ users, customers}) {
    // const { users } = await getAllUsers();
    // const customers = await getAllCustomers();

    return (
        <div className={classes.content}>
            {/* Header */}
            <div className={classes.header}>
                <span>
                    <Link href='/dashboard'>
                        <HomeIcon />
                    </Link>
                </span>
                <span> | &nbsp; Identity management </span>
                <BackButton />
            </div>
        
            <div className={classes.topCenter}>
                <CreateUsersComponent
                    customers={customers}
                    users={users}
                />
            </div>
            <div className={classes.centerContent}>
                <UsersMainDataTable
                    AllUsers={users}
                    AllCustomers={customers}
                />
            </div>
            <CopyRight />

        </div>
    );
}