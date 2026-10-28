'use client';

import React, { useState, useMemo } from 'react';
import { MatriculaRuralUrbana } from '@/types/stats';
import { TrendingUpIcon, CalendarIcon, UsersIcon, MapPinIcon } from '../ui/Icons';

interface SieTerritorialExplorerProps {
  data: MatriculaRuralUrbana[];
}

export function SieTerritorialExplorer({ data }: SieTerritorialExplorerProps) {
  const [selectedYear, setSelectedYear] = useState<number>(2025);

  // Consolidar datos por año (Urbano, Rural, Total)
  const yearlyData = useMemo(() => {
    const years = Array.from(new Set(data.map((r) => r.anio))).sort((a, b) => a - b);
    const mapUrb = new Map<number, number>();
    const mapRur = new Map<number, number>();

    data.forEach((r) => {
      const isUrb = (r.area || '').toLowerCase().includes('urb');
      if (isUrb) {
        mapUrb.set(r.anio, r.cantidad);
      } else {
        mapRur.set(r.anio, r.cantidad);
      }
    });

    return years.map((anio) => {
      const urb = mapUrb.get(anio) || 0;
      const rur = mapRur.get(anio) || 0;
      const total = urb + rur;
      const pctUrb = total > 0 ? (urb / total) * 100 : 0;
      const pctRur = total > 0 ? (rur / total) * 100 : 0;
      const brecha = urb - rur;
      return {
        anio,
        urb,
        rur,
        total,
        pctUrb,
        pctRur,
        brecha,
      };
    });
  }, [data]);

  if (yearlyData.length === 0) return null;

  // Hitos históricos territoriales
  const milestones = [
    { year: 2000, label: 'Inicio Serie Censal', badge: '1.92M' },
    { year: 2006, label: 'Transición Curricular', badge: '2.44M' },
    { year: 2010, label: 'Promulgación Ley 070', badge: '2.62M' },
    { year: 2015, label: 'Consolidación Cobertura', badge: '2.77M' },
    { year: 2020, label: 'Impacto Sanitario', badge: '2.84M' },
    { year: 2025, label: 'Última Gestión Censada', badge: '2.93M' },
  ];

  // Datos del año seleccionado
  const currentIdx = yearlyData.findIndex((d) => d.anio === selectedYear);
  const currentItem = yearlyData[currentIdx] || yearlyData[yearlyData.length - 1];
  const previousItem = currentIdx > 0 ? yearlyData[currentIdx - 1] : null;

  const diffFromPrev = previousItem ? currentItem.total - previousItem.total : 0;
  const growthRate = previousItem && previousItem.total > 0
    ? (diffFromPrev / previousItem.total) * 100
    : 0;

  // Crecimiento acumulado desde el año 2000
  const baseTotal = yearlyData[0]?.total || 1;
  const cumulativeGrowth = currentItem.total - baseTotal;
  const cumulativePercent = Math.round((cumulativeGrowth / baseTotal) * 1000) / 10;

  // Diagnóstico territorial ministerial según año
  const getTerritorialContext = (year: number) => {
    if (year <= 2006) {
      return {
        title: 'Fase de Fuerte Ruralidad y Universalización',
        color: 'text-amber-800 bg-amber-50 border-amber-200',
        summary: 'Matrícula rural representaba más del 32% del sistema educativo.',
        detail: 'Etapa enfocada en erradicar el analfabetismo y abrir núcleos escolares rurales de difícil acceso. La ciudad comenzaba a absorber la migración campo-ciudad.',
      };
    } else if (year <= 2014) {
      return {
        title: 'Aceleración de la Urbanización Escolar',
        color: 'text-[#c9a751] bg-[#faf5e8] border-[#e5d5a6]',
        summary: 'La matrícula urbana superó por primera vez el 70% del total nacional.',
        detail: 'Crecimiento vertiginoso de unidades educativas en El Alto, Santa Cruz de la Sierra y Cochabamba. Alta demanda de maestros para infraestructura secundaria.',
      };
    } else if (year <= 2020) {
      return {
        title: 'Estabilización Rural y Consolidación Técnico-Humanística',
        color: 'text-blue-800 bg-blue-50 border-blue-200',
        summary: 'Matrícula rural se estabiliza en torno a 600,000 estudiantes.',
        detail: 'Implementación del Bachillerato Técnico Humanístico (BTH). La matrícula escolar nacional alcanza su máximo histórico superando los 2.8 millones.',
      };
    } else {
      return {
        title: 'Concentración Urbana Madura y Retención Rural (2021-2025)',
        color: 'text-emerald-800 bg-emerald-50 border-emerald-200',
        summary: 'El 78.4% de la matrícula se concentra en ciudades intermedias y capitales.',
        detail: 'El desafío de las ESFMs es doble: formar docentes bilingües con alta pertinencia cultural para no desatender el área rural, y docentes especializados en ciencia/tecnología para las populosas urbes.',
      };
    }
  };

  const currentContext = getTerritorialContext(selectedYear);

  // Parámetros para SVG responsive
  const width = 900;
  const height = 320;
  const padding = { top: 35, right: 35, bottom: 45, left: 75 };
  const innerWidth = width - padding.left - padding.right;
  const innerHeight = height - padding.top - padding.bottom;

  const minYear = yearlyData[0].anio;
  const maxYear = yearlyData[yearlyData.length - 1].anio;
  const minVal = 400000;
  const maxVal = 3200000;

  const getX = (year: number) => {
    return padding.left + ((year - minYear) / (maxYear - minYear)) * innerWidth;
  };
  const getY = (val: number) => {
    return padding.top + innerHeight - ((val - minVal) / (maxVal - minVal)) * innerHeight;
  };

  const pointsTot = yearlyData.map((d) => ({ x: getX(d.anio), y: getY(d.total), ...d }));
  const pointsUrb = yearlyData.map((d) => ({ x: getX(d.anio), y: getY(d.urb), ...d }));
  const pointsRur = yearlyData.map((d) => ({ x: getX(d.anio), y: getY(d.rur), ...d }));

  const pathTot = pointsTot.reduce((acc, p, i) => `${acc} ${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`, '');
  const pathUrb = pointsUrb.reduce((acc, p, i) => `${acc} ${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`, '');
  const pathRur = pointsRur.reduce((acc, p, i) => `${acc} ${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`, '');

  const areaUrb = `${pathUrb} L ${pointsUrb[pointsUrb.length - 1].x.toFixed(1)} ${getY(minVal).toFixed(1)} L ${pointsUrb[0].x.toFixed(1)} ${getY(minVal).toFixed(1)} Z`;

  const currentX = getX(selectedYear);
  const currentTotY = getY(currentItem.total);
  const currentUrbY = getY(currentItem.urb);
  const currentRurY = getY(currentItem.rur);

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs space-y-6">
      {/* Encabezado y Selector */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 border-b border-slate-100 pb-5">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] font-semibold uppercase tracking-wider bg-[#faf5e8] text-[#c9a751] border border-[#e5d5a6] px-2.5 py-0.5 rounded-md flex items-center gap-1.5">
              <MapPinIcon size={12} className="text-[#a08035]" />
              Explorador Territorial de Matrícula (2000 - 2025)
            </span>
            <span className="text-[10px] font-medium text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200">
              Serie Censal SIE 26 Años
            </span>
          </div>
          <h2 className="text-xl font-semibold text-slate-900 tracking-tight">
            Tendencia Histórica: Concentración Urbana vs Retención Rural
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Deslice la línea temporal o seleccione hitos históricos para analizar la evolución demográfica escolar del Estado Plurinacional.
          </p>
        </div>

        {/* Hitos Rápidos */}
        <div className="flex items-center gap-1.5 overflow-x-auto max-w-full pb-1 xl:pb-0">
          {milestones.map((m) => (
            <button
              key={m.year}
              onClick={() => setSelectedYear(m.year)}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all shrink-0 border ${
                selectedYear === m.year
                  ? 'bg-[#c9a751] text-slate-900 border-[#a08035] shadow-xs'
                  : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
              }`}
            >
              <span className="block text-[11px] leading-none">{m.year}</span>
              <span className="text-[9px] opacity-80 block mt-0.5">{m.badge}</span>
            </button>
          ))}
        </div>
      </div>

      {/* 4 Indicadores en Tiempo Real del Año Seleccionado */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-[#faf5e8]/70 border border-[#e5d5a6] rounded-xl p-3.5">
          <span className="text-[10px] uppercase font-medium text-[#c9a751] tracking-wider block">
            Matrícula Total ({selectedYear})
          </span>
          <div className="text-xl font-semibold text-slate-900 mt-0.5">
            {currentItem.total.toLocaleString('es-BO')}
          </div>
          <span className="text-[11px] text-slate-600 mt-1 block">
            {diffFromPrev >= 0 ? '+' : ''}{diffFromPrev.toLocaleString('es-BO')} ({growthRate >= 0 ? '+' : ''}{growthRate.toFixed(2)}% vs año anterior)
          </span>
        </div>

        <div className="bg-amber-50/70 border border-amber-200 rounded-xl p-3.5">
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase font-medium text-amber-900 tracking-wider">
              Área Urbana
            </span>
            <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-[#c9a751] text-slate-900">
              {currentItem.pctUrb.toFixed(1)}%
            </span>
          </div>
          <div className="text-xl font-semibold text-slate-900 mt-0.5">
            {currentItem.urb.toLocaleString('es-BO')}
          </div>
          <span className="text-[11px] text-slate-600 mt-1 block">
            Concentración en ciudades
          </span>
        </div>

        <div className="bg-emerald-50/70 border border-emerald-200 rounded-xl p-3.5">
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase font-medium text-emerald-900 tracking-wider">
              Área Rural
            </span>
            <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-emerald-600 text-white">
              {currentItem.pctRur.toFixed(1)}%
            </span>
          </div>
          <div className="text-xl font-semibold text-slate-900 mt-0.5">
            {currentItem.rur.toLocaleString('es-BO')}
          </div>
          <span className="text-[11px] text-slate-600 mt-1 block">
            Población escolar rural
          </span>
        </div>

        <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5">
          <span className="text-[10px] uppercase font-medium text-slate-600 tracking-wider block">
            Brecha Urbano - Rural
          </span>
          <div className="text-xl font-semibold text-slate-900 mt-0.5">
            +{currentItem.brecha.toLocaleString('es-BO')}
          </div>
          <span className="text-[11px] text-slate-600 mt-1 block">
            Crecimiento acumulado: <strong>+{cumulativePercent}%</strong>
          </span>
        </div>
      </div>

      {/* Gráfico SVG Principal con 3 Líneas */}
      <div className="bg-slate-50/60 rounded-xl border border-slate-200 p-4">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-2 text-xs">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-1 bg-[#1e293b] rounded"></span>
              <span className="font-medium text-slate-800">Total Nacional</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-1 bg-[#c9a751] rounded"></span>
              <span className="font-medium text-[#c9a751]">Área Urbana</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-1 bg-[#059669] rounded"></span>
              <span className="font-medium text-emerald-800">Área Rural</span>
            </div>
          </div>
          <span className="text-[11px] text-slate-500">
            Año seleccionado: <strong className="text-slate-900 font-medium">{selectedYear}</strong>
          </span>
        </div>

        <div className="w-full overflow-x-auto">
          <svg
            viewBox={`0 0 ${width} ${height}`}
            className="w-full h-auto min-w-[650px] overflow-visible select-none"
          >
            <defs>
              <linearGradient id="urbGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#c9a751" stopOpacity="0.25" />
                <stop offset="100%" stopColor="#c9a751" stopOpacity="0.0" />
              </linearGradient>
            </defs>

            {/* Guías horizontales de estudiantes */}
            {[500000, 1000000, 1500000, 2000000, 2500000, 3000000].map((val) => {
              const y = getY(val);
              return (
                <g key={val}>
                  <line
                    x1={padding.left}
                    y1={y}
                    x2={width - padding.right}
                    y2={y}
                    stroke="#e2e8f0"
                    strokeWidth="1"
                    strokeDasharray="4 4"
                  />
                  <text
                    x={padding.left - 10}
                    y={y + 4}
                    textAnchor="end"
                    fontSize="10"
                    fill="#94a3b8"
                    fontFamily="monospace"
                  >
                    {(val / 1000000).toFixed(1)}M
                  </text>
                </g>
              );
            })}

            {/* Años en eje X */}
            {yearlyData.filter((_, idx) => idx % 3 === 0 || idx === yearlyData.length - 1).map((d) => {
              const x = getX(d.anio);
              return (
                <g key={d.anio}>
                  <line
                    x1={x}
                    y1={padding.top}
                    x2={x}
                    y2={height - padding.bottom}
                    stroke="#f1f5f9"
                    strokeWidth="1"
                  />
                  <text
                    x={x}
                    y={height - padding.bottom + 18}
                    textAnchor="middle"
                    fontSize="11"
                    fill="#64748b"
                    fontFamily="monospace"
                    fontWeight="600"
                  >
                    {d.anio}
                  </text>
                </g>
              );
            })}

            {/* Área sombreada urbana */}
            <path d={areaUrb} fill="url(#urbGrad)" />

            {/* Línea Total Nacional */}
            <path
              d={pathTot}
              fill="none"
              stroke="#1e293b"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />

            {/* Línea Urbana */}
            <path
              d={pathUrb}
              fill="none"
              stroke="#c9a751"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
            />

            {/* Línea Rural */}
            <path
              d={pathRur}
              fill="none"
              stroke="#059669"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />

            {/* Línea vertical indicadora del año seleccionado */}
            <line
              x1={currentX}
              y1={padding.top}
              x2={currentX}
              y2={height - padding.bottom}
              stroke="#c9a751"
              strokeWidth="2"
              strokeDasharray="3 3"
            />

            {/* Puntos destacados del año seleccionado */}
            <circle cx={currentX} cy={currentTotY} r="5" fill="#1e293b" stroke="#ffffff" strokeWidth="2" />
            <circle cx={currentX} cy={currentUrbY} r="6" fill="#c9a751" stroke="#ffffff" strokeWidth="2" />
            <circle cx={currentX} cy={currentRurY} r="5" fill="#059669" stroke="#ffffff" strokeWidth="2" />

            {/* Etiquetas interactivas en el cursor */}
            <g transform={`translate(${currentX > width - 160 ? currentX - 140 : currentX + 12}, ${padding.top + 10})`}>
              <rect width="130" height="66" rx="6" fill="#1e293b" fillOpacity="0.95" />
              <text x="10" y="18" fontSize="10" fontWeight="bold" fill="#f8fafc">
                Gestión {selectedYear}
              </text>
              <text x="10" y="32" fontSize="10" fill="#facc15" fontFamily="monospace">
                Urb: {currentItem.urb.toLocaleString('es-BO')}
              </text>
              <text x="10" y="46" fontSize="10" fill="#34d399" fontFamily="monospace">
                Rur: {currentItem.rur.toLocaleString('es-BO')}
              </text>
              <text x="10" y="60" fontSize="10" fill="#e2e8f0" fontFamily="monospace">
                Tot: {currentItem.total.toLocaleString('es-BO')}
              </text>
            </g>
          </svg>
        </div>

        {/* Control Deslizante (Slider de Años) */}
        <div className="mt-4 pt-3 border-t border-slate-200">
          <div className="flex items-center justify-between gap-4">
            <span className="text-[11px] font-medium text-slate-500">2000</span>
            <input
              type="range"
              min={minYear}
              max={maxYear}
              value={selectedYear}
              onChange={(e) => setSelectedYear(Number(e.target.value))}
              className="w-full accent-[#c9a751] cursor-pointer h-2 bg-slate-200 rounded-lg"
            />
            <span className="text-[11px] font-medium text-slate-500">2025</span>
          </div>
        </div>
      </div>

      {/* Diagnóstico Ministerial Territorial Contextual */}
      <div className={`p-4 rounded-xl border ${currentContext.color}`}>
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-lg bg-white/70 border border-current shrink-0">
            <CalendarIcon size={18} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded bg-white/80">
                Gestión {selectedYear}
              </span>
              <h4 className="font-semibold text-sm">{currentContext.title}</h4>
            </div>
            <p className="text-xs font-semibold mt-1 opacity-90">{currentContext.summary}</p>
            <p className="text-xs mt-1.5 opacity-80 leading-relaxed">{currentContext.detail}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
