import AlertsScreen from '@/components/Alerts/AlertsScreen';
import { verifyAuth } from '@/lib/auth/auth';
import { redirect } from 'next/navigation';

export default async function Page() {
    const result = await verifyAuth();

    if (!result.user) {
        return redirect('/');
    }

    return (
        <div>
            <AlertsScreen userId={result.user.id} />
        </div>
    );
}
