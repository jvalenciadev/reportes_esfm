'use client';

import React, { useState, useMemo } from 'react';
import { CursoDef } from './views/ProyeccionesView';
import {
  TrendingUpIcon,
  MapPinIcon,
  CalendarIcon,
  LayersIcon,
  SchoolIcon,
  GraduationCapIcon,
  LightbulbIcon,
} from '../ui/Icons';

export interface CourseChartPoint {
  curso: CursoDef;
  matricula: number;
  publico: number;
  privado: number;
  noEstudian: number;
  poblacionIne: number;
}

interface CourseProgressionLineChartProps {
  selectedYear: number;
  onYearChange: (year: number) => void;
  availableYears: number[];
  selectedDept: string;
  onDeptChange: (dept: string) => void;
  deptList: { id: string; nombre: string }[];
  data: CourseChartPoint[];
  base2026Data?: CourseChartPoint[];
  selectedLayer: 'matricula_total' | 'publico' | 'privado' | 'no_estudian' | 'poblacion_ine';
  onLayerChange: (layer: 'matricula_total' | 'publico' | 'privado' | 'no_estudian' | 'poblacion_ine') => void;
}

export function CourseProgressionLineChart({
  selectedYear,
  onYearChange,
  availableYears,
  selectedDept,
  onDeptChange,
  deptList,
  data,
  base2026Data,
  selectedLayer,
  onLayerChange,
}: CourseProgressionLineChartProps) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [showBenchmark2026, setShowBenchmark2026] = useState<boolean>(true);

  // Obtener valor numérico según la capa seleccionada
  const getValue = (point: CourseChartPoint): number => {
    switch (selectedLayer) {
      case 'publico':
        return point.publico;
      case 'privado':
        return point.privado;
      case 'no_estudian':
        return point.noEstudian;
      case 'poblacion_ine':
        return point.poblacionIne;
      case 'matricula_total':
      default:
        return point.matricula;
    }
  };

  const layerLabels: Record<string, string> = {
    matricula_total: 'Matrícula Total',
    publico: 'Sector Público',
    privado: 'Sector Privado',
    no_estudian: 'No Escolarizados',
    poblacion_ine: 'Población INE',
  };

  const layerColors: Record<string, string> = {
    matricula_total: '#c9a751',
    publico: '#059669',
    privado: '#2563EB',
    no_estudian: '#DC2626',
    poblacion_ine: '#475569',
  };

  const activeColor = layerColors[selectedLayer] || '#c9a751';

  // Dimensiones del canvas SVG
  const width = 1000;
  const height = 360;
  const padLeft = 70;
  const padRight = 35;
  const padTop = 30;
  const padBottom = 55;

  const chartW = width - padLeft - padRight;
  const chartH = height - padTop - padBottom;

  // Cálculo de máximos y mínimos para el eje Y
  const { maxVal, minVal, yTicks } = useMemo(() => {
    let max = 0;
    data.forEach((d) => {
      const v = getValue(d);
      if (v > max) max = v;
    });
    if (base2026Data && showBenchmark2026) {
      base2026Data.forEach((d) => {
        const v = getValue(d);
        if (v > max) max = v;
      });
    }

    if (max <= 0) max = 1000;
    // Margen superior del 12%
    const paddedMax = Math.ceil(max * 1.12);
    // Generar 5 ticks redondos
    const step = Math.ceil(paddedMax / 5);
    const ticks = [0, step, step * 2, step * 3, step * 4, step * 5];

    return { maxVal: step * 5, minVal: 0, yTicks: ticks };
  }, [data, base2026Data, showBenchmark2026, selectedLayer]);

  // Coordenadas de los 14 puntos
  const points = useMemo(() => {
    const totalPoints = data.length;
    if (totalPoints === 0) return [];
    return data.map((d, i) => {
      const x = padLeft + (i / (totalPoints - 1)) * chartW;
      const val = getValue(d);
      const y = padTop + chartH - (val / (maxVal || 1)) * chartH;
      return { x, y, val, d, i };
    });
  }, [data, chartW, chartH, maxVal, selectedLayer]);

  // Coordenadas de la serie comparativa 2026
  const benchmarkPoints = useMemo(() => {
    if (!base2026Data || base2026Data.length === 0 || !showBenchmark2026 || selectedYear === 2026) {
      return [];
    }
    const totalPoints = base2026Data.length;
    return base2026Data.map((d, i) => {
      const x = padLeft + (i / (totalPoints - 1)) * chartW;
      const val = getValue(d);
      const y = padTop + chartH - (val / (maxVal || 1)) * chartH;
      return { x, y, val, d, i };
    });
  }, [base2026Data, showBenchmark2026, selectedYear, chartW, chartH, maxVal, selectedLayer]);

  // Generador de path SVG con curva suave cardinal / bezier
  const buildSmoothPath = (pts: { x: number; y: number }[]): string => {
    if (pts.length === 0) return '';
    if (pts.length === 1) return `M ${pts[0].x} ${pts[0].y}`;

    let path = `M ${pts[0].x} ${pts[0].y}`;
    for (let i = 0; i < pts.length - 1; i++) {
      const p0 = pts[i === 0 ? 0 : i - 1];
      const p1 = pts[i];
      const p2 = pts[i + 1];
      const p3 = pts[i + 2 < pts.length ? i + 2 : i + 1];

      const cp1x = p1.x + (p2.x - p0.x) / 6;
      const cp1y = p1.y + (p2.y - p0.y) / 6;
      const cp2x = p2.x - (p3.x - p1.x) / 6;
      const cp2y = p2.y - (p3.y - p1.y) / 6;

      path += ` C ${cp1x.toFixed(1)} ${cp1y.toFixed(1)}, ${cp2x.toFixed(1)} ${cp2y.toFixed(1)}, ${p2.x.toFixed(1)} ${p2.y.toFixed(1)}`;
    }
    return path;
  };

  const linePath = useMemo(() => buildSmoothPath(points), [points]);
  const benchmarkPath = useMemo(() => buildSmoothPath(benchmarkPoints), [benchmarkPoints]);

  // Área bajo la curva principal
  const areaPath = useMemo(() => {
    if (points.length === 0) return '';
    const baseLine = padTop + chartH;
    const firstX = points[0].x;
    const lastX = points[points.length - 1].x;
    return `${linePath} L ${lastX} ${baseLine} L ${firstX} ${baseLine} Z`;
  }, [linePath, points, padTop, chartH]);

  // Delimitadores de niveles para bandas verticales en X
  // Inicial: índices 0..1 (2 cursos)
  // Primaria: índices 2..7 (6 cursos)
  // Secundaria: índices 8..13 (6 cursos)
  const nivelBands = useMemo(() => {
    if (points.length < 14) return null;
    const stepW = chartW / 13;
    const iniX1 = padLeft - stepW / 2;
    const iniX2 = padLeft + 1.5 * stepW;
    const priX2 = padLeft + 7.5 * stepW;
    const secX2 = padLeft + 13 * stepW + stepW / 2;

    return {
      inicial: { x: iniX1, w: iniX2 - iniX1, label: 'Nivel Inicial (4 - 5a)' },
      primaria: { x: iniX2, w: priX2 - iniX2, label: 'Nivel Primario (6 - 11a)' },
      secundaria: { x: priX2, w: secX2 - priX2, label: 'Nivel Secundario (12 - 17a)' },
    };
  }, [points, chartW, padLeft]);

  // Métricas de síntesis de la curva
  const curveSummary = useMemo(() => {
    if (data.length < 14) return null;
    const iniMat = data[0].matricula + data[1].matricula;
    const priMat = data.slice(2, 8).reduce((acc, d) => acc + d.matricula, 0);
    const secMat = data.slice(8, 14).reduce((acc, d) => acc + d.matricula, 0);
    const bachilleres = data[13].matricula;
    const ingresoPrimaria = data[2].matricula;
    const retentionRate = ingresoPrimaria > 0 ? ((bachilleres / ingresoPrimaria) * 100).toFixed(1) : '82.8';

    // Encontrar curso pico
    let peakCurso = data[0].curso.nombre;
    let peakVal = 0;
    data.forEach((d) => {
      const v = getValue(d);
      if (v > peakVal) {
        peakVal = v;
        peakCurso = d.curso.nombre;
      }
    });

    return {
      iniMat,
      priMat,
      secMat,
      bachilleres,
      ingresoPrimaria,
      retentionRate,
      peakCurso,
      peakVal,
    };
  }, [data, selectedLayer]);

  const activePoint = hoveredIndex !== null && points[hoveredIndex] ? points[hoveredIndex] : null;
  const deptNombreActual = deptList.find((d) => d.id === selectedDept)?.nombre || 'Total Nacional (Bolivia)';

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 shadow-xs space-y-5">
      {/* Encabezado del Gráfico con Controles Integrados */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-100 pb-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] font-semibold uppercase tracking-wider bg-[#faf5e8] text-[#c9a751] border border-[#e5d5a6] px-2.5 py-0.5 rounded-md">
              Curva de Matrícula Continua · Eje X: Cursos SEP
            </span>
            <span className="text-[10px] font-medium text-slate-500">
              Gestión {selectedYear} · {deptNombreActual}
            </span>
          </div>
          <h2 className="text-lg font-semibold text-slate-900 tracking-tight flex items-center gap-2">
            <TrendingUpIcon size={20} className="text-[#c9a751]" />
            Distribución Lineal por Grados de Escolaridad (Inicial, Primaria, Secundaria)
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Eje horizontal: Los 14 cursos del Subsistema Regular articulados con edades normativas (4 a 17 años). Eje vertical: Volumen de estudiantes en {selectedYear}.
          </p>
        </div>

        {/* Toggle para comparar con año base 2026 */}
        {selectedYear !== 2026 && (
          <label className="flex items-center gap-2 text-xs font-medium text-slate-700 bg-slate-50 hover:bg-slate-100 p-2 rounded-xl border border-slate-200 cursor-pointer self-start lg:self-center transition-colors">
            <input
              type="checkbox"
              checked={showBenchmark2026}
              onChange={(e) => setShowBenchmark2026(e.target.checked)}
              className="rounded text-[#c9a751] focus:ring-[#c9a751] w-4 h-4 cursor-pointer"
            />
            <span>Comparar con Curva Base 2026</span>
          </label>
        )}
      </div>

      {/* Controles: Selector de Año, Departamento y Capa */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 bg-slate-50/80 p-3.5 rounded-xl border border-slate-200 text-xs">
        {/* 1. Selector de Gestión */}
        <div>
          <div className="flex items-center gap-1.5 mb-1.5 font-semibold text-slate-700">
            <CalendarIcon size={14} className="text-[#c9a751]" />
            <span>1. Gestión Proyectada:</span>
          </div>
          <div className="flex items-center gap-1 overflow-x-auto pb-1">
            {availableYears.map((y) => (
              <button
                key={y}
                onClick={() => onYearChange(y)}
                className={`px-2.5 py-1 rounded-lg font-medium transition-all shrink-0 ${
                  selectedYear === y
                    ? 'bg-[#c9a751] text-slate-900 font-semibold shadow-xs'
                    : 'bg-white text-slate-600 border border-slate-200 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                {y}
              </button>
            ))}
          </div>
        </div>

        {/* 2. Selector de Departamento */}
        <div>
          <div className="flex items-center gap-1.5 mb-1.5 font-semibold text-slate-700">
            <MapPinIcon size={14} className="text-[#c9a751]" />
            <span>2. Ámbito Territorial:</span>
          </div>
          <select
            value={selectedDept}
            onChange={(e) => onDeptChange(e.target.value)}
            className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 font-medium focus:outline-none focus:ring-2 focus:ring-[#c9a751]"
          >
            {deptList.map((d) => (
              <option key={d.id} value={d.id}>
                {d.nombre}
              </option>
            ))}
          </select>
        </div>

        {/* 3. Selector de Métrica / Capa */}
        <div>
          <div className="flex items-center gap-1.5 mb-1.5 font-semibold text-slate-700">
            <LayersIcon size={14} className="text-[#c9a751]" />
            <span>3. Variable en el Eje Y:</span>
          </div>
          <div className="flex items-center gap-1 flex-wrap">
            {(['matricula_total', 'publico', 'privado', 'no_estudian', 'poblacion_ine'] as const).map((layer) => (
              <button
                key={layer}
                onClick={() => onLayerChange(layer)}
                className={`px-2 py-1 rounded-md text-[11px] font-medium transition-all ${
                  selectedLayer === layer
                    ? 'bg-slate-900 text-white font-semibold shadow-xs'
                    : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
                }`}
              >
                {layerLabels[layer]}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Canvas SVG Responsivo del Gráfico Lineal */}
      <div className="relative w-full overflow-hidden bg-white rounded-xl border border-slate-200 p-2">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="w-full h-auto max-h-[420px] select-none"
        >
          <defs>
            {/* Gradiente sutil bajo la curva activa */}
            <linearGradient id="areaGradientCurso" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={activeColor} stopOpacity="0.28" />
              <stop offset="100%" stopColor={activeColor} stopOpacity="0.02" />
            </linearGradient>
          </defs>

          {/* Bandas de Fondo por Nivel Escolar */}
          {nivelBands && (
            <g className="nivel-bands">
              {/* Inicial */}
              <rect
                x={nivelBands.inicial.x}
                y={padTop}
                width={nivelBands.inicial.w}
                height={chartH}
                fill="#fef3c7"
                fillOpacity="0.25"
              />
              <text
                x={nivelBands.inicial.x + nivelBands.inicial.w / 2}
                y={padTop + 14}
                textAnchor="middle"
                fontSize="11"
                fontWeight="600"
                fill="#92400e"
              >
                Nivel Inicial
              </text>

              {/* Primaria */}
              <rect
                x={nivelBands.primaria.x}
                y={padTop}
                width={nivelBands.primaria.w}
                height={chartH}
                fill="#dbeafe"
                fillOpacity="0.2"
              />
              <text
                x={nivelBands.primaria.x + nivelBands.primaria.w / 2}
                y={padTop + 14}
                textAnchor="middle"
                fontSize="11"
                fontWeight="600"
                fill="#1e40af"
              >
                Nivel Primario (Obligatorio Universal)
              </text>

              {/* Secundaria */}
              <rect
                x={nivelBands.secundaria.x}
                y={padTop}
                width={nivelBands.secundaria.w}
                height={chartH}
                fill="#d1fae5"
                fillOpacity="0.22"
              />
              <text
                x={nivelBands.secundaria.x + nivelBands.secundaria.w / 2}
                y={padTop + 14}
                textAnchor="middle"
                fontSize="11"
                fontWeight="600"
                fill="#065f46"
              >
                Nivel Secundario (Hacia Bachillerato)
              </text>
            </g>
          )}

          {/* Líneas Guía Horizontales del Eje Y */}
          <g className="grid-lines">
            {yTicks.map((val) => {
              const y = padTop + chartH - (val / (maxVal || 1)) * chartH;
              return (
                <g key={val}>
                  <line
                    x1={padLeft}
                    y1={y}
                    x2={width - padRight}
                    y2={y}
                    stroke="#e2e8f0"
                    strokeWidth="1"
                    strokeDasharray={val === 0 ? undefined : '3 3'}
                  />
                  <text
                    x={padLeft - 10}
                    y={y + 4}
                    textAnchor="end"
                    fontSize="10"
                    fill="#64748b"
                    fontFamily="monospace"
                  >
                    {val.toLocaleString('es-BO')}
                  </text>
                </g>
              );
            })}
          </g>

          {/* Área sombreada bajo la curva activa */}
          {areaPath && <path d={areaPath} fill="url(#areaGradientCurso)" />}

          {/* Línea Comparativa Año Base 2026 (si está activa) */}
          {benchmarkPath && (
            <path
              d={benchmarkPath}
              fill="none"
              stroke="#94a3b8"
              strokeWidth="2"
              strokeDasharray="5 4"
            />
          )}

          {/* Línea Principal del Año Seleccionado */}
          {linePath && (
            <path
              d={linePath}
              fill="none"
              stroke={activeColor}
              strokeWidth="3.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          )}

          {/* Puntos de Datos y Etiquetas en Eje X */}
          {points.map((pt) => {
            const isHovered = hoveredIndex === pt.i;
            const isPromocion = pt.d.curso.id === 'sec_6';

            return (
              <g
                key={pt.d.curso.id}
                className="cursor-pointer transition-all"
                onMouseEnter={() => setHoveredIndex(pt.i)}
                onMouseLeave={() => setHoveredIndex(null)}
              >
                {/* Línea vertical guía al hacer hover */}
                {isHovered && (
                  <line
                    x1={pt.x}
                    y1={padTop}
                    x2={pt.x}
                    y2={padTop + chartH}
                    stroke="#c9a751"
                    strokeWidth="1.5"
                    strokeDasharray="2 2"
                  />
                )}

                {/* Punto en la línea 2026 si está visible */}
                {benchmarkPoints[pt.i] && (
                  <circle
                    cx={benchmarkPoints[pt.i].x}
                    cy={benchmarkPoints[pt.i].y}
                    r={3}
                    fill="#94a3b8"
                  />
                )}

                {/* Punto en la línea principal */}
                <circle
                  cx={pt.x}
                  cy={pt.y}
                  r={isHovered ? 6.5 : isPromocion ? 5.5 : 4}
                  fill={isPromocion ? '#c9a751' : activeColor}
                  stroke="#ffffff"
                  strokeWidth={isHovered ? 2.5 : 1.8}
                />

                {/* Etiqueta del Curso en el Eje X */}
                <text
                  x={pt.x}
                  y={padTop + chartH + 16}
                  textAnchor="middle"
                  fontSize="10"
                  fontWeight={isHovered || isPromocion ? '600' : '500'}
                  fill={isHovered ? '#0f172a' : isPromocion ? '#c9a751' : '#475569'}
                >
                  {pt.d.curso.nombre}
                </text>

                {/* Subetiqueta con Edad Normativa */}
                <text
                  x={pt.x}
                  y={padTop + chartH + 28}
                  textAnchor="middle"
                  fontSize="9"
                  fill="#94a3b8"
                >
                  ({pt.d.curso.edadNormativa}a)
                </text>
              </g>
            );
          })}
        </svg>

        {/* Tooltip Flotante de Alta Precisión */}
        {activePoint && (
          <div
            className="absolute top-4 right-4 bg-white/95 backdrop-blur-md p-3 rounded-xl border border-slate-300 shadow-md text-xs space-y-1.5 pointer-events-none max-w-xs transition-all"
          >
            <div className="flex items-center justify-between gap-2 border-b border-slate-200 pb-1">
              <span className="font-semibold text-slate-900">
                {activePoint.d.curso.nombre} ({activePoint.d.curso.sublabel})
              </span>
              <span className="text-[10px] bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded font-mono">
                {activePoint.d.curso.edadNormativa} años
              </span>
            </div>

            <div className="flex items-baseline justify-between gap-4">
              <span className="text-slate-500">{layerLabels[selectedLayer]}:</span>
              <span className="text-sm font-semibold" style={{ color: activeColor }}>
                {activePoint.val.toLocaleString('es-BO')} estudiantes
              </span>
            </div>

            {selectedYear !== 2026 && base2026Data && base2026Data[activePoint.i] && (
              <div className="flex items-baseline justify-between gap-4 text-[11px] text-slate-500">
                <span>Base 2026:</span>
                <span>
                  {getValue(base2026Data[activePoint.i]).toLocaleString('es-BO')}{' '}
                  <strong className={activePoint.val >= getValue(base2026Data[activePoint.i]) ? 'text-emerald-700' : 'text-red-600'}>
                    ({activePoint.val >= getValue(base2026Data[activePoint.i]) ? '+' : ''}
                    {(activePoint.val - getValue(base2026Data[activePoint.i])).toLocaleString('es-BO')})
                  </strong>
                </span>
              </div>
            )}

            <div className="grid grid-cols-2 gap-1.5 pt-1 border-t border-slate-100 text-[10px] text-slate-600">
              <div>
                <span className="text-slate-400 block">Público (Fiscal):</span>
                <span className="font-semibold text-emerald-700">
                  {activePoint.d.publico.toLocaleString('es-BO')}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block">Privado:</span>
                <span className="font-semibold text-blue-700">
                  {activePoint.d.privado.toLocaleString('es-BO')}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block">Población INE:</span>
                <span className="font-medium text-slate-800">
                  {activePoint.d.poblacionIne.toLocaleString('es-BO')}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block">No Escolarizados:</span>
                <span className="font-medium text-red-600">
                  {activePoint.d.noEstudian.toLocaleString('es-BO')}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Leyenda y Explicación del Gráfico */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-600 pt-1">
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-1.5">
            <span className="w-3.5 h-1 rounded-full" style={{ backgroundColor: activeColor }} />
            <span className="font-medium">Gestión {selectedYear} ({layerLabels[selectedLayer]})</span>
          </div>

          {selectedYear !== 2026 && showBenchmark2026 && (
            <div className="flex items-center gap-1.5">
              <span className="w-3.5 h-0.5 border-t border-dashed border-slate-400" />
              <span className="text-slate-500">Curva Referencial 2026</span>
            </div>
          )}

          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-[#c9a751]" />
            <span className="text-slate-600">6.º Sec (Promoción Bachilleres - Cantera ESFM)</span>
          </div>
        </div>

        <span className="text-[11px] text-slate-400">
          Pase el cursor por los puntos de la curva para ver el detalle de cada curso
        </span>
      </div>

      {/* Tarjetas Didácticas de Síntesis del Perfil Escolar */}
      {curveSummary && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-2">
          <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 block">
              Pico de Matrícula ({selectedYear})
            </span>
            <p className="text-base font-semibold text-slate-900 mt-0.5">
              {curveSummary.peakCurso}
            </p>
            <span className="text-[10px] text-slate-500">
              Concentra {curveSummary.peakVal.toLocaleString('es-BO')} estudiantes
            </span>
          </div>

          <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-emerald-800 block">
              Bachilleres Promoción (17 Años)
            </span>
            <p className="text-base font-semibold text-[#c9a751] mt-0.5">
              {curveSummary.bachilleres.toLocaleString('es-BO')}
            </p>
            <span className="text-[10px] text-slate-500">
              Egresan de 6.º Secundaria en {selectedYear}
            </span>
          </div>

          <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-blue-800 block">
              Tasa de Retención Escolar
            </span>
            <p className="text-base font-semibold text-slate-900 mt-0.5">
              {curveSummary.retentionRate}%
            </p>
            <span className="text-[10px] text-slate-500">
              Proporción 6.º Sec vs Ingreso 1.º Primaria
            </span>
          </div>

          <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-amber-800 block">
              Proporción por Niveles
            </span>
            <p className="text-xs font-semibold text-slate-800 mt-0.5">
              Ini: {((curveSummary.iniMat / (curveSummary.iniMat + curveSummary.priMat + curveSummary.secMat)) * 100).toFixed(0)}% · 
              Pri: {((curveSummary.priMat / (curveSummary.iniMat + curveSummary.priMat + curveSummary.secMat)) * 100).toFixed(0)}% · 
              Sec: {((curveSummary.secMat / (curveSummary.iniMat + curveSummary.priMat + curveSummary.secMat)) * 100).toFixed(0)}%
            </p>
            <span className="text-[10px] text-slate-500">
              Composición de la pirámide escolar
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

