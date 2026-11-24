'use client';

import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import deficitGlobalData from '@/data/sie_deficit_resumen_global.json';
import { getNivelEspecialidad, sortEspecialidadesPorNivel, NivelCodigo, NIVELES_CONFIG } from '@/lib/constants/especialidadNiveles';
import {
  Scale,
  TrendingDown,
  Building2,
  Users,
  Search,
  Filter,
  Download,
  Eye,
  Grid,
  BarChart3,
  AlertTriangle,
  CheckCircle2,
  ChevronRight,
  MapPin,
  BookOpen,
  ArrowUpDown,
  Maximize2,
  Minimize2,
  RefreshCw,
} from 'lucide-react';

interface DepartamentoDeficit {
  departamento_id: number;
  departamento: string;
  carga_horaria: number;
  horas_planilla: number;
  deficit_horas: number;
  items_deficit_equiv: number;
  pct_cobertura: number;
  ues_afectadas: number;
}

interface MateriaBreakdownItem {
  materia: string;
  nivel: string;
  carga_horaria: number;
  deficit_horas: number;
  ues_afectadas: number;
}

interface EspecialidadResumen {
  id: number;
  nombre: string;
  hora_item: number;
  nivel_codigo?: string;
  nivel_nombre?: string;
  orden_jerarquia?: number;
  carga_horaria: number;
  horas_planilla: number;
  deficit_horas: number;
  items_deficit_equiv: number;
  pct_cobertura: number;
  ues_afectadas: number;
  materias_breakdown: MateriaBreakdownItem[];
  departamentos: DepartamentoDeficit[];
}

