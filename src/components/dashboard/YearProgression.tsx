'use client';

import React, { useState, useEffect } from 'react';
import { TrendingUpIcon, CalendarIcon, MaximizeIcon, MinimizeIcon } from '../ui/Icons';

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

  useEffect(() => {
    if (!isExpanded) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsExpanded(false);
    };
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isExpanded]);

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

  const renderContent = (fullscreen: boolean) => (
    <div className="w-full flex flex-col justify-between">
      <div className="flex flex-col gap-3 mb-4 pb-3 border-b border-slate-100">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-[#faf5e8] text-[#c9a751] border border-[#e5d5a6] shrink-0">
                <TrendingUpIcon size={16} />
              </span>
              <h3 className={`font-semibold text-slate-900 tracking-tight leading-snug ${isExpanded ? 'text-lg sm:text-xl' : 'text-base'}`}>
                {title}
              </h3>
            </div>
            {subtitle && <p className="text-xs text-slate-500 mt-1">{subtitle}</p>}
          </div>

          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className={`px-3 py-1.5 rounded-xl text-xs font-medium border transition-all shrink-0 flex items-center gap-1.5 ${
              isExpanded
                ? 'bg-[#faf5e8] text-[#c9a751] border-[#c9a751] shadow-2xs ring-1 ring-[#c9a751]'
                : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100 hover:text-slate-900'
            }`}
            title={isExpanded ? 'Restaurar tamaño normal' : 'Agrandar este cuadro dinámicamente'}
          >
            {isExpanded ? (
              <>
                <MinimizeIcon size={13} />
                <span>Restaurar</span>
              </>
            ) : (
              <>
                <MaximizeIcon size={13} />
                <span>Agrandar</span>
              </>
            )}
          </button>
        </div>

        {/* Indicador rápido del año activo */}
        <div className="flex items-center gap-3 bg-slate-50 border border-slate-200/80 rounded-xl px-3.5 py-1.5 self-start">
          <div>
            <span className="text-[10px] uppercase font-medium text-slate-400 block tracking-wider">
              Gestión {currentItem.year}
            </span>
            <span className="text-base sm:text-lg font-semibold text-slate-900">
              {currentItem.value.toLocaleString('es-BO')} {unit}
            </span>
          </div>

          {growthRate !== null && (
            <div
              className={`px-2 py-0.5 rounded-lg text-xs font-medium border ${
                growthRate >= 0
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                  : 'bg-rose-50 text-rose-800 border-rose-200'
              }`}
            >
              {growthRate >= 0 ? `+${growthRate}%` : `${growthRate}%`}
              <span className="block text-[8px] font-normal opacity-80">vs año anterior</span>
            </div>
          )}
        </div>
      </div>

      {/* Selector de Años / Botonera de Exposición */}
      <div className="mb-5 overflow-x-auto pb-2">
        <span className="text-[11px] font-medium uppercase tracking-wider text-slate-400 block mb-1.5">
          Seleccionar año para exponer detalle:
        </span>
        <div className="flex items-center gap-1.5 flex-nowrap min-w-max">
          {sortedData.map((d) => {
            const isSelected = d.year === selectedYear;
            return (
              <button
                key={d.year}
                onClick={() => setSelectedYear(d.year)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
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
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4 text-xs">
        <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80">
          <span className="text-[10px] text-slate-400 font-medium block uppercase">Promedio Anual</span>
          <strong className="text-sm sm:text-base font-semibold text-slate-900">
            {averageValue.toLocaleString('es-BO')} {unit}
          </strong>
        </div>
        <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80">
          <span className="text-[10px] text-slate-400 font-medium block uppercase">Máximo Registrado</span>
          <strong className="text-sm sm:text-base font-semibold text-slate-900">
            {maxValue.toLocaleString('es-BO')} {unit}
          </strong>
        </div>
        <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80">
          <span className="text-[10px] text-slate-400 font-medium block uppercase">Gestiones Analizadas</span>
          <strong className="text-sm sm:text-base font-semibold text-slate-900">{sortedData.length} años</strong>
        </div>
        <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80">
          <span className="text-[10px] text-slate-400 font-medium block uppercase">Total Acumulado</span>
          <strong className="text-sm sm:text-base font-semibold text-slate-900">
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
              <div className="flex items-center justify-between text-xs mb-1">
                <div className="flex items-center gap-2">
                  <span className={`font-medium ${isSelected ? 'text-[#c9a751] text-sm' : 'text-slate-800'}`}>
                    {item.year}
                  </span>
                  {diffPercent !== null && (
                    <span
                      className={`text-[10px] font-medium px-1.5 py-0.2 rounded ${
                        diffPercent >= 0
                          ? 'text-emerald-800 bg-emerald-50'
                          : 'text-rose-800 bg-rose-50'
                      }`}
                    >
                      {diffPercent >= 0 ? `+${diffPercent}%` : `${diffPercent}%`}
                    </span>
                  )}
                </div>
                <span className="font-semibold text-slate-900 text-sm">
                  {item.value.toLocaleString('es-BO')} {unit}
                </span>
              </div>

              <div className={`w-full ${fullscreen ? 'h-3' : 'h-2'} rounded-full bg-slate-100 overflow-hidden`}>
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

  return (
    <>
      <div className="bg-white rounded-2xl border border-slate-200/90 transition-all duration-300 p-5 shadow-xs flex flex-col justify-between">
        {renderContent(false)}
      </div>

      {isExpanded && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 md:p-8 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
          <div
            className="fixed inset-0 -z-10"
            onClick={() => setIsExpanded(false)}
          />
          <div className="relative z-10 w-full max-w-7xl max-h-[92vh] overflow-y-auto bg-white rounded-2xl p-6 sm:p-8 shadow-2xl border-2 border-[#c9a751] my-auto flex flex-col justify-between">
            {renderContent(true)}
          </div>
        </div>
      )}
    </>
  );
}
