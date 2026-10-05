import React, { useEffect, useState } from 'react';
import axiosClient from '../api/axiosClient';
import PageHeader from '../components/common/PageHeader';
import { formatINR } from '../utils/currency';
import {
  BarChart3,
  Download,
  Calendar,
  Building2,
  AlertTriangle,
  CreditCard,
  TrendingDown,
  TrendingUp,
} from 'lucide-react';
import { useNotifications } from '../context/NotificationContext';

export const ReportsPage = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const { addToast } = useNotifications();

  useEffect(() => {
    axiosClient
      .get('/reports/summary')
      .then((res) => setData(res))
      .catch((err) => console.error('Failed to load reports:', err))
      .finally(() => setLoading(false));
  }, []);

  const handleExportCSV = () => {
    if (!data?.vendorSpend) return;
    const headers = ['Vendor Code', 'Vendor Name', 'Invoice Count', 'Total Spend (INR)', 'Paid Spend (INR)', 'Outstanding (INR)'];
    const rows = data.vendorSpend.map((v) => [
      v.vendor_code,
      `"${v.vendor_name}"`,
      v.invoice_count,
      v.total_spend,
      v.paid_spend,
      v.outstanding_spend,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `AP_Spend_Report_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    addToast('Spend report exported to CSV successfully.', 'success');
  };

  if (loading) {
    return <div className="p-12 text-center text-xs text-slate-400 animate-pulse">Generating reports...</div>;
  }

  const { vendorSpend = [], aging, paymentMethods = [], exceptionMetrics } = data || {};

  const maxSpend = Math.max(...vendorSpend.map((v) => parseFloat(v.total_spend) || 0), 1);

  return (
    <div className="space-y-6">
      {/* Standardized Page Header */}
      <PageHeader
        eyebrow="Accounts Payable"
        title="Reports"
        description="Accounts payable aging, spend analysis, and disbursement trends."
      >
        <button
          onClick={handleExportCSV}
          className="px-3.5 py-2 text-xs font-semibold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white transition shadow-xs flex items-center gap-1.5"
        >
          <Download className="w-3.5 h-3.5" />
          Export CSV
        </button>
      </PageHeader>

      {/* AP Aging Schedule KPI Cards */}
      <div className="bg-white rounded-xl border border-slate-200/90 shadow-sm p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-2">
            <Calendar className="w-4 h-4 text-sky-600" />
            Accounts Payable Aging Schedule
          </h3>
          <span className="text-[10px] text-slate-400 font-medium">Unpaid Liabilities</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <div className="p-3.5 rounded-lg border border-emerald-200 bg-emerald-50/40 text-xs">
            <span className="text-[10px] font-bold uppercase text-emerald-800 block">Current</span>
            <span className="font-mono font-bold text-lg text-emerald-900 mt-1 block">
              {formatINR(aging?.current_amount || 0)}
            </span>
            <span className="text-slate-500 text-[11px] block mt-0.5">{aging?.current_count || 0} Invoices</span>
          </div>

          <div className="p-3.5 rounded-lg border border-amber-200 bg-amber-50/40 text-xs">
            <span className="text-[10px] font-bold uppercase text-amber-800 block">1 - 30 Days Overdue</span>
            <span className="font-mono font-bold text-lg text-amber-900 mt-1 block">
              {formatINR(aging?.overdue_1_30_amount || 0)}
            </span>
            <span className="text-slate-500 text-[11px] block mt-0.5">{aging?.overdue_1_30_count || 0} Invoices</span>
          </div>

          <div className="p-3.5 rounded-lg border border-orange-200 bg-orange-50/40 text-xs">
            <span className="text-[10px] font-bold uppercase text-orange-800 block">31 - 60 Days Overdue</span>
            <span className="font-mono font-bold text-lg text-orange-900 mt-1 block">
              {formatINR(aging?.overdue_31_60_amount || 0)}
            </span>
            <span className="text-slate-500 text-[11px] block mt-0.5">{aging?.overdue_31_60_count || 0} Invoices</span>
          </div>

          <div className="p-3.5 rounded-lg border border-rose-200 bg-rose-50/40 text-xs">
            <span className="text-[10px] font-bold uppercase text-rose-800 block">60+ Days Overdue</span>
            <span className="font-mono font-bold text-lg text-rose-900 mt-1 block">
              {formatINR(aging?.overdue_60_plus_amount || 0)}
            </span>
            <span className="text-slate-500 text-[11px] block mt-0.5">{aging?.overdue_60_plus_count || 0} Invoices</span>
          </div>
        </div>
      </div>

      {/* Two Column Grid: Vendor Spend vs Payment Methods */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Vendor Spend Table */}
        <div className="lg:col-span-8 bg-white rounded-xl border border-slate-200/90 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/60">
            <span className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
              <Building2 className="w-4 h-4 text-sky-600" />
              Vendor Spend & Liability Breakdown
            </span>
            <span className="text-[11px] text-slate-400">Sorted by Volume</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50/50 border-b border-slate-200 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                  <th className="py-2.5 px-4">Vendor</th>
                  <th className="py-2.5 px-4 text-center">Invoices</th>
                  <th className="py-2.5 px-4 text-right">Total Invoiced</th>
                  <th className="py-2.5 px-4 text-right">Paid</th>
                  <th className="py-2.5 px-4 text-right">Outstanding</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {vendorSpend.map((v, i) => {
                  const spendPct = Math.round((parseFloat(v.total_spend) / maxSpend) * 100);

                  return (
                    <tr key={i} className="hover:bg-slate-50/60 transition">
                      <td className="py-3 px-4">
                        <div className="font-semibold text-slate-900">{v.vendor_name}</div>
                        <div className="w-32 bg-slate-100 h-1.5 rounded-full mt-1.5 overflow-hidden">
                          <div
                            className="bg-sky-600 h-full rounded-full"
                            style={{ width: `${spendPct}%` }}
                          />
                        </div>
                      </td>
                      <td className="py-3 px-4 text-center text-slate-600 font-medium">{v.invoice_count}</td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-slate-900">
                        {formatINR(v.total_spend)}
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-emerald-700">
                        {formatINR(v.paid_spend)}
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-amber-700">
                        {formatINR(v.outstanding_spend)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right Column: Payment Methods & Exceptions */}
        <div className="lg:col-span-4 space-y-6">
          {/* Payment Method Distribution */}
          <div className="bg-white rounded-xl border border-slate-200/90 shadow-sm p-5 space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-sky-600" />
              Disbursement Transfer Modes
            </h3>

            <div className="space-y-2.5 text-xs">
              {paymentMethods.map((m, idx) => (
                <div key={idx} className="flex items-center justify-between p-2.5 rounded-lg bg-slate-50 border border-slate-200">
                  <div>
                    <span className="font-bold text-slate-800">{m.payment_method}</span>
                    <span className="text-[11px] text-slate-400 block">{m.count} Transactions</span>
                  </div>
                  <span className="font-mono font-bold text-sky-900">{formatINR(m.total_amount)}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Exception Resolution SLA Stats */}
          <div className="bg-white rounded-xl border border-slate-200/90 shadow-sm p-5 space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-600" />
              Exception Resolution Metrics
            </h3>

            <div className="space-y-2 text-xs">
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-500">Total Flagged Discrepancies</span>
                <span className="font-bold text-slate-800">{exceptionMetrics?.total_exceptions || 0}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-500">Successfully Resolved</span>
                <span className="font-bold text-emerald-700">{exceptionMetrics?.resolved_exceptions || 0}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-500">Active Bottlenecks</span>
                <span className="font-bold text-rose-700">{exceptionMetrics?.open_exceptions || 0}</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-slate-500">Critical Priority Issues</span>
                <span className="font-bold text-rose-800">{exceptionMetrics?.critical_count || 0}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReportsPage;
