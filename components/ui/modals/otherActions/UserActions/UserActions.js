'use client'
import React, { useEffect, useRef, useState } from 'react';
import ButtonFlexible from '@/components/ui/button-flexible/ButtonFlexible';
import Link from 'next/link';
import actionClasses from "./userActions.module.css";
import modalClasses from "@/components/ui/modals/sharedModal.module.css";
import { FaXmark } from "react-icons/fa6";
import { ButtonWhiteClose } from "@/components/ui/ButtonWhiteClose/ButtonWhiteClose";
import { ButtonSaveSubmit } from "@/components/ui/ButtonSaveAndSubmit/ButtonSaveAndSubmit";
import SettingsSmallIcon from "@/components/ui/icons/SettingsSmallIcon";
import ChevronDownSmallIcon from "@/components/ui/icons/ChevronDownSmallIcon";
import WarnCircleBigIcon from "@/components/ui/icons/WarnCircleBigIcon";
import getUserById from "@/lib/controllers/users/getUserById";
import deleteUserById from "@/lib/controllers/users/deleteUserById";
import updateUserById from "@/lib/controllers/users/updateUserById";
import { AllTimezones } from "@/utils/constants";
import { RiSettings5Fill } from "react-icons/ri";
import { impersonateUser } from "@/lib/auth/impersonationActions";


