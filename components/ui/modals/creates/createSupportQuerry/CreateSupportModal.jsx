"use client";
import React, { useEffect, useRef, useState } from "react";
import ButtonFlexible from "@/components/ui/button-flexible/ButtonFlexible";
import classes from "./createSupportModal.module.css";
import { normalizeString, SupportQueryConstants } from "@/utils/constants";
import { ButtonSaveSubmit } from "@/components/ui/ButtonSaveAndSubmit/ButtonSaveAndSubmit";
import ButtonWhite from "@/components/ui/button-white/Button";
import { useUser } from "@/components/Context/userContext";

import AddSupportQuery from "@/lib/controllers/supportQuery/AddSupportQuery";
import WarnCircleBigIcon from "@/components/ui/icons/WarnCircleBigIcon";
import { FaPlus } from "react-icons/fa";
import { FaXmark } from "react-icons/fa6";

const CreateSupportModal = ({ supportQueryCategories }) => {
  const [isCreateSupportModalOpen, setIsCreateSupportModalOpen] =
    useState(false);
  const [selectedSupportCategory, setSelectedSupportCategory] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [isCustomAlertModalOpen, setIsCustomAlertModalOpen] = useState(false);
  const [alertMessage, setAlertMessage] = useState("");
  const customAlertPopupRef = useRef(null);
  const createSupportModalRef = useRef(null);
  const { user } = useUser();

  // console.log("User in supportmodel:", user);

  useEffect(() => {
    if (isCreateSupportModalOpen) {
      createSupportModalRef.current.showModal();
    } else {
      createSupportModalRef.current.close();
    }
  }, [isCreateSupportModalOpen]);

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

  const openCreateSupportModal = () => {
    setIsCreateSupportModalOpen(true);
  };

  const closeCreateSupportModal = () => {
    setIsCreateSupportModalOpen(false);
  };

  const handleSubmit = async (e) => {
  e.preventDefault();

  if (!user?.id) {
    openCustomAlertPopup("User is not logged in");
    return;
  }

  if (
    title.length < SupportQueryConstants.TitleMinLength ||
    title.length > SupportQueryConstants.TitleMaxLength
  ) {
    openCustomAlertPopup("Invalid title length");
    return;
  }

  if (
    description.length < SupportQueryConstants.DescriptionMinLength ||
    description.length > SupportQueryConstants.DescriptionMaxLength
  ) {
    openCustomAlertPopup("Invalid description length");
    return;
  }

  try {
    // Call your server action directly
    await AddSupportQuery({
      user_id: user.id,
      user_customer: user.customer,
      supportCategory: selectedSupportCategory,
      title,
      description,
    });

    closeCreateSupportModal();
    setSelectedSupportCategory("");
    setTitle("");
    setDescription("");
  } catch (err) {
    openCustomAlertPopup("Failed to create support query");
  }
};


  return (
    <div style={{ display: "flex", alignItems: "flex-end" }}>
      <ButtonFlexible
        className="btn"
        onClick={openCreateSupportModal}
        width={210}
        height={40}
        link="#"
      >
        <FaPlus /> <small>New Support Query</small>
      </ButtonFlexible>

      <dialog
        className={`modal ${classes.modalLayout}`}
        ref={createSupportModalRef}
      >
        <div className={classes.modalContainer}>
          <div className={classes.popUpHeader}>
            <h2 className="font-bold text-xl">New Support Query</h2>
            <button type="button" onClick={closeCreateSupportModal} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
              <FaXmark color="#556372" size={28} />
            </button>
          </div>

          <form onSubmit={handleSubmit}>
            {/* Hidden user_id field */}
            <input type="hidden" name="user_id" value={user?.id || ""} />
            <input
              type="hidden"
              name="user_customer"
              value={user?.customer || ""}
            />

            <label
              className="form-control w-full pt-5"
              style={{ marginBottom: "20px", maxWidth: "133%" }}
            >
              <span className="label-text text-lg pt-5 text-white">
                Category
              </span>
              <select
                className={classes.inputField}
                name="supportCategory"
                value={selectedSupportCategory}
                onChange={(e) => setSelectedSupportCategory(e.target.value)}
                required
              >
                <option disabled value="">
                  Select a category
                </option>
                {supportQueryCategories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {normalizeString(category.name)}
                  </option>
                ))}
              </select>
            </label>

            <label
              className="form-control w-full"
              style={{ marginBottom: "20px", maxWidth: "133%" }}
            >
              <span className={classes.labelText}>Title</span>
              <input
                type="text"
                className={classes.inputField}
                id="title"
                name="title"
                value={title}
                required
                onChange={(e) => setTitle(e.target.value)}
                style={{ backgroundColor: "#123751", borderColor: "#23262a" }}
              />
            </label>

            <label
              className="form-control w-full"
              style={{ marginBottom: "20px", maxWidth: "133%" }}
            >
              <span className={classes.labelText}>Description</span>
              <textarea
                className={`textarea textarea-bordered w-full ${classes.inputField}`}
                id="description"
                name="description"
                value={description}
                required
                onChange={(e) => setDescription(e.target.value)}
                style={{ backgroundColor: "#123751", borderColor: "#23262a" }}
              />
            </label>

            <div className="modal-action">
              <div className={classes.buttonContainer}>
                <ButtonWhite onClick={closeCreateSupportModal} link="#">
                  Cancel
                </ButtonWhite>
                <ButtonSaveSubmit type="submit" />
              </div>
            </div>
          </form>
        </div>
      </dialog>

      <dialog
        ref={customAlertPopupRef}
        className="modal"
        style={{
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "center",
          backgroundColor: "rgba(255, 255, 255, 0.5)",
        }}
      >
        <div
          className="modal-box"
          style={{ background: "#0D202F", borderColor: "#0D202F", marginTop: "5rem", width: "700px", maxWidth: "40vw", padding: "2.5rem 2rem"}}
        >
          <center>
            <WarnCircleBigIcon />
            <h2 className="font-bold py-4 text-xl">{alertMessage}</h2>
            <ButtonSaveSubmit
              buttonText={"Ok"}
              onClick={closeCustomAlertModal}
            />
          </center>
        </div>
      </dialog>
    </div>
  );
};

export default CreateSupportModal;
