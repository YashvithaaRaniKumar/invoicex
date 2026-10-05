import React, { useEffect, useState } from 'react';
import axiosClient from '../api/axiosClient';
import PageHeader from '../components/common/PageHeader';
import Badge from '../components/common/Badge';
import Modal from '../components/common/Modal';
import Drawer from '../components/common/Drawer';
import EmptyState from '../components/common/EmptyState';
import { formatINR } from '../utils/currency';
import { formatDate, formatDeadline } from '../utils/date';
import { formatActorName } from '../utils/actor';
import { useNotifications } from '../context/NotificationContext';
import { useNavigate } from 'react-router-dom';
import {
  AlertTriangle,
  UserCheck,
  Calendar,
  CheckCircle2,
  RotateCcw,
  UserPlus,
  ExternalLink,
  Clock,
  ArrowRight,
  HelpCircle,
  ShieldAlert,
  Eye,
} from 'lucide-react';

export const ExceptionCenterPage = () => {
  const [exceptions, setExceptions] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [severityFilter, setSeverityFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [selectedException, setSelectedException] = useState(null);
  const { addToast } = useNotifications();
  const navigate = useNavigate();

  // Modals state
  const [resolveModal, setResolveModal] = useState({ isOpen: false, exception: null, notes: '' });
  const [assignModal, setAssignModal] = useState({ isOpen: false, exception: null, assigned_to: '', note: '' });

  const fetchExceptions = () => {
    setLoading(true);
    const params = {};
    if (severityFilter !== 'ALL') params.severity = severityFilter;
    if (statusFilter !== 'ALL') params.status = statusFilter;

    axiosClient
      .get('/exceptions', { params })
      .then((res) => {
        const list = res.exceptions || [];
        setExceptions(list);
        // keep selectedException updated if open
        if (selectedException) {
          const updated = list.find((e) => e.id === selectedException.id);
          if (updated) setSelectedException(updated);
        }
      })
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchExceptions();
  }, [severityFilter, statusFilter]);

  useEffect(() => {
    axiosClient.get('/auth/users').then((res) => setUsers(res.users || []));
  }, []);

  // =========================================================================
  // STEP-BY-STEP ARCHITECTURE FLOW:
  // 1. Finance staff reviews issue diagnosis, inputs resolution note, and confirms.
  // 2. React sends Axios POST to `/exceptions/${exception.id}/resolve`.
  // 3. Express router forwards request to exceptionController.resolveException.
  // 4. Controller marks exception 'RESOLVED' and checks if other exceptions remain on invoice.
  // 5. PostgreSQL updates 'invoice_exceptions'; if all clear, sets invoice to 'PENDING_VERIFICATION'.
  // 6. Backend returns JSON response indicating unblock status.
  // 7. React updates UI: closes modal, shows success toast, and refreshes exception list.
  // =========================================================================
  const handleResolve = async (e) => {
    e.preventDefault();
    if (!resolveModal.exception || !resolveModal.notes) return;
    try {
      const res = await axiosClient.post(`/exceptions/${resolveModal.exception.id}/resolve`, {
        resolution_notes: resolveModal.notes,
      });
      addToast(res.message, 'success');
      setResolveModal({ isOpen: false, exception: null, notes: '' });
      setSelectedException(null);
      fetchExceptions();
    } catch (err) {
      addToast(err.message, 'error');
    }
  };

  const handleAssign = async (e) => {
    e.preventDefault();
    if (!assignModal.exception || !assignModal.assigned_to) return;
    try {
      const res = await axiosClient.post(`/exceptions/${assignModal.exception.id}/assign`, {
        assigned_to: assignModal.assigned_to,
        note: assignModal.note,
      });
      addToast(res.message, 'success');
      setAssignModal({ isOpen: false, exception: null, assigned_to: '', note: '' });
      fetchExceptions();
    } catch (err) {
      addToast(err.message, 'error');
    }
  };

  const handleReopen = async (exc) => {
    try {
      const res = await axiosClient.post(`/exceptions/${exc.id}/reopen`, {
        reason: 'Reopened by auditor for further investigation',
      });
      addToast(res.message, 'warning');
      fetchExceptions();
    } catch (err) {
      addToast(err.message, 'error');
    }
  };

  const handleStatusChange = async (exc, newStatus) => {
    try {
      const res = await axiosClient.put(`/exceptions/${exc.id}/status`, {
        status: newStatus,
        note: `Transitioned status to ${newStatus}`,
      });
      addToast(res.message, 'info');
      fetchExceptions();
    } catch (err) {
      addToast(err.message, 'error');
    }
  };

  return (
    <div className="space-y-6">
      {/* Standardized Page Header */}
      <PageHeader
        eyebrow="Accounts Payable"
        title="Exceptions"
        description="Resolve invoice discrepancies, compliance flags, and approval blockers."
      />

      {/* Filter Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-3.5 rounded-xl border border-slate-200/90 shadow-xs">
        {/* Severity Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto">
          {['ALL', 'CRITICAL', 'HIGH', 'MEDIUM'].map((sev) => (
            <button
              key={sev}
              onClick={() => setSeverityFilter(sev)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                severityFilter === sev
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {sev === 'ALL' ? 'All Severities' : `${sev}`}
            </button>
          ))}
        </div>

        {/* Status Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto">
          {['ALL', 'ACTION_REQUIRED', 'UNDER_REVIEW', 'ESCALATED', 'RESOLVED'].map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-2.5 py-1 rounded-md text-xs font-medium transition ${
                statusFilter === st
                  ? 'bg-sky-600 text-white font-semibold'
                  : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100'
              }`}
            >
              {st === 'ALL' ? 'All' : st.replace('_', ' ')}
            </button>
          ))}
        </div>
      </div>

      {/* Clean Exception Cards Grid */}
      {loading ? (
        <div className="p-12 text-center text-xs text-slate-400 animate-pulse">
          Loading exceptions...
        </div>
      ) : exceptions.length === 0 ? (
        <EmptyState
          icon={CheckCircle2}
          title="No Exceptions Found"
          description="There are currently no bottlenecks or discrepancies matching your filter."
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {exceptions.map((exc) => {
            const deadlineInfo = formatDeadline(exc.deadline);
            const isResolved = exc.status === 'RESOLVED';

            return (
              <div
                key={exc.id}
                className={`bg-white rounded-xl border p-5 space-y-4 hover:shadow-md transition cursor-pointer flex flex-col justify-between ${
                  exc.severity === 'CRITICAL' && !isResolved
                    ? 'border-rose-300 ring-1 ring-rose-100'
                    : exc.severity === 'HIGH' && !isResolved
                    ? 'border-amber-300'
                    : 'border-slate-200'
                }`}
                onClick={() => setSelectedException(exc)}
              >
                {/* Header: Severity & Status */}
                <div className="flex items-center justify-between">
                  <Badge status={exc.severity} size="xs" />
                  <span className={`text-[11px] font-semibold ${deadlineInfo.color}`}>
                    Due: {deadlineInfo.text}
                  </span>
                </div>

                {/* Main Card Content */}
                <div className="space-y-1.5">
                  <div className="font-mono font-bold text-xs text-sky-800">
                    Invoice #{exc.invoice_number}
                  </div>
                  <h3 className="text-sm font-bold text-slate-900 line-clamp-1">
                    {exc.issue_title}
                  </h3>
                  <p className="text-xs text-slate-500">
                    {exc.vendor_name} · <span className="font-mono font-semibold text-slate-700">{formatINR(exc.total_amount)}</span>
                  </p>
                </div>

                {/* Footer: Owner and Clean Actions */}
                <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                  <div className="text-xs text-slate-600">
                    <span className="text-slate-400">Owner:</span>{' '}
                    <span className="font-semibold text-slate-800">{formatActorName(exc.assignee_name) || 'Unassigned'}</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedException(exc);
                      }}
                      className="px-2.5 py-1 text-xs font-semibold rounded-md bg-slate-100 text-slate-700 hover:bg-slate-200 transition"
                    >
                      View
                    </button>
                    {!isResolved && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setResolveModal({ isOpen: true, exception: exc, notes: '' });
                        }}
                        className="px-2.5 py-1 text-xs font-semibold rounded-md bg-emerald-50 text-emerald-700 hover:bg-emerald-600 hover:text-white transition"
                      >
                        Resolve
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Deep Inspection Drawer (5-Point Diagnosis) */}
      <Drawer
        isOpen={Boolean(selectedException)}
        onClose={() => setSelectedException(null)}
        title={`Exception: #${selectedException?.invoice_number}`}
        subtitle={selectedException?.vendor_name}
        badge={selectedException && <Badge status={selectedException.severity} size="xs" />}
        footer={
          selectedException && (
            <div className="flex items-center justify-between w-full">
              <button
                onClick={() => setSelectedException(null)}
                className="px-3 py-1.5 text-xs font-medium text-slate-600"
              >
                Close
              </button>

              <div className="flex items-center gap-2">
                {selectedException.status !== 'RESOLVED' ? (
                  <button
                    onClick={() => {
                      setResolveModal({ isOpen: true, exception: selectedException, notes: '' });
                    }}
                    className="px-4 py-2 text-xs font-semibold rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 shadow-xs flex items-center gap-1.5"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    Resolve Exception
                  </button>
                ) : (
                  <button
                    onClick={() => {
                      handleReopen(selectedException);
                      setSelectedException(null);
                    }}
                    className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-100 flex items-center gap-1.5"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    Reopen Exception
                  </button>
                )}
              </div>
            </div>
          )
        }
      >
        {selectedException && (
          <div className="space-y-6 text-xs">
            {/* 1. What happened? */}
            <div className="space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-rose-600 block">
                What happened?
              </span>
              <h4 className="text-base font-bold text-slate-900">
                {selectedException.issue_title}
              </h4>
            </div>

            {/* 2. Why did it happen? */}
            <div className="space-y-1 p-3.5 rounded-lg bg-slate-50 border border-slate-200">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
                Why? (Root Cause Analysis)
              </span>
              <p className="text-xs text-slate-700 leading-relaxed font-medium">
                {selectedException.issue_description}
              </p>
            </div>

            {/* 3. Who needs to act? */}
            <div className="p-3.5 rounded-lg border border-slate-200 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                  Who needs to act?
                </span>
                {selectedException.status !== 'RESOLVED' && (
                  <button
                    onClick={() => setAssignModal({
                      isOpen: true,
                      exception: selectedException,
                      assigned_to: selectedException.assigned_to || '',
                      note: ''
                    })}
                    className="text-[11px] font-semibold text-sky-600 hover:text-sky-800 flex items-center gap-1"
                  >
                    <UserPlus className="w-3 h-3" />
                    Reassign
                  </button>
                )}
              </div>
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-full bg-sky-100 text-sky-700 flex items-center justify-center font-bold text-xs">
                  {formatActorName(selectedException.assignee_name)?.charAt(0) || 'U'}
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-900">{formatActorName(selectedException.assignee_name) || 'Unassigned'}</p>
                  <p className="text-[11px] text-slate-500">{selectedException.assignee_email || 'No email'}</p>
                </div>
              </div>
            </div>

            {/* 4. What should they do? */}
            <div className="p-3.5 rounded-lg bg-sky-50/60 border border-sky-200 space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-sky-800 block">
                What should they do? (Required Action)
              </span>
              <p className="text-xs text-slate-800 font-medium leading-relaxed">
                {selectedException.required_action}
              </p>
            </div>

            {/* 5. Due date & Status */}
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 rounded-lg border border-slate-200">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                  Due Date / SLA
                </span>
                <p className="font-semibold text-slate-800">{formatDate(selectedException.deadline)}</p>
                <p className={`text-[10px] font-bold mt-0.5 ${formatDeadline(selectedException.deadline).color}`}>
                  {formatDeadline(selectedException.deadline).text}
                </p>
              </div>

              <div className="p-3 rounded-lg border border-slate-200">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                  Current Status
                </span>
                <Badge status={selectedException.status} size="xs" />
              </div>
            </div>

            {/* Quick Status Transitions */}
            {selectedException.status !== 'RESOLVED' && (
              <div className="flex items-center gap-2 pt-2">
                {selectedException.status === 'ACTION_REQUIRED' && (
                  <button
                    onClick={() => handleStatusChange(selectedException, 'UNDER_REVIEW')}
                    className="flex-1 py-1.5 rounded-lg border border-sky-200 text-sky-700 hover:bg-sky-50 text-xs font-semibold transition"
                  >
                    Mark Under Review
                  </button>
                )}
                {selectedException.status !== 'ESCALATED' && (
                  <button
                    onClick={() => handleStatusChange(selectedException, 'ESCALATED')}
                    className="flex-1 py-1.5 rounded-lg border border-rose-200 text-rose-700 hover:bg-rose-50 text-xs font-semibold transition"
                  >
                    Escalate Priority
                  </button>
                )}
              </div>
            )}

            {/* Resolution History / Trail */}
            {selectedException.resolution_notes && (
              <div className="p-3.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-950 space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-800 block">
                  Resolution History & Auditor Notes
                </span>
                <p className="text-xs font-medium leading-relaxed">
                  {selectedException.resolution_notes}
                </p>
                {selectedException.resolver_name && (
                  <p className="text-[10px] text-emerald-700 pt-1">
                    Resolved by {selectedException.resolver_name} on {formatDate(selectedException.resolved_at)}
                  </p>
                )}
              </div>
            )}
          </div>
        )}
      </Drawer>

      {/* Resolve Modal */}
      <Modal
        isOpen={resolveModal.isOpen}
        onClose={() => setResolveModal({ isOpen: false, exception: null, notes: '' })}
        title="Resolve Exception"
        subtitle={`Invoice #${resolveModal.exception?.invoice_number} · ${resolveModal.exception?.issue_title}`}
      >
        <form onSubmit={handleResolve} className="space-y-4">
          <div className="p-3 rounded-lg bg-sky-50 border border-sky-200 text-sky-900 text-xs">
            <span className="font-bold block mb-1">Required Action Was:</span>
            {resolveModal.exception?.required_action}
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
              Resolution Note & Auditor Explanation *
            </label>
            <textarea
              rows="3"
              required
              placeholder="e.g. Received updated GST e-invoice with valid IRN QR code from vendor. Verified on GST portal."
              value={resolveModal.notes}
              onChange={(e) => setResolveModal({ ...resolveModal, notes: e.target.value })}
              className="mt-1 block w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setResolveModal({ isOpen: false, exception: null, notes: '' })}
              className="px-4 py-2 text-xs font-medium text-slate-600"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!resolveModal.notes}
              className="px-4 py-2 text-xs font-semibold rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50 shadow-sm"
            >
              Resolve Exception
            </button>
          </div>
        </form>
      </Modal>

      {/* Reassign Modal */}
      <Modal
        isOpen={assignModal.isOpen}
        onClose={() => setAssignModal({ isOpen: false, exception: null, assigned_to: '', note: '' })}
        title="Reassign Exception Owner"
        subtitle="Transfer responsibility for resolving this AP bottleneck"
      >
        <form onSubmit={handleAssign} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
              Select Team Member *
            </label>
            <select
              required
              value={assignModal.assigned_to}
              onChange={(e) => setAssignModal({ ...assignModal, assigned_to: e.target.value })}
              className="mt-1 block w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-sky-500 outline-none"
            >
              <option value="">-- Choose User --</option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>
                  {formatActorName(u.full_name)} ({u.role.replace('_', ' ')} · {u.department})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
              Reassignment Note / Instructions
            </label>
            <textarea
              rows="2"
              placeholder="e.g. Please coordinate with vendor liaison to obtain credit note."
              value={assignModal.note}
              onChange={(e) => setAssignModal({ ...assignModal, note: e.target.value })}
              className="mt-1 block w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-sky-500 outline-none"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setAssignModal({ isOpen: false, exception: null, assigned_to: '', note: '' })}
              className="px-4 py-2 text-xs font-medium text-slate-600"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!assignModal.assigned_to}
              className="px-4 py-2 text-xs font-semibold rounded-lg bg-sky-600 text-white hover:bg-sky-700 disabled:opacity-50 shadow-sm"
            >
              Reassign Owner
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default ExceptionCenterPage;
