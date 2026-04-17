import RolesScreen from "@/components/Roles/RolesScreen";
import { requireAdminAuth } from "@/lib/auth/requireAdminAuth";

export default async function RolesPage() {
    await requireAdminAuth();
    return (
        <div>
            <RolesScreen/>
        </div>
    );
}
