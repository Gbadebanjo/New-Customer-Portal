'use client';
import ClipLoader from 'react-spinners/ClipLoader';

/**
 * The ONE full-screen loader for the app. Used by:
 *   - app/loading.js — Next.js Suspense fallback for route transitions
 *   - Screens that gate long-running loads (PlannedVsActual, AlertsTable,
 *     EditableReportTable, etc.)
 *
 * Design intent: brand coral spinner on a dim backdrop that dims the
 * page underneath instead of clearing it. Non-blocking-looking, one
 * consistent visual whether the loader fires for a route change or an
 * in-page refresh.
 */
export default function PageLoader() {
  return (
    <div
      role="status"
      aria-label="Loading"
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0, 0, 0, 0.55)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
      }}
    >
      <ClipLoader color="#ff7d70" size={72} />
    </div>
  );
}
