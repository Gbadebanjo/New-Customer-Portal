import AnalyticsScreen from '@/components/Analytics/AnalyticsScreen';
import { requireAdminAuth } from '@/lib/auth/requireAdminAuth';

export default async function AnalyticsPage() {
    await requireAdminAuth();
    return <AnalyticsScreen />;
}
