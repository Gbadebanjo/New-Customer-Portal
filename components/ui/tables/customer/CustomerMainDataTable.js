'use client'
import { useEffect, useState } from 'react';
import CustomerActions from "@/components/ui/modals/otherActions/CustomerActions/CustomerActions";
import classes from "./dataTable.module.css";
import ButtonFlexible from "@/components/ui/button-flexible/ButtonFlexible";
import { FaSearch } from "react-icons/fa";
import PaginationComponent from "@/components/ui/pagination/PaginationComponent";

export default function CustomerMainDataTable({ allCustomers, allUsers = [], canWrite = true }) {
    const [currentPage, setCurrentPage] = useState(1);
    const [searchTerm, setSearchTerm] = useState("");
    const [itemsPerPage, setItemsPerPage] = useState(10);
    const NO_OF_COLUMNS = 4;

    // Filter customers by search term
    const filteredCustomers = allCustomers?.filter(customer =>
        customer.company_name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    // Pagination logic on filtered results
    const totalPages = Math.ceil(filteredCustomers.length / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = currentPage * itemsPerPage;
    const paginatedCustomers = filteredCustomers.slice(startIndex, endIndex);

    // Reset to first page when search changes
    useEffect(() => {
        setCurrentPage(1);
    }, [searchTerm, itemsPerPage]);

    const handleSearch = (e) => {
        e.preventDefault();
        // No need to setSearchTerm here, it's handled by onChange
    };

    const handlePageChange = (page) => {
        setCurrentPage(page);
    };

    return (
        <>
            {/*search area*/}
            <form onSubmit={handleSearch}>
                <div className={classes.searchArea}>
                    <div className={classes.searchTextInput}>
                        <input
                            type="text"
                            className={classes.inputText}
                            placeholder="Search"
                            name="search"
                            id="search"
                            onChange={(e) => setSearchTerm(e.target.value)}
                            value={searchTerm}
                        />
                    </div>
                    <div className={classes.searchButton}>
                        <ButtonFlexible
                            link="#"
                            width={60}
                            height={60}
                            style={{ marginRight: 0 }}
                            type="submit"
                        >
                            <FaSearch size={40} />
                        </ButtonFlexible>
                    </div>
                </div>
            </form>

            {/*Content*/}
            <main className={classes.mainContent}>
                <table className="table table-bordered" style={{ width: '100%' }}>
                    <thead>
                        <tr>
                            <th>ACTIONS</th>
                            <th>COMPANY NAME</th>
                            <th>NUMBER OF USERS</th>
                            <th>DATE ADDED</th>
                        </tr>
                    </thead>
                    <tbody>
                        {paginatedCustomers.length > 0 ? paginatedCustomers.map((myCustomer) => (
                            <tr key={myCustomer.id}>
                                <td>
                                    <CustomerActions
                                        menuItems={[
                                            // Edit and Delete are hidden for read-only roles (DCA).
                                            ...(canWrite ? [['Edit', 'openEditModal', 'dialogue', myCustomer.id]] : []),
                                            ...(canWrite ? [['Delete', 'openDeleteModal', 'dialogue', myCustomer.id]] : []),
                                            ['Users', `/customers/${myCustomer.id}`, myCustomer.id],
                                        ]}
                                    />
                                </td>
                                <td>{myCustomer.company_name}</td>
                                <td>{allUsers.filter(u => u.customer === myCustomer.id).length}</td>
                                <td>{new Date(myCustomer.created_at).toLocaleString('en-US', {
                                    year: 'numeric',
                                    month: '2-digit',
                                    day: '2-digit',
                                    hour: '2-digit',
                                    minute: '2-digit',
                                    hour12: true
                                })}</td>
                            </tr>
                        )) : <tr
                            style={{
                                backgroundColor: '#0D202F',
                                textAlign: 'center',
                                padding: 20,
                                margin: 20
                            }}
                        >
                            <td colSpan={NO_OF_COLUMNS}>No data available</td>
                        </tr>}
                    </tbody>
                </table>
                <PaginationComponent
                    onClick={() => handlePageChange(currentPage - 1)}
                    currentPage={currentPage}
                    length={totalPages}
                    onPageChange={handlePageChange}
                    onClick1={() => handlePageChange(currentPage + 1)}
                    itemsPerPage={itemsPerPage}
                    setItemsPerPage={setItemsPerPage}
                    totalEntries={filteredCustomers.length}
                />
            </main>
        </>
    );
}