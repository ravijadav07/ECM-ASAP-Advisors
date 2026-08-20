# 02 — Technical Requirements Document (TRD)

**Project:** ECM Reconciliation Suite (POC)
**Stack policy:** Pucho default unless noted. This TRD records only what varies from the default.
**Status:** Draft for build · Frontend-first (Phase A) · Domain logic blocked pending Ravi

---

## 1. Stack

| Layer | Choice |
|---|---|
| Frontend | React + Vite + Tailwind (per `pucho-frontend` design system) |
| Backend / DB / Auth | Supabase — Postgres, Auth (email/password), RLS, Edge Functions |
| Automation | None in POC (no Pucho workflows; file upload + client logic) |
| Hosting | Vercel (frontend) + Supabase (backend) |
| Integrations | **None live.** File upload only: Tally exports (XML/JSON), GSTR-2B (JSON), 26AS (TXT) |
| Tenancy | Multi-tenant (`client_id`) |
| Key libraries | per `pucho-frontend` §9 (xlsx/SheetJS for Excel export, PapaParse for CSV, JSON.parse for JSON/XML) |
| Skills applied | `pucho-frontend`, `pucho-secure-build` |

---

## 2. Build sequencing (frontend-first)

The immediate ask is a correct, complete UI. Reconciliation logic is deferred pending
Ravi's answers and data handover.

1. **Phase A — UI:** all screens, navigation, tabs, stat cards, tables, modals, upload panels,
   static login bypass, Admin/User toggle, placeholders — wired to mock data.
2. **Phase B — Logic:** file parsers + matching/classification engines, once domain open points
   and sample files are confirmed.
3. **Phase C — Persistence & harden:** Supabase tables + RLS + multi-tenant scoping, then the
   `pucho-secure-build` checklist.

**Login note (Phase A):** the login page is a static, bypassable placeholder — a single
"Enter Demo" button that skips to the app. No real auth. Real Supabase Auth (email/password)
is a v2 feature; the POC is a single-user demo as specified in the functional doc.

---

## 3. Data contracts (source files D1–D8)

| ID | File | Format | Consumed by |
|---|---|---|---|
| D1 | Purchase register + GST detail | XML/JSON | 2B Reco |
| D2 | Sales register + invoice ref + job link | XML/JSON | 2B Reco, Reimbursement |
| D3 | GSTR-2B (return period) | JSON | 2B Reco |
| D4 | Cost centre/category expense & recovery | XML/JSON | Reimbursement |
| D5 | Cost centre + job master | XML/JSON | Reimbursement |
| D6 | TDS receivable ledger (invoice-wise, TAN) | XML/JSON | 26AS |
| D7 | 26AS statement | TXT (fixed-width) | 26AS |
| D8 | Party/customer master (GSTIN, PAN, TAN) | XML/JSON | All three |

**Note:** exact field lists must be specified to ASAP Advisors before export generation
(functional doc §2). Field-level schemas are a Phase B deliverable.

---

## 4. Module technical specs

### 4.1 GST 2B Reco
- Normalisation: GSTIN, invoice no (strip spaces/slashes/hyphens/leading zeros, uppercase),
  date, value.
- Tiers: Exact (GSTIN + inv + date + value) → Near (value within rounding tolerance) →
  Probable (GSTIN + value + date, inv differs → user confirms) → Unmatched.
- Classification: A (in 2B ∧ booked ∧ sale raised) · B (in 2B ∧ booked ∧ sale NOT raised —
  deferred, carry-forward) · C (booked, absent 2B) · D (in 2B, absent Tally) · Differences state.
- Carry-forward register re-tests B items each period; B→A moves are shown as "Recently Released".
- **Blocked:** purchase→sale link field; claim-rule scope; credit-note/amendment treatment;
  partial-sale handling.

### 4.2 Reimbursement Audit
- Unit of audit = cost centre (job). Expense side vs recovery side, mapped head→head via a
  config table.
- **Headline formula:** Σ(not-billed items) + Σ(shortfall of short-recovered items, where
  shortfall = incurred − recovered). Invoice-pending and over-recovered are excluded.
- Rollup: head → job → customer → total; ageing from expense voucher date.
- **Blocked:** reimbursable ledger list (configurable in-app); head→recovery mapping;
  cost-centre naming/multi-mapping; consolidated-recovery handling; short-recovery tolerance.

### 4.3 26AS Matching
- Deductor key = TAN (name only as flagged fuzzy fallback). Aggregate books vs 26AS per deductor
  per quarter; gap = books − 26AS.
- Statuses: Matched · Short in 26AS · Excess in 26AS · In books absent 26AS · In 26AS absent books
  · Timing difference (adjacent-quarter reversal).
- **Blocked:** TXT layout; TAN capture consistency; matched tolerance; TDS-on-advance booking.

---

## 5. Screens / component details

### 5.0 Navigation map

