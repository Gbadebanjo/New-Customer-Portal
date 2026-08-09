import UsersAuditScreen from '@/components/UsersAudit/UsersAuditScreen';
import { requireAdminAuth } from '@/lib/auth/requireAdminAuth';

export default async function UsersAuditPage() {
    await requireAdminAuth();
    return <UsersAuditScreen />;
}
