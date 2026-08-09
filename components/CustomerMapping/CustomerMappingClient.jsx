'use client';
import { useState, useMemo, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import {
    listCustomerMappings,
    linkCustomerToAmmpGroup,
    deleteEmptyCustomer,
} from '@/lib/controllers/customerMapping/customerMappingActions';
import classes from './customerMapping.module.css';

export default function CustomerMappingClient({ initialCustomers, initialGroups, error }) {
    const router = useRouter();
    const [customers, setCustomers] = useState(initialCustomers);
    const [modal, setModal] = useState(null);       // { customer } | null
    const [groupSearch, setGroupSearch] = useState('');
    const [selectedGroupId, setSelectedGroupId] = useState('');
    const [mergeDupId, setMergeDupId] = useState('');
    const [msg, setMsg] = useState('');
    const [err, setErr] = useState('');
    const [pending, startTransition] = useTransition();
    const [customerFilter, setCustomerFilter] = useState('');

    const reload = () => startTransition(async () => {
        const res = await listCustomerMappings();
        if (res?.ok) setCustomers(res.customers);
    });

    const filteredCustomers = useMemo(() => {
        const t = customerFilter.trim().toLowerCase();
        if (!t) return customers;
        return customers.filter((c) => c.name.toLowerCase().includes(t));
    }, [customers, customerFilter]);

    const filteredGroups = useMemo(() => {
        const t = groupSearch.trim().toLowerCase();
        if (!t) return initialGroups;
        return initialGroups.filter((g) => g.displayName.toLowerCase().includes(t));
    }, [initialGroups, groupSearch]);

    const openLink = (customer) => {
        setModal({ customer });
        setGroupSearch('');
        setSelectedGroupId('');
        setMergeDupId('');
        setMsg('');
        setErr('');
    };

    const submitLink = async () => {
        if (!modal || !selectedGroupId) return;
        setMsg('');
        setErr('');
        startTransition(async () => {
            const res = await linkCustomerToAmmpGroup({
                customerId: modal.customer.id,
                groupId: selectedGroupId,
                mergeFromCustomerId: mergeDupId || null,
            });
            if (res?.ok) {
                setMsg(`${res.assetsLinked} sites linked to ${res.customerName}.` +
                    (res.mergedFrom ? ` Merged duplicate "${res.mergedFrom.name}".` : ''));
                setModal(null);
                reload();
                router.refresh();
            } else {
                setErr(res?.error || 'Link failed');
            }
        });
    };

    const handleDelete = async (id, name) => {
        if (typeof window !== 'undefined' &&
            !window.confirm(`Delete empty customer "${name}"?`)) return;
        setMsg(''); setErr('');
        startTransition(async () => {
            const res = await deleteEmptyCustomer(id);
            if (res?.ok) { setMsg(`Deleted "${name}".`); reload(); }
            else { setErr(res?.error || 'Delete failed'); }
        });
    };

    if (error) return <div className={classes.error}>{error}</div>;

    // Suggest a duplicate to merge from when the AMMP group's stripped name
    // matches another local customer (usually the auto-created stub).
    const findDuplicateSuggestion = (groupId) => {
        const grp = initialGroups.find((g) => g.groupId === groupId);
        if (!grp) return null;
        const target = grp.displayName.toLowerCase();
        return customers.find((c) =>
            c.id !== modal?.customer?.id &&
            c.name.toLowerCase() === target &&
            c.siteCount > 0
        );
    };

    return (
        <>
            <div className={classes.summary}>
                <span><strong>{customers.length}</strong> customers · <strong>{initialGroups.length}</strong> AMMP groups</span>
                <input
                    type="text"
                    value={customerFilter}
                    onChange={(e) => setCustomerFilter(e.target.value)}
                    placeholder="Filter customers…"
                    className={classes.searchInput}
                />
            </div>

            {(msg || err) && (
                <div style={{ margin: '8px 0', color: err ? '#ef4444' : '#4caf50', fontSize: '0.85rem' }}>
                    {err || msg}
                </div>
            )}

            <div className={classes.tableWrap}>
                <table className={classes.table}>
                    <thead>
                        <tr>
                            <th>Customer</th>
                            <th className={classes.numCol}>Sites</th>
                            <th>Linked group</th>
                            <th></th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredCustomers.map((c) => (
                            <tr key={c.id} className={c.siteCount === 0 ? classes.rowEmpty : ''}>
                                <td>{c.name}</td>
                                <td className={classes.numCol}>
                                    {c.siteCount > 0 ? c.siteCount : <span className={classes.zeroChip}>0</span>}
                                </td>
                                <td className={classes.groupCell}>
                                    {c.linkedAmmpGroup
                                        ? c.linkedAmmpGroup.split(':').slice(1).join(':') || c.linkedAmmpGroup
                                        : <span className={classes.dimText}>Not linked</span>}
                                </td>
                                <td style={{ textAlign: 'right' }}>
                                    <button type="button" className={classes.primaryBtn} onClick={() => openLink(c)} disabled={pending}>
                                        {c.siteCount > 0 ? 'Re-link' : 'Link AMMP group'}
                                    </button>
                                    {c.siteCount === 0 && (
                                        <button
                                            type="button"
                                            className={classes.dangerBtn}
                                            onClick={() => handleDelete(c.id, c.name)}
                                            disabled={pending}
                                            style={{ marginLeft: 6 }}
                                        >
                                            Delete
                                        </button>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {modal && (
                <div className={classes.modalOverlay} onClick={(e) => { if (e.target === e.currentTarget) setModal(null); }}>
                    <div className={classes.modal}>
                        <h3 className={classes.modalTitle}>
                            Link {modal.customer.name} to an AMMP group
                        </h3>
                        <p style={{ color: 'rgba(255,255,255,0.65)', fontSize: '0.82rem', margin: '0 0 12px' }}>
                            Every site in the picked group will map to {modal.customer.name}.
                            Existing group-synced mappings for this customer are cleared first.
                        </p>

                        <input
                            type="text"
                            value={groupSearch}
                            onChange={(e) => setGroupSearch(e.target.value)}
                            placeholder="Search groups…"
                            className={classes.searchInput}
                            autoFocus
                        />

                        <div className={classes.groupList}>
                            {filteredGroups.length === 0 ? (
                                <div className={classes.empty}>No groups match.</div>
                            ) : filteredGroups.map((g) => {
                                const selected = selectedGroupId === g.groupId;
                                return (
                                    <label key={g.groupId} className={`${classes.groupRow} ${selected ? classes.groupRowActive : ''}`}>
                                        <input
                                            type="radio"
                                            name="ammpGroup"
                                            checked={selected}
                                            onChange={() => {
                                                setSelectedGroupId(g.groupId);
                                                const dup = findDuplicateSuggestion(g.groupId);
                                                setMergeDupId(dup ? dup.id : '');
                                            }}
                                        />
                                        <span className={classes.groupName}>{g.displayName}</span>
                                        <span className={classes.groupCount}>{g.memberCount} sites</span>
                                    </label>
                                );
                            })}
                        </div>

                        {selectedGroupId && findDuplicateSuggestion(selectedGroupId) && (
                            <div className={classes.mergeHint}>
                                <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
                                    <input
                                        type="checkbox"
                                        checked={mergeDupId === findDuplicateSuggestion(selectedGroupId).id}
                                        onChange={(e) => {
                                            const sug = findDuplicateSuggestion(selectedGroupId);
                                            setMergeDupId(e.target.checked ? sug.id : '');
                                        }}
                                    />
                                    Also delete the duplicate customer&nbsp;
                                    <strong>&ldquo;{findDuplicateSuggestion(selectedGroupId).name}&rdquo;</strong>
                                    &nbsp;(auto-created by the sync)
                                </label>
                            </div>
                        )}

                        {err && <div style={{ color: '#ef4444', fontSize: '0.82rem', marginTop: 8 }}>{err}</div>}

                        <div className={classes.modalFooter}>
                            <button type="button" className={classes.ghostBtn} onClick={() => setModal(null)} disabled={pending}>
                                Cancel
                            </button>
                            <button type="button" className={classes.primaryBtn} onClick={submitLink} disabled={!selectedGroupId || pending}>
                                {pending ? 'Linking…' : 'Link'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
