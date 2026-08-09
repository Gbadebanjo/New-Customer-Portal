import ApiKeysScreen from '@/components/ApiKeys/ApiKeysScreen';
import { requireAdminAuth } from '@/lib/auth/requireAdminAuth';

export default async function ApiKeysPage() {
    await requireAdminAuth();
    return <ApiKeysScreen />;
}
