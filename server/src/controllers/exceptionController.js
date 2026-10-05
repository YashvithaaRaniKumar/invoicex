import { query } from '../config/db.js';
import { logAuditEvent, createNotification } from '../middleware/auditLogger.js';

/**
 * =========================================================================
 * FEATURE: AP Exception Center & Diagnostics
 * =========================================================================
 * - WHAT IT DOES     : Returns all blocked invoice exceptions with 5-point diagnosis
 *                      (Issue Title, Root Cause Description, Severity, Required Action, Deadline).
 * - REACT COMPONENT  : client/src/pages/ExceptionCenterPage.jsx (fetchExceptions)
 * - API CALLED       : axiosClient.get('/exceptions', { params: { status, severity } })
 * - EXPRESS ROUTE    : GET /api/exceptions in server/src/routes/exceptionRoutes.js
 * - POSTGRESQL TABLES: invoice_exceptions, invoices, vendors, users
 * =========================================================================
 */
export const getExceptions = async (req, res) => {
  try {
    const { status, severity, assignedTo, search } = req.query;

    let sql = `
      SELECT e.*,
             i.invoice_number,
             i.total_amount,
             i.invoice_date,
             i.due_date,
             v.name AS vendor_name,
             v.vendor_code,
             u.full_name AS assignee_name,
             u.email AS assignee_email,
             r.full_name AS resolver_name
      FROM invoice_exceptions e
      JOIN invoices i ON e.invoice_id = i.id
      JOIN vendors v ON i.vendor_id = v.id
      LEFT JOIN users u ON e.assigned_to = u.id
      LEFT JOIN users r ON e.resolved_by = r.id
    `;
    const params = [];
    const conditions = [];

    if (status && status !== 'ALL') {
      params.push(status);
      conditions.push(`e.status = $${params.length}`);
    }

    if (severity && severity !== 'ALL') {
      params.push(severity);
      conditions.push(`e.severity = $${params.length}`);
    }

    if (assignedTo) {
      params.push(assignedTo);
      conditions.push(`e.assigned_to = $${params.length}`);
    }

    if (search) {
      params.push(`%${search}%`);
      conditions.push(`(e.issue_title ILIKE $${params.length} OR i.invoice_number ILIKE $${params.length} OR v.name ILIKE $${params.length})`);
    }

    if (conditions.length > 0) {
      sql += ' WHERE ' + conditions.join(' AND ');
    }

    sql += ' ORDER BY CASE e.severity WHEN \'CRITICAL\' THEN 1 WHEN \'HIGH\' THEN 2 ELSE 3 END, e.created_at DESC';

    const result = await query(sql, params);

    return res.status(200).json({
      success: true,
      exceptions: result.rows,
    });
  } catch (error) {
    console.error('getExceptions error:', error);
    return res.status(500).json({ success: false, message: 'Failed to retrieve invoice exceptions.' });
  }
};

/**
 * GET /api/exceptions/:id
 * Retrieve specific exception diagnosis and resolution log
 */
