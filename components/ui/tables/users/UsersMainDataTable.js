'use client'
import { useEffect, useState } from 'react';
import Link from 'next/link';
import UserActions from "@/components/ui/modals/otherActions/UserActions/UserActions";
import classes from "./dataTable.module.css";
import ButtonFlexible from "@/components/ui/button-flexible/ButtonFlexible";
import SearchIcon from "@/components/ui/icons/SearchIcon";
import ChevronDownIcon from "@/components/ui/icons/ChevronDownIcon";
import BlockedIcon from "@/components/ui/icons/BlockedIcon";
import CheckIcon from "@/components/ui/icons/CheckIcon";
import PaginationComponent from "@/components/ui/pagination/PaginationComponent";
import { FaSearch, FaCheck } from "react-icons/fa";
import { ImBlocked } from "react-icons/im";

export default function UsersMainDataTable({ AllUsers, AllCustomers, canWrite = true }) {
    const [currentPage, setCurrentPage] = useState(1);
    const [searchTerm, setSearchTerm] = useState("");
    const [itemsPerPage, setItemsPerPage] = useState(10);
    const NO_OF_COLUMNS = 15;

    const q = searchTerm.toLowerCase();
    const matchedUsers = q
        ? AllUsers.filter(user =>
            (user.name ?? '').toLowerCase().includes(q) ||
            (user.surname ?? '').toLowerCase().includes(q) ||
            (user.email ?? '').toLowerCase().includes(q) ||
            (user.username ?? '').toLowerCase().includes(q) ||
            (user.customer ?? '').toLowerCase().includes(q)
        )
        : AllUsers;

    const totalPages = Math.ceil(matchedUsers.length / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const filteredUsers = matchedUsers.slice(startIndex, startIndex + itemsPerPage);

    // Reset to page 1 when search or page-size changes
    useEffect(() => { setCurrentPage(1); }, [searchTerm, itemsPerPage]);

    const handlePageChange = (page) => setCurrentPage(page);

    const handleItemsPerPageChange = (n) => {
        setItemsPerPage(n);
        setCurrentPage(1);
    };

    function getACustomerById(customer_id) {
        const customerObject = AllCustomers.find(customer => customer.id === customer_id);
        return customerObject ? customerObject.company_name : '';
    }

    return (
        <>
            {/*search area*/}
            <form onSubmit={(e) => e.preventDefault()}>
                <div className={classes.searchArea}>
                    <div className={classes.searchTextInput}>
                        <input
                            type="text"
                            className={classes.inputText}
                            placeholder="Search name, email, username, customer…"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <div className={classes.searchButton}>
                        <ButtonFlexible
                            link="#"
                            width={59}
                            height={60}
                            style={{ marginRight: 0 }}
                            type="button"
                        >
                            <FaSearch size={40} />
                        </ButtonFlexible>
                    </div>
                </div>
            </form>
            <div className={classes.filterText}>
                <span>
                    Advanced Filters
                </span>
                <span>
                    <ChevronDownIcon />
                </span>
            </div>
            {/*Content*/}
            <main className={classes.mainContent}>
                <table
                    className='table table-bordered'
                >
                    <thead>
                        <tr>
                            <th>
                                ACTIONS
                            </th>
                            <th>
                                USER NAME
                            </th>
                            <th>
                                EMAIL ADDRESS
                            </th>
                            <th>
                                ROLE
                            </th>
                            <th>
                                PHONE NUMBER
                            </th>
                            <th>
                                NAME
                            </th>
                            <th>
                                SURNAME
                            </th>
                            <th>
                                ACTIVE
                            </th>
                            <th>
                                ACCOUNT LOCKOUT
                            </th>
                            <th>
                                EMAIL CONFIRMED
                            </th>
                            <th>
                                ACCESS FAILED COUNT
                            </th>
                            <th>
                                CREATION TIME
                            </th>
                            <th>
                                LAST MODIFICATION TIME
                            </th>
                            <th>
                                CUSTOMER
                            </th>
                        </tr>
                    </thead>
                    <tbody>
                        {
                            filteredUsers.length > 0 ?
                                filteredUsers.map((myUser) => (
                                    <tr key={myUser.id}>
                                        <td>
                                            {/* Use the ImportExportUsersComponent component */}
                                            <UserActions
                                                menuItems={[
                                                    // Edit and Delete are only for write-capable admins.
                                                    // DCA (canWrite=false) sees "Log in with this user"
                                                    // only — read + impersonate.
                                                    ...(canWrite ? [['Edit', 'openEditModal', 'dialogue', myUser.id]] : []),
                                                    ...(Array.isArray(myUser.roles) && myUser.roles.some(role => role?.name === 'Customer') ? [['Log in with this user', '/host', 'dialogue', myUser.id]] : []),
                                                    ...(canWrite ? [['Delete', 'openDeleteModal', 'dialogue', myUser.id]] : []),
                                                ]}
                                                customers={AllCustomers}
                                            />
                                        </td>
                                        <td>
                                            <Link
                                                href={`/admin/identity/users/${myUser.id}`}
                                                style={{ color: '#ff9770', textDecoration: 'none', fontWeight: 500 }}
                                                title="Open user detail"
                                            >
                                                {myUser.username}
                                            </Link>
                                        </td>
                                        <td style={{ whiteSpace: 'nowrap' }}>
                                            {myUser.email}
                                        </td>
                                        <td style={{ whiteSpace: 'nowrap' }}>
                                            {myUser.roles.map(role => role.name).join(', ')}
                                        </td>
                                        <td>
                                            {myUser.phone_number}
                                        </td>
                                        <td>
                                            {myUser.name}
                                        </td>
                                        <td>
                                            {myUser.surname}
                                        </td>
                                        <td>
                                            {myUser.not_active ? <ImBlocked color='red' /> : <FaCheck color='green' />}
                                        </td>
                                        <td>
                                            {myUser.is_locked_out ? <ImBlocked color='red' /> : <FaCheck color='green' />}
                                        </td>
                                        <td>
                                            {myUser.email_confirmed ? <FaCheck color='green' /> : <ImBlocked color='red' />}
                                        </td>
                                        <td>
                                            {myUser.failed_login_attempts ?? 0}
                                        </td>
                                        <td style={{ whiteSpace: 'nowrap' }}>
                                            {new Date(myUser.created_at).toLocaleString('en-US', {
                                                year: 'numeric',
                                                month: '2-digit',
                                                day: '2-digit',
                                                hour: '2-digit',
                                                minute: '2-digit',
                                                hour12: true
                                            })}
                                        </td>
                                        <td>
                                            {new Date(myUser.updated_at).toLocaleString('en-US', {
                                                year: 'numeric',
                                                month: '2-digit',
                                                day: '2-digit',
                                                hour: '2-digit',
                                                minute: '2-digit',
                                                hour12: true
                                            })}
                                        </td>
                                        <td>
                                            {getACustomerById(myUser.customer)}
                                        </td>
                                    </tr>
                                ))
                                : <tr
                                    style={{
                                        backgroundColor: '#0D202F',
                                        textAlign: 'center'
                                    }}
                                >
                                    <td colSpan={NO_OF_COLUMNS}>No data available</td>
                                </tr>
                        }

                    </tbody>
                </table>
                <PaginationComponent
                    currentPage={currentPage}
                    length={totalPages}
                    totalEntries={AllUsers.length}
                    itemsPerPage={itemsPerPage}
                    setItemsPerPage={handleItemsPerPageChange}
                    onPageChange={handlePageChange}
                    onClick={() => handlePageChange(currentPage - 1)}
                    onClick1={() => handlePageChange(currentPage + 1)}
                />
            </main>
        </>
    );
}
