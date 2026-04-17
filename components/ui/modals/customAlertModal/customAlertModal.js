'use client';
import { useEffect, useRef } from "react";
import WarnCircleBigIcon from "@/components/ui/icons/WarnCircleBigIcon";
import { ButtonSaveSubmit } from "@/components/ui/ButtonSaveAndSubmit/ButtonSaveAndSubmit";
import classes from "@/components/auth/login/login.module.css";

export default function CustomAlertModal({ open, message, onClose }) {
    const dialogRef = useRef(null);

    useEffect(() => {
        if (open) {
            dialogRef.current?.showModal();
        } else {
            dialogRef.current?.close();
        }
    }, [open]);

    return (
        <dialog
            className="modal"
            ref={dialogRef}
            style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
            }}
        >
            <div className="modal-box" style={{ background: '#0D202F', borderColor: '#0D202F' }}>
                {/* <div className={classes.popUpHeader}></div> */}
                <div className="py-4">
                    <div>
                        <center className="flex flex-col items-center text-white">
                            <div><WarnCircleBigIcon /></div>
                            <div><h2 className="font-bold text-xl ">{message}</h2></div>
                            <div>
                                <div className={classes.buttonContainer}>
                                    <div>
                                        <ButtonSaveSubmit
                                            buttonText={'Ok'}
                                            onClick={onClose}
                                        />
                                    </div>
                                </div>
                            </div>
                        </center>
                    </div>
                </div>
            </div>
        </dialog>
    );
}