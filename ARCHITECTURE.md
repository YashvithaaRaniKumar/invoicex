# INVOICE & VENDOR PAYMENT AUTOMATION PLATFORM
## Final System Architecture & Implementation Blueprint
### (Pure PostgreSQL Relational Architecture)

---

## 1. System Architecture Overview

```
                      ┌──────────────────────────────────────────────┐
                      │             CLIENT LAYER (Browser)           │
                      │   React 18 + Vite + Tailwind CSS + Lucide    │
                      └──────────────────────┬───────────────────────┘
                                             │ HTTP / REST / JWT Bearer
                                             ▼
                      ┌──────────────────────────────────────────────┐
                      │              BACKEND API LAYER               │
                      │         Node.js + Express.js Server          │
                      │                                              │
                      │  • Authentication & RBAC Middleware          │
                      │  • Business Logic Controllers                │
                      │  • Verification & Duplicate Detection Engine │
                      │  • 5-Point Exception Resolution Logic        │
                      │  • Audit Logging & State Transitions         │
                      └──────────────────────┬───────────────────────┘
                                             │ SQL Queries via node-postgres (pg)
                                             ▼
                      ┌──────────────────────────────────────────────┐
                      │            DATABASE LAYER (PostgreSQL)       │
                      │                                              │
                      │  1. users                 6. approvals       │
                      │  2. vendors               7. payments        │
                      │  3. invoices              8. reconciliations │
                      │  4. invoice_verifications 9. notifications   │
                      │  5. invoice_exceptions   10. audit_logs      │
                      └──────────────────────────────────────────────┘
```

---

## 2. PostgreSQL Relational Database Schema & Entities

PostgreSQL is the **only** database engine used across all 10 entities. All primary keys use standard unique identifier strings or PostgreSQL UUIDs, and foreign keys strictly enforce relational integrity.

### Entity 1: `users`
Represents the system actors with role-based access.
- `id` (VARCHAR(36) PRIMARY KEY)
- `full_name` (VARCHAR(100) NOT NULL)
- `email` (VARCHAR(100) UNIQUE NOT NULL)
- `password_hash` (VARCHAR(255) NOT NULL) - bcrypt encrypted
- `role` (VARCHAR(30) NOT NULL) - `CHECK (role IN ('ADMIN', 'FINANCE_STAFF', 'APPROVER'))`
- `department` (VARCHAR(50) DEFAULT 'Accounts Payable')
- `created_at` (TIMESTAMP DEFAULT CURRENT_TIMESTAMP)

### Entity 2: `vendors`
Master directory of approved vendors with Indian tax (GSTIN) and banking details.
- `id` (VARCHAR(36) PRIMARY KEY)
- `vendor_code` (VARCHAR(30) UNIQUE NOT NULL) - e.g., `VND-TCS-01`
- `name` (VARCHAR(150) NOT NULL)
- `email` (VARCHAR(100))
- `phone` (VARCHAR(30))
- `gstin` (VARCHAR(20) UNIQUE NOT NULL) - 15-character Indian GST format
- `pan` (VARCHAR(15))
- `address` (TEXT)
- `bank_account_number` (VARCHAR(50))
- `bank_ifsc` (VARCHAR(20))
- `bank_name` (VARCHAR(100))
- `payment_terms_days` (INTEGER DEFAULT 30)
- `is_active` (BOOLEAN DEFAULT TRUE)
- `created_at` (TIMESTAMP DEFAULT CURRENT_TIMESTAMP)

