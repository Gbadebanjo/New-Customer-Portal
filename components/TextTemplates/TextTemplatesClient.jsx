'use client'
import { useState } from 'react';
import { MdEmail, MdSend, MdAdd } from 'react-icons/md';
import classes from './texttemplates.module.css';
import TextTemplateActions from "@/components/ui/modals/otherActions/TextTemplateActions/TextTemplateActions";
import SendTemplateEmailModal from "./SendTemplateEmailModal";
import CreateTemplateModal from "./CreateTemplateModal";

export default function TextTemplatesClient({ textTemplates, recipients = [] }) {
    const [search, setSearch] = useState('');
    const [composeFor, setComposeFor] = useState(null); // template object when open
    const [createOpen, setCreateOpen] = useState(false);

    const filtered = textTemplates.filter((t) => {
        const q = search.toLowerCase();
        return (
            t.name?.toLowerCase().includes(q) ||
            t.display_name?.toLowerCase().includes(q)
        );
    });

    // Strip tags + collapse whitespace so the preview snippet reads
    // like prose regardless of what HTML the template stored.
    const previewOf = (content = '') => content
        .replace(/<[^>]+>/g, ' ')
        .replace(/&nbsp;/gi, ' ')
        .replace(/\s+/g, ' ')
        .trim();

    return (
        <>
            {/* Search + New Template */}
            <div className={classes.searchArea} style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                <input
                    type="text"
                    className={classes.inputText}
                    placeholder="Search templates..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                />
                <button
                    type="button"
                    onClick={() => setCreateOpen(true)}
                    title="Create a new email template"
                    style={{
                        display: 'inline-flex', alignItems: 'center', gap: 6,
                        padding: '10px 16px', background: '#ff7d70', border: 'none',
                        color: '#fff', borderRadius: 8, fontSize: 14, fontWeight: 600,
                        cursor: 'pointer', flexShrink: 0,
                    }}
                >
                    <MdAdd size={18} /> New Template
                </button>
            </div>

            {/* Card grid */}
            {filtered.length > 0 ? (
                <div className={classes.cardGrid}>
                    {filtered.map((template) => (
                        <div key={template.id} className={classes.card}>
                            <div className={classes.cardHead}>
                                <div className={classes.cardIcon}>
                                    <MdEmail size={22} />
                                </div>
                            </div>
                            <div className={classes.cardBody}>
                                <p className={classes.cardTitle}>{template.display_name}</p>
                                <p className={classes.cardSubtitle}>{template.name}</p>
                                {template.content && (
                                    <p className={classes.cardPreview}>{previewOf(template.content)}</p>
                                )}
                            </div>
                            <div className={classes.cardFooter}>
                                <button
                                    type="button"
                                    className={classes.sendBtn}
                                    onClick={() => setComposeFor(template)}
                                    title="Compose this template and send to selected users"
                                >
                                    <MdSend size={14} /> Send
                                </button>
                                <TextTemplateActions id={template.id} displayName={template.display_name} />
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <div className={classes.emptyState}>
                    <MdEmail size={48} color="#b0b7bd" />
                    <p>No templates found.</p>
                </div>
            )}

            <SendTemplateEmailModal
                open={!!composeFor}
                template={composeFor}
                recipients={recipients}
                onClose={() => setComposeFor(null)}
            />

            <CreateTemplateModal
                open={createOpen}
                onClose={() => setCreateOpen(false)}
            />
        </>
    );
}
