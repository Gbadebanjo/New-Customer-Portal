'use client'
import React, { useEffect, useRef, useState } from 'react';
import styles from './ImportExportUsers.module.css';
import ButtonFlexible from "@/components/ui/button-flexible/ButtonFlexible";
import ChevronDownIcon from "@/components/ui/icons/ChevronDownIcon";
import classes from "@/components/ui/modals/creates/createCustomer/createCustomerModal.module.css";
import XMarkIcon from "@/components/ui/icons/XMarkIcon";
import { ButtonSaveSubmit } from "@/components/ui/ButtonSaveAndSubmit/ButtonSaveAndSubmit";
import { ButtonWhiteClose } from "@/components/ui/ButtonWhiteClose/ButtonWhiteClose";
import WarnCircleBigIcon from "@/components/ui/icons/WarnCircleBigIcon";
import importExcel from "@/lib/controllers/users/importExcel";
import {convertRolesToString} from "@/utils/constants";

function getACustomerById(customerId, allCustomers) {
    if (!customerId || !Array.isArray(allCustomers)) return customerId || '';
    const found = allCustomers.find(c => String(c.id) === String(customerId));
    return found ? found.company_name : customerId;
}

function jsonToCSV(data) {
    if (!data || data.length === 0) return '';
    const headers = Object.keys(data[0]);
    const rows = data.map(row =>
        headers.map(h => {
            const val = row[h] == null ? '' : String(row[h]);
            const escaped = val.replace(/"/g, '""');
            return /[",\n\r]/.test(escaped) ? `"${escaped}"` : escaped;
        }).join(',')
    );
    return [headers.join(','), ...rows].join('\r\n');
}

const ImportExportUsersComponent = ({ input }) => {
    const [isOpen, setIsOpen] = useState(false);
    const popupRef = useRef(null);
    const [selectedCustomer, setSelectedCustomer] = useState('');
    const [importFile, setImportFile] = useState(null);

    const [isImportModalOpen, setIsImportModalOpen] = useState(false);
    const [isExportModalOpen, setIsExportModalOpen] = useState(false);

    const [isCustomAlertModalOpen, setIsCustomAlertModalOpen] = useState(false);
    const [alertMessage, setAlertMessage] = useState('');

    const importModalRef = useRef(null);
    const exportModalRef = useRef(null);
    const customAlertPopupRef = useRef(null);

    useEffect(() => {
        if (isImportModalOpen) {
            importModalRef.current.showModal();
        } else {
            importModalRef.current.close();
        }
    }, [isImportModalOpen]);

    useEffect(() => {
        if (isExportModalOpen) {
            exportModalRef.current.showModal();
        } else {
            exportModalRef.current.close();
        }
    }, [isExportModalOpen]);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (popupRef.current && !popupRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };

        document.addEventListener("mousedown", handleClickOutside);
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, []);

    useEffect(() => {
        if (isCustomAlertModalOpen) {
            customAlertPopupRef.current.showModal();
        } else {
            customAlertPopupRef.current.close();
        }
    }, [isCustomAlertModalOpen]);

    const openImportModal = () => {
        setIsImportModalOpen(true);
    };

    const closeImportModal = () => {
        setIsImportModalOpen(false);
        setIsOpen(false);
    };

    const openExportModal = () => {
        setIsExportModalOpen(true);
    };

    const closeExportModal = () => {
        setIsExportModalOpen(false);
        setIsOpen(false);
    };

    const togglePopup = () => {
        setIsOpen(!isOpen);
    };

    const selectDialogue = (itemElement) => {
        if (itemElement === 'openImportModal') {
            openImportModal();
        } else if (itemElement === 'openExportModal') {
            openExportModal();
        } else {
            openCustomAlertPopup('Invalid action selected.');
        }
    }

    const openCustomAlertPopup = (msg) => {
        setAlertMessage(msg);
        setIsCustomAlertModalOpen(true);
    };

    const closeCustomAlertModal = () => {
        setIsCustomAlertModalOpen(false);
        setIsOpen(false);
    };

    const handleImportData = async () => {

        if (!importFile) {
            openCustomAlertPopup('No file selected');
            return;
        }

        const formData = new FormData();
        formData.append('file', importFile);
        formData.append('selectedCustomer', selectedCustomer);

        try {
            const response = await importExcel(formData);

            if (response) {
                openCustomAlertPopup('Import completed successfully!');
            } else {
                openCustomAlertPopup('An error occurred during import');
            }
        } catch (error) {
            console.error(error);
            openCustomAlertPopup('An error occurred during import');
        } finally {
            closeImportModal();
        }
    };

    const handleFileChange = (event) => {
        setImportFile(event.target.files[0]);
    };

    const handleExportData = () => {
        const { allUsersObj, allCustomersObj } = input;
        try {
            if (!allUsersObj || !Array.isArray(allUsersObj)) {
                openCustomAlertPopup('No data available for export.');
                return;
            }

            const mappedUsersObj = allUsersObj.map(user => ({
                Username: user.username || '',
                Name: user.name || '',
                Surname: user.surname || '',
                Email: user.email || '',
                Phone: user.phone_number || '',
                Customer: getACustomerById(user.customer, allCustomersObj),
                Roles: convertRolesToString(user.roles),
                Timezone: user.timezone || '',
                Active: user.not_active ? 'No' : 'Yes',
                EmailConfirmed: user.email_confirmed ? 'Yes' : 'No',
                CreatedAt: user.created_at ? new Date(user.created_at).toISOString() : '',
            }));

            const csvData = jsonToCSV(mappedUsersObj);
            const blob = new Blob([csvData], {type: 'text/csv'});
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.style.display = 'none';
            a.href = url;
            a.download = 'export.csv';
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            closeExportModal();
            openCustomAlertPopup('Export completed successfully!');
        } catch (e) {
            openCustomAlertPopup('Unsupported export format');
        }
    };

    return (
        <div ref={popupRef} className={styles.actionsPopup}>
            <ButtonFlexible
                link="#"
                width={100}
                height={40}
                onClick={togglePopup}
                style={{
                    marginRight: 0,
                }}
            >
                <small>{input.name} </small> <small> <ChevronDownIcon /></small>
            </ButtonFlexible>
            {isOpen && (
                <ul className={styles.dropdownMenu}>
                    {input.menuItems.map((item, index) => (
                        <li key={index} className={styles.dropdownItem}>
                            <button
                                type="button"
                                onClick={() => selectDialogue(item[1])}
                                className={styles.dropdownLink}
                            >
                                {item[0]}
                            </button>
                        </li>
                    ))}
                </ul>
            )}
            {/* DaisyUI Modals */}
            {/*import dialogue*/}
            <dialog
                id="import_modal"
                className="modal"
                ref={importModalRef}
                style={{
                    display: "flex",
                    alignItems: "flex-start",
                    justifyContent: "center",
                }}
            >
                <div
                    className="modal-box"
                    style={{
                        background: '#0D202F',
                        borderColor: '#0D202F'
                    }}
                >
                    <div className={classes.popUpHeader}>
                        <h2 className="font-bold text-lg">Import</h2>
                        <button type="button" onClick={closeImportModal} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
                            <XMarkIcon />
                        </button>
                    </div>
                    <div className="py-4">
                        <form method="dialog">
                            <div aria-labelledby="create-user-modal-tabs_0-tab"
                                 id="import-user-modal-tabs_0"
                                 role="tabpanel">
                                <div>
                                    <label
                                        className="form-control w-full"
                                        style={{
                                            marginBottom: '20px',
                                            maxWidth: '133%'
                                        }}
                                    >
                                        <div>
                                            <span className="label-text">Select Customer</span>
                                        </div>
                                        <select
                                            className="select select-bordered w-full"
                                            value={selectedCustomer}
                                            onChange={(e) => setSelectedCustomer(e.target.value)}
                                        >
                                            <option disabled value="">-None-</option>
                                            {input.allCustomersObj.map(singleCustomer => (
                                                <option key={singleCustomer.id}
                                                        value={singleCustomer.id}>{singleCustomer.company_name}</option>
                                            ))}
                                        </select>
                                    </label>
                                    <label
                                        className="form-control w-full"
                                        style={{
                                            marginBottom: '20px',
                                            maxWidth: '133%'
                                        }}
                                    >
                                        <div>
                                            <span className="label-text">File</span>
                                        </div>
                                        <input
                                            type="file"
                                            className="file-input file-input-bordered w-full"
                                            accept=".csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel"
                                            onChange={handleFileChange}
                                        />
                                    </label>
                                </div>

                                {/*place buttons here*/}
                                <div className="modal-action">
                                    <div className={classes.buttonContainer}>
                                        <div
                                            style={{
                                                marginRight: 5
                                            }}
                                        >
                                            <ButtonWhiteClose onClick={closeImportModal} />
                                        </div>
                                        <div
                                            style={{
                                                marginLeft: 5
                                            }}
                                        >
                                            <ButtonFlexible
                                                link="#"
                                                width={100}
                                                height={50}
                                                style={{
                                                    marginRight: 0,
                                                }}
                                                onClick={handleImportData}
                                            >
                                                Import
                                            </ButtonFlexible>
                                        </div>

                                    </div>

                                </div>
                            </div>
                        </form>
                    </div>

                </div>
            </dialog>

            {/*export dialogue*/}
            <dialog
                id="export_modal"
                className="modal"
                ref={exportModalRef}
                style={{
                    display: "flex",
                    alignItems: "flex-start",
                    justifyContent: "center",
                }}
            >
                <div
                    className="modal-box"
                    style={{
                        background: '#0D202F',
                        borderColor: '#0D202F'
                    }}
                >
                    <div className={classes.popUpHeader}>
                        <h2 className="font-bold text-lg">Export</h2>
                        <button type="button" onClick={closeExportModal} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
                            <XMarkIcon />
                        </button>
                    </div>
                    <div className="py-4">
                        <form
                            encType="multipart/form-data"
                            method="dialog"
                        >
                            <div aria-labelledby="create-user-modal-tabs_0-tab"
                                 id="export-user-modal-tabs_0"
                                 role="tabpanel">
                                <div>
                                    <label
                                        className="form-control w-full"
                                        style={{
                                            marginBottom: '20px',
                                            maxWidth: '133%'
                                        }}
                                    >
                                        <div>
                                            <span className="label-text">Select Customer</span>
                                        </div>
                                        <select
                                            className="select select-bordered w-full"
                                            value={selectedCustomer}
                                            onChange={(e) => setSelectedCustomer(e.target.value)}
                                        >
                                            <option disabled value="">-None-</option>
                                            {input.allCustomersObj.map(singleCustomer => (
                                                <option key={singleCustomer.id}
                                                        value={singleCustomer.id}>{singleCustomer.company_name}</option>
                                            ))}
                                        </select>
                                    </label>
                                </div>
                                {/*place buttons here*/}
                                <div className="modal-action">
                                    <div className={classes.buttonContainer}>
                                        <div
                                            style={{
                                                marginRight: 5
                                            }}
                                        >
                                            <ButtonWhiteClose onClick={closeExportModal} />
                                        </div>
                                        <div
                                            style={{
                                                marginLeft: 5
                                            }}
                                        >
                                            <ButtonSaveSubmit onClick={handleExportData} />
                                        </div>

                                    </div>

                                </div>
                            </div>
                        </form>
                    </div>

                </div>
            </dialog>

            {/*Custom alert dialogue*/}
            <dialog
                id="custom_alert_modal"
                className="modal"
                ref={customAlertPopupRef}
                style={{
                    display: "flex",
                    alignItems: "flex-start",
                    justifyContent: "center",
                }}
            >
                <div
                    className="modal-box"
                    style={{
                        background: '#0D202F',
                        borderColor: '#0D202F'
                    }}
                >
                    <div className={classes.popUpHeader}>
                        <h2 className="font-bold text-lg">
                            <WarnCircleBigIcon
                                style={{
                                    marginRight: 10
                                }}
                            />
                            Warning!
                        </h2>
                        <button type="button" onClick={closeCustomAlertModal} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
                            <XMarkIcon />
                        </button>
                    </div>
                    <div className="py-4">
                        <form method="dialog">
                            <div aria-labelledby="create-user-modal-tabs_0-tab"
                                 id="custom-alert-modal-tabs_0"
                                 role="tabpanel">
                                <p>{alertMessage}</p>
                            </div>
                        </form>
                    </div>
                </div>
            </dialog>
        </div>
    );
};

export default ImportExportUsersComponent;
