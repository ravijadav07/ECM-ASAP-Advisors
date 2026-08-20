import { useEffect, useRef, useState } from 'react';
import { ChevronDown, UploadCloud, X } from 'lucide-react';
import { createPortal } from 'react-dom';
import clsx from 'clsx';

export function Card({ children, className = '', onClick, active = false }) {
  return (
    <div
      onClick={onClick}
      className={clsx(
        'bg-white rounded-2xl border shadow-card p-5 transition-all duration-300',
        active ? 'border-brand/60 shadow-card-hover ring-1 ring-brand/10' : 'border-line',
        onClick && 'cursor-pointer hover:shadow-card-hover hover:border-brand/30 hover:-translate-y-0.5',
        className
      )}
    >
      {children}
    </div>
  );
}

export function Button({ children, variant = 'primary', icon: Icon, className = '', ...p }) {
  const base =
    'group relative overflow-hidden h-11 sm:h-10 px-4 inline-flex items-center justify-center gap-2 rounded-full text-sm font-semibold transition-all duration-200 outline-none focus-visible:ring-2 focus-visible:ring-brand/40 focus-visible:ring-offset-1 disabled:opacity-60 disabled:cursor-not-allowed active:scale-[0.98]';
  const styles = {
    primary: 'text-white hover:shadow-glow',
    secondary: 'bg-white border border-line text-ink hover:border-brand/40 hover:bg-brand-50/40',
    ghost: 'text-ink-muted hover:bg-canvas-soft hover:text-ink',
  };
  const style =
    variant === 'primary'
      ? { background: 'linear-gradient(180deg,#6a34d8 0%,#4B1CAA 55%,#3B1585 100%)', boxShadow: '0 6px 14px rgba(59,21,133,0.30)' }
      : undefined;
  return (
    <button className={clsx(base, styles[variant], className)} style={style} {...p}>
      {variant === 'primary' && (
        <span
          aria-hidden
          className="pointer-events-none absolute inset-x-[1px] top-[1px] h-1/2 rounded-full"
          style={{ background: 'linear-gradient(180deg, rgba(255,255,255,0.28) 0%, rgba(255,255,255,0) 100%)' }}
        />
      )}
      {Icon && <Icon className="w-4 h-4 relative z-10" />}
      <span className="relative z-10">{children}</span>
    </button>
  );
}

export function StatCard({ icon: Icon, label, value, sub, tone = 'default', onClick }) {
  const toneClass = {
    default: 'text-brand',
    green: 'text-emerald-600',
    amber: 'text-amber-600',
    cyan: 'text-cyan-600',
    grey: 'text-ink-muted',
    lavender: 'text-brand-500',
    orange: 'text-orange-600',
  }[tone] || 'text-brand';
  const iconBg = {
    default: 'bg-brand-50',
    green: 'bg-emerald-50',
    amber: 'bg-amber-50',
    cyan: 'bg-cyan-50',
    grey: 'bg-canvas-soft',
    lavender: 'bg-brand-50',
    orange: 'bg-orange-50',
  }[tone] || 'bg-brand-50';
  return (
    <Card
      onClick={onClick}
      active={false}
      className={clsx('flex flex-col gap-3', onClick && 'hover:-translate-y-0.5 focus-within:-translate-y-0.5')}
    >
      <div className="flex items-start justify-between">
        <div className={clsx('w-10 h-10 rounded-xl flex items-center justify-center ring-1 ring-inset ring-black/[0.03]', iconBg, toneClass)}>
          <Icon className="w-5 h-5" />
        </div>
      </div>
      <div>
        <h3 className="text-lg xl:text-xl font-bold text-ink leading-tight font-mono tnum tracking-tight">{value}</h3>
        <p className="text-sm text-ink-muted mt-0.5 font-sans">{label}</p>
        {sub && <p className="text-[11px] text-ink-faint mt-1 font-sans">{sub}</p>}
      </div>
    </Card>
  );
}

