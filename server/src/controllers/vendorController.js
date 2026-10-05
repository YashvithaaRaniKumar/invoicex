import { query } from '../config/db.js';
import { logAuditEvent } from '../middleware/auditLogger.js';

/**
 * =========================================================================
 * FEATURE: Vendor Master Directory
 * =========================================================================
 * - WHAT IT DOES     : Returns registered corporate vendors with statutory tax numbers (GSTIN, PAN),
 *                      banking coordinates (IFSC, Account), and aggregated billed totals.
 * - REACT COMPONENT  : client/src/pages/VendorManagementPage.jsx (fetchVendors)
 * - API CALLED       : axiosClient.get('/vendors', { params: { search, active } })
 * - EXPRESS ROUTE    : GET /api/vendors in server/src/routes/vendorRoutes.js
 * - POSTGRESQL TABLES: vendors, invoices
 * =========================================================================
 */
export const getVendors = async (req, res) => {
  try {
    const { search, active } = req.query;
    let sql = 'SELECT * FROM vendors';
    const params = [];

    const conditions = [];
    if (search) {
      params.push(`%${search}%`);
      conditions.push(`(name ILIKE $${params.length} OR vendor_code ILIKE $${params.length} OR gstin ILIKE $${params.length})`);
    }

    if (active !== undefined) {
      params.push(active === 'true');
      conditions.push(`is_active = $${params.length}`);
    }

    if (conditions.length > 0) {
      sql += ' WHERE ' + conditions.join(' AND ');
    }

    sql += ' ORDER BY name ASC';

    const result = await query(sql, params);

    // Aggregate invoice stats per vendor safely
    let statsMap = {};
    try {
      const invStatsRes = await query('SELECT vendor_id, COUNT(id) AS total_invoices, COALESCE(SUM(total_amount), 0) AS total_billed_amount FROM invoices GROUP BY vendor_id');
      for (const row of invStatsRes.rows) {
        statsMap[row.vendor_id] = {
          total_invoices: parseInt(row.total_invoices, 10),
          total_billed_amount: parseFloat(row.total_billed_amount),
        };
      }
    } catch (e) {
      console.warn('Invoice aggregation fallback:', e.message);
    }

    const vendors = result.rows.map((v) => ({
      ...v,
      total_invoices: statsMap[v.id]?.total_invoices || 0,
      total_billed_amount: statsMap[v.id]?.total_billed_amount || 0,
    }));

    return res.status(200).json({
      success: true,
      vendors,
    });
  } catch (error) {
    console.error('getVendors error:', error);
    return res.status(500).json({ success: false, message: 'Failed to retrieve vendors.' });
  }
};

/**
 * GET /api/vendors/:id
 * Retrieve single vendor dossier with related invoices
 */
export const getVendorById = async (req, res) => {
  try {
    const { id } = req.params;

    const vendorRes = await query('SELECT * FROM vendors WHERE id = $1', [id]);
    if (vendorRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Vendor not found.' });
    }

    const invoicesRes = await query(
      'SELECT id, invoice_number, invoice_date, due_date, total_amount, status, payment_status FROM invoices WHERE vendor_id = $1 ORDER BY invoice_date DESC',
      [id]
    );

    return res.status(200).json({
      success: true,
      vendor: vendorRes.rows[0],
      invoices: invoicesRes.rows,
    });
  } catch (error) {
    console.error('getVendorById error:', error);
    return res.status(500).json({ success: false, message: 'Failed to retrieve vendor details.' });
  }
};

/**
 * =========================================================================
 * FEATURE: Vendor Registration & Onboarding
 * =========================================================================
 * - WHAT IT DOES     : Validates unique GSTIN, derives PAN, assigns vendor code (e.g. VND-ABC-123),
 *                      stores banking details (IFSC, Account), and establishes payment terms.
 * - REACT COMPONENT  : client/src/pages/VendorManagementPage.jsx (handleCreateVendor)
 * - API CALLED       : axiosClient.post('/vendors', vendorData)
 * - EXPRESS ROUTE    : POST /api/vendors in server/src/routes/vendorRoutes.js
 * - POSTGRESQL TABLES: vendors, audit_logs
 *
 * 7-STEP ARCHITECTURE FLOW:
 *   1. React UI       : User opens Add Vendor modal, fills vendor name, GSTIN, bank IFSC, and account.
 *   2. Axios API Call : Sends vendor data payload with Bearer JWT token.
 *   3. Express Route  : Authenticates user, verifies FINANCE_STAFF or ADMIN role.
 *   4. Controller     : Checks for duplicate GSTIN in database, generates code prefix.
 *   5. PostgreSQL     : Inserts new vendor record into 'vendors' table.
 *   6. Response       : Returns { success: true, message: 'Vendor registered...', vendor }.
 *   7. React UI Update: Closes modal, displays toast alert, and refreshes vendor directory.
 * =========================================================================
 */
