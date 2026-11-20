'use client';

import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import egresadosData from '@/data/egresados_esfm_proyeccion.json';
import {
  getNivelEspecialidad,
  sortEspecialidadesPorNivel,
  NivelCodigo,
  NIVELES_CONFIG,
  NivelInfo
} from '@/lib/constants/especialidadNiveles';
import {
  GraduationCap,
  Users,
  TrendingDown,
  Award,
  AlertCircle,
  CheckCircle2,
  Sliders,
  Download,
  BarChart3,
  Building2,
  Layers,
  Search,
  Maximize2,
  Minimize2,
  HelpCircle,
  ShieldAlert,
  ArrowRight,
  MapPin
} from 'lucide-react';

interface CohorteItem {
  gestion_ingreso: number;
  gestion_egreso: number;
  anio_academico_actual: string;
  total_inscritos: number;
  por_dpto: Record<string, number>;
  por_esp?: Record<string, number>;
}

interface DepartamentoItem {
  departamento_id: number;
  departamento: string;
  total_inscritos_2022_2026: number;
  items_deficit_matriz: number;
  deficit_horas_matriz: number;
  cohortes_inscritos: Record<string, number>;
  egresos_anuales_base82?: Record<string, number>;
}

interface EspecialidadItem {
  especialidad_id: number;
  nombre: string;
  hora_item: number;
  total_inscritos_2022_2026: number;
  items_deficit_matriz: number;
  deficit_horas_matriz: number;
  cobertura_actual_sie: number;
  dictamen: string;
  color: string;
  badge: string;
  justificacion: string;
  cohortes_inscritos: Record<string, number>;
  por_dpto: Record<string, number>;
  cohortes_por_dpto?: Record<string, Record<string, number>>;
}

