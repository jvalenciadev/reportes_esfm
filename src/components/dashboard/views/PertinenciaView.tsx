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
  BarChart3,
  PieChart as PieIcon,
  Layers,
  MapPin,
  BookOpen,
  Filter,
  ArrowRight,
  TrendingUp,
  Target
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
    queSignifica: 'Título normalista exactamente alineado a la materia y nivel impartido.',
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
    queSignifica: 'Docente con formación afín o planes anteriores. Requiere nivelación curricular.',
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
    queSignifica: 'Enseña una materia sustancialmente distante a su formación inicial de egreso.',
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
    queSignifica: 'Asignaciones sin correspondencia curricular identificada en el sistema.',
    duracion: 'Especialización / Reasignación',
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

// ─── Componente Gráfico 1: Torta / Dona SVG Interactiva ───────────────────────

function DonutChart({ 
  valores, 
  total,
  selectedRango,
  onSelectRango
}: { 
  valores: { rango: Rango; cantidad: number; color: string; label: string }[];
  total: number;
  selectedRango: Rango | null;
  onSelectRango: (r: Rango | null) => void;
}) {
  const size = 240;
  const strokeWidth = 40;
  const radius = (size - strokeWidth) / 2;
  const center = size / 2;
  const circumference = 2 * Math.PI * radius;

  let accumulatedPercent = 0;

  return (
    <div className="relative flex items-center justify-center">
      <svg width={size} height={size} className="transform -rotate-90 drop-shadow-sm">
        {valores.map((item) => {
          const percent = total > 0 ? item.cantidad / total : 0;
          const strokeDasharray = `${percent * circumference} ${circumference}`;
          const strokeDashoffset = -(accumulatedPercent * circumference);
          accumulatedPercent += percent;
          const isSelected = selectedRango === item.rango;

          return (
            <circle
              key={item.rango}
              cx={center}
              cy={center}
              r={radius}
              fill="transparent"
              stroke={item.color}
              strokeWidth={isSelected ? strokeWidth + 6 : strokeWidth}
              strokeDasharray={strokeDasharray}
              strokeDashoffset={strokeDashoffset}
              onClick={() => onSelectRango(selectedRango === item.rango ? null : item.rango)}
              className="transition-all duration-300 hover:opacity-90 cursor-pointer"
            />
          );
        })}
      </svg>
      {/* Centro informativo */}
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none px-4">
        <span className="text-2xl font-black text-slate-800 tracking-tight">{fmt(total)}</span>
        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">
          Docentes Evaluados
        </span>
      </div>
    </div>
  );
}

// ─── Componente Principal ─────────────────────────────────────────────────────

