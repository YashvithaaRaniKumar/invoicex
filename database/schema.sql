-- ==========================================================
-- INVOICE & VENDOR PAYMENT AUTOMATION PLATFORM
-- PostgreSQL Relational Database Schema DDL
-- ==========================================================

-- 1. USERS & ROLES
CREATE TABLE IF NOT EXISTS users (
    id VARCHAR(36) PRIMARY KEY,
    full_name VARCHAR(100) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(30) NOT NULL CHECK (role IN ('ADMIN', 'FINANCE_STAFF', 'APPROVER')),
    department VARCHAR(50) DEFAULT 'Accounts Payable',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. VENDORS MASTER
CREATE TABLE IF NOT EXISTS vendors (
    id VARCHAR(36) PRIMARY KEY,
    vendor_code VARCHAR(30) UNIQUE NOT NULL,
    name VARCHAR(150) NOT NULL,
    email VARCHAR(100),
    phone VARCHAR(30),
    gstin VARCHAR(20) UNIQUE NOT NULL,
    pan VARCHAR(15),
    address TEXT,
    bank_account_number VARCHAR(50),
    bank_ifsc VARCHAR(20),
    bank_name VARCHAR(100),
    payment_terms_days INTEGER DEFAULT 30,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 3. INVOICES
CREATE TABLE IF NOT EXISTS invoices (
    id VARCHAR(36) PRIMARY KEY,
    invoice_number VARCHAR(50) NOT NULL,
    vendor_id VARCHAR(36) NOT NULL REFERENCES vendors(id) ON DELETE RESTRICT,
    invoice_date DATE NOT NULL,
    due_date DATE NOT NULL,
    amount NUMERIC(14, 2) NOT NULL,
    tax_amount NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
    total_amount NUMERIC(14, 2) NOT NULL,
    po_number VARCHAR(50),
    description TEXT,
    status VARCHAR(30) NOT NULL DEFAULT 'PENDING_VERIFICATION' CHECK (
        status IN ('DRAFT', 'PENDING_VERIFICATION', 'VERIFIED', 'EXCEPTION', 'PENDING_APPROVAL', 'APPROVED', 'SCHEDULED', 'PAID', 'REJECTED', 'RECONCILED')
    ),
    verification_status VARCHAR(30) NOT NULL DEFAULT 'PENDING' CHECK (
        verification_status IN ('PENDING', 'PASSED', 'FAILED', 'NEEDS_CORRECTION')
    ),
    approval_status VARCHAR(30) NOT NULL DEFAULT 'PENDING' CHECK (
        approval_status IN ('PENDING', 'APPROVED', 'REJECTED', 'CORRECTION_REQUESTED')
    ),
    payment_status VARCHAR(30) NOT NULL DEFAULT 'UNPAID' CHECK (
        payment_status IN ('UNPAID', 'SCHEDULED', 'PROCESSING', 'PAID', 'FAILED')
    ),
    created_by VARCHAR(36) REFERENCES users(id),
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Index for duplicate detection & vendor lookup
CREATE INDEX IF NOT EXISTS idx_invoices_vendor_number ON invoices(vendor_id, invoice_number);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(status);
CREATE INDEX IF NOT EXISTS idx_invoices_due_date ON invoices(due_date);

-- 4. INVOICE VERIFICATIONS
CREATE TABLE IF NOT EXISTS invoice_verifications (
    id VARCHAR(36) PRIMARY KEY,
    invoice_id VARCHAR(36) NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
    verified_by VARCHAR(36) REFERENCES users(id),
    gstin_valid BOOLEAN DEFAULT TRUE,
    math_valid BOOLEAN DEFAULT TRUE,
    po_matched BOOLEAN DEFAULT TRUE,
    duplicate_check_passed BOOLEAN DEFAULT TRUE,
    outcome VARCHAR(30) NOT NULL CHECK (outcome IN ('PASSED', 'FAILED', 'NEEDS_CORRECTION')),
    notes TEXT,
    verified_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 5. INVOICE EXCEPTIONS (Key Special Feature)
CREATE TABLE IF NOT EXISTS invoice_exceptions (
    id VARCHAR(36) PRIMARY KEY,
    invoice_id VARCHAR(36) NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
    issue_title VARCHAR(150) NOT NULL,
    issue_description TEXT NOT NULL,
    severity VARCHAR(20) NOT NULL CHECK (severity IN ('CRITICAL', 'HIGH', 'MEDIUM')),
    required_action TEXT NOT NULL,
    assigned_to VARCHAR(36) REFERENCES users(id),
    deadline DATE,
    status VARCHAR(30) NOT NULL DEFAULT 'ACTION_REQUIRED' CHECK (
        status IN ('ACTION_REQUIRED', 'UNDER_REVIEW', 'ESCALATED', 'RESOLVED')
    ),
    resolution_notes TEXT,
    resolved_by VARCHAR(36) REFERENCES users(id),
    resolved_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_exceptions_status ON invoice_exceptions(status);
CREATE INDEX IF NOT EXISTS idx_exceptions_assigned ON invoice_exceptions(assigned_to);

-- 6. APPROVALS
CREATE TABLE IF NOT EXISTS approvals (
    id VARCHAR(36) PRIMARY KEY,
    invoice_id VARCHAR(36) NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
    approver_id VARCHAR(36) NOT NULL REFERENCES users(id),
    decision VARCHAR(30) NOT NULL CHECK (decision IN ('APPROVED', 'REJECTED', 'CORRECTION_REQUESTED')),
    comments TEXT,
    decision_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 7. PAYMENTS
CREATE TABLE IF NOT EXISTS payments (
    id VARCHAR(36) PRIMARY KEY,
    invoice_id VARCHAR(36) NOT NULL REFERENCES invoices(id) ON DELETE RESTRICT,
    scheduled_by VARCHAR(36) REFERENCES users(id),
    scheduled_date DATE NOT NULL,
    execution_date DATE,
    amount_paid NUMERIC(14, 2) NOT NULL,
    payment_method VARCHAR(30) NOT NULL CHECK (payment_method IN ('NEFT', 'RTGS', 'IMPS', 'NETBANKING', 'CHEQUE')),
    payment_status VARCHAR(30) NOT NULL DEFAULT 'SCHEDULED' CHECK (
        payment_status IN ('SCHEDULED', 'PROCESSING', 'PAID', 'FAILED')
    ),
    utr_reference VARCHAR(50),
    debit_account VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(payment_status);

-- 8. RECONCILIATIONS
CREATE TABLE IF NOT EXISTS reconciliations (
    id VARCHAR(36) PRIMARY KEY,
    invoice_id VARCHAR(36) NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
    payment_id VARCHAR(36) REFERENCES payments(id) ON DELETE SET NULL,
    match_status VARCHAR(30) NOT NULL CHECK (match_status IN ('MATCHED', 'PARTIAL', 'MISMATCH', 'UNMATCHED')),
    invoice_amount NUMERIC(14, 2) NOT NULL,
    payment_amount NUMERIC(14, 2) NOT NULL,
    discrepancy_amount NUMERIC(14, 2) DEFAULT 0.00,
    discrepancy_reason VARCHAR(50) DEFAULT 'NONE' CHECK (
        discrepancy_reason IN ('TDS_DEDUCTION', 'BANK_FEES', 'EXCHANGE_VARIATION', 'OVERPAYMENT', 'NONE')
    ),
    reconciliation_notes TEXT,
    reconciled_by VARCHAR(36) REFERENCES users(id),
    reconciled_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 9. NOTIFICATIONS
CREATE TABLE IF NOT EXISTS notifications (
    id VARCHAR(36) PRIMARY KEY,
    user_id VARCHAR(36) REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(150) NOT NULL,
    message TEXT NOT NULL,
    type VARCHAR(30) NOT NULL DEFAULT 'INFO' CHECK (type IN ('INFO', 'WARNING', 'CRITICAL', 'SUCCESS')),
    link_url VARCHAR(255),
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 10. AUDIT LOGS
CREATE TABLE IF NOT EXISTS audit_logs (
    id VARCHAR(36) PRIMARY KEY,
    user_id VARCHAR(36) REFERENCES users(id) ON DELETE SET NULL,
    entity_name VARCHAR(50) NOT NULL,
    entity_id VARCHAR(36) NOT NULL,
    action VARCHAR(50) NOT NULL,
    metadata TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