const UserActions = ({ menuItems, customers }) => {
    const [isOpen, setIsOpen] = useState(false);
    const popupRef = useRef(null);
    const buttonRef = useRef(null);
    const editPopupRef = useRef(null);
    const deletePopupRef = useRef(null);
    const customAlertPopupRef = useRef(null);
    const [dropdownPos, setDropdownPos] = useState({ top: 0, left: 0 });
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [isCustomAlertModalOpen, setIsCustomAlertModalOpen] = useState(false);

    const [alertMessage, setAlertMessage] = useState('');
    const [userIdToEdit, setUserIdToEdit] = useState('');
    const [userIdToDelete, setUserIdToDelete] = useState('');
    const [file, setFile] = useState(null);
    const [existingUserObject, setExistingUserObject] = useState(null);

    const [activeTab, setActiveTab] = useState('userInfo');
    const [selectedTimezone, setSelectedTimezone] = useState(AllTimezones[0]);
    const [selectedCustomer, setSelectedCustomer] = useState('');
    const [adminRoleChecked, setAdminRoleChecked] = useState(false);
    const [daystarPortalAdminRoleChecked, setDaystarPortalAdminRoleChecked] = useState(false);
    const [daystarCustomerAdminRoleChecked, setDaystarCustomerAdminRoleChecked] = useState(false);
    const [customerRoleChecked, setCustomerRoleChecked] = useState(true);
    const [userName, setUserName] = useState('');
    const [surname, setSurname] = useState('');
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [ammpApiKey, setAmmpApiKey] = useState('');
    const [phone, setPhone] = useState('');
    const [customer, setCustomer] = useState('');
    const [roles, setRoles] = useState('');
    const [isLockedOut, setIsLockedOut] = useState(false);
    const [notActive, setNotActive] = useState(false);
    const [emailConfirmed, setEmailConfirmed] = useState(false);
    const [isExternal, setIsExternal] = useState(false);
    const [isUpdating, setIsUpdating] = useState(false);

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
        if (itemElement === 'openEditModal') {
            openEditModal(id);
        } else if (itemElement === 'openDeleteModal') {
            openDeleteModal(id);
        } else if (itemElement === '/host') {
            impersonateUser(id).then(() => {
                window.location.href = '/dashboard';
            });
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
        } else if (editPopupRef.current?.open) {
            editPopupRef.current.close();
        }
    }, [isEditModalOpen]);

    useEffect(() => {
        if (isDeleteModalOpen) {
            deletePopupRef.current.showModal();
        } else if (deletePopupRef.current?.open) {
            deletePopupRef.current.close();
        }
    }, [isDeleteModalOpen]);

    useEffect(() => {
        if (isCustomAlertModalOpen) {
            customAlertPopupRef.current.showModal();
        } else if (customAlertPopupRef.current?.open) {
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
        setUserIdToEdit(id)
        const { user } = await getUserById(id);
        if (user) {
            const {
                username,
                email,
                phone_number,
                name,
                surname,
                ammp_api_key,
                customer,
                timezone,
                roles,
                is_locked_out,
                not_active,
                email_confirmed,
                is_external,
            } = user;
            setUserName(username);
            setEmail(email);
            setPhone(phone_number);
            setName(name);
            setSurname(surname);
            setAmmpApiKey(ammp_api_key);
            setSelectedCustomer(customer);
            setSelectedTimezone(timezone);
            setRoles(roles);
            setIsLockedOut(is_locked_out ?? false);
            setNotActive(not_active ?? false);
            setEmailConfirmed(email_confirmed ?? false);
            setIsExternal(is_external ?? false);
            setExistingUserObject(user);

            const roleNames = Array.isArray(roles) ? roles.map(r => r.name) : [];
            setAdminRoleChecked(roleNames.includes('Admin'));
            setDaystarPortalAdminRoleChecked(roleNames.includes('Daystar Portal Admin'));
            setDaystarCustomerAdminRoleChecked(roleNames.includes('Daystar Customer Admin'));
            setCustomerRoleChecked(roleNames.includes('Customer'));
        } else {
            openCustomAlertPopup("User not found.");
        }
    };

    const closeEditModal = () => {
        setIsEditModalOpen(false);
        setIsOpen(false);
    };

    const openDeleteModal = async (id) => {
        setIsDeleteModalOpen(true);
        setUserIdToDelete(id)
    };

    const closeDeleteModal = () => {
        setIsDeleteModalOpen(false);
        setIsOpen(false);
    };

    const closeCustomAlertModal = () => {
        setIsCustomAlertModalOpen(false);
        setIsOpen(false);
    };

    const deleteUser = async () => {
        try {
            const result = await deleteUserById(userIdToDelete);
            setIsDeleteModalOpen(false);
            setIsOpen(false);
            if (result?.error) {
                openCustomAlertPopup(result.error);
            } else {
                openCustomAlertPopup("User deleted successfully");
            }
        } catch (error) {
            setIsDeleteModalOpen(false);
            setIsOpen(false);
            openCustomAlertPopup("An error occurred while deleting the user.");
        }
    };

    const updateUser = async () => {
        setIsUpdating(true);
        try {
            const newRoles = [];
            if (adminRoleChecked) newRoles.push({ name: 'Admin', isAssigned: true });
            if (customerRoleChecked) newRoles.push({ name: 'Customer', isAssigned: true });
            if (daystarCustomerAdminRoleChecked) newRoles.push({ name: 'Daystar Customer Admin', isAssigned: true });
            if (daystarPortalAdminRoleChecked) newRoles.push({ name: 'Daystar Portal Admin', isAssigned: true });

            const userData = {
                username: userName,
                email: email.toLowerCase(),
                phone_number: phone,
                name: name.charAt(0).toUpperCase() + name.slice(1).toLowerCase(),
                surname: surname.charAt(0).toUpperCase() + surname.slice(1).toLowerCase(),
                ammp_api_key: ammpApiKey,
                customer: selectedCustomer,
                roles: newRoles,
                timezone: selectedTimezone,
                is_locked_out: isLockedOut,
                not_active: notActive,
                email_confirmed: emailConfirmed,
            };

            const result = await updateUserById(userIdToEdit, userData);

            if (result?.error) {
                openCustomAlertPopup(result.error);
                return;
            }

            // reset state
            setIsEditModalOpen(false);
            setIsOpen(false);
            setUserName('');
            setEmail('');
            setPhone('');
            setName('');
            setSurname('');
            setAmmpApiKey('');
            setSelectedCustomer('');
            setSelectedTimezone(AllTimezones[0]);
            setRoles('');
            setIsLockedOut(false);
            setNotActive(false);
            setEmailConfirmed(false);
            setIsExternal(false);
            openCustomAlertPopup("User updated successfully");
        } catch (error) {
            setIsEditModalOpen(false);
            setIsOpen(false);
            openCustomAlertPopup("An error occurred while updating the user.");
        } finally {
            setIsUpdating(false);
        }
    };

    return (
        <div ref={popupRef} className={actionClasses.actionsPopup}>
            <button
                ref={buttonRef}
                onClick={togglePopup}
                className={actionClasses.button}
            >
                <RiSettings5Fill /> &nbsp; <small>Actions</small> <ChevronDownSmallIcon />
            </button>
            {isOpen && (
                <ul className={actionClasses.dropdownMenu}
                    style={{
                        position: "fixed",
                        top: dropdownPos.top,
                        left: dropdownPos.left,
                        zIndex: 2147483647,
                    }}
                >
                    {menuItems.map((item, index) => (
                        <li key={index} className={actionClasses.dropdownItem}>
                            {item[2] === 'dialogue' ? (
                                <button
                                    className={actionClasses.dropdownLink}
                                    onClick={() => selectDialogue(item[1], item[3])}
                                >
                                    {item[0]}
                                </button>
                            ) : (
                                <Link href={item[1]} className={actionClasses.dropdownLink}>
                                    {item[0]}
                                </Link>
                            )}
                        </li>
                    ))}
                </ul>
            )}

            <dialog
                id="import_modal"
                className={`modal ${modalClasses.modalLayout}`}
                ref={editPopupRef}
                onCancel={(e) => { e.preventDefault(); closeEditModal(); }}
            >
                <div className={modalClasses.modalContainer}>
                    <div className={modalClasses.popUpHeader}>
                        <h2 className="font-bold text-xl">Update User</h2>
                        <button onClick={closeEditModal} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                            <FaXmark color="#556372" size={30} />
                        </button>
                    </div>
                    <div role="tablist" className={modalClasses.customTabList}>
                        <button type="button" role="tab"
                            className={`${modalClasses.customTab} ${activeTab === 'userInfo' ? modalClasses.customTabActive : ''}`}
                            onClick={() => setActiveTab('userInfo')}
                        >
                            User Information
                        </button>
                        <button type="button" role="tab"
                            className={`${modalClasses.customTab} ${activeTab === 'roles' ? modalClasses.customTabActive : ''}`}
                            onClick={() => setActiveTab('roles')}
                        >
                            Roles
                        </button>
                    </div>
                    <div>
                        {activeTab === 'userInfo' && (
                            <form onSubmit={(e) => e.preventDefault()}>
                                <label className={modalClasses.fieldRow}>
                                    <span className={modalClasses.labelText}>User Name *</span>
                                    <input type="text" className={modalClasses.inputField}
                                        id="userName" name="userName" disabled
                                        value={userName} onChange={(e) => setUserName(e.target.value)} />
                                </label>
                                <label className={modalClasses.fieldRow}>
                                    <span className={modalClasses.labelText}>Surname</span>
                                    <input type="text" className={modalClasses.inputField}
                                        id="Surname" name="Surname"
                                        value={surname} onChange={(e) => setSurname(e.target.value)} />
                                </label>
                                <label className={modalClasses.fieldRow}>
                                    <span className={modalClasses.labelText}>Name *</span>
                                    <input type="text" className={modalClasses.inputField}
                                        id="Name" name="Name"
                                        value={name} onChange={(e) => setName(e.target.value)} />
                                </label>
                                <label className={modalClasses.fieldRow}>
                                    <span className={modalClasses.labelText}>Email Address *</span>
                                    <input type="text" className={modalClasses.inputField}
                                        id="Email" name="Email" disabled
                                        value={email} onChange={(e) => setEmail(e.target.value)} />
                                </label>
                                <label className={modalClasses.fieldRow}>
                                    <span className={modalClasses.labelText}>Timezone</span>
                                    <select className={modalClasses.inputField}
                                        value={selectedTimezone} onChange={(e) => setSelectedTimezone(e.target.value)}>
                                        <option value="Africa/Lagos">Africa/Lagos</option>
                                        <option disabled value="">-None-</option>
                                        {AllTimezones.map(tz => (
                                            <option key={tz.id} value={tz.id}>{tz.name}</option>
                                        ))}
                                    </select>
                                </label>
                                <label className={modalClasses.fieldRow}>
                                    <span className={modalClasses.labelText}>AMMP API key</span>
                                    <input type="text" className={modalClasses.inputField}
                                        id="ammpApiKey" name="ammpApiKey"
                                        value={ammpApiKey} onChange={(e) => setAmmpApiKey(e.target.value)} />
                                </label>
                                <label className={modalClasses.fieldRow}>
                                    <span className={modalClasses.labelText}>Select Customer</span>
                                    <select className={modalClasses.inputField}
                                        name="SelectedCustomer" value={selectedCustomer}
                                        onChange={(e) => setSelectedCustomer(e.target.value)}>
                                        <option disabled value="">-None-</option>
                                        {customers.map(c => (
                                            <option key={c.id} value={c.id}>{c.company_name}</option>
                                        ))}
                                    </select>
                                </label>
                                <label className={modalClasses.fieldRow}>
                                    <span className={modalClasses.labelText}>Phone number</span>
                                    <input type="text" className={modalClasses.inputField}
                                        id="Phone" name="Phone"
                                        value={phone} onChange={(e) => setPhone(e.target.value)} />
                                </label>
                                <div className="mb-4 align-items-center gap-3 flex">
                                    <input type="checkbox"
                                        id="UserInfo_IsActive" name="UserInfo.IsActive"
                                        checked={!notActive}
                                        onChange={(e) => setNotActive(!e.target.checked)}
                                        className={modalClasses.inputCheckbox} />
                                    <label className={modalClasses.labelText} htmlFor="UserInfo_IsActive">Active</label>
                                </div>
                                <div className="mb-4 align-items-center gap-3 flex">
                                    <input type="checkbox"
                                        id="UserInfo_LockoutEnabled" name="UserInfo.LockoutEnabled"
                                        checked={isLockedOut}
                                        onChange={(e) => setIsLockedOut(e.target.checked)}
                                        className={modalClasses.inputCheckbox} />
                                    <label className={modalClasses.labelText} htmlFor="UserInfo_LockoutEnabled">Account locked out</label>
                                </div>
                            </form>
                        )}
                        {activeTab === 'roles' && (
                            <div>
                                <div className="mb-4 align-items-center gap-3 flex">
                                    <input type="checkbox" id="admin_role_checkbox" name="adminRoleCheckbox"
                                        checked={adminRoleChecked} onChange={() => setAdminRoleChecked(!adminRoleChecked)}
                                        value="true" className={modalClasses.inputCheckbox} />
                                    <label className={modalClasses.labelText} htmlFor="admin_role_checkbox">Admin</label>
                                </div>
                                <div className="mb-4 align-items-center gap-3 flex">
                                    <input type="checkbox" id="customer_role_checkbox" name="customerRoleCheckbox"
                                        checked={customerRoleChecked} onChange={() => setCustomerRoleChecked(!customerRoleChecked)}
                                        value="true" className={modalClasses.inputCheckbox} />
                                    <label className={modalClasses.labelText} htmlFor="customer_role_checkbox">Customer User</label>
                                </div>
                                <div className="mb-4 align-items-center gap-3 flex">
                                    <input type="checkbox" id="daystar_customer_admin_role_checkbox" name="daystarCustomerAdminRoleCheckbox"
                                        checked={daystarCustomerAdminRoleChecked} onChange={() => setDaystarCustomerAdminRoleChecked(!daystarCustomerAdminRoleChecked)}
                                        value="true" className={modalClasses.inputCheckbox} />
                                    <label className={modalClasses.labelText} htmlFor="daystar_customer_admin_role_checkbox">Daystar Customer Admin</label>
                                </div>
                                <div className="mb-4 align-items-center gap-3 flex">
                                    <input type="checkbox" id="daystar_portal_admin_role_checkbox" name="daystarPortalAdminRoleCheckbox"
                                        checked={daystarPortalAdminRoleChecked} onChange={() => setDaystarPortalAdminRoleChecked(!daystarPortalAdminRoleChecked)}
                                        value="true" className={modalClasses.inputCheckbox} />
                                    <label className={modalClasses.labelText} htmlFor="daystar_portal_admin_role_checkbox">Daystar Portal Admin</label>
                                </div>
                            </div>
                        )}
                    </div>
                    <div className="modal-action">
                        <div className={modalClasses.buttonContainer}>
                            <ButtonWhiteClose onClick={closeEditModal} />
                            <ButtonSaveSubmit onClick={updateUser} buttonText={isUpdating ? "Saving..." : "Save"} disabled={isUpdating} />
                        </div>
                    </div>
                </div>
            </dialog>

            <dialog
                id="export_modal"
                className={`modal ${modalClasses.modalLayout}`}
                ref={deletePopupRef}
                onCancel={(e) => { e.preventDefault(); closeDeleteModal(); }}
            >
                <div className={modalClasses.modalContainer} style={{ maxWidth: '400px', textAlign: 'center' }}>
                    <WarnCircleBigIcon />
                    <h2 className="font-bold text-xl" style={{ marginTop: '1rem' }}>Are you sure?</h2>
                    <p style={{ color: '#7c8796', margin: '0.5rem 0 0.5rem' }}>Are you sure you want to delete this record?</p>
                    <div className="modal-action">
                        <div className={modalClasses.buttonContainer}>
                            <ButtonWhiteClose onClick={closeDeleteModal} />
                            <ButtonSaveSubmit buttonText={'Yes'} onClick={deleteUser} />
                        </div>
                    </div>
                </div>
            </dialog>

            <dialog
                id="custom_modal"
                className={`modal ${modalClasses.modalLayout}`}
                ref={customAlertPopupRef}
                onCancel={(e) => { e.preventDefault(); closeCustomAlertModal(); }}
            >
                <div className={modalClasses.modalContainer} style={{ maxWidth: '480px', textAlign: 'center' }}>
                    <WarnCircleBigIcon />
                    <p className="font-bold text-base" style={{ marginTop: '1rem', wordBreak: 'break-word', overflowWrap: 'break-word', whiteSpace: 'pre-wrap' }}>{alertMessage}</p>
                    <div className="modal-action">
                        <div className={modalClasses.buttonContainer}>
                            <ButtonSaveSubmit buttonText={'Ok'} onClick={closeCustomAlertModal} />
                        </div>
                    </div>
                </div>
            </dialog>
        </div>
    );
};

export default UserActions;