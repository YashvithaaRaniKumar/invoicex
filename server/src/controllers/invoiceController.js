import { query } from '../config/db.js';
import { logAuditEvent, createNotification } from '../middleware/auditLogger.js';

/**
 * =========================================================================
 * FEATURE: Invoice Management & Filtering
 * =========================================================================
 * - WHAT IT DOES     : Retrieves paginated/filtered list of invoices with vendor details,
 *                      status filters, due-date urgency, and full-text search.
 * - REACT COMPONENT  : client/src/pages/InvoiceListPage.jsx (fetchInvoices)
 * - API CALLED       : axiosClient.get('/invoices', { params: { status, search, vendorId } })
 * - EXPRESS ROUTE    : GET /api/invoices in server/src/routes/invoiceRoutes.js
 * - POSTGRESQL TABLES: invoices, vendors, users
 * =========================================================================
 */
export const getInvoices = async (req, res) => {
  try {
    const { status, vendorId, search, dueFilter, verificationStatus } = req.query;

    let sql = `
      SELECT i.*,
             v.name AS vendor_name,
             v.vendor_code,
             v.gstin AS vendor_gstin,
             u.full_name AS creator_name
      FROM invoices i
      JOIN vendors v ON i.vendor_id = v.id
      LEFT JOIN users u ON i.created_by = u.id
    `;
    const params = [];
    const conditions = [];

    if (status) {
      params.push(status);
      conditions.push(`i.status = $${params.length}`);
    }

    if (vendorId) {
      params.push(vendorId);
      conditions.push(`i.vendor_id = $${params.length}`);
    }

    if (verificationStatus) {
      params.push(verificationStatus);
      conditions.push(`i.verification_status = $${params.length}`);
    }

    if (search) {
      params.push(`%${search}%`);
      conditions.push(`(i.invoice_number ILIKE $${params.length} OR v.name ILIKE $${params.length} OR i.po_number ILIKE $${params.length})`);
    }

    if (dueFilter === 'overdue') {
      conditions.push(`i.due_date < CURRENT_DATE AND i.payment_status != 'PAID'`);
    } else if (dueFilter === 'due_soon') {
      conditions.push(`i.due_date >= CURRENT_DATE AND i.due_date <= CURRENT_DATE + INTERVAL '7 day' AND i.payment_status != 'PAID'`);
    }

    if (conditions.length > 0) {
      sql += ' WHERE ' + conditions.join(' AND ');
    }

    sql += ' ORDER BY i.created_at DESC';

    const result = await query(sql, params);

    return res.status(200).json({
      success: true,
      invoices: result.rows,
    });
  } catch (error) {
    console.error('getInvoices error:', error);
    return res.status(500).json({ success: false, message: 'Failed to retrieve invoices.' });
  }
};

/**
 * GET /api/invoices/:id
 * Retrieve 360° invoice dossier with all related records
 */
export const getInvoiceById = async (req, res) => {
  try {
    const { id } = req.params;

    const invSql = `
      SELECT i.*,
             v.name AS vendor_name,
             v.vendor_code,
             v.gstin AS vendor_gstin,
             v.email AS vendor_email,
             v.phone AS vendor_phone,
             v.bank_account_number AS vendor_account,
             v.bank_ifsc AS vendor_ifsc,
             v.bank_name AS vendor_bank,
             v.payment_terms_days,
             u.full_name AS creator_name
      FROM invoices i
      JOIN vendors v ON i.vendor_id = v.id
      LEFT JOIN users u ON i.created_by = u.id
      WHERE i.id = $1
    `;
    const invRes = await query(invSql, [id]);

    if (invRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Invoice not found.' });
    }

    const invoice = invRes.rows[0];

    // Fetch verifications
    const verifRes = await query(
      'SELECT v.*, u.full_name AS verifier_name FROM invoice_verifications v LEFT JOIN users u ON v.verified_by = u.id WHERE v.invoice_id = $1 ORDER BY v.verified_at DESC',
      [id]
    );

    // Fetch exceptions
    const excRes = await query(
      'SELECT e.*, u.full_name AS assignee_name, r.full_name AS resolver_name FROM invoice_exceptions e LEFT JOIN users u ON e.assigned_to = u.id LEFT JOIN users r ON e.resolved_by = r.id WHERE e.invoice_id = $1 ORDER BY e.created_at DESC',
      [id]
    );

    // Fetch approvals
    const appRes = await query(
      'SELECT a.*, u.full_name AS approver_name FROM approvals a LEFT JOIN users u ON a.approver_id = u.id WHERE a.invoice_id = $1 ORDER BY a.decision_date DESC',
      [id]
    );

    // Fetch payment record
    const payRes = await query(
      'SELECT p.*, u.full_name AS scheduler_name FROM payments p LEFT JOIN users u ON p.scheduled_by = u.id WHERE p.invoice_id = $1 ORDER BY p.created_at DESC',
      [id]
    );

    // Fetch reconciliation record
    const recRes = await query(
      'SELECT r.*, u.full_name AS reconciler_name FROM reconciliations r LEFT JOIN users u ON r.reconciled_by = u.id WHERE r.invoice_id = $1',
      [id]
    );

    return res.status(200).json({
      success: true,
      invoice,
      verifications: verifRes.rows,
      exceptions: excRes.rows,
      approvals: appRes.rows,
      payments: payRes.rows,
      reconciliation: recRes.rows[0] || null,
    });
  } catch (error) {
    console.error('getInvoiceById error:', error);
    return res.status(500).json({ success: false, message: 'Failed to retrieve invoice details.' });
  }
};

