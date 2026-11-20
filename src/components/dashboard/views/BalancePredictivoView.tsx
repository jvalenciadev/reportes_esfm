'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  Scale,
  Search,
  Filter,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CheckCircle2,
  Users,
  GraduationCap,
  Sparkles,
  Layers,
  ArrowRight,
  SlidersHorizontal,
  ChevronDown,
  ChevronUp,
  ChevronRight,
  FileSpreadsheet,
  Building2,
  HelpCircle,
  MapPin,
  UserMinus,
  UserCheck,
  RefreshCw,
  BookOpen,
  Info,
  ArrowLeftRight,
  Wrench,
  Calculator
} from 'lucide-react';
import { getNivelEspecialidad, NivelCodigo, NIVELES_CONFIG } from '@/lib/constants/especialidadNiveles';

// ─── Interfaces ──────────────────────────────────────────────────────────────

interface MetricasEspecialidad {
  deficit_materia: number;
  horas_bth_bolsa?: number;
  items_bth_bolsa?: number;
  jubilacion: number;
  prejubilacion: number;
  egresados_2027_2031: number;
  egresados_local?: number;
  egresados_bolsa_nacional?: number;
  egresados_radicacion_real?: number;
  egresados_local_calc?: number;
  egresados_radicacion_calc?: number;
  egresados_bolsa_calc?: number;
  total_docentes: number;
  alta_v: number;
  media_a: number;
  baja_n: number;
  sin_pert: number;
  pct_alta: number;
  reemplazo_nopert: number;
  migracion_salientes: number;
  migracion_entrantes: number;
  saldo_migratorio: number;
  crecimiento_arima_pct: number;
  demanda_total: number;
  brecha_neta: number;
}

interface EspecialidadBalance {
  especialidad_id: number;
  nombre: string;
  hora_item: number;
  nivel_codigo: string;
  nivel_nombre: string;
  orden_jerarquia: number;
  nacional: MetricasEspecialidad;
  por_departamento: Record<string, MetricasEspecialidad>;
}

interface BalancePayload {
  departamentos: string[];
  crecimiento_arima_por_depto: Record<string, number>;
  migracion_departamental: Record<string, { entrantes: number; salientes: number; continuos?: number }>;
  kpis_migracion?: {
    entrantes: number;
    salientes: number;
    continuos: number;
    tasa_renovacion_pct: number;
    migraciones_inter_depto: number;
  };
  metadata_bth?: {
    total_horas_bth_sie: number;
    especialidades_bth_count: number;
    horas_por_especialidad_nacional: number;
    distribucion_departamental: Record<string, number>;
  };
  especialidades: EspecialidadBalance[];
}

const BTH_SPECIALTY_IDS = new Set([7, 13, 14, 15, 16, 18, 21, 22]);

