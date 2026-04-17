'use client'
import { useEffect, useState } from 'react';
import classes from "./dataTable.module.css";
import ButtonFlexible from "@/components/ui/button-flexible/ButtonFlexible";
import { FaSearch } from "react-icons/fa";
import SupportActions from "@/components/ui/modals/otherActions/SupportActions/SupportActions";
import { normalizeString } from "@/utils/constants";
import PaginationComponent from "@/components/ui/pagination/PaginationComponent";
import NoDataIcon from "@/components/ui/icons/NoDataIcon";
import NewTagButton from "@/components/ui/tags/NewTagButton";
import ReopenedTagButton from "@/components/ui/tags/ReopenedTagButton";
import ResolvedTagButton from "@/components/ui/tags/ResolvedTagButton";
import ActiveTagButton from "@/components/ui/tags/ActiveTagButton";
import { useUser } from "@/components/Context/userContext";

export default function SupportMainDataTable({
    allSupportQueries,
    allSupportQueryCategories,
    allSupportQueryStatuses,
    allCustomers
}) {
    const [currentPage, setCurrentPage] = useState(1);
    const [searchTerm, setSearchTerm] = useState("");
    useUser(); // keep context subscription for potential future use

    const itemsPerPage = 5;
    const NO_OF_COLUMNS = 6;

    const q = searchTerm.toLowerCase();
    const matched = q
        ? allSupportQueries.filter(item =>
            (item.title ?? '').toLowerCase().includes(q) ||
            (item.description ?? '').toLowerCase().includes(q)
        )
        : allSupportQueries;

    const totalPages = Math.ceil(matched.length / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const filteredSupportQueries = matched.slice(startIndex, startIndex + itemsPerPage);

    useEffect(() => { setCurrentPage(1); }, [searchTerm]);

    const handlePageChange = (page) => setCurrentPage(page);

    function getSupportCategoryById(category_id) {
        const categoryObject = allSupportQueryCategories.find(category => category.id === category_id);
        if (categoryObject) {
            return normalizeString(categoryObject.name);
        } else {
            return "";
        }
    }

    function getSupportStatusById(status_id) {
        let output = '';
        const statusObject = allSupportQueryStatuses.find(status => status.id === status_id);
        if (statusObject) {
            output = normalizeString(statusObject.name);

            switch (output) {
                case 'New':
                    return <NewTagButton />;
                case 'Active':
                    return <ActiveTagButton />;
                case 'Resolved':
                    return <ResolvedTagButton />;
                case 'Reopened':
                    return <ReopenedTagButton />;
                default:
                    return null;
            }

        } else {
            return "";
        }
    }

    function getACustomerById(customer_id) {
        const customerObject = allCustomers.find(customer => customer.id === customer_id);
        let output = '';
        if (customerObject) {
            output = customerObject.company_name;
        }
        return output;
    }

    const handleSearch = (e) => {
        e.preventDefault();
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
                            placeholder="Search tickets…"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <div className={classes.searchButton}>
                        <ButtonFlexible
                            link="#"
                            width={60}
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
            </div>
            <main className={classes.mainContent}>
                {/* <div style={{ width: '100%', overflowX: 'auto' }}> */}
                <table className={`table table-bordered ${classes.table}`}>
                    <thead>
                        <tr>
                            <th style={{ minWidth: 120 }}>ACTIONS</th>
                            <th style={{ minWidth: 180 }}>CUSTOMER</th>
                            <th style={{ minWidth: 160 }}>CATEGORY</th>
                            <th style={{ minWidth: 220 }}>TITLE</th>
                            <th style={{ minWidth: 140 }}>STATUS</th>
                            <th style={{ minWidth: 180 }}>LAST UPDATE</th>
                        </tr>
                    </thead>
                    <tbody
                        style={{ backgroundColor: '#0D202F' }}
                    >
                        {
                            filteredSupportQueries.length > 0 ?
                                filteredSupportQueries.map((mySupportQuery) => (
                                    <tr key={mySupportQuery.id}>
                                        <td>
                                            {/* Use the ImportExportUsersComponent component */}
                                            <SupportActions
                                                menuItems={[
                                                    ['Resolve', 'resolveModal', 'dialogue', mySupportQuery.id],
                                                    ['Details', `/support/details/${mySupportQuery.id}`, 'link', mySupportQuery.id],
                                                    ['Delete', 'deleteModal', 'dialogue', mySupportQuery.id],
                                                ]}
                                                supportQueryCategories={allSupportQueryCategories}
                                            />
                                        </td>
                                        <td>
                                            {getACustomerById(mySupportQuery.customer)}
                                        </td>
                                        <td>
                                            {/*{(mySupportQuery.category_id)}*/}
                                            {getSupportCategoryById(mySupportQuery.category_id)}
                                        </td>
                                        <td>
                                            {mySupportQuery.title}
                                        </td>
                                        <td>
                                            {/*SupportQuery status */}
                                            {getSupportStatusById(mySupportQuery.status_id)}
                                        </td>
                                        <td>
                                            {new Date(mySupportQuery.updated_at).toLocaleString()}
                                        </td>
                                    </tr>
                                ))
                                : <tr
                                    style={{
                                        backgroundColor: '#0D202F',
                                        textAlign: 'center',
                                    }}
                                >
                                    <td colSpan={NO_OF_COLUMNS} valign="top">
                                        <center> <NoDataIcon /></center>
                                        <center > You have no queries yet.</center>
                                        <center> Your queries would appear here once they are created.</center>
                                    </td>
                                </tr>
                        }

                    </tbody>
                </table>
                {/* </div> */}
            </main>

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

        </>
    );
}
