'use server';

import AmmpServices from "../../services/ammp/AmmpServices";

export async function getHistoricAsset(token, assetId, dateFrom, dateTo) {
    const energyData = await AmmpServices()
        .getHistoricAssetEnergyData(token, assetId, dateFrom, dateTo);
    return energyData;
}