/**
 * =========================================================================
 * FEATURE: Real-Time Pre-Submission Duplicate Detection
 * =========================================================================
 * - WHAT IT DOES     : Scans database before invoice submission to prevent double entry
 *                      of duplicate invoice numbers or identical amounts for the same vendor.
 * - REACT COMPONENT  : client/src/pages/InvoiceListPage.jsx (checkDuplicateLive)
 * - API CALLED       : axiosClient.post('/invoices/check-duplicate', { vendor_id, invoice_number, total_amount })
 * - EXPRESS ROUTE    : POST /api/invoices/check-duplicate in server/src/routes/invoiceRoutes.js
 * - POSTGRESQL TABLES: invoices, vendors
 * =========================================================================
 */
export const checkDuplicate = async (req, res) => {
  try {
    const { vendor_id, invoice_number, total_amount, exclude_id } = req.body;

    if (!vendor_id || !invoice_number) {
      return res.status(400).json({ success: false, message: 'Vendor and Invoice Number required for check.' });
    }

    let sql = `
      SELECT i.id, i.invoice_number, i.total_amount, i.invoice_date, i.status, v.name AS vendor_name
      FROM invoices i
      JOIN vendors v ON i.vendor_id = v.id
      WHERE i.vendor_id = $1 AND LOWER(i.invoice_number) = LOWER($2)
    `;
    const params = [vendor_id, invoice_number.trim()];

    if (exclude_id) {
      params.push(exclude_id);
      sql += ` AND i.id != $${params.length}`;
    }

    const result = await query(sql, params);

    if (result.rows.length > 0) {
      return res.status(200).json({
        isDuplicate: true,
        matchType: 'EXACT_INVOICE_NUMBER',
        message: `Potential Duplicate: Invoice number '${invoice_number}' already exists for this vendor.`,
        matchingInvoice: result.rows[0],
      });
    }

    // Check same vendor + same amount
    if (total_amount) {
      const amountRes = await query(
        `SELECT i.id, i.invoice_number, i.total_amount, i.invoice_date, i.status, v.name AS vendor_name
         FROM invoices i
         JOIN vendors v ON i.vendor_id = v.id
         WHERE i.vendor_id = $1 AND ABS(i.total_amount - $2) < 0.01`,
        [vendor_id, parseFloat(total_amount)]
      );

      if (amountRes.rows.length > 0) {
        return res.status(200).json({
          isDuplicate: true,
          matchType: 'EXACT_AMOUNT_MATCH',
          message: `Warning: An invoice with the exact same amount (₹${total_amount}) already exists for this vendor (#${amountRes.rows[0].invoice_number}).`,
          matchingInvoice: amountRes.rows[0],
        });
      }
    }

    return res.status(200).json({
      isDuplicate: false,
      message: 'No duplicate detected. Safe to submit.',
    });
  } catch (error) {
    console.error('checkDuplicate error:', error);
    return res.status(500).json({ success: false, message: 'Duplicate detection check failed.' });
  }
};

/**
 * =========================================================================
 * FEATURE: Invoice Creation (Entry into AP Lifecycle)
 * =========================================================================
 * - WHAT IT DOES     : Accepts vendor invoice payload, computes subtotal and 18% GST tax,
 *                      checks for duplicate numbers, and initializes invoice status as 'PENDING_VERIFICATION'.
 * - REACT COMPONENT  : client/src/pages/InvoiceListPage.jsx (handleCreateInvoice)
 * - API CALLED       : axiosClient.post('/invoices', invoiceData)
 * - EXPRESS ROUTE    : POST /api/invoices in server/src/routes/invoiceRoutes.js
 * - POSTGRESQL TABLES: invoices, audit_logs
 *
 * 7-STEP ARCHITECTURE FLOW:
 *   1. React UI       : Finance staff fills modal form (Invoice #, Vendor, Amount, Dates, PO#).
 *   2. Axios API Call : Sends JSON payload to Express backend with Bearer JWT.
 *   3. Express Route  : Authenticates user, checks FINANCE_STAFF or ADMIN role.
 *   4. Controller     : Validates mandatory fields and computes statutory 18% GST if omitted.
 *   5. PostgreSQL     : Inserts new row into 'invoices' table with status 'PENDING_VERIFICATION'.
 *   6. Response       : Returns { success: true, message: 'Invoice created...', invoice }.
 *   7. React UI Update: Closes modal, shows success toast, and refreshes invoice table.
 * =========================================================================
 */
