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
            {/* Actions bar — counts summary + primary CTA. Mirrors the
                layout on API Keys so admin screens read as one system. */}
            <div className={classes.actionsBar}>
                <div className={classes.countsSummary}>
                    <span className={classes.countChip}>
                        <strong>{textTemplates.length}</strong> template{textTemplates.length === 1 ? '' : 's'}
                    </span>
                    {search && (
                        <span className={classes.countChipMuted}>
                            <strong>{filtered.length}</strong> match{filtered.length === 1 ? '' : 'es'}
                        </span>
                    )}
                </div>
                <button
                    type="button"
                    className={classes.primaryBtn}
                    onClick={() => setCreateOpen(true)}
                    title="Create a new email template"
                >
                    <MdAdd size={18} /> New Template
                </button>
            </div>

            {/* Search */}
            <div className={classes.searchArea}>
                <input
                    type="text"
                    className={classes.inputText}
                    placeholder="Search templates by name…"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                />
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
                    <p className={classes.emptyTitle}>
                        {search ? 'No templates match your search' : 'No templates yet'}
                    </p>
                    <p className={classes.emptyHint}>
                        {search
                            ? `Try a different name — nothing matched "${search}".`
                            : 'Create your first template to reuse it across emails.'}
                    </p>
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
