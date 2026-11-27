'use client';

import React, { useMemo, useState } from 'react';
import {
  Building2,
  TrendingUp,
  TrendingDown,
  UserMinus,
  Users,
  SlidersHorizontal,
  BarChart3,
  ArrowLeft,
  Calendar,
} from 'lucide-react';
import pertinenciaData from '@/data/pertinencia_data.json';
import { getProyeccionDemograficaCalibrada } from '@/lib/demografiaProyeccion';

interface ResumenDepartamentalViewProps {
  onBackToBalance?: () => void;
  tasaJubilacion?: number;
  setTasaJubilacion?: (v: number) => void;
  tasaPrejubilacion?: number;
  setTasaPrejubilacion?: (v: number) => void;
}

interface JubDeptoRow {
  departamento: string;
  jubilacion: number;
  prejubilacion: number;
  total: number;
}

interface ArimaYearPoint {
  anio: number;
  tipo: string;
  matricula_real?: number | null;
  modelo_2_cobertura?: number | null;
  modelo_arima?: number | null;
  modelo_consenso?: number | null;
}

const DEPTO_KEY_TO_LABEL: Record<string, string> = {
  chuquisaca: 'CHUQUISACA',
  la_paz: 'LA PAZ',
  cochabamba: 'COCHABAMBA',
  oruro: 'ORURO',
  potosi: 'POTOSÍ',
  tarija: 'TARIJA',
  santa_cruz: 'SANTA CRUZ',
  beni: 'BENI',
  pando: 'PANDO',
};

const YEARS_PROYECCION = [2027, 2028, 2029, 2030, 2031] as const;

