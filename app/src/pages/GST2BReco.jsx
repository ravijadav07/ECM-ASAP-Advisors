import { useState, useMemo, useEffect, useRef } from 'react';
import { TicketCheck, Timer, MailWarning, FileQuestion, AlertTriangle, HardDrive, RefreshCw } from 'lucide-react';
import { StatCard, Card, Badge, UploadPanel, FilterBar, SelectFilter } from '../components/ui';
import { DataTable, Modal } from '../components/UiComponents';
import { useView } from '../context/ViewContext';
import { inr, inrCompact, getFinancialYearRange, formatDate } from '../utils/format';
import { computeSalesStatus, computeGstr2bState, computeBucket, hasDataGap, SALES_STATUS } from '../utils/gst2b';
import { flattenPortal2b, reconcileWithPortal } from '../utils/gstr2bMatch';
import { mapGst2bRows, getColumnKeys } from '../utils/tallyMapper';
import { executeTemplate, getTemplateCache, setTemplateCache } from '../services/tallyApi';
import { getTemplate } from '../config/tallyTemplates';
import TallyFetchBar from '../components/TallyFetchBar';

const BUCKET_MAP = {
  A: { tone: 'green', label: 'Credit Available — Claim Now' },
  B: { tone: 'lavender', label: 'Credit Available — Not to Claim Yet' },
  C: { tone: 'amber', label: 'Not Uploaded by Supplier' },
  hold: { tone: 'orange', label: 'Needs Review — Do Not Auto-Bucket' },
};

const TABS_CONFIG = [
  { id: 'all', label: 'All Records' },
  { id: 'A', label: 'Bucket A — Claim Now' },
  { id: 'B', label: 'Bucket B — Deferred' },
  { id: 'C', label: 'Bucket C — Not Uploaded' },
  { id: 'hold', label: 'Needs Review' },
  { id: 'cf', label: 'Carry-Forward' },
];

/** Build table columns dynamically from the actual Tally response keys.
 *  Each raw column is shown exactly as-is. The Reconciliation
 *  badge is appended. */
function buildColumns(columnKeys, jsonUploaded) {
  const rawCols = columnKeys.map((key) => ({
    header: key,
    accessor: key,
    align: isNumericHeader(key) ? 'right' : undefined,
    render: isDateHeader(key) ? (r) => formatDate(r[key]) : isNumericHeader(key) ? (r) => inr(r[key]) : undefined,
    exportValue: (r) => String(r[key] ?? ''),
  }));
  return [
    ...rawCols,
    {
      header: 'Reconciliation',
      render: (r) => {
        const st = reconciliationStatus(r, jsonUploaded);
        return <Badge tone={st.tone}>{st.label}</Badge>;
      },
      exportValue: (r) => reconciliationStatus(r, jsonUploaded).label,
    },
  ];
}

/** Reconciliation status — priority-ordered, first match wins.
 *  CostCentre is NOT referenced in this column (tracked in Sales Status).
 *  - exact match (GSTIN+inv+date+amount tie out) → Reconciled
 *  - near match (found in JSON but amount/date diff) → Not Matched
 *  - probable match (ambiguous, needs review) → Not Matched
 *  - entirely absent from JSON → Not in GSTR-2B Portal
 */
function reconciliationStatus(r, jsonUploaded) {
  // Priority 1 — no JSON uploaded at all
  if (!jsonUploaded) return { tone: 'grey', label: 'JSON Not Uploaded' };

  // JSON is uploaded — evaluate by match tier
  const tier = (r.gstr2bTier || '').toLowerCase();

  // Priority 2 — exact match: all details tie out
  if (tier === 'exact') return { tone: 'green', label: 'Reconciled' };

  // Priority 3 — found in JSON but details don't tie out (near = value mismatch,
  // probable = invoice-number mismatch). Both are genuine discrepancies, not absences.
  if (tier === 'near' || tier === 'probable') return { tone: 'orange', label: 'Not Matched' };

  // Priority 4 — entirely absent from the uploaded JSON
  return { tone: 'red', label: 'Not in GSTR-2B Portal' };
}

function isNumericHeader(header) {
  const h = (header || '').toLowerCase();
  return /amount|tax|igst|cgst|sgst|cess|value|debit|credit|total/i.test(h);
}

function isDateHeader(header) {
  const h = (header || '').toLowerCase();
  return /date/i.test(h);
}

