'use client';

import React, { useState, useMemo } from 'react';
import { IneProyeccionEdad } from '@/types/stats';
import {
  UsersIcon,
  TrendingUpIcon,
  CalendarIcon,
  FilterIcon,
  GraduationCapIcon,
  MaximizeIcon,
  MinimizeIcon,
  LightbulbIcon,
} from '../ui/Icons';

interface AgeProjectionExplorerProps {
  data: IneProyeccionEdad[];
}

export function AgeProjectionExplorer({ data }: AgeProjectionExplorerProps) {
  // Estados para rango de edad y año seleccionado
  const [minAge, setMinAge] = useState<number>(17);
  const [maxAge, setMaxAge] = useState<number>(22);
  const [selectedYear, setSelectedYear] = useState<number>(2026);
  // Modo de visualización: 'split' (dividido), 'trend_full' (tendencia temporal grande), 'dist_full' (distribución por edad grande)
  const [viewMode, setViewMode] = useState<'split' | 'trend_full' | 'dist_full'>('split');

  // Años disponibles (2024 - 2034)
  const availableYears = useMemo(() => {
    return Array.from(new Set(data.map((d) => d.anio))).sort((a, b) => a - b);
  }, [data]);

  // Presets pedagógicos y demográficos
  const presets = [
    { label: 'Admisión ESFM (17 a 22 años)', min: 17, max: 22, desc: 'Aspirantes directos y formación docente' },
    { label: 'Egreso Bachiller (17 a 18 años)', min: 17, max: 18, desc: 'Promociones de educación secundaria' },
    { label: 'Secundaria Regular (12 a 17 años)', min: 12, max: 17, desc: 'Adolescentes en etapa formativa' },
    { label: 'Primaria Regular (6 a 11 años)', min: 6, max: 11, desc: 'Población en educación primaria' },
    { label: 'Inicial en Familia (4 a 5 años)', min: 4, max: 5, desc: 'Primera infancia escolarizada' },
    { label: 'Juventud Plena (15 a 29 años)', min: 15, max: 29, desc: 'Marco censal de juventud en Bolivia' },
  ];

  const applyPreset = (min: number, max: number) => {
    setMinAge(min);
    setMaxAge(max);
  };

  // Filtrar datos para el año seleccionado dentro del rango
  const currentYearCohort = useMemo(() => {
    return data
      .filter((d) => d.anio === selectedYear && d.edad >= minAge && d.edad <= maxAge)
      .sort((a, b) => a.edad - b.edad);
  }, [data, selectedYear, minAge, maxAge]);

  const totalCohortCurrentYear = useMemo(() => {
    return currentYearCohort.reduce((acc, d) => acc + d.cantidad, 0);
  }, [currentYearCohort]);

  // Población total del país para ese año
  const totalBoliviaYear = useMemo(() => {
    return data
      .filter((d) => d.anio === selectedYear)
      .reduce((acc, d) => acc + d.cantidad, 0) || 12000000;
  }, [data, selectedYear]);

  const percentOfBolivia = Math.round((totalCohortCurrentYear / totalBoliviaYear) * 1000) / 10;

  // Evolución temporal del rango seleccionado año por año (2024 - 2034)
  const cohortTrendByYear = useMemo(() => {
    const raw = availableYears.map((yr) => {
      const sum = data
        .filter((d) => d.anio === yr && d.edad >= minAge && d.edad <= maxAge)
        .reduce((acc, d) => acc + d.cantidad, 0);
      return { year: yr, total: sum };
    });

    // Calcular variación interanual año a año
    return raw.map((item, idx) => {
      const prev = idx > 0 ? raw[idx - 1] : null;
      const diff = prev ? item.total - prev.total : 0;
      const rate = prev && prev.total > 0 ? Math.round((diff / prev.total) * 1000) / 10 : 0;
      return { ...item, diff, rate };
    });
  }, [data, availableYears, minAge, maxAge]);

  // Crecimiento entre 2024 y 2034 para este rango
  const val2024 = cohortTrendByYear.find((d) => d.year === 2024)?.total || 1;
  const val2034 = cohortTrendByYear.find((d) => d.year === 2034)?.total || 1;
  const netChangeDecade = val2034 - val2024;
  const percentChangeDecade = Math.round((netChangeDecade / val2024) * 1000) / 10;

  // Edad con mayor cantidad dentro del rango
  const peakAge = useMemo(() => {
    if (currentYearCohort.length === 0) return null;
    return [...currentYearCohort].sort((a, b) => b.cantidad - a.cantidad)[0];
  }, [currentYearCohort]);

  // Escala para gráfico de barras por edad
  const maxBarVal = Math.max(...currentYearCohort.map((d) => d.cantidad), 1);

  // Dimensiones SVG dinámicas según viewMode
  const isTrendFull = viewMode === 'trend_full';
  const isDistFull = viewMode === 'dist_full';

  const svgW = isTrendFull ? 920 : 800;
  const svgH = isTrendFull ? 340 : 250;
  const pad = { top: 30, right: 35, bottom: 45, left: 65 };
  const innerW = svgW - pad.left - pad.right;
  const innerH = svgH - pad.top - pad.bottom;

  const trendTotals = cohortTrendByYear.map((d) => d.total);
  const trendMax = Math.max(...trendTotals, 1);
  const trendMin = Math.min(...trendTotals, 0);
  const marginVal = (trendMax - trendMin) * 0.12 || trendMax * 0.05 || 1000;
  const scaleMin = Math.max(0, trendMin - marginVal);
  const scaleMax = trendMax + marginVal;
  const trendRange = scaleMax - scaleMin || 1;

  const getLineX = (yr: number) => {
    const fraction = (yr - 2024) / (2034 - 2024);
    return pad.left + fraction * innerW;
  };
  const getLineY = (val: number) => {
    const fraction = (val - scaleMin) / trendRange;
    return pad.top + innerH - fraction * innerH;
  };

  const trendPoints = cohortTrendByYear.map((d) => ({
    x: getLineX(d.year),
    y: getLineY(d.total),
    ...d,
  }));

  const trendLinePath = trendPoints
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`)
    .join(' ');

  const trendAreaPath = `
    ${trendLinePath}
    L ${trendPoints[trendPoints.length - 1].x.toFixed(1)} ${pad.top + innerH}
    L ${trendPoints[0].x.toFixed(1)} ${pad.top + innerH}
    Z
  `;

  const selectedPoint = trendPoints.find((p) => p.year === selectedYear) || trendPoints[0];

  return (
    <div className="bg-white rounded-2xl border border-slate-200/90 p-5 sm:p-7 shadow-xs space-y-6">
      {/* Encabezado Principal y Selector Dinámico de Tamaño de Vista */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-100">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] font-semibold uppercase tracking-wider bg-[#faf5e8] text-[#c9a751] border border-[#e5d5a6] px-2.5 py-0.5 rounded-md">
              INE · Proyecciones de Población por Edad
            </span>
          </div>
          <h2 className="text-xl sm:text-2xl font-semibold text-slate-900 tracking-tight">
            Explorador Interactivo de Población por Rango de Edad (2024 - 2034)
          </h2>
          <p className="text-xs text-slate-500 mt-0.5 max-w-3xl">
            Herramienta con zoom dinámico y selección de rangos para analizar la tendencia temporal de cualquier cohorte demográfica.
          </p>
        </div>

        {/* Botones de Control de Tamaño Dinámico (Agrandar / Dividido) */}
        <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs font-medium shrink-0">
          <span className="text-[10px] text-slate-400 uppercase tracking-wider px-2">
            Vista:
          </span>
          <button
            onClick={() => setViewMode('split')}
            className={`px-3 py-1.5 rounded-lg transition-all ${
              viewMode === 'split'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
            title="Vista lado a lado (Dividida)"
          >
            ◫ Dividido
          </button>
          <button
            onClick={() => setViewMode('trend_full')}
            className={`px-3 py-1.5 rounded-lg transition-all ${
              viewMode === 'trend_full'
                ? 'bg-[#c9a751] text-slate-900 shadow-xs ring-1 ring-[#c9a751]'
                : 'text-slate-600 hover:text-slate-900'
            }`}
            title="Agrandar la Tendencia Temporal al 100% de ancho"
          >
            <span className="flex items-center gap-1.5">
              <MaximizeIcon size={13} />
              <span>Tendencia Grande (2024-2034)</span>
            </span>
          </button>
          <button
            onClick={() => setViewMode('dist_full')}
            className={`px-3 py-1.5 rounded-lg transition-all ${
              viewMode === 'dist_full'
                ? 'bg-[#c9a751] text-slate-900 shadow-xs ring-1 ring-[#c9a751]'
                : 'text-slate-600 hover:text-slate-900'
            }`}
            title="Agrandar el desglose de Edades al 100% de ancho"
          >
            <span className="flex items-center gap-1.5">
              <MaximizeIcon size={13} />
              <span>Edades Detalladas</span>
            </span>
          </button>
        </div>
      </div>

      {/* Selector de Rango y Presets */}
      <div className="space-y-3">
        {/* Presets Rápidos */}
        <div>
          <span className="text-[11px] font-medium uppercase tracking-wider text-slate-400 block mb-1.5">
            Cohortes de Planificación Preconfiguradas:
          </span>
          <div className="flex flex-wrap gap-1.5">
            {presets.map((p, idx) => {
              const isActive = minAge === p.min && maxAge === p.max;
              return (
                <button
                  key={idx}
                  onClick={() => applyPreset(p.min, p.max)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all border ${
                    isActive
                      ? 'bg-[#c9a751] text-slate-900 border-[#c9a751] shadow-2xs scale-105 ring-1 ring-[#c9a751]'
                      : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100 hover:text-slate-900'
                  }`}
                >
                  {p.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Sliders Interactivos para Rango Personalizado */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-slate-50/80 p-4 rounded-xl border border-slate-200">
          <div>
            <div className="flex justify-between text-xs font-medium text-slate-700 mb-1">
              <span>Edad Mínima:</span>
              <span className="text-[#c9a751] font-semibold">{minAge} años</span>
            </div>
            <input
              type="range"
              min={0}
              max={maxAge}
              value={minAge}
              onChange={(e) => setMinAge(Number(e.target.value))}
              className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-[#c9a751]"
            />
          </div>

          <div>
            <div className="flex justify-between text-xs font-medium text-slate-700 mb-1">
              <span>Edad Máxima:</span>
              <span className="text-[#c9a751] font-semibold">{maxAge} años</span>
            </div>
            <input
              type="range"
              min={minAge}
              max={80}
              value={maxAge}
              onChange={(e) => setMaxAge(Number(e.target.value))}
              className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-[#c9a751]"
            />
          </div>

          {/* Selector de Año */}
          <div>
            <div className="flex justify-between text-xs font-medium text-slate-700 mb-1">
              <span>Gestión Activa:</span>
              <span className="text-slate-900 font-semibold">{selectedYear}</span>
            </div>
            <div className="flex items-center gap-1 overflow-x-auto pb-1">
              {availableYears.map((yr) => (
                <button
                  key={yr}
                  onClick={() => setSelectedYear(yr)}
                  className={`px-2 py-1 rounded text-[11px] font-medium transition-all shrink-0 ${
                    selectedYear === yr
                      ? 'bg-slate-900 text-white shadow-2xs'
                      : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  {yr}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* 4 Métricas Clave de la Cohorte */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="p-3.5 rounded-xl bg-white border border-slate-200 shadow-2xs">
          <span className="text-[10px] font-medium uppercase tracking-wider text-slate-400 block">
            Población en {selectedYear}
          </span>
          <strong className="text-xl sm:text-2xl font-semibold text-slate-900 block mt-0.5">
            {totalCohortCurrentYear.toLocaleString('es-BO')}
          </strong>
          <span className="text-[10px] text-slate-500 font-medium">
            Rango: {minAge} a {maxAge} años
          </span>
        </div>

        <div className="p-3.5 rounded-xl bg-white border border-slate-200 shadow-2xs">
          <span className="text-[10px] font-medium uppercase tracking-wider text-slate-400 block">
            % del Total Nacional
          </span>
          <strong className="text-xl sm:text-2xl font-semibold text-[#c9a751] block mt-0.5">
            {percentOfBolivia}%
          </strong>
          <span className="text-[10px] text-slate-500 font-medium">
            Sobre {totalBoliviaYear.toLocaleString('es-BO')} hab.
          </span>
        </div>

        <div className="p-3.5 rounded-xl bg-white border border-slate-200 shadow-2xs">
          <span className="text-[10px] font-medium uppercase tracking-wider text-slate-400 block">
            Edad Pico del Rango
          </span>
          <strong className="text-xl sm:text-2xl font-semibold text-blue-700 block mt-0.5">
            {peakAge ? `${peakAge.edad} años` : '-'}
          </strong>
          <span className="text-[10px] text-slate-500 font-medium">
            {peakAge ? `${peakAge.cantidad.toLocaleString('es-BO')} personas` : ''}
          </span>
        </div>

        <div className="p-3.5 rounded-xl bg-white border border-slate-200 shadow-2xs">
          <span className="text-[10px] font-medium uppercase tracking-wider text-slate-400 block">
            Tendencia Década (2024-2034)
          </span>
          <strong
            className={`text-xl sm:text-2xl font-semibold block mt-0.5 ${
              netChangeDecade >= 0 ? 'text-emerald-700' : 'text-rose-700'
            }`}
          >
            {netChangeDecade >= 0 ? `+${percentChangeDecade}%` : `${percentChangeDecade}%`}
          </strong>
          <span className="text-[10px] text-slate-500 font-medium">
            {netChangeDecade >= 0 ? `+${netChangeDecade.toLocaleString('es-BO')}` : netChangeDecade.toLocaleString('es-BO')} hab.
          </span>
        </div>
      </div>

      {/* ÁREA DE GRÁFICOS: DINÁMICAMENTE ADAPTABLE (SPLIT / TREND_FULL / DIST_FULL) */}
      <div className={`grid gap-6 ${isTrendFull || isDistFull ? 'grid-cols-1' : 'grid-cols-1 lg:grid-cols-2'}`}>
        
        {/* GRÁFICO 1: TENDENCIA TEMPORAL (2024 - 2034) - CON MODO EXPANDIDO / GRANDE */}
        {(!isDistFull || isTrendFull) && (
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs flex flex-col justify-between">
            <div>
              {/* Barra superior de la tarjeta con botón de maximizar */}
              <div className="flex items-center justify-between gap-3 mb-3 pb-2 border-b border-slate-100">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#c9a751]" />
                    <h3 className="text-base sm:text-lg font-semibold text-slate-900 tracking-tight">
                      Tendencia Temporal de esta Cohorte ({minAge} a {maxAge} Años, 2024 - 2034)
                    </h3>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Curva lineal continua que proyecta el volumen total de personas de esta edad en la próxima década
                  </p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <span
                    className={`text-xs font-medium px-2.5 py-1 rounded-lg border ${
                      netChangeDecade >= 0
                        ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                        : 'bg-rose-50 text-rose-800 border-rose-200'
                    }`}
                  >
                    {netChangeDecade >= 0 ? `+${percentChangeDecade}%` : `${percentChangeDecade}%`} en la década
                  </span>
                  <button
                    onClick={() => setViewMode(isTrendFull ? 'split' : 'trend_full')}
                    className="px-2.5 py-1 rounded-lg text-xs font-medium border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 transition-all flex items-center gap-1.5"
                    title={isTrendFull ? 'Restaurar a vista dividida' : 'Agrandar gráfico al ancho completo'}
                  >
                    {isTrendFull ? (
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
              </div>

              {/* Indicador del Año Activo Destacado en Grande */}
              <div className="flex flex-wrap items-center justify-between gap-3 bg-[#faf5e8]/70 border border-[#e5d5a6] rounded-xl p-3 mb-4">
                <div className="flex items-baseline gap-2">
                  <span className="text-xs font-medium text-[#c9a751] uppercase tracking-wider">
                    Gestión Seleccionada ({selectedYear}):
                  </span>
                  <strong className="text-2xl sm:text-3xl font-semibold text-slate-900">
                    {selectedPoint.total.toLocaleString('es-BO')}
                  </strong>
                  <span className="text-xs text-slate-500 font-semibold">jóvenes</span>
                </div>

                {selectedPoint.rate !== undefined && (
                  <div className="flex items-center gap-2 text-xs">
                    <span className="text-slate-500">Variación vs año previo:</span>
                    <span
                      className={`font-semibold px-2 py-0.5 rounded text-xs ${
                        selectedPoint.diff >= 0
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-rose-100 text-rose-800'
                      }`}
                    >
                      {selectedPoint.diff >= 0 ? `+${selectedPoint.diff.toLocaleString('es-BO')}` : selectedPoint.diff.toLocaleString('es-BO')} ({selectedPoint.rate >= 0 ? '+' : ''}{selectedPoint.rate}%)
                    </span>
                  </div>
                )}
              </div>

              {/* Gráfico SVG de Gran Tamaño */}
              <div className="relative w-full overflow-visible">
                <svg viewBox={`0 0 ${svgW} ${svgH}`} className="w-full h-auto overflow-visible select-none">
                  <defs>
                    <linearGradient id="cohortBigGoldGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                      <stop offset="0%" stopColor="#c9a751" stopOpacity="0.32" />
                      <stop offset="70%" stopColor="#c9a751" stopOpacity="0.06" />
                      <stop offset="100%" stopColor="#c9a751" stopOpacity="0.0" />
                    </linearGradient>
                  </defs>

                  {/* Líneas horizontales de guía */}
                  {[0, 0.25, 0.5, 0.75, 1].map((frac, idx) => {
                    const y = pad.top + innerH * frac;
                    const val = Math.round(scaleMax - frac * trendRange);
                    return (
                      <g key={idx}>
                        <line
                          x1={pad.left}
                          y1={y}
                          x2={svgW - pad.right}
                          y2={y}
                          stroke="#E2E8F0"
                          strokeDasharray="3 3"
                          strokeWidth="1"
                        />
                        <text
                          x={pad.left - 8}
                          y={y + 3.5}
                          textAnchor="end"
                          fontSize={isTrendFull ? '11' : '10'}
                          fontWeight="700"
                          fill="#64748B"
                          fontFamily="monospace"
                        >
                          {val >= 1000000 ? `${(val / 1000000).toFixed(2)}M` : `${(val / 1000).toFixed(0)}k`}
                        </text>
                      </g>
                    );
                  })}

                  {/* Eje X con todos los 11 años (2024 - 2034) legibles */}
                  {availableYears.map((yr) => {
                    const x = getLineX(yr);
                    const isSel = yr === selectedYear;
                    return (
                      <g key={yr} onClick={() => setSelectedYear(yr)} className="cursor-pointer">
                        <line
                          x1={x}
                          y1={pad.top + innerH}
                          x2={x}
                          y2={pad.top + innerH + 5}
                          stroke="#94A3B8"
                          strokeWidth="1.2"
                        />
                        <text
                          x={x}
                          y={pad.top + innerH + 18}
                          textAnchor="middle"
                          fontSize={isSel ? '12' : '10'}
                          fontWeight={isSel ? '900' : '700'}
                          fill={isSel ? '#c9a751' : '#475569'}
                          fontFamily="monospace"
                        >
                          {yr}
                        </text>
                      </g>
                    );
                  })}

                  {/* Línea base */}
                  <line
                    x1={pad.left}
                    y1={pad.top + innerH}
                    x2={svgW - pad.right}
                    y2={pad.top + innerH}
                    stroke="#94A3B8"
                    strokeWidth="1.5"
                  />

                  {/* Relleno con gradiente */}
                  <path d={trendAreaPath} fill="url(#cohortBigGoldGrad)" />

                  {/* Línea continua dorada */}
                  <path
                    d={trendLinePath}
                    fill="none"
                    stroke="#c9a751"
                    strokeWidth={isTrendFull ? '4' : '3.2'}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />

                  {/* Línea vertical en el año seleccionado */}
                  <line
                    x1={selectedPoint.x}
                    y1={pad.top}
                    x2={selectedPoint.x}
                    y2={pad.top + innerH}
                    stroke="#0F172A"
                    strokeWidth="1.5"
                    strokeDasharray="4 3"
                  />

                  {/* Puntos interactivos con etiquetas numéricas claras */}
                  {trendPoints.map((pt) => {
                    const isSel = pt.year === selectedYear;
                    return (
                      <g key={pt.year} onClick={() => setSelectedYear(pt.year)} className="cursor-pointer">
                        <circle
                          cx={pt.x}
                          cy={pt.y}
                          r={isSel ? 7 : isTrendFull ? 5 : 4}
                          fill={isSel ? '#c9a751' : '#ffffff'}
                          stroke={isSel ? '#0F172A' : '#c9a751'}
                          strokeWidth={isSel ? 3 : 2.2}
                          className="transition-all"
                        />
                        {/* En modo grande o en el punto seleccionado mostrar la cifra directamente */}
                        {(isTrendFull || isSel) && (
                          <text
                            x={pt.x}
                            y={pt.y - 10}
                            textAnchor="middle"
                            fontSize="9"
                            fontWeight="800"
                            fill={isSel ? '#0F172A' : '#64748B'}
                            fontFamily="monospace"
                          >
                            {(pt.total / 1000).toFixed(0)}k
                          </text>
                        )}
                      </g>
                    );
                  })}
                </svg>
              </div>

              {/* Tabla de detalle interanual completa cuando está en modo grande */}
              {isTrendFull && (
                <div className="mt-5 pt-4 border-t border-slate-100 overflow-x-auto">
                  <span className="text-[10px] font-medium uppercase tracking-wider text-slate-400 block mb-2">
                    Detalle Anual de la Cohorte ({minAge} a {maxAge} Años):
                  </span>
                  <div className="grid grid-cols-11 gap-1 text-center">
                    {cohortTrendByYear.map((pt) => {
                      const isSel = pt.year === selectedYear;
                      return (
                        <div
                          key={pt.year}
                          onClick={() => setSelectedYear(pt.year)}
                          className={`p-2 rounded-lg cursor-pointer transition-all border ${
                            isSel
                              ? 'bg-[#faf5e8] border-[#c9a751] shadow-xs'
                              : 'bg-slate-50/70 border-slate-200 hover:bg-slate-100'
                          }`}
                        >
                          <span className={`text-[10px] font-medium block ${isSel ? 'text-[#c9a751]' : 'text-slate-500'}`}>
                            {pt.year}
                          </span>
                          <strong className="text-xs font-semibold text-slate-900 block mt-0.5">
                            {pt.total.toLocaleString('es-BO')}
                          </strong>
                          {pt.rate !== undefined && pt.year > 2024 && (
                            <span
                              className={`text-[9px] font-medium block mt-0.5 ${
                                pt.diff >= 0 ? 'text-emerald-700' : 'text-rose-700'
                              }`}
                            >
                              {pt.rate >= 0 ? `+${pt.rate}%` : `${pt.rate}%`}
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* GRÁFICO 2: HISTOGRAMA EDAD POR EDAD - CON MODO EXPANDIDO */}
        {(!isTrendFull || isDistFull) && (
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between gap-2 mb-3 pb-2 border-b border-slate-100">
                <div>
                  <h3 className="text-base font-semibold text-slate-900">
                    Distribución Detallada por Edad Simple (Gestión {selectedYear})
                  </h3>
                  <p className="text-xs text-slate-500">
                    Volumen individual de cada año de edad ({currentYearCohort.length} edades analizadas)
                  </p>
                </div>
                <button
                  onClick={() => setViewMode(isDistFull ? 'split' : 'dist_full')}
                  className="px-2.5 py-1 rounded-lg text-xs font-medium border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 transition-all shrink-0 flex items-center gap-1.5"
                  title={isDistFull ? 'Restaurar a vista dividida' : 'Agrandar desglose de edades'}
                >
                  {isDistFull ? (
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

              <div className={`space-y-2 pr-1 overflow-y-auto ${isDistFull ? 'max-h-none' : 'max-h-80'}`}>
                {currentYearCohort.map((item) => {
                  const percent = Math.round((item.cantidad / maxBarVal) * 100);
                  const isPeak = peakAge && peakAge.edad === item.edad;
                  const is18 = item.edad === 18;

                  return (
                    <div key={item.edad} className="group p-1.5 rounded-lg hover:bg-slate-50 transition-colors">
                      <div className="flex items-center justify-between text-xs font-semibold mb-1">
                        <span className="flex items-center gap-1.5 text-slate-800">
                          <span className="text-sm font-medium">{item.edad} Años</span>
                          {is18 && (
                            <span className="text-[9px] font-medium uppercase px-1.5 py-0.2 rounded bg-[#faf5e8] text-[#c9a751] border border-[#e5d5a6]">
                              Egreso / Admisión ESFM
                            </span>
                          )}
                          {isPeak && !is18 && (
                            <span className="text-[9px] font-medium uppercase px-1.5 py-0.2 rounded bg-blue-50 text-blue-700">
                              Pico
                            </span>
                          )}
                        </span>
                        <span className="font-semibold text-slate-900 text-sm">
                          {item.cantidad.toLocaleString('es-BO')}
                        </span>
                      </div>

                      <div className="w-full h-2.5 rounded-full bg-slate-100 overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-300 ${
                            is18 || isPeak ? 'bg-[#c9a751]' : 'bg-slate-400 group-hover:bg-slate-600'
                          }`}
                          style={{ width: `${Math.max(percent, 2)}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

      </div>

      {/* Recuadro de Conclusión para Exposición Docente */}
      <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs">
        <h4 className="font-medium text-slate-800 uppercase tracking-wider text-[11px] mb-1 flex items-center gap-1.5">
          <LightbulbIcon size={14} className="text-[#c9a751]" />
          <span>Conclusión Demográfica para la Exposición ({minAge} a {maxAge} Años):</span>
        </h4>
        <p className="text-slate-600 leading-relaxed">
          En la gestión <strong>{selectedYear}</strong>, Bolivia cuenta con{' '}
          <strong className="text-slate-900">{totalCohortCurrentYear.toLocaleString('es-BO')}</strong>{' '}
          personas en este rango de edad ({percentOfBolivia}% de la población total). La proyección hasta 2034 muestra una tendencia de{' '}
          <strong className={netChangeDecade >= 0 ? 'text-emerald-700' : 'text-rose-700'}>
            {netChangeDecade >= 0 ? `crecimiento del +${percentChangeDecade}%` : `disminución del ${percentChangeDecade}%`}
          </strong>
          , lo que permite proyectar con precisión matemática la demanda de cupos para las convocatorias de admisión a las ESFM y Unidades Académicas.
        </p>
      </div>
    </div>
  );
}
