import { NextResponse } from 'next/server';
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { verifyAuth } from '@/lib/auth/auth';
import getCustomerById from '@/lib/controllers/customers/getCustomerById';

export const dynamic = 'force-dynamic';

const s3 = new S3Client({
    region: process.env.BUCKET_REGION,
    credentials: {
        accessKeyId: process.env.BUCKET_ACCESS_KEY,
        secretAccessKey: process.env.BUCKET_SECRET_KEY,
    },
});

export async function GET(request, { params }) {
    const { user } = await verifyAuth();
    if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = params;
    const { customer } = await getCustomerById(id);

    if (!customer) {
        return NextResponse.json({ error: 'Customer not found' }, { status: 404 });
    }

    if (!customer.logo_file_name) {
        return NextResponse.json({ error: 'No logo set' }, { status: 404 });
    }

    const command = new GetObjectCommand({
        Bucket: process.env.BUCKET_NAME,
        Key: customer.logo_file_name,
    });

    // URL valid for 5 minutes — enough for a page render, short enough to limit sharing
    const url = await getSignedUrl(s3, command, { expiresIn: 300 });

    return NextResponse.json({ url });
}
