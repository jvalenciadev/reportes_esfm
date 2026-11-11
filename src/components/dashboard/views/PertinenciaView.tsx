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
  Target,
  ArrowRight,
  ShieldCheck,
  TrendingUp,
  Search,
  Filter,
  BookOpen,
  ChevronDown,
  ChevronRight,
  SlidersHorizontal,
  Info
} from 'lucide-react';

// ─── Tipos ────────────────────────────────────────────────────────────────────

type Rango = 'V' | 'A' | 'N' | 'SIN';

interface RangoSummary {
  rango: Rango | string;
  docentes: number;
  asignaciones?: number;
  ues: number;
  horas_total?: number;
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

interface EspecialidadItem {
  especialidad: string;
  docentes: number;
  ues: number;
  horas: number;
  rangos: Record<Rango, { docentes: number; ues: number; horas: number }>;
  por_departamento: Record<string, Record<Rango | 'total', number>>;
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
  por_especialidad?: EspecialidadItem[];
}

// ─── Paleta y Metadatos Institucionales (Sin Emoticones) ──────────────────────

const RANGO_INFO: Record<Rango, {
  code: string;
  badgeText: string;
  hex: string;
  accentBg: string;
  accentBorder: string;
  pillBg: string;
  pillText: string;
  label: string;
  subtitle: string;
  queSignifica: string;
  intensidadFormacion: string;
}> = {
  V: {
    code: 'V',
    badgeText: 'Rango V · Alta',
    hex: '#059669', // Emerald 600
    accentBg: 'from-emerald-500/10 via-emerald-500/5 to-transparent',
    accentBorder: 'border-emerald-200/80',
    pillBg: 'bg-emerald-50 text-emerald-800 border-emerald-200',
    pillText: 'text-emerald-700',
    label: 'Alta Pertinencia',
    subtitle: 'Docente Idóneo en Aula',
    queSignifica: 'Especialidad y nivel del título normalista coinciden plenamente con la materia impartida.',
    intensidadFormacion: 'Formación Corta / Actualización Continua',
  },
  A: {
    code: 'A',
    badgeText: 'Rango A · Media',
    hex: '#2563eb', // Blue 600
    accentBg: 'from-blue-500/10 via-blue-500/5 to-transparent',
    accentBorder: 'border-blue-200/80',
    pillBg: 'bg-blue-50 text-blue-800 border-blue-200',
    pillText: 'text-blue-700',
    label: 'Media Pertinencia',
    subtitle: 'Alineación Parcial / Afín',
    queSignifica: 'Formación en área afín o planes anteriores. Requiere nivelación modular y actualización.',
    intensidadFormacion: 'Formación Media / Nivelación Modular',
  },
  N: {
    code: 'N',
    badgeText: 'Rango N · Baja',
    hex: '#ea580c', // Orange 600
    accentBg: 'from-amber-500/10 via-amber-500/5 to-transparent',
    accentBorder: 'border-amber-200/80',
    pillBg: 'bg-amber-50 text-amber-800 border-amber-200',
    pillText: 'text-amber-700',
    label: 'Baja Pertinencia',
    subtitle: 'Desalineación Marcada',
    queSignifica: 'Enseña una materia sustancialmente distante a su formación inicial de egreso.',
    intensidadFormacion: 'Formación Larga / Reconversión Profunda',
  },
  SIN: {
    code: 'SIN',
    badgeText: 'Sin Pertinencia / NO',
    hex: '#64748b', // Slate 500
    accentBg: 'from-slate-500/10 via-slate-500/5 to-transparent',
    accentBorder: 'border-slate-200',
    pillBg: 'bg-slate-100 text-slate-700 border-slate-200',
    pillText: 'text-slate-700',
    label: 'Sin Pertinencia Registrada',
    subtitle: 'Fuera de Perfil Oficial',
    queSignifica: 'Asignaciones sin correspondencia curricular identificada en el padrón.',
    intensidadFormacion: 'Evaluación y Reasignación',
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

// ─── Componente Gráfico Torta / Dona SVG Premium ──────────────────────────────

function DonutChartPremium({ 
  valores, 
  total,
  hoveredRango,
  selectedRango,
  onHoverRango,
  onSelectRango
}: { 
  valores: { rango: Rango; cantidad: number; color: string; label: string }[];
  total: number;
  hoveredRango: Rango | null;
  selectedRango: Rango | null;
  onHoverRango: (r: Rango | null) => void;
  onSelectRango: (r: Rango | null) => void;
}) {
  const size = 260;
  const strokeWidth = 36;
  const radius = (size - strokeWidth) / 2;
  const center = size / 2;
  const circumference = 2 * Math.PI * radius;

  let accumulatedPercent = 0;

  const activeR = hoveredRango || selectedRango;
  const activeItem = activeR ? valores.find(v => v.rango === activeR) : null;

  return (
    <div className="relative flex items-center justify-center select-none py-2">
      <svg width={size} height={size} className="transform -rotate-90">
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="transparent"
          stroke="#f1f5f9"
          strokeWidth={strokeWidth}
        />

        {valores.map((item) => {
          const percent = total > 0 ? item.cantidad / total : 0;
          const strokeDasharray = `${percent * circumference} ${circumference}`;
          const strokeDashoffset = -(accumulatedPercent * circumference);
          accumulatedPercent += percent;

          const isHighlighted = activeR === item.rango;
          const isDimmed = activeR !== null && !isHighlighted;

          return (
            <circle
              key={item.rango}
              cx={center}
              cy={center}
              r={radius}
              fill="transparent"
              stroke={item.color}
              strokeWidth={isHighlighted ? strokeWidth + 6 : strokeWidth}
              strokeDasharray={strokeDasharray}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="butt"
              onMouseEnter={() => onHoverRango(item.rango)}
              onMouseLeave={() => onHoverRango(null)}
              onClick={() => onSelectRango(selectedRango === item.rango ? null : item.rango)}
              style={{
                opacity: isDimmed ? 0.35 : 1,
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                cursor: 'pointer',
              }}
            />
          );
        })}
      </svg>

      <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none px-6">
        {activeItem ? (
          <div className="animate-in fade-in zoom-in-95 duration-200">
            <span 
              className="text-xs font-black uppercase tracking-wider block"
              style={{ color: activeItem.color }}
            >
              {activeItem.label}
            </span>
            <span className="text-3xl font-black text-slate-900 tracking-tight block mt-0.5">
              {pct(activeItem.cantidad, total)}
            </span>
            <span className="text-xs font-bold text-slate-500 block">
              {fmt(activeItem.cantidad)} docentes
            </span>
          </div>
        ) : (
          <div className="animate-in fade-in duration-200">
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 block">
              Padrón Evaluado
            </span>
            <span className="text-3xl font-black text-slate-900 tracking-tight block mt-0.5">
              {fmt(total)}
            </span>
            <span className="text-xs font-bold text-slate-500 block">
              100% Magisterio
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Componente Principal ─────────────────────────────────────────────────────

export default function PertinenciaView() {
  const [data, setData] = useState<PertinenciaData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hoveredRango, setHoveredRango] = useState<Rango | null>(null);
  const [selectedRango, setSelectedRango] = useState<Rango | null>(null);
  
  // Pestaña principal
  const [activeTab, setActiveTab] = useState<'preguntas' | 'especialidad' | 'territorial' | 'niveles'>('preguntas');

  // Filtros de la Matriz Especialidad x Departamento
  const [searchEsp, setSearchEsp] = useState<string>('');
  const [filterDepto, setFilterDepto] = useState<string>('TODOS');
  const [expandedEsp, setExpandedEsp] = useState<string | null>(null);

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

  const metaDocentesPrioritarios = useMemo(() => {
    if (!data) return 81068;
    return (data.resumen.A?.docentes ?? 0) + (data.resumen.N?.docentes ?? 0);
  }, [data]);

  const donutData = useMemo(() => {
    if (!data) return [];
    return [
      { rango: 'V' as Rango, cantidad: data.resumen.V?.docentes ?? 0, color: '#059669', label: 'Alta Pertinencia' },
      { rango: 'A' as Rango, cantidad: data.resumen.A?.docentes ?? 0, color: '#2563eb', label: 'Media Pertinencia' },
      { rango: 'N' as Rango, cantidad: data.resumen.N?.docentes ?? 0, color: '#ea580c', label: 'Baja Pertinencia' },
      { rango: 'SIN' as Rango, cantidad: data.resumen.SIN?.docentes ?? 0, color: '#64748b', label: 'Sin Pertinencia' },
    ];
  }, [data]);

  // Lista de departamentos disponibles
  const departamentosList = useMemo(() => {
    if (!data?.por_departamento) return [];
    return data.por_departamento.map(d => d.departamento);
  }, [data]);

  // Filtrado de Especialidades
  const filteredEspecialidades = useMemo(() => {
    if (!data?.por_especialidad) return [];
    return data.por_especialidad.filter((item) => {
      const matchesSearch = item.especialidad.toLowerCase().includes(searchEsp.toLowerCase());
      if (!matchesSearch) return false;
      if (filterDepto !== 'TODOS') {
        const deptoStats = item.por_departamento[filterDepto];
        return deptoStats && deptoStats.total > 0;
      }
      return true;
    });
  }, [data, searchEsp, filterDepto]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-80 gap-3 text-slate-500">
        <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin" />
        <span className="text-sm font-semibold tracking-wide">Cargando diagnóstico institucional de pertinencia...</span>
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

  return (
    <div className="space-y-8 animate-in fade-in duration-300 pb-16">
      
      {/* ── ENCABEZADO INSTITUCIONAL BID ──────────────────────────────────── */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 text-white rounded-3xl p-6 sm:p-8 shadow-sm border border-slate-700 relative overflow-hidden">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-400/10 border border-amber-400/30 text-amber-300 text-xs font-bold mb-3 tracking-wider uppercase">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              SISTEMA INTEGRAL DE PERTINENCIA CURRICULAR · BID COMPONENTE 2
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
              Metas de Pertinencia & Formación Docente
            </h1>
            <p className="text-slate-300 text-xs sm:text-sm mt-2 max-w-2xl leading-relaxed">
              Información oficial para la definición de metas del <strong>Componente 2 (BID)</strong>: caracterización por rangos, matriz por especialidad y departamento, y alcance en unidades educativas y estudiantes.
            </p>
          </div>

          <div className="bg-white/10 backdrop-blur-md border border-white/15 rounded-2xl p-4 sm:p-5 flex flex-col justify-center min-w-[230px]">
            <span className="text-[11px] font-bold text-slate-300 uppercase tracking-widest">Padrón Docente Evaluado</span>
            <span className="text-3xl font-black text-white mt-1">{fmt(totalDoc)}</span>
            <span className="text-xs text-amber-300 font-semibold mt-1">164,448 asignaciones en {fmt(totalUes)} UEs</span>
          </div>
        </div>

        {/* Pestañas de navegación */}
        <div className="flex flex-wrap gap-2 mt-6 pt-5 border-t border-slate-700/80 text-xs font-bold">
          <button
            onClick={() => setActiveTab('preguntas')}
            className={`px-4 py-2.5 rounded-xl transition-all flex items-center gap-2 ${
              activeTab === 'preguntas' 
                ? 'bg-[#c9a751] text-slate-900 shadow-md font-extrabold' 
                : 'bg-slate-800/80 text-slate-300 hover:bg-slate-800'
            }`}
          >
            <BarChart3 className="w-4 h-4" />
            Tablero Ejecutivo BID
          </button>
          
          <button
            onClick={() => setActiveTab('especialidad')}
            className={`px-4 py-2.5 rounded-xl transition-all flex items-center gap-2 ${
              activeTab === 'especialidad' 
                ? 'bg-[#c9a751] text-slate-900 shadow-md font-extrabold' 
                : 'bg-slate-800/80 text-slate-300 hover:bg-slate-800'
            }`}
          >
            <BookOpen className="w-4 h-4" />
            Matriz por Especialidad y Departamento
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
            Distribución por Departamento
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
            Por Nivel Educativo
          </button>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════
          PESTAÑA 1: TABLERO EJECUTIVO BID
         ═══════════════════════════════════════════════════════════════════ */}
      {activeTab === 'preguntas' && (
        <div className="space-y-8">

          {/* DISTRIBUCIÓN POR RANGO */}
          <div className="bg-white rounded-3xl border border-slate-200/90 shadow-sm overflow-hidden">
            <div className="p-6 sm:p-8 pb-4 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-b from-slate-50/50 to-white">
              <div>
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-blue-600 text-white font-black text-sm flex items-center justify-center shadow-xs">
                    1
                  </div>
                  <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                    Distribución por Rango (Padrón Nacional)
                  </h2>
                </div>
                <p className="text-xs sm:text-sm text-slate-500 mt-1.5 ml-10 max-w-2xl">
                  Caracterización oficial del universo de <strong>147,096 docentes</strong> en los tres rangos normativos de pertinencia académica del SEP.
                </p>
              </div>

              <div className="flex items-center gap-2 text-xs text-slate-500 bg-slate-100/80 px-3 py-1.5 rounded-xl ml-10 md:ml-0 shrink-0">
                <span className="w-2 h-2 rounded-full bg-blue-600 animate-pulse" />
                <span>Haz clic en un rango o segmento para focalizar</span>
              </div>
            </div>

            <div className="p-6 sm:p-8 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
              
              {/* Gráfico de Dona */}
              <div className="lg:col-span-5 bg-gradient-to-b from-slate-50 to-white rounded-2xl p-6 border border-slate-200/80 flex flex-col items-center shadow-xs">
                <span className="text-[11px] font-black text-slate-500 uppercase tracking-widest mb-3 flex items-center gap-1.5">
                  <PieIcon className="w-3.5 h-3.5 text-blue-600" />
                  Estructura Proporcional del Magisterio
                </span>

                <DonutChartPremium
                  valores={donutData}
                  total={totalDoc}
                  hoveredRango={hoveredRango}
                  selectedRango={selectedRango}
                  onHoverRango={setHoveredRango}
                  onSelectRango={setSelectedRango}
                />

                <div className="w-full mt-6 space-y-2">
                  {donutData.map((item) => {
                    const isSelected = selectedRango === item.rango;
                    const isHovered = hoveredRango === item.rango;
                    const percentage = totalDoc > 0 ? (item.cantidad / totalDoc) * 100 : 0;

                    return (
                      <div
                        key={item.rango}
                        onMouseEnter={() => setHoveredRango(item.rango)}
                        onMouseLeave={() => setHoveredRango(null)}
                        onClick={() => setSelectedRango(selectedRango === item.rango ? null : item.rango)}
                        className={`p-2.5 rounded-xl border transition-all duration-200 cursor-pointer ${
                          isSelected || isHovered
                            ? 'bg-white border-slate-300 shadow-xs ring-1 ring-slate-300'
                            : 'bg-white/60 border-slate-200/70 hover:bg-white hover:border-slate-300'
                        }`}
                      >
                        <div className="flex items-center justify-between text-xs mb-1.5">
                          <div className="flex items-center gap-2">
                            <span 
                              className="w-2.5 h-2.5 rounded-full shrink-0 shadow-xs"
                              style={{ backgroundColor: item.color }} 
                            />
                            <span className="font-bold text-slate-800">{item.label}</span>
                            <span className="text-[10px] font-extrabold px-1.5 py-0.5 rounded-md bg-slate-100 text-slate-600">
                              {item.rango}
                            </span>
                          </div>
                          <div className="flex items-baseline gap-2">
                            <span className="font-black text-slate-900">{fmt(item.cantidad)}</span>
                            <span className="font-extrabold text-slate-400 text-[11px]">
                              {percentage.toFixed(1)}%
                            </span>
                          </div>
                        </div>

                        <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                          <div 
                            className="h-full rounded-full transition-all duration-500"
                            style={{ 
                              width: `${percentage}%`,
                              backgroundColor: item.color 
                            }} 
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Tarjetas de los 4 Rangos */}
              <div className="lg:col-span-7 grid grid-cols-1 sm:grid-cols-2 gap-4">
                {(['V', 'A', 'N', 'SIN'] as Rango[]).map((rk) => {
                  const info = RANGO_INFO[rk];
                  const d = data.resumen[rk];
                  const isSelected = selectedRango === rk;
                  const isHovered = hoveredRango === rk;
                  const porcentaje = pct(d?.docentes ?? 0, totalDoc);

                  return (
                    <div
                      key={rk}
                      onMouseEnter={() => setHoveredRango(rk)}
                      onMouseLeave={() => setHoveredRango(null)}
                      onClick={() => setSelectedRango(selectedRango === rk ? null : rk)}
                      className={`group relative rounded-2xl p-5 border transition-all duration-300 cursor-pointer flex flex-col justify-between overflow-hidden ${
                        isSelected || isHovered
                          ? 'bg-white border-slate-400 shadow-md ring-2 ring-slate-400/20 -translate-y-0.5'
                          : 'bg-white border-slate-200 hover:border-slate-300 hover:shadow-xs'
                      }`}
                    >
                      <div 
                        className="absolute top-0 left-0 right-0 h-1.5 transition-all"
                        style={{ backgroundColor: info.hex }} 
                      />

                      <div>
                        <div className="flex items-center justify-between pt-1">
                          <span className={`text-[11px] font-black px-2.5 py-0.5 rounded-full border ${info.pillBg}`}>
                            {info.badgeText}
                          </span>
                          <span className="text-xs font-black text-slate-400 group-hover:text-slate-700 transition-colors">
                            {porcentaje}
                          </span>
                        </div>

                        <div className="mt-3">
                          <h4 className="text-base font-black text-slate-900 tracking-tight">
                            {info.label}
                          </h4>
                          <span className={`text-xs font-bold block mt-0.5 ${info.pillText}`}>
                            {info.subtitle}
                          </span>
                        </div>

                        <p className="text-xs text-slate-500 mt-2 leading-relaxed">
                          {info.queSignifica}
                        </p>
                      </div>

                      <div className="mt-5 pt-3.5 border-t border-slate-100">
                        <div className="flex items-baseline justify-between">
                          <div>
                            <span className="text-2xl font-black text-slate-900 tracking-tight">
                              {fmt(d?.docentes)}
                            </span>
                            <span className="text-xs text-slate-400 font-semibold ml-1.5">docentes</span>
                          </div>
                          <span className="text-xs font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md">
                            {fmt(d?.ues)} UEs
                          </span>
                        </div>

                        <div className="mt-2 text-[11px] font-semibold text-slate-500 flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: info.hex }} />
                          <span>{info.intensidadFormacion}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

            </div>

            {/* Causas de Desalineación */}
            <div className="p-6 sm:p-8 pt-6 border-t border-slate-100 bg-slate-50/50">
              <div className="flex items-center gap-2 mb-3">
                <AlertCircle className="w-4 h-4 text-amber-600" />
                <h3 className="text-xs sm:text-sm font-black text-slate-800 uppercase tracking-wider">
                  ¿En qué dimensión están desalineados los docentes? (28,329 casos analizados en aula)
                </h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                <div className="bg-white p-4.5 rounded-2xl border border-slate-200/90 shadow-xs flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Causa Principal</span>
                      <span className="text-xs font-black text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-200">
                        92.4%
                      </span>
                    </div>
                    <h4 className="font-black text-slate-900 text-sm mt-2">Fuera solo de Especialidad</h4>
                    <span className="text-2xl font-black text-slate-900 block mt-1">26,170 casos</span>
                    <p className="text-xs text-slate-500 mt-2 leading-relaxed">
                      Docente formado en una disciplina asignado a materias distintas (ej: Matemática, Física, Técnica Tecnológica).
                    </p>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-2 mt-4 overflow-hidden">
                    <div className="bg-blue-600 h-full rounded-full" style={{ width: '92.4%' }} />
                  </div>
                </div>

                <div className="bg-white p-4.5 rounded-2xl border border-amber-200 shadow-xs flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-amber-800 uppercase tracking-wider">Brecha Doble</span>
                      <span className="text-xs font-black text-amber-800 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
                        7.3%
                      </span>
                    </div>
                    <h4 className="font-black text-slate-900 text-sm mt-2">Fuera de Nivel y Especialidad</h4>
                    <span className="text-2xl font-black text-amber-800 block mt-1">2,079 casos</span>
                    <p className="text-xs text-slate-500 mt-2 leading-relaxed">
                      Desalineación máxima: titulado para un ciclo y área técnica ajena al grado y materia donde ejerce docencia.
                    </p>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-2 mt-4 overflow-hidden">
                    <div className="bg-amber-600 h-full rounded-full" style={{ width: '7.3%' }} />
                  </div>
                </div>

                <div className="bg-white p-4.5 rounded-2xl border border-slate-200/90 shadow-xs flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Brecha Leve</span>
                      <span className="text-xs font-black text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200">
                        0.3%
                      </span>
                    </div>
                    <h4 className="font-black text-slate-900 text-sm mt-2">Fuera solo de Nivel</h4>
                    <span className="text-2xl font-black text-slate-900 block mt-1">80 casos</span>
                    <p className="text-xs text-slate-500 mt-2 leading-relaxed">
                      Enseña la materia exacta de su formación profesional pero en un subsistema o nivel escolar diferente.
                    </p>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-2 mt-4 overflow-hidden">
                    <div className="bg-slate-500 h-full rounded-full" style={{ width: '0.3%' }} />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* NECESIDADES DE FORMACIÓN & INTENSIDAD POR RANGO */}
          <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-xs">
            <div className="flex items-center gap-2 mb-2">
              <span className="w-8 h-8 rounded-xl bg-amber-600 text-white font-black text-sm flex items-center justify-center shadow-xs">
                2
              </span>
              <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                Necesidades de Formación: Metas Cuantitativas y Nivel de Intensidad
              </h2>
            </div>
            <p className="text-xs sm:text-sm text-slate-500 mb-6 ml-10">
              ¿Cuántos docentes requerirían formación y cuánto duraría según el rango de pertinencia?
            </p>

            <div className="bg-gradient-to-r from-blue-900 to-indigo-900 text-white rounded-2xl p-5 mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3.5">
                <div className="w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center text-amber-400 shrink-0">
                  <GraduationCap className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-extrabold text-base text-white">
                    Meta de Formación Prioritaria Componente 2: Rangos A + N
                  </h3>
                  <p className="text-xs text-blue-200 mt-0.5">
                    Docentes en ejercicio que requieren capacitación correctiva y nivelación curricular.
                  </p>
                </div>
              </div>
              <div className="text-left sm:text-right shrink-0">
                <span className="text-3xl font-black text-amber-300">{fmt(metaDocentesPrioritarios)}</span>
                <span className="text-xs text-blue-200 block font-semibold">55.1% del magisterio</span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="rounded-2xl border-2 border-amber-300 bg-amber-50/50 p-5 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black uppercase text-amber-800 bg-amber-200/70 px-2.5 py-0.5 rounded-full">
                      Rango N (Naranja)
                    </span>
                    <span className="text-xs font-extrabold text-amber-800">Baja Pertinencia</span>
                  </div>
                  <h4 className="font-black text-slate-900 text-base mt-2">Formación Larga / Mayor Carga</h4>
                  <p className="text-xs text-slate-600 mt-1">
                    Requieren un programa de <strong>mayor carga y duración extendida (reconversión profunda)</strong> debido a la brecha sustancial entre su título y la materia que enseñan.
                  </p>
                </div>

                <div className="mt-5 pt-4 border-t border-amber-200">
                  <div className="flex items-baseline justify-between">
                    <span className="text-2xl font-black text-amber-800">{fmt(data.resumen.N?.docentes)}</span>
                    <span className="text-xs font-semibold text-slate-500">docentes meta</span>
                  </div>
                  <div className="mt-3 bg-white rounded-xl p-2.5 border border-amber-200 text-xs font-bold text-amber-900 flex items-center gap-2">
                    <Clock className="w-4 h-4 text-amber-600 shrink-0" />
                    <span>Intensidad: Alta (Reconversión Disciplinar)</span>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border-2 border-blue-300 bg-blue-50/50 p-5 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black uppercase text-blue-800 bg-blue-200/70 px-2.5 py-0.5 rounded-full">
                      Rango A (Azul)
                    </span>
                    <span className="text-xs font-extrabold text-blue-800">Media Pertinencia</span>
                  </div>
                  <h4 className="font-black text-slate-900 text-base mt-2">Formación Media / Duración Intermedia</h4>
                  <p className="text-xs text-slate-600 mt-1">
                    Requieren un programa de <strong>duración intermedia (nivelación modular)</strong> para actualizarse en contenidos y enfoque pedagógico del currículo oficial.
                  </p>
                </div>

                <div className="mt-5 pt-4 border-t border-blue-200">
                  <div className="flex items-baseline justify-between">
                    <span className="text-2xl font-black text-blue-800">{fmt(data.resumen.A?.docentes)}</span>
                    <span className="text-xs font-semibold text-slate-500">docentes meta</span>
                  </div>
                  <div className="mt-3 bg-white rounded-xl p-2.5 border border-blue-200 text-xs font-bold text-blue-900 flex items-center gap-2">
                    <Clock className="w-4 h-4 text-blue-600 shrink-0" />
                    <span>Intensidad: Media (Nivelación Curricular)</span>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border-2 border-emerald-300 bg-emerald-50/50 p-5 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black uppercase text-emerald-800 bg-emerald-200/70 px-2.5 py-0.5 rounded-full">
                      Rango V (Verde)
                    </span>
                    <span className="text-xs font-extrabold text-emerald-800">Alta Pertinencia</span>
                  </div>
                  <h4 className="font-black text-slate-900 text-base mt-2">Formación Corta / Talleres Breves</h4>
                  <p className="text-xs text-slate-600 mt-1">
                    Docentes ya alineados con su título; requieren únicamente <strong>capacitación breve de actualización continua</strong> en didáctica activa y tecnologías de aula.
                  </p>
                </div>

                <div className="mt-5 pt-4 border-t border-emerald-200">
                  <div className="flex items-baseline justify-between">
                    <span className="text-2xl font-black text-emerald-800">{fmt(data.resumen.V?.docentes)}</span>
                    <span className="text-xs font-semibold text-slate-500">docentes idóneos</span>
                  </div>
                  <div className="mt-3 bg-white rounded-xl p-2.5 border border-emerald-200 text-xs font-bold text-emerald-900 flex items-center gap-2">
                    <Clock className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>Intensidad: Breve (Actualización en Aula)</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* BENEFICIARIOS (UES Y ESTUDIANTES) */}
          <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-xs">
            <div className="flex items-center gap-2 mb-2">
              <span className="w-8 h-8 rounded-xl bg-purple-600 text-white font-black text-sm flex items-center justify-center shadow-xs">
                3
              </span>
              <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                Beneficiarios y Alcance de la Intervención
              </h2>
            </div>
            <p className="text-xs sm:text-sm text-slate-500 mb-6 ml-10">
              ¿En cuántas unidades educativas enseñan los docentes que requerirían formación y a cuántos estudiantes atienden?
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
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

              <div className="rounded-2xl border border-blue-200 p-6 bg-blue-50/40">
                <div className="flex items-center gap-3.5">
                  <div className="w-12 h-12 rounded-2xl bg-blue-100 text-blue-700 flex items-center justify-center shrink-0">
                    <Users className="w-6 h-6" />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-blue-800 uppercase tracking-wide">Población Escolar Alcanzada</span>
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
                    <span className="text-emerald-700">Mejora directa de calidad educativa</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════
          PESTAÑA 2: MATRIZ CREATIVA POR ESPECIALIDAD Y DEPARTAMENTO
         ═══════════════════════════════════════════════════════════════════ */}
      {activeTab === 'especialidad' && (
        <div className="space-y-6">
          
          {/* Barra de Filtros y Búsqueda */}
          <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <BookOpen className="w-5 h-5 text-blue-600" />
                  <h3 className="text-lg font-black text-slate-900">
                    Matriz de Pertinencia por Especialidad Curricular
                  </h3>
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  Analiza el estado de pertinencia en cada una de las 20 especialidades oficiales del SEP y cruza los datos por departamento.
                </p>
              </div>

              {/* Controles de filtro */}
              <div className="flex flex-col sm:flex-row items-center gap-3">
                
                {/* Buscador de Especialidad */}
                <div className="relative w-full sm:w-72">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
                  <input
                    type="text"
                    placeholder="Buscar especialidad..."
                    value={searchEsp}
                    onChange={(e) => setSearchEsp(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 text-xs font-semibold bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white transition-all"
                  />
                </div>

                {/* Filtro por Departamento */}
                <div className="relative w-full sm:w-56">
                  <Filter className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
                  <select
                    value={filterDepto}
                    onChange={(e) => setFilterDepto(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 text-xs font-semibold bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white transition-all cursor-pointer"
                  >
                    <option value="TODOS">Todos los Departamentos</option>
                    {departamentosList.map((dep) => (
                      <option key={dep} value={dep}>{dep}</option>
                    ))}
                  </select>
                </div>

              </div>
            </div>

            {/* Contador de resultados */}
            <div className="flex items-center justify-between mt-4 pt-3 border-t border-slate-100 text-xs text-slate-500 font-medium">
              <span>Mostrando <strong>{filteredEspecialidades.length}</strong> de 20 especialidades curriculares</span>
              {filterDepto !== 'TODOS' && (
                <span className="bg-blue-50 text-blue-700 px-2 py-0.5 rounded-md font-bold">
                  Filtrado en: {filterDepto}
                </span>
              )}
            </div>
          </div>

          {/* Tabla Matriz de Especialidades */}
          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50/80 text-slate-600 font-bold uppercase text-[11px] border-b border-slate-200">
                  <tr>
                    <th className="py-3.5 px-4">Especialidad Curricular</th>
                    <th className="py-3.5 px-3 text-right text-emerald-700">Alta (V)</th>
                    <th className="py-3.5 px-3 text-right text-blue-700">Media (A)</th>
                    <th className="py-3.5 px-3 text-right text-amber-700">Baja (N)</th>
                    <th className="py-3.5 px-3 text-right text-slate-500">Sin Pert.</th>
                    <th className="py-3.5 px-3 text-right font-black text-slate-900">Total Docentes</th>
                    <th className="py-3.5 px-3 text-right text-slate-600">UEs</th>
                    <th className="py-3.5 px-4 text-center">Distribución</th>
                    <th className="py-3.5 px-3 text-center">Desglose Depto</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredEspecialidades.map((esp) => {
                    // Datos ajustados si hay filtro por departamento
                    let vCount = esp.rangos.V.docentes;
                    let aCount = esp.rangos.A.docentes;
                    let nCount = esp.rangos.N.docentes;
                    let sinCount = esp.rangos.SIN.docentes;
                    let totalCount = esp.docentes;
                    let uesCount = esp.ues;

                    if (filterDepto !== 'TODOS') {
                      const depInfo = esp.por_departamento[filterDepto];
                      if (depInfo) {
                        vCount = depInfo.V;
                        aCount = depInfo.A;
                        nCount = depInfo.N;
                        sinCount = depInfo.SIN;
                        totalCount = depInfo.total;
                      } else {
                        vCount = aCount = nCount = sinCount = totalCount = 0;
                      }
                    }

                    const isExpanded = expandedEsp === esp.especialidad;
                    const pV = totalCount > 0 ? (vCount / totalCount) * 100 : 0;
                    const pA = totalCount > 0 ? (aCount / totalCount) * 100 : 0;
                    const pN = totalCount > 0 ? (nCount / totalCount) * 100 : 0;
                    const pSIN = totalCount > 0 ? (sinCount / totalCount) * 100 : 0;

                    return (
                      <React.Fragment key={esp.especialidad}>
                        <tr className={`transition-colors ${isExpanded ? 'bg-blue-50/40' : 'hover:bg-slate-50/80'}`}>
                          <td className="py-3.5 px-4 font-bold text-slate-900 max-w-xs">
                            <span className="block truncate">{esp.especialidad}</span>
                            <span className="text-[10px] font-semibold text-slate-400 block mt-0.5">
                              {fmt(esp.horas)} horas curriculares
                            </span>
                          </td>
                          <td className="py-3.5 px-3 text-right font-bold text-emerald-700">{fmt(vCount)}</td>
                          <td className="py-3.5 px-3 text-right font-bold text-blue-700">{fmt(aCount)}</td>
                          <td className="py-3.5 px-3 text-right font-bold text-amber-700">{fmt(nCount)}</td>
                          <td className="py-3.5 px-3 text-right font-medium text-slate-500">{fmt(sinCount)}</td>
                          <td className="py-3.5 px-3 text-right font-black text-slate-900 text-sm">{fmt(totalCount)}</td>
                          <td className="py-3.5 px-3 text-right font-semibold text-slate-600">{fmt(uesCount)}</td>
                          
                          {/* Mini barra apilada */}
                          <td className="py-3.5 px-4">
                            <div className="w-28 bg-slate-100 rounded-full h-2.5 overflow-hidden flex mx-auto">
                              <div style={{ width: `${pV}%` }} className="bg-emerald-600 h-full" title={`Alta: ${pV.toFixed(0)}%`} />
                              <div style={{ width: `${pA}%` }} className="bg-blue-600 h-full" title={`Media: ${pA.toFixed(0)}%`} />
                              <div style={{ width: `${pN}%` }} className="bg-amber-600 h-full" title={`Baja: ${pN.toFixed(0)}%`} />
                              <div style={{ width: `${pSIN}%` }} className="bg-slate-400 h-full" title={`Sin Pert: ${pSIN.toFixed(0)}%`} />
                            </div>
                          </td>

                          {/* Botón para expandir por departamento */}
                          <td className="py-3.5 px-3 text-center">
                            <button
                              onClick={() => setExpandedEsp(isExpanded ? null : esp.especialidad)}
                              className="px-2.5 py-1 text-[11px] font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors inline-flex items-center gap-1"
                            >
                              <span>9 Deptos</span>
                              {isExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                            </button>
                          </td>
                        </tr>

                        {/* Fila expandida con desglose por los 9 departamentos */}
                        {isExpanded && (
                          <tr className="bg-slate-50/90 border-y border-slate-200">
                            <td colSpan={9} className="p-4 sm:p-6">
                              <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs">
                                <div className="flex items-center justify-between mb-3 border-b border-slate-100 pb-2">
                                  <span className="font-black text-xs text-slate-800 uppercase tracking-wide flex items-center gap-2">
                                    <MapPin className="w-3.5 h-3.5 text-blue-600" />
                                    Distribución Departamental de: {esp.especialidad}
                                  </span>
                                  <span className="text-[11px] font-bold text-slate-500">
                                    Total: {fmt(esp.docentes)} docentes en {fmt(esp.ues)} UEs
                                  </span>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-9 gap-2 text-xs">
                                  {departamentosList.map((depName) => {
                                    const stats = esp.por_departamento[depName] || { V: 0, A: 0, N: 0, SIN: 0, total: 0 };
                                    return (
                                      <div key={depName} className="bg-slate-50 p-2.5 rounded-xl border border-slate-200/80 flex flex-col justify-between">
                                        <span className="font-bold text-slate-800 text-[11px] truncate block">{depName}</span>
                                        <span className="text-base font-black text-slate-900 block mt-1">{fmt(stats.total)}</span>
                                        
                                        <div className="space-y-0.5 mt-2 pt-2 border-t border-slate-200 text-[10px]">
                                          <div className="flex justify-between text-emerald-700 font-bold">
                                            <span>Alta:</span>
                                            <span>{fmt(stats.V)}</span>
                                          </div>
                                          <div className="flex justify-between text-blue-700 font-bold">
                                            <span>Media:</span>
                                            <span>{fmt(stats.A)}</span>
                                          </div>
                                          <div className="flex justify-between text-amber-700 font-bold">
                                            <span>Baja:</span>
                                            <span>{fmt(stats.N)}</span>
                                          </div>
                                          <div className="flex justify-between text-slate-500">
                                            <span>Sin:</span>
                                            <span>{fmt(stats.SIN)}</span>
                                          </div>
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════
          PESTAÑA 3: DISTRIBUCIÓN POR DEPARTAMENTO (GRÁFICO APILADO)
         ═══════════════════════════════════════════════════════════════════ */}
      {activeTab === 'territorial' && (
        <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-sm space-y-6">
          <div>
            <div className="flex items-center gap-2">
              <MapPin className="w-5 h-5 text-blue-600" />
              <h3 className="font-black text-lg text-slate-900">
                Gráfico Territorial: Composición de Pertinencia por Departamento
              </h3>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Barras proporcionales de docentes por rango en los 9 departamentos de Bolivia
            </p>
          </div>

          <div className="space-y-4">
            {data.por_departamento.map((d) => {
              const totalDept = (['V', 'A', 'N', 'SIN'] as Rango[]).reduce((s, rk) => s + (d.rangos[rk]?.docentes ?? 0), 0);
              const pV = totalDept > 0 ? ((d.rangos.V?.docentes ?? 0) / totalDept) * 100 : 0;
              const pA = totalDept > 0 ? ((d.rangos.A?.docentes ?? 0) / totalDept) * 100 : 0;
              const pN = totalDept > 0 ? ((d.rangos.N?.docentes ?? 0) / totalDept) * 100 : 0;
              const pSIN = totalDept > 0 ? ((d.rangos.SIN?.docentes ?? 0) / totalDept) * 100 : 0;

              return (
                <div key={d.departamento} className="bg-slate-50 p-4 rounded-2xl border border-slate-200/80">
                  <div className="flex items-center justify-between text-xs font-bold text-slate-800 mb-2">
                    <span className="text-sm font-black">{d.departamento}</span>
                    <span className="text-slate-500 font-semibold">{fmt(totalDept)} docentes</span>
                  </div>

                  <div className="w-full bg-slate-200 rounded-full h-4 overflow-hidden flex">
                    <div style={{ width: `${pV}%` }} className="bg-emerald-600 h-full" title={`Alta (V): ${fmt(d.rangos.V?.docentes)} (${pV.toFixed(1)}%)`} />
                    <div style={{ width: `${pA}%` }} className="bg-blue-600 h-full" title={`Media (A): ${fmt(d.rangos.A?.docentes)} (${pA.toFixed(1)}%)`} />
                    <div style={{ width: `${pN}%` }} className="bg-amber-600 h-full" title={`Baja (N): ${fmt(d.rangos.N?.docentes)} (${pN.toFixed(1)}%)`} />
                    <div style={{ width: `${pSIN}%` }} className="bg-slate-400 h-full" title={`Sin Pert: ${fmt(d.rangos.SIN?.docentes)} (${pSIN.toFixed(1)}%)`} />
                  </div>

                  <div className="flex flex-wrap items-center justify-between text-[11px] text-slate-500 mt-2.5 font-medium">
                    <span className="text-emerald-700 font-bold">Alta: {fmt(d.rangos.V?.docentes)} ({pV.toFixed(0)}%)</span>
                    <span className="text-blue-700 font-bold">Media: {fmt(d.rangos.A?.docentes)} ({pA.toFixed(0)}%)</span>
                    <span className="text-amber-700 font-bold">Baja: {fmt(d.rangos.N?.docentes)} ({pN.toFixed(0)}%)</span>
                    <span className="text-slate-600">Sin Pert: {fmt(d.rangos.SIN?.docentes)}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════
          PESTAÑA 4: DISTRIBUCIÓN POR NIVELES
         ═══════════════════════════════════════════════════════════════════ */}
      {activeTab === 'niveles' && (
        <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-sm space-y-6">
          <div>
            <div className="flex items-center gap-2">
              <Layers className="w-5 h-5 text-blue-600" />
              <h3 className="font-black text-lg text-slate-900">
                Pertinencia por Nivel del Subsistema Regular
              </h3>
            </div>
            <p className="text-xs text-slate-500 mt-1">
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
                      <span className="text-emerald-700 font-bold">Alta Pertinencia:</span>
                      <strong>{fmt(n.rangos.V?.docentes)}</strong>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-blue-700 font-bold">Media Pertinencia:</span>
                      <strong>{fmt(n.rangos.A?.docentes)}</strong>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-amber-700 font-bold">Baja Pertinencia:</span>
                      <strong>{fmt(n.rangos.N?.docentes)}</strong>
                    </div>
                    <div className="flex justify-between text-slate-500">
                      <span>Sin Pertinencia:</span>
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
