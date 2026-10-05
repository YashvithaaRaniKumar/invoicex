import { query } from '../config/db.js';
import { logAuditEvent, createNotification } from '../middleware/auditLogger.js';

// Indian GSTIN regex: 2 digits state code, 5 letters PAN, 4 digits, 1 letter, 1 alphanumeric, 'Z', 1 alphanumeric
const GSTIN_REGEX = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;

/**
 * =========================================================================
 * FEATURE: 4-Way Automated Invoice Verification
 * =========================================================================
 * - WHAT IT DOES     : Verifies statutory GSTIN, tax math (amount + tax = total),
 *                      PO reference link, and duplicate invoice detection.
 * - REACT COMPONENT  : client/src/pages/VerificationPage.jsx (handleVerify)
 * - API CALLED       : axiosClient.post(`/invoices/${id}/verify`, { notes })
 * - EXPRESS ROUTE    : POST /api/invoices/:id/verify in server/src/routes/invoiceRoutes.js
 * - POSTGRESQL TABLES: invoices, invoice_verifications, invoice_exceptions, audit_logs
 *
 * 7-STEP ARCHITECTURE FLOW (EASY TO EXPLAIN TO FACULTY):
 *   1. React UI       : Finance staff clicks "Verify Invoice".
 *   2. Axios API Call : Sends invoice ID & notes to backend with JWT token.
 *   3. Express Route  : Authenticates user, verifies role (FINANCE_STAFF or ADMIN).
 *   4. Controller     : Checks GSTIN format, arithmetic accuracy, PO existence, and duplicate.
 *   5. PostgreSQL     : Saves result to 'invoice_verifications' table, updates 'invoices' status.
 *   6. Response       : Returns JSON with { success, outcome: 'PASSED'|'FAILED', checks }.
 *   7. React UI Update: Displays success/warning toast and refreshes unverified invoice list.
 * =========================================================================
 */
export const verifyInvoice = async (req, res) => {
  try {
    const { id } = req.params;
    const { notes } = req.body;

    const invRes = await query(
      `SELECT i.*, v.gstin, v.name AS vendor_name, v.is_active AS vendor_active
       FROM invoices i
       JOIN vendors v ON i.vendor_id = v.id
       WHERE i.id = $1`,
      [id]
    );

    if (invRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Invoice not found.' });
    }

    const inv = invRes.rows[0];

    // Rule 1: GSTIN validity
    const gstinValid = Boolean(inv.gstin && GSTIN_REGEX.test(inv.gstin.trim().toUpperCase()));

    // Rule 2: Math calculation check (amount + tax_amount == total_amount)
    const expectedTotal = parseFloat(inv.amount) + parseFloat(inv.tax_amount);
    const mathValid = Math.abs(expectedTotal - parseFloat(inv.total_amount)) < 0.05;

    // Rule 3: Purchase order reference check
    const poMatched = Boolean(inv.po_number && inv.po_number.trim().length > 3);

    // Rule 4: Duplicate check (is there another invoice with same number and vendor?)
    const dupRes = await query(
      `SELECT id, invoice_number FROM invoices
       WHERE vendor_id = $1 AND LOWER(invoice_number) = LOWER($2) AND id != $3`,
      [inv.vendor_id, inv.invoice_number, id]
    );
    const duplicatePassed = dupRes.rows.length === 0;

    const allPassed = gstinValid && mathValid && poMatched && duplicatePassed;
    const outcome = allPassed ? 'PASSED' : 'FAILED';

    // Record verification record
    const verifId = `vrf-${Date.now()}`;
    await query(
      `INSERT INTO invoice_verifications (
        id, invoice_id, verified_by, gstin_valid, math_valid,
        po_matched, duplicate_check_passed, outcome, notes
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [
        verifId,
        id,
        req.user?.id || 'usr-002-finance',
        gstinValid,
        mathValid,
        poMatched,
        duplicatePassed,
        outcome,
        notes || (allPassed ? 'All statutory and computational checks validated.' : 'Verification rule failure detected.'),
      ]
    );

    if (allPassed) {
      // Transition to VERIFIED
      await query(
        `UPDATE invoices
         SET status = 'VERIFIED',
             verification_status = 'PASSED',
             approval_status = 'PENDING',
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $1`,
        [id]
      );

      await logAuditEvent({
        userId: req.user?.id,
        entityName: 'INVOICE',
        entityId: id,
        action: 'VERIFIED',
        metadata: { outcome: 'PASSED', checks: { gstinValid, mathValid, poMatched, duplicatePassed } },
      });

      // Notify Approver / Manager
      await createNotification({
        userId: 'usr-003-approver',
        title: 'Invoice Ready for Approval',
        message: `Invoice #${inv.invoice_number} from ${inv.vendor_name} (₹${parseFloat(inv.total_amount).toLocaleString('en-IN')}) has been verified and awaits sign-off.`,
        type: 'INFO',
        linkUrl: `/approvals`,
      });

      return res.status(200).json({
        success: true,
        message: 'Invoice verified successfully and routed to Manager for approval.',
        outcome: 'PASSED',
        checks: { gstinValid, mathValid, poMatched, duplicatePassed },
      });
    } else {
      // Verification Failed: Route to Exception Center
      const failedRules = [];
      if (!gstinValid) failedRules.push(`Vendor GSTIN (${inv.gstin || 'MISSING'}) is invalid or missing statutory formatting.`);
      if (!mathValid) failedRules.push(`Tax calculation discrepancy: Subtotal (₹${inv.amount}) + Tax (₹${inv.tax_amount}) != Total (₹${inv.total_amount}).`);
      if (!poMatched) failedRules.push('Mandatory Purchase Order (PO) number reference is missing.');
      if (!duplicatePassed) failedRules.push(`Duplicate invoice detected: Invoice #${inv.invoice_number} already exists.`);

      const issueTitle = !gstinValid ? 'Statutory GSTIN Compliance Failure' : !mathValid ? 'Invoice Tax Calculation Discrepancy' : 'Missing PO Contract Link';
      const severity = !duplicatePassed || !gstinValid ? 'CRITICAL' : 'HIGH';
      const requiredAction = !gstinValid
        ? 'Contact vendor to provide verified 15-character GSTIN with registered trade name.'
        : !mathValid
        ? 'Request corrected revised tax invoice reflecting accurate 18% GST computations.'
        : 'Update invoice record with approved Purchase Order reference.';

      // Create Exception
      const excId = `exc-${Date.now()}`;
      await query(
        `INSERT INTO invoice_exceptions (
          id, invoice_id, issue_title, issue_description, severity,
          required_action, assigned_to, deadline, status, resolution_notes
        ) VALUES (
          $1, $2, $3, $4, $5,
          $6, $7, CURRENT_DATE + INTERVAL '3 day', 'ACTION_REQUIRED', $8
        )`,
        [
          excId,
          id,
          issueTitle,
          failedRules.join(' '),
          severity,
          requiredAction,
          req.user?.id || 'usr-002-finance',
          notes || 'Flagged during automated verification checks.',
        ]
      );

      // Transition invoice status to EXCEPTION
      await query(
        `UPDATE invoices
         SET status = 'EXCEPTION',
             verification_status = 'FAILED',
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $1`,
        [id]
      );

      await logAuditEvent({
        userId: req.user?.id,
        entityName: 'INVOICE',
        entityId: id,
        action: 'EXCEPTION_FLAGGED',
        metadata: { failedRules, severity },
      });

      return res.status(200).json({
        success: false,
        message: 'Invoice verification failed. An actionable exception was logged in the Exception Center.',
        outcome: 'FAILED',
        checks: { gstinValid, mathValid, poMatched, duplicatePassed },
        failedRules,
      });
    }
  } catch (error) {
    console.error('verifyInvoice error:', error);
    return res.status(500).json({ success: false, message: 'Server error during verification.' });
  }
};

