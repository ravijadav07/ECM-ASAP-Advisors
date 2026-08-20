# ECM — Proof of Concept

**Functional Specification · Process Flows · Dashboard Design**
GST 2B Reconciliation · Reimbursement Audit · 26AS Matching

*Prepared by: Pucho.ai Solution Architecture Team*

| | |
|---|---|
| **End client** | ECM — clearing & forwarding agent; major customer L&T |
| **Client contacts** | Urshita Parekh (Accounts & Finance), Karthik Jobanputra (Director) |
| **Channel partner** | ASAP Advisors — Anand (relationship), Ravi (account / Tally handling) |
| **Pucho.ai** | Kapil Saini (Co-founder); build team — Anurag and Keval |
| **Source** | Requirement list (10 points, Word) + MoM dated 14 August 2026 |
| **POC scope** | 3 functional modules out of 10 requirement points; remaining points shown as menu only |
| **Data mode** | File-based (Tally exports + downloaded portal files). No live API in POC. |
| **Committed timeline** | One week from data handover; ETA confirmation due to ASAP Advisors |
| **Document version** | v1.0 — 14 August 2026 |

> **Purpose of this POC**
> The client has approved the direction but not the commercials. Karthik Jobanputra wants confidence before costing is discussed. The POC therefore has to be visibly complete at the UI level across all four buckets, while proving real, working logic on the three modules where the value is most obvious and the data is already available in Tally. Reimbursement Audit is the module the director specifically asked for and is the non-negotiable of the three.

---

## 1. Scope of the POC

The client shared ten requirement points. For the POC, all ten are organised into four menu buckets so the full picture is visible, but only three are functionally built.

| Bucket | Requirement points | POC status |
|---|---|---|
| **Statutory** | 1) TDS report — monthly and quarterly<br>**2) GST — custom 2B reco**<br>**9) 26AS matching — potential matching** | **Points 2 and 9 built.** Point 1 menu only. |
| **Audit** | **6) Reimbursement audit**<br>7) Income and expenditure audit — confirm all invoices raised for reimbursement | **Point 6 built.** Point 7 menu only. |
| **Bill Tracking** | 5) Bill tracking details — full L&T document flow<br>8) Cosmos report to be submitted to L&T | Menu only. Largest pain point, planned for phase 2. |
| **Others** | 3) Invoice print on letterhead with DSC<br>4) Bank payment entries — Excel upload for NEFT<br>10) Outstanding report to parties twice a week | Menu only. |

### Why these three

- **Reimbursement Audit** — explicitly asked for by the director. The data already exists in Tally under cost centres, so no new capture is needed. The output is a rupee figure of unbilled recoverable expense, the fastest way to demonstrate money left on the table.
- **GST 2B Reco** — a standard reconciliation, but ECM has a non-standard claim rule that no off-the-shelf tool handles. Showing that rule working is what differentiates the demo.
- **26AS Matching** — ASAP Advisors already has the domain model and has sold it as a Tally customisation, so the logic is known and low-risk to reproduce. It rounds out the Statutory bucket.

### Deliberately excluded from the POC

- No live API integration with the GST or income tax portal. All portal data enters as a downloaded file uploaded by the user. The client is comfortable with download-upload even beyond the POC; API integration will be positioned in the demo as available on request and is not expensive to add later.
- No write-back into Tally. The POC reads exported data and produces reports; it does not post vouchers.
- No user management, roles or approval workflow. Single-user demo application.
- Bill tracking (point 5) is not built even though it is the client's biggest pain point. It involves physical document movement, two scanning locations, L&T Exim stamping and Ariba upload, and cannot be proven inside one week.

---

## 2. Data sources and handover

Everything comes from ASAP Advisors, not from the client's live systems. Ravi's team maintains the Tally AMC and has already built TDL customisations for all three areas, so the required fields are known to exist.

| # | Input file | Source | Used by | Format |
|---|---|---|---|---|
| D1 | Purchase register with GST detail | Tally export | 2B Reco | XML / JSON |
| D2 | Sales register with customer invoice reference and job linkage | Tally export | 2B Reco, Reimbursement Audit | XML / JSON |
| D3 | GSTR-2B for the return period | Downloaded from GST portal | 2B Reco | JSON |
| D4 | Cost centre / cost category wise expense and recovery detail | Tally export (TDL fields) | Reimbursement Audit | XML / JSON |
| D5 | Cost centre master and job master | Tally export | Reimbursement Audit | XML / JSON |
| D6 | TDS receivable ledger, invoice-wise, with customer TAN | Tally export | 26AS Matching | XML / JSON |
| D7 | 26AS statement for the period | Downloaded from income tax portal | 26AS Matching | TXT |
| D8 | Party / customer master with GSTIN, PAN and TAN | Tally export | All three | XML / JSON |

