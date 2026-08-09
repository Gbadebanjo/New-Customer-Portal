"use client";
import { useState, useCallback, useEffect, useRef, useMemo } from "react";
import FullScreenLoader from "@/components/LoadingSkeleton/LoadingSkeleton";
import Image from "next/image";
import { saveAs } from "file-saver";
import classes from "./editableReportTable.module.css";
import getReportData from "@/lib/controllers/reportData/getReportData";
import saveReportData from "@/lib/controllers/reportData/saveReportData";
import getAssetsByCustomer from "@/lib/controllers/reportData/getAssetsByCustomer";
import getReportNotes from "@/lib/controllers/reportData/getReportNote";
import saveReportNote from "@/lib/controllers/reportData/saveReportNote";
import { refreshReportFromSource } from "@/lib/controllers/reportData/refreshFromSource";

const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

const NUMERIC_FIELDS = [
  "total_daily_consumption",
  "total_daytime_consumption",
  "planned_daytime_consumption",
  "pv_production",
  "planned_pv_production",
  "energy_production_turbine",
  "energy_production_diesel_generator",
];

const TEXT_FIELDS = [
  "daily_daytime_solar_displacement",
  "total_solar_displacement",
  "data_capture_daytime",
  "data_capture_entire_day",
  "remarks",
];

const MAX_NOTE = 500;

function getDaysInMonth(month, year) {
  return new Date(year, month, 0).getDate();
}

function formatDate(day, month, year) {
  return `${day}-${MONTHS[month - 1].substring(0, 3)}-${String(year).slice(-2)}`;
}

function formatNoteDate(dateStr) {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  return (
    d.toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
    }) +
    " at " +
    d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })
  );
}

function avatarColor(name) {
  const palette = [
    "#e74c3c",
    "#3498db",
    "#2ecc71",
    "#9b59b6",
    "#f39c12",
    "#1abc9c",
    "#e67e22",
  ];
  let h = 0;
  for (let i = 0; i < name.length; i++) h = name.charCodeAt(i) + ((h << 5) - h);
  return palette[Math.abs(h) % palette.length];
}

const EXCEL_COLUMN_MAP = {
  "Total Daily Consumption (kWh)": "total_daily_consumption",
  "Total Daytime Consumption (kWh) (7AM to 5PM)": "total_daytime_consumption",
  "Planned Daytime Consumption (kWh) (7AM to 5PM)":
    "planned_daytime_consumption",
  "PV Production (kWh)": "pv_production",
  "Planned PV Production (kWh)": "planned_pv_production",
  "Energy Production - Turbine (kWh)": "energy_production_turbine",
  "Energy Production - Diesel Generator (kWh)":
    "energy_production_diesel_generator",
  "Daily Day-time Solar Displacement (7AM to 5PM)":
    "daily_daytime_solar_displacement",
  "Total Solar Displacement (24 hour period)": "total_solar_displacement",
  "Data Capture period (Daytime)": "data_capture_daytime",
  "Data Capture period (Entire Day)": "data_capture_entire_day",
  Remarks: "remarks",
};

const TEMPLATE_HEADERS = ["Day", ...Object.keys(EXCEL_COLUMN_MAP)];

// Small colored pill shown next to the Date column for Daystar users so
// they can see at a glance which rows are still raw from the data
// provider vs finalised by our team.
function StatusPill({ kind }) {
    const map = {
        verified: { bg: 'rgba(76,175,80,0.12)',  fg: '#4caf50', bd: 'rgba(76,175,80,0.4)',  label: 'Approved' },
        raw:      { bg: 'rgba(255,152,0,0.12)',  fg: '#ff9800', bd: 'rgba(255,152,0,0.4)',  label: 'Raw' },
        unknown:  { bg: 'rgba(255,255,255,0.06)',fg: '#a8b3bd', bd: 'rgba(255,255,255,0.15)', label: 'Unknown' },
    };
    const c = map[kind] || map.unknown;
    return (
        <span style={{
            display: 'inline-flex', alignItems: 'center', gap: 4,
            padding: '1px 8px', borderRadius: 999,
            fontSize: '0.62rem', fontWeight: 700,
            textTransform: 'uppercase', letterSpacing: 0.4,
            background: c.bg, color: c.fg, border: `1px solid ${c.bd}`,
        }}>
            <span style={{ width: 5, height: 5, borderRadius: '50%', background: c.fg }} />
            {c.label}
        </span>
    );
}

function rowHasData(row) {
  return (
    (row.total_daily_consumption || 0) !== 0 ||
    (row.total_daytime_consumption || 0) !== 0 ||
    (row.planned_daytime_consumption || 0) !== 0 ||
    (row.pv_production || 0) !== 0 ||
    (row.planned_pv_production || 0) !== 0 ||
    (row.energy_production_turbine || 0) !== 0 ||
    (row.energy_production_diesel_generator || 0) !== 0 ||
    (row.daily_daytime_solar_displacement || "").trim() !== "" ||
    (row.total_solar_displacement || "").trim() !== "" ||
    (row.data_capture_daytime || "").trim() !== "" ||
    (row.data_capture_entire_day || "").trim() !== "" ||
    (row.remarks || "").trim() !== ""
  );
}

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
    daily_daytime_solar_displacement: "",
    total_solar_displacement: "",
    data_capture_daytime: "",
    data_capture_entire_day: "",
    remarks: "",
  };
}

