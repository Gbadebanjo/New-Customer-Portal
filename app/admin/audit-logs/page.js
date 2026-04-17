import AuditLogsScreen from "@/components/AuditLogs/AuditLogsScreen";
import { requireAdminAuth } from "@/lib/auth/requireAdminAuth";

export default async function AuditLogsPage() {
    await requireAdminAuth();
    return (
        <div>
            <AuditLogsScreen/>
        </div>
    );
}
