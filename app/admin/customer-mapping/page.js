import CustomerMappingScreen from '@/components/CustomerMapping/CustomerMappingScreen';
import { requireAdminAuth } from '@/lib/auth/requireAdminAuth';

export default async function CustomerMappingPage() {
    await requireAdminAuth();
    return <CustomerMappingScreen />;
}
