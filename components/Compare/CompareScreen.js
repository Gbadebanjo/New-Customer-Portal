import { getAuthorizedAssets } from '@/lib/services/ammp/getAuthorizedAssets';
import PageHeader from '@/components/ui/PageHeader/PageHeader';
import CopyRight from '@/components/ui/CopyRight/copyright';
import InfoTooltip from '@/components/ui/InfoTooltip/InfoTooltip';
import { intersectWithAuthorized } from '@/lib/services/authz/getAuthorizedSiteIds';
import ComparePicker from './ComparePicker';
import CompareResults from './CompareResults';
import { getCompareData } from '@/lib/controllers/compare/getCompareData';
import classes from './compare.module.css';

/**
 * Server-rendered compare screen. Reads the selected asset IDs from the URL
 * (?sites=id,id&days=7), fetches the AMMP data server-side, and hands both
 * to the client picker / results components.
 */
export default async function CompareScreen({ userId, searchParams }) {
    // Picker only shows sites this user is authorized for. Requested siteIds
    // that fall outside the authorization set are silently dropped before
    // hitting getCompareData — belt-and-braces on top of the resolver's own
    // scoping.
    const { assets } = await getAuthorizedAssets(userId);

    const sitesParam = searchParams?.sites || '';
    const daysParam = Number(searchParams?.days) || 7;
    const requestedIds = sitesParam
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);

    const selectedIds = requestedIds.length > 0
        ? await intersectWithAuthorized(userId, requestedIds, null)
        : [];

    let compareData = null;
    if (selectedIds.length > 0) {
        compareData = await getCompareData(userId, selectedIds, daysParam);
    }

    return (
        <div className={classes.content}>
            <PageHeader crumbs={['Dashboard', 'Compare sites']} />
            <div className={classes.topCenter}>
                <p className={classes.title}>
                    Compare sites{' '}
                    <InfoTooltip title="What this page shows" placement="bottom">
                        Pick two or more of your sites to see their solar performance side by side
                        over the same time window. Useful for spotting a site that&rsquo;s pulling less
                        weight than its peers, or for celebrating your top performer.
                        <br /><br />
                        All figures come straight from your site meters — nothing is estimated
                        unless we say so on the row.
                    </InfoTooltip>
                </p>
            </div>
            <div className={classes.centerContent}>
                <ComparePicker
                    assets={Array.isArray(assets) ? assets : []}
                    selectedIds={selectedIds.map(String)}
                    windowDays={daysParam}
                />
                {compareData ? (
                    <CompareResults data={compareData} />
                ) : (
                    <div className={classes.empty}>
                        Pick two or more sites above to compare their performance.
                    </div>
                )}
            </div>
            <CopyRight />
        </div>
    );
}
