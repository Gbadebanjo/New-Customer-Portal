import IdentityManagementScreen from "@/components/IdentityManagement/IdentityManagementScreen";
import { requireAdminAuth } from "@/lib/auth/requireAdminAuth";

export default async function IdentityManagementPage() {
    await requireAdminAuth();
    return (
        <div>
            <IdentityManagementScreen/>
        </div>
    );
}
