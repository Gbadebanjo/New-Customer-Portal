import AlertsScreen from '@/components/Alerts/AlertsScreen';
import { verifyAuth } from '@/lib/auth/auth';
import { redirect } from 'next/navigation';
import nookies from 'nookies';

export default async function Page(req) {
    const cookies = nookies.get({ req });
    const result = await verifyAuth(cookies);

    if (!result.user) {
        return redirect('/');
    }

    return (
        <div>
            <AlertsScreen userId={result.user.id} />
        </div>
    );
}
