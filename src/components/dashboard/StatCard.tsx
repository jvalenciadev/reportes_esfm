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
    blue: 'bg-blue-50 text-blue-700 border-blue-200',
    emerald: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    amber: 'bg-amber-50 text-amber-700 border-amber-200',
    purple: 'bg-purple-50 text-purple-700 border-purple-200',
    slate: 'bg-slate-100 text-slate-700 border-slate-200',
  }[sourceColor];

  return (
    <div className="bg-white rounded-xl border border-slate-200/90 p-5 shadow-xs hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">
              {title}
            </span>
            {sourceBadge && (
              <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${colorStyles}`}>
                {sourceBadge}
              </span>
            )}
          </div>
          <div className="text-2xl lg:text-3xl font-extrabold text-slate-900 tracking-tight">
            {typeof value === 'number' ? value.toLocaleString('es-BO') : value}
          </div>
          {subtitle && (
            <p className="text-xs text-slate-500 mt-1 font-medium">{subtitle}</p>
          )}
        </div>
        {icon && (
          <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-100 text-slate-600 shrink-0">
            {icon}
          </div>
        )}
      </div>
    </div>
  );
}
