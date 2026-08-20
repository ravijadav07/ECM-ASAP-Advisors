// GSTR-2B portal JSON parsing + matching against the Tally purchase register.
// The portal JSON is the standard GSTR-2B download: data.docdata.b2b[] (and cdnr[]),
// each supplier carrying ctin (GSTIN), trdnm, and an inv[] / nt[] array of documents.
// We flatten those to portal invoices, then match each Tally purchase row to one by
// GSTIN + invoice number + tax value, yielding an exact / near / probable / (unmatched)
// tier that drives the A/B/C bucketing in gst2b.js.

const TAX_TOLERANCE = 2; // ₹ — rounding differences between books and portal

const normTight = (s) => String(s ?? '').toUpperCase().replace(/\s+/g, '');
const normLoose = (s) => String(s ?? '').toUpperCase().replace(/[^A-Z0-9]/g, '');
const toNum = (v) => {
  const n = parseFloat(String(v ?? '').replace(/[^0-9.\-]/g, ''));
  return Number.isFinite(n) ? n : 0;
};

const sumTax = (o) => toNum(o.igst) + toNum(o.cgst) + toNum(o.sgst) + toNum(o.cess);

/**
 * Flatten a parsed GSTR-2B portal JSON into a flat list of portal documents.
 * Accepts the raw object ({ data: { docdata: {...} } }) or an already-unwrapped docdata.
 */
export function flattenPortal2b(json) {
  if (!json || typeof json !== 'object') return { period: '', docs: [] };
  const data = json.data || json;
  const doc = data.docdata || {};
  const period = data.rtnprd || '';
  const docs = [];

  (doc.b2b || []).forEach((sup) => {
    (sup.inv || []).forEach((inv) => {
      docs.push({
        gstin: sup.ctin, supplier: sup.trdnm, invNo: inv.inum, date: inv.dt,
        taxable: toNum(inv.txval), tax: sumTax(inv),
        igst: toNum(inv.igst), cgst: toNum(inv.cgst), sgst: toNum(inv.sgst),
        itcAvailable: inv.itcavl === 'Y', supFiledDate: sup.supfildt, supPeriod: sup.supprd,
        kind: 'invoice',
      });
    });
  });
  (doc.cdnr || []).forEach((sup) => {
    (sup.nt || []).forEach((nt) => {
      docs.push({
        gstin: sup.ctin, supplier: sup.trdnm, invNo: nt.ntnum, date: nt.dt,
        taxable: toNum(nt.txval), tax: sumTax(nt),
        igst: toNum(nt.igst), cgst: toNum(nt.cgst), sgst: toNum(nt.sgst),
        itcAvailable: true, supFiledDate: sup.supfildt, supPeriod: sup.supprd,
        kind: 'note',
      });
    });
  });
  return { period, docs };
}

/** Build a GSTIN → portal docs index for fast lookup. */
function indexByGstin(docs) {
  const idx = new Map();
  docs.forEach((d) => {
    const key = normTight(d.gstin);
    if (!idx.has(key)) idx.set(key, []);
    idx.get(key).push(d);
  });
  return idx;
}

/**
 * Match one Tally purchase row against the portal index.
 * Returns { tier: 'exact'|'near'|'probable'|'', match: portalDoc|null }.
 *  - exact    : GSTIN + invoice number match, tax within tolerance
 *  - near     : GSTIN + invoice number match, tax differs (value mismatch — review)
 *  - probable : GSTIN + tax value match, invoice number differs
 *  - ''       : no candidate for this GSTIN, or nothing matched → not in GSTR-2B
 */
export function matchRow(row, gstinIndex) {
  const gstin = normTight(row.gstin);
  const cands = gstinIndex.get(gstin);
  if (!cands || cands.length === 0) return { tier: '', match: null };

  const invTight = normTight(row.invoice);
  const invLoose = normLoose(row.invoice);
  const tax = toNum(row.tax);

  // Pass 1 — invoice-number match
  for (const c of cands) {
    if (invTight && (normTight(c.invNo) === invTight || normLoose(c.invNo) === invLoose)) {
      return { tier: Math.abs(c.tax - tax) <= TAX_TOLERANCE ? 'exact' : 'near', match: c };
    }
  }
  // Pass 2 — value match (invoice number differs / keyed wrong)
  const taxable = toNum(row.taxable);
  for (const c of cands) {
    if (Math.abs(c.tax - tax) <= TAX_TOLERANCE && Math.abs(c.taxable - taxable) <= 1) {
      return { tier: 'probable', match: c };
    }
  }
  return { tier: '', match: null };
}

/**
 * Match every Tally row against the portal docs. Returns new rows with `gstr2bTier`
 * set (and `_portalMatch` attached) plus summary counts.
 */
export function reconcileWithPortal(rows, portalDocs) {
  const idx = indexByGstin(portalDocs);
  const counts = { exact: 0, near: 0, probable: 0, unmatched: 0 };
  const matched = rows.map((r) => {
    const { tier, match } = matchRow(r, idx);
    if (tier === 'exact') counts.exact += 1;
    else if (tier === 'near') counts.near += 1;
    else if (tier === 'probable') counts.probable += 1;
    else counts.unmatched += 1;
    return { ...r, gstr2bTier: tier, _portalMatch: match };
  });
  return { rows: matched, counts };
}
