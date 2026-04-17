'use client'
import React, { useEffect, useRef, useState } from 'react';
import { MdEdit } from 'react-icons/md';
import classes from "./textTemplate.module.css";
import Link from "next/link";
import XMarkIcon from "@/components/ui/icons/XMarkIcon";
import { ButtonWhiteClose } from "@/components/ui/ButtonWhiteClose/ButtonWhiteClose";
import { ButtonSaveSubmit } from "@/components/ui/ButtonSaveAndSubmit/ButtonSaveAndSubmit";
import WarnCircleBigIcon from "@/components/ui/icons/WarnCircleBigIcon";
import getTextTemplateById from "@/lib/controllers/textTemplates/getTextTemplateById";
import updateTextTemplateById from "@/lib/controllers/textTemplates/updateTextTemplateById";

const TextTemplateActions = ({ id, displayName }) => {
    const editPopupRef = useRef(null);
    const customAlertPopupRef = useRef(null);

    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [isCustomAlertModalOpen, setIsCustomAlertModalOpen] = useState(false);

    const [textTemplateIdToEdit, setTextTemplateIdToEdit] = useState('');
    const [systemName, setSystemName] = useState('');
    const [name, setName] = useState('');
    const [content, setContent] = useState('');
    const [activeTab, setActiveTab] = useState('edit');
    const [isSaving, setIsSaving] = useState(false);
    const [alertMessage, setAlertMessage] = useState('');

    // ── Dialog open/close effects ──────────────────────
    useEffect(() => {
        if (isEditModalOpen) {
            editPopupRef.current?.showModal();
        } else if (editPopupRef.current?.open) {
            editPopupRef.current.close();
        }
    }, [isEditModalOpen]);

    useEffect(() => {
        if (isCustomAlertModalOpen) {
            customAlertPopupRef.current?.showModal();
        } else if (customAlertPopupRef.current?.open) {
            customAlertPopupRef.current.close();
        }
    }, [isCustomAlertModalOpen]);

    // ── Open edit modal and load template ─────────────
    const openEditModal = async () => {
        setActiveTab('edit');
        setIsEditModalOpen(true);
        setTextTemplateIdToEdit(id);

        const { textTemplate } = await getTextTemplateById(id);
        if (textTemplate) {
            const { name: sysName, display_name, content: templateContent } = textTemplate;
            setSystemName(sysName || '');
            setName(display_name || '');
            // FIX: content is already a plain string — do NOT JSON.stringify it
            setContent(templateContent || '');
        } else {
            openCustomAlertPopup('Text template not found.');
        }
    };

    const closeEditModal = () => {
        setIsEditModalOpen(false);
    };

    const closeCustomAlertModal = () => {
        setIsCustomAlertModalOpen(false);
    };

    // ── Save template ──────────────────────────────────
    const updateTextTemplate = async () => {
        setIsSaving(true);
        try {
            // FIX: pass the actual display_name and content, not an empty object
            await updateTextTemplateById(textTemplateIdToEdit, {
                display_name: name,
                content: content,
            });
            setIsEditModalOpen(false);
            openCustomAlertPopup('Text template updated successfully.');
        } catch (error) {
            setIsEditModalOpen(false);
            openCustomAlertPopup('An error occurred while updating the text template.');
        } finally {
            setIsSaving(false);
        }
    };

    const openCustomAlertPopup = (msg) => {
        setAlertMessage(msg);
        setIsCustomAlertModalOpen(true);
    };

    return (
        <div>
            {/* Edit trigger button */}
            <button className={classes.editBtn} onClick={openEditModal} title="Edit template">
                <MdEdit size={16} />
                <span>Edit</span>
            </button>

            {/* ── Edit modal ──────────────────────────────── */}
            <dialog
                className={`modal ${classes.modalLayout}`}
                ref={editPopupRef}
            >
                <div className={classes.modalBox}>
                    {/* Header */}
                    <div className={classes.modalHeader}>
                        <div>
                            <h2 className={classes.modalTitle}>{name || displayName || 'Edit Template'}</h2>
                            {systemName && (
                                <p className={classes.modalSubtitle}>{systemName}</p>
                            )}
                        </div>
                        <Link href="#" onClick={closeEditModal} className={classes.closeLink}>
                            <XMarkIcon />
                        </Link>
                    </div>

                    {/* Tabs */}
                    <div className={classes.tabs}>
                        <button
                            className={`${classes.tab} ${activeTab === 'edit' ? classes.tabActive : ''}`}
                            onClick={() => setActiveTab('edit')}
                            type="button"
                        >
                            Edit
                        </button>
                        <button
                            className={`${classes.tab} ${activeTab === 'preview' ? classes.tabActive : ''}`}
                            onClick={() => setActiveTab('preview')}
                            type="button"
                        >
                            Preview
                        </button>
                    </div>

                    {/* Tab panels */}
                    <div className={classes.tabContent}>
                        {activeTab === 'edit' && (
                            <div className={classes.editPanel}>
                                {/* Display Name */}
                                <label className={classes.fieldLabel}>
                                    Display Name
                                    <input
                                        type="text"
                                        className={classes.textInput}
                                        value={name}
                                        onChange={(e) => setName(e.target.value)}
                                        placeholder="Display name"
                                    />
                                </label>

                                {/* System Name (read-only) */}
                                <div className={classes.fieldLabel}>
                                    System Name
                                    <div className={classes.readOnlyField}>{systemName}</div>
                                </div>

                                {/* Content textarea */}
                                <label className={classes.fieldLabel}>
                                    Content
                                    <textarea
                                        className={classes.contentTextarea}
                                        value={content}
                                        onChange={(e) => setContent(e.target.value)}
                                        placeholder="Enter HTML email content..."
                                        spellCheck={false}
                                    />
                                    <span className={classes.helperText}>
                                        HTML is supported. Use &#123;variable&#125; placeholders for dynamic content.
                                    </span>
                                </label>
                            </div>
                        )}

                        {activeTab === 'preview' && (
                            <div className={classes.previewPanel}>
                                {content ? (
                                    <iframe
                                        className={classes.previewFrame}
                                        srcDoc={content}
                                        sandbox="allow-same-origin"
                                        title="Email preview"
                                    />
                                ) : (
                                    <div className={classes.previewEmpty}>
                                        No content to preview. Add HTML in the Edit tab first.
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Footer */}
                    <div className={classes.modalAction}>
                        <ButtonWhiteClose onClick={closeEditModal} />
                        <ButtonSaveSubmit
                            onClick={updateTextTemplate}
                            buttonText={isSaving ? 'Saving...' : 'Save'}
                            disabled={isSaving}
                        />
                    </div>
                </div>
            </dialog>

            {/* ── Alert modal ─────────────────────────────── */}
            <dialog
                className={`modal ${classes.modalLayout}`}
                ref={customAlertPopupRef}
            >
                <div className="modal-box" style={{ background: '#0d202f', borderColor: '#0d202f', textAlign: 'center' }}>
                    <WarnCircleBigIcon />
                    <h2 className="font-bold text-xl" style={{ marginTop: '1rem', color: '#e1e7ed' }}>
                        {alertMessage}
                    </h2>
                    <div className="modal-action" style={{ justifyContent: 'center' }}>
                        <ButtonSaveSubmit buttonText="Ok" onClick={closeCustomAlertModal} />
                    </div>
                </div>
            </dialog>
        </div>
    );
};

export default TextTemplateActions;
