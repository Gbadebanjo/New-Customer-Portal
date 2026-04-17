import PlannedVsActualScreen from "@/components/PlannedVsActual/PlannedVsActualScreen";
import {verifyAuth} from "@/lib/auth/auth";
import {redirect, notFound} from "next/navigation";
import AmmpServices from "@/lib/services/ammp/AmmpServices";
import { getAmmpToken } from "@/lib/services/ammp/getAmmpToken";

export default async function Page() {
    const result = await verifyAuth();

    if (!result.user) {
        return redirect('/');
    }

    const { access_token: token } = await getAmmpToken(result.user.id);

    if (!token) {
        notFound();
    }

    const assets = await AmmpServices().getAssets(token);

    if (!assets) {
        notFound();
    }

    return (
        <div>
            <PlannedVsActualScreen assets={assets} token={token} />
        </div>
    );
}

