import React, { useEffect, useState } from 'react';
import axiosClient from '../api/axiosClient';
import PageHeader from '../components/common/PageHeader';
import StatCard from '../components/common/StatCard';
import Badge from '../components/common/Badge';
import { formatINR } from '../utils/currency';
import { formatDate, formatDeadline } from '../utils/date';
import { formatActorName } from '../utils/actor';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import {
  FileText,
  Clock,
  UserCheck,
  Calendar,
  AlertTriangle,
  ArrowRight,
  TrendingUp,
  Activity,
  ChevronDown,
  ChevronUp,
  Layers,
  CreditCard,
  CheckCircle2,
} from 'lucide-react';

export const DashboardPage = () => {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    axiosClient
      .get('/dashboard/stats')
      .then((res) => {
        setData(res);
      })
      .catch((err) => {
        console.error('Failed to load dashboard stats:', err);
      })
      .finally(() => setLoading(false));
  }, []);

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  };

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-10 bg-slate-200 rounded w-1/3"></div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-28 bg-slate-200 rounded-xl"></div>
          ))}
        </div>
      </div>
    );
  }

  const { stats, actionRequired = [], statusDistribution = [], recentActivity = [] } = data || {};

  // Top prioritized attention items
  const attentionItems = actionRequired.slice(0, 5);

  return (
    <div className="space-y-6">
      {/* Standardized Page Header */}
      <PageHeader
        eyebrow="Accounts Payable"
        title="Dashboard"
        greeting={getGreeting()}
        description="Comprehensive overview of invoices, approvals, payments, and exceptions."
      >
        <button
          onClick={() => navigate('/invoices')}
          className="px-3.5 py-2 text-xs font-semibold rounded-lg bg-sky-600 text-white hover:bg-sky-700 transition shadow-xs flex items-center gap-1.5"
        >
          <FileText className="w-3.5 h-3.5" />
          Manage Invoices
        </button>
      </PageHeader>

      {/* Main 5 Primary KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <StatCard
          title="Total Invoices"
          value={stats?.totalInvoices || 0}
          subtitle="All active invoices"
          icon={FileText}
          variant="default"
          onClick={() => navigate('/invoices')}
        />
        <StatCard
          title="Pending Verification"
          value={stats?.pendingVerification || 0}
          subtitle="Requires rule check"
          icon={Clock}
          variant="blue"
          onClick={() => navigate('/verification')}
        />
        <StatCard
          title="Awaiting Approval"
          value={stats?.pendingApproval || 0}
          subtitle="Manager sign-off"
          icon={UserCheck}
          variant="purple"
          onClick={() => navigate('/approvals')}
        />
        <StatCard
          title="Payments Due"
          value={stats?.dueSoonCount || 0}
          subtitle={formatINR(stats?.dueSoonAmount || 0)}
          icon={Calendar}
          variant="amber"
          onClick={() => navigate('/payments/schedule')}
        />
        <StatCard
          title="Exceptions"
          value={stats?.openExceptions || 0}
          subtitle={`${stats?.criticalExceptions || 0} critical blockers`}
          icon={AlertTriangle}
          variant="red"
          onClick={() => navigate('/exceptions')}
        />
      </div>

      {/* "Needs Your Attention" Section */}
      <div className="bg-white rounded-xl border border-slate-200/90 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/60">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse"></span>
            <h2 className="text-sm font-bold text-slate-900 tracking-tight">
              Needs Your Attention
            </h2>
            <span className="text-xs text-slate-400 font-normal ml-1 hidden sm:inline">
              · Top prioritized items requiring action
            </span>
          </div>
          <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-amber-100/80 text-amber-800">
            {attentionItems.length} items
          </span>
        </div>

        <div className="divide-y divide-slate-100">
          {attentionItems.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-500">
              ✓ All queues are clear! No immediate action required today.
            </div>
          ) : (
            attentionItems.map((item) => {
              const deadlineInfo = formatDeadline(item.deadline);
              const invoiceNo = item.invoice_number || 'INV-000';
              const vendor = item.vendor_name || 'Vendor';
              const amount = item.total_amount ? formatINR(item.total_amount) : '';
              const problem = item.problem || item.title;
              const actionLabel = item.action_label || (item.type === 'EXCEPTION' ? 'Resolve' : 'Review');

              const typeBadge = {
                VERIFICATION: { label: 'Invoice verification', color: 'bg-sky-50 text-sky-700 border-sky-200' },
                EXCEPTION: { label: 'Exception', color: 'bg-rose-50 text-rose-700 border-rose-200' },
                APPROVAL: { label: 'Approval', color: 'bg-purple-50 text-purple-700 border-purple-200' },
                PAYMENT: { label: 'Payment due', color: 'bg-amber-50 text-amber-700 border-amber-200' },
              }[item.type] || { label: item.badgeText || 'Action required', color: 'bg-slate-100 text-slate-700 border-slate-200' };

              return (
                <div
                  key={item.id}
                  className="p-4 sm:p-5 hover:bg-slate-50/80 transition flex flex-col sm:flex-row sm:items-center justify-between gap-3 group"
                >
                  {/* Left: Type, Invoice Number & Vendor */}
                  <div className="flex items-start gap-3 min-w-0">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold border flex-shrink-0 ${typeBadge.color}`}>
                      {typeBadge.label}
                    </span>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-bold text-slate-900 font-mono">
                          {invoiceNo}
                        </span>
                        <span className="text-slate-300">·</span>
                        <span className="text-xs font-medium text-slate-700 truncate">
                          {vendor}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 mt-1 line-clamp-1">
                        {problem}
                      </p>
                    </div>
                  </div>

                  {/* Right: Amount, Deadline, & Action Button */}
                  <div className="flex items-center gap-4 sm:flex-shrink-0 justify-between sm:justify-end">
                    {amount && (
                      <span className="text-xs font-mono font-bold text-slate-800">
                        {amount}
                      </span>
                    )}

                    {item.deadline && (
                      <span className={`text-[11px] font-medium hidden md:inline-block ${deadlineInfo.color}`}>
                        {deadlineInfo.text}
                      </span>
                    )}

                    <button
                      onClick={() => navigate(item.link)}
                      className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg transition flex items-center gap-1 shadow-xs ${
                        actionLabel === 'Resolve'
                          ? 'bg-amber-50 text-amber-700 hover:bg-amber-600 hover:text-white border border-amber-200'
                          : 'bg-sky-50 text-sky-700 hover:bg-sky-600 hover:text-white border border-sky-200'
                      }`}
                    >
                      <span>{actionLabel}</span>
                      <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Advanced AP Analytics Toggle */}
      <div className="space-y-4">
        <button
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="flex items-center gap-2 text-xs font-semibold text-slate-600 hover:text-slate-900 bg-white border border-slate-200 px-3.5 py-2 rounded-lg transition shadow-xs"
        >
          <Layers className="w-4 h-4 text-sky-600" />
          <span>{showAdvanced ? 'Hide Extended Metrics & Activity Trail' : 'Show Extended Metrics & Activity Trail'}</span>
          {showAdvanced ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        </button>

        {showAdvanced && (
          <div className="space-y-6 pt-2">
            {/* Secondary KPIs */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
                <div>
                  <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Overdue Invoices</p>
                  <p className="text-xl font-bold text-rose-600 mt-1">{stats?.overdueCount || 0}</p>
                  <p className="text-[11px] text-slate-400 font-mono mt-0.5">{formatINR(stats?.overdueAmount || 0)}</p>
                </div>
                <div className="w-9 h-9 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center">
                  <AlertTriangle className="w-4 h-4" />
                </div>
              </div>

              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
                <div>
                  <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Total Payables</p>
                  <p className="text-xl font-bold text-slate-900 mt-1 font-mono">{formatINR(stats?.totalPayables || 0)}</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">All outstanding liabilities</p>
                </div>
                <div className="w-9 h-9 rounded-lg bg-sky-50 text-sky-600 flex items-center justify-center">
                  <CreditCard className="w-4 h-4" />
                </div>
              </div>

              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
                <div>
                  <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Reconciled Volume</p>
                  <p className="text-xl font-bold text-emerald-600 mt-1 font-mono">{formatINR(stats?.totalReconciledVolume || 0)}</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">Settled & matched</p>
                </div>
                <div className="w-9 h-9 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                  <CheckCircle2 className="w-4 h-4" />
                </div>
              </div>
            </div>

            {/* Lifecycle & Activity Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Invoice Status Distribution */}
              <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-sky-600" />
                    Status Distribution
                  </h3>
                  <span className="text-[10px] text-slate-400 font-medium">Live PostgreSQL Data</span>
                </div>

                <div className="space-y-2.5">
                  {statusDistribution.map((item) => (
                    <div key={item.status} className="flex items-center justify-between text-xs py-1 border-b border-slate-50 last:border-0">
                      <div className="flex items-center gap-2">
                        <Badge status={item.status} size="xs" />
                        <span className="text-slate-500 font-medium">({item.count})</span>
                      </div>
                      <span className="font-mono font-bold text-slate-800">
                        {formatINR(item.total_amount)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Activity Trail */}
              <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                    <Activity className="w-4 h-4 text-emerald-600" />
                    Audit History
                  </h3>
                  <span className="text-[10px] text-slate-400 font-medium">Recent Actions</span>
                </div>

                <div className="space-y-3">
                  {recentActivity.map((log) => (
                    <div key={log.id} className="flex items-start justify-between text-xs border-b border-slate-50 pb-2 last:border-0">
                      <div className="pr-3">
                        <span className="font-semibold text-slate-800">{formatActorName(log.user_name)}:</span>{' '}
                        <span className="text-slate-600">{log.action}</span> on{' '}
                        <span className="text-sky-700 font-semibold">{log.entity_name}</span>
                      </div>
                      <span className="text-[10px] text-slate-400 font-mono flex-shrink-0">
                        {formatDate(log.created_at)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default DashboardPage;
