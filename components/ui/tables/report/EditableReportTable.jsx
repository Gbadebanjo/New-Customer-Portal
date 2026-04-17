'use client'
import { useState, useCallback, useEffect, useRef } from 'react';
import FullScreenLoader from '@/components/LoadingSkeleton/LoadingSkeleton';
import Image from 'next/image';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import classes from './editableReportTable.module.css';
import getReportData from '@/lib/controllers/reportData/getReportData';
import saveReportData from '@/lib/controllers/reportData/saveReportData';
import getAssetsByCustomer from '@/lib/controllers/reportData/getAssetsByCustomer';

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const NUMERIC_FIELDS = [
  'total_daily_consumption',
  'total_daytime_consumption',
  'planned_daytime_consumption',
  'pv_production',
  'planned_pv_production',
  'energy_production_turbine',
  'energy_production_diesel_generator',
];

const TEXT_FIELDS = [
  'daily_daytime_solar_displacement',
  'total_solar_displacement',
  'data_capture_daytime',
  'data_capture_entire_day',
  'remarks',
];

function getDaysInMonth(month, year) {
  return new Date(year, month, 0).getDate();
}

function formatDate(day, month, year) {
  return `${day}-${MONTHS[month - 1].substring(0, 3)}-${String(year).slice(-2)}`;
}

// Column mapping from Excel headers to field names
const EXCEL_COLUMN_MAP = {
  'Total Daily Consumption (kWh)': 'total_daily_consumption',
  'Total Daytime Consumption (kWh) (7AM to 5PM)': 'total_daytime_consumption',
  'Planned Daytime Consumption (kWh) (7AM to 5PM)': 'planned_daytime_consumption',
  'PV Production (kWh)': 'pv_production',
  'Planned PV Production (kWh)': 'planned_pv_production',
  'Energy Production - Turbine (kWh)': 'energy_production_turbine',
  'Energy Production - Diesel Generator (kWh)': 'energy_production_diesel_generator',
  'Daily Day-time Solar Displacement (7AM to 5PM)': 'daily_daytime_solar_displacement',
  'Total Solar Displacement (24 hour period)': 'total_solar_displacement',
  'Data Capture period (Daytime)': 'data_capture_daytime',
  'Data Capture period (Entire Day)': 'data_capture_entire_day',
  'Remarks': 'remarks',
};

const TEMPLATE_HEADERS = ['Day', ...Object.keys(EXCEL_COLUMN_MAP)];

function createEmptyRow(day) {
  return {
    day,
    total_daily_consumption: 0,
    total_daytime_consumption: 0,
    planned_daytime_consumption: 0,
    pv_production: 0,
    planned_pv_production: 0,
    energy_production_turbine: 0,
    energy_production_diesel_generator: 0,
    daily_daytime_solar_displacement: '',
    total_solar_displacement: '',
    data_capture_daytime: '',
    data_capture_entire_day: '',
    remarks: '',
  };
}

