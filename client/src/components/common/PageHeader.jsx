import React from 'react';

/**
 * Standardized Page Header Component
 * Enforces clean hierarchy: [Eyebrow] -> [Title] -> [Short Description]
 * Eliminates text clipping, overlap, and excessive squeezing across all viewports.
 */
export const PageHeader = ({
  eyebrow = 'Accounts Payable',
  title,
  greeting,
  description,
  children,
}) => {
  return (
    <div className="pt-1 pb-2 flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200/60 mb-6">
      <div className="space-y-1 min-w-0">
        {eyebrow && (
          <p className="text-[11px] font-semibold uppercase tracking-wider text-sky-700">
            {eyebrow}
          </p>
        )}
        <div className="flex flex-wrap items-center gap-2.5">
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 leading-tight">
            {title}
          </h1>
          {greeting && (
            <span className="text-slate-400 font-normal text-lg hidden sm:inline">
              — {greeting}
            </span>
          )}
        </div>
        {description && (
          <p className="text-xs text-slate-500 font-medium leading-relaxed max-w-3xl">
            {description}
          </p>
        )}
      </div>

      {children && (
        <div className="flex items-center gap-2.5 flex-wrap flex-shrink-0 self-start md:self-center">
          {children}
        </div>
      )}
    </div>
  );
};

export default PageHeader;
