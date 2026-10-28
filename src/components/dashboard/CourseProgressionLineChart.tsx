'use client';

import React, { useState, useMemo } from 'react';
import { CursoDef } from './views/ProyeccionesView';
import {
  TrendingUpIcon,
  MapPinIcon,
  CalendarIcon,
  LayersIcon,
  LightbulbIcon,
  ScaleIcon,
} from '../ui/Icons';

export interface CourseChartPoint {
  curso: CursoDef;
  matricula: number;
  publico: number;
  privado: number;
  noEstudian: number;
  poblacionIne: number;
}

export type CompareMode = 'simple' | 'anios' | 'departamentos';
export type MetricLayer = 'matricula_total' | 'publico' | 'privado' | 'no_estudian' | 'poblacion_ine';

interface CourseProgressionLineChartProps {
  availableYears: number[];
  deptList: { id: string; nombre: string }[];
  getPoints: (year: number, dept: string) => CourseChartPoint[];
  initialYear?: number;
  initialDept?: string;
  initialLayer?: MetricLayer;
}

interface MultiSeriesItem {
  id: string;
  label: string;
  sublabel?: string;
  color: string;
  points: CourseChartPoint[];
}

const PALETTE = [
  '#c9a751', // Dorado institucional
  '#2563EB', // Azul zafiro
  '#059669', // Verde esmeralda
  '#DC2626', // Rojo carmesí
  '#7C3AED', // Violeta
  '#D97706', // Ámbar
];