export default function EditableReportTable({ isCustomerOnly = false, customers = [], userCustomerId = '' }) {
  const [selectedSite, setSelectedSite] = useState('');
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [plannedMonthlyKwh, setPlannedMonthlyKwh] = useState(0);
  const [rows, setRows] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [statusMsg, setStatusMsg] = useState({ text: '', type: '' });
  const [newSite, setNewSite] = useState('');
  const [showNewSiteInput, setShowNewSiteInput] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState(isCustomerOnly ? userCustomerId : '');
  const [assets, setAssets] = useState([]);
  const [loadingAssets, setLoadingAssets] = useState(false);
  const fileInputRef = useRef(null);

  // Fetch assets when customer changes (or on mount for customer-only users)
  const activeCustomerId = isCustomerOnly ? userCustomerId : selectedCustomer;
  useEffect(() => {
    if (!activeCustomerId) {
      setAssets([]);
      setSelectedSite('');
      return;
    }

    (async () => {
      setLoadingAssets(true);
      setSelectedSite('');
      try {
        const { assets: fetchedAssets } = await getAssetsByCustomer(activeCustomerId);
        setAssets(fetchedAssets);
        // Auto-select first site
        if (fetchedAssets.length > 0) {
          setSelectedSite(fetchedAssets[0].asset_name);
        }
      } catch (err) {
        console.error('Failed to fetch assets:', err);
        setAssets([]);
      }
      setLoadingAssets(false);
    })();
  }, [activeCustomerId]);

  const handleLoad = useCallback(async () => {
    const siteId = showNewSiteInput ? newSite.trim() : selectedSite;
    if (!siteId) return;

    setLoading(true);
    setStatusMsg({ text: '', type: '' });
    try {
      const customerId = isCustomerOnly ? userCustomerId : selectedCustomer;
      const data = await getReportData(siteId, selectedMonth, selectedYear, customerId);
      const daysCount = getDaysInMonth(selectedMonth, selectedYear);

      // Build rows for each day, merging with existing data
      const dayMap = {};
      data.forEach(row => { dayMap[row.day] = row; });

      const allRows = [];
      for (let d = 1; d <= daysCount; d++) {
        if (dayMap[d]) {
          allRows.push({ ...dayMap[d] });
        } else {
          allRows.push(createEmptyRow(d));
        }
      }

      setRows(allRows);
      if (data.length > 0 && data[0].planned_monthly_kwh) {
        setPlannedMonthlyKwh(data[0].planned_monthly_kwh);
      }
      setLoaded(true);
    } catch (err) {
      console.error(err);
      setStatusMsg({ text: 'Failed to load data', type: 'error' });
    }
    setLoading(false);
  }, [selectedSite, selectedMonth, selectedYear, newSite, showNewSiteInput, selectedCustomer, isCustomerOnly, userCustomerId]);

  // Auto-load data when site, month, or year changes
  const handleLoadRef = useRef(handleLoad);
  handleLoadRef.current = handleLoad;
  useEffect(() => {
    if (selectedSite && activeCustomerId) {
      handleLoadRef.current();
    }
  }, [selectedSite, selectedMonth, selectedYear, activeCustomerId]);

  // Download Excel template
  const handleDownloadTemplate = useCallback(() => {
    const daysCount = getDaysInMonth(selectedMonth, selectedYear);
    const wsData = [TEMPLATE_HEADERS];

    for (let d = 1; d <= daysCount; d++) {
      const row = [d];
      // Fill numeric columns with 0, text columns with empty
      NUMERIC_FIELDS.forEach(() => row.push(0));
      TEXT_FIELDS.forEach(() => row.push(''));
      wsData.push(row);
    }

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(wsData);

    // Set column widths
    ws['!cols'] = TEMPLATE_HEADERS.map((h, i) => ({ wch: i === 0 ? 6 : Math.max(h.length, 15) }));

    XLSX.utils.book_append_sheet(wb, ws, 'Report Template');
    const buf = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([buf], { type: 'application/octet-stream' });
    saveAs(blob, `Report_Template_${MONTHS[selectedMonth - 1]}_${selectedYear}.xlsx`);
  }, [selectedMonth, selectedYear]);

  // Export loaded report as XLSX
  const handleExportReport = useCallback(() => {
    const wsData = [
      ['Date', ...Object.values(EXCEL_COLUMN_MAP)],
      ...rows.map(row => [
        `${String(row.day).padStart(2, '0')}/${String(selectedMonth).padStart(2, '0')}/${selectedYear}`,
        ...Object.keys(EXCEL_COLUMN_MAP).map(k => EXCEL_COLUMN_MAP[k]).map(f => row[f] ?? ''),
      ]),
    ];
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(wsData);
    ws['!cols'] = wsData[0].map((h) => ({ wch: Math.max(String(h).length, 12) }));
    XLSX.utils.book_append_sheet(wb, ws, 'Report');
    const buf = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([buf], { type: 'application/octet-stream' });
    const site = showNewSiteInput ? newSite.trim() : selectedSite;
    saveAs(blob, `Report_${site}_${MONTHS[selectedMonth - 1]}_${selectedYear}.xlsx`);
  }, [rows, selectedMonth, selectedYear, showNewSiteInput, newSite, selectedSite]);

  // Upload Excel report
  const handleUploadReport = useCallback((e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const wb = XLSX.read(evt.target.result, { type: 'array' });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const jsonData = XLSX.utils.sheet_to_json(ws);

        if (jsonData.length === 0) {
          setStatusMsg({ text: 'Uploaded file is empty', type: 'error' });
          return;
        }

        // Validate headers
        const fileHeaders = Object.keys(jsonData[0]);
        const expectedFields = Object.keys(EXCEL_COLUMN_MAP);
        const missingHeaders = expectedFields.filter(h => !fileHeaders.includes(h));

        if (missingHeaders.length > 0) {
          setStatusMsg({ text: `Missing columns: ${missingHeaders.slice(0, 3).join(', ')}${missingHeaders.length > 3 ? '...' : ''}`, type: 'error' });
          return;
        }

        const daysCount = getDaysInMonth(selectedMonth, selectedYear);
        const uploadedRows = [];

        for (let d = 1; d <= daysCount; d++) {
          const excelRow = jsonData.find(r => parseInt(r['Day']) === d);
          if (excelRow) {
            const newRow = createEmptyRow(d);
            Object.entries(EXCEL_COLUMN_MAP).forEach(([header, field]) => {
              const val = excelRow[header];
              if (NUMERIC_FIELDS.includes(field)) {
                newRow[field] = val === '' || val === undefined ? 0 : parseFloat(val) || 0;
              } else {
                newRow[field] = val !== undefined ? String(val) : '';
              }
            });
            uploadedRows.push(newRow);
          } else {
            uploadedRows.push(createEmptyRow(d));
          }
        }

        setRows(uploadedRows);
        setLoaded(true);
        setStatusMsg({ text: `Uploaded ${jsonData.length} rows from Excel`, type: 'success' });
      } catch (err) {
        console.error('Excel parse error:', err);
        setStatusMsg({ text: 'Failed to parse Excel file', type: 'error' });
      }
    };
    reader.readAsArrayBuffer(file);

    // Reset file input so same file can be re-uploaded
    e.target.value = '';
  }, [selectedMonth, selectedYear]);

  const handleCellChange = useCallback((dayIndex, field, value) => {
    setRows(prev => {
      const updated = [...prev];
      updated[dayIndex] = {
        ...updated[dayIndex],
        [field]: NUMERIC_FIELDS.includes(field) ? (value === '' ? 0 : parseFloat(value) || 0) : value,
      };
      return updated;
    });
  }, []);

  const handleSave = useCallback(async () => {
    const siteId = showNewSiteInput ? newSite.trim() : selectedSite;
    if (!siteId) return;

    setSaving(true);
    setStatusMsg({ text: '', type: '' });
    try {
      const customerId = isCustomerOnly ? userCustomerId : selectedCustomer;
      const result = await saveReportData(siteId, selectedMonth, selectedYear, rows, plannedMonthlyKwh, customerId);
      if (result.success) {
        setStatusMsg({ text: 'Report saved successfully!', type: 'success' });
      } else {
        setStatusMsg({ text: result.error || 'Failed to save', type: 'error' });
      }
    } catch (err) {
      console.error(err);
      setStatusMsg({ text: 'Failed to save report data', type: 'error' });
    }
    setSaving(false);
  }, [selectedSite, selectedMonth, selectedYear, rows, plannedMonthlyKwh, newSite, showNewSiteInput, selectedCustomer, isCustomerOnly, userCustomerId]);

  // Compute totals
  const totals = {};
  NUMERIC_FIELDS.forEach(f => { totals[f] = 0; });
  rows.forEach(row => {
    NUMERIC_FIELDS.forEach(f => {
      totals[f] += (parseFloat(row[f]) || 0);
    });
  });

  // Compute overall displacement percentage
  const overallDaytimeDisplacement = totals.planned_daytime_consumption > 0
    ? Math.round((totals.pv_production / totals.planned_daytime_consumption) * 100)
    : 0;
  const overallTotalDisplacement = totals.total_daily_consumption > 0
    ? Math.round((totals.pv_production / totals.total_daily_consumption) * 100)
    : 0;

  const currentYears = [];
  const now = new Date().getFullYear();
  for (let y = 2020; y <= now + 1; y++) currentYears.push(y);

  const activeSite = showNewSiteInput ? newSite.trim() : selectedSite;

  return (
    <div className={classes.container}>
      {(loading || loadingAssets) && <FullScreenLoader />}
      {/* Site / Month / Year Controls */}
      <div className={classes.controls}>
        {/* Customer dropdown - only for admins/non-customer roles */}
        {!isCustomerOnly && (
          <div className={classes.controlGroup}>
            <label>Customer</label>
            <select
              value={selectedCustomer}
              onChange={(e) => setSelectedCustomer(e.target.value)}
            >
              <option value="">-- Select Customer --</option>
              {customers.map(c => (
                <option key={c.id} value={c.id}>{c.company_name}</option>
              ))}
            </select>
          </div>
        )}

        <div className={classes.controlGroup}>
          <label>Site</label>
          {loadingAssets ? (
            <select disabled>
              <option>Loading sites...</option>
            </select>
          ) : !isCustomerOnly && showNewSiteInput ? (
            <div style={{ display: 'flex', gap: '8px' }}>
              <input
                type="text"
                placeholder="Enter site name"
                value={newSite}
                onChange={(e) => setNewSite(e.target.value)}
              />
              <button
                className={classes.loadBtn}
                onClick={() => { setShowNewSiteInput(false); setNewSite(''); }}
                style={{ minWidth: 'auto', padding: '8px 12px' }}
              >
                Cancel
              </button>
            </div>
          ) : (
            <select
              value={selectedSite}
              onChange={(e) => {
                if (e.target.value === '__new__') {
                  setShowNewSiteInput(true);
                  setSelectedSite('');
                } else {
                  setSelectedSite(e.target.value);
                }
              }}
            >
              <option value="">-- Select Site --</option>
              {assets.map(asset => (
                <option key={asset.asset_id} value={asset.asset_name}>
                  {asset.asset_name}
                </option>
              ))}
              {!isCustomerOnly && <option value="__new__">+ Add New Site</option>}
            </select>
          )}
        </div>

        <div className={classes.controlGroup}>
          <label>Month</label>
          <select value={selectedMonth} onChange={(e) => setSelectedMonth(parseInt(e.target.value))}>
            {MONTHS.map((m, i) => (
              <option key={i} value={i + 1}>{m}</option>
            ))}
          </select>
        </div>

        <div className={classes.controlGroup}>
          <label>Year</label>
          <select value={selectedYear} onChange={(e) => setSelectedYear(parseInt(e.target.value))}>
            {currentYears.map(y => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        </div>

        {!isCustomerOnly && (
          <div className={classes.plannedKwhGroup}>
            <label>Planned Monthly kWh</label>
            <input
              type="number"
              value={plannedMonthlyKwh}
              onChange={(e) => setPlannedMonthlyKwh(parseFloat(e.target.value) || 0)}
            />
          </div>
        )}

        <button
          className={classes.loadBtn}
          onClick={handleLoad}
          disabled={loading || !activeSite}
        >
          {loading ? 'Loading...' : 'Load Report'}
        </button>

        {!isCustomerOnly && (
          <>
            <button
              className={classes.uploadBtn}
              onClick={() => fileInputRef.current?.click()}
              disabled={!activeSite}
            >
              Upload Report
            </button>
            <input
              type="file"
              ref={fileInputRef}
              accept=".xlsx,.xls,.csv"
              style={{ display: 'none' }}
              onChange={handleUploadReport}
            />
            <button
              className={classes.templateBtn}
              onClick={handleDownloadTemplate}
            >
              Download Template
            </button>
          </>
        )}
      </div>

      {/* Report Table */}
      {loaded && (
        <div className={classes.reportSection}>
        <div className={classes.formHeader}>
        <div>
          <Image src="/img/daystar/shell-daystar.png" alt="Daystar Logo" width={150} height={40} className={classes.logo} />
        </div>
          <div className={classes.header}>
            <h2>DAYBREAK SOLAR POWER SYSTEM - {activeSite.toUpperCase()}</h2>
            <h3>SOLAR HYBRID REPORT FOR {MONTHS[selectedMonth - 1].toUpperCase()} {selectedYear}</h3>
            <p>Planned Monthly kWh - {plannedMonthlyKwh.toLocaleString()}</p>
          </div>
        </div>
          <div className={classes.tableWrapper}>
            <table className={classes.reportTable}>
              <thead>
                <tr>
                  <th rowSpan={2}>Date</th>
                  <th rowSpan={2}>Total Daily<br/>Consumption (kWh)</th>
                  <th rowSpan={2}>Total Daytime<br/>Consumption (kWh)<br/>(7AM to 5PM)</th>
                  <th rowSpan={2}>Planned Daytime<br/>Consumption (kWh)<br/>(7AM to 5PM)</th>
                  <th rowSpan={2}>PV Production<br/>(kWh)</th>
                  <th rowSpan={2}>Planned PV<br/>Production (kWh)</th>
                  <th rowSpan={2}>Energy Production -<br/>Turbine(kWh)</th>
                  <th rowSpan={2}>Energy Production - Diesel<br/>Generator(kWh)</th>
                  <th rowSpan={2}>Daily Day-time<br/>Solar Displacement<br/>(7AM to 5PM)</th>
                  <th rowSpan={2}>Total Solar<br/>Displacement (24<br/>hour period)</th>
                  <th rowSpan={2}>Data Capture period<br/>(Daytime)</th>
                  <th rowSpan={2}>Data Capture period<br/>(Entire Day)</th>
                  <th rowSpan={2}>Remarks</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row, idx) => (
                  <tr key={row.day}>
                    <td>{formatDate(row.day, selectedMonth, selectedYear)}</td>
                    {NUMERIC_FIELDS.map(field => (
                      <td key={field}>
                        <input
                          type="number"
                          step="any"
                          value={row[field] || ''}
                          onChange={(e) => handleCellChange(idx, field, e.target.value)}
                          readOnly={isCustomerOnly}
                        />
                      </td>
                    ))}
                    {TEXT_FIELDS.map(field => (
                      <td key={field}>
                        <input
                          type="text"
                          className={classes.textInput}
                          value={row[field] || ''}
                          onChange={(e) => handleCellChange(idx, field, e.target.value)}
                          readOnly={isCustomerOnly}
                        />
                      </td>
                    ))}
                  </tr>
                ))}

                {/* Totals Row */}
                <tr className={classes.totalRow}>
                  {/* Date column — shows PV vs Planned % */}
                  <td className={classes.percentCell}>
                    {totals.planned_pv_production > 0
                      ? `${Math.round((totals.pv_production / totals.planned_pv_production) * 100)}%`
                      : 'Total'}
                  </td>
                  <td>{Math.round(totals.total_daily_consumption).toLocaleString()}</td>
                  <td>{Math.round(totals.total_daytime_consumption).toLocaleString()}</td>
                  <td>{Math.round(totals.planned_daytime_consumption).toLocaleString()}</td>
                  <td>{Math.round(totals.pv_production).toLocaleString()}</td>
                  <td>{Math.round(totals.planned_pv_production).toLocaleString()}</td>
                  <td>{Math.round(totals.energy_production_turbine).toLocaleString()}</td>
                  <td>{Math.round(totals.energy_production_diesel_generator).toLocaleString()}</td>
                  {/* Text fields: displacement totals hidden for now */}
                  <td style={{ textAlign: 'center' }}>-</td>
                  <td style={{ textAlign: 'center' }}>-</td>
                  <td style={{ textAlign: 'center' }}>-</td>
                  <td style={{ textAlign: 'center' }}>-</td>
                  <td style={{ textAlign: 'center' }}>-</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className={classes.footer}>
            {statusMsg.text && (
              <span className={`${classes.statusMsg} ${statusMsg.type === 'success' ? classes.success : classes.error}`}>
                {statusMsg.text}
              </span>
            )}
            <button
              className={classes.templateBtn}
              onClick={handleExportReport}
            >
              Export Report
            </button>
            {!isCustomerOnly && (
              <button
                className={classes.saveBtn}
                onClick={handleSave}
                disabled={saving}
              >
                {saving ? 'Saving...' : 'Save Report'}
              </button>
            )}
          </div>
        </div>
      )}

      {!loaded && (
        <div className={classes.noData}>
          Select a site and month, then click &quot;Load Report&quot; to populate the table.
        </div>
      )}
    </div>
  );
}
