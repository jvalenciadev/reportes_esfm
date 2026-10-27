'use client';

import React, { useState } from 'react';

export interface BarItem {
  label: string;
  value: number;
  sublabel?: string;
  badge?: string;
  color?: string;
}

interface BarVisualProps {
  title: string;
  subtitle?: string;
  items: BarItem[];
  maxItems?: number;
  unit?: string;
  colorTheme?: 'blue' | 'emerald' | 'amber' | 'purple' | 'slate';
  defaultExpanded?: boolean;
}

export function BarVisual({
  title,
  subtitle,
  items,
  maxItems = 10,
  unit = '',
  colorTheme = 'blue',
  defaultExpanded = false,
}: BarVisualProps) {
  const [isExpanded, setIsExpanded] = useState<boolean>(defaultExpanded);

  const displayItems = isExpanded ? items : items.slice(0, maxItems);
  const maxValue = Math.max(...displayItems.map((i) => i.value), 1);

  const themeBarColors = {
    blue: 'bg-blue-600',
    emerald: 'bg-emerald-600',
    amber: 'bg-[#c9a751]',
    purple: 'bg-purple-600',
    slate: 'bg-slate-700',
  }[colorTheme];

  const themeBgColors = {
    blue: 'bg-blue-50',
    emerald: 'bg-emerald-50',
    amber: 'bg-[#faf5e8]',
    purple: 'bg-purple-50',
    slate: 'bg-slate-100',
  }[colorTheme];

  return (
    <div
      className={`bg-white rounded-2xl border transition-all duration-300 p-5 shadow-xs ${
        isExpanded
          ? 'col-span-full border-[#c9a751] shadow-md ring-1 ring-[#c9a751]/30'
          : 'border-slate-200/90'
      }`}
    >
      <div className="flex items-center justify-between gap-3 mb-4 pb-2 border-b border-slate-100">
        <div>
          <h3 className={`font-black text-slate-900 ${isExpanded ? 'text-lg sm:text-xl' : 'text-base'}`}>
            {title}
          </h3>
          {subtitle && <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>}
        </div>

        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className={`px-3 py-1 rounded-xl text-xs font-bold border transition-all shrink-0 ${
            isExpanded
              ? 'bg-[#faf5e8] text-[#7d6325] border-[#c9a751] shadow-2xs ring-1 ring-[#c9a751]'
              : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100 hover:text-slate-900'
          }`}
          title={isExpanded ? 'Restaurar tamaño normal' : 'Agrandar y mostrar todos los registros'}
        >
          {isExpanded ? '✕ Restaurar' : '⛶ Agrandar'}
        </button>
      </div>

      <div className="space-y-3.5">
        {displayItems.map((item, idx) => {
          const percent = Math.round((item.value / maxValue) * 100);
          return (
            <div key={idx} className="group p-1.5 rounded-lg hover:bg-slate-50 transition-colors">
              <div className="flex items-center justify-between text-xs font-semibold text-slate-800 mb-1.5">
                <span className="truncate max-w-[75%] flex items-center gap-1.5" title={item.label}>
                  <span className="font-mono text-slate-400 font-bold text-[11px]">#{idx + 1}</span>
                  <span className={isExpanded ? 'text-sm font-bold text-slate-900' : 'text-xs'}>
                    {item.label}
                  </span>
                  {item.sublabel && (
                    <span className="text-[11px] text-slate-500 font-normal">
                      ({item.sublabel})
                    </span>
                  )}
                </span>
                <span className="font-mono font-black text-slate-900 shrink-0 ml-2 text-sm">
                  {item.value.toLocaleString('es-BO')} {unit}
                </span>
              </div>
              <div className={`w-full ${isExpanded ? 'h-3.5' : 'h-2.5'} rounded-full overflow-hidden ${themeBgColors}`}>
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    item.color || themeBarColors
                  }`}
                  style={{ width: `${Math.max(percent, 2)}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
