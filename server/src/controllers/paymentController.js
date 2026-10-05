import { query } from '../config/db.js';
import { logAuditEvent, createNotification } from '../middleware/auditLogger.js';

/**
 * GET /api/payments
 * Retrieve all payment records with statuses, UTRs, and vendor details
 */
export const getPayments = async (req, res) => {
  try {
    const { status, method } = req.query;

    let sql = `
      SELECT p.*,
             i.invoice_number,
             i.total_amount AS invoice_total,
             i.due_date,
             v.name AS vendor_name,
             v.vendor_code,
             v.bank_account_number,
             v.bank_ifsc,
             v.bank_name,
             u.full_name AS scheduler_name
      FROM payments p
      JOIN invoices i ON p.invoice_id = i.id
      JOIN vendors v ON i.vendor_id = v.id
      LEFT JOIN users u ON p.scheduled_by = u.id
    `;
    const params = [];
    const conditions = [];

    if (status && status !== 'ALL') {
      params.push(status);
      conditions.push(`p.payment_status = $${params.length}`);
    }

    if (method && method !== 'ALL') {
      params.push(method);
      conditions.push(`p.payment_method = $${params.length}`);
    }

    if (conditions.length > 0) {
      sql += ' WHERE ' + conditions.join(' AND ');
    }

    sql += ' ORDER BY p.created_at DESC';

    const result = await query(sql, params);

    return res.status(200).json({
      success: true,
      payments: result.rows,
    });
  } catch (error) {
    console.error('getPayments error:', error);
    return res.status(500).json({ success: false, message: 'Failed to retrieve payments.' });
  }
};

/**
 * GET /api/payments/approved-queue
 * List approved invoices ready for payment scheduling
 */
export const getApprovedQueue = async (req, res) => {
  try {
    const sql = `
      SELECT i.*,
             v.name AS vendor_name,
             v.vendor_code,
             v.bank_account_number,
             v.bank_ifsc,
             v.bank_name,
             v.payment_terms_days
      FROM invoices i
      JOIN vendors v ON i.vendor_id = v.id
      WHERE (i.status = 'APPROVED' OR i.approval_status = 'APPROVED')
        AND (i.payment_status = 'UNPAID' OR i.status = 'APPROVED')
      ORDER BY i.due_date ASC
    `;

    const result = await query(sql);

    return res.status(200).json({
      success: true,
      approvedInvoices: result.rows,
    });
  } catch (error) {
    console.error('getApprovedQueue error:', error);
    return res.status(500).json({ success: false, message: 'Failed to retrieve approved queue.' });
  }
};

/**
 * =========================================================================
 * FEATURE: Payment Scheduling (Cash Outflow Planning)
 * =========================================================================
 * - WHAT IT DOES     : Schedules an approved invoice for disbursement on a future date
 *                      with payment method (NEFT, RTGS, IMPS) and corporate debit account.
 * - REACT COMPONENT  : client/src/pages/PaymentSchedulingPage.jsx (handleScheduleSubmit)
 * - API CALLED       : axiosClient.post('/payments/schedule', { invoice_id, scheduled_date, payment_method, debit_account })
 * - EXPRESS ROUTE    : POST /api/payments/schedule in server/src/routes/paymentRoutes.js
 * - POSTGRESQL TABLES: payments, invoices, audit_logs
 *
 * 7-STEP ARCHITECTURE FLOW:
 *   1. React UI       : Finance staff chooses an approved invoice and clicks "Schedule Payment".
 *   2. Axios API Call : Sends invoice ID, date, method, debit account to Express backend.
 *   3. Express Route  : Authenticates token and checks FINANCE_STAFF or ADMIN role.
 *   4. Controller     : Verifies invoice exists and creates new payment record with status 'SCHEDULED'.
 *   5. PostgreSQL     : Updates invoice status to 'SCHEDULED' and inserts row in 'payments' table.
 *   6. Response       : Returns JSON with scheduled payment record and confirmation message.
 *   7. React UI Update: Closes schedule modal, displays success toast, and refreshes approved queue.
 * =========================================================================
 */
export const schedulePayment = async (req, res) => {
  try {
    const {
      invoice_id,
      scheduled_date,
      payment_method = 'NEFT',
      debit_account = 'HDFC Bank - 50200098765432 (Treasury)',
    } = req.body;

    if (!invoice_id || !scheduled_date) {
      return res.status(400).json({
        success: false,
        message: 'Invoice ID and Scheduled Release Date are required.',
      });
    }

    const invRes = await query('SELECT * FROM invoices WHERE id = $1', [invoice_id]);
    if (invRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Invoice not found.' });
    }

    const inv = invRes.rows[0];

    const paymentId = `pay-${Date.now()}`;
    const insertSql = `
      INSERT INTO payments (
        id, invoice_id, scheduled_by, scheduled_date, amount_paid,
        payment_method, payment_status, debit_account
      ) VALUES ($1, $2, $3, $4, $5, $6, 'SCHEDULED', $7)
      RETURNING *
    `;

    const payResult = await query(insertSql, [
      paymentId,
      invoice_id,
      req.user?.id || 'usr-002-finance',
      scheduled_date,
      inv.total_amount,
      payment_method,
      debit_account,
    ]);

    // Update invoice status to SCHEDULED
    await query(
      `UPDATE invoices
       SET status = 'SCHEDULED',
           payment_status = 'SCHEDULED',
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $1`,
      [invoice_id]
    );

    await logAuditEvent({
      userId: req.user?.id,
      entityName: 'PAYMENT',
      entityId: paymentId,
      action: 'SCHEDULED',
      metadata: { invoice_id, scheduled_date, payment_method, amount: inv.total_amount },
    });

    return res.status(201).json({
      success: true,
      message: `Payment of ₹${parseFloat(inv.total_amount).toLocaleString('en-IN')} scheduled for ${scheduled_date}.`,
      payment: payResult.rows[0],
    });
  } catch (error) {
    console.error('schedulePayment error:', error);
    return res.status(500).json({ success: false, message: 'Failed to schedule payment.' });
  }
};

