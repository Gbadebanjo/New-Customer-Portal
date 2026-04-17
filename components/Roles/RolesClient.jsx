'use client';
import { useState, useRef, useEffect } from 'react';
import classes from './roles.module.css';
import modalClasses from '@/components/ui/modals/sharedModal.module.css';
import { fetchRoleById, saveRoleById } from '@/lib/controllers/userRoles/roleActions';
import { FaTimes, FaEdit } from 'react-icons/fa';
import { RiSettings5Fill } from 'react-icons/ri';
import { FaChevronDown } from 'react-icons/fa6';
import { ButtonWhiteClose } from '@/components/ui/ButtonWhiteClose/ButtonWhiteClose';
import { ButtonSaveSubmit } from '@/components/ui/ButtonSaveAndSubmit/ButtonSaveAndSubmit';
import WarnCircleBigIcon from '@/components/ui/icons/WarnCircleBigIcon';

function ActionsDropdown({ role, onEdit }) {
    const [open, setOpen] = useState(false);
    const ref = useRef(null);

    useEffect(() => {
        if (!open) return;
        const handleClickOutside = (e) => {
            if (ref.current && !ref.current.contains(e.target)) {
                setOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [open]);

    return (
        <div ref={ref} style={{ position: 'relative', display: 'inline-block' }}>
            <button
                onClick={() => setOpen((o) => !o)}
                style={{
                    display: 'flex', alignItems: 'center', gap: 6,
                    padding: '6px 12px', background: '#1c384e', border: 'none',
                    borderRadius: 6, color: '#e1e7ed', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 600,
                }}
            >
                <RiSettings5Fill /> Actions <FaChevronDown size={10} />
            </button>
            {open && (
                <ul style={{
                    position: 'absolute', top: '110%', left: 0, zIndex: 9999,
                    background: '#0d2638', border: '1px solid #1c384e', borderRadius: 8,
                    listStyle: 'none', margin: 0, padding: '4px 0', minWidth: 140,
                    boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
                }}>
                    <li>
                        <button
                            onClick={() => { setOpen(false); onEdit(role.id); }}
                            style={{
                                width: '100%', padding: '8px 16px', background: 'none',
                                border: 'none', color: '#e1e7ed', cursor: 'pointer',
                                textAlign: 'left', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: 8,
                            }}
                        >
                            <FaEdit />Edit
                        </button>
                    </li>
                </ul>
            )}
        </div>
    );
}

export default function RolesClient({ initialRoles }) {
    const [roles, setRoles] = useState(initialRoles);
    const [search, setSearch] = useState('');

    const [editRole, setEditRole] = useState(null);
    const [roleName, setRoleName] = useState('');
    const [isDefault, setIsDefault] = useState(false);
    const [saving, setSaving] = useState(false);

    const [alertMsg, setAlertMsg] = useState('');
    const editRef = useRef(null);
    const alertRef = useRef(null);

    const filtered = roles.filter((r) =>
        r.name.toLowerCase().includes(search.toLowerCase())
    );

    const openEdit = async (id) => {
        const { userRole } = await fetchRoleById(id);
        if (!userRole) { showAlert('Role not found.'); return; }
        setEditRole(userRole);
        setRoleName(userRole.name);
        setIsDefault(Array.isArray(userRole.btn_tags) && userRole.btn_tags.includes('Default'));
        editRef.current?.showModal();
    };

    const closeEdit = () => {
        setEditRole(null);
        editRef.current?.close();
    };

    const saveRole = async () => {
        if (!editRole) return;
        setSaving(true);
        try {
            const btn_tags = isDefault ? ['Default'] : [];
            const normalized_name = roleName.toUpperCase().replace(/\s+/g, '_');
            await saveRoleById(editRole.id, { name: roleName, normalized_name, btn_tags });
            setRoles((prev) => prev.map((r) =>
                r.id === editRole.id ? { ...r, name: roleName, normalized_name, btn_tags } : r
            ));
            closeEdit();
            showAlert('Role updated successfully.');
        } catch {
            closeEdit();
            showAlert('An error occurred while updating the role.');
        } finally {
            setSaving(false);
        }
    };

    const showAlert = (msg) => {
        setAlertMsg(msg);
        alertRef.current?.showModal();
    };

    const closeAlert = () => alertRef.current?.close();

    return (
        <>
            {/* Search bar */}
            <form onSubmit={(e) => e.preventDefault()}>
                <div className={classes.searchArea}>
                    <div className={classes.searchTextInput}>
                        <input
                            type="text"
                            className={classes.inputText}
                            placeholder="Search roles…"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>
                </div>
            </form>

            <div className={classes.filterText} style={{ padding: '0 20px 12px', color: '#7c8796', fontSize: '0.9rem' }}>
                {filtered.length} role{filtered.length !== 1 ? 's' : ''}
            </div>

            {/* Table */}
            <main className={classes.mainContent}>
                <table className={`table table-bordered ${classes.table}`} style={{ width: '100%' }}>
                    <thead>
                        <tr>
                            <th style={{ width: 120 }}>ACTIONS</th>
                            <th>ROLE NAME</th>
                            <th>NORMALIZED NAME</th>
                            <th>TAGS</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filtered.length === 0 ? (
                            <tr>
                                <td colSpan={4} style={{ textAlign: 'center', padding: '2rem', color: '#7c8796' }}>
                                    No roles found
                                </td>
                            </tr>
                        ) : (
                            filtered.map((role) => (
                                <tr key={role.id} style={{ backgroundColor: '#0e1e29' }}>
                                    <td>
                                        <ActionsDropdown role={role} onEdit={openEdit} />
                                    </td>
                                    <td>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                            <span>{role.name}</span>
                                            {Array.isArray(role.btn_tags) && role.btn_tags.includes('Default') && (
                                                <span style={{
                                                    padding: '2px 10px', borderRadius: 20, fontSize: '0.75rem',
                                                    fontWeight: 700, background: '#1c384e', color: '#60a5fa',
                                                }}>Default</span>
                                            )}
                                        </div>
                                    </td>
                                    <td style={{ color: '#7c8796', fontSize: '0.875rem' }}>{role.normalized_name}</td>
                                    <td>
                                        {Array.isArray(role.btn_tags) && role.btn_tags.filter(t => t !== 'Default').map((tag) => (
                                            <span key={tag} style={{
                                                padding: '2px 10px', borderRadius: 20, fontSize: '0.75rem',
                                                fontWeight: 600, background: '#1c2e1e', color: '#4caf50', marginRight: 6,
                                            }}>{tag}</span>
                                        ))}
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </main>

            {/* Edit modal */}
            <dialog
                ref={editRef}
                className={`modal ${modalClasses.modalLayout}`}
                onCancel={(e) => { e.preventDefault(); closeEdit(); }}
            >
                <div className={modalClasses.modalContainer} style={{ maxWidth: 520 }}>
                    <div className={modalClasses.popUpHeader}>
                        <h2 className="font-bold text-xl">Edit Role</h2>
                        <button onClick={closeEdit} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                            <FaTimes color="#556372" size={24} />
                        </button>
                    </div>
                    <label className={modalClasses.fieldRow}>
                        <span className={modalClasses.labelText}>Role Name</span>
                        <input
                            type="text"
                            className={modalClasses.inputField}
                            value={roleName}
                            onChange={(e) => setRoleName(e.target.value)}
                        />
                    </label>
                    <label className={modalClasses.fieldRow} style={{ marginTop: '1rem' }}>
                        <span className={modalClasses.labelText}>Normalized Name</span>
                        <input
                            type="text"
                            className={modalClasses.inputField}
                            value={roleName.toUpperCase().replace(/\s+/g, '_')}
                            disabled
                            style={{ opacity: 0.5 }}
                        />
                    </label>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: '1.25rem' }}>
                        <input
                            type="checkbox"
                            id="is_default_role"
                            checked={isDefault}
                            onChange={(e) => setIsDefault(e.target.checked)}
                            style={{ width: 18, height: 18, cursor: 'pointer', accentColor: '#ff7d70' }}
                        />
                        <label htmlFor="is_default_role" className={modalClasses.labelText} style={{ cursor: 'pointer' }}>
                            Mark as Default role
                        </label>
                    </div>
                    <div className="modal-action" style={{ marginTop: '1.75rem' }}>
                        <div className={modalClasses.buttonContainer}>
                            <ButtonWhiteClose onClick={closeEdit} />
                            <ButtonSaveSubmit
                                onClick={saveRole}
                                buttonText={saving ? 'Saving…' : 'Save'}
                                disabled={saving}
                            />
                        </div>
                    </div>
                </div>
            </dialog>

            {/* Alert modal */}
            <dialog
                ref={alertRef}
                className={`modal ${modalClasses.modalLayout}`}
                onCancel={(e) => { e.preventDefault(); closeAlert(); }}
            >
                <div className={modalClasses.modalContainer} style={{ maxWidth: 400, textAlign: 'center' }}>
                    <WarnCircleBigIcon />
                    <h2 className="font-bold text-xl" style={{ marginTop: '1rem' }}>{alertMsg}</h2>
                    <div className="modal-action">
                        <div className={modalClasses.buttonContainer}>
                            <ButtonSaveSubmit buttonText="OK" onClick={closeAlert} />
                        </div>
                    </div>
                </div>
            </dialog>
        </>
    );
}
