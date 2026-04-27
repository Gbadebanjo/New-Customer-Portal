import { cookies } from 'next/headers';
import ExitImpersonationButton from '@/components/Layout/ExitImpersonationButton';

const IMPERSONATOR_COOKIE = 'impersonator_session_id';

export default async function ImpersonationBanner() {
    const cookieStore = await cookies();
    const isImpersonating = !!cookieStore.get(IMPERSONATOR_COOKIE)?.value;

    if (!isImpersonating) return null;

    return <ExitImpersonationButton />;
}
