'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { 
  GraduationCap, 
  School, 
  Users, 
  Clock, 
  Sparkles,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  BarChart2,
  PieChart as PieIcon,
  Layers,
  MapPin,
  BookOpen,
  Filter
} from 'lucide-react';

// ─── Tipos ────────────────────────────────────────────────────────────────────

type Rango = 'V' | 'A' | 'N' | 'SIN';

interface RangoSummary {
  rango: Rango | string;
  docentes: number;
  asignaciones?: number;
  ues: number;
  horas_total?: number;
  duracion_semanas: number;
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
}

// ─── Metadatos visuales por Rango ─────────────────────────────────────────────

const RANGO_INFO: Record<Rango, {
  colorCode: string;
  hex: string;
  label: string;
  tituloBID: string;
  queSignifica: string;
  duracion: string;
  duracionSemanas: number;
  bgLight: string;
  borderLight: string;
  badge: string;
  textClass: string;
}> = {
  V: {
    colorCode: 'V (Verde)',
    hex: '#16a34a',
    label: 'Alta Pertinencia',
    tituloBID: 'Docente Idóneo en Especialidad y Nivel',
    queSignifica: 'El maestro tiene título normalista exactamente en la especialidad y el nivel donde enseña.',
    duracion: '4 semanas (1 mes)',
    duracionSemanas: 4,
    bgLight: 'bg-emerald-50/70',
    borderLight: 'border-emerald-200',
    badge: 'bg-emerald-100 text-emerald-800 border-emerald-300',
    textClass: 'text-emerald-700',
  },
  A: {
    colorCode: 'A (Azul)',
    hex: '#2563eb',
    label: 'Media Pertinencia',
    tituloBID: 'Alineación Parcial / Especialidad Afín',
    queSignifica: 'Docente con formación afín o código de plan de estudios anterior. Requiere nivelación modular.',
    duracion: '12 semanas (3 meses)',
    duracionSemanas: 12,
    bgLight: 'bg-blue-50/70',
    borderLight: 'border-blue-200',
    badge: 'bg-blue-100 text-blue-800 border-blue-300',
    textClass: 'text-blue-700',
  },
  N: {
    colorCode: 'N (Naranja)',
    hex: '#ea580c',
    label: 'Baja Pertinencia',
    tituloBID: 'Desalineación Curricular Marcada',
    queSignifica: 'Docente enseñando una materia significativamente distante a su formación de egreso.',
    duracion: '24 semanas (6 meses)',
    duracionSemanas: 24,
    bgLight: 'bg-amber-50/70',
    borderLight: 'border-amber-200',
    badge: 'bg-amber-100 text-amber-800 border-amber-300',
    textClass: 'text-amber-700',
  },
  SIN: {
    colorCode: 'Sin Código / NO',
    hex: '#64748b',
    label: 'Sin Pertinencia / Impertinente',
    tituloBID: 'Docencia Fuera del Perfil Oficial',
    queSignifica: 'Enseña materias fuera de su especialidad, fuera de su nivel o en ambas dimensiones.',
    duracion: 'Reasignación / Especialización',
    duracionSemanas: 0,
    bgLight: 'bg-slate-50',
    borderLight: 'border-slate-200',
    badge: 'bg-slate-100 text-slate-700 border-slate-300',
    textClass: 'text-slate-700',
  },
};

function fmt(n: number | undefined): string {
  if (n === undefined || isNaN(n)) return '0';
  return n.toLocaleString('es-BO');
}

function pct(part: number, total: number): string {
  if (!total || total === 0) return '0%';
  return ((part / total) * 100).toFixed(1) + '%';
}

// ─── Componente Gráfico Torta / Dona SVG ──────────────────────────────────────

