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
 * Accepts the raw object ({ data: { docdata: {...} } }), unwrapped docdata, or direct b2b array.
 */
export function flattenPortal2b(json) {
  if (!json || typeof json !== 'object') return { period: '', docs: [] };
  const data = json.data || json;
  const doc = data.docdata || (data.b2b ? data : (json.docdata || json));
  const period = data.rtnprd || json.rtnprd || '';
  const docs = [];

  const b2bList = doc.b2b || data.b2b || json.b2b || [];
  b2bList.forEach((sup) => {
    (sup.inv || []).forEach((inv) => {
      let taxable = toNum(inv.txval || inv.val);
      let igst = toNum(inv.igst);
      let cgst = toNum(inv.cgst);
      let sgst = toNum(inv.sgst);
      let cess = toNum(inv.cess);

      // Handle item-level breakdown if present
      if (Array.isArray(inv.items) && inv.items.length > 0) {
        let sumTxval = 0;
        let sumIgst = 0;
        let sumCgst = 0;
        let sumSgst = 0;
        let sumCess = 0;
        inv.items.forEach((it) => {
          const d = it.itm_det || it;
          sumTxval += toNum(d.txval);
          sumIgst += toNum(d.igst ?? d.iamt);
          sumCgst += toNum(d.cgst ?? d.camt);
          sumSgst += toNum(d.sgst ?? d.samt);
          sumCess += toNum(d.cess ?? d.csamt);
        });
        if (taxable === 0 && sumTxval > 0) taxable = sumTxval;
        if (igst === 0 && sumIgst > 0) igst = sumIgst;
        if (cgst === 0 && sumCgst > 0) cgst = sumCgst;
        if (sgst === 0 && sumSgst > 0) sgst = sumSgst;
        if (cess === 0 && sumCess > 0) cess = sumCess;
      }

      const tax = igst + cgst + sgst + cess;
      docs.push({
        gstin: sup.ctin,
        supplier: sup.trdnm,
        invNo: inv.inum,
        date: inv.dt,
        taxable,
        tax,
        igst,
        cgst,
        sgst,
        itcAvailable: inv.itcavl === 'Y' || inv.itcavl === true || inv.itcavl === undefined,
        supFiledDate: sup.supfildt,
        supPeriod: sup.supprd,
        kind: 'invoice',
      });
    });
  });

  const cdnrList = doc.cdnr || data.cdnr || json.cdnr || [];
  cdnrList.forEach((sup) => {
    (sup.nt || []).forEach((nt) => {
      let taxable = toNum(nt.txval || nt.val);
      let igst = toNum(nt.igst);
      let cgst = toNum(nt.cgst);
      let sgst = toNum(nt.sgst);
      let cess = toNum(nt.cess);

      if (Array.isArray(nt.items) && nt.items.length > 0) {
        let sumTxval = 0;
        let sumIgst = 0;
        let sumCgst = 0;
        let sumSgst = 0;
        let sumCess = 0;
        nt.items.forEach((it) => {
          const d = it.itm_det || it;
          sumTxval += toNum(d.txval);
          sumIgst += toNum(d.igst ?? d.iamt);
          sumCgst += toNum(d.cgst ?? d.camt);
          sumSgst += toNum(d.sgst ?? d.samt);
          sumCess += toNum(d.cess ?? d.csamt);
        });
        if (taxable === 0 && sumTxval > 0) taxable = sumTxval;
        if (igst === 0 && sumIgst > 0) igst = sumIgst;
        if (cgst === 0 && sumCgst > 0) cgst = sumCgst;
        if (sgst === 0 && sumSgst > 0) sgst = sumSgst;
        if (cess === 0 && sumCess > 0) cess = sumCess;
      }

      const tax = igst + cgst + sgst + cess;
      docs.push({
        gstin: sup.ctin,
        supplier: sup.trdnm,
        invNo: nt.ntnum,
        date: nt.dt,
        taxable,
        tax,
        igst,
        cgst,
        sgst,
        itcAvailable: true,
        supFiledDate: sup.supfildt,
        supPeriod: sup.supprd,
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
  // Extract GSTIN from standard or Tally raw columns
  const rawGstin = row.gstin || row['Party GSTIN/UIN'] || row['GSTIN/UIN'] || row['GSTIN'] || row['Party GSTIN'] || row.partyGstin || '';
  const gstin = normTight(rawGstin);
  const cands = gstinIndex.get(gstin);
  if (!cands || cands.length === 0) return { tier: '', match: null };

  const rawInv = row.invoice || row['Supplier Invoice No.'] || row['Supplier Invoice No'] || row['Supplier Invoice Number'] || row['Vch No.'] || row['Vch No'] || row['Invoice No.'] || row['Invoice No'] || row.invoiceNo || '';
  const invTight = normTight(rawInv);
  const invLoose = normLoose(rawInv);

  const tax = toNum(
    row._tax !== undefined ? row._tax : (
      row.tax || row['Tax Amount'] || row['TaxAmount'] || row['Total Tax'] || row['TotalTax'] || row['Tax']
    )
  );

  const taxable = toNum(
    row.taxable !== undefined ? row.taxable : (
      row['Taxable Amount'] || row['TaxableAmount'] || row['Taxable Value'] || row['TaxableValue'] || row['Taxable']
    )
  );

  // Pass 1 — invoice-number match
  for (const c of cands) {
    const cTight = normTight(c.invNo);
    const cLoose = normLoose(c.invNo);
    if (invTight && (cTight === invTight || cLoose === invLoose)) {
      return { tier: Math.abs(c.tax - tax) <= TAX_TOLERANCE ? 'exact' : 'near', match: c };
    }
  }

  // Pass 2 — value match (invoice number differs / keyed differently)
  for (const c of cands) {
    if (Math.abs(c.tax - tax) <= TAX_TOLERANCE && Math.abs(c.taxable - taxable) <= 2) {
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
