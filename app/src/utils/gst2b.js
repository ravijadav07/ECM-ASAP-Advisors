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

// 4 explicit cases, not an implicit else
export function computeSalesStatus(row) {
  if (!row.costCentre) return 'cc-not-allocated'; // cases 1 & 2
  if (!row.salesInvoiceNo) return 'sales-pending'; // case 3
  return 'sales-found'; // case 4
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