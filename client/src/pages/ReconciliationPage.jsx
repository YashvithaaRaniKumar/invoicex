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
import { useNavigate } from 'react-router-dom';
import {
  Scale,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  ExternalLink,
  Eye,
  Check,
  X,
} from 'lucide-react';

export const ReconciliationPage = () => {
  const [reconciliations, setReconciliations] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [selectedPair, setSelectedPair] = useState(null);
  const [settleModal, setSettleModal] = useState({
    isOpen: false,
    item: null,
    match_status: 'MATCHED',
    discrepancy_reason: 'TDS_DEDUCTION',
    reconciliation_notes: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const { addToast } = useNotifications();
  const navigate = useNavigate();

  const fetchReconciliations = () => {
    setLoading(true);
    const params = {};
    if (statusFilter !== 'ALL') params.status = statusFilter;

    axiosClient
      .get('/reconciliation', { params })
      .then((res) => {
        setReconciliations(res.reconciliations || []);
        setStats(res.stats || null);
      })
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchReconciliations();
  }, [statusFilter]);

  // =========================================================================
  // STEP-BY-STEP ARCHITECTURE FLOW:
  // 1. Accountant opens Settle Discrepancy modal and selects reason (e.g. TDS_DEDUCTION).
  // 2. React sends Axios POST to `/reconciliation/match` with resolution payload.
  // 3. Express router forwards request to reconciliationController.matchReconciliation.
  // 4. Controller validates reconciliation ID and updates match status.
  // 5. PostgreSQL updates 'reconciliations' table and transitions invoice to 'RECONCILED'.
  // 6. Backend returns JSON response with updated reconciliation record.
  // 7. React updates UI: closes modal, shows success toast, and refreshes reconciliation list and KPIs.
  // =========================================================================
  const handleSettle = async (e) => {
    e.preventDefault();
    if (!settleModal.item) return;

    setSubmitting(true);
    try {
      const res = await axiosClient.post('/reconciliation/match', {
        reconciliation_id: settleModal.item.id,
        match_status: settleModal.match_status,
        discrepancy_reason: settleModal.discrepancy_reason,
        reconciliation_notes: settleModal.reconciliation_notes,
      });

      addToast(res.message, 'success');
      setSettleModal({ ...settleModal, isOpen: false, item: null });
      setSelectedPair(null);
      fetchReconciliations();
    } catch (err) {
      addToast(err.message, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Standardized Page Header */}
      <PageHeader
        eyebrow="Accounts Payable"
        title="Reconciliation"
        description="Two-way matching of invoices with bank records and ledger settlement."
      />

      {/* Top 4 KPIs as per Prompt */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200/90 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] text-slate-400 font-semibold uppercase tracking-wider block">Matched</span>
            <span className="text-2xl font-bold text-emerald-700 mt-1 block">
              {stats?.matched_count || 0}
            </span>
            <span className="text-[10px] text-slate-400">Exact 100% pairs</span>
          </div>
          <div className="w-9 h-9 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200/90 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] text-slate-400 font-semibold uppercase tracking-wider block">Mismatch</span>
            <span className="text-2xl font-bold text-amber-700 mt-1 block">
              {stats?.mismatch_count || 0}
            </span>
            <span className="text-[10px] text-slate-400">Variance to audit</span>
          </div>
          <div className="w-9 h-9 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
            <AlertTriangle className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200/90 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] text-slate-400 font-semibold uppercase tracking-wider block">Partial</span>
            <span className="text-2xl font-bold text-sky-700 mt-1 block">
              {stats?.partial_count || 0}
            </span>
            <span className="text-[10px] text-slate-400">Partially settled</span>
          </div>
          <div className="w-9 h-9 rounded-lg bg-sky-50 text-sky-600 flex items-center justify-center font-bold">
            <Scale className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200/90 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] text-slate-400 font-semibold uppercase tracking-wider block">Unmatched</span>
            <span className="text-2xl font-bold text-slate-700 mt-1 block">
              {stats?.unmatched_count || 0}
            </span>
            <span className="text-[10px] text-slate-400">Pending statement</span>
          </div>
          <div className="w-9 h-9 rounded-lg bg-slate-100 text-slate-600 flex items-center justify-center font-bold">
            <Scale className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto bg-white p-2 rounded-xl border border-slate-200/90 shadow-xs">
        {['ALL', 'MATCHED', 'MISMATCH', 'PARTIAL', 'UNMATCHED'].map((st) => (
          <button
            key={st}
            onClick={() => setStatusFilter(st)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
              statusFilter === st
                ? 'bg-slate-900 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            {st === 'ALL' ? 'All Pairs' : st.replace('_', ' ')}
          </button>
        ))}
      </div>

      {/* Clean Reconciliation Table as per Prompt */}
      <div className="bg-white rounded-xl border border-slate-200/90 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/70 border-b border-slate-200 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                <th className="py-3 px-4">Invoice</th>
                <th className="py-3 px-4 text-right">Invoice Amount</th>
                <th className="py-3 px-4 text-right">Paid Amount</th>
                <th className="py-3 px-4 text-right">Variance</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {loading ? (
                <tr>
                  <td colSpan="6" className="py-12 text-center text-slate-400 animate-pulse">
                    Loading reconciliation records...
                  </td>
                </tr>
              ) : reconciliations.length === 0 ? (
                <tr>
                  <td colSpan="6" className="py-8">
                    <EmptyState
                      icon={Scale}
                      title="No reconciliation records"
                      description="No records match your current filter."
                    />
                  </td>
                </tr>
              ) : (
                reconciliations.map((r) => {
                  const hasMismatch = parseFloat(r.discrepancy_amount) > 0 || r.match_status === 'MISMATCH';

                  return (
                    <tr
                      key={r.id}
                      onClick={() => setSelectedPair(r)}
                      className="hover:bg-slate-50/80 transition cursor-pointer"
                    >
                      <td className="py-3.5 px-4">
                        <div className="font-mono font-bold text-sky-800">
                          #{r.invoice_number}
                        </div>
                        <div className="text-[10px] text-slate-500 truncate max-w-xs">
                          {r.vendor_name}
                        </div>
                      </td>

                      <td className="py-3.5 px-4 text-right font-mono font-bold text-slate-900">
                        {formatINR(r.invoice_amount)}
                      </td>

                      <td className="py-3.5 px-4 text-right font-mono font-bold text-emerald-800">
                        {formatINR(r.payment_amount)}
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        <span className={`font-mono font-bold ${hasMismatch ? 'text-amber-700' : 'text-slate-600'}`}>
                          {formatINR(r.discrepancy_amount)}
                        </span>
                        {r.discrepancy_reason !== 'NONE' && (
                          <div className="text-[10px] text-slate-400">
                            {r.discrepancy_reason.replace('_', ' ')}
                          </div>
                        )}
                      </td>

                      <td className="py-3.5 px-4">
                        <Badge status={r.match_status} size="xs" />
                      </td>

                      <td className="py-3.5 px-4 text-center" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => setSelectedPair(r)}
                            className="px-2.5 py-1 text-xs font-semibold rounded-md bg-slate-100 text-slate-700 hover:bg-slate-200 transition"
                          >
                            View
                          </button>
                          <button
                            onClick={() =>
                              setSettleModal({
                                isOpen: true,
                                item: r,
                                match_status: r.match_status,
                                discrepancy_reason: r.discrepancy_reason !== 'NONE' ? r.discrepancy_reason : 'TDS_DEDUCTION',
                                reconciliation_notes: r.reconciliation_notes || '',
                              })
                            }
                            className="px-2.5 py-1 text-xs font-semibold rounded-md bg-sky-50 text-sky-700 hover:bg-sky-600 hover:text-white transition"
                          >
                            Settle
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Slide-over Inspection Drawer */}
      <Drawer
        isOpen={Boolean(selectedPair)}
        onClose={() => setSelectedPair(null)}
        title={`Reconciliation: #${selectedPair?.invoice_number}`}
        subtitle={selectedPair?.vendor_name}
        badge={selectedPair && <Badge status={selectedPair.match_status} size="xs" />}
        footer={
          selectedPair && (
            <div className="flex items-center justify-between w-full">
              <button
                onClick={() => setSelectedPair(null)}
                className="px-3 py-1.5 text-xs font-medium text-slate-600"
              >
                Close
              </button>

              <button
                onClick={() => {
                  setSettleModal({
                    isOpen: true,
                    item: selectedPair,
                    match_status: selectedPair.match_status,
                    discrepancy_reason: selectedPair.discrepancy_reason !== 'NONE' ? selectedPair.discrepancy_reason : 'TDS_DEDUCTION',
                    reconciliation_notes: selectedPair.reconciliation_notes || '',
                  });
                }}
                className="px-4 py-2 text-xs font-semibold rounded-lg bg-sky-600 text-white hover:bg-sky-700 shadow-xs"
              >
                Audit / Settle Variance
              </button>
            </div>
          )
        }
      >
        {selectedPair && (
          <div className="space-y-5 text-xs">
            {/* Side-by-Side Comparison */}
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2.5">
              <div className="flex justify-between">
                <span className="text-slate-500">Invoice Amount:</span>
                <span className="font-mono font-bold text-slate-900">{formatINR(selectedPair.invoice_amount)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Bank Disbursement:</span>
                <span className="font-mono font-bold text-emerald-800">{formatINR(selectedPair.payment_amount)}</span>
              </div>
              <div className="flex justify-between border-t border-slate-200 pt-2 font-bold">
                <span className="text-slate-700">Variance / Difference:</span>
                <span className="font-mono text-amber-700">{formatINR(selectedPair.discrepancy_amount)}</span>
              </div>
            </div>

            {/* Reconciliation Details */}
            <div className="p-3.5 rounded-lg border border-slate-200 bg-white space-y-2">
              <div className="flex justify-between">
                <span className="text-slate-500">Variance Category:</span>
                <span className="font-semibold text-slate-800">{selectedPair.discrepancy_reason.replace('_', ' ')}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">UTR Reference:</span>
                <span className="font-mono font-bold text-sky-800">{selectedPair.utr_reference || 'N/A'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Reconciled By:</span>
                <span className="text-slate-800">{selectedPair.reconciler_name || 'System / Auto-matched'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Reconciled At:</span>
                <span className="text-slate-800">{selectedPair.reconciled_at ? formatDate(selectedPair.reconciled_at) : 'Pending'}</span>
              </div>
            </div>

            {/* Auditor Notes */}
            {selectedPair.reconciliation_notes && (
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Auditor Notes</span>
                <p className="p-3 rounded-lg bg-slate-50 text-slate-700 leading-relaxed border border-slate-200">
                  {selectedPair.reconciliation_notes}
                </p>
              </div>
            )}
          </div>
        )}
      </Drawer>

      {/* Settle / Match Modal */}
      <Modal
        isOpen={settleModal.isOpen}
        onClose={() => setSettleModal({ ...settleModal, isOpen: false, item: null })}
        title="Audit & Settle Reconciliation"
        subtitle={`Invoice #${settleModal.item?.invoice_number} · Invoiced: ${formatINR(settleModal.item?.invoice_amount || 0)} vs Paid: ${formatINR(settleModal.item?.payment_amount || 0)}`}
      >
        <form onSubmit={handleSettle} className="space-y-4">
          <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 text-xs text-amber-900">
            <span className="font-bold block mb-1">Difference to Settle:</span>
            {formatINR(settleModal.item?.discrepancy_amount || 0)}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
                Match Classification *
              </label>
              <select
                required
                value={settleModal.match_status}
                onChange={(e) => setSettleModal({ ...settleModal, match_status: e.target.value })}
                className="mt-1 block w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-sky-500 outline-none"
              >
                <option value="MATCHED">MATCHED (Fully Settled)</option>
                <option value="MISMATCH">MISMATCH (Flagged Discrepancy)</option>
                <option value="PARTIAL">PARTIAL (Partial Settlement)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
                Variance Statutory Reason *
              </label>
              <select
                required
                value={settleModal.discrepancy_reason}
                onChange={(e) => setSettleModal({ ...settleModal, discrepancy_reason: e.target.value })}
                className="mt-1 block w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-sky-500 outline-none"
              >
                <option value="NONE">None (Exact 100% Match)</option>
                <option value="TDS_DEDUCTION">TDS Statutory Deduction (Section 194C/194J)</option>
                <option value="BANK_FEES">Bank Transaction / Wiring Fees</option>
                <option value="EXCHANGE_VARIATION">Exchange Rate / Forex Variance</option>
                <option value="OVERPAYMENT">Vendor Overpayment Adjustment</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
              Auditor Justification Remarks *
            </label>
            <textarea
              rows="3"
              required
              placeholder="e.g. Difference of ₹12,744 corresponds to 2% Section 194C TDS withholding. Form 16A will be issued to vendor."
              value={settleModal.reconciliation_notes}
              onChange={(e) => setSettleModal({ ...settleModal, reconciliation_notes: e.target.value })}
              className="mt-1 block w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-sky-500 outline-none"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setSettleModal({ ...settleModal, isOpen: false, item: null })}
              className="px-4 py-2 text-xs font-medium text-slate-600"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-2 text-xs font-semibold rounded-lg bg-sky-600 text-white hover:bg-sky-700 disabled:opacity-50 transition shadow-sm"
            >
              {submitting ? 'Recording Settlement...' : 'Record Reconciliation'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default ReconciliationPage;
