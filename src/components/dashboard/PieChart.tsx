'use client';

import React, { useState } from 'react';
import { MaximizeIcon, MinimizeIcon } from '../ui/Icons';

export interface PieSlice {
  label: string;
  value: number;
  color: string;
  sublabel?: string;
}

interface PieChartProps {
  title: string;
  subtitle?: string;
  data: PieSlice[];
  donut?: boolean;
  size?: number;
  unit?: string;
  defaultExpanded?: boolean;
}

export function PieChart({
  title,
  subtitle,
  data,
  donut = true,
  size = 220,
  unit = '',
  defaultExpanded = false,
}: PieChartProps) {
  const [isExpanded, setIsExpanded] = useState<boolean>(defaultExpanded);
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  const total = data.reduce((acc, d) => acc + (d.value || 0), 0);
  if (total === 0) {
    return (
      <div className="bg-white rounded-xl border border-slate-200/90 p-5 shadow-xs text-center text-slate-400 text-xs">
        Sin datos disponibles
      </div>
    );
  }

  // Dimensiones dinámicas seguras y adaptables
  const dynamicSize = isExpanded ? 280 : (size > 200 ? 190 : size);
  const cx = dynamicSize / 2;
  const cy = dynamicSize / 2;
  const radius = dynamicSize * 0.42;
  const innerRadius = donut ? radius * 0.58 : 0;

  // Calcular arcos de cada rebanada
  let accumulatedAngle = -Math.PI / 2;

  const slices = data.map((item, idx) => {
    const fraction = item.value / total;
    const sliceAngle = fraction * 2 * Math.PI;
    const startAngle = accumulatedAngle;
    const endAngle = accumulatedAngle + sliceAngle;
    accumulatedAngle = endAngle;

    const x1 = cx + radius * Math.cos(startAngle);
    const y1 = cy + radius * Math.sin(startAngle);
    const x2 = cx + radius * Math.cos(endAngle);
    const y2 = cy + radius * Math.sin(endAngle);

    const ix1 = cx + innerRadius * Math.cos(endAngle);
    const iy1 = cy + innerRadius * Math.sin(endAngle);
    const ix2 = cx + innerRadius * Math.cos(startAngle);
    const iy2 = cy + innerRadius * Math.sin(startAngle);

    const largeArc = sliceAngle > Math.PI ? 1 : 0;

    const pathData = donut
      ? `M ${x1} ${y1} A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2} L ${ix1} ${iy1} A ${innerRadius} ${innerRadius} 0 ${largeArc} 0 ${ix2} ${iy2} Z`
      : `M ${cx} ${cy} L ${x1} ${y1} A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2} Z`;

    const percent = Math.round(fraction * 1000) / 10;

    return {
      ...item,
      pathData,
      percent,
      idx,
    };
  });

  const activeSlice = hoveredIdx !== null ? slices[hoveredIdx] : null;

  return (
    <div
      className={`bg-white rounded-2xl border transition-all duration-300 p-4 sm:p-5 shadow-xs flex flex-col justify-between min-w-0 max-w-full overflow-hidden ${
        isExpanded
          ? 'col-span-full border-[#c9a751] shadow-md ring-1 ring-[#c9a751]/30'
          : 'border-slate-200/90'
      }`}
    >
      {/* Cabecera con Botón Dinámico de Agrandar */}
      <div className="flex items-start justify-between gap-2 mb-3 pb-2 border-b border-slate-100 min-w-0">
        <div className="min-w-0 flex-1 pr-2">
          <h3 className={`font-semibold text-slate-900 leading-snug line-clamp-2 ${isExpanded ? 'text-lg sm:text-xl' : 'text-sm sm:text-base'}`} title={title}>
            {title}
          </h3>
          {subtitle && <p className="text-xs text-slate-500 mt-0.5 line-clamp-1">{subtitle}</p>}
        </div>

        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className={`px-2.5 py-1 rounded-xl text-xs font-medium border transition-all shrink-0 flex items-center gap-1.5 ${
            isExpanded
              ? 'bg-[#faf5e8] text-[#c9a751] border-[#c9a751] shadow-2xs ring-1 ring-[#c9a751]'
              : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100 hover:text-slate-900'
          }`}
          title={isExpanded ? 'Restaurar tamaño normal' : 'Agrandar gráfico al ancho completo'}
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

      {/* Cuerpo del Gráfico y Leyenda con disposición horizontal responsiva */}
      <div className={`flex flex-col sm:flex-row items-center justify-center gap-5 sm:gap-6 my-2 min-w-0 w-full ${
        isExpanded ? 'lg:gap-8' : ''
      }`}>
        {/* Gráfico SVG Circular con contención estricta */}
        <div
          className="relative shrink-0 flex items-center justify-center"
          style={{ width: dynamicSize, height: dynamicSize, maxWidth: '100%' }}
        >
          <svg
            width={dynamicSize}
            height={dynamicSize}
            viewBox={`0 0 ${dynamicSize} ${dynamicSize}`}
            className="overflow-visible max-w-full h-auto"
          >
            {slices.map((slice) => {
              const isHovered = hoveredIdx === slice.idx;
              return (
                <path
                  key={slice.idx}
                  d={slice.pathData}
                  fill={slice.color}
                  stroke="#ffffff"
                  strokeWidth="2.5"
                  className="transition-all duration-200 cursor-pointer"
                  style={{
                    filter: isHovered ? 'brightness(1.08) drop-shadow(0 4px 6px rgba(0,0,0,0.18))' : 'none',
                    transform: isHovered ? 'scale(1.03)' : 'scale(1)',
                    transformOrigin: `${cx}px ${cy}px`,
                  }}
                  onMouseEnter={() => setHoveredIdx(slice.idx)}
                  onMouseLeave={() => setHoveredIdx(null)}
                />
              );
            })}
          </svg>

          {/* Centro de la dona informativo */}
          {donut && (
            <div
              className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center px-1"
              style={{
                width: innerRadius * 2,
                height: innerRadius * 2,
                top: cy - innerRadius,
                left: cx - innerRadius,
              }}
            >
              {activeSlice ? (
                <>
                  <span className="text-[10px] font-medium uppercase tracking-wider text-slate-500 line-clamp-1">
                    {activeSlice.label}
                  </span>
                  <span className="text-base sm:text-lg font-semibold text-slate-900 leading-tight">
                    {activeSlice.percent}%
                  </span>
                  <span className="text-[10px] text-slate-600 font-medium truncate max-w-full">
                    {activeSlice.value.toLocaleString('es-BO')}
                  </span>
                </>
              ) : (
                <>
                  <span className="text-[9px] font-medium uppercase tracking-wider text-slate-400">
                    Total
                  </span>
                  <span className={`font-semibold text-slate-900 leading-tight px-1 ${
                    total >= 10000000 ? 'text-xs sm:text-sm' : total >= 1000000 ? 'text-sm' : 'text-base'
                  }`}>
                    {total.toLocaleString('es-BO')}
                  </span>
                  {unit && <span className="text-[9px] text-slate-500 truncate max-w-full">{unit}</span>}
                </>
              )}
            </div>
          )}
        </div>

        {/* Leyenda Adaptativa con Cuadros Contenidos para evitar desbordes */}
        <div className="flex-1 min-w-0 w-full space-y-2">
          {slices.map((slice) => {
            const isHovered = hoveredIdx === slice.idx;
            return (
              <div
                key={slice.idx}
                onMouseEnter={() => setHoveredIdx(slice.idx)}
                onMouseLeave={() => setHoveredIdx(null)}
                className={`p-2.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between text-xs min-w-0 w-full ${
                  isHovered
                    ? 'bg-slate-100/90 border-[#c9a751] shadow-2xs'
                    : 'bg-slate-50/70 border-slate-200/80 hover:bg-slate-100'
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0 flex-1 pr-2">
                  <span
                    className="w-3.5 h-3.5 rounded-full shrink-0 shadow-2xs ring-2 ring-white"
                    style={{ backgroundColor: slice.color }}
                  />
                  <div className="min-w-0 flex-1">
                    <span className="font-medium text-slate-900 truncate block text-xs" title={slice.label}>
                      {slice.label}
                    </span>
                    {slice.sublabel && (
                      <span className="text-[10px] text-slate-500 block truncate" title={slice.sublabel}>
                        {slice.sublabel}
                      </span>
                    )}
                  </div>
                </div>

                <div className="text-right shrink-0 pl-1">
                  <span className="font-semibold text-slate-900 text-xs block">
                    {slice.value.toLocaleString('es-BO')}
                  </span>
                  <span className="text-[10px] font-semibold text-[#c9a751] bg-[#faf5e8] px-1.5 py-0.5 rounded border border-[#e5d5a6] inline-block mt-0.5">
                    {slice.percent}%
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
