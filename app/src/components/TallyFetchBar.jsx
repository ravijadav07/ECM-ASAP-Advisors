import { useState, useMemo } from 'react';
import { Database, RefreshCw, CheckCircle2, AlertTriangle, Calendar, RotateCcw } from 'lucide-react';
import { useTallyTemplate } from '../hooks/useTallyTemplate';
import { getTemplate } from '../config/tallyTemplates';
import { getFinancialYearRange, fmtDate } from '../utils/format';

/**
 * "Load from Tally" bar — authenticates + executes the module's Tally OS V3
 * template for a date range (defaults to the current financial year).
 * Includes a custom date range selector.
 */
export default function TallyFetchBar({ templateKey, onData }) {
  const fy = useMemo(() => getFinancialYearRange(), []);
  const [fromDate, setFromDate] = useState(fy.fromDate);
  const [toDate, setToDate] = useState(fy.toDate);
  const [fetched, setFetched] = useState(false);
  const { loading, error, fetchData } = useTallyTemplate(templateKey);
  const tpl = getTemplate(templateKey);

  const isFY = fromDate === fy.fromDate && toDate === fy.toDate;

  const handleFetch = async () => {
    setFetched(false);
    console.log(`[TallyFetchBar] Fetching template ${tpl?.templateNo} with range: ${fromDate} → ${toDate}`);
    const result = await fetchData({ cust_from_date: fromDate, cust_to_date: toDate });
    if (result) {
      setFetched(true);
      onData?.(result);
    }
  };

  const resetToFY = () => {
    setFromDate(fy.fromDate);
    setToDate(fy.toDate);
  };

  return (
    <div className="flex flex-col sm:flex-row sm:items-center gap-2 flex-wrap">
      <div className="flex items-center gap-2">
        {/* Date range inputs */}
        <div className="flex items-center gap-1">
          <Calendar className="w-3.5 h-3.5 text-ink-faint" />
          <input
            type="date"
            value={fromDate}
            onChange={(e) => setFromDate(e.target.value)}
            className="h-8 px-2 rounded-xl border border-line bg-white text-xs font-medium text-ink outline-none focus:ring-2 focus:ring-brand/15 w-[130px]"
          />
          <span className="text-ink-faint text-xs">–</span>
          <input
            type="date"
            value={toDate}
            onChange={(e) => setToDate(e.target.value)}
            className="h-8 px-2 rounded-xl border border-line bg-white text-xs font-medium text-ink outline-none focus:ring-2 focus:ring-brand/15 w-[130px]"
          />
        </div>

        {/* FY preset */}
        {!isFY && (
          <button
            onClick={resetToFY}
            title={`Reset to ${fy.label}`}
            className="h-8 px-2.5 inline-flex items-center gap-1 rounded-full border border-line bg-white text-[11px] font-medium text-ink-muted hover:text-brand hover:border-brand/30 transition-colors"
          >
            <RotateCcw className="w-3 h-3" />
            {fy.label}
          </button>
        )}
      </div>

      {/* Fetch button */}
      <button
        onClick={handleFetch}
        disabled={loading}
        className="h-9 px-4 inline-flex items-center gap-2 rounded-full text-xs font-medium border border-brand/30 bg-brand-50/40 text-brand hover:bg-brand-50 transition-colors disabled:opacity-60"
      >
        {loading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Database className="w-3.5 h-3.5" />}
        {loading ? 'Loading from Tally…' : 'Load from Tally'}
      </button>

      {/* Status */}
      {loading && (
        <span className="text-xs text-ink-muted">
          Running template {tpl?.templateNo} ({fmtDate(fromDate)} → {fmtDate(toDate)})…
        </span>
      )}

      {!loading && fetched && !error && (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
          <CheckCircle2 className="w-3.5 h-3.5" />
          Live data loaded
        </span>
      )}

      {!loading && error && (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium bg-amber-50 text-amber-700 border border-amber-200 max-w-[320px]">
          <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
          {error}
        </span>
      )}
    </div>
  );
}