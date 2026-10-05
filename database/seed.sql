-- ==========================================================
-- INVOICE & VENDOR PAYMENT AUTOMATION PLATFORM
-- Seed Data Script (Realistic Indian B2B AP Data)
-- ==========================================================

-- 1. USERS
-- Passwords are all hashed for 'Password@123'
INSERT INTO users (id, full_name, email, password_hash, role, department) VALUES
('usr-001-admin', 'System Administrator', 'admin@invoicex.local', '$2a$10$8zssyd6NcXUHcjyxrOxIR.nkrgQFlBF1X/A1/xJeAVd6P.1tNHP..', 'ADMIN', 'Finance Operations'),
('usr-002-finance', 'Finance Specialist', 'finance@invoicex.local', '$2a$10$8zssyd6NcXUHcjyxrOxIR.nkrgQFlBF1X/A1/xJeAVd6P.1tNHP..', 'FINANCE_STAFF', 'Accounts Payable'),
('usr-003-approver', 'AP Approver', 'manager@invoicex.local', '$2a$10$8zssyd6NcXUHcjyxrOxIR.nkrgQFlBF1X/A1/xJeAVd6P.1tNHP..', 'APPROVER', 'Finance Control & Treasury')
ON CONFLICT (id) DO UPDATE SET
  full_name = EXCLUDED.full_name,
  email = EXCLUDED.email;

-- 2. VENDORS
INSERT INTO vendors (id, vendor_code, name, email, phone, gstin, pan, address, bank_account_number, bank_ifsc, bank_name, payment_terms_days, is_active) VALUES
('vnd-001', 'VND-TCS-01', 'Tata Consultancy Services Ltd', 'billing.enterprise@tcs.com', '+91 22 6778 9999', '27AAACT2727Q1ZW', 'AAACT2727Q', 'TCS House, Raveline Street, Fort, Mumbai, MH 400001', '000405001290', 'HDFC0000004', 'HDFC Bank', 30, TRUE),
('vnd-002', 'VND-INF-02', 'Infosys BPM Solutions Ltd', 'accounts.receivable@infosys.com', '+91 80 2852 0261', '29AAACI4567M1ZV', 'AAACI4567M', 'Electronics City, Hosur Road, Bengaluru, KA 560100', '002302000045', 'ICIC0000023', 'ICICI Bank', 45, TRUE),
('vnd-003', 'VND-BLU-03', 'Blue Dart Express Logistics', 'corporate.billing@bluedart.com', '+91 22 2839 6444', '27AAACB2288N1Z1', 'AAACB2288N', 'Blue Dart Centre, Sahar Airport Road, Andheri (E), Mumbai, MH 400099', '109823456789', 'SBIN0001823', 'State Bank of India', 15, TRUE),
('vnd-004', 'VND-REL-04', 'Reliance Digital Hardware & Cloud', 'enterprise.payments@ril.com', '+91 22 3555 5000', '24AAACR5555R1Z9', 'AAACR5555R', 'Maker Chambers IV, 222 Nariman Point, Mumbai, MH 400021', '50200012345678', 'HDFC0000123', 'HDFC Bank', 30, TRUE),
('vnd-005', 'VND-GOD-05', 'Godrej Infotech Solutions', 'invoicing@godrejinfotech.com', '+91 22 6796 4000', '27AAACG1234G1Z3', 'AAACG1234G', 'Pirojshanagar, Vikhroli, Mumbai, MH 400079', '001105009876', 'UTIB0000011', 'Axis Bank', 30, TRUE),
('vnd-006', 'VND-LNT-06', 'L&T Electrical & Automation Ltd', 'ap.vendor@lntebg.com', '+91 22 6705 9000', '27AAACL3456L1Z8', 'AAACL3456L', 'L&T House, Ballard Estate, Mumbai, MH 400001', '034502000012', 'KKBK0000345', 'Kotak Mahindra Bank', 60, TRUE)
ON CONFLICT (id) DO NOTHING;

