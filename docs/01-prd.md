# 01 — Product Requirements Document (PRD)

**Product:** ECM Reconciliation Suite (POC)
**Tagline:** Find the money left on the table — unbilled reimbursements, deferred GST credit,
and uncollected TDS — from files ECM already has in Tally.

**Source:** ECM POC — Detailed Functional Document v1.0, 14 August 2026
**Status:** Draft for build · Domain open points blocked pending Ravi confirmation

---

## 1. Problem Statement

ECM is a clearing & forwarding agent whose major customer is L&T. Three reconciliations
are done by hand today in Excel/Tally, and each leaks money:

1. **GST input credit** is claimed against a non-standard rule — credit on a purchase is only
   claimed once the customer invoice is raised. Manual classification is error-prone and parks
   claimable credit incorrectly.
2. **Reimbursable expenses** (cargo insurance, freight, port/terminal charges, sundry costs)
   booked to a job are sometimes missed when the customer bill is raised — money is never
   recovered and nothing in the current process compares spend vs bill.
3. **TDS receivable** in the books is never compared against what appears in Form 26AS, so
   under-deposited TDS goes unchased.

**Who feels it:** the Director (Karthik Jobanputra) sees margin leak; the Accounts & Finance
team (Urshita Parekh) performs these reconciliations manually.

**Purpose of the POC:** the client has approved the direction but not the commercials.
The director wants confidence before costing is discussed. The POC must be visibly complete
at the UI level across all four buckets, while proving real working logic on the three modules
where the value is most obvious and the data is already available in Tally.

---

## 2. Target User

- **Admin / Director / Finance Head** — view-only dashboards showing headline rupee figures,
  trends, and exception concentrations. Builds confidence before commercials are discussed.
- **User / Accounts Executive** — runs the reconciliations, works the exception queues
  (follow-up, booking, marking billed/waived/disputed), and exports working papers.

---

## 3. Scope

### 3.1 Four-bucket menu (all 10 requirement points visible)

| Bucket | Requirement points | POC status |
|---|---|---|
| **Statutory** | 1) TDS report (monthly/quarterly)<br>**2) GST custom 2B reco**<br>**9) 26AS matching** | Points 2 and 9 built. Point 1 placeholder. |
| **Audit** | **6) Reimbursement audit**<br>7) Income & expenditure audit | Point 6 built. Point 7 placeholder. |
| **Bill Tracking** | 5) Bill tracking (L&T document flow)<br>8) Cosmos report for L&T | Placeholder only. |
| **Others** | 3) Invoice print on letterhead with DSC<br>4) Bank payment entries (NEFT Excel)<br>10) Outstanding report to parties | Placeholder only. |

### 3.2 Why these three modules

- **Reimbursement Audit** — explicitly asked for by the director. Data already exists in Tally
  under cost centres. Output is a rupee figure of unbilled recoverable expense — the fastest way
  to demonstrate money left on the table.
- **GST 2B Reco** — a standard reconciliation, but ECM has a non-standard claim-deferral rule
  that no off-the-shelf tool handles. Showing that rule working is what differentiates the demo.
- **26AS Matching** — ASAP Advisors already has the domain model and has sold it as a Tally
  customisation, so the logic is known and low-risk to reproduce. Rounds out the Statutory bucket.

---

## 4. Core Features — Must Have (POC)

1. **GST 2B Reconciliation** — upload GSTR-2B JSON + purchase register + sales register;
   tiered matching (Exact / Near / Probable / Unmatched); four-bucket classification
   (A: claim now / B: defer / C: supplier not uploaded / D: ECM not booked) + differences
   state + carry-forward register; custom claim-deferral rule (B→A auto-move when sale
   invoice is raised).

2. **Reimbursement Audit** — upload cost-centre transactions + master + sales register;
   per-job expense-vs-recovery comparison, head-to-head mapping; five statuses per line
   (Fully recovered / Not billed / Short recovered / Over recovered / Invoice pending);
   headline unrecovered figure = Not-billed total + Short-recovered shortfall
   (incurred − recovered); drill-down to voucher.

3. **26AS Matching** — upload 26AS TXT + TDS receivable ledger; TAN-level deductor
   aggregation; three headline stat cards (books total / 26AS total / gap);
   six statuses; deductor-wise follow-up list with book invoice details; timing-difference
   separation; invoice-level limitation stated explicitly.

4. **Four-bucket menu navigation** (sidebar) with placeholder screens for the 7 unbuilt
   requirement points. Each placeholder carries the module name, a one-line statement of
   what it will do, and a next-phase marker.

5. **Admin vs User dashboard view** toggle per module. Admin = amber-keyed, view-only;
   User = green-keyed, queue-working.

6. **Excel export** on every view (replaces the existing Excel working paper).

