import CompareScreen from '@/components/Compare/CompareScreen';
import { verifyAuth } from '@/lib/auth/auth';
import { redirect } from 'next/navigation';

export default async function ComparePage({ searchParams }) {
    const result = await verifyAuth();
    if (!result.user) return redirect('/');

    // Next 16 requires awaiting searchParams before destructuring.
    const sp = await searchParams;
    return <CompareScreen userId={result.user.id} searchParams={sp} />;
}
