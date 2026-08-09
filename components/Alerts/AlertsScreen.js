import classes from './alerts.module.css';
import HomeIcon from '@/components/ui/icons/HomeIcon';
import Link from 'next/link';
import AlertsTable from '@/components/ui/tables/alerts/AlertsTable';
import db from '@/database/models';
import { getAuthorizedAssets } from '@/lib/services/ammp/getAuthorizedAssets';
import BackButton from '@/components/ui/BackButton/BackButton';

export default async function AlertsScreen({ userId }) {
    const date = new Date();
    const thisYear = date.getFullYear();

    const user = await db.User.findByPk(userId, { raw: true });
    const roles = user?.roles || [];
    const isCustomerOnly = roles.length > 0 && roles.every(role => role.name === 'Customer');

    const { assets } = await getAuthorizedAssets(userId);
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
                <BackButton />
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
