import React, { useEffect, useState } from 'react';
import axiosClient from '../api/axiosClient';
import PageHeader from '../components/common/PageHeader';
import Badge from '../components/common/Badge';
import Drawer from '../components/common/Drawer';
import EmptyState from '../components/common/EmptyState';
import { formatINR } from '../utils/currency';
import { formatDate } from '../utils/date';
import { useNotifications } from '../context/NotificationContext';
import { useNavigate } from 'react-router-dom';
import {
  Send,
  CheckCircle2,
  Clock,
  ArrowRight,
  Eye,
  RefreshCw,
  ExternalLink,
  CreditCard,
} from 'lucide-react';

export const PaymentTrackingPage = () => {
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('SCHEDULED'); // SCHEDULED | PROCESSING | PAID
  const [selectedPayment, setSelectedPayment] = useState(null);
  const [processingId, setProcessingId] = useState(null);
  const { addToast } = useNotifications();
  const navigate = useNavigate();

  const fetchPayments = () => {
    setLoading(true);
    axiosClient
      .get('/payments', { params: { status: activeTab } })
      .then((res) => setPayments(res.payments || []))
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchPayments();
  }, [activeTab]);

  // =========================================================================
  // STEP-BY-STEP ARCHITECTURE FLOW:
  // 1. Finance staff clicks "Execute Payment" on scheduled disbursement.
  // 2. React sends Axios POST to `/payments/${payment.id}/process`.
  // 3. Express router forwards request to paymentController.processPayment.
  // 4. Controller generates realistic banking UTR (e.g. NEFT26XXXXXXXX).
  // 5. PostgreSQL sets payment to 'PAID', invoice to 'PAID', and creates matched reconciliation pair.
  // 6. Backend returns JSON response with UTR reference number and execution timestamp.
  // 7. React updates UI: shows success toast with UTR and refreshes payment records.
  // =========================================================================
  const handleProcessPayment = async (payment) => {
    setProcessingId(payment.id);
    try {
      const res = await axiosClient.post(`/payments/${payment.id}/process`);
      addToast(res.message, 'success');
      setSelectedPayment(null);
      fetchPayments();
    } catch (err) {
      addToast(err.message, 'error');
    } finally {
      setProcessingId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Standardized Page Header */}
      <PageHeader
        eyebrow="Accounts Payable"
        title="Payment Tracking"
        description="Track disbursement status, UTR numbers, and banking execution."
      >
        <button
          onClick={() => navigate('/payments/schedule')}
          className="px-3.5 py-2 text-xs font-semibold rounded-lg bg-sky-600 text-white hover:bg-sky-700 transition shadow-xs flex items-center gap-1.5"
        >
          Schedule Payment
        </button>
      </PageHeader>

      {/* Clean Tabs: Scheduled, Processing, Paid */}
      <div className="flex items-center gap-2 border-b border-slate-200">
        {[
          { key: 'SCHEDULED', label: 'Scheduled' },
          { key: 'PROCESSING', label: 'Processing' },
          { key: 'PAID', label: 'Paid' },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`pb-3 px-4 text-xs font-bold transition border-b-2 ${
              activeTab === tab.key
                ? 'border-sky-600 text-sky-600'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Clean Payments Table */}
      <div className="bg-white rounded-xl border border-slate-200/90 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/70 border-b border-slate-200 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                <th className="py-3 px-4">Invoice</th>
                <th className="py-3 px-4">Vendor</th>
                <th className="py-3 px-4 text-right">Amount</th>
                <th className="py-3 px-4">Payment Method</th>
                <th className="py-3 px-4">Date</th>
                <th className="py-3 px-4">UTR Reference</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {loading ? (
                <tr>
                  <td colSpan="8" className="py-12 text-center text-slate-400 animate-pulse">
                    Loading payments...
                  </td>
                </tr>
              ) : payments.length === 0 ? (
                <tr>
                  <td colSpan="8" className="py-8">
                    <EmptyState
                      icon={Send}
                      title={`No ${activeTab.toLowerCase()} payments`}
                      description={`There are currently no disbursements in the ${activeTab.toLowerCase()} queue.`}
                    />
                  </td>
                </tr>
              ) : (
                payments.map((p) => {
                  const isPaid = p.payment_status === 'PAID';

                  return (
                    <tr
                      key={p.id}
                      onClick={() => setSelectedPayment(p)}
                      className="hover:bg-slate-50/80 transition cursor-pointer"
                    >
                      <td className="py-3.5 px-4 font-mono font-bold text-sky-800">
                        #{p.invoice_number}
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-slate-900">{p.vendor_name}</div>
                        <div className="text-[10px] text-slate-400 font-mono">
                          A/C: {p.bank_account_number || 'Default'}
                        </div>
                      </td>

                      <td className="py-3.5 px-4 text-right font-mono font-bold text-slate-900">
                        {formatINR(p.amount_paid)}
                      </td>

                      <td className="py-3.5 px-4">
                        <span className="font-semibold text-slate-800 bg-slate-100 px-2 py-0.5 rounded text-[11px]">
                          {p.payment_method}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 text-slate-700">
                        {isPaid && p.execution_date
                          ? formatDate(p.execution_date)
                          : formatDate(p.scheduled_date)}
                      </td>

                      <td className="py-3.5 px-4">
                        {p.utr_reference ? (
                          <span className="font-mono font-bold text-sky-800 bg-sky-50 px-2 py-0.5 rounded border border-sky-200 text-[11px]">
                            {p.utr_reference}
                          </span>
                        ) : (
                          <span className="text-slate-400 italic text-[11px]">Pending release</span>
                        )}
                      </td>

                      <td className="py-3.5 px-4">
                        <Badge status={p.payment_status} size="xs" />
                      </td>

                      <td className="py-3.5 px-4 text-center" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => setSelectedPayment(p)}
                            className="px-2.5 py-1 text-xs font-semibold rounded-md bg-slate-100 text-slate-700 hover:bg-slate-200 transition"
                          >
                            View
                          </button>

                          {!isPaid && (
                            <button
                              onClick={() => handleProcessPayment(p)}
                              disabled={processingId === p.id}
                              className="px-2.5 py-1 text-xs font-semibold rounded-md bg-emerald-600 hover:bg-emerald-700 text-white transition flex items-center gap-1 disabled:opacity-50"
                            >
                              {processingId === p.id ? (
                                <RefreshCw className="w-3 h-3 animate-spin" />
                              ) : (
                                <CheckCircle2 className="w-3 h-3" />
                              )}
                              Process
                            </button>
                          )}
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

      {/* Slide-over Payment Drawer for View Details */}
      <Drawer
        isOpen={Boolean(selectedPayment)}
        onClose={() => setSelectedPayment(null)}
        title={`Payment Details: #${selectedPayment?.invoice_number}`}
        subtitle={selectedPayment?.vendor_name}
        badge={selectedPayment && <Badge status={selectedPayment.payment_status} size="xs" />}
        footer={
          selectedPayment && (
            <div className="flex items-center justify-between w-full">
              <button
                onClick={() => setSelectedPayment(null)}
                className="px-3 py-1.5 text-xs font-medium text-slate-600"
              >
                Close
              </button>

              {selectedPayment.payment_status !== 'PAID' && (
                <button
                  onClick={() => handleProcessPayment(selectedPayment)}
                  disabled={processingId === selectedPayment.id}
                  className="px-4 py-2 text-xs font-semibold rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 shadow-xs flex items-center gap-1.5"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  Process & Generate UTR
                </button>
              )}
            </div>
          )
        }
      >
        {selectedPayment && (
          <div className="space-y-5 text-xs">
            {/* Amount Summary */}
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2">
              <span className="text-[10px] uppercase font-bold text-slate-400 block">Disbursed Amount</span>
              <p className="text-2xl font-mono font-bold text-slate-900">
                {formatINR(selectedPayment.amount_paid)}
              </p>
              <p className="text-slate-500 text-[11px]">
                Paid via {selectedPayment.payment_method} from Treasury Account
              </p>
            </div>

            {/* Banking Details */}
            <div className="p-3.5 rounded-lg border border-slate-200 bg-white space-y-2.5">
              <div className="flex justify-between">
                <span className="text-slate-500">UTR / Bank Reference:</span>
                <span className="font-mono font-bold text-sky-800">
                  {selectedPayment.utr_reference || 'Generated upon execution'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Beneficiary Account:</span>
                <span className="font-mono font-semibold text-slate-800">
                  {selectedPayment.bank_account_number || 'Default'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">IFSC Code:</span>
                <span className="font-mono font-semibold text-slate-800">
                  {selectedPayment.bank_ifsc || 'HDFC0000004'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Target Scheduled Date:</span>
                <span className="text-slate-800">{formatDate(selectedPayment.scheduled_date)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Execution Date:</span>
                <span className="text-slate-800 font-semibold">
                  {selectedPayment.execution_date ? formatDate(selectedPayment.execution_date) : 'Pending'}
                </span>
              </div>
            </div>

            {/* Quick Links */}
            <div className="pt-2">
              <button
                onClick={() => navigate(`/invoices/${selectedPayment.invoice_id}`)}
                className="w-full py-2 px-3 rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-semibold flex items-center justify-center gap-1.5 transition"
              >
                Inspect Invoice Dossier
                <ExternalLink className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}
      </Drawer>
    </div>
  );
};

export default PaymentTrackingPage;
