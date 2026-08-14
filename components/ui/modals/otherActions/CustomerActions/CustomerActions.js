'use client'
import React, { useEffect, useRef, useState } from 'react';
import ButtonFlexible from '@/components/ui/button-flexible/ButtonFlexible';
import Link from 'next/link';
import classes from "./customerActions.module.css";
import XMarkIcon from "@/components/ui/icons/XMarkIcon";
import { ButtonWhiteClose } from "@/components/ui/ButtonWhiteClose/ButtonWhiteClose";
import { ButtonSaveSubmit } from "@/components/ui/ButtonSaveAndSubmit/ButtonSaveAndSubmit";
import SettingsSmallIcon from "@/components/ui/icons/SettingsSmallIcon";
import ChevronDownSmallIcon from "@/components/ui/icons/ChevronDownSmallIcon";
import WarnCircleBigIcon from "@/components/ui/icons/WarnCircleBigIcon";
import getCustomerById from "@/lib/controllers/customers/getCustomerById";
import deleteCustomerById from "@/lib/controllers/customers/deleteCustomerById";
import updateCustomerById from "@/lib/controllers/customers/updateCustomerById";
import { RiSettings5Fill } from "react-icons/ri";
import ButtonWhite from '@/components/ui/button-white/Button';
import ActionAlert from '../../customAlertModal/actionAlert';

const CustomerActions = ({ menuItems }) => {
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
    const [customerIdToEdit, setCustomerIdToEdit] = useState('');
    const [customerIdToDelete, setCustomerIdToDelete] = useState('');
    const [file, setFile] = useState(null);
    const [existingCustomerObject, setExistingCustomerObject] = useState(null);

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
        setCustomerIdToEdit(id)
        const { customer } = await getCustomerById(id);
        if (customer) {
            const { company_name } = customer;
            setName(company_name);
            setExistingCustomerObject(customer)
        } else {
            openCustomAlertPopup('Customer not found.');
        }
    };

    const closeEditModal = () => {
        setIsEditModalOpen(false);
        setIsOpen(false);
    };

    const openDeleteModal = async (id) => {
        setIsDeleteModalOpen(true);
        setCustomerIdToDelete(id)
    };

    const closeDeleteModal = () => {
        setIsDeleteModalOpen(false);
        setIsOpen(false);
    };

    const closeCustomAlertModal = () => {
        setIsCustomAlertModalOpen(false);
        setIsOpen(false);
    };

    const deleteCustomer = async () => {
        try {
            openCustomAlertPopup("Customer deleted successfully");
            await deleteCustomerById(customerIdToDelete);
            setIsDeleteModalOpen(false);
            setIsOpen(false);
        } catch (error) {
            setIsDeleteModalOpen(false);
            setIsOpen(false);
            openCustomAlertPopup('An error occurred while deleting the customer.');
        }
    };

    const updateCustomer = async () => {
        try {
            const customerData = {
                company_name: name,
                logo_file_name: file ? file.name : '',
                users: [
                    {
                        users: 'logged_in_user',
                    }
                ],
            }
            await updateCustomerById(customerIdToEdit, customerData);
            setIsEditModalOpen(false);
            setIsOpen(false);
            setName('');
            setFile(null);
            openCustomAlertPopup("Customer updated successfully")
        } catch (error) {
            setIsEditModalOpen(false);
            setIsOpen(false);
            openCustomAlertPopup('An error occurred while updating the customer.');
        }
    };

    return (
        <div ref={popupRef} className={classes.actionsPopup}>
            <button
                link="#"
                width={110}
                height={30}
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
                    alignItems: "flex-start",
                    justifyContent: "center",
                    backgroundColor: "rgba(255, 255, 255, 0.5)",
                }}
            >
                <div className="modal-box" style={{
                    background: '#0D202F', borderColor: '#0D202F', marginTop: "5rem",
                    width: "700px",
                    maxWidth: "40vw",
                    padding: "2.5rem 2rem",
                }}>
                    <div className={classes.popUpHeader}>
                        <h2 className="font-bold text-2xl">Update</h2>
                        <button type="button" onClick={closeEditModal} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}><XMarkIcon /></button>
                    </div>
                    <div className="py-4">
                        <form method="dialog">
                            <div aria-labelledby="create-user-modal-tabs_0-tab" id="import-user-modal-tabs_0"
                                role="tabpanel">
                                <div>
                                    <label className="form-control w-full"
                                        style={{ marginBottom: '20px', maxWidth: '133%' }}>
                                        <div className="label">
                                            <span className="label-text text-xl">Customer Name</span>
                                        </div>
                                        <input
                                            type="text"
                                            className="input input-bordered input-md w-full h-14 text-xl"
                                            id="name"
                                            max="16"
                                            name="name"
                                            value={name}
                                            style={{ backgroundColor: '#123751', borderColor: '#23262a' }}
                                            onChange={(e) => setName(e.target.value)}
                                        />
                                    </label>
                                    <label className="form-control w-full"
                                        style={{ marginBottom: '20px', maxWidth: '133%', }}>
                                        <div>
                                            <span className="label">File</span>
                                        </div>
                                        <input
                                            type="file"
                                            name="image"
                                            className="file-input file-input-bordered w-full"
                                            accept="image/gif, image/jpeg, image/png"
                                            onChange={(e) => setFile(e.target.files[0])}
                                        />
                                    </label>
                                </div>

                                <div className="modal-action">
                                    <div className={classes.buttonContainer}>
                                        <ButtonWhite onClick={closeEditModal} link="#">Cancel</ButtonWhite>
                                        <ButtonSaveSubmit onClick={updateCustomer} />
                                    </div>
                                </div>
                            </div>
                        </form>
                    </div>
                </div>
            </dialog>

            <ActionAlert
                dialogRef={deletePopupRef}
                message='Are you sure you want to delete this record?'
                closeButton={closeDeleteModal}
                SubmitButtonText='Yes'
                onClick={deleteCustomer}
            />

            <dialog
                id="custom_modal"
                className="modal"
                ref={customAlertPopupRef}
                style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    backgroundColor: "rgba(255, 255, 255, 0.5)",
                }}
            >
                <div className="modal-box" style={{ background: "#0D202F", borderColor: "#0D202F", marginTop: "5rem", width: "700px", maxWidth: "40vw", padding: "2.5rem 2rem" }}>
                    <div className={classes.popUpHeader}></div>
                    <div className="py-4">
                        <form method="dialog">
                            <div aria-labelledby="export-user-modal-tabs_0-tab" id="create-user-modal-tabs_0"
                                role="tabpanel">
                                <div>
                                    <center>
                                        <div><WarnCircleBigIcon /></div>
                                        <div><h2 className="font-bold py-4 text-xl lg">{alertMessage}</h2></div>
                                        {/*<div><p>Are you sure you want to delete this record?</p></div>*/}
                                        <div>
                                            <div className={classes.buttonContainer}>
                                                <div style={{ marginLeft: 5 }}>
                                                    <ButtonSaveSubmit buttonText={'Ok'} onClick={closeCustomAlertModal} />
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

export default CustomerActions;