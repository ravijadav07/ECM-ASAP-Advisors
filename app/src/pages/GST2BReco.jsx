import { useState, useMemo, useEffect, useRef } from 'react';
import { TicketCheck, Timer, MailWarning, FileQuestion, ArrowRightLeft, AlertTriangle, HardDrive, RefreshCw, Upload, FileCheck } from 'lucide-react';
import { StatCard, Card, Tabs, Badge } from '../components/ui';
import { DataTable, Modal } from '../components/UiComponents';
import { useView } from '../context/ViewContext';
import { carryForward } from '../data/mockData';
import { inr, inrCompact, daysSince, getFinancialYearRange, formatDate } from '../utils/format';
import { computeSalesStatus, computeGstr2bState, computeBucket, hasDataGap, SALES_STATUS, GSTR2B_STATE, matchAgainstGstr2b } from '../utils/gst2b';
import { mapGst2bRows } from '../utils/tallyMapper';
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

const COLUMNS = [
  { header: 'Date', accessor: 'date', render: (r) => formatDate(r.date), exportValue: (r) => r.date },
  { header: 'Particulars', accessor: 'supplier', exportValue: (r) => r.supplier },
  { header: 'Party GSTIN/UIN', accessor: 'gstin', exportValue: (r) => r.gstin },
  { header: 'Vch Type', accessor: 'vchType', exportValue: (r) => r.vchType },
  { header: 'Vch No.', accessor: 'vchNo', exportValue: (r) => r.vchNo },
  { header: 'Taxable Amount', accessor: 'taxable', align: 'right', render: (r) => inr(r.taxable), exportValue: (r) => r.taxable },
  { header: 'IGST', accessor: 'igst', align: 'right', render: (r) => inr(r.igst), exportValue: (r) => r.igst },
  { header: 'CGST', accessor: 'cgst', align: 'right', render: (r) => inr(r.cgst), exportValue: (r) => r.cgst },
  { header: 'SGST/UTGST', accessor: 'sgst', align: 'right', render: (r) => inr(r.sgst), exportValue: (r) => r.sgst },
  { header: 'Cess', accessor: 'cess', align: 'right', render: (r) => inr(r.cess), exportValue: (r) => r.cess },
  { header: 'Tax Amount', accessor: 'tax', align: 'right', render: (r) => inr(r.tax), exportValue: (r) => r.tax },
  { header: 'CostCentre', accessor: 'costCentre', exportValue: (r) => r.costCentre },
  { header: 'Sales Invoice Date', accessor: 'salesInvoiceDate', render: (r) => formatDate(r.salesInvoiceDate), exportValue: (r) => r.salesInvoiceDate },
  { header: 'Sales Invoice No.', accessor: 'salesInvoiceNo', exportValue: (r) => r.salesInvoiceNo },
  { header: 'Sales Party', accessor: 'salesParty', exportValue: (r) => r.salesParty },
  { header: 'Supplier Invoice No.', accessor: 'invoice', exportValue: (r) => r.invoice },
  { header: 'Supplier Invoice Date', accessor: 'supplierInvoiceDate', render: (r) => formatDate(r.supplierInvoiceDate), exportValue: (r) => r.supplierInvoiceDate },
  { header: 'Invoice Match Key', accessor: 'invoiceMatchKey', exportValue: (r) => r.invoiceMatchKey },
  {
    header: 'Sales Status',
    render: (r) => {
      const s = r._salesStatus;
      return <Badge tone={SALES_STATUS[s].tone}>{SALES_STATUS[s].label}</Badge>;
    },
    exportValue: (r) => SALES_STATUS[r._salesStatus].label + (r._dataGap ? ' (Data Gap)' : ''),
  },
  {
    header: 'GSTR-2B',
    render: (r) => <Badge tone={GSTR2B_STATE[r._gstr2bState].tone}>{GSTR2B_STATE[r._gstr2bState].label}</Badge>,
    exportValue: (r) => GSTR2B_STATE[r._gstr2bState].label,
  },
  {
    header: 'Reconciliation',
    render: (r) => {
      const b = r._bucket;
      return (
        <span className="inline-flex items-center gap-1">
          {b === 'hold' ? (
            <Badge tone="orange">Needs Review</Badge>
          ) : (
            <Badge tone={BUCKET_MAP[b].tone}>{BUCKET_MAP[b].label}</Badge>
          )}
          {r._dataGap && b === 'B' && <Badge tone="red">Blocked — Cost Centre</Badge>}
        </span>
      );
    },
    exportValue: (r) => (r._bucket === 'hold' ? 'Needs Review' : BUCKET_MAP[r._bucket].label) + (r._dataGap && r._bucket === 'B' ? ' (Blocked - Cost Centre)' : ''),
  },
];

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
  const [gstr2bData, setGstr2bData] = useState(null); // parsed GSTR-2B JSON
  const fileInputRef = useRef(null);

  const handleGstr2bUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(reader.result);
        setGstr2bData(parsed);
        console.log('[GST 2B] GSTR-2B JSON loaded:', file.name);
      } catch (err) {
        console.error('[GST 2B] Failed to parse GSTR-2B JSON:', err);
        setGstr2bData(null);
      }
    };
    reader.readAsText(file);
    e.target.value = ''; // allow re-uploading the same file
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

  // Compute sales status, GSTR-2B state, bucket, and data-gap for every row
  const computedRows = useMemo(() => {
    const base = (liveRows || []);
    // Apply GSTR-2B matching if 2B JSON is uploaded
    const matched = gstr2bData ? matchAgainstGstr2b(base, gstr2bData) : base;
    return matched.map((r) => {
      const salesStatus = computeSalesStatus(r);
      const gstr2bState = computeGstr2bState(r);
      const bucket = computeBucket(gstr2bState, salesStatus);
      const dataGap = hasDataGap(salesStatus);
      return { ...r, _salesStatus: salesStatus, _gstr2bState: gstr2bState, _bucket: bucket, _dataGap: dataGap };
    });
  }, [liveRows, gstr2bData]);

  // Bucket counts exclude hold (needs review) from A/B/C
  const bucketCounts = {
    A: computedRows.filter((r) => r._bucket === 'A').length,
    B: computedRows.filter((r) => r._bucket === 'B').length,
    C: computedRows.filter((r) => r._bucket === 'C').length,
    hold: computedRows.filter((r) => r._bucket === 'hold').length,
  };

  const bucketValues = {
    A: computedRows.filter((r) => r._bucket === 'A').reduce((s, r) => s + r.tax, 0),
    B: computedRows.filter((r) => r._bucket === 'B').reduce((s, r) => s + r.tax, 0),
    C: computedRows.filter((r) => r._bucket === 'C').reduce((s, r) => s + r.tax, 0),
    hold: computedRows.filter((r) => r._bucket === 'hold').reduce((s, r) => s + r.tax, 0),
  };

  const total2B = computedRows.reduce((s, r) => s + r.tax, 0);

  const filtered = tab === 'all' ? computedRows : computedRows.filter((r) => r._bucket === tab);
  const cfParked = carryForward.parked;
  const cfReleased = carryForward.released;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <TallyFetchBar
          templateKey="gst2bReconciliation"
          onData={handleTallyData}
        />
      </div>

      {liveRows && (
        <div className="flex items-center gap-2 flex-wrap">
          <input
            ref={fileInputRef}
            type="file"
            accept=".json"
            className="hidden"
            onChange={handleGstr2bUpload}
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            className="h-9 px-4 inline-flex items-center gap-2 rounded-full text-xs font-medium border border-dashed border-brand/40 bg-brand-50/30 text-brand hover:bg-brand-50 transition-colors"
          >
            <Upload className="w-3.5 h-3.5" />
            {gstr2bData ? 'Change GSTR-2B JSON' : 'Upload GSTR-2B JSON'}
          </button>
          {gstr2bData && (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
              <FileCheck className="w-3.5 h-3.5" />
              GSTR-2B loaded — {computedRows.filter(r => r.gstr2bTier === 'exact' || r.gstr2bTier === 'near').length} matched, {computedRows.filter(r => r.gstr2bTier === 'unmatched').length} unmatched
            </span>
          )}
        </div>
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
              <p className="text-xs text-ink-muted mt-1">₹ {inrCompact(bucketValues.C)} in input credit at stake. Click a row to view supplier detail, then mark follow-up sent.</p>
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

      {/* Tabs */}
      {tab !== 'cf' ? (
        <>
          <Tabs
            tabs={[
              { id: 'all', label: 'All', count: computedRows.length },
              { id: 'A', label: 'A — Claim', count: bucketCounts.A },
              { id: 'B', label: 'B — Deferred', count: bucketCounts.B },
              { id: 'C', label: 'C — Not Uploaded', count: bucketCounts.C },
              { id: 'hold', label: 'Needs Review', count: bucketCounts.hold },
              { id: 'cf', label: 'Carry-Forward', count: carryForward.parked.length },
            ]}
            active={tab}
            onChange={setTab}
          />
          <DataTable
            columns={COLUMNS}
            data={filtered}
            onRowClick={(row) => setDrill(row)}
            exportFilename="gst-2b-reconciliation.csv"
            paginate
            emptyMessage="No records in this bucket."
          />
        </>
      ) : (
        <>
          <Tabs
            tabs={[
              { id: 'A', label: 'A — Claim', count: bucketCounts.A },
              { id: 'B', label: 'B — Deferred', count: bucketCounts.B },
              { id: 'C', label: 'C — Not Uploaded', count: bucketCounts.C },
              { id: 'hold', label: 'Needs Review', count: bucketCounts.hold },
              { id: 'cf', label: 'Carry-Forward', count: carryForward.parked.length },
            ]}
            active={tab}
            onChange={setTab}
          />

          {/* Currently Parked */}
          <Card>
            <h3 className="text-sm font-semibold text-ink mb-3">Currently Parked (Bucket B — Pending Sale Invoice)</h3>
            <DataTable
              columns={PARKED_COLS}
              data={cfParked}
              exportFilename="gst-2b-carry-forward-parked.csv"
              emptyMessage="No items currently parked."
            />
          </Card>

          {/* Recently Released */}
          <Card>
            <div className="flex items-center gap-2 mb-3">
              <ArrowRightLeft className="w-4 h-4 text-emerald-600" />
              <h3 className="text-sm font-semibold text-ink">Recently Released (B→A This Period)</h3>
              <Badge tone="green">Auto-Moved</Badge>
            </div>
            <p className="text-xs text-ink-muted mb-3">
              These were in Bucket B in the previous period and have been auto-moved to Bucket A because the
              linked sale invoice was raised. This is the claim-deferral rule working.
            </p>
            <DataTable
              columns={RELEASED_COLS}
              data={cfReleased}
              exportFilename="gst-2b-carry-forward-released.csv"
              emptyMessage="No items released this period."
            />
          </Card>
        </>
      )}

      {/* Drill-down modal */}
      <Modal open={!!drill} onClose={() => setDrill(null)} title={drill?.supplier ? `Invoice: ${drill.invoice}` : 'Detail'}>
        {drill && (
          <div className="space-y-4 text-sm">
            <div className="grid grid-cols-2 gap-2">
              <div><span className="text-ink-muted">Supplier:</span> <span className="font-medium">{drill.supplier}</span></div>
              <div><span className="text-ink-muted">GSTIN:</span> <span className="font-medium">{drill.gstin}</span></div>
              <div><span className="text-ink-muted">Invoice:</span> <span className="font-medium">{drill.invoice}</span></div>
              <div><span className="text-ink-muted">Date:</span> <span className="font-medium">{formatDate(drill.date)}</span></div>
              <div><span className="text-ink-muted">Taxable:</span> <span className="font-bold">{inr(drill.taxable)}</span></div>
              <div><span className="text-ink-muted">Tax:</span> <span className="font-bold">{inr(drill.tax)}</span></div>
            </div>
            <div className="pt-3 border-t border-line grid grid-cols-2 gap-2">
              <div>
                <span className="text-ink-muted">Sales Status:</span>{' '}
                <Badge tone={SALES_STATUS[drill._salesStatus]?.tone}>{SALES_STATUS[drill._salesStatus]?.label}</Badge>
              </div>
              <div>
                <span className="text-ink-muted">GSTR-2B:</span>{' '}
                <Badge tone={GSTR2B_STATE[drill._gstr2bState]?.tone}>{GSTR2B_STATE[drill._gstr2bState]?.label}</Badge>
              </div>
              <div>
                <span className="text-ink-muted">Match Tier:</span>{' '}
                <span className="font-medium capitalize">{drill.gstr2bTier}</span>
              </div>
              <div>
                <span className="text-ink-muted">Bucket:</span>{' '}
                {drill._bucket === 'hold' ? (
                  <Badge tone="orange">Needs Review</Badge>
                ) : (
                  <Badge tone={BUCKET_MAP[drill._bucket]?.tone}>{BUCKET_MAP[drill._bucket]?.label}</Badge>
                )}
                {drill._dataGap && drill._bucket === 'B' && <Badge tone="red" className="ml-1">Blocked — Cost Centre</Badge>}
              </div>
              <div className="col-span-2">
                <span className="text-ink-muted">Cost Centre:</span>{' '}
                <span className="font-medium">{drill.costCentre || '(not allocated — fix in Tally)'}</span>
              </div>
              <div className="col-span-2">
                <span className="text-ink-muted">Sales Invoice:</span>{' '}
                <span className="font-medium">{drill.salesInvoiceNo || '(not raised)'}</span>
              </div>
            </div>
          </div>
        )}
      </Modal>
        </>
      )}
    </div>
  );
}