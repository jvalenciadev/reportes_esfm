'use client';

import React, { useState, useMemo } from 'react';
import { DashboardDataset, SieTotalEstudiantes } from '@/types/stats';
import { StatCard } from '../StatCard';
import { TrendLineChart, TrendSeries } from '../TrendLineChart';
import { PieChart, PieSlice } from '../PieChart';
import { YearProgression } from '../YearProgression';
import { DataTable, ColumnDef } from '../DataTable';
import { SourceBadge } from '../SourceBadge';
import { SieTerritorialExplorer } from '../SieTerritorialExplorer';
import {
  SchoolIcon,
  UsersIcon,
  TrendingUpIcon,
  CalendarIcon,
  MapPinIcon,
  ChartBarIcon,
  ChartPieIcon,
  LayersIcon,
} from '../../ui/Icons';

interface SieViewProps {
  data: DashboardDataset;
}

export function SieView({ data }: SieViewProps) {
  const [activeTab, setActiveTab] = useState<'lineas' | 'comparativo_anual' | 'departamentos' | 'tablas'>('lineas');
  const [activeSubTab, setActiveSubTab] = useState<'sie2026' | 'rural_urbana'>('sie2026');
  const [areaFilter, setAreaFilter] = useState<'all' | 'urbana' | 'rural'>('all');

  // 1. Cálculos de Matrícula SIE 2026
  const totalEstudiantes2026 = useMemo(
    () => data.sie_total_estudiantes.reduce((acc, r) => acc + (r.cantidad || 0), 0),
    [data.sie_total_estudiantes]
  );

  // 2. Desglose Público vs Privado SIE 2026 (Datos Reales BD)
  const depenPieData: PieSlice[] = useMemo(() => {
    let publico = 0;
    let privado = 0;
    data.sie_total_estudiantes.forEach((r) => {
      const dep = (r.dependencia || '').toLowerCase();
      if (dep.includes('públ') || dep.includes('publ')) {
        publico += r.cantidad || 0;
      } else {
        privado += r.cantidad || 0;
      }
    });
    return [
      { label: 'Sector Público', value: publico, color: '#c9a751', sublabel: 'Educación fiscal y convenio' },
      { label: 'Sector Privado', value: privado, color: '#475569', sublabel: 'Unidades educativas particulares' },
    ];
  }, [data.sie_total_estudiantes]);

  // 3. Desglose por Nivel Escolar SIE 2026 (Datos Reales BD)
  const nivelPieData: PieSlice[] = useMemo(() => {
    let inicial = 0;
    let primaria = 0;
    let secundaria = 0;
    data.sie_total_estudiantes.forEach((r) => {
      const txt = (r.nivel_texto || '').toLowerCase();
      if (txt.includes('inic')) inicial += r.cantidad || 0;
      else if (txt.includes('prim')) primaria += r.cantidad || 0;
      else if (txt.includes('secu')) secundaria += r.cantidad || 0;
    });
    return [
      { label: 'Educación Primaria Comunitaria', value: primaria, color: '#c9a751', sublabel: '1º a 6º de primaria' },
      { label: 'Educación Secundaria Productiva', value: secundaria, color: '#a08035', sublabel: '1º a 6º de secundaria' },
      { label: 'Educación Inicial en Familia', value: inicial, color: '#d8c386', sublabel: 'Etapa inicial' },
    ];
  }, [data.sie_total_estudiantes]);

  // 4. Desglose Territorial Última Gestión (2025)
  const ruralUrbanaPieData: PieSlice[] = useMemo(() => {
    const items2025 = data.matricula_rural_urbana.filter((r) => r.anio === 2025);
    return items2025.map((r) => ({
      label: `Área ${r.area}`,
      value: r.cantidad,
      color: r.area.toLowerCase().includes('urb') ? '#c9a751' : '#059669',
      sublabel: `Gestión 2025`,
    }));
  }, [data.matricula_rural_urbana]);

  // 5. Mapeo Único y Limpio Rural-Urbano (Corrige la duplicación de 2018 del archivo censal fuente)
  const cleanRuralUrbana = useMemo(() => {
    const mapUrb = new Map<number, number>();
    const mapRur = new Map<number, number>();
    const mapTot = new Map<number, number>();

    data.matricula_rural_urbana.forEach((r) => {
      const isUrb = (r.area || '').toLowerCase().includes('urb');
      if (isUrb) {
        mapUrb.set(r.anio, r.cantidad);
      } else {
        mapRur.set(r.anio, r.cantidad);
      }
    });

    const years = Array.from(new Set(data.matricula_rural_urbana.map((r) => r.anio))).sort((a, b) => a - b);
    years.forEach((y) => {
      mapTot.set(y, (mapUrb.get(y) || 0) + (mapRur.get(y) || 0));
    });

    return { mapUrb, mapRur, mapTot, years };
  }, [data.matricula_rural_urbana]);

  // 5a. Serie Lineal Histórica: Rural vs Urbana vs Total (2000 - 2025)
  const ruralUrbanaLineSeries: TrendSeries[] = useMemo(() => {
    const { mapUrb, mapRur, mapTot, years } = cleanRuralUrbana;
    const series: TrendSeries[] = [];

    if (areaFilter === 'all' || areaFilter === 'urbana') {
      series.push({
        id: 'urbana',
        name: 'Matrícula Área Urbana',
        color: '#c9a751',
        data: years.map((y) => ({ year: y, value: mapUrb.get(y) || 0 })),
      });
    }

    if (areaFilter === 'all' || areaFilter === 'rural') {
      series.push({
        id: 'rural',
        name: 'Matrícula Área Rural',
        color: '#059669',
        data: years.map((y) => ({ year: y, value: mapRur.get(y) || 0 })),
      });
    }

    if (areaFilter === 'all') {
      series.push({
        id: 'total',
        name: 'Total Consolidado Nacional',
        color: '#1e293b',
        data: years.map((y) => ({ year: y, value: mapTot.get(y) || 0 })),
      });
    }

    return series;
  }, [cleanRuralUrbana, areaFilter]);

  // 5b. SERIE LINEAL: Tasa de Crecimiento Interanual Anual (%) (2001 - 2025)
  const tasaCrecimientoLineSeries: TrendSeries[] = useMemo(() => {
    const { mapUrb, mapRur, mapTot, years } = cleanRuralUrbana;

    const dataTot: { year: number; value: number }[] = [];
    const dataUrb: { year: number; value: number }[] = [];
    const dataRur: { year: number; value: number }[] = [];

    for (let i = 1; i < years.length; i++) {
      const y = years[i];
      const prevY = years[i - 1];

      const tot = mapTot.get(y) || 0;
      const prevTot = mapTot.get(prevY) || 1;
      const rateTot = Math.round(((tot - prevTot) / prevTot) * 1000) / 10;
      dataTot.push({ year: y, value: rateTot });

      const urb = mapUrb.get(y) || 0;
      const prevUrb = mapUrb.get(prevY) || 1;
      const rateUrb = Math.round(((urb - prevUrb) / prevUrb) * 1000) / 10;
      dataUrb.push({ year: y, value: rateUrb });

      const rur = mapRur.get(y) || 0;
      const prevRur = mapRur.get(prevY) || 1;
      const rateRur = Math.round(((rur - prevRur) / prevRur) * 1000) / 10;
      dataRur.push({ year: y, value: rateRur });
    }

    return [
      {
        id: 'tasa_tot',
        name: 'Tasa Crecimiento Total (%)',
        color: '#c9a751',
        data: dataTot,
      },
      {
        id: 'tasa_urb',
        name: 'Tasa Área Urbana (%)',
        color: '#a08035',
        data: dataUrb,
      },
      {
        id: 'tasa_rur',
        name: 'Tasa Área Rural (%)',
        color: '#059669',
        data: dataRur,
      },
    ];
  }, [cleanRuralUrbana]);

  // 5c. SERIE LINEAL: Brecha Territorial Histórica (Excedente Urbano vs Rural 2000-2025)
  const brechaLineSeries: TrendSeries[] = useMemo(() => {
    const { mapUrb, mapRur, years } = cleanRuralUrbana;

    return [
      {
        id: 'brecha_abs',
        name: 'Brecha Ciudad vs Campo (Diferencia Absoluta)',
        color: '#c9a751',
        data: years.map((y) => ({
          year: y,
          value: (mapUrb.get(y) || 0) - (mapRur.get(y) || 0),
        })),
      },
    ];
  }, [cleanRuralUrbana]);

  // 6. Progresión consolidada para YearProgression
  const ruralUrbanaProgression = useMemo(() => {
    const { mapTot, years } = cleanRuralUrbana;
    return years.map((year) => ({
      year,
      value: mapTot.get(year) || 0,
    }));
  }, [cleanRuralUrbana]);

  // 7. Matriz de Crecimiento Interanual (2000 - 2025)
  const comparativoAnualRuralUrbana = useMemo(() => {
    const { mapUrb, mapRur, mapTot, years } = cleanRuralUrbana;
    let prevTotal = 0;

    return years.map((anio, idx) => {
      const urb = mapUrb.get(anio) || 0;
      const rur = mapRur.get(anio) || 0;
      const total = mapTot.get(anio) || 0;
      const diff = idx === 0 ? 0 : total - prevTotal;
      const growthRate = idx === 0 || prevTotal === 0 ? 0 : Number(((diff / prevTotal) * 100).toFixed(2));
      const pctUrbana = total > 0 ? Number(((urb / total) * 100).toFixed(1)) : 0;
      const pctRural = total > 0 ? Number(((rur / total) * 100).toFixed(1)) : 0;
      const brecha = urb - rur;

      prevTotal = total;

      return {
        anio,
        total,
        diff,
        growthRate,
        urb,
        rur,
        pctUrbana,
        pctRural,
        brecha,
      };
    });
  }, [cleanRuralUrbana]);

  // 8. Desglose Departamental SIE 2026 (Datos Reales BD)
  const departamentosSIE = useMemo(() => {
    const map = new Map<string, {
      nombre: string;
      total: number;
      publico: number;
      privado: number;
      inicial: number;
      primaria: number;
      secundaria: number;
    }>();

    data.sie_total_estudiantes.forEach((r) => {
      const nombre = r.departamentos?.nombre || `Departamento #${r.departamento_id}`;
      if (!map.has(nombre)) {
        map.set(nombre, {
          nombre,
          total: 0,
          publico: 0,
          privado: 0,
          inicial: 0,
          primaria: 0,
          secundaria: 0,
        });
      }
      const entry = map.get(nombre)!;
      const cant = r.cantidad || 0;
      entry.total += cant;

      const isPub = (r.dependencia || '').toLowerCase().includes('públ') || (r.dependencia || '').toLowerCase().includes('publ');
      if (isPub) entry.publico += cant;
      else entry.privado += cant;

      const txt = (r.nivel_texto || '').toLowerCase();
      if (txt.includes('inic')) entry.inicial += cant;
      else if (txt.includes('prim')) entry.primaria += cant;
      else if (txt.includes('secu')) entry.secundaria += cant;
    });

    return Array.from(map.values())
      .sort((a, b) => b.total - a.total)
      .map((d) => ({
        ...d,
        pctNacional: totalEstudiantes2026 > 0 ? Number(((d.total / totalEstudiantes2026) * 100).toFixed(1)) : 0,
        pctPublico: d.total > 0 ? Number(((d.publico / d.total) * 100).toFixed(1)) : 0,
        pctPrivado: d.total > 0 ? Number(((d.privado / d.total) * 100).toFixed(1)) : 0,
      }));
  }, [data.sie_total_estudiantes, totalEstudiantes2026]);

  // 9. Estadísticas históricas de resumen Rural-Urbana
  const matricula2000 = useMemo(() => {
    return data.matricula_rural_urbana
      .filter((r) => r.anio === 2000)
      .reduce((acc, r) => acc + (r.cantidad || 0), 0);
  }, [data.matricula_rural_urbana]);

  const matricula2025 = useMemo(() => {
    return data.matricula_rural_urbana
      .filter((r) => r.anio === 2025)
      .reduce((acc, r) => acc + (r.cantidad || 0), 0);
  }, [data.matricula_rural_urbana]);

  const crecimientoAbsoluto = matricula2025 - matricula2000;
  const crecimientoPctTotal = matricula2000 > 0 ? ((crecimientoAbsoluto / matricula2000) * 100).toFixed(1) : '0';

  // Columnas para tabla SIE 2026
  const sieColumns: ColumnDef<SieTotalEstudiantes>[] = [
    {
      key: 'departamento',
      header: 'Departamento',
      render: (r) => (
        <span className="font-semibold text-slate-800">
          {r.departamentos?.nombre || `Dep #${r.departamento_id}`}
        </span>
      ),
    },
    {
      key: 'dependencia',
      header: 'Dependencia',
      render: (r) => {
        const isPub = (r.dependencia || '').toLowerCase().includes('públ') || (r.dependencia || '').toLowerCase().includes('publ');
        return (
          <span
            className={`px-2 py-0.5 rounded text-[11px] font-bold ${isPub
              ? 'bg-[#faf5e8] text-[#7d6325] border border-[#e5d5a6]'
              : 'bg-slate-100 text-slate-700 border border-slate-200'
              }`}
          >
            {r.dependencia}
          </span>
        );
      },
    },
    { key: 'nivel_texto', header: 'Nivel Educativo' },
    { key: 'nivel', header: 'Grado/Ciclo', align: 'center' },
    {
      key: 'cantidad',
      header: 'Estudiantes',
      align: 'right',
      render: (r) => (
        <span className="font-bold text-slate-900 font-mono">
          {(r.cantidad || 0).toLocaleString('es-BO')}
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header Institucional SIE con Selector de Pestañas Principales */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 flex flex-col xl:flex-row xl:items-center justify-between gap-4 shadow-xs">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] font-black uppercase tracking-wider bg-[#faf5e8] text-[#7d6325] border border-[#e5d5a6] px-2.5 py-0.5 rounded-md">
              SIE · Sistema de Información Educativa
            </span>
            <span className="text-[10px] font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200">
              Gestión 2000 - 2026
            </span>
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">
            Matrícula Regular y Cobertura Territorial (2000 - 2026)
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Estadística del Subsistema de Educación Regular consolidada por el Ministerio de Educación del Estado Plurinacional de Bolivia.
          </p>
        </div>

        {/* Selector de Pestañas Institucionales */}
        <div className="flex items-center gap-1.5 bg-slate-100 p-1.5 rounded-xl border border-slate-200 self-start xl:self-auto overflow-x-auto max-w-full">
          <button
            onClick={() => setActiveTab('lineas')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${activeTab === 'lineas'
              ? 'bg-white text-slate-900 shadow-xs border border-slate-200/80'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
              }`}
          >
            <TrendingUpIcon size={15} className={activeTab === 'lineas' ? 'text-[#a08035]' : 'text-slate-400'} />
            <span>Tendencias Temporales</span>
          </button>

          <button
            onClick={() => setActiveTab('comparativo_anual')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${activeTab === 'comparativo_anual'
              ? 'bg-white text-slate-900 shadow-xs border border-slate-200/80'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
              }`}
          >
            <CalendarIcon size={15} className={activeTab === 'comparativo_anual' ? 'text-[#a08035]' : 'text-slate-400'} />
            <span>Crecimiento Año a Año</span>
          </button>

          <button
            onClick={() => setActiveTab('departamentos')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${activeTab === 'departamentos'
              ? 'bg-white text-slate-900 shadow-xs border border-slate-200/80'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
              }`}
          >
            <MapPinIcon size={15} className={activeTab === 'departamentos' ? 'text-[#a08035]' : 'text-slate-400'} />
            <span>Desglose Departamental</span>
          </button>

          <button
            onClick={() => setActiveTab('tablas')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${activeTab === 'tablas'
              ? 'bg-white text-slate-900 shadow-xs border border-slate-200/80'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
              }`}
          >
            <LayersIcon size={15} className={activeTab === 'tablas' ? 'text-[#a08035]' : 'text-slate-400'} />
            <span>Tablas Censales</span>
          </button>
        </div>
      </div>

      {/* 4 KPIs de Alto Nivel Institucional */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Estudiantes 2026"
          value={totalEstudiantes2026}
          subtitle="Educación Regular en Bolivia"
          sourceBadge="SIE 2026"
          sourceColor="amber"
          icon={<SchoolIcon size={22} className="text-[#a08035]" />}
        />
        <StatCard
          title="Nivel Primaria"
          value={nivelPieData.find((n) => n.label.includes('Primaria'))?.value || 0}
          subtitle="Mayor volumen escolar activo"
          sourceBadge="Niveles"
          sourceColor="amber"
          icon={<UsersIcon size={22} className="text-[#a08035]" />}
        />
        <StatCard
          title="Nivel Secundaria"
          value={nivelPieData.find((n) => n.label.includes('Secundaria'))?.value || 0}
          subtitle="Futuros postulantes a ESFM"
          sourceBadge="Bachilleres"
          sourceColor="amber"
          icon={<TrendingUpIcon size={22} className="text-[#a08035]" />}
        />
        <StatCard
          title="Crecimiento 2000-2025"
          value={`+${crecimientoPctTotal}%`}
          subtitle={`+${crecimientoAbsoluto.toLocaleString('es-BO')} alumnos`}
          sourceBadge="26 Años"
          sourceColor="amber"
          icon={<CalendarIcon size={22} className="text-[#a08035]" />}
        />
      </div>

      {/* =========================================================================
          PESTAÑA 1: TENDENCIAS TEMPORALES Y ESTRUCTURA EDUCATIVA
         ========================================================================= */}
      {/* =========================================================================
          PESTAÑA 1: TENDENCIAS TEMPORALES Y ESTRUCTURA EDUCATIVA (ANÁLISIS LINEAL)
         ========================================================================= */}
      {activeTab === 'lineas' && (
        <div className="space-y-6">
          {/* 1. EXPLORADOR TERRITORIAL INTERACTIVO DE MATRÍCULA (2000 - 2025) */}
          <SieTerritorialExplorer data={data.matricula_rural_urbana} />

          {/* 2 y 3. DOS GRÁFICOS LINEALES LADO A LADO EN GRID DE 2 COLUMNAS */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
            {/* Gráfico Lineal A: Volumen de Matrícula por Área */}
            <div className="space-y-2">
              <div className="flex items-center justify-between bg-white px-3.5 py-2 rounded-xl border border-slate-200 shadow-2xs">
                <span className="text-[11px] font-bold text-slate-700">
                  Filtro de Área Territorial:
                </span>
                <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-lg text-xs font-bold">
                  <button
                    onClick={() => setAreaFilter('all')}
                    className={`px-2.5 py-1 rounded-md transition-colors ${areaFilter === 'all'
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                      }`}
                  >
                    Todo
                  </button>
                  <button
                    onClick={() => setAreaFilter('urbana')}
                    className={`px-2.5 py-1 rounded-md transition-colors ${areaFilter === 'urbana'
                      ? 'bg-[#c9a751] text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                      }`}
                  >
                    Urbano
                  </button>
                  <button
                    onClick={() => setAreaFilter('rural')}
                    className={`px-2.5 py-1 rounded-md transition-colors ${areaFilter === 'rural'
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                      }`}
                  >
                    Rural
                  </button>
                </div>
              </div>

              <TrendLineChart
                title="Matrícula Escolar: Área Urbana vs Área Rural (2000 - 2025)"
                subtitle="Registro censal del Ministerio de Educación desagregado por ámbito territorial"
                series={ruralUrbanaLineSeries}
                unit="estudiantes"
                height={320}
                showArea={false}
              />
            </div>

            {/* Gráfico Lineal B: Ritmo de Crecimiento Anual (%) */}
            <div className="space-y-2">
              <div className="flex items-center justify-between bg-white px-3.5 py-2 rounded-xl border border-slate-200 shadow-2xs">
                <span className="text-[11px] font-bold text-slate-700">
                  Métrica: Variación Porcentual Anual
                </span>
                <span className="text-[10px] font-black uppercase tracking-wider bg-[#faf5e8] text-[#7d6325] px-2 py-0.5 rounded border border-[#e5d5a6]">
                  24 Ciclos Interanuales
                </span>
              </div>

              <TrendLineChart
                title="Ritmo de Crecimiento Interanual Anual (%) (2001 - 2025)"
                subtitle="Velocidad y fluctuación porcentual de la matrícula nacional, urbana y rural"
                series={tasaCrecimientoLineSeries}
                unit="%"
                height={320}
                showArea={false}
              />
            </div>
          </div>

          {/* 4. ANÁLISIS DE LA BRECHA TERRITORIAL Y PROGRESIÓN ANUAL */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
            <TrendLineChart
              title="Brecha Histórica de Matrícula (Excedente Urbano vs Rural)"
              subtitle="Diferencia neta en estudiantes entre las capitales y las comunidades rurales (2000 - 2025)"
              series={brechaLineSeries}
              unit="estudiantes"
              height={300}
              showArea={false}
            />

            <YearProgression
              title="Progresión Anual Consolidada de Matrícula (2000 - 2025)"
              subtitle="Evolución total año a año con tasa de variación porcentual interanual"
              data={ruralUrbanaProgression}
              unit="estudiantes"
              color="#c9a751"
            />
          </div>

          {/* Grid de Gráficos de Torta de Estructura Institucional */}
          <div>
            <div className="mb-3">
              <h3 className="text-base font-black text-slate-900 tracking-tight">
                Estructura de la Matrícula Escolar en Bolivia
              </h3>
              <p className="text-xs text-slate-500">
                Distribución porcentual por dependencia institucional, nivel pedagógico y territorio geográfico.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 items-start">
              <div className="min-w-0">
                <PieChart
                  title="Sector Público vs Sector Privado (SIE 2026)"
                  subtitle="Participación real de matrícula por dependencia · Gestión 2026"
                  data={depenPieData}
                  donut={true}
                  unit="estudiantes"
                />
              </div>
              <div className="min-w-0">
                <PieChart
                  title="Distribución por Nivel Escolar (2026)"
                  subtitle="Educación Inicial, Primaria y Secundaria"
                  data={nivelPieData}
                  donut={true}
                  unit="estudiantes"
                />
              </div>
              <div className="min-w-0">
                <PieChart
                  title="Matrícula Rural vs Urbana (2025)"
                  subtitle="Proporción territorial consolidada campo / ciudad"
                  data={ruralUrbanaPieData}
                  donut={true}
                  unit="estudiantes"
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          PESTAÑA 2: COMPARATIVO AÑO A AÑO (MATRIZ INTERANUAL RURAL - URBANA)
         ========================================================================= */}
      {activeTab === 'comparativo_anual' && (
        <div className="space-y-6">
          <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-5 border-b border-slate-100 pb-4">
              <div>
                <h3 className="text-lg font-black text-slate-900 tracking-tight">
                  Matriz Interanual: Cuánto Crece la Matrícula Escolar Año por Año (2000 - 2025)
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Serie histórica censal del SIE con variación absoluta anual (+/- estudiantes), tasa de crecimiento (%) y distribución urbana vs rural.
                </p>
              </div>
              <div className="flex items-center gap-3 text-xs">
                <div className="flex items-center gap-1.5 font-bold text-slate-700">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#c9a751]"></span>
                  <span>Área Urbana</span>
                </div>
                <div className="flex items-center gap-1.5 font-bold text-slate-700">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#059669]"></span>
                  <span>Área Rural</span>
                </div>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase text-[11px]">
                    <th className="py-3 px-3">Gestión</th>
                    <th className="py-3 px-3 text-right">Matrícula Total</th>
                    <th className="py-3 px-3 text-center">Variación Anual</th>
                    <th className="py-3 px-3 text-right">Tasa Crecimiento (%)</th>
                    <th className="py-3 px-3 text-right text-[#7d6325]">Matrícula Urbana</th>
                    <th className="py-3 px-3 text-center text-slate-500">% Urbano</th>
                    <th className="py-3 px-3 text-right text-emerald-800">Matrícula Rural</th>
                    <th className="py-3 px-3 text-center text-slate-500">% Rural</th>
                    <th className="py-3 px-3 text-right text-slate-700">Brecha Urbano - Rural</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {comparativoAnualRuralUrbana.map((row, idx) => (
                    <tr key={row.anio} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-3 font-bold font-mono text-slate-900 text-sm">
                        {row.anio}
                      </td>
                      <td className="py-3 px-3 text-right font-black font-mono text-slate-900 text-sm">
                        {row.total.toLocaleString('es-BO')}
                      </td>
                      <td className="py-3 px-3 text-center">
                        {idx === 0 ? (
                          <span className="text-[10px] text-slate-400 font-medium">Año base censal</span>
                        ) : (
                          <span
                            className={`font-mono font-bold px-2 py-0.5 rounded text-[11px] ${row.diff >= 0
                              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                              : 'bg-rose-50 text-rose-800 border border-rose-200'
                              }`}
                          >
                            {row.diff >= 0 ? `+${row.diff.toLocaleString('es-BO')}` : row.diff.toLocaleString('es-BO')}
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-3 text-right">
                        {idx === 0 ? (
                          <span className="text-slate-400 font-mono">-</span>
                        ) : (
                          <span
                            className={`font-mono font-black text-xs ${row.growthRate >= 0 ? 'text-emerald-700' : 'text-rose-700'
                              }`}
                          >
                            {row.growthRate >= 0 ? `+${row.growthRate}%` : `${row.growthRate}%`}
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-3 text-right font-mono font-bold text-[#7d6325]">
                        {row.urb.toLocaleString('es-BO')}
                      </td>
                      <td className="py-3 px-3 text-center font-mono text-xs font-semibold text-slate-600">
                        {row.pctUrbana}%
                      </td>
                      <td className="py-3 px-3 text-right font-mono font-bold text-emerald-800">
                        {row.rur.toLocaleString('es-BO')}
                      </td>
                      <td className="py-3 px-3 text-center font-mono text-xs font-semibold text-slate-600">
                        {row.pctRural}%
                      </td>
                      <td className="py-3 px-3 text-right font-mono text-xs font-semibold text-slate-700">
                        +{row.brecha.toLocaleString('es-BO')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          PESTAÑA 3: DESGLOSE DEPARTAMENTAL SIE 2026
         ========================================================================= */}
      {activeTab === 'departamentos' && (
        <div className="space-y-6">
          <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs">
            <div className="mb-5 border-b border-slate-100 pb-4">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[10px] font-black uppercase tracking-wider bg-[#faf5e8] text-[#7d6325] border border-[#e5d5a6] px-2 py-0.5 rounded">
                  Gestión 2026
                </span>
                <span className="text-xs font-semibold text-slate-500">
                  9 Departamentos de Bolivia
                </span>
              </div>
              <h3 className="text-lg font-black text-slate-900 tracking-tight">
                Distribución Territorial de Estudiantes por Departamento
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Datos reales consolidados del operativo estadístico SIE 2026 con desagregación de sector público vs privado y ciclos escolares.
              </p>
            </div>

            {/* Grid de Tarjetas Departamentales */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {departamentosSIE.map((dept, index) => (
                <div
                  key={dept.nombre}
                  className="bg-slate-50/70 rounded-xl border border-slate-200 p-4 hover:border-[#c9a751] hover:bg-white transition-all shadow-2xs"
                >
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="w-5 h-5 rounded-full bg-[#faf5e8] text-[#7d6325] border border-[#e5d5a6] flex items-center justify-center font-black text-[11px] font-mono">
                          {index + 1}
                        </span>
                        <h4 className="font-black text-slate-900 text-sm">{dept.nombre}</h4>
                      </div>
                      <span className="text-[11px] text-slate-500 mt-0.5 block">
                        Representa el <strong className="text-slate-800">{dept.pctNacional}%</strong> del total nacional
                      </span>
                    </div>
                    <div className="text-right">
                      <div className="font-black font-mono text-slate-900 text-base">
                        {dept.total.toLocaleString('es-BO')}
                      </div>
                      <span className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">
                        alumnos
                      </span>
                    </div>
                  </div>

                  {/* Barra de progreso de participación nacional */}
                  <div className="w-full bg-slate-200 rounded-full h-1.5 mb-3 overflow-hidden">
                    <div
                      className="bg-[#c9a751] h-1.5 rounded-full"
                      style={{ width: `${Math.min(dept.pctNacional * 3, 100)}%` }}
                    />
                  </div>

                  {/* Comparativo Público vs Privado */}
                  <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-200/80 text-[11px]">
                    <div className="bg-white rounded-lg p-2 border border-slate-200/60">
                      <span className="text-slate-500 block text-[10px] font-semibold">Sector Público</span>
                      <span className="font-bold font-mono text-slate-900">
                        {dept.publico.toLocaleString('es-BO')}
                      </span>
                      <span className="text-[10px] text-[#7d6325] font-black ml-1">
                        ({dept.pctPublico}%)
                      </span>
                    </div>
                    <div className="bg-white rounded-lg p-2 border border-slate-200/60">
                      <span className="text-slate-500 block text-[10px] font-semibold">Sector Privado</span>
                      <span className="font-bold font-mono text-slate-900">
                        {dept.privado.toLocaleString('es-BO')}
                      </span>
                      <span className="text-[10px] text-slate-500 font-black ml-1">
                        ({dept.pctPrivado}%)
                      </span>
                    </div>
                  </div>

                  {/* Desglose Niveles */}
                  <div className="mt-2.5 pt-2 border-t border-slate-200/60 flex items-center justify-between text-[10px] text-slate-600 font-mono">
                    <span>Prim: <strong>{dept.primaria.toLocaleString('es-BO')}</strong></span>
                    <span>Sec: <strong>{dept.secundaria.toLocaleString('es-BO')}</strong></span>
                    <span>Inic: <strong>{dept.inicial.toLocaleString('es-BO')}</strong></span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          PESTAÑA 4: TABLAS DE REGISTROS CENSALES
         ========================================================================= */}
      {activeTab === 'tablas' && (
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
          <div className="flex items-center gap-2 mb-4 border-b border-slate-200 pb-3">
            <button
              onClick={() => setActiveSubTab('sie2026')}
              className={`text-xs font-bold px-3.5 py-1.5 rounded-lg transition-colors ${activeSubTab === 'sie2026'
                ? 'bg-[#c9a751] text-slate-900 shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
            >
              Estudiantes SIE 2026 ({data.sie_total_estudiantes.length} registros)
            </button>
            <button
              onClick={() => setActiveSubTab('rural_urbana')}
              className={`text-xs font-bold px-3.5 py-1.5 rounded-lg transition-colors ${activeSubTab === 'rural_urbana'
                ? 'bg-[#c9a751] text-slate-900 shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
            >
              Matrícula Rural y Urbana 2000-2025 ({data.matricula_rural_urbana.length} registros)
            </button>
          </div>

          {activeSubTab === 'sie2026' && (
            <DataTable
              title="Estadística Censal SIE 2026 por Departamento y Dependencia"
              subtitle="Detalle de cantidades desagregadas por nivel, ciclo y departamento escolar"
              data={data.sie_total_estudiantes}
              columns={sieColumns}
              searchPlaceholder="Buscar por departamento, dependencia o nivel..."
              searchFilter={(row, term) =>
                (row.departamentos?.nombre || '').toLowerCase().includes(term) ||
                (row.dependencia || '').toLowerCase().includes(term) ||
                (row.nivel_texto || '').toLowerCase().includes(term)
              }
            />
          )}

          {activeSubTab === 'rural_urbana' && (
            <DataTable
              title="Serie Histórica Rural vs Urbana (2000 - 2025)"
              subtitle="Evolución de la concentración estudiantil en el campo y la ciudad"
              data={data.matricula_rural_urbana}
              columns={[
                { key: 'anio', header: 'Año', width: 'w-24', align: 'center' },
                {
                  key: 'area',
                  header: 'Área Territorial',
                  render: (r) => (
                    <span
                      className={`px-2.5 py-0.5 rounded text-xs font-semibold ${r.area.toLowerCase().includes('urb')
                        ? 'bg-[#faf5e8] text-[#7d6325] border border-[#e5d5a6]'
                        : 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                        }`}
                    >
                      {r.area}
                    </span>
                  ),
                },
                {
                  key: 'cantidad',
                  header: 'Estudiantes',
                  align: 'right',
                  render: (r) => (
                    <span className="font-bold text-slate-900 font-mono">
                      {r.cantidad.toLocaleString('es-BO')}
                    </span>
                  ),
                },
              ]}
              searchPlaceholder="Buscar por año o área..."
            />
          )}
        </div>
      )}

      {/* Ficha Técnica Institucional SIE */}
      <SourceBadge
        sourceName="SIE · Sistema de Información Educativa"
        institutionTitle="Ministerio de Educación del Estado Plurinacional de Bolivia"
        methodology="Registros censales del operativo estadístico de inicio de gestión escolar reportados directamente por las Direcciones Departamentales de Educación (DDE) y Direcciones Distritales en coordinación con la Dirección General de Planificación."
        links={[
          {
            title: 'Portal Oficial Ministerio de Educación',
            url: 'https://www.minedu.gob.bo/',
            institution: 'Ministerio de Educación',
            period: '2000-2026',
          },
        ]}
      />
    </div>
  );
}
