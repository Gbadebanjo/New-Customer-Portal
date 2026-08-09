import CronHealthScreen from '@/components/CronHealth/CronHealthScreen';
import { requireAdminAuth } from '@/lib/auth/requireAdminAuth';

export default async function CronHealthPage() {
    await requireAdminAuth();
    return <CronHealthScreen />;
}
