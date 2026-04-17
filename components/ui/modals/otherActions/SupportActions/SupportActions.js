'use client'
import React, { useEffect, useRef, useState } from 'react';
import styles from './supportActions.module.css';
import Link from 'next/link';
import classes from "./supportActions.module.css";
import ChevronDownSmallIcon from "@/components/ui/icons/ChevronDownSmallIcon";
import WarnCircleBigIcon from "@/components/ui/icons/WarnCircleBigIcon";
import deleteSupportQueryById from "@/lib/controllers/supportQuery/deleteSupportQueryById";
import updateSupportQueryById from "@/lib/controllers/supportQuery/updateSupportQueryById";
import { v4 as uuidv4 } from "uuid";
import ResolveSupportQueryById from "@/lib/controllers/supportQuery/ResolveSupportQueryById";
import { ButtonSaveSubmit } from "@/components/ui/ButtonSaveAndSubmit/ButtonSaveAndSubmit";
import { RiSettings5Fill } from 'react-icons/ri';
import ActionAlert from '../../customAlertModal/actionAlert';

const SupportActions = ({ menuItems, supportQueryCategories }) => {
    const [isOpen, setIsOpen] = useState(false);
    const popupRef = useRef(null);
    const buttonRef = useRef(null);
    const deletePopupRef = useRef(null);
    const [dropdownPos, setDropdownPos] = useState({ top: 0, left: 0 });
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [isCustomAlertModalOpen, setIsCustomAlertModalOpen] = useState(false);
    const [alertMessage, setAlertMessage] = useState('');
    const [supportQueryIdToResolve, setSupportQueryIdToResolve] = useState('');
    const [supportQueryIdToDelete, setSupportQueryIdToDelete] = useState('');
    const [statId, setStatId] = useState(null);
    const [selectedSupportCategory, setSelectedSupportCategory] = useState(""); // State to hold the selected category
    const [title, setTitle] = useState("");
    const [description, setDescription] = useState("");

    const togglePopup = () => {
        if (!isOpen && buttonRef.current) {
            const rect = buttonRef.current.getBoundingClientRect();
            setDropdownPos({
                top: rect.bottom + window.scrollY,
                left: rect.left + window.scrollX,
            });
        }
        setIsOpen(!isOpen);
    };

    const selectDialogue = (itemElement, id) => {
        if (itemElement === 'resolveModal') {
            setSupportQueryIdToResolve(id);
            resolveQuery(id)
        }
        else if (itemElement === 'deleteModal') {
            setSupportQueryIdToDelete(id);
            setIsDeleteModalOpen(true);
        } else {
            openCustomAlertPopup('Invalid action selected.');
        }
    }

    const openCustomAlertPopup = (msg) => {
        setAlertMessage(msg);
        setIsCustomAlertModalOpen(true);
    };

    useEffect(() => {
        if (isDeleteModalOpen) {
            deletePopupRef.current?.showModal();
        } else {
            deletePopupRef.current?.close();
        }
    }, [isDeleteModalOpen]);

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

    async function resolveQuery(query_id) {
        try {
            await ResolveSupportQueryById(query_id);
            openCustomAlertPopup("Support query resolved successfully");
        } catch (error) {
            openCustomAlertPopup('An error occurred while resolving the support query.');
        }
    }


    const closeDeleteModal = () => {
        setIsDeleteModalOpen(false);
        setIsOpen(false);
    };

    const closeCustomAlertModal = () => {
        setIsCustomAlertModalOpen(false);
        setIsOpen(false);
    };

    const deleteSupportQuery = async () => {
        try {
            openCustomAlertPopup("SupportQuery deleted successfully");
            await deleteSupportQueryById(supportQueryIdToDelete);
            setIsDeleteModalOpen(false);
            setIsOpen(false);
        } catch (error) {
            openCustomAlertPopup('An error occurred while deleting the support query.');
            setIsDeleteModalOpen(false);
            setIsOpen(false);
        }
    };

    const updateSupportQuery = async () => {
        try {
            const supportQueryData = {
                title: title.toUpperCase(),
                description: description,
                category_id: selectedSupportCategory.toUpperCase(),
                status_id: statId,
                support_query_messages: [
                    {
                        client: description,
                    }
                ],
                user_id: uuidv4(),
            };
            await updateSupportQueryById(supportQueryIdToResolve, supportQueryData);
            setIsResolveModalOpen(false);
            setIsOpen(false);
            setTitle('');
            setDescription('');
            setSelectedSupportCategory('');
            setStatId('');
            openCustomAlertPopup("SupportQuery updated successfully");
        } catch (error) {
            openCustomAlertPopup('An error occurred while updating the support query.');
            setIsDeleteModalOpen(false);
            setIsOpen(false);
        }
    };

    return (
        <div ref={popupRef} className={styles.actionsPopup}>
            <button
                link="#"
                width={110}
                height={30}
                ref={buttonRef}
                onClick={togglePopup}
                className={classes.button}
            >
                <RiSettings5Fill /> &nbsp; <small>Actions</small> <ChevronDownSmallIcon />
            </button>
            {isOpen && (
                <ul className={styles.dropdownMenu}
                    style={{
                        position: "fixed",
                        top: dropdownPos.top,
                        left: dropdownPos.left,
                        zIndex: 2147483647,
                    }}
                >
                    {menuItems.map((item, index) => (
                        <li key={index} className={styles.dropdownItem}>
                            {item[2] === 'dialogue' ? (
                                <button
                                    type="button"
                                    className={styles.dropdownLink}
                                    onClick={() => {
                                        selectDialogue(item[1], item[3]);
                                        setIsOpen(false); // Close dropdown after click
                                    }}
                                >
                                    {item[0]}
                                </button>
                            ) : (
                                <Link href={item[1]} className={styles.dropdownLink} onClick={() => setIsOpen(false)}>
                                    {item[0]}
                                </Link>
                            )}
                        </li>
                    ))}
                </ul>
            )}



            <ActionAlert
                dialogRef={deletePopupRef}
                message='Are you sure you want to delete this record?'
                closeButton={closeDeleteModal}
                SubmitButtonText='Yes'
                onClick={deleteSupportQuery}
            />


            {/* {isDeleteModalOpen && (
                <div className={styles.modalOverlay}>
                    <div className="modal-box" style={{ background: '#0D202F', borderColor: '#0D202F' }}>
                        <div className={classes.popUpHeader}></div>
                        <div className="py-4">
                            <form method="dialog">
                                <div aria-labelledby="export-user-modal-tabs_0-tab" id="create-user-modal-tabs_0"
                                    role="tabpanel">
                                    <div>
                                        <center>
                                            <div><WarnCircleBigIcon /></div>
                                            <div><h2 className="font-bold text-xl lg">Are you sure</h2></div>
                                            <div><p>Are you sure you want to details this record?</p></div>
                                            <div>
                                                <div className={classes.buttonContainer}>
                                                    <div style={{ marginRight: 5 }}>
                                                        <ButtonWhite onClick={closeDeleteModal} />
                                                    </div>
                                                    <div style={{ marginLeft: 5 }}>
                                                        <ButtonSaveSubmit buttonText={'Yes'} onClick={deleteSupportQuery} />
                                                    </div>
                                                </div>
                                            </div>
                                        </center>
                                    </div>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )} */}

            {isCustomAlertModalOpen && (
                <div className={styles.modalOverlay}>
                    <div className="modal-box" style={{ background: '#0D202F', borderColor: '#0D202F' }}>
                        <div className={classes.popUpHeader}></div>
                        <div className="py-4">
                            <form method="dialog">
                                <div aria-labelledby="export-user-modal-tabs_0-tab" id="create-user-modal-tabs_0"
                                    role="tabpanel">
                                    <div>
                                        <center>
                                            <div><WarnCircleBigIcon /></div>
                                            <div><h2 className="font-bold text-xl lg">{alertMessage}</h2></div>
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
                </div>
            )}
        </div>
    );
};

export default SupportActions;

