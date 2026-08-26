import { useState, useMemo, useEffect, useRef } from 'react';
import { IndianRupee, AlertTriangle, Clock, HardDrive, RefreshCw, Landmark } from 'lucide-react';
import { StatCard, Card, Tabs, Badge } from '../components/ui';
import { DataTable, Modal, Skeleton } from '../components/UiComponents';
import { useView } from '../context/ViewContext';
import { inr, inrCompact, daysSince, getFinancialYearRange, formatDate } from '../utils/format';
import { mapReimbursementRows, getColumnKeys } from '../utils/tallyMapper';
import { executeTemplate, getTemplateCache, setTemplateCache } from '../services/tallyApi';
import { getTemplate } from '../config/tallyTemplates';
import TallyFetchBar from '../components/TallyFetchBar';

function isReimbNumericHeader(header) {
  const h = (header || '').toLowerCase();
  return /amount|debit|credit|value|total|balance|tax|igst|cgst|sgst|cess/i.test(h);
}

function isReimbDateHeader(header) {
  const h = (header || '').toLowerCase();
  return /date/i.test(h);
}

export default function ReimbursementAudit() {
  const { view } = useView();
  const [tab, setTab] = useState('all');
  const [drill, setDrill] = useState(null);
  const [loading, setLoading] = useState(false);
  const [liveRows, setLiveRows] = useState(() => {
    const tpl = getTemplate('reimbursementAudit');
    if (!tpl) return null;
    const cached = getTemplateCache(tpl.templateNo);
    if (cached) {
      const rows = mapReimbursementRows(cached);
      return rows.length > 0 ? rows : null;
    }
    return null;
  });

  const [fetching, setFetching] = useState(false);
  const fetchIdRef = useRef(0); // tracks latest fetch, prevents stale overwrites

  const handleTallyData = (data) => {
    const id = ++fetchIdRef.current;
    setTemplateCache(45, data);
    const rows = mapReimbursementRows(data);
    if (rows.length > 0) {
      const rawKeys = getColumnKeys(rows);
      console.log('[Reimbursement] Raw Tally columns:', rawKeys.join(', '));
      console.log('[Reimbursement] Sample rows:', rows.slice(0, 2));
    }
    if (id === fetchIdRef.current) {
      setLiveRows(rows.length > 0 ? rows : null);
    }
  };

  // Auto-fetch on mount if cache had no data.
  useEffect(() => {
    if (liveRows) return;
    setFetching(true);
    const tpl = getTemplate('reimbursementAudit');
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

  const summary = useMemo(() => {
    const rows = liveRows || [];
    const notBilled = rows.filter((r) => r._status === 'not-billed');
    const short = rows.filter((r) => r._status === 'short');
    const pending = rows.filter((r) => r._status === 'pending');
    const incurred = rows.reduce((s, r) => s + (r._incurred || 0), 0);
    const recovered = rows.reduce((s, r) => s + (r._recovered || 0), 0);
    const notBilledValue = notBilled.reduce((s, r) => s + (r._incurred || 0), 0);
    const shortfallValue = short.reduce((s, r) => s + ((r._incurred || 0) - (r._recovered || 0)), 0);
    const closingDebit = rows.reduce((s, r) => s + (r._closingDebit || 0), 0);
    const closingCredit = rows.reduce((s, r) => s + (r._closingCredit || 0), 0);
    const netClosing = closingDebit - closingCredit;
    const openDebitRows = rows.filter((r) => (r._closingDebit || 0) - (r._closingCredit || 0) > 0).length;
    return {
      incurred, recovered,
      headline: notBilledValue + shortfallValue,
      notBilledCount: notBilled.length,
      notBilledValue, shortfallValue,
      pendingCount: pending.length,
      closingDebit, closingCredit, netClosing, openDebitRows,
    };
  }, [liveRows]);

  const tabs = useMemo(() => {
    const rows = liveRows || [];
    return [
      { id: 'all', label: 'All Jobs', count: rows.length },
      { id: 'not-billed', label: 'Not Billed', count: rows.filter((r) => r._status === 'not-billed').length },
      { id: 'short', label: 'Short Recovered', count: rows.filter((r) => r._status === 'short').length },
      { id: 'over', label: 'Over Recovered', count: rows.filter((r) => r._status === 'over').length },
      { id: 'pending', label: 'Invoice Pending', count: rows.filter((r) => r._status === 'pending').length },
      { id: 'fully', label: 'Fully Recovered', count: rows.filter((r) => r._status === 'fully').length },
    ];
  }, [liveRows]);

  const STATUS_MAP = {
    fully: { tone: 'green', label: 'Fully Recovered' },
    'not-billed': { tone: 'amber', label: 'Not Billed' },
    short: { tone: 'lavender', label: 'Short Recovered' },
    over: { tone: 'cyan', label: 'Over Recovered' },
    pending: { tone: 'grey', label: 'Invoice Pending' },
  };

  // Build table columns dynamically from the actual Tally response keys.
  const columnKeys = useMemo(() => getColumnKeys(liveRows || []), [liveRows]);
  const columns = useMemo(() => {
    const rawCols = columnKeys
      .filter((key) => key !== 'Audit Status') // skip raw Audit Status — use computed badge instead
      .map((key) => ({
        header: key,
        accessor: key,
        align: isReimbNumericHeader(key) ? 'right' : undefined,
        render: isReimbDateHeader(key) ? (r) => formatDate(r[key]) : isReimbNumericHeader(key) ? (r) => inr(r[key]) : undefined,
        exportValue: (r) => String(r[key] ?? ''),
      }));
    return [
      ...rawCols,
      {
        header: 'Audit Status',
        render: (r) => <Badge tone={STATUS_MAP[r._status]?.tone}>{r._auditStatusRaw || STATUS_MAP[r._status]?.label}</Badge>,
        exportValue: (r) => r._auditStatusRaw || STATUS_MAP[r._status]?.label,
      },
    ];
  }, [columnKeys]);

  const filteredLines = tab === 'all' ? (liveRows || []) : (liveRows || []).filter((r) => r._status === tab);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <TallyFetchBar
          templateKey="reimbursementAudit"
          onData={handleTallyData}
        />
      </div>

      {!liveRows ? (
        <Card className="flex flex-col items-center justify-center py-16 text-center">
          {fetching ? (
            <>
              <RefreshCw className="w-10 h-10 text-brand mb-4 animate-spin" />
              <h3 className="text-base font-semibold text-ink mb-1">Loading data…</h3>
              <p className="text-sm text-ink-muted max-w-sm">
                Fetching reimbursement audit data from Tally. This may take a moment.
              </p>
            </>
          ) : (
            <>
              <HardDrive className="w-10 h-10 text-ink-faint mb-4" />
              <h3 className="text-base font-semibold text-ink mb-1">No data loaded</h3>
              <p className="text-sm text-ink-muted max-w-sm">
                Click <strong>Load from Tally</strong> above to fetch live reimbursement audit data using template 45.
              </p>
            </>
          )}
        </Card>
      ) : (
        <>
      {/* Stat Grid — period activity + standing exposure. Clickable cards filter. */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 animate-fade-in">
        <StatCard
          icon={IndianRupee}
          label="Total Incurred"
          value={inrCompact(summary.incurred)}
          sub="Transactions Debit (period)"
          tone="default"
        />
        <StatCard
          icon={IndianRupee}
          label="Total Recovered"
          value={inrCompact(summary.recovered)}
          sub="Transactions Credit (period)"
          tone="green"
          onClick={() => setTab('fully')}
        />
        <StatCard
          icon={Landmark}
          label="Net Closing Exposure"
          value={inrCompact(summary.netClosing)}
          sub={`Closing Dr ${inrCompact(summary.closingDebit)} − Cr ${inrCompact(summary.closingCredit)}`}
          tone="cyan"
        />
        <StatCard
          icon={AlertTriangle}
          label="Unrecovered (Headline)"
          value={inrCompact(summary.headline)}
          sub={`Not-billed ${inrCompact(summary.notBilledValue)} + Shortfall ${inrCompact(summary.shortfallValue)}`}
          tone="amber"
          onClick={() => setTab('not-billed')}
        />
        <StatCard
          icon={AlertTriangle}
          label="Items to Action"
          value={summary.notBilledCount}
          sub={`${inrCompact(summary.notBilledValue)} in ${summary.notBilledCount} lines`}
          tone="amber"
          onClick={() => setTab('not-billed')}
        />
        <StatCard
          icon={Clock}
          label="Invoice Pending"
          value={summary.pendingCount}
          sub="Excluded — timing only"
          tone="grey"
          onClick={() => setTab('pending')}
        />
      </div>

      {/* User view: queue-working prompt */}
      {view === 'user' && tab === 'not-billed' && (
        <Card className="border-amber-200 bg-amber-50/30">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" />
            <div>
              <h3 className="text-sm font-semibold text-ink">Action Queue: {summary.notBilledCount} items not billed</h3>
              <p className="text-xs text-ink-muted mt-1">Click any row to view details. In the drill-down, mark the item as billed,
              waived (with reason), or disputed. The reason is retained so the admin view shows why a leak was closed without recovery.</p>
            </div>
          </div>
        </Card>
      )}

      {/* Working area */}
      {loading ? (
        <Skeleton rows={5} cols={6} />
      ) : (
        <>
          <Tabs tabs={tabs} active={tab} onChange={setTab} />
          <DataTable
            columns={columns}
            data={filteredLines}
            onRowClick={(row) => setDrill(row)}
            exportFilename="reimbursement-audit-line-items.csv"
            paginate
            emptyMessage="No line items in this bucket."
          />
        </>
      )}

      {/* Ageing bands for admin view */}
      {view === 'admin' && !loading && (
        <Card>
          <h3 className="text-sm font-semibold text-ink mb-3">Ageing of Unrecovered Items</h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { band: '0-30 days', count: 5, value: 153500, color: 'bg-emerald-50 border-emerald-200 text-emerald-700' },
              { band: '31-60 days', count: 4, value: 124000, color: 'bg-amber-50 border-amber-200 text-amber-700' },
              { band: '61-90 days', count: 2, value: 42000, color: 'bg-orange-50 border-orange-200 text-orange-700' },
              { band: '90+ days', count: 1, value: 18000, color: 'bg-red-50 border-red-200 text-red-700' },
            ].map((b) => (
              <div key={b.band} className={`p-3 rounded-xl border ${b.color} text-center`}>
                <p className="text-xl sm:text-2xl font-bold font-display">{inr(b.value)}</p>
                <p className="text-xs mt-1 opacity-80">{b.band} ({b.count} items)</p>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Drill-down modal — shows all raw Tally columns */}
      <Modal open={!!drill} onClose={() => setDrill(null)} title={`Voucher Detail: ${drill?._costCentre || ''}`}>
        {drill && (
          <div className="space-y-3 text-sm">
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
                <span className="text-ink-muted">Audit Status:</span>{' '}
                <Badge tone={STATUS_MAP[drill._status]?.tone}>{drill._auditStatusRaw || STATUS_MAP[drill._status]?.label}</Badge>
              </div>
            </div>
            {drill._status === 'not-billed' && (
              <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 mt-3">
                <p className="text-xs text-amber-700">
                  <strong>Leakage detected:</strong> A customer invoice was raised for this job, but this expense head was
                  left off the invoice. Recommend issuing a debit note for {inr(drill._incurred)}.
                </p>
                {view === 'user' && (
                  <div className="flex gap-2 mt-3">
                    <button className="h-11 px-4 rounded-full bg-emerald-600 text-white text-xs font-medium">Mark Billed</button>
                    <button className="h-11 px-4 rounded-full border border-line text-ink text-xs font-medium hover:bg-canvas-soft">Waive</button>
                    <button className="h-11 px-4 rounded-full border border-line text-ink text-xs font-medium hover:bg-canvas-soft">Dispute</button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </Modal>
        </>
      )}
    </div>
  );
}