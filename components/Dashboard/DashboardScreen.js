import { Suspense } from 'react';
import Link from "next/link";
import classes from './dashboard.module.css';
import Image from "next/image";
import bgImage from "@/public/img/daystar/bg.png";
import HomeIcon from "@/components/ui/icons/HomeIcon";
import { ServiceConstants } from "@/utils/constants";
import { getAuthorizedAssets } from "@/lib/services/ammp/getAuthorizedAssets";
import { NoAssetsComponent } from "@/components/Dashboard/NoAssetsComponent";
import { TooManyAssetsComponent } from "@/components/Dashboard/TooManyAssetsComponent";
import StreamingDashboard from "@/components/Dashboard/streaming/StreamingDashboard";

/**
 * Fetches only the site list up front — the cheapest AMMP call, needed to
 * decide the layout (no-assets / too-many / streaming grid). Everything
 * downstream (historic totals, live power, freshness) is fetched inside
 * per-section Suspense boundaries so each cell streams in as its own
 * call returns.
 */
async function AssetsGate({ userId }) {
    const { token, assets } = await getAuthorizedAssets(userId);

    if (!assets || assets.length === 0) {
        return <NoAssetsComponent />;
    }
    if (assets.length > ServiceConstants.MaxAssets) {
        return <TooManyAssetsComponent />;
    }

    return (
        <StreamingDashboard
            assets={assets}
            token={token}
            autoRefreshMs={0}
            userId={userId}
        />
    );
}

export default function DashboardScreen({ userId }) {
    return (
        <div className={classes.container}>
            <div className={classes.header}>
                <span>
                    <Link href='/dashboard'>
                        <HomeIcon />
                    </Link>
                </span>
                <span> | &nbsp; Dashboard</span>
            </div>
            <div className={classes.content}>
                <Image
                    src={bgImage}
                    alt="Background"
                    fill
                    style={{ objectFit: "cover", zIndex: 0 }}
                    priority
                    quality={10}
                />
                <div className={classes.overlay} />
                <div style={{ position: "relative", zIndex: 1 }}>
                    {/* Outer Suspense catches the assets fetch — a small
                        window (typically <500ms with the cache warm) before
                        the grid shell + inner Suspense skeletons appear. */}
                    <Suspense fallback={<div style={{ minHeight: '60vh' }} />}>
                        <AssetsGate userId={userId} />
                    </Suspense>
                </div>
            </div>
        </div>
    );
}