### Entity 3: `invoices`
Central transaction table storing the full invoice record and multi-dimensional statuses.
- `id` (VARCHAR(36) PRIMARY KEY)
- `invoice_number` (VARCHAR(50) NOT NULL)
- `vendor_id` (VARCHAR(36) NOT NULL REFERENCES vendors(id) ON DELETE RESTRICT)
- `invoice_date` (DATE NOT NULL)
- `due_date` (DATE NOT NULL)
- `amount` (NUMERIC(14, 2) NOT NULL) - Base taxable subtotal (INR ₹)
- `tax_amount` (NUMERIC(14, 2) NOT NULL DEFAULT 0.00) - GST (18%)
- `total_amount` (NUMERIC(14, 2) NOT NULL) - `amount + tax_amount`
- `po_number` (VARCHAR(50)) - Purchase Order reference
- `description` (TEXT) - Service or item description
- `status` (VARCHAR(30) NOT NULL DEFAULT 'PENDING_VERIFICATION') - Lifecycle state
- `verification_status` (VARCHAR(30) DEFAULT 'PENDING') - `PENDING | PASSED | FAILED | NEEDS_CORRECTION`
- `approval_status` (VARCHAR(30) DEFAULT 'PENDING') - `PENDING | APPROVED | REJECTED`
- `payment_status` (VARCHAR(30) DEFAULT 'UNPAID') - `UNPAID | SCHEDULED | PROCESSING | PAID | FAILED`
- `created_by` (VARCHAR(36) REFERENCES users(id))
- `notes` (TEXT)
- `created_at` (TIMESTAMP DEFAULT CURRENT_TIMESTAMP)
- `updated_at` (TIMESTAMP DEFAULT CURRENT_TIMESTAMP)

### Entity 4: `invoice_verifications`
Audit record of rule checks performed by Finance Staff.
- `id` (VARCHAR(36) PRIMARY KEY)
- `invoice_id` (VARCHAR(36) NOT NULL REFERENCES invoices(id) ON DELETE CASCADE)
- `verified_by` (VARCHAR(36) REFERENCES users(id))
- `gstin_valid` (BOOLEAN DEFAULT TRUE)
- `math_valid` (BOOLEAN DEFAULT TRUE)
- `po_matched` (BOOLEAN DEFAULT TRUE)
- `duplicate_check_passed` (BOOLEAN DEFAULT TRUE)
- `outcome` (VARCHAR(30) NOT NULL) - `PASSED | FAILED | NEEDS_CORRECTION`
- `notes` (TEXT) - Specific justification or error description
- `verified_at` (TIMESTAMP DEFAULT CURRENT_TIMESTAMP)

### Entity 5: `invoice_exceptions` (⭐ Standout Feature)
Stores actionable Accounts Payable blockers with a 5-point diagnosis.
- `id` (VARCHAR(36) PRIMARY KEY)
- `invoice_id` (VARCHAR(36) NOT NULL REFERENCES invoices(id) ON DELETE CASCADE)
- `issue_title` (VARCHAR(150) NOT NULL) - WHAT went wrong?
- `issue_description` (TEXT NOT NULL) - Detailed root cause
- `severity` (VARCHAR(20) NOT NULL) - `CRITICAL | HIGH | MEDIUM`
- `required_action` (TEXT NOT NULL) - WHAT action is required to resolve?
- `assigned_to` (VARCHAR(36) REFERENCES users(id)) - WHO needs to act?
- `deadline` (DATE) - WHEN must it be resolved?
- `status` (VARCHAR(30) DEFAULT 'ACTION_REQUIRED') - `ACTION_REQUIRED | UNDER_REVIEW | ESCALATED | RESOLVED`
- `resolution_notes` (TEXT)
- `resolved_by` (VARCHAR(36) REFERENCES users(id))
- `resolved_at` (TIMESTAMP)
- `created_at` (TIMESTAMP DEFAULT CURRENT_TIMESTAMP)

### Entity 6: `approvals`
Managerial sign-off records establishing segregation of duties.
- `id` (VARCHAR(36) PRIMARY KEY)
- `invoice_id` (VARCHAR(36) NOT NULL REFERENCES invoices(id) ON DELETE CASCADE)
- `approver_id` (VARCHAR(36) NOT NULL REFERENCES users(id))
- `decision` (VARCHAR(30) NOT NULL) - `APPROVED | REJECTED | CORRECTION_REQUESTED`
- `comments` (TEXT)
- `decision_date` (TIMESTAMP DEFAULT CURRENT_TIMESTAMP)

