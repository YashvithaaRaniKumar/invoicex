import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axiosClient from '../api/axiosClient';
import Badge from '../components/common/Badge';
import { formatINR } from '../utils/currency';
import { formatDate } from '../utils/date';
import { formatActorName } from '../utils/actor';
import { useAuth } from '../context/AuthContext';
import { useNotifications } from '../context/NotificationContext';
import {
  ArrowLeft,
  Building2,
  Calendar,
  CreditCard,
  FileCheck,
  AlertTriangle,
  UserCheck,
  Send,
  Scale,
  Clock,
} from 'lucide-react';

export const InvoiceDetailPage = () => {
  const { id } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const { addToast } = useNotifications();
  const navigate = useNavigate();

  useEffect(() => {
    axiosClient
      .get(`/invoices/${id}`)
      .then((res) => setData(res))
      .catch((err) => {
        console.error(err);
        addToast('Failed to load invoice dossier', 'error');
      })
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return <div className="p-8 text-center text-xs text-slate-400">Loading invoice dossier...</div>;
  }

  if (!data || !data.invoice) {
    return (
      <div className="p-8 text-center">
        <p className="text-sm font-semibold text-slate-800">Invoice not found</p>
        <button
          onClick={() => navigate('/invoices')}
          className="mt-3 text-xs text-sky-600 hover:underline"
        >
          Back to Invoices
        </button>
      </div>
    );
  }

  const { invoice, verifications = [], exceptions = [], approvals = [], payments = [], reconciliation } = data;

  return (
    <div className="space-y-6">
      {/* Back Button & Header */}
      <div>
        <button
          onClick={() => navigate('/invoices')}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 mb-3"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Back to Invoices
        </button>

        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold font-mono text-slate-900">
                #{invoice.invoice_number}
              </h1>
              <Badge status={invoice.status} />
              {invoice.approval_status === 'APPROVED' && (
                <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-purple-100 text-purple-800">
                  Manager Approved
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 mt-1 flex items-center gap-2">
              <Building2 className="w-3.5 h-3.5" />
              <span className="font-semibold text-slate-800">{invoice.vendor_name}</span> ({invoice.vendor_code})
              · Created by {formatActorName(invoice.creator_name) || 'Finance Staff'} on {formatDate(invoice.created_at)}
            </p>
          </div>

          <div className="text-right">
            <span className="text-xs text-slate-500 uppercase tracking-wider block">Total Payable Amount</span>
            <span className="text-2xl font-bold font-mono text-sky-800">
              {formatINR(invoice.total_amount)}
            </span>
          </div>
        </div>
      </div>

      {/* Dynamic Action Ribbon */}
      <div className="bg-slate-900 text-white p-4 rounded-xl flex items-center justify-between gap-4 flex-wrap">
        <div className="text-xs">
          <span className="font-bold text-sky-400 uppercase tracking-wider block">Next Workflow Step</span>
          <span className="text-slate-300">
            {invoice.status === 'PENDING_VERIFICATION' && 'Invoice is queued for compliance & math validation.'}
            {invoice.status === 'VERIFIED' && 'Invoice passed validation. Ready for Approver sign-off.'}
            {invoice.status === 'EXCEPTION' && 'Invoice blocked by active exception. Resolution required in Exception Center.'}
            {invoice.status === 'APPROVED' && 'Invoice approved by management. Ready for payment scheduling.'}
            {invoice.status === 'SCHEDULED' && 'Payment scheduled. Ready for bank disbursement release.'}
            {invoice.status === 'PAID' && 'Disbursement complete with UTR reference. Ready for reconciliation.'}
            {invoice.status === 'RECONCILED' && 'Reconciled 100% against bank ledger.'}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {invoice.status === 'PENDING_VERIFICATION' && (
            <button
              onClick={() => navigate('/verification')}
              className="px-3.5 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-500 text-xs font-semibold text-white transition flex items-center gap-1.5 shadow-xs"
            >
              <FileCheck className="w-3.5 h-3.5" /> Review in Verification
            </button>
          )}

          {invoice.status === 'VERIFIED' && (
            <button
              onClick={() => navigate('/approvals')}
              className="px-3.5 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-500 text-xs font-semibold text-white transition flex items-center gap-1.5 shadow-xs"
            >
              <UserCheck className="w-3.5 h-3.5" /> Review in Approvals
            </button>
          )}

          {invoice.status === 'EXCEPTION' && (
            <button
              onClick={() => navigate('/exceptions')}
              className="px-3.5 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-xs font-semibold text-white transition flex items-center gap-1.5 shadow-xs"
            >
              <AlertTriangle className="w-3.5 h-3.5" /> Resolve Exception
            </button>
          )}

          {invoice.status === 'APPROVED' && invoice.payment_status !== 'PAID' && (
            <button
              onClick={() => navigate('/payments/schedule')}
              className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-xs font-semibold text-white transition flex items-center gap-1.5"
            >
              <CreditCard className="w-3.5 h-3.5" /> Schedule Payment
            </button>
          )}

          {invoice.status === 'PAID' && (
            <button
              onClick={() => navigate('/reconciliation')}
              className="px-3 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-500 text-xs font-semibold text-white transition flex items-center gap-1.5"
            >
              <Scale className="w-3.5 h-3.5" /> View Bank Reconciliation
            </button>
          )}
        </div>
      </div>

      {/* Two Column Grid: Financial Computation vs Vendor Dossier */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Invoice Amounts & Line details */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 border-b pb-2 flex items-center gap-2">
            <CreditCard className="w-4 h-4 text-sky-600" />
            Financial Computation & Line Details
          </h3>

          <div className="space-y-2 text-xs">
            <div className="flex justify-between py-1 border-b border-slate-100">
              <span className="text-slate-500">Taxable Subtotal</span>
              <span className="font-mono font-bold text-slate-800">{formatINR(invoice.amount)}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-100">
              <span className="text-slate-500">Applicable GST (18%)</span>
              <span className="font-mono font-bold text-slate-800">{formatINR(invoice.tax_amount)}</span>
            </div>
            <div className="flex justify-between py-2 border-b-2 border-slate-200 bg-slate-50 px-2 rounded font-semibold">
              <span className="text-slate-800">Gross Invoiced Total</span>
              <span className="font-mono font-bold text-sky-900">{formatINR(invoice.total_amount)}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-100">
              <span className="text-slate-500">PO Contract Reference</span>
              <span className="font-mono font-semibold text-slate-800">{invoice.po_number || 'N/A'}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-100">
              <span className="text-slate-500">Invoice Issue Date</span>
              <span className="text-slate-800">{formatDate(invoice.invoice_date)}</span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-slate-500">Payment Due Date</span>
              <span className="font-semibold text-slate-800">{formatDate(invoice.due_date)}</span>
            </div>
          </div>

          {invoice.description && (
            <div className="pt-2 text-xs">
              <span className="text-slate-500 block font-medium">Service / Goods Description:</span>
              <p className="mt-1 p-2 rounded bg-slate-50 text-slate-700 border border-slate-200">
                {invoice.description}
              </p>
            </div>
          )}
        </div>

        {/* Vendor Master Information */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 border-b pb-2 flex items-center gap-2">
            <Building2 className="w-4 h-4 text-sky-600" />
            Vendor Master & Disbursement Account
          </h3>

          <div className="space-y-2 text-xs">
            <div className="flex justify-between py-1 border-b border-slate-100">
              <span className="text-slate-500">Vendor Trade Name</span>
              <span className="font-semibold text-slate-800">{invoice.vendor_name}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-100">
              <span className="text-slate-500">GSTIN</span>
              <span className="font-mono font-bold text-slate-800">{invoice.vendor_gstin}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-100">
              <span className="text-slate-500">Bank Account #</span>
              <span className="font-mono text-slate-800">{invoice.vendor_account || 'Pending setup'}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-100">
              <span className="text-slate-500">Bank IFSC & Name</span>
              <span className="font-mono text-slate-800">{invoice.vendor_ifsc} · {invoice.vendor_bank}</span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-slate-500">Payment Credit Terms</span>
              <span className="font-semibold text-slate-800">Net {invoice.payment_terms_days || 30} Days</span>
            </div>
          </div>
        </div>
      </div>

      {/* History Sections */}
      <div className="space-y-4">
        {/* Verification History */}
        {verifications.length > 0 && (
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-3 flex items-center gap-2">
              <FileCheck className="w-4 h-4 text-emerald-600" />
              Verification Checks Record
            </h3>
            <div className="divide-y divide-slate-100 text-xs">
              {verifications.map((v) => (
                <div key={v.id} className="py-2.5 flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <Badge status={v.outcome} size="xs" />
                      <span className="font-semibold text-slate-800">Verified by {formatActorName(v.verifier_name)}</span>
                    </div>
                    <p className="text-slate-500 mt-1">{v.notes}</p>
                  </div>
                  <span className="text-[11px] text-slate-400 font-mono">{formatDate(v.verified_at)}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Exceptions History */}
        {exceptions.length > 0 && (
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-3 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-600" />
              Exception & Resolution History
            </h3>
            <div className="divide-y divide-slate-100 text-xs">
              {exceptions.map((e) => (
                <div key={e.id} className="py-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Badge status={e.severity} size="xs" />
                      <span className="font-bold text-slate-900">{e.issue_title}</span>
                    </div>
                    <Badge status={e.status} size="xs" />
                  </div>
                  <p className="text-slate-600 mt-1">{e.issue_description}</p>
                  <div className="mt-2 p-2 rounded bg-slate-50 text-[11px] text-slate-700 border border-slate-200">
                    <span className="font-bold text-sky-800">Required Action: </span>
                    {e.required_action}
                  </div>
                  {e.resolution_notes && (
                    <div className="mt-1 text-[11px] text-emerald-700">
                      <span className="font-bold">Resolution Note: </span>
                      {e.resolution_notes}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default InvoiceDetailPage;
