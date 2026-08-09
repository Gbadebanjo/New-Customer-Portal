import PlannedVsActualScreen from "@/components/PlannedVsActual/PlannedVsActualScreen";
import {verifyAuth} from "@/lib/auth/auth";
import {redirect, notFound} from "next/navigation";
import { getAuthorizedAssets } from "@/lib/services/ammp/getAuthorizedAssets";

export default async function Page() {
    const result = await verifyAuth();

    if (!result.user) {
        return redirect('/');
    }

    const { token, assets } = await getAuthorizedAssets(result.user.id);

    if (!token) {
        notFound();
    }

    return (
        <div>
            <PlannedVsActualScreen assets={assets} token={token} />
        </div>
    );
}

