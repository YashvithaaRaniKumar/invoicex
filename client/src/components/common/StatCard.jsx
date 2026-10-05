import React from 'react';

/**
 * Standard Metric KPI Card
 * Clean borders, subtle shadows, and readable descriptions without awkward truncation.
 */
export const StatCard = ({
  title,
  value,
  subtitle,
  icon: Icon,
  variant = 'default',
  badgeText,
  onClick,
}) => {
  const borderStyles = {
    default: 'border-slate-200/90 hover:border-slate-300 bg-white',
    blue: 'border-sky-200/90 hover:border-sky-300 bg-white',
    amber: 'border-amber-200/90 hover:border-amber-300 bg-white',
    red: 'border-rose-200/90 hover:border-rose-300 bg-white',
    green: 'border-emerald-200/90 hover:border-emerald-300 bg-white',
    purple: 'border-purple-200/90 hover:border-purple-300 bg-white',
  }[variant] || 'border-slate-200/90 bg-white';

  const iconColors = {
    default: 'text-slate-600 bg-slate-100',
    blue: 'text-sky-600 bg-sky-50',
    amber: 'text-amber-600 bg-amber-50',
    red: 'text-rose-600 bg-rose-50',
    green: 'text-emerald-600 bg-emerald-50',
    purple: 'text-purple-600 bg-purple-50',
  }[variant] || 'text-slate-600 bg-slate-100';

  return (
    <div
      onClick={onClick}
      className={`p-4 sm:p-5 rounded-xl border shadow-xs transition-all duration-200 ${borderStyles} ${
        onClick ? 'cursor-pointer hover:shadow-md hover:-translate-y-0.5' : ''
      }`}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 leading-tight">
          {title}
        </span>
        {Icon && (
          <div className={`p-2 rounded-lg flex-shrink-0 ${iconColors}`}>
            <Icon className="w-4 h-4 sm:w-5 sm:h-5" />
          </div>
        )}
      </div>

      <div className="mt-3 flex items-baseline justify-between gap-2">
        <span className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 font-mono">
          {value}
        </span>
        {badgeText && (
          <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-600">
            {badgeText}
          </span>
        )}
      </div>

      {subtitle && (
        <p className="mt-1.5 text-xs text-slate-500 font-medium leading-normal break-words">
          {subtitle}
        </p>
      )}
    </div>
  );
};

export default StatCard;
