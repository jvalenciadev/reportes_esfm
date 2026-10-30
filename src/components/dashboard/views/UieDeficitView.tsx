'use client';

import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { DashboardDataset } from '@/types/stats';
import summaryDataRaw from '@/data/uieDeficitSummary.json';
import { StatCard } from '../StatCard';
import { TrendLineChart, TrendSeries } from '../TrendLineChart';
import { PieChart, PieSlice } from '../PieChart';
import { YearProgression } from '../YearProgression';
import { DataTable, ColumnDef } from '../DataTable';
import { SourceBadge } from '../SourceBadge';
import {
  ScaleIcon,
  TrendingUpIcon,
  UsersIcon,
  CalendarIcon,
  MapPinIcon,
  ChartBarIcon,
  SearchIcon,
  XIcon,
  LayersIcon,
  GridIcon,
  SchoolIcon,
  AlertTriangleIcon,
} from '../../ui/Icons';

interface UieDeficitViewProps {
  data: DashboardDataset;
}

export function UieDeficitView({ data }: UieDeficitViewProps) {
  const summary = summaryDataRaw;

  const [activeTab, setActiveTab] = useState<'cargos' | 'pronostico' | 'departamentos' | 'matriz_anual' | 'registros_api'>('cargos');

  // Filtros Pestaña Cargos
  const [cargoMode, setCargoMode] = useState<'grupos' | 'individual'>('grupos');
  const [selectedGestionCargo, setSelectedGestionCargo] = useState<string>('all');
  const [selectedGrupoFilter, setSelectedGrupoFilter] = useState<string>('all');
  const [searchCargoTerm, setSearchCargoTerm] = useState<string>('');

  // Filtros Pestaña Departamental
  const [selectedDeptId, setSelectedDeptId] = useState<number | 'all'>('all');
  const [selectedGestionDept, setSelectedGestionDept] = useState<string>('2025');

  // Estado Pestaña Explorador API Supabase (17.274 registros vivos)
  const [apiGestion, setApiGestion] = useState<string>('2025');
  const [apiDept, setApiDept] = useState<string>('all');
  const [apiSearch, setApiSearch] = useState<string>('');
  const [apiRecords, setApiRecords] = useState<any[]>([]);
  const [apiTotal, setApiTotal] = useState<number>(0);
  const [apiLoading, setApiLoading] = useState<boolean>(false);
  const [apiPage, setApiPage] = useState<number>(0);
  const limitPerPage = 50;

  // Carga reactiva de API Supabase cuando se activa la pestaña de registros
  const fetchLiveRecords = useCallback(async () => {
    setApiLoading(true);
    try {
      const params = new URLSearchParams({
        gestion: apiGestion,
        departamento_id: apiDept,
        search: apiSearch,
        limit: String(limitPerPage),
        offset: String(apiPage * limitPerPage),
      });
      const res = await fetch(`/api/uie-deficit?${params.toString()}`);
      if (res.ok) {
        const json = await res.json();
        setApiRecords(json.data || []);
        setApiTotal(json.total || 0);
      }
    } catch {
      // ignore
    } finally {
      setApiLoading(false);
    }
  }, [apiGestion, apiDept, apiSearch, apiPage]);

  useEffect(() => {
    if (activeTab === 'registros_api') {
      fetchLiveRecords();
    }
  }, [activeTab, fetchLiveRecords]);

  // =========================================================================
  // 1. CÁLCULO DE KPIS GLOBALES (GESTIÓN 2025 Y HISTÓRICO)
  // =========================================================================
  const kpiStats = useMemo(() => {
    const hist2025 = summary.historico_nacional.find((h) => h.gestion === 2025);
    const hist2021 = summary.historico_nacional.find((h) => h.gestion === 2021);

    const deficit2025 = hist2025?.deficit_horas || 939597;
    const trabajadas2025 = hist2025?.horas_trabajadas || 16009284;
    const planilla2025 = hist2025?.horas_planilla || 15069687;
    const deficitPct2025 = hist2025?.deficit_pct || 5.87;
    const items2025 = hist2025?.items_equiv_88h || 10677;

    const deficitTotalHistorico = summary.historico_nacional.reduce((acc, h) => acc + h.deficit_horas, 0);
    const itemsTotalHistorico = summary.historico_nacional.reduce((acc, h) => acc + h.items_equiv_88h, 0);

    const pron2026 = summary.pronostico_nacional.find((p) => p.gestion === 2026);
    const deficitPron2026 = pron2026?.deficit_horas || 935414;
    const itemsPron2026 = pron2026?.items_equiv_88h || 10630;

    return {
      deficit2025,
      trabajadas2025,
      planilla2025,
      deficitPct2025,
      items2025,
      deficitTotalHistorico,
      itemsTotalHistorico,
      deficitPron2026,
      itemsPron2026,
    };
  }, [summary]);

  // =========================================================================
  // 2. DATOS DE GRUPOS DE CARGO (FAMILIAS) CON FILTRO DE GESTIÓN
  // =========================================================================
  const dataGruposCargo = useMemo(() => {
    return summary.por_grupo_cargo.map((g) => {
      let def = g.deficit_total;
      let trab = g.trabajadas_total;
      let plan = g.planilla_total;

      if (selectedGestionCargo !== 'all') {
        const detG = (g.por_gestion as Record<string, { deficit: number; trabajadas: number; planilla: number; items_equiv_88h: number }>)[selectedGestionCargo];
        if (detG) {
          def = detG.deficit;
          trab = detG.trabajadas;
          plan = detG.planilla;
        } else {
          def = 0;
          trab = 0;
          plan = 0;
        }
      }

      const pct = trab > 0 ? Number(((def / trab) * 100).toFixed(2)) : 0;
      const items = Math.round(def / 88);

      return {
        grupo: g.grupo,
        deficit: def,
        trabajadas: trab,
        planilla: plan,
        deficit_pct: pct,
        items_equiv_88h: items,
      };
    }).sort((a, b) => b.deficit - a.deficit);
  }, [summary.por_grupo_cargo, selectedGestionCargo]);

  // Slices de Torta para Grupos de Cargo
  const pieGruposCargo: PieSlice[] = useMemo(() => {
    const palette = ['#e11d48', '#c9a751', '#2563eb', '#059669', '#d97706', '#7c3aed', '#0891b2', '#4b5563', '#ea580c', '#8b5cf6', '#10b981', '#64748b'];
    return dataGruposCargo.slice(0, 8).map((item, idx) => ({
      label: item.grupo,
      value: item.deficit,
      color: palette[idx % palette.length],
      sublabel: `${item.deficit_pct}% brecha (${item.items_equiv_88h.toLocaleString('es-BO')} ítems)`,
    }));
  }, [dataGruposCargo]);

  // =========================================================================
  // 3. DATOS DE CARGOS ESPECÍFICOS INDIVIDUALES (TOP 150)
  // =========================================================================
  const dataCargosIndividuales = useMemo(() => {
    let list = summary.top_cargos;

    if (selectedGrupoFilter !== 'all') {
      list = list.filter((c) => c.grupo === selectedGrupoFilter);
    }

    if (searchCargoTerm) {
      const q = searchCargoTerm.toLowerCase();
      list = list.filter((c) => c.cargo.toLowerCase().includes(q) || c.grupo.toLowerCase().includes(q));
    }

    return list.map((c) => {
      let def = c.deficit_total;
      let trab = c.trabajadas_total;
      let plan = c.planilla_total;

      if (selectedGestionCargo !== 'all') {
        const valG = (c.por_gestion_deficit as Record<string, number>)[selectedGestionCargo];
        def = valG !== undefined ? valG : 0;
      }

      const pct = trab > 0 ? Number(((def / trab) * 100).toFixed(1)) : 0;
      const items = Math.round(def / 88);

      return {
        cargo: c.cargo,
        grupo: c.grupo,
        deficit: def,
        trabajadas: trab,
        planilla: plan,
        deficit_pct: pct,
        items_equiv_88h: items,
      };
    }).sort((a, b) => b.deficit - a.deficit);
  }, [summary.top_cargos, selectedGrupoFilter, searchCargoTerm, selectedGestionCargo]);

  // =========================================================================
  // 4. PRONÓSTICO TEMPORAL CONTINUO (2021 - 2035)
  // =========================================================================
  const timelineCompleta = useMemo(() => {
    const hist = summary.historico_nacional.map((h) => ({
      year: h.gestion,
      trabajadas: h.horas_trabajadas,
      planilla: h.horas_planilla,
      deficit: h.deficit_horas,
      items: h.items_equiv_88h,
      pct: h.deficit_pct,
      esPronostico: false,
    }));

    const pron = summary.pronostico_nacional.map((p) => ({
      year: p.gestion,
      trabajadas: p.horas_trabajadas,
      planilla: p.horas_planilla,
      deficit: p.deficit_horas,
      items: p.items_equiv_88h,
      pct: p.deficit_pct,
      esPronostico: true,
    }));

    return [...hist, ...pron];
  }, [summary.historico_nacional, summary.pronostico_nacional]);

  const seriesPronosticoDeficit: TrendSeries[] = useMemo(() => {
    return [
      {
        id: 'deficit_horas',
        name: 'Déficit de Horas (Horas Faltantes)',
        color: '#e11d48',
        data: timelineCompleta.map((t) => ({ year: t.year, value: t.deficit })),
      },
      {
        id: 'horas_trabajadas',
        name: 'Carga Horaria Trabajada (Demanda Total)',
        color: '#1e293b',
        data: timelineCompleta.map((t) => ({ year: t.year, value: t.trabajadas })),
      },
      {
        id: 'horas_planilla',
        name: 'Horas Pagadas en Planilla (Presupuesto)',
        color: '#2563eb',
        data: timelineCompleta.map((t) => ({ year: t.year, value: t.planilla })),
      },
    ];
  }, [timelineCompleta]);

  const progressionDataDeficit = useMemo(() => {
    return timelineCompleta.map((t) => ({
      year: t.year,
      value: t.deficit,
    }));
  }, [timelineCompleta]);

  // =========================================================================
  // 5. DATOS DEPARTAMENTALES
  // =========================================================================
  const dataDepartamentos = useMemo(() => {
    return summary.por_departamento.map((d) => {
      let def = d.deficit_total;
      let trab = d.trabajadas_total;
      let plan = d.planilla_total;

      if (selectedGestionDept !== 'all') {
        const det = (d.por_gestion as Record<string, { deficit: number; trabajadas: number; planilla: number; items_equiv_88h: number }>)[selectedGestionDept];
        if (det) {
          def = det.deficit;
          trab = det.trabajadas;
          plan = det.planilla;
        }
      }

      const pct = trab > 0 ? Number(((def / trab) * 100).toFixed(2)) : 0;
      const items = Math.round(def / 88);

      return {
        id: d.departamento_id,
        departamento: d.departamento,
        deficit: def,
        trabajadas: trab,
        planilla: plan,
        deficit_pct: pct,
        items_equiv_88h: items,
      };
    }).sort((a, b) => b.deficit - a.deficit);
  }, [summary.por_departamento, selectedGestionDept]);

  // Series comparativa departamental
  const seriesDeptDeficit: TrendSeries[] = useMemo(() => {
    return [
      {
        id: 'deficit',
        name: 'Déficit de Horas',
        color: '#e11d48',
        data: dataDepartamentos.map((d, i) => ({ year: i + 1, value: d.deficit })),
      },
      {
        id: 'items',
        name: 'Ítems Requeridos (×100 para escala)',
        color: '#c9a751',
        data: dataDepartamentos.map((d, i) => ({ year: i + 1, value: d.items_equiv_88h * 100 })),
      },
    ];
  }, [dataDepartamentos]);

  return (
    <div className="space-y-6">
      {/* Header Institucional UIE */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-xs">
        <div>
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <span className="text-[10px] font-semibold uppercase tracking-wider bg-rose-50 text-rose-700 border border-rose-200 px-2.5 py-0.5 rounded-md">
              UIE · Balance y Auditoría de Carga Horaria SEP
            </span>
            <span className="text-[10px] font-medium text-slate-500">
              17.274 Registros Consolidados (2021 - 2025) + Pronóstico 2026 - 2035
            </span>
          </div>
          <h1 className="text-2xl font-semibold text-slate-900 tracking-tight">
            Déficit Docente por Cargo y Pronóstico de Necesidades ESFM
          </h1>
          <p className="text-xs text-slate-500 mt-1 max-w-3xl">
            Análisis de la brecha entre la carga horaria trabajada en aula y las horas pagadas por planilla fiscal. Permite agrupar los 807 cargos por familias pedagógicas y proyectar la demanda de nuevos maestros a ser admitidos en las ESFM.
          </p>
        </div>
      </div>

      {/* Pestañas de Navegación del Módulo UIE */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 border-b border-slate-200">
        <button
          onClick={() => setActiveTab('cargos')}
          className={`flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap ${
            activeTab === 'cargos'
              ? 'bg-[#c9a751] text-slate-900 shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <GridIcon size={16} />
          Déficit por Cargo y Grupos
        </button>
        <button
          onClick={() => setActiveTab('pronostico')}
          className={`flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap ${
            activeTab === 'pronostico'
              ? 'bg-[#c9a751] text-slate-900 shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <TrendingUpIcon size={16} />
          Pronóstico por Gestión (2026 - 2035)
        </button>
        <button
          onClick={() => setActiveTab('departamentos')}
          className={`flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap ${
            activeTab === 'departamentos'
              ? 'bg-[#c9a751] text-slate-900 shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <MapPinIcon size={16} />
          Distribución Departamental
        </button>
        <button
          onClick={() => setActiveTab('matriz_anual')}
          className={`flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap ${
            activeTab === 'matriz_anual'
              ? 'bg-[#c9a751] text-slate-900 shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <CalendarIcon size={16} />
          Matriz Histórica (2021 - 2025)
        </button>
        <button
          onClick={() => setActiveTab('registros_api')}
          className={`flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap ${
            activeTab === 'registros_api'
              ? 'bg-[#c9a751] text-slate-900 shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <ChartBarIcon size={16} />
          Base de Datos Supabase (17.274 Filas)
        </button>
      </div>

      {/* 4 KPIs Clave */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Déficit Horas Gestión 2025"
          value={kpiStats.deficit2025}
          subtitle={`Brecha de ${kpiStats.deficitPct2025}% de las horas trabajadas`}
          sourceBadge="UIE 2025"
          sourceColor="purple"
          icon={<ScaleIcon size={22} className="text-rose-600" />}
        />
        <StatCard
          title="Ítems Requeridos (2025)"
          value={kpiStats.items2025}
          subtitle="Equivalente a 88 hrs/mes por maestro"
          sourceBadge="Demanda ESFM"
          sourceColor="purple"
          icon={<UsersIcon size={22} className="text-[#a08035]" />}
        />
        <StatCard
          title="Carga Trabajada en Aula (2025)"
          value={kpiStats.trabajadas2025}
          subtitle={`Planilla fiscal cubre: ${kpiStats.planilla2025.toLocaleString('es-BO')} hrs`}
          sourceBadge="Horas Aula"
          sourceColor="purple"
          icon={<SchoolIcon size={22} className="text-blue-600" />}
        />
        <StatCard
          title="Pronóstico Déficit Gestión 2026"
          value={kpiStats.deficitPron2026}
          subtitle={`Demanda estimada: ~${kpiStats.itemsPron2026.toLocaleString('es-BO')} nuevos ítems`}
          sourceBadge="Forecast 2026"
          sourceColor="purple"
          icon={<TrendingUpIcon size={22} className="text-emerald-600" />}
        />
      </div>

      {/* =========================================================================
          PESTAÑA 1: DÉFICIT POR CARGO Y AGRUPACIÓN
         ========================================================================= */}
      {activeTab === 'cargos' && (
        <div className="space-y-6">
          {/* Panel de Control y Filtros */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div>
                <h2 className="text-base font-semibold text-slate-900 tracking-tight">
                  Balance de Déficit por Cargos y Familias Pedagógicas
                </h2>
                <p className="text-xs text-slate-500">
                  Agrupa los 807 cargos específicos en 12 familias de formación docente o examina cada cargo individualmente.
                </p>
              </div>

              {/* Selector Modo: Grupos vs Individual */}
              <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl self-start md:self-auto">
                <button
                  onClick={() => setCargoMode('grupos')}
                  className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-all flex items-center gap-1.5 ${
                    cargoMode === 'grupos'
                      ? 'bg-[#c9a751] text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <LayersIcon size={14} />
                  <span>Agrupación por Familias</span>
                </button>
                <button
                  onClick={() => setCargoMode('individual')}
                  className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-all flex items-center gap-1.5 ${
                    cargoMode === 'individual'
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <GridIcon size={14} />
                  <span>Cargos Específicos</span>
                </button>
              </div>
            </div>

            {/* Controles de Filtros */}
            <div className="pt-3 border-t border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-3 flex-wrap">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-medium text-slate-600">Gestión:</span>
                <div className="flex items-center gap-1">
                  {['all', '2025', '2024', '2023', '2022', '2021'].map((g) => (
                    <button
                      key={g}
                      onClick={() => setSelectedGestionCargo(g)}
                      className={`text-xs px-2.5 py-1 rounded-lg border transition-all ${
                        selectedGestionCargo === g
                          ? 'bg-slate-900 text-white border-slate-900 shadow-xs font-medium'
                          : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      {g === 'all' ? 'Total (2021-2025)' : g}
                    </button>
                  ))}
                </div>
              </div>

              {cargoMode === 'individual' && (
                <div className="flex items-center gap-2 flex-wrap">
                  <div className="relative w-full sm:w-64">
                    <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none text-slate-400">
                      <SearchIcon size={14} />
                    </div>
                    <input
                      type="text"
                      value={searchCargoTerm}
                      onChange={(e) => setSearchCargoTerm(e.target.value)}
                      placeholder="Buscar cargo (ej: Matemáticas, BTH)..."
                      className="w-full text-xs pl-8 pr-7 py-1.5 rounded-lg border border-slate-200 focus:outline-hidden focus:ring-1 focus:ring-[#c9a751] focus:border-[#c9a751] bg-slate-50/50"
                    />
                    {searchCargoTerm && (
                      <button
                        onClick={() => setSearchCargoTerm('')}
                        className="absolute inset-y-0 right-0 pr-2 flex items-center text-slate-400 hover:text-slate-600"
                      >
                        <XIcon size={13} />
                      </button>
                    )}
                  </div>

                  <select
                    value={selectedGrupoFilter}
                    onChange={(e) => setSelectedGrupoFilter(e.target.value)}
                    className="text-xs font-medium bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-hidden focus:ring-1 focus:ring-[#c9a751] text-slate-900 cursor-pointer"
                  >
                    <option value="all">Todas las Familias</option>
                    {summary.por_grupo_cargo.map((g) => (
                      <option key={g.grupo} value={g.grupo}>
                        {g.grupo}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          </div>

          {/* VISTA 1: AGRUPACIÓN POR FAMILIAS */}
          {cargoMode === 'grupos' ? (
            <div className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
                <PieChart
                  title="Distribución del Déficit por Familias de Formación"
                  subtitle={`Participación porcentual de cada rama en las horas faltantes (${selectedGestionCargo === 'all' ? 'Total 2021-2025' : `Gestión ${selectedGestionCargo}`})`}
                  data={pieGruposCargo}
                  donut={true}
                  unit="horas"
                />

                {/* Resumen de las 4 familias más críticas */}
                <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-3.5">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                    <h3 className="text-sm font-semibold text-slate-900">
                      Familias con Mayor Déficit Horario
                    </h3>
                    <span className="text-[10px] font-semibold text-rose-700 bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
                      Prioridad Formación ESFM
                    </span>
                  </div>
                  <div className="space-y-3">
                    {dataGruposCargo.slice(0, 5).map((item, idx) => (
                      <div key={item.grupo} className="p-3 rounded-lg border border-slate-200 bg-slate-50/70">
                        <div className="flex items-center justify-between text-xs mb-1">
                          <span className="font-semibold text-slate-900 truncate">
                            {idx + 1}. {item.grupo}
                          </span>
                          <span className="font-bold text-rose-600">
                            {item.deficit.toLocaleString('es-BO')} hrs
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-[11px] text-slate-500">
                          <span>Ítems equivalentes: <strong>{item.items_equiv_88h.toLocaleString('es-BO')}</strong> maestros</span>
                          <span>Brecha: {item.deficit_pct}%</span>
                        </div>
                        <div className="w-full bg-slate-200 h-1.5 rounded-full mt-2 overflow-hidden">
                          <div
                            className="bg-rose-500 h-full rounded-full"
                            style={{ width: `${Math.min(100, Math.max(5, (item.deficit / dataGruposCargo[0].deficit) * 100))}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Tabla Consolidada de Grupos de Cargo */}
              <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-2xs">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-medium uppercase text-[11px]">
                      <th className="py-3 px-3">Familia Pedagógica / Especialidad</th>
                      <th className="py-3 px-3 text-right">Horas Trabajadas</th>
                      <th className="py-3 px-3 text-right">Horas Planilla</th>
                      <th className="py-3 px-3 text-right text-rose-700">Déficit de Horas</th>
                      <th className="py-3 px-3 text-center">% Déficit</th>
                      <th className="py-3 px-3 text-right text-[#c9a751]">Ítems Equivalentes (88h)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {dataGruposCargo.map((item) => (
                      <tr key={item.grupo} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3 px-3 font-semibold text-slate-900 flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-rose-500" />
                          <span>{item.grupo}</span>
                        </td>
                        <td className="py-3 px-3 text-right font-medium text-slate-800">
                          {item.trabajadas.toLocaleString('es-BO')}
                        </td>
                        <td className="py-3 px-3 text-right font-medium text-slate-800">
                          {item.planilla.toLocaleString('es-BO')}
                        </td>
                        <td className="py-3 px-3 text-right font-bold text-rose-600">
                          {item.deficit.toLocaleString('es-BO')}
                        </td>
                        <td className="py-3 px-3 text-center">
                          <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-rose-50 text-rose-700 border border-rose-200">
                            {item.deficit_pct}%
                          </span>
                        </td>
                        <td className="py-3 px-3 text-right font-bold text-slate-900">
                          <span className="bg-[#faf5e8] text-[#c9a751] border border-[#e5d5a6] px-2 py-0.5 rounded">
                            {item.items_equiv_88h.toLocaleString('es-BO')} ítems
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            /* VISTA 2: CARGOS ESPECÍFICOS INDIVIDUALES */
            <div className="space-y-4">
              <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-2xs">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-medium uppercase text-[11px]">
                      <th className="py-3 px-3">Cargo Docente / Administrativo</th>
                      <th className="py-3 px-3 text-left">Familia Asignada</th>
                      <th className="py-3 px-3 text-right">Horas Trabajadas</th>
                      <th className="py-3 px-3 text-right">Horas Planilla</th>
                      <th className="py-3 px-3 text-right text-rose-700">Déficit de Horas</th>
                      <th className="py-3 px-3 text-center">% Brecha</th>
                      <th className="py-3 px-3 text-right text-[#c9a751]">Ítems Estimados (88h)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {dataCargosIndividuales.slice(0, 100).map((c, idx) => (
                      <tr key={`${c.cargo}-${idx}`} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-2.5 px-3 font-semibold text-slate-900">
                          {c.cargo}
                        </td>
                        <td className="py-2.5 px-3 text-slate-600">
                          <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200 text-[10px]">
                            {c.grupo}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-right font-medium text-slate-800">
                          {c.trabajadas.toLocaleString('es-BO')}
                        </td>
                        <td className="py-2.5 px-3 text-right font-medium text-slate-800">
                          {c.planilla.toLocaleString('es-BO')}
                        </td>
                        <td className="py-2.5 px-3 text-right font-bold text-rose-600">
                          {c.deficit.toLocaleString('es-BO')}
                        </td>
                        <td className="py-2.5 px-3 text-center font-medium">
                          <span className="text-[11px] text-slate-700">
                            {c.deficit_pct}%
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-right font-bold text-slate-900">
                          <span className="bg-[#faf5e8] text-[#c9a751] border border-[#e5d5a6] px-1.5 py-0.5 rounded text-[11px]">
                            {c.items_equiv_88h.toLocaleString('es-BO')}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="flex items-center justify-between text-xs text-slate-500 px-1">
                <span>Mostrando los 100 cargos con mayor déficit de {dataCargosIndividuales.length} filtrados</span>
                <span>Fuente: Registros UIE Ministerio de Educación</span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* =========================================================================
          PESTAÑA 2: PRONÓSTICO POR GESTIÓN (2026 - 2035)
         ========================================================================= */}
      {activeTab === 'pronostico' && (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
              <TrendingUpIcon size={20} className="text-[#c9a751]" />
              <div>
                <h2 className="text-base font-semibold text-slate-900 tracking-tight">
                  Modelo de Pronóstico de Déficit Docente (2026 - 2035)
                </h2>
                <p className="text-xs text-slate-500">
                  Proyección basada en la serie de tiempo 2022-2025 para dimensionar la cantidad de nuevos docentes que las ESFM deberán titular anualmente.
                </p>
              </div>
            </div>

            {/* Gráfico Continuo de Tendencia y Pronóstico */}
            <TrendLineChart
              title="Evolución y Pronóstico de Horas: Demanda Trabajada vs Planilla Fiscal (2021 - 2035)"
              subtitle="Línea roja representa el déficit de horas no cubiertas que requiere asignación presupuestaria o nuevos egresados ESFM"
              series={seriesPronosticoDeficit}
              unit="horas"
              height={380}
              showArea={false}
            />
          </div>

          {/* YearProgression Visual del Pronóstico de Déficit */}
          <YearProgression
            title="Trayectoria Proyectada del Déficit de Horas Docentes (2021 - 2035)"
            subtitle="Planificación de mediano y largo plazo para cupos de admisión en las Escuelas Superiores de Formación de Maestros"
            data={progressionDataDeficit}
            unit="horas deficit"
            color="#e11d48"
          />

          {/* Matriz Detallada de Pronóstico */}
          <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-2xs">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-medium uppercase text-[11px]">
                  <th className="py-3 px-3">Gestión</th>
                  <th className="py-3 px-3 text-center">Tipo de Dato</th>
                  <th className="py-3 px-3 text-right">Carga Horaria Trabajada</th>
                  <th className="py-3 px-3 text-right">Horas Pagadas en Planilla</th>
                  <th className="py-3 px-3 text-right text-rose-700">Déficit Horas</th>
                  <th className="py-3 px-3 text-center">% Déficit</th>
                  <th className="py-3 px-3 text-right text-[#c9a751]">Nuevos Ítems Necesarios (88h)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {timelineCompleta.map((row) => (
                  <tr
                    key={row.year}
                    className={`transition-colors ${
                      row.esPronostico ? 'bg-amber-50/20 hover:bg-amber-50/40' : 'hover:bg-slate-50'
                    }`}
                  >
                    <td className="py-3 px-3 font-semibold text-slate-900">{row.year}</td>
                    <td className="py-3 px-3 text-center">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                          row.esPronostico
                            ? 'bg-[#faf5e8] text-[#c9a751] border border-[#e5d5a6]'
                            : 'bg-slate-100 text-slate-700 border border-slate-200'
                        }`}
                      >
                        {row.esPronostico ? 'Pronóstico' : 'Histórico Real'}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-right font-medium text-slate-800">
                      {row.trabajadas.toLocaleString('es-BO')}
                    </td>
                    <td className="py-3 px-3 text-right font-medium text-slate-800">
                      {row.planilla.toLocaleString('es-BO')}
                    </td>
                    <td className="py-3 px-3 text-right font-bold text-rose-600">
                      {row.deficit.toLocaleString('es-BO')}
                    </td>
                    <td className="py-3 px-3 text-center font-medium">
                      {row.pct}%
                    </td>
                    <td className="py-3 px-3 text-right font-bold text-slate-900">
                      <span className="bg-[#faf5e8] text-[#c9a751] border border-[#e5d5a6] px-2 py-0.5 rounded">
                        {row.items.toLocaleString('es-BO')} ítems
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* =========================================================================
          PESTAÑA 3: DISTRIBUCIÓN DEPARTAMENTAL
         ========================================================================= */}
      {activeTab === 'departamentos' && (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div>
                <h2 className="text-base font-semibold text-slate-900 tracking-tight">
                  Déficit Docente por Departamento
                </h2>
                <p className="text-xs text-slate-500">
                  Brecha territorial de horas no cubiertas en los 9 departamentos de Bolivia.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-slate-600">Gestión:</span>
                <select
                  value={selectedGestionDept}
                  onChange={(e) => setSelectedGestionDept(e.target.value)}
                  className="text-xs font-semibold bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 focus:outline-hidden focus:ring-1 focus:ring-[#c9a751] text-slate-900 cursor-pointer"
                >
                  <option value="all">Total Acumulado (2021-2025)</option>
                  <option value="2025">Gestión 2025</option>
                  <option value="2024">Gestión 2024</option>
                  <option value="2023">Gestión 2023</option>
                  <option value="2022">Gestión 2022</option>
                  <option value="2021">Gestión 2021</option>
                </select>
              </div>
            </div>

            {/* Gráfico Comparativo Departamental */}
            <TrendLineChart
              title={`Comparativa de Déficit de Horas por Departamento (${selectedGestionDept === 'all' ? '2021-2025' : selectedGestionDept})`}
              subtitle="Volumen absoluto de horas faltantes en cada departamento"
              series={seriesDeptDeficit}
              xLabelFormatter={(idx) => dataDepartamentos[idx - 1]?.departamento || ''}
              unit="horas"
              height={360}
              showArea={false}
            />

            {/* Tabla Departamental */}
            <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-medium uppercase text-[11px]">
                    <th className="py-3 px-3">Departamento</th>
                    <th className="py-3 px-3 text-right">Horas Trabajadas</th>
                    <th className="py-3 px-3 text-right">Horas Pagadas</th>
                    <th className="py-3 px-3 text-right text-rose-700">Déficit Horas</th>
                    <th className="py-3 px-3 text-center">% Déficit</th>
                    <th className="py-3 px-3 text-right text-[#c9a751]">Ítems Equivalentes (88h)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {dataDepartamentos.map((d) => (
                    <tr key={d.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-3 font-semibold text-slate-900">{d.departamento}</td>
                      <td className="py-3 px-3 text-right font-medium text-slate-800">
                        {d.trabajadas.toLocaleString('es-BO')}
                      </td>
                      <td className="py-3 px-3 text-right font-medium text-slate-800">
                        {d.planilla.toLocaleString('es-BO')}
                      </td>
                      <td className="py-3 px-3 text-right font-bold text-rose-600">
                        {d.deficit.toLocaleString('es-BO')}
                      </td>
                      <td className="py-3 px-3 text-center font-medium">
                        <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-rose-50 text-rose-700 border border-rose-200">
                          {d.deficit_pct}%
                        </span>
                      </td>
                      <td className="py-3 px-3 text-right font-bold text-slate-900">
                        <span className="bg-[#faf5e8] text-[#c9a751] border border-[#e5d5a6] px-2 py-0.5 rounded">
                          {d.items_equiv_88h.toLocaleString('es-BO')} ítems
                        </span>
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
          PESTAÑA 4: MATRIZ HISTÓRICA (2021 - 2025)
         ========================================================================= */}
      {activeTab === 'matriz_anual' && (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
              <CalendarIcon size={20} className="text-[#c9a751]" />
              <div>
                <h2 className="text-base font-semibold text-slate-900 tracking-tight">
                  Matriz Histórica Consolidada (Gestiones 2021 - 2025)
                </h2>
                <p className="text-xs text-slate-500">
                  Auditoría completa de 5 gestiones escolares con variaciones y totales oficiales.
                </p>
              </div>
            </div>

            <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-medium uppercase text-[11px]">
                    <th className="py-3 px-3">Gestión</th>
                    <th className="py-3 px-3 text-right">Filas Registradas</th>
                    <th className="py-3 px-3 text-right">Horas Trabajadas</th>
                    <th className="py-3 px-3 text-right">Horas Planilla</th>
                    <th className="py-3 px-3 text-right text-rose-700">Déficit de Horas</th>
                    <th className="py-3 px-3 text-center">% Brecha Horaria</th>
                    <th className="py-3 px-3 text-right text-[#c9a751]">Ítems Requeridos (88h)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {summary.historico_nacional.map((h) => (
                    <tr key={h.gestion} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-3 font-semibold text-slate-900">{h.gestion}</td>
                      <td className="py-3 px-3 text-right text-slate-500">
                        {h.registros_count.toLocaleString('es-BO')} registros
                      </td>
                      <td className="py-3 px-3 text-right font-medium text-slate-800">
                        {h.horas_trabajadas.toLocaleString('es-BO')}
                      </td>
                      <td className="py-3 px-3 text-right font-medium text-slate-800">
                        {h.horas_planilla.toLocaleString('es-BO')}
                      </td>
                      <td className="py-3 px-3 text-right font-bold text-rose-600">
                        {h.deficit_horas.toLocaleString('es-BO')}
                      </td>
                      <td className="py-3 px-3 text-center">
                        <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-rose-50 text-rose-700 border border-rose-200">
                          {h.deficit_pct}%
                        </span>
                      </td>
                      <td className="py-3 px-3 text-right font-bold text-slate-900">
                        <span className="bg-[#faf5e8] text-[#c9a751] border border-[#e5d5a6] px-2 py-0.5 rounded">
                          {h.items_equiv_88h.toLocaleString('es-BO')} ítems
                        </span>
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
          PESTAÑA 5: EXPLORADOR EN VIVO (17.274 FILAS SUPABASE)
         ========================================================================= */}
      {activeTab === 'registros_api' && (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div>
                <h2 className="text-base font-semibold text-slate-900 tracking-tight">
                  Explorador de Registros Vivos en Supabase
                </h2>
                <p className="text-xs text-slate-500">
                  Consulta directa a la tabla <code className="text-[#c9a751] bg-[#faf5e8] px-1 rounded">public.uie_deficit_horas</code> (17.274 registros).
                </p>
              </div>

              <div className="flex items-center gap-2 text-xs">
                <span className="text-slate-500">Coincidencias:</span>
                <strong className="text-slate-900">{apiTotal.toLocaleString('es-BO')}</strong>
              </div>
            </div>

            {/* Controles de Filtros API */}
            <div className="pt-3 border-t border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-3 flex-wrap">
              <div className="flex items-center gap-2 flex-wrap">
                <select
                  value={apiGestion}
                  onChange={(e) => {
                    setApiGestion(e.target.value);
                    setApiPage(0);
                  }}
                  className="text-xs font-medium bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-hidden text-slate-900"
                >
                  <option value="all">Todas las Gestiones</option>
                  <option value="2025">Gestión 2025</option>
                  <option value="2024">Gestión 2024</option>
                  <option value="2023">Gestión 2023</option>
                  <option value="2022">Gestión 2022</option>
                  <option value="2021">Gestión 2021</option>
                </select>

                <select
                  value={apiDept}
                  onChange={(e) => {
                    setApiDept(e.target.value);
                    setApiPage(0);
                  }}
                  className="text-xs font-medium bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-hidden text-slate-900"
                >
                  <option value="all">Todos los Departamentos</option>
                  {summary.por_departamento.map((d) => (
                    <option key={d.departamento_id} value={d.departamento_id}>
                      {d.departamento}
                    </option>
                  ))}
                </select>

                <div className="relative w-full sm:w-64">
                  <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none text-slate-400">
                    <SearchIcon size={14} />
                  </div>
                  <input
                    type="text"
                    value={apiSearch}
                    onChange={(e) => {
                      setApiSearch(e.target.value);
                      setApiPage(0);
                    }}
                    placeholder="Filtrar por cargo..."
                    className="w-full text-xs pl-8 pr-7 py-1.5 rounded-lg border border-slate-200 focus:outline-hidden text-slate-900 bg-slate-50/50"
                  />
                  {apiSearch && (
                    <button
                      onClick={() => {
                        setApiSearch('');
                        setApiPage(0);
                      }}
                      className="absolute inset-y-0 right-0 pr-2 flex items-center text-slate-400"
                    >
                      <XIcon size={13} />
                    </button>
                  )}
                </div>
              </div>

              {/* Paginación */}
              <div className="flex items-center gap-2 text-xs">
                <button
                  disabled={apiPage === 0 || apiLoading}
                  onClick={() => setApiPage((p) => Math.max(0, p - 1))}
                  className="px-2.5 py-1 rounded border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40"
                >
                  Anterior
                </button>
                <span className="text-slate-600">
                  Página {apiPage + 1} de {Math.max(1, Math.ceil(apiTotal / limitPerPage))}
                </span>
                <button
                  disabled={(apiPage + 1) * limitPerPage >= apiTotal || apiLoading}
                  onClick={() => setApiPage((p) => p + 1)}
                  className="px-2.5 py-1 rounded border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40"
                >
                  Siguiente
                </button>
              </div>
            </div>

            {/* Tabla de Resultados API */}
            <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-medium uppercase text-[11px]">
                    <th className="py-2.5 px-3">Gestión</th>
                    <th className="py-2.5 px-3">Departamento</th>
                    <th className="py-2.5 px-3">Dependencia</th>
                    <th className="py-2.5 px-3">Subsistema</th>
                    <th className="py-2.5 px-3">Nivel</th>
                    <th className="py-2.5 px-3">Cargo</th>
                    <th className="py-2.5 px-3 text-right">Trabajadas</th>
                    <th className="py-2.5 px-3 text-right">Planilla</th>
                    <th className="py-2.5 px-3 text-right text-rose-700">Déficit</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {apiLoading ? (
                    <tr>
                      <td colSpan={9} className="py-8 text-center text-slate-400">
                        Cargando registros desde Supabase...
                      </td>
                    </tr>
                  ) : apiRecords.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="py-8 text-center text-slate-400">
                        No se encontraron registros con los filtros actuales.
                      </td>
                    </tr>
                  ) : (
                    apiRecords.map((r) => (
                      <tr key={r.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-2 px-3 font-semibold text-slate-900">{r.gestion}</td>
                        <td className="py-2 px-3 text-slate-800">{r.departamento}</td>
                        <td className="py-2 px-3 text-slate-600 text-[11px]">{r.dependencia}</td>
                        <td className="py-2 px-3 text-slate-600 text-[11px]">{r.subsistema}</td>
                        <td className="py-2 px-3 text-slate-600 text-[11px]">{r.nivel}</td>
                        <td className="py-2 px-3 font-medium text-slate-900">{r.cargo}</td>
                        <td className="py-2 px-3 text-right text-slate-800">{r.horas_trabajadas?.toLocaleString('es-BO')}</td>
                        <td className="py-2 px-3 text-right text-slate-800">{r.horas_planilla?.toLocaleString('es-BO')}</td>
                        <td className="py-2 px-3 text-right font-bold text-rose-600">
                          {r.deficit_horas?.toLocaleString('es-BO')}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* SourceBadge */}
      <SourceBadge
        sourceName="UIE · Unidad de Información Educativa"
        institutionTitle="Ministerio de Educación del Estado Plurinacional de Bolivia"
        methodology="Auditoría censal cruzada de Carga Horaria Trabajada en Unidades Educativas frente a la Planilla Fiscal Efectiva. 17.274 registros administrados en PostgreSQL Supabase."
        links={[
          {
            title: 'Base de Datos de Carga Horaria y Déficit UIE',
            url: 'https://sie.minedu.gob.bo/',
            institution: 'Ministerio de Educación',
            period: '2021-2025',
          },
        ]}
      />
    </div>
  );
}
