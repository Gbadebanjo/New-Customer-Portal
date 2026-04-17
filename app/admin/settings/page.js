import SettingsScreen from "@/components/settings/SettingsScreen";
import { requireAdminAuth } from "@/lib/auth/requireAdminAuth";

export default async function SettingsPage() {
    await requireAdminAuth();
    return (
        <div>
            <SettingsScreen/>
        </div>
    );
}