> **Handover dependency**
> Anand confirmed the files will be provided in XML or JSON, whichever the build team prefers, and that the required fields already exist in the TDL. The team should specify the exact field list per file before the export is generated, so a second round trip is avoided inside a one-week build.

### Domain walkthrough required before build starts

Ravi is to explain three things to Anurag and Keval. This is on the action list from the meeting but has no owner date yet, and it blocks all three modules:

1. The 2B reco structure and the claim-deferral rule as implemented in the Tally TDL.
2. The cost centre structure — how a job or shipment maps to a cost centre, and which ledgers or cost categories are treated as reimbursable.
3. The 26AS reco structure — the TXT import format and the matching already done inside Tally.

---

# MODULE 1 — GST 2B Reconciliation

*Requirement point 2 · Statutory bucket*

**Requirement as written by the client:** "GST – Custom GST report – 2B reco but only claim the credit when we raise the Invoice to Customer – Credit available take claim, Credit Available not to be claim this month, Invoice not uploaded by party, Purchase not booked by ECM."

## 1.1 What makes this different from a standard 2B reco

A normal reconciliation compares GSTR-2B against the purchase register and stops there. ECM adds a commercial rule on top. As a clearing and forwarding agent, a large part of their purchases are incurred on behalf of a customer and recharged to that customer. ECM does not take input credit on such a purchase until the corresponding sale invoice has been raised — even when the credit is sitting available in 2B and the purchase is already booked in Tally.

> *Anand, in the meeting:* it is showing in 2B on the portal that credit is available, and the purchase bill is also booked — but if the sale bill for the same transaction has not been raised to the customer, the credit is not taken.

This is done manually today, supported by a customised report in Tally. The POC automates the classification and the carry-forward.

## 1.2 Inputs

| Input | Key fields required |
|---|---|
| **GSTR-2B JSON (D3)** | Supplier GSTIN, supplier name, invoice number, invoice date, invoice value, taxable value, IGST / CGST / SGST / cess, ITC availability flag, return period, filing date |
| **Purchase register (D1)** | Voucher number and date, supplier GSTIN, supplier ledger, supplier invoice number and date, taxable value, tax split, purchase ledger, and the job / cost centre or reference that links the purchase to the customer transaction |
| **Sales register (D2)** | Customer invoice number and date, customer ledger, and the same job / reference key so the system can tell whether the sale against that purchase has been raised |

## 1.3 Matching logic

Matching runs in tiers. A record passes to the next tier only if the previous tier found no match.

| Tier | Match on | Result |
|---|---|---|
| Exact | Supplier GSTIN + invoice number (normalised) + invoice date + taxable value | Matched |
| Near | Supplier GSTIN + normalised invoice number + invoice date, value differing within a rounding tolerance | Matched with difference — variance shown |
| Probable | Supplier GSTIN + taxable value + date within the same return period, invoice number differing | Suggested match — user confirms |
| Unmatched | No counterpart found | Falls into bucket C or D |

Invoice number normalisation strips spaces, slashes, hyphens and leading zeros and compares in upper case, because the supplier's format on the portal and the format keyed into Tally rarely agree character for character.

## 1.4 Classification — the four output buckets

| Bucket | Condition | What it means and what the user does |
|---|---|---|
| **A. Credit available — take claim** | In 2B **and** booked in Tally **and** the sale invoice to the customer has been raised | Clean credit. Include in this month's 3B claim. The headline claimable figure. |
| **B. Credit available — not to be claimed this month** | In 2B **and** booked in Tally **but** the sale invoice against that job has not been raised | Credit is parked and carried forward. Moves to bucket A automatically in the period the sale invoice is raised. This is the rule no standard tool implements. |
| **C. Invoice not uploaded by party** | Booked in Tally, absent from 2B | Supplier has not filed or filed against a wrong GSTIN. Generates a supplier-wise follow-up list with ageing. |
| **D. Purchase not booked by ECM** | In 2B, absent from Tally | Either the bill has not reached accounts, or it is not ECM's purchase. Accounts books it or marks it rejected with a reason. |

A fifth working state, **matched with difference**, sits alongside for records that matched on identity but differ on taxable value or tax amount. Shown separately so the variance is resolved rather than silently absorbed into bucket A.

## 1.5 Process flow

