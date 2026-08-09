"use client";
import React, { useEffect, useRef, useState } from "react";
import ButtonFlexible from "@/components/ui/button-flexible/ButtonFlexible";
import classes from "./createCustomerModal.module.css";
import XMarkIcon from "@/components/ui/icons/XMarkIcon";
import AddCustomer from "@/lib/controllers/customers/AddCustomer";
import listUnclaimedAmmpCustomers from "@/lib/controllers/customers/listUnclaimedAmmpCustomers";
import { ButtonSaveSubmit } from "@/components/ui/ButtonSaveAndSubmit/ButtonSaveAndSubmit";
import { CustomerConstants } from "@/utils/constants";
import WarnCircleBigIcon from "@/components/ui/icons/WarnCircleBigIcon";
import { FaPlus } from "react-icons/fa6";
import ButtonWhite from "@/components/ui/button-white/Button";

const CreateCustomerModal = () => {
  const [isCreateCustomerModalOpen, setIsCreateCustomerModalOpen] = useState(false);
  const [isCustomAlertModalOpen, setIsCustomAlertModalOpen] = useState(false);
  const [alertMessage, setAlertMessage] = useState("");
  const customAlertPopupRef = useRef(null);
  const createCustomerModalRef = useRef(null);

  const [selectedAmmpName, setSelectedAmmpName] = useState("");
  const [ammpCustomers, setAmmpCustomers] = useState([]);
  const [loadingAmmp, setLoadingAmmp] = useState(false);
  const [ammpLoadError, setAmmpLoadError] = useState(null);

  useEffect(() => {
    if (isCreateCustomerModalOpen) {
      createCustomerModalRef.current.showModal();
      setLoadingAmmp(true);
      setAmmpLoadError(null);
      listUnclaimedAmmpCustomers()
        .then((res) => {
          if (res?.error) setAmmpLoadError(res.error);
          setAmmpCustomers(res?.customers || []);
        })
        .catch((e) => setAmmpLoadError(e.message))
        .finally(() => setLoadingAmmp(false));
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

  const closeCustomAlertModal = () => setIsCustomAlertModalOpen(false);
  const openCreateCustomerModal = () => setIsCreateCustomerModalOpen(true);
  const closeCreateCustomerModal = () => setIsCreateCustomerModalOpen(false);

  const resetForm = () => {
    setSelectedAmmpName("");
  };

  const handleCreateCustomer = async (e) => {
    e.preventDefault();

    const submittedName = selectedAmmpName;

    if (!submittedName) {
      openCustomAlertPopup("Please pick a customer from the list.");
      return;
    }

    if (
      submittedName.length < CustomerConstants.CompanyNameMinLength ||
      submittedName.length > CustomerConstants.CompanyNameMaxLength
    ) {
      openCustomAlertPopup(
        `Customer name must be between ${CustomerConstants.CompanyNameMinLength} and ${CustomerConstants.CompanyNameMaxLength} characters.`
      );
      return;
    }

    const formData = new FormData();
    formData.append("name", submittedName);
    const response = await AddCustomer(formData);

    if (response?.error) {
      openCustomAlertPopup(response.error);
      return;
    }
    openCustomAlertPopup("Customer created successfully!");
    closeCreateCustomerModal();
    setTimeout(resetForm, 1000);
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
            <button
              type="button"
              onClick={closeCreateCustomerModal}
              style={{ background: "none", border: "none", cursor: "pointer", padding: 0 }}
            >
              <XMarkIcon />
            </button>
          </div>
          <div className="py-4">
            <form onSubmit={handleCreateCustomer}>
              <div role="tabpanel">
                <label
                  className="form-control w-full"
                  style={{ marginBottom: "20px", maxWidth: "133%" }}
                >
                  <div className="label">
                    <span className="label-text text-xl">Customer Name</span>
                    {loadingAmmp && (
                      <span className="label-text-alt text-sm opacity-70">loading…</span>
                    )}
                    {ammpLoadError && !loadingAmmp && (
                      <span className="label-text-alt text-sm" style={{ color: "#f87171" }}>
                        couldn't load list ({ammpLoadError})
                      </span>
                    )}
                  </div>
                  <select
                    className="select select-bordered w-full h-14 text-xl"
                    id="name"
                    name="name"
                    style={{ backgroundColor: "#123751", borderColor: "#23262a" }}
                    value={selectedAmmpName}
                    onChange={(e) => setSelectedAmmpName(e.target.value)}
                    disabled={loadingAmmp}
                  >
                    <option value="">
                      {loadingAmmp
                        ? "Loading…"
                        : ammpCustomers.length === 0
                        ? "No unclaimed customers available"
                        : "-- Select a customer --"}
                    </option>
                    {ammpCustomers.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </label>

                <div className="modal-action">
                  <div className={classes.buttonContainer}>
                    <ButtonWhite onClick={closeCreateCustomerModal} link="#">
                      Cancel
                    </ButtonWhite>
                    <ButtonSaveSubmit onClick={handleCreateCustomer} type="submit" />
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
          style={{
            background: "#0D202F",
            borderColor: "#0D202F",
            marginTop: "5rem",
            width: "700px",
            maxWidth: "40vw",
            padding: "2.5rem 2rem",
          }}
        >
          <div className={classes.popUpHeader}></div>
          <div className="py-4">
            <form method="dialog">
              <div role="tabpanel">
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