-- 3. INVOICES (Varied real-world Indian B2B invoices)
INSERT INTO invoices (id, invoice_number, vendor_id, invoice_date, due_date, amount, tax_amount, total_amount, po_number, description, status, verification_status, approval_status, payment_status, created_by, notes) VALUES
('inv-001', 'TCS/2026/091', 'vnd-001', '2026-09-10', '2026-10-10', 250000.00, 45000.00, 295000.00, 'PO-2026-1088', 'Quarterly IT Infrastructure Maintenance & Cloud Support', 'APPROVED', 'PASSED', 'APPROVED', 'SCHEDULED', 'usr-002-finance', 'Verified against Master Service Agreement #MSA-2025-44'),
('inv-002', 'INF-BPM-4402', 'vnd-002', '2026-09-12', '2026-10-27', 180000.00, 32400.00, 212400.00, 'PO-2026-1092', 'Finance Process BPO Outsourcing Services for Aug 2026', 'PENDING_APPROVAL', 'PASSED', 'PENDING', 'UNPAID', 'usr-002-finance', 'Verification completed with clean 3-way match'),
('inv-003', 'BD-LOG-8911', 'vnd-003', '2026-09-18', '2026-10-03', 42500.00, 7650.00, 50150.00, 'PO-2026-1104', 'Pan-India Corporate Document Courier & Air Freight', 'PAID', 'PASSED', 'APPROVED', 'PAID', 'usr-002-finance', 'Processed via NEFT transfer'),
('inv-004', 'REL-ENT-9021', 'vnd-004', '2026-09-20', '2026-10-20', 320000.00, 57600.00, 377600.00, 'PO-2026-1110', 'Enterprise Laptops & Workstations (Batch of 5 ThinkPads)', 'EXCEPTION', 'FAILED', 'PENDING', 'UNPAID', 'usr-002-finance', 'Discrepancy: Delivery challan quantity shows 4 received vs 5 billed'),
('inv-005', 'GIT-SUB-1044', 'vnd-005', '2026-09-22', '2026-10-22', 95000.00, 17100.00, 112100.00, 'PO-2026-1115', 'ERP User License Subscription Renewal (Q3 2026)', 'PENDING_VERIFICATION', 'PENDING', 'PENDING', 'UNPAID', 'usr-002-finance', 'Recently submitted; requires tax rate confirmation'),
('inv-006', 'LNT-ELEC-309', 'vnd-006', '2026-08-15', '2026-09-15', 540000.00, 97200.00, 637200.00, 'PO-2026-0940', 'Substation Switchgear Maintenance & Power Factor Correction', 'RECONCILED', 'PASSED', 'APPROVED', 'PAID', 'usr-002-finance', 'Reconciled with 2% Section 194C TDS deduction'),
('inv-007', 'TCS/2026/099', 'vnd-001', '2026-09-25', '2026-10-25', 120000.00, 21600.00, 141600.00, 'PO-2026-1120', 'Cybersecurity Vulnerability Assessment & Penetration Test', 'PENDING_VERIFICATION', 'PENDING', 'PENDING', 'UNPAID', 'usr-002-finance', 'Vendor GSTIN validation pending'),
('inv-008', 'BD-LOG-8955', 'vnd-003', '2026-09-01', '2026-09-16', 36000.00, 6480.00, 42480.00, 'PO-2026-1070', 'Warehouse Logistics & Bulk Transport', 'RECONCILED', 'PASSED', 'APPROVED', 'PAID', 'usr-002-finance', 'Exact 100% matched payment')
ON CONFLICT (id) DO NOTHING;

