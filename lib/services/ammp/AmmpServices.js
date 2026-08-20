import { parseJwt, ServiceConstants } from "@/utils/constants";
import { withCache } from "@/lib/services/cache/memoryCache";

// Cap parallel AMMP calls so a fleet-wide render (hundreds of sites)
// doesn't burst and get rate-limited / stall the whole request tree.
const AMMP_CONCURRENCY = 10;

// A tiny concurrency-limited map. Order-preserving. Individual failures
// return `null` in that slot (never throw) so batch results stay usable.
async function mapWithConcurrency(items, limit, fn) {
    const results = new Array(items.length);
    let cursor = 0;
    async function worker() {
        while (true) {
            const i = cursor++;
            if (i >= items.length) return;
            try {
                results[i] = await fn(items[i], i);
            } catch {
                results[i] = null;
            }
        }
    }
    await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
    return results;
}

const AmmpServices = () => {
    const baseUrl = ServiceConstants.AmmpServerBaseUrl;

    const getAuthToken = async (apiKey) => {
        try {
            const accessToken = apiKey || ServiceConstants.AmmpApiKey;
            const response = await fetch(`${baseUrl}/v1/token`, {
                cache: 'no-store',
                method: 'POST',
                headers: {
                    'x-api-key': accessToken,
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                },
            });

            if (!response.ok) {
                return { access_token: undefined };
            }

            const responseData = await response.json();
            const newAccessToken = responseData.access_token;

            if (!newAccessToken) {
                return { access_token: undefined };
            }

            return { access_token: newAccessToken };
        } catch {
            return { access_token: undefined };
        }
    };

    const getAssets = async (access_token) => {
        try {
            const response = await fetch(`${baseUrl}/v1/assets`, {
                cache: 'no-store',
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${access_token}`,
                    Accept: 'application/json',
                    'Content-Type': 'application/json',
                }
            });
            // Explicit status check — an HTTP failure would otherwise slide
            // through `response.json()` as an error body and downstream code
            // would silently treat it as "zero assets".
            if (!response.ok) {
                const body = await response.text().catch(() => '');
                console.error(`AmmpServices.getAssets: ${response.status} ${response.statusText}`, body.slice(0, 500));
                return [];
            }
            const data = await response.json();
            // AMMP has historically returned either a bare array or a
            // `{ assets: [...] }` envelope. Tolerate both so a shape change
            // doesn't empty every asset picker in the app.
            if (Array.isArray(data)) return data;
            if (Array.isArray(data?.assets)) return data.assets;
            console.warn('AmmpServices.getAssets: unexpected response shape', typeof data, Object.keys(data || {}).slice(0, 8));
            return [];
        } catch (error) {
            console.error('Error in getAssets:', error);
            return [];
        }
    };

    const getAsset = async (access_token, assetId) => {
        try {
            const response = await fetch(`${baseUrl}/v1/assets/${assetId}`, {
                cache: 'no-store',
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${access_token}`,
                    Accept: 'application/json',
                    'Content-Type': 'application/json',
                }
            });
            return response.json();
        } catch (e) {
            console.error('Error in getAsset:', e);
        }
    };

    const getAllHistoricEnergyData = async (assetIds, dateFrom, dateTo, token) => {
        try {
            const values = await mapWithConcurrency(assetIds, AMMP_CONCURRENCY, (id) =>
                getHistoricAssetEnergyData(token, id, dateFrom, dateTo, '1d')
            );
            return { historicEnergies: values.filter(Boolean) };
        } catch (error) {
            console.error('Error in getAllHistoricEnergyData:', error);
            return { historicEnergies: [] };
        }
    };

    const getAllMostRecentData = async (assetIds, token) => {
        try {
            const values = await mapWithConcurrency(assetIds, AMMP_CONCURRENCY, (id) =>
                getAssetMostRecentData(id, token)
            );
            return values.filter(Boolean);
        } catch (err) {
            console.error('Error in getAllMostRecentData:', err);
            return [];
        }
    };

    const getHistoricAssetEnergyData = async (access_token, assetId, dateFrom, dateTo, interval = '1d') => {
        const formatDate = (date) => {
            const d = date instanceof Date ? date : new Date(date);
            return d.toISOString().split('.')[0] + 'Z';
        };
        const fromIso = formatDate(dateFrom);
        const toIso = formatDate(dateTo);
        const url = `${baseUrl}/v1/assets/${assetId}/historic-energy?date_from=${fromIso}&date_to=${toIso}&interval=${interval}`;

        // Cache per (asset, range, interval). Callers snap `dateTo` to an
        // hour/day boundary so the same window produces the same key —
        // otherwise a fresh `new Date()` on every render would defeat the
        // cache. 6h TTL is generous for `1d` aggregates.
        return withCache(
            `historic-energy:${assetId}:${fromIso}:${toIso}:${interval}`,
            6 * 60 * 60 * 1000,
            async () => {
                try {
                    const response = await fetch(url, {
                        method: 'GET',
                        headers: {
                            'Authorization': `Bearer ${access_token}`,
                            Accept: 'application/json',
                            'Content-Type': 'application/json',
                        }
                    });
                    return response.json();
                } catch (error) {
                    console.error('Error in getHistoricAssetEnergyData:', error);
                    return {};
                }
            }
        );
    };

    let getHistoricAssetPowerData = async (access_token, assetId, dateFrom, dateTo, interval = '1h') => {
        try {
            const formatDate = (date) => {
                return date.toISOString().split('.')[0] + 'Z';
            };

            const url = `${baseUrl}/v1/assets/${assetId}/historic-power`;
            const params = `date_from=${formatDate(dateFrom)}&date_to=${formatDate(dateTo)}&interval=${interval}`;

            const response = await fetch(`${url}?${params}`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${access_token}`,
                    Accept: 'application/json',
                    'Content-Type': 'application/json',
                }
            });

            if (!response.ok) {
                const body = await response.text();
                console.error(`getHistoricAssetPowerData failed: ${response.status} ${response.statusText} — ${body}`);
                return null;
            }

            return response.json();
        } catch (error) {
            console.error('getHistoricAssetPowerData error:', error);
            return null;
        }
    };

    const getAssetMostRecentData = async (assetId, access_token) => {
        try {
            const response = await fetch(`${baseUrl}/v1/assets/${assetId}/most-recent`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${access_token}`,
                    Accept: 'application/json',
                    'Content-Type': 'application/json',
                }
            });
            return response.json();
        } catch (err) {
            console.error('Error in getAssetMostRecentData:', err);
        }
    };

    const calculateMostRecentTotals = (allMostRecentData) => {
        try {
            let TotalMostRecentConsumptionPower = 0;
            let TotalMostRecentGensetPower = 0;
            let TotalMostRecentPvPower = 0;
            let TotalMostRecentPowerFromGrid = 0;

            allMostRecentData.forEach(mostRecentData => {
                if (mostRecentData.consumption_power && mostRecentData.consumption_power.value) {
                    TotalMostRecentConsumptionPower += mostRecentData.consumption_power.value;
                }
                if (mostRecentData.genset_power && mostRecentData.genset_power.value) {
                    TotalMostRecentGensetPower += mostRecentData.genset_power.value;
                }
                if (mostRecentData.pv_power && mostRecentData.pv_power.value) {
                    TotalMostRecentPvPower += mostRecentData.pv_power.value;
                }
                if (mostRecentData.external_power && mostRecentData.external_power.value) {
                    TotalMostRecentPowerFromGrid += mostRecentData.external_power.value;
                } else if (mostRecentData.power_from_grid && mostRecentData.power_from_grid.value) {
                    TotalMostRecentPowerFromGrid += mostRecentData.power_from_grid.value;
                }
            });

            return {
                TotalMostRecentConsumptionPower,
                TotalMostRecentGensetPower,
                TotalMostRecentPvPower,
                TotalMostRecentPowerFromGrid
            };
        } catch (er) {
            console.error('Error in calculateMostRecentTotals:', er);
        }
    };

    const calculateHistoricPvEnergyTotalDays = (fromDate, toDate) => {
        return Math.ceil((toDate - fromDate) / (1000 * 60 * 60 * 24));
    };

    // Historic-only calculation — the KPI cards depend on this. Split out
    // so it can be awaited independently of the live power donut. Streams
    // in on its own Suspense boundary on the Dashboard.
    const fetchHistoricTotalsOnly = async (allAssets, token) => {
        try {
            const from = new Date(Date.UTC(2021, 0, 1));
            const now = new Date();
            // Snap `to` to the start of the current UTC hour for cache stability.
            const to = new Date(Date.UTC(
                now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), now.getUTCHours()
            ));
            const HistoricPvEnergyTotalDays = calculateHistoricPvEnergyTotalDays(from, to);
            const assetIds = allAssets.map((a) => a.asset_id.toString());
            const { historicEnergies } = await getAllHistoricEnergyData(assetIds, from, to, token);

            let TotalHistoricPvEnergy = 0;
            let TotalHistoricGridEnergy = 0;
            let TotalHistoricGensetEnergy = 0;
            (historicEnergies || []).forEach((h) => {
                if (h?.pv_energy?.data) h.pv_energy.data.forEach((d) => { if (d.value != null) TotalHistoricPvEnergy += d.value; });
                if (h?.energy_from_grid?.data) h.energy_from_grid.data.forEach((d) => { if (d.value != null) TotalHistoricGridEnergy += d.value; });
                if (h?.genset_energy?.data) h.genset_energy.data.forEach((d) => { if (d.value != null) TotalHistoricGensetEnergy += d.value; });
            });

            const TotalCo2Reduction = TotalHistoricPvEnergy / 1000 * 0.5543;
            const TotalTreesSaved = Math.floor(TotalCo2Reduction / 38.85);
            const TotalCarDistanceSaved = TotalCo2Reduction / 0.15;
            // ~0.28 L diesel per kWh of solar produced — a typical figure for
            // the on-site gensets we displace. Estimated, not measured.
            const TotalDieselLitresAvoided = Math.round(TotalHistoricPvEnergy / 1000 * 0.28);

            return {
                HistoricPvEnergyTotalDays,
                TotalHistoricPvEnergy,
                TotalHistoricGridEnergy,
                TotalHistoricGensetEnergy,
                TotalCo2Reduction,
                TotalTreesSaved,
                TotalCarDistanceSaved,
                TotalDieselLitresAvoided,
            };
        } catch (err) {
            console.error('Error in fetchHistoricTotalsOnly:', err);
            return null;
        }
    };

    // Live-power only — the donut card. Fast, short TTL.
    const fetchLivePowerTotalsOnly = async (allAssets, token) => {
        try {
            const assetIds = allAssets.map((a) => a.asset_id.toString());
            const allMostRecent = await getAllMostRecentData(assetIds, token);
            return calculateMostRecentTotals(allMostRecent) || {};
        } catch (err) {
            console.error('Error in fetchLivePowerTotalsOnly:', err);
            return {};
        }
    };

    const fetchAndCalculateHistoricEnergyData = async (allAssets, token) => {
        try {
            const HistoricPvEnergyFromDate = new Date(Date.UTC(2021, 0, 1));
            // Snap `to` to the start of the current UTC hour so repeated
            // dashboard loads within the hour share one cache key — a raw
            // `new Date()` would produce a unique key every render.
            const now = new Date();
            const HistoricPvEnergyToDate = new Date(Date.UTC(
                now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), now.getUTCHours()
            ));
            const HistoricPvEnergyTotalDays = calculateHistoricPvEnergyTotalDays(HistoricPvEnergyFromDate, HistoricPvEnergyToDate);

            const assetIds = allAssets.map(a => a.asset_id.toString());

            const { historicEnergies } = await getAllHistoricEnergyData(assetIds, HistoricPvEnergyFromDate, HistoricPvEnergyToDate, token);
            const allMostRecentDataTask = await getAllMostRecentData(assetIds, token);

            let TotalHistoricPvEnergy = 0;
            let TotalHistoricGridEnergy = 0;
            let TotalHistoricGensetEnergy = 0;

            historicEnergies.forEach(h => {
                if (h.pv_energy && h.pv_energy.data) {
                    h.pv_energy.data.forEach(d => {
                        if (d.value != null) TotalHistoricPvEnergy += d.value;
                    });
                }
                if (h.energy_from_grid && h.energy_from_grid.data) {
                    h.energy_from_grid.data.forEach(d => {
                        if (d.value != null) TotalHistoricGridEnergy += d.value;
                    });
                }
                if (h.genset_energy && h.genset_energy.data) {
                    h.genset_energy.data.forEach(d => {
                        if (d.value != null) TotalHistoricGensetEnergy += d.value;
                    });
                }
            });

            const TotalCo2Reduction = TotalHistoricPvEnergy / 1000 * 0.5543;
            const TotalTreesSaved = Math.floor(TotalCo2Reduction / 38.85);
            const TotalCarDistanceSaved = TotalCo2Reduction / 0.15;

            const mostRecentTotals = calculateMostRecentTotals(allMostRecentDataTask);

            return {
                HistoricPvEnergyTotalDays,
                TotalHistoricPvEnergy,
                TotalHistoricGridEnergy,
                TotalHistoricGensetEnergy,
                TotalCo2Reduction,
                TotalTreesSaved,
                TotalCarDistanceSaved,
                ...mostRecentTotals
            };
        } catch (err) {
            console.error('Error in fetchAndCalculateHistoricEnergyData:', err);
        }
    };

    const getTodaysEnergy = async (access_token, id) => {
        const asset = await getAsset(access_token, id);
        if (!asset) return null;

        const mostRecentDataTask = await getAssetMostRecentData(id, access_token);

        const now = new Date();
        const HistoricPowerFromDate = new Date(Date.UTC(2021, 0, 1));
        const HistoricPowerEndDate = now;

        const historicEnergyDataTask = await getHistoricAssetEnergyData(
            access_token, id, HistoricPowerFromDate, HistoricPowerEndDate, '1d'
        );

        const todaysPowerData = await todaysPowerDataTask(access_token, id);

        const totalHistoricPvEnergy = historicEnergyDataTask.pv_energy?.data?.reduce((sum, entry) => sum + entry.value, 0) || 0;
        const totalHistoricGridEnergy = historicEnergyDataTask.energy_from_grid?.data?.reduce((sum, entry) => sum + entry.value, 0) || 0;
        const totalHistoricGensetEnergy = historicEnergyDataTask.genset_energy?.data?.reduce((sum, entry) => sum + entry.value, 0) || 0;
        const { TotalCo2Reduction, TotalTreesSaved, TotalCarDistanceSaved } = calculateCo2Reduction(totalHistoricPvEnergy);
        const percentageElectricityContributedBySolar = calculatePercentageElectricityContributedBySolar(historicEnergyDataTask, totalHistoricPvEnergy);
        const totalDays = calculateHistoricPvEnergyTotalDays(HistoricPowerFromDate, HistoricPowerEndDate);
        const powerGeneration = calculatePowerGeneration(mostRecentDataTask);

        return {
            consumption_energy_today: mostRecentDataTask.consumption_energy_today?.value || 0,
            pv_energy_today: mostRecentDataTask.pv_energy_today?.value || 0,
            genset_energy_today: mostRecentDataTask.genset_energy_today?.value || 0,
            energy_from_grid_today: mostRecentDataTask.energy_from_grid_today?.value || 0,
            energy_to_grid_today: mostRecentDataTask.energy_to_grid_today?.value || 0,
            totalHistoricPvEnergy,
            totalCo2Reduction: TotalCo2Reduction,
            totalTreesSaved: TotalTreesSaved,
            totalCarDistanceSaved: TotalCarDistanceSaved,
            percentElectricity: percentageElectricityContributedBySolar,
            totalPowerGenerated: todaysPowerData.TotalPowerGenerated,
            powerFromGenerator: todaysPowerData.RecentGensetPower,
            powerFromSolar: todaysPowerData.RecentSolarPower,
            powerFromGrid: todaysPowerData.RecentGridPower,
            totalEnergyProduced: todaysPowerData.TotalPowerGenerated * 24 / 1000,
            energyFromSolar: totalHistoricPvEnergy / 1000,
            energyFromGrid: totalHistoricGridEnergy / 1000,
            energyFromGenerator: totalHistoricGensetEnergy / 1000,
            totalDays,
            PercentagePowerSuppliedBySolar: powerGeneration.PercentagePowerSuppliedBySolar
        };
    };

    const setTodayFields = (TodayPowerData) => {
        if (!TodayPowerData) return;

        let TodayPvPower = 0;
        let TodayGensetPower = 0;
        let TodayPowerFromGrid = 0;

        if (TodayPowerData.pv_power?.data?.length) {
            TodayPowerData.pv_power.data.forEach(entry => {
                TodayPvPower += entry.value;
            });
        }
        if (TodayPowerData.genset_power?.data?.length) {
            TodayPowerData.genset_power.data.forEach(entry => {
                TodayGensetPower += entry.value;
            });
        }
        if (TodayPowerData.external_power?.data?.length) {
            TodayPowerData.external_power.data.forEach(entry => {
                TodayPowerFromGrid += entry.value;
            });
        } else if (TodayPowerData.power_from_grid?.data?.length) {
            TodayPowerData.power_from_grid.data.forEach(entry => {
                TodayPowerFromGrid += entry.value;
            });
        }

        return { TodayPvPower, TodayGensetPower, TodayPowerFromGrid };
    };

    const calculateCo2Reduction = (TotalHistoricPvEnergy) => {
        const TotalCo2Reduction = TotalHistoricPvEnergy / 1000 * 0.5543;
        const TotalTreesSaved = Math.floor(TotalCo2Reduction / 38.85);
        const TotalCarDistanceSaved = TotalCo2Reduction / 0.15;
        return { TotalCo2Reduction, TotalTreesSaved, TotalCarDistanceSaved };
    };

    const todaysPowerDataTask = async (access_token, id) => {
        let TotalHistoricPvEnergy = 0;

        const now = new Date();
        const HistoricPowerFromDate = new Date(Date.UTC(2021, 0, 1));
        const HistoricPowerToDate = now;

        const historicEnergyDataTask = await getHistoricAssetEnergyData(
            access_token, id, HistoricPowerFromDate, HistoricPowerToDate, '1d'
        );
        const mostRecentDataTask = await getAssetMostRecentData(id, access_token);

        const HistoricAPowerFromDate = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
        const HistoricAPowerEndDate = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate() + 1) - 1);

        const todayPowerData = await getHistoricAssetPowerData(
            access_token, id, HistoricAPowerFromDate, new Date(HistoricAPowerEndDate), '1h'
        );

        const [mostRecentData, historicEnergyData] = await Promise.all([
            mostRecentDataTask,
            historicEnergyDataTask,
        ]);

        const powerGeneration = calculatePowerGeneration(mostRecentData);
        const todayFields = setTodayFields(todayPowerData);

        if (historicEnergyData.pv_energy?.data?.length) {
            historicEnergyData.pv_energy.data.forEach(entry => {
                TotalHistoricPvEnergy += entry.value;
            });
        }

        const co2Reduction = calculateCo2Reduction(TotalHistoricPvEnergy);
        const percentageElectricityContributedBySolar = calculatePercentageElectricityContributedBySolar(
            historicEnergyData, TotalHistoricPvEnergy
        );

        return {
            ...powerGeneration,
            ...todayFields,
            co2Reduction,
            percentageElectricityContributedBySolar,
        };
    };

    const calculatePowerGeneration = (MostRecentData) => {
        if (!MostRecentData) return;

        let RecentSolarPower = 0;
        let RecentGensetPower = 0;
        let RecentGridPower = 0;
        let TotalPowerGenerated = 0;
        let PercentagePowerSuppliedBySolar = 0;

        if (MostRecentData.pv_power?.value != null) RecentSolarPower = MostRecentData.pv_power.value;
        if (MostRecentData.genset_power?.value != null) RecentGensetPower = MostRecentData.genset_power.value;

        if (MostRecentData.external_power?.value != null) {
            RecentGridPower = MostRecentData.external_power.value;
        } else if (MostRecentData.power_from_grid?.value != null) {
            RecentGridPower = MostRecentData.power_from_grid.value;
        }

        if (MostRecentData.consumption_power?.value != null) {
            TotalPowerGenerated = MostRecentData.consumption_power.value;
        } else {
            TotalPowerGenerated = RecentSolarPower + RecentGensetPower + RecentGridPower;
        }

        if (TotalPowerGenerated > 0) {
            PercentagePowerSuppliedBySolar = RecentSolarPower / TotalPowerGenerated * 100;
        }

        return { RecentSolarPower, RecentGensetPower, RecentGridPower, TotalPowerGenerated, PercentagePowerSuppliedBySolar };
    };

    const calculatePercentageElectricityContributedBySolar = (HistoricEnergyData, TotalHistoricPvEnergy) => {
        let PercentageElectricityContributedBySolar = 0;
        if (!HistoricEnergyData) return PercentageElectricityContributedBySolar;

        const totalSolarProduction = TotalHistoricPvEnergy;
        let totalConsumption = 0;

        if (HistoricEnergyData.consumption_energy?.data?.length) {
            HistoricEnergyData.consumption_energy.data.forEach(entry => {
                totalConsumption += entry.value;
            });
        }

        if (totalConsumption <= 0) {
            totalConsumption += totalSolarProduction;

            if (HistoricEnergyData.genset_energy?.data?.length) {
                HistoricEnergyData.genset_energy.data.forEach(entry => {
                    totalConsumption += entry.value;
                });
            }

            if (HistoricEnergyData.external_energy?.data?.length) {
                HistoricEnergyData.external_energy.data.forEach(entry => {
                    totalConsumption += entry.value;
                });
            } else if (HistoricEnergyData.energy_from_grid?.data?.length) {
                HistoricEnergyData.energy_from_grid.data.forEach(entry => {
                    totalConsumption += entry.value;
                });
            }
        }

        if (totalConsumption > 0) {
            PercentageElectricityContributedBySolar = totalSolarProduction / totalConsumption * 100;
        }

        return PercentageElectricityContributedBySolar;
    };

    // Asset-group endpoints. AMMP models a "customer" as an asset-group
    // whose name follows `[Customer] <company_name>` convention. Both the
    // Customer-Mapping admin page and the nightly `sync_asset_groups` cron
    // depend on these two helpers.
    const getAssetGroups = async (access_token) => {
        try {
            const response = await fetch(`${baseUrl}/v1/asset_groups`, {
                cache: 'no-store',
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${access_token}`,
                    Accept: 'application/json',
                    'Content-Type': 'application/json',
                },
            });
            if (!response.ok) return [];
            const data = await response.json();
            return Array.isArray(data) ? data : [];
        } catch (error) {
            console.error('Error in getAssetGroups:', error);
            return [];
        }
    };

    // Returns a flat array of asset IDs belonging to `groupId`. AMMP's
    // response shape is `{ group_id, group_name, members: [{ id, ... }] }`
    // — tolerate a raw array too in case the API shape shifts.
    const getAssetGroupMembers = async (access_token, groupId) => {
        try {
            const response = await fetch(`${baseUrl}/v1/asset_groups/${groupId}/members`, {
                cache: 'no-store',
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${access_token}`,
                    Accept: 'application/json',
                    'Content-Type': 'application/json',
                },
            });
            if (!response.ok) return [];
            const body = await response.json();
            const members = Array.isArray(body?.members)
                ? body.members
                : Array.isArray(body)
                    ? body
                    : [];
            return members
                .map((m) => m?.asset_id ?? m?.id)
                .filter((id) => id != null);
        } catch (error) {
            console.error('Error in getAssetGroupMembers:', error);
            return [];
        }
    };

    const getAssetDevices = async (access_token, assetId) => {
        try {
            const response = await fetch(`${baseUrl}/v1/assets/${assetId}/devices`, {
                cache: 'no-store',
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${access_token}`,
                    Accept: 'application/json',
                    'Content-Type': 'application/json',
                }
            });
            return response.json();
        } catch (error) {
            console.error('Error in getAssetDevices:', error);
            return [];
        }
    };

    const getHistoricBatteryData = async (access_token, assetId, dateFrom, dateTo, interval = '15m') => {
        try {
            const formatDate = (date) => {
                const d = date instanceof Date ? date : new Date(date);
                return d.toISOString().split('.')[0] + 'Z';
            };
            const url = `${baseUrl}/v1/assets/${assetId}/historic-battery-data`;
            const params = `date_from=${formatDate(dateFrom)}&date_to=${formatDate(dateTo)}&interval=${interval}`;
            const response = await fetch(`${url}?${params}`, {
                cache: 'no-store',
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${access_token}`,
                    Accept: 'application/json',
                    'Content-Type': 'application/json',
                }
            });
            if (!response.ok) {
                const body = await response.text();
                console.error(`getHistoricBatteryData failed: ${response.status} ${response.statusText} — ${body}`);
                return null;
            }
            return response.json();
        } catch (error) {
            console.error('Error in getHistoricBatteryData:', error);
            return null;
        }
    };

    const getHistoricKpiData = async (access_token, assetId, dateFrom, dateTo, interval = '1h') => {
        try {
            const formatDate = (date) => {
                const d = date instanceof Date ? date : new Date(date);
                return d.toISOString().split('.')[0] + 'Z';
            };
            const url = `${baseUrl}/v1/assets/${assetId}/historic-kpi-data`;
            const params = `date_from=${formatDate(dateFrom)}&date_to=${formatDate(dateTo)}&interval=${interval}`;
            const response = await fetch(`${url}?${params}`, {
                cache: 'no-store',
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${access_token}`,
                    Accept: 'application/json',
                    'Content-Type': 'application/json',
                }
            });
            if (!response.ok) {
                const body = await response.text();
                console.error(`getHistoricKpiData failed: ${response.status} ${response.statusText} — ${body}`);
                return null;
            }
            return response.json();
        } catch (error) {
            console.error('Error in getHistoricKpiData:', error);
            return null;
        }
    };

    const getAssetStatusInfoLog = async (access_token, assetId, dateFrom, dateTo) => {
        try {
            const formatDate = (date) => {
                const d = date instanceof Date ? date : new Date(date);
                return d.toISOString().split('.')[0] + 'Z';
            };
            const url = `${baseUrl}/v1/assets/${assetId}/status-info-log?date_from=${encodeURIComponent(formatDate(dateFrom))}&date_to=${encodeURIComponent(formatDate(dateTo))}`;
            const response = await fetch(url, {
                cache: 'no-store',
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${access_token}`,
                    Accept: 'application/json',
                    'Content-Type': 'application/json',
                },
            });
            const data = await response.json();
            return Array.isArray(data) ? data : (data.alerts || []);
        } catch (error) {
            console.error('Error in getAssetStatusInfoLog:', error);
            return [];
        }
    };

    // Returns the ISO timestamp of the site's most recent telemetry, or null
    // if AMMP doesn't have it. Hits /v1/assets/{id}/last-data-received which
    // is much cheaper than the full most-recent payload.
    //
    // Wrapped in a 3-second AbortController — Node's default fetch timeout
    // is 10s, and this endpoint is fanned out across up to 40 sites for the
    // notifications bell. If AMMP is slow or unreachable, a 10s-per-site
    // wait blocks the whole notification summary for tens of seconds. Better
    // to fail fast and show "no offline data" than to hang the bell.
    const getLastDataReceived = async (access_token, assetId) => {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 3000);
        try {
            const response = await fetch(`${baseUrl}/v1/assets/${assetId}/last-data-received`, {
                cache: 'no-store',
                method: 'GET',
                signal: controller.signal,
                headers: {
                    'Authorization': `Bearer ${access_token}`,
                    Accept: 'application/json',
                },
            });
            if (!response.ok) return null;
            const data = await response.json();
            return data?.last_data_received || null;
        } catch (error) {
            // AbortError / ConnectTimeoutError are expected when AMMP is slow;
            // log at debug level so the console isn't spammed on every bell tick.
            if (error?.name === 'AbortError' || error?.cause?.code === 'UND_ERR_CONNECT_TIMEOUT') {
                return null;
            }
            console.error('Error in getLastDataReceived:', error?.message || error);
            return null;
        } finally {
            clearTimeout(timeoutId);
        }
    };

    // Small helper for the KPI endpoints below — they all take the same
    // date_from/date_to/interval query params.
    const buildKpiUrl = (assetId, path, dateFrom, dateTo, interval = '1d') => {
        const fmt = (d) => (d instanceof Date ? d : new Date(d)).toISOString().split('.')[0] + 'Z';
        return `${baseUrl}/v1/assets/${assetId}/${path}?date_from=${fmt(dateFrom)}&date_to=${fmt(dateTo)}&interval=${interval}`;
    };

    const fetchKpi = async (access_token, url) => {
        try {
            const response = await fetch(url, {
                cache: 'no-store',
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${access_token}`,
                    Accept: 'application/json',
                },
            });
            if (!response.ok) return null;
            return await response.json();
        } catch (err) {
            console.error('fetchKpi error', url, err);
            return null;
        }
    };

    // Returns AMMP's verified environmental-impact numbers for a site over
    // the given window. Reshapes the response into `{ co2AvoidedKg, energyKwh, raw }`
    // — SolarImpactBlock reads `co2AvoidedKg`; anything else needing the raw
    // series can read `raw.data`. Returns null when the endpoint has no data.
    const getEnvironmentalImpact = async (access_token, assetId, dateFrom, dateTo, interval = '1d') => {
        const url = buildKpiUrl(assetId, 'commercial-kpis/environmental-impact', dateFrom, dateTo, interval);
        const body = await fetchKpi(access_token, url);
        if (!body) return null;
        const co2Series = body?.data?.co2_offset?.data;
        const energySeries = body?.data?.pv_energy?.data;
        const sum = (arr) => Array.isArray(arr)
            ? arr.reduce((n, p) => n + (typeof p?.value === 'number' ? p.value : 0), 0)
            : 0;
        const co2AvoidedKg = Array.isArray(co2Series) && co2Series.length > 0
            ? sum(co2Series)
            : null;
        const energyKwh = Array.isArray(energySeries) && energySeries.length > 0
            ? sum(energySeries)
            : null;
        return { co2AvoidedKg, energyKwh, raw: body };
    };

    // Bulk variant used by fleet/comparison views. Returns an array of
    // { asset_id, last_received } objects — one entry per input id. Failed
    // per-site fetches surface as null timestamps rather than sinking the batch.
    const getAllLastDataReceived = async (assetIds, access_token) => {
        if (!Array.isArray(assetIds) || assetIds.length === 0) return [];
        const results = await mapWithConcurrency(assetIds, AMMP_CONCURRENCY, async (id) => {
            const ts = await getLastDataReceived(access_token, id);
            return { asset_id: String(id), last_received: ts };
        });
        return results.filter(Boolean);
    };

    return {
        getAllHistoricEnergyData,
        getAllMostRecentData,
        getAssets,
        getAsset,
        getAssetGroups,
        getAssetGroupMembers,
        getAssetDevices,
        getHistoricAssetEnergyData,
        getHistoricAssetPowerData,
        getHistoricBatteryData,
        getHistoricKpiData,
        getAssetMostRecentData,
        getAuthToken,
        fetchAndCalculateHistoricEnergyData,
        getTodaysEnergy,
        calculateCo2Reduction,
        calculatePowerGeneration,
        calculatePercentageElectricityContributedBySolar,
        setTodayFields,
        getAssetStatusInfoLog,
        getLastDataReceived,
        getAllLastDataReceived,
        getEnvironmentalImpact,
        fetchHistoricTotalsOnly,
        fetchLivePowerTotalsOnly,
    };
};

export default AmmpServices;
