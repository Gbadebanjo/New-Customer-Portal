import classes from './apiKeys.module.css';
import PageHeader from '@/components/ui/PageHeader/PageHeader';
import CopyRight from '@/components/ui/CopyRight/copyright';
import { listApiKeys } from '@/lib/controllers/apiKeys/apiKeyActions';
import getAllCustomers from '@/lib/controllers/customers/getAllCustomers';
import ApiKeysClient from './ApiKeysClient';

export default async function ApiKeysScreen() {
    const [keysResult, customers] = await Promise.all([
        listApiKeys(),
        getAllCustomers(),
    ]);
    const initialKeys = keysResult?.ok ? keysResult.keys : [];

    return (
        <div className={classes.content}>
            <PageHeader crumbs={['Admin', 'API keys']} />
            <header className={classes.pageHeader}>
                <div className={classes.pageHeaderRow}>
                    <h1 className={classes.title}>API keys</h1>
                    <a
                        href="/docs/api"
                        target="_blank"
                        rel="noopener"
                        className={classes.docsLink}
                    >
                        View API documentation ↗
                    </a>
                </div>
                <p className={classes.subtitle}>
                    Manage keys used to access the public Cleaned Data API.
                    Customer-scoped keys only see one customer&rsquo;s data;
                    fleet-scoped keys can query every customer.
                </p>
            </header>

            <div className={classes.centerContent}>
                <ApiKeysClient
                    initialKeys={initialKeys}
                    customers={(customers || []).map((c) => ({ id: c.id, name: c.company_name }))}
                />
            </div>
            <CopyRight />
        </div>
    );
}
