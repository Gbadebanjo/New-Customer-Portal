import AuditLogsScreen from "@/components/AuditLogs/AuditLogsScreen";
import { requireSuperAdminAuth } from "@/lib/auth/requireAdminAuth";

export default async function AuditLogsPage() {
    await requireSuperAdminAuth();
    return (
        <div>
            <AuditLogsScreen/>
        </div>
    );
}