1. User selects the return period and uploads the GSTR-2B JSON downloaded from the portal.
2. User uploads the Tally purchase register and sales register exports for the same period.
3. System parses and normalises both sides — GSTIN, invoice number, date and value formats brought to a common shape.
4. Tiered matching runs. Every 2B line and every Tally purchase line is assigned a match state.
5. For every matched record, the system checks the linked job / reference against the sales register to see whether the customer invoice has been raised.
6. Records are classified into buckets A, B, C and D, plus the matched-with-difference state.
7. Carry-forward register is updated — bucket B items from earlier periods are re-tested and released into bucket A wherever the sale has since been raised.
8. Dashboard renders: claimable this month, parked, supplier follow-up, unbooked — with drill-down and Excel export on each.

## 1.6 Screen and output

- Summary tiles across the top — total credit in 2B, claimable this month (A), parked (B), not uploaded by party (C), not booked by ECM (D), each with count and rupee value.
- Tabs for each bucket, each with a sortable, searchable table down to invoice level.
- Supplier-wise follow-up view for bucket C, with ageing in days since invoice date.
- Carry-forward register showing what is parked, since when, and against which pending sale.
- Excel export on every view, so the existing manual working paper can be replaced directly.

**Screen columns:** Supplier · GSTIN · Invoice no · Invoice date · Taxable value · Tax · Status
**Tabs:** Bucket A · Bucket B · Bucket C · Bucket D · Differences · Carry-forward

### 🟠 Dashboard View: Admin / Finance Head

- Claimable versus parked credit for the month, with the rupee value of credit deferred purely because the sale invoice is not yet raised.
- Supplier follow-up ageing — which suppliers repeatedly fail to upload, ranked by value at stake.
- Exception count and value by bucket, with drill-down to any record.
- Export of the reconciliation working paper for the CA and for the 3B filing. View and export rights only; no editing of records.

### 🟢 Dashboard View: User / Accounts Executive

- Upload the 2B JSON and the Tally exports for the period and run the reconciliation.
- Work the bucket C and bucket D queues row by row, marking follow-up sent or purchase booked.
- See the carry-forward list of parked credit and exactly which pending sale each item waits on.
- Produce the claimable summary for the month once the queues are cleared.

## 1.7 Open points to confirm with Ravi

- The exact field in Tally that links a purchase line to the customer job or sale — cost centre, voucher reference, or narration. The bucket A / B split depends entirely on this field being reliable.
- Whether the claim rule applies to all purchases or only to recoverable / reimbursable ones. Office overheads presumably do not wait for a sale invoice.
- Treatment of credit notes and amendments appearing in 2B.
- How partial sale invoicing is handled — one purchase recharged across two customer invoices.

---

# MODULE 2 — Reimbursement Audit

*Requirement point 6 · Audit bucket · must-have*

**Requirement as written by the client:** "Reimbursement Audit." Requirement point 7, income and expenditure audit "to make sure all the invoices are raised for reimbursement", is the same problem viewed from the P&L side and is the natural phase-2 extension.

## 2.1 The business problem

ECM is a clearing and forwarding agent. For every job handled on behalf of a customer it bears costs recoverable from that customer on actuals — cargo insurance, transit or travel insurance, freight, port and terminal charges, and assorted sundry charges. The number of such line items varies job to job: sometimes two, sometimes five, sometimes ten.

The exposure is simple and expensive. The expense is incurred and booked, but when the bill to the customer is finally raised, one or more recoverable line items is missed. The money is never recovered and nobody notices, because nothing in the current process compares what was spent on a job against what was billed for it.

> *Anand, in the meeting:* this is actually reimbursable from the client — but when they generated the bill, did they take that money or not, did they get it reimbursed or not. That is the crucial point.

## 2.2 How the data already exists

Cost centres in Tally are the backbone. Each job or shipment carries a cost centre, and both the expense vouchers and the recovery lines on the customer invoice are tagged to it. This is default Tally functionality; ASAP Advisors has additionally built TDL fields on top, and those can be included in the export.

The report is technically available in Tally today — but only one cost centre at a time. Somebody has to open each cost centre individually and eyeball whether a recovery value is present against each expense. Across ECM's volume that is never done exhaustively, which is exactly why leakage survives.

> **The ask, stated plainly**
> Pull the cost centre data and produce a single report that shows which value is blank in which cost centre — that is, every job where a reimbursable expense was booked and no corresponding recovery was billed to the customer.

## 2.3 Inputs

