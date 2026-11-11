'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { 
  GraduationCap, 
  School, 
  Users, 
  Clock, 
  Sparkles,
  HelpCircle,
  CheckCircle2
} from 'lucide-react';

// ─── Types ───────────────────────────────────────────────────────────────────

type Rango = 'V' | 'A' | 'N' | 'SIN';

interface RangoSummary {
  rango: Rango | string;
  docentes: number;
  asignaciones?: number;
  ues: number;
  horas_total?: number;
  duracion_semanas: number;
  costo_estimado_bs: number;
  estudiantes_atendidos?: number;
}

interface DepartamentoRangos {
  departamento: string;
  rangos: Record<Rango, { docentes: number; ues: number; horas: number }>;
}

interface NivelRangos {
  nivel: string;
  rangos: Record<Rango, { docentes: number; ues: number; horas: number }>;
}

interface DesalineacionData {
  total_asignaciones_desalineadas: number;
  docentes_unicos_afectados: number;
  fuera_especialidad: number;
  fuera_nivel: number;
  fuera_ambos: number;
  pct_fuera_especialidad: number;
  pct_fuera_ambos: number;
  pct_fuera_nivel: number;
}

interface PertinenciaData {
  resumen: Record<Rango | 'TOTAL', RangoSummary & { docentes: number; ues: number; estudiantes_atendidos?: number }>;
  desalineacion?: DesalineacionData;
  por_departamento: DepartamentoRangos[];
  por_nivel: NivelRangos[];
  config: {
    duracion: Record<Rango, number>;
    costo_semana_bs: number;
    labels: Record<Rango, string>;
    colores: Record<Rango, string>;
  };
}

// ─── Constants ───────────────────────────────────────────────────────────────

const RANGO_ORDER: Rango[] = ['V', 'A', 'N', 'SIN'];

const RANGO_META: Record<Rango, { 
  label: string; 
  subtitle: string;
  color: string; 
  bg: string; 
  border: string; 
  badge: string; 
  textColor: string;
}> = {
  V: {
    label: 'Alta Pertinencia',
    subtitle: 'Docente enseña en su especialidad y nivel de formación',
    color: '#16a34a',
    bg: 'bg-emerald-50/70',
    border: 'border-emerald-200',
    badge: 'bg-emerald-100 text-emerald-800 border-emerald-300',
    textColor: 'text-emerald-700',
  },
  A: {
    label: 'Media Pertinencia',
    subtitle: 'Alineación curricular parcial o cargo afín',
    color: '#2563eb',
    bg: 'bg-blue-50/70',
    border: 'border-blue-200',
    badge: 'bg-blue-100 text-blue-800 border-blue-300',
    textColor: 'text-blue-700',
  },
  N: {
    label: 'Baja Pertinencia',
    subtitle: 'Desalineación marcada en la materia impartida',
    color: '#ea580c',
    bg: 'bg-amber-50/70',
    border: 'border-amber-200',
    badge: 'bg-amber-100 text-amber-800 border-amber-300',
    textColor: 'text-amber-700',
  },
  SIN: {
    label: 'Sin Pertinencia (Impertinente)',
    subtitle: 'Enseña fuera de su especialidad, nivel o ambos',
    color: '#64748b',
    bg: 'bg-slate-50',
    border: 'border-slate-200',
    badge: 'bg-slate-100 text-slate-700 border-slate-300',
    textColor: 'text-slate-700',
  },
};

const DURACION_DEF: Record<Rango, { sem: number; desc: string }> = {
  V: { sem: 4, desc: '1 mes (Actualización breve)' },
  A: { sem: 12, desc: '3 meses (Nivelación curricular)' },
  N: { sem: 24, desc: '6 meses (Reconversión pedagógica profunda)' },
  SIN: { sem: 36, desc: '9 meses (Especialización completa requerida)' },
};

function fmt(n: number | undefined): string {
  if (n === undefined || isNaN(n)) return '0';
  return n.toLocaleString('es-BO');
}

function fmtBs(n: number | undefined): string {
  if (!n) return 'Bs 0';
  if (n >= 1_000_000) {
    return `Bs ${(n / 1_000_000).toFixed(2)}M`;
  }
  return `Bs ${fmt(Math.round(n))}`;
}

