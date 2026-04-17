"use client";
import React, { useEffect, useRef, useState } from "react";
import ButtonFlexible from "@/components/ui/button-flexible/ButtonFlexible";
import { FaPlus } from "react-icons/fa";
import { FaXmark } from "react-icons/fa6";
import classes from "./createPlannedDataUploadModal.module.css";
import { ButtonSaveSubmit } from "@/components/ui/ButtonSaveAndSubmit/ButtonSaveAndSubmit";
import ButtonWhite from "@/components/ui/button-white/Button";

import AddPowerProductionPlan from "@/lib/controllers/powerProductionPlan/AddPowerProductionPlan";
import WarnCircleBigIcon from "@/components/ui/icons/WarnCircleBigIcon";
import {
  CustomerConstants as PlannedDataConstants,
  CustomerConstants,
  PowerProductionPlanConstants,
} from "@/utils/constants";

const CreatePlannedDataUploadModal = () => {
  const [isCreatePlannedUploadModalOpen, setIsCreatePlannedUploadModalOpen] =
    useState(false);
  const [fileName, setFileName] = useState("");
  const [note, setNote] = useState("");
  const [isCustomAlertModalOpen, setIsCustomAlertModalOpen] = useState(false);
  const [alertMessage, setAlertMessage] = useState("");
  const customAlertPopupRef = useRef(null);

  const createPlannedUploadModalRef = useRef(null);

  useEffect(() => {
    if (isCreatePlannedUploadModalOpen) {
      createPlannedUploadModalRef.current.showModal();
    } else {
      createPlannedUploadModalRef.current.close();
    }
  }, [isCreatePlannedUploadModalOpen]);

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

  const openCreatePlannedUploadModal = () => {
    setIsCreatePlannedUploadModalOpen(true);
  };

  const closeCreatePlannedUploadModal = () => {
    setIsCreatePlannedUploadModalOpen(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    // Invoke closeCreatePlannedUploadModal
    const form = createPlannedUploadModalRef.current.querySelector("form");
    const formData = new FormData(form);

    // Validate individual fields
    if (
      formData.get("fileName").length <
        PowerProductionPlanConstants.FileNameMinLength ||
      formData.get("fileName").length >
        PowerProductionPlanConstants.FileNameMaxLength
    ) {
      // Handle invalid userName length
      openCustomAlertPopup("Invalid file name length");
      return;
    }

    try {
    // ✅ call server action
    await AddPowerProductionPlan(formData);

    closeCreatePlannedUploadModal();
    setTimeout(() => {
      setFileName("");
      setNote("");
    }, 2000);
  } catch (err) {
    console.error("Upload failed:", err);
    openCustomAlertPopup("Upload failed. Please try again.");
  }
};

  return (
    <div style={{ display: "flex", alignItems: "flex-end" }}>
      <ButtonFlexible
        className="btn"
        onClick={openCreatePlannedUploadModal}
        width={300}
        height={40}
        link="#"
      >
        <FaPlus /> <small>Upload Planned Production File</small>
      </ButtonFlexible>
      {/* DaisyUI Modals */}

      <dialog
        className={`modal ${classes.modalLayout}`}
        ref={createPlannedUploadModalRef}
      >
        <div className={classes.modalContainer}>
          <div className={classes.popUpHeader}>
            <h2 className="font-bold text-xl">
              Upload Planned Production File
            </h2>
            <button type="button" onClick={closeCreatePlannedUploadModal} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
              <FaXmark color="#556372" size={28} />
            </button>
          </div>
          <form onSubmit={handleSubmit}>
            <label
              className="form-control w-full pt-5"
              style={{
                marginBottom: "20px",
                maxWidth: "133%",
              }}
            >
              <span className={classes.labelText}>File Name *</span>
              <input
                type="text"
                className={classes.inputField}
                id="fileName"
                name="fileName"
                value={fileName}
                onChange={(e) => setFileName(e.target.value)}
                style={{
                  backgroundColor: "#123751",
                  borderColor: "#23262a",
                }}
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
                <span className={classes.labelText}>Note</span>
              </div>
              <input
                type="text"
                className={classes.inputField}
                id="note"
                value={note}
                name="note"
                onChange={(e) => setNote(e.target.value)}
                style={{
                  backgroundColor: "#123751",
                  borderColor: "#23262a",
                }}
              />
            </label>
            <label
              className="form-control w-full"
              style={{
                marginBottom: "20px",
                maxWidth: "133%",
              }}
            >
              <div>
                <span className={classes.labelText}>File *</span>
              </div>
              <input
                type="file"
                name="file"
                id="file"
                className="file-input file-input-bordered w-full h-[60px]"
                accept=".csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel"
              />
            </label>
            <p>Supported file formats are .xlsx and .csv files</p>
            {/* place buttons here */}
            <div className="modal-action">
              <div className={classes.buttonContainer}>
                <ButtonWhite onClick={closeCreatePlannedUploadModal} link="#">
                  Cancel
                </ButtonWhite>
                <ButtonSaveSubmit type="submit" />
              </div>
            </div>
          </form>
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
        <div
          className="modal-box"
          style={{ background: "#0D202F", borderColor: "#0D202F" }}
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
                      <h2 className="font-bold text-xl lg">{alertMessage}</h2>
                    </div>
                    {/*<div><p>Are you sure you want to delete this record?</p></div>*/}
                    <div>
                      <div>
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

export default CreatePlannedDataUploadModal;
