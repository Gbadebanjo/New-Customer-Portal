'use client'
import { useState } from 'react';
import { MdEmail } from 'react-icons/md';
import classes from './texttemplates.module.css';
import TextTemplateActions from "@/components/ui/modals/otherActions/TextTemplateActions/TextTemplateActions";

export default function TextTemplatesClient({ textTemplates }) {
    const [search, setSearch] = useState('');

    const filtered = textTemplates.filter((t) => {
        const q = search.toLowerCase();
        return (
            t.name?.toLowerCase().includes(q) ||
            t.display_name?.toLowerCase().includes(q)
        );
    });

    return (
        <>
            {/* Search bar */}
            <div className={classes.searchArea}>
                <input
                    type="text"
                    className={classes.inputText}
                    placeholder="Search templates..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                />
            </div>

            {/* Card grid */}
            {filtered.length > 0 ? (
                <div className={classes.cardGrid}>
                    {filtered.map((template) => (
                        <div key={template.id} className={classes.card}>
                            <div className={classes.cardIcon}>
                                <MdEmail size={28} color="#ff7d70" />
                            </div>
                            <div className={classes.cardBody}>
                                <p className={classes.cardTitle}>{template.display_name}</p>
                                <p className={classes.cardSubtitle}>{template.name}</p>
                                {template.inline_localized && (
                                    <span className={classes.pill}>{template.inline_localized}</span>
                                )}
                            </div>
                            <div className={classes.cardFooter}>
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
        </>
    );
}