const TONES = {
  green: 'bg-[#ECFDF3] text-[#15803D]',
  amber: 'bg-[#FFFBEB] text-[#B45309]',
  lavender: 'bg-[#F5F3FF] text-[#6D28D9]',
  cyan: 'bg-[#ECFEFF] text-[#0E7490]',
  grey: 'bg-[#F3F4F6] text-[#4B5563]', // dark grey — #6B7280 on #F3F4F6 was 4.41:1 (fails AA); #4B5563 = 6.9:1
  red: 'bg-[#FEF2F2] text-[#DC2626]', // critical — data gap / not available
  orange: 'bg-[#FFEDD5] text-[#C2410C]', // needs review — distinct from amber (pending) and red (critical)
};

export function Badge({ tone = 'grey', children, className = '' }) {
  return (
    <span className={clsx('inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium whitespace-nowrap', TONES[tone], className)}>
      {children}
    </span>
  );
}

export function Tabs({ tabs, active, onChange }) {
  return (
    <div className="flex items-center gap-2 overflow-x-auto pb-1 -mx-1 px-1" role="tablist" aria-label="Filter by status">
      {tabs.map((t) => (
        <button
          key={t.id}
          role="tab"
          aria-selected={active === t.id}
          onClick={() => onChange(t.id)}
          className={clsx(
            'h-11 sm:h-9 px-4 rounded-full text-sm font-semibold transition-all border whitespace-nowrap flex-shrink-0 outline-none focus-visible:ring-2 focus-visible:ring-brand/40',
            active === t.id
              ? 'text-white border-transparent shadow-soft bg-gradient-to-b from-brand-500 to-brand-700'
              : 'bg-white text-ink-muted border-line hover:border-brand/30 hover:text-brand hover:bg-brand-50/40'
          )}
        >
          {t.label}
          {typeof t.count === 'number' && (
            <span className={clsx('ml-1.5 text-xs', active === t.id ? 'text-white/80' : 'text-ink-faint')}>({t.count})</span>
          )}
        </button>
      ))}
    </div>
  );
}

export function ViewToggle({ view, onChange }) {
  return (
    <div className="flex items-center gap-1 p-1 bg-canvas-soft border border-line rounded-full">
      <button
        onClick={() => onChange('admin')}
        className={clsx(
          'h-11 sm:h-8 px-3 rounded-full text-xs font-medium transition-colors',
          view === 'admin' ? 'bg-amber-100 text-amber-700' : 'text-ink-muted hover:text-ink'
        )}
      >
        Admin / Director
      </button>
      <button
        onClick={() => onChange('user')}
        className={clsx(
          'h-11 sm:h-8 px-3 rounded-full text-xs font-medium transition-colors',
          view === 'user' ? 'bg-emerald-100 text-emerald-700' : 'text-ink-muted hover:text-ink'
        )}
      >
        User / Accounts
      </button>
    </div>
  );
}

export function MockPill() {
  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-[#FFFBEB] text-[#B45309] border border-amber-200/60">
      <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
      <span className="hidden sm:inline">MOCK DATA — NOT CONNECTED</span>
      <span className="sm:hidden">MOCK</span>
    </span>
  );
}

