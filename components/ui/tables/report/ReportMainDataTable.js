'use client'
import {useEffect, useState} from 'react';
import classes from "./dataTable.module.css";
import ButtonFlexible from "@/components/ui/button-flexible/ButtonFlexible";
import { FaSearch } from "react-icons/fa";
import ChevronDownIcon from "@/components/ui/icons/ChevronDownIcon";
import ReportActions from "@/components/ui/modals/otherActions/ReportActions/ReportActions";
import PaginationComponent from "@/components/ui/pagination/PaginationComponent";

export default function ReportMainDataTable({allReports}) {
    const [currentPage, setCurrentPage] = useState(1);
    const [searchTerm, setSearchTerm] = useState("");
    const itemsPerPage = 5;
    const NO_OF_COLUMNS = 3;

    const q = searchTerm.toLowerCase();
    const matched = q
        ? allReports.filter(report =>
            (report.name ?? '').toLowerCase().includes(q) ||
            (report.description ?? '').toLowerCase().includes(q)
        )
        : allReports;

    const totalPages = Math.ceil(matched.length / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const filteredReports = matched.slice(startIndex, startIndex + itemsPerPage);

    useEffect(() => { setCurrentPage(1); }, [searchTerm]);

    const handlePageChange = (page) => setCurrentPage(page);

    return (
        <>
            {/*search area*/}
            <form onSubmit={(e) => e.preventDefault()}>
                <div className={classes.searchArea}>
                    <div className={classes.searchTextInput}>
                        <input
                            type="text"
                            className={classes.inputText}
                            placeholder="Search reports…"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <div className={classes.searchButton}>
                        <ButtonFlexible
                            link="#"
                            width={60}
                            height={60}
                            style={{marginRight: 0}}
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
            </div>
            {/*Content*/}
            <main className={classes.mainContent}>
                    <table className={`table table-bordered ${classes.table}`}>
                        <thead>
                        <tr>
                            <th>
                                Actions
                            </th>
                            <th>
                                REPORT NAME
                            </th>
                            <th>
                                UPLOAD DATE
                            </th>
                        </tr>
                        </thead>
                        <tbody>
                        {
                            filteredReports.length > 0 ?
                                filteredReports.map((myReport) => (
                                    <tr key={myReport.id}>
                                        <td>
                                            {/* Use the ImportExportUsersComponent component */}
                                            <ReportActions
                                                menuItems={[
                                                    ['Edit', 'openEditModal', 'dialogue', myReport.id],
                                                    ['Delete', 'openDeleteModal', 'dialogue', myReport.id],
                                                    ['Download', '/admin/identity/users', 'link', myReport.id],
                                                ]}
                                            />
                                        </td>
                                        <td>
                                            {myReport.name}
                                        </td>
                                        <td>
                                            {myReport.created_at.toLocaleString()}
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

                 <PaginationComponent
                    onClick={() => handlePageChange(currentPage - 1)}
                    currentPage={currentPage}
                    length={totalPages}
                    mapfn={(_, index) => (
                        <button
                            key={index}
                            className={`join-item btn ${currentPage === index + 1 ? 'btn-active' : ''}`}
                            onClick={() => handlePageChange(index + 1)}
                        >
                            {index + 1}
                        </button>
                    )} onClick1={() => handlePageChange(currentPage + 1)}
                />
            </main>
        </>
    );
}