| Input | Key fields required |
|---|---|
| **Cost centre transaction export (D4)** | Cost centre, cost category, voucher type, voucher number and date, ledger, debit / credit amount, party ledger, and any TDL field that flags a ledger as reimbursable |
| **Cost centre and job master (D5)** | Cost centre name and code, parent category, linked customer, job open / close status and date |
| **Sales register (D2)** | Customer invoice number and date, invoice line items with cost centre tagging, so recovery lines can be attributed to the job |
| **Party master (D8)** | Customer name, grouping, and credit terms for ageing |

## 2.4 Audit logic

The unit of audit is the cost centre, which represents one job or shipment. For each cost centre the system builds two sides and compares them line item by line item.

| Step | Logic |
|---|---|
| 1. Build the expense side | Sum all expense vouchers tagged to the cost centre, grouped by ledger / expense head, keeping only heads on the reimbursable list. |
| 2. Build the recovery side | Sum all sale invoice lines tagged to the same cost centre, grouped by the corresponding recovery head. |
| 3. Map head to head | Apply a mapping table between expense heads and their recovery heads, so cargo insurance expense is compared against the cargo insurance recovery line and not against the job total. |
| 4. Compare and classify | Compute recovered minus incurred per head and assign a status. |
| 5. Aggregate | Roll up to job level, then customer level, then total exposure. |

### Status assigned to every expense head on every job

| Status | Condition | Action implied |
|---|---|---|
| **Fully recovered** | Recovery equals expense within tolerance | None |
| **Not billed** | Expense booked, recovery line absent or zero — the blank value | Raise a debit note or include in the next invoice. **This is the leakage.** |
| **Short recovered** | Recovery present but lower than expense | Investigate — agreed cap, keying error, or partial billing |
| **Over recovered** | Recovery exceeds expense | Investigate — possible double billing or a margin element in the wrong head |
| **Invoice pending** | Expense booked but no customer invoice raised on the job at all | Timing, not leakage. Flagged separately with ageing so it does not inflate the exposure figure. |

## 2.5 Process flow

1. User uploads the cost centre transaction export, the cost centre master and the sales register.
2. System groups every transaction by cost centre, i.e. by job.
3. Expense side is built per job, restricted to the configured reimbursable expense heads.
4. Recovery side is built per job from the sale invoice lines tagged to that cost centre.
5. Head-to-head mapping is applied and the variance computed for every reimbursable head.
6. Each head is assigned a status; jobs with no customer invoice at all are separated into invoice pending so they do not distort the leakage number.
7. Results roll up to job, customer and overall totals, with ageing measured from the expense voucher date.
8. Dashboard renders the total unbilled recoverable amount, with drill-down to job, to expense head, and to the underlying voucher, plus Excel export.

## 2.6 Screen and output

- **Headline figure** — total reimbursable expense booked but not billed, in rupees. The single number that carries the demo with the director.
- Job-wise table: cost centre, customer, expense incurred, amount recovered, variance, status, days since the expense was booked.
- Expense-head view: which heads leak most often across jobs — typically the ones that appear only occasionally and are therefore forgotten when billing.
- Customer-wise view: which customers have the largest unrecovered balance.
- Ageing bands on the not-billed items, since older jobs are harder to recover against.
- Drill-down from any figure to the voucher, and Excel export at every level.

**Screen columns:** Cost centre · Customer · Expense head · Incurred · Recovered · Variance · Status
**Tabs:** Not billed · Short recovered · Over recovered · Invoice pending · All jobs

### 🟠 Dashboard View: Admin / Director

- The headline unbilled recoverable figure, with the trend across periods and the recovery rate by customer.
- Expense heads ranked by how often they leak, which is where a process fix pays back fastest.
- Ageing of unbilled items, so exposure becoming hard to recover is visible early.
- View and export only; the audit result is never edited from this view.

### 🟢 Dashboard View: User / Operations and Billing

- Run the audit for a period and work the not-billed queue job by job.
- Mark each item as billed, waived with a reason, or disputed — the reason is retained so the admin view shows why a leak was closed without recovery.
- Drill from any job to the underlying expense voucher and to the customer invoice.
- Export the debit-note list for the month.

## 2.7 Open points to confirm with Ravi

- **The definitive list of ledgers or cost categories that count as reimbursable.** Everything in this module depends on that list being right — too wide and the report shows false leakage, too narrow and it misses real leakage.
- The mapping between each expense head and its recovery head on the sale invoice.
- Cost centre naming convention, and whether one job can span multiple cost centres or vice versa.
- Whether recoveries are ever clubbed into a single consolidated line on the customer invoice, which would defeat head-to-head comparison and force a job-total comparison instead.
- The tolerance to apply before flagging a short recovery.

