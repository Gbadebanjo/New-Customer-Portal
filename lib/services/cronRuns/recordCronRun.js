import db from '@/database/models';

/**
 * Wrap a cron's work with a `cron_runs` row that captures start/finish/
 * status/summary. Never lets a failure inside the fn break the caller's
 * response — but does re-throw so the outer route can respond with 500.
 *
 *   await recordCronRun('ingest_daily', { triggeredByUserId }, async () => {
 *     // ...cron work...
 *     return { attempted: 3, ok: 3, failed: 0 };  // becomes the row's summary
 *   });
 */
export async function recordCronRun(kind, { triggeredByUserId = null } = {}, fn) {
    const startedAt = new Date();
    let row;
    try {
        row = await db.CronRun.create({
            kind,
            started_at: startedAt,
            status: 'running',
            triggered_by_user_id: triggeredByUserId,
        });
    } catch (err) {
        // If we can't even record the run (e.g. table missing in old envs),
        // still execute the fn so the cron does its job.
        console.error('recordCronRun: could not create run row', err);
        return fn();
    }

    try {
        const result = await fn();
        await row.update({
            finished_at: new Date(),
            status: 'ok',
            summary: safeJson(result),
        });
        return result;
    } catch (err) {
        await row.update({
            finished_at: new Date(),
            status: 'failed',
            error_text: err?.message || String(err),
        }).catch(() => { /* best-effort */ });
        throw err;
    }
}

// Guard against non-serialisable summary payloads (functions, dates, etc.).
function safeJson(x) {
    if (x == null) return null;
    try {
        return JSON.parse(JSON.stringify(x));
    } catch {
        return { note: 'summary_unserializable' };
    }
}
