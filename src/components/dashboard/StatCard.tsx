import React from 'react';

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  sourceBadge?: string;
  sourceColor?: 'blue' | 'emerald' | 'amber' | 'purple' | 'slate';
  icon?: React.ReactNode;
}

export function StatCard({
  title,
  value,
  subtitle,
  sourceBadge,
  sourceColor = 'slate',
  icon,
}: StatCardProps) {
  const colorStyles = {
    blue: 'bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800',
    emerald: 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800',
    amber: 'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800',
    purple: 'bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800',
    slate: 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700',
  }[sourceColor];

  return (
    <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200/90 dark:border-slate-800 p-5 shadow-xs hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              {title}
            </span>
            {sourceBadge && (
              <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${colorStyles}`}>
                {sourceBadge}
              </span>
            )}
          </div>
          <div className="text-2xl lg:text-3xl font-medium text-slate-900 dark:text-white tracking-tight">
            {typeof value === 'number' ? value.toLocaleString('es-BO') : value}
          </div>
          {subtitle && (
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-medium">{subtitle}</p>
          )}
        </div>
        {icon && (
          <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/80 border border-slate-100 dark:border-slate-700 text-slate-600 dark:text-slate-300 shrink-0">
            {icon}
          </div>
        )}
      </div>
    </div>
  );
}