export default function EditableReportTable({
  isCustomerOnly = false,
  customers = [],
  userCustomerId = "",
  editorName = "Admin",
}) {
  const [selectedSite, setSelectedSite] = useState("");
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [plannedMonthlyKwh, setPlannedMonthlyKwh] = useState(0);
  const [rows, setRows] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [statusMsg, setStatusMsg] = useState({ text: "", type: "" });
  const [newSite, setNewSite] = useState("");
  const [showNewSiteInput, setShowNewSiteInput] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState(
    isCustomerOnly ? userCustomerId : "",
  );
  const [assets, setAssets] = useState([]);
  const [loadingAssets, setLoadingAssets] = useState(false);
  const fileInputRef = useRef(null);

  // Edit tracking
  const [reportNotes, setReportNotes] = useState([]);
  const [hasExistingData, setHasExistingData] = useState(false);
  // Days already APPROVED (status='verified') in the DB. Raw AMMP-ingested
  // rows are deliberately excluded — modifying a raw row is treated as
  // filling in fresh data, not editing an approved value, so no change-note
  // is required. `handleCellChange` uses this set to gate `dirtyDays` and
  // `handleSave` filters against it to decide whether to open the note modal.
  const existingDaysRef = useRef(new Set());
  const [dirtyDays, setDirtyDays] = useState(new Set()); // existing days that were modified

  // Auto-refresh guard: once we've asked AMMP for this (site, year, month)
  // combo during this mount, don't ask again — the DB now reflects whatever
  // AMMP had. Prevents an infinite load/refresh loop when AMMP genuinely
  // returns nothing for the month.
  const autoRefreshedRef = useRef(new Set());
  const [historyPanel, setHistoryPanel] = useState(null); // { day } | null

  // Note modal
  const [noteModalOpen, setNoteModalOpen] = useState(false);
  const [pendingNote, setPendingNote] = useState('');
  const [noteError, setNoteError] = useState('');
  const [noteSubmitting, setNoteSubmitting] = useState(false);

  // Notes keyed by day number
  const notesByDay = useMemo(() => {
    const map = {};
    reportNotes.forEach(n => {
      const d = n.report_day;
      if (d != null) {
        if (!map[d]) map[d] = [];
        map[d].push(n);
      }
    });
    return map;
  }, [reportNotes]);

  const dirtyDaysSorted = useMemo(() => [...dirtyDays].sort((a, b) => a - b), [dirtyDays]);

  // ESC: note modal
  useEffect(() => {
    if (!noteModalOpen) return;
    const fn = (e) => { if (e.key === 'Escape' && !noteSubmitting) setNoteModalOpen(false); };
    document.addEventListener('keydown', fn);
    return () => document.removeEventListener('keydown', fn);
  }, [noteModalOpen, noteSubmitting]);

  // ESC: history drawer
  useEffect(() => {
    if (!historyPanel) return;
    const fn = (e) => { if (e.key === 'Escape') setHistoryPanel(null); };
    document.addEventListener('keydown', fn);
    return () => document.removeEventListener('keydown', fn);
  }, [historyPanel]);

  const activeCustomerId = isCustomerOnly ? userCustomerId : selectedCustomer;

  useEffect(() => {
    if (!activeCustomerId) { setAssets([]); setSelectedSite(''); return; }
    (async () => {
      setLoadingAssets(true);
      setSelectedSite('');
      try {
        const { assets: fetched } = await getAssetsByCustomer(activeCustomerId);
        setAssets(fetched);
        if (fetched.length > 0) setSelectedSite(fetched[0].asset_id);
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
    setDirtyDays(new Set());
    existingDaysRef.current = new Set();
    setHistoryPanel(null);

    try {
      const customerId = isCustomerOnly ? userCustomerId : selectedCustomer;
      const [dataResult, notesResult] = await Promise.allSettled([
        getReportData(siteId, selectedMonth, selectedYear, customerId),
        getReportNotes(siteId, selectedMonth, selectedYear, null, customerId),
      ]);

      if (dataResult.status === 'rejected') throw dataResult.reason;

      const data = dataResult.value;
      const notesData = notesResult.status === 'fulfilled' ? notesResult.value : [];
      if (notesResult.status === 'rejected') console.error('Notes load failed:', notesResult.reason);

      const daysCount = getDaysInMonth(selectedMonth, selectedYear);
      const dayMap = {};
      data.forEach(row => { dayMap[row.day] = row; });

      const allRows = [];
      for (let d = 1; d <= daysCount; d++) {
        allRows.push(dayMap[d] ? { ...dayMap[d] } : createEmptyRow(d));
      }

      setRows(allRows);
      if (data.length > 0 && data[0].planned_monthly_kwh) {
        setPlannedMonthlyKwh(data[0].planned_monthly_kwh);
      }
      setHasExistingData(data.some(rowHasData));
      // Only verified rows count as "already approved". Raw rows are
      // treated as unapproved provider data that the operator can edit
      // freely without needing to justify with a note.
      existingDaysRef.current = new Set(
        data.filter((r) => rowHasData(r) && r.status === 'verified').map((r) => r.day)
      );
      setReportNotes(notesData);
      setLoaded(true);

      // Auto-fall-back to the data provider whenever the DB is missing
      // data the provider likely has. Two cases fire this:
      //   1. Empty month — we've never ingested this (site, month, year).
      //   2. Current month with a stale tail — today's row (or yesterday's
      //      if today's still open) is missing. Otherwise NOC would have
      //      to hit "Refresh from source" every morning.
      // Historical/closed months skip auto-refresh once populated so we
      // don't re-ingest data that isn't going to change.
      const dbHasAnyRows = data.length > 0;
      const now = new Date();
      const isCurrentMonth =
        selectedYear === now.getFullYear() &&
        selectedMonth === now.getMonth() + 1;
      const highestSavedDay = data.reduce((m, r) => Math.max(m, r.day || 0), 0);
      // "yesterday" is the last day AMMP can reasonably have finalised;
      // today's own reading is often still filling in.
      const targetDay = Math.max(1, now.getDate() - 1);
      const missingRecentDays = isCurrentMonth && highestSavedDay < targetDay;

      const key = `${siteId}:${selectedYear}:${selectedMonth}`;
      const canAutoRefresh =
        !isCustomerOnly &&
        !showNewSiteInput &&
        !autoRefreshedRef.current.has(key) &&
        (!dbHasAnyRows || missingRecentDays);

      if (canAutoRefresh) {
        autoRefreshedRef.current.add(key);
        setStatusMsg({ text: 'No local data yet — pulling from the data provider…', type: '' });
        try {
          const res = await refreshReportFromSource({
            siteId,
            year: selectedYear,
            month: selectedMonth,
            customerId,
          });
          if (res?.ok && ((res.created ?? 0) > 0 || (res.updated ?? 0) > 0)) {
            // Reload once so the ingested rows show up. handleLoadRef
            // guards against re-firing this branch (autoRefreshedRef).
            setStatusMsg({ text: '', type: '' });
            await handleLoadRef.current();
            return;
          }
          setStatusMsg({
            text: res?.ok
              ? 'No data available from the data provider for this month.'
              : (res?.error || 'Could not reach the data provider.'),
            type: res?.ok ? '' : 'error',
          });
        } catch (fetchErr) {
          console.error('auto-refresh failed', fetchErr);
          setStatusMsg({ text: 'Could not reach the data provider.', type: 'error' });
        }
      }
    } catch (err) {
      console.error(err);
      setHasExistingData(false);
      setStatusMsg({ text: 'Failed to load data', type: 'error' });
    }
    setLoading(false);
  }, [selectedSite, selectedMonth, selectedYear, newSite, showNewSiteInput, selectedCustomer, isCustomerOnly, userCustomerId]);

  const handleLoadRef = useRef(handleLoad);
  handleLoadRef.current = handleLoad;
  useEffect(() => {
    if (selectedSite && activeCustomerId) handleLoadRef.current();
  }, [selectedSite, selectedMonth, selectedYear, activeCustomerId]);

  const handleRefreshFromAmmp = useCallback(async () => {
    const siteId = showNewSiteInput ? newSite.trim() : selectedSite;
    const customerId = isCustomerOnly ? userCustomerId : selectedCustomer;
    if (!siteId || !customerId) {
      setStatusMsg({ text: 'Pick a customer and site before refreshing.', type: 'error' });
      return;
    }
    setLoading(true);
    setStatusMsg({ text: 'Fetching data from data provider…', type: '' });
    try {
      const res = await refreshReportFromSource({
        siteId,
        year: selectedYear,
        month: selectedMonth,
        customerId,
      });
      if (!res?.ok) {
        setStatusMsg({ text: res?.error || 'Refresh failed', type: 'error' });
        setLoading(false);
        return;
      }
      const parts = [];
      if (res.created) parts.push(`${res.created} added`);
      if (res.updated) parts.push(`${res.updated} updated`);
      if (res.skipped) parts.push(`${res.skipped} skipped (verified)`);
      setStatusMsg({
        text: parts.length ? `Refresh: ${parts.join(', ')}` : 'Refresh completed — no new data.',
        type: 'success',
      });
      // Re-fetch so the newly-ingested rows show up in the table.
      await handleLoadRef.current();
    } catch (err) {
      console.error(err);
      setStatusMsg({ text: 'Refresh failed', type: 'error' });
      setLoading(false);
    }
  }, [selectedSite, newSite, showNewSiteInput, selectedYear, selectedMonth, isCustomerOnly, userCustomerId, selectedCustomer]);

  const handleDownloadTemplate = useCallback(async () => {
    const daysCount = getDaysInMonth(selectedMonth, selectedYear);
    const ExcelJS = (await import('exceljs')).default;
    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet('Report Template');
    ws.addRow(TEMPLATE_HEADERS);
    for (let d = 1; d <= daysCount; d++) {
      ws.addRow([d, ...NUMERIC_FIELDS.map(() => 0), ...TEXT_FIELDS.map(() => '')]);
    }
    TEMPLATE_HEADERS.forEach((h, i) => {
      ws.getColumn(i + 1).width = i === 0 ? 6 : Math.max(h.length, 15);
    });
    const buf = await wb.xlsx.writeBuffer();
    saveAs(new Blob([buf], { type: 'application/octet-stream' }), `Report_Template_${MONTHS[selectedMonth - 1]}_${selectedYear}.xlsx`);
  }, [selectedMonth, selectedYear]);

  const handleExportReport = useCallback(async () => {
    const wsData = [
      ['Date', ...Object.values(EXCEL_COLUMN_MAP)],
      ...rows.map(row => [
        `${String(row.day).padStart(2, '0')}/${String(selectedMonth).padStart(2, '0')}/${selectedYear}`,
        ...Object.keys(EXCEL_COLUMN_MAP).map(k => EXCEL_COLUMN_MAP[k]).map(f => row[f] ?? ''),
      ]),
    ];
    const ExcelJS = (await import('exceljs')).default;
    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet('Report');
    wsData.forEach(row => ws.addRow(row));
    wsData[0].forEach((h, i) => { ws.getColumn(i + 1).width = Math.max(String(h).length, 12); });
    const buf = await wb.xlsx.writeBuffer();
    const site = showNewSiteInput ? newSite.trim() : selectedSite;
    saveAs(new Blob([buf], { type: 'application/octet-stream' }), `Report_${site}_${MONTHS[selectedMonth - 1]}_${selectedYear}.xlsx`);
  }, [rows, selectedMonth, selectedYear, showNewSiteInput, newSite, selectedSite]);

  const handleUploadReport = useCallback((e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const ExcelJS = (await import('exceljs')).default;
        const wb = new ExcelJS.Workbook();
        await wb.xlsx.load(evt.target.result);
        const ws = wb.worksheets[0];
        const headers = {};
        ws.getRow(1).eachCell((cell, col) => { headers[col] = cell.text || String(cell.value ?? ''); });
        const jsonData = [];
        ws.eachRow((row, rowNumber) => {
          if (rowNumber === 1) return;
          const rowData = {};
          Object.entries(headers).forEach(([col, header]) => { rowData[header] = row.getCell(Number(col)).value ?? undefined; });
          jsonData.push(rowData);
        });
        if (jsonData.length === 0) { setStatusMsg({ text: 'Uploaded file is empty', type: 'error' }); return; }
        const missing = Object.keys(EXCEL_COLUMN_MAP).filter(h => !Object.keys(jsonData[0]).includes(h));
        if (missing.length > 0) {
          setStatusMsg({ text: `Missing columns: ${missing.slice(0, 3).join(', ')}${missing.length > 3 ? '...' : ''}`, type: 'error' });
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
                newRow[field] = val === '' || val == null ? 0 : parseFloat(val) || 0;
              } else {
                newRow[field] = val != null ? String(val) : '';
              }
            });
            uploadedRows.push(newRow);
          } else {
            uploadedRows.push(createEmptyRow(d));
          }
        }
        setRows(uploadedRows);
        if (hasExistingData) {
          // A day is dirty only if it had real data in DB AND the upload provides new data for it
          setDirtyDays(new Set(
            uploadedRows
              .filter(r => rowHasData(r) && existingDaysRef.current.has(r.day))
              .map(r => r.day)
          ));
        }
        setLoaded(true);
        setStatusMsg({ text: `Uploaded ${jsonData.length} rows from Excel`, type: 'success' });
      } catch (err) {
        console.error('Excel parse error:', err);
        setStatusMsg({ text: 'Failed to parse Excel file', type: 'error' });
      }
    };
    reader.readAsArrayBuffer(file);
    e.target.value = '';
  }, [selectedMonth, selectedYear, hasExistingData]);

  const handleCellChange = useCallback((dayIndex, field, value, day) => {
    setRows(prev => {
      const updated = [...prev];
      updated[dayIndex] = {
        ...updated[dayIndex],
        [field]: NUMERIC_FIELDS.includes(field) ? (value === '' ? 0 : parseFloat(value) || 0) : value,
      };
      return updated;
    });
    if (existingDaysRef.current.has(day)) {
      setDirtyDays(prev => { const next = new Set(prev); next.add(day); return next; });
    }
  }, []);

  const handleOpenHistory = useCallback((day) => { setHistoryPanel({ day }); }, []);

  const handleSave = useCallback(async () => {
    const siteId = showNewSiteInput ? newSite.trim() : selectedSite;
    if (!siteId) return;

    // A note is only required when the operator is CHANGING a day that
    // was already saved to the DB. Days they're filling in for the first
    // time (empty → data) don't need a note — nothing to justify.
    // `existingDaysRef` was set to the days-with-data at load time / last
    // save; dirty days not in that set are net-new entries.
    const changedExistingDays = [...dirtyDays].filter((d) => existingDaysRef.current.has(d));
    const isEditingExisting = changedExistingDays.length > 0;

    if (!isEditingExisting) {
      // New upload, no changes, or only net-new days — save directly.
      setSaving(true);
      setStatusMsg({ text: '', type: '' });
      try {
        const customerId = isCustomerOnly ? userCustomerId : selectedCustomer;
        const result = await saveReportData(siteId, selectedMonth, selectedYear, rows, plannedMonthlyKwh, customerId);
        if (result.success) {
          setHasExistingData(true);
          existingDaysRef.current = new Set(rows.filter(rowHasData).map(r => r.day));
          setDirtyDays(new Set());
          setStatusMsg({ text: 'Report saved successfully.', type: 'success' });
        } else {
          setStatusMsg({ text: result.error || 'Failed to save report.', type: 'error' });
        }
      } catch (err) {
        console.error(err);
        setStatusMsg({ text: 'Failed to save report.', type: 'error' });
      }
      setSaving(false);
    } else {
      // At least one already-saved day is being changed — require a note.
      setPendingNote('');
      setNoteError('');
      setNoteModalOpen(true);
    }
  }, [
    dirtyDays, selectedSite, newSite, showNewSiteInput,
    selectedMonth, selectedYear, rows, plannedMonthlyKwh,
    selectedCustomer, isCustomerOnly, userCustomerId,
  ]);

  const handleConfirmSave = useCallback(async () => {
    if (!pendingNote.trim()) { setNoteError('A note is required before saving.'); return; }

    const siteId = showNewSiteInput ? newSite.trim() : selectedSite;
    setNoteSubmitting(true);
    setStatusMsg({ text: '', type: '' });

    try {
      const customerId = isCustomerOnly ? userCustomerId : selectedCustomer;
      const noteText = pendingNote.trim();
      // Only attach the note to days that were already in the DB — net-new
      // days get saved by the main call but don't need a change-note.
      const daysNeedingNote = [...dirtyDays].filter((d) => existingDaysRef.current.has(d));

      const [dataResult] = await Promise.all([
        saveReportData(siteId, selectedMonth, selectedYear, rows, plannedMonthlyKwh, customerId),
        ...daysNeedingNote.map(day => saveReportNote(siteId, selectedMonth, selectedYear, day, customerId, noteText, editorName)),
      ]);

      if (dataResult.success) {
        existingDaysRef.current = new Set(rows.filter(rowHasData).map(r => r.day));
        const newNotes = daysNeedingNote.map(day => ({
          site_id: siteId,
          customer_id: customerId,
          report_month: selectedMonth,
          report_year: selectedYear,
          report_day: day,
          note: noteText,
          edited_by: editorName,
          created_at: new Date().toISOString(),
        }));
        setReportNotes(prev => [...newNotes, ...prev]);
        setDirtyDays(new Set());
        setNoteModalOpen(false);
        setPendingNote('');
        setStatusMsg({ text: 'Report updated successfully.', type: 'success' });
      } else {
        setStatusMsg({ text: dataResult.error || 'Failed to save report.', type: 'error' });
        setNoteModalOpen(false);
      }
    } catch (err) {
      console.error(err);
      setStatusMsg({ text: 'Failed to save report.', type: 'error' });
      setNoteModalOpen(false);
    }
    setNoteSubmitting(false);
  }, [
    pendingNote, selectedSite, newSite, showNewSiteInput,
    selectedMonth, selectedYear, rows, plannedMonthlyKwh,
    selectedCustomer, isCustomerOnly, userCustomerId, editorName, dirtyDays,
  ]);

  // Totals
  const totals = {};
  NUMERIC_FIELDS.forEach(f => { totals[f] = 0; });
  rows.forEach(row => { NUMERIC_FIELDS.forEach(f => { totals[f] += (parseFloat(row[f]) || 0); }); });

  const currentYears = [];
  const now = new Date().getFullYear();
  for (let y = 2020; y <= now + 1; y++) currentYears.push(y);

  const activeSite = showNewSiteInput ? newSite.trim() : selectedSite;
  // Friendly name for headings / export filenames. The dropdown value is
  // the AMMP asset_id (UUID) because that's what the ingester + resolver
  // key rows by, but the user-facing chrome should show the asset_name
  // (e.g. "SBC_ABJ_001") or long_name ("SBC Abuja") when we have them.
  const activeAsset = assets.find((a) => a.asset_id === activeSite);
  const activeSiteLabel = showNewSiteInput
    ? newSite.trim()
    : (activeAsset?.long_name || activeAsset?.asset_name || activeSite);

  return (
    <div className={classes.container}>
      {(loading || loadingAssets) && <FullScreenLoader />}

      {/* Controls */}
      <div className={classes.controls}>
        {!isCustomerOnly && (
          <div className={classes.controlGroup}>
            <label>Customer</label>
            <select value={selectedCustomer} onChange={(e) => setSelectedCustomer(e.target.value)}>
              <option value="">-- Select Customer --</option>
              {customers.map(c => <option key={c.id} value={c.id}>{c.company_name}</option>)}
            </select>
          </div>
        )}

        <div className={classes.controlGroup}>
          <label>Site</label>
          {loadingAssets ? (
            <select disabled><option>Loading sites...</option></select>
          ) : !isCustomerOnly && showNewSiteInput ? (
            <div style={{ display: 'flex', gap: '8px' }}>
              <input type="text" placeholder="Enter site name" value={newSite} onChange={(e) => setNewSite(e.target.value)} />
              <button className={classes.loadBtn} onClick={() => { setShowNewSiteInput(false); setNewSite(''); }} style={{ minWidth: 'auto', padding: '8px 12px' }}>Cancel</button>
            </div>
          ) : (
            <select value={selectedSite} onChange={(e) => {
              if (e.target.value === '__new__') { setShowNewSiteInput(true); setSelectedSite(''); }
              else setSelectedSite(e.target.value);
            }}>
              <option value="">-- Select Site --</option>
              {assets.map(a => <option key={a.asset_id} value={a.asset_id}>{a.asset_name}</option>)}
              {!isCustomerOnly && <option value="__new__">+ Add New Site</option>}
            </select>
          )}
        </div>

        <div className={classes.controlGroup}>
          <label>Month</label>
          <select value={selectedMonth} onChange={(e) => setSelectedMonth(parseInt(e.target.value))}>
            {MONTHS.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
          </select>
        </div>

        <div className={classes.controlGroup}>
          <label>Year</label>
          <select value={selectedYear} onChange={(e) => setSelectedYear(parseInt(e.target.value))}>
            {currentYears.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>

        {!isCustomerOnly && (
          <div className={classes.plannedKwhGroup}>
            <label>Planned Monthly kWh</label>
            <input type="number" value={plannedMonthlyKwh} onChange={(e) => setPlannedMonthlyKwh(parseFloat(e.target.value) || 0)} />
          </div>
        )}

        <button
          className={classes.loadBtn}
          onClick={handleLoad}
          disabled={loading || !activeSite}
          title="Reload what's in our database for the selected site and month. Auto-pulls from the data provider when the DB is empty."
        >
          {loading ? 'Loading...' : 'Load Report'}
        </button>

        {!isCustomerOnly && (
          <>
            <button
              className={classes.uploadBtn}
              onClick={handleRefreshFromAmmp}
              disabled={!activeSite || loading}
              title="Force-refresh raw values from the data provider (verified rows are preserved). Use this when the provider has updated numbers since the last load."
            >
              {loading ? 'Refreshing…' : 'Refresh from source'}
            </button>
            <button className={classes.uploadBtn} onClick={() => fileInputRef.current?.click()} disabled={!activeSite}>Upload Report</button>
            <input type="file" ref={fileInputRef} accept=".xlsx,.xls,.csv" style={{ display: 'none' }} onChange={handleUploadReport} />
            <button className={classes.templateBtn} onClick={handleDownloadTemplate}>Download Template</button>
          </>
        )}
      </div>

      {/* Report Section */}
      {loaded && (
        <div className={classes.reportSection}>
          <div className={classes.formHeader}>
            <div>
              <Image src="/img/daystar/shell-daystar.png" alt="Daystar Logo" width={150} height={40} className={classes.logo} style={{ height: 'auto' }} />
            </div>
            <div className={classes.header}>
              <h2>DAYBREAK SOLAR POWER SYSTEM - {(activeSiteLabel || '').toUpperCase()}</h2>
              <h3>SOLAR HYBRID REPORT FOR {MONTHS[selectedMonth - 1].toUpperCase()} {selectedYear}</h3>
              <p>Planned Monthly kWh - {plannedMonthlyKwh.toLocaleString()}</p>
            </div>
          </div>

          <div className={classes.tableWrapper}>
            <table className={classes.reportTable}>
              <thead>
                <tr>
                  <th rowSpan={2}>Date</th>
                  <th rowSpan={2}>Total Daily<br />Consumption (kWh)</th>
                  <th rowSpan={2}>Total Daytime<br />Consumption (kWh)<br />(7AM to 5PM)</th>
                  <th rowSpan={2}>Planned Daytime<br />Consumption (kWh)<br />(7AM to 5PM)</th>
                  <th rowSpan={2}>PV Production<br />(kWh)</th>
                  <th rowSpan={2}>Planned PV<br />Production (kWh)</th>
                  <th rowSpan={2}>Energy Production -<br />Turbine(kWh)</th>
                  <th rowSpan={2}>Energy Production - Diesel<br />Generator(kWh)</th>
                  <th rowSpan={2}>Daily Day-time<br />Solar Displacement<br />(7AM to 5PM)</th>
                  <th rowSpan={2}>Total Solar<br />Displacement (24<br />hour period)</th>
                  <th rowSpan={2}>Data Capture period<br />(Daytime)</th>
                  <th rowSpan={2}>Data Capture period<br />(Entire Day)</th>
                  <th rowSpan={2}>Remarks</th>
                  <th rowSpan={2} className={classes.historyHeader}>History</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row, idx) => {
                  const dayNotes = notesByDay[row.day] || [];
                  const isDirty = dirtyDays.has(row.day);
                  const isVerified = row.status === 'verified';
                  const isRaw = row.status === 'raw';
                  const hasData = rowHasData(row);
                  // Customers see verified rows only. Any row that has data
                  // but hasn't been reviewed by our team is masked to a
                  // placeholder so the customer isn't shown unaudited numbers.
                  const hideForCustomer = isCustomerOnly && hasData && !isVerified;
                  return (
                    <tr key={row.day} className={isDirty ? classes.dirtyRow : ''}>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                          <span>{formatDate(row.day, selectedMonth, selectedYear)}</span>
                          {/* Daystar-only status pill so NOC can see at a
                              glance which rows are still raw vs finalised. */}
                          {!isCustomerOnly && hasData && (
                            <StatusPill kind={isVerified ? 'verified' : isRaw ? 'raw' : 'unknown'} />
                          )}
                          {hideForCustomer && (
                            <span style={{
                              fontSize: '0.68rem', color: '#a8b3bd',
                              fontStyle: 'italic',
                            }}>Pending review</span>
                          )}
                        </div>
                      </td>
                      {NUMERIC_FIELDS.map(field => (
                        <td key={field}>
                          {hideForCustomer ? (
                            <span style={{ color: '#6b7280' }}>—</span>
                          ) : (
                            <input
                              type="number"
                              step="any"
                              value={row[field] || ''}
                              onChange={(e) => handleCellChange(idx, field, e.target.value, row.day)}
                              readOnly={isCustomerOnly}
                            />
                          )}
                        </td>
                      ))}
                      {TEXT_FIELDS.map(field => (
                        <td key={field}>
                          {hideForCustomer ? (
                            <span style={{ color: '#6b7280' }}>—</span>
                          ) : (
                            <input
                              type="text"
                              className={classes.textInput}
                              value={row[field] || ''}
                              onChange={(e) => handleCellChange(idx, field, e.target.value, row.day)}
                              readOnly={isCustomerOnly}
                            />
                          )}
                        </td>
                      ))}
                      <td className={classes.historyCell}>
                        <button
                          type="button"
                          className={dayNotes.length > 0 ? classes.historyBtn : classes.historyBtnEmpty}
                          onClick={() => handleOpenHistory(row.day)}
                          title={dayNotes.length > 0 ? `${dayNotes.length} edit${dayNotes.length > 1 ? 's' : ''}` : 'No edit history'}
                        >
                          <svg viewBox="0 0 20 20" fill="currentColor" width="13" height="13">
                            <path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z" />
                            <path fillRule="evenodd" d="M4 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v11a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm3 4a1 1 0 000 2h.01a1 1 0 100-2H7zm3 0a1 1 0 000 2h3a1 1 0 100-2h-3zm-3 4a1 1 0 100 2h.01a1 1 0 100-2H7zm3 0a1 1 0 100 2h3a1 1 0 100-2h-3z" clipRule="evenodd" />
                          </svg>
                          {dayNotes.length > 0 && <span className={classes.historyCount}>{dayNotes.length}</span>}
                        </button>
                      </td>
                    </tr>
                  );
                })}

                <tr className={classes.totalRow}>
                  <td className={classes.percentCell}>
                    Total
                    {/* {totals.planned_pv_production > 0
                      ? `${Math.round((totals.pv_production / totals.planned_pv_production) * 100)}%`
                      : 'Total'} */}
                  </td>
                  <td>{Math.round(totals.total_daily_consumption).toLocaleString()}</td>
                  <td>{Math.round(totals.total_daytime_consumption).toLocaleString()}</td>
                  <td>{Math.round(totals.planned_daytime_consumption).toLocaleString()}</td>
                  <td>{Math.round(totals.pv_production).toLocaleString()}</td>
                  <td>{Math.round(totals.planned_pv_production).toLocaleString()}</td>
                  <td>{Math.round(totals.energy_production_turbine).toLocaleString()}</td>
                  <td>{Math.round(totals.energy_production_diesel_generator).toLocaleString()}</td>
                  <td style={{ textAlign: 'center' }}>-</td>
                  <td style={{ textAlign: 'center' }}>-</td>
                  <td style={{ textAlign: 'center' }}>-</td>
                  <td style={{ textAlign: 'center' }}>-</td>
                  <td style={{ textAlign: 'center' }}>-</td>
                  <td></td>
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
            {dirtyDays.size > 0 && !isCustomerOnly && (
              <span className={classes.dirtyIndicator}>
                {dirtyDays.size} day{dirtyDays.size > 1 ? 's' : ''} modified
              </span>
            )}
            <button className={classes.templateBtn} onClick={handleExportReport}>Export Report</button>
            {!isCustomerOnly && (
              <button
                className={classes.saveBtn}
                onClick={handleSave}
                disabled={saving}
                title="Submitting this report will email the customer that a new report is available."
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

      {/* History Drawer */}
      {historyPanel && (
        <>
          <div className={classes.drawerOverlay} onClick={() => setHistoryPanel(null)} />
          <div className={classes.drawer}>
            <div className={classes.drawerHeader}>
              <div className={classes.drawerHeaderText}>
                <h3>Edit History</h3>
                <p>Day {historyPanel.day} &middot; {MONTHS[selectedMonth - 1]} {selectedYear}{activeSite ? ` · ${activeSite}` : ''}</p>
              </div>
              <button type="button" className={classes.drawerClose} onClick={() => setHistoryPanel(null)}>
                <svg viewBox="0 0 20 20" fill="currentColor" width="18" height="18">
                  <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </button>
            </div>

            <div className={classes.drawerBody}>
              {(notesByDay[historyPanel.day] || []).length === 0 ? (
                <div className={classes.emptyHistory}>
                  <div className={classes.emptyHistoryIcon}>
                    <svg viewBox="0 0 48 48" fill="none" width="52" height="52">
                      <circle cx="24" cy="24" r="20" stroke="#e2e8f0" strokeWidth="2.5" />
                      <path d="M24 14v10l6 4" stroke="#cbd5e1" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </div>
                  <p className={classes.emptyHistoryTitle}>No edit history</p>
                  <span className={classes.emptyHistoryText}>This day&apos;s data has not been manually edited since it was first uploaded.</span>
                </div>
              ) : (
                <div className={classes.historyList}>
                  {(notesByDay[historyPanel.day] || []).map((n, i) => (
                    <div key={i} className={classes.historyItem}>
                      <div className={classes.historyAvatar} style={{ background: avatarColor(n.edited_by) }}>
                        {n.edited_by.charAt(0).toUpperCase()}
                      </div>
                      <div className={classes.historyContent}>
                        <div className={classes.historyMeta}>
                          <strong className={classes.historyEditor}>{n.edited_by}</strong>
                          <time className={classes.historyTime}>{formatNoteDate(n.created_at)}</time>
                        </div>
                        <p className={classes.historyNote}>{n.note}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {/* Note Modal */}
      {noteModalOpen && (
        <div
          className={classes.modalOverlay}
          onClick={(e) => { if (e.target === e.currentTarget && !noteSubmitting) setNoteModalOpen(false); }}
        >
          <div className={classes.noteModal}>
            <div className={classes.noteModalHeader}>
              <div className={classes.noteModalHeaderIcon}>
                <svg viewBox="0 0 20 20" fill="currentColor" width="20" height="20">
                  <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                </svg>
              </div>
              <div>
                <h3>Edit Report</h3>
                <p>Customers will see this note alongside the updated data.</p>
              </div>
            </div>

            {dirtyDaysSorted.length > 0 && (
              <div className={classes.affectedDays}>
                <svg viewBox="0 0 20 20" fill="currentColor" width="13" height="13" style={{ flexShrink: 0, marginTop: 1 }}>
                  <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
                </svg>
                <span>
                  <strong>{dirtyDaysSorted.length} day{dirtyDaysSorted.length > 1 ? 's' : ''} modified:</strong>{' '}
                  Day {dirtyDaysSorted.join(', Day ')}
                </span>
              </div>
            )}

            <div className={classes.noteModalBody}>
              <label className={classes.noteModalLabel}>
                Reason for edit <span className={classes.noteModalRequired}>*</span>
              </label>
              <textarea
                className={`${classes.noteModalTextarea}${noteError ? ` ${classes.noteModalTextareaError}` : ''}`}
                placeholder="e.g. Updated PV production values for days 3–7 based on corrected meter readings from the site engineer's report."
                value={pendingNote}
                onChange={(e) => {
                  if (e.target.value.length <= MAX_NOTE) {
                    setPendingNote(e.target.value);
                    if (noteError) setNoteError('');
                  }
                }}
                autoFocus
                rows={5}
              />
              <div className={classes.noteModalMeta}>
                {noteError ? (
                  <p className={classes.noteModalError}>
                    <svg viewBox="0 0 20 20" fill="currentColor" width="13" height="13" style={{ flexShrink: 0 }}>
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                    {noteError}
                  </p>
                ) : (
                  <p className={classes.noteModalHint}>This note will be visible to the customer, and they will be emailed that a new report is available.</p>
                )}
                <span className={`${classes.charCount}${pendingNote.length > MAX_NOTE * 0.9 ? ` ${classes.charCountWarn}` : ''}`}>
                  {pendingNote.length}/{MAX_NOTE}
                </span>
              </div>
            </div>

            <div className={classes.noteModalFooter}>
              <button className={classes.noteModalCancel} onClick={() => setNoteModalOpen(false)} disabled={noteSubmitting}>
                Cancel
              </button>
              <button
                className={classes.noteModalSubmit}
                onClick={handleConfirmSave}
                disabled={noteSubmitting || !pendingNote.trim()}
                title="Submitting this edit will email the customer that a new report is available."
              >
                {noteSubmitting ? (<><span className={classes.spinner} />Saving...</>) : 'Save Edit'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}