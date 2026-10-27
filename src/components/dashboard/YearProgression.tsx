'use client';

import React, { useState } from 'react';
import { TrendingUpIcon, CalendarIcon } from '../ui/Icons';

export interface YearDataPoint {
  year: number;
  value: number;
  secondaryValue?: number;
  secondaryLabel?: string;
  notes?: string;
}

interface YearProgressionProps {
  title: string;
  subtitle?: string;
  data: YearDataPoint[];
  unit?: string;
  color?: string;
  defaultExpanded?: boolean;
}

export function YearProgression({
  title,
  subtitle,
  data,
  unit = '',
  color = '#c9a751',
  defaultExpanded = false,
}: YearProgressionProps) {
  const [isExpanded, setIsExpanded] = useState<boolean>(defaultExpanded);
  const sortedData = [...data].sort((a, b) => a.year - b.year);
  const [selectedYear, setSelectedYear] = useState<number>(
    sortedData[sortedData.length - 1]?.year ?? 2026
  );

  if (sortedData.length === 0) return null;

  const maxValue = Math.max(...sortedData.map((d) => d.value), 1);
  const totalValue = sortedData.reduce((acc, d) => acc + d.value, 0);
  const averageValue = Math.round(totalValue / sortedData.length);

  // Datos del año seleccionado y cálculo de variación interanual
  const currentIdx = sortedData.findIndex((d) => d.year === selectedYear);
  const currentItem = sortedData[currentIdx] || sortedData[sortedData.length - 1];
  const previousItem = currentIdx > 0 ? sortedData[currentIdx - 1] : null;

  let growthRate: number | null = null;
  if (previousItem && previousItem.value > 0) {
    growthRate = Math.round(((currentItem.value - previousItem.value) / previousItem.value) * 1000) / 10;
  }

  return (
    <div
      className={`bg-white rounded-2xl border transition-all duration-300 p-5 shadow-xs ${
        isExpanded
          ? 'col-span-full border-[#c9a751] shadow-md ring-1 ring-[#c9a751]/30'
          : 'border-slate-200/90'
      }`}
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 pb-3 border-b border-slate-100">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-[#faf5e8] text-[#7d6325] border border-[#e5d5a6]">
              <TrendingUpIcon size={16} />
            </span>
            <h3 className={`font-black text-slate-900 tracking-tight ${isExpanded ? 'text-lg sm:text-xl' : 'text-base'}`}>
              {title}
            </h3>
          </div>
          {subtitle && <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>}
        </div>

        {/* Indicadores rápidos y botón Agrandar */}
        <div className="flex items-center gap-2 shrink-0 flex-wrap">
          <div className="flex items-center gap-3 bg-slate-50 border border-slate-200 rounded-xl px-4 py-2">
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider font-mono">
                Año {currentItem.year}
              </span>
              <span className="text-lg sm:text-xl font-black text-slate-900 font-mono">
                {currentItem.value.toLocaleString('es-BO')} {unit}
              </span>
            </div>

            {growthRate !== null && (
              <div
                className={`px-2.5 py-1 rounded-lg text-xs font-bold border font-mono ${
                  growthRate >= 0
                    ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                    : 'bg-rose-50 text-rose-800 border-rose-200'
                }`}
              >
                {growthRate >= 0 ? `+${growthRate}%` : `${growthRate}%`}
                <span className="block text-[9px] font-normal text-slate-500">vs año anterior</span>
              </div>
            )}
          </div>

          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className={`px-3 py-2 rounded-xl text-xs font-bold border transition-all ${
              isExpanded
                ? 'bg-[#faf5e8] text-[#7d6325] border-[#c9a751] shadow-2xs ring-1 ring-[#c9a751]'
                : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100 hover:text-slate-900'
            }`}
            title={isExpanded ? 'Restaurar tamaño normal' : 'Agrandar este cuadro dinámicamente'}
          >
            {isExpanded ? '✕ Restaurar' : '⛶ Agrandar'}
          </button>
        </div>
      </div>

      {/* Selector de Años / Botonera de Exposición */}
      <div className="mb-5 overflow-x-auto pb-2">
        <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-1.5 font-mono">
          Seleccionar año para exponer detalle:
        </span>
        <div className="flex items-center gap-1.5 flex-nowrap min-w-max">
          {sortedData.map((d) => {
            const isSelected = d.year === selectedYear;
            return (
              <button
                key={d.year}
                onClick={() => setSelectedYear(d.year)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all font-mono ${
                  isSelected
                    ? 'bg-slate-900 text-white shadow-xs scale-105'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900'
                }`}
              >
                {d.year}
              </button>
            );
          })}
        </div>
      </div>

      {/* Tarjetas de Promedios */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4 text-xs font-mono">
        <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80">
          <span className="text-[10px] text-slate-400 font-bold block uppercase">Promedio Anual</span>
          <strong className="text-sm sm:text-base font-black text-slate-900">
            {averageValue.toLocaleString('es-BO')} {unit}
          </strong>
        </div>
        <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80">
          <span className="text-[10px] text-slate-400 font-bold block uppercase">Máximo Registrado</span>
          <strong className="text-sm sm:text-base font-black text-slate-900">
            {maxValue.toLocaleString('es-BO')} {unit}
          </strong>
        </div>
        <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80">
          <span className="text-[10px] text-slate-400 font-bold block uppercase">Gestiones Analizadas</span>
          <strong className="text-sm sm:text-base font-black text-slate-900">{sortedData.length} años</strong>
        </div>
        <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80">
          <span className="text-[10px] text-slate-400 font-bold block uppercase">Total Acumulado</span>
          <strong className="text-sm sm:text-base font-black text-slate-900">
            {totalValue.toLocaleString('es-BO')} {unit}
          </strong>
        </div>
      </div>

      {/* Barras de Progresión Cronológica */}
      <div className="space-y-2 pt-2 border-t border-slate-100">
        {sortedData.map((item, idx) => {
          const percent = Math.round((item.value / maxValue) * 100);
          const isSelected = item.year === selectedYear;
          const prev = idx > 0 ? sortedData[idx - 1] : null;
          const diffPercent = prev && prev.value > 0
            ? Math.round(((item.value - prev.value) / prev.value) * 100)
            : null;

          return (
            <div
              key={item.year}
              onClick={() => setSelectedYear(item.year)}
              className={`p-2.5 rounded-xl cursor-pointer transition-all ${
                isSelected
                  ? 'bg-[#faf5e8] border border-[#c9a751] shadow-2xs'
                  : 'hover:bg-slate-50 border border-transparent'
              }`}
            >
              <div className="flex items-center justify-between text-xs mb-1 font-mono">
                <div className="flex items-center gap-2">
                  <span className={`font-bold ${isSelected ? 'text-[#7d6325] text-sm' : 'text-slate-800'}`}>
                    {item.year}
                  </span>
                  {diffPercent !== null && (
                    <span
                      className={`text-[10px] font-bold px-1.5 py-0.2 rounded ${
                        diffPercent >= 0
                          ? 'text-emerald-800 bg-emerald-50'
                          : 'text-rose-800 bg-rose-50'
                      }`}
                    >
                      {diffPercent >= 0 ? `+${diffPercent}%` : `${diffPercent}%`}
                    </span>
                  )}
                </div>
                <span className="font-black text-slate-900 text-sm">
                  {item.value.toLocaleString('es-BO')} {unit}
                </span>
              </div>

              <div className={`w-full ${isExpanded ? 'h-3' : 'h-2'} rounded-full bg-slate-100 overflow-hidden`}>
                <div
                  className="h-full rounded-full transition-all duration-300"
                  style={{
                    width: `${Math.max(percent, 2)}%`,
                    backgroundColor: isSelected ? '#c9a751' : color,
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
