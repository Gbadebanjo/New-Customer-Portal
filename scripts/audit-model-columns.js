import 'dotenv/config';
import pg from 'pg';
import fs from 'fs';
import path from 'path';

const targets = [
    { table: 'report_data',           modelFile: 'ReportData.js' },
    { table: 'report_notes',          modelFile: 'ReportNote.js' },
    { table: 'notifications',         modelFile: 'Notification.js' },
    { table: 'cron_runs',             modelFile: 'CronRun.js' },
    { table: 'api_keys',              modelFile: 'ApiKey.js' },
    { table: 'customer_site_mapping', modelFile: 'CustomerSiteMapping.js' },
];

// Sequelize timestamp/pk fields the model doesn't need to declare
const IMPLICIT = new Set(['created_at', 'updated_at']);

const client = new pg.Client({
    host: process.env.DB_HOST, port: Number(process.env.DB_PORT) || 5432,
    database: process.env.DB_NAME, user: process.env.DB_USER, password: process.env.DB_PASS,
});
await client.connect();

for (const t of targets) {
    const cols = await client.query(
        `SELECT column_name FROM information_schema.columns WHERE table_name = $1 ORDER BY ordinal_position`,
        [t.table]
    );
    const dbCols = cols.rows.map((r) => r.column_name);

    const modelPath = path.join(process.cwd(), 'database', 'models', t.modelFile);
    let source = '';
    try { source = fs.readFileSync(modelPath, 'utf-8'); } catch { /* missing */ }
    if (!source) { console.log(`[${t.table}] model file missing`); continue; }

    const missing = dbCols.filter((col) => {
        if (IMPLICIT.has(col)) return false;
        // Match `  <col_name>: {` — a key at start of an object literal.
        const re = new RegExp(`(^|\\n)\\s*${col}\\s*:\\s*\\{`);
        return !re.test(source);
    });

    console.log(`[${t.table}] → ${missing.length ? 'MISSING: ' + missing.join(', ') : 'OK'}`);
}

await client.end();
