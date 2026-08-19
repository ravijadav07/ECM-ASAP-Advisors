import { useState, useMemo } from 'react';
import { IndianRupee, AlertTriangle, TrendingUp, Info } from 'lucide-react';
import { StatCard, Card, Tabs, Badge, PeriodSelector, UploadPanel, FilterBar, SelectFilter, InputFilter } from '../components/ui';
import { DataTable, Modal, Skeleton } from '../components/UiComponents';
import { useView } from '../context/ViewContext';
import { as26Rows, as26Summary, as26BookInvoices } from '../data/mockData';
import { inr, formatDate } from '../utils/format';

const summary = as26Summary();

const STATUS_MAP = {
  matched: { tone: 'green', label: 'Matched' },
  short: { tone: 'amber', label: 'Short in 26AS' },
  'absent-in-26as': { tone: 'amber', label: 'Absent in 26AS — Chase' },
  excess: { tone: 'cyan', label: 'Excess in 26AS — Verify' },
  'absent-in-books': { tone: 'cyan', label: 'Absent in Books — Verify' },
  timing: { tone: 'lavender', label: 'Timing Difference' },
};

const TABS_CONFIG = [
  { id: 'all', label: 'All Deductors', count: as26Rows.length },
  { id: 'short', label: 'Short in 26AS', count: as26Rows.filter((r) => r.status === 'short').length },
  { id: 'absent-in-26as', label: 'Absent in 26AS', count: as26Rows.filter((r) => r.status === 'absent-in-26as').length },
  { id: 'excess', label: 'Excess in 26AS', count: as26Rows.filter((r) => r.status === 'excess').length },
  { id: 'timing', label: 'Timing', count: as26Rows.filter((r) => r.status === 'timing').length },
  { id: 'matched', label: 'Matched', count: as26Rows.filter((r) => r.status === 'matched').length },
];

const COLUMNS = [
  {
    header: 'Deductor',
    accessor: 'deductor',
    render: (r) => (
      <span className="inline-flex items-center gap-2 flex-wrap">
        {r.nameMatch && <Badge tone="cyan">Needs confirmation</Badge>}
        <span className="truncate max-w-[200px]">{r.deductor}</span>
      </span>
    ),
    exportValue: (r) => r.deductor,
  },
  { header: 'TAN', accessor: 'tan', exportValue: (r) => r.tan },
  { header: 'As per Books', accessor: 'books', align: 'right', render: (r) => inr(r.books), exportValue: (r) => r.books },
  { header: 'As per 26AS', accessor: 'as26', align: 'right', render: (r) => inr(r.as26), exportValue: (r) => r.as26 },
  {
    header: 'Difference',
    align: 'right',
    render: (r) => {
      const d = r.books - r.as26;
      return <span className={d !== 0 ? 'text-amber-600 font-medium' : ''}>{inr(d)}</span>;
    },
    exportValue: (r) => r.books - r.as26,
  },
  { header: 'Quarter', accessor: 'quarter', exportValue: (r) => r.quarter },
  { header: 'Status', render: (r) => <Badge tone={STATUS_MAP[r.status]?.tone}>{STATUS_MAP[r.status]?.label}</Badge>, exportValue: (r) => STATUS_MAP[r.status]?.label },
];

const BOOK_INVOICE_COLS = [
  { header: 'Invoice', accessor: 'invoice', exportValue: (r) => r.invoice },
  { header: 'Date', accessor: 'date', render: (r) => formatDate(r.date), exportValue: (r) => r.date },
  { header: 'Gross Amount', accessor: 'gross', align: 'right', render: (r) => inr(r.gross), exportValue: (r) => r.gross },
  { header: 'TDS', accessor: 'tds', align: 'right', render: (r) => inr(r.tds), exportValue: (r) => r.tds },
];