export default function EgresadosProyeccionView() {
  // ─── Estados Interactivos ───────────────────────────────────────────────────
  const [tasaAbandono, setTasaAbandono] = useState<number>(18); // Default 18% histórica DGFM
  const [filtroDepto, setFiltroDepto] = useState<string>('TODOS');
  const [filtroNivel, setFiltroNivel] = useState<string>('TODOS');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [subModo, setSubModo] = useState<'cohortes' | 'especialidades'>('especialidades');
  const [selectedEspId, setSelectedEspId] = useState<number | null>(null);

  // Fullscreen Nativo
  const containerRef = useRef<HTMLDivElement>(null);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);

  useEffect(() => {
    const handler = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', handler);
    return () => document.removeEventListener('fullscreenchange', handler);
  }, []);

  const handleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen().catch(() => { });
    } else {
      document.exitFullscreen().catch(() => { });
    }
  }, []);

  const tasaTitulacion = useMemo(() => 100 - tasaAbandono, [tasaAbandono]);
  const factorTit = useMemo(() => tasaTitulacion / 100, [tasaTitulacion]);
  const factorMerma = useMemo(() => tasaAbandono / 100, [tasaAbandono]);

  // ─── Estado Reactivo y Sincronización en Tiempo Real con Filtros CRUD ────────
  const [data, setData] = useState(egresadosData);

  const fetchEgresados = useCallback(async () => {
    try {
      const res = await fetch(`/api/egresados-proyeccion?t=${Date.now()}`, { cache: 'no-store' });
      if (res.ok) {
        const fresh = await res.json();
        setData(fresh);
      }
    } catch (_) { }
  }, []);

  useEffect(() => {
    fetchEgresados();

    let bc: BroadcastChannel | null = null;
    if (typeof BroadcastChannel !== 'undefined') {
      try {
        bc = new BroadcastChannel('sie_deficit_channel');
        bc.onmessage = (event) => {
          if (event.data?.type === 'UPDATED') fetchEgresados();
        };
      } catch (_) { }
    }

    const onCustomEvent = () => fetchEgresados();
    window.addEventListener('sie-deficit-updated', onCustomEvent);

    return () => {
      bc?.close();
      window.removeEventListener('sie-deficit-updated', onCustomEvent);
    };
  }, [fetchEgresados]);

  const cohortes: CohorteItem[] = (data.cohortes || []) as CohorteItem[];
  const departamentos: DepartamentoItem[] = (data.departamentos || []) as DepartamentoItem[];
  const especialidades: EspecialidadItem[] = (data.especialidades || []) as EspecialidadItem[];

  // ─── Cálculos Dinámicos por Cohorte ─────────────────────────────────────────
  const cohortesCalculadas = useMemo(() => {
    return cohortes
      .filter((c) => c.gestion_ingreso >= 2022) // Horizonte de egreso 2027–2031
      .map((c) => {
        let inscritos = c.total_inscritos;
        if (filtroDepto !== 'TODOS') {
          const altDepto = filtroDepto === 'POTOSI' ? 'POTOSÍ' : (filtroDepto === 'POTOSÍ' ? 'POTOSI' : filtroDepto);
          inscritos = c.por_dpto[filtroDepto] ?? c.por_dpto[altDepto] ?? 0;
        }

        const egresados = Math.round(inscritos * factorTit);
        const merma = inscritos - egresados;

        return {
          ...c,
          inscritosFiltrados: inscritos,
          egresadosCalculados: egresados,
          mermaCalculada: merma
        };
      });
  }, [cohortes, filtroDepto, factorTit]);

  // ─── Totales Nacionales Dinámicos ───────────────────────────────────────────
  const totalesDinamicos = useMemo(() => {
    const totalInscritos = cohortesCalculadas.reduce((acc, c) => acc + c.inscritosFiltrados, 0);
    const totalEgresados = cohortesCalculadas.reduce((acc, c) => acc + c.egresadosCalculados, 0);
    const totalMerma = totalInscritos - totalEgresados;

    // Déficit real de la Matriz de Calor (SIE UE)
    let deficitTotalMatriz = data.totales_nacionales?.total_deficit_items_matriz || 0;
    if (filtroDepto !== 'TODOS') {
      const dFound = departamentos.find((d) => d.departamento === filtroDepto) as any;
      deficitTotalMatriz = dFound?.items_deficit_matriz || 0;
    }

    const balance = totalEgresados - deficitTotalMatriz;

    return {
      totalInscritos,
      totalEgresados,
      totalMerma,
      deficitTotalMatriz,
      balance
    };
  }, [cohortesCalculadas, departamentos, filtroDepto]);

  // ─── Especialidades Filtradas y Ordenadas por Nivel ─────────────────────────
  const especialidadesFiltradas = useMemo(() => {
    const mapeadas = especialidades
      .filter((esp) => {
        const nivelInfo = getNivelEspecialidad(esp.especialidad_id, esp.nombre);
        if (filtroNivel !== 'TODOS' && nivelInfo.nivelCodigo !== filtroNivel) return false;
        if (searchQuery.trim() && !esp.nombre.toLowerCase().includes(searchQuery.toLowerCase())) return false;
        return true;
      })
      .map((esp) => {
        const nivelInfo = getNivelEspecialidad(esp.especialidad_id, esp.nombre);
        let inscritos = esp.total_inscritos_2022_2026;
        let deficitMatriz = esp.items_deficit_matriz;
        let cohortesInscritos = esp.cohortes_inscritos;

        if (filtroDepto !== 'TODOS') {
          // Normalizar tilde para compatibilidad ('POTOSI' vs 'POTOSÍ')
          const altDepto = filtroDepto === 'POTOSI' ? 'POTOSÍ' : (filtroDepto === 'POTOSÍ' ? 'POTOSI' : filtroDepto);
          inscritos = esp.por_dpto[filtroDepto] ?? esp.por_dpto[altDepto] ?? 0;

          const deptoCohortes = (esp.cohortes_por_dpto && (esp.cohortes_por_dpto[filtroDepto] || esp.cohortes_por_dpto[altDepto])) || null;
          if (deptoCohortes) {
            cohortesInscritos = deptoCohortes;
          } else {
            cohortesInscritos = { '2027': 0, '2028': 0, '2029': 0, '2030': 0, '2031': 0 };
          }
        }

        const egresados = Math.round(inscritos * factorTit);
        const merma = inscritos - egresados;
        const balance = egresados - deficitMatriz;

        return {
          ...esp,
          nivelInfo,
          total_inscritos_2022_2026: inscritos,
          cohortes_inscritos: cohortesInscritos,
          inscritosDinamicos: inscritos,
          egresadosDinamicos: egresados,
          mermaDinamica: merma,
          deficitMatriz,
          balance
        };
      });

    return sortEspecialidadesPorNivel(mapeadas);
  }, [especialidades, filtroNivel, searchQuery, filtroDepto, factorTit]);

  const GESTIONES_EGRESO = ['2027', '2028', '2029', '2030', '2031'] as const;

  // Estilos temáticos de cuadro y jerarquía por Nivel Educativo Oficial
  const NIVEL_ESTILOS: Record<string, { franja: string; borderLeft: string; badge: string; textNivel: string }> = {
    INICIAL: {
      franja: 'bg-pink-100/90 text-pink-950 border-pink-300',
      borderLeft: 'border-l-4 border-l-pink-500 bg-pink-50/20',
      badge: 'bg-pink-100 text-pink-800 border-pink-300',
      textNivel: 'Inicial'
    },
    PRIMARIA: {
      franja: 'bg-blue-100/90 text-blue-950 border-blue-300',
      borderLeft: 'border-l-4 border-l-blue-500 bg-blue-50/20',
      badge: 'bg-blue-100 text-blue-800 border-blue-300',
      textNivel: 'Primaria'
    },
    SECUNDARIA: {
      franja: 'bg-emerald-100/90 text-emerald-950 border-emerald-300',
      borderLeft: 'border-l-4 border-l-emerald-500 bg-emerald-50/20',
      badge: 'bg-emerald-100 text-emerald-800 border-emerald-300',
      textNivel: 'Secundaria'
    },
    TECNICA: {
      franja: 'bg-amber-100/90 text-amber-950 border-amber-300',
      borderLeft: 'border-l-4 border-l-amber-500 bg-amber-50/20',
      badge: 'bg-amber-100 text-amber-900 border-amber-300',
      textNivel: 'Técnica'
    },
    ESPECIAL: {
      franja: 'bg-purple-100/90 text-purple-950 border-purple-300',
      borderLeft: 'border-l-4 border-l-purple-500 bg-purple-50/20',
      badge: 'bg-purple-100 text-purple-800 border-purple-300',
      textNivel: 'Especial'
    }
  };

  // Diferenciación de cantidades de estudiantes por rangos térmicos de color con números grandes
  const renderCantidadBadge = (cant: number) => {
    if (!cant || cant === 0) {
      return <span className="text-slate-300 font-mono font-medium text-sm">—</span>;
    }
    if (cant < 100) {
      return (
        <span className="inline-block min-w-[3.5rem] px-2 py-0.5 rounded-md font-mono font-bold text-sm bg-slate-100 text-slate-700 border border-slate-300/80 shadow-2xs">
          {cant.toLocaleString('es-BO')}
        </span>
      );
    }
    if (cant < 250) {
      return (
        <span className="inline-block min-w-[3.5rem] px-2 py-0.5 rounded-md font-mono font-bold text-sm bg-sky-50 text-sky-800 border border-sky-300/80 shadow-2xs">
          {cant.toLocaleString('es-BO')}
        </span>
      );
    }
    if (cant < 500) {
      return (
        <span className="inline-block min-w-[3.5rem] px-2 py-0.5 rounded-md font-mono font-black text-sm bg-indigo-50 text-indigo-800 border border-indigo-300/80 shadow-2xs">
          {cant.toLocaleString('es-BO')}
        </span>
      );
    }
    if (cant < 800) {
      return (
        <span className="inline-block min-w-[3.5rem] px-2 py-0.5 rounded-md font-mono font-black text-sm bg-emerald-50 text-emerald-800 border border-emerald-300 shadow-2xs">
          {cant.toLocaleString('es-BO')}
        </span>
      );
    }
    return (
      <span className="inline-block min-w-[3.5rem] px-2 py-0.5 rounded-md font-mono font-black text-sm bg-amber-100 text-amber-950 border border-amber-400 shadow-xs">
        {cant.toLocaleString('es-BO')}
      </span>
    );
  };

  // ─── Agrupación por Nivel Oficial (Inicial -> Primaria -> Secundaria -> Técnica -> Especial)
  const especialidadesPorNivel = useMemo(() => {
    const ordenNiveles = ['INICIAL', 'PRIMARIA', 'SECUNDARIA', 'TECNICA', 'ESPECIAL'];
    return ordenNiveles
      .map((cod) => {
        const items = especialidadesFiltradas.filter((e) => e.nivelInfo.nivelCodigo === cod);
        if (items.length === 0) return null;
        return {
          nivelCodigo: cod,
          nivelNombre: items[0].nivelInfo.nivelNombre,
          badgeColor: items[0].nivelInfo.badgeColor,
          items
        };
      })
      .filter((g): g is NonNullable<typeof g> => g !== null);
  }, [especialidadesFiltradas]);

  // ─── Totales Consolidados por Gestión de Egreso ────────────────────────────
  const totalesGestiones = useMemo(() => {
    const t: Record<string, number> = {
      '2027': 0,
      '2028': 0,
      '2029': 0,
      '2030': 0,
      '2031': 0,
      total: 0
    };
    especialidadesFiltradas.forEach((esp) => {
      GESTIONES_EGRESO.forEach((g) => {
        const val = esp.cohortes_inscritos?.[g] || 0;
        t[g] += val;
        t.total += val;
      });
    });
    return t;
  }, [especialidadesFiltradas]);

  // ─── Departamentos Filtrados ───────────────────────────────────────────────
  const departamentosCalculados = useMemo(() => {
    return departamentos.map((d) => {
      const inscritos = d.total_inscritos_2022_2026;
      const egresados = Math.round(inscritos * factorTit);
      const merma = inscritos - egresados;

      return {
        ...d,
        inscritos,
        egresados,
        merma
      };
    });
  }, [departamentos, factorTit]);

  // ─── Exportar CSV (Formato por Gestión de Egreso) ───────────────────────────
  const handleExportCSV = useCallback(() => {
    const headers = [
      'Nivel',
      'Especialidad Oficial ESFM',
      'Base BD (Horas)',
      '2027',
      '2028',
      '2029',
      '2030',
      '2031',
      'Total País'
    ];
    const rows = especialidadesFiltradas.map((e) => [
      `"${e.nivelInfo.nivelNombre}"`,
      `"${e.nombre}"`,
      `"${e.hora_item ? `${e.hora_item}h` : ''}"`,
      e.cohortes_inscritos?.['2027'] || 0,
      e.cohortes_inscritos?.['2028'] || 0,
      e.cohortes_inscritos?.['2029'] || 0,
      e.cohortes_inscritos?.['2030'] || 0,
      e.cohortes_inscritos?.['2031'] || 0,
      e.total_inscritos_2022_2026
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const link = document.createElement('a');
    link.setAttribute('href', encodeURI(csvContent));
    link.setAttribute('download', `egresados_por_especialidad_gestion_2027_2031.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }, [especialidadesFiltradas]);

  return (
    <div ref={containerRef} className={isFullscreen ? 'bg-white overflow-y-auto p-6 space-y-6 h-full' : 'space-y-6'}>
      {/* ─── Banner Fullscreen ─────────────────────────────────────────────────── */}

      {/* ═══════════════════════════════════════════════════════════════
          RIBBON DE KPIS EJECUTIVOS GLOBALES
      ═══════════════════════════════════════════════════════════════ */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
        {/* KPI 1: Inscritos Totales Activos */}
        <div className="bg-white rounded-2xl p-4 border border-slate-200/90 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-[11px] font-bold uppercase tracking-wider">Inscritos en Aulas ESFM</span>
            <span className="p-1.5 rounded-lg bg-indigo-50 text-indigo-600 border border-indigo-100">
              <Users className="w-4 h-4" />
            </span>
          </div>
          <div className="mt-2">
            <span className="text-2xl font-black text-slate-900 tracking-tight">
              {totalesDinamicos.totalInscritos.toLocaleString('es-BO')}
            </span>
            <span className="text-[11px] text-slate-400 font-semibold block mt-0.5">
              Cohortes activas 2022–2026 (5 años)
            </span>
          </div>
        </div>

        {/* KPI 2: Merma por Abandono */}
        <div className="bg-white rounded-2xl p-4 border border-rose-200/90 bg-rose-50/20 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-rose-700">
            <span className="text-[11px] font-bold uppercase tracking-wider">Merma por Abandono</span>
            <span className="p-1.5 rounded-lg bg-rose-100 text-rose-700 border border-rose-200">
              <TrendingDown className="w-4 h-4" />
            </span>
          </div>
          <div className="mt-2">
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-black text-rose-600 tracking-tight">
                -{totalesDinamicos.totalMerma.toLocaleString('es-BO')}
              </span>
              <span className="text-xs font-black text-rose-700">({tasaAbandono}%)</span>
            </div>
            <span className="text-[11px] text-slate-400 font-semibold block mt-0.5">
              Deserción y rezago académico simulado
            </span>
          </div>
        </div>

        {/* KPI 3: Egresados Proyectados */}
        <div className="bg-white rounded-2xl p-4 border border-emerald-200/90 bg-emerald-50/20 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-emerald-800">
            <span className="text-[11px] font-bold uppercase tracking-wider">Egresados Efectivos</span>
            <span className="p-1.5 rounded-lg bg-emerald-100 text-emerald-700 border border-emerald-200">
              <Award className="w-4 h-4" />
            </span>
          </div>
          <div className="mt-2">
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-black text-emerald-700 tracking-tight">
                {totalesDinamicos.totalEgresados.toLocaleString('es-BO')}
              </span>
              <span className="text-xs font-black text-emerald-800">({tasaTitulacion}%)</span>
            </div>
            <span className="text-[11px] text-emerald-600 font-bold block mt-0.5">
              Nuevos docentes titulados hacia 2031
            </span>
          </div>
        </div>

        {/* KPI 4: Déficit Real de Ítems Docentes (Matriz de Calor SIE) */}
        <div className="bg-white rounded-2xl p-4 border border-rose-200/90 bg-rose-50/10 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-rose-700">
            <span className="text-[11px] font-bold uppercase tracking-wider">Déficit Ítems (Matriz SIE)</span>
            <span className="p-1.5 rounded-lg bg-rose-100 text-rose-700 border border-rose-200">
              <Building2 className="w-4 h-4" />
            </span>
          </div>
          <div className="mt-2">
            <span className="text-2xl font-black text-rose-700 tracking-tight">
              {totalesDinamicos.deficitTotalMatriz.toLocaleString('es-BO')}
            </span>
            <span className="text-[11px] text-slate-500 font-semibold block mt-0.5">
              Ítems requeridos en aula (Matriz de Calor)
            </span>
          </div>
        </div>

        {/* KPI 5: Balance Oferta vs Déficit */}
        <div className={`bg-white rounded-2xl p-4 border shadow-2xs flex flex-col justify-between ${totalesDinamicos.balance >= 0
          ? 'border-amber-200 bg-amber-50/20'
          : 'border-emerald-200 bg-emerald-50/20'
          }`}>
          <div className="flex items-center justify-between text-slate-700">
            <span className="text-[11px] font-bold uppercase tracking-wider">Balance Oferta vs Déficit</span>
            <span className={`p-1.5 rounded-lg ${totalesDinamicos.balance >= 0 ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'
              }`}>
              {totalesDinamicos.balance >= 0 ? <AlertCircle className="w-4 h-4" /> : <ShieldAlert className="w-4 h-4" />}
            </span>
          </div>
          <div className="mt-2">
            <div className="flex items-baseline gap-2">
              <span className={`text-2xl font-black tracking-tight ${totalesDinamicos.balance >= 0 ? 'text-amber-800' : 'text-emerald-700'
                }`}>
                {totalesDinamicos.balance >= 0 ? `+${totalesDinamicos.balance.toLocaleString('es-BO')}` : totalesDinamicos.balance.toLocaleString('es-BO')}
              </span>
              <span className="text-[10px] font-extrabold uppercase text-slate-500">
                {totalesDinamicos.balance >= 0 ? 'Excedente Egresados' : 'Déficit sin Cubrir'}
              </span>
            </div>
            <span className="text-[11px] text-slate-500 font-medium block mt-0.5">
              {totalesDinamicos.balance >= 0
                ? 'Sobreoferta acumulada respecto al déficit SIE'
                : 'Faltan egresados para cubrir el déficit SIE'}
            </span>
          </div>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════
          SLIDER DE CONTROL DINÁMICO: TASA DE ABANDONO (WHAT-IF)
      ═══════════════════════════════════════════════════════════════ */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-100 pb-4">
          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-800 text-[11px] font-black uppercase tracking-wider border border-indigo-200">
              <Sliders className="w-3.5 h-3.5 text-indigo-600" />
              Simulador de Tasa de Abandono y Deserción
            </div>
            <h3 className="text-base font-black text-slate-900 tracking-tight mt-1">
              ¿Cómo afecta la merma de estudiantes al volumen real de nuevos maestros titulados?
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              La DGFM registra históricamente una tasa de titulación del 82% (18% de abandono). Ajusta el control para simular diferentes escenarios de graduación.
            </p>
          </div>

          {/* Selector de Presets de Abandono */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-500 hidden sm:inline">Escenarios:</span>
            {[
              { label: 'Bajo Abandono (12%)', val: 12 },
              { label: 'Oficial DGFM (18%)', val: 18 },
              { label: 'Alto Abandono (25%)', val: 25 }
            ].map((preset) => (
              <button
                key={preset.val}
                type="button"
                onClick={() => setTasaAbandono(preset.val)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all ${tasaAbandono === preset.val
                  ? 'bg-indigo-600 text-white border-indigo-600 shadow-2xs'
                  : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                  }`}
              >
                {preset.label}
              </button>
            ))}
          </div>
        </div>

        {/* Control Deslizante Interactivo */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
          <div className="md:col-span-8 space-y-2">
            <div className="flex justify-between items-center text-xs font-bold text-slate-700">
              <span className="flex items-center gap-1.5">
                <TrendingDown className="w-4 h-4 text-rose-500" />
                Tasa de Abandono y Deserción Simulado:
              </span>
              <span className="text-base font-black text-rose-600 font-mono">
                {tasaAbandono}% de merma
              </span>
            </div>
            <input
              type="range"
              min="5"
              max="35"
              step="1"
              value={tasaAbandono}
              onChange={(e) => setTasaAbandono(Number(e.target.value))}
              className="w-full accent-rose-600 cursor-pointer h-2 bg-slate-100 rounded-lg"
            />
            <div className="flex justify-between text-[10px] text-slate-400 font-bold">
              <span>5% (Mínimo teórico)</span>
              <span>18% (Promedio Histórico Oficial DGFM)</span>
              <span>35% (Estrés severo)</span>
            </div>
          </div>

          <div className="md:col-span-4 bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-2 text-xs">
            <div className="flex justify-between items-center">
              <span className="text-slate-600 font-medium">Tasa de Titulación Neta:</span>
              <strong className="text-emerald-700 font-mono font-black text-sm">{tasaTitulacion}%</strong>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-600 font-medium">Factor de Conversión:</span>
              <strong className="text-indigo-700 font-mono font-bold">×{factorTit.toFixed(2)} por inscrito</strong>
            </div>
          </div>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════
          BARRA DE CONTROL, FILTROS Y VISTAS
      ═══════════════════════════════════════════════════════════════ */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        {/* Pestañas de Vista */}
        <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl">
          <button
            type="button"
            onClick={() => setSubModo('especialidades')}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${subModo === 'especialidades'
              ? 'bg-white text-indigo-900 shadow-2xs font-extrabold'
              : 'text-slate-600 hover:text-slate-900'
              }`}
          >
            <BarChart3 className="w-3.5 h-3.5 text-emerald-600" />
            <span>Por Especialidad y Gestión de Egreso</span>
          </button>

          <button
            type="button"
            onClick={() => setSubModo('cohortes')}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${subModo === 'cohortes'
              ? 'bg-white text-indigo-900 shadow-2xs font-extrabold'
              : 'text-slate-600 hover:text-slate-900'
              }`}
          >
            <Layers className="w-3.5 h-3.5 text-indigo-600" />
            <span>Cascada de Cohortes (2022–2026)</span>
          </button>
        </div>

        {/* Filtro de Departamento y Botones */}
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={filtroDepto}
            onChange={(e) => setFiltroDepto(e.target.value)}
            className="text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="TODOS">Todos los Departamentos</option>
            {departamentos.map((d) => (
              <option key={d.departamento_id} value={d.departamento}>
                {d.departamento}
              </option>
            ))}
          </select>

          <button
            type="button"
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-200 hover:bg-indigo-100 transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Exportar CSV</span>
          </button>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════
          VISTA 1: CASCADA DE COHORTES (2022 A 2026 -> EGRESO 2027 A 2031)
      ═══════════════════════════════════════════════════════════════ */}
      {subModo === 'cohortes' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 space-y-6 animate-fadeIn">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
            <div>
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Layers className="w-4 h-4 text-indigo-600" />
                Flujo de Cohortes Activas: Inscripción Inicial vs Merma de Abandono vs Egresados Titulados
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Seguimiento de las 5 cohortes en formación en las 46 ESFM hacia sus respectivas gestiones de graduación (2027–2031).
              </p>
            </div>

            <div className="flex items-center gap-3 text-xs font-semibold text-slate-600">
              <span className="flex items-center gap-1">
                <span className="w-3 h-3 rounded bg-emerald-500" /> Titulados ({tasaTitulacion}%)
              </span>
              <span className="flex items-center gap-1">
                <span className="w-3 h-3 rounded bg-rose-400" /> Merma ({tasaAbandono}%)
              </span>
            </div>
          </div>

          {/* Gráfico SVG de Cohortes */}
          <div className="w-full select-none pt-2">
            {(() => {
              const SVG_W = 600;
              const SVG_H = 240;
              const PAD = { top: 25, bottom: 45, left: 55, right: 20 };
              const plotW = SVG_W - PAD.left - PAD.right;
              const plotH = SVG_H - PAD.top - PAD.bottom;
              const maxInsc = Math.max(...cohortesCalculadas.map((c) => c.inscritosFiltrados), 100);
              const stepX = plotW / cohortesCalculadas.length;
              const barW = Math.min(stepX * 0.52, 42);

              return (
                <svg viewBox={`0 0 ${SVG_W} ${SVG_H}`} className="w-full h-auto">
                  {/* Ticks horizontales */}
                  {[0, 0.25, 0.5, 0.75, 1.0].map((p) => {
                    const val = Math.round(maxInsc * p);
                    const y = PAD.top + plotH - (val / maxInsc) * plotH;
                    return (
                      <g key={`cohorte-tick-${p}`}>
                        <line x1={PAD.left} y1={y} x2={PAD.left + plotW} y2={y} stroke="#F1F5F9" strokeDasharray="3,3" />
                        <text x={PAD.left - 8} y={y + 3} fill="#94A3B8" fontSize={8.5} fontWeight="bold" textAnchor="end">
                          {val.toLocaleString('es-BO')}
                        </text>
                      </g>
                    );
                  })}

                  <line x1={PAD.left} y1={PAD.top + plotH} x2={PAD.left + plotW} y2={PAD.top + plotH} stroke="#CBD5E1" strokeWidth={1} />

                  {/* Barras Apiladas por Cohorte */}
                  {cohortesCalculadas.map((c, i) => {
                    const cx = PAD.left + i * stepX + stepX / 2;
                    const hTotal = Math.max(4, (c.inscritosFiltrados / maxInsc) * plotH);
                    const yTop = PAD.top + plotH - hTotal;

                    const hEgr = Math.round(hTotal * factorTit);
                    const hMerma = hTotal - hEgr;

                    return (
                      <g key={c.gestion_ingreso} className="cursor-pointer group">
                        {/* Segmento Merma (Rojo/Ámbar) — Arriba */}
                        {hMerma > 0 && (
                          <rect
                            x={cx - barW / 2}
                            y={yTop}
                            width={barW}
                            height={hMerma}
                            rx={3}
                            fill="#FB7185"
                            className="transition-opacity group-hover:opacity-90"
                          />
                        )}

                        {/* Segmento Titulados (Verde) — Abajo */}
                        {hEgr > 0 && (
                          <rect
                            x={cx - barW / 2}
                            y={yTop + hMerma}
                            width={barW}
                            height={hEgr}
                            rx={3}
                            fill="#10B981"
                            className="transition-opacity group-hover:opacity-90"
                          />
                        )}

                        {/* Total Inscritos sobre la barra */}
                        <text
                          x={cx}
                          y={yTop - 6}
                          fill="#0F172A"
                          fontSize={9}
                          fontWeight="900"
                          textAnchor="middle"
                        >
                          {c.inscritosFiltrados.toLocaleString('es-BO')}
                        </text>

                        {/* Detalle Egresados dentro de la barra si hay altura */}
                        {hEgr > 20 && (
                          <text
                            x={cx}
                            y={yTop + hMerma + hEgr / 2 + 3}
                            fill="#FFFFFF"
                            fontSize={8}
                            fontWeight="bold"
                            textAnchor="middle"
                          >
                            {c.egresadosCalculados.toLocaleString('es-BO')}
                          </text>
                        )}

                        {/* Etiqueta X: Cohorte y Egreso */}
                        <text
                          x={cx}
                          y={PAD.top + plotH + 15}
                          fill="#1E293B"
                          fontSize={9.5}
                          fontWeight="bold"
                          textAnchor="middle"
                        >
                          Ingreso {c.gestion_ingreso}
                        </text>
                        <text
                          x={cx}
                          y={PAD.top + plotH + 28}
                          fill="#059669"
                          fontSize={8.5}
                          fontWeight="900"
                          textAnchor="middle"
                        >
                          Egr. {c.gestion_egreso} ({c.anio_academico_actual})
                        </text>
                      </g>
                    );
                  })}
                </svg>
              );
            })()}
          </div>

          {/* Tarjetas de Desglose Rápido por Cohorte */}
          <div className="grid grid-cols-1 sm:grid-cols-5 gap-3 pt-2">
            {cohortesCalculadas.map((c) => (
              <div key={c.gestion_ingreso} className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 space-y-2">
                <div className="flex justify-between items-center text-xs">
                  <span className="font-bold text-slate-800">Cohorte {c.gestion_ingreso}</span>
                  <span className="px-2 py-0.5 rounded bg-indigo-100 text-indigo-800 font-black text-[10px]">
                    {c.anio_academico_actual}
                  </span>
                </div>
                <div className="text-[11px] space-y-1 font-mono">
                  <div className="flex justify-between text-slate-600">
                    <span>Inscritos:</span>
                    <strong>{c.inscritosFiltrados.toLocaleString('es-BO')}</strong>
                  </div>
                  <div className="flex justify-between text-rose-600">
                    <span>Merma ({tasaAbandono}%):</span>
                    <strong>-{c.mermaCalculada.toLocaleString('es-BO')}</strong>
                  </div>
                  <div className="flex justify-between text-emerald-700 font-bold border-t border-slate-200 pt-1">
                    <span>Egresan {c.gestion_egreso}:</span>
                    <span>+{c.egresadosCalculados.toLocaleString('es-BO')}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════
          VISTA: PROYECCIÓN POR ESPECIALIDAD OFICIAL Y GESTIÓN DE EGRESO
      ═══════════════════════════════════════════════════════════════ */}
      {subModo === 'especialidades' && (
        <div className="bg-white rounded-2xl border border-slate-300 shadow-xs overflow-hidden animate-fadeIn space-y-0">
          {/* Cabecera de Control y Leyenda de Colores */}
          <div className="p-4 sm:p-5 border-b border-slate-200 flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-slate-50/70">
            <div>
              <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-emerald-600" />
                Estudiantes por Especialidad Oficial ESFM y Gestión de Egreso (2027–2031)
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Cuadro institucional consolidado por nivel educativo y volumen de estudiantes en formación activa.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2.5">

              {/* Buscador */}
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Buscar especialidad..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="text-xs bg-white border border-slate-300 rounded-xl pl-8 pr-3 py-1.5 w-44 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
                />
              </div>

              {/* Filtro Nivel */}
              <select
                value={filtroNivel}
                onChange={(e) => setFiltroNivel(e.target.value)}
                className="text-xs bg-white border border-slate-300 rounded-xl px-2.5 py-1.5 font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="TODOS">Todos los Niveles</option>
                <option value="INICIAL">Nivel Inicial</option>
                <option value="PRIMARIA">Nivel Primaria</option>
                <option value="SECUNDARIA">Nivel Secundaria</option>
                <option value="TECNICA">Técnica Tecnológica</option>
                <option value="ESPECIAL">Educación Especial</option>
              </select>
            </div>
          </div>

          {/* Barra de Leyenda de Rango de Colores */}
          <div className="px-4 py-2 bg-slate-100/70 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2 text-[11px]">
            <span className="font-extrabold text-slate-600 uppercase tracking-wider text-[10px]">
              Escala de concentración por cohorte:
            </span>
            <div className="flex flex-wrap items-center gap-3 font-mono text-[10px]">
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded bg-slate-100 border border-slate-300 inline-block" />
                <span className="text-slate-600 font-sans">&lt;100 (Bajo)</span>
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded bg-sky-100 border border-sky-300 inline-block" />
                <span className="text-sky-900 font-sans font-semibold">100–249</span>
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded bg-indigo-100 border border-indigo-300 inline-block" />
                <span className="text-indigo-900 font-sans font-semibold">250–499</span>
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded bg-emerald-100 border border-emerald-300 inline-block" />
                <span className="text-emerald-900 font-sans font-bold">500–799</span>
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded bg-amber-200 border border-amber-400 inline-block" />
                <span className="text-amber-950 font-sans font-black">≥800 (Masivo)</span>
              </span>
            </div>
          </div>

          {/* Cuadrícula Institucional con bordes delimitados */}
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left border-collapse">
              <thead className="bg-slate-800 text-white font-extrabold uppercase text-[10px] tracking-wider">
                <tr>
                  <th className="py-2.5 px-3 border-r border-slate-700">Especialidad Oficial ESFM</th>
                  <th className="py-2.5 px-1.5 text-center w-16 border-r border-slate-700">Base BD</th>
                  <th className="py-2.5 px-1.5 text-center w-20 border-r border-slate-700">2027</th>
                  <th className="py-2.5 px-1.5 text-center w-20 border-r border-slate-700">2028</th>
                  <th className="py-2.5 px-1.5 text-center w-20 border-r border-slate-700">2029</th>
                  <th className="py-2.5 px-1.5 text-center w-20 border-r border-slate-700">2030</th>
                  <th className="py-2.5 px-1.5 text-center w-20 border-r border-slate-700">2031</th>
                  <th className="py-2.5 px-1.5 text-center w-20 bg-slate-900 text-amber-300 font-black">Total</th>
                </tr>
              </thead>
              <tbody>
                {especialidadesPorNivel.map((grupo) => {
                  const estilo = NIVEL_ESTILOS[grupo.nivelCodigo] || {
                    franja: 'bg-slate-100 text-slate-900 border-slate-300',
                    borderLeft: 'border-l-4 border-l-slate-400 bg-slate-50/20',
                    badge: 'bg-slate-100 text-slate-800 border-slate-300',
                    textNivel: grupo.nivelNombre
                  };

                  return (
                    <React.Fragment key={grupo.nivelCodigo}>
                      {/* Fila Encabezado de Nivel en Bloque/Cuadro Coloreado */}
                      <tr className={`${estilo.franja} border-t-2 border-b-2 font-black uppercase tracking-wider text-[11px]`}>
                        <td colSpan={8} className="py-2.5 px-3.5 border-r border-slate-300">
                          <div className="flex items-center justify-between">
                            <span className="flex items-center gap-2">
                              <span className="w-2.5 h-2.5 rounded-full bg-current opacity-80" />
                              <span>{grupo.nivelNombre}</span>
                            </span>
                            <span className="text-[10px] font-bold opacity-80 lowercase tracking-normal">
                              ({grupo.items.length} {grupo.items.length === 1 ? 'especialidad' : 'especialidades'})
                            </span>
                          </div>
                        </td>
                      </tr>

                      {/* Filas de Especialidades con recuadro, badge y línea activa de selección */}
                      {grupo.items.map((esp) => {
                        const tot = esp.total_inscritos_2022_2026;
                        const isSelected = esp.especialidad_id === selectedEspId;

                        return (
                          <tr
                            key={esp.especialidad_id}
                            onClick={() => setSelectedEspId(isSelected ? null : esp.especialidad_id)}
                            className={`cursor-pointer transition-all ${isSelected
                              ? 'bg-indigo-50/70 shadow-xs'
                              : 'hover:bg-slate-50/80'
                              }`}
                          >
                            {/* Celda de Especialidad como cuadro delimitado con badge y línea viva */}
                            <td
                              className={`py-2 px-3 border-r transition-colors ${isSelected
                                ? 'bg-indigo-100 text-indigo-950 border-r-indigo-300 border-l-[6px] border-l-indigo-600 border-t-2 border-b-2 border-t-indigo-600 border-b-indigo-600 font-black shadow-xs'
                                : `border-b border-slate-200 text-slate-900 ${estilo.borderLeft}`
                                }`}
                            >
                              <div className="flex items-center justify-between gap-2">
                                <div className="flex items-center gap-2">
                                  <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider border shrink-0 ${estilo.badge}`}>
                                    {estilo.textNivel}
                                  </span>
                                  <span className="font-bold text-slate-900 text-xs">
                                    {esp.nombre}
                                  </span>
                                </div>
                                {isSelected && (
                                  <span className="w-2.5 h-2.5 rounded-full bg-indigo-600 animate-pulse shrink-0 ring-4 ring-indigo-300" title="Seleccionada" />
                                )}
                              </div>
                            </td>

                            {/* Base Horas */}
                            <td className={`py-2 px-1.5 text-center border-r transition-colors ${isSelected
                              ? 'border-t-2 border-b-2 border-indigo-600 bg-indigo-100/60 text-indigo-950 border-r-indigo-200 font-bold'
                              : 'border-b border-slate-200 text-slate-500'
                              }`}>
                              <span className="inline-block px-2 py-0.5 rounded bg-slate-100 font-mono text-[11px] font-bold text-slate-700 border border-slate-200">
                                {esp.hora_item ? `${esp.hora_item}h` : '—'}
                              </span>
                            </td>

                            {/* Columnas por Gestión con badges de color térmico y números grandes */}
                            {GESTIONES_EGRESO.map((g) => {
                              const cant = esp.cohortes_inscritos?.[g] || 0;
                              return (
                                <td
                                  key={g}
                                  className={`py-1.5 px-1.5 text-center border-r transition-colors ${isSelected
                                    ? 'border-t-2 border-b-2 border-indigo-600 bg-indigo-50/50 border-r-indigo-200'
                                    : 'border-b border-slate-200'
                                    }`}
                                >
                                  {renderCantidadBadge(cant)}
                                </td>
                              );
                            })}

                            {/* Total Compacto con números grandes */}
                            <td className={`py-1.5 px-1.5 text-center transition-colors w-20 ${isSelected
                              ? 'border-t-2 border-b-2 border-indigo-600 bg-indigo-200/90 text-indigo-950 shadow-xs'
                              : 'border-b border-slate-200 bg-slate-50/60'
                              }`}>
                              {tot > 0 ? (
                                <span className="inline-block min-w-[3.2rem] px-2 py-0.5 rounded-md font-mono font-black text-sm bg-slate-900 text-white shadow-2xs">
                                  {tot.toLocaleString('es-BO')}
                                </span>
                              ) : (
                                <span className="text-slate-300 font-mono text-xs">—</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </React.Fragment>
                  );
                })}
              </tbody>
              <tfoot className="bg-slate-900 text-white font-black text-xs border-t-2 border-slate-800">
                <tr>
                  <td className="py-2.5 px-3 uppercase tracking-wider font-black border-r border-slate-800 text-amber-300 text-xs">
                    Total Consolidado
                  </td>
                  <td className="py-2.5 px-1.5 text-center border-r border-slate-800 text-slate-400 w-16">—</td>
                  {GESTIONES_EGRESO.map((g) => (
                    <td key={g} className="py-2.5 px-1.5 text-center font-mono font-black border-r border-slate-800 text-slate-100 text-[13px] w-20">
                      {totalesGestiones[g].toLocaleString('es-BO')}
                    </td>
                  ))}
                  <td className="py-2.5 px-1.5 text-center font-mono text-amber-300 font-black text-sm bg-slate-950 w-20">
                    {totalesGestiones.total.toLocaleString('es-BO')}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
