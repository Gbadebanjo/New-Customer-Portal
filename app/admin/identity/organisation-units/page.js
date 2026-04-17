import OrganisationUnitsScreen from "@/components/OrganisationUnits/OrganisationUnitsScreen";
import { requireAdminAuth } from "@/lib/auth/requireAdminAuth";

export default async function OrganisationUnitsPage() {
    await requireAdminAuth();
    return (
        <div>
            <OrganisationUnitsScreen/>
        </div>
    );
}
