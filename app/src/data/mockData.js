// Demo mock data — Indian C&F context (ECM / L&T). Frontend-only POC.
// Reconciliation logic is stubbed (Phase B) — these rows represent a "already-run" result.

/* ============================ MODULE 2 — REIMBURSEMENT AUDIT ============================ */

// One row = one reimbursable expense head on one job (cost centre).
// status: 'fully' | 'not-billed' | 'short' | 'over' | 'pending'
export const reimbursementRows = [
  { id: 'R1', costCentre: 'CC-4471', customer: 'L&T (Mumbai)', head: 'Cargo Insurance', incurred: 35000, recovered: 35000, status: 'fully', date: '2026-06-18' },
  { id: 'R2', costCentre: 'CC-4471', customer: 'L&T (Mumbai)', head: 'Freight', incurred: 120000, recovered: 120000, status: 'fully', date: '2026-06-18' },
  { id: 'R3', costCentre: 'CC-4472', customer: 'L&T (Mumbai)', head: 'Cargo Insurance', incurred: 35000, recovered: 0, status: 'not-billed', date: '2026-06-24' },
  { id: 'R4', costCentre: 'CC-4472', customer: 'L&T (Mumbai)', head: 'Port & Terminal', incurred: 28000, recovered: 0, status: 'not-billed', date: '2026-06-24' },
  { id: 'R5', costCentre: 'CC-4473', customer: 'Reliance (Navi Mumbai)', head: 'Cargo Insurance', incurred: 40000, recovered: 32000, status: 'short', date: '2026-06-30' },
  { id: 'R6', costCentre: 'CC-4474', customer: 'L&T (Mumbai)', head: 'Freight', incurred: 95000, recovered: 95000, status: 'fully', date: '2026-07-02' },
  { id: 'R7', costCentre: 'CC-4474', customer: 'L&T (Mumbai)', head: 'Transit Insurance', incurred: 18000, recovered: 19500, status: 'over', date: '2026-07-02' },
  { id: 'R8', costCentre: 'CC-4475', customer: 'Adani Ports (Mundra)', head: 'Freight', incurred: 150000, recovered: 0, status: 'not-billed', date: '2026-07-06' },
  { id: 'R9', costCentre: 'CC-4476', customer: 'Tata Steel (Jamshedpur)', head: 'Port & Terminal', incurred: 45000, recovered: 45000, status: 'fully', date: '2026-07-08' },
  { id: 'R10', costCentre: 'CC-4476', customer: 'Tata Steel (Jamshedpur)', head: 'Cargo Insurance', incurred: 22000, recovered: 22000, status: 'fully', date: '2026-07-08' },
  { id: 'R11', costCentre: 'CC-4477', customer: 'L&T (Mumbai)', head: 'Cargo Insurance', incurred: 38000, recovered: 24000, status: 'short', date: '2026-07-11' },
  { id: 'R12', costCentre: 'CC-4478', customer: 'Reliance (Navi Mumbai)', head: 'Freight', incurred: 88000, recovered: 0, status: 'not-billed', date: '2026-07-14' },
  { id: 'R13', costCentre: 'CC-4478', customer: 'Reliance (Navi Mumbai)', head: 'Sundry Charges', incurred: 4500, recovered: 0, status: 'not-billed', date: '2026-07-14' },
  { id: 'R14', costCentre: 'CC-4479', customer: 'Wipro (Bengaluru)', head: 'Cargo Insurance', incurred: 42000, recovered: 0, status: 'pending', date: '2026-07-18' },
  { id: 'R15', costCentre: 'CC-4479', customer: 'Wipro (Bengaluru)', head: 'Freight', incurred: 67000, recovered: 0, status: 'pending', date: '2026-07-18' },
  { id: 'R16', costCentre: 'CC-4480', customer: 'L&T (Mumbai)', head: 'Port & Terminal', incurred: 31000, recovered: 0, status: 'pending', date: '2026-07-21' },
  { id: 'R17', costCentre: 'CC-4481', customer: 'Adani Ports (Mundra)', head: 'Transit Insurance', incurred: 16000, recovered: 16000, status: 'fully', date: '2026-07-22' },
  { id: 'R18', costCentre: 'CC-4482', customer: 'L&T (Mumbai)', head: 'Sundry Charges', incurred: 6000, recovered: 6400, status: 'over', date: '2026-07-25' },
];

export function reimbursementSummary() {
  const notBilled = reimbursementRows.filter((r) => r.status === 'not-billed');
  const short = reimbursementRows.filter((r) => r.status === 'short');
  const pending = reimbursementRows.filter((r) => r.status === 'pending');
  const incurred = reimbursementRows.reduce((s, r) => s + r.incurred, 0);
  const recovered = reimbursementRows.reduce((s, r) => s + r.recovered, 0);
  const notBilledValue = notBilled.reduce((s, r) => s + r.incurred, 0);
  const shortfallValue = short.reduce((s, r) => s + (r.incurred - r.recovered), 0);
  return {
    incurred,
    recovered,
    headline: notBilledValue + shortfallValue,
    notBilledCount: notBilled.length,
    notBilledValue,
    shortfallValue,
    pendingCount: pending.length,
  };
}

// Expense-head leak ranking (for the "which heads leak most" view)
export const leakByHead = [
  { head: 'Freight', leaked: 238000, count: 3 },
  { head: 'Cargo Insurance', leaked: 52000, count: 3 },
  { head: 'Port & Terminal', leaked: 28000, count: 1 },
  { head: 'Sundry Charges', leaked: 4500, count: 1 },
  { head: 'Transit Insurance', leaked: 0, count: 0 },
];

