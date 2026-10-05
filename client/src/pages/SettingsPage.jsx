import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import axiosClient from '../api/axiosClient';
import PageHeader from '../components/common/PageHeader';
import { formatDate } from '../utils/date';
import { formatActorName } from '../utils/actor';
import {
  Settings,
  Shield,
  User,
  Activity,
  CheckCircle2,
  Lock,
  Mail,
  Building,
} from 'lucide-react';

export const SettingsPage = () => {
  const { user } = useAuth();
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Fetch recent audit logs from dashboard stats
    axiosClient
      .get('/dashboard/stats')
      .then((res) => setLogs(res.recentActivity || []))
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-6">
      {/* Standardized Page Header */}
      <PageHeader
        eyebrow="Settings & Administration"
        title="Settings"
        description="User profile, role permissions active, and system audit history."
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* User Profile Card */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-2 border-b pb-2">
            <User className="w-4 h-4 text-sky-600" />
            Active Session Profile
          </h3>

          <div className="space-y-3 text-xs">
            <div className="flex justify-between py-1 border-b border-slate-100">
              <span className="text-slate-400">Account Persona</span>
              <span className="font-bold text-slate-900">{formatActorName(user?.full_name)}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-100">
              <span className="text-slate-400">Email Address</span>
              <span className="font-mono text-slate-800">{user?.email}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-100">
              <span className="text-slate-400">Role Privilege</span>
              <span className="font-bold px-2 py-0.5 rounded bg-sky-100 text-sky-800">
                {user?.role}
              </span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-slate-400">Department</span>
              <span className="font-semibold text-slate-800">{user?.department || 'Accounts Payable'}</span>
            </div>
          </div>
        </div>

        {/* Role Permissions Reference */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-2 border-b pb-2">
            <Shield className="w-4 h-4 text-purple-600" />
            Role-Based Access Control (RBAC) Matrix
          </h3>

          <div className="space-y-2 text-xs">
            <div className="p-2.5 rounded-lg bg-sky-50 border border-sky-200">
              <span className="font-bold text-sky-900 block">FINANCE STAFF (Operator)</span>
              <span className="text-slate-600 text-[11px]">
                Create invoices, execute rule verification, investigate & resolve exceptions, schedule disbursements, and perform bank reconciliation.
              </span>
            </div>

            <div className="p-2.5 rounded-lg bg-purple-50 border border-purple-200">
              <span className="font-bold text-purple-900 block">APPROVER / MANAGER (Sign-off)</span>
              <span className="text-slate-600 text-[11px]">
                Inspect verified invoices, review PO line item integrity, approve or reject invoices with comments, and request finance corrections.
              </span>
            </div>

            <div className="p-2.5 rounded-lg bg-emerald-50 border border-emerald-200">
              <span className="font-bold text-emerald-900 block">ADMIN (Supervisory)</span>
              <span className="text-slate-600 text-[11px]">
                Full platform access, audit trail surveillance, vendor directory master data management, and user configuration.
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* System Audit Logs */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
          <span className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
            <Activity className="w-4 h-4 text-sky-600" />
            Audit History
          </span>
          <span className="text-[11px] text-slate-400">Compliance Log</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50/50 border-b border-slate-200 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                <th className="py-2.5 px-4">Timestamp</th>
                <th className="py-2.5 px-4">Operator</th>
                <th className="py-2.5 px-4">Entity</th>
                <th className="py-2.5 px-4">Action</th>
                <th className="py-2.5 px-4">Metadata Audit Snapshot</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {logs.map((log) => (
                <tr key={log.id} className="hover:bg-slate-50/60 transition">
                  <td className="py-3 px-4 text-slate-500 font-mono text-[11px]">
                    {formatDate(log.created_at)}
                  </td>
                  <td className="py-3 px-4 font-semibold text-slate-900">
                    {formatActorName(log.user_name)}
                  </td>
                  <td className="py-3 px-4">
                    <span className="font-mono text-[11px] font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                      {log.entity_name}
                    </span>
                  </td>
                  <td className="py-3 px-4 font-semibold text-slate-800">
                    {log.action}
                  </td>
                  <td className="py-3 px-4 text-[11px] font-mono text-slate-500 max-w-xs truncate">
                    {log.metadata || '-'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default SettingsPage;
