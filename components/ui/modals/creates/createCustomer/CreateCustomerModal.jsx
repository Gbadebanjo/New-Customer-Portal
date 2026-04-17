"use client";
import React, { useEffect, useRef, useState } from "react";
import ButtonFlexible from "@/components/ui/button-flexible/ButtonFlexible";
import classes from "./createCustomerModal.module.css";
import XMarkIcon from "@/components/ui/icons/XMarkIcon";
import AddCustomer from "@/lib/controllers/customers/AddCustomer";
import { ButtonSaveSubmit } from "@/components/ui/ButtonSaveAndSubmit/ButtonSaveAndSubmit";
import { CustomerConstants, UserConstants } from "@/utils/constants";
import WarnCircleBigIcon from "@/components/ui/icons/WarnCircleBigIcon";
import { FaPlus } from "react-icons/fa6";
import ButtonWhite from "@/components/ui/button-white/Button";

const CreateCustomerModal = () => {
  const [isCreateCustomerModalOpen, setIsCreateCustomerModalOpen] =
    useState(false);
  const [isCustomAlertModalOpen, setIsCustomAlertModalOpen] = useState(false);
  const [alertMessage, setAlertMessage] = useState("");
  const customAlertPopupRef = useRef(null);
  const createCustomerModalRef = useRef(null);
  // State for input values
  const [name, setName] = useState("");
  const [file, setFile] = useState(null);

  useEffect(() => {
    if (isCreateCustomerModalOpen) {
      createCustomerModalRef.current.showModal();
    } else {
      createCustomerModalRef.current.close();
    }
  }, [isCreateCustomerModalOpen]);

  useEffect(() => {
    if (isCustomAlertModalOpen) {
      customAlertPopupRef.current.showModal();
    } else {
      customAlertPopupRef.current.close();
    }
  }, [isCustomAlertModalOpen]);

  const openCustomAlertPopup = (msg) => {
    setAlertMessage(msg);
    closeCreateCustomerModal(); 
    setIsCustomAlertModalOpen(true);
  };

  const closeCustomAlertModal = () => {
    setIsCustomAlertModalOpen(false);
  };

  const openCreateCustomerModal = () => {
    setIsCreateCustomerModalOpen(true);
  };

  const closeCreateCustomerModal = () => {
    setIsCreateCustomerModalOpen(false);
  };

  // Function to clear input values and close modal
  const handleCreateCustomer = async (e) => {
    e.preventDefault();

    // Validate individual fields
    if (
      name.length < CustomerConstants.CompanyNameMinLength ||
      name.length > CustomerConstants.CompanyNameMaxLength
    ) {
      openCustomAlertPopup("Company Name must be a minimum of 4 and a maximum of 255 characters.");
      return;
    }

    const formData = new FormData();
    formData.append("name", name);
    if (file) formData.append("image", file);
    const response = await AddCustomer(formData);

    if (response?.error) {
      openCustomAlertPopup(response.error);
      return;
    } else {
      openCustomAlertPopup("Customer created successfully!");
      closeCreateCustomerModal();
      setTimeout(() => {
        setFile(null);
        setName("");
      }, 1000); // Delay clearing inputs for 1 second
    }

  };

  return (
    <div>
      <ButtonFlexible
        className="btn"
        onClick={openCreateCustomerModal}
        width={200}
        height={40}
        link="#"
      >
        <FaPlus /> New Customer
      </ButtonFlexible>
      {/* DaisyUI Modals */}

      <dialog
        id="import_modal"
        className="modal "
        ref={createCustomerModalRef}
        style={{
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "center",
          backgroundColor: "rgba(255, 255, 255, 0.5)",
        }}
      >
        <div
          className="modal-box"
          style={{
            background: "#0D202F",
            borderColor: "#0D202F",
            marginTop: "5rem",
            width: "700px",
            maxWidth: "40vw",
            padding: "2.5rem 2rem",
          }}
        >
          <div className={classes.popUpHeader}>
            <h2 className="font-bold text-2xl">New Customer</h2>
            <button type="button" onClick={closeCreateCustomerModal} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
              <XMarkIcon />
            </button>
          </div>
          <div className="py-4">
            <form encType="multipart/form-data" onSubmit={handleCreateCustomer}>
              <div
                aria-labelledby="create-customerer-modal-tabs_0-tab"
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
                      <span className="label-text text-xl">Customer Name</span>
                    </div>
                    <input
                      type="text"
                      className="input input-bordered input-md w-full h-14 text-xl"
                      id="name"
                      max="16"
                      name="name"
                      style={{
                        backgroundColor: "#123751",
                        borderColor: "#23262a",
                      }}
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                    />
                  </label>
                  <label
                    className="form-control w-full"
                    style={{
                      marginBottom: "20px",
                      maxWidth: "133%",
                      display: "flex",
                      justifyContent: "center",
                    }}
                  >
                    <div className="label">
                      <span className="label-text text-xl">Logo</span>
                    </div>
                    <input
                      type="file"
                      name="image"
                      className="file-input file-input-bordered w-full h-14 text-lg"
                      accept="image/gif, image/jpeg, image/png"
                      onChange={(e) => setFile(e.target.files[0])}
                    />
                  </label>
                </div>
                {/*place buttons here*/}
                <div className="modal-action">
                  <div className={classes.buttonContainer}>
                    <ButtonWhite onClick={closeCreateCustomerModal} link="#">
                      Cancel
                    </ButtonWhite>
                    <ButtonSaveSubmit onClick={handleCreateCustomer} type="submit"/>
                  </div>
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
          alignItems: "",
          justifyContent: "center",
          backgroundColor: "rgba(255, 255, 255, 0.5)",
        }}
      >
        <div
          className="modal-box"
          style={{ background: "#0D202F", borderColor: "#0D202F", marginTop: "5rem", width: "700px", maxWidth: "40vw", padding: "2.5rem 2rem" }}
        >
          <div className={classes.popUpHeader}></div>
          <div className="py-4">
            <form method="dialog">
              <div
                aria-labelledby="export-user-modal-tabs_0-tab"
                id="create-user-modal-tabs_0"
                role="tabpanel"
              >
                <div>
                  <center>
                    <div>
                      <WarnCircleBigIcon />
                    </div>
                    <div>
                      <h2 className="font-bold py-4 text-xl">{alertMessage}</h2>
                    </div>
                    <div>
                      <div className={classes.buttonContainer}>
                        <div>
                          <ButtonSaveSubmit
                            buttonText={"Ok"}
                            onClick={closeCustomAlertModal}
                          />
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

export default CreateCustomerModal;
