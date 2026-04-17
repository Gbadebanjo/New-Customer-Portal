import AdminScreen from "@/components/admin/AdminScreen";
import { requireAdminAuth } from "@/lib/auth/requireAdminAuth";

async function AdminPortalPage() {
    await requireAdminAuth();
    return (
        <div>
            <AdminScreen/>
        </div>
    );
}

export default AdminPortalPage;