---

# MODULE 3 — 26AS Matching

*Requirement point 9 · Statutory bucket*

**Requirement as written by the client:** "26 AS matching – Potential matching (May not be possible for 100%)." The caveat is in the requirement itself and is a genuine limitation of the income tax portal, not of the build.

## 3.1 The business problem

When a customer pays ECM and deducts TDS, that TDS is an asset in ECM's books — money recoverable from the government. It only becomes visible to ECM once the customer has actually deposited it and filed its TDS return, at which point it appears in ECM's Form 26AS on the income tax portal. The job is to compare what the books say is receivable against what the portal confirms has been credited, and chase the difference.

## 3.2 Why this can only ever be a potential match

GST returns are filed invoice-wise, so a 2B reco can be pinned to individual invoices. TDS returns are not. The deductor files party-wise, not invoice-wise, so the portal never publishes which specific bill a given TDS credit relates to.

> *Anand's illustration:* if a customer made ten payments and deducted TDS on all ten, the books may show one lakh receivable while only ninety thousand appears on the portal — and there is no way to determine which of the ten bills the shortfall belongs to. The reconciliation can only be done at account level.

> **State this explicitly in the demo**
> The module reports the gap per deductor and lists the book invoices sitting under that deductor, so the follow-up can be made. It does not, and cannot, identify which specific invoice is unmatched. Setting that expectation up front protects the credibility of the other two modules, where the matching genuinely is invoice-level.

## 3.3 Inputs

| Input | Key fields required |
|---|---|
| **26AS statement (D7)** | Deductor name and TAN, section, amount paid or credited, TDS deducted, TDS deposited, quarter, date of booking, status. Downloaded as TXT from the income tax portal. |
| **TDS receivable ledger (D6)** | Customer ledger, TAN, invoice number and date, gross amount, TDS rate, TDS amount, section, period. Available invoice-wise from Tally. |
| **Party master (D8)** | Customer name, PAN and TAN, and any alternate names used by the deductor |

ASAP Advisors has already built a TDL that imports the 26AS TXT into Tally and performs this potential matching there. The same logic is reproduced in the Pucho application because the demo is being given on Pucho, and because the domain know-how sits with Anand and Ravi.

## 3.4 Matching logic

| Step | Logic |
|---|---|
| 1. Identify the deductor | Match on TAN, the only reliable key. Deductor names on the portal frequently differ from the ledger name in Tally, so name is used only as a fallback with fuzzy comparison, and any name-only match is flagged for user confirmation. |
| 2. Aggregate both sides | Total the TDS per deductor per quarter from the books, and the same from 26AS. |
| 3. Compute the gap | Books minus 26AS, per deductor per quarter and for the year to date. |
| 4. Classify the gap | Assign a status per deductor as set out below. |
| 5. Test for timing | Compare against the adjacent quarter. A shortfall in one quarter matched by an excess in the next is a filing-timing difference, not a genuine shortfall, and is labelled as such. |
| 6. Attach evidence | List the book invoices contributing to each deductor's balance, so the follow-up email can carry specifics even though the portal cannot pinpoint the bill. |

### Status assigned per deductor

| Status | Condition | Action implied |
|---|---|---|
| **Matched** | Books and 26AS agree within tolerance | None |
| **Short in 26AS** | Books higher than 26AS | The deductor has not deposited or not filed part of the amount. Chase the customer to revise or file. **The main output of the module.** |
| **Excess in 26AS** | 26AS higher than books | Income may not be fully booked, or TDS deducted on an advance. Route to accounts to verify. |
| **In books, absent in 26AS** | Deductor appears only in the books | Return not filed at all, or filed against the wrong PAN. Highest priority follow-up. |
| **In 26AS, absent in books** | Deductor appears only on the portal | Unrecorded income or a wrong credit. Verify before claiming. |
| **Timing difference** | Gap reverses in the adjacent quarter | Informational. Expected to clear on its own. |

## 3.5 Process flow

1. User selects the financial year and quarter, and uploads the 26AS TXT downloaded from the income tax portal.
2. User uploads the TDS receivable export from Tally for the same period.
3. System parses the fixed-format 26AS TXT and normalises TAN, deductor name, section and amounts.
4. Deductors are matched across the two sides on TAN, with fuzzy name matching only as a flagged fallback.
5. Both sides are aggregated per deductor per quarter and the gap computed.
6. Each deductor is assigned a status, and the adjacent quarter tested to separate genuine shortfalls from filing-timing differences.
7. Book invoices under each deductor are attached as supporting detail.
8. Dashboard renders total TDS as per books, total as per 26AS, the overall gap, and a deductor-wise follow-up list with export.

