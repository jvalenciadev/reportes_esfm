'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { MaximizeIcon, MinimizeIcon, XIcon } from '../ui/Icons';

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
  xLabelFormatter?: (val: number) => string;
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
  xLabelFormatter,
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

  // Rango de valores (min y max) adaptativo con soporte para negativos
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
    const span = Math.abs(max - min) || Math.abs(max) || 10;
    const margin = span * 0.12;

    const hasNegatives = min < 0;
    const computedMin = hasNegatives
      ? Math.floor((min - margin) * 10) / 10
      : Math.max(0, Math.floor((min - margin) * 10) / 10);
    const computedMax = Math.ceil((max + margin) * 10) / 10;

    return {
      minValue: computedMin,
      maxValue: computedMax === computedMin ? computedMin + 10 : computedMax,
    };
  }, [visibleSeries]);

  const valueRange = maxValue - minValue || 1;

  // Sincronizar series activas cuando cambia la lista de series
  useEffect(() => {
    setActiveSeries((prev) => {
      const next: Record<string, boolean> = {};
      series.forEach((s) => {
        next[s.id] = prev[s.id] !== undefined ? prev[s.id] : true;
      });
      return next;
    });
  }, [series]);

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

  // Ticks eje Y adaptables (incluyendo valores negativos)
  const yTicksCount = isExpanded ? 6 : 5;
  const yAxisTicks = useMemo(() => {
    const ticks: number[] = [];
    for (let i = 0; i <= yTicksCount; i++) {
      const val = minValue + (valueRange * i) / yTicksCount;
      const formatted = Math.abs(valueRange) < 20 ? Math.round(val * 10) / 10 : Math.round(val);
      ticks.push(formatted);
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

  const renderContent = (fullscreen: boolean) => {
    const chartHeight = fullscreen ? 460 : height;
    const chartWidth = fullscreen ? 1050 : 850;
    const chartInnerWidth = chartWidth - padding.left - padding.right;
    const chartInnerHeight = chartHeight - padding.top - padding.bottom;

    const calcX = (year: number) => {
      if (allYears.length <= 1) return padding.left;
      const min = allYears[0];
      const max = allYears[allYears.length - 1];
      return padding.left + ((year - min) / (max - min)) * chartInnerWidth;
    };

    const calcY = (val: number) => {
      if (valueRange === 0) return padding.top + chartInnerHeight / 2;
      return padding.top + chartInnerHeight - ((val - minValue) / valueRange) * chartInnerHeight;
    };

    return (
      <div className="w-full flex flex-col justify-between">
        {/* Encabezado con Botón Dinámico de Agrandar / Restaurar */}
        <div className="flex flex-col gap-3 mb-4 pb-3 border-b border-slate-100">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-[#c9a751] shrink-0" />
                <h3 className={`font-semibold text-slate-900 tracking-tight leading-snug ${fullscreen ? 'text-xl sm:text-2xl' : 'text-base'}`}>
                  {title}
                </h3>
                {fullscreen && (
                  <span className="text-[10px] uppercase font-medium tracking-wider px-2 py-0.5 rounded bg-[#faf5e8] text-[#c9a751] border border-[#e5d5a6]">
                    Modo Presentación Pantalla Completa
                  </span>
                )}
              </div>
              {subtitle && <p className="text-xs text-slate-500 mt-1">{subtitle}</p>}
            </div>

            {/* Botón dinámico Agrandar / Restaurar cuadro */}
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className={`px-3 py-1.5 rounded-xl text-xs font-medium border transition-all flex items-center gap-1.5 shrink-0 ${
                fullscreen
                  ? 'bg-[#faf5e8] text-[#c9a751] border-[#c9a751] shadow-xs ring-1 ring-[#c9a751]'
                  : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100 hover:text-slate-900'
              }`}
              title={fullscreen ? 'Cerrar pantalla completa (Esc)' : 'Agrandar a pantalla completa'}
            >
              {fullscreen ? (
                <>
                  <XIcon size={14} />
                  <span>Salir Pantalla Completa</span>
                </>
              ) : (
                <>
                  <MaximizeIcon size={14} />
                  <span>Agrandar</span>
                </>
              )}
            </button>
          </div>

          {/* Controles de Leyenda de Series */}
          {series.length > 0 && (
            <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
              {series.map((s) => {
                const isActive = activeSeries[s.id];
                return (
                  <button
                    key={s.id}
                    onClick={() => toggleSeries(s.id)}
                    className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium border transition-all ${
                      isActive
                        ? 'bg-slate-50 border-slate-300 text-slate-800 shadow-2xs'
                        : 'bg-white border-slate-200 text-slate-400 opacity-60 line-through'
                    }`}
                  >
                    <span
                      className="w-2.5 h-2.5 rounded-full shrink-0"
                      style={{ backgroundColor: s.color }}
                    />
                    <span className="truncate max-w-[220px]">{s.name}</span>
                  </button>
                );
              })}
            </div>
          )}
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
                  fontWeight="500"
                  fill="#475569"
                >
                  {xLabelFormatter ? xLabelFormatter(year) : year}
                </text>
              </g>
            );
          })}

          {/* Línea cero de referencia cuando hay valores negativos */}
          {minValue < 0 && maxValue > 0 && (
            <g>
              <line
                x1={padding.left}
                y1={getY(0)}
                x2={width - padding.right}
                y2={getY(0)}
                stroke="#64748B"
                strokeWidth="1.5"
                strokeDasharray="4 4"
              />
              <text
                x={width - padding.right + 6}
                y={getY(0) + 3.5}
                fontSize="10"
                fontWeight="600"
                fill="#475569"
              >
                0{unit}
              </text>
            </g>
          )}

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

            const baselineY = minValue < 0 && maxValue > 0 ? getY(0) : (padding.top + innerHeight);
            const areaPath = `
              ${linePath}
              L ${points[points.length - 1].x.toFixed(1)} ${baselineY.toFixed(1)}
              L ${points[0].x.toFixed(1)} ${baselineY.toFixed(1)}
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
              <div className="flex items-center gap-1.5 mb-1.5 pb-1 border-b border-slate-700/80 text-[10px] text-slate-300 font-medium uppercase">
                <span
                  className="w-2.5 h-2.5 rounded-full shrink-0"
                  style={{ backgroundColor: hoveredPoint.seriesColor }}
                />
                <span className="truncate">{hoveredPoint.seriesName}</span>
              </div>

              <div className="flex items-baseline justify-between gap-3">
                <span className="text-slate-400 text-[11px] font-medium">
                  {xLabelFormatter ? xLabelFormatter(hoveredPoint.year) : `Gestión ${hoveredPoint.year}`}:
                </span>
                <strong className="text-white text-sm font-semibold">
                  {hoveredPoint.value.toLocaleString('es-BO')} {unit}
                </strong>
              </div>

              {hoveredPoint.prevValue !== undefined && hoveredPoint.prevValue > 0 && (
                <div className="mt-1.5 pt-1.5 border-t border-slate-800 flex items-center justify-between text-[10px]">
                  <span className="text-slate-400">Variación anual:</span>
                  <span
                    className={`font-semibold ${
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
        {fullscreen && (
          <div className="mt-5 pt-4 border-t border-slate-200 overflow-x-auto">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                Tabla Completa de Datos Censales por Gestión (Modo Exposición):
              </span>
              <span className="text-xs text-slate-400">
                {allYears.length} {xLabelFormatter ? 'puntos en comparación' : 'Gestiones registradas'}
              </span>
            </div>
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-medium">
                  <th className="py-2.5 px-3">{xLabelFormatter ? 'Referencia / Categoría' : 'Gestión'}</th>
                  {visibleSeries.map((s) => (
                    <th key={s.id} className="py-2.5 px-3 text-right" style={{ color: s.color }}>
                      {s.name}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {allYears.map((year) => (
                  <tr key={year} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-2 px-3 font-medium text-slate-900">{xLabelFormatter ? xLabelFormatter(year) : year}</td>
                    {visibleSeries.map((s) => {
                      const row = s.data.find((d) => d.year === year);
                      return (
                        <td key={s.id} className="py-2 px-3 text-right font-semibold text-slate-800">
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
  };

  return (
    <>
      {/* Contenedor Normal en el Grid */}
      <div className="bg-white rounded-2xl border border-slate-200 transition-all duration-300 p-5 shadow-xs flex flex-col justify-between">
        {renderContent(false)}
      </div>

      {/* Modal Pantalla Completa Absoluta (Agrandar Completo) */}
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
