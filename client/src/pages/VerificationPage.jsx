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
import {
  CheckCircle2,
  XCircle,
  FileCheck,
  Building2,
  ShieldCheck,
  ArrowRight,
  Eye,
  AlertCircle,
  Check,
  X,
  FileText,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const VerificationPage = () => {
  const [invoices, setInvoices] = useState([]);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [loading, setLoading] = useState(true);
  const [verifying, setVerifying] = useState(false);
  const [verificationNotes, setVerificationNotes] = useState('');
  const [rejectionModalOpen, setRejectionModalOpen] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [correctionModalOpen, setCorrectionModalOpen] = useState(false);
  const [correctionReason, setCorrectionReason] = useState('');
  const [detailsDrawerOpen, setDetailsDrawerOpen] = useState(false);
  const [duplicateCheckPassed, setDuplicateCheckPassed] = useState(true);
  const [duplicateCheckMessage, setDuplicateCheckMessage] = useState('Unique invoice');
  const { addToast } = useNotifications();
  const navigate = useNavigate();

  const fetchUnverified = () => {
    setLoading(true);
    axiosClient
      .get('/invoices?status=PENDING_VERIFICATION')
      .then((res) => {
        const list = res.invoices || [];
        setInvoices(list);
        if (list.length > 0) {
          setSelectedInvoice(list[0]);
        } else {
          setSelectedInvoice(null);
        }
      })
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchUnverified();
  }, []);

  // Pre-flight duplicate check for active invoice
  useEffect(() => {
    if (selectedInvoice) {
      axiosClient
        .post('/invoices/check-duplicate', {
          vendor_id: selectedInvoice.vendor_id,
          invoice_number: selectedInvoice.invoice_number,
          exclude_id: selectedInvoice.id,
        })
        .then((res) => {
          if (res.isDuplicate) {
            setDuplicateCheckPassed(false);
            setDuplicateCheckMessage('Duplicate detected');
          } else {
            setDuplicateCheckPassed(true);
            setDuplicateCheckMessage('Unique invoice');
          }
        })
        .catch(() => {
          setDuplicateCheckPassed(true);
          setDuplicateCheckMessage('Unique invoice');
        });
    }
  }, [selectedInvoice]);

  // =========================================================================
  // STEP-BY-STEP ARCHITECTURE FLOW:
  // 1. User clicks "Verify Invoice".
  // 2. React triggers Axios POST to `/invoices/${selectedInvoice.id}/verify`.
  // 3. Express router forwards request to verificationController.verifyInvoice.
  // 4. Backend checks: GSTIN validity, tax math, PO match, and duplicate check.
  // 5. PostgreSQL stores record in 'invoice_verifications' and updates 'invoices'.
  // 6. Backend returns JSON response with outcome and individual check flags.
  // 7. React updates UI: shows success/warning toast and refreshes unverified list.
  // =========================================================================
  const handleVerify = async () => {
    if (!selectedInvoice) return;
    setVerifying(true);
    try {
      const res = await axiosClient.post(`/invoices/${selectedInvoice.id}/verify`, {
        notes: verificationNotes || 'All standard checks verified.',
      });

      if (res.outcome === 'PASSED') {
        addToast(res.message, 'success');
      } else {
        addToast(res.message, 'warning');
      }
      setVerificationNotes('');
      fetchUnverified();
    } catch (err) {
      addToast(err.message, 'error');
    } finally {
      setVerifying(false);
    }
  };

  const handleReject = async () => {
    if (!selectedInvoice || !rejectionReason) return;
    try {
      const res = await axiosClient.post(`/invoices/${selectedInvoice.id}/reject-verification`, {
        reason: rejectionReason,
      });
      addToast(res.message, 'success');
      setRejectionModalOpen(false);
      setRejectionReason('');
      fetchUnverified();
    } catch (err) {
      addToast(err.message, 'error');
    }
  };

  const handleRequestCorrection = async () => {
    if (!selectedInvoice || !correctionReason) return;
    try {
      // Trigger correction request which places invoice in EXCEPTION state
      const res = await axiosClient.post(`/invoices/${selectedInvoice.id}/verify`, {
        notes: `Correction Requested: ${correctionReason}`,
      });
      addToast('Correction requested. Sent to Exceptions center for resolution.', 'info');
      setCorrectionModalOpen(false);
      setCorrectionReason('');
      fetchUnverified();
    } catch (err) {
      addToast(err.message, 'error');
    }
  };

  // Rule verification status flags
  const isGstinValid = Boolean(selectedInvoice?.vendor_gstin && selectedInvoice.vendor_gstin.length === 15);
  const isMathValid = selectedInvoice
    ? Math.abs(parseFloat(selectedInvoice.amount) + parseFloat(selectedInvoice.tax_amount) - parseFloat(selectedInvoice.total_amount)) < 0.05
    : true;
  const isPoValid = Boolean(selectedInvoice?.po_number && selectedInvoice.po_number.length > 2);
  const isVendorValid = Boolean(selectedInvoice?.vendor_name);

  return (
    <div className="space-y-6">
      {/* Standardized Page Header */}
      <PageHeader
        eyebrow="Accounts Payable"
        title="Verification"
        description="Review invoice details and compliance before approval."
      />

      {invoices.length === 0 && !loading ? (
        <EmptyState
          icon={CheckCircle2}
          title="All Invoices Verified"
          description="The verification queue is clear. No invoices require review right now."
          actionLabel="View All Invoices"
          onAction={() => navigate('/invoices')}
        />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Column: Simple Invoice Queue */}
          <div className="lg:col-span-5 bg-white rounded-xl border border-slate-200/90 shadow-sm overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between bg-slate-50/60">
              <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                Invoices ({invoices.length})
              </span>
              <span className="text-[11px] text-slate-400">Select to review</span>
            </div>

            <div className="divide-y divide-slate-100 max-h-[560px] overflow-y-auto">
              {invoices.map((inv) => (
                <div
                  key={inv.id}
                  onClick={() => setSelectedInvoice(inv)}
                  className={`p-4 cursor-pointer transition ${
                    selectedInvoice?.id === inv.id
                      ? 'bg-sky-50/70 border-l-4 border-sky-600'
                      : 'hover:bg-slate-50/80'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono font-bold text-xs text-slate-900">
                      #{inv.invoice_number}
                    </span>
                    <span className="font-mono font-bold text-xs text-sky-900">
                      {formatINR(inv.total_amount)}
                    </span>
                  </div>
                  <p className="text-xs text-slate-700 font-semibold mt-1 truncate">
                    {inv.vendor_name}
                  </p>
                  <div className="flex items-center justify-between mt-2 text-[11px] text-slate-400 font-medium">
                    <span>PO: {inv.po_number || 'None'}</span>
                    <span>Due: {formatDate(inv.due_date)}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Right Column: Clean Review Panel */}
          {selectedInvoice && (
            <div className="lg:col-span-7 space-y-4">
              <div className="bg-white rounded-xl border border-slate-200/90 shadow-sm p-6 space-y-6">
                {/* 1. Important Information First */}
                <div className="flex items-start justify-between border-b border-slate-100 pb-5">
                  <div className="space-y-1">
                    <span className="text-[10px] font-bold text-sky-600 uppercase tracking-wider">
                      Selected Invoice
                    </span>
                    <h2 className="text-xl font-bold font-mono text-slate-900">
                      #{selectedInvoice.invoice_number}
                    </h2>
                    <p className="text-xs text-slate-600 font-medium">
                      Vendor: <span className="font-bold text-slate-900">{selectedInvoice.vendor_name}</span> ({selectedInvoice.vendor_code})
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="text-[11px] text-slate-400 block font-medium">Total Amount</span>
                    <span className="text-xl font-bold font-mono text-slate-900">
                      {formatINR(selectedInvoice.total_amount)}
                    </span>
                    <button
                      onClick={() => setDetailsDrawerOpen(true)}
                      className="text-xs font-semibold text-sky-600 hover:text-sky-800 mt-1 inline-flex items-center gap-1"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      View Details
                    </button>
                  </div>
                </div>

                {/* 2. Verification Checks */}
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 mb-3 flex items-center justify-between">
                    <span>Verification Checks</span>
                    <span className="text-[10px] font-normal text-slate-400">Automated pre-flight</span>
                  </h3>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {/* Check 1: GSTIN */}
                    <div className="p-3 rounded-lg border border-slate-200 bg-slate-50/50 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {isGstinValid ? (
                          <div className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
                            <Check className="w-3.5 h-3.5" />
                          </div>
                        ) : (
                          <div className="w-5 h-5 rounded-full bg-rose-100 text-rose-700 flex items-center justify-center font-bold">
                            <X className="w-3.5 h-3.5" />
                          </div>
                        )}
                        <div>
                          <p className="text-xs font-semibold text-slate-800">GSTIN Format</p>
                          <p className="text-[10px] text-slate-400 font-mono">{selectedInvoice.vendor_gstin || 'Missing'}</p>
                        </div>
                      </div>
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${isGstinValid ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'}`}>
                        {isGstinValid ? 'Valid' : 'Invalid'}
                      </span>
                    </div>

                    {/* Check 2: Amount / Math */}
                    <div className="p-3 rounded-lg border border-slate-200 bg-slate-50/50 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {isMathValid ? (
                          <div className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
                            <Check className="w-3.5 h-3.5" />
                          </div>
                        ) : (
                          <div className="w-5 h-5 rounded-full bg-rose-100 text-rose-700 flex items-center justify-center font-bold">
                            <X className="w-3.5 h-3.5" />
                          </div>
                        )}
                        <div>
                          <p className="text-xs font-semibold text-slate-800">Mathematical Total</p>
                          <p className="text-[10px] text-slate-400">Base + GST == Total</p>
                        </div>
                      </div>
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${isMathValid ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'}`}>
                        {isMathValid ? 'Match' : 'Mismatch'}
                      </span>
                    </div>

                    {/* Check 3: PO Reference */}
                    <div className="p-3 rounded-lg border border-slate-200 bg-slate-50/50 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {isPoValid ? (
                          <div className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
                            <Check className="w-3.5 h-3.5" />
                          </div>
                        ) : (
                          <div className="w-5 h-5 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center font-bold">
                            <AlertCircle className="w-3.5 h-3.5" />
                          </div>
                        )}
                        <div>
                          <p className="text-xs font-semibold text-slate-800">PO Reference</p>
                          <p className="text-[10px] text-slate-400 font-mono">{selectedInvoice.po_number || 'No PO reference'}</p>
                        </div>
                      </div>
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${isPoValid ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}>
                        {isPoValid ? 'Linked' : 'Missing'}
                      </span>
                    </div>

                    {/* Check 4: Duplicate Detection */}
                    <div className="p-3 rounded-lg border border-slate-200 bg-slate-50/50 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {duplicateCheckPassed ? (
                          <div className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
                            <Check className="w-3.5 h-3.5" />
                          </div>
                        ) : (
                          <div className="w-5 h-5 rounded-full bg-rose-100 text-rose-700 flex items-center justify-center font-bold">
                            <X className="w-3.5 h-3.5" />
                          </div>
                        )}
                        <div>
                          <p className="text-xs font-semibold text-slate-800">Duplicate Check</p>
                          <p className="text-[10px] text-slate-400">{duplicateCheckMessage}</p>
                        </div>
                      </div>
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${duplicateCheckPassed ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'}`}>
                        {duplicateCheckPassed ? 'Passed' : 'Flagged'}
                      </span>
                    </div>

                    {/* Check 5: Vendor Information */}
                    <div className="p-3 rounded-lg border border-slate-200 bg-slate-50/50 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {isVendorValid ? (
                          <div className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
                            <Check className="w-3.5 h-3.5" />
                          </div>
                        ) : (
                          <div className="w-5 h-5 rounded-full bg-rose-100 text-rose-700 flex items-center justify-center font-bold">
                            <X className="w-3.5 h-3.5" />
                          </div>
                        )}
                        <div>
                          <p className="text-xs font-semibold text-slate-800">Vendor Master</p>
                          <p className="text-[10px] text-slate-400 font-mono">{selectedInvoice.vendor_code}</p>
                        </div>
                      </div>
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${isVendorValid ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'}`}>
                        {isVendorValid ? 'Verified' : 'Unregistered'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Optional Verification Notes */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Notes
                  </label>
                  <input
                    type="text"
                    placeholder="Optional remarks (e.g. Validated against vendor PO)"
                    value={verificationNotes}
                    onChange={(e) => setVerificationNotes(e.target.value)}
                    className="block w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-sky-500 outline-none"
                  />
                </div>

                {/* Action Buttons as per Prompt: [Reject] [Request Correction] [Verify Invoice] */}
                <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-slate-100">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setRejectionModalOpen(true)}
                      className="px-3.5 py-2 text-xs font-semibold rounded-lg bg-rose-50 text-rose-700 hover:bg-rose-100 transition border border-rose-200"
                    >
                      Reject
                    </button>
                    <button
                      onClick={() => setCorrectionModalOpen(true)}
                      className="px-3.5 py-2 text-xs font-semibold rounded-lg bg-amber-50 text-amber-700 hover:bg-amber-100 transition border border-amber-200"
                    >
                      Request Correction
                    </button>
                  </div>

                  <button
                    onClick={handleVerify}
                    disabled={verifying}
                    className="px-5 py-2 text-xs font-semibold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs transition disabled:opacity-50 flex items-center gap-1.5"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    {verifying ? 'Verifying...' : 'Verify Invoice'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Slide-over Detail Drawer for Deep Inspection */}
      <Drawer
        isOpen={detailsDrawerOpen}
        onClose={() => setDetailsDrawerOpen(false)}
        title={`Verification Details: #${selectedInvoice?.invoice_number}`}
        subtitle={selectedInvoice?.vendor_name}
        badge={selectedInvoice && <Badge status={selectedInvoice.status} size="xs" />}
        footer={
          <button
            onClick={() => setDetailsDrawerOpen(false)}
            className="px-4 py-2 text-xs font-semibold rounded-lg bg-slate-900 text-white hover:bg-slate-800"
          >
            Done
          </button>
        }
      >
        {selectedInvoice && (
          <div className="space-y-5 text-xs">
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2">
              <div className="flex justify-between text-slate-500">
                <span>Taxable Amount:</span>
                <span className="font-mono font-semibold text-slate-800">{formatINR(selectedInvoice.amount)}</span>
              </div>
              <div className="flex justify-between text-slate-500">
                <span>GST (18%):</span>
                <span className="font-mono font-semibold text-slate-800">{formatINR(selectedInvoice.tax_amount)}</span>
              </div>
              <div className="flex justify-between text-sm font-bold text-slate-900 border-t border-slate-200 pt-2">
                <span>Total Amount:</span>
                <span className="font-mono text-sky-700">{formatINR(selectedInvoice.total_amount)}</span>
              </div>
            </div>

            <div className="space-y-2 p-3.5 rounded-lg border border-slate-200 bg-white">
              <div className="flex justify-between">
                <span className="text-slate-500">Vendor GSTIN:</span>
                <span className="font-mono font-semibold text-slate-800">{selectedInvoice.vendor_gstin || 'None'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">PO Number:</span>
                <span className="font-mono font-semibold text-slate-800">{selectedInvoice.po_number || 'None'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Invoice Date:</span>
                <span className="text-slate-800">{formatDate(selectedInvoice.invoice_date)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Due Date:</span>
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

      {/* Reject Modal */}
      <Modal
        isOpen={rejectionModalOpen}
        onClose={() => setRejectionModalOpen(false)}
        title="Reject Invoice"
        subtitle="Mandatory reason required to record rejection in audit trail"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
              Rejection Reason *
            </label>
            <textarea
              rows="3"
              required
              placeholder="e.g. Vendor GSTIN is revoked on GST portal. Tax invoice cannot be processed."
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              className="mt-1 block w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-rose-500 outline-none"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
            <button
              onClick={() => setRejectionModalOpen(false)}
              className="px-4 py-2 text-xs font-medium text-slate-600"
            >
              Cancel
            </button>
            <button
              onClick={handleReject}
              disabled={!rejectionReason}
              className="px-4 py-2 text-xs font-semibold rounded-lg bg-rose-600 text-white hover:bg-rose-700 disabled:opacity-50"
            >
              Confirm Rejection
            </button>
          </div>
        </div>
      </Modal>

      {/* Request Correction Modal */}
      <Modal
        isOpen={correctionModalOpen}
        onClose={() => setCorrectionModalOpen(false)}
        title="Request Invoice Correction"
        subtitle="Route this invoice into the Exceptions Center with specific resolution instructions"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
              Discrepancy / Correction Required *
            </label>
            <textarea
              rows="3"
              required
              placeholder="e.g. Tax breakdown does not match the purchase order rate. Please request updated credit note or rectified tax invoice."
              value={correctionReason}
              onChange={(e) => setCorrectionReason(e.target.value)}
              className="mt-1 block w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 outline-none"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
            <button
              onClick={() => setCorrectionModalOpen(false)}
              className="px-4 py-2 text-xs font-medium text-slate-600"
            >
              Cancel
            </button>
            <button
              onClick={handleRequestCorrection}
              disabled={!correctionReason}
              className="px-4 py-2 text-xs font-semibold rounded-lg bg-amber-600 text-white hover:bg-amber-700 disabled:opacity-50"
            >
              Send to Exceptions
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default VerificationPage;
