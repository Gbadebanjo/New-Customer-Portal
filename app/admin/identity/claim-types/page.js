import ClaimTypesScreen from "@/components/ClaimTypes/ClaimTypesScreen";
import { requireAdminAuth } from "@/lib/auth/requireAdminAuth";

export default async function ClaimTypesPage() {
    await requireAdminAuth();
    return (
        <div>
            <ClaimTypesScreen/>
        </div>
    );
}