export default function As26Matching() {
  const { view } = useView();
  const [tab, setTab] = useState('all');
  const [drill, setDrill] = useState(null);
  const [loading, setLoading] = useState(false);
  const [files, setFiles] = useState([
    { name: '26AS Statement', label: '26AS TXT', file: 'Form26AS_Q1FY26.txt', status: 'uploaded' },
    { name: 'TDS Receivable Ledger', label: 'TDS receivable ledger', file: 'TDSReceivable.xml', status: 'uploaded' },
  ]);

  // Filters
  const [deductorFilter, setDeductorFilter] = useState('');
  const [minBooks, setMinBooks] = useState('');
  const [minGap, setMinGap] = useState('');

  const deductors = useMemo(() => {
    const set = new Set(as26Rows.map((r) => r.deductor));
    return [...set].sort().map((d) => ({ value: d, label: d }));
  }, []);

  const applyFilters = (rows) => {
    let result = rows;
    if (deductorFilter) result = result.filter((r) => r.deductor === deductorFilter);
    if (minBooks) result = result.filter((r) => r.books >= Number(minBooks));
    if (minGap) result = result.filter((r) => Math.abs(r.books - r.as26) >= Number(minGap));
    return result;
  };

  const clearFilters = () => {
    setDeductorFilter('');
    setMinBooks('');
    setMinGap('');
  };

  const hasFilters = deductorFilter || minBooks || minGap;

  const filtered = applyFilters(tab === 'all' ? as26Rows : as26Rows.filter((r) => r.status === tab));

  const handleRowClick = (row) => {
    const invoices = as26BookInvoices[row.tan];
    setDrill({ ...row, invoices: invoices || [] });
  };

  const shortDeductors = as26Rows.filter((r) => r.status === 'short' || r.status === 'absent-in-26as');
  const shortValue = shortDeductors.reduce((s, r) => s + (r.books - r.as26), 0);

  return (
    <div className="space-y-6">
      <UploadPanel
        title="Data Upload — 26AS Matching"
        description="Upload the 26AS statement (TXT) downloaded from the income tax portal, plus the TDS receivable ledger from Tally for the period."
        requiredFiles={files}
        onFilesChange={(next) => { setFiles(next); setLoading(true); setTimeout(() => setLoading(false), 700); }}
      />

      <div className="flex items-center justify-between flex-wrap gap-3">
        <PeriodSelector value="Q1 FY26" />
      </div>

      {/* Filter Bar */}
      <FilterBar>
        <SelectFilter label="Deductor" value={deductorFilter} options={deductors} onChange={setDeductorFilter} />
        <InputFilter label="Min Books (₹)" value={minBooks} onChange={setMinBooks} placeholder="e.g. 50000" type="number" />
        <InputFilter label="Min Gap (₹)" value={minGap} onChange={setMinGap} placeholder="e.g. 10000" type="number" />
        {hasFilters && (
          <button onClick={clearFilters} className="h-8 px-3 rounded-full border border-line bg-white text-[11px] font-medium text-ink-muted hover:text-red-500 hover:border-red-200 transition-colors">
            Clear filters
          </button>
        )}
      </FilterBar>

      {/* Limitation Callout */}
      <Card className="border-brand/30 bg-brand-50/30">
        <div className="flex items-start gap-3">
          <Info className="w-5 h-5 text-brand mt-0.5 flex-shrink-0" />
          <div>
            <h3 className="text-sm font-semibold text-ink">Important: invoice-level matching is not possible</h3>
            <p className="text-xs text-ink-muted mt-1">
              TDS returns are filed party-wise, not invoice-wise. The income tax portal does not publish
              which specific bill a given TDS credit relates to. This reconciliation is at the deductor (TAN)
              level. The gap is reported per deductor; the book invoices listed here are supporting detail
              for the follow-up, not individually matched items.
            </p>
          </div>
        </div>
      </Card>

      {/* Admin view: customer risk concentration */}
      {view === 'admin' && (
        <Card>
          <h3 className="text-sm font-semibold text-ink mb-3">Deductor Risk Concentration</h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { band: 'Short in 26AS', count: shortDeductors.length, value: shortValue, color: 'bg-amber-50 border-amber-200 text-amber-700' },
              { band: 'Absent in 26AS', count: as26Rows.filter((r) => r.status === 'absent-in-26as').length, value: as26Rows.filter((r) => r.status === 'absent-in-26as').reduce((s, r) => s + r.books, 0), color: 'bg-red-50 border-red-200 text-red-700' },
              { band: 'Excess in 26AS', count: as26Rows.filter((r) => r.status === 'excess').length, value: as26Rows.filter((r) => r.status === 'excess').reduce((s, r) => s + (r.as26 - r.books), 0), color: 'bg-cyan-50 border-cyan-200 text-cyan-700' },
              { band: 'Timing', count: as26Rows.filter((r) => r.status === 'timing').length, value: as26Rows.filter((r) => r.status === 'timing').reduce((s, r) => s + Math.abs(r.books - r.as26), 0), color: 'bg-purple-50 border-purple-200 text-purple-700' },
            ].map((b) => (
              <div key={b.band} className={`p-3 rounded-xl border ${b.color} text-center`}>
                <p className="text-xl sm:text-2xl font-bold font-display">{inr(b.value)}</p>
                <p className="text-xs mt-1 opacity-80">{b.band} ({b.count} deductors)</p>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* User view: action prompt */}
      {view === 'user' && shortDeductors.length > 0 && (
        <Card className="border-amber-200 bg-amber-50/30">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" />
            <div>
              <h3 className="text-sm font-semibold text-ink">{shortDeductors.length} deductors to chase</h3>
              <p className="text-xs text-ink-muted mt-1">₹ {inr(shortValue)} in TDS not yet confirmed. Click a row to view book invoices, then mark follow-up sent.</p>
            </div>
          </div>
        </Card>
      )}

      {/* Stat Grid — 3 headline cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          icon={IndianRupee}
          label="TDS as per Books"
          value={inr(summary.books)}
          tone="default"
        />
        <StatCard
          icon={TrendingUp}
          label="TDS as per 26AS"
          value={inr(summary.as26)}
          tone="green"
          onClick={() => setTab('matched')}
        />
        <StatCard
          icon={AlertTriangle}
          label="Gap (Books - 26AS)"
          value={inr(summary.gap)}
          sub={summary.gap > 0 ? 'Chase under-depositing customers' : 'Books and 26AS are aligned'}
          tone={summary.gap !== 0 ? 'amber' : 'green'}
          onClick={() => setTab('short')}
        />
      </div>

      {loading ? (
        <Skeleton rows={5} cols={7} />
      ) : (
        <>
          <Tabs tabs={TABS_CONFIG} active={tab} onChange={setTab} />
          <DataTable
            columns={COLUMNS}
            data={filtered}
            onRowClick={handleRowClick}
            exportFilename="26as-matching.csv"
            paginate
            emptyMessage="No deductors in this category."
          />
        </>
      )}

      <Modal
        open={!!drill}
        onClose={() => setDrill(null)}
        title={`${drill?.deductor || ''} — Book Invoices`}
      >
        {drill && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div><span className="text-ink-muted">TAN:</span> <span className="font-medium">{drill.tan}</span></div>
              <div><span className="text-ink-muted">Quarter:</span> <span className="font-medium">{drill.quarter}</span></div>
              <div><span className="text-ink-muted">Books:</span> <span className="font-bold">{inr(drill.books)}</span></div>
              <div><span className="text-ink-muted">26AS:</span> <span className="font-bold">{inr(drill.as26)}</span></div>
              <div className="col-span-2">
                <span className="text-ink-muted">Status:</span>{' '}
                <Badge tone={STATUS_MAP[drill.status]?.tone}>{STATUS_MAP[drill.status]?.label}</Badge>
              </div>
            </div>
            <div className="pt-3 border-t border-line">
              <h4 className="text-sm font-semibold text-ink mb-2">Supporting Book Invoices</h4>
              <p className="text-xs text-ink-muted mb-3">Listed as supporting detail — not individually matched to 26AS.</p>
              {drill.invoices.length > 0 ? (
                <DataTable columns={BOOK_INVOICE_COLS} data={drill.invoices} exportFilename={`${drill.tan}-book-invoices.csv`} />
              ) : (
                <p className="text-xs text-ink-muted">No book invoices available for this deductor.</p>
              )}
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}