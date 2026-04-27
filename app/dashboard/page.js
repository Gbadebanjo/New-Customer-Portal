import DashboardScreen from "@/components/Dashboard/DashboardScreen";
import { verifyAuth } from "@/lib/auth/auth";
import { redirect } from "next/navigation";
import classes from '@/components/Dashboard/dashboard.module.css';

async function Page() {
    const result = await verifyAuth();

    if (!result.user) {
        return redirect('/');
    }

    return (
        <div className={classes.container}>
            <DashboardScreen userId={result.user.id} />
        </div>
    );
}

export default Page;
