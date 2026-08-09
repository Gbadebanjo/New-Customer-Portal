# Daystar Public Data API

A read-only endpoint that returns verified daily solar report data for your sites — the same rows the NOC has reviewed and signed off on. Use it to feed Power BI dashboards, monthly reports, or any tool that consumes JSON.

Base URL (staging shown; ask Daystar for the production URL):
```
https://portal.daystarpower.com/api/public
```

---

## Authentication

Every request must include an API key issued by Daystar:

```
x-daystar-api-key: <your-key>
```

Revoked or unknown keys return `401 Unauthorized`. To request a key, contact your Daystar account manager.

### Key scopes

Keys come in two flavours:

- **Customer-scoped** — the default for external customers. The key can only see one customer's rows. Any `customerId` query parameter you pass is ignored.
- **Fleet-wide** — issued to Daystar internal apps. The key can see every customer's rows. Optionally scope a single request to one customer by passing `?customerId=<uuid>`.

Every response tells you which scope you have via the `scope` field, so you never need to guess:

```json
{ "scope": "customer", "customerId": "a09c8be5-...", "rows": [...] }
```

---

## Endpoints

### `GET /api/public/report-data`

Returns per-day, per-site rows for the requested window.

**Query parameters**

| Name | Type | Required | Description |
|---|---|---|---|
| `from` | `YYYY-MM-DD` | ✓ | Inclusive start of the window (UTC). |
| `to`   | `YYYY-MM-DD` | ✓ | Inclusive end of the window (UTC). Max 366 days per call. |
| `siteIds` | comma-separated list | | Filter to specific site IDs. Omit to get every site the API key covers. |
| `customerId` | UUID | | Fleet-scoped keys only. Restrict the response to one customer. Ignored for customer-scoped keys (they're already restricted). |
| `status` | `verified` \| `raw` \| `all` | | Defaults to `verified`. Only `verified` rows have been reviewed by our team. |

**Response — 200 OK**

```json
{
  "scope": "customer",
  "customerId": "a09c8be5-338e-452a-bd74-d80965c18671",
  "window": { "from": "2026-07-01", "to": "2026-07-31" },
  "rows": [
    {
      "date": "2026-07-01",
      "siteId": "NBC_LAG_001",
      "customerId": "a09c8be5-338e-452a-bd74-d80965c18671",
      "solarKwh": 843.2,
      "consumptionKwh": 1120.5,
      "generatorKwh": 45.1,
      "status": "verified",
      "verifiedAt": "2026-07-02T06:14:33.000Z"
    }
  ],
  "count": 1
}
```

- `scope` is `"customer"` for customer-scoped keys, `"fleet"` for fleet-wide keys.
- `customerId` on the response envelope is the customer the response was scoped to.
- Every row carries its own `customerId` — most useful for fleet-scoped consumers merging rows across customers.

**Response — 400 Bad Request**

Returned for missing / malformed parameters or a range beyond 366 days.

```json
{ "error": "from must be ≤ to" }
```

**Response — 401 Unauthorized**

```json
{ "error": "Invalid or missing API key" }
```

---

## Example — cURL

```bash
curl -H "x-daystar-api-key: $DAYSTAR_KEY" \
  "https://portal.daystarpower.com/api/public/report-data?from=2026-07-01&to=2026-07-31&status=verified"
```

## Example — Python

```python
import os, requests
r = requests.get(
    "https://portal.daystarpower.com/api/public/report-data",
    headers={"x-daystar-api-key": os.environ["DAYSTAR_KEY"]},
    params={"from": "2026-07-01", "to": "2026-07-31", "status": "verified"},
)
r.raise_for_status()
for row in r.json()["rows"]:
    print(row["date"], row["siteId"], row["solarKwh"], "kWh")
```

## Example — Power BI

Add a Web data source, paste the URL, and put the API key in the **HTTP request header parameters** as `x-daystar-api-key`. Power BI will treat the response as a JSON document — expand the `rows` array to get a table.

---

## Rate & size limits

- Max **366 days** per request. Split larger windows into multiple calls.
- No hard rate limit today, but keep polling to a sensible cadence (once an hour is plenty — verified data doesn't change often).
- Response cap: ~10&nbsp;000 rows per call. If you need more, split by site or by date range.

---

## Data model notes

- `solarKwh`, `consumptionKwh`, `generatorKwh` are in **kilowatt-hours (kWh)**, aggregated per calendar day (UTC).
- `status: "verified"` means a Daystar operator has reviewed and signed off on the day. `status: "raw"` means we've ingested the raw provider readings but not yet reviewed them — they may change. `all` returns both.
- `verifiedAt` is populated only when `status = "verified"`.
- Days without any data are simply omitted from `rows` — do not treat missing days as zeros.

Full machine-readable spec: [openapi.yaml](openapi.yaml).