export function ResumenDepartamentalView({
  onBackToBalance,
  tasaJubilacion: propTasaJub,
  setTasaJubilacion: propSetTasaJub,
  tasaPrejubilacion: propTasaPrejub,
  setTasaPrejubilacion: propSetTasaPrejub,
}: ResumenDepartamentalViewProps) {
  const [localTasaJub, setLocalTasaJub] = useState<number>(20);
  const [localTasaPrejub, setLocalTasaPrejub] = useState<number>(10);
  const tasaJubilacion = propTasaJub ?? localTasaJub;
  const setTasaJubilacion = propSetTasaJub ?? setLocalTasaJub;
  const tasaPrejubilacion = propTasaPrejub ?? localTasaPrejub;
  const setTasaPrejubilacion = propSetTasaPrejub ?? setLocalTasaPrejub;
  const [mostrarMatriculaArima, setMostrarMatriculaArima] = useState<boolean>(true);
  const [modeloDemografico, setModeloDemografico] = useState<'hibrido' | 'arima'>('hibrido');
  const [nivelDemografico, setNivelDemografico] = useState<'todos' | 'inicial' | 'primaria' | 'secundaria'>('todos');

  const fmt = (n: number) => n.toLocaleString('es-BO');

  // 1. Consolidado de Jubilación y Prejubilación por Departamento (Fuente: Padrón SICH)
  const jubilacionPorDepto = useMemo(() => {
    const raw = (pertinenciaData as { jubilacion?: { por_departamento?: JubDeptoRow[] } })
      .jubilacion?.por_departamento ?? [];

    const rows = raw
      .map((r) => {
        const jubSim = Math.round(r.jubilacion * (tasaJubilacion / 100));
        const prejubSim = Math.round(r.prejubilacion * (tasaPrejubilacion / 100));
        const pctJubSobreTotal = r.total > 0 ? (r.jubilacion / r.total) * 100 : 0;
        const pctPrejubSobreTotal = r.total > 0 ? (r.prejubilacion / r.total) * 100 : 0;
        return {
          ...r,
          jubSim,
          prejubSim,
          totalBajasSim: jubSim + prejubSim,
          pctJubSobreTotal,
          pctPrejubSobreTotal,
        };
      })
      .sort((a, b) => b.total - a.total);

    const totals = rows.reduce(
      (acc, r) => ({
        total: acc.total + r.total,
        jubilacion: acc.jubilacion + r.jubilacion,
        prejubilacion: acc.prejubilacion + r.prejubilacion,
        jubSim: acc.jubSim + r.jubSim,
        prejubSim: acc.prejubSim + r.prejubSim,
        totalBajasSim: acc.totalBajasSim + r.totalBajasSim,
      }),
      { total: 0, jubilacion: 0, prejubilacion: 0, jubSim: 0, prejubSim: 0, totalBajasSim: 0 }
    );

    return { rows, totals };
  }, [tasaJubilacion, tasaPrejubilacion]);

  // 2. Proyección Demográfica Calibrada por Año, Nivel y Departamento (2026 -> 2031)
  // Garantiza cuadre exacto: la suma de los 9 departamentos es idéntica al Total Nacional y a Balance Predictivo / Dashboard Ejecutivo
  const arimaPorDepto = useMemo(() => {
    const cal = getProyeccionDemograficaCalibrada();
    const deptoMap =
      nivelDemografico === 'todos' ? cal.deptoPorAnio : cal.nivelDeptoPorAnio[nivelDemografico];
    const nacionalSeries =
      nivelDemografico === 'todos' ? cal.nacionalPorAnio : cal.nivelNacionalPorAnio[nivelDemografico];

    const buildRow = (
      label: string,
      seriesByYear: Record<number, { realOrBase: number; arima: number; hibrido: number }>
    ) => {
      const base2026 = seriesByYear[2026]?.realOrBase ?? 0;
      let prevVal = base2026;
      const porAnio: Record<number, { matricula: number; pctAnual: number }> = {};

      for (const yr of YEARS_PROYECCION) {
        const pt = seriesByYear[yr];
        const val = modeloDemografico === 'hibrido' ? (pt?.hibrido ?? prevVal) : (pt?.arima ?? prevVal);
        const pct = prevVal > 0 ? ((val - prevVal) / prevVal) * 100 : 0;
        porAnio[yr] = { matricula: val, pctAnual: pct };
        prevVal = val;
      }

      const val2031 = porAnio[2031]?.matricula ?? base2026;
      const pctAcumulado = base2026 > 0 ? ((val2031 - base2026) / base2026) * 100 : 0;

      return {
        departamento: label,
        base2026,
        porAnio,
        val2031,
        pctAcumulado,
      };
    };

    const deptRows = Object.entries(DEPTO_KEY_TO_LABEL).map(([key, label]) =>
      buildRow(label, deptoMap[key as keyof typeof deptoMap] ?? {})
    );

    // Ordenar por variación acumulada descendente (crecimiento arriba, contracción abajo)
    deptRows.sort((a, b) => b.pctAcumulado - a.pctAcumulado);

    const nacionalRow = buildRow('TOTAL NACIONAL', nacionalSeries);

    return { deptRows, nacionalRow };
  }, [modeloDemografico, nivelDemografico]);

  return (
    <div className="space-y-6 animate-in fade-in duration-300 pb-10">
      {/* ── Cabecera Institucional ─────────────────────────────────────────── */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 shadow-xs space-y-5">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#0f2942] text-white flex items-center justify-center shadow-xs shrink-0">
              <BarChart3 className="w-5 h-5 text-[#c9a751]" />
            </div>
            <div>
              <h1 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white tracking-tight">
                Resumen Predictivo Departamental: Jubilación, Prejubilados y ARIMA (2027–2031)
              </h1>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Desagregación territorial por departamento de bajas docentes (SICH) y tasa anual de crecimiento o decrecimiento de matrícula escolar (ARIMA).
              </p>
            </div>
          </div>

          {onBackToBalance && (
            <button
              type="button"
              onClick={onBackToBalance}
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-100 border border-slate-200 dark:border-slate-700 transition-colors cursor-pointer shrink-0"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Volver a Balance Predictivo</span>
            </button>
          )}
        </div>

        {/* ── 4 KPIs Nacionales ────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="bg-slate-50 dark:bg-slate-800/60 rounded-2xl p-4 border border-slate-200 dark:border-slate-700">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                Padrón Docente SEP
              </span>
              <Users className="w-4 h-4 text-slate-400" />
            </div>
            <span className="text-2xl font-black text-slate-900 dark:text-white mt-1 block tabular-nums">
              {fmt(jubilacionPorDepto.totals.total)}
            </span>
            <span className="text-[10px] text-slate-500 dark:text-slate-400">
              Maestros activos en 9 departamentos
            </span>
          </div>

          <div className="bg-rose-50/70 dark:bg-rose-950/30 rounded-2xl p-4 border border-rose-200 dark:border-rose-900/60">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black text-rose-700 dark:text-rose-300 uppercase tracking-wider">
                Candidatos Jubilación (60+)
              </span>
              <UserMinus className="w-4 h-4 text-rose-500" />
            </div>
            <span className="text-2xl font-black text-rose-950 dark:text-rose-200 mt-1 block tabular-nums">
              {fmt(jubilacionPorDepto.totals.jubilacion)}
            </span>
            <span className="text-[10px] text-rose-700 dark:text-rose-300 font-semibold">
              Simulado ({tasaJubilacion}%): <strong>{fmt(jubilacionPorDepto.totals.jubSim)}</strong> bajas
            </span>
          </div>

          <div className="bg-amber-50/70 dark:bg-amber-950/30 rounded-2xl p-4 border border-amber-200 dark:border-amber-900/60">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black text-amber-800 dark:text-amber-300 uppercase tracking-wider">
                Prejubilados (2026–2031)
              </span>
              <Building2 className="w-4 h-4 text-amber-600" />
            </div>
            <span className="text-2xl font-black text-amber-950 dark:text-amber-200 mt-1 block tabular-nums">
              {fmt(jubilacionPorDepto.totals.prejubilacion)}
            </span>
            <span className="text-[10px] text-amber-800 dark:text-amber-300 font-semibold">
              Simulado ({tasaPrejubilacion}%): <strong>{fmt(jubilacionPorDepto.totals.prejubSim)}</strong> bajas
            </span>
          </div>

          <div className="bg-indigo-50/70 dark:bg-indigo-950/30 rounded-2xl p-4 border border-indigo-200 dark:border-indigo-900/60">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black text-indigo-800 dark:text-indigo-300 uppercase tracking-wider">
                {modeloDemografico === 'hibrido' ? 'Consenso Híbrido (2026→2031)' : 'ARIMA Puro (2026→2031)'}
              </span>
              {arimaPorDepto.nacionalRow.pctAcumulado >= 0 ? (
                <TrendingUp className="w-4 h-4 text-emerald-600" />
              ) : (
                <TrendingDown className="w-4 h-4 text-rose-600" />
              )}
            </div>
            <span
              className={`text-2xl font-black mt-1 block tabular-nums ${
                arimaPorDepto.nacionalRow.pctAcumulado >= 0
                  ? 'text-emerald-700 dark:text-emerald-300'
                  : 'text-rose-700 dark:text-rose-300'
              }`}
            >
              {arimaPorDepto.nacionalRow.pctAcumulado >= 0 ? '+' : ''}
              {arimaPorDepto.nacionalRow.pctAcumulado.toFixed(2)}%
            </span>
            <span className="text-[10px] text-indigo-700 dark:text-indigo-300 font-semibold">
              {fmt(arimaPorDepto.nacionalRow.base2026)} → {fmt(arimaPorDepto.nacionalRow.val2031)} est.
            </span>
          </div>
        </div>

        {/* ── Controles de Simulación de Retiro por Departamento ──────────── */}
        <div className="bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-2xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-xs font-black text-slate-800 dark:text-slate-100">
            <SlidersHorizontal className="w-4 h-4 text-[#c9a751]" />
            <span>Simulador Territorial de Retiro:</span>
          </div>

          <div className="flex flex-wrap items-center gap-6 text-xs flex-1 md:justify-end">
            <div className="flex items-center gap-3 min-w-[230px]">
              <span className="font-bold text-rose-800 dark:text-rose-300 whitespace-nowrap">
                Jubilación:
              </span>
              <input
                type="range"
                min={0}
                max={100}
                step={1}
                value={tasaJubilacion}
                onChange={(e) => setTasaJubilacion(Number(e.target.value))}
                className="w-28 accent-rose-600 cursor-pointer"
              />
              <span className="font-mono font-black text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-950/60 px-2 py-0.5 rounded border border-rose-200 dark:border-rose-800 w-12 text-center">
                {tasaJubilacion}%
              </span>
            </div>

            <div className="flex items-center gap-3 min-w-[230px]">
              <span className="font-bold text-amber-800 dark:text-amber-300 whitespace-nowrap">
                Prejubilados:
              </span>
              <input
                type="range"
                min={0}
                max={100}
                step={1}
                value={tasaPrejubilacion}
                onChange={(e) => setTasaPrejubilacion(Number(e.target.value))}
                className="w-28 accent-amber-600 cursor-pointer"
              />
              <span className="font-mono font-black text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/60 px-2 py-0.5 rounded border border-amber-200 dark:border-amber-800 w-12 text-center">
                {tasaPrejubilacion}%
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ── SECCIÓN 1: JUBILACIÓN Y PREJUBILACIÓN POR DEPARTAMENTO ──────────── */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-slate-50/70 dark:bg-slate-950/40">
          <div>
            <h2 className="text-sm font-black text-[#0f2942] dark:text-white flex items-center gap-2">
              <UserMinus className="w-4 h-4 text-rose-600" />
              1. Predicción de Jubilación y Prejubilación por Departamento (Padrón SICH)
            </h2>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Universo total de maestros en edad de retiro (100% base) vs vacantes proyectadas según tasas de reemplazo ({tasaJubilacion}% Jub. y {tasaPrejubilacion}% Prejub.).
            </p>
          </div>
          <span className="text-[11px] font-black bg-rose-50 dark:bg-rose-950/60 text-rose-800 dark:text-rose-200 px-3 py-1 rounded-lg border border-rose-200 dark:border-rose-800 shrink-0">
            Total Bajas Simuladas: {fmt(jubilacionPorDepto.totals.totalBajasSim)}
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left border-collapse">
            <thead>
              <tr className="bg-[#0f2942] text-white text-[10px] uppercase tracking-wider border-b-2 border-[#c9a751]">
                <th className="py-3 px-4 font-black">Departamento</th>
                <th className="py-3 px-3 text-right font-black">Total Docentes SEP</th>
                <th className="py-3 px-3 text-right font-black text-rose-200">
                  Jubilación (100% Base)
                </th>
                <th className="py-3 px-3 text-right font-black text-rose-300 bg-rose-950/50">
                  Jub. Simulada ({tasaJubilacion}%)
                </th>
                <th className="py-3 px-3 text-right font-black text-amber-200">
                  Prejubilados (100% Base)
                </th>
                <th className="py-3 px-3 text-right font-black text-amber-300 bg-amber-950/50">
                  Prejub. Sim. ({tasaPrejubilacion}%)
                </th>
                <th className="py-3 px-4 text-right font-black bg-slate-900 text-[#c9a751]">
                  Total Bajas Sim.
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {jubilacionPorDepto.rows.map((r) => (
                <tr
                  key={r.departamento}
                  className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                >
                  <td className="py-2.5 px-4 font-black text-slate-900 dark:text-white">
                    {r.departamento}
                  </td>
                  <td className="py-2.5 px-3 text-right tabular-nums text-slate-600 dark:text-slate-300 font-semibold">
                    {fmt(r.total)}
                  </td>
                  <td className="py-2.5 px-3 text-right tabular-nums">
                    <span className="font-bold text-rose-700 dark:text-rose-400">
                      {fmt(r.jubilacion)}
                    </span>
                    <span className="text-[10px] text-slate-400 ml-1">
                      ({r.pctJubSobreTotal.toFixed(1)}%)
                    </span>
                  </td>
                  <td className="py-2.5 px-3 text-right tabular-nums font-black text-rose-800 dark:text-rose-300 bg-rose-50/50 dark:bg-rose-950/20">
                    {fmt(r.jubSim)}
                  </td>
                  <td className="py-2.5 px-3 text-right tabular-nums">
                    <span className="font-bold text-amber-700 dark:text-amber-400">
                      {fmt(r.prejubilacion)}
                    </span>
                    <span className="text-[10px] text-slate-400 ml-1">
                      ({r.pctPrejubSobreTotal.toFixed(1)}%)
                    </span>
                  </td>
                  <td className="py-2.5 px-3 text-right tabular-nums font-black text-amber-800 dark:text-amber-300 bg-amber-50/50 dark:bg-amber-950/20">
                    {fmt(r.prejubSim)}
                  </td>
                  <td className="py-2.5 px-4 text-right tabular-nums font-black text-[#0f2942] dark:text-[#c9a751] bg-slate-50 dark:bg-slate-800/40">
                    {fmt(r.totalBajasSim)}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-slate-900 text-white font-black text-xs border-t-2 border-[#c9a751]">
                <td className="py-3 px-4 uppercase tracking-wider">TOTAL NACIONAL</td>
                <td className="py-3 px-3 text-right tabular-nums">
                  {fmt(jubilacionPorDepto.totals.total)}
                </td>
                <td className="py-3 px-3 text-right tabular-nums text-rose-300">
                  {fmt(jubilacionPorDepto.totals.jubilacion)}
                </td>
                <td className="py-3 px-3 text-right tabular-nums text-rose-200 bg-rose-950/60">
                  {fmt(jubilacionPorDepto.totals.jubSim)}
                </td>
                <td className="py-3 px-3 text-right tabular-nums text-amber-300">
                  {fmt(jubilacionPorDepto.totals.prejubilacion)}
                </td>
                <td className="py-3 px-3 text-right tabular-nums text-amber-200 bg-amber-950/60">
                  {fmt(jubilacionPorDepto.totals.prejubSim)}
                </td>
                <td className="py-3 px-4 text-right tabular-nums text-[#c9a751]">
                  {fmt(jubilacionPorDepto.totals.totalBajasSim)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* ── SECCIÓN 2: ARIMA POR AÑO Y DEPARTAMENTO (CRECIMIENTO / DECRECIMIENTO) ── */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/70 dark:bg-slate-950/40">
          <div>
            <h2 className="text-sm font-black text-[#0f2942] dark:text-white flex items-center gap-2">
              <Calendar className="w-4 h-4 text-indigo-600" />
              {modeloDemografico === 'hibrido'
                ? '2. Proyección Demográfica Consenso Híbrido (INE + ARIMA) por Año y Departamento (2027–2031)'
                : '2. Proyección Demográfica ARIMA(1,1,0) Puro por Año y Departamento (2027–2031)'}
            </h2>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              {modeloDemografico === 'hibrido'
                ? 'Ensamble óptimo 50% Planificado (Población INE × Cobertura SIE) + 50% Inercia ARIMA(1,1,0). Crecimiento (+) o decrecimiento (−) anual por departamento.'
                : 'Porcentaje anual de crecimiento (+) o decrecimiento (−) de la población escolar matriculada según inercia histórica ARIMA(1,1,0).'}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            {/* Filtro por Nivel Educativo */}
            <div className="inline-flex rounded-xl bg-slate-100 dark:bg-slate-800 p-0.5 border border-slate-200 dark:border-slate-700 text-[11px]">
              {(
                [
                  { id: 'todos', label: 'Todos' },
                  { id: 'inicial', label: 'Inicial' },
                  { id: 'primaria', label: 'Primaria' },
                  { id: 'secundaria', label: 'Secundaria' },
                ] as const
              ).map((niv) => (
                <button
                  key={niv.id}
                  type="button"
                  onClick={() => setNivelDemografico(niv.id)}
                  className={`px-2.5 py-1 rounded-lg font-bold transition-colors cursor-pointer ${
                    nivelDemografico === niv.id
                      ? 'bg-[#c9a751] text-[#0f172a] font-black shadow-2xs'
                      : 'text-slate-600 dark:text-slate-300 hover:text-slate-900'
                  }`}
                >
                  {niv.label}
                </button>
              ))}
            </div>

            <div className="inline-flex rounded-xl bg-slate-100 dark:bg-slate-800 p-0.5 border border-slate-200 dark:border-slate-700 text-[11px]">
              <button
                type="button"
                onClick={() => setModeloDemografico('hibrido')}
                className={`px-2.5 py-1 rounded-lg font-bold transition-colors cursor-pointer ${
                  modeloDemografico === 'hibrido'
                    ? 'bg-indigo-700 text-white shadow-2xs'
                    : 'text-slate-600 dark:text-slate-300 hover:text-slate-900'
                }`}
              >
                Consenso Híbrido (INE + ARIMA)
              </button>
              <button
                type="button"
                onClick={() => setModeloDemografico('arima')}
                className={`px-2.5 py-1 rounded-lg font-bold transition-colors cursor-pointer ${
                  modeloDemografico === 'arima'
                    ? 'bg-[#0f2942] text-white shadow-2xs'
                    : 'text-slate-600 dark:text-slate-300 hover:text-slate-900'
                }`}
              >
                ARIMA(1,1,0) Puro
              </button>
            </div>

            <button
              type="button"
              onClick={() => setMostrarMatriculaArima((v) => !v)}
              className="px-3 py-1.5 rounded-xl text-[11px] font-bold bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors cursor-pointer shrink-0"
            >
              {mostrarMatriculaArima ? 'Ver Solo Porcentajes (%)' : 'Ver Matrícula + Porcentajes'}
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left border-collapse">
            <thead>
              <tr className="bg-[#0f2942] text-white text-[10px] uppercase tracking-wider border-b-2 border-[#c9a751]">
                <th className="py-3 px-4 font-black">Departamento</th>
                <th className="py-3 px-3 text-right font-black">Base 2026</th>
                {YEARS_PROYECCION.map((yr) => (
                  <th key={yr} className="py-3 px-3 text-right font-black">
                    {yr} (% Anual)
                  </th>
                ))}
                <th className="py-3 px-4 text-right font-black bg-indigo-950 text-[#c9a751]">
                  Acumulado 2026→2031
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {arimaPorDepto.deptRows.map((row) => {
                const esCrecimiento = row.pctAcumulado >= 0;
                return (
                  <tr
                    key={row.departamento}
                    className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                  >
                    <td className="py-2.5 px-4 font-black text-slate-900 dark:text-white">
                      {row.departamento}
                    </td>
                    <td className="py-2.5 px-3 text-right tabular-nums text-slate-600 dark:text-slate-300 font-semibold">
                      {fmt(row.base2026)}
                    </td>
                    {YEARS_PROYECCION.map((yr) => {
                      const cell = row.porAnio[yr];
                      const pos = cell.pctAnual > 0.005;
                      const neg = cell.pctAnual < -0.005;
                      return (
                        <td key={yr} className="py-2 px-3 text-right tabular-nums">
                          <span
                            className={`inline-block font-black text-[11px] px-1.5 py-0.5 rounded ${
                              pos
                                ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300'
                                : neg
                                ? 'bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300'
                                : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'
                            }`}
                          >
                            {cell.pctAnual >= 0 ? '+' : ''}
                            {cell.pctAnual.toFixed(2)}%
                          </span>
                          {mostrarMatriculaArima && (
                            <span className="block text-[10px] text-slate-400 dark:text-slate-500 font-mono mt-0.5">
                              {fmt(cell.matricula)} est.
                            </span>
                          )}
                        </td>
                      );
                    })}
                    <td className="py-2.5 px-4 text-right tabular-nums bg-indigo-50/40 dark:bg-indigo-950/20">
                      <span
                        className={`inline-flex items-center gap-1 font-black text-xs px-2 py-0.5 rounded-lg border ${
                          esCrecimiento
                            ? 'bg-emerald-100 dark:bg-emerald-950/70 text-emerald-800 dark:text-emerald-300 border-emerald-300 dark:border-emerald-700'
                            : 'bg-rose-100 dark:bg-rose-950/70 text-rose-800 dark:text-rose-300 border-rose-300 dark:border-rose-700'
                        }`}
                      >
                        {esCrecimiento ? (
                          <TrendingUp className="w-3 h-3" />
                        ) : (
                          <TrendingDown className="w-3 h-3" />
                        )}
                        {row.pctAcumulado >= 0 ? '+' : ''}
                        {row.pctAcumulado.toFixed(2)}%
                      </span>
                      {mostrarMatriculaArima && (
                        <span className="block text-[10px] text-slate-500 dark:text-slate-400 font-mono mt-0.5">
                          {fmt(row.val2031)} est.
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="bg-slate-900 text-white font-black text-xs border-t-2 border-[#c9a751]">
                <td className="py-3 px-4 uppercase tracking-wider">TOTAL NACIONAL</td>
                <td className="py-3 px-3 text-right tabular-nums">
                  {fmt(arimaPorDepto.nacionalRow.base2026)}
                </td>
                {YEARS_PROYECCION.map((yr) => {
                  const cell = arimaPorDepto.nacionalRow.porAnio[yr];
                  return (
                    <td key={yr} className="py-3 px-3 text-right tabular-nums">
                      <span
                        className={
                          cell.pctAnual >= 0 ? 'text-emerald-300' : 'text-rose-300'
                        }
                      >
                        {cell.pctAnual >= 0 ? '+' : ''}
                        {cell.pctAnual.toFixed(2)}%
                      </span>
                      {mostrarMatriculaArima && (
                        <span className="block text-[10px] text-slate-400 font-mono font-normal">
                          {fmt(cell.matricula)}
                        </span>
                      )}
                    </td>
                  );
                })}
                <td className="py-3 px-4 text-right tabular-nums bg-indigo-950 text-[#c9a751]">
                  <span>
                    {arimaPorDepto.nacionalRow.pctAcumulado >= 0 ? '+' : ''}
                    {arimaPorDepto.nacionalRow.pctAcumulado.toFixed(2)}%
                  </span>
                  {mostrarMatriculaArima && (
                    <span className="block text-[10px] text-indigo-200 font-mono font-normal">
                      {fmt(arimaPorDepto.nacionalRow.val2031)} est.
                    </span>
                  )}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  );
}
