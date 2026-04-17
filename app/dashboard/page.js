import DashboardScreen from "@/components/Dashboard/DashboardScreen";
import { verifyAuth } from "@/lib/auth/auth";
import { redirect } from "next/navigation";
import nookies from 'nookies';
import classes from '@/components/Dashboard/dashboard.module.css';

async function Page(req) {
    const cookies = nookies.get({ req });
    const result = await verifyAuth(cookies);

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