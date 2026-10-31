#  Brightloop Pulse — Subscription Management & Recurring Revenue Operations

Every Subscription. Every Payment. Always in Sync.

Brightloop Pulse is an enterprise-grade subscription lifecycle and recurring revenue operations platform with strict Indian Rupee (₹) integer minor-unit (paise) financial calculations, automated "Never Twice, Never Missed" billing engine, customer self-service, and AI business intelligence.

## 🚀 Key Modules & Capabilities

1. **Revenue Pulse Dashboard**:
   - Signature sentence-driven executive financial summary derived from verified ledger records.
   - Interactive KPI cards (MRR, ARR, Active Subscriptions, Collected Revenue, Overdue Receivables) with drill-downs.
   - **Staff Month Ribbon**: Visual horizontal workload density bar calendar showing daily invoice schedules.
   - **Attention Queue**: Actionable cards for overdue accounts, pending approvals, and paused subscriptions.
   - Monthly Revenue & Collections Trend AreaChart.

2. **Automated Billing Engine ("Never Twice, Never Missed")**:
   - Live Dry-Run Preview predicting exact invoices to create, paused subscriptions skipped with reasons, and duplicate prevention.
   - Transactional execution advancing billing dates and creating immutable line snapshots.
   - Idempotency key `(subscriptionId, billingPeriod)` guaranteeing zero duplicate invoices on retries.
   - Safe Run Voiding (cancels only Draft invoices, strictly protects Confirmed and Paid).
   - Emergency Pause-all-billing safety switch.

3. **Subscription Lifecycle & Journey Track**:
   - Visual stages: `Draft` → `Quotation` → `Confirmed` → `Active` → `Closed` (with `Paused` handling).
   - Mid-cycle proration calculator for plan upgrades and downgrades.
   - Plan behavior enforcement (auto-close at end date, customer self-pause, early closure policies).

4. **Invoices & Printable GST Tax Invoices**:
   - Unique sequential numbering (`INV-2026-000101`).
   - Printable / PDF template with official Brightloop branding, CGST (9%) / SGST (9%) / IGST (18%) breakdown, and UPI/NEFT settlement instructions.
   - Status lifecycle: `Draft` → `Confirmed` → `Partially Paid` → `Paid` (with derived `Overdue` and audited `Cancelled`).

5. **Payments & Multi-Method Settlement**:
   - Direct allocation to invoices via UPI QR, Debit/Credit Card, Bank Wire (NEFT/RTGS), and Cash.
   - Partial payment handling and unapplied credit management.
   - Real-time balance updating and automated invoice status transitions.

6. **Bank Statement Reconciliation**:
   - 3-way matching (Amount, Reference, Date) with confidence score ratings.
   - Segregation of imported bank rows until approved.
   - Sample HDFC Bank CSV downloader.

7. **Renewals & Gentle Chase Collections**:
   - Categorized aging buckets: 1–7 days, 8–30 days, 30+ days overdue.
   - Empathetic pre-drafted reminder communications using respectful, collaborative language.
   - Automated halt once payment is allocated.

8. **Customer Self-Service Portal**:
   - "Your subscriptions, made simple."
   - **Next Bill, Explained** transparent calculation card.
   - 6-month forward cost projection (clearly labelled as estimate).
   - Customer self-service pause/resume and simulated instant UPI/Card checkout.
   - Strict backend customer data isolation.

9. **Catalog & Proposal Pipeline**:
   - Products with multi-variant add-on charges (e.g. Enterprise Edition, GPU Slices) and live gross margin calculations.
   - Plan versioning with effective dates and grandfathering policy ("Apply to new subscriptions only" vs "Next renewal").
   - Reusable Quotation Templates with one-click conversion to active subscriptions.

10. **Advanced Admin Intelligence**:
    - AI Business Intelligence Assistant powered by `@google/genai` (with deterministic database fallback).
    - 3, 6, 12-month multi-scenario revenue forecasting (Conservative, Realistic, Optimistic).
    - Continuous revenue leakage and cycle integrity auditor.
    - What-If pricing sandbox simulation.
    - Append-only security audit log and system health watchdog.

11. **Mandatory Vertical Slice Automated Verification Suite**:
    - In-app automated test suite executing the complete Section 30 lifecycle: Product → Variant → Plan → Quotation → Confirm → Convert → Subscription → Billing Dry Run → Execute Billing → Idempotency Re-run (asserts 0 duplicates) → Partial Payment → Paid Settlement → Audit Trail.

## 🔐 Demo Accounts

Switch roles seamlessly via the top-bar role selector or log in directly:

| Role | Email | Password | Access Scope |
| :--- | :--- | :--- | :--- |
| **Administrator** | `admin@brightloop.io` | `Pulse@2026!` | Full administrative control, tax & discount rules, billing runs, staff creation, audit logs |
| **Internal Staff** | `sarah.ops@brightloop.io` | `Pulse@2026!` | Assigned customer accounts, quotes, invoices, payments, gentle chase collections |
| **Customer** | `priya@acmetech.in` | `Pulse@2026!` | Customer self-service portal, Next Bill Explained, payment simulator, PDF invoices |

## 📐 Financial Precision Architecture

- Default currency: Indian Rupee (₹) with standard Indian numbering (`₹18,40,000`).
- All monetary values are calculated and persisted strictly as integer minor units (`paise`, where ₹1 = 100 paise) to eliminate JavaScript floating point rounding errors.
- Confirmed invoices store immutable snapshots of product names, variants, unit prices, discounts, and taxes. Subsequent product or plan edits never rewrite historical financial ledgers.