export const createInvoice = async (req, res) => {
  try {
    const {
      invoice_number,
      vendor_id,
      invoice_date,
      due_date,
      amount,
      tax_amount,
      total_amount,
      po_number,
      description,
      notes,
    } = req.body;

    if (!invoice_number || !vendor_id || !invoice_date || !due_date || amount === undefined) {
      return res.status(400).json({
        success: false,
        message: 'Invoice Number, Vendor, Invoice Date, Due Date, and Amount are required.',
      });
    }

    const subtotal = parseFloat(amount);
    const tax = tax_amount !== undefined ? parseFloat(tax_amount) : Math.round(subtotal * 0.18 * 100) / 100;
    const total = total_amount !== undefined ? parseFloat(total_amount) : Math.round((subtotal + tax) * 100) / 100;

    // Check duplicate
    const dupRes = await query(
      'SELECT id FROM invoices WHERE vendor_id = $1 AND LOWER(invoice_number) = LOWER($2)',
      [vendor_id, invoice_number.trim()]
    );

    if (dupRes.rows.length > 0) {
      return res.status(400).json({
        success: false,
        message: `Duplicate Invoice Detected: Invoice number ${invoice_number} already exists for this vendor.`,
      });
    }

    const id = `inv-${Date.now()}`;
    const insertSql = `
      INSERT INTO invoices (
        id, invoice_number, vendor_id, invoice_date, due_date,
        amount, tax_amount, total_amount, po_number, description,
        status, verification_status, approval_status, payment_status,
        created_by, notes
      ) VALUES (
        $1, $2, $3, $4, $5,
        $6, $7, $8, $9, $10,
        'PENDING_VERIFICATION', 'PENDING', 'PENDING', 'UNPAID',
        $11, $12
      ) RETURNING *
    `;

    const result = await query(insertSql, [
      id,
      invoice_number.trim(),
      vendor_id,
      invoice_date,
      due_date,
      subtotal,
      tax,
      total,
      po_number ? po_number.trim() : null,
      description ? description.trim() : null,
      req.user?.id || 'usr-002-finance',
      notes || null,
    ]);

    const newInvoice = result.rows[0];

    // Log audit
    await logAuditEvent({
      userId: req.user?.id,
      entityName: 'INVOICE',
      entityId: id,
      action: 'CREATED',
      metadata: { invoice_number, vendor_id, total_amount: total },
    });

    // Notify Finance Staff
    await createNotification({
      userId: req.user?.id || 'usr-002-finance',
      title: 'New Invoice Submitted',
      message: `Invoice #${invoice_number} for ₹${total.toLocaleString('en-IN')} requires verification.`,
      type: 'INFO',
      linkUrl: `/verification`,
    });

    return res.status(201).json({
      success: true,
      message: 'Invoice created successfully and queued for verification.',
      invoice: newInvoice,
    });
  } catch (error) {
    console.error('createInvoice error:', error);
    return res.status(500).json({ success: false, message: 'Failed to create invoice.' });
  }
};

/**
 * PUT /api/invoices/:id
 * Update invoice fields (e.g., when fixing fields during exception)
 */
export const updateInvoice = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      invoice_number,
      invoice_date,
      due_date,
      amount,
      tax_amount,
      total_amount,
      po_number,
      description,
      notes,
    } = req.body;

    const subtotal = amount !== undefined ? parseFloat(amount) : undefined;
    const tax = tax_amount !== undefined ? parseFloat(tax_amount) : undefined;
    const total = total_amount !== undefined ? parseFloat(total_amount) : undefined;

    const updateSql = `
      UPDATE invoices
      SET invoice_number = COALESCE($1, invoice_number),
          invoice_date = COALESCE($2, invoice_date),
          due_date = COALESCE($3, due_date),
          amount = COALESCE($4, amount),
          tax_amount = COALESCE($5, tax_amount),
          total_amount = COALESCE($6, total_amount),
          po_number = COALESCE($7, po_number),
          description = COALESCE($8, description),
          notes = COALESCE($9, notes),
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $10
      RETURNING *
    `;

    const result = await query(updateSql, [
      invoice_number,
      invoice_date,
      due_date,
      subtotal,
      tax,
      total,
      po_number,
      description,
      notes,
      id,
    ]);

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Invoice not found.' });
    }

    await logAuditEvent({
      userId: req.user?.id,
      entityName: 'INVOICE',
      entityId: id,
      action: 'UPDATED',
      metadata: req.body,
    });

    return res.status(200).json({
      success: true,
      message: 'Invoice updated successfully.',
      invoice: result.rows[0],
    });
  } catch (error) {
    console.error('updateInvoice error:', error);
    return res.status(500).json({ success: false, message: 'Failed to update invoice.' });
  }
};

export default {
  getInvoices,
  getInvoiceById,
  checkDuplicate,
  createInvoice,
  updateInvoice,
};