export function CourseProgressionLineChart({
  availableYears,
  deptList,
  getPoints,
  initialYear = 2028,
  initialDept = 'all',
  initialLayer = 'matricula_total',
}: CourseProgressionLineChartProps) {
  // Estado de modo de visualización: simple, comparativa por años o comparativa por departamentos
  const [compareMode, setCompareMode] = useState<CompareMode>('anios');

  // Parámetros de vista simple
  const [singleYear, setSingleYear] = useState<number>(initialYear);
  const [singleDept, setSingleDept] = useState<string>(initialDept);

  // Parámetros de Comparativa Multianual
  const [compareDeptForYears, setCompareDeptForYears] = useState<string>(initialDept);
  const [selectedYears, setSelectedYears] = useState<number[]>([2026, 2028, 2031]);

  // Parámetros de Comparativa Territorial
  const [compareYearForDepts, setCompareYearForDepts] = useState<number>(initialYear);
  const [selectedDepts, setSelectedDepts] = useState<string[]>(['all', 'Santa Cruz', 'La Paz', 'Cochabamba']);
  const [normalizeBase100, setNormalizeBase100] = useState<boolean>(false);

  // Capa métrica seleccionada
  const [selectedLayer, setSelectedLayer] = useState<MetricLayer>(initialLayer);

  // Hover interactivo sobre cursos (0..13)
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  const layerLabels: Record<MetricLayer, string> = {
    matricula_total: 'Matrícula Total Estimada',
    publico: 'Sector Público (Fiscal / Convenio)',
    privado: 'Sector Privado (Particular)',
    no_estudian: 'Población No Escolarizada',
    poblacion_ine: 'Población Demográfica INE',
  };

  const getPointValue = (p: CourseChartPoint): number => {
    switch (selectedLayer) {
      case 'publico':
        return p.publico;
      case 'privado':
        return p.privado;
      case 'no_estudian':
        return p.noEstudian;
      case 'poblacion_ine':
        return p.poblacionIne;
      case 'matricula_total':
      default:
        return p.matricula;
    }
  };

  // Construir las series según el modo de comparación
  const seriesList: MultiSeriesItem[] = useMemo(() => {
    if (compareMode === 'simple') {
      const deptName = deptList.find((d) => d.id === singleDept)?.nombre || singleDept;
      return [
        {
          id: `single_${singleYear}_${singleDept}`,
          label: `Gestión ${singleYear}`,
          sublabel: deptName,
          color: '#c9a751',
          points: getPoints(singleYear, singleDept),
        },
      ];
    }

    if (compareMode === 'anios') {
      const deptName = deptList.find((d) => d.id === compareDeptForYears)?.nombre || 'Total Nacional';
      return selectedYears.map((y, idx) => ({
        id: `year_${y}`,
        label: `Gestión ${y}`,
        sublabel: deptName,
        color: PALETTE[idx % PALETTE.length],
        points: getPoints(y, compareDeptForYears),
      }));
    }

    // Modo departamentos
    return selectedDepts.map((dId, idx) => {
      const deptName = deptList.find((d) => d.id === dId)?.nombre || dId;
      return {
        id: `dept_${dId}`,
        label: deptName,
        sublabel: `Gestión ${compareYearForDepts}`,
        color: PALETTE[idx % PALETTE.length],
        points: getPoints(compareYearForDepts, dId),
      };
    });
  }, [
    compareMode,
    singleYear,
    singleDept,
    compareDeptForYears,
    selectedYears,
    compareYearForDepts,
    selectedDepts,
    getPoints,
    deptList,
  ]);

  // Dimensiones del lienzo SVG
  const width = 1000;
  const height = 370;
  const padLeft = 70;
  const padRight = 35;
  const padTop = 32;
  const padBottom = 58;

  const chartW = width - padLeft - padRight;
  const chartH = height - padTop - padBottom;

  // Cálculo de valores normalizados o absolutos
  const normalizedSeries = useMemo(() => {
    return seriesList.map((serie) => {
      const baseVal = getPointValue(serie.points[2]) || 1; // 1.º de Primaria como base 100
      const processedPoints = serie.points.map((p) => {
        const raw = getPointValue(p);
        const displayVal = normalizeBase100 && compareMode === 'departamentos'
          ? Number(((raw / baseVal) * 100).toFixed(1))
          : raw;
        return { p, raw, displayVal };
      });
      return { ...serie, processedPoints };
    });
  }, [seriesList, normalizeBase100, compareMode, selectedLayer]);

  // Cálculo de escala Y máxima
  const { maxVal, yTicks } = useMemo(() => {
    let max = 0;
    normalizedSeries.forEach((s) => {
      s.processedPoints.forEach((pt) => {
        if (pt.displayVal > max) max = pt.displayVal;
      });
    });

    if (max <= 0) max = 100;
    const isNorm = normalizeBase100 && compareMode === 'departamentos';
    const paddedMax = isNorm ? Math.ceil(max * 1.1) : Math.ceil(max * 1.12);
    const step = Math.ceil(paddedMax / 5);
    const ticks = [0, step, step * 2, step * 3, step * 4, step * 5];

    return { maxVal: step * 5, yTicks: ticks };
  }, [normalizedSeries, normalizeBase100, compareMode]);

  // Coordenadas calculadas para cada serie
  const renderedSeries = useMemo(() => {
    const totalPoints = 14;
    return normalizedSeries.map((serie) => {
      const coords = serie.processedPoints.map((pt, i) => {
        const x = padLeft + (i / (totalPoints - 1)) * chartW;
        const y = padTop + chartH - (pt.displayVal / (maxVal || 1)) * chartH;
        return { x, y, ...pt, i };
      });

      // Construcción de curva suave cardinal
      let path = `M ${coords[0].x} ${coords[0].y}`;
      for (let i = 0; i < coords.length - 1; i++) {
        const p0 = coords[i === 0 ? 0 : i - 1];
        const p1 = coords[i];
        const p2 = coords[i + 1];
        const p3 = coords[i + 2 < coords.length ? i + 2 : i + 1];

        const cp1x = p1.x + (p2.x - p0.x) / 6;
        const cp1y = p1.y + (p2.y - p0.y) / 6;
        const cp2x = p2.x - (p3.x - p1.x) / 6;
        const cp2y = p2.y - (p3.y - p1.y) / 6;

        path += ` C ${cp1x.toFixed(1)} ${cp1y.toFixed(1)}, ${cp2x.toFixed(1)} ${cp2y.toFixed(1)}, ${p2.x.toFixed(1)} ${p2.y.toFixed(1)}`;
      }

      return {
        ...serie,
        coords,
        path,
      };
    });
  }, [normalizedSeries, chartW, chartH, maxVal, padLeft, padTop]);

  // Bandas verticales por nivel educativo
  const nivelBands = useMemo(() => {
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
  }, [chartW, padLeft]);

  // Datos del curso activo en hover
  const activeCourse = useMemo(() => {
    if (hoveredIndex === null || renderedSeries.length === 0) return null;
    const firstSerie = renderedSeries[0];
    const curso = firstSerie.coords[hoveredIndex]?.p.curso;
    if (!curso) return null;

    const values = renderedSeries.map((s) => ({
      serieLabel: s.label,
      color: s.color,
      raw: s.coords[hoveredIndex].raw,
      displayVal: s.coords[hoveredIndex].displayVal,
      publico: s.coords[hoveredIndex].p.publico,
      privado: s.coords[hoveredIndex].p.privado,
    }));

    return { curso, values, x: firstSerie.coords[hoveredIndex].x };
  }, [hoveredIndex, renderedSeries]);

  // Alternar selección de años en modo comparativo
  const toggleYear = (y: number) => {
    if (selectedYears.includes(y)) {
      if (selectedYears.length > 1) {
        setSelectedYears(selectedYears.filter((item) => item !== y));
      }
    } else {
      if (selectedYears.length < 4) {
        setSelectedYears([...selectedYears, y].sort());
      }
    }
  };

  // Alternar selección de departamentos en modo territorial
  const toggleDept = (deptId: string) => {
    if (selectedDepts.includes(deptId)) {
      if (selectedDepts.length > 1) {
        setSelectedDepts(selectedDepts.filter((item) => item !== deptId));
      }
    } else {
      if (selectedDepts.length < 5) {
        setSelectedDepts([...selectedDepts, deptId]);
      }
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 shadow-xs space-y-5">
      {/* Encabezado Superior con Selector de Modo de Comparación */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-100 pb-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] font-semibold uppercase tracking-wider bg-[#faf5e8] text-[#c9a751] border border-[#e5d5a6] px-2.5 py-0.5 rounded-md">
              Laboratorio Comparativo · 14 Cursos SEP
            </span>
            <span className="text-[10px] font-medium text-slate-500">
              {compareMode === 'anios'
                ? `Comparando ${selectedYears.length} Gestiones en ${deptList.find((d) => d.id === compareDeptForYears)?.nombre || 'Bolivia'}`
                : compareMode === 'departamentos'
                ? `Comparando ${selectedDepts.length} Departamentos en la Gestión ${compareYearForDepts}`
                : `Gestión ${singleYear} · ${deptList.find((d) => d.id === singleDept)?.nombre}`}
            </span>
          </div>

          <h2 className="text-lg font-semibold text-slate-900 tracking-tight flex items-center gap-2">
            <TrendingUpIcon size={20} className="text-[#c9a751]" />
            Distribución Lineal por Grados de Escolaridad (Inicial, Primaria, Secundaria)
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Eje horizontal: Los 14 cursos del Subsistema Regular articulados con edades normativas (4 a 17 años). Eje vertical: Volumen de estudiantes o índice relativo.
          </p>
        </div>

        {/* Pestañas de Modo: Simple vs Comparar Años vs Comparar Departamentos */}
        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl self-start lg:self-center border border-slate-200">
          <button
            onClick={() => setCompareMode('simple')}
            className={`text-xs px-3 py-1.5 rounded-lg transition-all font-medium ${
              compareMode === 'simple'
                ? 'bg-white text-slate-900 font-semibold shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Foco Único
          </button>
          <button
            onClick={() => setCompareMode('anios')}
            className={`text-xs px-3 py-1.5 rounded-lg transition-all font-medium ${
              compareMode === 'anios'
                ? 'bg-[#c9a751] text-slate-900 font-semibold shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Comparar Años
          </button>
          <button
            onClick={() => setCompareMode('departamentos')}
            className={`text-xs px-3 py-1.5 rounded-lg transition-all font-medium ${
              compareMode === 'departamentos'
                ? 'bg-blue-600 text-white font-semibold shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Comparar Departamentos
          </button>
        </div>
      </div>

      {/* Controles Dinámicos según el Modo de Comparación */}
      <div className="bg-slate-50/80 p-3.5 rounded-xl border border-slate-200 text-xs space-y-3">
        {/* CASO A: MODO COMPARAR AÑOS */}
        {compareMode === 'anios' && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-center">
            {/* 1. Selector Múltiple de Años */}
            <div className="md:col-span-2">
              <span className="text-[11px] font-semibold text-slate-700 block mb-1">
                Seleccione hasta 4 gestiones para contrastar su curva de cursos:
              </span>
              <div className="flex items-center gap-1.5 flex-wrap">
                {availableYears.map((y) => {
                  const isSelected = selectedYears.includes(y);
                  const colorIdx = selectedYears.indexOf(y);
                  return (
                    <button
                      key={y}
                      onClick={() => toggleYear(y)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-semibold border transition-all flex items-center gap-1.5 ${
                        isSelected
                          ? 'bg-white text-slate-900 shadow-xs border-slate-300'
                          : 'bg-slate-100 text-slate-500 border-transparent hover:bg-slate-200/70'
                      }`}
                    >
                      {isSelected && (
                        <span
                          className="w-2 h-2 rounded-full"
                          style={{ backgroundColor: PALETTE[colorIdx % PALETTE.length] }}
                        />
                      )}
                      <span>{y}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 2. Selector de Departamento */}
            <div>
              <span className="text-[11px] font-semibold text-slate-700 block mb-1">
                Ámbito territorial evaluado:
              </span>
              <select
                value={compareDeptForYears}
                onChange={(e) => setCompareDeptForYears(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 font-medium focus:ring-2 focus:ring-[#c9a751]"
              >
                {deptList.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.nombre}
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}

        {/* CASO B: MODO COMPARAR DEPARTAMENTOS */}
        {compareMode === 'departamentos' && (
          <div className="space-y-2">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div>
                <span className="text-[11px] font-semibold text-slate-700 block mb-1">
                  Seleccione departamentos a contrastar (hasta 5 simultáneos):
                </span>
                <div className="flex items-center gap-1.5 flex-wrap">
                  {deptList.map((dept) => {
                    const isSelected = selectedDepts.includes(dept.id);
                    const colorIdx = selectedDepts.indexOf(dept.id);
                    return (
                      <button
                        key={dept.id}
                        onClick={() => toggleDept(dept.id)}
                        className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition-all flex items-center gap-1.5 ${
                          isSelected
                            ? 'bg-white text-slate-900 font-semibold shadow-xs border-slate-300'
                            : 'bg-slate-100 text-slate-500 border-transparent hover:bg-slate-200/70'
                        }`}
                      >
                        {isSelected && (
                          <span
                            className="w-2 h-2 rounded-full"
                            style={{ backgroundColor: PALETTE[colorIdx % PALETTE.length] }}
                          />
                        )}
                        <span>{dept.nombre}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Año y selector de normalización */}
              <div className="flex items-center gap-3 self-start md:self-center shrink-0">
                <div>
                  <span className="text-[11px] font-semibold text-slate-700 block mb-1">Gestión:</span>
                  <select
                    value={compareYearForDepts}
                    onChange={(e) => setCompareYearForDepts(Number(e.target.value))}
                    className="bg-white border border-slate-200 rounded-lg px-2.5 py-1 text-xs text-slate-800 font-medium"
                  >
                    {availableYears.map((y) => (
                      <option key={y} value={y}>
                        {y}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <span className="text-[11px] font-semibold text-slate-700 block mb-1">Escala en Y:</span>
                  <button
                    onClick={() => setNormalizeBase100(!normalizeBase100)}
                    className={`px-2.5 py-1 rounded-lg border text-xs font-semibold transition-all ${
                      normalizeBase100
                        ? 'bg-blue-50 text-blue-800 border-blue-300 shadow-2xs'
                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                    title="Normaliza 1.º Primaria a 100 para comparar la forma de retención sin sesgo de tamaño poblacional"
                  >
                    {normalizeBase100 ? 'Base 100 (1.º Pri)' : 'Absoluta (Estudiantes)'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* CASO C: MODO SIMPLE */}
        {compareMode === 'simple' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 items-center">
            <div>
              <span className="text-[11px] font-semibold text-slate-700 block mb-1">Gestión Proyectada:</span>
              <div className="flex items-center gap-1 overflow-x-auto pb-1">
                {availableYears.map((y) => (
                  <button
                    key={y}
                    onClick={() => setSingleYear(y)}
                    className={`px-2.5 py-1 rounded-lg font-medium transition-all ${
                      singleYear === y
                        ? 'bg-[#c9a751] text-slate-900 font-semibold shadow-xs'
                        : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    {y}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <span className="text-[11px] font-semibold text-slate-700 block mb-1">Departamento:</span>
              <select
                value={singleDept}
                onChange={(e) => setSingleDept(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 font-medium"
              >
                {deptList.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.nombre}
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}

        {/* Selector Global de Capa Métrica */}
        <div className="flex items-center justify-between border-t border-slate-200/70 pt-2 flex-wrap gap-2">
          <div className="flex items-center gap-1.5 font-semibold text-slate-700">
            <LayersIcon size={14} className="text-[#c9a751]" />
            <span>Variable proyectada en el Eje Y:</span>
          </div>
          <div className="flex items-center gap-1 flex-wrap">
            {(['matricula_total', 'publico', 'privado', 'no_estudian', 'poblacion_ine'] as const).map((layer) => (
              <button
                key={layer}
                onClick={() => setSelectedLayer(layer)}
                className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-all ${
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

      {/* Lienzo SVG Responsivo de Curvas Múltiples */}
      <div className="relative w-full overflow-hidden bg-white rounded-xl border border-slate-200 p-2">
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto max-h-[440px] select-none">
          {/* Bandas de fondo por Nivel Escolar */}
          <g className="nivel-bands">
            {/* Inicial */}
            <rect
              x={nivelBands.inicial.x}
              y={padTop}
              width={nivelBands.inicial.w}
              height={chartH}
              fill="#fef3c7"
              fillOpacity="0.22"
            />
            <text
              x={nivelBands.inicial.x + nivelBands.inicial.w / 2}
              y={padTop + 14}
              textAnchor="middle"
              fontSize="11"
              fontWeight="600"
              fill="#92400e"
            >
              Nivel Inicial (4 - 5 años)
            </text>

            {/* Primaria */}
            <rect
              x={nivelBands.primaria.x}
              y={padTop}
              width={nivelBands.primaria.w}
              height={chartH}
              fill="#dbeafe"
              fillOpacity="0.18"
            />
            <text
              x={nivelBands.primaria.x + nivelBands.primaria.w / 2}
              y={padTop + 14}
              textAnchor="middle"
              fontSize="11"
              fontWeight="600"
              fill="#1e40af"
            >
              Nivel Primario (6 - 11 años · Asistencia Universal)
            </text>

            {/* Secundaria */}
            <rect
              x={nivelBands.secundaria.x}
              y={padTop}
              width={nivelBands.secundaria.w}
              height={chartH}
              fill="#d1fae5"
              fillOpacity="0.2"
            />
            <text
              x={nivelBands.secundaria.x + nivelBands.secundaria.w / 2}
              y={padTop + 14}
              textAnchor="middle"
              fontSize="11"
              fontWeight="600"
              fill="#065f46"
            >
              Nivel Secundario (12 - 17 años · Bachillerato y ESFM)
            </text>
          </g>

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
                    {normalizeBase100 && compareMode === 'departamentos'
                      ? `${val}%`
                      : val.toLocaleString('es-BO')}
                  </text>
                </g>
              );
            })}
          </g>

          {/* Trazado de las Curvas de cada Serie */}
          {renderedSeries.map((serie) => (
            <path
              key={serie.id}
              d={serie.path}
              fill="none"
              stroke={serie.color}
              strokeWidth="2.8"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="transition-all opacity-90 hover:opacity-100"
            />
          ))}

          {/* Puntos y Línea Guía de Hover en Eje X */}
          {activeCourse && (
            <line
              x1={activeCourse.x}
              y1={padTop}
              x2={activeCourse.x}
              y2={padTop + chartH}
              stroke="#0f172a"
              strokeWidth="1.2"
              strokeDasharray="2 2"
            />
          )}

          {/* Puntos Interactivos por Curso */}
          {renderedSeries[0]?.coords.map((basePt, i) => {
            const isHovered = hoveredIndex === i;
            const isPromocion = basePt.p.curso.id === 'sec_6';

            return (
              <g
                key={basePt.p.curso.id}
                className="cursor-pointer"
                onMouseEnter={() => setHoveredIndex(i)}
                onMouseLeave={() => setHoveredIndex(null)}
              >
                {/* Zona invisible táctil para capturar eventos fácilmente */}
                <rect
                  x={basePt.x - chartW / 26}
                  y={padTop}
                  width={chartW / 13}
                  height={chartH}
                  fill="transparent"
                />

                {/* Círculos para cada serie en este curso */}
                {renderedSeries.map((s) => {
                  const pt = s.coords[i];
                  return (
                    <circle
                      key={s.id}
                      cx={pt.x}
                      cy={pt.y}
                      r={isHovered ? 5.5 : isPromocion ? 4.5 : 3.5}
                      fill={s.color}
                      stroke="#ffffff"
                      strokeWidth={1.8}
                    />
                  );
                })}

                {/* Etiquetas de Cursos en Eje X */}
                <text
                  x={basePt.x}
                  y={padTop + chartH + 16}
                  textAnchor="middle"
                  fontSize="10"
                  fontWeight={isHovered || isPromocion ? '600' : '500'}
                  fill={isHovered ? '#0f172a' : isPromocion ? '#c9a751' : '#475569'}
                >
                  {basePt.p.curso.nombre}
                </text>

                <text
                  x={basePt.x}
                  y={padTop + chartH + 28}
                  textAnchor="middle"
                  fontSize="9"
                  fill="#94a3b8"
                >
                  ({basePt.p.curso.edadNormativa}a)
                </text>
              </g>
            );
          })}
        </svg>

        {/* Tooltip Comparativo Multilínea */}
        {activeCourse && (
          <div className="absolute top-4 right-4 bg-white/95 backdrop-blur-md p-3.5 rounded-xl border border-slate-300 shadow-md text-xs space-y-2 pointer-events-none min-w-[240px] max-w-sm transition-all">
            <div className="flex items-center justify-between border-b border-slate-200 pb-1.5">
              <div>
                <span className="font-semibold text-slate-900 block">
                  {activeCourse.curso.nombre} ({activeCourse.curso.sublabel})
                </span>
                <span className="text-[10px] text-slate-500">
                  Edad normativa oficial: {activeCourse.curso.edadNormativa} años
                </span>
              </div>
              <span className="text-[10px] bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md font-mono font-semibold">
                {activeCourse.curso.nivelTexto}
              </span>
            </div>

            {/* Comparativa por Serie */}
            <div className="space-y-1.5">
              {activeCourse.values.map((v, idx) => (
                <div key={idx} className="flex items-center justify-between gap-3 text-xs">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: v.color }} />
                    <span className="font-medium text-slate-700 truncate max-w-[130px]">{v.serieLabel}</span>
                  </div>
                  <span className="font-semibold font-mono text-slate-900">
                    {normalizeBase100 && compareMode === 'departamentos'
                      ? `${v.displayVal}% (${v.raw.toLocaleString('es-BO')})`
                      : `${v.raw.toLocaleString('es-BO')} est.`}
                  </span>
                </div>
              ))}
            </div>

            {/* Brecha entre la primera y la última serie si hay más de 1 */}
            {activeCourse.values.length >= 2 && (
              <div className="pt-1.5 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
                <span>Diferencia ({activeCourse.values[0].serieLabel} vs {activeCourse.values[1].serieLabel}):</span>
                <strong className="text-slate-800">
                  {(activeCourse.values[0].raw - activeCourse.values[1].raw > 0 ? '+' : '') +
                    (activeCourse.values[0].raw - activeCourse.values[1].raw).toLocaleString('es-BO')} est.
                </strong>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Leyenda Interactiva de Series */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-slate-100 pt-3 text-xs">
        <div className="flex items-center gap-4 flex-wrap">
          {renderedSeries.map((s) => (
            <div key={s.id} className="flex items-center gap-1.5">
              <span className="w-3.5 h-1.5 rounded-full" style={{ backgroundColor: s.color }} />
              <span className="font-medium text-slate-800">{s.label}</span>
              {s.sublabel && <span className="text-[10px] text-slate-400">({s.sublabel})</span>}
            </div>
          ))}

          <div className="flex items-center gap-1.5 ml-2 border-l border-slate-200 pl-3">
            <span className="w-2.5 h-2.5 rounded-full bg-[#c9a751]" />
            <span className="text-slate-500">6.º Sec (Cantera ESFM)</span>
          </div>
        </div>

        <span className="text-[11px] text-slate-400">
          Pase el cursor por cualquier curso para contrastar los valores
        </span>
      </div>

      {/* Tarjetas Didácticas de Análisis Comparativo */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-1">
        <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-1">
          <div className="flex items-center gap-2">
            <LightbulbIcon size={16} className="text-[#c9a751]" />
            <span className="text-xs font-semibold text-slate-900">
              {compareMode === 'anios'
                ? 'Efecto Cohorte Interanual'
                : compareMode === 'departamentos'
                ? 'Comportamiento Territorial'
                : 'Lectura de la Pirámide'}
            </span>
          </div>
          <p className="text-xs text-slate-600 leading-relaxed">
            {compareMode === 'anios'
              ? 'Observe cómo el volumen de estudiantes se desplaza hacia la derecha con el paso de los años: las generaciones que hoy cursan Primaria llegarán a egresar de Secundaria a partir de 2031.'
              : compareMode === 'departamentos'
              ? 'Permite verificar qué departamentos sostienen una alta retención en Secundaria (curva estable) y cuáles experimentan mayor caída de matrícula hacia 6.º de Secundaria.'
              : 'La curva refleja la tasa de incorporación masiva en 1.º Primaria y la gradual contracción de matrícula en Secundaria previa al egreso.'}
          </p>
        </div>

        <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-1">
          <div className="flex items-center gap-2">
            <ScaleIcon size={16} className="text-[#c9a751]" />
            <span className="text-xs font-semibold text-slate-900">Impacto en Convocatorias ESFM</span>
          </div>
          <p className="text-xs text-slate-600 leading-relaxed">
            El punto final de la curva (6.º Secundaria - 17 años) representa la cantera directa de postulantes a las Escuelas Superiores de Formación de Maestros. Si la curva comparativa sube en ese punto, la demanda por plazas en la ESFM se incrementará.
          </p>
        </div>

        <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-1">
          <div className="flex items-center gap-2">
            <TrendingUpIcon size={16} className="text-[#c9a751]" />
            <span className="text-xs font-semibold text-slate-900">Variable: {layerLabels[selectedLayer]}</span>
          </div>
          <p className="text-xs text-slate-600 leading-relaxed">
            Al alternar entre Sector Público y Privado, se aprecia que más del 88% de la demanda escolar en Bolivia recae sobre el sistema fiscal y de convenio, sustentando la necesidad continua de ítems docentes.
          </p>
        </div>
      </div>
    </div>
  );
}