7. **Drill-down** from every figure to the source record (voucher/invoice).

8. **Upload + parse summary** (records read / rejected and why) before the reconciliation run.

9. **Static login placeholder** — single "Enter Demo" button bypassing to the app.
   Real auth is v2; the POC is a single-user demo as specified in the functional doc.

10. **Demo narrative flow** — open on four buckets, lead with Reimbursement Audit (headline
    figure), then 2B Reco (claim-deferral rule), close with 26AS (limitation stated openly).

---

## 5. User Stories

- As an Accounts Executive, I want to upload the 2B JSON and Tally exports and run
  reconciliation, so that buckets are produced automatically instead of checking each bill
  by hand.
- As an Accounts Executive, I want parked credit (B) to move to claimable (A) automatically
  once the sale invoice is raised, and see the B→A transition in the carry-forward register,
  so that no claimable credit is lost and the rule is visibly working.
- As a Director, I want one rupee figure of total unrecovered spend (not-billed + short-recovered
  shortfall), so that I see the cost of the current process instantly.
- As an Accounts Executive, I want to work the "not billed" and "short recovered" queues and
  mark items billed/waived/disputed with a reason, so that every leak is closed deliberately
  and traceably.
- As an Operations user, I need to distinguish short-recovered and over-recovered items from
  truly unbilled items, so that I don't waste time chasing a ₹50 rounding difference the same
  way I chase a ₹25,000 missed insurance line.
- As a Finance Head, I want to see 3 headline numbers on the 26AS screen — books total, 26AS
  total, and the gap — so I can assess the exposure at a glance.
- As a Finance Head, I want a deductor-wise 26AS gap list with book invoices attached, so that
  I can chase under-depositing customers with specifics.
- As a Director, I want every on-screen figure clickable to the source voucher, so that I trust
  the numbers.

---

## 6. Success Metrics

- All three modules run end-to-end on sample data in seconds (demo-safe).
- 100% of demo records classified into a defined bucket/status (nothing left unclassified).
- Reimbursement Audit produces a single headline figure: **total unrecovered spend** = not-billed
  items (full unrecovered) + shortfall portion of short-recovered items (incurred − recovered).
  Invoice-pending and over-recovered are excluded — those are timing/verification, not confirmed
  leakage.
- 2B reco visibly demonstrates the claim-deferral rule: B→A auto-move shown in the carry-forward
  register with the sale invoice that triggered the release.
- 26AS states the invoice-level limitation openly and shows a deductor-wise gap list with the gap
  as a distinct headline card.
- All 10 requirement points visible in navigation (3 functional, 7 placeholder).

---

## 7. Out of Scope (v1 POC)

- No live API integration with GST or income tax portal — all data enters as uploaded files.
- No write-back to Tally (no posting of vouchers).
- No user management / roles / approval workflow beyond the static login bypass.
- Bill tracking module not built (physical document movement, 2 scan sites, L&T Exim stamping,
  Ariba upload — not provable in one week).
- 7 of 10 requirement points are menu-only placeholders.

---

## 8. Nice to Have (v2 / Phase 2)

- Live GST / income-tax portal API (replace download-upload step).
- Write-back to Tally (post vouchers).
- Income & expenditure audit (requirement point 7).
- Bill tracking / L&T document flow (requirement 5) + Cosmos report (requirement 8).
- TDS report monthly/quarterly (requirement 1).
- Invoice print on letterhead with DSC (requirement 3), bank NEFT Excel upload (requirement 4),
  outstanding report twice-weekly (requirement 10).
- Multi-user roles, approval workflow.

---

## 9. Blocked — pending Ravi confirmation (no assumptions made)

These block only the reconciliation logic; the UI is fully specified and can be built with
mock/stub data in parallel.

- **2B Reco:** the Tally field linking a purchase to the customer job/sale (cost centre vs
  voucher reference vs narration). Whether the claim rule applies to all purchases or only
  recoverable/reimbursable ones. Treatment of credit notes and amendments in 2B. How partial
  sale invoicing is handled (one purchase recharged across two customer invoices).
- **Reimbursement Audit:** the definitive list of reimbursable ledgers / cost categories.
  The mapping between each expense head and its recovery head. Cost centre naming convention
  and whether one job can span multiple cost centres. Whether recoveries are clubbed into a
  consolidated line on the customer invoice. The tolerance for short-recovery flagging.
- **26AS Matching:** a sample 26AS TXT file (parser is built against the exact fixed-width
  layout). Whether TAN is consistently captured in the customer master. The tolerance for
  treating a deductor as matched. How TDS on advances is currently booked.

---

*Prepared by Pucho.ai Solution Architecture Team. Based on ECM POC — Detailed Functional
Document v1.0, 14 August 2026. Confidential — intended for Pucho.ai and ASAP Advisors
internal use.*