## 3.6 Screen and output

- Three headline figures — TDS as per books, TDS as per 26AS, and the gap.
- Deductor-wise table: name, TAN, books amount, 26AS amount, difference, status, quarter.
- Drill-down from a deductor to the book invoices sitting under that balance, clearly labelled as supporting detail rather than as matched items.
- Follow-up list of deductors to be chased, exportable, so the accounts team can send it out.
- Quarter-on-quarter view showing whether last quarter's gaps have since been filed.

**Screen columns:** Deductor · TAN · As per books · As per 26AS · Difference · Quarter · Status
**Tabs:** Short in 26AS · Absent in 26AS · Excess in 26AS · Timing · Matched

### 🟠 Dashboard View: Admin / Finance Head

- Books versus 26AS totals and the gap for the quarter, with deductor-wise concentration of that gap.
- Customers who repeatedly under-report, ranked by value — useful commercially, not just for compliance.
- Timing differences shown separately from genuine shortfalls, so the follow-up list is not inflated.

### 🟢 Dashboard View: User / Accounts Executive

- Upload the 26AS TXT and the TDS receivable export, then run the match.
- Work the short-in-26AS and absent-in-26AS lists, recording follow-up sent against each deductor.
- Expand a deductor to see the book invoices behind the balance before writing to the customer.
- Export the follow-up list for emailing.

## 3.7 Open points to confirm with Ravi

- A sample 26AS TXT file, since the parser is written against the exact fixed-width layout.
- Whether TAN is consistently captured in the customer master in Tally. If not, matching falls back to names and accuracy drops sharply.
- The tolerance for treating a deductor as matched.
- How TDS on advances is currently booked, since it is the most common cause of an excess in 26AS.

---

## 6. Interface design — Pucho blueprint system

The POC application and the document set share one visual system. Nothing in the three modules introduces a new component; each screen is assembled from the existing kit.

### 6.1 Design tokens

| Token | Value | Applied to |
|---|---|---|
| Indigo | `#4F46E5` | Primary actions, active tab and nav pill, section headings, stat figures |
| Violet | `#7C3AED` | Sub-headings, focus ring on inputs, secondary emphasis |
| Dark indigo | `#312E81` | Module banners and any full-width header band |
| Deep text | `#1E1B4B` | All body text, table values, figures |
| Grey | `#6B7280` | Labels, captions, inactive nav, helper text |
| Lavender border | `#C4B5FD` | Card borders, table borders, stat card outline |
| Lavender background | `#EEF2FF` | Table header rows, alternating rows, stat cards, active nav tint |
| Cyan | `#06B6D4` | Step and workflow badges in process flows |
| Amber / amber tint | `#D97706` on `#FEF3C7` | Admin dashboard view, action-needed badges |
| Green / green tint | `#059669` on `#D1FAE5` | User dashboard view, settled badges |
| Light grey | `#F3F4F6` | Step description panels |

White dominates, indigo carries roughly a third as accent and heading weight, violet a little under half of that, and the amber, green and cyan tints stay minimal — they signal state, they do not decorate.

### 6.2 Typography

| Role | Treatment |
|---|---|
| Family | Arial across the interface and the document set |
| Page title | Bold, 20px, indigo — left of the header, one line |
| Page description | Regular, 13px, grey — directly under the title |
| Section heading | Bold, 18px, indigo, with a lavender bottom rule |
| Sub-heading | Bold, 14px, violet, no rule |
| Stat figure | Bold, 24px, indigo, centred on a lavender card |
| Stat label | Regular, 10px, grey, centred under the figure |
| Table header | Bold, 13px, indigo on a lavender fill |
| Table content | Regular, 13px, deep text — values right-aligned, labels left-aligned |

### 6.3 Shape, elevation and motion

- Cards sit on white with a lavender hairline border and generous internal padding, lifting on hover with a soft shadow rather than a colour change. An active or selected card takes an indigo border instead of getting louder.
- Buttons are rounded pills, 40px high. Primary is indigo with white text; secondary is white with a lavender border and deep text. Both sit in the same row, primary first.
- Modals are rounded with a lavender border over a dimmed backdrop, used for upload progress, parse results and voucher drill-down.
- Callouts and important notes take an indigo top and left rule on a lavender fill.
- Motion is restrained — fade-in 0.5s for content, slide-up 0.4s for cards, 300ms ease on hover and focus. No motion on data refresh; a reconciliation table that animates while a number is being read is worse than one that does not.

