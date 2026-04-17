import classes from './alerts.module.css';
import HomeIcon from '@/components/ui/icons/HomeIcon';
import Link from 'next/link';
import AmmpServices from '@/lib/services/ammp/AmmpServices';
import AlertsTable from '@/components/ui/tables/alerts/AlertsTable';
import db from '@/database/models';
import { getAmmpToken } from '@/lib/services/ammp/getAmmpToken';

export default async function AlertsScreen({ userId }) {
    const date = new Date();
    const thisYear = date.getFullYear();

    const user = await db.User.findByPk(userId, { raw: true });
    const roles = user?.roles || [];
    const isCustomerOnly = roles.length > 0 && roles.every(role => role.name === 'Customer');

    const { access_token } = await getAmmpToken(userId);
    const assets = access_token ? await AmmpServices().getAssets(access_token) : [];
    const assetList = Array.isArray(assets) ? assets : [];

    return (
        <div className={classes.content}>
            {/* Breadcrumb Header */}
            <div className={classes.header}>
                <span>
                    <Link href='/dashboard'>
                        <HomeIcon />
                    </Link>
                </span>
                <span><small> | &nbsp; Alerts</small></span>
            </div>

            {/* Title Row */}
            <div className={classes.topCenter}>
                <p className={classes.title}>Alerts</p>
            </div>

            {/* Main Content */}
            <div className={classes.centerContent}>
                <AlertsTable assets={assetList} isCustomerOnly={isCustomerOnly} />

                <div className={classes.copyright}>
                    {thisYear} © Daystar Power Energy Solutions
                </div>
            </div>
        </div>
    );
}