const PARKED_COLS = [
  { header: 'Supplier', accessor: 'supplier' },
  { header: 'Invoice No', accessor: 'invoice' },
  { header: 'Taxable', accessor: 'taxable', align: 'right', render: (r) => inr(r.taxable) },
  { header: 'Tax', accessor: 'tax', align: 'right', render: (r) => inr(r.tax) },
  { header: 'Pending Sale', accessor: 'pendingSale' },
  { header: 'Job', accessor: 'job' },
  { header: 'Days Parked', accessor: 'since', align: 'right', render: (r) => daysSince(r.since) },
];

const RELEASED_COLS = [
  { header: 'Supplier', accessor: 'supplier' },
  { header: 'Invoice No', accessor: 'invoice' },
  { header: 'Taxable', accessor: 'taxable', align: 'right', render: (r) => inr(r.taxable) },
  { header: 'Tax', accessor: 'tax', align: 'right', render: (r) => inr(r.tax) },
  { header: 'Released On', accessor: 'releasedOn' },
  { header: 'Sale Invoice', accessor: 'saleInvoice' },
  { header: 'Job', accessor: 'job' },
];

export default function GST2BReco() {
  const { view } = useView();
  const [tab, setTab] = useState('all');
  const [drill, setDrill] = useState(null);
  const [salesStatusFilter, setSalesStatusFilter] = useState('');
  const [recoFilter, setRecoFilter] = useState('');

  const [liveRows, setLiveRows] = useState(() => {
    const tpl = getTemplate('gst2bReconciliation');
    if (!tpl) return null;
    const cached = getTemplateCache(tpl.templateNo);
    if (cached) {
      const rows = mapGst2bRows(cached);
      return rows.length > 0 ? rows : null;
    }
    return null;
  });

  const [fetching, setFetching] = useState(false);
  const fetchIdRef = useRef(0); // tracks latest fetch, prevents stale overwrites

  // GSTR-2B JSON upload (functional doc §Module 1). Tally provides the purchase
  // register live; the uploaded portal JSON is parsed and matched against it.
  const [reqFiles, setReqFiles] = useState([
    { name: 'gstr2b', label: 'Upload GSTR-2B JSON', status: 'missing' },
  ]);
  const [portal2b, setPortal2b] = useState(null); // flattened portal docs, or null
  const [parseError, setParseError] = useState('');

  const handle2bJson = (slotName, text) => {
    setParseError('');
    try {
      const json = JSON.parse(text);
      const { period, docs } = flattenPortal2b(json);
      if (!docs.length) {
        setParseError('No B2B invoices found in this file — is it a GSTR-2B JSON?');
        setPortal2b(null);
        return { read: 0, rejected: 1, reasons: ['No docdata.b2b invoices found'], names: [] };
      }
      setPortal2b(docs);
      return { read: docs.length, rejected: 0, reasons: [], names: [`GSTR-2B ${period || ''} — ${docs.length} portal documents`] };
    } catch (err) {
      setParseError('Could not parse the file as JSON.');
      setPortal2b(null);
      return { read: 0, rejected: 1, reasons: ['Invalid JSON: ' + (err?.message || 'parse error')], names: [] };
    }
  };

  const handleTallyData = (data) => {
    const id = ++fetchIdRef.current;
    setTemplateCache(44, data);
    const rows = mapGst2bRows(data);
    console.log('[GST 2B] Mapped rows:', rows.length, rows.slice(0, 3));
    // Only apply if no newer fetch started while mapping
    if (id === fetchIdRef.current) {
      setLiveRows(rows.length > 0 ? rows : null);
    }
  };

  // Auto-fetch on mount if cache had no data.
  useEffect(() => {
    if (liveRows) return;
    setFetching(true);
    const tpl = getTemplate('gst2bReconciliation');
    if (!tpl) { setFetching(false); return; }
    const fy = getFinancialYearRange();
    const id = ++fetchIdRef.current;
    executeTemplate(tpl.templateNo, { cust_from_date: fy.fromDate, cust_to_date: fy.toDate })
      .then((data) => {
        if (id === fetchIdRef.current) {
          setTemplateCache(tpl.templateNo, data);
          handleTallyData(data);
        }
      })
      .catch(() => {})
      .finally(() => setFetching(false));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Reconcile against the uploaded GSTR-2B portal JSON (if present): this sets each
  // row's gstr2bTier (exact/near/probable/unmatched) which drives the A/B/C bucket.
  const { reconciledRows, matchCounts } = useMemo(() => {
    const base = liveRows || [];
    if (!portal2b) return { reconciledRows: base, matchCounts: null };
    const { rows, counts } = reconcileWithPortal(base, portal2b);
    return { reconciledRows: rows, matchCounts: counts };
  }, [liveRows, portal2b]);

  // Compute sales status, GSTR-2B state, bucket, and data-gap for every row
  const computedRows = useMemo(() => reconciledRows.map((r) => {
    const salesStatus = computeSalesStatus(r);
    const gstr2bState = computeGstr2bState(r);
    const bucket = computeBucket(gstr2bState, salesStatus);
    const dataGap = hasDataGap(salesStatus);
    return { ...r, _salesStatus: salesStatus, _gstr2bState: gstr2bState, _bucket: bucket, _dataGap: dataGap };
  }), [reconciledRows]);

  // Bucket counts exclude hold (needs review) from A/B/C
  const bucketCounts = {
    A: computedRows.filter((r) => r._bucket === 'A').length,
    B: computedRows.filter((r) => r._bucket === 'B').length,
    C: computedRows.filter((r) => r._bucket === 'C').length,
    hold: computedRows.filter((r) => r._bucket === 'hold').length,
  };

  const bucketValues = {
    A: computedRows.filter((r) => r._bucket === 'A').reduce((s, r) => s + (r._tax || 0), 0),
    B: computedRows.filter((r) => r._bucket === 'B').reduce((s, r) => s + (r._tax || 0), 0),
    C: computedRows.filter((r) => r._bucket === 'C').reduce((s, r) => s + (r._tax || 0), 0),
    hold: computedRows.filter((r) => r._bucket === 'hold').reduce((s, r) => s + (r._tax || 0), 0),
  };

  const total2B = computedRows.reduce((s, r) => s + (r._tax || 0), 0);

  // Dynamic columns: whatever keys Tally returns, those are the columns
  const columnKeys = useMemo(() => getColumnKeys(computedRows), [computedRows]);
  const columns = useMemo(() => buildColumns(columnKeys, !!portal2b), [columnKeys, portal2b]);

  const filtered = useMemo(() => {
    let rows = tab === 'all' ? computedRows : computedRows.filter((r) => r._bucket === tab);
    if (salesStatusFilter) {
      rows = rows.filter((r) => r._salesStatus === salesStatusFilter);
    }
    if (recoFilter) {
      const jsonUploaded = !!portal2b;
      rows = rows.filter((r) => reconciliationStatus(r, jsonUploaded).label === recoFilter);
    }
    return rows;
  }, [computedRows, tab, salesStatusFilter, recoFilter, portal2b]);
  const cfParked = [];
  const cfReleased = [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <TallyFetchBar
          templateKey="gst2bReconciliation"
          onData={handleTallyData}
        />
      </div>

      {/* GSTR-2B JSON upload — parsed and matched against the live Tally register */}
      <UploadPanel
        title="Reconciliation Inputs"
        description="Upload the GSTR-2B JSON downloaded from the GST portal. It is parsed and matched against the live Tally purchase register above by GSTIN, invoice number and tax value."
        requiredFiles={reqFiles}
        onFilesChange={setReqFiles}
        onFileContent={handle2bJson}
        accept=".json,application/json"
      />

      {parseError && (
        <Card className="border-red-200 bg-red-50/40">
          <div className="flex items-center gap-2 text-sm text-red-700">
            <AlertTriangle className="w-4 h-4 flex-shrink-0" />
            {parseError}
          </div>
        </Card>
      )}

      {matchCounts && (
        <Card className="bg-brand-50/30 border-brand/20">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="w-8 h-8 rounded-full bg-brand-50 text-brand flex items-center justify-center">
                <ArrowRightLeft className="w-4 h-4" />
              </span>
              <span className="text-sm font-semibold text-ink">GSTR-2B match complete</span>
            </div>
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <Badge tone="green">Exact: {matchCounts.exact}</Badge>
              <Badge tone="orange">Value mismatch: {matchCounts.near}</Badge>
              <Badge tone="lavender">Probable: {matchCounts.probable}</Badge>
              <Badge tone="amber">Not in 2B: {matchCounts.unmatched}</Badge>
            </div>
          </div>
        </Card>
      )}

      {!liveRows ? (
        <Card className="flex flex-col items-center justify-center py-16 text-center">
          {fetching ? (
            <>
              <RefreshCw className="w-10 h-10 text-brand mb-4 animate-spin" />
              <h3 className="text-base font-semibold text-ink mb-1">Loading data…</h3>
              <p className="text-sm text-ink-muted max-w-sm">
                Fetching purchase register data from Tally. This may take a moment.
              </p>
            </>
          ) : (
            <>
              <HardDrive className="w-10 h-10 text-ink-faint mb-4" />
              <h3 className="text-base font-semibold text-ink mb-1">No data loaded</h3>
              <p className="text-sm text-ink-muted max-w-sm">
                Click <strong>Load from Tally</strong> above to fetch live purchase register data using template 44.
              </p>
            </>
          )}
        </Card>
      ) : (
        <>
      {/* User view: queue-working prompt */}
      {view === 'user' && bucketCounts.C > 0 && (
        <Card className="border-amber-200 bg-amber-50/30">
          <div className="flex items-start gap-3">
            <MailWarning className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" />
            <div>
              <h3 className="text-sm font-semibold text-ink">{bucketCounts.C} supplier{ bucketCounts.C !== 1 ? 's' : '' } to follow up — Bucket C</h3>
              <p className="text-xs text-ink-muted mt-1">₹ {inr(bucketValues.C)} in input credit at stake. Click a row to view supplier detail, then mark follow-up sent.</p>
            </div>
          </div>
        </Card>
      )}

      {/* Stat Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        <StatCard
          icon={TicketCheck}
          label="Total Purchase Register"
          value={inrCompact(total2B)}
          sub={`${computedRows.length} rows loaded`}
          tone="default"
        />
        <StatCard
          icon={TicketCheck}
          label="Claimable This Month (A)"
          value={inrCompact(bucketValues.A)}
          tone="green"
          sub={`${bucketCounts.A} records`}
          onClick={() => setTab('A')}
        />
        <StatCard
          icon={Timer}
          label="Parked — Deferred (B)"
          value={inrCompact(bucketValues.B)}
          tone="lavender"
          sub={`${bucketCounts.B} records waiting for sale invoice`}
          onClick={() => setTab('B')}
        />
        <StatCard
          icon={MailWarning}
          label="Not Uploaded by Supplier (C)"
          value={inrCompact(bucketValues.C)}
          tone="amber"
          sub={`${bucketCounts.C} suppliers to follow up`}
          onClick={() => setTab('C')}
        />
        <StatCard
          icon={AlertTriangle}
          label="Needs Review (Hold)"
          value={inrCompact(bucketValues.hold)}
          tone="orange"
          sub={`${bucketCounts.hold} probable matches — excluded from A/B/C totals`}
          onClick={() => setTab('hold')}
        />
      </div>

      {/* Quick filters: Sales Status + Reconciliation */}
      <FilterBar>
        <SelectFilter
          label="Sales Status"
          value={salesStatusFilter}
          onChange={setSalesStatusFilter}
          options={Object.entries(SALES_STATUS).map(([k, v]) => ({ value: k, label: v.label }))}
        />
        <SelectFilter
          label="Reconciliation"
          value={recoFilter}
          onChange={setRecoFilter}
          options={[
            { value: 'JSON Not Uploaded', label: 'JSON Not Uploaded' },
            { value: 'Reconciled', label: 'Reconciled' },
            { value: 'Not Matched', label: 'Not Matched' },
            { value: 'Not in GSTR-2B Portal', label: 'Not in GSTR-2B Portal' },
          ]}
        />
        {(salesStatusFilter || recoFilter) && (
          <button onClick={() => { setSalesStatusFilter(''); setRecoFilter(''); }} className="h-8 px-3 rounded-full border border-line bg-white text-[11px] font-medium text-ink-muted hover:text-red-500 hover:border-red-200 transition-colors">
            Clear filters
          </button>
        )}
      </FilterBar>

      <DataTable
        columns={columns}
        data={filtered}
        onRowClick={(row) => setDrill(row)}
        exportFilename="gst-2b-reconciliation.csv"
        paginate
        emptyMessage="No records."
      />

      {/* Drill-down modal — shows all raw Tally columns + computed fields */}
      <Modal open={!!drill} onClose={() => setDrill(null)} title={drill?.supplier ? `Invoice: ${drill.invoice}` : 'Detail'}>
        {drill && (() => {
            const st = reconciliationStatus(drill, !!portal2b);
            return (
          <div className="space-y-4 text-sm">
            <div className="grid grid-cols-2 gap-2">
              {columnKeys.map((key) => (
                <div key={key}>
                  <span className="text-ink-muted">{key}:</span>{' '}
                  <span className="font-medium">{String(drill[key] ?? '')}</span>
                </div>
              ))}
            </div>
            <div className="pt-3 border-t border-line grid grid-cols-2 gap-2">
              <div>
                <span className="text-ink-muted">Reconciliation:</span>{' '}
                <Badge tone={st.tone}>{st.label}</Badge>
              </div>
            </div>
          </div>
            );
          })()}
      </Modal>
        </>
      )}
    </div>
  );
}