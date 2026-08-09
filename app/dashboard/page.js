import DashboardScreen from "@/components/Dashboard/DashboardScreen";
import db from "@/database/models";
import { verifyAuth } from "@/lib/auth/auth";
import { redirect } from "next/navigation";
import classes from '@/components/Dashboard/dashboard.module.css';

const DAYSTAR_ROLES = new Set(['Admin', 'Daystar Portal Admin', 'Daystar Customer Admin']);

async function Page() {
    const result = await verifyAuth();

    if (!result.user) {
        return redirect('/');
    }

    // Daystar-role users belong on the Fleet landing, not per-customer Dashboard.
    const user = await db.User.findByPk(result.user.id, { attributes: ['roles'], raw: true });
    const roles = Array.isArray(user?.roles) ? user.roles : [];
    const isDaystar = roles.some((r) => DAYSTAR_ROLES.has(r?.name));
    if (isDaystar) return redirect('/fleet');

    return (
        <div className={classes.container}>
            <DashboardScreen userId={result.user.id} />
        </div>
    );
}

export default Page;