function DonutChart({ 
  valores, 
  total 
}: { 
  valores: { rango: Rango; cantidad: number; color: string; label: string }[];
  total: number;
}) {
  const size = 220;
  const strokeWidth = 36;
  const radius = (size - strokeWidth) / 2;
  const center = size / 2;
  const circumference = 2 * Math.PI * radius;

  let accumulatedPercent = 0;

  return (
    <div className="relative flex items-center justify-center">
      <svg width={size} height={size} className="transform -rotate-90">
        {valores.map((item) => {
          const percent = total > 0 ? item.cantidad / total : 0;
          const strokeDasharray = `${percent * circumference} ${circumference}`;
          const strokeDashoffset = -(accumulatedPercent * circumference);
          accumulatedPercent += percent;

          return (
            <circle
              key={item.rango}
              cx={center}
              cy={center}
              r={radius}
              fill="transparent"
              stroke={item.color}
              strokeWidth={strokeWidth}
              strokeDasharray={strokeDasharray}
              strokeDashoffset={strokeDashoffset}
              className="transition-all duration-500 hover:opacity-85 cursor-pointer"
            />
          );
        })}
      </svg>
      {/* Texto Central */}
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none">
        <span className="text-2xl font-black text-slate-800">{fmt(total)}</span>
        <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Docentes Padrón</span>
      </div>
    </div>
  );
}

// ─── Componente Principal ─────────────────────────────────────────────────────

