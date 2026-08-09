"use client";
import React, { useEffect, useRef, useState } from "react";
import ButtonFlexible from "@/components/ui/button-flexible/ButtonFlexible";
import classes from "@/components/ui/modals/sharedModal.module.css";
import ImportExportUsersComponent from "@/components/ui/modals/creates/ImportExportUsers/ImportExportUsersComponent";
import { AllTimezones, UserConstants } from "@/utils/constants";
import { ButtonSaveSubmit } from "@/components/ui/ButtonSaveAndSubmit/ButtonSaveAndSubmit";
import AddUser from "@/lib/controllers/users/AddUser";
import WarnCircleBigIcon from "@/components/ui/icons/WarnCircleBigIcon";
import { FaPlus, FaXmark } from "react-icons/fa6";
import ButtonWhite from "@/components/ui/button-white/Button";

const CreateUsersModal = ({ customers, users }) => {
  const [isNewUserModalOpen, setIsNewUserModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("userInfo");
  const [selectedTimezone, setSelectedTimezone] = useState(
    AllTimezones[0].value
  );
  const [selectedCustomer, setSelectedCustomer] = useState("");
  // Single role per user. Options are the four canonical role names as
  // stored in the DB (`Admin`, `Customer`, `Daystar Customer Admin`,
  // `Daystar Portal Admin`). Defaults to `Customer` since that's the
  // most common creation case.
  const [selectedRole, setSelectedRole] = useState("Customer");
  const [userName, setUserName] = useState("");
  const [surname, setSurname] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [isActive, setIsActive] = useState(false);
  const [lockoutEnabled, setLockoutEnabled] = useState(true);
  const [sendConfirmationEmail, setSendConfirmationEmail] = useState(true);
  const [isCustomAlertModalOpen, setIsCustomAlertModalOpen] = useState(false);
  const [alertMessage, setAlertMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const customAlertPopupRef = useRef(null);
  const newUserModalRef = useRef(null);

  useEffect(() => {
    if (isNewUserModalOpen) {
      newUserModalRef.current.showModal();
    } else if (newUserModalRef.current?.open) {
      newUserModalRef.current.close();
    }
  }, [isNewUserModalOpen]);

  useEffect(() => {
    if (isCustomAlertModalOpen) {
      customAlertPopupRef.current.showModal();
    } else if (customAlertPopupRef.current?.open) {
      customAlertPopupRef.current.close();
    }
  }, [isCustomAlertModalOpen]);

  const openNewUserModal = () => {
    setIsNewUserModalOpen(true);
    setActiveTab("userInfo"); // Set default tab to 'userInfo' when opening modal
  };

  const closeNewUserModal = () => {
    setIsNewUserModalOpen(false);
  };

  const openCustomAlertPopup = (msg) => {
    setAlertMessage(msg);
    setIsCustomAlertModalOpen(true);
  };

  const closeCustomAlertModal = () => {
    setIsCustomAlertModalOpen(false);
  };

  const handleFormSubmit = async () => {
    const formData = new FormData();
    formData.append("UserName", userName);
    formData.append("Surname", surname);
    formData.append("Name", name);
    formData.append("Email", email);
    formData.append("Timezone", selectedTimezone);
    formData.append("SelectedCustomer", selectedCustomer);
    formData.append("Phone", phone);
    if (isActive) formData.append("UserInfo.IsActive", "true");
    if (lockoutEnabled) formData.append("UserInfo.LockoutEnabled", "true");
    if (sendConfirmationEmail) formData.append("UserInfo.SendConfirmationEmail", "true");

    if (!selectedRole) {
      openCustomAlertPopup("Please select a role.");
      return;
    }
    formData.append(
      "roles",
      JSON.stringify([{ name: selectedRole, isAssigned: true }])
    );

    // Client-side validation
    if (isUsernameTaken(formData.get("UserName"))) {
      openCustomAlertPopup("Username is already taken.");
      return;
    }
    if (formData.get("Email") && isEmailTaken(formData.get("Email"))) {
      openCustomAlertPopup("Email is already taken.");
      return;
    }
    if (
      formData.get("UserName").length < UserConstants.NameMinLength ||
      formData.get("UserName").length > UserConstants.NameMaxLength
    ) {
      openCustomAlertPopup("Invalid username length.");
      return;
    }
    if (
      formData.get("Name").length < UserConstants.NameMinLength ||
      formData.get("Name").length > UserConstants.NameMaxLength
    ) {
      openCustomAlertPopup("Invalid name length.");
      return;
    }
    if (formData.get("Email") && !validateEmail(formData.get("Email"))) {
      openCustomAlertPopup("Invalid email format.");
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await AddUser(formData);
      if (response?.error) {
        openCustomAlertPopup(response.error);
        return;
      }
      closeNewUserModal();
      setUserName("");
      setSurname("");
      setName("");
      setEmail("");
      setSelectedCustomer("");
      setSelectedTimezone(AllTimezones[0].value);
      setPhone("");
      setSelectedRole("Customer");
      setIsActive(false);
      setLockoutEnabled(true);
      setSendConfirmationEmail(true);
    } catch (error) {
      console.error("Error adding user:", error);
      openCustomAlertPopup("Failed to create user. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Function to validate email format
  const validateEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  // Function to check if username is already taken
  const isUsernameTaken = (username) => {
    // Assuming users object has global scope
    return users.some((user) => user.username === username);
  };

  // Function to check if email is already taken
  const isEmailTaken = (email) => {
    // Assuming users object has global scope
    return users.some((user) => user.email === email);
  };

  return (
    <div style={{ display: "flex", alignItems: "flex-end" }}>
      <span style={{ marginRight: "5px" }}>
        {" "}
        <ImportExportUsersComponent
          input={{
            name: "Import",
            menuItems: [["File", "openImportModal"]],
            allCustomersObj: customers,
            allUsersObj: users,
          }}
        />
      </span>
      <span
        style={{
          marginLeft: "5px",
        }}
      >
        {/* Use the ImportExportUsersComponent component */}
        <ImportExportUsersComponent
          input={{
            name: "Export",
            menuItems: [["To CSV", "openExportModal"]],
            allCustomersObj: customers,
            allUsersObj: users,
          }}
        />
      </span>
      <span
        style={{
          marginLeft: "10px",
        }}
      >
        <ButtonFlexible
          className="btn"
          onClick={openNewUserModal}
          width={130}
          height={40}
          link="#"
        >
          <FaPlus /> <small>New User</small>
        </ButtonFlexible>
      </span>

      <dialog
        id="new_user_modal"
        className={`modal ${classes.modalLayout}`}
        ref={newUserModalRef}
      >
        <div className={classes.modalContainer}>
          <div className={classes.popUpHeader}>
            <h2 className="font-bold text-xl">New User</h2>
            <button type="button" onClick={closeNewUserModal} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
              <FaXmark color="#556372" size={30} />
            </button>
          </div>
          <div role="tablist" className={classes.customTabList}>
            <button
              type="button"
              role="tab"
              className={`${classes.customTab} ${
                activeTab === "userInfo" ? classes.customTabActive : ""
              }`}
              onClick={() => setActiveTab("userInfo")}
            >
              User Information
            </button>
            <button
              type="button"
              role="tab"
              className={`${classes.customTab} ${
                activeTab === "roles" ? classes.customTabActive : ""
              }`}
              onClick={() => setActiveTab("roles")}
            >
              Roles
            </button>
          </div>
          <div className="py-4">
            {activeTab === "userInfo" && (
              // User Information Tab Content
              <form onSubmit={(e) => e.preventDefault()}>
                <div
                  aria-labelledby="create-user-modal-tabs_0-tab"
                  id="create-user-modal-tabs_0"
                  role="tabpanel"
                >
                  <div>
                    <label
                      className="form-control w-full"
                      style={{
                        marginBottom: "20px",
                        maxWidth: "133%",
                      }}
                    >
                      <div className="label">
                        <span className={classes.labelText}>
                          Username &nbsp; *
                        </span>
                      </div>
                      <input
                        type="text"
                        className={classes.inputField}
                        id="UserName"
                        max="256"
                        name="UserName"
                        value={userName}
                        onChange={(e) => setUserName(e.target.value)}
                      />
                    </label>
                    <label
                      className="form-control w-full"
                      style={{
                        marginBottom: "20px",
                        maxWidth: "133%",
                      }}
                    >
                      <div className="label">
                        <span className={classes.labelText}>Surname &nbsp; *</span>
                      </div>
                      <input
                        type="text"
                        className={classes.inputField}
                        id="Surname"
                        max="256"
                        name="Surname"
                        value={surname}
                        onChange={(e) => setSurname(e.target.value)}
                      />
                    </label>
                    <label
                      className="form-control w-full"
                      style={{
                        marginBottom: "20px",
                        maxWidth: "133%",
                      }}
                    >
                      <div className="label">
                        <span className={classes.labelText}>First Name &nbsp; *</span>
                      </div>
                      <input
                        type="text"
                        className={classes.inputField}
                        id="Name"
                        max="256"
                        name="Name"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                      />
                    </label>
                    <label
                      className="form-control w-full"
                      style={{
                        marginBottom: "20px",
                        maxWidth: "133%",
                      }}
                    >
                      <div className="label">
                        <span className={classes.labelText}>
                          Email Address &nbsp; *
                        </span>
                      </div>
                      <input
                        type="email"
                        className={classes.inputField}
                        id="Email"
                        max="256"
                        name="Email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                      />
                    </label>
                    <label
                      className="form-control w-full"
                      style={{
                        marginBottom: "20px",
                        maxWidth: "133%",
                      }}
                    >
                      <div className="label">
                        <span className={classes.labelText}>Timezone</span>
                      </div>
                      <select
                        className={classes.inputField}
                        value={selectedTimezone}
                        name="Timezone"
                        onChange={(e) => setSelectedTimezone(e.target.value)}
                      >
                        <option value="Africa/Lagos">
                          Africa/Lagos
                        </option>
                        <option disabled value="">
                          -None-
                        </option>
                        {AllTimezones.map((singleTimezone) => (
                          <option
                            key={singleTimezone.id}
                            value={singleTimezone.id}
                          >
                            {singleTimezone.name}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label
                      className="form-control w-full"
                      style={{
                        marginBottom: "20px",
                        maxWidth: "133%",
                      }}
                    >
                      <div className="label">
                        <span className={classes.labelText}>
                          Select Customer
                        </span>
                      </div>
                      <select
                        className={classes.inputField}
                        value={selectedCustomer}
                        name="SelectedCustomer"
                        onChange={(e) => setSelectedCustomer(e.target.value)}
                      >
                        <option disabled value="">
                          -None-
                        </option>
                        {customers.map((singleCustomer) => (
                          <option
                            key={singleCustomer.id}
                            value={singleCustomer.id}
                          >
                            {singleCustomer.company_name}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label
                      className="form-control w-full"
                      style={{
                        marginBottom: "20px",
                        maxWidth: "133%",
                      }}
                    >
                      <div className="label">
                        <span className={classes.labelText}>Phone number</span>
                      </div>
                      <input
                        type="text"
                        className={classes.inputField}
                        id="Phone"
                        max="16"
                        name="Phone"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                      />
                    </label>
                  </div>

                  <div className="mb-4 align-items-center gap-3 flex">
                    <input
                      type="checkbox"
                      checked={isActive}
                      onChange={(e) => setIsActive(e.target.checked)}
                      id="UserInfo_IsActive"
                      name="UserInfo.IsActive"
                      value="true"
                      className={classes.inputCheckbox}
                    />
                    <label
                      className={classes.labelText}
                      htmlFor="UserInfo_IsActive"
                    >
                      Active
                    </label>
                  </div>

                  <div className="mb-4 align-items-center gap-3 flex">
                    <input
                      type="checkbox"
                      checked={lockoutEnabled}
                      onChange={(e) => setLockoutEnabled(e.target.checked)}
                      id="UserInfo_LockoutEnabled"
                      name="UserInfo.LockoutEnabled"
                      value="true"
                      className={classes.inputCheckbox}
                    />
                    <label
                      className={classes.labelText}
                      htmlFor="UserInfo_LockoutEnabled"
                    >
                      Account lockout
                    </label>
                  </div>

                  <div className="mb-2 align-items-center gap-3 flex">
                    <input
                      type="checkbox"
                      checked={sendConfirmationEmail}
                      onChange={(e) => setSendConfirmationEmail(e.target.checked)}
                      id="UserInfo_SendConfirmationEmail"
                      name="UserInfo.SendConfirmationEmail"
                      value="true"
                      className={classes.inputCheckbox}
                    />
                    <label
                      className={classes.labelText}
                      htmlFor="UserInfo_SendConfirmationEmail"
                    >
                      Send invitation email
                    </label>
                  </div>
                </div>
              </form>
            )}
            {activeTab === "roles" && (
              <div id="create-user-modal-tabs_1-tab">
                {[
                  { value: "Admin", label: "Admin" },
                  { value: "Customer", label: "Customer User" },
                  { value: "Daystar Customer Admin", label: "Daystar Customer Admin" },
                  { value: "Daystar Portal Admin", label: "Daystar Portal Admin" },
                ].map((r) => (
                  <div key={r.value} className="mb-4 align-items-center gap-2 flex">
                    <input
                      id={`role_radio_${r.value.replace(/\s+/g, "_").toLowerCase()}`}
                      name="userRole"
                      type="radio"
                      value={r.value}
                      checked={selectedRole === r.value}
                      onChange={() => setSelectedRole(r.value)}
                      className={classes.inputCheckbox}
                    />
                    &nbsp;
                    <label
                      className={classes.labelText}
                      htmlFor={`role_radio_${r.value.replace(/\s+/g, "_").toLowerCase()}`}
                    >
                      {r.label}
                    </label>
                  </div>
                ))}
              </div>
            )}
          </div>
          <div className="modal-action">
            <div className={classes.buttonContainer}>
              <ButtonWhite onClick={closeNewUserModal} link="#">
                Cancel
              </ButtonWhite>
              <ButtonSaveSubmit onClick={handleFormSubmit} buttonText={isSubmitting ? "Saving..." : "Save"} disabled={isSubmitting} />
            </div>
          </div>
        </div>
      </dialog>

      <dialog
        id="custom_modal"
        className={`modal ${classes.modalLayout}`}
        ref={customAlertPopupRef}
      >
        <div
          className={classes.modalContainer}
          style={{ maxWidth: "400px", textAlign: "center" }}
        >
          <WarnCircleBigIcon />
          <h2 className="font-bold text-xl" style={{ marginTop: "1rem" }}>{alertMessage}</h2>
          <div className="modal-action">
            <div className={classes.buttonContainer}>
              <ButtonSaveSubmit buttonText={"Ok"} onClick={closeCustomAlertModal} />
            </div>
          </div>
        </div>
      </dialog>
    </div>
  );
};

export default CreateUsersModal;
