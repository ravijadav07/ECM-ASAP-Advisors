import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { ChevronDown, PanelLeftClose, PanelLeftOpen, X, LogOut } from 'lucide-react';
import { BUCKETS, isBuilt } from '../config/nav';
import { useAuth } from '../context/AuthContext';
import clsx from 'clsx';
import puchoLogo from '../assets/brand/logo.png';

function SoonPill({ active }) {
  return (
    <span
      className={clsx(
        'ml-auto text-[9px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded-full',
        active ? 'bg-white/25 text-white' : 'bg-canvas-soft text-ink-faint'
      )}
    >
      Soon
    </span>
  );
}

export default function Sidebar({ open, onClose }) {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { logout } = useAuth();
  const [expanded, setExpanded] = useState({});
  const [collapsed, setCollapsed] = useState(false);

  const toggleBucket = (id) => setExpanded((p) => ({ ...p, [id]: !p[id] }));
  const isActive = (path) => pathname === path || pathname.startsWith(path + '/');
  const bucketActive = (bucket) => bucket.children.some((c) => isActive(c.path));

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  // ---- Desktop sidebar (collapsible) ----
  const desktopSidebar = (
    <aside
      className={clsx(
        'hidden lg:flex flex-col h-screen bg-white border-r border-line transition-all duration-300 ease-in-out',
        collapsed ? 'w-16' : 'w-60'
      )}
    >
      {/* Header — logo only, no controls */}
      <div
        className={clsx(
          'flex items-center border-b border-line h-16',
          collapsed ? 'justify-center px-2' : 'px-5'
        )}
      >
        <img src={puchoLogo} alt="Pucho.ai" className="h-6 flex-shrink-0" />
        {!collapsed && (
          <span className="ml-2.5 text-xs font-bold text-ink-muted tracking-wide whitespace-nowrap">ECM</span>
        )}
      </div>

      {/* Nav */}
      <nav className={clsx('flex-1 py-4 space-y-1', collapsed ? 'px-2 overflow-visible' : 'px-3 overflow-y-auto')}>
        {collapsed
          ? // --- Collapsed: icon-only with flyout on hover ---
            BUCKETS.map((bucket) => {
              const BucketIcon = bucket.icon;
              const active = bucketActive(bucket);
              return (
                <div key={bucket.id} className="relative group">
                  <div
                    title={bucket.label}
                    className={clsx(
                      'w-full h-11 flex items-center justify-center rounded-2xl cursor-pointer transition-colors',
                      active ? 'bg-brand-50 text-brand' : 'text-ink-muted hover:bg-canvas-soft'
                    )}
                  >
                    <BucketIcon className="w-5 h-5" />
                  </div>
                  {/* Flyout */}
                  <div className="absolute left-full top-0 ml-2 hidden group-hover:block w-52 bg-white rounded-2xl border border-line shadow-card-hover p-2 z-30 before:content-[''] before:absolute before:-left-2 before:top-0 before:bottom-0 before:w-2">
                    <p className="text-xs font-semibold text-ink-muted px-3 py-1.5">{bucket.label}</p>
                    {bucket.children.map((item) => {
                      const ItemIcon = item.icon;
                      const itemActive = isActive(item.path);
                      return (
                        <Link
                          key={item.path}
                          to={item.path}
                          className={clsx(
                            'flex items-center gap-2 h-9 px-3 rounded-2xl text-sm font-medium transition-colors truncate',
                            itemActive ? 'bg-gradient-to-r from-brand-600 to-brand-500 text-white shadow-soft' : 'text-ink-muted hover:bg-brand-50/60 hover:text-brand'
                          )}
                        >
                          <ItemIcon className="w-4 h-4 opacity-70 flex-shrink-0" />
                          <span className="truncate flex-1">{item.label}</span>
                          {!isBuilt(item.path) && <SoonPill active={itemActive} />}
                        </Link>
                      );
                    })}
                  </div>
                </div>
              );
            })
          : // --- Expanded: accordion buckets ---
            BUCKETS.map((bucket) => {
              const active = bucketActive(bucket);
              const open = expanded[bucket.id] ?? active;
              const BucketIcon = bucket.icon;
              return (
                <div key={bucket.id}>
                  <button
                    onClick={() => toggleBucket(bucket.id)}
                    aria-expanded={open}
                    className={clsx(
                      'w-full flex items-center gap-2.5 h-11 px-3 rounded-2xl text-sm font-medium transition-colors',
                      active ? 'bg-brand-50/70 text-brand font-semibold' : 'text-ink-muted hover:bg-canvas-soft hover:text-ink'
                    )}
                  >
                    <BucketIcon className="w-5 h-5 opacity-70 flex-shrink-0" />
                    <span className="flex-1 text-left">{bucket.label}</span>
                    <ChevronDown className={clsx('w-4 h-4 transition-transform flex-shrink-0', open && 'rotate-180')} />
                  </button>
                  {open && (
                    <div className="ml-3 mt-1 space-y-0.5">
                      {bucket.children.map((item) => {
                        const itemActive = isActive(item.path);
                        const ItemIcon = item.icon;
                        return (
                          <Link
                            key={item.path}
                            to={item.path}
                            className={clsx(
                              'flex items-center gap-2 h-11 px-3 rounded-2xl text-sm font-medium transition-colors',
                              itemActive ? 'bg-gradient-to-r from-brand-600 to-brand-500 text-white shadow-soft' : 'text-ink-muted hover:bg-brand-50/60 hover:text-brand'
                            )}
                          >
                            <ItemIcon className="w-4 h-4 opacity-70 flex-shrink-0" />
                            <span className="truncate">{item.label}</span>
                          </Link>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
      </nav>

      {/* Collapse / Expand toggle — sits above the user section */}
      <div className={clsx('border-t border-line', collapsed ? 'py-2 px-2' : 'py-2 px-3')}>
        {collapsed ? (
          <button
            onClick={() => setCollapsed(false)}
            aria-label="Expand sidebar"
            title="Expand sidebar"
            className="w-full h-9 flex items-center justify-center rounded-2xl text-ink-muted hover:bg-canvas-soft hover:text-brand transition-colors"
          >
            <PanelLeftOpen className="w-4 h-4" />
          </button>
        ) : (
          <button
            onClick={() => setCollapsed(true)}
            className="w-full h-9 flex items-center justify-center gap-2 rounded-2xl text-sm font-medium text-ink-muted hover:bg-canvas-soft hover:text-ink transition-colors"
          >
            <PanelLeftClose className="w-4 h-4" />
            Collapse
          </button>
        )}
      </div>

      {/* Bottom: user chip + logout */}
      <div className={clsx('border-t border-line', collapsed ? 'px-2 py-3' : 'px-4 py-3')}>
        {collapsed ? (
          <div className="flex flex-col items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-brand-600 flex items-center justify-center text-white text-xs font-bold" title="ECM">
              EC
            </div>
            <button
              onClick={handleLogout}
              title="Logout"
              className="p-2 rounded-full hover:bg-canvas-soft text-ink-muted hover:text-red-500 transition-colors"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            <div className="flex items-center gap-2.5 px-3 py-2 rounded-2xl bg-canvas-soft">
              <div className="w-7 h-7 rounded-full bg-brand-600 flex items-center justify-center text-white text-xs font-bold">EC</div>
              <div className="text-xs">
                <p className="font-medium text-ink">ECM</p>
                <p className="text-ink-faint">Accounts</p>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-2.5 h-11 px-3 rounded-2xl text-sm font-medium text-ink-muted hover:bg-red-50 hover:text-red-600 transition-colors"
            >
              <LogOut className="w-4 h-4" />
              Logout
            </button>
          </div>
        )}
      </div>
    </aside>
  );

  // ---- Mobile drawer ----
  const mobileDrawer = open && (
    <div className="fixed inset-0 z-[60] lg:hidden">
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={onClose} />
      <aside className="absolute left-0 top-0 bottom-0 w-72 max-w-[calc(100vw-24px)] bg-white border-r border-line flex flex-col shadow-card-hover h-dvh">
        <div className="h-16 px-5 flex items-center justify-between border-b border-line flex-shrink-0">
          <div className="flex items-center">
            <img src={puchoLogo} alt="Pucho.ai" className="h-6" />
            <span className="ml-2.5 text-xs font-bold text-ink-muted tracking-wide">ECM</span>
          </div>
          <button onClick={onClose} aria-label="Close menu" className="p-2 rounded-full hover:bg-canvas-soft text-ink-muted -mr-2">
            <X className="w-5 h-5" />
          </button>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {BUCKETS.map((bucket) => {
            const active = bucketActive(bucket);
            const open = expanded[bucket.id] ?? active;
            const BucketIcon = bucket.icon;
            return (
              <div key={bucket.id}>
                <button
                  onClick={() => toggleBucket(bucket.id)}
                  aria-expanded={open}
                  className={clsx(
                    'w-full flex items-center gap-2.5 h-11 px-3 rounded-2xl text-sm font-medium transition-colors',
                    active ? 'bg-brand-50 text-ink' : 'text-ink-muted hover:bg-canvas-soft'
                  )}
                >
                  <BucketIcon className="w-5 h-5 opacity-70 flex-shrink-0" />
                  <span className="flex-1 text-left">{bucket.label}</span>
                  <ChevronDown className={clsx('w-4 h-4 transition-transform flex-shrink-0', open && 'rotate-180')} />
                </button>
                {open && (
                  <div className="ml-3 mt-1 space-y-0.5">
                    {bucket.children.map((item) => {
                      const itemActive = isActive(item.path);
                      const ItemIcon = item.icon;
                      return (
                        <Link
                          key={item.path}
                          to={item.path}
                          onClick={onClose}
                          className={clsx(
                            'flex items-center gap-2 h-11 px-3 rounded-2xl text-sm font-medium transition-colors',
                            itemActive ? 'bg-gradient-to-r from-brand-600 to-brand-500 text-white shadow-soft' : 'text-ink-muted hover:bg-brand-50/60 hover:text-brand'
                          )}
                        >
                          <ItemIcon className="w-4 h-4 opacity-70 flex-shrink-0" />
                          <span className="flex-1">{item.label}</span>
                          {!isBuilt(item.path) && <SoonPill active={itemActive} />}
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </nav>

        <div className="px-4 py-3 border-t border-line space-y-2 flex-shrink-0">
          <div className="flex items-center gap-2.5 px-3 py-2 rounded-2xl bg-canvas-soft">
            <div className="w-7 h-7 rounded-full bg-brand-600 flex items-center justify-center text-white text-xs font-bold">EC</div>
            <div className="text-xs">
              <p className="font-medium text-ink">ECM</p>
              <p className="text-ink-faint">Accounts</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-2.5 h-11 px-3 rounded-2xl text-sm font-medium text-ink-muted hover:bg-red-50 hover:text-red-600 transition-colors"
          >
            <LogOut className="w-4 h-4" />
            Logout
          </button>
        </div>
      </aside>
    </div>
  );

  return (
    <>
      {desktopSidebar}
      {mobileDrawer}
    </>
  );
}