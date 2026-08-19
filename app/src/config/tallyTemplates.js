// Tally OS V3 — template definitions used by the dashboard.
// Discovered via GET /fapi/v1/pucho_piece/tally_templates_v3 (reference only).

export const TALLY_TEMPLATES = {
  gst2bReconciliation: {
    templateNo: 44,
    question: 'What is my GSTR-2B reconcilation between {{cust_from_date}} and {{cust_to_date}}',
    variables: [
      { name: 'cust_from_date', type: 'date', required: true },
      { name: 'cust_to_date', type: 'date', required: true },
    ],
  },
  reimbursementAudit: {
    templateNo: 45,
    question: 'What is Reimbursement audit between {{cust_from_date}} and {{cust_to_date}}',
    variables: [
      { name: 'cust_from_date', type: 'date', required: true },
      { name: 'cust_to_date', type: 'date', required: true },
    ],
  },
};

// Map a module key to its template definition
export function getTemplate(key) {
  return TALLY_TEMPLATES[key];
}
