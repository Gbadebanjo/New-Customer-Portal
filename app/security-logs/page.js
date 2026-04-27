import SecurityLogsScreen from "@/components/SecurityLogs/SecurityLogsScreen";
import { verifyAuth } from "@/lib/auth/auth";
import { redirect } from "next/navigation";

export default async function Profile() {
    const result = await verifyAuth();

    if (!result.user) {
        return redirect('/');
    }
    return (
        <div>
            <SecurityLogsScreen/>
        </div>
    );
}