### 6.4 Layout

- **Sidebar** — 240px, fixed left, white. Logo mark and product name at the top, the four buckets as nav pills, user chip at the bottom. Active pill uses the lavender tint with indigo text; inactive pills are transparent with grey text and pick up a lavender border on hover.
- **Header** — sticky white with a lavender bottom hairline. Page title and description left, search pill right with the violet focus ring.
- **Content** — scrollable, 24–32px padding. Action row first, then a five-column stat grid, then the working area.
- **Working area** — for all three modules, a tab strip over a single wide table card, because each module is fundamentally a list of exceptions to be worked through. Charts are deliberately minimal; the value is the row, not the trend.

### 6.5 Component inventory

| Component | Where it appears | Behaviour |
|---|---|---|
| Stat card | Five per module, top of every screen | Lavender fill and border, indigo figure, grey label. Clicking filters the table to that bucket. |
| Tab strip | Above the table on all three screens | One tab per output bucket or status. Active tab is a filled indigo pill, the rest white with a lavender border. |
| Data table card | The working area | Lavender header row with indigo bold labels, alternating white and lavender rows, sortable columns, row click opens the drill-down modal. |
| Status badge | Last column of every table | Pill badge, colour-coded per 6.6. |
| Upload panel | Entry point of every module | Drop zone per required file showing name, size and parse status. Run button disabled until every required file is present. |
| Parse summary modal | After upload, before the run | Records read, records rejected and why. Prevents a bad export producing a wrong report during a live demo. |
| Drill-down modal | From any table row or figure | Shows the underlying voucher or invoice detail. |
| Export button | Secondary button in the action row | Exports the current view, filters applied, to Excel. |
| Dashboard view switch | Top right of every module | Toggles between the Admin view and the User view. Admin is amber-keyed, User is green-keyed. |
| Empty and loading states | Every table | Skeleton rows while matching runs; a plain statement plus the next action when a bucket is genuinely empty. |

### 6.6 Status colour mapping

| Badge tone | 2B Reco | Reimbursement Audit | 26AS Matching |
|---|---|---|---|
| Green `#D1FAE5` — settled | Credit available, take claim | Fully recovered | Matched |
| Lavender `#EEF2FF` — waiting | Not to be claimed this month | Short recovered | Timing difference |
| Amber `#FEF3C7` — action needed | Invoice not uploaded by party | Not billed | Short or absent in 26AS |
| Cyan `#CFFAFE` — verify | Purchase not booked by ECM | Over recovered / invoice pending | Excess in 26AS |

Four tones, all from the blueprint palette. Red is deliberately absent — an unmatched invoice is work to be done, not a system failure, and colouring routine exceptions as errors makes a first demo read worse than the process it replaces.

### 6.7 Interaction and quality rules

- Every figure on screen is clickable down to the source record. A number nobody can trace is a number nobody trusts, and this client is being asked to trust a reconciliation.
- Filters persist across tabs within a module and reset on module change.
- The export always reflects what is on screen, including active filters.
- Long reconciliations show progress rather than a spinner; the demo dataset will run in seconds but live volumes will not.
- Tables are keyboard navigable and every interactive element has a visible violet focus ring.
- Contrast held at WCAG AA for text on tinted badges — light tints with dark text rather than saturated fills.
- Responsive: the stat grid drops from five columns to two, and the table becomes horizontally scrollable rather than shrinking columns to unreadable widths. The demo should still be run on a desktop.

### 6.8 Navigation map

| Menu | Screen | Behaviour in the POC |
|---|---|---|
| Statutory | TDS report — monthly and quarterly | Placeholder |
| Statutory | GST 2B reconciliation | **Fully functional** |
| Statutory | 26AS matching | **Fully functional** |
| Audit | Reimbursement audit | **Fully functional** |
| Audit | Income and expenditure audit | Placeholder |
| Bill Tracking | Bill tracking — L&T document flow | Placeholder |
| Bill Tracking | Cosmos report for L&T | Placeholder |
| Others | Invoice print on letterhead with DSC | Placeholder |
| Others | Bank payment entries — NEFT Excel upload | Placeholder |
| Others | Outstanding report to parties | Placeholder |

### 6.9 Common behaviour across the three modules

- Every module starts with a file upload step and a period selector. Nothing is fetched live.
- Uploaded files are validated and a parse summary is shown — records read, records rejected and why — before the reconciliation runs.
- Every figure on every dashboard is clickable down to the underlying record.
- Every view exports to Excel, because the client's current process is Excel-based and that is the immediate comparison they will make.
- Consistent layout across the three, so the fourth, fifth and sixth modules are visibly just more of the same pattern.
- Placeholder screens are not blank. Each carries the module name, a one-line statement of what it will do, and a next-phase marker in the same card and typography as the working screens.