/* Modern period selector — styled, not a native <select>. */
export function PeriodSelector({ value = 'Jul 2026', onChange }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const periods = ['Jul 2026', 'Jun 2026', 'May 2026', 'Q1 FY26 (Apr–Jun)', 'FY25 (Apr–Mar)'];

  useEffect(() => {
    const onClick = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="listbox"
        aria-expanded={open}
        className="h-11 sm:h-10 px-4 inline-flex items-center gap-2 rounded-full bg-white border border-line text-sm font-medium text-ink hover:bg-canvas-soft transition-colors"
      >
        <span className="text-ink-muted text-xs">Period:</span>
        {value}
        <ChevronDown className={clsx('w-4 h-4 text-ink-muted transition-transform', open && 'rotate-180')} />
      </button>
      {open && (
        <div className="absolute right-0 sm:left-0 mt-2 w-56 bg-white rounded-2xl border border-line shadow-card-hover py-1 z-30" role="listbox">
          {periods.map((p) => (
            <button
              key={p}
              role="option"
              aria-selected={p === value}
              onClick={() => {
                onChange?.(p);
                setOpen(false);
              }}
              className={clsx(
                'w-full text-left px-4 py-2.5 text-sm transition-colors',
                p === value ? 'bg-brand-50 text-brand font-medium' : 'text-ink hover:bg-canvas-soft'
              )}
            >
              {p}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/* Functional upload panel with file-specific slots. Pass `requiredFiles` as an
   array of { name, label, file?, status: 'uploaded'|'missing' }. */
export function UploadPanel({ title = 'Data Upload', description, requiredFiles = [], onFilesChange, onFileContent, accept, showParseSummary = true }) {
  const [activeSlot, setActiveSlot] = useState(null);
  const [parse, setParse] = useState(null);
  const inputRef = useRef(null);

  const handlePick = (index) => {
    setActiveSlot(index);
    inputRef.current?.click();
  };

  const handleFile = (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    const slot = requiredFiles[activeSlot];
    const next = requiredFiles.map((s, i) =>
      i === activeSlot ? { ...s, file: f.name, status: 'uploaded' } : s
    );
    onFilesChange?.(next);

    // If the caller wants the actual file content (e.g. to parse a JSON), read it.
    if (onFileContent) {
      const reader = new FileReader();
      reader.onload = () => {
        const summary = onFileContent(slot?.name, reader.result, f);
        if (showParseSummary) {
          setParse(summary || { read: 1, rejected: 0, reasons: [], names: [f.name] });
        }
      };
      reader.onerror = () => onFileContent(slot?.name, null, f);
      reader.readAsText(f);
    } else if (showParseSummary) {
      const uploaded = next.filter((s) => s.status === 'uploaded');
      setParse({ read: uploaded.length > 0 ? 18 : 0, rejected: 0, reasons: [], names: uploaded.map((s) => s.file) });
    }
    e.target.value = '';
  };

  const allUploaded = requiredFiles.every((f) => f.status === 'uploaded');
  const anyUploaded = requiredFiles.some((f) => f.status === 'uploaded');

  return (
    <>
      <Card>
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div className="flex-1">
            <h2 className="text-sm font-semibold text-ink">{title}</h2>
            {description && <p className="text-xs text-ink-muted mt-1">{description}</p>}

            <div className="flex flex-wrap gap-2 mt-3">
              {requiredFiles.map((slot, i) => (
                <button
                  key={i}
                  onClick={() => handlePick(i)}
                  onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && handlePick(i)}
                  className={clsx(
                    'flex items-center gap-2 px-3 py-2 rounded-xl border text-xs font-medium transition-colors',
                    slot.status === 'uploaded'
                      ? 'bg-emerald-50 border-emerald-200 text-emerald-700 cursor-default'
                      : 'bg-white border-dashed border-brand/30 text-ink-muted hover:border-brand/50 hover:bg-brand-50/30 cursor-pointer'
                  )}
                >
                  {slot.status === 'uploaded' ? (
                    <>
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                      <span className="max-w-[160px] truncate" title={slot.file}>{slot.file}</span>
                    </>
                  ) : (
                    <>
                      <UploadCloud className="w-3.5 h-3.5 text-brand" />
                      {slot.label}
                    </>
                  )}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            {anyUploaded && (
              <span className={clsx(
                'inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium border',
                allUploaded
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                  : 'bg-amber-50 border-amber-200 text-amber-700'
              )}>
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                {allUploaded ? `${requiredFiles.length} files ready` : `${requiredFiles.filter(f => f.status === 'uploaded').length} of ${requiredFiles.length} files`}
              </span>
            )}
          </div>

          <input ref={inputRef} type="file" accept={accept} className="hidden" onChange={handleFile} />
        </div>
      </Card>

      <ParseSummaryModal open={!!parse} onClose={() => setParse(null)} result={parse} />
    </>
  );
}

function ParseSummaryModal({ open, onClose, result }) {
  if (!open || !result) return null;
  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-label="Parse summary">
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-3xl border border-line shadow-card-hover w-full max-w-md p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-ink">Parse Summary</h3>
          <button onClick={onClose} aria-label="Close" className="p-2 rounded-full hover:bg-canvas-soft text-ink-muted -mr-2">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="space-y-3 text-sm">
          <div className="grid grid-cols-2 gap-2">
            <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200">
              <p className="text-2xl font-bold text-emerald-700 font-display">{result.read}</p>
              <p className="text-xs text-emerald-600 mt-1">Records read</p>
            </div>
            <div className="p-3 rounded-xl bg-amber-50 border border-amber-200">
              <p className="text-2xl font-bold text-amber-700 font-display">{result.rejected}</p>
              <p className="text-xs text-amber-600 mt-1">Records rejected</p>
            </div>
          </div>
          <div>
            <p className="text-xs text-ink-muted mb-2">Files parsed:</p>
            {result.names.map((n) => (
              <div key={n} className="flex items-center gap-2 text-xs py-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                {n}
              </div>
            ))}
          </div>
          {result.rejected > 0 && result.reasons.length > 0 && (
            <div className="p-3 rounded-xl bg-red-50 border border-red-200">
              <p className="text-xs text-red-600 font-medium mb-1">Rejection reasons:</p>
              {result.reasons.map((r) => (
                <p key={r} className="text-xs text-red-500">• {r}</p>
              ))}
            </div>
          )}
          <button onClick={onClose} className="w-full h-11 rounded-full text-white text-sm font-medium" style={{ background: 'linear-gradient(180deg,#5922c6 0%,#3B1585 100%)' }}>
            Run Reconciliation
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

/* ───────── Filters ───────── */

export function FilterBar({ children, className = '' }) {
  return (
    <div className={`flex items-center gap-2 flex-wrap ${className}`}>
      {children}
    </div>
  );
}

export function SelectFilter({ label, value, options, onChange, allLabel = 'All' }) {
  return (
    <div className="flex items-center gap-1.5">
      {label && <span className="text-[11px] font-medium text-ink-muted whitespace-nowrap">{label}:</span>}
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-8 sm:h-9 px-2.5 rounded-xl border border-line bg-white text-xs font-medium text-ink outline-none focus:ring-2 focus:ring-brand/15 appearance-none cursor-pointer pr-6"
      >
        <option value="">{allLabel}</option>
        {options.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
    </div>
  );
}

export function DateFilter({ label, value, onChange }) {
  return (
    <div className="flex items-center gap-1.5">
      {label && <span className="text-[11px] font-medium text-ink-muted whitespace-nowrap">{label}:</span>}
      <input
        type="date"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-8 sm:h-9 px-2.5 rounded-xl border border-line bg-white text-xs font-medium text-ink outline-none focus:ring-2 focus:ring-brand/15"
      />
    </div>
  );
}

export function DateRangeFilter({ labelFrom, labelTo, from, to, onFromChange, onToChange }) {
  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      <span className="text-[11px] font-medium text-ink-muted whitespace-nowrap">Date:</span>
      <input
        type="date"
        value={from}
        onChange={(e) => onFromChange(e.target.value)}
        placeholder="From"
        className="h-8 sm:h-9 px-2.5 rounded-xl border border-line bg-white text-xs font-medium text-ink outline-none focus:ring-2 focus:ring-brand/15 w-32"
      />
      <span className="text-ink-faint text-xs">–</span>
      <input
        type="date"
        value={to}
        onChange={(e) => onToChange(e.target.value)}
        placeholder="To"
        className="h-8 sm:h-9 px-2.5 rounded-xl border border-line bg-white text-xs font-medium text-ink outline-none focus:ring-2 focus:ring-brand/15 w-32"
      />
    </div>
  );
}

export function InputFilter({ label, value, onChange, placeholder = 'Filter…', type = 'text' }) {
  const handleChange = (e) => {
    const v = e.target.value;
    if (type === 'number') {
      // Allow empty or valid numeric input only (prevents NaN silently)
      if (v === '' || /^\d+$/.test(v)) onChange(v);
    } else {
      onChange(v);
    }
  };
  return (
    <div className="flex items-center gap-1.5">
      {label && <span className="text-[11px] font-medium text-ink-muted whitespace-nowrap">{label}:</span>}
      <input
        type={type === 'number' ? 'text' : type}
        inputMode={type === 'number' ? 'numeric' : undefined}
        pattern={type === 'number' ? '[0-9]*' : undefined}
        value={value}
        onChange={handleChange}
        placeholder={placeholder}
        className="h-8 sm:h-9 px-2.5 rounded-xl border border-line bg-white text-xs font-medium text-ink outline-none focus:ring-2 focus:ring-brand/15 w-40"
      />
    </div>
  );
}