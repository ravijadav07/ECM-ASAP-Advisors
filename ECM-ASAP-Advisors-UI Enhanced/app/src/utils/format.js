export const inr = (n) => `₹ ${Number.isFinite(Number(n)) ? Number(n).toLocaleString('en-IN') : '0'}`;

export const inrCompact = (n) => {
  const v = Number.isFinite(Number(n)) ? Number(n) : 0;
  if (Math.abs(v) >= 10000000) return `₹ ${(v / 10000000).toFixed(2)} Cr`;
  if (Math.abs(v) >= 100000) return `₹ ${(v / 100000).toFixed(2)} L`;
  if (Math.abs(v) >= 1000) return `₹ ${(v / 1000).toFixed(1)} K`;
  return `₹ ${v.toLocaleString('en-IN')}`;
};

export const daysSince = (dateStr) => {
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return 0;
  const now = new Date('2026-08-17'); // demo "today" — matches the POC date
  return Math.max(0, Math.floor((now - d) / (1000 * 60 * 60 * 24)));
};

/** Safely format any date value to YYYY-MM-DD — avoids timezone shifts. */
export function formatDate(value) {
  if (!value) return '';
  const s = String(value).trim();
  // Already YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  // ISO timestamp — extract date-only prefix (avoids timezone shift)
  const m = s.match(/^(\d{4}-\d{2}-\d{2})/);
  if (m) return m[1];
  // Fallback: parse and format
  const d = new Date(s);
  if (isNaN(d.getTime())) return '';
  const y = d.getFullYear();
  const mo = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${mo}-${day}`;
}

/** Return the current Indian financial year date range (April 1 → March 31). */
export function getFinancialYearRange(date = new Date()) {
  const year = date.getFullYear();
  const month = date.getMonth(); // 0 = Jan
  let startYear, endYear;
  if (month >= 3) {
    startYear = year;
    endYear = year + 1;
  } else {
    startYear = year - 1;
    endYear = year;
  }
  return {
    fromDate: `${startYear}-04-01`,
    toDate: `${endYear}-03-31`,
    label: `FY ${String(startYear).slice(-2)}-${String(endYear).slice(-2)}`,
  };
}

/** Format a YYYY-MM-DD string to "DD Mon YYYY" for display */
export function fmtDate(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}