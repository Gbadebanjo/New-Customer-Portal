import SecurityLogsScreen from "@/components/SecurityLogs/SecurityLogsScreen";
import { requireAdminAuth } from "@/lib/auth/requireAdminAuth";

export default async function SecurityLogsPage() {
    await requireAdminAuth();
    return (
        <div>
            <SecurityLogsScreen/>
        </div>
    );
}
