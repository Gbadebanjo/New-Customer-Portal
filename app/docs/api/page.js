import DocsPage from '@/components/DocsPage/DocsPage';

// Public route — no auth. API consumers reach this URL from the copy-welcome
// message a Daystar admin sends them.
export const metadata = {
    title: 'Daystar Public Data API',
    description: 'Documentation for the Daystar Cleaned Data API — verified daily solar data for your sites.',
};

export default function ApiDocsPage() {
    return <DocsPage file="PUBLIC-DATA-API.md" title="Public Data API" />;
}
