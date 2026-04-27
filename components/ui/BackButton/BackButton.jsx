'use client';
import { useRouter } from 'next/navigation';
import ChevronLeft from '@/components/ui/icons/ChevronLeft';

export default function BackButton() {
    const router = useRouter();
    return (
        <button
            onClick={() => router.back()}
            style={{
                marginLeft: 'auto',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '3px',
                background: 'none',
                border: '1px solid #ff7d70',
                color: '#ff7d70',
                cursor: 'pointer',
                fontSize: '12px',
                fontWeight: 500,
                padding: '3px 10px',
                borderRadius: '4px',
                lineHeight: 1.5,
                transition: 'background 0.15s',
            }}
            onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,125,112,0.12)'}
            onMouseLeave={e => e.currentTarget.style.background = 'none'}
        >
            <ChevronLeft />
            Back
        </button>
    );
}