/* ============================ MODULE 1 — GST 2B RECO ============================ */
// Real data from ECM Tally export (June 2026). Each row is a purchase register line item.
// Tier derived: empty GSTIN → 'unmatched', Debit Note → 'probable', else → 'exact'.
export { gst2bRows } from './gst2b_generated';

// Carry-forward register
export const carryForward = {
  parked: [
    { id: 'CF1', supplier: 'Maersk Line India Pvt Ltd', invoice: 'MLI/INV/09002', taxable: 380000, tax: 68400, pendingSale: 'L&T INV/EXP/0452', since: '2026-07-12', job: 'CC-4479' },
    { id: 'CF2', supplier: 'Gateway Terminals India', invoice: 'GTI-4521', taxable: 210000, tax: 37800, pendingSale: 'L&T INV/EXP/0455', since: '2026-07-14', job: 'CC-4480' },
    { id: 'CF3', supplier: 'Adani Logistics Ltd', invoice: 'AL-2026-1204', taxable: 175000, tax: 31500, pendingSale: 'Reliance INV/EXP/0231', since: '2026-07-16', job: 'CC-4478' },
  ],
  released: [
    { id: 'CF4', supplier: 'Bharat Cargo Movers', invoice: 'BCM/771', taxable: 120000, tax: 21600, releasedOn: '2026-07-09', saleInvoice: 'L&T INV/EXP/0447', job: 'CC-4471' },
    { id: 'CF5', supplier: 'Adani Logistics Ltd', invoice: 'AL-2026-1187', taxable: 150000, tax: 27000, releasedOn: '2026-07-10', saleInvoice: 'L&T INV/EXP/0448', job: 'CC-4472' },
  ],
};

/* ============================ MODULE 3 — 26AS MATCHING ============================ */

// status: 'matched' | 'short' | 'absent-in-26as' | 'excess' | 'absent-in-books' | 'timing'
export const as26Rows = [
  { id: 'A1', deductor: 'Larsen & Toubro Ltd', tan: 'MUML00451A', books: 425000, as26: 425000, quarter: 'Q1 FY26', status: 'matched', nameMatch: false },
  { id: 'A2', deductor: 'Reliance Industries Ltd', tan: 'MUML02233B', books: 186000, as26: 156000, quarter: 'Q1 FY26', status: 'short', nameMatch: false },
  { id: 'A3', deductor: 'Adani Ports & SEZ Ltd', tan: 'AHMG03342C', books: 94000, as26: 94000, quarter: 'Q1 FY26', status: 'matched', nameMatch: false },
  { id: 'A4', deductor: 'Tata Steel Ltd', tan: 'JMST04458D', books: 72000, as26: 0, quarter: 'Q1 FY26', status: 'absent-in-26as', nameMatch: false },
  { id: 'A5', deductor: 'Wipro Ltd', tan: 'BLRW05571E', books: 48000, as26: 61500, quarter: 'Q1 FY26', status: 'excess', nameMatch: false },
  { id: 'A6', deductor: 'Infosys Ltd', tan: 'BLRI06682F', books: 0, as26: 38000, quarter: 'Q1 FY26', status: 'absent-in-books', nameMatch: false },
  { id: 'A7', deductor: 'L&T Heavy Engineering', tan: 'MUML07793G', books: 132000, as26: 98000, quarter: 'Q1 FY26', status: 'timing', nameMatch: true },
  { id: 'A8', deductor: 'KEC International', tan: 'MUML08814H', books: 56000, as26: 56000, quarter: 'Q1 FY26', status: 'matched', nameMatch: false },
  { id: 'A9', deductor: 'Sterlite Technologies', tan: 'PUNS09925I', books: 64000, as26: 44000, quarter: 'Q1 FY26', status: 'short', nameMatch: true },
];

// Book invoices backing a deductor (supporting detail for drill-down)
export const as26BookInvoices = {
  MUML02233B: [
    { invoice: 'EXP/INV/0311', date: '2026-04-12', gross: 420000, tds: 42000 },
    { invoice: 'EXP/INV/0328', date: '2026-05-02', gross: 380000, tds: 38000 },
    { invoice: 'EXP/INV/0345', date: '2026-05-20', gross: 510000, tds: 51000 },
    { invoice: 'EXP/INV/0361', date: '2026-06-08', gross: 300000, tds: 30000 },
    { invoice: 'EXP/INV/0374', date: '2026-06-24', gross: 250000, tds: 25000 },
  ],
  JMST04458D: [
    { invoice: 'EXP/INV/0330', date: '2026-05-04', gross: 360000, tds: 36000 },
    { invoice: 'EXP/INV/0352', date: '2026-06-01', gross: 360000, tds: 36000 },
  ],
};

export function as26Summary() {
  const books = as26Rows.reduce((s, r) => s + r.books, 0);
  const as26 = as26Rows.reduce((s, r) => s + r.as26, 0);
  return { books, as26, gap: books - as26 };
}

/* ============================ OVERVIEW ============================ */
export const overviewBuckets = [
  { id: 'statutory', label: 'Statutory', description: 'TDS reports, GST 2B reconciliation and 26AS matching.', built: 2, total: 3 },
  { id: 'audit', label: 'Audit', description: 'Reimbursement audit and income & expenditure audit.', built: 1, total: 2 },
  { id: 'bill-tracking', label: 'Bill Tracking', description: 'Full L&T document flow and the Cosmos report for L&T.', built: 0, total: 2 },
  { id: 'others', label: 'Others', description: 'Invoice printing, bank payment upload and outstanding reports.', built: 0, total: 3 },
];