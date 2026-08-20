import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Search, X, Download, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, ClipboardList } from 'lucide-react';
import { Button, Card } from './ui';
import { exportToCsv } from '../utils/csv';

export function DataTable({
  columns, data, emptyMessage = 'No records found.', onRowClick,
  exportFilename = 'export.csv', paginate = false, pageSize: initialPageSize = 10
}) {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(initialPageSize);
  const scrollRef = useRef(null);
  const [canScroll, setCanScroll] = useState(false);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const check = () => setCanScroll(el.scrollWidth > el.clientWidth + 4);
    check();
    const ro = new ResizeObserver(check);
    ro.observe(el);
    return () => ro.disconnect();
  }, [data]);

  // Reset page when search changes
  useEffect(() => { setPage(1); }, [search]);

  const filtered = search
    ? data.filter((row) =>
        columns.some((col) => {
          const v = col.accessor ? row[col.accessor] : '';
          return String(v).toLowerCase().includes(search.toLowerCase());
        })
      )
    : data;

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const paginated = paginate
    ? filtered.slice((safePage - 1) * pageSize, safePage * pageSize)
    : filtered;

  const handleExport = () => exportToCsv(exportFilename, columns, filtered);

  const showingFrom = filtered.length === 0 ? 0 : (safePage - 1) * pageSize + 1;
  const showingTo = Math.min(safePage * pageSize, filtered.length);

  return (
    <Card className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-faint" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search…"
            aria-label="Search records"
            className="w-full pl-9 pr-9 h-10 bg-canvas-soft border border-line rounded-2xl text-sm outline-none focus:ring-2 focus:ring-brand/15 focus:border-brand transition-all"
          />
          {search && (
            <button onClick={() => setSearch('')} aria-label="Clear search" className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-faint hover:text-ink">
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
        <Button variant="secondary" icon={Download} onClick={handleExport} className="h-10">
          Export Excel
        </Button>
      </div>

      {paginated.length === 0 ? (
        <div className="py-12 text-center text-sm text-ink-muted">{emptyMessage}</div>
      ) : (
        <div className="relative">
          <div ref={scrollRef} className="overflow-x-auto rounded-xl border border-line" tabIndex={0} aria-label="Data table, scroll horizontally for more columns">
            <table className="w-full text-left text-sm">
              <thead className="bg-canvas-soft text-ink-muted sticky top-0 z-10">
                <tr>
                  {columns.map((col) => (
                    <th
                      key={col.accessor || col.header}
                      className={`px-4 py-2.5 whitespace-nowrap select-none text-[11px] font-semibold uppercase tracking-wide ${col.align === 'right' ? 'text-right' : 'text-left'}`}
                    >
                      {col.header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {paginated.map((row, i) => (
                  <tr
                    key={row.id || i}
                    tabIndex={onRowClick ? 0 : undefined}
                    role={onRowClick ? 'button' : undefined}
                    onClick={() => onRowClick && onRowClick(row)}
                    onKeyDown={(e) => {
                      if (onRowClick && (e.key === 'Enter' || e.key === ' ')) {
                        e.preventDefault();
                        onRowClick(row);
                      }
                    }}
                    className={onRowClick ? 'hover:bg-canvas-soft transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-inset focus:ring-brand/30' : 'hover:bg-canvas-soft transition-colors'}
                  >
                    {columns.map((col) => (
                      <td
                        key={col.accessor || col.header}
                        className={col.align === 'right' ? 'px-4 py-2.5 text-ink text-right font-mono tnum tabular-nums whitespace-nowrap' : 'px-4 py-2.5 text-ink'}
                      >
                        {col.render ? col.render(row) : col.accessor ? row[col.accessor] : ''}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {canScroll && (
            <div className="pointer-events-none absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-canvas-soft/80 to-transparent rounded-r-xl flex items-center justify-end pr-1">
              <span className="text-ink-faint text-xs">→</span>
            </div>
          )}
        </div>
      )}

      <div className="flex items-center justify-between flex-wrap gap-3 text-xs text-ink-muted">
        {paginate && filtered.length > 0 ? (
          <>
            <div className="flex items-center gap-2">
              <span>Rows:</span>
              <select
                value={pageSize}
                onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1); }}
                className="h-7 px-2 rounded-lg border border-line bg-white text-xs outline-none focus:ring-2 focus:ring-brand/15"
              >
                {[5, 10, 25, 50].map((n) => (
                  <option key={n} value={n}>{n}</option>
                ))}
              </select>
              <span className="ml-2">
                {showingFrom}–{showingTo} of {filtered.length}
              </span>
            </div>
            <Pagination page={safePage} totalPages={totalPages} onChange={setPage} />
          </>
        ) : (
          <span>{filtered.length} of {data.length} records</span>
        )}
      </div>
    </Card>
  );
}

function Pagination({ page, totalPages, onChange }) {
  const pages = [];
  const maxVisible = 5;

  let start = Math.max(1, page - Math.floor(maxVisible / 2));
  let end = Math.min(totalPages, start + maxVisible - 1);
  if (end - start + 1 < maxVisible) start = Math.max(1, end - maxVisible + 1);

  if (start > 1) {
    pages.push({ num: 1, key: 1 });
    if (start > 2) pages.push({ num: '…', key: 'ellipsis-start', disabled: true });
  }
  for (let i = start; i <= end; i++) pages.push({ num: i, key: i });
  if (end < totalPages) {
    if (end < totalPages - 1) pages.push({ num: '…', key: 'ellipsis-end', disabled: true });
    pages.push({ num: totalPages, key: totalPages });
  }

  if (totalPages <= 1) return null;

  return (
    <div className="flex items-center gap-0.5">
      <button
        onClick={() => onChange(1)}
        disabled={page === 1}
        aria-label="First page"
        className="h-8 w-8 flex items-center justify-center rounded-lg disabled:opacity-30 hover:bg-canvas-soft transition-colors"
      >
        <ChevronsLeft className="w-3.5 h-3.5" />
      </button>
      <button
        onClick={() => onChange(page - 1)}
        disabled={page === 1}
        aria-label="Previous page"
        className="h-8 w-8 flex items-center justify-center rounded-lg disabled:opacity-30 hover:bg-canvas-soft transition-colors"
      >
        <ChevronLeft className="w-3.5 h-3.5" />
      </button>
      {pages.map((p) => (
        <button
          key={p.key}
          onClick={() => !p.disabled && onChange(p.num)}
          disabled={p.disabled}
          className={`h-8 min-w-[2rem] px-1.5 flex items-center justify-center rounded-lg text-xs font-medium transition-colors ${
            p.num === page
              ? 'bg-brand-600 text-white shadow-soft'
              : p.disabled
              ? 'cursor-default'
              : 'hover:bg-canvas-soft'
          }`}
        >
          {p.num}
        </button>
      ))}
      <button
        onClick={() => onChange(page + 1)}
        disabled={page === totalPages}
        aria-label="Next page"
        className="h-8 w-8 flex items-center justify-center rounded-lg disabled:opacity-30 hover:bg-canvas-soft transition-colors"
      >
        <ChevronRight className="w-3.5 h-3.5" />
      </button>
      <button
        onClick={() => onChange(totalPages)}
        disabled={page === totalPages}
        aria-label="Last page"
        className="h-8 w-8 flex items-center justify-center rounded-lg disabled:opacity-30 hover:bg-canvas-soft transition-colors"
      >
        <ChevronsRight className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}

export function Modal({ open, onClose, title, children }) {
  const ref = useRef(null);
  const previousFocus = useRef(null);

  useEffect(() => {
    if (open) {
      previousFocus.current = document.activeElement;
      if (ref.current) ref.current.focus();
      const onKey = (e) => {
        if (e.key === 'Escape') onClose();
        if (e.key === 'Tab') {
          const focusables = ref.current?.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
          if (!focusables || focusables.length === 0) return;
          const first = focusables[0];
          const last = focusables[focusables.length - 1];
          if (e.shiftKey && document.activeElement === first) {
            e.preventDefault();
            last.focus();
          } else if (!e.shiftKey && document.activeElement === last) {
            e.preventDefault();
            first.focus();
          }
        }
      };
      document.addEventListener('keydown', onKey);
      return () => {
        document.removeEventListener('keydown', onKey);
        if (previousFocus.current) previousFocus.current.focus();
      };
    }
  }, [open, onClose]);

  if (!open) return null;
  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-label={title} onClick={onClose}>
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" />
      <div ref={ref} tabIndex={-1} className="relative bg-white rounded-3xl border border-line shadow-card-hover w-full max-w-lg max-h-[85vh] overflow-y-auto p-6 outline-none" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-ink">{title}</h3>
          <button onClick={onClose} aria-label="Close" className="p-2 rounded-full hover:bg-canvas-soft text-ink-muted -mr-2">
            <X className="w-5 h-5" />
          </button>
        </div>
        {children}
      </div>
    </div>,
    document.body
  );
}

export function EmptyState({ icon: Icon, title, description }) {
  return (
    <Card className="flex flex-col items-center justify-center py-12 text-center">
      {Icon && <Icon className="w-10 h-10 text-ink-faint mb-3" />}
      <h3 className="text-base font-semibold text-ink">{title}</h3>
      {description && <p className="text-sm text-ink-muted mt-1 max-w-sm">{description}</p>}
    </Card>
  );
}

export function Skeleton({ rows = 4, cols = 5 }) {
  return (
    <Card className="flex flex-col gap-4" aria-hidden="true">
      <div className="h-10 w-72 bg-canvas-soft rounded-2xl animate-pulse" />
      <div className="overflow-hidden rounded-xl border border-line">
        {Array.from({ length: rows }).map((_, r) => (
          <div key={r} className="flex border-b border-line last:border-0">
            {Array.from({ length: cols }).map((__, c) => (
              <div key={c} className="flex-1 px-4 py-3">
                <div className="h-4 bg-canvas-soft rounded animate-pulse" style={{ animationDelay: `${(r + c) * 0.05}s` }} />
              </div>
            ))}
          </div>
        ))}
      </div>
    </Card>
  );
}

export function PlaceholderScreen({ title, description }) {
  return (
    <div className="flex flex-col items-center justify-center py-20">
      <div className="w-16 h-16 rounded-2xl bg-brand-50 border border-line flex items-center justify-center mb-5 text-brand">
        <ClipboardList className="w-7 h-7" />
      </div>
      <h2 className="text-xl font-semibold text-ink mb-2">{title}</h2>
      <p className="text-sm text-ink-muted max-w-md text-center">{description}</p>
      <span className="mt-4 px-3 py-1 rounded-full bg-brand-50 text-brand text-xs font-medium">Coming in Phase 2</span>
    </div>
  );
}