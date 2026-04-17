'use client'
import React from 'react';

export default function PaginationComponent(props) {
    // Destructure new props for clarity
    const {
        currentPage,
        length,
        onClick,
        onClick1,
        onPageChange,
        itemsPerPage = 10,
        setItemsPerPage,
        totalEntries = 0,
    } = props;

    const start = totalEntries === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1;
    const end = Math.min(currentPage * itemsPerPage, totalEntries);

    const options = [5, 10, 25, 50, 100].filter(opt => opt < totalEntries || opt === itemsPerPage);

    return (
        <div className="w-full flex  items-center pt-8">
            <div className="w-1/2 flex justify-between items-center px-2 text-gray-400 text-base">
                <div>
                    Show&nbsp;
                    <select
                        value={itemsPerPage}
                        onChange={e => setItemsPerPage(Number(e.target.value))}
                        style={{ background: "#0d202f", color: "#fff", border: "none", borderRadius: 8, padding: "8px 26px", margin: '4px', cursor: 'pointer' }}
                    >
                        {options.map(opt => (
                            <option key={opt} value={opt}>{opt}</option>
                        ))}
                    </select>
                    &nbsp;entries
                </div>
                <div>
                    {totalEntries > 0
                        ? `Showing ${start} to ${end} of ${totalEntries} entries`
                        : "Showing 0 entries"}
                </div>
            </div>
            <div className="flex items-center w-1/2 justify-end gap-3 rounded-lg px-2">
                <button
                    className="btn btn-outline btn-md rounded-none "
                    onClick={onClick}
                    disabled={currentPage === 1}
                >
                    Previous
                </button>
                {Array.from({ length }, (_, i) => (
                    <button
                        key={i}
                        className={`btn btn-md py-4 ${currentPage === i + 1 ? "bg-[#FF7D70] text-white rounded-lg" : "bg-transparent text-white"}`}
                        onClick={() => onPageChange(i + 1)}
                    >
                        {i + 1}
                    </button>
                ))}
                <button
                    className="btn btn-md rounded-md bg-[#FF7D70] text-white"
                    onClick={onClick1}
                    disabled={currentPage === length}
                >
                    Next
                </button>
            </div>
        </div>
    );
}