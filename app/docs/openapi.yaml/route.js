import fs from 'fs';
import path from 'path';

// Serves the OpenAPI spec as text/yaml so tools like Postman, Swagger UI,
// and openapi-generator can consume it directly.
export const dynamic = 'force-static';

export async function GET() {
    const abs = path.join(process.cwd(), 'docs', 'openapi.yaml');
    try {
        const body = fs.readFileSync(abs, 'utf-8');
        return new Response(body, {
            status: 200,
            headers: {
                'Content-Type': 'application/yaml; charset=utf-8',
                'Cache-Control': 'public, max-age=300',
            },
        });
    } catch {
        return new Response('OpenAPI spec not found', { status: 404 });
    }
}
