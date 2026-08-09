import Link from 'next/link';
import PageHeader from '@/components/ui/PageHeader/PageHeader';
import CopyRight from '@/components/ui/CopyRight/copyright';
import { listUsersWithoutCustomer } from '@/lib/controllers/users/usersWithoutCustomer';
import classes from './usersAudit.module.css';

function fmt(iso) {
    if (!iso) return '—';
    const d = new Date(iso);
    return isNaN(d.getTime()) ? '—' : d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

export default async function UsersAuditScreen() {
    const res = await listUsersWithoutCustomer();
    const users = res?.ok ? res.users : [];

    return (
        <div className={classes.content}>
            <PageHeader crumbs={['Admin', 'User audit']} />
            <div className={classes.topCenter}>
                <p className={classes.title}>Users missing customer assignment</p>
                <p className={classes.subtitle}>
                    Non-admin users without a <code>customer</code> field see no data under the new authorization model.
                    Assign each to a customer via the Users admin page, or deactivate if they shouldn&rsquo;t have access.
                </p>
            </div>

            <div className={classes.centerContent}>
                <div className={classes.summary}>
                    <span className={classes.count}>{users.length}</span>
                    <span className={classes.countLabel}>
                        user{users.length === 1 ? '' : 's'} needing attention
                    </span>
                    <Link href="/admin/identity/users" className={classes.jumpLink}>
                        Open Users admin →
                    </Link>
                </div>

                {users.length === 0 ? (
                    <div className={classes.empty}>
                        Every active non-admin user has a customer assigned. Nothing to do here.
                    </div>
                ) : (
                    <div className={classes.tableWrap}>
                        <table className={classes.table}>
                            <thead>
                                <tr>
                                    <th>User</th>
                                    <th>Email</th>
                                    <th>Roles</th>
                                    <th>Created</th>
                                </tr>
                            </thead>
                            <tbody>
                                {users.map((u) => (
                                    <tr key={u.id}>
                                        <td>{u.fullName || u.username || '—'}</td>
                                        <td>{u.email}</td>
                                        <td>{u.roles.length ? u.roles.join(', ') : '—'}</td>
                                        <td>{fmt(u.createdAt)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
            <CopyRight />
        </div>
    );
}
