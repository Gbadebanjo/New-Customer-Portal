/**
 * Derive a normalized site type from AMMP's messy tags. In the real fleet
 * only ~20% of sites have any `tags.product` set, and even those use a mix
 * of casings/values (`PaaS`, `PaaS Battery`, `PAAS diesel with battery`,
 * `Outright Sale`, etc.). We collapse everything into one of five buckets
 * the UI can reason about.
 *
 * Buckets:
 *   - 'solar'        — pure PV site, no on-site battery telemetry, no genset
 *   - 'hybrid'       — PV + battery, or PV + genset (the common Daystar shape)
 *   - 'battery-only' — no PV (total_pv_power == null); the rare bank-ATM case
 *   - 'unknown'      — nothing distinguishing; treat as 'solar' when rendering
 *                      so we don't hide the majority of the fleet
 *
 * The returned object also exposes granular flags — hasBattery / hasGenset /
 * hasSolar — because some UI (Power Mix chart) needs individual per-series
 * decisions, not just a top-level bucket.
 */

const PRODUCT_BATTERY_RE = /battery|bess/i;
const PRODUCT_DIESEL_RE  = /diesel|genset|paas/i;
const PRODUCT_SAAS_RE    = /saas/i;

export function deriveSiteType(asset) {
    if (!asset) return { kind: 'unknown', hasSolar: false, hasBattery: false, hasGenset: false };

    const tags = asset.tags || {};
    const product = String(tags.product || '').trim();
    const battTypes = tags.batt_types;      // e.g. 'lead-acid'
    const gensetsTag = tags.gensets;        // present when there are gensets
    const numGensets = tags.number_gensets;
    const gensetVendor = tags.genset_vendor;

    const hasSolar = typeof asset.total_pv_power === 'number' && asset.total_pv_power > 0;
    const hasBattery = Boolean(battTypes) || PRODUCT_BATTERY_RE.test(product);
    const hasGenset = Boolean(gensetsTag) || Boolean(gensetVendor) || Number(numGensets) > 0 || PRODUCT_DIESEL_RE.test(product);

    let kind;
    if (!hasSolar && hasBattery)                    kind = 'battery-only';
    else if (hasSolar && (hasBattery || hasGenset)) kind = 'hybrid';
    else if (hasSolar)                              kind = 'solar';
    else                                            kind = 'unknown';

    return {
        kind,
        hasSolar,
        hasBattery,
        hasGenset,
        // Preserved so admin views can still show the raw AMMP label.
        productLabel: product || null,
        // Normalised label for customer-facing UI (never mentions the vendor).
        displayLabel: displayLabelFor(kind, product),
        isSaaS: PRODUCT_SAAS_RE.test(product),
    };
}

function displayLabelFor(kind, rawProduct) {
    // If AMMP has a clean product string, prefer it — but sanitise casing.
    if (rawProduct) {
        // Normalise "PAAS" → "PaaS", trim whitespace
        return rawProduct.replace(/PAAS/gi, 'PaaS').replace(/SAAS/gi, 'SaaS').replace(/BESS/gi, 'BESS').trim();
    }
    switch (kind) {
        case 'battery-only': return 'Battery site';
        case 'hybrid':       return 'Hybrid site';
        case 'solar':        return 'Solar site';
        default:             return 'Site';
    }
}
