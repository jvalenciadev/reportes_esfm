'use client';

import React, { useState, useMemo } from 'react';
import { InePoblacion } from '@/types/stats';
import Image from 'next/image';
import { TrendingUpIcon, CalendarIcon, UsersIcon } from '../ui/Icons';

interface BoliviaDemographicExplorerProps {
  data: InePoblacion[];
}

export function BoliviaDemographicExplorer({ data }: BoliviaDemographicExplorerProps) {
  const sortedData = useMemo(() => [...data].sort((a, b) => a.anio - b.anio), [data]);
  const [selectedYear, setSelectedYear] = useState<number>(2026);

  if (sortedData.length === 0) return null;

  // Hitos Nacionales Relevantes
  const milestones = [
    { year: 2000, label: 'Inicio de Siglo', badge: '8.7M' },
    { year: 2012, label: 'Censo CNPV 2012', badge: '10.4M' },
    { year: 2024, label: 'Censo CPV 2024', badge: '11.9M' },
    { year: 2026, label: 'Gestión Actual', badge: '11.98M' },
    { year: 2035, label: 'Meseta Poblacional', badge: '12.1M' },
    { year: 2050, label: 'Horizonte 2050', badge: '12.3M' },
  ];

  // Datos del año seleccionado
  const currentIdx = sortedData.findIndex((d) => d.anio === selectedYear);
  const currentItem = sortedData[currentIdx] || sortedData[sortedData.length - 1];
  const previousItem = currentIdx > 0 ? sortedData[currentIdx - 1] : null;

  const diffFromPrev = previousItem ? currentItem.poblacion - previousItem.poblacion : 0;
  const growthRate = previousItem && previousItem.poblacion > 0
    ? (diffFromPrev / previousItem.poblacion) * 100
    : 0;

  // Crecimiento acumulado desde el año 2000
  const basePob = sortedData[0]?.poblacion || 8710181;
  const cumulativeGrowth = currentItem.poblacion - basePob;
  const cumulativePercent = Math.round((cumulativeGrowth / basePob) * 1000) / 10;

  // Interpretación cualitativa para exposición académica / ministerial
  const getDemographicStage = (year: number) => {
    if (year <= 2015) {
      return {
        stage: 'Fase de Expansión Escolar Acelerada',
        color: 'text-amber-800 bg-amber-50 border-amber-200',
        summary: 'Crecimiento de más de 140,000 habitantes/año.',
        impact: 'Alta presión sobre la infraestructura escolar básica y fuerte demanda de creación de plazas docentes de Educación Primaria y Comunitaria.',
      };
    } else if (year <= 2026) {
      return {
        stage: 'Pico Máximo del Bono Demográfico',
        color: 'text-[#c9a751] bg-[#faf5e8] border-[#e5d5a6]',
        summary: 'Mayor contingente histórico de jóvenes entre 15 y 24 años.',
        impact: 'Máxima concentración de bachilleres aspirantes a las 46 ESFMs del país. Momento estratégico para seleccionar a los mejores perfiles docentes.',
      };
    } else if (year <= 2035) {
      return {
        stage: 'Transición hacia la Estabilización',
        color: 'text-blue-800 bg-blue-50 border-blue-200',
        summary: 'Desaceleración paulatina de nacimientos; incremento de población activa.',
        impact: 'La matrícula de primaria inicia su meseta. La demanda docente se desplaza hacia Secundaria Productiva, Ciencias Exactas y Educación Especial.',
      };
    } else {
      return {
        stage: 'Meseta y Madurez Demográfica (Horizonte 2050)',
        color: 'text-emerald-800 bg-emerald-50 border-emerald-200',
        summary: 'Crecimiento anual mínimo (< 10,000 hab/año) y envejecimiento poblacional.',
        impact: 'Estabilización definitiva del sistema escolar. El enfoque prioritario no es construir más aulas sino elevar la calidad pedagógica, tecnológica e inclusiva.',
      };
    }
  };

  const currentStage = getDemographicStage(selectedYear);

  // Dimensiones para el SVG
  const width = 900;
  const height = 300;
  const padding = { top: 35, right: 35, bottom: 45, left: 65 };
  const innerWidth = width - padding.left - padding.right;
  const innerHeight = height - padding.top - padding.bottom;

  const minYear = sortedData[0].anio;
  const maxYear = sortedData[sortedData.length - 1].anio;
  const minPob = 8000000;
  const maxPob = 13000000;

  const getX = (year: number) => {
    return padding.left + ((year - minYear) / (maxYear - minYear)) * innerWidth;
  };
  const getY = (pob: number) => {
    return padding.top + innerHeight - ((pob - minPob) / (maxPob - minPob)) * innerHeight;
  };

  // Coordenadas para la línea continua y área
  const points = sortedData.map((d) => ({
    x: getX(d.anio),
    y: getY(d.poblacion),
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

  const selectedPoint = points.find((p) => p.anio === selectedYear) || points[0];

  return (
    <div className="bg-white rounded-2xl border border-slate-200/90 p-5 sm:p-7 shadow-xs space-y-6">
      {/* Encabezado Creativo e Institucional */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-100">
        <div>
          <div className="flex items-center gap-2.5 mb-1">
            <Image src="/minedu_2025.png" alt="MINEDU" width={60} height={25} className="h-5 w-auto object-contain" />
            <span className="text-[10px] font-medium uppercase tracking-wider text-[#c9a751] bg-[#c9a751]/10 border border-[#c9a751]/30 px-2 py-0.5 rounded">
              INE · Transición Demográfica Oficial
            </span>
          </div>
          <h2 className="text-xl sm:text-2xl font-semibold text-slate-900 tracking-tight">
            Evolución Demográfica de Bolivia (2000 - 2050): Población General
          </h2>
          <p className="text-xs text-slate-500 mt-0.5 max-w-3xl">
            Herramienta analítica de 51 años de estimaciones censales y proyecciones oficiales de población general del Estado Plurinacional (INE).
          </p>
        </div>

        {/* Crecimiento General Acumulado */}
        <div className="flex items-center gap-3 bg-slate-50 border border-slate-200/80 rounded-xl px-4 py-2.5 shrink-0">
          <div>
            <span className="text-[10px] font-medium uppercase tracking-wider text-slate-400 block">
              Crecimiento 2000 → 2050
            </span>
            <span className="text-base font-semibold text-slate-900">
              +{(sortedData[sortedData.length - 1].poblacion - basePob).toLocaleString('es-BO')} hab.
            </span>
          </div>
          <div className="px-2 py-1 rounded-lg bg-[#faf5e8] border border-[#e5d5a6] text-[#c9a751] text-xs font-semibold">
            +{Math.round(((sortedData[sortedData.length - 1].poblacion - basePob) / basePob) * 100)}%
          </div>
        </div>
      </div>

      {/* Gráfico SVG de Gran Formato con Hitos Censales y Marcador Activo */}
      <div className="relative w-full pt-3 pb-1">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="w-full h-auto select-none overflow-visible"
        >
          <defs>
            <linearGradient id="pobGoldGrad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#c9a751" stopOpacity="0.35" />
              <stop offset="60%" stopColor="#c9a751" stopOpacity="0.08" />
              <stop offset="100%" stopColor="#c9a751" stopOpacity="0.0" />
            </linearGradient>
          </defs>

          {/* Líneas guía horizontales de población */}
          {[8000000, 9000000, 10000000, 11000000, 12000000, 13000000].map((val) => {
            const y = getY(val);
            return (
              <g key={val}>
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
                  fontSize="10"
                  fontWeight="700"
                  fill="#64748B"
                  fontFamily="monospace"
                >
                  {(val / 1000000).toFixed(0)}M hab.
                </text>
              </g>
            );
          })}

          {/* Eje X Años (cada 5 años) */}
          {[2000, 2005, 2010, 2015, 2020, 2024, 2030, 2035, 2040, 2045, 2050].map((yr) => {
            const x = getX(yr);
            return (
              <g key={yr}>
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
                  fontSize="10"
                  fontWeight="700"
                  fill={yr === selectedYear ? '#c9a751' : '#475569'}
                  fontFamily="monospace"
                >
                  {yr}
                </text>
              </g>
            );
          })}

          {/* Línea base */}
          <line
            x1={padding.left}
            y1={padding.top + innerHeight}
            x2={width - padding.right}
            y2={padding.top + innerHeight}
            stroke="#94A3B8"
            strokeWidth="1.5"
          />

          {/* Área con gradiente dorado */}
          <path d={areaPath} fill="url(#pobGoldGrad)" />

          {/* Línea principal dorada */}
          <path
            d={linePath}
            fill="none"
            stroke="#c9a751"
            strokeWidth="3.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Línea vertical del año seleccionado */}
          <line
            x1={selectedPoint.x}
            y1={padding.top}
            x2={selectedPoint.x}
            y2={padding.top + innerHeight}
            stroke="#0F172A"
            strokeWidth="1.8"
            strokeDasharray="4 3"
          />

          {/* Puntos de hitos censales */}
          {milestones.map((m) => {
            const pt = points.find((p) => p.anio === m.year);
            if (!pt) return null;
            const isSelected = selectedYear === m.year;
            return (
              <g
                key={m.year}
                className="cursor-pointer"
                onClick={() => setSelectedYear(m.year)}
              >
                <circle
                  cx={pt.x}
                  cy={pt.y}
                  r={isSelected ? 7 : 5}
                  fill="#ffffff"
                  stroke="#c9a751"
                  strokeWidth={isSelected ? 4 : 2.5}
                />
                <rect
                  x={pt.x - 22}
                  y={pt.y - 24}
                  width="44"
                  height="16"
                  rx="4"
                  fill="#0F172A"
                />
                <text
                  x={pt.x}
                  y={pt.y - 13}
                  textAnchor="middle"
                  fontSize="9"
                  fontWeight="800"
                  fill="#FFFFFF"
                  fontFamily="monospace"
                >
                  {m.badge}
                </text>
              </g>
            );
          })}

          {/* Punto activo seleccionado */}
          <circle
            cx={selectedPoint.x}
            cy={selectedPoint.y}
            r="8"
            fill="#c9a751"
            stroke="#ffffff"
            strokeWidth="3"
            className="filter drop-shadow"
          />
        </svg>
      </div>

      {/* Botonera de Hitos Clave para Exposición Rápida */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs">
          <span className="font-medium text-slate-500 uppercase tracking-wider text-[11px]">
            Hitos Censales y Momentos Demográficos Clave:
          </span>
          <span className="text-[11px] font-medium text-slate-400">
            Haga clic para saltar al año exacto durante la presentación
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
          {milestones.map((m) => {
            const isSelected = selectedYear === m.year;
            return (
              <button
                key={m.year}
                onClick={() => setSelectedYear(m.year)}
                className={`p-2.5 rounded-xl border text-left transition-all ${
                  isSelected
                    ? 'bg-[#faf5e8] border-[#c9a751] shadow-xs ring-1 ring-[#c9a751]'
                    : 'bg-slate-50/70 border-slate-200 hover:bg-slate-100 hover:border-slate-300'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-xs text-slate-900">
                    {m.year}
                  </span>
                  <span
                    className={`text-[9px] font-medium px-1.5 py-0.2 rounded ${
                      isSelected
                        ? 'bg-[#c9a751] text-slate-900'
                        : 'bg-slate-200 text-slate-700'
                    }`}
                  >
                    {m.badge}
                  </span>
                </div>
                <p className="text-[10px] text-slate-500 font-medium truncate mt-1">
                  {m.label}
                </p>
              </button>
            );
          })}
        </div>
      </div>

      {/* Slider Temporal / Scrubber Dinámico */}
      <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-2">
        <div className="flex items-center justify-between text-xs font-medium text-slate-700">
          <span>Línea Temporal Interactiva (2000 - 2050):</span>
          <span className="text-base font-semibold text-slate-900 bg-white px-3 py-1 rounded-lg border border-slate-200 shadow-2xs">
            Gestión {selectedYear}
          </span>
        </div>
        <input
          type="range"
          min={minYear}
          max={maxYear}
          value={selectedYear}
          onChange={(e) => setSelectedYear(Number(e.target.value))}
          className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-[#c9a751]"
        />
        <div className="flex justify-between text-[10px] text-slate-400 font-semibold">
          <span>2000 (8.7M)</span>
          <span>2012 (10.4M)</span>
          <span>2024 (11.9M)</span>
          <span>2035 (12.1M)</span>
          <span>2050 (12.3M)</span>
        </div>
      </div>

      {/* Panel Analítico Detallado del Año Seleccionado */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* KPI 1: Habitantes y Crecimiento Neto */}
        <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-2xs">
          <span className="text-[10px] font-medium uppercase tracking-wider text-slate-400 block mb-1">
            Población en {selectedYear}
          </span>
          <div className="text-2xl font-semibold text-slate-900">
            {currentItem.poblacion.toLocaleString('es-BO')}
            <span className="text-xs font-semibold text-slate-500 ml-1">hab.</span>
          </div>
          <div className="mt-2 pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
            <span className="text-slate-500">Crecimiento desde el 2000:</span>
            <strong className="text-emerald-700 font-medium">
              +{cumulativePercent}% (+{cumulativeGrowth.toLocaleString('es-BO')})
            </strong>
          </div>
        </div>

        {/* KPI 2: Variación Anual de ese Año */}
        <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-2xs">
          <span className="text-[10px] font-medium uppercase tracking-wider text-slate-400 block mb-1">
            Incremento Anual (Gestión {selectedYear})
          </span>
          <div className="text-2xl font-semibold text-slate-900">
            {diffFromPrev >= 0 ? `+${diffFromPrev.toLocaleString('es-BO')}` : diffFromPrev.toLocaleString('es-BO')}
            <span className="text-xs font-semibold text-slate-500 ml-1">hab/año</span>
          </div>
          <div className="mt-2 pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
            <span className="text-slate-500">Ritmo de Crecimiento Anual:</span>
            <span
              className={`font-semibold px-2 py-0.5 rounded text-[11px] ${
                growthRate >= 1.0
                  ? 'bg-emerald-50 text-emerald-800'
                  : 'bg-amber-50 text-amber-800'
              }`}
            >
              +{growthRate.toFixed(2)}% anual
            </span>
          </div>
        </div>

        {/* KPI 3: Diagnóstico de Etapa Demográfica */}
        <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-2xs flex flex-col justify-between">
          <div>
            <span className="text-[10px] font-medium uppercase tracking-wider text-slate-400 block mb-1">
              Etapa Demográfica Nacional
            </span>
            <span className={`inline-block px-2.5 py-1 rounded-lg text-xs font-medium border ${currentStage.color}`}>
              {currentStage.stage}
            </span>
          </div>
          <p className="text-[11px] text-slate-500 mt-2 line-clamp-2">
            {currentStage.summary}
          </p>
        </div>
      </div>

      {/* Recuadro de Impacto Estratégico en las ESFM (Para el expositor) */}
      <div className="p-4 sm:p-5 rounded-xl bg-[#faf5e8]/80 border border-[#e5d5a6] text-xs">
        <div className="flex items-center gap-2 mb-2">
          <TrendingUpIcon size={16} className="text-[#c9a751]" />
          <h4 className="font-medium text-[#c9a751] text-xs uppercase tracking-wider">
            Contexto Demográfico y Tendencia (Gestión {selectedYear}):
          </h4>
        </div>
        <p className="text-slate-800 leading-relaxed font-medium">
          {currentStage.impact}
        </p>
      </div>
    </div>
  );
}
