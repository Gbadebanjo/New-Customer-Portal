'use client'
import React, { useEffect, useRef, useState } from 'react';
import ButtonFlexible from "@/components/ui/button-flexible/ButtonFlexible";
import PlusIcon from "@/components/ui/icons/PlusIcon";
import classes from "./createReportModal.module.css";
import XMarkIcon from "@/components/ui/icons/XMarkIcon";
import AddReport from "@/lib/controllers/report/AddReport";
import {ButtonWhiteClose} from "@/components/ui/ButtonWhiteClose/ButtonWhiteClose";
import {ButtonSaveSubmit} from "@/components/ui/ButtonSaveAndSubmit/ButtonSaveAndSubmit";
import WarnCircleBigIcon from "@/components/ui/icons/WarnCircleBigIcon";
import {ReportConstants} from "@/utils/constants";

const CreateReportModal = () => {
    const [isCreateReportModalOpen, setIsCreateReportModalOpen] = useState(false);
    const [name, setName] = useState('');
    const [file, setFile] = useState(null);
    const [isCustomAlertModalOpen, setIsCustomAlertModalOpen] = useState(false);
    const [alertMessage, setAlertMessage] = useState('');
    const customAlertPopupRef = useRef(null);
    const createReportModalRef = useRef(null);

    useEffect(() => {
        if (isCreateReportModalOpen) {
            createReportModalRef.current.showModal();
        } else {
            createReportModalRef.current.close();
        }
    }, [isCreateReportModalOpen]);

    useEffect(() => {
        if (isCustomAlertModalOpen) {
            customAlertPopupRef.current.showModal();
        } else {
            customAlertPopupRef.current.close();
        }
    }, [isCustomAlertModalOpen]);

    const openCustomAlertPopup = (msg) => {
        setAlertMessage(msg);
        setIsCustomAlertModalOpen(true);
    };

    const closeCustomAlertModal = () => {
        setIsCustomAlertModalOpen(false);
    };

    const openCreateReportModal = () => {
        setIsCreateReportModalOpen(true);
    };

    const closeCreateReportModal = () => {
        setIsCreateReportModalOpen(false);
    };

    const handleSaveSubmit = () => {
        if (name.length < ReportConstants.NameMinLength ||
            name.length > ReportConstants.NameMaxLength) {
            openCustomAlertPopup('Invalid name length');
            return;
        }

        closeCreateReportModal();
        setName('');
        setFile(null);
    };

    return (
        <div className={classes.triggerWrapper}>
            <ButtonFlexible
                className="btn"
                onClick={openCreateReportModal}
                width={200}
                height={40}
                style={{ marginRight: 0 }}
                link="#"
            >
                <PlusIcon/> <small>Upload Report</small>
            </ButtonFlexible>

            <dialog
                id="import_modal"
                className="modal"
                ref={createReportModalRef}
                style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                }}
            >
                <div className="modal-box" style={{ background: '#0D202F', borderColor: '#0D202F' }}>
                    <div className={classes.popUpHeader}>
                        <h2 className="font-bold text-lg">Upload Report</h2>
                        <button
                            type="button"
                            onClick={closeCreateReportModal}
                            className={classes.closeButton}
                        >
                            <XMarkIcon/>
                        </button>
                    </div>
                    <div className="py-4">
                        <form action={AddReport}>
                            <div>
                                <label className={classes.formField}>
                                    <div className="label">
                                        <span className="label-text">Name *</span>
                                    </div>
                                    <input
                                        type="text"
                                        className="input input-bordered input-md w-full"
                                        id="name"
                                        name="name"
                                        value={name}
                                        onChange={(e) => setName(e.target.value)}
                                        style={{
                                            backgroundColor: '#123751',
                                            borderColor: '#23262a',
                                        }}
                                    />
                                </label>
                                <label className={classes.formField}>
                                    <div>
                                        <span className="label-text">File *</span>
                                    </div>
                                    <input
                                        type="file"
                                        name="file"
                                        id="file"
                                        className="file-input file-input-bordered w-full"
                                        accept=".csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel"
                                        onChange={(e) => setFile(e.target.files[0])}
                                    />
                                </label>
                                <p className={classes.fileHint}>
                                    Supported file formats are xlsx and CSV
                                </p>
                            </div>
                            <div className="modal-action">
                                <div className={classes.buttonContainer}>
                                    <ButtonWhiteClose onClick={closeCreateReportModal}/>
                                    <ButtonSaveSubmit onClick={handleSaveSubmit}/>
                                </div>
                            </div>
                        </form>
                    </div>
                </div>
            </dialog>

            <dialog
                id="custom_modal"
                className="modal"
                ref={customAlertPopupRef}
                style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                }}
            >
                <div className="modal-box" style={{ background: '#0D202F', borderColor: '#0D202F' }}>
                    <div className="py-4">
                        <form method="dialog">
                            <div className={classes.alertContent}>
                                <WarnCircleBigIcon/>
                                <h2 className="font-bold text-xl">{alertMessage}</h2>
                                <ButtonSaveSubmit
                                    buttonText={'Ok'}
                                    onClick={closeCustomAlertModal}
                                />
                            </div>
                        </form>
                    </div>
                </div>
            </dialog>
        </div>
    );
};

export default CreateReportModal;
