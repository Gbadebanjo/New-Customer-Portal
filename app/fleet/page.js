import FleetScreen from "@/components/Fleet/FleetScreen";
import db from "@/database/models";
import { verifyAuth } from "@/lib/auth/auth";
import { redirect } from "next/navigation";
import classes from '@/components/Dashboard/dashboard.module.css';

const DAYSTAR_ROLES = new Set(['Admin', 'Daystar Portal Admin', 'Daystar Customer Admin']);

export default async function FleetPage() {
    const result = await verifyAuth();
    if (!result.user) return redirect('/');

    // Fleet is a Daystar-only landing. Customer Users get bounced to their
    // scoped Dashboard so they don't land on an empty/wrong-scoped view.
    const user = await db.User.findByPk(result.user.id, { attributes: ['roles'], raw: true });
    const roles = Array.isArray(user?.roles) ? user.roles : [];
    const isDaystar = roles.some((r) => DAYSTAR_ROLES.has(r?.name));
    if (!isDaystar) return redirect('/dashboard');

    return (
        <div className={classes.container}>
            <FleetScreen userId={result.user.id} />
        </div>
    );
}