export default function DeficitMateriaDinamicoView() {
  // ─── Estados de Navegación y Filtros ─────────────────────────────────────────
  const [vistaModo, setVistaModo] = useState<'heatmap' | 'barras' | 'tabla'>('heatmap');
  const [selectedEspId, setSelectedEspId] = useState<number>(5); // 5 = EDUCACIÓN INICIAL EN FAMILIA COMUNITARIA
  const [filtroDepto, setFiltroDepto] = useState<string>('TODOS');
  const [filtroNivel, setFiltroNivel] = useState<string>('TODOS');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [sortBy, setSortBy] = useState<'nivel' | 'deficit' | 'items' | 'cobertura' | 'nombre'>('nivel');
  const [sortAsc, setSortAsc] = useState<boolean>(false);
  const [hoverCell, setHoverCell] = useState<{ espNombre: string; depto: string; items: number; defHoras: number; cob: number } | null>(null);
  const [deptoEscalaModo, setDeptoEscalaModo] = useState<'porcentaje' | 'absoluto'>('porcentaje');
  const [hoverDepto, setHoverDepto] = useState<DepartamentoDeficit | null>(null);

  // ─── Fullscreen Nativo (Fullscreen API) ─────────────────────────────────────
  const containerRef = useRef<HTMLDivElement>(null);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [showKpisInFullscreen, setShowKpisInFullscreen] = useState<boolean>(false);

  useEffect(() => {
    const handler = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', handler);
    return () => document.removeEventListener('fullscreenchange', handler);
  }, []);

  const handleFullscreen = useCallback((modo?: 'heatmap' | 'barras' | 'tabla') => {
    if (modo) {
      setVistaModo(modo);
    }
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen().catch((err) => {
        console.warn('Fullscreen no disponible o bloqueado:', err);
      });
    } else {
      if (!modo || modo === vistaModo) {
        document.exitFullscreen().catch(() => { });
      }
    }
  }, [vistaModo]);

  // ─── Estado Reactivo y Sincronización en Tiempo Real con Filtros CRUD ────────
  const [data, setData] = useState(deficitGlobalData);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [lastSync, setLastSync] = useState<Date | null>(null);

  const fetchData = useCallback(async (silent = false) => {
    if (!silent) setIsRefreshing(true);
    try {
      const res = await fetch(`/api/sie-deficit-global?t=${Date.now()}`, {
        cache: 'no-store',
      });
      if (res.ok) {
        const fresh = await res.json();
        setData(fresh);
        setLastSync(new Date());
      }
    } catch (e) {
      console.warn('Error sincronizando déficit global:', e);
    } finally {
      if (!silent) setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    // 1. Cargar datos frescos de la BD al montar
    fetchData(true);

    // 2. BroadcastChannel para sincronizar entre pestañas y componentes
    let bc: BroadcastChannel | null = null;
    if (typeof BroadcastChannel !== 'undefined') {
      try {
        bc = new BroadcastChannel('sie_deficit_channel');
        bc.onmessage = (event) => {
          if (event.data?.type === 'UPDATED') {
            fetchData();
          }
        };
      } catch (_) { }
    }

    // 3. Custom Event en la misma ventana
    const onCustomEvent = () => fetchData();
    window.addEventListener('sie-deficit-updated', onCustomEvent);

    // 4. Storage Event entre pestañas
    const onStorage = (e: StorageEvent) => {
      if (e.key === 'sie_deficit_updated_at') {
        fetchData();
      }
    };
    window.addEventListener('storage', onStorage);

    // 5. Polling suave cada 8s si la pestaña está activa
    const interval = setInterval(() => {
      if (typeof document !== 'undefined' && document.visibilityState === 'visible') {
        fetchData(true);
      }
    }, 8000);

    return () => {
      bc?.close();
      window.removeEventListener('sie-deficit-updated', onCustomEvent);
      window.removeEventListener('storage', onStorage);
      clearInterval(interval);
    };
  }, [fetchData]);

  const especialidades: EspecialidadResumen[] = (data.especialidades || []) as EspecialidadResumen[];
  const totalesPais = data.totales_pais;

  // ─── Filtrado y Ordenamiento de Especialidades ───────────────────────────────
  const especialidadesFiltradas = useMemo(() => {
    let list = [...especialidades];

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter((e) => e.nombre.toLowerCase().includes(q));
    }

    if (filtroNivel !== 'TODOS') {
      list = list.filter((e) => {
        const info = getNivelEspecialidad(e.id, e.nombre);
        return info.nivelCodigo === filtroNivel;
      });
    }

    list.sort((a, b) => {
      let diff = 0;
      if (sortBy === 'nivel') {
        const infoA = getNivelEspecialidad(a.id, a.nombre);
        const infoB = getNivelEspecialidad(b.id, b.nombre);
        if (infoA.ordenJerarquia !== infoB.ordenJerarquia) {
          diff = infoA.ordenJerarquia - infoB.ordenJerarquia;
        } else {
          diff = a.nombre.localeCompare(b.nombre);
        }
      } else if (sortBy === 'deficit') {
        diff = b.deficit_horas - a.deficit_horas;
      } else if (sortBy === 'items') {
        diff = b.items_deficit_equiv - a.items_deficit_equiv;
      } else if (sortBy === 'cobertura') {
        diff = a.pct_cobertura - b.pct_cobertura;
      } else {
        diff = a.nombre.localeCompare(b.nombre);
      }
      return sortAsc ? -diff : diff;
    });

    return list;
  }, [especialidades, searchQuery, filtroNivel, sortBy, sortAsc]);

  // Totales consolidados por departamento para el pie de la Matriz de Calor
  const totalesHeatmapDeptos = useMemo(() => {
    if (especialidadesFiltradas.length === 0) return { porDepto: [], granTotal: 0 };
    const deptosPlantilla = especialidadesFiltradas[0].departamentos;
    const sums = deptosPlantilla.map((d) => ({
      id: d.departamento_id,
      depto: d.departamento,
      totalItems: 0
    }));

    let granTotal = 0;
    especialidadesFiltradas.forEach((esp) => {
      esp.departamentos.forEach((d, idx) => {
        if (sums[idx]) {
          sums[idx].totalItems += d.items_deficit_equiv || 0;
        }
      });
      granTotal += esp.items_deficit_equiv || 0;
    });

    return { porDepto: sums, granTotal };
  }, [especialidadesFiltradas]);

  const especialidadSeleccionada = useMemo(() => {
    return especialidades.find((e) => e.id === selectedEspId) || especialidades[0];
  }, [especialidades, selectedEspId]);

  // Departamentos activos para la especialidad seleccionada o para el total
  const departamentosGrafico = useMemo(() => {
    if (!especialidadSeleccionada) return [];
    if (filtroDepto === 'TODOS') return especialidadSeleccionada.departamentos;
    return especialidadSeleccionada.departamentos.filter((d) => d.departamento === filtroDepto);
  }, [especialidadSeleccionada, filtroDepto]);

  // ─── Exportación a CSV ────────────────────────────────────────────────────────
  const handleExportCSV = useCallback(() => {
    const headers = [
      'ID',
      'Especialidad Oficial',
      'Hora Base BD',
      'Carga Horaria',
      'Horas Planilla',
      'Deficit Horas',
      'Items Requeridos',
      'Cobertura %',
      'UEs Afectadas'
    ];
    const rows = especialidades.map((e) => [
      e.id,
      `"${e.nombre}"`,
      e.hora_item,
      e.carga_horaria,
      e.horas_planilla,
      e.deficit_horas,
      e.items_deficit_equiv,
      `${e.pct_cobertura}%`,
      e.ues_afectadas
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const link = document.createElement('a');
    link.setAttribute('href', encodeURI(csvContent));
    link.setAttribute('download', 'deficit_docente_sie_materia.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }, [especialidades]);

  return (
    <div ref={containerRef} className={isFullscreen ? 'bg-white overflow-y-auto p-6 space-y-6 h-full' : 'space-y-6'}>
      {/* ═══════════════════════════════════════════════════════════════
          RIBBON DE KPIS EJECUTIVOS GLOBALES (UIE / SIE UE)
      ═══════════════════════════════════════════════════════════════ */}
      {/* ─── Banner Fullscreen ─────────────────────────────────────────────────── */}
      {isFullscreen && (
        <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-900 text-white px-5 py-3 rounded-2xl shadow-xl border border-slate-800 animate-fadeIn">
          <div className="flex items-center gap-3">
            <span className="text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-md bg-indigo-500/20 text-indigo-300 border border-indigo-400/30">
              Pantalla Completa (F11)
            </span>
            <span className="text-sm font-bold text-white">
              {vistaModo === 'heatmap' && 'Matriz de Calor (22 Esp × 9 Deptos)'}
              {vistaModo === 'barras' && 'Gráficos Comparativos Duales'}
              {vistaModo === 'tabla' && 'Tabla Analítica Completa'}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowKpisInFullscreen((prev) => !prev)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors border border-slate-700"
            >
              <Eye className="w-3.5 h-3.5 text-indigo-400" />
              <span>{showKpisInFullscreen ? 'Ocultar KPIs' : 'Ver KPIs'}</span>
            </button>

            <button
              type="button"
              onClick={() => handleFullscreen()}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-rose-600 hover:bg-rose-500 text-white transition-colors shadow-sm"
              title="Salir de pantalla completa (o tecla Esc)"
            >
              <Minimize2 className="w-3.5 h-3.5" />
              <span>Salir (Esc)</span>
            </button>
          </div>
        </div>
      )}

      {(!isFullscreen || showKpisInFullscreen) && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
          <div className="bg-white rounded-2xl p-4 border border-slate-200/90 shadow-2xs flex flex-col justify-between">
            <div className="flex items-center justify-between text-slate-500">
              <span className="text-[11px] font-bold uppercase tracking-wider">Déficit Total Horas</span>
              <span className="p-1.5 rounded-lg bg-rose-50 text-rose-600 border border-rose-100">
                <TrendingDown className="w-4 h-4" />
              </span>
            </div>
            <div className="mt-2">
              <span className="text-2xl font-black text-rose-600 tracking-tight">
                {totalesPais.deficit_horas.toLocaleString('es-BO')}
              </span>
              <span className="text-[11px] text-slate-400 font-semibold block mt-0.5">
                Horas de aula sin cubrir (Octubre 2026)
              </span>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-4 border border-slate-200/90 shadow-2xs flex flex-col justify-between">
            <div className="flex items-center justify-between text-slate-500">
              <span className="text-[11px] font-bold uppercase tracking-wider">Ítems Necesarios</span>
              <span className="p-1.5 rounded-lg bg-indigo-50 text-indigo-600 border border-indigo-100">
                <Scale className="w-4 h-4" />
              </span>
            </div>
            <div className="mt-2">
              <span className="text-2xl font-black text-indigo-900 tracking-tight">
                {totalesPais.items_deficit_equiv.toLocaleString('es-BO')}
              </span>
              <span className="text-[11px] text-indigo-600 font-bold block mt-0.5">
                Calculados a 88h/108h oficiales BD
              </span>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-4 border border-slate-200/90 shadow-2xs flex flex-col justify-between">
            <div className="flex items-center justify-between text-slate-500">
              <span className="text-[11px] font-bold uppercase tracking-wider">UEs con Déficit</span>
              <span className="p-1.5 rounded-lg bg-amber-50 text-amber-700 border border-amber-100">
                <Building2 className="w-4 h-4" />
              </span>
            </div>
            <div className="mt-2">
              <span className="text-2xl font-black text-slate-900 tracking-tight">
                {totalesPais.total_ues_afectadas.toLocaleString('es-BO')}
              </span>
              <span className="text-[11px] text-slate-400 font-semibold block mt-0.5">
                Unidades Educativas del SIE
              </span>
            </div>
          </div>


        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════
          BARRA DE CONTROL Y MODOS DINÁMICOS
      ═══════════════════════════════════════════════════════════════ */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        {/* Pestañas de Vista Dinámica */}
        <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl">
          <button
            type="button"
            onClick={() => setVistaModo('heatmap')}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${vistaModo === 'heatmap'
              ? 'bg-white text-indigo-900 shadow-2xs'
              : 'text-slate-600 hover:text-slate-900'
              }`}
          >
            <Grid className="w-3.5 h-3.5 text-indigo-600" />
            <span>Matriz de Calor (22 Esp × 9 Deptos)</span>
          </button>

          <button
            type="button"
            onClick={() => setVistaModo('barras')}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${vistaModo === 'barras'
              ? 'bg-white text-indigo-900 shadow-2xs'
              : 'text-slate-600 hover:text-slate-900'
              }`}
          >
            <BarChart3 className="w-3.5 h-3.5 text-emerald-600" />
            <span>Gráficos Comparativos Duales</span>
          </button>

          <button
            type="button"
            onClick={() => setVistaModo('tabla')}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${vistaModo === 'tabla'
              ? 'bg-white text-indigo-900 shadow-2xs'
              : 'text-slate-600 hover:text-slate-900'
              }`}
          >
            <BookOpen className="w-3.5 h-3.5 text-purple-600" />
            <span>Tabla Analítica</span>
          </button>
        </div>

        {/* Filtros de Nivel, Orden y Buscador */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Selector de Nivel Pedagógico */}
          <select
            value={filtroNivel}
            onChange={(e) => setFiltroNivel(e.target.value)}
            className="text-xs bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-semibold text-slate-700"
            title="Filtrar por Nivel Pedagógico"
          >
            <option value="TODOS">Todos los Niveles</option>
            <option value="INICIAL">Nivel Inicial</option>
            <option value="PRIMARIA">Nivel Primaria</option>
            <option value="SECUNDARIA">Nivel Secundaria</option>
            <option value="TECNICA">Técnica Tecnológica</option>
            <option value="ESPECIAL">Educación Especial</option>
          </select>

          {/* Selector de Orden */}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="text-xs bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-semibold text-slate-700"
            title="Criterio de ordenación"
          >
            <option value="nivel">Ordenar: Nivel (Inicial → Primaria → Sec → Téc)</option>
            <option value="deficit">Ordenar: Déficit Horas (Desc)</option>
            <option value="items">Ordenar: Ítems Requeridos (Desc)</option>
            <option value="cobertura">Ordenar: Menor Cobertura %</option>
            <option value="nombre">Ordenar: Alfabético</option>
          </select>

          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Buscar especialidad..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="text-xs bg-slate-50 border border-slate-200 rounded-xl pl-8 pr-3 py-1.5 w-40 sm:w-48 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white font-medium"
            />
          </div>

          <button
            type="button"
            onClick={() => fetchData()}
            disabled={isRefreshing}
            title="Sincronizar en tiempo real con Filtros de Materia (CRUD)"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-slate-50 text-slate-700 border border-slate-200 hover:bg-slate-100 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-indigo-600 ${isRefreshing ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">{isRefreshing ? 'Sincronizando...' : 'En vivo'}</span>
          </button>

          <button
            type="button"
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-200 hover:bg-indigo-100 transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            <span>CSV</span>
          </button>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════
          VISTA 1: MATRIZ DE CALOR 2D (HEATMAP 22 ESP × 9 DEPTOS)
      ═══════════════════════════════════════════════════════════════ */}
      {vistaModo === 'heatmap' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 space-y-4 animate-fadeIn">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
            <div>
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Grid className="w-4 h-4 text-indigo-600" />
                Matriz de Calor: Déficit de Ítems Docentes por Especialidad y Departamento
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-50 text-emerald-700 border border-emerald-200">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Tiempo Real (CRUD)
                </span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Celdas coloreadas por intensidad de déficit de ítems requeridos (base de horas oficial BD). Pasa el mouse para ver horas o haz clic para drill-down.
              </p>
            </div>

            {/* Leyenda de Intensidad + Botón Pantalla Completa */}
            <div className="flex flex-wrap items-center gap-2 text-[11px] font-bold text-slate-600">
              <span>Intensidad:</span>
              <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200">0 ítems</span>
              <span className="px-2 py-0.5 rounded bg-amber-100 text-amber-900 border border-amber-200">1 - 25</span>
              <span className="px-2 py-0.5 rounded bg-orange-200 text-orange-950 border border-orange-300">26 - 100</span>
              <span className="px-2 py-0.5 rounded bg-rose-500 text-white font-bold">101 - 200</span>
              <span className="px-2 py-0.5 rounded bg-red-950 text-rose-100 font-black ring-1 ring-rose-900 shadow-xs">&gt; 200 crítico severo</span>


            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 font-extrabold text-[10px] uppercase tracking-wider">
                  <th className="py-2.5 px-3 sticky left-0 bg-slate-50 dark:bg-slate-900 z-10 w-72 border-r border-slate-200 dark:border-slate-800">Especialidad Oficial ESFM</th>
                  <th className="py-2.5 px-2 text-center text-slate-400 dark:text-slate-500">Base BD</th>
                  <th className="py-2.5 px-2 text-center">CH</th>
                  <th className="py-2.5 px-2 text-center">LP</th>
                  <th className="py-2.5 px-2 text-center">CB</th>
                  <th className="py-2.5 px-2 text-center">OR</th>
                  <th className="py-2.5 px-2 text-center">PT</th>
                  <th className="py-2.5 px-2 text-center">TJ</th>
                  <th className="py-2.5 px-2 text-center">SC</th>
                  <th className="py-2.5 px-2 text-center">BN</th>
                  <th className="py-2.5 px-2 text-center">PD</th>
                  <th className="py-2 px-2 text-center text-indigo-900 dark:text-indigo-200 bg-indigo-50/70 dark:bg-indigo-950/80 font-black w-20 text-[10px]">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {especialidadesFiltradas.map((esp) => {
                  const isSelected = esp.id === selectedEspId;
                  const nivelInfo = getNivelEspecialidad(esp.id, esp.nombre);

                  return (
                    <tr
                      key={esp.id}
                      onClick={() => setSelectedEspId(esp.id)}
                      className={`cursor-pointer transition-all ${isSelected
                        ? 'bg-indigo-50/50 dark:bg-indigo-950/40 shadow-xs'
                        : 'hover:bg-slate-50/80 dark:hover:bg-slate-800/60'
                        }`}
                    >
                      <td
                        className={`py-2 px-3 font-bold sticky left-0 z-20 whitespace-nowrap flex items-center justify-between gap-2 border-r transition-colors ${isSelected
                          ? 'bg-indigo-100 dark:bg-indigo-950 text-indigo-950 dark:text-indigo-100 border-r-indigo-400 dark:border-r-indigo-700 border-l-[6px] border-l-indigo-600 border-t-2 border-b-2 border-t-indigo-600 border-b-indigo-600 shadow-xs font-black'
                          : 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 border-r-slate-100 dark:border-r-slate-800 border-b border-slate-100 dark:border-b-slate-800'
                          }`}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <span
                            className={`text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded border shrink-0 ${nivelInfo.badgeColor.bg} ${nivelInfo.badgeColor.text} ${nivelInfo.badgeColor.border}`}
                          >
                            {nivelInfo.nivelCodigo === 'INICIAL'
                              ? 'Inicial'
                              : nivelInfo.nivelCodigo === 'PRIMARIA'
                                ? 'Primaria'
                                : nivelInfo.nivelCodigo === 'SECUNDARIA'
                                  ? 'Secundaria'
                                  : nivelInfo.nivelCodigo === 'TECNICA'
                                    ? 'Técnica'
                                    : 'Especial'}
                          </span>
                          <span className="truncate max-w-[200px]" title={esp.nombre}>
                            {esp.nombre}
                          </span>
                        </div>
                        {isSelected && (
                          <span className="w-2.5 h-2.5 rounded-full bg-indigo-600 animate-pulse shrink-0 ring-4 ring-indigo-300" title="Seleccionada" />
                        )}
                      </td>
                      <td className={`py-2 px-2 text-center font-mono text-xs font-bold border-r transition-colors ${isSelected
                        ? 'border-t-2 border-b-2 border-indigo-600 bg-indigo-100/60 dark:bg-indigo-950/60 text-indigo-950 dark:text-indigo-200 border-r-indigo-200 dark:border-r-indigo-800'
                        : 'text-slate-500 dark:text-slate-400 border-r-slate-100 dark:border-r-slate-800 border-b border-slate-100 dark:border-b-slate-800'
                        }`}>
                        {esp.hora_item}h
                      </td>

                      {esp.departamentos.map((dept) => {
                        const items = dept.items_deficit_equiv;
                        let bgClass = 'bg-slate-50 text-slate-400';
                        if (items > 200) bgClass = 'bg-red-950 text-rose-100 font-black shadow-xs ring-1 ring-rose-900';
                        else if (items > 100) bgClass = 'bg-rose-500 text-white font-black shadow-2xs';
                        else if (items >= 25) bgClass = 'bg-orange-200 text-orange-950 font-bold';
                        else if (items > 0) bgClass = 'bg-amber-100 text-amber-900 font-semibold';

                        return (
                          <td
                            key={dept.departamento_id}
                            className={`py-1 px-1 text-center transition-colors ${isSelected
                              ? 'border-t-2 border-b-2 border-indigo-600 bg-indigo-50/50 dark:bg-indigo-950/40'
                              : 'border-b border-slate-100 dark:border-b-slate-800'
                              }`}
                            onMouseEnter={() =>
                              setHoverCell({
                                espNombre: esp.nombre,
                                depto: dept.departamento,
                                items: dept.items_deficit_equiv,
                                defHoras: dept.deficit_horas,
                                cob: dept.pct_cobertura
                              })
                            }
                            onMouseLeave={() => setHoverCell(null)}
                          >
                            <div className={`py-1 rounded text-xs font-mono font-black transition-transform hover:scale-105 shadow-2xs ${bgClass}`}>
                              {items > 0 ? items : '—'}
                            </div>
                          </td>
                        );
                      })}

                      <td className={`py-1.5 px-2 text-center font-mono font-black text-[13px] w-20 transition-colors ${isSelected
                        ? 'border-t-2 border-b-2 border-indigo-600 bg-indigo-200 dark:bg-indigo-900 text-indigo-950 dark:text-white shadow-xs'
                        : 'bg-indigo-50/60 dark:bg-indigo-950/50 text-indigo-900 dark:text-indigo-300 border-b border-slate-100 dark:border-b-slate-800'
                        }`}>
                        {esp.items_deficit_equiv.toLocaleString('es-BO')}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot className="bg-slate-900 text-white font-black text-xs border-t-2 border-slate-800">
                <tr>
                  <td className="py-2.5 px-3 sticky left-0 z-10 bg-slate-900 text-amber-300 uppercase tracking-wider font-black border-r border-slate-800">
                    Total Déficit Ítems
                  </td>
                  <td className="py-2 px-2 text-center text-slate-400 font-mono border-r border-slate-800">—</td>
                  {totalesHeatmapDeptos.porDepto.map((d) => (
                    <td key={d.id} className="py-2 px-1 text-center font-mono font-bold text-slate-100 border-r border-slate-800 text-xs">
                      {d.totalItems.toLocaleString('es-BO')}
                    </td>
                  ))}
                  <td className="py-2 px-2 text-center font-mono font-black text-amber-300 text-[13px] bg-slate-950 w-20">
                    {totalesHeatmapDeptos.granTotal.toLocaleString('es-BO')}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>

          {/* Tooltip Dinámico Flotante en Footer */}
          {hoverCell && (
            <div className="bg-slate-900 text-white text-xs p-3 rounded-xl flex items-center justify-between shadow-lg animate-fadeIn">
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-amber-400" />
                <span>
                  <strong>{hoverCell.espNombre}</strong> en <strong>{hoverCell.depto}</strong>
                </span>
              </div>
              <div className="flex items-center gap-4">
                <span>Déficit: <strong>{hoverCell.defHoras.toLocaleString('es-BO')} hrs</strong></span>
                <span className="text-amber-400 font-bold">Ítems requeridos: {hoverCell.items}</span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════
          VISTA 2: GRÁFICOS COMPARATIVOS DUALES (ESPECIALIDAD + DEPTOS)
      ═══════════════════════════════════════════════════════════════ */}
      {vistaModo === 'barras' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 animate-fadeIn">
          {/* Panel Izquierdo: Ranking Nacional de Especialidades (6 cols) */}
          <div className="lg:col-span-6 bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <BarChart3 className="w-4 h-4 text-rose-600" />
                  Déficit Nacional por Especialidad
                </h4>
                <p className="text-xs text-slate-500 mt-0.5">
                  Haz clic en cualquier barra para enfocar sus 9 departamentos.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono font-bold text-slate-500">
                  {especialidadesFiltradas.length} Esp.
                </span>
              </div>
            </div>

            <div className="space-y-2.5 max-h-[500px] overflow-y-auto pr-2">
              {(() => {
                const maxDef = Math.max(...especialidadesFiltradas.map((e) => e.deficit_horas), 100);

                return especialidadesFiltradas.map((esp) => {
                  const pctWidth = (esp.deficit_horas / maxDef) * 100;
                  const isSelected = esp.id === selectedEspId;

                  return (
                    <div
                      key={esp.id}
                      onClick={() => setSelectedEspId(esp.id)}
                      className={`p-2.5 rounded-xl border transition-all cursor-pointer ${isSelected
                        ? 'bg-rose-50/70 border-rose-300 shadow-2xs'
                        : 'bg-white border-slate-100 hover:border-slate-300'
                        }`}
                    >
                      <div className="flex items-center justify-between text-xs mb-1.5">
                        <span className="font-bold text-slate-900 truncate max-w-[280px]" title={esp.nombre}>
                          {esp.nombre}
                        </span>
                        <div className="flex items-center gap-2">
                          <span className="text-slate-500 font-mono text-[11px]">
                            {esp.deficit_horas.toLocaleString('es-BO')}h
                          </span>
                          <span className="px-2 py-0.5 rounded-md bg-rose-100 text-rose-800 text-[10px] font-black">
                            {esp.items_deficit_equiv} ítems
                          </span>
                        </div>
                      </div>

                      <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-500 bg-rose-500"
                          style={{ width: `${Math.max(2, pctWidth)}%` }}
                        />
                      </div>
                    </div>
                  );
                });
              })()}
            </div>
          </div>

          {/* Panel Derecho: Desglose Departamental de la Especialidad Seleccionada (6 cols) */}
          <div className="lg:col-span-6 bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
              <div>
                <span className="text-[10px] font-black uppercase text-indigo-600 tracking-wider">
                  Especialidad Activa
                </span>
                <h4 className="text-sm font-black text-slate-900 line-clamp-1">
                  {especialidadSeleccionada.nombre}
                </h4>
                <p className="text-xs text-slate-500 mt-0.5">
                  Base Oficial: <strong>{especialidadSeleccionada.hora_item} hrs/ítem</strong> · Total:{' '}
                  <strong>{especialidadSeleccionada.items_deficit_equiv} ítems</strong> ({especialidadSeleccionada.deficit_horas.toLocaleString('es-BO')} hrs)
                </p>
              </div>

              {/* Selector de Modo de Escala: Porcentual vs Horas Absolutas */}
              <div className="flex items-center gap-1.5 self-start sm:self-auto">
                <div className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200 text-[10px] font-bold">
                  <button
                    type="button"
                    onClick={() => setDeptoEscalaModo('porcentaje')}
                    className={`px-2 py-1 rounded transition-all ${deptoEscalaModo === 'porcentaje'
                      ? 'bg-white text-indigo-900 shadow-2xs font-extrabold'
                      : 'text-slate-600 hover:text-slate-900'
                      }`}
                    title="Misma altura para los 9 departamentos (100% de su carga horaria). Permite ver con total nitidez departamentos pequeños y grandes."
                  >
                    % Cobertura (100%)
                  </button>
                  <button
                    type="button"
                    onClick={() => setDeptoEscalaModo('absoluto')}
                    className={`px-2 py-1 rounded transition-all ${deptoEscalaModo === 'absoluto'
                      ? 'bg-white text-indigo-900 shadow-2xs font-extrabold'
                      : 'text-slate-600 hover:text-slate-900'
                      }`}
                    title="Altura proporcional al volumen de horas requeridas (con piso mínimo visible)."
                  >
                    Horas Reales
                  </button>
                </div>
              </div>
            </div>

            {/* Leyenda Semántica */}
            <div className="flex flex-wrap items-center justify-between gap-2 pt-0.5 text-[11px]">
              <div className="flex items-center gap-3 text-slate-600 font-semibold">
                <span className="flex items-center gap-1">
                  <span className="w-2.5 h-2.5 rounded bg-emerald-500" /> Planilla (cubierto)
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2.5 h-2.5 rounded bg-rose-500" /> Déficit (falta)
                </span>
                <span className="flex items-center gap-1 text-slate-400">
                  <span className="w-2.5 h-2.5 rounded bg-slate-200" /> Carga total requerida
                </span>
              </div>
              <span className="text-[10px] text-slate-400 font-mono italic">
                {deptoEscalaModo === 'porcentaje' ? 'Escala 100% normalizada' : 'Escala proporcional en horas'}
              </span>
            </div>

            {/* Gráfico SVG de Barras para los 9 Departamentos */}
            <div className="w-full select-none pt-2">
              {(() => {
                const SVG_W = 500;
                const SVG_H = 260;
                const PAD = { top: 28, bottom: 48, left: 45, right: 15 };
                const plotW = SVG_W - PAD.left - PAD.right;
                const plotH = SVG_H - PAD.top - PAD.bottom;
                const maxVal = Math.max(...especialidadSeleccionada.departamentos.map((d) => d.carga_horaria), 50);
                const stepX = plotW / especialidadSeleccionada.departamentos.length;
                const barW = Math.min(stepX * 0.58, 26);
                const isPct = deptoEscalaModo === 'porcentaje';
                const barUniformeH = plotH * 0.88;

                return (
                  <svg viewBox={`0 0 ${SVG_W} ${SVG_H}`} className="w-full h-auto">
                    {/* Ticks horizontales y líneas guía */}
                    {isPct ? (
                      [0, 25, 50, 75, 100].map((pct) => {
                        const y = PAD.top + plotH - (pct / 100) * barUniformeH;
                        return (
                          <g key={`pct-tick-${pct}`}>
                            <line x1={PAD.left} y1={y} x2={PAD.left + plotW} y2={y} stroke="#F1F5F9" strokeDasharray="3,3" />
                            <text x={PAD.left - 6} y={y + 3} fill="#94A3B8" fontSize={8} fontWeight="bold" textAnchor="end">
                              {pct}%
                            </text>
                          </g>
                        );
                      })
                    ) : (
                      [0, 0.25, 0.5, 0.75, 1.0].map((p) => {
                        const val = Math.round(maxVal * p);
                        const y = PAD.top + plotH - (val / maxVal) * plotH;
                        return (
                          <g key={`depto-tick-${p}`}>
                            <line x1={PAD.left} y1={y} x2={PAD.left + plotW} y2={y} stroke="#F1F5F9" strokeDasharray="3,3" />
                            <text x={PAD.left - 6} y={y + 3} fill="#94A3B8" fontSize={8} fontWeight="bold" textAnchor="end">
                              {val.toLocaleString('es-BO')}
                            </text>
                          </g>
                        );
                      })
                    )}

                    {/* Eje X */}
                    <line x1={PAD.left} y1={PAD.top + plotH} x2={PAD.left + plotW} y2={PAD.top + plotH} stroke="#CBD5E1" strokeWidth={1} />

                    {/* Barras por Departamento */}
                    {especialidadSeleccionada.departamentos.map((d, i) => {
                      const cx = PAD.left + i * stepX + stepX / 2;

                      // Cálculo de alturas según el modo de escala activo
                      let hCarga: number;
                      let hPlan: number;
                      let hDef: number;
                      let yCarga: number;

                      if (isPct) {
                        // Modo 100% Normalizado: Todas las barras tienen la misma altura máxima
                        hCarga = barUniformeH;
                        yCarga = PAD.top + plotH - hCarga;
                        hPlan = Math.round((d.pct_cobertura / 100) * hCarga);
                        hDef = hCarga - hPlan;
                      } else {
                        // Modo Horas Reales: Proporcional con piso mínimo de 16px para legibilidad de departamentos pequeños
                        const rawH = (d.carga_horaria / maxVal) * plotH;
                        hCarga = d.carga_horaria > 0 ? Math.max(16, rawH) : 2;
                        yCarga = PAD.top + plotH - hCarga;
                        const ratio = d.carga_horaria > 0 ? d.horas_planilla / d.carga_horaria : 0;
                        hPlan = Math.min(hCarga, Math.round(ratio * hCarga));
                        hDef = hCarga - hPlan;
                      }

                      const isHovered = hoverDepto?.departamento_id === d.departamento_id;

                      return (
                        <g
                          key={d.departamento_id}
                          className="cursor-pointer group"
                          onMouseEnter={() => setHoverDepto(d)}
                          onMouseLeave={() => setHoverDepto(null)}
                        >
                          {/* Resaltado de fondo en Hover */}
                          {isHovered && (
                            <rect
                              x={cx - stepX / 2 + 2}
                              y={PAD.top}
                              width={stepX - 4}
                              height={plotH + 40}
                              fill="#EEF2F6"
                              rx={6}
                              opacity={0.6}
                            />
                          )}

                          {/* Base de la Barra (Carga Horaria Requerida) */}
                          <rect
                            x={cx - barW / 2}
                            y={yCarga}
                            width={barW}
                            height={hCarga}
                            rx={3}
                            fill="#E2E8F0"
                            stroke={isHovered ? '#6366F1' : 'none'}
                            strokeWidth={isHovered ? 1.5 : 0}
                          />

                          {/* Segmento Déficit (Rojo) — ARRIBA */}
                          {hDef > 0 && (
                            <rect
                              x={cx - barW / 2}
                              y={yCarga}
                              width={barW}
                              height={hDef}
                              rx={3}
                              fill="#F43F5E"
                              opacity={isHovered ? 1 : 0.9}
                            />
                          )}

                          {/* Segmento Planilla (Verde) — ABAJO apilado */}
                          {hPlan > 0 && (
                            <rect
                              x={cx - barW / 2}
                              y={yCarga + hDef}
                              width={barW}
                              height={hPlan}
                              rx={3}
                              fill="#10B981"
                              opacity={isHovered ? 1 : 0.9}
                            />
                          )}

                          {/* Badge de Ítems Faltantes */}
                          <text
                            x={cx}
                            y={yCarga - 5}
                            fill={d.deficit_horas > 0 ? '#BE123C' : '#047857'}
                            fontSize={7.5}
                            fontWeight="900"
                            textAnchor="middle"
                          >
                            {d.items_deficit_equiv > 0 ? `${d.items_deficit_equiv}it` : '✓'}
                          </text>

                          {/* Abreviatura del Departamento */}
                          <text
                            x={cx}
                            y={PAD.top + plotH + 14}
                            fill={isHovered ? '#0F172A' : '#334155'}
                            fontSize={8.5}
                            fontWeight={isHovered ? '900' : 'bold'}
                            textAnchor="middle"
                          >
                            {d.departamento.slice(0, 3).toUpperCase()}
                          </text>

                          {/* % Cobertura */}
                          <text
                            x={cx}
                            y={PAD.top + plotH + 26}
                            fill={d.pct_cobertura >= 80 ? '#059669' : d.pct_cobertura >= 50 ? '#D97706' : '#E11D48'}
                            fontSize={7.5}
                            fontWeight="bold"
                            textAnchor="middle"
                          >
                            {d.pct_cobertura}%
                          </text>
                        </g>
                      );
                    })}
                  </svg>
                );
              })()}
            </div>

            {/* Banner Interactivo de Detalle Departamental al Pasar el Cursor */}
            <div className="min-h-[44px]">
              {hoverDepto ? (
                <div className="bg-slate-900 text-white text-xs px-3.5 py-2.5 rounded-xl flex items-center justify-between shadow-md border border-slate-800 animate-fadeIn">
                  <div className="flex items-center gap-2">
                    <MapPin className="w-3.5 h-3.5 text-amber-400" />
                    <span className="font-extrabold text-white uppercase tracking-wide">
                      {hoverDepto.departamento}
                    </span>
                  </div>
                  <div className="flex items-center gap-4 text-[11px] font-mono">
                    <span>Carga: <strong className="text-slate-200">{hoverDepto.carga_horaria.toLocaleString('es-BO')}h</strong></span>
                    <span className="text-emerald-400">Planilla: <strong>{hoverDepto.horas_planilla.toLocaleString('es-BO')}h ({hoverDepto.pct_cobertura}%)</strong></span>
                    <span className="text-rose-400">Déficit: <strong>{hoverDepto.deficit_horas.toLocaleString('es-BO')}h</strong> ({hoverDepto.items_deficit_equiv} ítems)</span>
                  </div>
                </div>
              ) : (
                <div className="bg-slate-50 border border-dashed border-slate-200 text-slate-400 text-xs px-3 py-2 rounded-xl flex items-center justify-between">
                  <span className="text-[11px] italic">Pasa el cursor sobre cualquier departamento para ver horas exactas e ítems requeridos.</span>
                  <span className="text-[10px] font-mono font-semibold uppercase text-slate-400">9 Departamentos</span>
                </div>
              )}
            </div>

            {/* Sub-panel: Desglose por Materias Curriculares de Aula */}
            {especialidadSeleccionada.materias_breakdown.length > 0 && (
              <div className="pt-3 border-t border-slate-100">
                <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block mb-2">
                  Asignaturas Curriculares de Aula en el SIE:
                </span>
                <div className="grid grid-cols-2 gap-2 max-h-36 overflow-y-auto">
                  {especialidadSeleccionada.materias_breakdown.map((m, idx) => (
                    <div key={idx} className="p-2 rounded-lg bg-slate-50 border border-slate-100 text-xs flex justify-between items-center">
                      <span className="font-semibold text-slate-800 truncate max-w-[130px]" title={m.materia}>
                        {m.materia}
                      </span>
                      <span className="font-mono font-bold text-rose-700 text-[11px]">
                        {m.deficit_horas.toLocaleString('es-BO')}h def.
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════
          VISTA 3: TABLA ANALÍTICA COMPLETA
      ═══════════════════════════════════════════════════════════════ */}
      {vistaModo === 'tabla' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden animate-fadeIn">
          <div className="p-5 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-purple-600" />
                Matriz Consolidada de Especialidades Oficiales ESFM
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Auditoría completa de horas trabajadas vs horas planilla y cálculo de ítems sobre la base oficial de horas de cada especialidad.
              </p>
            </div>

          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 text-slate-600 font-extrabold uppercase text-[10px] tracking-wider border-b border-slate-200">
                <tr>
                  <th className="py-3 px-3 cursor-pointer" onClick={() => { setSortBy('nombre'); setSortAsc(!sortAsc); }}>
                    Especialidad Oficial {sortBy === 'nombre' && (sortAsc ? '▲' : '▼')}
                  </th>
                  <th className="py-3 px-3 text-center">Hora Base BD</th>
                  <th className="py-3 px-3 text-right cursor-pointer" onClick={() => { setSortBy('deficit'); setSortAsc(!sortAsc); }}>
                    Carga Horaria
                  </th>
                  <th className="py-3 px-3 text-right">Horas Planilla</th>
                  <th className="py-3 px-3 text-right cursor-pointer text-rose-700" onClick={() => { setSortBy('deficit'); setSortAsc(!sortAsc); }}>
                    Déficit Horas {sortBy === 'deficit' && (sortAsc ? '▲' : '▼')}
                  </th>
                  <th className="py-3 px-3 text-right text-indigo-700 bg-indigo-50 font-black cursor-pointer" onClick={() => { setSortBy('items'); setSortAsc(!sortAsc); }}>
                    Ítems Requeridos {sortBy === 'items' && (sortAsc ? '▲' : '▼')}
                  </th>
                  <th className="py-3 px-3 text-center cursor-pointer" onClick={() => { setSortBy('cobertura'); setSortAsc(!sortAsc); }}>
                    % Cobertura {sortBy === 'cobertura' && (sortAsc ? '▲' : '▼')}
                  </th>
                  <th className="py-3 px-3 text-right">UEs Afectadas</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {especialidadesFiltradas.map((e) => (
                  <tr key={e.id} className="hover:bg-slate-50">
                    <td className="py-2.5 px-3 font-bold text-slate-900">{e.nombre}</td>
                    <td className="py-2.5 px-3 text-center font-mono text-slate-500">{e.hora_item}h</td>
                    <td className="py-2.5 px-3 text-right font-mono text-slate-700">{e.carga_horaria.toLocaleString('es-BO')}</td>
                    <td className="py-2.5 px-3 text-right font-mono text-emerald-700">{e.horas_planilla.toLocaleString('es-BO')}</td>
                    <td className="py-2.5 px-3 text-right font-mono font-bold text-rose-700">{e.deficit_horas.toLocaleString('es-BO')}</td>
                    <td className="py-2.5 px-3 text-right font-mono font-black text-indigo-700 bg-indigo-50">
                      {e.items_deficit_equiv.toLocaleString('es-BO')} ítems
                    </td>
                    <td className="py-2.5 px-3 text-center font-mono font-bold">
                      <span className={`px-2 py-0.5 rounded-full text-[11px] ${e.pct_cobertura >= 90 ? 'bg-emerald-50 text-emerald-800' : 'bg-amber-50 text-amber-900'
                        }`}>
                        {e.pct_cobertura}%
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono text-slate-600">{e.ues_afectadas.toLocaleString('es-BO')}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-slate-100 font-black text-slate-900 border-t-2 border-slate-300">
                <tr>
                  <td className="py-3 px-3 uppercase text-[11px]" colSpan={2}>Total País Consolidado</td>
                  <td className="py-3 px-3 text-right font-mono">{totalesPais.carga_horaria.toLocaleString('es-BO')}</td>
                  <td className="py-3 px-3 text-right font-mono text-emerald-800">{totalesPais.horas_planilla.toLocaleString('es-BO')}</td>
                  <td className="py-3 px-3 text-right font-mono text-rose-800">{totalesPais.deficit_horas.toLocaleString('es-BO')}</td>
                  <td className="py-3 px-3 text-right font-mono text-indigo-900 bg-indigo-100">
                    {totalesPais.items_deficit_equiv.toLocaleString('es-BO')} ítems
                  </td>
                  <td className="py-3 px-3 text-center font-mono">{totalesPais.pct_cobertura}%</td>
                  <td className="py-3 px-3 text-right font-mono">{totalesPais.total_ues_afectadas.toLocaleString('es-BO')}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
