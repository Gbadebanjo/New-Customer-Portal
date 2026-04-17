'use client'
import React, { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import classes from "./plannedDataActions.module.css";
import XMarkIcon from "@/components/ui/icons/XMarkIcon";
import { ButtonWhiteClose } from "@/components/ui/ButtonWhiteClose/ButtonWhiteClose";
import { ButtonSaveSubmit } from "@/components/ui/ButtonSaveAndSubmit/ButtonSaveAndSubmit";
import ChevronDownSmallIcon from "@/components/ui/icons/ChevronDownSmallIcon";
import { RiSettings5Fill } from "react-icons/ri";
import WarnCircleBigIcon from "@/components/ui/icons/WarnCircleBigIcon";
import getPlannedUploadById from "@/lib/controllers/powerProductionPlan/getPowerProductionPlanById";
import deletePlannedUploadById from "@/lib/controllers/powerProductionPlan/deletePowerProductionPlanById";
import updatePlannedUploadById from "@/lib/controllers/powerProductionPlan/updatePowerProductionPlanById";
import {v4 as uuidv4} from "uuid";

const PlannedDataActions = ({ menuItems }) => {
    const [isOpen, setIsOpen] = useState(false);
    const popupRef = useRef(null);

    const editPopupRef = useRef(null);
    const deletePopupRef = useRef(null);
    const customAlertPopupRef = useRef(null);

    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [isCustomAlertModalOpen, setIsCustomAlertModalOpen] = useState(false);

    const [name, setName] = useState('');
    const [alertMessage, setAlertMessage] = useState('');
    const [plannedUploadIdToEdit, setPlannedUploadIdToEdit] = useState('');
    const [plannedUploadIdToDelete, setPlannedUploadIdToDelete] = useState('');
    const [file, setFile] = useState(null);
    const [existingPlannedUploadObject, setExistingPlannedUploadObject] = useState(null);
    const [fileName, setFileName] = useState('');
    const [note, setNote] = useState('');

    const togglePopup = () => {
        setIsOpen(!isOpen);
    };

    const selectDialogue = (itemElement, id) => {
        if (itemElement === 'openEditModal') {
            openEditModal(id);
        } else if (itemElement === 'openDeleteModal') {
            openDeleteModal(id);
        } else {
            openCustomAlertPopup('Invalid action selected.')
        }
    }

    const openCustomAlertPopup = (msg) => {
        setAlertMessage(msg);
        setIsCustomAlertModalOpen(true);
    };

    useEffect(() => {
        if (isEditModalOpen) {
            editPopupRef.current.showModal();
        } else {
            editPopupRef.current.close();
        }
    }, [isEditModalOpen]);

    useEffect(() => {
        if (isDeleteModalOpen) {
            deletePopupRef.current.showModal();
        } else {
            deletePopupRef.current.close();
        }
    }, [isDeleteModalOpen]);

    useEffect(() => {
        if (isCustomAlertModalOpen) {
            customAlertPopupRef.current.showModal();
        } else {
            customAlertPopupRef.current.close();
        }
    }, [isCustomAlertModalOpen]);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (popupRef.current && !popupRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    const openEditModal = async (id) => {
        setIsEditModalOpen(true);
        setPlannedUploadIdToEdit(id)
        const { powerProductionPlan } = await getPlannedUploadById(id);
        if (powerProductionPlan) {
            const { file_name,  note } = powerProductionPlan;
            setFileName(file_name);
            setNote(note);
            setExistingPlannedUploadObject(powerProductionPlan)
        } else {
            openCustomAlertPopup('Record not found.');
        }
    };

    const closeEditModal = () => {
        setIsEditModalOpen(false);
        setIsOpen(false);
    };

    const openDeleteModal = async (id) => {
        setIsDeleteModalOpen(true);
        setPlannedUploadIdToDelete(id)
    };

    const closeDeleteModal = () => {
        setIsDeleteModalOpen(false);
        setIsOpen(false);
    };

    const closeCustomAlertModal = () => {
        setIsCustomAlertModalOpen(false);
        setIsOpen(false);
    };

    const deletePlannedUpload = async () => {
        try {
            openCustomAlertPopup("deleted successfully");
            await deletePlannedUploadById(plannedUploadIdToDelete);
            setIsDeleteModalOpen(false);
            setIsOpen(false);
        } catch (error) {
            setIsDeleteModalOpen(false);
            setIsOpen(false);
            openCustomAlertPopup('An error occurred while deleting the record.');
        }
    };

    const updatePlannedUpload = async () => {
        try {
            const plannedUploadData = {
                file_name: fileName,
                note: note,
                unique_file_name: uuidv4(),
            }
            await updatePlannedUploadById(plannedUploadIdToEdit, plannedUploadData);
            setIsEditModalOpen(false);
            setIsOpen(false);
            setFileName('');
            setNote('');
            openCustomAlertPopup("Updated successfully")
        } catch (error) {
            setIsEditModalOpen(false);
            setIsOpen(false);
            openCustomAlertPopup('An error occurred while updating the record.');
        }
    };

    return (
        <div ref={popupRef} className={classes.actionsPopup}>
            <button
                type="button"
                onClick={togglePopup}
                className={classes.button}
            >
                <RiSettings5Fill /> &nbsp; <small>Actions</small> <ChevronDownSmallIcon />
            </button>
            {isOpen && (
                <ul className={classes.dropdownMenu}>
                    {menuItems.map((item, index) => (
                        <li key={index} className={classes.dropdownItem}>
                            {item[2] === 'dialogue' ? (
                                <button
                                    type="button"
                                    className={classes.dropdownLink}
                                    onClick={() => selectDialogue(item[1], item[3])}
                                >
                                    {item[0]}
                                </button>
                            ) : (
                                <Link href={item[1]} className={classes.dropdownLink}>
                                    {item[0]}
                                </Link>
                            )}
                        </li>
                    ))}
                </ul>
            )}

            <dialog
                id="import_modal"
                className="modal"
                ref={editPopupRef}
                style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                }}
            >
                <div className="modal-box" style={{background: '#0D202F', borderColor: '#0D202F'}}>
                    <div className={classes.popUpHeader}>
                        <h2 className="font-bold text-lg">Update</h2>
                        <button type="button" onClick={closeEditModal} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}><XMarkIcon/></button>
                    </div>
                    <div className="py-4">
                        <form method="dialog">
                            <div aria-labelledby="create-user-modal-tabs_0-tab" id="import-user-modal-tabs_0"
                                 role="tabpanel">
                                <div>
                                    <label
                                        className="form-control w-full"
                                        style={{
                                            marginBottom: '20px',
                                            maxWidth: '133%',
                                        }}
                                    >
                                        <div className="label">
                                            <span className="label-text">File Name *</span>
                                        </div>
                                        <input
                                            type="text"
                                            className="input input-bordered input-md w-full"
                                            id="fileName"
                                            name="fileName"
                                            value={fileName}
                                            onChange={(e) => setFileName(e.target.value)}
                                            style={{
                                                backgroundColor: '#123751',
                                                borderColor: '#23262a',
                                            }}
                                        />
                                    </label>
                                    <label
                                        className="form-control w-full"
                                        style={{
                                            marginBottom: '20px',
                                            maxWidth: '133%',
                                        }}
                                    >
                                        <div className="label">
                                            <span className="label-text">Note</span>
                                        </div>
                                        <input
                                            type="text"
                                            className="input input-bordered input-md w-full"
                                            id="note"
                                            value={note}
                                            name="note"
                                            onChange={(e) => setNote(e.target.value)}
                                            style={{
                                                backgroundColor: '#123751',
                                                borderColor: '#23262a',
                                            }}
                                        />
                                    </label>
                                    <label
                                        className="form-control w-full"
                                        style={{
                                            marginBottom: '20px',
                                            maxWidth: '133%',
                                        }}
                                    >
                                        <div>
                                            <span className="label-text">File *</span>
                                        </div>
                                        <input
                                            type="file"
                                            name="file"
                                            id="file"
                                            className="file-input file-input-bordered w-full"
                                            accept=".csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel"
                                        />
                                    </label>
                                </div>

                                <div className="modal-action">
                                    <div className={classes.buttonContainer}>
                                        <div style={{marginRight: 5}}>
                                            <ButtonWhiteClose onClick={closeEditModal}/>
                                        </div>
                                        <div style={{marginLeft: 5}}>
                                            <ButtonSaveSubmit onClick={updatePlannedUpload}/>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </form>
                    </div>
                </div>
            </dialog>

            <dialog
                id="export_modal"
                className="modal"
                ref={deletePopupRef}
                style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                }}
            >
                <div className="modal-box" style={{background: '#0D202F', borderColor: '#0D202F'}}>
                    <div className={classes.popUpHeader}></div>
                    <div className="py-4">
                        <form method="dialog">
                            <div aria-labelledby="export-user-modal-tabs_0-tab" id="create-user-modal-tabs_0"
                                 role="tabpanel">
                            <div>
                                    <center>
                                        <div><WarnCircleBigIcon/></div>
                                        <div><h2 className="font-bold text-xl lg">Are you sure</h2></div>
                                        <div><p>Are you sure you want to delete this record?</p></div>
                                        <div>
                                            <div className={classes.buttonContainer}>
                                                <div style={{marginRight: 5}}>
                                                    <ButtonWhiteClose onClick={closeDeleteModal}/>
                                                </div>
                                                <div style={{marginLeft: 5}}>
                                                    <ButtonSaveSubmit buttonText={'Yes'} onClick={deletePlannedUpload}/>
                                                </div>
                                            </div>
                                        </div>
                                    </center>
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
                <div className="modal-box" style={{background: '#0D202F', borderColor: '#0D202F'}}>
                    <div className={classes.popUpHeader}></div>
                    <div className="py-4">
                        <form method="dialog">
                            <div aria-labelledby="export-user-modal-tabs_0-tab" id="create-user-modal-tabs_0"
                                 role="tabpanel">
                                <div>
                                    <center>
                                        <div><WarnCircleBigIcon/></div>
                                        <div><h2 className="font-bold text-xl lg">{alertMessage}</h2></div>
                                        {/*<div><p>Are you sure you want to delete this record?</p></div>*/}
                                        <div>
                                            <div className={classes.buttonContainer}>
                                                <div style={{marginLeft: 5}}>
                                                    <ButtonSaveSubmit buttonText={'Ok'} onClick={closeCustomAlertModal}/>
                                                </div>
                                            </div>
                                        </div>
                                    </center>
                                </div>
                            </div>
                        </form>
                    </div>
                </div>
            </dialog>
        </div>
    );
};

export default PlannedDataActions;