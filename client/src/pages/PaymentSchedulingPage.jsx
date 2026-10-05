import React, { useEffect, useState } from 'react';
import axiosClient from '../api/axiosClient';
import PageHeader from '../components/common/PageHeader';
import Badge from '../components/common/Badge';
import Modal from '../components/common/Modal';
import EmptyState from '../components/common/EmptyState';
import { formatINR } from '../utils/currency';
import { formatDate } from '../utils/date';
import { useNotifications } from '../context/NotificationContext';
import { useNavigate } from 'react-router-dom';
import {
  CalendarClock,
  CreditCard,
  Building2,
  Calendar,
  Send,
  CheckCircle2,
  ArrowRight,
} from 'lucide-react';

export const PaymentSchedulingPage = () => {
  const [approvedInvoices, setApprovedInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [scheduleModal, setScheduleModal] = useState({
    isOpen: false,
    invoice: null,
    scheduled_date: new Date().toISOString().split('T')[0],
    payment_method: 'NEFT',
    debit_account: 'HDFC Bank - 50200098765432 (Treasury Main)',
  });
  const [submitting, setSubmitting] = useState(false);
  const { addToast } = useNotifications();
  const navigate = useNavigate();

  const fetchQueue = () => {
    setLoading(true);
    axiosClient
      .get('/payments/approved-queue')
      .then((res) => setApprovedInvoices(res.approvedInvoices || []))
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchQueue();
  }, []);

  // =========================================================================
  // STEP-BY-STEP ARCHITECTURE FLOW:
  // 1. Finance staff selects approved invoice, sets disbursement date and payment method.
  // 2. React sends Axios POST to `/payments/schedule` with invoice ID and payment params.
  // 3. Express route authenticates user and verifies FINANCE_STAFF/ADMIN permission.
  // 4. Controller creates payment row with status 'SCHEDULED'.
  // 5. PostgreSQL inserts record into 'payments' table and updates 'invoices' status.
  // 6. Backend returns JSON response with scheduled payment details.
  // 7. React updates UI: closes modal, shows toast, and removes invoice from un-scheduled queue.
  // =========================================================================
  const handleScheduleSubmit = async (e) => {
    e.preventDefault();
    if (!scheduleModal.invoice) return;

    setSubmitting(true);
    try {
      const res = await axiosClient.post('/payments/schedule', {
        invoice_id: scheduleModal.invoice.id,
        scheduled_date: scheduleModal.scheduled_date,
        payment_method: scheduleModal.payment_method,
        debit_account: scheduleModal.debit_account,
      });

      addToast(res.message, 'success');
      setScheduleModal({ ...scheduleModal, isOpen: false, invoice: null });
      fetchQueue();
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
        title="Payments"
        description="Schedule and manage approved invoice disbursements."
      >
        <button
          onClick={() => navigate('/payments/track')}
          className="px-3.5 py-2 text-xs font-semibold rounded-lg border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 transition shadow-xs flex items-center gap-1.5"
        >
          <Send className="w-3.5 h-3.5 text-sky-600" />
          Payment Tracking
        </button>
      </PageHeader>

      {/* Approved Queue Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
          <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
            Approved Invoices Ready for Scheduling ({approvedInvoices.length})
          </span>
          <span className="text-[11px] text-slate-400">Management Authorization Verified</span>
        </div>

        {loading ? (
          <div className="p-12 text-center text-xs text-slate-400 animate-pulse">
            Loading approved payables queue...
          </div>
        ) : approvedInvoices.length === 0 ? (
          <div className="p-8">
            <EmptyState
              icon={CheckCircle2}
              title="No Invoices Waiting for Scheduling"
              description="All approved claims have been scheduled or disbursed."
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/50 border-b border-slate-200 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  <th className="py-3 px-4">Invoice #</th>
                  <th className="py-3 px-4">Vendor & Beneficiary Account</th>
                  <th className="py-3 px-4">Contract Terms</th>
                  <th className="py-3 px-4">Payment Due Date</th>
                  <th className="py-3 px-4 text-right">Payable Amount</th>
                  <th className="py-3 px-4 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {approvedInvoices.map((inv) => (
                  <tr key={inv.id} className="hover:bg-slate-50/70 transition">
                    <td className="py-3.5 px-4 font-mono font-bold text-sky-900">
                      #{inv.invoice_number}
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-slate-900">{inv.vendor_name}</div>
                      <div className="text-[11px] text-slate-500 font-mono">
                        A/C: {inv.bank_account_number || 'Default'} · IFSC: {inv.bank_ifsc || 'HDFC0000004'}
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-slate-600">
                      Net {inv.payment_terms_days || 30} Days
                    </td>
                    <td className="py-3.5 px-4 font-semibold text-slate-800">
                      {formatDate(inv.due_date)}
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono font-bold text-emerald-800">
                      {formatINR(inv.total_amount)}
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <button
                        onClick={() =>
                          setScheduleModal({
                            isOpen: true,
                            invoice: inv,
                            scheduled_date: inv.due_date || new Date().toISOString().split('T')[0],
                            payment_method: parseFloat(inv.total_amount) > 200000 ? 'RTGS' : 'NEFT',
                            debit_account: 'HDFC Bank - 50200098765432 (Treasury Main)',
                          })
                        }
                        className="px-3 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-700 text-white font-semibold shadow-xs flex items-center gap-1.5 mx-auto transition"
                      >
                        <CalendarClock className="w-3.5 h-3.5" />
                        Schedule Release
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Schedule Payment Modal */}
      <Modal
        isOpen={scheduleModal.isOpen}
        onClose={() => setScheduleModal({ ...scheduleModal, isOpen: false, invoice: null })}
        title="Schedule Payment Execution"
        subtitle={`Invoice #${scheduleModal.invoice?.invoice_number} · Payable: ${formatINR(scheduleModal.invoice?.total_amount || 0)}`}
      >
        <form onSubmit={handleScheduleSubmit} className="space-y-4">
          <div className="p-3.5 rounded-lg bg-sky-50 border border-sky-200 text-xs text-sky-900 space-y-1">
            <div className="flex justify-between">
              <span>Beneficiary:</span>
              <span className="font-bold">{scheduleModal.invoice?.vendor_name}</span>
            </div>
            <div className="flex justify-between font-mono">
              <span>Bank Account:</span>
              <span>{scheduleModal.invoice?.bank_account_number || '000405001290'} ({scheduleModal.invoice?.bank_ifsc || 'HDFC0000004'})</span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
                Target Execution Date *
              </label>
              <input
                type="date"
                required
                value={scheduleModal.scheduled_date}
                onChange={(e) => setScheduleModal({ ...scheduleModal, scheduled_date: e.target.value })}
                className="mt-1 block w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-sky-500 outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
                Payment Method *
              </label>
              <select
                required
                value={scheduleModal.payment_method}
                onChange={(e) => setScheduleModal({ ...scheduleModal, payment_method: e.target.value })}
                className="mt-1 block w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-sky-500 outline-none"
              >
                <option value="NEFT">NEFT (National Electronic Funds Transfer)</option>
                <option value="RTGS">RTGS (Real Time Gross Settlement - High Value)</option>
                <option value="IMPS">IMPS (Immediate Payment Service - 24x7)</option>
                <option value="NETBANKING">Corporate NetBanking API</option>
                <option value="CHEQUE">Corporate Physical Cheque</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
              Debit Corporate Bank Account *
            </label>
            <select
              required
              value={scheduleModal.debit_account}
              onChange={(e) => setScheduleModal({ ...scheduleModal, debit_account: e.target.value })}
              className="mt-1 block w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-sky-500 outline-none"
            >
              <option value="HDFC Bank - 50200098765432 (Treasury Main)">
                HDFC Bank - 50200098765432 (Treasury Main)
              </option>
              <option value="State Bank of India - 300188992211 (Disbursement)">
                State Bank of India - 300188992211 (Disbursement)
              </option>
              <option value="ICICI Bank - 002305001122 (OPEX Pool)">
                ICICI Bank - 002305001122 (OPEX Pool)
              </option>
            </select>
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setScheduleModal({ ...scheduleModal, isOpen: false, invoice: null })}
              className="px-4 py-2 text-xs font-medium text-slate-600"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-2 text-xs font-semibold rounded-lg bg-sky-600 text-white hover:bg-sky-700 disabled:opacity-50 transition shadow-sm"
            >
              {submitting ? 'Scheduling...' : 'Confirm Schedule'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default PaymentSchedulingPage;