export function BalancePredictivoView() {
  const [data, setData] = useState<BalancePayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filtros de navegación
  const [filtroDepto, setFiltroDepto] = useState<string>('TODOS');
  const [filtroNivel, setFiltroNivel] = useState<string>('TODOS');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Variables Dinámicas del Tráfico / Simulación (Ajustables de 1 en 1)
  const [tasaJubilacion, setTasaJubilacion] = useState<number>(20);         // % de jubilados que se retiran (de 1 en 1)
  const [tasaPrejubilacion, setTasaPrejubilacion] = useState<number>(10);     // % de prejubilados que se retiran en 2026-2031 (de 1 en 1)
  const [tasaReemplazoNoPert, setTasaReemplazoNoPert] = useState<number>(30); // % de no pertinentes a sustituir (de 1 en 1)
  const [reemplazarMedia, setReemplazarMedia] = useState<boolean>(false);     // Incluir Media Pertinencia (A)
  const [factorTit, setFactorTit] = useState<number>(82);                     // Factor de titulación de egresados ESFM (70 a 100%, de 1 en 1)
  const [pctAbsorcionBth, setPctAbsorcionBth] = useState<number>(70);         // % de absorción de las 88,063 horas BTH (Default 70%)
  const [tipoAsignacionEgresados, setTipoAsignacionEgresados] = useState<'radicacion' | 'bolsa'>('radicacion'); // Radicación Real vs Bolsa Nacional
  const [aplicarArima, setAplicarArima] = useState<boolean>(true);            // Aplicar ajuste de matrícula ARIMA
  const [pctMigracion, setPctMigracion] = useState<number>(100);              // % Saldo migratorio (0 a 100%, de 1 en 1)

  // Control de interfaz: Panel de variables y Glosario
  const [mostrarVariables, setMostrarVariables] = useState<boolean>(true);
  const [mostrarGuia, setMostrarGuia] = useState<boolean>(false);
  const [mostrarEjercicio, setMostrarEjercicio] = useState<boolean>(true);

  // Cargar datos
  useEffect(() => {
    fetch('/api/balance-demanda')
      .then((r) => r.json())
      .then((d) => {
        if (d.error) throw new Error(d.error);
        setData(d);
        setLoading(false);
      })
      .catch((e) => {
        setError(e?.message || 'Error cargando datos');
        setLoading(false);
      });
  }, []);

  const departamentosList = useMemo(() => {
    return data?.departamentos || ["BENI", "CHUQUISACA", "COCHABAMBA", "LA PAZ", "ORURO", "PANDO", "POTOSI", "SANTA CRUZ", "TARIJA"];
  }, [data]);

  // Estilos temáticos por Nivel Educativo
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
      textNivel: 'Técnica BTH'
    },
    ESPECIAL: {
      franja: 'bg-purple-100/90 text-purple-950 border-purple-300',
      borderLeft: 'border-l-4 border-l-purple-500 bg-purple-50/20',
      badge: 'bg-purple-100 text-purple-800 border-purple-300',
      textNivel: 'Especial'
    }
  };

  // Cálculo Dinámico Multivariable por Especialidad
  const especialidadesCalculadas = useMemo(() => {
    if (!data?.especialidades) return [];

    return data.especialidades
      .filter((esp) => {
        const nivelInfo = getNivelEspecialidad(esp.especialidad_id, esp.nombre);
        if (filtroNivel !== 'TODOS' && nivelInfo.nivelCodigo !== filtroNivel) return false;
        if (searchQuery.trim() && !esp.nombre.toLowerCase().includes(searchQuery.toLowerCase())) return false;
        return true;
      })
      .map((esp) => {
        const m = filtroDepto === 'TODOS' ? esp.nacional : (esp.por_departamento[filtroDepto] || esp.nacional);
        const esBth = BTH_SPECIALTY_IDS.has(esp.especialidad_id);

        // 1. Absorción equitativa (1/8) de las 88,063 horas BTH a las 8 carreras técnicas
        const itemsBthAbsorbidos = esBth ? Math.round((m.items_bth_bolsa || 0) * (pctAbsorcionBth / 100)) : 0;
        const deficitAjustado = m.deficit_materia + itemsBthAbsorbidos;

        // 2. Jubilaciones y Prejubilaciones ajustadas por sliders dinámicos (de 1 en 1)
        const jubEfectiva = Math.round((m.jubilacion || 0) * (tasaJubilacion / 100));
        const prejubEfectiva = Math.round((m.prejubilacion || 0) * (tasaPrejubilacion / 100));

        // 3. Reemplazo de No Pertinentes según rigurosidad y tasa de 1 en 1
        const universoNoPert = reemplazarMedia ? (m.media_a + m.baja_n + m.sin_pert) : (m.baja_n + m.sin_pert);
        const noPertinentesAjustados = Math.round(universoNoPert * (tasaReemplazoNoPert / 100));

        // 4. Egresados: Los 2 Modelos de Oferta (Radicación Real y Bolsa Nacional) ajustados por factorTit
        const baseRadicacion = filtroDepto === 'TODOS' ? m.egresados_2027_2031 : (m.egresados_radicacion_real ?? m.egresados_bolsa_nacional ?? 0);
        const baseBolsa = m.egresados_bolsa_nacional ?? m.egresados_2027_2031;

        const egrRadicacionAjustado = Math.round((baseRadicacion / 0.82) * (factorTit / 100));
        const egrBolsaAjustado = Math.round((baseBolsa / 0.82) * (factorTit / 100));

        const egresadosAjustados = tipoAsignacionEgresados === 'bolsa' ? egrBolsaAjustado : egrRadicacionAjustado;

        // 5. Parámetros exógenos: Demografía ARIMA y Migración
        const tasaArima = aplicarArima ? m.crecimiento_arima_pct : 0.0;
        const saldoMig = Math.round((m.saldo_migratorio || 0) * (pctMigracion / 100));

        // 6. Necesidad Bruta:
        // (Déficit SIE ajustado con BTH + Jubilados + Prejubilados 26-31 + Docentes No Pertinentes) × ARIMA + Saldo Migratorio
        const subtotalNecesidad = deficitAjustado + jubEfectiva + prejubEfectiva + noPertinentesAjustados;
        const demandaCalculada = Math.round(subtotalNecesidad * (1 + tasaArima / 100.0) + saldoMig);
        const brechaCalculada = demandaCalculada - egresadosAjustados;

        return {
          ...esp,
          metrics: {
            ...m,
            deficit_calculado: deficitAjustado,
            items_bth_absorbidos: itemsBthAbsorbidos,
            jubilacion_calculada: jubEfectiva,
            prejubilacion_calculada: prejubEfectiva,
            reemplazo_nopert: noPertinentesAjustados,
            egresados_2027_2031: egresadosAjustados,
            egresados_radicacion_calc: egrRadicacionAjustado,
            egresados_bolsa_calc: egrBolsaAjustado,
            demanda_total: demandaCalculada,
            brecha_neta: brechaCalculada,
            saldo_mig_aplicado: saldoMig,
            arima_aplicado: tasaArima
          }
        };
      });
  }, [
    data,
    filtroDepto,
    filtroNivel,
    searchQuery,
    pctAbsorcionBth,
    tasaJubilacion,
    tasaPrejubilacion,
    tasaReemplazoNoPert,
    reemplazarMedia,
    factorTit,
    tipoAsignacionEgresados,
    aplicarArima,
    pctMigracion
  ]);

  // Agrupamiento por Nivel Educativo
  const especialidadesPorNivel = useMemo(() => {
    const grupos: Record<string, { nivelCodigo: NivelCodigo; nivelNombre: string; ordenJerarquia: number; items: typeof especialidadesCalculadas }> = {
      INICIAL: { ...NIVELES_CONFIG.INICIAL, items: [] },
      PRIMARIA: { ...NIVELES_CONFIG.PRIMARIA, items: [] },
      SECUNDARIA: { ...NIVELES_CONFIG.SECUNDARIA, items: [] },
      TECNICA: { ...NIVELES_CONFIG.TECNICA, items: [] },
      ESPECIAL: { ...NIVELES_CONFIG.ESPECIAL, items: [] },
    };

    for (const esp of especialidadesCalculadas) {
      const info = getNivelEspecialidad(esp.especialidad_id, esp.nombre);
      if (grupos[info.nivelCodigo]) {
        grupos[info.nivelCodigo].items.push(esp);
      }
    }

    return Object.values(grupos)
      .filter((g) => g.items.length > 0)
      .sort((a, b) => a.ordenJerarquia - b.ordenJerarquia);
  }, [especialidadesCalculadas]);

  // Totales de Cabecera y Resumen
  const totales = useMemo(() => {
    let totDeficit = 0;
    let totJub = 0;
    let totPrejub = 0;
    let totNoPert = 0;
    let totEntrantes = 0;
    let totSalientes = 0;
    let totSaldoMig = 0;
    let totDemanda = 0;
    let totEgresados = 0;
    let totEgrRadicacion = 0;
    let totEgrBolsa = 0;
    let totBrecha = 0;

    for (const esp of especialidadesCalculadas) {
      totDeficit += esp.metrics.deficit_calculado;
      totJub += esp.metrics.jubilacion_calculada;
      totPrejub += esp.metrics.prejubilacion_calculada;
      totNoPert += esp.metrics.reemplazo_nopert;
      totEntrantes += esp.metrics.migracion_entrantes;
      totSalientes += esp.metrics.migracion_salientes;
      totSaldoMig += esp.metrics.saldo_mig_aplicado;
      totDemanda += esp.metrics.demanda_total;
      totEgresados += esp.metrics.egresados_2027_2031;
      totEgrRadicacion += esp.metrics.egresados_radicacion_calc || 0;
      totEgrBolsa += esp.metrics.egresados_bolsa_calc || 0;
      totBrecha += esp.metrics.brecha_neta;
    }

    return {
      totDeficit,
      totJub,
      totPrejub,
      totNoPert,
      totEntrantes,
      totSalientes,
      totSaldoMig,
      totDemanda,
      totEgresados,
      totEgrRadicacion,
      totEgrBolsa,
      totBrecha
    };
  }, [especialidadesCalculadas]);

  const fmt = (n?: number | null) => (n ?? 0).toLocaleString('es-BO');

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-80 gap-3 text-slate-500">
        <div className="w-8 h-8 border-3 border-emerald-600 border-t-transparent rounded-full animate-spin" />
        <span className="text-sm font-semibold tracking-wide">Cargando balance predictivo y asignación equitativa BTH 2031...</span>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="p-6 bg-red-50 border border-red-200 rounded-2xl text-red-700 text-sm">
        Error al cargar matriz de balance: {error}
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-300">

      {/* ── Header Principal y Selector de Territorio ───────────────────────── */}
      <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-sm space-y-6">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 pb-6 border-b border-slate-100">
          <div>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-emerald-800 text-white flex items-center justify-center font-black shadow-xs">
                <Scale className="w-5 h-5 text-emerald-200" />
              </div>
              <div>
                <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                  Balance Predictivo de Admisión ESFM 2031
                </h1>
                <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
                  Planificación de cupos de admisión según Déficit SIE, Absorción BTH (88k hrs), Jubilaciones, Prejubilados, Pertinencia, Migración y ARIMA.
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {/* Botón para abrir Ejercicio Demanda Bruta */}
            <button
              onClick={() => setMostrarEjercicio(!mostrarEjercicio)}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-2xl text-xs font-bold transition-all border ${mostrarEjercicio
                ? 'bg-slate-900 text-white border-slate-900 shadow-sm'
                : 'bg-white text-slate-800 border-slate-200 hover:bg-slate-100'
                }`}
            >
              <Calculator className="w-4 h-4 text-amber-500" />
              <span>{mostrarEjercicio ? 'Ocultar Ejercicio' : 'Ejercicio Demanda Bruta'}</span>
            </button>

            {/* Botón para abrir Glosario / Guía */}
            <button
              onClick={() => setMostrarGuia(!mostrarGuia)}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-2xl text-xs font-bold transition-all border ${mostrarGuia
                ? 'bg-indigo-700 text-white border-indigo-700 shadow-sm'
                : 'bg-white text-indigo-700 border-indigo-200 hover:bg-indigo-50'
                }`}
            >
              <BookOpen className="w-4 h-4" />
              <span>{mostrarGuia ? 'Ocultar Guía' : '¿Cómo se lee esta tabla? (Guía)'}</span>
            </button>

            {/* Selector de Departamento */}
            <div className="relative w-full sm:w-60">
              <MapPin className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
              <select
                value={filtroDepto}
                onChange={(e) => setFiltroDepto(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-xs font-bold text-slate-900 bg-slate-50 hover:bg-slate-100 border border-slate-300 rounded-2xl focus:outline-none focus:ring-2 focus:ring-emerald-700 transition-all cursor-pointer shadow-2xs"
              >
                <option value="TODOS">Consolidado Nacional (9 Deptos)</option>
                {departamentosList.map((dep) => (
                  <option key={dep} value={dep}>{dep}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* ── 5 KPIs Estratégicos del Balance ───────────────────────────────── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black text-slate-500 uppercase tracking-wider">1. Déficit Aula (SIE)</span>
              <Building2 className="w-3.5 h-3.5 text-slate-400" />
            </div>
            <span className="text-xl font-black text-slate-900 mt-1 block tabular-nums">{fmt(totales.totDeficit)}</span>
            <span className="text-[10px] text-slate-500 font-medium">
              Incluye {pctAbsorcionBth}% de Técnica BTH (88k hrs)
            </span>
          </div>

          <div className="bg-rose-50/70 rounded-2xl p-4 border border-rose-200">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black text-rose-700 uppercase tracking-wider">2. Retiro y Jubilaciones</span>
              <UserMinus className="w-3.5 h-3.5 text-rose-500" />
            </div>
            <span className="text-xl font-black text-rose-950 mt-1 block tabular-nums">{fmt(totales.totJub + totales.totPrejub)}</span>
            <span className="text-[10px] text-rose-700 font-medium">
              {fmt(totales.totJub)} Jub. ({tasaJubilacion}%) + {fmt(totales.totPrejub)} PreJub. ({tasaPrejubilacion}%)
            </span>
          </div>

          <div className="bg-amber-50/70 rounded-2xl p-4 border border-amber-200">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black text-amber-800 uppercase tracking-wider">3. Calidad (No Pertinentes)</span>
              <RefreshCw className="w-3.5 h-3.5 text-amber-600" />
            </div>
            <span className="text-xl font-black text-amber-950 mt-1 block tabular-nums">{fmt(totales.totNoPert)}</span>
            <span className="text-[10px] text-amber-700 font-medium">
              Sustitución al {tasaReemplazoNoPert}% {reemplazarMedia ? '(Incluye Media)' : '(Baja + Sin Pert)'}
            </span>
          </div>

          <div className="bg-blue-50/70 rounded-2xl p-4 border border-blue-200">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black text-blue-700 uppercase tracking-wider">4. Egresados ESFM ({factorTit}%)</span>
              <GraduationCap className="w-3.5 h-3.5 text-blue-500" />
            </div>
            <span className="text-xl font-black text-blue-900 mt-1 block tabular-nums">{fmt(totales.totEgresados)}</span>
            <div className="mt-1 pt-1 border-t border-blue-200/60 flex items-center justify-between text-[9px] font-mono text-blue-800">
              <span className={tipoAsignacionEgresados === 'radicacion' ? 'font-black underline text-indigo-950' : 'opacity-70'}>
                1. Radicación Real: {fmt(totales.totEgrRadicacion)}
              </span>
              <span className="opacity-40">|</span>
              <span className={tipoAsignacionEgresados === 'bolsa' ? 'font-black underline text-sky-950' : 'opacity-70'}>
                2. Bolsa Nac.: {fmt(totales.totEgrBolsa)}
              </span>
            </div>
          </div>

          <div className={`rounded-2xl p-4 border ${totales.totBrecha > 0 ? 'bg-rose-50 border-rose-300' : 'bg-emerald-50 border-emerald-300'}`}>
            <div className="flex items-center justify-between">
              <span className={`text-[10px] font-black uppercase tracking-wider ${totales.totBrecha > 0 ? 'text-rose-800' : 'text-emerald-800'}`}>
                5. Brecha Neta Admisión
              </span>
              <Scale className={`w-3.5 h-3.5 ${totales.totBrecha > 0 ? 'text-rose-600' : 'text-emerald-600'}`} />
            </div>
            <span className={`text-xl font-black mt-1 block tabular-nums ${totales.totBrecha > 0 ? 'text-rose-900' : 'text-emerald-900'}`}>
              {totales.totBrecha > 0 ? `+${fmt(totales.totBrecha)}` : fmt(totales.totBrecha)}
            </span>
            <span className={`text-[10px] font-bold ${totales.totBrecha > 0 ? 'text-rose-700' : 'text-emerald-700'}`}>
              {totales.totBrecha > 0 ? 'Apertura de Cupos Necesaria' : 'Oferta Cubierta / Saturación'}
            </span>
          </div>
        </div>

        {/* ── Panel Desplegable: Guía Metodológica y Explicación de Columnas ──── */}
        {mostrarGuia && (
          <div className="bg-indigo-50/80 border border-indigo-200 rounded-3xl p-6 text-slate-800 space-y-4 animate-in slide-in-from-top-2 duration-200">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-indigo-200/60">
              <div className="flex items-center gap-2">
                <Info className="w-5 h-5 text-indigo-700" />
                <h3 className="text-sm font-black text-indigo-950 uppercase tracking-wider">
                  Guía Metodológica Completa: ¿Cómo se lee esta tabla y cómo se calcula cada columna?
                </h3>
              </div>
              <span className="text-[11px] font-bold text-indigo-700 bg-indigo-100 px-3 py-1 rounded-full border border-indigo-200">
                Fuentes: SIE 2024–2025 · Padrón SICH · DGFM Titulados 2014–2025 · Censo INE 2024
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5 text-xs">
              {/* Card 1: Especialidad e Ítem */}
              <div className="bg-white p-4 rounded-2xl border border-indigo-100 space-y-1.5 shadow-2xs">
                <span className="font-black text-slate-900 flex items-center gap-2 text-xs">
                  <span className="w-2.5 h-2.5 rounded-full bg-slate-400" />
                  1. Especialidad y Carga Horaria (Ítem)
                </span>
                <p className="text-slate-600 text-[11px] leading-relaxed">
                  Denominación oficial de la carrera docente según catálogo ministerial y carga horaria asignada al ítem: <strong>96 horas</strong> en Educación Inicial y Primaria Comunitaria Vocacional; <strong>88h, 80h o 72h</strong> en Educación Secundaria y Especialidades Técnicas (BTH).
                </p>
              </div>

              {/* Card 2: Déficit SIE + BTH */}
              <div className="bg-white p-4 rounded-2xl border border-indigo-100 space-y-1.5 shadow-2xs">
                <span className="font-black text-slate-900 flex items-center gap-2 text-xs">
                  <span className="w-2.5 h-2.5 rounded-full bg-indigo-500" />
                  2. Déficit SIE (Aula) + Absorción BTH
                </span>
                <p className="text-slate-600 text-[11px] leading-relaxed">
                  Horas curriculares en aula sin docente registradas en el SIE convertidas a ítems. En las 8 especialidades de Bachillerato Técnico Humanístico (BTH), se distribuye de forma equitativa (1/8 por carrera) la bolsa nacional de <strong>88.063 horas genéricas de Técnica Tecnológica</strong> según el control de absorción regulable.
                </p>
              </div>

              {/* Card 3: Jubilaciones y Prejubilaciones */}
              <div className="bg-white p-4 rounded-2xl border border-indigo-100 space-y-1.5 shadow-2xs">
                <span className="font-black text-rose-900 flex items-center gap-2 text-xs">
                  <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
                  3. Jubilaciones y Prejubilaciones (SICH)
                </span>
                <p className="text-slate-600 text-[11px] leading-relaxed">
                  <strong>Jubilación legal:</strong> Maestros en ejercicio que ya cumplieron la edad legal de retiro (60+ años varones, 55+ mujeres) cuya vacante debe ser cubierta. <strong>Prejubilación (2026–2031):</strong> Docentes a 1–5 años del retiro que generarán vacantes naturales durante el quinquenio.
                </p>
              </div>

              {/* Card 4: No Pertinentes */}
              <div className="bg-white p-4 rounded-2xl border border-indigo-100 space-y-1.5 shadow-2xs">
                <span className="font-black text-amber-900 flex items-center gap-2 text-xs">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                  4. A Sustituir (Pertinencia Docente)
                </span>
                <p className="text-slate-600 text-[11px] leading-relaxed">
                  Docentes que enseñan la especialidad pero provienen de otra área formativa (Baja Pertinencia y Sin Pertinencia). Sustituirlos de forma planificada por maestros titulados de la ESFM eleva el rigor pedagógico y la calidad educativa del aula.
                </p>
              </div>

              {/* Card 5: Migración Docente */}
              <div className="bg-white p-4 rounded-2xl border border-indigo-100 space-y-1.5 shadow-2xs">
                <span className="font-black text-sky-900 flex items-center gap-2 text-xs">
                  <span className="w-2.5 h-2.5 rounded-full bg-sky-500" />
                  5. Migración Docente (Planilla SEP 2024–2026)
                </span>
                <p className="text-slate-600 text-[11px] leading-relaxed">
                  <strong>Entrantes (+):</strong> Docentes transferidos que llegan al departamento. <strong>Salientes (−):</strong> Docentes que se trasladan a otro departamento. <strong>Saldo Neto:</strong> Si salen más maestros de los que entran (<span className="text-rose-700 font-bold">+ rep.</span>), genera necesidad de reposición; si entran más (<span className="text-emerald-700 font-bold">− lle.</span>), cubren vacantes y reducen la necesidad de contratación.
                </p>
              </div>

              {/* Card 6: ARIMA Demográfico */}
              <div className="bg-white p-4 rounded-2xl border border-indigo-100 space-y-1.5 shadow-2xs">
                <span className="font-black text-indigo-900 flex items-center gap-2 text-xs">
                  <span className="w-2.5 h-2.5 rounded-full bg-indigo-600" />
                  6. Proyección Demográfica ARIMA (INE 2024–2031)
                </span>
                <p className="text-slate-600 text-[11px] leading-relaxed">
                  Modela la evolución de la población en edad escolar por departamento según los datos del Censo 2024 (-6.8% nacional). En departamentos con crecimiento vegetativo positivo (Santa Cruz +2.8%, Pando +7.1%) incrementa la necesidad de aulas; en departamentos con contracción (La Paz -9.2%, Oruro -12.4%) previene la sobreoferta de plazas.
                </p>
              </div>

              {/* Card 7: Demanda Bruta */}
              <div className="bg-white p-4 rounded-2xl border border-indigo-100 space-y-1.5 shadow-2xs">
                <span className="font-black text-indigo-950 flex items-center gap-2 text-xs">
                  <span className="w-2.5 h-2.5 rounded-full bg-indigo-950" />
                  7. Demanda Bruta (Total Necesidad)
                </span>
                <p className="text-slate-600 text-[11px] leading-relaxed">
                  Cálculo consolidado de necesidad de plazas docentes al 2031:<br />
                  <code className="text-[10px] font-mono text-indigo-900 bg-indigo-50 px-1 py-0.5 rounded">
                    Demanda = round[(Déficit + Jubilados + Prejubilados + No Pertinentes) × (1 + ARIMA)] + Saldo Migratorio
                  </code>
                </p>
              </div>

              {/* Card 8: Oferta Egresados */}
              <div className="bg-white p-4 rounded-2xl border border-indigo-100 space-y-1.5 shadow-2xs">
                <span className="font-black text-blue-900 flex items-center gap-2 text-xs">
                  <span className="w-2.5 h-2.5 rounded-full bg-blue-600" />
                  8. Oferta de Egresados ESFM (2 Modelos Directos)
                </span>
                <p className="text-slate-600 text-[11px] leading-relaxed">
                  <strong>1. Radicación Real:</strong> Modelo empírico basado en <strong>35.474 estudiantes titulados (2014–2025)</strong>. Registra a los egresados que vuelven a ejercer en su departamento de origen tras estudiar afuera. Es el dato real de disponibilidad.<br />
                  <strong>2. Bolsa Nacional:</strong> Modelo normativo ministerial que reparte la oferta nacional proporcionalmente a la planta docente, garantizando equidad en carreras centralizadas (BTH y Especial).
                </p>
              </div>

              {/* Card 9: Brecha Neta */}
              <div className="bg-white p-4 rounded-2xl border border-indigo-100 space-y-1.5 shadow-2xs">
                <span className="font-black text-emerald-900 flex items-center gap-2 text-xs">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-600" />
                  9. Brecha Neta y Criterio de Admisión ESFM
                </span>
                <p className="text-slate-600 text-[11px] leading-relaxed">
                  <strong>Demanda Bruta − Oferta de Egresados.</strong><br />
                  <span className="text-rose-700 font-black">Positiva (+) DÉFICIT:</span> La oferta no abastece las aulas. Corresponde autorizar apertura de plazas en la Convocatoria de Admisión.<br />
                  <span className="text-emerald-700 font-black">Negativa (−) SUPERÁVIT:</span> Hay sobreoferta de maestros. Se debe congelar o limitar cupos para evitar desempleo y precarización.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* ── Panel Desplegable: Ejercicio Práctico de Cálculo Real (Demanda Bruta) ──── */}
        {mostrarEjercicio && (
          <div className="bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 text-white rounded-3xl p-6 border border-indigo-500/30 shadow-xl space-y-4 animate-in slide-in-from-top-2 duration-200">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 border-b border-indigo-800/60">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-indigo-600/30 rounded-2xl border border-indigo-400/30 text-amber-400">
                  <Calculator className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-sm font-black text-white tracking-wide uppercase">
                      Ejercicio Práctico: Desglose Matemático de la Demanda Bruta
                    </h3>
                    <span className="bg-amber-400/20 text-amber-300 text-[10px] font-bold px-2.5 py-0.5 rounded-full border border-amber-400/30">
                      Caso Real: Educación Inicial en Familia Comunitaria (ID 5)
                    </span>
                  </div>
                  <p className="text-xs text-indigo-200 mt-0.5">
                    Comprobación paso a paso de cómo el modelo transforma los 428 ítems de Déficit SIE en <strong>246 de Demanda Bruta</strong> y <strong>-2.180 de Brecha Neta</strong> con migración específica por especialidad.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setMostrarEjercicio(false)}
                className="text-xs text-indigo-300 hover:text-white bg-indigo-900/50 hover:bg-indigo-800 px-3 py-1.5 rounded-xl border border-indigo-700/50 transition-colors cursor-pointer"
              >
                Ocultar Ejercicio
              </button>
            </div>

            {/* Fórmulas Generales */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
              <div className="bg-slate-950/70 border border-indigo-800/60 rounded-2xl p-3.5 space-y-1">
                <span className="text-[10px] uppercase font-black tracking-wider text-amber-300 block">
                  1. Fórmula Oficial de Demanda Bruta (Total Necesidad al 2031)
                </span>
                <code className="text-[11px] font-mono text-emerald-300 font-bold block overflow-x-auto whitespace-nowrap">
                  Demanda Bruta = round( (Déficit_SIE + Jubilados + Prejubilados + Sustitución) × (1 + ARIMA%) + Saldo_Migratorio )
                </code>
              </div>
              <div className="bg-slate-950/70 border border-indigo-800/60 rounded-2xl p-3.5 space-y-1">
                <span className="text-[10px] uppercase font-black tracking-wider text-sky-300 block">
                  2. Fórmula de Brecha Neta de Admisión
                </span>
                <code className="text-[11px] font-mono text-sky-200 font-bold block overflow-x-auto whitespace-nowrap">
                  Brecha Neta = Demanda Bruta − Egresados Titulados ESFM
                </code>
              </div>
            </div>

            {/* 4 Pasos Numéricos del Ejercicio */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
              {/* Paso 1 */}
              <div className="bg-slate-800/70 border border-indigo-800/50 rounded-2xl p-4 flex flex-col justify-between space-y-3">
                <div>
                  <div className="flex items-center justify-between text-indigo-300 font-bold text-[11px] mb-2">
                    <span className="text-amber-400 font-black">PASO 1</span>
                    <span className="text-[9px] bg-indigo-950 text-indigo-300 px-2 py-0.5 rounded border border-indigo-700/50 uppercase font-black">
                      Necesidad Base
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-300 mb-2">Suma de vacantes estructurales requeridas:</p>
                  <ul className="space-y-1.5 text-[11px] text-slate-200 font-mono">
                    <li className="flex justify-between items-center bg-slate-900/60 px-2 py-1 rounded">
                      <span className="text-slate-400">Déficit SIE (Aula):</span>
                      <span className="font-black text-white">+428</span>
                    </li>
                    <li className="flex justify-between items-center bg-slate-900/60 px-2 py-1 rounded">
                      <span className="text-slate-400">Jubilados (20% de 1.048):</span>
                      <span className="font-black text-rose-300">+210</span>
                    </li>
                    <li className="flex justify-between items-center bg-slate-900/60 px-2 py-1 rounded">
                      <span className="text-slate-400">Prejubilados (10% de 392):</span>
                      <span className="font-black text-rose-300">+39</span>
                    </li>
                    <li className="flex justify-between items-center bg-slate-900/60 px-2 py-1 rounded">
                      <span className="text-slate-400">A Sustituir (30% de 157):</span>
                      <span className="font-black text-amber-300">+47</span>
                    </li>
                  </ul>
                </div>
                <div className="pt-2 border-t border-slate-700 flex justify-between items-center font-bold">
                  <span className="text-indigo-200 text-[11px]">Subtotal Necesidad:</span>
                  <span className="text-lg text-white font-mono font-black">724</span>
                </div>
              </div>

              {/* Paso 2 */}
              <div className="bg-slate-800/70 border border-indigo-800/50 rounded-2xl p-4 flex flex-col justify-between space-y-3">
                <div>
                  <div className="flex items-center justify-between text-indigo-300 font-bold text-[11px] mb-2">
                    <span className="text-amber-400 font-black">PASO 2</span>
                    <span className="text-[9px] bg-indigo-950 text-indigo-300 px-2 py-0.5 rounded border border-indigo-700/50 uppercase font-black">
                      Demografía ARIMA
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-300 mb-2">Ajuste por proyección de matrícula escolar al 2031:</p>
                  <div className="bg-slate-900/80 p-2.5 rounded-xl border border-slate-700 space-y-1.5 font-mono text-[11px]">
                    <div className="flex justify-between text-slate-400">
                      <span>Tasa ARIMA Nacional:</span>
                      <span className="text-rose-400 font-black">-6.8%</span>
                    </div>
                    <div className="flex justify-between text-slate-400">
                      <span>Factor Aplicado:</span>
                      <span className="text-slate-200">1 - 0.068 = 0.932</span>
                    </div>
                    <div className="pt-1 border-t border-slate-800 flex justify-between text-emerald-300 font-bold">
                      <span>724 × 0.932 =</span>
                      <span className="font-black">674.77</span>
                    </div>
                  </div>
                  <p className="text-[10px] text-slate-400 italic mt-2">
                    La contracción de natalidad reduce la necesidad de aulas en 49.2 plazas.
                  </p>
                </div>
                <div className="pt-2 border-t border-slate-700 flex justify-between items-center font-bold">
                  <span className="text-indigo-200 text-[11px]">Base ajustada ARIMA:</span>
                  <span className="text-lg text-emerald-300 font-mono font-black">674.77</span>
                </div>
              </div>

              {/* Paso 3 */}
              <div className="bg-slate-800/70 border border-indigo-800/50 rounded-2xl p-4 flex flex-col justify-between space-y-3">
                <div>
                  <div className="flex items-center justify-between text-indigo-300 font-bold text-[11px] mb-2">
                    <span className="text-amber-400 font-black">PASO 3</span>
                    <span className="text-[9px] bg-indigo-950 text-indigo-300 px-2 py-0.5 rounded border border-indigo-700/50 uppercase font-black">
                      Saldo Migratorio
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-300 mb-2">Movilidad docente real de Inicial (2024–2025):</p>
                  <ul className="space-y-1.5 text-[11px] text-slate-200 font-mono">
                    <li className="flex justify-between items-center bg-slate-900/60 px-2 py-1 rounded">
                      <span className="text-slate-400">Docentes Entrantes:</span>
                      <span className="font-black text-emerald-400">+609</span>
                    </li>
                    <li className="flex justify-between items-center bg-slate-900/60 px-2 py-1 rounded">
                      <span className="text-slate-400">Docentes Salientes:</span>
                      <span className="font-black text-rose-400">-180</span>
                    </li>
                    <li className="flex justify-between items-center bg-slate-900/60 px-2 py-1 rounded">
                      <span className="text-slate-400">Saldo (Sal. − Ent.):</span>
                      <span className="font-black text-sky-300">-429 lle.</span>
                    </li>
                  </ul>
                  <p className="text-[10px] text-slate-400 italic mt-1.5">
                    Entraron 429 maestros más de Inicial de los que salieron, absorbiendo vacantes y reduciendo la necesidad.
                  </p>
                </div>
                <div className="pt-2 border-t border-slate-700 flex justify-between items-center font-bold">
                  <span className="text-indigo-200 text-[11px]">Demanda Bruta (round):</span>
                  <span className="text-xl text-amber-300 font-mono font-black">246</span>
                </div>
              </div>

              {/* Paso 4 */}
              <div className="bg-indigo-950/80 border border-indigo-600/50 rounded-2xl p-4 flex flex-col justify-between space-y-3">
                <div>
                  <div className="flex items-center justify-between text-indigo-300 font-bold text-[11px] mb-2">
                    <span className="text-amber-400 font-black">PASO 4</span>
                    <span className="text-[9px] bg-emerald-950 text-emerald-300 px-2 py-0.5 rounded border border-emerald-700/50 uppercase font-black">
                      Balance Final
                    </span>
                  </div>
                  <p className="text-[11px] text-indigo-200 mb-2">Comparación contra egresados ESFM (2027–2031):</p>
                  <div className="space-y-1.5 text-[11px] font-mono">
                    <div className="flex justify-between items-center bg-slate-900/60 px-2 py-1 rounded">
                      <span className="text-indigo-300">Demanda Bruta:</span>
                      <span className="font-black text-white">246</span>
                    </div>
                    <div className="flex justify-between items-center bg-slate-900/60 px-2 py-1 rounded">
                      <span className="text-indigo-300">Egresados Titulados:</span>
                      <span className="font-black text-blue-300">2.426</span>
                    </div>
                    <div className="pt-1.5 border-t border-indigo-700/60 flex justify-between items-center text-emerald-300 font-bold">
                      <span>Brecha Neta (246 − 2.426):</span>
                      <span className="text-base font-black">-2.180</span>
                    </div>
                  </div>
                </div>
                <div className="pt-2 border-t border-indigo-700/60 bg-emerald-950/70 p-2.5 rounded-xl text-center border border-emerald-500/30">
                  <span className="text-xs font-black text-emerald-300 uppercase tracking-wide block">
                    Oferta Cubierta
                  </span>
                  <span className="text-[10px] text-emerald-400 font-medium">
                    Superávit de 2.180 maestros. No procede apertura de plazas.
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── PANEL DE SIMULACIÓN MULTIVARIABLE DINÁMICA (AJUSTABLE DE 1 EN 1) ─── */}
        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-200">
            <button
              onClick={() => setMostrarVariables(!mostrarVariables)}
              className="flex items-center gap-2 text-xs font-black text-slate-800 hover:text-emerald-700 transition-colors cursor-pointer"
            >
              <SlidersHorizontal className="w-4 h-4 text-emerald-600" />
              <span>SIMULADOR DE POLÍTICA Y VARIABLES DINÁMICAS (AJUSTE FINO 1 EN 1)</span>
              {mostrarVariables ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
            </button>

            <span className="text-[11px] font-bold text-slate-500">
              Mueve los sliders o ingresa valores numéricos directos de 0% a 100%
            </span>
          </div>

          {mostrarVariables && (
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-3.5 text-xs pt-1">
              {/* Variable 1: Absorción Déficit BTH (88,063 hrs) */}
              <div className="space-y-1.5 bg-white p-3 rounded-xl border border-amber-200 shadow-2xs">
                <div className="flex justify-between items-center">
                  <span className="font-bold text-amber-900 flex items-center gap-1">
                    <Wrench className="w-3.5 h-3.5 text-amber-600" />
                    Absorción BTH (88k):
                  </span>
                  <div className="flex items-center gap-0.5">
                    <input
                      type="number"
                      min={0}
                      max={100}
                      step={1}
                      value={pctAbsorcionBth}
                      onChange={(e) => setPctAbsorcionBth(Math.min(100, Math.max(0, Number(e.target.value))))}
                      className="w-12 text-right font-black text-amber-800 font-mono bg-amber-50 px-1 py-0.5 rounded border border-amber-300 focus:outline-none focus:ring-1 focus:ring-amber-500 text-xs"
                    />
                    <span className="font-black text-amber-800">%</span>
                  </div>
                </div>
                <input
                  type="range"
                  min={0}
                  max={100}
                  step={1}
                  value={pctAbsorcionBth}
                  onChange={(e) => setPctAbsorcionBth(Number(e.target.value))}
                  className="w-full accent-amber-600 cursor-pointer"
                />
                <div className="flex items-center justify-between text-[9px]">
                  <span className="text-slate-400">Equidad 1/8 c/u</span>
                  <div className="flex gap-1">
                    {[0, 50, 70, 100].map((val) => (
                      <button
                        key={val}
                        onClick={() => setPctAbsorcionBth(val)}
                        className={`px-1.5 py-0.5 rounded font-black ${pctAbsorcionBth === val ? 'bg-amber-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                          }`}
                      >
                        {val}%
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Variable 2: Reemplazo de Jubilados (Ajustable de 1 en 1) */}
              <div className="space-y-1.5 bg-white p-3 rounded-xl border border-slate-200 shadow-2xs">
                <div className="flex justify-between items-center">
                  <span className="font-bold text-slate-700">Reemplazo Jubilados:</span>
                  <div className="flex items-center gap-0.5">
                    <input
                      type="number"
                      min={0}
                      max={100}
                      step={1}
                      value={tasaJubilacion}
                      onChange={(e) => setTasaJubilacion(Math.min(100, Math.max(0, Number(e.target.value))))}
                      className="w-12 text-right font-black text-rose-700 font-mono bg-rose-50 px-1 py-0.5 rounded border border-rose-200 focus:outline-none focus:ring-1 focus:ring-rose-500 text-xs"
                    />
                    <span className="font-black text-rose-700">%</span>
                  </div>
                </div>
                <input
                  type="range"
                  min={0}
                  max={100}
                  step={1}
                  value={tasaJubilacion}
                  onChange={(e) => setTasaJubilacion(Number(e.target.value))}
                  className="w-full accent-rose-600 cursor-pointer"
                />
                <span className="text-[9px] text-slate-400 block">
                  Reemplazar {tasaJubilacion}% de maestros 60+ años
                </span>
              </div>

              {/* Variable 3: Prejubilados 2026-31 (Ajustable de 1 en 1) */}
              <div className="space-y-1.5 bg-white p-3 rounded-xl border border-slate-200 shadow-2xs">
                <div className="flex justify-between items-center">
                  <span className="font-bold text-slate-700">Prejubilados (26–31):</span>
                  <div className="flex items-center gap-0.5">
                    <input
                      type="number"
                      min={0}
                      max={100}
                      step={1}
                      value={tasaPrejubilacion}
                      onChange={(e) => setTasaPrejubilacion(Math.min(100, Math.max(0, Number(e.target.value))))}
                      className="w-12 text-right font-black text-orange-700 font-mono bg-orange-50 px-1 py-0.5 rounded border border-orange-200 focus:outline-none focus:ring-1 focus:ring-orange-500 text-xs"
                    />
                    <span className="font-black text-orange-700">%</span>
                  </div>
                </div>
                <input
                  type="range"
                  min={0}
                  max={100}
                  step={1}
                  value={tasaPrejubilacion}
                  onChange={(e) => setTasaPrejubilacion(Number(e.target.value))}
                  className="w-full accent-orange-600 cursor-pointer"
                />
                <span className="text-[9px] text-slate-400 block">
                  {tasaPrejubilacion}% que se jubila en 5 años
                </span>
              </div>

              {/* Variable 4: Sustitución No Pertinentes (Ajustable de 1 en 1) */}
              <div className="space-y-1.5 bg-white p-3 rounded-xl border border-slate-200 shadow-2xs">
                <div className="flex justify-between items-center">
                  <span className="font-bold text-slate-700">No Pertinentes:</span>
                  <div className="flex items-center gap-0.5">
                    <input
                      type="number"
                      min={0}
                      max={100}
                      step={1}
                      value={tasaReemplazoNoPert}
                      onChange={(e) => setTasaReemplazoNoPert(Math.min(100, Math.max(0, Number(e.target.value))))}
                      className="w-12 text-right font-black text-amber-700 font-mono bg-amber-50 px-1 py-0.5 rounded border border-amber-200 focus:outline-none focus:ring-1 focus:ring-amber-500 text-xs"
                    />
                    <span className="font-black text-amber-700">%</span>
                  </div>
                </div>
                <input
                  type="range"
                  min={0}
                  max={100}
                  step={1}
                  value={tasaReemplazoNoPert}
                  onChange={(e) => setTasaReemplazoNoPert(Number(e.target.value))}
                  className="w-full accent-amber-600 cursor-pointer"
                />
                <div className="flex items-center justify-between text-[9px]">
                  <span className="text-slate-500">Incluir Media (A):</span>
                  <button
                    onClick={() => setReemplazarMedia(!reemplazarMedia)}
                    className={`font-black px-1.5 py-0.5 rounded border transition-colors ${reemplazarMedia ? 'bg-amber-600 text-white border-amber-600' : 'bg-slate-100 text-slate-700 border-slate-300'
                      }`}
                  >
                    {reemplazarMedia ? 'SÍ' : 'NO'}
                  </button>
                </div>
              </div>

              {/* Variable 5: Saldo Migratorio Docente (0 a 100%) */}
              <div className="space-y-1.5 bg-white p-3 rounded-xl border border-sky-200 shadow-2xs">
                <div className="flex justify-between items-center">
                  <span className="font-bold text-sky-900 flex items-center gap-1">
                    <ArrowLeftRight className="w-3.5 h-3.5 text-sky-600" />
                    Saldo Migratorio:
                  </span>
                  <div className="flex items-center gap-0.5">
                    <input
                      type="number"
                      min={0}
                      max={100}
                      step={1}
                      value={pctMigracion}
                      onChange={(e) => setPctMigracion(Math.min(100, Math.max(0, Number(e.target.value))))}
                      className="w-12 text-right font-black text-sky-800 font-mono bg-sky-50 px-1 py-0.5 rounded border border-sky-300 focus:outline-none focus:ring-1 focus:ring-sky-500 text-xs"
                    />
                    <span className="font-black text-sky-800">%</span>
                  </div>
                </div>
                <input
                  type="range"
                  min={0}
                  max={100}
                  step={1}
                  value={pctMigracion}
                  onChange={(e) => setPctMigracion(Number(e.target.value))}
                  className="w-full accent-sky-600 cursor-pointer"
                />
                <div className="flex items-center justify-between text-[9px]">
                  <span className="text-slate-400">Aplicar {pctMigracion}%</span>
                  <div className="flex gap-1">
                    {[0, 50, 75, 100].map((val) => (
                      <button
                        key={val}
                        onClick={() => setPctMigracion(val)}
                        className={`px-1.5 py-0.5 rounded font-black ${pctMigracion === val ? 'bg-sky-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                          }`}
                      >
                        {val}%
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Variable 6: Titulación ESFM y Asignación de Egresados */}
              <div className="space-y-1.5 bg-white p-3 rounded-xl border border-slate-200 shadow-2xs">
                <div className="flex justify-between items-center">
                  <span className="font-bold text-slate-700">Titulación ESFM:</span>
                  <div className="flex items-center gap-0.5">
                    <input
                      type="number"
                      min={50}
                      max={100}
                      step={1}
                      value={factorTit}
                      onChange={(e) => setFactorTit(Math.min(100, Math.max(50, Number(e.target.value))))}
                      className="w-12 text-right font-black text-blue-700 font-mono bg-blue-50 px-1 py-0.5 rounded border border-blue-200 focus:outline-none focus:ring-1 focus:ring-blue-500 text-xs"
                    />
                    <span className="font-black text-blue-700">%</span>
                  </div>
                </div>
                <input
                  type="range"
                  min={50}
                  max={100}
                  step={1}
                  value={factorTit}
                  onChange={(e) => setFactorTit(Number(e.target.value))}
                  className="w-full accent-blue-600 cursor-pointer"
                />
                <div className="flex items-center justify-between text-[9px]">
                  <span className="font-bold text-slate-600">Egresados:</span>
                  <div className="flex rounded overflow-hidden border border-slate-200">
                    <button
                      onClick={() => setTipoAsignacionEgresados('radicacion')}
                      className={`px-2 py-0.5 text-[8.5px] font-black ${tipoAsignacionEgresados === 'radicacion' ? 'bg-indigo-700 text-white' : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
                        }`}
                      title="Radicación Real: Retorno a Departamento de Origen por Especialidad (35.474 egresados)"
                    >
                      1. Radicación Real
                    </button>
                    <button
                      onClick={() => setTipoAsignacionEgresados('bolsa')}
                      className={`px-2 py-0.5 text-[8.5px] font-black ${tipoAsignacionEgresados === 'bolsa' ? 'bg-sky-600 text-white' : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
                        }`}
                      title="Bolsa Nacional Proporcional a Docentes"
                    >
                      2. Bolsa Nac.
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Barra Rápida de Selección de Territorio (Consolidado Nacional o por Departamento) */}
          <div className="flex flex-wrap items-center gap-1.5 pt-3 pb-1 border-t border-slate-100">
            <div className="flex items-center gap-1 mr-1 text-[11px] font-black text-slate-500 uppercase tracking-wider shrink-0">
              <MapPin className="w-3.5 h-3.5 text-emerald-700" />
              <span>Territorio:</span>
            </div>
            <button
              onClick={() => setFiltroDepto('TODOS')}
              className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all ${filtroDepto === 'TODOS'
                ? 'bg-emerald-800 text-white shadow-xs ring-2 ring-emerald-600/30'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200 font-bold'
                }`}
            >
              Consolidado Nacional (9 Deptos)
            </button>
            {departamentosList.map((dep) => (
              <button
                key={dep}
                onClick={() => setFiltroDepto(dep)}
                className={`px-2.5 py-1.5 rounded-xl text-xs transition-all ${filtroDepto === dep
                  ? 'bg-emerald-700 text-white font-black shadow-xs ring-2 ring-emerald-500/30'
                  : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200 font-semibold'
                  }`}
              >
                {dep}
              </button>
            ))}
          </div>

          {/* Barra Rápida de Selección de Territorio (Consolidado Nacional o por Departamento) */}
          <div className="flex flex-wrap items-center gap-1.5 pt-3 pb-1 border-t border-slate-100">
            <div className="flex items-center gap-1 mr-1 text-[11px] font-black text-slate-500 uppercase tracking-wider shrink-0">
              <MapPin className="w-3.5 h-3.5 text-emerald-700" />
              <span>Territorio:</span>
            </div>
            <button
              onClick={() => setFiltroDepto('TODOS')}
              className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all ${
                filtroDepto === 'TODOS'
                ? 'bg-emerald-800 text-white shadow-xs ring-2 ring-emerald-600/30'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200 font-bold'
              }`}
            >
              Consolidado Nacional (9 Deptos)
            </button>
            {departamentosList.map((dep) => (
              <button
                key={dep}
                onClick={() => setFiltroDepto(dep)}
                className={`px-2.5 py-1.5 rounded-xl text-xs transition-all ${
                  filtroDepto === dep
                  ? 'bg-emerald-700 text-white font-black shadow-xs ring-2 ring-emerald-500/30'
                  : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200 font-semibold'
                }`}
              >
                {dep}
              </button>
            ))}
          </div>

          {/* Buscador, Filtro por Nivel y Switches */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
            <div className="flex flex-wrap items-center gap-3">
              {/* Buscador */}
              <div className="relative w-60">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
                <input
                  type="text"
                  placeholder="Filtrar especialidad..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 text-xs font-semibold bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-600"
                />
              </div>

              {/* Filtro por Nivel */}
              <select
                value={filtroNivel}
                onChange={(e) => setFiltroNivel(e.target.value)}
                className="text-xs bg-white border border-slate-300 rounded-xl px-3 py-1.5 font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-600"
              >
                <option value="TODOS">Todos los Niveles Educativos (22 Especialidades)</option>
                <option value="INICIAL">Nivel Inicial</option>
                <option value="PRIMARIA">Nivel Primaria</option>
                <option value="SECUNDARIA">Nivel Secundaria</option>
                <option value="TECNICA">Técnica Tecnológica (BTH)</option>
                <option value="ESPECIAL">Educación Especial</option>
              </select>

              {/* Switches y Controles Exógenos */}
              <div className="flex flex-wrap items-center gap-2.5 bg-white px-3 py-1.5 rounded-xl border border-slate-200 text-[10px]">
                <label className="flex items-center gap-1.5 cursor-pointer font-bold text-slate-600 hover:text-slate-900">
                  <input
                    type="checkbox"
                    checked={aplicarArima}
                    onChange={(e) => setAplicarArima(e.target.checked)}
                    className="accent-indigo-600 rounded cursor-pointer"
                  />
                  Ajuste ARIMA
                </label>
                <div className="h-3.5 w-px bg-slate-200" />
                <div className="flex items-center gap-1.5">
                  <span className="font-bold text-sky-800 flex items-center gap-1">
                    <ArrowLeftRight className="w-3 h-3 text-sky-600" />
                    Saldo Migratorio:
                  </span>
                  <input
                    type="range"
                    min={0}
                    max={100}
                    step={1}
                    value={pctMigracion}
                    onChange={(e) => setPctMigracion(Number(e.target.value))}
                    className="w-16 h-1 accent-sky-600 cursor-pointer"
                  />
                  <div className="flex items-center">
                    <input
                      type="number"
                      min={0}
                      max={100}
                      step={1}
                      value={pctMigracion}
                      onChange={(e) => setPctMigracion(Math.min(100, Math.max(0, Number(e.target.value))))}
                      className="w-10 text-right font-black text-sky-800 font-mono bg-sky-50 px-1 py-0.5 rounded border border-sky-300 focus:outline-none focus:ring-1 focus:ring-sky-500 text-[10px]"
                    />
                    <span className="font-black text-sky-800 ml-0.5">%</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="text-[11px] font-bold text-slate-500">
              Mostrando {especialidadesCalculadas.length} de {data.especialidades.length} especialidades oficiales
            </div>
          </div>
        </div>
      </div>

      {/* ── Matriz Institucional Consolidada ─────────────────────────────────── */}
      <div className="bg-white rounded-3xl border border-slate-300 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left border-collapse">
            <thead className="bg-slate-800 text-white font-extrabold uppercase text-[10px] tracking-wider">
              {/* Nivel 1 de Cabecera */}
              <tr>
                <th rowSpan={2} className="py-3 px-3.5 border-r border-slate-700 align-bottom">
                  <span>Especialidad Oficial ESFM</span>
                  <span className="block text-[8px] font-medium text-slate-400 normal-case">Catálogo Ministerial</span>
                </th>
                <th rowSpan={2} className="py-3 px-1.5 text-center w-12 border-r border-slate-700 align-bottom">
                  <span>Ítem</span>
                  <span className="block text-[8px] font-medium text-slate-400 normal-case">Horas</span>
                </th>
                <th rowSpan={2} className="py-3 px-2 text-right w-24 border-r border-slate-700 text-slate-300 align-bottom">
                  <span>Déficit SIE</span>
                  <span className="block text-[8px] font-medium text-amber-300 normal-case">
                    {pctAbsorcionBth > 0 ? `+${pctAbsorcionBth}% BTH` : 'Base SIE'}
                  </span>
                </th>
                <th rowSpan={2} className="py-3 px-2 text-right w-20 border-r border-slate-700 text-rose-300 align-bottom">
                  <span>Jubilados</span>
                  <span className="block text-[8px] font-medium text-rose-400 normal-case">({tasaJubilacion}%)</span>
                </th>
                <th rowSpan={2} className="py-3 px-2 text-right w-20 border-r border-slate-700 text-orange-300 align-bottom">
                  <span>Prejubilados</span>
                  <span className="block text-[8px] font-medium text-orange-400 normal-case">({tasaPrejubilacion}%)</span>
                </th>
                <th rowSpan={2} className="py-3 px-2 text-right w-20 border-r border-slate-700 text-amber-300 align-bottom">
                  <span>A Sustituir</span>
                  <span className="block text-[8px] font-medium text-amber-400 normal-case">({tasaReemplazoNoPert}%)</span>
                </th>
                <th rowSpan={2} className="py-3 px-2 text-center w-28 border-r border-slate-700 text-sky-300 align-bottom">
                  <span>Migración Docente</span>
                  <span className="block text-[8px] font-medium text-sky-400 normal-case">Entr. / Sal. ({pctMigracion}%)</span>
                </th>
                <th rowSpan={2} className="py-3 px-1 text-center w-16 border-r border-slate-700 text-indigo-300 align-bottom">
                  <span>ARIMA</span>
                  <span className="block text-[8px] font-medium text-indigo-400 normal-case">2031</span>
                </th>
                <th
                  rowSpan={2}
                  onClick={() => setMostrarEjercicio(true)}
                  title="Click para ver la fórmula y el ejercicio de cálculo paso a paso"
                  className="py-3 px-2 text-right w-24 border-r border-slate-700 text-indigo-200 bg-indigo-950/60 cursor-pointer hover:bg-indigo-900/80 transition-colors group align-bottom"
                >
                  <div className="flex items-center justify-end gap-1">
                    <span>Demanda Bruta</span>
                    <Calculator className="w-2.5 h-2.5 text-amber-400 opacity-80 group-hover:opacity-100 group-hover:scale-125 transition-all" />
                  </div>
                  <span className="block text-[8px] font-medium text-indigo-400 normal-case">Total Necesidad</span>
                </th>

                {/* COLUMNA AGRUPADA: OFERTA DE EGRESADOS ESFM (2 MODELOS DIRECTOS) */}
                <th colSpan={2} className="py-1.5 px-2 text-center border-r border-slate-700 bg-slate-900/90 text-blue-200 border-b border-slate-700">
                  <div className="flex items-center justify-center gap-2">
                    <GraduationCap className="w-3.5 h-3.5 text-amber-300" />
                    <span className="font-black">Oferta Egresados ESFM (Titulación: {factorTit}%)</span>
                  </div>
                  <span className="block text-[8px] font-normal text-slate-300 normal-case tracking-normal">
                    Radicación Real vs Bolsa Nacional · Clic para alternar cálculo en Brecha Neta
                  </span>
                </th>

                <th rowSpan={2} className="py-3 px-3 text-center w-28 bg-slate-900 text-amber-300 font-black align-bottom">
                  <span>Brecha Neta</span>
                  <span className="block text-[8px] font-medium text-amber-400 normal-case">Admisión ESFM</span>
                </th>
              </tr>

              {/* Nivel 2 de Cabecera: Las 2 Subcolumnas de Egresados */}
              <tr className="bg-slate-900 text-[9px] uppercase tracking-wider">
                {/* 1. Radicación Real */}
                <th
                  onClick={() => setTipoAsignacionEgresados('radicacion')}
                  className={`py-2 px-2 text-right w-24 border-r border-slate-700 cursor-pointer transition-all ${tipoAsignacionEgresados === 'radicacion'
                    ? 'bg-indigo-600 text-white font-black ring-1 ring-indigo-300 shadow-inner'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800'
                    }`}
                  title="Click para calcular Brecha Neta con Radicación Real (Retorno de estudiantes a su depto)"
                >
                  <div className="flex items-center justify-end gap-1">
                    {tipoAsignacionEgresados === 'radicacion' && <span className="w-1.5 h-1.5 rounded-full bg-amber-300" />}
                    <span>1. Radicación Real</span>
                  </div>
                  <span className="block text-[7.5px] font-normal opacity-80 normal-case">Retorno a Depto</span>
                </th>

                {/* 2. Bolsa Nacional */}
                <th
                  onClick={() => setTipoAsignacionEgresados('bolsa')}
                  className={`py-2 px-2 text-right w-24 border-r border-slate-700 cursor-pointer transition-all ${tipoAsignacionEgresados === 'bolsa'
                    ? 'bg-sky-600 text-white font-black ring-1 ring-sky-300 shadow-inner'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800'
                    }`}
                  title="Click para calcular Brecha Neta con Bolsa Nacional Proporcional"
                >
                  <div className="flex items-center justify-end gap-1">
                    {tipoAsignacionEgresados === 'bolsa' && <span className="w-1.5 h-1.5 rounded-full bg-amber-300" />}
                    <span>2. Bolsa Nac.</span>
                  </div>
                  <span className="block text-[7.5px] font-normal opacity-80 normal-case">Cuota Deptal</span>
                </th>
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
                const totalGrupoDemanda = grupo.items.reduce((acc, it) => acc + it.metrics.demanda_total, 0);
                const totalGrupoRadicacion = grupo.items.reduce((acc, it) => acc + (it.metrics.egresados_radicacion_calc || 0), 0);
                const totalGrupoBolsa = grupo.items.reduce((acc, it) => acc + (it.metrics.egresados_bolsa_calc || 0), 0);
                const totalGrupoBrecha = grupo.items.reduce((acc, it) => acc + it.metrics.brecha_neta, 0);

                return (
                  <React.Fragment key={grupo.nivelCodigo}>
                    {/* Encabezado Coloreado por Nivel */}
                    <tr className={`${estilo.franja} border-t-2 border-b-2 font-black uppercase tracking-wider text-[11px]`}>
                      <td colSpan={12} className="py-2.5 px-4 border-r border-slate-300">
                        <div className="flex items-center justify-between">
                          <span className="flex items-center gap-2">
                            <span className="w-2.5 h-2.5 rounded-full bg-current opacity-80" />
                            <span>{grupo.nivelNombre}</span>
                          </span>
                          <span className="text-[10px] font-bold opacity-80 lowercase tracking-normal">
                            ({grupo.items.length} esp. · Demanda: {fmt(totalGrupoDemanda)} · Oferta [Radic: {fmt(totalGrupoRadicacion)} | Bolsa: {fmt(totalGrupoBolsa)}] · Brecha:{' '}
                            <strong className="text-current font-black">
                              {totalGrupoBrecha > 0 ? `+${fmt(totalGrupoBrecha)}` : fmt(totalGrupoBrecha)}
                            </strong>)
                          </span>
                        </div>
                      </td>
                    </tr>

                    {/* Filas de Especialidades */}
                    {grupo.items.map((esp) => {
                      const m = esp.metrics;
                      const esSuperavit = m.brecha_neta <= 0;
                      const esBth = BTH_SPECIALTY_IDS.has(esp.especialidad_id);

                      return (
                        <tr key={esp.especialidad_id} className="border-b border-slate-200 hover:bg-slate-50/80 transition-colors">
                          {/* Especialidad */}
                          <td className={`py-2 px-3 border-r border-slate-200 text-slate-900 ${estilo.borderLeft}`}>
                            <div className="flex items-center gap-2">
                              <span className={`px-1.5 py-0.5 rounded text-[9px] font-black uppercase tracking-wider border shrink-0 ${estilo.badge}`}>
                                {estilo.textNivel}
                              </span>
                              <span className="text-[9px] font-black px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200 shrink-0 font-mono">
                                ID {esp.especialidad_id}
                              </span>
                              <span className="font-bold text-slate-900 text-xs truncate max-w-xs" title={esp.nombre}>
                                {esp.nombre}
                              </span>
                            </div>
                          </td>

                          {/* Ítem */}
                          <td className="py-2 px-1 text-center border-r border-slate-200">
                            <span className="inline-block px-1 py-0.5 rounded bg-slate-100 font-mono text-[9px] font-bold text-slate-700 border border-slate-200">
                              {esp.hora_item ? `${esp.hora_item}h` : '96h'}
                            </span>
                          </td>

                          {/* Déficit SIE con Absorción BTH */}
                          <td className="py-2 px-2 text-right border-r border-slate-200 font-semibold text-slate-800 tabular-nums">
                            <div>
                              <span>{fmt(m.deficit_calculado)}</span>
                              {esBth && m.items_bth_absorbidos > 0 && (
                                <span className="block text-[8px] font-black text-amber-700 bg-amber-50 rounded px-1 mt-0.5">
                                  +{fmt(m.items_bth_absorbidos)} BTH
                                </span>
                              )}
                            </div>
                          </td>

                          {/* Jubilados Reales Calculados */}
                          <td className="py-2 px-2 text-right border-r border-slate-200 font-bold text-rose-700 tabular-nums">
                            {fmt(m.jubilacion_calculada)}
                          </td>

                          {/* Prejubilados Reales Calculados */}
                          <td className="py-2 px-2 text-right border-r border-slate-200 font-semibold text-orange-700 tabular-nums">
                            {fmt(m.prejubilacion_calculada)}
                          </td>

                          {/* Docentes a Sustituir (No Pertinentes) */}
                          <td className="py-2 px-2 text-right border-r border-slate-200 font-bold text-amber-800 tabular-nums">
                            {fmt(m.reemplazo_nopert)}
                          </td>

                          {/* Migración Detallada: Entrantes / Salientes (Saldo) */}
                          <td className="py-2 px-2 text-center border-r border-slate-200 font-mono text-[11px] tabular-nums">
                            <div className="flex flex-col items-center justify-center">
                              <span className="text-[10px] text-slate-600 font-semibold">
                                <span className="text-emerald-700 font-bold">+{fmt(m.migracion_entrantes)}</span>
                                <span className="text-slate-300 mx-0.5">/</span>
                                <span className="text-rose-700 font-bold">-{fmt(m.migracion_salientes)}</span>
                              </span>
                              <span className={`text-[9px] font-black mt-0.5 ${m.saldo_mig_aplicado > 0 ? 'text-rose-700' : (m.saldo_mig_aplicado < 0 ? 'text-emerald-700' : 'text-slate-400')
                                }`}>
                                {m.saldo_mig_aplicado > 0 ? `+${m.saldo_mig_aplicado} rep.` : (m.saldo_mig_aplicado < 0 ? `${m.saldo_mig_aplicado} lle.` : '0 saldo')}
                              </span>
                            </div>
                          </td>

                          {/* ARIMA 2031 */}
                          <td className="py-2 px-1 text-center border-r border-slate-200 font-mono text-[10px] tabular-nums">
                            {!aplicarArima ? (
                              <span className="text-slate-400">0%</span>
                            ) : (
                              <span className={m.arima_aplicado >= 0 ? 'text-emerald-700 font-bold' : 'text-slate-500 font-bold'}>
                                {m.arima_aplicado >= 0 ? `+${m.arima_aplicado.toFixed(1)}%` : `${m.arima_aplicado.toFixed(1)}%`}
                              </span>
                            )}
                          </td>

                          {/* Demanda Bruta */}
                          <td className="py-2 px-2 text-right border-r border-slate-200 font-black text-indigo-950 bg-indigo-50/30 tabular-nums">
                            {fmt(m.demanda_total)}
                          </td>

                          {/* 1. Egresados Radicación Real (Retorno de Estudiantes) */}
                          <td className={`py-2 px-2 text-right border-r border-slate-200 tabular-nums font-mono text-[11px] ${tipoAsignacionEgresados === 'radicacion'
                            ? 'bg-indigo-50/80 text-indigo-950 font-black ring-1 ring-inset ring-indigo-300'
                            : 'text-slate-600 font-semibold'
                            }`}>
                            <span>{fmt(m.egresados_radicacion_calc || 0)}</span>
                          </td>

                          {/* 2. Egresados Bolsa Nacional (Cuota Proporcional) */}
                          <td className={`py-2 px-2 text-right border-r border-slate-200 tabular-nums font-mono text-[11px] ${tipoAsignacionEgresados === 'bolsa'
                            ? 'bg-sky-50/80 text-sky-950 font-black ring-1 ring-inset ring-sky-300'
                            : 'text-slate-600 font-semibold'
                            }`}>
                            <span>{fmt(m.egresados_bolsa_calc || 0)}</span>
                          </td>

                          {/* Brecha Neta */}
                          <td className={`py-2 px-3 text-center font-black text-xs tabular-nums ${esSuperavit ? 'bg-emerald-50 text-emerald-900 border-l border-emerald-200' : 'bg-rose-50 text-rose-900 border-l border-rose-200'
                            }`}>
                            <div className="flex items-center justify-center gap-1.5">
                              {esSuperavit ? (
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                              ) : (
                                <AlertTriangle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                              )}
                              <span>{m.brecha_neta > 0 ? `+${fmt(m.brecha_neta)}` : fmt(m.brecha_neta)}</span>
                            </div>
                            <span className="block text-[8px] font-bold mt-0.5 opacity-80 uppercase tracking-tighter">
                              {esSuperavit ? 'Oferta Cubierta' : 'Abrir Plazas ESFM'}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </React.Fragment>
                );
              })}
            </tbody>

            {/* Total Consolidado */}
            <tfoot className="bg-slate-900 text-white font-bold text-xs border-t-2 border-slate-700">
              <tr>
                <td className="py-3 px-3.5 border-r border-slate-800 uppercase tracking-wider font-black">
                  TOTAL CONSOLIDADO ({filtroDepto})
                </td>
                <td className="py-3 px-1.5 text-center border-r border-slate-800 text-slate-400 font-mono text-[9px]">
                  —
                </td>
                <td className="py-3 px-2 text-right border-r border-slate-800 text-slate-300 font-bold tabular-nums">
                  {fmt(totales.totDeficit)}
                </td>
                <td className="py-3 px-2 text-right border-r border-slate-800 text-rose-300 font-bold tabular-nums">
                  {fmt(totales.totJub)}
                </td>
                <td className="py-3 px-2 text-right border-r border-slate-800 text-orange-300 font-bold tabular-nums">
                  {fmt(totales.totPrejub)}
                </td>
                <td className="py-3 px-2 text-right border-r border-slate-800 text-amber-300 font-bold tabular-nums">
                  {fmt(totales.totNoPert)}
                </td>
                <td className="py-3 px-2 text-center border-r border-slate-800 font-mono text-[10px]">
                  <div className="flex flex-col items-center">
                    <span className="text-[10px]">
                      <span className="text-emerald-400">+{fmt(totales.totEntrantes)}</span>
                      <span className="text-slate-500 mx-0.5">/</span>
                      <span className="text-rose-400">-{fmt(totales.totSalientes)}</span>
                    </span>
                    <span className="text-[9px] text-slate-400 font-bold">
                      {totales.totSaldoMig > 0 ? `+${fmt(totales.totSaldoMig)} rep.` : `${fmt(totales.totSaldoMig)}`}
                    </span>
                  </div>
                </td>
                <td className="py-3 px-1 text-center border-r border-slate-800 text-indigo-300 font-mono text-[10px]">
                  {!aplicarArima ? '0%' : (filtroDepto === 'TODOS' ? '-6.8%' : `${data.crecimiento_arima_por_depto[filtroDepto] || 0}%`)}
                </td>
                <td className="py-3 px-2 text-right border-r border-slate-800 text-indigo-200 font-black tabular-nums bg-indigo-950/80">
                  {fmt(totales.totDemanda)}
                </td>

                {/* Total 1. Radicación Real */}
                <td className={`py-3 px-2 text-right border-r border-slate-800 font-black tabular-nums font-mono text-[11px] ${tipoAsignacionEgresados === 'radicacion' ? 'bg-indigo-900/70 text-indigo-200 ring-1 ring-indigo-400' : 'text-slate-400'
                  }`}>
                  {fmt(totales.totEgrRadicacion)}
                </td>

                {/* Total 2. Bolsa Nacional */}
                <td className={`py-3 px-2 text-right border-r border-slate-800 font-black tabular-nums font-mono text-[11px] ${tipoAsignacionEgresados === 'bolsa' ? 'bg-sky-900/70 text-sky-200 ring-1 ring-sky-400' : 'text-slate-400'
                  }`}>
                  {fmt(totales.totEgrBolsa)}
                </td>

                <td className={`py-3 px-3 text-center font-black text-xs border-l border-slate-800 tabular-nums ${totales.totBrecha > 0 ? 'bg-rose-950 text-rose-300' : 'bg-emerald-950 text-emerald-300'
                  }`}>
                  <span className="block text-sm">
                    {totales.totBrecha > 0 ? `+${fmt(totales.totBrecha)}` : fmt(totales.totBrecha)}
                  </span>
                  <span className="block text-[8px] font-normal uppercase opacity-80 mt-0.5">
                    {totales.totBrecha > 0 ? 'Déficit Neto Global' : 'Superávit Global'}
                  </span>
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  );
}
