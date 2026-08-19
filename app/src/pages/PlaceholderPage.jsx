import { PlaceholderScreen } from '../components/UiComponents';

const PLACEHOLDER_META = {
  '/statutory/tds': { title: 'TDS Report — Monthly & Quarterly', description: 'Automated TDS reports by month and quarter, pulling from Tally TDS receivable ledgers. Currently generated manually for ECM\'s compliance filing.' },
  '/audit/income-expenditure': { title: 'Income & Expenditure Audit', description: 'Confirm that all invoices have been raised for reimbursement — the P&L-side view of the Reimbursement Audit module. Extension of the cost-centre comparison to the full income/expense ledger.' },
  '/bill-tracking/lt-flow': { title: 'Bill Tracking — L&T Document Flow', description: 'End-to-end tracking of the L&T billing pipeline: physical document movement, scanning at two locations, L&T Exim stamping, and Ariba upload. ECM\'s largest pain point — planned for Phase 2.' },
  '/bill-tracking/cosmos': { title: 'Cosmos Report for L&T', description: 'Standardised Cosmos report submission to L&T per contractual schedule. Automates data assembly and formatting currently done by hand each period.' },
  '/others/invoice-print': { title: 'Invoice Print on Letterhead with DSC', description: 'Print customer invoices on ECM letterhead with digital signature certificate applied. Replaces the current multi-step manual process.' },
  '/others/bank-payment': { title: 'Bank Payment Entries — NEFT Excel Upload', description: 'Upload bank payment data from Excel for NEFT processing. Eliminates manual entry of bulk payment batches into Tally.' },
  '/others/outstanding': { title: 'Outstanding Report to Parties', description: 'Bi-weekly outstanding reconciliation sent to L&T and other customers. Automates the tracker pull, ageing, and distribution that the accounts team runs twice a week.' },
};

export default function PlaceholderPage({ path }) {
  const meta = PLACEHOLDER_META[path] || {
    title: 'Coming Soon',
    description: 'This module is planned for a future phase of the ECM Reconciliation Suite.',
  };
  return <PlaceholderScreen title={meta.title} description={meta.description} />;
}