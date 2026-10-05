import React, { useEffect, useState } from 'react';
import axiosClient from '../api/axiosClient';
import PageHeader from '../components/common/PageHeader';
import Badge from '../components/common/Badge';
import Modal from '../components/common/Modal';
import Drawer from '../components/common/Drawer';
import EmptyState from '../components/common/EmptyState';
import { formatINR } from '../utils/currency';
import { formatDate } from '../utils/date';
import { useNotifications } from '../context/NotificationContext';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import {
  UserCheck,
  CheckCircle2,
  XCircle,
  ShieldAlert,
  ArrowRight,
  Eye,
  Check,
  X,
  RotateCcw,
} from 'lucide-react';

export const ApprovalCenterPage = () => {
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [actionModal, setActionModal] = useState({
    isOpen: false,
    invoice: null,
    action: 'APPROVE', // APPROVE | REJECT | CORRECTION
    comments: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const { user } = useAuth();
  const { addToast } = useNotifications();
  const navigate = useNavigate();

  const fetchPending = () => {
    setLoading(true);
    axiosClient
      .get('/approvals/pending')
      .then((res) => setInvoices(res.pendingApprovals || []))
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchPending();
  }, []);

  // =========================================================================
  // STEP-BY-STEP ARCHITECTURE FLOW:
  // 1. Approver selects decision (Approve / Reject / Correction) and confirms.
  // 2. React sends Axios POST to `/approvals/${invoice.id}/${action}` with comments.
  // 3. Express route verifies token and checks APPROVER / ADMIN role.
  // 4. Controller checks for open exceptions; records approval decision.
  // 5. PostgreSQL updates 'invoices' status and inserts row in 'approvals' table.
  // 6. Backend returns JSON response and notifies Finance staff.
  // 7. React updates UI: closes modal, shows toast, and refreshes pending approvals.
  // =========================================================================
  const handleActionSubmit = async (e) => {
    e.preventDefault();
    const { invoice, action, comments } = actionModal;
    if (!invoice) return;

    setSubmitting(true);
    try {
      let endpoint = `/approvals/${invoice.id}/approve`;
      if (action === 'REJECT') endpoint = `/approvals/${invoice.id}/reject`;
      if (action === 'CORRECTION') endpoint = `/approvals/${invoice.id}/request-correction`;

      const res = await axiosClient.post(endpoint, { comments });
      addToast(res.message, action === 'APPROVE' ? 'success' : 'warning');
      setActionModal({ isOpen: false, invoice: null, action: 'APPROVE', comments: '' });
      setSelectedInvoice(null);
      fetchPending();
    } catch (err) {
      addToast(err.message, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const isApprover = user?.role === 'APPROVER' || user?.role === 'ADMIN';

  return (
    <div className="space-y-6">
      {/* Standardized Page Header */}
      <PageHeader
        eyebrow="Accounts Payable"
        title="Approvals"
        description="Review verified invoices and grant managerial payment authorization."
      />

      {/* Role Permissions Notice */}
      {!isApprover && (
        <div className="p-3.5 rounded-xl bg-purple-50/70 border border-purple-200 text-purple-900 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-purple-600 flex-shrink-0" />
            <span>
              Role permissions active: Logged in as <strong>{user?.role?.replace('_', ' ')}</strong>. Sign-off actions are restricted to <strong>Approver</strong> or <strong>Admin</strong>.
            </span>
          </div>
          <span className="text-[11px] text-purple-700 font-bold hidden sm:inline">
            Switch active role via profile menu
          </span>
        </div>
      )}

      {/* Clean Approvals Table */}
      <div className="bg-white rounded-xl border border-slate-200/90 shadow-sm overflow-hidden">
        <div className="px-5 py-3.5 border-b border-slate-100 flex items-center justify-between bg-slate-50/60">
          <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
            Pending Approvals ({invoices.length})
          </span>
          <span className="text-[11px] text-slate-400">Verified & Ready</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/70 border-b border-slate-200 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                <th className="py-3 px-4">Invoice</th>
                <th className="py-3 px-4">Vendor</th>
                <th className="py-3 px-4 text-right">Amount</th>
                <th className="py-3 px-4">Verification</th>
                <th className="py-3 px-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {loading ? (
                <tr>
                  <td colSpan="5" className="py-12 text-center text-slate-400 animate-pulse">
                    Loading pending approvals...
                  </td>
                </tr>
              ) : invoices.length === 0 ? (
                <tr>
                  <td colSpan="5" className="py-8">
                    <EmptyState
                      icon={CheckCircle2}
                      title="No Invoices Pending Approval"
                      description="All verified claims have been signed off or queued for payment scheduling."
                    />
                  </td>
                </tr>
              ) : (
                invoices.map((inv) => (
                  <tr
                    key={inv.id}
                    onClick={() => setSelectedInvoice(inv)}
                    className="hover:bg-slate-50/80 transition cursor-pointer"
                  >
                    <td className="py-3.5 px-4">
                      <div className="font-mono font-bold text-slate-900">
                        #{inv.invoice_number}
                      </div>
                      <div className="text-[10px] text-slate-400 font-mono">
                        {inv.po_number ? `PO: ${inv.po_number}` : 'No PO'}
                      </div>
                    </td>

                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-slate-900">{inv.vendor_name}</div>
                      <div className="text-[10px] text-slate-400 font-mono">{inv.vendor_gstin}</div>
                    </td>

                    <td className="py-3.5 px-4 text-right font-mono font-bold text-slate-900">
                      {formatINR(inv.total_amount)}
                    </td>

                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-1.5 text-emerald-700 font-semibold">
                        <Check className="w-3.5 h-3.5" />
                        <span>{inv.verification_outcome || 'Verified'}</span>
                      </div>
                      <div className="text-[10px] text-slate-400 truncate max-w-xs">
                        {inv.verification_notes || 'All checks passed'}
                      </div>
                    </td>

                    <td className="py-3.5 px-4 text-center" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          onClick={() => setSelectedInvoice(inv)}
                          className="px-2.5 py-1 text-xs font-semibold rounded-md bg-slate-100 text-slate-700 hover:bg-slate-200 transition"
                        >
                          View
                        </button>

                        <button
                          onClick={() => {
                            if (!isApprover) {
                              addToast('Access denied: Only Approvers/Managers can sign off.', 'error');
                              return;
                            }
                            setActionModal({
                              isOpen: true,
                              invoice: inv,
                              action: 'APPROVE',
                              comments: 'Approved for payment release.',
                            });
                          }}
                          className={`px-2.5 py-1 text-xs font-semibold rounded-md transition ${
                            isApprover
                              ? 'bg-purple-50 text-purple-700 hover:bg-purple-600 hover:text-white'
                              : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                          }`}
                          title={!isApprover ? 'Restricted to Approvers' : 'Approve invoice'}
                        >
                          Approve
                        </button>

                        <button
                          onClick={() => {
                            if (!isApprover) {
                              addToast('Access denied: Only Approvers/Managers can reject.', 'error');
                              return;
                            }
                            setActionModal({
                              isOpen: true,
                              invoice: inv,
                              action: 'REJECT',
                              comments: '',
                            });
                          }}
                          className={`px-2.5 py-1 text-xs font-semibold rounded-md transition ${
                            isApprover
                              ? 'bg-rose-50 text-rose-700 hover:bg-rose-600 hover:text-white'
                              : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                          }`}
                          title={!isApprover ? 'Restricted to Approvers' : 'Reject invoice'}
                        >
                          Reject
                        </button>

                        <button
                          onClick={() => {
                            if (!isApprover) {
                              addToast('Access denied: Only Approvers/Managers can request correction.', 'error');
                              return;
                            }
                            setActionModal({
                              isOpen: true,
                              invoice: inv,
                              action: 'CORRECTION',
                              comments: '',
                            });
                          }}
                          className={`px-2.5 py-1 text-xs font-semibold rounded-md transition ${
                            isApprover
                              ? 'bg-amber-50 text-amber-700 hover:bg-amber-600 hover:text-white'
                              : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                          }`}
                          title={!isApprover ? 'Restricted to Approvers' : 'Request correction'}
                        >
                          Request Correction
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Slide-over Inspection Drawer */}
      <Drawer
        isOpen={Boolean(selectedInvoice)}
        onClose={() => setSelectedInvoice(null)}
        title={`Approval Dossier: #${selectedInvoice?.invoice_number}`}
        subtitle={selectedInvoice?.vendor_name}
        badge={selectedInvoice && <Badge status={selectedInvoice.status} size="xs" />}
        footer={
          selectedInvoice && (
            <div className="flex items-center justify-between w-full">
              <button
                onClick={() => setSelectedInvoice(null)}
                className="px-3 py-1.5 text-xs font-medium text-slate-600"
              >
                Close
              </button>

              {isApprover && (
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      setActionModal({
                        isOpen: true,
                        invoice: selectedInvoice,
                        action: 'REJECT',
                        comments: '',
                      });
                    }}
                    className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-rose-200 text-rose-700 hover:bg-rose-50"
                  >
                    Reject
                  </button>
                  <button
                    onClick={() => {
                      setActionModal({
                        isOpen: true,
                        invoice: selectedInvoice,
                        action: 'APPROVE',
                        comments: 'Budget authorized. Approved for payment release.',
                      });
                    }}
                    className="px-4 py-1.5 text-xs font-semibold rounded-lg bg-purple-600 text-white hover:bg-purple-700 shadow-xs flex items-center gap-1.5"
                  >
                    <UserCheck className="w-3.5 h-3.5" />
                    Approve Invoice
                  </button>
                </div>
              )}
            </div>
          )
        }
      >
        {selectedInvoice && (
          <div className="space-y-5 text-xs">
            {/* Amount Breakdown */}
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2">
              <div className="flex justify-between text-slate-500">
                <span>Taxable Subtotal:</span>
                <span className="font-mono font-semibold text-slate-800">{formatINR(selectedInvoice.amount)}</span>
              </div>
              <div className="flex justify-between text-slate-500">
                <span>GST (18%):</span>
                <span className="font-mono font-semibold text-slate-800">{formatINR(selectedInvoice.tax_amount)}</span>
              </div>
              <div className="flex justify-between text-sm font-bold text-slate-900 border-t border-slate-200 pt-2">
                <span>Total Amount:</span>
                <span className="font-mono text-purple-700">{formatINR(selectedInvoice.total_amount)}</span>
              </div>
            </div>

            {/* Verification Sign-off */}
            <div className="p-3.5 rounded-lg border border-emerald-200 bg-emerald-50/50 space-y-1">
              <div className="flex items-center gap-2 font-bold text-emerald-900">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                Statutory Rule Verification Cleared
              </div>
              <p className="text-emerald-800 font-medium text-xs mt-1">
                {selectedInvoice.verification_notes || 'All checks passed'}
              </p>
              <p className="text-[10px] text-emerald-600 pt-1">
                Verified at: {formatDate(selectedInvoice.verified_at)}
              </p>
            </div>

            {/* Commercial Details */}
            <div className="p-3.5 rounded-lg border border-slate-200 bg-white space-y-2">
              <div className="flex justify-between">
                <span className="text-slate-500">Vendor GSTIN:</span>
                <span className="font-mono font-semibold text-slate-800">{selectedInvoice.vendor_gstin}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">PO Reference:</span>
                <span className="font-mono font-semibold text-slate-800">{selectedInvoice.po_number || 'N/A'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Disbursement Bank:</span>
                <span className="text-slate-800 font-semibold">{selectedInvoice.vendor_bank || 'HDFC Bank'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Payment Due Date:</span>
                <span className="text-slate-800 font-semibold">{formatDate(selectedInvoice.due_date)}</span>
              </div>
            </div>

            {selectedInvoice.description && (
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Description</span>
                <p className="p-3 rounded-lg bg-slate-50 text-slate-700 leading-relaxed border border-slate-200">
                  {selectedInvoice.description}
                </p>
              </div>
            )}
          </div>
        )}
      </Drawer>

      {/* Decision Modal */}
      <Modal
        isOpen={actionModal.isOpen}
        onClose={() => setActionModal({ isOpen: false, invoice: null, action: 'APPROVE', comments: '' })}
        title={
          actionModal.action === 'APPROVE'
            ? 'Manager Approval Sign-Off'
            : actionModal.action === 'REJECT'
            ? 'Reject Invoice Claim'
            : 'Request Finance Correction'
        }
        subtitle={`Invoice #${actionModal.invoice?.invoice_number} · ${formatINR(actionModal.invoice?.total_amount || 0)}`}
      >
        <form onSubmit={handleActionSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
              {actionModal.action === 'APPROVE' ? 'Manager Comments' : 'Mandatory Justification *'}
            </label>
            <textarea
              rows="3"
              required={actionModal.action !== 'APPROVE'}
              placeholder={
                actionModal.action === 'APPROVE'
                  ? 'e.g. Budget code IT-OPEX verified. Authorized for disbursement.'
                  : 'e.g. Billed hours exceed purchase contract terms. Request revised invoice.'
              }
              value={actionModal.comments}
              onChange={(e) => setActionModal({ ...actionModal, comments: e.target.value })}
              className="mt-1 block w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setActionModal({ isOpen: false, invoice: null, action: 'APPROVE', comments: '' })}
              className="px-4 py-2 text-xs font-medium text-slate-600"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className={`px-4 py-2 text-xs font-semibold rounded-lg text-white shadow-sm disabled:opacity-50 transition ${
                actionModal.action === 'APPROVE'
                  ? 'bg-purple-600 hover:bg-purple-700'
                  : actionModal.action === 'REJECT'
                  ? 'bg-rose-600 hover:bg-rose-700'
                  : 'bg-amber-600 hover:bg-amber-700'
              }`}
            >
              {submitting ? 'Recording Decision...' : 'Confirm Decision'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default ApprovalCenterPage;