### Entity 7: `payments`
Disbursement records for approved invoices.
- `id` (VARCHAR(36) PRIMARY KEY)
- `invoice_id` (VARCHAR(36) NOT NULL REFERENCES invoices(id))
- `scheduled_by` (VARCHAR(36) REFERENCES users(id))
- `scheduled_date` (DATE NOT NULL)
- `execution_date` (DATE)
- `amount_paid` (NUMERIC(14, 2) NOT NULL)
- `payment_method` (VARCHAR(30) NOT NULL) - `NEFT | RTGS | IMPS | NETBANKING | CHEQUE`
- `payment_status` (VARCHAR(30) DEFAULT 'SCHEDULED') - `SCHEDULED | PROCESSING | PAID | FAILED`
- `utr_reference` (VARCHAR(50)) - Bank transaction reference number
- `debit_account` (VARCHAR(50))
- `created_at` (TIMESTAMP DEFAULT CURRENT_TIMESTAMP)

### Entity 8: `reconciliations`
Matches payment disbursements with invoice records and tracks variances (such as TDS deductions).
- `id` (VARCHAR(36) PRIMARY KEY)
- `invoice_id` (VARCHAR(36) NOT NULL REFERENCES invoices(id) ON DELETE CASCADE)
- `payment_id` (VARCHAR(36) REFERENCES payments(id))
- `match_status` (VARCHAR(30) NOT NULL) - `MATCHED | PARTIAL | MISMATCH | UNMATCHED`
- `invoice_amount` (NUMERIC(14, 2) NOT NULL)
- `payment_amount` (NUMERIC(14, 2) NOT NULL)
- `discrepancy_amount` (NUMERIC(14, 2) DEFAULT 0.00)
- `discrepancy_reason` (VARCHAR(50) DEFAULT 'NONE') - `TDS_DEDUCTION | BANK_FEES | EXCHANGE_VARIATION | OVERPAYMENT | NONE`
- `reconciliation_notes` (TEXT)
- `reconciled_by` (VARCHAR(36) REFERENCES users(id))
- `reconciled_at` (TIMESTAMP DEFAULT CURRENT_TIMESTAMP)

### Entity 9: `notifications`
Application alerts triggered by lifecycle events.
- `id` (VARCHAR(36) PRIMARY KEY)
- `user_id` (VARCHAR(36) REFERENCES users(id) ON DELETE CASCADE)
- `title` (VARCHAR(150) NOT NULL)
- `message` (TEXT NOT NULL)
- `type` (VARCHAR(30) DEFAULT 'INFO') - `INFO | WARNING | CRITICAL | SUCCESS`
- `link_url` (VARCHAR(255))
- `is_read` (BOOLEAN DEFAULT FALSE)
- `created_at` (TIMESTAMP DEFAULT CURRENT_TIMESTAMP)

### Entity 10: `audit_logs`
Chronological, immutable audit ledger for compliance and review.
- `id` (VARCHAR(36) PRIMARY KEY)
- `user_id` (VARCHAR(36) REFERENCES users(id) ON DELETE SET NULL)
- `entity_name` (VARCHAR(50) NOT NULL) - `INVOICE | PAYMENT | EXCEPTION | APPROVAL`
- `entity_id` (VARCHAR(36) NOT NULL)
- `action` (VARCHAR(50) NOT NULL) - `CREATED | VERIFIED | APPROVED | SCHEDULED | RESOLVED`
- `metadata` (TEXT) - JSON string of changed values
- `created_at` (TIMESTAMP DEFAULT CURRENT_TIMESTAMP)

---

## 3. User Roles & Permissions

1. **ADMIN**
   - Full system visibility and user management.
   - Access to all invoices, vendors, audit logs, and reports.
   - Capability to reassign any exception or override approvals if necessary.

2. **FINANCE STAFF**
   - Add/manage vendor records.
   - Create and upload vendor invoices.
   - Run verification and duplicate checks.
   - Triage, investigate, and resolve invoice exceptions.
   - Schedule payments for approved invoices.
   - Perform bank reconciliation and settle variance remarks (e.g. TDS).

3. **APPROVER / MANAGER**
   - Review verified invoices awaiting management sign-off.
   - Inspect PO lines, vendor details, and resolved exception history.
   - Approve, reject, or request corrections with mandatory comments.
   - Access executive reports and spend summaries.

---

## 4. Complete Invoice Lifecycle & State Machine

