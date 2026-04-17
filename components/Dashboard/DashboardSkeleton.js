import skClasses from './dashboardSkeleton.module.css';

export default function DashboardSkeleton() {
    return (
        <div className={skClasses.grid}>
            {/* Top row */}
            <div className={skClasses.topLeft}>
                <div className={`${skClasses.shimmer} ${skClasses.title}`} />
            </div>
            <div className={skClasses.topCenter}>
                <div className={`${skClasses.shimmer} ${skClasses.meta}`} />
            </div>
            <div className={skClasses.topRight}>
                <div className={`${skClasses.shimmer} ${skClasses.title}`} />
            </div>

            {/* Stat cards */}
            <div className={`${skClasses.card} ${skClasses.solar}`}>
                <div className={`${skClasses.shimmer} ${skClasses.circle}`} />
                <div className={`${skClasses.shimmer} ${skClasses.line} ${skClasses.wide}`} />
                <div className={`${skClasses.shimmer} ${skClasses.line} ${skClasses.narrow}`} />
            </div>
            <div className={`${skClasses.card} ${skClasses.co2}`}>
                <div className={`${skClasses.shimmer} ${skClasses.circle}`} />
                <div className={`${skClasses.shimmer} ${skClasses.line} ${skClasses.wide}`} />
                <div className={`${skClasses.shimmer} ${skClasses.line} ${skClasses.narrow}`} />
            </div>
            <div className={`${skClasses.card} ${skClasses.trees}`}>
                <div className={`${skClasses.shimmer} ${skClasses.circle}`} />
                <div className={`${skClasses.shimmer} ${skClasses.line} ${skClasses.wide}`} />
                <div className={`${skClasses.shimmer} ${skClasses.line} ${skClasses.narrow}`} />
            </div>

            {/* Active sites panel */}
            <div className={`${skClasses.card} ${skClasses.rightSide}`}>
                <div className={`${skClasses.shimmer} ${skClasses.line} ${skClasses.wide}`} />
                {[1, 2, 3].map(i => (
                    <div key={i} className={skClasses.siteRow}>
                        <div className={skClasses.siteInfo}>
                            <div className={`${skClasses.shimmer} ${skClasses.line} ${skClasses.wide}`} />
                            <div className={`${skClasses.shimmer} ${skClasses.line} ${skClasses.narrow}`} />
                        </div>
                        <div className={`${skClasses.shimmer} ${skClasses.btn}`} />
                    </div>
                ))}
            </div>

            {/* Power generation title */}
            <div className={skClasses.powerGen}>
                <div className={`${skClasses.shimmer} ${skClasses.title}`} />
            </div>
            <div className={skClasses.lastUpdated}>
                <div className={`${skClasses.shimmer} ${skClasses.meta}`} />
            </div>

            {/* Donut area */}
            <div className={`${skClasses.card} ${skClasses.donut}`}>
                <div className={`${skClasses.shimmer} ${skClasses.line} ${skClasses.narrow}`} style={{ marginBottom: 16 }} />
                <div className={skClasses.donutRow}>
                    <div className={`${skClasses.shimmer} ${skClasses.donutCircle}`} />
                    <div className={skClasses.powerSources}>
                        {[1, 2, 3].map(i => (
                            <div key={i} className={skClasses.powerSource}>
                                <div className={`${skClasses.shimmer} ${skClasses.circle}`} />
                                <div className={`${skClasses.shimmer} ${skClasses.line} ${skClasses.narrow}`} />
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
