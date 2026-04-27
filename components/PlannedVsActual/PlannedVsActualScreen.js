'use client';

import React, { useState, useEffect, useMemo } from 'react';
import classes from './plannedvsactual.module.css';
import HomeIcon from "@/components/ui/icons/HomeIcon";
import Link from "next/link";
import CustomDateRangePicker from '../ui/dateRangePicker/CustomDateRangePicker';
import { BsDashLg } from "react-icons/bs";
import { getHistoricAsset } from '@/lib/controllers/historicalAssets/getHistoricalAsset';
import getPlannedVsActualData from '@/lib/controllers/powerProductionPlanItem/getPlannedVsActualData';
import PlannedVsActualChart from '../ui/charts/PlannedVsActualChart';
import FullScreenLoader from '@/components/LoadingSkeleton/LoadingSkeleton';
import BackButton from '@/components/ui/BackButton/BackButton';

export default function 
PlannedVsActualScreen({ assets, token }) {
  const defaultAsset = assets?.[0] ?? null;
  const [selectedAssetId, setSelectedAssetId] = useState(defaultAsset?.asset_id ?? '');
  const [siteId, setSiteId] = useState(defaultAsset?.asset_name ?? null);

  const defaultDateTo = new Date();
  const defaultDateFrom = new Date(defaultDateTo);
  defaultDateFrom.setDate(defaultDateFrom.getDate() - 10);
  const [dateFrom, setDateFrom] = useState(defaultDateFrom);
  const [dateTo, setDateTo] = useState(defaultDateTo);

  // normalized data for the chart
  const [historicPv, setHistoricPv] = useState([]);
  const [plannedData, setPlannedData] = useState([]);
  const [loading, setLoading] = useState(false);

  const thisYear = new Date().getFullYear();

  useEffect(() => {
    if (!selectedAssetId || !siteId || !dateFrom || !dateTo || !token) return;

    (async () => {
      setLoading(true);
      try {
        const fromISO = dateFrom.toISOString();
        const toISO = dateTo.toISOString();

        const historic = await getHistoricAsset({ token }, selectedAssetId, fromISO, toISO);
        const pv = historic?.pv_energy?.data ?? [];
        setHistoricPv(Array.isArray(pv) ? pv : []);

        const planned = await getPlannedVsActualData(siteId, dateFrom, dateTo);
        setPlannedData(Array.isArray(planned) ? planned : []);
      } catch (err) {
        console.error('Error fetching planned/historic:', err);
        setHistoricPv([]);
        setPlannedData([]);
      } finally {
        setLoading(false);
      }
    })();
  }, [selectedAssetId, siteId, dateFrom, dateTo, token]);

  const NO_OF_COLUMNS = 2;

  return (
    <div className={classes.content}>
      {/* Header */}
      <div className={classes.header}>
        <span>
          <Link href='/dashboard'>
            <HomeIcon />
          </Link>
        </span>
        <span> <small>| &nbsp; Planned Vs. Actual</small></span>
        <BackButton />
      </div>

      {/* Title */}
      <div className={classes.topCenter}>
        <p className={classes.title}>Planned Vs. Actual</p>
      </div>

      {/* Filters */}
      <div className={classes.topMiddle}>
        <label className={classes.eachField}>
          <span className="label-text text-lg pt-5 text-white">Site</span>
          <select
            className={classes.inputField}
            name="asset"
            required
            value={selectedAssetId ? JSON.stringify({ asset_id: selectedAssetId, asset_name: siteId }) : ''}
            onChange={(e) => {
              const { asset_id, asset_name } = JSON.parse(e.target.value);
              setSelectedAssetId(asset_id);
              setSiteId(asset_name);
            }}
          >
            <option disabled value="">Select a site</option>
            {assets.map((asset) => (
              <option
                key={asset.asset_id}
                value={JSON.stringify({ asset_id: asset.asset_id, asset_name: asset.asset_name })}
              >
                {asset.long_name}
              </option>
            ))}
          </select>
        </label>

        <div className={classes.eachField}>
          <span className="label-text text-lg pt-5 text-white">Date Range</span>
          <CustomDateRangePicker
            initialYear={thisYear}
            noOfColumns={NO_OF_COLUMNS}
            width="100%"
            onChange={(from, to) => {
              setDateFrom(from);
              setDateTo(to);
            }}
          />
        </div>
      </div>

      <div className={classes.lastUpdate}>
        <span className="label-text text-lg pt-5 text-white">
          Last Update:
          <span> {new Date().toLocaleString()}</span>
        </span>
      </div>

      {/* Chart */}
      <div className={classes.centerContent}>
        <p className={classes.details}>Planned vs Actual</p>

        {/* <div className={classes.chartDetails}>
          <span className={classes.details}><BsDashLg size={50} color={'#f87a6e'} />Planned</span>
          <span className={classes.details}><BsDashLg size={50} color={'#695bce'} />Actual</span>
        </div> */}

        <div className={classes.chartArea} style={{ width: '100%' }}>
          {loading ? (
            <FullScreenLoader />
          ) : (
            <PlannedVsActualChart
              plannedData={plannedData}
              historicPv={historicPv}
              startDate={dateFrom ? dateFrom.toISOString().slice(0, 10) : null}
              endDate={dateTo ? dateTo.toISOString().slice(0, 10) : null}
            />
          )}
        </div>
      </div>
    </div>
  );
}
