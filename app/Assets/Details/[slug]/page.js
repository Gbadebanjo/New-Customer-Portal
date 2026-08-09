import AssetDetailsScreen from "@/components/Dashboard/AssetDetailsScreen/AssetDetailsScreen";
import {verifyAuth} from "@/lib/auth/auth";
import {redirect, notFound} from "next/navigation";
import classes from "@/components/Dashboard/AssetDetailsScreen/assetDetails.module.css";
import { getAmmpToken } from "@/lib/services/ammp/getAmmpToken";
import AmmpServices from "@/lib/services/ammp/AmmpServices";

export default async function AssetDetailsPage({ params }) {
    //authentication
    const result = await verifyAuth();

    if (!result.user) {
        return redirect('/')
    }

    const { slug } = await params;
    const { access_token } = await getAmmpToken(result.user.id);
    const token = access_token;

    if (!token) {
        notFound();
    }

    const assetDetails = await AmmpServices().getAsset(token, slug);

    if (!assetDetails) {
        notFound();
    }

    return (
        <div className={classes.assetDetailsContainer}>
            <AssetDetailsScreen assetData={assetDetails} />
        </div>
    );
}