export default function PertinenciaView() {
  const [data, setData] = useState<PertinenciaData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedRango, setSelectedRango] = useState<Rango | null>(null);
  const [activeTab, setActiveTab] = useState<'diagnostico' | 'territorial' | 'niveles'>('diagnostico');

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

  // Metas BID
  const metaDocentesPrioritarios = useMemo(() => {
    if (!data) return 81068;
    return (data.resumen.A?.docentes ?? 0) + (data.resumen.N?.docentes ?? 0);
  }, [data]);

  const estudiantesAlcanzados = useMemo(() => {
    if (!data) return 3900000;
    return (data.resumen.A?.estudiantes_atendidos ?? 0) + (data.resumen.N?.estudiantes_atendidos ?? 0);
  }, [data]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-96 gap-3 text-slate-500">
        <div className="w-9 h-9 border-3 border-blue-600 border-t-transparent rounded-full animate-spin" />
        <span className="text-sm font-semibold tracking-wide">Cargando tablero institucional de pertinencia...</span>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="p-6 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
        Error al cargar los datos: {error ?? 'Archivo no disponible'}
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
    <div className="space-y-8 animate-in fade-in duration-300 pb-16">
      
      {/* ── HEADER INSTITUCIONAL ──────────────────────────────────────────── */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 text-white rounded-3xl p-6 sm:p-8 shadow-sm border border-slate-700 relative overflow-hidden">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-400/10 border border-amber-400/30 text-amber-300 text-xs font-bold mb-3 tracking-wider uppercase">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              SISTEMA INTEGRAL DE PERTINENCIA CURRICULAR · SIE / BID
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
              Diagnóstico de Pertinencia & Formación Docente
            </h1>
            <p className="text-slate-300 text-xs sm:text-sm mt-2 max-w-2xl leading-relaxed">
              Base técnica oficial para la definición de metas e indicadores del <strong>Componente 2 (BID)</strong>: caracterización de pertinencia, necesidades formativas y alcance poblacional en el Estado Plurinacional de Bolivia.
            </p>
          </div>

          {/* Tarjeta de impacto superior */}
          <div className="bg-white/10 backdrop-blur-md border border-white/15 rounded-2xl p-4 sm:p-5 flex flex-col justify-center min-w-[240px]">
            <span className="text-[11px] font-bold text-slate-300 uppercase tracking-widest">Padrón Docente Evaluado</span>
            <span className="text-3xl sm:text-4xl font-black text-white mt-1">{fmt(totalDoc)}</span>
            <div className="flex items-center gap-2 mt-2 text-xs text-amber-300 font-semibold">
              <span>{fmt(totalUes)} Unidades Educativas</span>
              <span>•</span>
              <span>164,448 asignaciones</span>
            </div>
          </div>
        </div>

        {/* Barra de navegación de pestañas */}
        <div className="flex gap-2 mt-6 pt-5 border-t border-slate-700/80 text-xs font-bold">
          <button
            onClick={() => setActiveTab('diagnostico')}
            className={`px-4 py-2.5 rounded-xl transition-all flex items-center gap-2 ${
              activeTab === 'diagnostico' 
                ? 'bg-[#c9a751] text-slate-900 shadow-md font-extrabold' 
                : 'bg-slate-800/80 text-slate-300 hover:bg-slate-800'
            }`}
          >
            <BarChart3 className="w-4 h-4" />
            Tablero Ejecutivo de Respuestas BID
          </button>
          <button
            onClick={() => setActiveTab('territorial')}
            className={`px-4 py-2.5 rounded-xl transition-all flex items-center gap-2 ${
              activeTab === 'territorial' 
                ? 'bg-[#c9a751] text-slate-900 shadow-md font-extrabold' 
                : 'bg-slate-800/80 text-slate-300 hover:bg-slate-800'
            }`}
          >
            <MapPin className="w-4 h-4" />
            Distribución Territorial por Departamentos
          </button>
          <button
            onClick={() => setActiveTab('niveles')}
            className={`px-4 py-2.5 rounded-xl transition-all flex items-center gap-2 ${
              activeTab === 'niveles' 
                ? 'bg-[#c9a751] text-slate-900 shadow-md font-extrabold' 
                : 'bg-slate-800/80 text-slate-300 hover:bg-slate-800'
            }`}
          >
            <Layers className="w-4 h-4" />
            Comportamiento por Nivel Educativo
          </button>
        </div>
      </div>

      {activeTab === 'diagnostico' && (
        <div className="space-y-8">

          {/* ═══════════════════════════════════════════════════════════════════
              1. GRÁFICO DE EMBUDO DE IMPACTO BID (FUNNEL)
             ═══════════════════════════════════════════════════════════════════ */}
          <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs">
            <div className="flex items-center justify-between mb-4">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-blue-700 bg-blue-50 px-2.5 py-1 rounded-full border border-blue-200">
                  Visión Estratégica BID
                </span>
                <h3 className="text-base sm:text-lg font-black text-slate-900 mt-2">
                  Pirámide de Alcance e Impacto del Programa (Componente 2)
                </h3>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-4">
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 flex flex-col justify-between">
                <div>
                  <span className="text-[11px] font-bold text-slate-500 uppercase">1. Padrón Total</span>
                  <p className="text-2xl font-black text-slate-900 mt-1">{fmt(totalDoc)}</p>
                  <p className="text-xs text-slate-500 mt-1">Docentes evaluados a nivel nacional</p>
                </div>
                <div className="mt-3 text-xs font-bold text-slate-600 bg-slate-200/60 px-2 py-1 rounded-lg text-center">
                  100% Cobertura Padrón
                </div>
              </div>

              <div className="bg-amber-50/70 border border-amber-200 rounded-2xl p-4 flex flex-col justify-between">
                <div>
                  <span className="text-[11px] font-bold text-amber-800 uppercase">2. Meta Prioritaria</span>
                  <p className="text-2xl font-black text-amber-800 mt-1">{fmt(metaDocentesPrioritarios)}</p>
                  <p className="text-xs text-amber-800/80 mt-1">Docentes con pertinencia Media y Baja (A + N)</p>
                </div>
                <div className="mt-3 text-xs font-bold text-amber-800 bg-amber-100 px-2 py-1 rounded-lg text-center">
                  55.1% del Magisterio
                </div>
              </div>

              <div className="bg-purple-50/70 border border-purple-200 rounded-2xl p-4 flex flex-col justify-between">
                <div>
                  <span className="text-[11px] font-bold text-purple-800 uppercase">3. UEs Focalizadas</span>
                  <p className="text-2xl font-black text-purple-800 mt-1">1,452 UEs</p>
                  <p className="text-xs text-purple-800/80 mt-1">Recintos escolares con docentes a capacitar</p>
                </div>
                <div className="mt-3 text-xs font-bold text-purple-800 bg-purple-100 px-2 py-1 rounded-lg text-center">
                  64.1% de UEs Evaluadas
                </div>
              </div>

              <div className="bg-emerald-50/70 border border-emerald-200 rounded-2xl p-4 flex flex-col justify-between">
                <div>
                  <span className="text-[11px] font-bold text-emerald-800 uppercase">4. Estudiantes Beneficiados</span>
                  <p className="text-2xl font-black text-emerald-800 mt-1">~3.9 Millones</p>
                  <p className="text-xs text-emerald-800/80 mt-1">Atenciones escolares alcanzadas en aula</p>
                </div>
                <div className="mt-3 text-xs font-bold text-emerald-800 bg-emerald-100 px-2 py-1 rounded-lg text-center">
                  Impacto Directo en Calidad
                </div>
              </div>
            </div>
          </div>


          {/* ═══════════════════════════════════════════════════════════════════
              2. PREGUNTA 1: RANGOS DE PERTINENCIA & GRÁFICO DE DONA
             ═══════════════════════════════════════════════════════════════════ */}
          <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-xs">
            <div className="flex items-center gap-2 mb-2">
              <span className="w-7 h-7 rounded-full bg-blue-100 text-blue-800 font-black text-xs flex items-center justify-center">1</span>
              <h2 className="text-lg sm:text-xl font-bold text-slate-900">
                Pertinencia Docente: Rangos Oficiales y Distribución
              </h2>
            </div>
            <p className="text-xs sm:text-sm text-slate-500 mb-6 ml-9">
              ¿Cuántos docentes enseñan fuera de su especialidad, de su nivel o de ambos? Desagregación por rango.
            </p>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
              
              {/* Gráfico Dona */}
              <div className="lg:col-span-5 bg-slate-50/70 rounded-2xl p-5 border border-slate-200/80 flex flex-col items-center">
                <span className="text-xs font-bold text-slate-600 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <PieIcon className="w-4 h-4 text-blue-600" />
                  Gráfico de Distribución por Rango (Torta)
                </span>
                
                <DonutChart 
                  valores={donutData} 
                  total={totalDoc} 
                  selectedRango={selectedRango} 
                  onSelectRango={setSelectedRango} 
                />

                {/* Leyenda interactiva */}
                <div className="w-full mt-4 space-y-2 text-xs">
                  {donutData.map((d) => (
                    <div 
                      key={d.rango} 
                      onClick={() => setSelectedRango(selectedRango === d.rango ? null : d.rango)}
                      className={`flex items-center justify-between p-1.5 rounded-lg cursor-pointer transition-colors ${
                        selectedRango === d.rango ? 'bg-slate-200/80 font-bold' : 'hover:bg-slate-100'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: d.color }} />
                        <span className="text-slate-700">{d.label} ({d.rango})</span>
                      </div>
                      <div className="text-right">
                        <span className="font-bold text-slate-900 mr-2">{fmt(d.cantidad)}</span>
                        <span className="text-slate-500 font-semibold">{pct(d.cantidad, totalDoc)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Tarjetas de Rangos */}
              <div className="lg:col-span-7 grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {(['V', 'A', 'N', 'SIN'] as Rango[]).map((rk) => {
                  const info = RANGO_INFO[rk];
                  const d = data.resumen[rk];
                  const isSelected = selectedRango === rk;
                  return (
                    <div 
                      key={rk}
                      onClick={() => setSelectedRango(selectedRango === rk ? null : rk)}
                      className={`rounded-2xl border p-4 flex flex-col justify-between cursor-pointer transition-all ${
                        isSelected 
                          ? 'ring-2 ring-blue-600 shadow-md bg-white' 
                          : `${info.borderLight} ${info.bgLight} hover:bg-white hover:shadow-xs`
                      }`}
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
                        <p className="text-[11px] text-slate-600 mt-1 leading-snug">{info.queSignifica}</p>
                      </div>

                      <div className="mt-4 pt-3 border-t border-slate-200/70 flex items-baseline justify-between">
                        <div>
                          <span className="text-2xl font-black" style={{ color: info.hex }}>
                            {fmt(d?.docentes)}
                          </span>
                          <span className="text-xs text-slate-500 font-medium ml-1">docentes</span>
                        </div>
                        <span className="text-xs text-slate-500 font-bold">{fmt(d?.ues)} UEs</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* GRÁFICO 2: CAUSAS DE LA DESALINEACIÓN CURRICULAR */}
            <div className="mt-8 pt-6 border-t border-slate-100">
              <h3 className="text-xs sm:text-sm font-bold text-slate-800 uppercase tracking-wider mb-4 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-amber-600" />
                ¿En qué dimensión están desalineados? (28,329 casos analizados):
              </h3>

              <div className="space-y-3.5 bg-slate-50/80 p-5 rounded-2xl border border-slate-200">
                
                {/* Barra 1: Especialidad */}
                <div>
                  <div className="flex justify-between text-xs font-bold text-slate-800 mb-1">
                    <span className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-blue-600" />
                      1. Fuera solo de Especialidad (Docente con título en un área dictando otra materia)
                    </span>
                    <span className="text-blue-700">26,170 casos · 92.4%</span>
                  </div>
                  <div className="w-full bg-slate-200 rounded-full h-3.5 overflow-hidden">
                    <div className="bg-blue-600 h-full rounded-full transition-all duration-700" style={{ width: '92.4%' }} />
                  </div>
                </div>

                {/* Barra 2: Ambos */}
                <div>
                  <div className="flex justify-between text-xs font-bold text-slate-800 mb-1">
                    <span className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-amber-600" />
                      2. Fuera de Ambos: Nivel y Especialidad (Brecha total: nivel distinto y materia ajena)
                    </span>
                    <span className="text-amber-700">2,079 casos · 7.3%</span>
                  </div>
                  <div className="w-full bg-slate-200 rounded-full h-3.5 overflow-hidden">
                    <div className="bg-amber-600 h-full rounded-full transition-all duration-700" style={{ width: '7.3%' }} />
                  </div>
                </div>

                {/* Barra 3: Solo Nivel */}
                <div>
                  <div className="flex justify-between text-xs font-bold text-slate-800 mb-1">
                    <span className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-slate-600" />
                      3. Fuera solo de Nivel Formativo (Misma materia pero en subsistema o ciclo diferente)
                    </span>
                    <span className="text-slate-700">80 casos · 0.3%</span>
                  </div>
                  <div className="w-full bg-slate-200 rounded-full h-3.5 overflow-hidden">
                    <div className="bg-slate-600 h-full rounded-full transition-all duration-700" style={{ width: '0.3%' }} />
                  </div>
                </div>

              </div>
            </div>
          </div>


          {/* ═══════════════════════════════════════════════════════════════════
              3. PREGUNTA 2: NECESIDADES DE FORMACIÓN & CRONOGRAMA MODULAR
             ═══════════════════════════════════════════════════════════════════ */}
          <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-xs">
            <div className="flex items-center gap-2 mb-2">
              <span className="w-7 h-7 rounded-full bg-amber-100 text-amber-800 font-black text-xs flex items-center justify-center">2</span>
              <h2 className="text-lg sm:text-xl font-bold text-slate-900">
                Necesidades de Formación: Metas y Duración Diferenciada
              </h2>
            </div>
            <p className="text-xs sm:text-sm text-slate-500 mb-6 ml-9">
              ¿Cuántos docentes requerirían formación y cuánto duraría según el rango de pertinencia?
            </p>

            {/* GRÁFICO 3: CRONOGRAMA Y DURACIÓN COMPARATIVA (GANTT STYLE) */}
            <div className="bg-slate-50 rounded-2xl p-5 border border-slate-200 mb-6">
              <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-4 flex items-center gap-2">
                <Clock className="w-4 h-4 text-blue-600" />
                Comparativa de Duración Formativa por Rango:
              </h3>

              <div className="space-y-4">
                {/* Rango N */}
                <div className="bg-white p-4 rounded-xl border border-amber-200">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                    <div>
                      <span className="text-xs font-extrabold text-amber-800 bg-amber-100 px-2 py-0.5 rounded-md">
                        Rango N · Baja Pertinencia
                      </span>
                      <strong className="text-sm text-slate-900 ml-2">4,314 Docentes Meta</strong>
                    </div>
                    <span className="text-xs font-black text-amber-800">
                      24 SEMANAS (6 MESES / 1 SEMESTRE)
                    </span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden">
                    <div className="bg-amber-600 h-full rounded-full transition-all duration-700" style={{ width: '100%' }} />
                  </div>
                  <p className="text-[11px] text-slate-500 mt-2">
                    <strong>¿Por qué 24 semanas?</strong> El docente enseña materias con brecha sustancial frente a su formación; requiere habilitación y reconversión pedagógica profunda.
                  </p>
                </div>

                {/* Rango A */}
                <div className="bg-white p-4 rounded-xl border border-blue-200">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                    <div>
                      <span className="text-xs font-extrabold text-blue-800 bg-blue-100 px-2 py-0.5 rounded-md">
                        Rango A · Media Pertinencia
                      </span>
                      <strong className="text-sm text-slate-900 ml-2">76,754 Docentes Meta</strong>
                    </div>
                    <span className="text-xs font-black text-blue-800">
                      12 SEMANAS (3 MESES / 1 TRIMESTRE)
                    </span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden">
                    <div className="bg-blue-600 h-full rounded-full transition-all duration-700" style={{ width: '50%' }} />
                  </div>
                  <p className="text-[11px] text-slate-500 mt-2">
                    <strong>¿Por qué 12 semanas?</strong> Posee formación afín; requiere nivelación modular y actualización curricular en contenidos vigentes.
                  </p>
                </div>

                {/* Rango V */}
                <div className="bg-white p-4 rounded-xl border border-emerald-200">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                    <div>
                      <span className="text-xs font-extrabold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-md">
                        Rango V · Alta Pertinencia
                      </span>
                      <strong className="text-sm text-slate-900 ml-2">43,411 Docentes Idóneos</strong>
                    </div>
                    <span className="text-xs font-black text-emerald-800">
                      4 SEMANAS (1 MES / TALLERES)
                    </span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden">
                    <div className="bg-emerald-600 h-full rounded-full transition-all duration-700" style={{ width: '16.6%' }} />
                  </div>
                  <p className="text-[11px] text-slate-500 mt-2">
                    <strong>¿Por qué 4 semanas?</strong> Pertinencia idónea; formación enfocada en didáctica activa y tecnologías de aula.
                  </p>
                </div>
              </div>
            </div>
          </div>


          {/* ═══════════════════════════════════════════════════════════════════
              4. PREGUNTA 3: BENEFICIARIOS (UES Y ESTUDIANTES)
             ═══════════════════════════════════════════════════════════════════ */}
          <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-xs">
            <div className="flex items-center gap-2 mb-2">
              <span className="w-7 h-7 rounded-full bg-purple-100 text-purple-800 font-black text-xs flex items-center justify-center">3</span>
              <h2 className="text-lg sm:text-xl font-bold text-slate-900">
                Beneficiarios y Alcance de la Intervención
              </h2>
            </div>
            <p className="text-xs sm:text-sm text-slate-500 mb-6 ml-9">
              ¿En cuántas unidades educativas enseñan los docentes que requerirían formación y a cuántos estudiantes atienden?
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              
              {/* UEs */}
              <div className="rounded-2xl border border-purple-200 p-6 bg-purple-50/40">
                <div className="flex items-center gap-3.5">
                  <div className="w-12 h-12 rounded-2xl bg-purple-100 text-purple-700 flex items-center justify-center shrink-0">
                    <School className="w-6 h-6" />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-purple-800 uppercase tracking-wide">Alcance en Unidades Educativas</span>
                    <h4 className="text-3xl font-black text-slate-900 mt-0.5">1,452 UEs Focalizadas</h4>
                  </div>
                </div>

                <div className="mt-5 space-y-2.5 text-xs">
                  <div className="bg-white p-3 rounded-xl border border-purple-100 flex justify-between items-center">
                    <span className="text-slate-600">UEs con docentes Rango N (Baja pertinencia):</span>
                    <strong className="text-amber-700 font-black">{fmt(data.resumen.N?.ues)} UEs</strong>
                  </div>
                  <div className="bg-white p-3 rounded-xl border border-purple-100 flex justify-between items-center">
                    <span className="text-slate-600">UEs con docentes Rango A (Media pertinencia):</span>
                    <strong className="text-blue-700 font-black">{fmt(data.resumen.A?.ues)} UEs</strong>
                  </div>
                  <div className="bg-white p-3 rounded-xl border border-purple-100 flex justify-between items-center font-bold text-slate-800">
                    <span>Total UEs en todo el padrón nacional evaluado:</span>
                    <span>{fmt(totalUes)} UEs</span>
                  </div>
                </div>
              </div>

              {/* Estudiantes */}
              <div className="rounded-2xl border border-blue-200 p-6 bg-blue-50/40">
                <div className="flex items-center gap-3.5">
                  <div className="w-12 h-12 rounded-2xl bg-blue-100 text-blue-700 flex items-center justify-center shrink-0">
                    <Users className="w-6 h-6" />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-blue-800 uppercase tracking-wide">Población Estudiantil Beneficiada</span>
                    <h4 className="text-3xl font-black text-slate-900 mt-0.5">~3.9 Millones</h4>
                  </div>
                </div>

                <div className="mt-5 space-y-2.5 text-xs">
                  <div className="bg-white p-3 rounded-xl border border-blue-100 flex justify-between items-center">
                    <span className="text-slate-600">Alumnos impactados por docentes Rango N:</span>
                    <strong className="text-amber-700 font-black">~{fmt(data.resumen.N?.estudiantes_atendidos)} alumnos</strong>
                  </div>
                  <div className="bg-white p-3 rounded-xl border border-blue-100 flex justify-between items-center">
                    <span className="text-slate-600">Alumnos impactados por docentes Rango A:</span>
                    <strong className="text-blue-700 font-black">~{fmt(data.resumen.A?.estudiantes_atendidos)} alumnos</strong>
                  </div>
                  <div className="bg-white p-3 rounded-xl border border-blue-100 flex justify-between items-center font-bold text-slate-800">
                    <span>Beneficio sistémico acumulado:</span>
                    <span className="text-emerald-700">Mejora directa de aprendizajes</span>
                  </div>
                </div>
              </div>

            </div>
          </div>

        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════
          PESTAÑA 2: GRÁFICO TERRITORIAL CON BARRAS APILADAS POR DEPARTAMENTO
         ═══════════════════════════════════════════════════════════════════ */}
      {activeTab === 'territorial' && (
        <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-sm space-y-6">
          <div>
            <h3 className="font-black text-lg text-slate-900">
              Gráfico Territorial: Composición de Pertinencia por Departamento
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Barras proporcionales de docentes por rango en los 9 departamentos de Bolivia
            </p>
          </div>

          {/* Gráfico de Barras Apiladas por Departamento */}
          <div className="space-y-4">
            {data.por_departamento.map((d) => {
              const totalDept = (['V', 'A', 'N', 'SIN'] as Rango[]).reduce((s, rk) => s + (d.rangos[rk]?.docentes ?? 0), 0);
              const pV = totalDept > 0 ? ((d.rangos.V?.docentes ?? 0) / totalDept) * 100 : 0;
              const pA = totalDept > 0 ? ((d.rangos.A?.docentes ?? 0) / totalDept) * 100 : 0;
              const pN = totalDept > 0 ? ((d.rangos.N?.docentes ?? 0) / totalDept) * 100 : 0;
              const pSIN = totalDept > 0 ? ((d.rangos.SIN?.docentes ?? 0) / totalDept) * 100 : 0;

              return (
                <div key={d.departamento} className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200/80">
                  <div className="flex items-center justify-between text-xs font-bold text-slate-800 mb-1.5">
                    <span className="text-sm">{d.departamento}</span>
                    <span className="text-slate-500 font-semibold">{fmt(totalDept)} docentes</span>
                  </div>

                  {/* Barra apilada */}
                  <div className="w-full bg-slate-200 rounded-full h-4 overflow-hidden flex">
                    <div style={{ width: `${pV}%` }} className="bg-emerald-600 h-full" title={`Alta (V): ${fmt(d.rangos.V?.docentes)} (${pV.toFixed(1)}%)`} />
                    <div style={{ width: `${pA}%` }} className="bg-blue-600 h-full" title={`Media (A): ${fmt(d.rangos.A?.docentes)} (${pA.toFixed(1)}%)`} />
                    <div style={{ width: `${pN}%` }} className="bg-amber-600 h-full" title={`Baja (N): ${fmt(d.rangos.N?.docentes)} (${pN.toFixed(1)}%)`} />
                    <div style={{ width: `${pSIN}%` }} className="bg-slate-400 h-full" title={`Sin Pert: ${fmt(d.rangos.SIN?.docentes)} (${pSIN.toFixed(1)}%)`} />
                  </div>

                  {/* Cifras rápidas bajo la barra */}
                  <div className="flex items-center justify-between text-[11px] text-slate-500 mt-2 font-medium">
                    <span className="text-emerald-700 font-bold">🟢 Alta: {fmt(d.rangos.V?.docentes)} ({pV.toFixed(0)}%)</span>
                    <span className="text-blue-700 font-bold">🔵 Media: {fmt(d.rangos.A?.docentes)} ({pA.toFixed(0)}%)</span>
                    <span className="text-amber-700 font-bold">🟠 Baja: {fmt(d.rangos.N?.docentes)} ({pN.toFixed(0)}%)</span>
                    <span className="text-slate-600">⚪ Sin Pert: {fmt(d.rangos.SIN?.docentes)}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════
          PESTAÑA 3: DISTRIBUCIÓN POR NIVELES
         ═══════════════════════════════════════════════════════════════════ */}
      {activeTab === 'niveles' && (
        <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-sm space-y-6">
          <div>
            <h3 className="font-black text-lg text-slate-900">
              Pertinencia por Nivel del Subsistema Regular
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Comportamiento comparativo en Educación Inicial, Primaria y Secundaria
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {data.por_nivel.map((n) => {
              const totalNivel = (['V', 'A', 'N', 'SIN'] as Rango[]).reduce((s, rk) => s + (n.rangos[rk]?.docentes ?? 0), 0);
              return (
                <div key={n.nivel} className="bg-slate-50 rounded-2xl p-5 border border-slate-200 flex flex-col justify-between">
                  <div>
                    <span className="text-xs font-bold text-slate-500 uppercase">Nivel Escolar</span>
                    <h4 className="text-xl font-black text-slate-900 mt-0.5">{n.nivel || 'No especificado'}</h4>
                    <span className="text-2xl font-black text-blue-700 block mt-2">{fmt(totalNivel)}</span>
                    <span className="text-xs text-slate-500 font-medium">docentes en este nivel</span>
                  </div>

                  <div className="mt-5 space-y-2 pt-3 border-t border-slate-200 text-xs">
                    <div className="flex justify-between">
                      <span className="text-emerald-700 font-bold">🟢 Alta Pertinencia:</span>
                      <strong>{fmt(n.rangos.V?.docentes)}</strong>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-blue-700 font-bold">🔵 Media Pertinencia:</span>
                      <strong>{fmt(n.rangos.A?.docentes)}</strong>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-amber-700 font-bold">🟠 Baja Pertinencia:</span>
                      <strong>{fmt(n.rangos.N?.docentes)}</strong>
                    </div>
                    <div className="flex justify-between text-slate-500">
                      <span>⚪ Sin Pertinencia:</span>
                      <strong>{fmt(n.rangos.SIN?.docentes)}</strong>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

    </div>
  );
}
