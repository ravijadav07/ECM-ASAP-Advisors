// GST 2B Reconciliation — sales status, GSTR-2B state, and bucket assignment.
// Implements the explicit lookup table from the PRD.

export const SALES_STATUS = {
  'cc-not-allocated': { label: 'Cost Centre Not Allocated', tone: 'red' },
  'sales-pending': { label: 'Sales Bill Pending', tone: 'amber' },
  'sales-found': { label: 'Sales Bill Found', tone: 'green' },
};

export const GSTR2B_STATE = {
  reconciled: { label: 'Reconciled — GSTR-2B', tone: 'green' },
  'needs-review': { label: 'Reconciled — Needs Review', tone: 'orange' },
  'not-available': { label: 'Not Available in GSTR-2B', tone: 'red' },
};

// 4 explicit cases, not an implicit else.
// Tally now returns a "Sales Status" column directly — use it first.
export function computeSalesStatus(row) {
  const raw = findField(row, ['sales status', 'sales_status']);
  if (raw) {
    const s = raw.toUpperCase();
    if (/NOT.*ALLOCATED|NOT.*ALLOC|NO.*CC|MISSING.*CC/i.test(s)) return 'cc-not-allocated';
    if (/PENDING|NOT.*RAISED|NOT.*BILLED/i.test(s)) return 'sales-pending';
    if (/FOUND|BILLED|RAISED|SALES.*BILL/i.test(s)) return 'sales-found';
  }
  // Fallback: compute from cost centre + sales invoice fields
  const cc = findField(row, ['cost centre', 'costcentre', 'cost center', 'job', 'cc']);
  const salesInv = findField(row, ['sales invoice no', 'sales bill no', 'sales invoice', 'bill no', 'sales invoice number', 'sale invoice']);
  if (!cc) return 'cc-not-allocated'; // cases 1 & 2
  if (!salesInv) return 'sales-pending'; // case 3
  return 'sales-found'; // case 4
}

/** Find the first non-empty value for a field by fuzzy-matching row keys.
 *  Returns '' if not found. */
function findField(row, searchTerms) {
  if (!row || typeof row !== 'object') return '';
  const keys = Object.keys(row);
  for (const term of searchTerms) {
    for (const k of keys) {
      if (k.toLowerCase().includes(term)) {
        const v = row[k];
        if (v !== null && v !== undefined && String(v).trim() !== '') return String(v).trim();
      }
    }
  }
  return '';
}

/** Extract a numeric value for a field by fuzzy-matching row keys. */
export function findNumberField(row, searchTerms) {
  if (!row || typeof row !== 'object') return 0;
  const keys = Object.keys(row);
  for (const term of searchTerms) {
    for (const k of keys) {
      if (k.toLowerCase().includes(term)) {
        const n = parseFloat(String(row[k] ?? '').replace(/[^0-9.-]/g, ''));
        if (Number.isFinite(n)) return n;
      }
    }
  }
  return 0;
}

// Match state depends on GSTR-2B matching. Rows not in the uploaded 2B JSON → not-available.
export function computeGstr2bState(row) {
  const t = (row.gstr2bTier || '').toLowerCase();
  if (t === 'exact' || t === 'near') return 'reconciled';
  if (t === 'probable') return 'needs-review';
  return 'not-available'; // unmatched or no 2B data → not in GSTR-2B
}

// Explicit bucket lookup — no nested if/else fall-through
export function computeBucket(gstr2bState, salesStatus) {
  if (gstr2bState === 'needs-review') return 'hold';
  if (gstr2bState === 'not-available') return 'C';
  // reconciled
  if (salesStatus === 'sales-found') return 'A';
  return 'B'; // sales-pending or cc-not-allocated both → B
}

// Whether the row has a data-gap (cost centre not allocated)
export function hasDataGap(salesStatus) {
  return salesStatus === 'cc-not-allocated';
}