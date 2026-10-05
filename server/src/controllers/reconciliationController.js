import { query } from '../config/db.js';
import { logAuditEvent } from '../middleware/auditLogger.js';

/**
 * =========================================================================
 * FEATURE: Two-Way Payment Reconciliation (Ledger vs Bank Disbursement)
 * =========================================================================
 * - WHAT IT DOES     : Compares invoice claim amounts against actual bank disbursements.
 *                      Identifies matched payments (₹0 variance) and flags discrepancies
 *                      (e.g., TDS statutory deductions, bank transfer charges).
 * - REACT COMPONENT  : client/src/pages/ReconciliationPage.jsx (fetchReconciliations)
 * - API CALLED       : axiosClient.get('/reconciliation', { params: { status } })
 * - EXPRESS ROUTE    : GET /api/reconciliation in server/src/routes/reconciliationRoutes.js
 * - POSTGRESQL TABLES: reconciliations, invoices, vendors, payments, users
 * =========================================================================
 */
export const getReconciliations = async (req, res) => {
  try {
    const { status } = req.query;

    let sql = `
      SELECT r.*,
             i.invoice_number,
             i.invoice_date,
             i.due_date,
             v.name AS vendor_name,
             v.vendor_code,
             p.payment_method,
             p.execution_date,
             p.utr_reference,
             p.debit_account,
             u.full_name AS reconciler_name
      FROM reconciliations r
      JOIN invoices i ON r.invoice_id = i.id
      JOIN vendors v ON i.vendor_id = v.id
      LEFT JOIN payments p ON r.payment_id = p.id
      LEFT JOIN users u ON r.reconciled_by = u.id
    `;
    const params = [];

    if (status && status !== 'ALL') {
      params.push(status);
      sql += ` WHERE r.match_status = $1`;
    }

    sql += ' ORDER BY r.reconciled_at DESC';

    const result = await query(sql, params);

    // Summary calculation
    const countSql = `
      SELECT
        COUNT(*) AS total_count,
        COUNT(CASE WHEN match_status = 'MATCHED' THEN 1 END) AS matched_count,
        COUNT(CASE WHEN match_status = 'MISMATCH' THEN 1 END) AS mismatch_count,
        COUNT(CASE WHEN match_status = 'PARTIAL' THEN 1 END) AS partial_count,
        COALESCE(SUM(payment_amount), 0) AS total_reconciled_volume
      FROM reconciliations
    `;
    const statsRes = await query(countSql);

    return res.status(200).json({
      success: true,
      reconciliations: result.rows,
      stats: statsRes.rows[0],
    });
  } catch (error) {
    console.error('getReconciliations error:', error);
    return res.status(500).json({ success: false, message: 'Failed to retrieve reconciliation data.' });
  }
};

/**
 * =========================================================================
 * FEATURE: Settle & Match Reconciliation Discrepancy
 * =========================================================================
 * - WHAT IT DOES     : Allows an AP accountant to resolve an amount difference
 *                      (such as a 10% TDS deduction or 0.1% bank fee) with an audit note.
 * - REACT COMPONENT  : client/src/pages/ReconciliationPage.jsx (handleSettle)
 * - API CALLED       : axiosClient.post('/reconciliation/match', { reconciliation_id, match_status, discrepancy_reason, reconciliation_notes })
 * - EXPRESS ROUTE    : POST /api/reconciliation/match in server/src/routes/reconciliationRoutes.js
 * - POSTGRESQL TABLES: reconciliations, invoices, audit_logs
 *
 * 7-STEP ARCHITECTURE FLOW:
 *   1. React UI       : User opens Settle Discrepancy modal, selects reason (e.g., TDS_DEDUCTION).
 *   2. Axios API Call : Sends reconciliation ID and audit justification.
 *   3. Express Route  : Authenticates token and verifies FINANCE_STAFF/ADMIN permission.
 *   4. Controller     : Updates 'reconciliations' table with match_status, reason, and auditor ID.
 *   5. PostgreSQL     : Updates invoice status to 'RECONCILED' and commits audit log.
 *   6. Response       : Returns { success: true, message: 'Reconciliation record updated...', reconciliation }.
 *   7. React UI Update: Closes modal, notifies user with toast, and refreshes reconciliation list and KPI cards.
 * =========================================================================
 */
export const matchReconciliation = async (req, res) => {
  try {
    const {
      reconciliation_id,
      match_status = 'MATCHED',
      discrepancy_reason = 'NONE',
      reconciliation_notes,
    } = req.body;

    if (!reconciliation_id) {
      return res.status(400).json({ success: false, message: 'Reconciliation ID is required.' });
    }

    const updateSql = `
      UPDATE reconciliations
      SET match_status = $1,
          discrepancy_reason = $2,
          reconciliation_notes = $3,
          reconciled_by = $4,
          reconciled_at = CURRENT_TIMESTAMP
      WHERE id = $5
      RETURNING *
    `;

    const result = await query(updateSql, [
      match_status,
      discrepancy_reason,
      reconciliation_notes || 'Reconciled by AP Auditor.',
      req.user?.id || 'usr-002-finance',
      reconciliation_id,
    ]);

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Reconciliation record not found.' });
    }

    const updated = result.rows[0];

    // If marked MATCHED, also update invoice status to RECONCILED
    if (match_status === 'MATCHED') {
      await query(
        `UPDATE invoices SET status = 'RECONCILED', updated_at = CURRENT_TIMESTAMP WHERE id = $1`,
        [updated.invoice_id]
      );
    }

    await logAuditEvent({
      userId: req.user?.id,
      entityName: 'RECONCILIATION',
      entityId: reconciliation_id,
      action: 'MATCH_SETTLED',
      metadata: { match_status, discrepancy_reason, notes: reconciliation_notes },
    });

    return res.status(200).json({
      success: true,
      message: 'Reconciliation status and justification recorded successfully.',
      reconciliation: updated,
    });
  } catch (error) {
    console.error('matchReconciliation error:', error);
    return res.status(500).json({ success: false, message: 'Failed to update reconciliation.' });
  }
};

export default {
  getReconciliations,
  matchReconciliation,
};