-- 4. INVOICE VERIFICATIONS
INSERT INTO invoice_verifications (id, invoice_id, verified_by, gstin_valid, math_valid, po_matched, duplicate_check_passed, outcome, notes) VALUES
('vrf-001', 'inv-001', 'usr-002-finance', TRUE, TRUE, TRUE, TRUE, 'PASSED', 'All GST fields verified. PO-2026-1088 lines match subtotal perfectly.'),
('vrf-002', 'inv-002', 'usr-002-finance', TRUE, TRUE, TRUE, TRUE, 'PASSED', 'Tax calculations validated at 18% IGST. Ready for manager sign-off.'),
('vrf-003', 'inv-003', 'usr-002-finance', TRUE, TRUE, TRUE, TRUE, 'PASSED', 'Express delivery receipts attached and verified.'),
('vrf-004', 'inv-004', 'usr-002-finance', TRUE, TRUE, FALSE, TRUE, 'FAILED', 'Quantity mismatch: PO states 5 units, goods receipt shows 4 units delivered.'),
('vrf-006', 'inv-006', 'usr-002-finance', TRUE, TRUE, TRUE, TRUE, 'PASSED', 'Work completion certificate verified by Facility Manager.'),
('vrf-008', 'inv-008', 'usr-002-finance', TRUE, TRUE, TRUE, TRUE, 'PASSED', 'Waybill numbers confirmed against Blue Dart portal.')
ON CONFLICT (id) DO NOTHING;

-- 5. INVOICE EXCEPTIONS (Actionable 5-Point Resolution Hub)
INSERT INTO invoice_exceptions (id, invoice_id, issue_title, issue_description, severity, required_action, assigned_to, deadline, status, resolution_notes) VALUES
('exc-001', 'inv-004', 'PO & Delivery Challan Quantity Mismatch', 'Invoice bills for 5 ThinkPad laptops (₹3,20,000 subtotal) but Goods Receipt Note GRN-892 shows only 4 laptops received in Mumbai IT store.', 'HIGH', 'Contact Reliance Enterprise Key Account Manager to issue revised credit note for 1 unit or ship pending unit immediately.', 'usr-002-finance', '2026-10-04', 'ACTION_REQUIRED', 'Waiting for vendor confirmation on shipment of remaining unit.'),
('exc-002', 'inv-005', 'Vendor GSTIN HSN Summary Missing', 'HSN/SAC 998313 code tax rate calculation does not have mandatory e-way bill / e-invoice IRN QR code attached.', 'MEDIUM', 'Request vendor billing desk to provide the digitally signed e-invoice IRN PDF.', 'usr-002-finance', '2026-10-06', 'UNDER_REVIEW', 'Vendor emailed IRN reference; verifying on GST portal.'),
('exc-003', 'inv-007', 'Bank Account IFSC Code Mismatch in Header', 'Invoice footer prints branch IFSC as HDFC0000004 but vendor master record holds HDFC0000123.', 'CRITICAL', 'Hold verification and obtain signed bank account confirmation letter before approval.', 'usr-002-finance', '2026-10-02', 'ESCALATED', 'Escalated to Treasury Lead for vendor bank validation.')
ON CONFLICT (id) DO NOTHING;

-- 6. APPROVALS
INSERT INTO approvals (id, invoice_id, approver_id, decision, comments) VALUES
('app-001', 'inv-001', 'usr-003-approver', 'APPROVED', 'Budget code approved under IT-OPEX-2026. Payment scheduled on due date.'),
('app-003', 'inv-003', 'usr-003-approver', 'APPROVED', 'Approved for immediate payment release as per 15-day vendor terms.'),
('app-006', 'inv-006', 'usr-003-approver', 'APPROVED', 'Approved with standard Section 194C statutory deduction.')
ON CONFLICT (id) DO NOTHING;