### 6.10 Demo narrative

1. Open on the four buckets to establish that the whole requirement list has been understood.
2. Lead with **Reimbursement Audit** and land on the rupee figure of unbilled recoverable expense. This is what the director asked for and it quantifies the cost of the current process.
3. Move to **2B Reco** and show the claim-deferral rule working — the piece no generic tool does, demonstrating that the client's specific way of working has been absorbed.
4. Close with **26AS**, stating the invoice-level limitation openly and showing the deductor-wise follow-up list as the practical output.
5. Mention that portal integration can replace the upload step whenever they want it, and that the remaining seven points follow the same pattern.

---

## 7. Dependencies, assumptions and risks

### Dependencies before the build can start

| # | Dependency | Owner | Status |
|---|---|---|---|
| 1 | Requirements document and Ravi's contact details shared | ASAP Advisors | Pending |
| 2 | Pucho ECM coordination group created | ASAP Advisors | Pending |
| 3 | Domain walkthrough on 2B logic, cost centre structure and 26AS structure | Ravi | Pending — no date set |
| 4 | Tally exports D1, D2, D4, D5, D6, D8 in XML or JSON | ASAP Advisors / Ravi | Pending |
| 5 | Sample GSTR-2B JSON and sample 26AS TXT | ASAP Advisors / Ravi | Pending |
| 6 | Effort and timeline confirmation to ASAP Advisors | Kapil Saini | Due next day |
| 7 | Build of the three modules | Anurag and Keval | Within one week |

### Assumptions

- The Tally data supplied is representative of live volumes and includes enough cases to demonstrate every output bucket. A dataset in which nothing is unmatched proves nothing.
- Cost centre tagging is applied consistently on both expense and sale sides. Where it is not, the reimbursement audit will under-report rather than over-report.
- TAN is available in the customer master for the 26AS module.
- The purchase-to-sale linkage exists as a usable field for the 2B claim rule.
- The POC runs on sample or masked data and is a demonstration environment, not a production deployment.

### Risks

| Risk | Impact | Mitigation |
|---|---|---|
| 26AS matching cannot be invoice-level | If oversold, the client discovers the limitation during the demo and it undermines the other two modules | State the limitation openly and position the deductor-wise follow-up list as the deliverable |
| Reimbursable ledger list not confirmed in time | The audit either flags false leakage or misses real leakage; the headline number becomes indefensible | Treat as the first question to Ravi; make the list configurable in the application so it can be corrected in minutes |
| Purchase-to-sale link missing or unreliable | The bucket A / B split — the distinguishing feature of the 2B module — cannot be demonstrated | Confirm the field before build; if unreliable, allow the linkage to be supplied through a simple mapping upload for the demo |
| One-week window with domain walkthrough not yet scheduled | Build starts on assumptions and is reworked, consuming the buffer | Fix the session with Ravi before development begins; confirm the ETA to Anand only after it |
| Data quality in the sample export | Reconciliations look either trivially clean or unreadably noisy | Review the export as soon as it arrives and ask for a period that contains real mismatches |

---

## Appendix — the three modules in plain language

**GST 2B Reco.** A supplier bills ECM ₹10,000 + ₹1,800 GST for a shipment. It shows in 2B and the purchase is booked in Tally, but ECM hasn't yet billed the customer for that shipment. Today someone checks this by hand. The system puts it in "credit available, don't claim this month", and the moment the customer invoice is raised it moves to "claim now" on its own.

**Reimbursement Audit.** Job #4471: ECM pays ₹8,000 cargo insurance and ₹2,500 freight for a customer. The customer invoice recovers the freight but the insurance line was missed. Nobody notices; ₹8,000 is gone. The system lists that job with a blank against insurance, and the dashboard adds up every such miss into one figure.

**26AS Matching.** Books say a customer deducted ₹10,000 TDS across ten bills. 26AS shows only ₹9,000, because they didn't file the full amount. The system shows books ₹10,000, portal ₹9,000, gap ₹1,000 — chase this customer. It cannot say which of the ten bills is short, because the portal doesn't publish that.

---

*Prepared by the Pucho.ai Solution Architecture Team. Based on the requirement list shared by ASAP Advisors and the minutes of the meeting dated 14 August 2026. Confidential — intended for Pucho.ai and ASAP Advisors internal use.*
