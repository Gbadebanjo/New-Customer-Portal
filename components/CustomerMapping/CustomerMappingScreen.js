import PageHeader from '@/components/ui/PageHeader/PageHeader';
import CopyRight from '@/components/ui/CopyRight/copyright';
import { listCustomerMappings, listAmmpCustomerGroups } from '@/lib/controllers/customerMapping/customerMappingActions';
import CustomerMappingClient from './CustomerMappingClient';
import classes from './customerMapping.module.css';

export default async function CustomerMappingScreen() {
    const [custRes, grpRes] = await Promise.all([
        listCustomerMappings(),
        listAmmpCustomerGroups(),
    ]);

    return (
        <div className={classes.content}>
            <PageHeader crumbs={['Admin', 'Customer mapping']} />
            <div className={classes.topCenter}>
                <p className={classes.title}>Customer &amp; site mapping</p>
                <p className={classes.subtitle}>
                    Link each local Customer record to its data provider group so their users can see their sites.
                    Use this when the local name doesn&rsquo;t match the group name (renames, mergers, or when
                    a customer was previously wired through another org&rsquo;s API key).
                </p>
            </div>

            <div className={classes.centerContent}>
                <CustomerMappingClient
                    initialCustomers={custRes?.ok ? custRes.customers : []}
                    initialGroups={grpRes?.ok ? grpRes.groups : []}
                    error={custRes?.error || grpRes?.error || null}
                />
            </div>
            <CopyRight />
        </div>
    );
}
