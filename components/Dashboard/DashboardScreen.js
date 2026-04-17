import { Suspense } from 'react';
import classes from './dashboard.module.css';
import { DashboardComponent } from "@/components/Dashboard/DashboardComponent";
import HomeIcon from "@/components/ui/icons/HomeIcon";
import Link from "next/link";
import AmmpServices from "@/lib/services/ammp/AmmpServices";
import { ServiceConstants } from "@/utils/constants";
import Image from "next/image";
import bgImage from "@/public/img/daystar/bg.png";
import { getAmmpToken } from "@/lib/services/ammp/getAmmpToken";
import DashboardSkeleton from "@/components/Dashboard/DashboardSkeleton";

async function DashboardData({ userId }) {
    let assets = [];
    let myTotals;

    try {
        const { access_token } = await getAmmpToken(userId);
        const token = access_token;
        if (token) {
            const result = await AmmpServices().getAssets(token);
            assets = Array.isArray(result) ? result : [];
            if (assets.length > 0 && assets.length < ServiceConstants.MaxAssets) {
                myTotals = await AmmpServices().fetchAndCalculateHistoricEnergyData(assets, token);
            }
        }
    } catch (err) {
        console.error('DashboardScreen data fetch error:', err);
    }

    return <DashboardComponent assets={assets} totals={myTotals} />;
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
                    <Suspense fallback={<DashboardSkeleton />}>
                        <DashboardData userId={userId} />
                    </Suspense>
                </div>
            </div>
        </div>
    );
}
