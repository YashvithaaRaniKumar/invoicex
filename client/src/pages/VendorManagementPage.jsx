import React, { useEffect, useState } from 'react';
import axiosClient from '../api/axiosClient';
import PageHeader from '../components/common/PageHeader';
import Modal from '../components/common/Modal';
import Drawer from '../components/common/Drawer';
import EmptyState from '../components/common/EmptyState';
import { formatINR } from '../utils/currency';
import { formatDate } from '../utils/date';
import { useNotifications } from '../context/NotificationContext';
import {
  Building2,
  Plus,
  Search,
  Eye,
  ExternalLink,
  CreditCard,
  Mail,
  Phone,
  CheckCircle2,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const VendorManagementPage = () => {
  const [vendors, setVendors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedVendor, setSelectedVendor] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    gstin: '',
    pan: '',
    address: '',
    bank_account_number: '',
    bank_ifsc: '',
    bank_name: 'HDFC Bank',
    payment_terms_days: 30,
  });
  const [submitting, setSubmitting] = useState(false);
  const { addToast } = useNotifications();
  const navigate = useNavigate();

  const fetchVendors = () => {
    setLoading(true);
    axiosClient
      .get('/vendors', { params: { search } })
      .then((res) => setVendors(res.vendors || []))
      .catch((err) => console.error('Failed to load vendors:', err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchVendors();
  }, [search]);

  // =========================================================================
  // STEP-BY-STEP ARCHITECTURE FLOW:
  // 1. User fills vendor registration form (Name, GSTIN, PAN, Bank Details).
  // 2. React sends Axios POST to `/vendors` with vendor payload.
  // 3. Express router forwards request to vendorController.createVendor.
  // 4. Controller checks GSTIN uniqueness, derives PAN, and generates vendor code.
  // 5. PostgreSQL inserts row into 'vendors' table.
  // 6. Backend returns JSON response with created vendor details.
  // 7. React updates UI: closes modal, shows toast, and refreshes vendor directory.
  // =========================================================================
  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await axiosClient.post('/vendors', formData);
      addToast(res.message, 'success');
      setIsModalOpen(false);
      setFormData({
        name: '',
        email: '',
        phone: '',
        gstin: '',
        pan: '',
        address: '',
        bank_account_number: '',
        bank_ifsc: '',
        bank_name: 'HDFC Bank',
        payment_terms_days: 30,
      });
      fetchVendors();
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
        title="Vendors"
        description="Manage registered vendor profiles, GSTINs, and payment terms."
      >
        <button
          onClick={() => setIsModalOpen(true)}
          className="px-3.5 py-2 text-xs font-semibold rounded-lg bg-sky-600 text-white hover:bg-sky-700 transition shadow-xs flex items-center gap-1.5"
        >
          <Plus className="w-4 h-4" />
          Add Vendor
        </button>
      </PageHeader>

      {/* Search Bar */}
      <div className="bg-white p-3.5 rounded-xl border border-slate-200/90 shadow-xs flex items-center justify-between">
        <div className="relative w-full max-w-md">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            placeholder="Search vendor name, code, or GSTIN..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-sky-500 outline-none"
          />
        </div>
        <span className="text-xs text-slate-500 font-medium hidden sm:block">
          Total: <strong>{vendors.length} Vendors</strong>
        </span>
      </div>

      {/* Clean Table as requested in Section 14 */}
      <div className="bg-white rounded-xl border border-slate-200/90 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/70 border-b border-slate-200 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                <th className="py-3 px-4">Vendor</th>
                <th className="py-3 px-4">GSTIN</th>
                <th className="py-3 px-4">Payment Terms</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {loading ? (
                <tr>
                  <td colSpan="5" className="py-12 text-center text-slate-400 animate-pulse">
                    Loading vendors from PostgreSQL...
                  </td>
                </tr>
              ) : vendors.length === 0 ? (
                <tr>
                  <td colSpan="5" className="py-8">
                    <EmptyState
                      icon={Building2}
                      title="No Vendors Found"
                      description="No registered vendors match your search."
                      actionLabel="Add Vendor"
                      onAction={() => setIsModalOpen(true)}
                    />
                  </td>
                </tr>
              ) : (
                vendors.map((v) => (
                  <tr
                    key={v.id}
                    onClick={() => setSelectedVendor(v)}
                    className="hover:bg-slate-50/80 transition cursor-pointer"
                  >
                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-slate-900">{v.name}</div>
                      <div className="text-[10px] text-slate-400 font-mono">{v.vendor_code}</div>
                    </td>

                    <td className="py-3.5 px-4 font-mono font-semibold text-slate-800">
                      {v.gstin}
                    </td>

                    <td className="py-3.5 px-4 text-slate-700">
                      Net {v.payment_terms_days} Days
                    </td>

                    <td className="py-3.5 px-4">
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800">
                        {v.is_active ? 'ACTIVE' : 'INACTIVE'}
                      </span>
                    </td>

                    <td className="py-3.5 px-4 text-center" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          onClick={() => setSelectedVendor(v)}
                          className="px-2.5 py-1 text-xs font-semibold rounded-md bg-slate-100 text-slate-700 hover:bg-slate-200 transition"
                        >
                          View
                        </button>
                        <button
                          onClick={() => navigate(`/invoices?search=${encodeURIComponent(v.name)}`)}
                          className="px-2.5 py-1 text-xs font-semibold rounded-md bg-sky-50 text-sky-700 hover:bg-sky-600 hover:text-white transition flex items-center gap-1"
                        >
                          Invoices ({v.total_invoices || 0})
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

      {/* Slide-over Vendor Detail Drawer */}
      <Drawer
        isOpen={Boolean(selectedVendor)}
        onClose={() => setSelectedVendor(null)}
        title={selectedVendor?.name}
        subtitle={`Code: ${selectedVendor?.vendor_code} · Master Record`}
        badge={selectedVendor && (
          <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800">
            ACTIVE
          </span>
        )}
        footer={
          selectedVendor && (
            <div className="flex items-center justify-between w-full">
              <button
                onClick={() => setSelectedVendor(null)}
                className="px-3 py-1.5 text-xs font-medium text-slate-600"
              >
                Close
              </button>
              <button
                onClick={() => {
                  const name = selectedVendor.name;
                  setSelectedVendor(null);
                  navigate(`/invoices?search=${encodeURIComponent(name)}`);
                }}
                className="px-4 py-1.5 text-xs font-semibold rounded-lg bg-sky-600 text-white hover:bg-sky-700 flex items-center gap-1.5"
              >
                View Invoices ({selectedVendor.total_invoices || 0})
                <ExternalLink className="w-3.5 h-3.5" />
              </button>
            </div>
          )
        }
      >
        {selectedVendor && (
          <div className="space-y-5 text-xs">
            {/* Commercial Summary */}
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2">
              <div className="flex justify-between text-slate-500">
                <span>Invoices on File:</span>
                <span className="font-bold text-slate-900">{selectedVendor.total_invoices || 0}</span>
              </div>
              <div className="flex justify-between text-slate-500">
                <span>Total Billed Volume:</span>
                <span className="font-mono font-bold text-sky-800">
                  {formatINR(selectedVendor.total_billed_amount || 0)}
                </span>
              </div>
              <div className="flex justify-between text-slate-500">
                <span>Standard Credit Terms:</span>
                <span className="font-semibold text-slate-800">Net {selectedVendor.payment_terms_days} Days</span>
              </div>
            </div>

            {/* Statutory Details */}
            <div className="p-3.5 rounded-lg border border-slate-200 bg-white space-y-2">
              <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">
                Statutory Information
              </span>
              <div className="flex justify-between">
                <span className="text-slate-500">GSTIN:</span>
                <span className="font-mono font-bold text-slate-900">{selectedVendor.gstin}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">PAN:</span>
                <span className="font-mono font-semibold text-slate-800">{selectedVendor.pan || 'N/A'}</span>
              </div>
            </div>

            {/* Banking Details */}
            <div className="p-3.5 rounded-lg border border-slate-200 bg-white space-y-2">
              <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">
                Disbursement Bank Details
              </span>
              <div className="flex justify-between">
                <span className="text-slate-500">Bank Name:</span>
                <span className="font-semibold text-slate-800">{selectedVendor.bank_name || 'HDFC Bank'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Account #:</span>
                <span className="font-mono font-semibold text-slate-800">{selectedVendor.bank_account_number || '000405001290'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">IFSC Code:</span>
                <span className="font-mono font-semibold text-slate-800">{selectedVendor.bank_ifsc || 'HDFC0000004'}</span>
              </div>
            </div>

            {/* Contact Details */}
            {(selectedVendor.email || selectedVendor.phone || selectedVendor.address) && (
              <div className="p-3.5 rounded-lg border border-slate-200 bg-white space-y-2">
                <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">
                  Contact Information
                </span>
                {selectedVendor.email && (
                  <div className="flex justify-between">
                    <span className="text-slate-500">Email:</span>
                    <span className="text-slate-800 font-medium">{selectedVendor.email}</span>
                  </div>
                )}
                {selectedVendor.phone && (
                  <div className="flex justify-between">
                    <span className="text-slate-500">Phone:</span>
                    <span className="text-slate-800 font-medium">{selectedVendor.phone}</span>
                  </div>
                )}
                {selectedVendor.address && (
                  <div className="pt-1">
                    <span className="text-slate-500 block mb-0.5">Billing Address:</span>
                    <span className="text-slate-700 block">{selectedVendor.address}</span>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </Drawer>

      {/* Register Vendor Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Register New Vendor"
        subtitle="Ensure GSTIN compliance and verified bank details"
        maxWidth="max-w-2xl"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
                Vendor Name *
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Wipro Technologies Ltd"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="mt-1 block w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-sky-500 outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
                GSTIN (15-chars) *
              </label>
              <input
                type="text"
                required
                placeholder="e.g. 29AAACW1234F1Z8"
                maxLength={15}
                value={formData.gstin}
                onChange={(e) => setFormData({ ...formData, gstin: e.target.value.toUpperCase() })}
                className="mt-1 block w-full px-3 py-2 text-xs font-mono font-bold border border-slate-300 rounded-lg focus:ring-2 focus:ring-sky-500 outline-none uppercase"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
                Billing Email
              </label>
              <input
                type="email"
                placeholder="billing@wipro.com"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="mt-1 block w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-sky-500 outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
                Phone Number
              </label>
              <input
                type="text"
                placeholder="+91 80 2844 0011"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="mt-1 block w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-sky-500 outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-slate-50 p-3.5 rounded-lg border border-slate-200">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
                Bank Account #
              </label>
              <input
                type="text"
                placeholder="000405001290"
                value={formData.bank_account_number}
                onChange={(e) => setFormData({ ...formData, bank_account_number: e.target.value })}
                className="mt-1 block w-full px-3 py-2 text-xs font-mono border border-slate-300 rounded-lg focus:ring-2 focus:ring-sky-500 outline-none bg-white"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
                Bank IFSC
              </label>
              <input
                type="text"
                placeholder="HDFC0000004"
                maxLength={11}
                value={formData.bank_ifsc}
                onChange={(e) => setFormData({ ...formData, bank_ifsc: e.target.value.toUpperCase() })}
                className="mt-1 block w-full px-3 py-2 text-xs font-mono border border-slate-300 rounded-lg focus:ring-2 focus:ring-sky-500 outline-none bg-white uppercase"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
                Payment Terms (Days)
              </label>
              <input
                type="number"
                min={0}
                value={formData.payment_terms_days}
                onChange={(e) => setFormData({ ...formData, payment_terms_days: e.target.value })}
                className="mt-1 block w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-sky-500 outline-none bg-white"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="px-4 py-2 text-xs font-medium text-slate-600"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-2 text-xs font-semibold rounded-lg bg-sky-600 text-white hover:bg-sky-700 disabled:opacity-50 transition shadow-sm"
            >
              {submitting ? 'Registering...' : 'Save Vendor'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default VendorManagementPage;