function pct(part: number, total: number): string {
  if (!total || total === 0) return '0%';
  return ((part / total) * 100).toFixed(1) + '%';
}

export default function PertinenciaView() {
  const [data, setData] = useState<PertinenciaData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [costoSemanaInput, setCostoSemanaInput] = useState<number>(350);
  const [activeTab, setActiveTab] = useState<'preguntas' | 'departamento' | 'nivel'>('preguntas');

  useEffect(() => {
    fetch('/api/pertinencia')
      .then((r) => r.json())
      .then((d) => {
        setData(d);
        if (d.config?.costo_semana_bs) {
          setCostoSemanaInput(d.config.costo_semana_bs);
        }
        setLoading(false);
      })
      .catch((e) => {
        setError(String(e));
        setLoading(false);
      });
  }, []);

  const totalDoc = data?.resumen?.TOTAL?.docentes ?? 0;
  const totalUes = data?.resumen?.TOTAL?.ues ?? 0;

  // Docentes prioritarios que requieren formación (A + N)
  const docentesRequierenFormacion = useMemo(() => {
    if (!data) return 0;
    return (data.resumen.A?.docentes ?? 0) + (data.resumen.N?.docentes ?? 0);
  }, [data]);

  // Estudiantes atendidos por el grupo prioritario
  const estudiantesGrupoPrioritario = useMemo(() => {
    if (!data) return 0;
    return (data.resumen.A?.estudiantes_atendidos ?? 0) + (data.resumen.N?.estudiantes_atendidos ?? 0);
  }, [data]);

  // Presupuesto recalculado dinámicamente con costoSemanaInput
  const presupuestoCalculado = useMemo(() => {
    if (!data) return { V: 0, A: 0, N: 0, SIN: 0, totalIntervencionPrioritaria: 0, totalGlobal: 0 };
    const v = (data.resumen.V?.docentes ?? 0) * DURACION_DEF.V.sem * costoSemanaInput;
    const a = (data.resumen.A?.docentes ?? 0) * DURACION_DEF.A.sem * costoSemanaInput;
    const n = (data.resumen.N?.docentes ?? 0) * DURACION_DEF.N.sem * costoSemanaInput;
    const sin = (data.resumen.SIN?.docentes ?? 0) * DURACION_DEF.SIN.sem * costoSemanaInput;
    return {
      V: v,
      A: a,
      N: n,
      SIN: sin,
      totalIntervencionPrioritaria: a + n,
      totalGlobal: v + a + n + sin,
    };
  }, [data, costoSemanaInput]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-80 gap-3 text-slate-500">
        <div className="w-8 h-8 border-3 border-amber-600 border-t-transparent rounded-full animate-spin" />
        <span className="text-sm font-medium">Cargando métricas oficiales de pertinencia docente...</span>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="p-6 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
        Error al cargar los datos de pertinencia: {error ?? 'Archivo no disponible'}
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      
      {/* ── ENCABEZADO ESTRATÉGICO ────────────────────────────────────────── */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 text-white rounded-2xl p-6 sm:p-8 shadow-sm border border-slate-700 relative overflow-hidden">
        <div className="absolute right-0 top-0 bottom-0 w-96 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-amber-500/10 via-transparent to-transparent pointer-events-none" />
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative z-10">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-400/10 border border-amber-400/20 text-amber-300 text-xs font-semibold mb-3">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              SISTEMA INTEGRAL DE PERTINENCIA CURRICULAR · SIE
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
              Diagnóstico de Pertinencia & Formación Docente
            </h1>
            <p className="text-slate-300 text-sm sm:text-base mt-2 max-w-3xl leading-relaxed">
              Evaluación de docentes que enseñan en especialidad o fuera de ella, dimensionamiento del plan de capacitación por rangos <strong className="text-emerald-400 font-semibold">(V)</strong>, <strong className="text-blue-400 font-semibold">(A)</strong>, <strong className="text-amber-400 font-semibold">(N)</strong> y costeo presupuestario.
            </p>
          </div>
          
          <div className="bg-slate-800/80 border border-slate-700 rounded-xl p-4 shrink-0 flex flex-col justify-center min-w-[200px]">
            <span className="text-xs text-slate-400 uppercase tracking-wider font-semibold">Total Padrón Evaluado</span>
            <span className="text-3xl font-black text-white mt-0.5">{fmt(totalDoc)}</span>
            <span className="text-xs text-amber-400 mt-1 font-medium">{fmt(totalUes)} Unidades Educativas</span>
          </div>
        </div>
      </div>

      {/* ── CUATRO PREGUNTAS ESTRATÉGICAS ───────────────────────────────────── */}
      <div className="space-y-6">
        <div className="flex items-center justify-between border-b border-slate-200 pb-3">
          <div>
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <HelpCircle className="w-5 h-5 text-amber-600" />
              Respuestas Ejecutivas al Diagnóstico Institucional
            </h2>
            <p className="text-xs text-slate-500">
              Desglose estructurado de acuerdo a las interrogantes oficiales de planificación
            </p>
          </div>

          <div className="flex gap-2 bg-slate-100 p-1 rounded-lg">
            <button
              onClick={() => setActiveTab('preguntas')}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
                activeTab === 'preguntas' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Informe Ejecutivo
            </button>
            <button
              onClick={() => setActiveTab('departamento')}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
                activeTab === 'departamento' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Por Departamento
            </button>
            <button
              onClick={() => setActiveTab('nivel')}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
                activeTab === 'nivel' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Por Nivel Educativo
            </button>
          </div>
        </div>

        {activeTab === 'preguntas' && (
          <div className="space-y-6">
            
            {/* 1. ¿CUÁNTOS DOCENTES ENSEÑAN FUERA DE SU ESPECIALIDAD / NIVEL / AMBOS? */}
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <span className="text-xs font-bold uppercase tracking-wider text-amber-700 bg-amber-50 px-2.5 py-1 rounded-full border border-amber-200">
                    Pregunta 1 · Desagregación por Rango & Modalidad
                  </span>
                  <h3 className="text-base sm:text-lg font-bold text-slate-900 mt-2">
                    ¿Cuántos docentes enseñan fuera de su especialidad, nivel o ambos?
                  </h3>
                </div>
              </div>

              {/* Tarjetas de rangos */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-5">
                {RANGO_ORDER.map((rk) => {
                  const meta = RANGO_META[rk];
                  const d = data.resumen[rk];
                  return (
                    <div 
                      key={rk} 
                      className={`rounded-xl border ${meta.border} ${meta.bg} p-4 flex flex-col justify-between transition-transform hover:-translate-y-0.5`}
                    >
                      <div>
                        <div className="flex items-center justify-between">
                          <span className={`text-xs font-bold px-2 py-0.5 rounded-full border ${meta.badge}`}>
                            {rk === 'SIN' ? 'NO PERT.' : `RANGO ${rk}`}
                          </span>
                          <span className="text-xs font-semibold text-slate-600">
                            {pct(d?.docentes ?? 0, totalDoc)}
                          </span>
                        </div>
                        <h4 className="font-bold text-slate-900 text-sm mt-2">{meta.label}</h4>
                        <p className="text-[11px] text-slate-500 mt-0.5 leading-tight">{meta.subtitle}</p>
                      </div>

                      <div className="mt-4 pt-3 border-t border-slate-200/80">
                        <div className="flex items-baseline justify-between">
                          <span className="text-2xl font-black" style={{ color: meta.color }}>
                            {fmt(d?.docentes)}
                          </span>
                          <span className="text-xs text-slate-500 font-medium">docentes</span>
                        </div>
                        <div className="flex items-center justify-between text-xs text-slate-500 mt-1">
                          <span>{fmt(d?.ues)} UEs</span>
                          <span>{fmt(d?.horas_total)} hrs</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Desglose causal de los docentes fuera de alineación */}
              {data.desalineacion && (
                <div className="mt-5 bg-slate-50 rounded-xl p-4 border border-slate-200">
                  <h5 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-3">
                    Desglose específico de causas de impertinencia / desalineación:
                  </h5>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div className="bg-white p-3.5 rounded-lg border border-slate-200">
                      <span className="text-xs text-slate-500 font-medium">Fuera solo de especialidad</span>
                      <p className="text-xl font-bold text-slate-800 mt-0.5">{fmt(data.desalineacion.fuera_especialidad)}</p>
                      <p className="text-xs text-slate-500 mt-0.5">{data.desalineacion.pct_fuera_especialidad}% de las asignaciones</p>
                    </div>

                    <div className="bg-white p-3.5 rounded-lg border border-amber-200 bg-amber-50/40">
                      <span className="text-xs text-amber-800 font-medium">Fuera de ambos (Nivel y Especialidad)</span>
                      <p className="text-xl font-bold text-amber-700 mt-0.5">{fmt(data.desalineacion.fuera_ambos)}</p>
                      <p className="text-xs text-amber-700 mt-0.5">{data.desalineacion.pct_fuera_ambos}% de las asignaciones</p>
                    </div>

                    <div className="bg-white p-3.5 rounded-lg border border-slate-200">
                      <span className="text-xs text-slate-500 font-medium">Fuera solo de nivel formativo</span>
                      <p className="text-xl font-bold text-slate-800 mt-0.5">{fmt(data.desalineacion.fuera_nivel)}</p>
                      <p className="text-xs text-slate-500 mt-0.5">{data.desalineacion.pct_fuera_nivel}% de las asignaciones</p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* 2. NECESIDADES DE FORMACIÓN Y DURACIÓN */}
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs">
              <span className="text-xs font-bold uppercase tracking-wider text-blue-700 bg-blue-50 px-2.5 py-1 rounded-full border border-blue-200">
                Pregunta 2 · Programa Modular Diferenciado
              </span>
              <h3 className="text-base sm:text-lg font-bold text-slate-900 mt-2">
                ¿Cuántos docentes requerirían formación y cuánto duraría según su rango?
              </h3>
              
              <div className="mt-4 grid grid-cols-1 lg:grid-cols-3 gap-4">
                
                {/* Rango Naranja */}
                <div className="rounded-xl border border-amber-200 bg-amber-50/50 p-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-300">
                      Rango N · Baja Pertinencia
                    </span>
                    <span className="text-xs font-semibold text-amber-800">Formación Intensiva</span>
                  </div>
                  <div className="mt-3">
                    <span className="text-2xl font-black text-amber-800">{fmt(data.resumen.N?.docentes)}</span>
                    <span className="text-xs text-slate-600 ml-1">docentes</span>
                  </div>
                  <div className="mt-3 space-y-1.5 text-xs text-slate-700">
                    <div className="flex items-center gap-1.5 font-semibold text-slate-800">
                      <Clock className="w-3.5 h-3.5 text-amber-600" />
                      Duración: 24 semanas (1 semestre completo)
                    </div>
                    <p className="text-slate-600">
                      Requieren reconversión curricular profunda debido a una brecha sustancial entre el título de egreso y el área de enseñanza.
                    </p>
                  </div>
                </div>

                {/* Rango Azul */}
                <div className="rounded-xl border border-blue-200 bg-blue-50/50 p-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 border border-blue-300">
                      Rango A · Media Pertinencia
                    </span>
                    <span className="text-xs font-semibold text-blue-800">Nivelación Curricular</span>
                  </div>
                  <div className="mt-3">
                    <span className="text-2xl font-black text-blue-800">{fmt(data.resumen.A?.docentes)}</span>
                    <span className="text-xs text-slate-600 ml-1">docentes</span>
                  </div>
                  <div className="mt-3 space-y-1.5 text-xs text-slate-700">
                    <div className="flex items-center gap-1.5 font-semibold text-slate-800">
                      <Clock className="w-3.5 h-3.5 text-blue-600" />
                      Duración: 12 semanas (1 trimestre / 3 meses)
                    </div>
                    <p className="text-slate-600">
                      Alineación pedagógica, actualización de enfoques disciplinares y actualización de contenidos normativos.
                    </p>
                  </div>
                </div>

                {/* Rango Verde */}
                <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300">
                      Rango V · Alta Pertinencia
                    </span>
                    <span className="text-xs font-semibold text-emerald-800">Actualización Breve</span>
                  </div>
                  <div className="mt-3">
                    <span className="text-2xl font-black text-emerald-800">{fmt(data.resumen.V?.docentes)}</span>
                    <span className="text-xs text-slate-600 ml-1">docentes</span>
                  </div>
                  <div className="mt-3 space-y-1.5 text-xs text-slate-700">
                    <div className="flex items-center gap-1.5 font-semibold text-slate-800">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                      Duración: 4 semanas (Talleres continuos)
                    </div>
                    <p className="text-slate-600">
                      Docentes con pertinencia idónea; capacitación enfocada en innovación didáctica y tecnologías de aula.
                    </p>
                  </div>
                </div>

              </div>

              {/* Total focalizado */}
              <div className="mt-4 p-4 rounded-xl bg-slate-900 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-amber-500/20 flex items-center justify-center text-amber-400">
                    <GraduationCap className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-bold text-sm text-white">Grupo Prioritario de Intervención Formativa (A + N)</h4>
                    <p className="text-xs text-slate-300">Docentes con pertinencia media y baja que requieren nivelación urgente</p>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-2xl font-black text-amber-400">{fmt(docentesRequierenFormacion)}</span>
                  <span className="text-xs text-slate-400 block">{pct(docentesRequierenFormacion, totalDoc)} del magisterio</span>
                </div>
              </div>
            </div>

            {/* 3. BENEFICIARIOS: UNIDADES EDUCATIVAS Y ESTUDIANTES */}
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs">
              <span className="text-xs font-bold uppercase tracking-wider text-purple-700 bg-purple-50 px-2.5 py-1 rounded-full border border-purple-200">
                Pregunta 3 · Alcance de la Intervención
              </span>
              <h3 className="text-base sm:text-lg font-bold text-slate-900 mt-2">
                ¿En cuántas unidades educativas enseñan y a cuántos estudiantes atienden?
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-5">
                <div className="border border-slate-200 rounded-xl p-5 bg-gradient-to-br from-slate-50 to-white">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-purple-100 flex items-center justify-center text-purple-700">
                      <School className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-xs text-slate-500 font-semibold uppercase">Unidades Educativas Beneficiadas</p>
                      <h4 className="text-2xl font-black text-slate-900 mt-0.5">
                        {fmt(data.resumen.TOTAL?.ues)} <span className="text-sm font-normal text-slate-500">UEs a nivel nacional</span>
                      </h4>
                    </div>
                  </div>
                  
                  <div className="mt-4 space-y-2 border-t border-slate-200 pt-3 text-xs text-slate-600">
                    <div className="flex justify-between">
                      <span>UEs con docentes en Rango N (Baja pertinencia):</span>
                      <strong className="text-amber-700">{fmt(data.resumen.N?.ues)} UEs</strong>
                    </div>
                    <div className="flex justify-between">
                      <span>UEs con docentes en Rango A (Media pertinencia):</span>
                      <strong className="text-blue-700">{fmt(data.resumen.A?.ues)} UEs</strong>
                    </div>
                    <div className="flex justify-between">
                      <span>UEs con docentes en Rango V (Alta pertinencia):</span>
                      <strong className="text-emerald-700">{fmt(data.resumen.V?.ues)} UEs</strong>
                    </div>
                  </div>
                </div>

                <div className="border border-slate-200 rounded-xl p-5 bg-gradient-to-br from-slate-50 to-white">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center text-blue-700">
                      <Users className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-xs text-slate-500 font-semibold uppercase">Estudiantes Atendidos Directamente</p>
                      <h4 className="text-2xl font-black text-slate-900 mt-0.5">
                        ~{fmt(estudiantesGrupoPrioritario)} <span className="text-sm font-normal text-slate-500">estudiantes beneficiados</span>
                      </h4>
                    </div>
                  </div>
                  
                  <div className="mt-4 space-y-2 border-t border-slate-200 pt-3 text-xs text-slate-600">
                    <div className="flex justify-between">
                      <span>Estudiantes impactados por docentes Rango N:</span>
                      <strong className="text-amber-700">~{fmt(data.resumen.N?.estudiantes_atendidos)} alumnos</strong>
                    </div>
                    <div className="flex justify-between">
                      <span>Estudiantes impactados por docentes Rango A:</span>
                      <strong className="text-blue-700">~{fmt(data.resumen.A?.estudiantes_atendidos)} alumnos</strong>
                    </div>
                    <div className="flex justify-between">
                      <span>Población estudiantil total en contacto:</span>
                      <strong className="text-slate-800">~{fmt(data.resumen.TOTAL?.estudiantes_atendidos)} alumnos</strong>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* 4. COSTO Y ESTIMACIÓN PRESUPUESTARIA */}
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <span className="text-xs font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
                    Pregunta 4 · Presupuesto de Inversión Educativa
                  </span>
                  <h3 className="text-base sm:text-lg font-bold text-slate-900 mt-2">
                    Estimación preliminar del costo de formación por docente y rango
                  </h3>
                </div>

                {/* Simulador de costo */}
                <div className="flex items-center gap-2 bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                  <span className="text-xs font-semibold text-slate-600">Costo Base / Sem / Docente:</span>
                  <div className="relative">
                    <span className="absolute left-2.5 top-1.5 text-xs text-slate-400">Bs</span>
                    <input
                      type="number"
                      value={costoSemanaInput}
                      onChange={(e) => setCostoSemanaInput(Math.max(50, Number(e.target.value)))}
                      className="w-24 pl-8 pr-2 py-1 text-xs font-bold border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                    />
                  </div>
                </div>
              </div>

              {/* Tabla presupuestaria */}
              <div className="mt-5 overflow-x-auto">
                <table className="w-full text-xs sm:text-sm text-left">
                  <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider text-[11px] border-b border-slate-200">
                    <tr>
                      <th className="py-2.5 px-3">Rango</th>
                      <th className="py-2.5 px-3">Modalidad Formativa</th>
                      <th className="py-2.5 px-3 text-right">Duración</th>
                      <th className="py-2.5 px-3 text-right">Costo / Docente</th>
                      <th className="py-2.5 px-3 text-right">Docentes</th>
                      <th className="py-2.5 px-3 text-right">Presupuesto Estimado</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    <tr className="hover:bg-slate-50/60">
                      <td className="py-3 px-3 font-bold text-amber-700">Rango N (Baja)</td>
                      <td className="py-3 px-3 text-slate-600">Reconversión Curricular Intensiva</td>
                      <td className="py-3 px-3 text-right font-medium">{DURACION_DEF.N.sem} sem (6 m)</td>
                      <td className="py-3 px-3 text-right font-semibold">Bs {fmt(DURACION_DEF.N.sem * costoSemanaInput)}</td>
                      <td className="py-3 px-3 text-right font-bold text-slate-800">{fmt(data.resumen.N?.docentes)}</td>
                      <td className="py-3 px-3 text-right font-extrabold text-amber-700">{fmtBs(presupuestoCalculado.N)}</td>
                    </tr>
                    <tr className="hover:bg-slate-50/60">
                      <td className="py-3 px-3 font-bold text-blue-700">Rango A (Media)</td>
                      <td className="py-3 px-3 text-slate-600">Nivelación & Enfoques Curriculares</td>
                      <td className="py-3 px-3 text-right font-medium">{DURACION_DEF.A.sem} sem (3 m)</td>
                      <td className="py-3 px-3 text-right font-semibold">Bs {fmt(DURACION_DEF.A.sem * costoSemanaInput)}</td>
                      <td className="py-3 px-3 text-right font-bold text-slate-800">{fmt(data.resumen.A?.docentes)}</td>
                      <td className="py-3 px-3 text-right font-extrabold text-blue-700">{fmtBs(presupuestoCalculado.A)}</td>
                    </tr>
                    <tr className="hover:bg-slate-50/60">
                      <td className="py-3 px-3 font-bold text-emerald-700">Rango V (Alta)</td>
                      <td className="py-3 px-3 text-slate-600">Actualización en Aula & TIC</td>
                      <td className="py-3 px-3 text-right font-medium">{DURACION_DEF.V.sem} sem (1 m)</td>
                      <td className="py-3 px-3 text-right font-semibold">Bs {fmt(DURACION_DEF.V.sem * costoSemanaInput)}</td>
                      <td className="py-3 px-3 text-right font-bold text-slate-800">{fmt(data.resumen.V?.docentes)}</td>
                      <td className="py-3 px-3 text-right font-extrabold text-emerald-700">{fmtBs(presupuestoCalculado.V)}</td>
                    </tr>
                    
                    {/* Fila consolidada prioritaria */}
                    <tr className="bg-amber-50/70 font-bold border-t-2 border-amber-300">
                      <td colSpan={4} className="py-3 px-3 text-amber-900">
                        SUBTOTAL PROGRAMA PRIORITARIO (Rango N + Rango A)
                      </td>
                      <td className="py-3 px-3 text-right text-amber-900">{fmt(docentesRequierenFormacion)}</td>
                      <td className="py-3 px-3 text-right text-amber-900 font-black text-base">
                        {fmtBs(presupuestoCalculado.totalIntervencionPrioritaria)}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

          </div>
        )}

        {/* TAB DEPARTAMENTO */}
        {activeTab === 'departamento' && (
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
            <div className="p-4 bg-slate-50 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="font-bold text-slate-900 text-sm">Distribución Territorial de Pertinencia</h3>
                <p className="text-xs text-slate-500">Docentes y UEs clasificadas por departamento de Bolivia</p>
              </div>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-100/70 text-slate-600 uppercase text-[11px] font-bold border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-4">Departamento</th>
                    <th className="py-3 px-3 text-right text-emerald-700">Alta (V) Doc</th>
                    <th className="py-3 px-3 text-right text-blue-700">Media (A) Doc</th>
                    <th className="py-3 px-3 text-right text-amber-700">Baja (N) Doc</th>
                    <th className="py-3 px-3 text-right text-slate-600">Sin Pert. Doc</th>
                    <th className="py-3 px-3 text-right">Total Docentes</th>
                    <th className="py-3 px-4 text-right">UEs Involucradas</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {data.por_departamento.map((d) => {
                    const totalDeptDoc = RANGO_ORDER.reduce((acc, rk) => acc + (d.rangos[rk]?.docentes ?? 0), 0);
                    const totalDeptUes = Math.max(...RANGO_ORDER.map(rk => d.rangos[rk]?.ues ?? 0));
                    return (
                      <tr key={d.departamento} className="hover:bg-slate-50 transition-colors">
                        <td className="py-2.5 px-4 font-bold text-slate-800">{d.departamento}</td>
                        <td className="py-2.5 px-3 text-right font-semibold text-emerald-700">{fmt(d.rangos.V?.docentes)}</td>
                        <td className="py-2.5 px-3 text-right font-semibold text-blue-700">{fmt(d.rangos.A?.docentes)}</td>
                        <td className="py-2.5 px-3 text-right font-semibold text-amber-700">{fmt(d.rangos.N?.docentes)}</td>
                        <td className="py-2.5 px-3 text-right font-medium text-slate-500">{fmt(d.rangos.SIN?.docentes)}</td>
                        <td className="py-2.5 px-3 text-right font-bold text-slate-900">{fmt(totalDeptDoc)}</td>
                        <td className="py-2.5 px-4 text-right text-slate-600">{fmt(totalDeptUes)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB NIVEL EDUCATIVO */}
        {activeTab === 'nivel' && (
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
            <div className="p-4 bg-slate-50 border-b border-slate-200">
              <h3 className="font-bold text-slate-900 text-sm">Distribución por Nivel Formativo del SEP</h3>
              <p className="text-xs text-slate-500">Inicial, Primaria y Secundaria</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-100/70 text-slate-600 uppercase text-[11px] font-bold border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-4">Nivel Formativo</th>
                    <th className="py-3 px-3 text-right text-emerald-700">Alta (V) Doc</th>
                    <th className="py-3 px-3 text-right text-blue-700">Media (A) Doc</th>
                    <th className="py-3 px-3 text-right text-amber-700">Baja (N) Doc</th>
                    <th className="py-3 px-3 text-right text-slate-600">Sin Pert. Doc</th>
                    <th className="py-3 px-4 text-right">Total Docentes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {data.por_nivel.map((n) => {
                    const totalNivelDoc = RANGO_ORDER.reduce((acc, rk) => acc + (n.rangos[rk]?.docentes ?? 0), 0);
                    return (
                      <tr key={n.nivel} className="hover:bg-slate-50 transition-colors">
                        <td className="py-3 px-4 font-bold text-slate-800">{n.nivel || 'No especificado'}</td>
                        <td className="py-3 px-3 text-right font-semibold text-emerald-700">{fmt(n.rangos.V?.docentes)}</td>
                        <td className="py-3 px-3 text-right font-semibold text-blue-700">{fmt(n.rangos.A?.docentes)}</td>
                        <td className="py-3 px-3 text-right font-semibold text-amber-700">{fmt(n.rangos.N?.docentes)}</td>
                        <td className="py-3 px-3 text-right font-medium text-slate-500">{fmt(n.rangos.SIN?.docentes)}</td>
                        <td className="py-3 px-4 text-right font-bold text-slate-900">{fmt(totalNivelDoc)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