| Menu | Screen | POC state |
|---|---|---|
| Statutory | TDS report (monthly/quarterly) | Placeholder |
| Statutory | GST 2B reconciliation | Functional |
| Statutory | 26AS matching | Functional |
| Audit | Reimbursement audit | Functional |
| Audit | Income & expenditure audit | Placeholder |
| Bill Tracking | Bill tracking — L&T flow | Placeholder |
| Bill Tracking | Cosmos report | Placeholder |
| Others | Invoice print (letterhead + DSC) | Placeholder |
| Others | Bank payment (NEFT Excel upload) | Placeholder |
| Others | Outstanding report | Placeholder |

Per-module layout (identical pattern): upload panel → parse summary → stat grid → tab strip →
data table card → drill-down modal → Excel export. Admin/User view toggle top-right.

### 5.1 Reimbursement Audit — statuses

| Status | Condition | Badge colour | Tab | In headline? |
|---|---|---|---|---|
| Fully recovered | Recovery = expense (within tolerance) | Green `#D1FAE5` | Yes | No |
| Not billed | Invoice exists for this job, but this head was left off | Amber `#FEF3C7` | Yes | Yes — full amount |
| Short recovered | Recovery present but lower than expense | Lavender `#EEF2FF` | Yes | Yes — shortfall (incurred − recovered) |
| Over recovered | Recovery exceeds expense | Cyan `#CFFAFE` | Yes | No — verify |
| Invoice pending | No customer invoice exists for this job at all | Grey `#F3F4F6` / `#6B7280` | Yes | No — timing |
| All jobs | (unfiltered) | — | Yes | — |

**Critical distinction:** "Invoice pending" = no invoice raised for this job yet (billing cycle
not reached). "Not billed" = invoice was raised but this specific expense head was missed
(confirmed leakage). The headline-exclusion logic depends on this distinction.

**Colour note:** Invoice-pending uses grey (neutral/informational) rather than cyan, so that
over-recovered and invoice-pending are visually distinct in the combined "All jobs" view.

### 5.2 GST 2B — carry-forward register

Two sections:
1. **Currently Parked** — items still in bucket B, with pending sale invoice reference and days
   since purchase.
2. **Recently Released** — items moved B→A in the current period, showing the sale invoice date
   that triggered the move and the credit value released. This is the visible proof of the
   claim-deferral rule working.

### 5.3 26AS — headline stat cards

3 cards: "TDS as per books" · "TDS as per 26AS" · "Gap" (books − 26AS).
The gap card is amber-tinted when non-zero. The deductor table breaks the gap down per deductor.

### 5.4 26AS — name-match fallback

When a deductor match was made on name (fuzzy) rather than TAN, the row displays a cyan
"needs confirmation" badge. Optional for demo impact; not critical.

---

## 6. Non-functional requirements

- **Design system:** Pucho blueprint tokens as specified in the functional doc §6:
  indigo `#4F46E5`, violet `#7C3AED`, dark indigo `#312E81`, deep text `#1E1B4B`,
  grey `#6B7280`, lavender border `#C4B5FD`, lavender background `#EEF2FF`, cyan `#06B6D4`,
  amber `#D97706`/`#FEF3C7`, green `#059669`/`#D1FAE5`, light grey `#F3F4F6`.
  Font: Arial. Referenced, not re-specified; build per `pucho-frontend`.
- **Status colour mapping** (functional doc §6.6, with the grey amendment for invoice-pending):
  green = settled, lavender = waiting, amber = action needed, cyan = verify, grey = informational.
  Red is deliberately absent — an unmatched item is work to be done, not a system failure.
- **Accessibility:** WCAG AA on tinted badges (light tint + dark text); visible violet focus ring
  on all interactive elements; keyboard-navigable tables.
- **Responsive:** stat grid drops 5→2 columns; table horizontally scrollable rather than shrinking
  columns. Demo target = desktop.
- **Motion:** no motion on data refresh; fade/slide only on content/cards (fade 0.5s, slide 0.4s,
  300ms ease hover/focus).
- **Interactivity:** every figure clickable to source; filters persist across tabs within a module
  and reset on module change; exports reflect on-screen filters; long runs show progress, not a
  spinner.

---

## 7. Security (per `pucho-secure-build`)

- Supabase Auth JWT; RLS scoping every table by `client_id`; secrets server-side only.
- File uploads: validate + size-limit; parse summary before any run; no raw file persistence
  beyond the session (POC).
- Env vars (names only): `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` (public);
  server-side Supabase secrets (service role, JWT) never in the client bundle.

---

## 8. Env / constraints

- POC runs on sample/masked data; demonstration environment, not production.
- No cost-intensive services; Supabase free tier acceptable for the demo.

---

## 9. Blocked items (owner: Ravi / ASAP Advisors)

- Domain walkthrough (2B logic, cost-centre structure, 26AS structure) — unscheduled.
- Sample files D1–D8 + sample 2B JSON + sample 26AS TXT — pending.
- Field lists to be confirmed before export generation.

---

*Prepared by Pucho.ai Solution Architecture Team. Based on ECM POC — Detailed Functional
Document v1.0, 14 August 2026.*