```
[DRAFT]
   │
   ▼ (Submit)
[PENDING_VERIFICATION] ───(Rule check failed / Discrepancy)───► [EXCEPTION]
   │                                                                 │
   ▼ (Passed verification checks)                       (Resolve & re-verify)
[VERIFIED] ──────────────────────────────────────────────────────────┘
   │
   ▼ (Forwarded to Manager)
[PENDING_APPROVAL] ───(Rejected)───► [REJECTED]
   │
   ▼ (Approved by Manager)
[APPROVED]
   │
   ▼ (Scheduled by Finance)
[SCHEDULED]
   │
   ▼ (Sent to Bank)
[PROCESSING] ───(Bank Failure)───► [FAILED]
   │
   ▼ (UTR confirmed)
[PAID]
   │
   ▼ (Reconciled with Bank Ledger)
[RECONCILED] (or [RECONCILIATION_MISMATCH] until settled)
```

---

## 5. Page List & Routing Hierarchy

1. `/login` — Clean B2B login screen with quick 1-click demo credential autofill.
2. `/dashboard` — Executive AP Dashboard ("What needs my attention today?", urgent action queue, KPIs).
3. `/invoices` — Invoice Management (search, filter by status/vendor, sort, creation modal).
4. `/invoices/:id` — 360° Invoice Dossier (vendor details, amounts, timeline, exception history).
5. `/verification` — Verification Queue (side-by-side compliance checks, GSTIN validation, PO match).
6. `/exceptions` — ⭐ Exception & Resolution Center (5-point diagnosis, SLA timers, resolve workflow).
7. `/approvals` — Approval Center (segregated queue for managers to sign off or reject).
8. `/payments/schedule` — Payment Scheduling (select payment mode, execution date, bank account).
9. `/payments/track` — Payment Tracking (visual disbursement timeline, UTR tracking).
10. `/reconciliation` — Bank Reconciliation (ledger matching, TDS difference calculator).
11. `/vendors` — Vendor Directory (vendor master data, GSTINs, payment terms).
12. `/reports` — AP Analytics & Reports (spend charts, aging buckets, CSV export).
13. `/notifications` — Notification Center (status change alerts with deep-links).
14. `/settings` — Profile & System Audit Logs (user info, permissions table, audit trail).

---

## 6. Backend REST API Plan

### Auth & System
- `POST /api/auth/login` → Log in, return JWT token and user profile
- `GET  /api/auth/me` → Fetch current authenticated user
- `GET  /api/users` → List AP team members for assignment dropdowns

### Vendors
- `GET  /api/vendors` → List all vendors (with search & active filter)
- `POST /api/vendors` → Register a new vendor with GSTIN & banking details
- `GET  /api/vendors/:id` → Vendor details, historical invoices, and payment track

### Invoices & Verification
- `GET    /api/invoices` → Filtered and paginated invoice list
- `POST   /api/invoices` → Create invoice (triggers pre-flight duplicate check)
- `GET    /api/invoices/:id` → Comprehensive invoice record with related entities
- `POST   /api/invoices/check-duplicate` → Check for matching vendor + invoice number / amount
- `POST   /api/invoices/:id/verify` → Perform verification (updates to `VERIFIED` or logs `EXCEPTION`)
- `POST   /api/invoices/:id/reject-verification` → Reject invalid invoice

### Exception Center
- `GET  /api/exceptions` → List all exceptions with severity and status filters
- `GET  /api/exceptions/:id` → 5-point diagnosis and resolution history
- `POST /api/exceptions/:id/assign` → Assign exception to a team member
- `PUT  /api/exceptions/:id/status` → Update status (`ACTION_REQUIRED`, `UNDER_REVIEW`, `ESCALATED`)
- `POST /api/exceptions/:id/resolve` → Record resolution notes and mark resolved

### Approvals
- `GET  /api/approvals/pending` → List verified invoices awaiting manager sign-off
- `POST /api/approvals/:id/approve` → Approve invoice for payment
- `POST /api/approvals/:id/reject` → Reject invoice with mandatory comment

