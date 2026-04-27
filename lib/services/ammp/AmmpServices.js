import { parseJwt, ServiceConstants } from "@/utils/constants";

const AmmpServices = () => {
    const baseUrl = ServiceConstants.AmmpServerBaseUrl;

    const getAuthToken = async (apiKey) => {
        try {
            const accessToken = apiKey || ServiceConstants.AmmpApiKiey;

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
                const errorBody = await response.text();
                throw new Error(`Auth request failed: ${response.status} ${response.statusText} — ${errorBody}`);
            }

            const responseData = await response.json();
            const newAccessToken = responseData.access_token;

            if (!newAccessToken) {
                throw new Error(`Failed to retrieve access token. Response: ${JSON.stringify(responseData)}`);
            }

            return { access_token: newAccessToken };
        } catch (error) {
            console.error('Error in getAuthToken:', error);
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
            return response.json();
        } catch (error) {
            console.error('Error in getAssets:', error);
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
            const historicEnergies = [];
            for (const assetId of assetIds) {
                const energyData = await getHistoricAssetEnergyData(token, assetId, dateFrom, dateTo, "1d");
                historicEnergies.push(energyData);
            }
            return { historicEnergies };
        } catch (error) {
            console.error('Error in getAllHistoricEnergyData:', error);
        }
    };

    const getAllMostRecentData = async (assetIds, token) => {
        const recents = [];
        try {
            for (const assetId of assetIds) {
                const recent = await getAssetMostRecentData(assetId, token);
                if (recent) {
                    recents.push(recent);
                }
            }
            return recents;
        } catch (err) {
            console.error('Error in getAllMostRecentData:', err);
        }
    };

    const getHistoricAssetEnergyData = async (access_token, assetId, dateFrom, dateTo, interval = '1d') => {
        try {
            const formatDate = (date) => {
                const d = date instanceof Date ? date : new Date(date);
                return d.toISOString().split('.')[0] + 'Z';
            };

            const url = `${baseUrl}/v1/assets/${assetId}/historic-energy`;
            const params = `date_from=${formatDate(dateFrom)}&date_to=${formatDate(dateTo)}&interval=${interval}`;

            const response = await fetch(`${url}?${params}`, {
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
        }
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

    const fetchAndCalculateHistoricEnergyData = async (allAssets, token) => {
        try {
            const HistoricPvEnergyFromDate = new Date(Date.UTC(2021, 0, 1));
            const HistoricPvEnergyToDate = new Date();
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

    return {
        getAllHistoricEnergyData,
        getAllMostRecentData,
        getAssets,
        getAsset,
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
    };
};

export default AmmpServices;