export const getExceptionById = async (req, res) => {
  try {
    const { id } = req.params;

    const sql = `
      SELECT e.*,
             i.invoice_number,
             i.total_amount,
             i.amount,
             i.tax_amount,
             i.po_number,
             i.status AS invoice_status,
             v.name AS vendor_name,
             v.gstin AS vendor_gstin,
             v.email AS vendor_email,
             v.phone AS vendor_phone,
             u.full_name AS assignee_name,
             r.full_name AS resolver_name
      FROM invoice_exceptions e
      JOIN invoices i ON e.invoice_id = i.id
      JOIN vendors v ON i.vendor_id = v.id
      LEFT JOIN users u ON e.assigned_to = u.id
      LEFT JOIN users r ON e.resolved_by = r.id
      WHERE e.id = $1
    `;

    const result = await query(sql, [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Exception record not found.' });
    }

    return res.status(200).json({
      success: true,
      exception: result.rows[0],
    });
  } catch (error) {
    console.error('getExceptionById error:', error);
    return res.status(500).json({ success: false, message: 'Failed to retrieve exception details.' });
  }
};

/**
 * POST /api/exceptions/:id/assign
 * Reassign exception to another team member
 */
export const assignException = async (req, res) => {
  try {
    const { id } = req.params;
    const { assigned_to, note } = req.body;

    if (!assigned_to) {
      return res.status(400).json({ success: false, message: 'Assignee user ID is required.' });
    }

    const updateSql = `
      UPDATE invoice_exceptions
      SET assigned_to = $1,
          resolution_notes = CONCAT(COALESCE(resolution_notes, ''), ' [Reassigned: ', $2::text, ']')
      WHERE id = $3
      RETURNING *
    `;

    const result = await query(updateSql, [assigned_to, note || 'Assigned to new owner', id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Exception not found.' });
    }

    await logAuditEvent({
      userId: req.user?.id,
      entityName: 'EXCEPTION',
      entityId: id,
      action: 'ASSIGNED',
      metadata: { assigned_to, note },
    });

    await createNotification({
      userId: assigned_to,
      title: 'Exception Assigned to You',
      message: `You have been assigned to resolve exception on invoice (${result.rows[0].issue_title}).`,
      type: 'WARNING',
      linkUrl: `/exceptions`,
    });

    return res.status(200).json({
      success: true,
      message: 'Exception successfully assigned.',
      exception: result.rows[0],
    });
  } catch (error) {
    console.error('assignException error:', error);
    return res.status(500).json({ success: false, message: 'Failed to assign exception.' });
  }
};

/**
 * PUT /api/exceptions/:id/status
 * Update status (e.g., ACTION_REQUIRED -> UNDER_REVIEW -> ESCALATED)
 */
export const updateExceptionStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, note } = req.body;

    if (!['ACTION_REQUIRED', 'UNDER_REVIEW', 'ESCALATED'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid status transition.' });
    }

    const updateSql = `
      UPDATE invoice_exceptions
      SET status = $1,
          resolution_notes = CONCAT(COALESCE(resolution_notes, ''), ' [Status update to ', $1::text, ': ', $2::text, ']')
      WHERE id = $3
      RETURNING *
    `;

    const result = await query(updateSql, [status, note || 'Status updated', id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Exception not found.' });
    }

    await logAuditEvent({
      userId: req.user?.id,
      entityName: 'EXCEPTION',
      entityId: id,
      action: 'STATUS_CHANGED',
      metadata: { status, note },
    });

    return res.status(200).json({
      success: true,
      message: `Exception status updated to ${status}.`,
      exception: result.rows[0],
    });
  } catch (error) {
    console.error('updateExceptionStatus error:', error);
    return res.status(500).json({ success: false, message: 'Failed to update exception status.' });
  }
};

/**
 * =========================================================================
 * FEATURE: Resolve Invoice Exception & Unblock Payable
 * =========================================================================
 * - WHAT IT DOES     : Marks an exception as RESOLVED with mandatory resolution notes.
 *                      If all exceptions on the invoice are cleared, automatically transitions
 *                      the invoice status from 'EXCEPTION' back to 'PENDING_VERIFICATION'.
 * - REACT COMPONENT  : client/src/pages/ExceptionCenterPage.jsx (handleResolve)
 * - API CALLED       : axiosClient.post(`/exceptions/${id}/resolve`, { resolution_notes })
 * - EXPRESS ROUTE    : POST /api/exceptions/:id/resolve in server/src/routes/exceptionRoutes.js
 * - POSTGRESQL TABLES: invoice_exceptions, invoices, audit_logs
 *
 * 7-STEP ARCHITECTURE FLOW:
 *   1. React UI       : Finance staff enters how the issue was rectified and clicks "Confirm Resolution".
 *   2. Axios API Call : Sends exception ID and resolution text to backend.
 *   3. Express Route  : Authenticates token and verifies role (FINANCE_STAFF or ADMIN).
 *   4. Controller     : Updates exception record status to 'RESOLVED' and checks for remaining open issues.
 *   5. PostgreSQL     : If 0 exceptions left, updates invoice status back to 'PENDING_VERIFICATION'.
 *   6. Response       : Returns { success: true, message: 'Exception resolved...', allExceptionsCleared: true/false }.
 *   7. React UI Update: Closes modal, shows success toast, and refreshes exception queue.
 * =========================================================================
 */
export const resolveException = async (req, res) => {
  try {
    const { id } = req.params;
    const { resolution_notes } = req.body;

    if (!resolution_notes || resolution_notes.trim().length < 5) {
      return res.status(400).json({
        success: false,
        message: 'A clear resolution note explaining how the issue was fixed is required.',
      });
    }

    // Update exception
    const excSql = `
      UPDATE invoice_exceptions
      SET status = 'RESOLVED',
          resolution_notes = CONCAT(COALESCE(resolution_notes, ''), ' [Resolved: ', $1::text, ']'),
          resolved_by = $2,
          resolved_at = CURRENT_TIMESTAMP
      WHERE id = $3
      RETURNING *
    `;

    const excRes = await query(excSql, [resolution_notes.trim(), req.user?.id || 'usr-002-finance', id]);
    if (excRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Exception not found.' });
    }

    const exception = excRes.rows[0];

    // Check if any other unresolved exceptions remain on this invoice
    const remainingRes = await query(
      `SELECT COUNT(*) AS count FROM invoice_exceptions
       WHERE invoice_id = $1 AND status != 'RESOLVED'`,
      [exception.invoice_id]
    );

    const remainingCount = parseInt(remainingRes.rows[0].count, 10);

    // If zero remaining exceptions, return invoice to PENDING_VERIFICATION for re-verification
    if (remainingCount === 0) {
      await query(
        `UPDATE invoices
         SET status = 'PENDING_VERIFICATION',
             verification_status = 'PENDING',
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $1`,
        [exception.invoice_id]
      );
    }

    await logAuditEvent({
      userId: req.user?.id,
      entityName: 'EXCEPTION',
      entityId: id,
      action: 'RESOLVED',
      metadata: { resolution_notes, unblocked: remainingCount === 0 },
    });

    return res.status(200).json({
      success: true,
      message: 'Exception resolved successfully. Invoice unblocked for re-verification.',
      exception,
      allExceptionsCleared: remainingCount === 0,
    });
  } catch (error) {
    console.error('resolveException error:', error);
    return res.status(500).json({ success: false, message: 'Failed to resolve exception.' });
  }
};

/**
 * POST /api/exceptions/:id/reopen
 * Reopens a resolved exception with reason
 */
export const reopenException = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    const reopenSql = `
      UPDATE invoice_exceptions
      SET status = 'ACTION_REQUIRED',
          resolution_notes = CONCAT(COALESCE(resolution_notes, ''), ' [Reopened: ', $1::text, ']'),
          resolved_by = NULL,
          resolved_at = NULL
      WHERE id = $2
      RETURNING *
    `;

    const result = await query(reopenSql, [reason || 'Reopened for additional review', id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Exception not found.' });
    }

    // Set invoice back to EXCEPTION
    await query(
      `UPDATE invoices SET status = 'EXCEPTION', verification_status = 'FAILED' WHERE id = $1`,
      [result.rows[0].invoice_id]
    );

    await logAuditEvent({
      userId: req.user?.id,
      entityName: 'EXCEPTION',
      entityId: id,
      action: 'REOPENED',
      metadata: { reason },
    });

    return res.status(200).json({
      success: true,
      message: 'Exception reopened and invoice placed back on hold.',
      exception: result.rows[0],
    });
  } catch (error) {
    console.error('reopenException error:', error);
    return res.status(500).json({ success: false, message: 'Failed to reopen exception.' });
  }
};

export default {
  getExceptions,
  getExceptionById,
  assignException,
  updateExceptionStatus,
  resolveException,
  reopenException,
};
