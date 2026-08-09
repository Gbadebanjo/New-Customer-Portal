'use client'
import { useEffect, useState } from "react";
import { NoAssetsComponent } from "@/components/Dashboard/NoAssetsComponent";
import { ActiveAssetsComponent } from "@/components/Dashboard/activeAssets/ActiveAssetsComponent";
import { TooManyAssetsComponent } from "@/components/Dashboard/TooManyAssetsComponent";
import { ServiceConstants } from "@/utils/constants";

export function DashboardComponent({ assets, totals }) {
    const [lastUpdateDate, setLastUpdateDate] = useState('');
    const [noAssets, setNoAssets] = useState(true);
    const [assetCount, setAssetCount] = useState(0);
    const [tooManyAssets, setTooManyAssets] = useState(false);

    useEffect(() => {
        const fetchData = async () => {
            if (assets?.detail === 'Could not validate credentials') {
                setAssetCount(0);
                setNoAssets(true);
            } else if (!assets || assets.length === 0) {
                setAssetCount(0);
                setNoAssets(true);
            } else if (assets.length > 0) {
                setAssetCount(assets.length);
                setNoAssets(false);
            }

            const timeZoneInfo = new Date().toLocaleString();
            setLastUpdateDate(timeZoneInfo);

            setTooManyAssets(Array.isArray(assets) && assets.length > ServiceConstants.MaxAssets);
        };

        fetchData();
    }, [assets, totals]);

    return (
        <div>
            {/* Content */}
            {noAssets && <NoAssetsComponent />}
            {tooManyAssets && <TooManyAssetsComponent />}
            {!noAssets && !tooManyAssets && <ActiveAssetsComponent
                totals={totals}
                assets={assets}
            />}
        </div>
    );
}
