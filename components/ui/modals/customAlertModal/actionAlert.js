'use client';
import { useEffect, useRef } from "react";
import WarnCircleBigIcon from "../../icons/WarnCircleBigIcon";
import ButtonWhite from "../../button-white/Button";
import { ButtonSaveSubmit } from "../../ButtonSaveAndSubmit/ButtonSaveAndSubmit";
import classes from "../otherActions/CustomerActions/customerActions.module.css";

export default function ActionAlert({ dialogRef, message, closeButton, SubmitButtonText, onClick }) {

    return (
        <dialog
            id="import_modal"
            className="modal"
            ref={dialogRef}
            style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: "rgba(255, 255, 255, 0.5)",
            }}
        >
            <div className="modal-box" style={{
                background: "#123751",
                marginTop: "5rem",
                width: "700px",
                maxWidth: "40vw",
                padding: "2.5rem 2rem",
            }}>
                <div className="py-4">
                    <form method="dialog">
                        <div aria-labelledby="export-user-modal-tabs_0-tab" id="create-user-modal-tabs_0"
                            role="tabpanel">
                            <div>
                                <center className='gap-5 flex flex-col'>
                                    <div><WarnCircleBigIcon /></div>
                                    <div><p className="font-bold text-xl">{message}</p></div>
                                    <div>
                                        <div className={classes.buttonContainer}>
                                            <div style={{ marginRight: 5 }}>
                                                <ButtonWhite onClick={closeButton} link="#">Cancel</ButtonWhite>
                                            </div>
                                            <div style={{ marginLeft: 5 }}>
                                                <ButtonSaveSubmit buttonText={SubmitButtonText} onClick={onClick} />
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
    );
}
