# Historical Data Resolver — Contract

**Owner:** `lib/services/reportData/getEnergyForRange.js`

The single entry point used by every chart, card, KPI, digest and comparison in the app that shows solar production for a past period. Its job is to answer: **"What are the best-available numbers for these sites, between these dates?"** — preferring verified data, falling back to raw, then to the live provider.

Callers do not care where the number came from. They pass in a range; they get back a per-day series plus a source breakdown they can turn into a badge.

---

## Signature

```ts
getEnergyForRange({
  userId:   string,           // required — used to resolve the AMMP token for live fallback
  siteIds:  string[],         // required — one or more asset IDs
  from:     Date,             // required — inclusive start (UTC start-of-day)
  to:       Date,             // required — inclusive end   (UTC end-of-day)
  fields?:  string[],         // optional — defaults to ['solar_kwh','consumption_kwh','generator_kwh','grid_kwh']
})
  => Promise<{
       series:     ResolverRow[],
       sourceMix:  { verified: number, raw: number, live: number, unavailable: number },
     }>
```

Where a `ResolverRow` is:

```ts
{
  date:              string,   // 'YYYY-MM-DD' (UTC)
  siteId:            string,
  solar_kwh:         number | null,
  consumption_kwh:   number | null,
  generator_kwh:     number | null,
  grid_kwh:          number | null,
  source:            'verified' | 'raw' | 'live' | 'unavailable',
  verifiedAt?:       string,   // ISO — present when source === 'verified'
  verifiedBy?:       string,   // display name — present when source === 'verified'
}
```

---

## Resolution rules (per site × day)

Applied in order. First match wins.

1. `report_data` row exists for (siteId, date) with `status = 'verified'`
   → `source: 'verified'`. Values come from the row's editable columns.
2. `report_data` row exists with `status = 'raw'`
   → `source: 'raw'`. Values come from the row's editable columns (which start populated from `raw_source_data` at ingestion).
3. Date is *today* (UTC) — never in `report_data` yet
   → `source: 'live'`. Fetched from AMMP.
4. Date is before ingestion started for this user
   → `source: 'live'`. Fetched from AMMP.
5. Live fetch fails or returns no value
   → `source: 'unavailable'`. All numeric fields are `null`.

**Corollary — verified rows are immutable to the resolver.** Even if AMMP later returns a different number for that day, the resolver never overwrites what NOC signed off. Corrections happen through the NOC screen and are captured in `report_notes`.

---

## Guarantees

- **Full coverage.** For every `(site × day)` in the requested range, exactly one row is returned. No gaps, no dedupes needed by the caller.
- **Chronological order.** `series` is sorted ascending by `date`, then by `siteId`.
- **No throws.** If AMMP is unreachable, resolver returns `unavailable` rows for those days; it does not raise. Callers can render whatever they have.
- **Source honesty.** The per-row `source` always reflects where *that specific number* came from. Never lies about verified-ness.
- **Deterministic within a caching window.** Two calls with identical inputs within the caching window return the same series.

---

## Caching

| Row source | TTL | Reasoning |
|---|---|---|
| `verified` | 60 min | Verified data is stable; only invalidated when NOC corrects the row (see invalidation below). |
| `raw` | 5 min | Might be verified any moment; keep cache short so users see status flips promptly. |
| `live` | inherits from `AmmpServices.withCache` (per-endpoint) | Same cache the live dashboard uses; no new layer. |

**Cache key:** `resolver:${scopeKey(userId)}:${siteIds.sort().join(',')}:${fromISO}:${toISO}:${fields.sort().join(',')}`

**Invalidation triggers:**
- `verifyReportDays(...)` / `unverifyReportDays(...)` — invalidate resolver cache for the affected days.
- `refreshReportFromSource(...)` — invalidates the raw slice for the loaded month.
- Saving edited rows through `saveReportData(...)` — invalidates the affected month.

---

## Edge cases

| Case | Behavior |
|---|---|
| Range includes today | Today's row has `source: 'live'`; rest resolve per rules 1–5. |
| Range spans midnight in caller's TZ but not UTC | Days keyed by **UTC**. Front-end formats for display. Documented so callers do not accidentally double-count. |
| Single day range | Range from == to. One row per site. |
| Zero siteIds | Returns `{ series: [], sourceMix: { verified: 0, raw: 0, live: 0, unavailable: 0 } }`. Not an error. |
| Site not in AMMP for this user | `source: 'unavailable'` for every day. No crash. |
| Partial ingestion (some sites ingested, others not) | Per-site rows fall through the rules independently. |
| `from > to` | Throws `RangeError('from must be ≤ to')`. Programmer error, not runtime data. |
| Range > 1 year | Allowed. Callers cap if they want to. |

---

## `sourceMix` — what callers should render

The counts in `sourceMix` describe the whole result set (sum across every row). Callers turn it into a badge on their chart:

- `verified > 0 && raw === 0 && live === 0 && unavailable === 0` → green **Verified**
- `verified > 0 && (raw > 0 || live > 0)` → orange **Partially verified — X / Y days**
- `verified === 0 && (raw > 0 || live > 0)` → grey **Live data — pending verification**
- `verified + raw + live === 0` → red **No data available**

There is one badge component (`<DataSourceBadge sourceMix={...} />`) so this logic lives in one place.

---

## What this resolver is NOT for

- **Live power right now** (donut, freshness): use `AmmpServices().getAssetMostRecentData` directly. There is nothing to verify about "right now".
- **Intra-day power series** (Asset Details power chart): resolver stores per-day rollups only. Sub-day resolution comes from live.
- **Battery / genset per-device metrics**: not stored in `report_data`. Live.
- **Alerts / status logs**: live.

If you find yourself wanting resolver behavior for one of these, the fix is to extend `report_data` (or a sibling table) to store the finer-grained data, not to widen the resolver.
