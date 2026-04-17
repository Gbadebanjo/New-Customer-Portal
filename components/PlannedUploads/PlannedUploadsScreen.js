import classes from './planneduploads.module.css';
import HomeIcon from "@/components/ui/icons/HomeIcon";
import Link from "next/link";
import getAllPowerProductionPlans from "@/lib/controllers/powerProductionPlan/getAllPowerProductionPlans";
import CreatePlannedDataUploadModal
    from "@/components/ui/modals/creates/createPlannedDataUpload/CreatePlannedDataUploadModal";
import PlannedMainDataTable from "@/components/ui/tables/plannedData/PlannedMainDataTable"; // Import the image

export default async function PlannedUploadsScreen() {
    const date = new Date();
    const thisYear = date.getFullYear();
    const {powerProductionPlans} = await getAllPowerProductionPlans();
    console.log('Power Production Plans:', powerProductionPlans);
    const NO_OF_COLUMNS = 5;
    
    return (<div className={classes.content}>
        {/* Header */}
        <div className={classes.header}>
                <span>
                   <Link href='/dashboard'>
                       <HomeIcon/>
                   </Link>
                 </span>
            <span><small> | &nbsp; Planned Data Upload</small></span>
        </div>
        {/* Content */}
        <div className={classes.content}>
            {/* Top Center */}
            <div className={classes.topCenter}>
                <p className={classes.title}>Planned Data Uploads</p>
                <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                    <a
                        href="/api/planned-data/template"
                        download="planned_data_template.xlsx"
                        style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '6px',
                            padding: '8px 16px',
                            background: 'transparent',
                            border: '1px solid #FF7D70',
                            color: '#FF7D70',
                            borderRadius: '8px',
                            fontWeight: 600,
                            fontSize: '0.875rem',
                            textDecoration: 'none',
                            whiteSpace: 'nowrap',
                        }}
                    >
                        Download Template
                    </a>
                    <CreatePlannedDataUploadModal />
                </div>
            </div>
            <div className={classes.centerContent}>
                <PlannedMainDataTable
                    allPowerProductionPlans={powerProductionPlans}
                />
                {/*footer area*/}
                <div className={classes.copyright}>
                    {thisYear} © Daystar Power Energy Solutions
                </div>
            </div>
        </div>
    </div>);
}