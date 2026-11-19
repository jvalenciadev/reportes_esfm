'use client';

import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import egresadosData from '@/data/egresados_esfm_proyeccion.json';
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
  ArrowRight
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
}

export default function EgresadosProyeccionView() {
  // ─── Estados Interactivos ───────────────────────────────────────────────────
  const [tasaAbandono, setTasaAbandono] = useState<number>(18); // Default 18% histórica DGFM
  const [filtroDepto, setFiltroDepto] = useState<string>('TODOS');
  const [filtroDictamen, setFiltroDictamen] = useState<string>('TODOS');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [subModo, setSubModo] = useState<'cohortes' | 'especialidades' | 'departamentos'>('cohortes');

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
      containerRef.current?.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  }, []);

  const tasaTitulacion = useMemo(() => 100 - tasaAbandono, [tasaAbandono]);
  const factorTit = useMemo(() => tasaTitulacion / 100, [tasaTitulacion]);
  const factorMerma = useMemo(() => tasaAbandono / 100, [tasaAbandono]);

  const cohortes: CohorteItem[] = egresadosData.cohortes as CohorteItem[];
  const departamentos: DepartamentoItem[] = egresadosData.departamentos as DepartamentoItem[];
  const especialidades: EspecialidadItem[] = egresadosData.especialidades as EspecialidadItem[];

  // ─── Cálculos Dinámicos por Cohorte ─────────────────────────────────────────
  const cohortesCalculadas = useMemo(() => {
    return cohortes
      .filter((c) => c.gestion_ingreso >= 2022) // Horizonte de egreso 2027–2031
      .map((c) => {
        let inscritos = c.total_inscritos;
        if (filtroDepto !== 'TODOS') {
          inscritos = c.por_dpto[filtroDepto] || 0;
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
    let deficitTotalMatriz = egresadosData.totales_nacionales.total_deficit_items_matriz;
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

  // ─── Especialidades Filtradas ───────────────────────────────────────────────
  const especialidadesFiltradas = useMemo(() => {
    return especialidades
      .filter((esp) => {
        if (filtroDictamen !== 'TODOS' && esp.dictamen !== filtroDictamen) return false;
        if (searchQuery.trim() && !esp.nombre.toLowerCase().includes(searchQuery.toLowerCase())) return false;
        return true;
      })
      .map((esp) => {
        let inscritos = esp.total_inscritos_2022_2026;
        let deficitMatriz = esp.items_deficit_matriz;

        if (filtroDepto !== 'TODOS') {
          inscritos = esp.por_dpto[filtroDepto] || 0;
        }

        const egresados = Math.round(inscritos * factorTit);
        const merma = inscritos - egresados;
        const balance = egresados - deficitMatriz;

        return {
          ...esp,
          inscritosDinamicos: inscritos,
          egresadosDinamicos: egresados,
          mermaDinamica: merma,
          deficitMatriz,
          balance
        };
      })
      .sort((a, b) => b.deficitMatriz - a.deficitMatriz);
  }, [especialidades, filtroDictamen, searchQuery, filtroDepto, factorTit]);

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

  // ─── Exportar CSV ───────────────────────────────────────────────────────────
  const handleExportCSV = useCallback(() => {
    const headers = [
      'Especialidad Oficial ESFM',
      'Inscritos Activos 2022-2026',
      `Tasa Abandono Simulado (${tasaAbandono}%)`,
      'Merma Alumnos',
      `Egresados Proyectados (${tasaTitulacion}%)`,
      'Déficit Ítems (Matriz de Calor SIE)',
      'Balance (Egresados - Déficit Matriz)',
      'Dictamen Oferta ESFM'
    ];
    const rows = especialidadesFiltradas.map((e) => [
      `"${e.nombre}"`,
      e.inscritosDinamicos,
      `${tasaAbandono}%`,
      e.mermaDinamica,
      e.egresadosDinamicos,
      e.deficitMatriz,
      e.balance > 0 ? `+${e.balance}` : e.balance,
      e.dictamen
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const link = document.createElement('a');
    link.setAttribute('href', encodeURI(csvContent));
    link.setAttribute('download', `proyeccion_egresados_esfm_merma_${tasaAbandono}pct.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }, [especialidadesFiltradas, tasaAbandono, tasaTitulacion]);

  return (
    <div ref={containerRef} className={isFullscreen ? 'bg-white overflow-y-auto p-6 space-y-6 h-full' : 'space-y-6'}>
      {/* ─── Banner Fullscreen ─────────────────────────────────────────────────── */}
      {isFullscreen && (
        <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-900 text-white px-5 py-3 rounded-2xl shadow-xl border border-slate-800 animate-fadeIn">
          <div className="flex items-center gap-3">
            <span className="text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-md bg-amber-500/20 text-amber-300 border border-amber-400/30">
              Pantalla Completa (F11)
            </span>
            <span className="text-sm font-bold text-white flex items-center gap-2">
              <GraduationCap className="w-4 h-4 text-amber-400" />
              Proyección de Egresados ESFM (Modelo de Cohortes y Abandono)
            </span>
          </div>

          <button
            type="button"
            onClick={handleFullscreen}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-rose-600 hover:bg-rose-500 text-white transition-colors shadow-sm"
          >
            <Minimize2 className="w-3.5 h-3.5" />
            <span>Salir (Esc)</span>
          </button>
        </div>
      )}

      {/* ─── Diagrama Explicativo de Flujo Rápido (De Ingreso a Egreso) ─────── */}
      <div className="bg-slate-900 text-white rounded-2xl p-4 sm:p-5 shadow-sm border border-slate-800">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <span className="text-[10px] font-black uppercase tracking-widest text-amber-400">
              ¿Cómo funciona este modelo?
            </span>
            <h3 className="text-sm sm:text-base font-extrabold text-white">
              De cada 100 estudiantes que ingresan a la ESFM, {tasaAbandono} abandonan a lo largo de los 5 años y {tasaTitulacion} se gradúan como nuevos maestros.
            </h3>
            <p className="text-xs text-slate-400">
              Seguimiento de las 5 promociones en formación activa (ingresos 2022 a 2026) que saldrán al sistema educativo entre 2027 y 2031.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 bg-slate-800/80 p-2.5 rounded-xl border border-slate-700/60 font-mono text-xs">
            <div className="px-3 py-1.5 rounded-lg bg-indigo-950/80 border border-indigo-500/40 text-indigo-200">
              <span className="text-[10px] text-indigo-400 block font-sans">1. Ingresaron</span>
              <strong>{totalesDinamicos.totalInscritos.toLocaleString('es-BO')}</strong> alumnos
            </div>

            <ArrowRight className="w-4 h-4 text-slate-400" />

            <div className="px-3 py-1.5 rounded-lg bg-rose-950/80 border border-rose-500/40 text-rose-200">
              <span className="text-[10px] text-rose-400 block font-sans">2. Abandonan ({tasaAbandono}%)</span>
              <strong>-{totalesDinamicos.totalMerma.toLocaleString('es-BO')}</strong> bajas
            </div>

            <ArrowRight className="w-4 h-4 text-slate-400" />

            <div className="px-3 py-1.5 rounded-lg bg-emerald-950/80 border border-emerald-500/40 text-emerald-200">
              <span className="text-[10px] text-emerald-400 block font-sans">3. Se Gradúan ({tasaTitulacion}%)</span>
              <strong>+{totalesDinamicos.totalEgresados.toLocaleString('es-BO')}</strong> maestros
            </div>
          </div>
        </div>
      </div>

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
        <div className={`bg-white rounded-2xl p-4 border shadow-2xs flex flex-col justify-between ${
          totalesDinamicos.balance >= 0
            ? 'border-amber-200 bg-amber-50/20'
            : 'border-emerald-200 bg-emerald-50/20'
        }`}>
          <div className="flex items-center justify-between text-slate-700">
            <span className="text-[11px] font-bold uppercase tracking-wider">Balance Oferta vs Déficit</span>
            <span className={`p-1.5 rounded-lg ${
              totalesDinamicos.balance >= 0 ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'
            }`}>
              {totalesDinamicos.balance >= 0 ? <AlertCircle className="w-4 h-4" /> : <ShieldAlert className="w-4 h-4" />}
            </span>
          </div>
          <div className="mt-2">
            <div className="flex items-baseline gap-2">
              <span className={`text-2xl font-black tracking-tight ${
                totalesDinamicos.balance >= 0 ? 'text-amber-800' : 'text-emerald-700'
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
                className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all ${
                  tasaAbandono === preset.val
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
            onClick={() => setSubModo('cohortes')}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
              subModo === 'cohortes'
                ? 'bg-white text-indigo-900 shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Layers className="w-3.5 h-3.5 text-indigo-600" />
            <span>Cascada de Cohortes (2022–2026)</span>
          </button>

          <button
            type="button"
            onClick={() => setSubModo('especialidades')}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
              subModo === 'especialidades'
                ? 'bg-white text-indigo-900 shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <BarChart3 className="w-3.5 h-3.5 text-emerald-600" />
            <span>Matriz por Especialidad Oficial</span>
          </button>

          <button
            type="button"
            onClick={() => setSubModo('departamentos')}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
              subModo === 'departamentos'
                ? 'bg-white text-indigo-900 shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Building2 className="w-3.5 h-3.5 text-amber-600" />
            <span>Desglose por Departamento</span>
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

          <button
            type="button"
            onClick={handleFullscreen}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-slate-50 text-slate-700 border border-slate-200 hover:bg-slate-100 transition-colors"
            title="Pantalla Completa (F11)"
          >
            {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
            <span className="hidden sm:inline">{isFullscreen ? 'Salir' : 'Pantalla Completa'}</span>
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
          VISTA 2: MATRIZ POR ESPECIALIDAD OFICIAL (DICTAMEN DE APERTURA)
      ═══════════════════════════════════════════════════════════════ */}
      {subModo === 'especialidades' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden animate-fadeIn">
          <div className="p-5 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-emerald-600" />
                Matriz de Egresados vs Déficit de Ítems Docentes (Matriz de Calor SIE)
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Balance de nuevos maestros titulados frente a los 7.803 ítems de déficit auditados en aula por especialidad.
              </p>
            </div>

            {/* Buscador y Filtro Dictamen */}
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Buscar especialidad..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="text-xs bg-slate-50 border border-slate-200 rounded-xl pl-8 pr-3 py-1.5 w-44 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
                />
              </div>

              <select
                value={filtroDictamen}
                onChange={(e) => setFiltroDictamen(e.target.value)}
                className="text-xs bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="TODOS">Todos los Dictámenes</option>
                <option value="ABRIR">ABRIR (Déficit)</option>
                <option value="REGULAR">REGULAR (Equilibrio)</option>
                <option value="CONGELAR">CONGELAR (Saturado)</option>
              </select>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 text-slate-600 font-extrabold uppercase text-[10px] tracking-wider border-b border-slate-200">
                <tr>
                  <th className="py-3 px-3">Especialidad Oficial ESFM</th>
                  <th className="py-3 px-3 text-right">Inscritos 22–26</th>
                  <th className="py-3 px-3 text-right text-rose-700">Merma ({tasaAbandono}%)</th>
                  <th className="py-3 px-3 text-right text-emerald-700 bg-emerald-50/50 font-black">Egresados ({tasaTitulacion}%)</th>
                  <th className="py-3 px-3 text-right text-rose-800 font-black bg-rose-50/30">Déficit Matriz SIE</th>
                  <th className="py-3 px-3 text-center">Balance Oferta</th>
                  <th className="py-3 px-3 text-center">Dictamen DGFM</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {especialidadesFiltradas.map((esp) => {
                  let badgeClass = 'bg-slate-100 text-slate-700 border-slate-200';
                  if (esp.dictamen === 'ABRIR') badgeClass = 'bg-emerald-50 text-emerald-800 border-emerald-300 font-black';
                  else if (esp.dictamen === 'REGULAR') badgeClass = 'bg-amber-50 text-amber-800 border-amber-300 font-bold';
                  else if (esp.dictamen === 'CONGELAR') badgeClass = 'bg-rose-50 text-rose-800 border-rose-300 font-black';

                  return (
                    <tr key={esp.especialidad_id} className="hover:bg-slate-50 transition-colors">
                      <td className="py-2.5 px-3">
                        <span className="font-bold text-slate-900 block">{esp.nombre}</span>
                        <span className="text-[10px] text-slate-500 line-clamp-1">{esp.justificacion}</span>
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono text-slate-700">
                        {esp.inscritosDinamicos.toLocaleString('es-BO')}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono font-semibold text-rose-600">
                        -{esp.mermaDinamica.toLocaleString('es-BO')}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono font-black text-emerald-700 bg-emerald-50/30">
                        +{esp.egresadosDinamicos.toLocaleString('es-BO')}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono font-black text-rose-700 bg-rose-50/20">
                        {esp.deficitMatriz.toLocaleString('es-BO')}
                      </td>
                      <td className="py-2.5 px-3 text-center font-mono">
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black inline-flex items-center gap-1 ${
                          esp.balance > 200
                            ? 'bg-rose-100 text-rose-800 border border-rose-200'
                            : esp.balance < 0
                            ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                            : 'bg-amber-100 text-amber-800 border border-amber-200'
                        }`}>
                          {esp.balance > 0 ? `+${esp.balance.toLocaleString('es-BO')}` : esp.balance.toLocaleString('es-BO')}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <span className={`px-2.5 py-1 rounded-lg text-[10px] uppercase tracking-wider border ${badgeClass}`}>
                          {esp.dictamen}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot className="bg-slate-100 text-slate-900 font-black text-xs border-t-2 border-slate-300">
                <tr>
                  <td className="py-3 px-3 uppercase tracking-wider font-extrabold">Total Consolidado</td>
                  <td className="py-3 px-3 text-right font-mono">{totalesDinamicos.totalInscritos.toLocaleString('es-BO')}</td>
                  <td className="py-3 px-3 text-right font-mono text-rose-600">-{totalesDinamicos.totalMerma.toLocaleString('es-BO')}</td>
                  <td className="py-3 px-3 text-right font-mono text-emerald-700 bg-emerald-100/50">+{totalesDinamicos.totalEgresados.toLocaleString('es-BO')}</td>
                  <td className="py-3 px-3 text-right font-mono text-rose-700 bg-rose-100/50">{totalesDinamicos.deficitTotalMatriz.toLocaleString('es-BO')}</td>
                  <td className="py-3 px-3 text-center font-mono">
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-amber-100 text-amber-900 border border-amber-300">
                      {totalesDinamicos.balance >= 0 ? `+${totalesDinamicos.balance.toLocaleString('es-BO')}` : totalesDinamicos.balance.toLocaleString('es-BO')}
                    </span>
                  </td>
                  <td className="py-3 px-3 text-center text-[10px] uppercase font-bold text-slate-600">
                    {totalesDinamicos.balance > 0 ? 'SOBREOFERTA GLOBAL' : 'DÉFICIT GLOBAL'}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════
          VISTA 3: DESGLOSE POR DEPARTAMENTO
      ═══════════════════════════════════════════════════════════════ */}
      {subModo === 'departamentos' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 space-y-4 animate-fadeIn">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
            <div>
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Building2 className="w-4 h-4 text-amber-600" />
                Oferta de Egresados por Departamento (Cohortes 2022–2026)
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Volumen acumulado de egresos proyectados en las ESFM y Unidades Académicas de cada departamento.
              </p>
            </div>
            <span className="text-xs font-mono font-bold text-slate-500">
              9 Departamentos
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {departamentosCalculados.map((d) => (
              <div key={d.departamento_id} className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
                <div className="flex justify-between items-center">
                  <span className="font-black text-slate-900 text-sm">{d.departamento}</span>
                  <span className="px-2 py-0.5 rounded bg-amber-100 text-amber-900 font-bold text-[10px]">
                    ESFM Dptal.
                  </span>
                </div>

                <div className="space-y-1 text-xs font-mono">
                  <div className="flex justify-between text-slate-600">
                    <span>Inscritos 2022–26:</span>
                    <strong>{d.inscritos.toLocaleString('es-BO')}</strong>
                  </div>
                  <div className="flex justify-between text-rose-600">
                    <span>Merma ({tasaAbandono}%):</span>
                    <strong>-{d.merma.toLocaleString('es-BO')}</strong>
                  </div>
                  <div className="flex justify-between text-emerald-700 font-bold border-t border-slate-200 pt-1">
                    <span>Egresados Netos:</span>
                    <span className="text-sm">+{d.egresados.toLocaleString('es-BO')}</span>
                  </div>
                </div>

                <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-emerald-500 rounded-full"
                    style={{ width: `${tasaTitulacion}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
