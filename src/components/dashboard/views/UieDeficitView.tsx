'use client';

import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { DashboardDataset } from '@/types/stats';
import summaryDataRaw from '@/data/uieDeficitSummary.json';
import catalogoCargosRaw from '@/data/uieCargosCatalogo.json';
import { StatCard } from '../StatCard';
import { TrendLineChart, TrendSeries } from '../TrendLineChart';
import { PieChart, PieSlice } from '../PieChart';
import { YearProgression } from '../YearProgression';
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
  FilterIcon,
  GraduationCapIcon,
  BuildingIcon,
  AlertTriangleIcon,
} from '../../ui/Icons';

interface UieDeficitViewProps {
  data: DashboardDataset;
}

export function UieDeficitView({ data }: UieDeficitViewProps) {
  const summary = summaryDataRaw;
  const catalogo = catalogoCargosRaw as any[];

  const [activeTab, setActiveTab] = useState<'relaciones' | 'departamentos' | 'cargos' | 'pronostico' | 'matriz_anual' | 'registros_api'>('relaciones');

  // =========================================================================
  // ESTADOS MÓDULO 1: CREADOR Y GESTOR DE RELACIONES (CARGO <-> ESPECIALIDAD)
  // =========================================================================
  const [especialidadesOficiales, setEspecialidadesOficiales] = useState<any[]>([]);
  const [relacionesGuardadas, setRelacionesGuardadas] = useState<any[]>([]);
  const [loadingRelaciones, setLoadingRelaciones] = useState<boolean>(false);
  const [resumenDeficitEspecialidad, setResumenDeficitEspecialidad] = useState<any[]>([]);

  // Filtros interactivos para el constructor
  const [filterDependencia, setFilterDependencia] = useState<string>('all');
  const [filterSubsistema, setFilterSubsistema] = useState<string>('all');
  const [filterNivel, setFilterNivel] = useState<string>('all');
  const [filterSearchCargo, setFilterSearchCargo] = useState<string>('');
  const [targetEspecialidadId, setTargetEspecialidadId] = useState<number | ''>('');
  const [selectedCargoItem, setSelectedCargoItem] = useState<any | null>(null);
  const [actionMessage, setActionMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Filtro de gestión para el déficit de especialidad
  const [selectedGestionEsp, setSelectedGestionEsp] = useState<string>('all');

  // =========================================================================
  // ESTADOS MÓDULO 2: DEPARTAMENTAL (TABLA Y GRÁFICO LINEAL POR GESTIÓN)
  // =========================================================================
  const [gestionDept, setGestionDept] = useState<string>('2025');
  const [deptMetric, setDeptMetric] = useState<'todas' | 'deficit' | 'comparativa'>('comparativa');

  // =========================================================================
  // ESTADOS PESTAÑAS EXISTENTES (CARGOS, PRONÓSTICO, API)
  // =========================================================================
  const [cargoMode, setCargoMode] = useState<'grupos' | 'individual'>('grupos');
  const [selectedGestionCargo, setSelectedGestionCargo] = useState<string>('all');
  const [selectedGrupoFilter, setSelectedGrupoFilter] = useState<string>('all');
  const [searchCargoTerm, setSearchCargoTerm] = useState<string>('');

  // Estado Pestaña Explorador API Supabase (17.274 registros vivos)
  const [apiGestion, setApiGestion] = useState<string>('2025');
  const [apiDept, setApiDept] = useState<string>('all');
  const [apiSearch, setApiSearch] = useState<string>('');
  const [apiRecords, setApiRecords] = useState<any[]>([]);
  const [apiTotal, setApiTotal] = useState<number>(0);
  const [apiLoading, setApiLoading] = useState<boolean>(false);
  const [apiPage, setApiPage] = useState<number>(0);
  const limitPerPage = 50;

  // Cargar Especialidades y Relaciones desde Supabase
  const loadEspecialidades = useCallback(async () => {
    try {
      const res = await fetch('/api/relaciones-especialidad?action=especialidades');
      if (res.ok) {
        const json = await res.json();
        setEspecialidadesOficiales(json || []);
        if (json?.length > 0 && targetEspecialidadId === '') {
          setTargetEspecialidadId(json[0].id);
        }
      }
    } catch {
      // ignore
    }
  }, [targetEspecialidadId]);

  const loadRelaciones = useCallback(async () => {
    setLoadingRelaciones(true);
    try {
      const res = await fetch('/api/relaciones-especialidad?limit=500');
      if (res.ok) {
        const json = await res.json();
        setRelacionesGuardadas(json.data || []);
      }
    } catch {
      // ignore
    } finally {
      setLoadingRelaciones(false);
    }
  }, []);

  const loadResumenDeficit = useCallback(async () => {
    try {
      const params = new URLSearchParams({
        action: 'resumen_deficit',
        gestion: selectedGestionEsp,
      });
      const res = await fetch(`/api/relaciones-especialidad?${params.toString()}`);
      if (res.ok) {
        const json = await res.json();
        setResumenDeficitEspecialidad(json || []);
      }
    } catch {
      // ignore
    }
  }, [selectedGestionEsp]);

  useEffect(() => {
    loadEspecialidades();
    loadRelaciones();
    loadResumenDeficit();
  }, [loadEspecialidades, loadRelaciones, loadResumenDeficit]);

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
  // CATÁLOGO DINÁMICO DE FILTROS PARA EL CONSTRUCTOR
  // =========================================================================
  const dependenciasList = useMemo(() => {
    return Array.from(new Set(catalogo.map((c) => c.dependencia))).sort();
  }, [catalogo]);

  const subsistemasList = useMemo(() => {
    let items = catalogo;
    if (filterDependencia !== 'all') {
      items = items.filter((c) => c.dependencia === filterDependencia);
    }
    return Array.from(new Set(items.map((c) => c.subsistema))).sort();
  }, [catalogo, filterDependencia]);

  const nivelesList = useMemo(() => {
    let items = catalogo;
    if (filterDependencia !== 'all') items = items.filter((c) => c.dependencia === filterDependencia);
    if (filterSubsistema !== 'all') items = items.filter((c) => c.subsistema === filterSubsistema);
    return Array.from(new Set(items.map((c) => c.nivel))).sort();
  }, [catalogo, filterDependencia, filterSubsistema]);

  // Cargos filtrados según las selecciones de dependecia, subsistema y nivel
  const cargosDisponiblesFiltrados = useMemo(() => {
    return catalogo.filter((item) => {
      if (filterDependencia !== 'all' && item.dependencia !== filterDependencia) return false;
      if (filterSubsistema !== 'all' && item.subsistema !== filterSubsistema) return false;
      if (filterNivel !== 'all' && item.nivel !== filterNivel) return false;
      if (filterSearchCargo && !item.cargo.toLowerCase().includes(filterSearchCargo.toLowerCase())) return false;
      return true;
    });
  }, [catalogo, filterDependencia, filterSubsistema, filterNivel, filterSearchCargo]);

  // Mapa rápido de relaciones existentes: "cargo|nivel|subsistema|dependencia" -> Especialidad Nombre
  const mapaRelacionesExistentes = useMemo(() => {
    const map = new Map<string, string>();
    relacionesGuardadas.forEach((r) => {
      const dep = r.dependencia || '';
      const sub = r.subsistema || '';
      const niv = r.nivel || '';
      const key = `${dep}|${sub}|${niv}|${r.cargo}`;
      const espName = r.especialidades_oficiales?.nombre || `Especialidad ${r.especialidad_id}`;
      map.set(key, espName);
      // Fallback sólo por cargo
      map.set(`cargo:${r.cargo}`, espName);
    });
    return map;
  }, [relacionesGuardadas]);

  // Guardar nueva relación en Supabase
  const handleCrearRelacion = async () => {
    if (!targetEspecialidadId || !selectedCargoItem) {
      setActionMessage({ type: 'error', text: 'Selecciona una especialidad y un cargo de la lista' });
      return;
    }

    try {
      const payload = {
        especialidad_id: Number(targetEspecialidadId),
        dependencia: selectedCargoItem.dependencia,
        subsistema: selectedCargoItem.subsistema,
        nivel: selectedCargoItem.nivel,
        cargo: selectedCargoItem.cargo,
      };

      const res = await fetch('/api/relaciones-especialidad', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        setActionMessage({
          type: 'success',
          text: `Relación vinculada exitosamente con "${especialidadesOficiales.find((e) => e.id === Number(targetEspecialidadId))?.nombre}"`,
        });
        await loadRelaciones();
        await loadResumenDeficit();
        setTimeout(() => setActionMessage(null), 4000);
      } else {
        const err = await res.json();
        setActionMessage({ type: 'error', text: `Error: ${err.error || 'No se pudo guardar la relación'}` });
      }
    } catch (e: any) {
      setActionMessage({ type: 'error', text: `Excepción: ${e.message}` });
    }
  };

  // =========================================================================
  // CÁLCULO DE KPIS GLOBALES
  // =========================================================================
  const kpiStats = useMemo(() => {
    const hist2025 = summary.historico_nacional.find((h) => h.gestion === 2025);
    const deficit2025 = hist2025?.deficit_horas || 939597;
    const trabajadas2025 = hist2025?.horas_trabajadas || 16009284;
    const planilla2025 = hist2025?.horas_planilla || 15069687;
    const deficitPct2025 = hist2025?.deficit_pct || 5.87;
    const items2025 = hist2025?.items_equiv_88h || 10677;

    const pron2026 = summary.pronostico_nacional.find((p) => p.gestion === 2026);
    const deficitPron2026 = pron2026?.deficit_horas || 935414;
    const itemsPron2026 = pron2026?.items_equiv_88h || 10630;

    return {
      deficit2025,
      trabajadas2025,
      planilla2025,
      deficitPct2025,
      items2025,
      deficitPron2026,
      itemsPron2026,
    };
  }, [summary]);

  // =========================================================================
  // MÓDULO 2: DEPARTAMENTAL (HORAS TRABAJADAS, PLANILLA, DÉFICIT POR GESTIÓN)
  // =========================================================================
  const tablaDepartamentalGestion = useMemo(() => {
    return summary.por_departamento.map((d) => {
      let def = d.deficit_total;
      let trab = d.trabajadas_total;
      let plan = d.planilla_total;

      if (gestionDept !== 'all') {
        const det = (d.por_gestion as Record<string, { deficit: number; trabajadas: number; planilla: number; items_equiv_88h: number }>)[gestionDept];
        if (det) {
          def = det.deficit;
          trab = det.trabajadas;
          plan = det.planilla;
        } else {
          def = 0;
          trab = 0;
          plan = 0;
        }
      }

      const pct = trab > 0 ? Number(((def / trab) * 100).toFixed(2)) : 0;
      const items = Math.round(def / 88);

      return {
        id: d.departamento_id,
        departamento: d.departamento,
        horas_trabajadas: trab,
        horas_planilla: plan,
        deficit: def,
        deficit_pct: pct,
        items_equiv_88h: items,
      };
    }).sort((a, b) => b.deficit - a.deficit);
  }, [summary.por_departamento, gestionDept]);

  // Totales de la tabla departamental
  const totalDepartamentalGestion = useMemo(() => {
    const totTrab = tablaDepartamentalGestion.reduce((acc, d) => acc + d.horas_trabajadas, 0);
    const totPlan = tablaDepartamentalGestion.reduce((acc, d) => acc + d.horas_planilla, 0);
    const totDef = tablaDepartamentalGestion.reduce((acc, d) => acc + d.deficit, 0);
    const totPct = totTrab > 0 ? Number(((totDef / totTrab) * 100).toFixed(2)) : 0;
    const totItems = Math.round(totDef / 88);
    return { totTrab, totPlan, totDef, totPct, totItems };
  }, [tablaDepartamentalGestion]);

  // Series para el Gráfico Lineal Departamental
  const seriesLinealDepartamentos: TrendSeries[] = useMemo(() => {
    if (deptMetric === 'deficit') {
      return [
        {
          id: 'deficit',
          name: 'Déficit de Horas',
          color: '#e11d48',
          data: tablaDepartamentalGestion.map((d, idx) => ({ year: idx + 1, value: d.deficit })),
        },
      ];
    }

    if (deptMetric === 'todas') {
      return [
        {
          id: 'trabajadas',
          name: 'Horas Trabajadas',
          color: '#1e293b',
          data: tablaDepartamentalGestion.map((d, idx) => ({ year: idx + 1, value: d.horas_trabajadas })),
        },
        {
          id: 'planilla',
          name: 'Horas en Planilla',
          color: '#2563eb',
          data: tablaDepartamentalGestion.map((d, idx) => ({ year: idx + 1, value: d.horas_planilla })),
        },
        {
          id: 'deficit',
          name: 'Déficit de Horas',
          color: '#e11d48',
          data: tablaDepartamentalGestion.map((d, idx) => ({ year: idx + 1, value: d.deficit })),
        },
      ];
    }

    // Modo Comparativa (Trabajadas vs Planilla vs Déficit)
    return [
      {
        id: 'trabajadas',
        name: 'Horas Trabajadas en Aula',
        color: '#1e293b',
        data: tablaDepartamentalGestion.map((d, idx) => ({ year: idx + 1, value: d.horas_trabajadas })),
      },
      {
        id: 'planilla',
        name: 'Horas Cubiertas en Planilla',
        color: '#059669',
        data: tablaDepartamentalGestion.map((d, idx) => ({ year: idx + 1, value: d.horas_planilla })),
      },
      {
        id: 'deficit',
        name: 'Déficit de Horas (Brecha)',
        color: '#e11d48',
        data: tablaDepartamentalGestion.map((d, idx) => ({ year: idx + 1, value: d.deficit })),
      },
    ];
  }, [tablaDepartamentalGestion, deptMetric]);

  // =========================================================================
  // DÉFICIT CALCULADO POR ESPECIALIDAD OFICIAL (CONSOLIDADO)
  // =========================================================================
  const tablaEspecialidadesDeficit = useMemo(() => {
    const map = new Map<number, { id: number; nombre: string; trabajadas: number; planilla: number; deficit: number; registros: number }>();

    especialidadesOficiales.forEach((eo) => {
      map.set(eo.id, { id: eo.id, nombre: eo.nombre, trabajadas: 0, planilla: 0, deficit: 0, registros: 0 });
    });

    resumenDeficitEspecialidad.forEach((r) => {
      const e = map.get(r.especialidad_id);
      if (e) {
        e.trabajadas += r.total_horas_trabajadas || 0;
        e.planilla += r.total_horas_planilla || 0;
        e.deficit += r.total_deficit_horas || 0;
        e.registros += r.registros_afectados || 0;
      }
    });

    return Array.from(map.values())
      .map((item) => {
        const pct = item.trabajadas > 0 ? Number(((item.deficit / item.trabajadas) * 100).toFixed(2)) : 0;
        const items = Math.round(item.deficit / 88);
        return {
          ...item,
          deficit_pct: pct,
          items_equiv_88h: items,
        };
      })
      .sort((a, b) => b.deficit - a.deficit);
  }, [especialidadesOficiales, resumenDeficitEspecialidad]);

  // Slices de Torta para Especialidades Oficiales
  const pieEspecialidadesDeficit: PieSlice[] = useMemo(() => {
    const palette = ['#e11d48', '#c9a751', '#2563eb', '#059669', '#d97706', '#7c3aed', '#0891b2', '#4b5563', '#ea580c', '#8b5cf6', '#10b981', '#64748b'];
    return tablaEspecialidadesDeficit.slice(0, 8).map((item, idx) => ({
      label: item.nombre,
      value: item.deficit,
      color: palette[idx % palette.length],
      sublabel: `${item.deficit_pct}% brecha (${item.items_equiv_88h.toLocaleString('es-BO')} ítems)`,
    }));
  }, [tablaEspecialidadesDeficit]);

  // =========================================================================
  // PRONÓSTICO TEMPORAL CONTINUO (2021 - 2035)
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
              17.274 Registros Consolidados · Mapeador a Especialidades Oficiales ESFM
            </span>
          </div>
          <h1 className="text-2xl font-semibold text-slate-900 tracking-tight">
            Módulo de Relaciones UIE, Déficit por Especialidad y Balance Departamental
          </h1>
          <p className="text-xs text-slate-500 mt-1 max-w-3xl">
            Vincula los cargos docentes filtrados por Dependencia, Subsistema y Nivel con las 20 Especialidades Oficiales. Visualiza el déficit consolidado y analiza la comparativa departamental de Horas Trabajadas vs Horas en Planilla.
          </p>
        </div>
      </div>

      {/* Pestañas de Navegación del Módulo UIE */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 border-b border-slate-200">
        <button
          onClick={() => setActiveTab('relaciones')}
          className={`flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap ${
            activeTab === 'relaciones'
              ? 'bg-[#c9a751] text-slate-900 shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <GraduationCapIcon size={16} />
          Relaciones y Especialidades Oficiales
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
          Tabla y Gráfico Departamental
        </button>
        <button
          onClick={() => setActiveTab('cargos')}
          className={`flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap ${
            activeTab === 'cargos'
              ? 'bg-[#c9a751] text-slate-900 shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <GridIcon size={16} />
          Déficit por Familias y Cargos
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
          Base Supabase (17.274 Filas)
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
          title="Relaciones Mapeadas"
          value={relacionesGuardadas.length}
          subtitle={`${especialidadesOficiales.length} Especialidades Curriculares`}
          sourceBadge="Mapeo UIE"
          sourceColor="purple"
          icon={<GraduationCapIcon size={22} className="text-blue-600" />}
        />
        <StatCard
          title="Pronóstico Déficit 2026"
          value={kpiStats.deficitPron2026}
          subtitle={`Demanda estimada: ~${kpiStats.itemsPron2026.toLocaleString('es-BO')} nuevos ítems`}
          sourceBadge="Forecast 2026"
          sourceColor="purple"
          icon={<TrendingUpIcon size={22} className="text-emerald-600" />}
        />
      </div>

      {/* =========================================================================
          PESTAÑA 1: MÓDULO DE RELACIONES Y ESPECIALIDADES OFICIALES
         ========================================================================= */}
      {activeTab === 'relaciones' && (
        <div className="space-y-6">
          {/* Creador de Relaciones Interactivo */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-100 pb-3">
              <div>
                <h2 className="text-base font-semibold text-slate-900 tracking-tight flex items-center gap-2">
                  <FilterIcon size={18} className="text-[#c9a751]" />
                  <span>Constructor de Relaciones: Cargo UIE $\longrightarrow$ Especialidad Oficial</span>
                </h2>
                <p className="text-xs text-slate-500">
                  Selecciona la combinación exacta de Nivel, Subsistema y Dependencia para asignar el cargo a la Especialidad Oficial correcta.
                </p>
              </div>

              {actionMessage && (
                <div
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium border ${
                    actionMessage.type === 'success'
                      ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                      : 'bg-rose-50 text-rose-800 border-rose-200'
                  }`}
                >
                  {actionMessage.text}
                </div>
              )}
            </div>

            {/* Selectores de Filtro de Criterio */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  1. Dependencia:
                </label>
                <select
                  value={filterDependencia}
                  onChange={(e) => setFilterDependencia(e.target.value)}
                  className="w-full text-xs font-medium bg-slate-50 border border-slate-200 rounded-lg p-2 focus:outline-hidden focus:ring-1 focus:ring-[#c9a751] text-slate-900 cursor-pointer"
                >
                  <option value="all">Todas las Dependencias</option>
                  {dependenciasList.map((d) => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  2. Subsistema:
                </label>
                <select
                  value={filterSubsistema}
                  onChange={(e) => setFilterSubsistema(e.target.value)}
                  className="w-full text-xs font-medium bg-slate-50 border border-slate-200 rounded-lg p-2 focus:outline-hidden focus:ring-1 focus:ring-[#c9a751] text-slate-900 cursor-pointer"
                >
                  <option value="all">Todos los Subsistemas</option>
                  {subsistemasList.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  3. Nivel Escolar:
                </label>
                <select
                  value={filterNivel}
                  onChange={(e) => setFilterNivel(e.target.value)}
                  className="w-full text-xs font-medium bg-slate-50 border border-slate-200 rounded-lg p-2 focus:outline-hidden focus:ring-1 focus:ring-[#c9a751] text-slate-900 cursor-pointer"
                >
                  <option value="all">Todos los Niveles</option>
                  {nivelesList.map((n) => (
                    <option key={n} value={n}>
                      {n}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  4. Buscar Cargo:
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={filterSearchCargo}
                    onChange={(e) => setFilterSearchCargo(e.target.value)}
                    placeholder="Ej: Maestro Aula, Química..."
                    className="w-full text-xs font-medium bg-slate-50 border border-slate-200 rounded-lg p-2 pr-7 focus:outline-hidden focus:ring-1 focus:ring-[#c9a751] text-slate-900"
                  />
                  {filterSearchCargo && (
                    <button
                      onClick={() => setFilterSearchCargo('')}
                      className="absolute inset-y-0 right-0 pr-2 flex items-center text-slate-400 hover:text-slate-600"
                    >
                      <XIcon size={13} />
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Panel de Asignación y Selección de Cargo */}
            <div className="pt-2 border-t border-slate-100 grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
              {/* Lista de cargos filtrados */}
              <div className="lg:col-span-7 space-y-2">
                <div className="flex items-center justify-between text-xs text-slate-600">
                  <span className="font-medium">
                    Cargos coincidentes ({cargosDisponiblesFiltrados.length}):
                  </span>
                  <span className="text-[11px] text-slate-500">Haz clic en un cargo para seleccionarlo</span>
                </div>
                <div className="max-h-64 overflow-y-auto rounded-xl border border-slate-200 divide-y divide-slate-100 bg-slate-50/50">
                  {cargosDisponiblesFiltrados.length === 0 ? (
                    <div className="p-4 text-center text-xs text-slate-400">
                      No hay cargos con los filtros seleccionados
                    </div>
                  ) : (
                    cargosDisponiblesFiltrados.slice(0, 80).map((item) => {
                      const isSelected = selectedCargoItem?.key === item.key;
                      const relacionNombre = mapaRelacionesExistentes.get(item.key) || mapaRelacionesExistentes.get(`cargo:${item.cargo}`);
                      return (
                        <div
                          key={item.key}
                          onClick={() => setSelectedCargoItem(item)}
                          className={`p-2.5 text-xs cursor-pointer transition-colors flex items-center justify-between gap-3 ${
                            isSelected
                              ? 'bg-[#faf5e8] border-l-4 border-[#c9a751]'
                              : 'hover:bg-slate-100'
                          }`}
                        >
                          <div className="min-w-0">
                            <p className="font-semibold text-slate-900 truncate">{item.cargo}</p>
                            <p className="text-[10px] text-slate-500">
                              {item.dependencia} · {item.subsistema} · {item.nivel}
                            </p>
                          </div>
                          <div className="text-right shrink-0">
                            {relacionNombre ? (
                              <span className="inline-block px-2 py-0.5 rounded text-[10px] font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                                {relacionNombre}
                              </span>
                            ) : (
                              <span className="inline-block px-1.5 py-0.5 rounded text-[10px] font-medium bg-slate-200 text-slate-600">
                                Sin Asignar
                              </span>
                            )}
                            <p className="text-[10px] text-rose-600 font-bold mt-0.5">
                              Déficit: {item.total_deficit.toLocaleString('es-BO')} hrs
                            </p>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              {/* Formulario de vinculación */}
              <div className="lg:col-span-5 bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
                <span className="text-[11px] font-semibold text-slate-700 uppercase tracking-wider block">
                  5. Vincular a Especialidad Oficial:
                </span>

                {selectedCargoItem ? (
                  <div className="p-3 bg-white rounded-lg border border-slate-200 text-xs space-y-1">
                    <span className="text-[10px] text-slate-500 uppercase font-semibold">Cargo Seleccionado:</span>
                    <p className="font-bold text-slate-900">{selectedCargoItem.cargo}</p>
                    <p className="text-[11px] text-slate-600">
                      <strong>Nivel:</strong> {selectedCargoItem.nivel} · <strong>Dependencia:</strong> {selectedCargoItem.dependencia}
                    </p>
                    <p className="text-[11px] text-rose-600 font-semibold">
                      Déficit Registrado: {selectedCargoItem.total_deficit.toLocaleString('es-BO')} hrs
                    </p>
                  </div>
                ) : (
                  <div className="p-3 bg-amber-50 rounded-lg border border-amber-200 text-xs text-amber-800">
                    Selecciona un cargo de la lista izquierda para asignarle su Especialidad Oficial.
                  </div>
                )}

                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    Especialidad Curricular Oficial (20):
                  </label>
                  <select
                    value={targetEspecialidadId}
                    onChange={(e) => setTargetEspecialidadId(Number(e.target.value))}
                    className="w-full text-xs font-semibold bg-white border border-slate-200 rounded-lg p-2 focus:outline-hidden focus:ring-1 focus:ring-[#c9a751] text-slate-900 cursor-pointer"
                  >
                    {especialidadesOficiales.map((e) => (
                      <option key={e.id} value={e.id}>
                        {e.id}. {e.nombre}
                      </option>
                    ))}
                  </select>
                </div>

                <button
                  disabled={!selectedCargoItem}
                  onClick={handleCrearRelacion}
                  className="w-full py-2 px-3 rounded-lg text-xs font-semibold bg-[#c9a751] text-slate-900 hover:bg-[#b89542] transition-colors shadow-xs disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                >
                  Guardar Relación en Supabase
                </button>
              </div>
            </div>
          </div>

          {/* DÉFICIT CALCULADO EN VIVO POR ESPECIALIDAD OFICIAL */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-100 pb-3">
              <div>
                <h2 className="text-base font-semibold text-slate-900 tracking-tight flex items-center gap-2">
                  <ScaleIcon size={18} className="text-rose-600" />
                  <span>Déficit Consolidado por Especialidad Oficial ESFM</span>
                </h2>
                <p className="text-xs text-slate-500">
                  Cálculo automático en vivo sumando todas las horas trabajadas vs planilla según las relaciones asignadas.
                </p>
              </div>

              {/* Filtro de Gestión para el resumen */}
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-slate-600">Gestión:</span>
                <select
                  value={selectedGestionEsp}
                  onChange={(e) => setSelectedGestionEsp(e.target.value)}
                  className="text-xs font-semibold bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 focus:outline-hidden focus:ring-1 focus:ring-[#c9a751] text-slate-900 cursor-pointer"
                >
                  <option value="all">Todas las Gestiones (2021-2025)</option>
                  <option value="2025">Gestión 2025</option>
                  <option value="2024">Gestión 2024</option>
                  <option value="2023">Gestión 2023</option>
                  <option value="2022">Gestión 2022</option>
                  <option value="2021">Gestión 2021</option>
                </select>
              </div>
            </div>

            {/* Gráfico y Torta */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
              <PieChart
                title="Participación en el Déficit por Especialidad Oficial"
                subtitle="Concentración de horas no cubiertas en las 20 carreras de formación docente"
                data={pieEspecialidadesDeficit}
                donut={true}
                unit="horas"
              />

              {/* Ranking de las 5 más críticas */}
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
                <div className="flex items-center justify-between text-xs border-b border-slate-200 pb-2">
                  <span className="font-semibold text-slate-900">Especialidades con Mayor Demanda de Ítems</span>
                  <span className="text-[10px] text-rose-700 font-bold bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
                    Prioridad de Admisión
                  </span>
                </div>
                <div className="space-y-2.5">
                  {tablaEspecialidadesDeficit.slice(0, 5).map((esp, idx) => (
                    <div key={esp.id} className="p-2.5 bg-white rounded-lg border border-slate-200">
                      <div className="flex items-center justify-between text-xs mb-1">
                        <span className="font-semibold text-slate-900 truncate">
                          {idx + 1}. {esp.nombre}
                        </span>
                        <span className="font-bold text-rose-600">
                          {esp.deficit.toLocaleString('es-BO')} hrs
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-[11px] text-slate-500">
                        <span>Ítems faltantes: <strong>{esp.items_equiv_88h.toLocaleString('es-BO')}</strong> maestros</span>
                        <span>Brecha: {esp.deficit_pct}%</span>
                      </div>
                      <div className="w-full bg-slate-200 h-1.5 rounded-full mt-1.5 overflow-hidden">
                        <div
                          className="bg-rose-500 h-full rounded-full"
                          style={{ width: `${Math.min(100, Math.max(5, (esp.deficit / (tablaEspecialidadesDeficit[0]?.deficit || 1)) * 100))}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Tabla Completa de las 20 Especialidades */}
            <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-medium uppercase text-[11px]">
                    <th className="py-3 px-3">Especialidad Oficial Curricular</th>
                    <th className="py-3 px-3 text-right">Horas Trabajadas</th>
                    <th className="py-3 px-3 text-right">Horas en Planilla</th>
                    <th className="py-3 px-3 text-right text-rose-700">Déficit Horas</th>
                    <th className="py-3 px-3 text-center">% Brecha</th>
                    <th className="py-3 px-3 text-right text-[#c9a751]">Ítems Necesarios (88h)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {tablaEspecialidadesDeficit.map((esp) => (
                    <tr key={esp.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-3 font-semibold text-slate-900 flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-rose-500" />
                        <span>{esp.nombre}</span>
                      </td>
                      <td className="py-3 px-3 text-right font-medium text-slate-800">
                        {esp.trabajadas.toLocaleString('es-BO')}
                      </td>
                      <td className="py-3 px-3 text-right font-medium text-slate-800">
                        {esp.planilla.toLocaleString('es-BO')}
                      </td>
                      <td className="py-3 px-3 text-right font-bold text-rose-600">
                        {esp.deficit.toLocaleString('es-BO')}
                      </td>
                      <td className="py-3 px-3 text-center font-medium">
                        <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-rose-50 text-rose-700 border border-rose-200">
                          {esp.deficit_pct}%
                        </span>
                      </td>
                      <td className="py-3 px-3 text-right font-bold text-slate-900">
                        <span className="bg-[#faf5e8] text-[#c9a751] border border-[#e5d5a6] px-2 py-0.5 rounded">
                          {esp.items_equiv_88h.toLocaleString('es-BO')} ítems
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
          PESTAÑA 2: TABLA Y GRÁFICO LINEAL DEPARTAMENTAL
         ========================================================================= */}
      {activeTab === 'departamentos' && (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-100 pb-3">
              <div>
                <h2 className="text-base font-semibold text-slate-900 tracking-tight flex items-center gap-2">
                  <MapPinIcon size={18} className="text-[#c9a751]" />
                  <span>Balance Departamental: Horas Trabajadas vs Planilla vs Déficit</span>
                </h2>
                <p className="text-xs text-slate-500">
                  Selecciona la gestión deseada para consultar la tabla comparativa de los 9 departamentos y su proyección en gráfico lineal continuo.
                </p>
              </div>

              {/* Controles de Selección por Gestión y Métricas */}
              <div className="flex items-center gap-2 flex-wrap">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-semibold text-slate-700">Gestión:</span>
                  <select
                    value={gestionDept}
                    onChange={(e) => setGestionDept(e.target.value)}
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

                <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg text-xs font-medium">
                  <button
                    onClick={() => setDeptMetric('comparativa')}
                    className={`px-2.5 py-1 rounded-md transition-colors ${
                      deptMetric === 'comparativa' ? 'bg-white text-slate-900 shadow-2xs font-semibold' : 'text-slate-600'
                    }`}
                  >
                    Comparativa Completa
                  </button>
                  <button
                    onClick={() => setDeptMetric('deficit')}
                    className={`px-2.5 py-1 rounded-md transition-colors ${
                      deptMetric === 'deficit' ? 'bg-rose-600 text-white shadow-2xs font-semibold' : 'text-slate-600'
                    }`}
                  >
                    Solo Déficit
                  </button>
                </div>
              </div>
            </div>

            {/* Gráfico Lineal Departamental Continuo */}
            <TrendLineChart
              title={`Evolución Departamental · Gestión ${gestionDept === 'all' ? '2021 - 2025' : gestionDept}`}
              subtitle="Curvas comparativas entre Horas Trabajadas en Aula, Horas Cubiertas en Planilla y Déficit resultante en los 9 departamentos"
              series={seriesLinealDepartamentos}
              xLabelFormatter={(idx) => tablaDepartamentalGestion[idx - 1]?.departamento || ''}
              unit="horas"
              height={360}
              showArea={false}
            />

            {/* TABLA PRINCIPAL DEPARTAMENTAL SOLICITADA */}
            <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-medium uppercase text-[11px]">
                    <th className="py-3 px-3">Departamento</th>
                    <th className="py-3 px-3 text-right">Horas Trabajadas</th>
                    <th className="py-3 px-3 text-right">Horas en Planilla</th>
                    <th className="py-3 px-3 text-right text-rose-700">Déficit</th>
                    <th className="py-3 px-3 text-center">% Brecha</th>
                    <th className="py-3 px-3 text-right text-[#c9a751]">Ítems Equivalentes (88h)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {tablaDepartamentalGestion.map((d) => (
                    <tr key={d.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-3 font-semibold text-slate-900">{d.departamento}</td>
                      <td className="py-3 px-3 text-right font-medium text-slate-800">
                        {d.horas_trabajadas.toLocaleString('es-BO')}
                      </td>
                      <td className="py-3 px-3 text-right font-medium text-slate-800">
                        {d.horas_planilla.toLocaleString('es-BO')}
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
                  {/* Fila Totalizadora */}
                  <tr className="bg-slate-50/90 font-bold border-t-2 border-slate-300">
                    <td className="py-3.5 px-3 text-slate-900 uppercase">Total Nacional</td>
                    <td className="py-3.5 px-3 text-right text-slate-900">
                      {totalDepartamentalGestion.totTrab.toLocaleString('es-BO')}
                    </td>
                    <td className="py-3.5 px-3 text-right text-slate-900">
                      {totalDepartamentalGestion.totPlan.toLocaleString('es-BO')}
                    </td>
                    <td className="py-3.5 px-3 text-right text-rose-700">
                      {totalDepartamentalGestion.totDef.toLocaleString('es-BO')}
                    </td>
                    <td className="py-3.5 px-3 text-center text-rose-700">
                      {totalDepartamentalGestion.totPct}%
                    </td>
                    <td className="py-3.5 px-3 text-right text-[#c9a751]">
                      {totalDepartamentalGestion.totItems.toLocaleString('es-BO')} ítems
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          PESTAÑA 3: DÉFICIT POR CARGOS Y FAMILIAS
         ========================================================================= */}
      {activeTab === 'cargos' && (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div>
                <h2 className="text-base font-semibold text-slate-900 tracking-tight">
                  Balance de Déficit por Familias Pedagógicas y Cargos
                </h2>
                <p className="text-xs text-slate-500">
                  Agrupa los 807 cargos singulares en 12 familias de formación docente o visualiza cada cargo específico.
                </p>
              </div>

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
                  <span>Familias Pedagógicas</span>
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

            <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-3 flex-wrap">
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
            </div>
          </div>

          {/* VISTA FAMILIAS */}
          <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-medium uppercase text-[11px]">
                  <th className="py-3 px-3">Familia Pedagógica</th>
                  <th className="py-3 px-3 text-right">Horas Trabajadas</th>
                  <th className="py-3 px-3 text-right">Horas en Planilla</th>
                  <th className="py-3 px-3 text-right text-rose-700">Déficit</th>
                  <th className="py-3 px-3 text-center">% Brecha</th>
                  <th className="py-3 px-3 text-right text-[#c9a751]">Ítems Equivalentes (88h)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {summary.por_grupo_cargo.map((g) => (
                  <tr key={g.grupo} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-3 font-semibold text-slate-900">{g.grupo}</td>
                    <td className="py-3 px-3 text-right font-medium text-slate-800">
                      {g.trabajadas_total.toLocaleString('es-BO')}
                    </td>
                    <td className="py-3 px-3 text-right font-medium text-slate-800">
                      {g.planilla_total.toLocaleString('es-BO')}
                    </td>
                    <td className="py-3 px-3 text-right font-bold text-rose-600">
                      {g.deficit_total.toLocaleString('es-BO')}
                    </td>
                    <td className="py-3 px-3 text-center">
                      <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-rose-50 text-rose-700 border border-rose-200">
                        {g.deficit_pct}%
                      </span>
                    </td>
                    <td className="py-3 px-3 text-right font-bold text-slate-900">
                      <span className="bg-[#faf5e8] text-[#c9a751] border border-[#e5d5a6] px-2 py-0.5 rounded">
                        {g.items_equiv_88h.toLocaleString('es-BO')} ítems
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
          PESTAÑA 4: PRONÓSTICO POR GESTIÓN (2026 - 2035)
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

            <TrendLineChart
              title="Evolución y Pronóstico de Horas: Demanda Trabajada vs Planilla Fiscal (2021 - 2035)"
              subtitle="Línea roja representa el déficit de horas no cubiertas que requiere asignación presupuestaria o nuevos egresados ESFM"
              series={seriesPronosticoDeficit}
              unit="horas"
              height={380}
              showArea={false}
            />
          </div>

          <YearProgression
            title="Trayectoria Proyectada del Déficit de Horas Docentes (2021 - 2035)"
            subtitle="Planificación de mediano y largo plazo para cupos de admisión en las Escuelas Superiores de Formación de Maestros"
            data={progressionDataDeficit}
            unit="horas deficit"
            color="#e11d48"
          />
        </div>
      )}

      {/* =========================================================================
          PESTAÑA 5: MATRIZ HISTÓRICA (2021 - 2025)
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
          PESTAÑA 6: BASE SUPABASE (17.274 FILAS)
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
        sourceName="UIE & DGFM · Subsistema de Educación Regular, Alternativa y Especial"
        institutionTitle="Ministerio de Educación del Estado Plurinacional de Bolivia"
        methodology="Auditoría censal cruzada de Carga Horaria Trabajada en Unidades Educativas frente a la Planilla Fiscal Efectiva vinculada con las 20 Especialidades Oficiales ESFM."
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