/**
 * =========================================================================
 * FEATURE: Payment Execution & UTR Generation
 * =========================================================================
 * - WHAT IT DOES     : Simulates real bank execution, generates a unique UTR (Unique Transaction
 *                      Reference), marks invoice and payment as PAID, and creates a 100% matched
 *                      reconciliation record.
 * - REACT COMPONENT  : client/src/pages/PaymentTrackingPage.jsx (handleProcessPayment)
 * - API CALLED       : axiosClient.post(`/payments/${id}/process`)
 * - EXPRESS ROUTE    : POST /api/payments/:id/process in server/src/routes/paymentRoutes.js
 * - POSTGRESQL TABLES: payments, invoices, reconciliations, audit_logs, notifications
 *
 * 7-STEP ARCHITECTURE FLOW:
 *   1. React UI       : Finance staff clicks "Execute Payment" on a scheduled payment item.
 *   2. Axios API Call : Sends payment ID to backend route.
 *   3. Express Route  : Authenticates token and validates authorization.
 *   4. Controller     : Generates realistic Indian banking UTR (e.g., NEFT26XXXXXXXX).
 *   5. PostgreSQL     : Updates 'payments' status to 'PAID', 'invoices' to 'PAID', and inserts row in 'reconciliations'.
 *   6. Response       : Returns { success: true, utr, execution_date, message }.
 *   7. React UI Update: Shows toast with UTR reference and updates payment status badge to 'PAID'.
 * =========================================================================
 */
export const processPayment = async (req, res) => {
  try {
    const { id } = req.params;

    const payRes = await query(
      `SELECT p.*, i.total_amount, i.invoice_number, v.name AS vendor_name
       FROM payments p
       JOIN invoices i ON p.invoice_id = i.id
       JOIN vendors v ON i.vendor_id = v.id
       WHERE p.id = $1`,
      [id]
    );

    if (payRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Payment record not found.' });
    }

    const pay = payRes.rows[0];

    // Generate realistic Indian banking UTR: e.g. HDFCN26258901234
    const prefix = pay.payment_method === 'RTGS' ? 'RTGS' : pay.payment_method === 'IMPS' ? 'IMPS' : 'NEFT';
    const randomDigits = Math.floor(100000000 + Math.random() * 900000000);
    const utr = `${prefix}26${randomDigits}`;

    // Update payment to PAID
    await query(
      `UPDATE payments
       SET payment_status = 'PAID',
           execution_date = CURRENT_DATE,
           utr_reference = $1
       WHERE id = $2`,
      [utr, id]
    );

    // Update invoice to PAID
    await query(
      `UPDATE invoices
       SET status = 'PAID',
           payment_status = 'PAID',
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $1`,
      [pay.invoice_id]
    );

    // Auto-generate matching record in reconciliations table
    const recId = `rec-${Date.now()}`;
    await query(
      `INSERT INTO reconciliations (
        id, invoice_id, payment_id, match_status, invoice_amount,
        payment_amount, discrepancy_amount, discrepancy_reason,
        reconciliation_notes, reconciled_by
      ) VALUES ($1, $2, $3, 'MATCHED', $4, $4, 0.00, 'NONE', 'Disbursement confirmed via banking network. 100% matched.', $5)`,
      [recId, pay.invoice_id, id, pay.total_amount, req.user?.id || 'usr-002-finance']
    );

    await logAuditEvent({
      userId: req.user?.id,
      entityName: 'PAYMENT',
      entityId: id,
      action: 'PAID',
      metadata: { utr, amount: pay.total_amount },
    });

    await createNotification({
      userId: req.user?.id || 'usr-002-finance',
      title: 'Payment Disbursed Successfully',
      message: `Payment of ₹${parseFloat(pay.total_amount).toLocaleString('en-IN')} to ${pay.vendor_name} settled with UTR #${utr}.`,
      type: 'SUCCESS',
      linkUrl: `/payments/track`,
    });

    return res.status(200).json({
      success: true,
      message: `Payment released successfully. UTR Reference: ${utr}`,
      utr,
      execution_date: new Date().toISOString().split('T')[0],
    });
  } catch (error) {
    console.error('processPayment error:', error);
    return res.status(500).json({ success: false, message: 'Failed to process payment execution.' });
  }
};

export default {
  getPayments,
  getApprovedQueue,
  schedulePayment,
  processPayment,
};
