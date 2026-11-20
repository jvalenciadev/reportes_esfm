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
  Layers
} from 'lucide-react';
import migracionData from '@/data/migracion_data.json';

type PeriodoKey = '2024_2025' | '2025_2026';

interface DeptoMov {
  entrantes: number;
  salientes: number;
  continuos: number;
}

export default function MigracionDocenteView() {
  // Periodo consolidado y auditado para la dinámica global de planilla
  const kpis = migracionData.kpis['2024_2025'];
  const deptosMap = migracionData.por_departamento['2024_2025'] as Record<string, DeptoMov>;

  // Periodo interactivo para el flujo migratorio interdepartamental (100% verificado)
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
                  <TrendingUp className="w-4 h-4 text-cyan-600" />
                  Balance Departamental: Entrantes vs Salientes
                </h3>
                <p className="text-[11px] text-slate-500">
                  Comparativa de nuevos ingresos (verde) vs bajas (rojo) por departamento
                </p>
              </div>
              <span className="text-[10px] font-bold px-2 py-0.5 bg-slate-100 text-slate-700 rounded-md border border-slate-200">
                Gestión 2024–2025
              </span>
            </div>

            {/* Listado de Barras Compactas */}
            <div className="mt-4 space-y-2.5">
              {deptosList.map((d) => {
                const entWidth = Math.max(4, Math.round((d.entrantes / maxDeptoVal) * 100));
                const salWidth = Math.max(4, Math.round((d.salientes / maxDeptoVal) * 100));
                const esPositivo = d.saldo >= 0;

                return (
                  <div key={d.depto} className="p-2 rounded-xl bg-slate-50/70 border border-slate-100 hover:bg-slate-100/80 transition-all text-xs">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-extrabold text-slate-800 text-[11px] w-28 truncate">
                        {d.depto}
                      </span>
                      <div className="flex items-center gap-3 text-[11px]">
                        <span className="text-emerald-700 font-bold">
                          +{d.entrantes.toLocaleString('es-BO')}
                        </span>
                        <span className="text-rose-700 font-bold">
                          -{d.salientes.toLocaleString('es-BO')}
                        </span>
                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-black ${esPositivo
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-rose-100 text-rose-800'
                          }`}>
                          Saldo: {esPositivo ? '+' : ''}{d.saldo.toLocaleString('es-BO')}
                        </span>
                      </div>
                    </div>

                    {/* Barras paralelas proporcionales */}
                    <div className="space-y-1">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[9px] font-bold text-slate-400 w-5">ENT</span>
                        <div className="flex-1 bg-slate-200/70 h-2 rounded-full overflow-hidden">
                          <div
                            style={{ width: `${entWidth}%` }}
                            className="bg-emerald-500 h-full rounded-full"
                          />
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-[9px] font-bold text-slate-400 w-5">SAL</span>
                        <div className="flex-1 bg-slate-200/70 h-2 rounded-full overflow-hidden">
                          <div
                            style={{ width: `${salWidth}%` }}
                            className="bg-rose-500 h-full rounded-full"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 text-[11px] text-slate-500 flex items-center justify-between">
            <span className="flex items-center gap-1 text-emerald-700 font-semibold">
              <span className="w-2 h-2 rounded-full bg-emerald-500" /> Verde = Ingresos
            </span>
            <span className="flex items-center gap-1 text-rose-700 font-semibold">
              <span className="w-2 h-2 rounded-full bg-rose-500" /> Rojo = Bajas
            </span>
            <span className="text-slate-400">Fuente: entrantes_salientes.xlsx</span>
          </div>
        </div>

        {/* COLUMNA DERECHA (5 cols): Gráfico 2 + Gráfico 3 */}
        <div className="lg:col-span-5 space-y-5">

          {/* GRÁFICO 2: Top Rutas Interdepartamentales */}
          <div className="bg-white rounded-3xl p-5 border border-slate-200/90 shadow-2xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-100 gap-2">
              <div>
                <h3 className="text-sm font-black text-slate-900 flex items-center gap-1.5">
                  <Compass className="w-4 h-4 text-amber-600" />
                  Principales Rutas de Migración
                </h3>
                <p className="text-[11px] text-slate-500">
                  Traslados interdepartamentales ({periodoFlujo === '2024_2025' ? '2024→2025' : '2025→2026'})
                </p>
              </div>

              {/* Selector interactivo de periodo para traslados */}
              <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200/80 text-[11px] self-start sm:self-auto">
                <button
                  type="button"
                  onClick={() => setPeriodoFlujo('2024_2025')}
                  className={`px-2.5 py-1 rounded-lg font-bold transition-all ${periodoFlujo === '2024_2025'
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                    }`}
                >
                  2024→2025
                </button>
                <button
                  type="button"
                  onClick={() => setPeriodoFlujo('2025_2026')}
                  className={`px-2.5 py-1 rounded-lg font-bold transition-all ${periodoFlujo === '2025_2026'
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                    }`}
                >
                  2025→2026
                </button>
              </div>
            </div>

            <div className="mt-3.5 space-y-2">
              {flujo.top_rutas.slice(0, 8).map((r, i) => {
                const w = Math.max(5, Math.round((r.docentes / maxRutaVal) * 100));
                return (
                  <div key={r.ruta} className="text-xs">
                    <div className="flex items-center justify-between text-[11px] mb-0.5">
                      <div className="flex items-center gap-1.5 font-bold text-slate-700">
                        <span className="text-[10px] text-slate-400 font-mono w-3.5">{i + 1}.</span>
                        <span>{r.origen}</span>
                        <ArrowRight className="w-3 h-3 text-amber-500 shrink-0" />
                        <span className="text-slate-900 font-extrabold">{r.destino}</span>
                      </div>
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
                    className={`p-2 rounded-xl text-center border transition-all ${esPos
                      ? 'bg-emerald-50/60 border-emerald-200'
                      : 'bg-rose-50/60 border-rose-200'
                      }`}
                  >
                    <span className="text-[10px] font-extrabold text-slate-600 block truncate">
                      {dep}
                    </span>
                    <span className={`text-xs font-black block mt-0.5 ${esPos ? 'text-emerald-700' : 'text-rose-700'
                      }`}>
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
  );
}
