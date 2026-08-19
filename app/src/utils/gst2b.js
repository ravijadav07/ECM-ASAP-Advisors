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

/** Normalize an invoice number for matching — strips special chars, uppercases. */
function normalizeInv(s) {
  return String(s || '').replace(/[\s/-]+/g, '').toUpperCase();
}

/** Extract flat invoice records from GSTR-2B JSON. Handles varying portal structures. */
function extractGstr2bInvoices(raw) {
  const records = [];
  if (!raw) return records;
  try {
    // Common GST portal format: data.docData.b2b[]
    const b2b = raw?.data?.docData?.b2b || raw?.data?.b2b || raw?.b2b || [];
    for (const supplier of b2b) {
      const gstin = (supplier.ctin || supplier.gstin || '').trim();
      const invs = supplier.inv || supplier.invoices || [];
      for (const inv of invs) {
        records.push({
          gstin,
          invoice: inv.inum || inv.invoice || '',
          date: inv.idt || inv.date || '',
          taxable: parseFloat(inv.val || inv.taxable || inv.value || 0) || 0,
        });
      }
    }
    // Also check flat structures
    if (records.length === 0 && Array.isArray(raw)) {
      for (const r of raw) {
        records.push({
          gstin: (r.ctin || r.gstin || '').trim(),
          invoice: r.inum || r.invoice || '',
          date: r.idt || r.date || '',
          taxable: parseFloat(r.val || r.taxable || 0) || 0,
        });
      }
    }
  } catch { /* ignore parse errors */ }
  return records;
}

/**
 * Match purchase rows against GSTR-2B data using tiered matching.
 * Returns new rows with updated gstr2bTier.
 */
export function matchAgainstGstr2b(purchaseRows, gstr2bData) {
  const records = extractGstr2bInvoices(gstr2bData);
  if (records.length === 0) return purchaseRows; // no 2B data → keep current tiers

  // Build lookup: GSTIN + normalized invoice → records
  const lookup = new Map();
  for (const rec of records) {
    const key = rec.gstin + '|' + normalizeInv(rec.invoice);
    if (!lookup.has(key)) lookup.set(key, []);
    lookup.get(key).push(rec);
  }

  return purchaseRows.map((row) => {
    const gstin = (row.gstin || '').trim();
    const inv = normalizeInv(row.invoice || row.invoiceMatchKey || '');
    const candidates = lookup.get(gstin + '|' + inv) || [];

    if (candidates.length === 0) return { ...row, gstr2bTier: 'unmatched' };

    // Exact: GSTIN + invoice + date + value match
    const dateStr = (row.supplierInvoiceDate || row.date || '').trim();
    const exact = candidates.find((r) => {
      const dMatch = r.date === dateStr || (!r.date && !dateStr);
      const vMatch = Math.abs((r.taxable || 0) - (row.taxable || 0)) < 0.50;
      return dMatch && vMatch;
    });
    if (exact) return { ...row, gstr2bTier: 'exact' };

    // Near: GSTIN + invoice + date match, value within tolerance
    const near = candidates.find((r) => r.date === dateStr || (!r.date && !dateStr));
    if (near) return { ...row, gstr2bTier: 'near' };

    // Probable: GSTIN + invoice match, date/value differ
    return { ...row, gstr2bTier: 'probable' };
  });
}