# Asset Details — Charts Reference

---

## Chart 1 — Power Sources
**Shown on:** All sites

| | |
|---|---|
| **Data source** | `GET /v1/assets/{id}/historic-power` |
| **Default view** | Today, 15-minute intervals |
| **Intervals** | 15m, 1h |

**Values displayed:**
- **PV Power** — live solar generation output
- **Consumption** — total power being used on site
- **Grid Power** — power drawn from or exported to the grid

---

## Chart 2 — Battery System
**Shown on:** Sites with a battery storage device only

| | |
|---|---|
| **Data source** | `GET /v1/assets/{id}/historic-battery-data` |
| **Default view** | Today, 15-minute intervals |
| **Intervals** | 15m, 1h |

**Values displayed:**
- **Charge Power (kW)** — rate at which the battery is charging
- **Discharge Power (kW)** — rate at which the battery is releasing energy
- **State of Charge (%)** — how full the battery is at any point (right axis, 0–100%)

---

## Chart 3 — Generator Output
**Shown on:** Sites with a generator (genset) device only

| | |
|---|---|
| **Data source** | `GET /v1/assets/{id}/historic-power` (same as Chart 1) |
| **Default view** | Today, 15-minute intervals |
| **Intervals** | 15m, 1h |

**Values displayed:**
- **Genset Power (kW)** — generator output over time

---

## Chart 4 — Performance: Expected vs Actual
**Shown on:** All sites

| | |
|---|---|
| **Data source** | `GET /v1/assets/{id}/historic-kpi-data` |
| **Default view** | Last 7 days, hourly intervals |
| **Intervals** | 1h, 1d, 1M |

**Values displayed:**
- **Actual PV Power (kW)** — what the solar panels produced
- **Expected PV Power (kW)** — what they should have produced based on weather/irradiance
- **Performance Ratio (%)** — efficiency score; healthy range is 75–85% (right axis)

---

## Site Type → Charts Shown

| Site has | Charts rendered |
|---|---|
| PV only | Chart 1, Chart 4 |
| PV + Battery | Chart 1, Chart 2, Chart 4 |
| PV + Generator | Chart 1, Chart 3, Chart 4 |
| PV + Battery + Generator | Chart 1, Chart 2 & 3 (side by side), Chart 4 |

Site type is detected automatically via `GET /v1/assets/{id}/devices`.
