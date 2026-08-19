// Map Tally OS V3 template responses to the dashboard's row format.
// The exact response schema varies, so these mappers are defensive —
// they extract the data array and read fields via multiple fallback names.

/** Extract a plain array of records from a Tally response (handles wrappers). */
function extractArray(raw) {
  if (!raw) return [];
  if (Array.isArray(raw)) {
    // Tally sometimes wraps rows as [{ "Json Agg": "..." }]
    if (raw.length > 0 && raw[0] && typeof raw[0] === 'object' && 'Json Agg' in raw[0]) {
      try {
        const parsed = JSON.parse(raw[0]['Json Agg']);
        return Array.isArray(parsed) ? parsed : [];
      } catch {
        return [];
      }
    }
    return raw;
  }
  if (typeof raw === 'object') {
    // Try common wrapper keys
    for (const key of ['content', 'data', 'rows', 'result', 'records', 'items', 'Data', 'Rows', 'Result']) {
      if (Array.isArray(raw[key])) return raw[key];
    }
    // Sometimes a single nested object
    return [raw];
  }
  return [];
}

/** Read a field value using a list of candidate keys. Skips empty/null values. */
function pick(row, keys) {
  if (!row || typeof row !== 'object') return '';
  for (const k of keys) {
    const v = row[k];
    if (v !== undefined && v !== null && String(v).trim() !== '') return v;
  }
  return '';
}

function num(row, keys) {
  const v = pick(row, keys);
  const n = parseFloat(String(v ?? '').replace(/[^0-9.-]/g, ''));
  return Number.isFinite(n) ? n : 0;
}

/** Map template 44 (GSTR-2B reconciliation) response → purchase rows. */
export function mapGst2bRows(raw) {
  const data = extractArray(raw);
  return data.map((r, i) => ({
    id: `G${i + 1}`,
    date: pick(r, ['Date', 'date', 'VoucherDate', 'Voucher Date']),
    supplier: pick(r, ['Particulars', 'Supplier', 'Supplier Name', 'Party', 'party', 'supplier']),
    gstin: pick(r, ['Party GSTIN/UIN', 'GSTIN', 'Gstin', 'gstin', 'PartyGSTIN']),
    vchType: pick(r, ['Vch Type', 'Voucher Type', 'VoucherType', 'vchType']),
    vchNo: pick(r, ['Vch No.', 'Voucher No', 'VoucherNo', 'VchNo', 'vchNo']),
    taxable: num(r, ['Taxable Amount', 'TaxableAmount', 'Taxable', 'taxable']),
    igst: num(r, ['IGST', 'igst', 'IGST Amount', 'Igst']),
    cgst: num(r, ['CGST', 'cgst', 'CGST Amount', 'Cgst']),
    sgst: num(r, ['SGST/UTGST', 'SGST', 'sgst', 'SGST Amount', 'Sgst', 'UTGST', 'utgst']),
    cess: num(r, ['Cess', 'cess', 'Cess Amount']),
    tax: num(r, ['Tax Amount', 'TaxAmount', 'Tax', 'tax']),
    costCentre: pick(r, ['CostCentre', 'Cost Centre', 'costCentre', 'cost_centre']),
    salesInvoiceDate: pick(r, ['Sales Invoice Date', 'SalesInvoiceDate', 'salesInvoiceDate']),
    salesInvoiceNo: pick(r, ['Sales Invoice No.', 'Sales Invoice No', 'SalesInvoiceNo', 'salesInvoiceNo']),
    salesParty: pick(r, ['Sales Party', 'SalesParty', 'Customer', 'customer', 'salesParty']),
    invoice: pick(r, ['Supplier Invoice No.', 'Supplier Invoice No', 'SupplierInvoiceNo', 'invoice']),
    supplierInvoiceDate: pick(r, ['Supplier Invoice Date', 'SupplierInvoiceDate', 'supplierInvoiceDate']),
    invoiceMatchKey: pick(r, ['Invoice Match Key', 'InvoiceMatchKey', 'invoiceMatchKey']),
    gstr2bTier: pick(r, ['gstr2bTier', 'MatchTier', 'Match Tier', 'tier']) || '',
  }));
}

