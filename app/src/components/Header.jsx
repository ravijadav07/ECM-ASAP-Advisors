import { useLocation } from 'react-router-dom';
import { Menu } from 'lucide-react';
import { titleForPath } from '../config/nav';
import { ViewToggle } from './ui';
import { useView } from '../context/ViewContext';

export default function Header({ onMenuClick }) {
  const { pathname } = useLocation();
  const { view, setView } = useView();
  const title = titleForPath(pathname);

  return (
    <header className="sticky top-0 z-20 px-4 sm:px-6 bg-white/80 backdrop-blur-xl border-b border-line">
      {/* Mobile: stacked rows (title first, controls below). Desktop: single row. */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between sm:h-16">
        {/* Title row — full width on mobile, higher priority than controls */}
        <div className="flex items-center gap-3 min-w-0 py-2.5 sm:py-0">
          <button
            onClick={onMenuClick}
            aria-label="Open menu"
            className="lg:hidden p-2 -ml-2 rounded-full hover:bg-canvas-soft text-ink-muted flex-shrink-0"
          >
            <Menu className="w-5 h-5" />
          </button>
          <div className="flex flex-col justify-center min-w-0">
            <h1 className="text-base sm:text-lg font-semibold text-ink leading-tight">{title}</h1>
            <p className="text-[11px] sm:text-xs text-ink-muted mt-1 leading-none">ECM Reconciliation Suite — POC</p>
          </div>
        </div>

        {/* Controls row — wraps below the title on mobile */}
        <div className="flex items-center gap-2 sm:gap-3 pb-2.5 sm:pb-0">
          <ViewToggle view={view} onChange={setView} />
        </div>
      </div>
    </header>
  );
}