import classes from './SupportDetails.module.css';
import HomeIcon from "@/components/ui/icons/HomeIcon";
import Link from "next/link";
import SupportDetailsClient from "@/components/SupportDetailsClient/SupportDetailsClient";
import getAllSupportQueryStatuses from "@/lib/controllers/supportQueryStatus/getAllSupportQueryStatuses";
import getAllSupportQueryCategories from "@/lib/controllers/supportQueryCategory/getAllSupportQueryCategories";
import { getSupportQueryById } from '@/lib/controllers/supportQuery/getSupportQueryById';

import CopyRight from '../ui/CopyRight/copyright';
import BackButton from '@/components/ui/BackButton/BackButton';


export default async function SupportDetailsScreen({ support_id }) {
    const { supportQueryStatuses } = await getAllSupportQueryStatuses();
    const { supportQueryCategories } = await getAllSupportQueryCategories();
    const supportQueryById = await getSupportQueryById(support_id);

    return (
        <div className={classes.container}>
            {/* Header */}
            <div className={classes.header}>
                <span>
                    <Link href='/dashboard'>
                        <HomeIcon />
                    </Link>
                </span>
                <span>
                    <small> Support </small></span>
                <BackButton />
            </div>
            <div className={classes.content}>
                <SupportDetailsClient
                    allSupportQueryCategories={supportQueryCategories}
                    support_id={support_id}
                    allSupportQueryStatuses={supportQueryStatuses}
                    supportQueryById={supportQueryById}
                />

            </div>
            <CopyRight />
        </div>
    );
}