/** Map template 45 (Reimbursement audit) response → expense/recovery rows. */
export function mapReimbursementRows(raw) {
  const data = extractArray(raw);
  if (data.length > 0) {
    console.log('[Reimbursement mapper] Raw Tally row keys:', Object.keys(data[0]));
    console.log('[Reimbursement mapper] First raw row:', data[0]);
  }
  return data.map((r, i) => {
    // Tally template 45 columns: Ledger, Cost Centre, Opening Debit, Opening Credit,
    // Transactions Debit, Transactions Credit, Closing Debit, Closing Credit,
    // Later Sales Bill No., Later Sales Bill Date, Audit Status
    const head = pick(r, ['Ledger', 'Ledger Name', 'ledger', 'Particulars', 'Account Name', 'head']);
    const costCentre = pick(r, ['Cost Centre', 'CostCentre', 'costCentre', 'cost_centre']);
    const openingDebit = num(r, ['Opening Debit', 'OpeningDebit', 'opening_debit']);
    const openingCredit = num(r, ['Opening Credit', 'OpeningCredit', 'opening_credit']);
    const incurred = num(r, ['Transactions Debit', 'Transaction Debit', 'TransactionsDebit', 'transactions_debit']);
    const recovered = num(r, ['Transactions Credit', 'Transaction Credit', 'TransactionsCredit', 'transactions_credit']);
    const closingDebit = num(r, ['Closing Debit', 'ClosingDebit', 'closing_debit']);
    const closingCredit = num(r, ['Closing Credit', 'ClosingCredit', 'closing_credit']);
    const salesInvoiceNo = pick(r, ['Later Sales Bill No.', 'Later Sales Bill No', 'LaterSalesBillNo', 'later_sales_bill_no', 'Sales Invoice No.']);
    const salesInvoiceDate = pick(r, ['Later Sales Bill Date', 'LaterSalesBillDate', 'later_sales_bill_date', 'Sales Invoice Date']);
    const auditStatusRaw = pick(r, ['Audit Status', 'AuditStatus', 'audit_status', 'Status', 'status']);

    // Fallback: if transaction columns absent, try generic debit/credit aliases
    let inc = incurred;
    let rec = recovered;
    if (inc === 0 && rec === 0) {
      inc = num(r, ['Debit', 'debit', 'Debit Amount', 'Dr Amount', 'Amount']);
      rec = num(r, ['Credit', 'credit', 'Credit Amount', 'Cr Amount', 'Recovery']);
    }

    const variance = rec - inc;
    // Normalize Audit Status → frontend status key
    const status = normalizeStatus(auditStatusRaw, rec, inc, variance);

    return {
      id: `R${i + 1}`,
      head,
      costCentre,
      customer: pick(r, ['Customer', 'Party', 'customer', 'Party Ledger', 'Sales Party']),
      openingDebit,
      openingCredit,
      incurred: inc,
      recovered: rec,
      closingDebit,
      closingCredit,
      salesInvoiceNo,
      salesInvoiceDate,
      status,
      date: pick(r, ['Date', 'date', 'Later Sales Bill Date', 'Voucher Date']),
    };
  });
}

/** Normalize the Tally "Audit Status" text to the frontend status key. */
function normalizeStatus(raw, recovered, incurred, variance) {
  const s = String(raw || '').trim().toUpperCase();
  if (s) {
    if (/NOT.*BILL|NOT.*BILLED|UNBILLED/.test(s)) return 'not-billed';
    if (/SHORT/.test(s)) return 'short';
    if (/OVER/.test(s)) return 'over';
    if (/PENDING/.test(s)) return 'pending';
    if (/FULLY|FULL|RECOVERED|SETTLED/.test(s)) return 'fully';
  }
  // Derive from amounts if no status
  if (recovered > 0 && Math.abs(variance) <= 10) return 'fully';
  if (recovered > 0 && variance < 0) return 'short';
  if (recovered > 0 && variance > 0) return 'over';
  if (recovered === 0 && incurred > 0) return 'not-billed';
  return 'pending';
}
