'use client'
import { useState, useMemo } from 'react';
import classes from "./dataTable.module.css";
import ButtonFlexible from "@/components/ui/button-flexible/ButtonFlexible";
import { FaSearch } from "react-icons/fa";
import PlannedDataActions from "@/components/ui/modals/otherActions/PlannedDataActions/PlannedDataActions";
import PaginationComponent from "@/components/ui/pagination/PaginationComponent";

export default function PlannedMainDataTable({ allPowerProductionPlans }) {
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(5);
    const [searchTerm, setSearchTerm] = useState("");
    const NO_OF_COLUMNS = 5;

    const filtered = useMemo(() => {
        if (!searchTerm.trim()) return allPowerProductionPlans;
        return allPowerProductionPlans.filter(item =>
            item.file_name?.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [allPowerProductionPlans, searchTerm]);

    const totalPages = Math.ceil(filtered.length / itemsPerPage);

    const paginated = useMemo(() => {
        const start = (currentPage - 1) * itemsPerPage;
        return filtered.slice(start, start + itemsPerPage);
    }, [filtered, currentPage, itemsPerPage]);

    const handlePageChange = (page) => {
        setCurrentPage(page);
    };

    const handleItemsPerPageChange = (val) => {
        setItemsPerPage(val);
        setCurrentPage(1);
    };

    const handleSearch = (e) => {
        e.preventDefault();
        setSearchTerm(e.target.search.value);
        setCurrentPage(1);
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
                            maxLength={256}
                            name="search"
                            id="search"
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
            <div className={classes.filterText}>
                <span>
                    Advanced Filters
                </span>
            </div>
            <main className={classes.mainContent}>
                    <table className={`table table-bordered ${classes.table}`}>
                        <thead>
                            <tr>
                                <th>
                                    ACTIONS
                                </th>
                                <th>
                                    FILE NAME
                                </th>
                                <th>
                                    LAST UPDATE
                                </th>
                                <th>
                                    UPLOADED BY
                                </th>
                                <th>
                                    NOTE
                                </th>
                            </tr>
                        </thead>
                        <tbody>
                            {
                                paginated.length > 0 ?
                                    paginated.map((myPowerProductionPlan) => (
                                        <tr key={myPowerProductionPlan.id}>
                                            <td>
                                                {/* Use the ImportExportUsersComponent component */}
                                                <PlannedDataActions
                                                    menuItems={[
                                                        ['Download', 'openDownloadModal', 'dialogue', myPowerProductionPlan.id],
                                                        ['Edit', 'openEditModal', 'dialogue', myPowerProductionPlan.id],
                                                        ['Delete', 'openDeleteModal', 'dialogue', myPowerProductionPlan.id],
                                                    ]}
                                                />
                                            </td>
                                            <td>
                                                {myPowerProductionPlan.file_name}
                                            </td>
                                            <td>
                                                {myPowerProductionPlan.created_at.toLocaleString()}
                                            </td>
                                            <td>
                                                {myPowerProductionPlan.created_at.toLocaleString()}
                                            </td>
                                            <td>
                                                {myPowerProductionPlan.note}
                                            </td>
                                        </tr>
                                    ))
                                    : <tr
                                        style={{
                                            backgroundColor: '#0D202F',
                                            textAlign: 'center'
                                        }}
                                    >
                                        <td colSpan={NO_OF_COLUMNS}>
                                            
                                            <center>No data available</center>
                                        </td>
                                    </tr>
                            }

                        </tbody>
                    </table>

            </main>
                <PaginationComponent
                    currentPage={currentPage}
                    length={totalPages}
                    onPageChange={handlePageChange}
                    onClick={() => handlePageChange(Math.max(1, currentPage - 1))}
                    onClick1={() => handlePageChange(Math.min(totalPages, currentPage + 1))}
                    totalEntries={filtered.length}
                    itemsPerPage={itemsPerPage}
                    setItemsPerPage={handleItemsPerPageChange}
                />
        </>
    );
}