-- 7. PAYMENTS
INSERT INTO payments (id, invoice_id, scheduled_by, scheduled_date, execution_date, amount_paid, payment_method, payment_status, utr_reference, debit_account) VALUES
('pay-001', 'inv-001', 'usr-002-finance', '2026-10-10', NULL, 295000.00, 'RTGS', 'SCHEDULED', NULL, 'HDFC Bank - 50200098765432'),
('pay-003', 'inv-003', 'usr-002-finance', '2026-09-25', '2026-09-25', 50150.00, 'NEFT', 'PAID', 'HDFCN26268991204', 'HDFC Bank - 50200098765432'),
('pay-006', 'inv-006', 'usr-002-finance', '2026-09-14', '2026-09-14', 624456.00, 'RTGS', 'PAID', 'SBINR26257008129', 'State Bank - 300188992211'),
('pay-008', 'inv-008', 'usr-002-finance', '2026-09-15', '2026-09-15', 42480.00, 'IMPS', 'PAID', 'ICICM26258901234', 'ICICI Bank - 002305001122')
ON CONFLICT (id) DO NOTHING;

-- 8. RECONCILIATIONS
INSERT INTO reconciliations (id, invoice_id, payment_id, match_status, invoice_amount, payment_amount, discrepancy_amount, discrepancy_reason, reconciliation_notes, reconciled_by) VALUES
('rec-001', 'inv-003', 'pay-003', 'MATCHED', 50150.00, 50150.00, 0.00, 'NONE', '100% matched against HDFC disbursement statement dated 25-Sep-2026.', 'usr-002-finance'),
('rec-002', 'inv-006', 'pay-006', 'MISMATCH', 637200.00, 624456.00, 12744.00, 'TDS_DEDUCTION', 'Variance of ₹12,744 corresponds to 2% Section 194C TDS deduction on base ₹5,40,000 + GST withholding. Verified by Tax Auditor.', 'usr-002-finance'),
('rec-003', 'inv-008', 'pay-008', 'MATCHED', 42480.00, 42480.00, 0.00, 'NONE', 'Exact match confirmed against ICICI statement ref 20260915-BD.', 'usr-002-finance')
ON CONFLICT (id) DO NOTHING;

-- 9. NOTIFICATIONS
INSERT INTO notifications (id, user_id, title, message, type, link_url, is_read) VALUES
('notif-001', 'usr-002-finance', 'Invoice Verification Required', 'New invoice GIT-SUB-1044 (₹1,12,100) from Godrej Infotech requires verification.', 'INFO', '/verification', FALSE),
('notif-002', 'usr-003-approver', 'Manager Approval Awaiting', 'Invoice INF-BPM-4402 (₹2,12,400) from Infosys BPM is verified and ready for sign-off.', 'WARNING', '/approvals', FALSE),
('notif-003', 'usr-002-finance', 'Critical Exception Escalated', 'IFSC Code Mismatch on invoice TCS/2026/099 has been escalated to Treasury.', 'CRITICAL', '/exceptions', FALSE),
('notif-004', 'usr-001-admin', 'Payment Scheduled Confirmation', 'Disbursement of ₹2,95,000 to Tata Consultancy Services scheduled for 10-Oct-2026.', 'SUCCESS', '/payments/track', TRUE)
ON CONFLICT (id) DO NOTHING;

-- 10. AUDIT LOGS
INSERT INTO audit_logs (id, user_id, entity_name, entity_id, action, metadata) VALUES
('aud-001', 'usr-002-finance', 'INVOICE', 'inv-001', 'CREATED', '{"invoice_number":"TCS/2026/091","vendor":"Tata Consultancy Services","amount":295000}'),
('aud-002', 'usr-002-finance', 'INVOICE', 'inv-001', 'VERIFIED', '{"status":"VERIFIED","checks_passed":["gstin","math","po"]}'),
('aud-003', 'usr-003-approver', 'INVOICE', 'inv-001', 'APPROVED', '{"decision":"APPROVED","comment":"Budget code IT-OPEX-2026 approved"}'),
('aud-004', 'usr-002-finance', 'PAYMENT', 'pay-001', 'SCHEDULED', '{"method":"RTGS","scheduled_date":"2026-10-10"}'),
('aud-005', 'usr-002-finance', 'EXCEPTION', 'exc-001', 'CREATED', '{"severity":"HIGH","issue":"PO & Delivery Challan Quantity Mismatch"}')
ON CONFLICT (id) DO NOTHING;