export default function PertinenciaView() {
  const [data, setData] = useState<PertinenciaData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Filtro de Departamento
  const [selectedDepto, setSelectedDepto] = useState<string>('TODOS');
  // Pestaña visual
  const [viewTab, setViewTab] = useState<'resumen' | 'detalle_territorial'>('resumen');

  useEffect(() => {
    fetch('/api/pertinencia')
      .then((r) => r.json())
      .then((d) => {
        setData(d);
        setLoading(false);
      })
      .catch((e) => {
        setError(String(e));
        setLoading(false);
      });
  }, []);

  const totalDoc = data?.resumen?.TOTAL?.docentes ?? 147096;
  const totalUes = data?.resumen?.TOTAL?.ues ?? 2264;

  // Grupo Meta BID: Docentes que requieren formación prioritaria (Media A + Baja N)
  const metaDocentesPrioritarios = useMemo(() => {
    if (!data) return 81068;
    return (data.resumen.A?.docentes ?? 0) + (data.resumen.N?.docentes ?? 0);
  }, [data]);

  // Estudiantes atendidos por el grupo meta
  const estudiantesAlcanzados = useMemo(() => {
    if (!data) return 3900000;
    return (data.resumen.A?.estudiantes_atendidos ?? 0) + (data.resumen.N?.estudiantes_atendidos ?? 0);
  }, [data]);

  // UEs del grupo meta
  const uesPrioritarias = useMemo(() => {
    return 1452; // Intersección consolidada de UEs con docentes A y N
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-80 gap-3 text-slate-500">
        <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin" />
        <span className="text-sm font-semibold">Cargando diagnóstico de pertinencia docente para el BID...</span>
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

  const donutData = [
    { rango: 'V' as Rango, cantidad: data.resumen.V?.docentes ?? 0, color: '#16a34a', label: 'Alta Pertinencia' },
    { rango: 'A' as Rango, cantidad: data.resumen.A?.docentes ?? 0, color: '#2563eb', label: 'Media Pertinencia' },
    { rango: 'N' as Rango, cantidad: data.resumen.N?.docentes ?? 0, color: '#ea580c', label: 'Baja Pertinencia' },
    { rango: 'SIN' as Rango, cantidad: data.resumen.SIN?.docentes ?? 0, color: '#94a3b8', label: 'Sin Pertinencia' },
  ];

  return (
    <div className="space-y-8 animate-in fade-in duration-300 pb-12">
      
      {/* ── BANNER INSTITUCIONAL BID ──────────────────────────────────────── */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white rounded-3xl p-6 sm:p-8 border border-slate-700/60 shadow-lg relative overflow-hidden">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/20 border border-blue-400/30 text-blue-300 text-xs font-bold mb-3 tracking-wide uppercase">
              <Sparkles className="w-3.5 h-3.5 text-blue-400" />
              INFORME TÉCNICO · BANCO INTERAMERICANO DE DESARROLLO (BID)
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
              Metas de Pertinencia & Formación Docente
            </h1>
            <p className="text-slate-300 text-sm sm:text-base mt-2 max-w-2xl leading-relaxed">
              Diagnóstico oficial para definir las metas del <strong>Componente 2</strong>: docentes que enseñan en o fuera de su especialidad, duración modular del plan formativo y alcance en unidades educativas y estudiantes.
            </p>
          </div>

          {/* Tarjeta resumen rápida */}
          <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/15 flex flex-col gap-1 min-w-[220px]">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-300">Padrón Docente Evaluado</span>
            <span className="text-3xl font-black text-white">{fmt(totalDoc)}</span>
            <span className="text-xs text-blue-300 font-medium">164,448 asignaciones en {fmt(totalUes)} UEs</span>
          </div>
        </div>

        {/* Pestañas de vista rápida */}
        <div className="flex gap-2 mt-6 pt-5 border-t border-slate-700/60 text-xs font-semibold">
          <button
            onClick={() => setViewTab('resumen')}
            className={`px-4 py-2 rounded-xl transition-all ${
              viewTab === 'resumen' 
                ? 'bg-blue-600 text-white shadow-md shadow-blue-900/50' 
                : 'bg-slate-800/80 text-slate-300 hover:bg-slate-800'
            }`}
          >
            📋 Respuestas Ejecutivas BID
          </button>
          <button
            onClick={() => setViewTab('detalle_territorial')}
            className={`px-4 py-2 rounded-xl transition-all ${
              viewTab === 'detalle_territorial' 
                ? 'bg-blue-600 text-white shadow-md shadow-blue-900/50' 
                : 'bg-slate-800/80 text-slate-300 hover:bg-slate-800'
            }`}
          >
            🗺️ Desglose por Departamento y Nivel
          </button>
        </div>
      </div>

      {viewTab === 'resumen' && (
        <div className="space-y-8">

          {/* ═══════════════════════════════════════════════════════════════════
              PREGUNTA 1: ¿CUÁNTOS ENSEÑAN FUERA DE SU ESPECIALIDAD / NIVEL / AMBOS?
             ═══════════════════════════════════════════════════════════════════ */}
          <div className="bg-white rounded-3xl border border-slate-200/90 p-6 sm:p-8 shadow-sm">
            <div className="flex items-center gap-2 mb-2">
              <span className="w-7 h-7 rounded-full bg-blue-100 text-blue-700 font-black text-sm flex items-center justify-center">1</span>
              <h2 className="text-lg sm:text-xl font-bold text-slate-900">
                Pertinencia Docente: Rangos y Docentes Fuera de Perfil
              </h2>
            </div>
            <p className="text-xs sm:text-sm text-slate-500 mb-6 ml-9">
              ¿Cuántos docentes enseñan fuera de su especialidad, nivel o ambos? Desagregación por los 3 rangos oficiales identificados.
            </p>

            {/* Fila con Donut Chart + Tarjetas de Rangos */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
              
              {/* Gráfico de Torta / Dona */}
              <div className="lg:col-span-4 bg-slate-50/80 rounded-2xl p-5 border border-slate-200/80 flex flex-col items-center">
                <span className="text-xs font-bold text-slate-600 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <PieIcon className="w-4 h-4 text-blue-600" />
                  Distribución por Rango
                </span>
                
                <DonutChart valores={donutData} total={totalDoc} />

                <div className="w-full mt-4 space-y-1.5 text-xs">
                  {donutData.map((d) => (
                    <div key={d.rango} className="flex items-center justify-between py-0.5">
                      <div className="flex items-center gap-2">
                        <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: d.color }} />
                        <span className="text-slate-600 font-medium">{d.label} ({d.rango})</span>
                      </div>
                      <span className="font-bold text-slate-800">{pct(d.cantidad, totalDoc)}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Tarjetas de los 3 Rangos oficiales + Sin Pertinencia */}
              <div className="lg:col-span-8 grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {(['V', 'A', 'N', 'SIN'] as Rango[]).map((rk) => {
                  const info = RANGO_INFO[rk];
                  const d = data.resumen[rk];
                  return (
                    <div 
                      key={rk}
                      className={`rounded-2xl border ${info.borderLight} ${info.bgLight} p-4 flex flex-col justify-between`}
                    >
                      <div>
                        <div className="flex items-center justify-between">
                          <span className={`text-[11px] font-black px-2.5 py-0.5 rounded-full border ${info.badge}`}>
                            {info.colorCode}
                          </span>
                          <span className="text-xs font-bold text-slate-600">
                            {pct(d?.docentes ?? 0, totalDoc)}
                          </span>
                        </div>
                        <h4 className="font-black text-slate-900 text-sm mt-2">{info.label}</h4>
                        <p className="text-[11px] text-slate-600 mt-0.5 leading-snug">{info.queSignifica}</p>
                      </div>

                      <div className="mt-4 pt-3 border-t border-slate-200/70 flex items-baseline justify-between">
                        <div>
                          <span className="text-2xl font-black" style={{ color: info.hex }}>
                            {fmt(d?.docentes)}
                          </span>
                          <span className="text-xs text-slate-500 font-medium ml-1">docentes</span>
                        </div>
                        <span className="text-xs text-slate-500 font-semibold">{fmt(d?.ues)} UEs</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* SUB-RESPUESTA CLAVE: ¿Fuera de especialidad, de nivel o de ambos? */}
            <div className="mt-6 pt-6 border-t border-slate-100">
              <h3 className="text-xs sm:text-sm font-bold text-slate-800 uppercase tracking-wider mb-3 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-amber-600" />
                Causas de la Falta de Pertinencia (28,329 casos analizados en aula):
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200">
                  <span className="text-xs text-slate-500 font-semibold block">1. Fuera solo de especialidad</span>
                  <span className="text-2xl font-black text-slate-900 mt-1 block">
                    {fmt(data.desalineacion?.fuera_especialidad ?? 26170)}
                  </span>
                  <span className="text-xs font-bold text-blue-700 block mt-0.5">
                    92.4% de los desalineados
                  </span>
                  <p className="text-[11px] text-slate-500 mt-2 leading-tight">
                    Docente con título en un área (ej: Lenguaje o Primaria) asignado a materias distintas (ej: Física, Técnica Tecnológica).
                  </p>
                </div>

                <div className="bg-amber-50/70 rounded-2xl p-4 border border-amber-200">
                  <span className="text-xs text-amber-800 font-semibold block">2. Fuera de ambos (Nivel y Especialidad)</span>
                  <span className="text-2xl font-black text-amber-800 mt-1 block">
                    {fmt(data.desalineacion?.fuera_ambos ?? 2079)}
                  </span>
                  <span className="text-xs font-bold text-amber-700 block mt-0.5">
                    7.3% de los desalineados
                  </span>
                  <p className="text-[11px] text-amber-800/80 mt-2 leading-tight">
                    Brecha máxima: titulado para un subsistema y materia diferente al curso y nivel donde ejerce funciones.
                  </p>
                </div>

                <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200">
                  <span className="text-xs text-slate-500 font-semibold block">3. Fuera solo de nivel formativo</span>
                  <span className="text-2xl font-black text-slate-900 mt-1 block">
                    {fmt(data.desalineacion?.fuera_nivel ?? 80)}
                  </span>
                  <span className="text-xs font-bold text-slate-600 block mt-0.5">
                    0.3% de los desalineados
                  </span>
                  <p className="text-[11px] text-slate-500 mt-2 leading-tight">
                    Enseña la materia de su título pero en un nivel escolar para el que no fue formado inicialmente.
                  </p>
                </div>
              </div>
            </div>
          </div>


          {/* ═══════════════════════════════════════════════════════════════════
              PREGUNTA 2: NECESIDADES DE FORMACIÓN Y DURACIÓN SEGÚN RANGO
             ═══════════════════════════════════════════════════════════════════ */}
          <div className="bg-white rounded-3xl border border-slate-200/90 p-6 sm:p-8 shadow-sm">
            <div className="flex items-center gap-2 mb-2">
              <span className="w-7 h-7 rounded-full bg-amber-100 text-amber-800 font-black text-sm flex items-center justify-center">2</span>
              <h2 className="text-lg sm:text-xl font-bold text-slate-900">
                Necesidades de Formación: Metas Cuantitativas y Duración
              </h2>
            </div>
            <p className="text-xs sm:text-sm text-slate-500 mb-6 ml-9">
              ¿Cuántos docentes requerirían formación y cuánto duraría según su rango de pertinencia?
            </p>

            {/* Grupo Meta Principal BID */}
            <div className="bg-gradient-to-r from-blue-900 to-indigo-900 text-white rounded-2xl p-5 mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3.5">
                <div className="w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center text-amber-400 shrink-0">
                  <GraduationCap className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-extrabold text-base text-white">
                    Meta de Formación Prioritaria Componente 2: Rango A + Rango N
                  </h3>
                  <p className="text-xs text-blue-200 mt-0.5">
                    Docentes en ejercicio que requieren capacitación correctiva y nivelación curricular urgente.
                  </p>
                </div>
              </div>
              <div className="text-left sm:text-right shrink-0">
                <span className="text-3xl font-black text-amber-300">{fmt(metaDocentesPrioritarios)}</span>
                <span className="text-xs text-blue-200 block font-semibold">55.1% de todo el magisterio</span>
              </div>
            </div>

            {/* Tarjetas comparativas de duración por Rango */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              
              {/* Rango N */}
              <div className="rounded-2xl border-2 border-amber-300 bg-amber-50/50 p-5 relative overflow-hidden flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black uppercase text-amber-800 bg-amber-200/70 px-2.5 py-0.5 rounded-full">
                      Rango N (Naranja)
                    </span>
                    <span className="text-xs font-extrabold text-amber-800">Prioridad Alta</span>
                  </div>
                  <h4 className="font-black text-slate-900 text-base mt-2">Baja Pertinencia</h4>
                  <p className="text-xs text-slate-600 mt-1">
                    Requieren <strong>reconversión pedagógica profunda</strong> porque enseñan materias muy distantes a su formación inicial.
                  </p>
                </div>

                <div className="mt-5 pt-4 border-t border-amber-200">
                  <div className="flex items-baseline justify-between">
                    <span className="text-2xl font-black text-amber-800">{fmt(data.resumen.N?.docentes)}</span>
                    <span className="text-xs font-semibold text-slate-500">docentes meta</span>
                  </div>
                  <div className="mt-3 bg-white rounded-xl p-2.5 border border-amber-200 text-xs font-bold text-amber-900 flex items-center gap-2">
                    <Clock className="w-4 h-4 text-amber-600 shrink-0" />
                    <span>Duración: 24 semanas (6 meses / 1 semestre)</span>
                  </div>
                </div>
              </div>

              {/* Rango A */}
              <div className="rounded-2xl border-2 border-blue-300 bg-blue-50/50 p-5 relative overflow-hidden flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black uppercase text-blue-800 bg-blue-200/70 px-2.5 py-0.5 rounded-full">
                      Rango A (Azul)
                    </span>
                    <span className="text-xs font-extrabold text-blue-800">Volumen Principal</span>
                  </div>
                  <h4 className="font-black text-slate-900 text-base mt-2">Media Pertinencia</h4>
                  <p className="text-xs text-slate-600 mt-1">
                    Requieren <strong>nivelación curricular modular</strong> para actualizarse en contenidos y enfoque pedagógico del currículo.
                  </p>
                </div>

                <div className="mt-5 pt-4 border-t border-blue-200">
                  <div className="flex items-baseline justify-between">
                    <span className="text-2xl font-black text-blue-800">{fmt(data.resumen.A?.docentes)}</span>
                    <span className="text-xs font-semibold text-slate-500">docentes meta</span>
                  </div>
                  <div className="mt-3 bg-white rounded-xl p-2.5 border border-blue-200 text-xs font-bold text-blue-900 flex items-center gap-2">
                    <Clock className="w-4 h-4 text-blue-600 shrink-0" />
                    <span>Duración: 12 semanas (3 meses / 1 trimestre)</span>
                  </div>
                </div>
              </div>

              {/* Rango V */}
              <div className="rounded-2xl border-2 border-emerald-300 bg-emerald-50/50 p-5 relative overflow-hidden flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black uppercase text-emerald-800 bg-emerald-200/70 px-2.5 py-0.5 rounded-full">
                      Rango V (Verde)
                    </span>
                    <span className="text-xs font-extrabold text-emerald-800">Docentes Idóneos</span>
                  </div>
                  <h4 className="font-black text-slate-900 text-base mt-2">Alta Pertinencia</h4>
                  <p className="text-xs text-slate-600 mt-1">
                    Docentes alineados; requieren únicamente <strong>talleres de innovación didáctica</strong> y uso de tecnologías de aula.
                  </p>
                </div>

                <div className="mt-5 pt-4 border-t border-emerald-200">
                  <div className="flex items-baseline justify-between">
                    <span className="text-2xl font-black text-emerald-800">{fmt(data.resumen.V?.docentes)}</span>
                    <span className="text-xs font-semibold text-slate-500">docentes meta</span>
                  </div>
                  <div className="mt-3 bg-white rounded-xl p-2.5 border border-emerald-200 text-xs font-bold text-emerald-900 flex items-center gap-2">
                    <Clock className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>Duración: 4 semanas (1 mes de talleres)</span>
                  </div>
                </div>
              </div>

            </div>
          </div>


          {/* ═══════════════════════════════════════════════════════════════════
              PREGUNTA 3: BENEFICIARIOS (UNIDADES EDUCATIVAS Y ESTUDIANTES)
             ═══════════════════════════════════════════════════════════════════ */}
          <div className="bg-white rounded-3xl border border-slate-200/90 p-6 sm:p-8 shadow-sm">
            <div className="flex items-center gap-2 mb-2">
              <span className="w-7 h-7 rounded-full bg-purple-100 text-purple-800 font-black text-sm flex items-center justify-center">3</span>
              <h2 className="text-lg sm:text-xl font-bold text-slate-900">
                Beneficiarios: Alcance en Unidades Educativas y Estudiantes
              </h2>
            </div>
            <p className="text-xs sm:text-sm text-slate-500 mb-6 ml-9">
              ¿En cuántas unidades educativas enseñan y a cuántos estudiantes atienden los docentes que requieren formación?
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              
              {/* Tarjeta Beneficiarios: UEs */}
              <div className="rounded-2xl border border-slate-200 p-6 bg-gradient-to-br from-purple-50/50 via-white to-white">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-purple-100 flex items-center justify-center text-purple-700">
                    <School className="w-6 h-6" />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-purple-800 uppercase tracking-wide">Cobertura Territorial</span>
                    <h3 className="text-3xl font-black text-slate-900 mt-0.5">{fmt(uesPrioritarias)} UEs</h3>
                  </div>
                </div>

                <p className="text-xs text-slate-600 mt-4 leading-relaxed">
                  Son las Unidades Educativas a nivel nacional donde se concentran los <strong>81,068 docentes prioritarios</strong> (Rangos A y N).
                </p>

                <div className="mt-4 pt-3 border-t border-slate-200/80 space-y-2 text-xs">
                  <div className="flex justify-between text-slate-600">
                    <span>UEs con maestros en Rango N (Baja pertinencia):</span>
                    <strong className="text-amber-700">{fmt(data.resumen.N?.ues)} UEs</strong>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>UEs con maestros en Rango A (Media pertinencia):</span>
                    <strong className="text-blue-700">{fmt(data.resumen.A?.ues)} UEs</strong>
                  </div>
                  <div className="flex justify-between text-slate-800 font-bold pt-1 border-t border-slate-100">
                    <span>Total UEs en todo el padrón nacional evaluado:</span>
                    <span>{fmt(totalUes)} UEs</span>
                  </div>
                </div>
              </div>

              {/* Tarjeta Beneficiarios: Estudiantes */}
              <div className="rounded-2xl border border-slate-200 p-6 bg-gradient-to-br from-blue-50/50 via-white to-white">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-blue-100 flex items-center justify-center text-blue-700">
                    <Users className="w-6 h-6" />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-blue-800 uppercase tracking-wide">Población Escolar Alcanzada</span>
                    <h3 className="text-3xl font-black text-slate-900 mt-0.5">~3.9 Millones</h3>
                  </div>
                </div>

                <p className="text-xs text-slate-600 mt-4 leading-relaxed">
                  Estudiantes de Primaria y Secundaria beneficiados directamente al nivelar la pertinencia de sus maestros.
                </p>

                <div className="mt-4 pt-3 border-t border-slate-200/80 space-y-2 text-xs">
                  <div className="flex justify-between text-slate-600">
                    <span>Alumnos atendidos por docentes Rango N:</span>
                    <strong className="text-amber-700">~{fmt(data.resumen.N?.estudiantes_atendidos)} estudiantes</strong>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>Alumnos atendidos por docentes Rango A:</span>
                    <strong className="text-blue-700">~{fmt(data.resumen.A?.estudiantes_atendidos)} estudiantes</strong>
                  </div>
                  <div className="flex justify-between text-slate-800 font-bold pt-1 border-t border-slate-100">
                    <span>Impacto sistémico acumulado:</span>
                    <span className="text-emerald-700">Elevación cualitativa global</span>
                  </div>
                </div>
              </div>

            </div>
          </div>

        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════
          PESTAÑA 2: DESGLOSE POR DEPARTAMENTO Y NIVEL
         ═══════════════════════════════════════════════════════════════════ */}
      {viewTab === 'detalle_territorial' && (
        <div className="space-y-6">
          
          {/* Por Departamento */}
          <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm">
            <h3 className="font-extrabold text-base text-slate-900 mb-1">
              Distribución por Departamento de Bolivia
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              Desagregación del padrón en los 9 departamentos según rango de pertinencia
            </p>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 text-slate-500 font-bold uppercase text-[11px] border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-3">Departamento</th>
                    <th className="py-3 px-3 text-right text-emerald-700">🟢 Alta (V)</th>
                    <th className="py-3 px-3 text-right text-blue-700">🔵 Media (A)</th>
                    <th className="py-3 px-3 text-right text-amber-700">🟠 Baja (N)</th>
                    <th className="py-3 px-3 text-right text-slate-500">⚪ Sin Pert.</th>
                    <th className="py-3 px-3 text-right font-black text-slate-800">Total Docentes</th>
                    <th className="py-3 px-3 text-right text-slate-600">UEs</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {data.por_departamento.map((d) => {
                    const totalDeptDoc = (['V', 'A', 'N', 'SIN'] as Rango[]).reduce((acc, rk) => acc + (d.rangos[rk]?.docentes ?? 0), 0);
                    const totalDeptUes = Math.max(...(['V', 'A', 'N', 'SIN'] as Rango[]).map(rk => d.rangos[rk]?.ues ?? 0));
                    return (
                      <tr key={d.departamento} className="hover:bg-slate-50/80">
                        <td className="py-3 px-3 font-bold text-slate-800">{d.departamento}</td>
                        <td className="py-3 px-3 text-right font-semibold text-emerald-700">{fmt(d.rangos.V?.docentes)}</td>
                        <td className="py-3 px-3 text-right font-semibold text-blue-700">{fmt(d.rangos.A?.docentes)}</td>
                        <td className="py-3 px-3 text-right font-semibold text-amber-700">{fmt(d.rangos.N?.docentes)}</td>
                        <td className="py-3 px-3 text-right font-medium text-slate-500">{fmt(d.rangos.SIN?.docentes)}</td>
                        <td className="py-3 px-3 text-right font-black text-slate-900">{fmt(totalDeptDoc)}</td>
                        <td className="py-3 px-3 text-right font-medium text-slate-600">{fmt(totalDeptUes)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Por Nivel Educativo */}
          <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm">
            <h3 className="font-extrabold text-base text-slate-900 mb-1">
              Distribución por Nivel Formativo (Inicial, Primaria, Secundaria)
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              Comportamiento de la pertinencia docente según el nivel educativo donde ejercen funciones
            </p>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 text-slate-500 font-bold uppercase text-[11px] border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-3">Nivel Educativo</th>
                    <th className="py-3 px-3 text-right text-emerald-700">🟢 Alta (V)</th>
                    <th className="py-3 px-3 text-right text-blue-700">🔵 Media (A)</th>
                    <th className="py-3 px-3 text-right text-amber-700">🟠 Baja (N)</th>
                    <th className="py-3 px-3 text-right text-slate-500">⚪ Sin Pert.</th>
                    <th className="py-3 px-3 text-right font-black text-slate-800">Total Docentes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {data.por_nivel.map((n) => {
                    const totalNivelDoc = (['V', 'A', 'N', 'SIN'] as Rango[]).reduce((acc, rk) => acc + (n.rangos[rk]?.docentes ?? 0), 0);
                    return (
                      <tr key={n.nivel} className="hover:bg-slate-50/80">
                        <td className="py-3 px-3 font-bold text-slate-800">{n.nivel || 'No especificado'}</td>
                        <td className="py-3 px-3 text-right font-semibold text-emerald-700">{fmt(n.rangos.V?.docentes)}</td>
                        <td className="py-3 px-3 text-right font-semibold text-blue-700">{fmt(n.rangos.A?.docentes)}</td>
                        <td className="py-3 px-3 text-right font-semibold text-amber-700">{fmt(n.rangos.N?.docentes)}</td>
                        <td className="py-3 px-3 text-right font-medium text-slate-500">{fmt(n.rangos.SIN?.docentes)}</td>
                        <td className="py-3 px-3 text-right font-black text-slate-900">{fmt(totalNivelDoc)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      )}

    </div>
  );
}
