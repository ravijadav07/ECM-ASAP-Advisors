import { FileCheck, ClipboardCheck, FileText, FolderOpen, Calculator, Building2, MoreHorizontal, Printer, Upload, Users } from 'lucide-react';

export const BUCKETS = [
  {
    id: 'statutory',
    label: 'Statutory',
    icon: FileCheck,
    children: [
      { path: '/statutory/tds', label: 'TDS Report', icon: Calculator },
      { path: '/statutory/2b-reco', label: 'GST 2B Reconciliation', icon: FileText },
      { path: '/statutory/26as', label: '26AS Matching', icon: ClipboardCheck },
    ],
  },
  {
    id: 'audit',
    label: 'Audit',
    icon: FolderOpen,
    children: [
      { path: '/audit/reimbursement', label: 'Reimbursement Audit', icon: Building2 },
      { path: '/audit/income-expenditure', label: 'Income & Expenditure Audit', icon: Calculator },
    ],
  },
  {
    id: 'bill-tracking',
    label: 'Bill Tracking',
    icon: FileText,
    children: [
      { path: '/bill-tracking/lt-flow', label: 'Bill Tracking — L&T Flow', icon: FileText },
      { path: '/bill-tracking/cosmos', label: 'Cosmos Report', icon: FileText },
    ],
  },
  {
    id: 'others',
    label: 'Others',
    icon: MoreHorizontal,
    children: [
      { path: '/others/invoice-print', label: 'Invoice Print (Letterhead + DSC)', icon: Printer },
      { path: '/others/bank-payment', label: 'Bank Payment (NEFT)', icon: Upload },
      { path: '/others/outstanding', label: 'Outstanding Report', icon: Users },
    ],
  },
];

// Flatten for path lookup
export const ALL_NAV = BUCKETS.flatMap((b) => b.children);

// Resolve the current page title from the path
export function titleForPath(pathname) {
  const hit = [...ALL_NAV]
    .sort((a, b) => b.path.length - a.path.length)
    .find((n) => pathname === n.path || pathname.startsWith(n.path + '/'));
  return hit ? hit.label : 'ECM Reconciliation Suite';
}

// Check if a path is a built (functional) module vs placeholder
export const BUILT_PATHS = [
  '/statutory/2b-reco',
  '/audit/reimbursement',
  '/statutory/26as',
];

export function isBuilt(pathname) {
  return BUILT_PATHS.some((p) => pathname === p || pathname.startsWith(p + '/'));
}