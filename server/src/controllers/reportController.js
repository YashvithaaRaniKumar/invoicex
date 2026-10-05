import { query } from '../config/db.js';

/**
 * =========================================================================
 * FEATURE: AP Intelligence & Audit Reports
 * =========================================================================
 * - WHAT IT DOES     : Generates enterprise analytics across 4 major dimensions:
 *                      1. Vendor Spend Distribution (Total, Paid, Outstanding)
 *                      2. Aging Schedule Buckets (Current, 1-30, 31-60, 60+ Days Overdue)
 *                      3. Payment Method Distribution (NEFT, RTGS, IMPS, Cheque)
 *                      4. Exception Resolution Turnaround & Severity Analytics
 * - REACT COMPONENT  : client/src/pages/ReportsPage.jsx (fetchReports)
 * - API CALLED       : axiosClient.get('/reports/summary')
 * - EXPRESS ROUTE    : GET /api/reports/summary in server/src/routes/reportRoutes.js
 * - POSTGRESQL TABLES: invoices, vendors, payments, invoice_exceptions
 * =========================================================================
 */
export const getReportSummary = async (req, res) => {
  try {
    // 1. Vendor Spend Distribution
    const vendorSpendSql = `
      SELECT v.name AS vendor_name,
             v.vendor_code,
             COUNT(i.id) AS invoice_count,
             COALESCE(SUM(i.total_amount), 0) AS total_spend,
             COALESCE(SUM(CASE WHEN i.payment_status = 'PAID' THEN i.total_amount ELSE 0 END), 0) AS paid_spend,
             COALESCE(SUM(CASE WHEN i.payment_status != 'PAID' THEN i.total_amount ELSE 0 END), 0) AS outstanding_spend
      FROM vendors v
      LEFT JOIN invoices i ON v.id = i.vendor_id
      GROUP BY v.id, v.name, v.vendor_code
      ORDER BY total_spend DESC
    `;
    const vendorSpend = await query(vendorSpendSql);

    // 2. AP Aging Buckets (Current, 1-30 Days, 31-60 Days, 60+ Days Overdue)
    const agingSql = `
      SELECT
        COUNT(CASE WHEN due_date >= CURRENT_DATE THEN 1 END) AS current_count,
        COALESCE(SUM(CASE WHEN due_date >= CURRENT_DATE THEN total_amount ELSE 0 END), 0) AS current_amount,
        COUNT(CASE WHEN due_date < CURRENT_DATE AND due_date >= CURRENT_DATE - INTERVAL '30 day' THEN 1 END) AS overdue_1_30_count,
        COALESCE(SUM(CASE WHEN due_date < CURRENT_DATE AND due_date >= CURRENT_DATE - INTERVAL '30 day' THEN total_amount ELSE 0 END), 0) AS overdue_1_30_amount,
        COUNT(CASE WHEN due_date < CURRENT_DATE - INTERVAL '30 day' AND due_date >= CURRENT_DATE - INTERVAL '60 day' THEN 1 END) AS overdue_31_60_count,
        COALESCE(SUM(CASE WHEN due_date < CURRENT_DATE - INTERVAL '30 day' AND due_date >= CURRENT_DATE - INTERVAL '60 day' THEN total_amount ELSE 0 END), 0) AS overdue_31_60_amount,
        COUNT(CASE WHEN due_date < CURRENT_DATE - INTERVAL '60 day' THEN 1 END) AS overdue_60_plus_count,
        COALESCE(SUM(CASE WHEN due_date < CURRENT_DATE - INTERVAL '60 day' THEN total_amount ELSE 0 END), 0) AS overdue_60_plus_amount
      FROM invoices
      WHERE payment_status != 'PAID'
    `;
    const aging = await query(agingSql);

    // 3. Payment Method Distribution
    const paymentMethodsSql = `
      SELECT payment_method,
             COUNT(*) AS count,
             COALESCE(SUM(amount_paid), 0) AS total_amount
      FROM payments
      GROUP BY payment_method
      ORDER BY total_amount DESC
    `;
    const paymentMethods = await query(paymentMethodsSql);

    // 4. Exception Resolution Metrics
    const exceptionMetricsSql = `
      SELECT
        COUNT(*) AS total_exceptions,
        COUNT(CASE WHEN status = 'RESOLVED' THEN 1 END) AS resolved_exceptions,
        COUNT(CASE WHEN status != 'RESOLVED' THEN 1 END) AS open_exceptions,
        COUNT(CASE WHEN severity = 'CRITICAL' THEN 1 END) AS critical_count,
        COUNT(CASE WHEN severity = 'HIGH' THEN 1 END) AS high_count,
        COUNT(CASE WHEN severity = 'MEDIUM' THEN 1 END) AS medium_count
      FROM invoice_exceptions
    `;
    const exceptionMetrics = await query(exceptionMetricsSql);

    return res.status(200).json({
      success: true,
      vendorSpend: vendorSpend.rows,
      aging: aging.rows[0],
      paymentMethods: paymentMethods.rows,
      exceptionMetrics: exceptionMetrics.rows[0],
    });
  } catch (error) {
    console.error('getReportSummary error:', error);
    return res.status(500).json({ success: false, message: 'Failed to generate financial reports.' });
  }
};

export default {
  getReportSummary,
};