### Payments & Tracking
- `GET  /api/payments` → List payment records
- `POST /api/payments/schedule` → Schedule payment date, mode (NEFT/RTGS), debit account
- `POST /api/payments/:id/process` → Simulate bank execution (transitions to `PAID` with generated UTR)

### Reconciliation
- `GET  /api/reconciliation` → Get matched & mismatched reconciliation records
- `POST /api/reconciliation/match` → Confirm match or record variance reason (e.g. TDS 2%)

### Dashboard, Reports & Notifications
- `GET /api/dashboard/stats` → KPI summary counts, urgent attention items, upcoming payables
- `GET /api/reports/summary` → Vendor spend aggregates, aging buckets, monthly totals
- `GET /api/notifications` → User notifications and unread count
- `PUT /api/notifications/:id/read` → Mark notification as read

---

## 7. UI/UX Design System Specification

- **Theme**: Crisp, authoritative B2B SaaS finance aesthetic.
- **Palette**:
  - Background: `#F8FAFC` (Slate-50)
  - Cards & Modals: `#FFFFFF` with subtle `#E2E8F0` borders
  - Brand Accent: `#0284C7` (Sky-600) / `#0369A1` (Sky-700)
  - Text Primary: `#0F172A` (Slate-900); Secondary: `#64748B` (Slate-500)
  - Semantic Badges:
    - Success: `#ECFDF5` bg, `#065F46` text (`#10B981` border)
    - Warning/Action: `#FFFBEB` bg, `#92400E` text (`#F59E0B` border)
    - Danger/Critical: `#FEF2F2` bg, `#991B1B` text (`#EF4444` border)
- **Top Bar Demo Switcher**: A visible 1-click toggle allowing the reviewer to switch between **Admin**, **Finance Staff**, and **Approver** without logging out, making the viva demonstration seamless.
- **Indian Business Context**: INR (`₹`) formatting, GSTIN identification, standard Indian corporate payment modes (NEFT, RTGS, IMPS).

---

## 8. Implementation Phases

- **Phase 1: PostgreSQL Connection & Database Initialization**
  - Configure `node-postgres` (`pg` Pool) with environment variables (`DATABASE_URL`, or `PGHOST`, `PGPORT`, `PGUSER`, `PGPASSWORD`, `PGDATABASE`).
  - Migration script to run `database/schema.sql`.
  - Seeding script to run `database/seed.sql`.

- **Phase 2: Express Server Core, Auth & Middleware**
  - Standard Express app with CORS, JSON body parser, morgan logging.
  - JWT authentication middleware and Role-Based Access Control (`authorizeRoles`).

- **Phase 3: React Frontend Scaffold & Design System**
  - Vite + React + Tailwind CSS configuration with Lucide icons.
  - Navigation sidebar, top header with Quick Role Bar, Toast notifications, reusable StatCards, Tables, and Badges.

- **Phase 4: Dashboard & "Action Required" Hub**
  - Real-time KPI statistics, "What needs my attention today?", and quick status summaries.

- **Phase 5: Invoice Management & Duplicate Engine**
  - Invoice list, filters, detailed dossier view, creation modal, and pre-submission duplicate warning.

- **Phase 6: Invoice Verification Queue**
  - Verification checklist (GSTIN format, calculation validation, PO matching), verify/reject action handlers.

- **Phase 7: ⭐ Exception & Resolution Center**
  - 5-point diagnosis cards, severity badges, assign user modal, resolution notes, and resolve/reopen actions.

- **Phase 8: Approval Center**
  - Segregated manager view for verified invoices with approval/rejection comments and audit trail.

- **Phase 9: Payment Scheduling & Tracking**
  - Payment scheduler (NEFT/RTGS/IMPS/Cheque), disbursement tracker with visual payment timeline and UTR numbers.

- **Phase 10: Two-Way Reconciliation Module**
  - Invoice-to-payment matching, variance calculator (TDS / bank charges), settlement notes.

- **Phase 11: Reports & Notifications**
  - Financial analytics, vendor spend charts, and status-driven notification feed.

- **Phase 12: Testing, Review Documentation & Viva Defense Guide**
  - Feature-by-feature developer notes explaining files, database tables, and business rules for the project review.
