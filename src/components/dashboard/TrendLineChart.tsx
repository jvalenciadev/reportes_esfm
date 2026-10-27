'use client';

import React, { useState, useMemo } from 'react';

export interface TrendSeries {
  id: string;
  name: string;
  color: string;
  data: { year: number; value: number }[];
}

interface TrendLineChartProps {
  title: string;
  subtitle?: string;
  series: TrendSeries[];
  unit?: string;
  height?: number;
  showPoints?: boolean;
  showArea?: boolean;
  defaultExpanded?: boolean;
}

export function TrendLineChart({
  title,
  subtitle,
  series,
  unit = '',
  height = 300,
  showPoints = true,
  showArea = true,
  defaultExpanded = false,
}: TrendLineChartProps) {
  const [isExpanded, setIsExpanded] = useState<boolean>(defaultExpanded);

  const [hoveredPoint, setHoveredPoint] = useState<{
    seriesName: string;
    seriesColor: string;
    year: number;
    value: number;
    prevValue?: number;
    x: number;
    y: number;
  } | null>(null);

  const [activeSeries, setActiveSeries] = useState<Record<string, boolean>>(() => {
    const init: Record<string, boolean> = {};
    series.forEach((s) => {
      init[s.id] = true;
    });
    return init;
  });

  const visibleSeries = useMemo(
    () => series.filter((s) => activeSeries[s.id]),
    [series, activeSeries]
  );

  // Obtener todos los años únicos en orden
  const allYears = useMemo(() => {
    const yearsSet = new Set<number>();
    series.forEach((s) => s.data.forEach((d) => yearsSet.add(d.year)));
    return Array.from(yearsSet).sort((a, b) => a - b);
  }, [series]);

  // Altura y ancho dinámicos según isExpanded
  const dynamicHeight = isExpanded ? 440 : height;
  const padding = { top: 35, right: 35, bottom: 45, left: 70 };
  const width = isExpanded ? 980 : 850;
  const innerWidth = width - padding.left - padding.right;
  const innerHeight = dynamicHeight - padding.top - padding.bottom;

  // Rango de valores (min y max)
  const { minValue, maxValue } = useMemo(() => {
    let min = Infinity;
    let max = -Infinity;
    visibleSeries.forEach((s) => {
      s.data.forEach((d) => {
        if (d.value < min) min = d.value;
        if (d.value > max) max = d.value;
      });
    });
    if (min === Infinity) return { minValue: 0, maxValue: 100 };
    const margin = (max - min) * 0.1 || max * 0.1 || 10;
    return {
      minValue: Math.max(0, Math.floor(min - margin)),
      maxValue: Math.ceil(max + margin),
    };
  }, [visibleSeries]);

  const valueRange = maxValue - minValue || 1;

  // Funciones de escala
  const getX = (year: number) => {
    if (allYears.length <= 1) return padding.left + innerWidth / 2;
    const minYear = allYears[0];
    const maxYear = allYears[allYears.length - 1];
    const fraction = (year - minYear) / (maxYear - minYear || 1);
    return padding.left + fraction * innerWidth;
  };

  const getY = (val: number) => {
    const fraction = (val - minValue) / valueRange;
    return padding.top + innerHeight - fraction * innerHeight;
  };

  // Ticks eje Y
  const yTicksCount = isExpanded ? 6 : 5;
  const yAxisTicks = useMemo(() => {
    const ticks = [];
    for (let i = 0; i <= yTicksCount; i++) {
      const val = Math.round(minValue + (valueRange * i) / yTicksCount);
      ticks.push(val);
    }
    return ticks;
  }, [minValue, valueRange, yTicksCount]);

  // Ticks eje X
  const xTicks = useMemo(() => {
    if (isExpanded || allYears.length <= 15) return allYears;
    const step = Math.ceil(allYears.length / 10);
    return allYears.filter((_, idx) => idx % step === 0 || idx === allYears.length - 1);
  }, [allYears, isExpanded]);

  const toggleSeries = (id: string) => {
    setActiveSeries((prev) => {
      const next = { ...prev, [id]: !prev[id] };
      if (!Object.values(next).some(Boolean)) return prev;
      return next;
    });
  };

  return (
    <div
      className={`bg-white rounded-2xl border transition-all duration-300 p-5 shadow-xs flex flex-col justify-between ${
        isExpanded
          ? 'col-span-full border-[#c9a751] shadow-md ring-1 ring-[#c9a751]/30'
          : 'border-slate-200'
      }`}
    >
      {/* Encabezado con Botón Dinámico de Agrandar / Restaurar */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-3 mb-4 pb-3 border-b border-slate-100">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[#c9a751] shrink-0" />
            <h3 className={`font-black text-slate-900 tracking-tight leading-snug ${isExpanded ? 'text-lg sm:text-xl' : 'text-base'}`}>
              {title}
            </h3>
          </div>
          {subtitle && <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>}
        </div>

        {/* Controles: Leyenda y Botón Agrandar */}
        <div className="flex items-center gap-2 flex-wrap shrink-0">
          {/* Botones de series */}
          <div className="flex items-center gap-1.5 flex-wrap">
            {series.map((s) => {
              const isActive = activeSeries[s.id];
              return (
                <button
                  key={s.id}
                  onClick={() => toggleSeries(s.id)}
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold border transition-all ${
                    isActive
                      ? 'bg-slate-50 border-slate-300 text-slate-800 shadow-2xs'
                      : 'bg-white border-slate-200 text-slate-400 opacity-60 line-through'
                  }`}
                >
                  <span
                    className="w-2.5 h-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: s.color }}
                  />
                  <span className="truncate max-w-[140px]">{s.name}</span>
                </button>
              );
            })}
          </div>

          {/* Botón dinámico Agrandar / Restaurar cuadro */}
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className={`px-3 py-1 rounded-xl text-xs font-bold border transition-all flex items-center gap-1 ${
              isExpanded
                ? 'bg-[#faf5e8] text-[#7d6325] border-[#c9a751] shadow-2xs ring-1 ring-[#c9a751]'
                : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100 hover:text-slate-900'
            }`}
            title={isExpanded ? 'Restaurar tamaño normal' : 'Agrandar este cuadro dinámicamente'}
          >
            <span>{isExpanded ? '✕ Restaurar' : '⛶ Agrandar'}</span>
          </button>
        </div>
      </div>

      {/* Gráfico SVG en Alta Resolución */}
      <div className="relative w-full pt-1 pb-1">
        <svg
          viewBox={`0 0 ${width} ${dynamicHeight}`}
          className="w-full h-auto select-none overflow-visible"
          onMouseLeave={() => setHoveredPoint(null)}
        >
          <defs>
            {visibleSeries.map((s) => (
              <linearGradient
                key={s.id}
                id={`grad-${s.id}`}
                x1="0%"
                y1="0%"
                x2="0%"
                y2="100%"
              >
                <stop offset="0%" stopColor={s.color} stopOpacity="0.25" />
                <stop offset="100%" stopColor={s.color} stopOpacity="0.0" />
              </linearGradient>
            ))}
          </defs>

          {/* Líneas guía horizontales */}
          {yAxisTicks.map((val, idx) => {
            const y = getY(val);
            return (
              <g key={idx}>
                <line
                  x1={padding.left}
                  y1={y}
                  x2={width - padding.right}
                  y2={y}
                  stroke="#E2E8F0"
                  strokeDasharray="3 3"
                  strokeWidth="1"
                />
                <text
                  x={padding.left - 10}
                  y={y + 3.5}
                  textAnchor="end"
                  fontSize={isExpanded ? '11' : '10'}
                  fontWeight="700"
                  fill="#64748B"
                  fontFamily="monospace"
                >
                  {val >= 1000000
                    ? `${(val / 1000000).toFixed(1)}M`
                    : val >= 1000
                    ? `${(val / 1000).toFixed(0)}k`
                    : val}
                </text>
              </g>
            );
          })}

          {/* Eje X (Años) */}
          {xTicks.map((year) => {
            const x = getX(year);
            return (
              <g key={year}>
                <line
                  x1={x}
                  y1={padding.top + innerHeight}
                  x2={x}
                  y2={padding.top + innerHeight + 5}
                  stroke="#94A3B8"
                  strokeWidth="1.2"
                />
                <text
                  x={x}
                  y={padding.top + innerHeight + 18}
                  textAnchor="middle"
                  fontSize={isExpanded ? '11' : '10'}
                  fontWeight="700"
                  fill="#475569"
                  fontFamily="monospace"
                >
                  {year}
                </text>
              </g>
            );
          })}

          {/* Línea base X */}
          <line
            x1={padding.left}
            y1={padding.top + innerHeight}
            x2={width - padding.right}
            y2={padding.top + innerHeight}
            stroke="#94A3B8"
            strokeWidth="1.5"
          />

          {/* Trazos de serie */}
          {visibleSeries.map((s) => {
            if (s.data.length === 0) return null;
            const sortedData = [...s.data].sort((a, b) => a.year - b.year);

            const points = sortedData.map((d) => ({
              x: getX(d.year),
              y: getY(d.value),
              ...d,
            }));

            const linePath = points
              .map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`)
              .join(' ');

            const areaPath = `
              ${linePath}
              L ${points[points.length - 1].x.toFixed(1)} ${padding.top + innerHeight}
              L ${points[0].x.toFixed(1)} ${padding.top + innerHeight}
              Z
            `;

            return (
              <g key={s.id}>
                {showArea && (
                  <path
                    d={areaPath}
                    fill={`url(#grad-${s.id})`}
                    className="transition-opacity duration-300"
                  />
                )}

                <path
                  d={linePath}
                  fill="none"
                  stroke={s.color}
                  strokeWidth={isExpanded ? '3.5' : '2.8'}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="transition-all duration-300"
                />

                {showPoints &&
                  points.map((pt, pIdx) => {
                    const prevPt = pIdx > 0 ? sortedData[pIdx - 1] : undefined;
                    const isHovered =
                      hoveredPoint &&
                      hoveredPoint.seriesName === s.name &&
                      hoveredPoint.year === pt.year;

                    return (
                      <g key={pIdx}>
                        <circle
                          cx={pt.x}
                          cy={pt.y}
                          r={isHovered ? 7 : isExpanded ? 4.5 : 3.5}
                          fill="#ffffff"
                          stroke={s.color}
                          strokeWidth={isHovered ? 3.5 : 2.2}
                          className="cursor-pointer transition-all"
                          onMouseEnter={() =>
                            setHoveredPoint({
                              seriesName: s.name,
                              seriesColor: s.color,
                              year: pt.year,
                              value: pt.value,
                              prevValue: prevPt?.value,
                              x: pt.x,
                              y: pt.y,
                            })
                          }
                        />

                        {/* En modo agrandado, mostrar etiqueta numérica de los puntos principales */}
                        {isExpanded && points.length <= 15 && (
                          <text
                            x={pt.x}
                            y={pt.y - 9}
                            textAnchor="middle"
                            fontSize="9"
                            fontWeight="800"
                            fill={s.color}
                            fontFamily="monospace"
                          >
                            {pt.value >= 1000000
                              ? `${(pt.value / 1000000).toFixed(2)}M`
                              : pt.value >= 1000
                              ? `${(pt.value / 1000).toFixed(0)}k`
                              : pt.value}
                          </text>
                        )}
                      </g>
                    );
                  })}
              </g>
            );
          })}
        </svg>

        {/* Tooltip con detección dinámica de bordes */}
        {hoveredPoint && (() => {
          const isTop = hoveredPoint.y < 85;
          const isRight = hoveredPoint.x > width * 0.72;
          const isLeft = hoveredPoint.x < width * 0.28;
          const xPercent = (hoveredPoint.x / width) * 100;
          const yPercent = (hoveredPoint.y / dynamicHeight) * 100;

          const transformX = isRight ? '-90%' : isLeft ? '-10%' : '-50%';
          const transformY = isTop ? '12px' : '-100%';
          const marginTop = isTop ? '14px' : '-14px';

          return (
            <div
              className="absolute z-30 pointer-events-none bg-slate-900/95 text-white rounded-xl p-3 text-xs shadow-xl border border-slate-700 min-w-[150px] backdrop-blur-xs transition-all"
              style={{
                left: `${xPercent}%`,
                top: `${yPercent}%`,
                transform: `translate(${transformX}, ${transformY})`,
                marginTop,
              }}
            >
              <div className="flex items-center gap-1.5 mb-1.5 pb-1 border-b border-slate-700/80 text-[10px] text-slate-300 font-bold uppercase">
                <span
                  className="w-2.5 h-2.5 rounded-full shrink-0"
                  style={{ backgroundColor: hoveredPoint.seriesColor }}
                />
                <span className="truncate">{hoveredPoint.seriesName}</span>
              </div>

              <div className="flex items-baseline justify-between gap-3">
                <span className="text-slate-400 text-[11px] font-medium">Gestión {hoveredPoint.year}:</span>
                <strong className="text-white font-mono text-sm font-black">
                  {hoveredPoint.value.toLocaleString('es-BO')} {unit}
                </strong>
              </div>

              {hoveredPoint.prevValue !== undefined && hoveredPoint.prevValue > 0 && (
                <div className="mt-1.5 pt-1.5 border-t border-slate-800 flex items-center justify-between text-[10px]">
                  <span className="text-slate-400">Variación anual:</span>
                  <span
                    className={`font-black font-mono ${
                      hoveredPoint.value >= hoveredPoint.prevValue
                        ? 'text-emerald-400'
                        : 'text-rose-400'
                    }`}
                  >
                    {hoveredPoint.value >= hoveredPoint.prevValue ? '+' : ''}
                    {(
                      ((hoveredPoint.value - hoveredPoint.prevValue) /
                        hoveredPoint.prevValue) *
                      100
                    ).toFixed(1)}
                    %
                  </span>
                </div>
              )}
            </div>
          );
        })()}
      </div>

      {/* Tabla Cronológica Detallada que aparece cuando el usuario agranda el cuadro */}
      {isExpanded && (
        <div className="mt-4 pt-4 border-t border-slate-100 overflow-x-auto">
          <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-2 font-mono">
            Tabla Completa de Datos por Año (Modo Exposición):
          </span>
          <table className="w-full text-left border-collapse text-xs font-mono">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold">
                <th className="py-2 px-3">Gestión</th>
                {visibleSeries.map((s) => (
                  <th key={s.id} className="py-2 px-3 text-right" style={{ color: s.color }}>
                    {s.name}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {allYears.map((year) => (
                <tr key={year} className="hover:bg-slate-50/70">
                  <td className="py-2 px-3 font-bold text-slate-900">{year}</td>
                  {visibleSeries.map((s) => {
                    const row = s.data.find((d) => d.year === year);
                    return (
                      <td key={s.id} className="py-2 px-3 text-right font-black text-slate-800">
                        {row ? `${row.value.toLocaleString('es-BO')} ${unit}` : '-'}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
