import { parseJwt, ServiceConstants } from "@/utils/constants";

// export const dynamic = 'force dynamic';

const AmmpServices = () => {
    const baseUrl = ServiceConstants.AmmpServerBaseUrl;

    const getAuthToken = async (apiKey) => {
        try {
            const accessToken = apiKey || ServiceConstants.AmmpApiKiey;
            // console.log('accessToken ', accessToken);

            const url = `${baseUrl}/v1/token`;
            // console.log('url here', url)
            const headers = {
                'x-api-key': accessToken,
                'Content-Type': 'application/json',
                'Accept': 'application/json',
            };


            const response = await fetch(url, {
                cache: 'no-store',
                method: 'POST',
                headers: {
                    ...headers
                },
            });
            // console.log('response herer:', response )

            const responseData = await response.json();
            // console.log('responseData >> ', JSON.stringify(responseData));

            const newAccessToken = responseData.access_token;
            // console.log('newAccessToken >> ', newAccessToken);

            if (!newAccessToken) {
                throw new Error('Failed to retrieve access token');
            }

            // Process the expiration time from the token if needed
            const jwtToken = parseJwt(newAccessToken);
            // console.log('jwtToken ', JSON.stringify(jwtToken));
            const expirationTime = new Date(jwtToken.exp * 1000); // Assuming 'exp' is in seconds and 'parseJwt' is a function to decode JWT tokens
            // console.log('expirationTime >> ', JSON.stringify(expirationTime));
            // Set access token in cache (Assume setInCache is a function to set data in cache)
            // await setInCache(encryptedAmmpApiKey, newAccessToken, expirationTime);

            return { access_token: newAccessToken };
        } catch (error) {
            console.error('Error in getAuthToken:', error);
            return { access_token: undefined };
        }
    };

    const getAssets = async (access_token) => {
        try {
            const url = `${baseUrl}/v1/assets`;
            const response = await fetch(url, {
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
            const url = `${baseUrl}/v1/assets/${assetId}`;
            const response = await fetch(url, {
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
        // console.log('<<<<<inside getAllHistoricEnergyData>>>>>');
        // console.log('token:', token);
        // console.log('assetIds: >>', assetIds);
        // console.log('dateFrom: >>', dateFrom);
        // console.log('dateTo: >>', dateTo);

        try {
            const historicEnergies = [];

            for (const assetId of assetIds) {
                // console.log('inside loop for historicEnergies');
                // console.log('assetId: >>', assetId);
                const energyData = await getHistoricAssetEnergyData(token, assetId, dateFrom, dateTo, "1d");
                // console.log('energyData for assetId', assetId, ':', JSON.stringify(energyData));
                historicEnergies.push(energyData);
            }

            /*
            const historicEnergies = await Promise.all(assetIds.map(async (assetId) => {
               return await getHistoricAssetEnergyData(token, assetId, dateFrom, dateTo, "1d");
            }));
            */

            // console.log('historicEnergies ', historicEnergies);

            // console.log('historicEnergies ', historicEnergies);
            return { historicEnergies };
        } catch (error) {
            console.error('Error in getHistoricAssetEnergyData:', error);
        }
    };

    const getAllMostRecentData = async (assetIds, token) => {
        // console.log('inside getAllMostRecentData');
        // console.log('assetIds: >>', assetIds);

        const recents = [];
        try {
            for (const assetId of assetIds) {
                // console.log('inside loop for recents');
                // console.log('assetId: >>', assetId);
                const recent = await getAssetMostRecentData(assetId, token);
                // console.log('recent data for assetId', assetId, ':', JSON.stringify(recent));
                if (recent) {
                    recents.push(recent);
                }
            }

            // console.log('filtered recents ', recents);
            return recents;
        } catch (err) {
            console.error('Error in getAllMostRecentData:', err);
        }
    };

    const getHistoricAssetEnergyData = async (access_token, assetId, dateFrom, dateTo, interval = '1d') => {
        // console.log('<<inside getHistoricAssetEnergyData>>>');
        // console.log('access_token: >>', access_token);
        // console.log('assetId: >>', assetId);
        // console.log('dateFrom: >>', dateFrom);
        // console.log('dateTo: >>', dateTo);
        try {

            const formatDate = (date) => {
                const d = date instanceof Date ? date : new Date(date);
                return d.toISOString().split('.')[0] + 'Z';
            };

            const url = `${baseUrl}/v1/assets/${assetId}/historic-energy`;
            const formattedDateFrom = formatDate(dateFrom);
            const formattedDateTo = formatDate(dateTo);
            const params = `date_from=${formattedDateFrom}&date_to=${formattedDateTo}&interval=${interval}`;

            // console.log('url: >>', url);
            // console.log('params: >>', params);

            const response = await fetch(`${url}?${params}`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${access_token}`,
                    Accept: 'application/json',
                    'Content-Type': 'application/json',
                }
            });

            // console.log('response from getHistoricAsset Api', JSON.stringify(response));

            return response.json();
        } catch (error) {
            console.log('error in getHistoricAssetEnergyData', error);
        }
    };
    let getHistoricAssetPowerData = async (access_token, assetId, dateFrom, dateTo, interval = '1h') => {
        try {
            // console.log('inside getHistoricAssetPowerData');

            // console.log('access_token 2: ' + JSON.stringify(access_token));
            // console.log('assetId: >>', assetId);
            // console.log('dateFrom: >>', dateFrom);
            // console.log('dateTo: >>', dateTo);

            const formatDate = (date) => {
                return date.toISOString().split('.')[0] + 'Z';
            };

            const url = `${baseUrl}/v1/assets/${assetId}/historic-power`;
            const formattedDateFrom = formatDate(dateFrom);
            const formattedDateTo = formatDate(dateTo);
            const params = `date_from=${formattedDateFrom}&date_to=${formattedDateTo}&interval=${interval}`;

            // console.log('url: >>', url);
            // console.log('params: >>', params);

            const response = await fetch(`${url}?${params}`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${access_token}`,
                    Accept: 'application/json',
                    'Content-Type': 'application/json',
                }
            });

            // console.log('response', JSON.stringify(response));

            return response.json();
        } catch (error) {
            console.error('error in getHistoricAssetEnergyData');
            console.log(error);
        }
    };

    const getAssetMostRecentData = async (assetId, access_token) => {
        try {

            // console.log('access_token 3: ' + JSON.stringify(access_token));
            const url = `${baseUrl}/v1/assets/${assetId}/most-recent`;
            const response = await fetch(url, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${access_token}`,
                    Accept: 'application/json',
                    'Content-Type': 'application/json',
                }
            });
            return response.json();
        } catch (err) {
            console.error('Error in getHistoricAssetEnergyData')
        }
    };

    const calculateMostRecentTotals = (allMostRecentData) => {
        // console.log('inside calculateMostRecentTotals');
        // console.log('allMostRecentData ', JSON.stringify(allMostRecentData));

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

            const result = {
                TotalMostRecentConsumptionPower,
                TotalMostRecentGensetPower,
                TotalMostRecentPvPower,
                TotalMostRecentPowerFromGrid
            };

            // console.log('result', JSON.stringify(result, null, 2));
            return result;
        } catch (er) {
            console.error('error in getHistoricAssetEnergyData')
        }
    };

    const calculateHistoricPvEnergyTotalDays = (fromDate, toDate) => {
        return Math.ceil((toDate - fromDate) / (1000 * 60 * 60 * 24));
    };

    const fetchAndCalculateHistoricEnergyData = async (allAssets, token) => {
        // console.log('<<INSIDE fetchAndCalculateHistoricEnergyData');
        // console.log('allAssets length: ' + allAssets.length);

        try {
            // console.log('allAssets : ' + JSON.stringify(allAssets));
            const HistoricPvEnergyFromDate = new Date(Date.UTC(2021, 0, 1)); // Note: January is 0 in JS
            const HistoricPvEnergyToDate = new Date();
            const HistoricPvEnergyTotalDays = calculateHistoricPvEnergyTotalDays(HistoricPvEnergyFromDate, HistoricPvEnergyToDate);
            // console.log('HistoricPvEnergyTotalDays : ' + HistoricPvEnergyTotalDays);

            const assetIds = allAssets.map(a => a.asset_id.toString());
            // console.log('assetIds : ', assetIds);
            

            const { historicEnergies } = await getAllHistoricEnergyData(assetIds, HistoricPvEnergyFromDate, HistoricPvEnergyToDate, token);
            // console.log('historicEnergies : ' + JSON.stringify(historicEnergies));

            const allMostRecentDataTask = await getAllMostRecentData(assetIds, token);
            // console.log('allMostRecentDataTask : ' + JSON.stringify(allMostRecentDataTask));

            let TotalHistoricPvEnergy = 0;
            let TotalHistoricGridEnergy = 0;
            let TotalHistoricGensetEnergy = 0;

            historicEnergies.forEach(h => {
                if (h.pv_energy && h.pv_energy.data) {
                    // console.log('h.pv_energy >> ', JSON.stringify(h.pv_energy.data));
                    h.pv_energy.data.forEach(d => {
                        if (d.value != null) {
                            TotalHistoricPvEnergy += d.value;
                        }
                    });
                }
                if (h.energy_from_grid && h.energy_from_grid.data) {
                    // console.log('h.energy_from_grid >> ', JSON.stringify(h.energy_from_grid.data));
                    h.energy_from_grid.data.forEach(d => {
                        if (d.value != null) {
                            TotalHistoricGridEnergy += d.value;
                        }
                    });
                }
                if (h.genset_energy && h.genset_energy.data) {
                    // console.log('h.genset_energy >> ', JSON.stringify(h.genset_energy.data));
                    h.genset_energy.data.forEach(d => {
                        if (d.value != null) {
                            TotalHistoricGensetEnergy += d.value;
                        }
                    });
                }
            });
            // console.log('TotalHistoricPvEnergy >> ', TotalHistoricPvEnergy);
            // console.log('TotalHistoricGridEnergy >> ', TotalHistoricGridEnergy);
            // console.log('TotalHistoricGensetEnergy >> ', TotalHistoricGensetEnergy);

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

    // ------
    const getTodaysEnergy = async (access_token, id) => {
        console.log('inside getTodaysEnergy');

        const asset = await getAsset(access_token, id);
        if (!asset) return null;

        const mostRecentDataTask = await getAssetMostRecentData(id, access_token);
        // console.log('mostRecentDataTask in todaysPowerDataTask >> ', JSON.stringify(mostRecentDataTask));

        const now = new Date();

        const HistoricPowerFromDate = new Date(Date.UTC(2021, 0, 1));
        // console.log('HistoricPowerFromDate of mostRecentDataTask', JSON.stringify(HistoricPowerFromDate));

        const HistoricPowerEndDate = now;
        // console.log('HistoricPowerEndDate mostRecentDataTask', JSON.stringify(HistoricPowerEndDate));

        const historicEnergyDataTask = await getHistoricAssetEnergyData(
            access_token,
            id,
            HistoricPowerFromDate,
            HistoricPowerEndDate,
            '1d'
        );

        const todaysPowerData = await todaysPowerDataTask(access_token, id);

        const totalHistoricPvEnergy = historicEnergyDataTask.pv_energy?.data?.reduce((sum, entry) => sum + entry.value, 0) || 0;
        const totalHistoricGridEnergy = historicEnergyDataTask.energy_from_grid?.data?.reduce((sum, entry) => sum + entry.value, 0) || 0;
        const totalHistoricGensetEnergy = historicEnergyDataTask.genset_energy?.data?.reduce((sum, entry) => sum + entry.value, 0) || 0;
        const {
            TotalCo2Reduction,
            TotalTreesSaved,
            TotalCarDistanceSaved
        } = calculateCo2Reduction(totalHistoricPvEnergy);
        const percentageElectricityContributedBySolar = calculatePercentageElectricityContributedBySolar(historicEnergyDataTask, totalHistoricPvEnergy);

        const totalDays = calculateHistoricPvEnergyTotalDays(
            HistoricPowerFromDate,
            HistoricPowerEndDate
        );

        // Extract PercentagePowerSuppliedBySolar from the power generation calculation
        const powerGeneration = calculatePowerGeneration(mostRecentDataTask);

        const result = {
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
            totalEnergyProduced: todaysPowerData.TotalPowerGenerated * 24 / 1000, // Assuming total energy produced over a day in kWh
            energyFromSolar: totalHistoricPvEnergy / 1000, // Convert to kWh
            energyFromGrid: totalHistoricGridEnergy / 1000, // Convert to kWh
            energyFromGenerator: totalHistoricGensetEnergy / 1000, // Convert to kWh
            totalDays: totalDays,
            PercentagePowerSuppliedBySolar: powerGeneration.PercentagePowerSuppliedBySolar // Add the new parameter here
        };

        return result;
    }
    // ------


    const setTodayFields = (TodayPowerData) => {
        if (!TodayPowerData) return;

        let TodayPvPower = 0;
        let TodayGensetPower = 0;
        let TodayPowerFromGrid = 0;

        // Check and sum pv_power values
        if (TodayPowerData.pv_power?.data?.length) {
            console.log('inside TodayPowerData.pv_power', TodayPowerData.pv_power);
            TodayPowerData.pv_power.data.forEach(entry => {
                TodayPvPower += entry.value;
            });
        }

        // Check and sum genset_power values
        if (TodayPowerData.genset_power?.data?.length) {
            TodayPowerData.genset_power.data.forEach(entry => {
                TodayGensetPower += entry.value;
            });
        }

        // Check and sum external_power values
        if (TodayPowerData.external_power?.data?.length) {
            TodayPowerData.external_power.data.forEach(entry => {
                TodayPowerFromGrid += entry.value;
            });
        } else if (TodayPowerData.power_from_grid?.data?.length) {
            TodayPowerData.power_from_grid.data.forEach(entry => {
                TodayPowerFromGrid += entry.value;
            });
        }

        return {
            TodayPvPower,
            TodayGensetPower,
            TodayPowerFromGrid,
        };

    };

    const calculateCo2Reduction = (TotalHistoricPvEnergy) => {
        // console.log('inside calculateCo2Reduction');
        // console.log('TotalHistoricPvEnergy >> ', JSON.stringify(TotalHistoricPvEnergy));

        const TotalCo2Reduction = TotalHistoricPvEnergy / 1000 * 0.5543;
        // console.log('TotalCo2Reduction >> ', JSON.stringify(TotalCo2Reduction));

        const TotalTreesSaved = Math.floor(TotalCo2Reduction / 38.85);
        // console.log('TotalTreesSaved >> ', JSON.stringify(TotalTreesSaved));

        const TotalCarDistanceSaved = TotalCo2Reduction / 0.15;
        // console.log('TotalCarDistance >> ', JSON.stringify(TotalCarDistanceSaved));

        return {
            TotalCo2Reduction,
            TotalTreesSaved,
            TotalCarDistanceSaved
        };
    };

    const todaysPowerDataTask = async (access_token, id) => {
        console.log('inside todaysPowerDataTask');

        let HistoricEnergyData = 0;
        let TodayPowerData = 0;
        let TotalHistoricPvEnergy = 0;

        const now = new Date();
        const HistoricPowerFromDate = new Date(Date.UTC(2021, 0, 1));
        const HistoricPowerToDate = now;
        // console.log('HistoricPowerFromDate in todaysPowerDataTask >> ', JSON.stringify(HistoricPowerFromDate));
        // console.log('HistoricPowerToDate in todaysPowerDataTask >> ', JSON.stringify(HistoricPowerToDate));

        const historicEnergyDataTask = await getHistoricAssetEnergyData(
            access_token,
            id,
            HistoricPowerFromDate,
            HistoricPowerToDate,
            '1d'
        );

        const mostRecentDataTask = await getAssetMostRecentData(id, access_token);

        const HistoricAPowerFromDate = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
        const HistoricAPowerEndDate = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate() + 1) - 1);

        const todayPowerData = await getHistoricAssetPowerData(
            access_token,
            id,
            HistoricAPowerFromDate,
            new Date(HistoricAPowerEndDate),
            '1h',
        )

        const [
            mostRecentData,
            historicEnergyData,
        ] = await Promise.all([
            mostRecentDataTask,
            historicEnergyDataTask,
        ]);

        // console.log('mostRecentData', JSON.stringify(mostRecentData));
        // console.log('todayPowerData', JSON.stringify(todayPowerData));

        HistoricEnergyData = historicEnergyData;

        const powerGeneration = calculatePowerGeneration(mostRecentData);
        const todayFields = setTodayFields(todayPowerData);

        // console.log('powerGeneration >> ', JSON.stringify(powerGeneration));
        // console.log('todayFields >> ', JSON.stringify(todayFields));

        if (HistoricEnergyData.pv_energy?.data?.length) {
            HistoricEnergyData.pv_energy.data.forEach(entry => {
                TotalHistoricPvEnergy += entry.value;
            });
        }

        // console.log('TotalHistoricPvEnergy', TotalHistoricPvEnergy);

        const co2Reduction = calculateCo2Reduction(TotalHistoricPvEnergy);
        const percentageElectricityContributedBySolar = calculatePercentageElectricityContributedBySolar(
            HistoricEnergyData,
            TotalHistoricPvEnergy
        );

        return {
            ...powerGeneration,
            ...todayFields,
            co2Reduction,
            percentageElectricityContributedBySolar,
        };
    };

    const calculatePowerGeneration = (MostRecentData) => {
        // console.log('inside calculatePowerGeneration');

        if (!MostRecentData) return;

        let RecentSolarPower = 0;
        let RecentGensetPower = 0;
        let RecentGridPower = 0;
        let TotalPowerGenerated = 0;
        let PercentagePowerSuppliedBySolar = 0;

        if (MostRecentData.pv_power?.value != null) {
            RecentSolarPower = MostRecentData.pv_power.value;
        }

        if (MostRecentData.genset_power?.value != null) {
            RecentGensetPower = MostRecentData.genset_power.value;
        }

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

        return {
            RecentSolarPower,
            RecentGensetPower,
            RecentGridPower,
            TotalPowerGenerated,
            PercentagePowerSuppliedBySolar
        };
    };

    const calculatePercentageElectricityContributedBySolar = (HistoricEnergyData, TotalHistoricPvEnergy) => {
        // console.log('inside calculatePercentageElectricityContributedBySolar');
        // console.log('TotalHistoricPvEnergy >> ', JSON.stringify(TotalHistoricPvEnergy));

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
            const url = `${baseUrl}/v1/assets/${assetId}/devices`;
            const response = await fetch(url, {
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

            const formattedDateFrom = formatDate(dateFrom);
            const formattedDateTo = formatDate(dateTo);
            const url = `${baseUrl}/v1/assets/${assetId}/status-info-log?date_from=${encodeURIComponent(formattedDateFrom)}&date_to=${encodeURIComponent(formattedDateTo)}`;

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
