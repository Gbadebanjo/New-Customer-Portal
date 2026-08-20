import CronHealthScreen from '@/components/CronHealth/CronHealthScreen';
import { requireSuperAdminAuth } from '@/lib/auth/requireAdminAuth';

export default async function CronHealthPage() {
    await requireSuperAdminAuth();
    return <CronHealthScreen />;
}
