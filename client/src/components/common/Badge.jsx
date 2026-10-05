import React from 'react';

/**
 * Reusable Status Badge Component
 * Formats lifecycle statuses with distinct color schemes and dot indicators
 */
export const Badge = ({ status, size = 'sm', className = '' }) => {
  const norm = (status || '').toUpperCase().trim();

  let styles = 'bg-slate-100 text-slate-700 border-slate-200';
  let dotColor = 'bg-slate-400';

  // Success: Green/Emerald
  if (['VERIFIED', 'PASSED', 'APPROVED', 'PAID', 'MATCHED', 'RESOLVED', 'SUCCESS'].includes(norm)) {
    styles = 'bg-emerald-50 text-emerald-800 border-emerald-200';
    dotColor = 'bg-emerald-500';
  }
  // Warning/Action: Amber/Yellow
  else if (['PENDING', 'PENDING_VERIFICATION', 'PENDING_APPROVAL', 'ACTION_REQUIRED', 'UNDER_REVIEW', 'PARTIAL', 'NEEDS_CORRECTION'].includes(norm)) {
    styles = 'bg-amber-50 text-amber-800 border-amber-200';
    dotColor = 'bg-amber-500';
  }
  // Danger/Critical: Rose/Red
  else if (['EXCEPTION', 'FAILED', 'REJECTED', 'CRITICAL', 'MISMATCH', 'OVERDUE', 'PAYMENT_FAILED'].includes(norm)) {
    styles = 'bg-rose-50 text-rose-800 border-rose-200';
    dotColor = 'bg-rose-500';
  }
  // Info/Scheduled: Indigo/Sky
  else if (['SCHEDULED', 'PROCESSING', 'HIGH', 'ESCALATED'].includes(norm)) {
    styles = 'bg-sky-50 text-sky-800 border-sky-200';
    dotColor = 'bg-sky-500';
  }
  // Secondary: Medium severity
  else if (['MEDIUM'].includes(norm)) {
    styles = 'bg-amber-50 text-amber-700 border-amber-200';
    dotColor = 'bg-amber-400';
  }

  const sizeClasses = size === 'xs' ? 'text-[11px] px-2 py-0.5' : 'text-xs px-2.5 py-1';

  return (
    <span
      className={`inline-flex items-center gap-1.5 font-medium rounded-full border ${sizeClasses} ${styles} ${className}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${dotColor}`} />
      {norm.replace(/_/g, ' ')}
    </span>
  );
};

export default Badge;
