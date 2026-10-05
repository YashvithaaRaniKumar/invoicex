import { query } from '../config/db.js';

/**
 * =========================================================================
 * FEATURE: Executive AP Dashboard & Real-Time KPI Aggregation
 * =========================================================================
 * - WHAT IT DOES     : Computes real-time financial metrics across all accounts payable:
 *                      Total Invoices, Pending Verification, Awaiting Approval,
 *                      Approved Unpaid, Overdue Amount, Exception Counts, and "Needs Your Attention" feed.
 * - REACT COMPONENT  : client/src/pages/DashboardPage.jsx (fetchStats)
 * - API CALLED       : axiosClient.get('/dashboard/stats')
 * - EXPRESS ROUTE    : GET /api/dashboard/stats in server/src/routes/dashboardRoutes.js
 * - POSTGRESQL TABLES: invoices, invoice_exceptions, payments, audit_logs
 * =========================================================================
 */
export const getDashboardStats = async (req, res) => {
  try {
    // 1. KPI Counts and Amounts
    const kpiSql = `
      SELECT
        COUNT(*) AS total_invoices,
        COUNT(CASE WHEN status = 'PENDING_VERIFICATION' THEN 1 END) AS pending_verification,
        COUNT(CASE WHEN status = 'VERIFIED' OR (verification_status = 'PASSED' AND approval_status = 'PENDING') THEN 1 END) AS pending_approval,
        COUNT(CASE WHEN status = 'APPROVED' AND payment_status = 'UNPAID' THEN 1 END) AS approved_unpaid,
        COUNT(CASE WHEN due_date < CURRENT_DATE AND payment_status != 'PAID' THEN 1 END) AS overdue_count,
        COALESCE(SUM(CASE WHEN due_date < CURRENT_DATE AND payment_status != 'PAID' THEN total_amount ELSE 0 END), 0) AS overdue_amount,
        COUNT(CASE WHEN due_date >= CURRENT_DATE AND due_date <= CURRENT_DATE + INTERVAL '7 day' AND payment_status != 'PAID' THEN 1 END) AS due_soon_count,
        COALESCE(SUM(CASE WHEN due_date >= CURRENT_DATE AND due_date <= CURRENT_DATE + INTERVAL '7 day' AND payment_status != 'PAID' THEN total_amount ELSE 0 END), 0) AS due_soon_amount,
        COALESCE(SUM(CASE WHEN payment_status != 'PAID' THEN total_amount ELSE 0 END), 0) AS total_payables,
        COALESCE(SUM(CASE WHEN status = 'RECONCILED' OR payment_status = 'PAID' THEN total_amount ELSE 0 END), 0) AS total_reconciled_volume
      FROM invoices
    `;
    const kpiRes = await query(kpiSql);
    const kpi = kpiRes.rows[0];

    // 2. Exception Breakdown
    const excSql = `
      SELECT
        COUNT(*) AS total_open_exceptions,
        COUNT(CASE WHEN severity = 'CRITICAL' THEN 1 END) AS critical_count,
        COUNT(CASE WHEN severity = 'HIGH' THEN 1 END) AS high_count,
        COUNT(CASE WHEN severity = 'MEDIUM' THEN 1 END) AS medium_count,
        COUNT(CASE WHEN status = 'ESCALATED' THEN 1 END) AS escalated_count
      FROM invoice_exceptions
      WHERE status != 'RESOLVED'
    `;
    const excRes = await query(excSql);
    const exceptionsSummary = excRes.rows[0];

    // 3. Prominent "Action Required" Feed
    // Answers: "What needs my attention today?"
    const actionRequired = [];

    // Critical and High exceptions
    const urgentExceptions = await query(
      `SELECT e.id, e.issue_title, e.severity, e.deadline, e.status,
              i.invoice_number, i.total_amount, v.name AS vendor_name,
              'EXCEPTION' AS action_type
       FROM invoice_exceptions e
       JOIN invoices i ON e.invoice_id = i.id
       JOIN vendors v ON i.vendor_id = v.id
       WHERE e.status != 'RESOLVED'
       ORDER BY CASE e.severity WHEN 'CRITICAL' THEN 1 WHEN 'HIGH' THEN 2 ELSE 3 END, e.deadline ASC
       LIMIT 4`
    );

    urgentExceptions.rows.forEach((row) => {
      actionRequired.push({
        id: row.id,
        type: 'EXCEPTION',
        problem: row.issue_title,
        title: row.issue_title,
        severity: row.severity,
        invoice_number: row.invoice_number,
        vendor_name: row.vendor_name,
        total_amount: row.total_amount,
        action_label: 'Resolve',
        subtitle: `Invoice #${row.invoice_number} · ${row.vendor_name} (₹${parseFloat(row.total_amount).toLocaleString('en-IN')})`,
        deadline: row.deadline,
        link: `/exceptions`,
        badgeText: `${row.severity} EXCEPTION`,
        badgeColor: row.severity === 'CRITICAL' ? 'red' : 'amber',
      });
    });

    // Invoices pending verification
    const pendingVerifs = await query(
      `SELECT i.id, i.invoice_number, i.total_amount, i.due_date, v.name AS vendor_name
       FROM invoices i
       JOIN vendors v ON i.vendor_id = v.id
       WHERE i.status = 'PENDING_VERIFICATION'
       ORDER BY i.created_at ASC
       LIMIT 3`
    );

    pendingVerifs.rows.forEach((row) => {
      actionRequired.push({
        id: row.id,
        type: 'VERIFICATION',
        problem: 'Verification needed',
        title: `Verification needed: #${row.invoice_number}`,
        severity: 'MEDIUM',
        invoice_number: row.invoice_number,
        vendor_name: row.vendor_name,
        total_amount: row.total_amount,
        action_label: 'Review',
        subtitle: `${row.vendor_name} · Due ${row.due_date}`,
        deadline: row.due_date,
        link: `/verification`,
        badgeText: 'PENDING VERIFICATION',
        badgeColor: 'blue',
      });
    });

    // Invoices awaiting manager approval
    const pendingApps = await query(
      `SELECT i.id, i.invoice_number, i.total_amount, i.due_date, v.name AS vendor_name
       FROM invoices i
       JOIN vendors v ON i.vendor_id = v.id
       WHERE i.status = 'VERIFIED' OR (i.verification_status = 'PASSED' AND i.approval_status = 'PENDING')
       ORDER BY i.due_date ASC
       LIMIT 3`
    );

    pendingApps.rows.forEach((row) => {
      actionRequired.push({
        id: row.id,
        type: 'APPROVAL',
        problem: 'Awaiting manager approval',
        title: `Sign-off Awaiting: #${row.invoice_number}`,
        severity: 'HIGH',
        invoice_number: row.invoice_number,
        vendor_name: row.vendor_name,
        total_amount: row.total_amount,
        action_label: 'Approve',
        subtitle: `${row.vendor_name} · Total: ₹${parseFloat(row.total_amount).toLocaleString('en-IN')}`,
        deadline: row.due_date,
        link: `/approvals`,
        badgeText: 'AWAITING APPROVAL',
        badgeColor: 'purple',
      });
    });

    // 4. Status Distribution
    const statusDistRes = await query(
      `SELECT status, COUNT(*) AS count, COALESCE(SUM(total_amount), 0) AS total_amount
       FROM invoices
       GROUP BY status`
    );

    // 5. Recent Activity Feed
    const recentActivity = await query(
      `SELECT a.*, u.full_name AS user_name
       FROM audit_logs a
       LEFT JOIN users u ON a.user_id = u.id
       ORDER BY a.created_at DESC
       LIMIT 6`
    );

    return res.status(200).json({
      success: true,
      stats: {
        totalInvoices: parseInt(kpi.total_invoices, 10),
        pendingVerification: parseInt(kpi.pending_verification, 10),
        pendingApproval: parseInt(kpi.pending_approval, 10),
        approvedUnpaid: parseInt(kpi.approved_unpaid, 10),
        overdueCount: parseInt(kpi.overdue_count, 10),
        overdueAmount: parseFloat(kpi.overdue_amount),
        dueSoonCount: parseInt(kpi.due_soon_count, 10),
        dueSoonAmount: parseFloat(kpi.due_soon_amount),
        totalPayables: parseFloat(kpi.total_payables),
        totalReconciledVolume: parseFloat(kpi.total_reconciled_volume),
        openExceptions: parseInt(exceptionsSummary.total_open_exceptions, 10),
        criticalExceptions: parseInt(exceptionsSummary.critical_count, 10),
      },
      actionRequired,
      statusDistribution: statusDistRes.rows,
      recentActivity: recentActivity.rows,
    });
  } catch (error) {
    console.error('getDashboardStats error:', error);
    return res.status(500).json({ success: false, message: 'Failed to retrieve dashboard analytics.' });
  }
};

export default {
  getDashboardStats,
};
