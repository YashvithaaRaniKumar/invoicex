/**
 * Format ISO date string to readable Indian date (e.g. 10 Oct 2026)
 */
export const formatDate = (dateStr) => {
  if (!dateStr) return '-';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
};

/**
 * Format relative deadline countdown (e.g. "Due in 2 days", "Overdue by 1 day")
 */
export const formatDeadline = (dateStr) => {
  if (!dateStr) return '-';
  const target = new Date(dateStr);
  const now = new Date();
  target.setHours(0, 0, 0, 0);
  now.setHours(0, 0, 0, 0);

  const diffTime = target.getTime() - now.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays < 0) {
    return {
      text: `Overdue by ${Math.abs(diffDays)} day${Math.abs(diffDays) === 1 ? '' : 's'}`,
      isOverdue: true,
      color: 'text-rose-600 font-semibold',
    };
  } else if (diffDays === 0) {
    return {
      text: 'Due Today',
      isOverdue: false,
      color: 'text-amber-600 font-semibold',
    };
  } else if (diffDays === 1) {
    return {
      text: 'Due Tomorrow',
      isOverdue: false,
      color: 'text-amber-600',
    };
  } else {
    return {
      text: `${diffDays} days left`,
      isOverdue: false,
      color: 'text-slate-600',
    };
  }
};
