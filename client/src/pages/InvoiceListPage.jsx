import React, { useEffect, useState } from 'react';
import axiosClient from '../api/axiosClient';
import PageHeader from '../components/common/PageHeader';
import Badge from '../components/common/Badge';
import Modal from '../components/common/Modal';
import Drawer from '../components/common/Drawer';
import EmptyState from '../components/common/EmptyState';
import { formatINR } from '../utils/currency';
import { formatDate } from '../utils/date';
import { useNavigate } from 'react-router-dom';
import { useNotifications } from '../context/NotificationContext';
import {
  Plus,
  Search,
  Filter,
  Eye,
  AlertTriangle,
  FileText,
  Building2,
  Calendar,
  ExternalLink,
  ArrowRight,
  ShieldCheck,
  CreditCard,
} from 'lucide-react';

export const InvoiceListPage = () => {
  const [invoices, setInvoices] = useState([]);
  const [vendors, setVendors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [dueFilter, setDueFilter] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const { addToast } = useNotifications();
  const navigate = useNavigate();

  // Create Form State
  const [formData, setFormData] = useState({
    invoice_number: '',
    vendor_id: '',
    invoice_date: new Date().toISOString().split('T')[0],
    due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    amount: '',
    tax_amount: '',
    total_amount: '',
    po_number: '',
    description: '',
    notes: '',
  });

  // Duplicate Check Feedback State
  const [duplicateWarning, setDuplicateWarning] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const fetchInvoices = () => {
    setLoading(true);
    const params = {};
    if (search) params.search = search;
    if (statusFilter) params.status = statusFilter;
    if (dueFilter) params.dueFilter = dueFilter;

    axiosClient
      .get('/invoices', { params })
      .then((res) => setInvoices(res.invoices || []))
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchInvoices();
  }, [search, statusFilter, dueFilter]);

  useEffect(() => {
    axiosClient.get('/vendors').then((res) => setVendors(res.vendors || []));
  }, []);

  // Pre-flight duplicate check when invoice number or vendor changes
  useEffect(() => {
    if (formData.invoice_number && formData.vendor_id) {
      axiosClient
        .post('/invoices/check-duplicate', {
          vendor_id: formData.vendor_id,
          invoice_number: formData.invoice_number,
          total_amount: formData.total_amount,
        })
        .then((res) => {
          if (res.isDuplicate) {
            setDuplicateWarning(res.message);
          } else {
            setDuplicateWarning(null);
          }
        })
        .catch(() => {});
    } else {
      setDuplicateWarning(null);
    }
  }, [formData.invoice_number, formData.vendor_id, formData.total_amount]);

  const handleAmountChange = (val) => {
    const subtotal = parseFloat(val) || 0;
    const tax = Math.round(subtotal * 0.18 * 100) / 100;
    const total = Math.round((subtotal + tax) * 100) / 100;
    setFormData((prev) => ({
      ...prev,
      amount: val,
      tax_amount: tax.toString(),
      total_amount: total.toString(),
    }));
  };

  // =========================================================================
  // STEP-BY-STEP ARCHITECTURE FLOW:
  // 1. User submits invoice form (Invoice #, Vendor, Amount, Dates, PO#).
  // 2. React sends Axios POST to `/invoices` with form payload.
  // 3. Express router forwards request to invoiceController.createInvoice.
  // 4. Controller checks duplicate constraints and calculates 18% GST tax.
  // 5. PostgreSQL inserts record into 'invoices' table with 'PENDING_VERIFICATION'.
  // 6. Backend returns JSON response with created invoice record.
  // 7. React updates UI: closes modal, shows success toast, and refreshes invoice list.
  // =========================================================================
  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await axiosClient.post('/invoices', formData);
      addToast(res.message, 'success');
      setIsModalOpen(false);
      setFormData({
        invoice_number: '',
        vendor_id: '',
        invoice_date: new Date().toISOString().split('T')[0],
        due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        amount: '',
        tax_amount: '',
        total_amount: '',
        po_number: '',
        description: '',
        notes: '',
      });
      fetchInvoices();
    } catch (err) {
      addToast(err.message, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const getActionButton = (inv) => {
    if (inv.status === 'PENDING_VERIFICATION') {
      return (
        <button
          onClick={(e) => {
            e.stopPropagation();
            navigate('/verification');
          }}
          className="px-2.5 py-1 text-xs font-semibold rounded-md bg-sky-50 text-sky-700 hover:bg-sky-600 hover:text-white transition"
        >
          Review
        </button>
      );
    }
    if (inv.status === 'EXCEPTION') {
      return (
        <button
          onClick={(e) => {
            e.stopPropagation();
            navigate('/exceptions');
          }}
          className="px-2.5 py-1 text-xs font-semibold rounded-md bg-amber-50 text-amber-700 hover:bg-amber-600 hover:text-white transition"
        >
          Resolve
        </button>
      );
    }
    if (inv.status === 'VERIFIED' || (inv.verification_status === 'PASSED' && inv.approval_status === 'PENDING')) {
      return (
        <button
          onClick={(e) => {
            e.stopPropagation();
            navigate('/approvals');
          }}
          className="px-2.5 py-1 text-xs font-semibold rounded-md bg-purple-50 text-purple-700 hover:bg-purple-600 hover:text-white transition"
        >
          Approve
        </button>
      );
    }
    return (
      <button
        onClick={(e) => {
          e.stopPropagation();
          setSelectedInvoice(inv);
        }}
        className="px-2.5 py-1 text-xs font-semibold rounded-md bg-slate-100 text-slate-700 hover:bg-slate-200 transition"
      >
        View
      </button>
    );
  };

  return (
    <div className="space-y-6">
      {/* Standardized Page Header */}
      <PageHeader
        eyebrow="Accounts Payable"
        title="Invoices"
        description="Track, filter, and process all accounts payable invoices."
      >
        <button
          onClick={() => setIsModalOpen(true)}
          className="px-3.5 py-2 text-xs font-semibold rounded-lg bg-sky-600 text-white hover:bg-sky-700 transition shadow-xs flex items-center gap-1.5"
        >
          <Plus className="w-4 h-4" />
          Create Invoice
        </button>
      </PageHeader>

      {/* Filters & Search */}
      <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs flex flex-col md:flex-row gap-3 items-center justify-between">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            placeholder="Search invoice #, vendor, PO..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-sky-500 outline-none"
          />
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto overflow-x-auto">
          <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            Status:
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="text-xs border border-slate-300 rounded-lg px-2.5 py-1.5 bg-white text-slate-700 focus:ring-2 focus:ring-sky-500 outline-none"
          >
            <option value="">All Statuses</option>
            <option value="PENDING_VERIFICATION">Pending Verification</option>
            <option value="VERIFIED">Verified</option>
            <option value="EXCEPTION">Exception</option>
            <option value="APPROVED">Approved</option>
            <option value="SCHEDULED">Scheduled</option>
            <option value="PAID">Paid</option>
            <option value="RECONCILED">Reconciled</option>
            <option value="REJECTED">Rejected</option>
          </select>

          <select
            value={dueFilter}
            onChange={(e) => setDueFilter(e.target.value)}
            className="text-xs border border-slate-300 rounded-lg px-2.5 py-1.5 bg-white text-slate-700 focus:ring-2 focus:ring-sky-500 outline-none"
          >
            <option value="">All Dates</option>
            <option value="overdue">Overdue Only</option>
            <option value="due_soon">Due within 7 Days</option>
          </select>
        </div>
      </div>

      {/* Clean Invoice Table */}
      <div className="bg-white rounded-xl border border-slate-200/90 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/70 border-b border-slate-200 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                <th className="py-3 px-4">Invoice</th>
                <th className="py-3 px-4">Vendor</th>
                <th className="py-3 px-4 text-right">Amount</th>
                <th className="py-3 px-4">Due Date</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {loading ? (
                <tr>
                  <td colSpan="6" className="py-12 text-center text-slate-400 animate-pulse">
                    Loading invoices...
                  </td>
                </tr>
              ) : invoices.length === 0 ? (
                <tr>
                  <td colSpan="6" className="py-8">
                    <EmptyState
                      title="No invoices found"
                      description="No invoices match your current search or filter criteria."
                      actionLabel="Create Invoice"
                      onAction={() => setIsModalOpen(true)}
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
                      <div className="font-mono font-bold text-sky-800">
                        {inv.invoice_number}
                      </div>
                      <div className="text-[10px] text-slate-400 font-mono">
                        {inv.po_number ? `PO: ${inv.po_number}` : 'No PO'}
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-slate-900">{inv.vendor_name}</div>
                      <div className="text-[10px] text-slate-400 font-mono">{inv.vendor_code}</div>
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono font-bold text-slate-900">
                      {formatINR(inv.total_amount)}
                    </td>
                    <td className="py-3.5 px-4">
                      <div className={`font-medium ${new Date(inv.due_date) < new Date() && inv.payment_status !== 'PAID' ? 'text-rose-600 font-bold' : 'text-slate-700'}`}>
                        {formatDate(inv.due_date)}
                      </div>
                      <div className="text-[10px] text-slate-400">
                        Inv: {formatDate(inv.invoice_date)}
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <Badge status={inv.status} size="xs" />
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      {getActionButton(inv)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Invoice Detail Slide-over Drawer */}
      <Drawer
        isOpen={Boolean(selectedInvoice)}
        onClose={() => setSelectedInvoice(null)}
        title={`Invoice #${selectedInvoice?.invoice_number}`}
        subtitle={selectedInvoice?.vendor_name}
        badge={selectedInvoice && <Badge status={selectedInvoice.status} size="xs" />}
        footer={
          <>
            <button
              onClick={() => setSelectedInvoice(null)}
              className="px-3 py-1.5 text-xs font-medium text-slate-600 hover:text-slate-800"
            >
              Close
            </button>
            <button
              onClick={() => navigate(`/invoices/${selectedInvoice?.id}`)}
              className="px-3.5 py-1.5 text-xs font-semibold rounded-lg bg-sky-600 text-white hover:bg-sky-700 transition flex items-center gap-1.5"
            >
              Full Dossier
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </>
        }
      >
        {selectedInvoice && (
          <div className="space-y-5 text-xs">
            {/* Amount Summary Card */}
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2">
              <div className="flex justify-between text-slate-500">
                <span>Taxable Subtotal:</span>
                <span className="font-mono font-semibold text-slate-800">
                  {formatINR(selectedInvoice.amount)}
                </span>
              </div>
              <div className="flex justify-between text-slate-500">
                <span>GST (18%):</span>
                <span className="font-mono font-semibold text-slate-800">
                  {formatINR(selectedInvoice.tax_amount)}
                </span>
              </div>
              <div className="flex justify-between text-sm font-bold text-slate-900 border-t border-slate-200 pt-2">
                <span>Total Amount:</span>
                <span className="font-mono text-sky-700">
                  {formatINR(selectedInvoice.total_amount)}
                </span>
              </div>
            </div>

            {/* Key Information */}
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-3 rounded-lg border border-slate-100 bg-white">
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Purchase Order</span>
                <span className="font-mono font-semibold text-slate-800 mt-0.5 block">
                  {selectedInvoice.po_number || 'None'}
                </span>
              </div>
              <div className="p-3 rounded-lg border border-slate-100 bg-white">
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Payment Terms</span>
                <span className="font-semibold text-slate-800 mt-0.5 block">
                  Net {selectedInvoice.payment_terms_days || 30} Days
                </span>
              </div>
              <div className="p-3 rounded-lg border border-slate-100 bg-white">
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Invoice Date</span>
                <span className="text-slate-800 mt-0.5 block">
                  {formatDate(selectedInvoice.invoice_date)}
                </span>
              </div>
              <div className="p-3 rounded-lg border border-slate-100 bg-white">
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Payment Due</span>
                <span className="font-semibold text-slate-800 mt-0.5 block">
                  {formatDate(selectedInvoice.due_date)}
                </span>
              </div>
            </div>

            {/* Status Breakdown */}
            <div className="p-3.5 rounded-lg border border-slate-200 bg-white space-y-2">
              <div className="flex justify-between">
                <span className="text-slate-500">Verification Status:</span>
                <span className="font-semibold text-slate-800">{selectedInvoice.verification_status || 'PENDING'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Approval Status:</span>
                <span className="font-semibold text-slate-800">{selectedInvoice.approval_status || 'PENDING'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Payment Status:</span>
                <span className="font-semibold text-slate-800">{selectedInvoice.payment_status || 'UNPAID'}</span>
              </div>
            </div>

            {/* Description */}
            {selectedInvoice.description && (
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">
                  Description / Service Line
                </span>
                <p className="p-3 rounded-lg bg-slate-50 text-slate-700 leading-relaxed border border-slate-200">
                  {selectedInvoice.description}
                </p>
              </div>
            )}
          </div>
        )}
      </Drawer>

      {/* Create Invoice Modal with Real-Time Duplicate Warning */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Create New Vendor Invoice"
        subtitle="Submit vendor invoice into the AP lifecycle pipeline"
        maxWidth="max-w-3xl"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          {duplicateWarning && (
            <div className="p-3.5 rounded-lg bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-start gap-2.5">
              <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
              <div>
                <span className="font-bold block">Duplicate Check Alert</span>
                {duplicateWarning}
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
                Select Vendor *
              </label>
              <select
                required
                value={formData.vendor_id}
                onChange={(e) => setFormData({ ...formData, vendor_id: e.target.value })}
                className="mt-1 block w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-sky-500 outline-none"
              >
                <option value="">-- Choose Vendor --</option>
                {vendors.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.name} ({v.vendor_code} · {v.gstin})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
                Invoice Number *
              </label>
              <input
                type="text"
                required
                placeholder="e.g. TCS/2026/102"
                value={formData.invoice_number}
                onChange={(e) => setFormData({ ...formData, invoice_number: e.target.value })}
                className="mt-1 block w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-sky-500 outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
                Invoice Date *
              </label>
              <input
                type="date"
                required
                value={formData.invoice_date}
                onChange={(e) => setFormData({ ...formData, invoice_date: e.target.value })}
                className="mt-1 block w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-sky-500 outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
                Due Date *
              </label>
              <input
                type="date"
                required
                value={formData.due_date}
                onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                className="mt-1 block w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-sky-500 outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
                Purchase Order #
              </label>
              <input
                type="text"
                placeholder="PO-2026-1150"
                value={formData.po_number}
                onChange={(e) => setFormData({ ...formData, po_number: e.target.value })}
                className="mt-1 block w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-sky-500 outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-slate-50 p-3.5 rounded-lg border border-slate-200">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
                Subtotal (INR ₹) *
              </label>
              <input
                type="number"
                step="0.01"
                required
                placeholder="100000"
                value={formData.amount}
                onChange={(e) => handleAmountChange(e.target.value)}
                className="mt-1 block w-full px-3 py-2 text-xs font-mono font-bold border border-slate-300 rounded-lg focus:ring-2 focus:ring-sky-500 outline-none bg-white"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
                GST (18% Auto) ₹
              </label>
              <input
                type="number"
                step="0.01"
                value={formData.tax_amount}
                onChange={(e) => setFormData({ ...formData, tax_amount: e.target.value })}
                className="mt-1 block w-full px-3 py-2 text-xs font-mono border border-slate-300 rounded-lg focus:ring-2 focus:ring-sky-500 outline-none bg-white"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
                Total Amount (INR ₹)
              </label>
              <input
                type="number"
                step="0.01"
                value={formData.total_amount}
                onChange={(e) => setFormData({ ...formData, total_amount: e.target.value })}
                className="mt-1 block w-full px-3 py-2 text-xs font-mono font-bold text-sky-800 border border-slate-300 rounded-lg focus:ring-2 focus:ring-sky-500 outline-none bg-sky-50/50"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
              Description
            </label>
            <textarea
              rows="2"
              placeholder="e.g. Enterprise Cloud Hosting & Infrastructure Renewal for Q3"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="mt-1 block w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-sky-500 outline-none"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="px-4 py-2 text-xs font-medium text-slate-600 hover:text-slate-800"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-2 text-xs font-semibold rounded-lg bg-sky-600 text-white hover:bg-sky-700 disabled:opacity-50 transition shadow-sm"
            >
              {submitting ? 'Submitting...' : 'Create Invoice Record'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default InvoiceListPage;