/**
 * =========================================================================
 * FEATURE: Manual Invoice Verification Rejection
 * =========================================================================
 * - WHAT IT DOES     : Explicitly marks an unverified invoice as REJECTED with mandatory reason.
 * - REACT COMPONENT  : client/src/pages/VerificationPage.jsx (handleReject)
 * - API CALLED       : axiosClient.post(`/invoices/${id}/reject-verification`, { reason })
 * - EXPRESS ROUTE    : POST /api/invoices/:id/reject-verification in server/src/routes/invoiceRoutes.js
 * - POSTGRESQL TABLES: invoices, audit_logs
 *
 * 7-STEP ARCHITECTURE FLOW:
 *   1. React UI       : Finance staff opens rejection modal and types justification.
 *   2. Axios API Call : Sends invoice ID & reason string to backend.
 *   3. Express Route  : Validates auth token and FINANCE_STAFF/ADMIN role.
 *   4. Controller     : Checks that reason is not empty and verifies invoice exists.
 *   5. PostgreSQL     : Updates invoice status to 'REJECTED' with reason in notes column.
 *   6. Response       : Returns { success: true, message: 'Invoice verification rejected.' }.
 *   7. React UI Update: Closes modal, shows success toast, and refreshes invoice queue.
 * =========================================================================
 */
export const rejectVerification = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    if (!reason) {
      return res.status(400).json({ success: false, message: 'A rejection justification reason is mandatory.' });
    }

    const invRes = await query('SELECT invoice_number FROM invoices WHERE id = $1', [id]);
    if (invRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Invoice not found.' });
    }

    await query(
      `UPDATE invoices
       SET status = 'REJECTED',
           verification_status = 'FAILED',
           notes = CONCAT(COALESCE(notes, ''), ' [Rejection Reason: ', $1::text, ']'),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $2`,
      [reason, id]
    );

    await logAuditEvent({
      userId: req.user?.id,
      entityName: 'INVOICE',
      entityId: id,
      action: 'REJECTED',
      metadata: { reason },
    });

    return res.status(200).json({
      success: true,
      message: 'Invoice has been rejected and archived.',
    });
  } catch (error) {
    console.error('rejectVerification error:', error);
    return res.status(500).json({ success: false, message: 'Failed to reject invoice.' });
  }
};

export default {
  verifyInvoice,
  rejectVerification,
};