export const createVendor = async (req, res) => {
  try {
    const {
      name,
      email,
      phone,
      gstin,
      pan,
      address,
      bank_account_number,
      bank_ifsc,
      bank_name,
      payment_terms_days = 30,
    } = req.body;

    if (!name || !gstin) {
      return res.status(400).json({
        success: false,
        message: 'Vendor Name and GSTIN are required fields.',
      });
    }

    // Check duplicate GSTIN
    const checkRes = await query('SELECT id FROM vendors WHERE LOWER(gstin) = LOWER($1)', [gstin.trim()]);
    if (checkRes.rows.length > 0) {
      return res.status(400).json({
        success: false,
        message: `Vendor with GSTIN ${gstin} already exists in the system.`,
      });
    }

    const id = `vnd-${Date.now()}`;
    // Auto-generate clean vendor code e.g. VND-ABC-123
    const prefix = name.replace(/[^A-Za-z]/g, '').slice(0, 3).toUpperCase();
    const vendor_code = `VND-${prefix}-${Math.floor(100 + Math.random() * 900)}`;

    const insertSql = `
      INSERT INTO vendors (
        id, vendor_code, name, email, phone, gstin, pan, address,
        bank_account_number, bank_ifsc, bank_name, payment_terms_days, is_active
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, TRUE)
      RETURNING *
    `;

    const result = await query(insertSql, [
      id,
      vendor_code,
      name.trim(),
      email || null,
      phone || null,
      gstin.trim().toUpperCase(),
      pan ? pan.trim().toUpperCase() : gstin.slice(2, 12).toUpperCase(),
      address || null,
      bank_account_number || null,
      bank_ifsc ? bank_ifsc.trim().toUpperCase() : null,
      bank_name || null,
      parseInt(payment_terms_days, 10) || 30,
    ]);

    await logAuditEvent({
      userId: req.user?.id,
      entityName: 'VENDOR',
      entityId: id,
      action: 'CREATED',
      metadata: { name, vendor_code, gstin },
    });

    return res.status(201).json({
      success: true,
      message: 'Vendor registered successfully.',
      vendor: result.rows[0],
    });
  } catch (error) {
    console.error('createVendor error:', error);
    return res.status(500).json({ success: false, message: 'Failed to create vendor record.' });
  }
};

/**
 * PUT /api/vendors/:id
 * Update vendor profile
 */
export const updateVendor = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      name,
      email,
      phone,
      gstin,
      pan,
      address,
      bank_account_number,
      bank_ifsc,
      bank_name,
      payment_terms_days,
      is_active,
    } = req.body;

    const updateSql = `
      UPDATE vendors
      SET name = COALESCE($1, name),
          email = COALESCE($2, email),
          phone = COALESCE($3, phone),
          gstin = COALESCE($4, gstin),
          pan = COALESCE($5, pan),
          address = COALESCE($6, address),
          bank_account_number = COALESCE($7, bank_account_number),
          bank_ifsc = COALESCE($8, bank_ifsc),
          bank_name = COALESCE($9, bank_name),
          payment_terms_days = COALESCE($10, payment_terms_days),
          is_active = COALESCE($11, is_active)
      WHERE id = $12
      RETURNING *
    `;

    const result = await query(updateSql, [
      name,
      email,
      phone,
      gstin,
      pan,
      address,
      bank_account_number,
      bank_ifsc,
      bank_name,
      payment_terms_days,
      is_active,
      id,
    ]);

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Vendor not found.' });
    }

    return res.status(200).json({
      success: true,
      message: 'Vendor updated successfully.',
      vendor: result.rows[0],
    });
  } catch (error) {
    console.error('updateVendor error:', error);
    return res.status(500).json({ success: false, message: 'Failed to update vendor.' });
  }
};

export default {
  getVendors,
  getVendorById,
  createVendor,
  updateVendor,
};
