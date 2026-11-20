'use client';

import React, { useState, useMemo } from 'react';
import {
  ArrowLeftRight,
  TrendingUp,
  UserPlus,
  UserMinus,
  Users,
  Compass,
  ArrowRight,
  CheckCircle2,
  Calendar,
  Layers,
  GraduationCap,
  Clock,
  MapPin,
  HelpCircle
} from 'lucide-react';
import migracionData from '@/data/migracion_data.json';
import migracionEstudiantes from '@/data/migracion_estudiantes.json';

type PeriodoKey = '2024_2025' | '2025_2026';

interface DeptoMov {
  entrantes: number;
  salientes: number;
  continuos: number;
}

export default function MigracionDocenteView() {
  // Selector de Pestaña Principal
  const [pestañaPrincipal, setPestañaPrincipal] = useState<'estudiantes' | 'planilla'>('estudiantes');

  // Estado del análisis de Estudiantes
  const [deptoSeleccionadoEsfm, setDeptoSeleccionadoEsfm] = useState<string>('CHUQUISACA');
  const kpisEst = migracionEstudiantes.kpis_globales;
  const seriesGestion = migracionEstudiantes.series_por_gestion;
  const porDeptoEst = migracionEstudiantes.por_departamento;
  const matrizTransicion = migracionEstudiantes.matriz_transicion_probabilidades as Record<string, Record<string, number>>;

  // Periodo consolidado y auditado para la dinámica global de planilla
  const kpis = migracionData.kpis['2024_2025'];
  const deptosMap = migracionData.por_departamento['2024_2025'] as Record<string, DeptoMov>;

  // Periodo interactivo para el flujo migratorio interdepartamental
  const [periodoFlujo, setPeriodoFlujo] = useState<PeriodoKey>('2025_2026');
  const flujo = migracionData.flujo_interdepartamental[periodoFlujo];
  const kpiFlujo = migracionData.kpis[periodoFlujo];

  // Ordenar departamentos por saldo neto (entrantes - salientes) descendente
  const deptosList = useMemo(() => {
    return Object.entries(deptosMap).map(([dep, data]) => {
      const saldo = data.entrantes - data.salientes;
      return {
        depto: dep,
        ...data,
        saldo,
      };
    }).sort((a, b) => b.saldo - a.saldo);
  }, [deptosMap]);

  // Max valor para escalar barras de departamentos
  const maxDeptoVal = useMemo(() => {
    let m = 1;
    deptosList.forEach((d) => {
      m = Math.max(m, d.entrantes, d.salientes);
    });
    return m;
  }, [deptosList]);

  // Max docentes en rutas
  const maxRutaVal = useMemo(() => {
    return Math.max(...flujo.top_rutas.map((r) => r.docentes), 1);
  }, [flujo]);

  return (
    <div className="space-y-4 animate-fadeIn">
      {/* ─── Selector de Pestañas Superior ─── */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-3 rounded-2xl border border-slate-200 shadow-2xs">
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setPestañaPrincipal('estudiantes')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black transition-all ${
              pestañaPrincipal === 'estudiantes'
                ? 'bg-indigo-700 text-white shadow-sm ring-2 ring-indigo-500/20'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            <GraduationCap className="w-4 h-4 text-amber-300" />
            <span>Trazabilidad de Titulados ESFM (35.474 Estudiantes 2014–2025)</span>
          </button>
          <button
            onClick={() => setPestañaPrincipal('planilla')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black transition-all ${
              pestañaPrincipal === 'planilla'
                ? 'bg-cyan-700 text-white shadow-sm ring-2 ring-cyan-500/20'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            <ArrowLeftRight className="w-4 h-4 text-cyan-300" />
            <span>Dinámica de Planilla Docente SEP (2024–2026)</span>
          </button>
        </div>
        <span className="text-[11px] font-bold text-slate-500">
          {pestañaPrincipal === 'estudiantes'
            ? 'Fuente: datos_migracion_estudiantes.xlsx · 35.474 registros auditados'
            : 'Fuente: migracion_planilla_2024_2025_2026.xls & entrantes_salientes.xlsx'}
        </span>
      </div>

      {pestañaPrincipal === 'estudiantes' ? (
        /* ══════════════════════════════════════════════════════════════════════════
           PESTAÑA 1: TRAZABILIDAD Y MOVILIDAD DE TITULADOS ESFM (2014–2025)
           ══════════════════════════════════════════════════════════════════════════ */
        <div className="space-y-4">
          {/* Barra Compacta de KPIs de Titulados */}
          <div className="bg-white rounded-2xl px-5 py-3.5 border border-slate-200/90 shadow-2xs flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-indigo-50 text-indigo-800">
                <GraduationCap className="w-4 h-4" />
              </span>
              <span className="font-extrabold text-slate-800">
                Padrón Histórico de Titulados ({kpisEst.total_titulados.toLocaleString('es-BO')} egresados):
              </span>
            </div>

            <div className="flex items-center gap-4 flex-wrap text-[11px]">
              <span className="flex items-center gap-1.5" title="Docentes que continúan ejerciendo en el mismo departamento de la ESFM">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                <span className="text-slate-500">Retención en Sede:</span>
                <strong className="text-emerald-700 font-black">
                  {kpisEst.retencion_sede_esfm.toLocaleString('es-BO')} ({kpisEst.pct_retencion_sede}%)
                </strong>
              </span>
              <span className="flex items-center gap-1.5" title="Egresados que en su 1er año laboral salieron a otro departamento (retorno a departamento de origen)">
                <span className="w-2 h-2 rounded-full bg-amber-500" />
                <span className="text-slate-500">Retorno Inmediato a su Depto:</span>
                <strong className="text-amber-700 font-black">
                  {kpisEst.emigracion_retorno_inmediato.toLocaleString('es-BO')} ({kpisEst.pct_emigracion_retorno}%)
                </strong>
              </span>
              <span className="flex items-center gap-1.5" title="Egresados que iniciaron en la sede y migraron en años posteriores">
                <span className="w-2 h-2 rounded-full bg-sky-500" />
                <span className="text-slate-500">Emigración Tardía:</span>
                <strong className="text-sky-700 font-black">
                  {kpisEst.emigracion_tardia.toLocaleString('es-BO')} ({kpisEst.pct_emigracion_tardia}%)
                </strong>
              </span>
              <span className="flex items-center gap-1.5" title="Titulados de las ESFM sin ítem en planilla SEP">
                <span className="w-2 h-2 rounded-full bg-slate-400" />
                <span className="text-slate-500">Sin Inserción en SEP:</span>
                <strong className="text-slate-700 font-black">
                  {kpisEst.sin_insercion_sep.toLocaleString('es-BO')} ({kpisEst.pct_sin_insercion}%)
                </strong>
              </span>
            </div>
          </div>

          {/* Grid Gráficos: Temporal por Gestión (7 cols) + Corredores de Retorno (5 cols) */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            {/* GRÁFICO 1: Evolución Temporal por Gestión (7 cols) */}
            <div className="lg:col-span-7 bg-white rounded-3xl p-5 border border-slate-200/90 shadow-2xs space-y-4">
              <div className="flex flex-wrap items-center justify-between pb-3 border-b border-slate-100 gap-2">
                <div>
                  <h3 className="text-sm font-black text-slate-900 flex items-center gap-1.5">
                    <Calendar className="w-4 h-4 text-indigo-600" />
                    Destino Laboral por Gestión de Titulación (2014–2025)
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Evolución anual de retención en sede vs retorno a departamento de origen vs sin inserción.
                  </p>
                </div>
                <div className="flex items-center gap-2 text-[10px] font-bold">
                  <span className="flex items-center gap-1 text-emerald-700">
                    <span className="w-2.5 h-2.5 rounded-sm bg-emerald-500" /> % Sede ESFM
                  </span>
                  <span className="flex items-center gap-1 text-amber-700">
                    <span className="w-2.5 h-2.5 rounded-sm bg-amber-500" /> % Retorno / Emigración
                  </span>
                  <span className="flex items-center gap-1 text-slate-500">
                    <span className="w-2.5 h-2.5 rounded-sm bg-slate-300" /> % Sin Inserción
                  </span>
                </div>
              </div>

              {/* Barras compuestas por Gestión */}
              <div className="space-y-2.5">
                {seriesGestion.map((sg) => (
                  <div key={sg.gestion} className="space-y-1">
                    <div className="flex justify-between items-center text-xs">
                      <span className="font-black text-slate-800 font-mono w-12">{sg.gestion}</span>
                      <span className="text-[11px] text-slate-500 font-medium">
                        {sg.total_titulados.toLocaleString('es-BO')} titulados
                      </span>
                      <div className="flex items-center gap-2 text-[11px] font-mono">
                        <span className="text-emerald-700 font-bold">{sg.pct_quedan_sede}%</span>
                        <span className="text-slate-300">/</span>
                        <span className="text-amber-700 font-bold">{sg.pct_emigran_retornan}%</span>
                        <span className="text-slate-300">/</span>
                        <span className="text-slate-500">{sg.pct_sin_ejercer}%</span>
                        <span
                          className="ml-2 text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded font-bold"
                          title="Tiempo promedio de espera para inserción laboral"
                        >
                          ⏱ {sg.espera_promedio_anos}a
                        </span>
                      </div>
                    </div>
                    {/* Barra Apilada */}
                    <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden flex">
                      <div
                        style={{ width: `${sg.pct_quedan_sede}%` }}
                        className="bg-emerald-500 hover:bg-emerald-600 transition-all"
                        title={`Retención en Sede: ${sg.quedan_sede.toLocaleString('es-BO')} (${sg.pct_quedan_sede}%)`}
                      />
                      <div
                        style={{ width: `${sg.pct_emigran_retornan}%` }}
                        className="bg-amber-500 hover:bg-amber-600 transition-all"
                        title={`Retorno / Emigración Inmediata: ${sg.emigran_retornan_inmediato.toLocaleString('es-BO')} (${sg.pct_emigran_retornan}%)`}
                      />
                      <div
                        style={{ width: `${sg.pct_sin_ejercer}%` }}
                        className="bg-slate-300 hover:bg-slate-400 transition-all"
                        title={`Sin Inserción en Planilla: ${sg.sin_ejercer.toLocaleString('es-BO')} (${sg.pct_sin_ejercer}%)`}
                      />
                    </div>
                  </div>
                ))}
              </div>

              <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-400">
                <span>El tiempo promedio de inserción laboral se redujo de 2.6 años (2014) a 1.0 años (2024).</span>
                <span className="font-bold text-slate-500">35.468 registros auditados</span>
              </div>
            </div>

            {/* GRÁFICO 2: Corredores de Retorno y Emigración por Departamento de la ESFM (5 cols) */}
            <div className="lg:col-span-5 bg-white rounded-3xl p-5 border border-slate-200/90 shadow-2xs space-y-4 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <div>
                    <h3 className="text-sm font-black text-slate-900 flex items-center gap-1.5">
                      <Compass className="w-4 h-4 text-cyan-600" />
                      Corredores de Retorno por ESFM
                    </h3>
                    <p className="text-[11px] text-slate-500">
                      ¿A qué departamentos vuelven los estudiantes tras titularse?
                    </p>
                  </div>
                  {/* Selector de Departamento */}
                  <select
                    value={deptoSeleccionadoEsfm}
                    onChange={(e) => setDeptoSeleccionadoEsfm(e.target.value)}
                    className="text-xs font-bold text-indigo-900 bg-indigo-50 border border-indigo-200 rounded-xl px-2.5 py-1 focus:outline-none focus:ring-1 focus:ring-indigo-600 cursor-pointer"
                  >
                    {Object.keys(porDeptoEst).map((dep) => (
                      <option key={dep} value={dep}>{dep}</option>
                    ))}
                  </select>
                </div>

                {/* Resumen del Departamento Seleccionado */}
                {(() => {
                  const dSel = (porDeptoEst as any)[deptoSeleccionadoEsfm];
                  if (!dSel) return null;
                  return (
                    <div className="space-y-3 mt-3">
                      <div className="grid grid-cols-3 gap-2 text-center">
                        <div className="bg-slate-50 p-2 rounded-xl border border-slate-200">
                          <span className="text-[9px] uppercase font-bold text-slate-400 block">Titulados</span>
                          <span className="text-sm font-black text-slate-800">{dSel.total_titulados.toLocaleString('es-BO')}</span>
                        </div>
                        <div className="bg-emerald-50 p-2 rounded-xl border border-emerald-200">
                          <span className="text-[9px] uppercase font-bold text-emerald-600 block">Quedan en Sede</span>
                          <span className="text-sm font-black text-emerald-800">{dSel.pct_quedan_sede}%</span>
                        </div>
                        <div className="bg-amber-50 p-2 rounded-xl border border-amber-200">
                          <span className="text-[9px] uppercase font-bold text-amber-600 block">Vuelven / Salen</span>
                          <span className="text-sm font-black text-amber-800">{dSel.pct_emigran_inmediato}%</span>
                        </div>
                      </div>

                      <div className="space-y-2 pt-1">
                        <span className="text-[11px] font-black text-slate-700 block">
                          Principales Departamentos Destino en su 1.er Año Laboral:
                        </span>
                        {dSel.principales_destinos_retorno.map((dest: any, idx: number) => (
                          <div key={dest.depto} className="space-y-1">
                            <div className="flex justify-between items-center text-xs">
                              <span className="font-bold text-slate-700 flex items-center gap-1.5">
                                <span className="text-[10px] text-slate-400 font-mono">#{idx + 1}</span>
                                <span>{dest.depto}</span>
                              </span>
                              <span className="font-mono text-[11px] text-amber-800 font-black">
                                {dest.docentes} docentes ({dest.pct}%)
                              </span>
                            </div>
                            <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                              <div
                                style={{ width: `${Math.min(100, dest.pct * 2)}%` }}
                                className="bg-amber-500 h-full rounded-full"
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })()}
              </div>

              <div className="p-3 bg-amber-50/70 border border-amber-200 rounded-2xl text-[11px] text-amber-950 space-y-1">
                <span className="font-black flex items-center gap-1">
                  <HelpCircle className="w-3.5 h-3.5 text-amber-600" />
                  Impacto en la Planificación Educativa:
                </span>
                <p className="text-[10px] text-amber-900 leading-relaxed">
                  Los departamentos con alta emigración inmediata (Oruro 51.4%, Chuquisaca 48.3%, Tarija 41.4%) forman maestros que regresan a cubrir vacantes en el eje central (Santa Cruz, Cochabamba, La Paz).
                </p>
              </div>
            </div>
          </div>

          {/* Matriz de Transición Departamental 9x9 Ampliada con Divisiones Nítidas */}
          <div className="bg-white rounded-3xl p-6 border-2 border-slate-300 shadow-md space-y-4">
            <div className="flex flex-wrap items-center justify-between pb-3 border-b-2 border-slate-200 gap-3">
              <div>
                <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                  <Layers className="w-5 h-5 text-indigo-700" />
                  Matriz de Transición Departamental: Sede de la ESFM vs Radicación Actual en Planilla
                </h3>
                <p className="text-xs text-slate-600 mt-0.5">
                  Probabilidad empírica ponderada (%) de que un egresado de la ESFM de la <strong>fila</strong> radique trabajando en el departamento de la <strong>columna</strong>.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-black text-indigo-900 bg-indigo-100 border border-indigo-300 px-3 py-1.5 rounded-xl shadow-2xs">
                  Matriz Oficial Base para el Balance Predictivo 2031 (35.474 Registros)
                </span>
              </div>
            </div>

            <div className="overflow-x-auto rounded-2xl border-2 border-slate-400 shadow-inner">
              <table className="w-full text-xs text-left border-collapse">
                <thead>
                  <tr className="bg-slate-900 text-white font-black text-[11px] uppercase tracking-wider">
                    <th className="py-3.5 px-4 border-r-2 border-b-2 border-slate-500 w-48 bg-slate-950">
                      <div className="flex flex-col">
                        <span className="text-indigo-300 text-[10px]">FILA: Sede ESFM</span>
                        <span className="text-amber-300 text-[10px]">COLUMNA: Radica en</span>
                      </div>
                    </th>
                    {Object.keys(porDeptoEst).map((d) => (
                      <th key={d} className="py-3.5 px-2 text-center border-r border-b-2 border-slate-700 min-w-[76px]">
                        <span className="block text-xs font-black text-white">{d}</span>
                        <span className="text-[9px] text-slate-400 font-normal">Destino</span>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y-2 divide-slate-300 font-mono">
                  {Object.keys(porDeptoEst).map((orig) => (
                    <tr key={orig} className="hover:bg-slate-50/90 transition-colors">
                      {/* Depto Origen */}
                      <td className="py-3 px-4 font-sans font-black text-slate-900 border-r-2 border-slate-400 bg-slate-100 text-xs">
                        <div className="flex items-center justify-between">
                          <span>{orig}</span>
                          <span className="text-[9px] font-mono text-slate-400 font-normal uppercase">ESFM</span>
                        </div>
                      </td>
                      {/* Celdas de Transición */}
                      {Object.keys(porDeptoEst).map((dest) => {
                        const val = matrizTransicion[orig]?.[dest] ?? 0;
                        const esDiagonal = orig === dest;

                        let estiloCelda = 'text-slate-400 bg-white hover:bg-slate-50';
                        if (esDiagonal) {
                          estiloCelda = 'bg-emerald-100 text-emerald-950 font-black ring-1 ring-inset ring-emerald-300';
                        } else if (val >= 10) {
                          estiloCelda = 'bg-amber-100 text-amber-950 font-black ring-1 ring-inset ring-amber-300';
                        } else if (val >= 3) {
                          estiloCelda = 'bg-blue-50 text-blue-900 font-bold';
                        }

                        return (
                          <td
                            key={dest}
                            className={`py-3 px-1.5 text-center border-r border-slate-300 text-xs transition-colors ${estiloCelda}`}
                            title={`De ESFM ${orig} a trabajar en ${dest}: ${val}%`}
                          >
                            <span className="tabular-nums block text-xs">
                              {val > 0 ? `${val.toFixed(1)}%` : '0%'}
                            </span>
                            {esDiagonal && (
                              <span className="block text-[8px] font-sans font-black text-emerald-800 uppercase tracking-tighter">
                                Retención
                              </span>
                            )}
                            {!esDiagonal && val >= 10 && (
                              <span className="block text-[8px] font-sans font-black text-amber-800 uppercase tracking-tighter">
                                Retorno
                              </span>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Leyenda Explicativa de la Matriz */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-2 text-xs text-slate-600 bg-slate-50 p-3 rounded-2xl border border-slate-200">
              <div className="flex flex-wrap items-center gap-4">
                <span className="flex items-center gap-1.5">
                  <span className="w-4 h-4 rounded bg-emerald-200 border border-emerald-400 inline-block" />
                  <strong>Retención en Departamento Sede</strong> (Diagonal Principal: se quedan trabajando donde estudiaron)
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-4 h-4 rounded bg-amber-200 border border-amber-400 inline-block" />
                  <strong>Corredor de Retorno Fuerte</strong> (≥ 10% retorna a su departamento de origen)
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-4 h-4 rounded bg-blue-100 border border-blue-300 inline-block" />
                  <strong>Movilidad Moderada</strong> (3% a 9.9%)
                </span>
              </div>
              <span className="text-[11px] font-bold text-slate-500">
                Total egresados analizados: 35.474 (2014–2025)
              </span>
            </div>
          </div>
        </div>
      ) : (
        /* ══════════════════════════════════════════════════════════════════════════
           PESTAÑA 2: DINÁMICA DE PLANILLA DOCENTE SEP (2024–2026)
           ══════════════════════════════════════════════════════════════════════════ */
        <div className="space-y-4">
          {/* ─── Barra Compacta de Datos Oficiales (Sin Cuadrones) ─── */}
          <div className="bg-white rounded-2xl px-5 py-3 border border-slate-200/90 shadow-2xs flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-cyan-50 text-cyan-800">
                <ArrowLeftRight className="w-4 h-4" />
              </span>
              <span className="font-extrabold text-slate-800">
                Planilla Docente SEP (Cierre Oficial 2024 → 2025):
              </span>
            </div>

            <div className="flex items-center gap-4 flex-wrap text-[11px]">
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                <span className="text-slate-500">Ingresos:</span>
                <strong className="text-emerald-700 font-black">+{kpis.entrantes.toLocaleString('es-BO')}</strong>
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-rose-500" />
                <span className="text-slate-500">Bajas:</span>
                <strong className="text-rose-700 font-black">-{kpis.salientes.toLocaleString('es-BO')}</strong>
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-blue-500" />
                <span className="text-slate-500">Continuos:</span>
                <strong className="text-blue-700 font-black">{kpis.continuos.toLocaleString('es-BO')}</strong>
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-amber-500" />
                <span className="text-slate-500">Traslados:</span>
                <strong className="text-amber-700 font-black">{kpiFlujo.migraciones_inter_depto.toLocaleString('es-BO')}</strong>
              </span>
            </div>
          </div>

          {/* ─── Vistas Gráficas a Pantalla Completa ─── */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            {/* GRÁFICO 1: Balance Departamental Entrantes vs Salientes (7 cols) */}
            <div className="lg:col-span-7 bg-white rounded-3xl p-5 border border-slate-200/90 shadow-2xs flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <div>
                    <h3 className="text-sm font-black text-slate-900 flex items-center gap-1.5">
                      <TrendingUp className="w-4 h-4 text-emerald-600" />
                      Balance Departamental: Nuevos Ingresos vs Bajas
                    </h3>
                    <p className="text-[11px] text-slate-500">
                      Comparativa de docentes que se incorporan al departamento (+) vs los que cesan (-)
                    </p>
                  </div>
                  <span className="text-[10px] font-bold text-slate-400 bg-slate-50 px-2.5 py-1 rounded-full border border-slate-100">
                    Cierre 2024-2025
                  </span>
                </div>

                {/* Lista de Departamentos con Barras Comparativas */}
                <div className="mt-4 space-y-3">
                  {deptosList.map((d) => {
                    const saldoPositivo = d.saldo >= 0;
                    const wEntrantes = Math.round((d.entrantes / maxDeptoVal) * 100);
                    const wSalientes = Math.round((d.salientes / maxDeptoVal) * 100);

                    return (
                      <div key={d.depto} className="space-y-1">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-extrabold text-slate-800 tracking-tight">
                            {d.depto}
                          </span>
                          <div className="flex items-center gap-2 font-mono text-[11px]">
                            <span className="text-emerald-700 font-bold">
                              +{d.entrantes.toLocaleString('es-BO')}
                            </span>
                            <span className="text-slate-300">/</span>
                            <span className="text-rose-700 font-bold">
                              -{d.salientes.toLocaleString('es-BO')}
                            </span>
                            <span
                              className={`ml-1 text-[10px] font-black px-1.5 py-0.5 rounded ${
                                saldoPositivo
                                  ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                                  : 'bg-rose-50 text-rose-800 border border-rose-200'
                              }`}
                            >
                              {saldoPositivo ? `+${d.saldo}` : d.saldo}
                            </span>
                          </div>
                        </div>

                        {/* Barra dual Entrantes / Salientes */}
                        <div className="grid grid-cols-2 gap-1 h-2 rounded-full overflow-hidden bg-slate-100">
                          {/* Izquierda: Salientes (rojo alineado a la derecha) */}
                          <div className="flex justify-end">
                            <div
                              style={{ width: `${wSalientes}%` }}
                              className="bg-rose-500 h-full rounded-l-full"
                              title={`Salientes: ${d.salientes}`}
                            />
                          </div>
                          {/* Derecha: Entrantes (verde alineado a la izquierda) */}
                          <div className="flex justify-start">
                            <div
                              style={{ width: `${wEntrantes}%` }}
                              className="bg-emerald-500 h-full rounded-r-full"
                              title={`Entrantes: ${d.entrantes}`}
                            />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-xs bg-rose-500" /> Bajas / Salientes
                  <span className="w-2.5 h-2.5 rounded-xs bg-emerald-500 ml-2" /> Nuevos Ingresos
                </span>
                <span>Fuente: Base Oficial DGFM / SEP</span>
              </div>
            </div>

            {/* Columna Derecha: Flujo Interdepartamental y Balance Neto (5 cols) */}
            <div className="lg:col-span-5 space-y-4">
              {/* GRÁFICO 2: Top Rutas de Traslado */}
              <div className="bg-white rounded-3xl p-5 border border-slate-200/90 shadow-2xs">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <div>
                    <h3 className="text-sm font-black text-slate-900 flex items-center gap-1.5">
                      <Compass className="w-4 h-4 text-amber-600" />
                      Top Corredores de Traslado
                    </h3>
                    <p className="text-[11px] text-slate-500">
                      Rutas más transitadas entre departamentos
                    </p>
                  </div>

                  {/* Selector interactivo de periodo */}
                  <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-xl border border-slate-200 text-[10px] font-bold">
                    <button
                      onClick={() => setPeriodoFlujo('2024_2025')}
                      className={`px-2 py-1 rounded-lg transition-all ${
                        periodoFlujo === '2024_2025'
                          ? 'bg-white text-slate-900 shadow-2xs font-extrabold'
                          : 'text-slate-500 hover:text-slate-800'
                      }`}
                    >
                      2024→25
                    </button>
                    <button
                      onClick={() => setPeriodoFlujo('2025_2026')}
                      className={`px-2 py-1 rounded-lg transition-all ${
                        periodoFlujo === '2025_2026'
                          ? 'bg-white text-slate-900 shadow-2xs font-extrabold'
                          : 'text-slate-500 hover:text-slate-800'
                      }`}
                    >
                      2025→26
                    </button>
                  </div>
                </div>

                <div className="mt-3 space-y-2.5">
                  {flujo.top_rutas.slice(0, 7).map((r, i) => {
                    const w = Math.round((r.docentes / maxRutaVal) * 100);
                    return (
                      <div key={i} className="space-y-1">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-bold text-slate-700 flex items-center gap-1.5">
                            <span className="text-[10px] text-slate-400 font-mono">#{i + 1}</span>
                            <span>{r.origen}</span>
                            <ArrowRight className="w-3 h-3 text-slate-400" />
                            <span className="font-extrabold text-slate-900">{r.destino}</span>
                          </span>
                          <span className="font-black text-amber-700">
                            {r.docentes} maestros
                          </span>
                        </div>
                        <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                          <div
                            style={{ width: `${w}%` }}
                            className="bg-gradient-to-r from-amber-400 to-amber-600 h-full rounded-full"
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* GRÁFICO 3: Balance Neto de Migración Interdepartamental */}
              <div className="bg-white rounded-3xl p-5 border border-slate-200/90 shadow-2xs">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <div>
                    <h3 className="text-sm font-black text-slate-900 flex items-center gap-1.5">
                      <ArrowLeftRight className="w-4 h-4 text-cyan-600" />
                      Saldo Neto de Traslados (Llegaron vs Salieron)
                    </h3>
                    <p className="text-[11px] text-slate-500">
                      Departamentos receptores (+) vs emisores (-)
                    </p>
                  </div>
                </div>

                <div className="mt-3 grid grid-cols-3 gap-2">
                  {Object.entries(flujo.balance_neto).map(([dep, bal]) => {
                    const esPos = bal >= 0;
                    return (
                      <div
                        key={dep}
                        className={`p-2 rounded-xl text-center border transition-all ${
                          esPos
                            ? 'bg-emerald-50/60 border-emerald-200'
                            : 'bg-rose-50/60 border-rose-200'
                        }`}
                      >
                        <span className="text-[10px] font-extrabold text-slate-600 block truncate">
                          {dep}
                        </span>
                        <span
                          className={`text-xs font-black block mt-0.5 ${
                            esPos ? 'text-emerald-700' : 'text-rose-700'
                          }`}
                        >
                          {esPos ? `+${bal}` : bal}
                        </span>
                      </div>
                    );
                  })}
                </div>

                <div className="mt-3 pt-2 border-t border-slate-100 text-[10px] text-slate-400 flex items-center justify-between">
                  <span>Permanecieron en su depto: <strong>{kpiFlujo.permanecen_depto.toLocaleString('es-BO')}</strong></span>
                  <span>Fuente: <code>migracion_planilla_2024_2025_2026.xls</code></span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
