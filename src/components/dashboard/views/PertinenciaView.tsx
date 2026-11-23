'use client';

import React, { useEffect, useState, useMemo } from 'react';
import {
  GraduationCap,
  School,
  Users,
  Clock,
  Sparkles,
  CheckCircle2,
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
  Info,
  Compass,
  Award,
  ArrowUpDown,
  Building2,
  Check,
  X,
  FileSpreadsheet
} from 'lucide-react';
import { getNivelEspecialidad, NivelCodigo, NIVELES_CONFIG } from '@/lib/constants/especialidadNiveles';

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

interface DetalleAreaRangos {
  docentes: number;
  ues: number;
  horas: number;
  pct_del_depto: number;
  pct_alta: number;
  pct_media: number;
  pct_baja: number;
  pct_sin: number;
  desalineados: number;
  pct_desalineados: number;
  prioridad_formacion: number;
  V: { docentes: number; pct: number; ues: number };
  A: { docentes: number; pct: number; ues: number };
  N: { docentes: number; pct: number; ues: number };
  SIN: { docentes: number; pct: number; ues: number };
}

interface DepartamentoAreaStats {
  departamento: string;
  total_docentes: number;
  total_ues: number;
  pct_rural_del_depto: number;
  pct_urbana_del_depto: number;
  brecha_alta_urbano_rural: number;
  brecha_desalineacion: number;
  rural: DetalleAreaRangos;
  urbana: DetalleAreaRangos;
}

interface AreaResumenData {
  area: 'RURAL' | 'URBANA';
  docentes: number;
  pct_del_total: number;
  ues: number;
  horas_total: number;
  estudiantes_atendidos: number;
  pct_alta: number;
  pct_media: number;
  pct_baja: number;
  pct_sin: number;
  desalineados: number;
  pct_desalineados: number;
  prioridad_formacion: number;
  rangos: Record<Rango, { rango: Rango; docentes: number; pct: number; ues: number; horas: number }>;
}

interface DepartamentoRangos {
  departamento: string;
  ues?: number;
  rangos: Record<Rango, { docentes: number; ues: number; horas: number }>;
}

interface NivelRangos {
  nivel: string;
  ues?: number;
  rangos: Record<Rango, { docentes: number; ues: number; horas: number }>;
}

interface EspecialidadItem {
  id?: number;
  especialidad: string;
  hora_item?: number;
  nivel_codigo?: string;
  docentes: number;
  ues: number;
  horas?: number;
  pct_alta?: number;
  meta_bid?: number;
  pct_meta_bid?: number;
  // Estructura nueva: esp.V.docentes
  V?: { docentes: number; pct: number };
  A?: { docentes: number; pct: number };
  N?: { docentes: number; pct: number };
  SIN?: { docentes: number; pct: number };
  // Estructura legacy: esp.rangos.V.docentes
  rangos?: Record<Rango, { docentes: number; ues: number; horas: number }>;
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

interface PrejubilacionPertinenciaDepto {
  departamento: string;
  total: number;
  prejubilados: number;
  no_prejubilados: number;
  prejub_no_pert: number;
  no_prejub_no_pert: number;
  pct_no_prejub_no_pert: number;
  no_prejub_v: number;
  no_prejub_a: number;
  no_prejub_n: number;
  no_prejub_sin: number;
}

interface PrejubilacionPertinenciaData {
  nacional: {
    total_docentes: number;
    prejubilados: {
      total: number;
      pct_del_padron: number;
      V: number;
      A: number;
      N: number;
      SIN: number;
      no_pertinentes: number;
      pct_no_pertinentes: number;
      pct_alta: number;
    };
    no_prejubilados: {
      total: number;
      pct_del_padron: number;
      V: number;
      A: number;
      N: number;
      SIN: number;
      no_pertinentes: number;
      pct_no_pertinentes: number;
      pct_alta: number;
    };
    no_prejubilados_no_pertinentes: number;
    pct_no_prejubilados_no_pertinentes_sobre_total: number;
    pct_no_prejubilados_no_pertinentes_sobre_no_prejub: number;
  };
  por_departamento: PrejubilacionPertinenciaDepto[];
}

interface GeneroDepto {
  departamento: string;
  total_femenino: number;
  pct_femenino_alta: number;
  femenino_no_prejub_no_pert: number;
  total_masculino: number;
  pct_masculino_alta: number;
  masculino_no_prejub_no_pert: number;
}

interface GeneroData {
  nacional: {
    total_docentes: number;
    femenino: {
      total: number;
      pct_del_padron: number;
      V: number;
      A: number;
      N: number;
      SIN: number;
      pct_alta: number;
      no_prejub_no_pert: number;
    };
    masculino: {
      total: number;
      pct_del_padron: number;
      V: number;
      A: number;
      N: number;
      SIN: number;
      pct_alta: number;
      no_prejub_no_pert: number;
    };
  };
  por_departamento: GeneroDepto[];
}

interface PertinenciaData {
  resumen: Record<Rango | 'TOTAL', RangoSummary & { docentes: number; ues: number; estudiantes_atendidos?: number }>;
  desalineacion?: DesalineacionData;
  por_area?: Record<'RURAL' | 'URBANA', AreaResumenData>;
  por_departamento: DepartamentoRangos[];
  por_departamento_area?: DepartamentoAreaStats[];
  por_nivel: NivelRangos[];
  por_especialidad?: EspecialidadItem[];
  prejubilacion_pertinencia?: PrejubilacionPertinenciaData;
  genero?: GeneroData;
}

// ─── Paleta y Metadatos Institucionales (Sin Emoticones) ──────────────────────
// ─── Paleta y Metadatos Institucionales (Cero Emoticones) ──────────────────────

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
    accentBg: 'bg-emerald-50',
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
    accentBg: 'bg-blue-50',
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
    accentBg: 'bg-amber-50',
    accentBorder: 'border-amber-200/80',
    pillBg: 'bg-amber-50 text-amber-800 border-amber-200',
    pillText: 'text-amber-700',
    label: 'Baja Pertinencia',
    subtitle: 'Sin Correspondencia con el Cargo',
    queSignifica: 'Docente normalista asignado a una materia o cargo sin relación con su especialidad de egreso.',
    intensidadFormacion: 'Formación Larga / Reconversión Profunda',
  },
  SIN: {
    code: 'SIN',
    badgeText: 'Rango SIN · Técnico / Univ. / Otros',
    hex: '#64748b', // Slate 500
    accentBg: 'bg-slate-100',
    accentBorder: 'border-slate-200',
    pillBg: 'bg-slate-100 text-slate-700 border-slate-200',
    pillText: 'text-slate-700',
    label: 'Sin Pertinencia Normalista',
    subtitle: 'Técnico Superior · Universitario · Otros',
    queSignifica: 'Docentes en aula con formación de Técnico Superior, Grado Universitario, interinos u otros perfiles no normalistas.',
    intensidadFormacion: 'Profesionalización / Homologación Pedagógica',
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
  const [activeTab, setActiveTab] = useState<'preguntas' | 'rural_urbano' | 'territorial' | 'especialidad' | 'niveles'>('rural_urbano');

  // Estados interactivos para Área Rural vs Urbana
  const [modoGraficoArea, setModoGraficoArea] = useState<'porcentaje' | 'docentes'>('porcentaje');
  const [selectedDeptArea, setSelectedDeptArea] = useState<string | null>('LA PAZ');
  const [hoverDeptArea, setHoverDeptArea] = useState<DepartamentoAreaStats | null>(null);
  const [sortDeptArea, setSortDeptArea] = useState<'total' | 'alta_rural' | 'alta_urbano' | 'brecha' | 'rural_pct' | 'alfa'>('total');

  // Filtros de la Matriz Especialidad x Departamento
  // Filtros de Especialidad
  const [searchEsp, setSearchEsp] = useState<string>('');
  const [filterDepto, setFilterDepto] = useState<string>('TODOS');
  const [expandedEsp, setExpandedEsp] = useState<string | null>(null);
  const [selectedEsp, setSelectedEsp] = useState<string | null>(null);
  const [filterNivel, setFilterNivel] = useState<string>('TODOS');

  // Estados interactivos de Distribución Territorial
  const [selectedDeptDetail, setSelectedDeptDetail] = useState<string | null>('LA PAZ');
  const [sortDeptBy, setSortDeptBy] = useState<'total' | 'alta' | 'prioridad' | 'alfa'>('total');

  // Estado de exportación de reporte Excel con gráficos
  const [exporting, setExporting] = useState<boolean>(false);
  const [exportingUE, setExportingUE] = useState<boolean>(false);

  const handleExportExcel = async () => {
    try {
      setExporting(true);
      const res = await fetch('/api/pertinencia/exportar-excel');
      if (!res.ok) {
        throw new Error('Error al generar el archivo en el servidor');
      }
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'Reporte_Pertinencia_Docente_Graficos.xlsx';
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Error al descargar excel:', err);
      alert('Ocurrió un error al generar el archivo Excel con gráficos.');
    } finally {
      setExporting(false);
    }
  };

  const handleExportUE = async () => {
    try {
      setExportingUE(true);
      const res = await fetch('/api/pertinencia/exportar-ue');
      if (!res.ok) {
        throw new Error('Error al generar el archivo por UE en el servidor');
      }
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'Reporte_Pertinencia_Por_UE.xlsx';
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Error al descargar excel UE:', err);
      alert('Ocurrió un error al generar el archivo Excel por Unidad Educativa.');
    } finally {
      setExportingUE(false);
    }
  };

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

  const totalDoc = data?.resumen?.TOTAL?.docentes ?? 168758;
  const totalUes = data?.resumen?.TOTAL?.ues ?? 16308;

  const donutData = useMemo(() => {
    if (!data) return [];
    return [
      { rango: 'V' as Rango, cantidad: data.resumen.V?.docentes ?? 0, color: '#059669', label: 'Alta Pertinencia' },
      { rango: 'A' as Rango, cantidad: data.resumen.A?.docentes ?? 0, color: '#2563eb', label: 'Media Pertinencia' },
      { rango: 'N' as Rango, cantidad: data.resumen.N?.docentes ?? 0, color: '#ea580c', label: 'Baja Pertinencia' },
      { rango: 'SIN' as Rango, cantidad: data.resumen.SIN?.docentes ?? 0, color: '#64748b', label: 'Técnico / Univ. / Otros' },
    ];
  }, [data]);

  // Lista de departamentos disponibles
  const departamentosList = useMemo(() => {
    if (!data?.por_departamento) return [];
    return data.por_departamento.map(d => d.departamento);
  }, [data]);

  // Departamentos procesados con métricas enriquecidas y ordenamiento
  const processedDepartamentos = useMemo(() => {
    if (!data?.por_departamento) return [];

    const list = data.por_departamento.map((d) => {
      const v = d.rangos.V?.docentes ?? 0;
      const a = d.rangos.A?.docentes ?? 0;
      const n = d.rangos.N?.docentes ?? 0;
      const sin = d.rangos.SIN?.docentes ?? 0;
      const total = v + a + n + sin;
      const ues = d.ues ?? Math.max(...(['V', 'A', 'N', 'SIN'] as Rango[]).map(rk => d.rangos[rk]?.ues ?? 0));
      const prioridadBID = a + n;
      const pctAlta = total > 0 ? (v / total) * 100 : 0;
      const pctPrioridadBID = total > 0 ? (prioridadBID / total) * 100 : 0;
      const estudiantesEst = Math.round(prioridadBID * 48);

      return {
        departamento: d.departamento,
        total,
        v,
        a,
        n,
        sin,
        ues,
        prioridadBID,
        pctAlta,
        pctPrioridadBID,
        estudiantesEst,
        raw: d
      };
    });

    return list.sort((x, y) => {
      if (sortDeptBy === 'total') return y.total - x.total;
      if (sortDeptBy === 'alta') return y.pctAlta - x.pctAlta;
      if (sortDeptBy === 'prioridad') return y.prioridadBID - x.prioridadBID;
      return x.departamento.localeCompare(y.departamento);
    });
  }, [data, sortDeptBy]);

  // Departamento actualmente enfocado en detalle
  const activeDeptInfo = useMemo(() => {
    if (!processedDepartamentos.length) return null;
    return processedDepartamentos.find(d => d.departamento === selectedDeptDetail) || processedDepartamentos[0];
  }, [processedDepartamentos, selectedDeptDetail]);

  // Micro-KPIs territoriales dinámicos
  const deptKPIs = useMemo(() => {
    if (!processedDepartamentos.length) return null;
    const sortedByTotal = [...processedDepartamentos].sort((a, b) => b.total - a.total);
    const sortedByAlta = [...processedDepartamentos].sort((a, b) => b.pctAlta - a.pctAlta);
    const sortedByMeta = [...processedDepartamentos].sort((a, b) => b.prioridadBID - a.prioridadBID);
    return {
      maxPadron: sortedByTotal[0],
      maxAlta: sortedByAlta[0],
      topMeta1: sortedByMeta[0],
      topMeta2: sortedByMeta[1],
      totalPais: sortedByTotal.reduce((acc, d) => acc + d.total, 0),
      totalUes: data?.resumen?.TOTAL?.ues ?? 0,
    };
  }, [processedDepartamentos, data]);

  // Especialidades con mayor número de docentes A + N en el departamento activo
  const topEspecialidadesInDept = useMemo(() => {
    if (!data?.por_especialidad || !activeDeptInfo) return [];
    const deptName = activeDeptInfo.departamento;

    return data.por_especialidad
      .map(esp => {
        const dInfo = esp?.por_departamento?.[deptName] || { V: 0, A: 0, N: 0, SIN: 0, total: 0 };
        const reqFormacion = (dInfo.A || 0) + (dInfo.N || 0);
        return {
          especialidad: esp.especialidad,
          total: dInfo.total || 0,
          v: dInfo.V || 0,
          a: dInfo.A || 0,
          n: dInfo.N || 0,
          sin: dInfo.SIN || 0,
          reqFormacion
        };
      })
      .filter(item => item.total > 0)
      .sort((a, b) => b.reqFormacion - a.reqFormacion)
      .slice(0, 6);
  }, [data, activeDeptInfo]);

  // Filtrado de Especialidades
  const filteredEspecialidades = useMemo(() => {
    if (!data?.por_especialidad) return [];
    return data.por_especialidad.filter((item) => {
      const matchesSearch = item.especialidad?.toLowerCase().includes(searchEsp.toLowerCase());
      if (!matchesSearch) return false;
      const nivelInfo = getNivelEspecialidad(item.id || 0, item.especialidad);
      if (filterNivel !== 'TODOS' && nivelInfo.nivelCodigo !== filterNivel) return false;
      if (filterDepto !== 'TODOS') {
        const deptoStats = item?.por_departamento?.[filterDepto];
        return deptoStats && deptoStats.total > 0;
      }
      return true;
    });
  }, [data, searchEsp, filterDepto, filterNivel]);

  // Estilos temáticos y jerarquía por Nivel Educativo Oficial
  const NIVEL_ESTILOS: Record<string, { franja: string; borderLeft: string; badge: string; textNivel: string }> = {
    INICIAL: {
      franja: 'bg-pink-100/90 dark:bg-pink-950/60 text-pink-950 dark:text-pink-200 border-pink-300 dark:border-pink-900',
      borderLeft: 'border-l-4 border-l-pink-500 bg-pink-50/20 dark:bg-pink-950/20',
      badge: 'bg-pink-100 dark:bg-pink-950/70 text-pink-800 dark:text-pink-300 border-pink-300 dark:border-pink-800',
      textNivel: 'Inicial'
    },
    PRIMARIA: {
      franja: 'bg-blue-100/90 dark:bg-blue-950/60 text-blue-950 dark:text-blue-200 border-blue-300 dark:border-blue-900',
      borderLeft: 'border-l-4 border-l-blue-500 bg-blue-50/20 dark:bg-blue-950/20',
      badge: 'bg-blue-100 dark:bg-blue-950/70 text-blue-800 dark:text-blue-300 border-blue-300 dark:border-blue-800',
      textNivel: 'Primaria'
    },
    SECUNDARIA: {
      franja: 'bg-emerald-100/90 dark:bg-emerald-950/60 text-emerald-950 dark:text-emerald-200 border-emerald-300 dark:border-emerald-900',
      borderLeft: 'border-l-4 border-l-emerald-500 bg-emerald-50/20 dark:bg-emerald-950/20',
      badge: 'bg-emerald-100 dark:bg-emerald-950/70 text-emerald-800 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800',
      textNivel: 'Secundaria'
    },
    TECNICA: {
      franja: 'bg-amber-100/90 dark:bg-amber-950/60 text-amber-950 dark:text-amber-200 border-amber-300 dark:border-amber-900',
      borderLeft: 'border-l-4 border-l-amber-500 bg-amber-50/20 dark:bg-amber-950/20',
      badge: 'bg-amber-100 dark:bg-amber-950/70 text-amber-900 dark:text-amber-300 border-amber-300 dark:border-amber-800',
      textNivel: 'Técnica BTH'
    },
    ESPECIAL: {
      franja: 'bg-purple-100/90 dark:bg-purple-950/60 text-purple-950 dark:text-purple-200 border-purple-300 dark:border-purple-900',
      borderLeft: 'border-l-4 border-l-purple-500 bg-purple-50/20 dark:bg-purple-950/20',
      badge: 'bg-purple-100 dark:bg-purple-950/70 text-purple-800 dark:text-purple-300 border-purple-300 dark:border-purple-800',
      textNivel: 'Especial'
    }
  };

  // Agrupamiento por Nivel Educativo Oficial
  const especialidadesPorNivel = useMemo(() => {
    const grupos: Record<string, { nivelCodigo: NivelCodigo; nivelNombre: string; ordenJerarquia: number; items: EspecialidadItem[] }> = {
      INICIAL: { ...NIVELES_CONFIG.INICIAL, items: [] },
      PRIMARIA: { ...NIVELES_CONFIG.PRIMARIA, items: [] },
      SECUNDARIA: { ...NIVELES_CONFIG.SECUNDARIA, items: [] },
      TECNICA: { ...NIVELES_CONFIG.TECNICA, items: [] },
      ESPECIAL: { ...NIVELES_CONFIG.ESPECIAL, items: [] },
    };

    for (const esp of filteredEspecialidades) {
      const info = getNivelEspecialidad(esp.id || 0, esp.especialidad);
      if (grupos[info.nivelCodigo]) {
        grupos[info.nivelCodigo].items.push(esp);
      }
    }

    return Object.values(grupos)
      .filter((g) => g.items.length > 0)
      .sort((a, b) => a.ordenJerarquia - b.ordenJerarquia);
  }, [filteredEspecialidades]);

  // Departamentos clasificados por Área Rural vs Urbana
  const departamentosAreaOrdenados = useMemo(() => {
    if (!data?.por_departamento_area) return [];
    const list = [...data.por_departamento_area];

    return list.sort((a, b) => {
      if (sortDeptArea === 'total') return b.total_docentes - a.total_docentes;
      if (sortDeptArea === 'alta_rural') return b.rural.pct_alta - a.rural.pct_alta;
      if (sortDeptArea === 'alta_urbano') return b.urbana.pct_alta - a.urbana.pct_alta;
      if (sortDeptArea === 'brecha') return Math.abs(b.brecha_alta_urbano_rural) - Math.abs(a.brecha_alta_urbano_rural);
      if (sortDeptArea === 'rural_pct') return b.pct_rural_del_depto - a.pct_rural_del_depto;
      return a.departamento.localeCompare(b.departamento);
    });
  }, [data, sortDeptArea]);

  const activeDeptArea = useMemo(() => {
    if (!departamentosAreaOrdenados.length) return null;
    return departamentosAreaOrdenados.find(d => d.departamento === selectedDeptArea) || departamentosAreaOrdenados[0];
  }, [departamentosAreaOrdenados, selectedDeptArea]);

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

      {/* ── BARRA DE CONTROL Y PESTAÑAS (FONDO CLARO, COMPACTO) ──────────────── */}
      <div className="bg-white p-3 rounded-2xl border border-slate-200 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-3">
        {/* Pestañas de navegación con botones claros */}
        <div className="flex flex-wrap items-center gap-2 text-xs font-bold">
          <button
            type="button"
            onClick={() => setActiveTab('preguntas')}
            className={`px-3.5 py-2 rounded-xl transition-all flex items-center gap-2 border ${activeTab === 'preguntas'
                ? 'bg-emerald-700 text-white border-emerald-700 shadow-xs'
                : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50 hover:text-slate-900'
              }`}
          >
            <BarChart3 className="w-4 h-4 text-emerald-500" />
            <span>Tablero Ejecutivo BID</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('rural_urbano')}
            className={`px-3.5 py-2 rounded-xl transition-all flex items-center gap-2 border ${activeTab === 'rural_urbano'
                ? 'bg-emerald-700 text-white border-emerald-700 shadow-xs'
                : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50 hover:text-slate-900'
              }`}
          >
            <TrendingUp className="w-4 h-4 text-emerald-500" />
            <span>Rural vs Urbano por Departamento</span>
            <span className={`text-[9px] font-black uppercase px-1.5 py-0.5 rounded border ${activeTab === 'rural_urbano'
                ? 'bg-emerald-800 text-emerald-100 border-emerald-600'
                : 'bg-emerald-50 text-emerald-700 border-emerald-200'
              }`}>
              Gráficos
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('territorial')}
            className={`px-3.5 py-2 rounded-xl transition-all flex items-center gap-2 border ${activeTab === 'territorial'
                ? 'bg-emerald-700 text-white border-emerald-700 shadow-xs'
                : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50 hover:text-slate-900'
              }`}
          >
            <MapPin className="w-4 h-4 text-emerald-500" />
            <span>Distribución por Departamento</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('especialidad')}
            className={`px-3.5 py-2 rounded-xl transition-all flex items-center gap-2 border ${activeTab === 'especialidad'
                ? 'bg-emerald-700 text-white border-emerald-700 shadow-xs'
                : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50 hover:text-slate-900'
              }`}
          >
            <BookOpen className="w-4 h-4 text-emerald-500" />
            <span>Pertinencia por Especialidad</span>
          </button>
        </div>

        {/* Botones de exportación claros */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleExportExcel}
            disabled={exporting}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white hover:bg-slate-50 active:bg-slate-100 text-slate-700 font-bold text-xs shadow-2xs transition-colors disabled:opacity-50 border border-slate-200 cursor-pointer"
            title="Descargar Reporte Ejecutivo con Gráficos (.xlsx)"
          >
            <FileSpreadsheet className={`w-4 h-4 text-emerald-600 ${exporting ? 'animate-pulse' : ''}`} />
            <span>{exporting ? 'Generando...' : 'Reporte General (con Gráficos)'}</span>
          </button>

          <button
            type="button"
            onClick={handleExportUE}
            disabled={exportingUE}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 active:bg-emerald-200 text-emerald-800 font-bold text-xs shadow-2xs transition-colors disabled:opacity-50 border border-emerald-300 cursor-pointer"
            title="Descargar consolidado por Unidad Educativa / UA en Excel (.xlsx) con Nivel Autorizado, Subsistema, Turno, Dirección, Coordenadas y Enlace a Google Maps"
          >
            <FileSpreadsheet className={`w-4 h-4 text-emerald-700 ${exportingUE ? 'animate-pulse' : ''}`} />
            <span>{exportingUE ? 'Generando...' : 'Exportar Pertinencia por UE / UA'}</span>
            <span className="text-[9px] bg-emerald-200/60 text-emerald-900 px-1.5 py-0.5 rounded font-black">
              Geolocalizado
            </span>
          </button>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════
          PESTAÑA 1: TABLERO EJECUTIVO BID (RESUMIDO Y CLARO)
         ═══════════════════════════════════════════════════════════════════ */}
      {
        activeTab === 'preguntas' && (
          <div className="space-y-6">

            {/* 3 Micro-KPIs Nacionales Directos */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center font-black">
                    <School className="w-5 h-5 text-slate-700" />
                  </div>
                  <div>
                    <span className="text-[11px] font-black uppercase tracking-wider text-slate-400 block">
                      Padrón Nacional Docente
                    </span>
                    <span className="text-xl font-black text-slate-900 tracking-tight">
                      {fmt(totalDoc)} <span className="text-xs font-bold text-slate-500">docentes</span>
                    </span>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-sm font-black text-slate-700 block">{fmt(data.resumen.TOTAL?.ues)}</span>
                  <span className="text-[10px] text-slate-400 font-bold block">UEs en 9 Deptos</span>
                </div>
              </div>

              <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center font-black">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                  </div>
                  <div>
                    <span className="text-[11px] font-black uppercase tracking-wider text-slate-400 block">
                      Alta Pertinencia (Idóneos)
                    </span>
                    <span className="text-xl font-black text-emerald-700 tracking-tight">
                      {pct(data.resumen.V?.docentes ?? 0, totalDoc)} <span className="text-xs font-bold text-slate-500">nacional</span>
                    </span>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-sm font-black text-emerald-700 block">{fmt(data.resumen.V?.docentes)}</span>
                  <span className="text-[10px] text-slate-400 font-bold block">Rango V (Idóneos)</span>
                </div>
              </div>

              <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center font-black">
                    <Target className="w-5 h-5 text-amber-600" />
                  </div>
                  <div>
                    <span className="text-[11px] font-black uppercase tracking-wider text-slate-400 block">
                      Meta Formación BID (A + N)
                    </span>
                    <span className="text-xl font-black text-amber-700 tracking-tight">
                      {pct((data.resumen.A?.docentes ?? 0) + (data.resumen.N?.docentes ?? 0), totalDoc)} <span className="text-xs font-bold text-slate-500">a capacitar</span>
                    </span>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-sm font-black text-amber-800 block">
                    {fmt((data.resumen.A?.docentes ?? 0) + (data.resumen.N?.docentes ?? 0))}
                  </span>
                  <span className="text-[10px] text-slate-400 font-bold block">Docentes prioridad</span>
                </div>
              </div>
            </div>

            {/* DISTRIBUCIÓN POR RANGO */}
            <div className="bg-white rounded-3xl border border-slate-200/90 shadow-sm overflow-hidden">
              <div className="p-6 sm:p-7 pb-4 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white">
                <div>
                  <h2 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
                    <PieIcon className="w-5 h-5 text-blue-600" />
                    Distribución por Rango de Pertinencia Curricular
                  </h2>
                  <p className="text-xs text-slate-500 mt-1">
                    Clasificación oficial del universo docente evaluado según pertinencia académica institucional.
                  </p>
                </div>

                <div className="flex items-center gap-2 text-xs text-slate-500 bg-slate-100/80 px-3 py-1.5 rounded-xl shrink-0">
                  <span className="w-2 h-2 rounded-full bg-blue-600 animate-pulse" />
                  <span>Haz clic en un rango para focalizar</span>
                </div>
              </div>

              <div className="p-6 sm:p-7 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">

                {/* Gráfico de Dona */}
                <div className="lg:col-span-5 bg-slate-50 rounded-2xl p-6 border border-slate-200/80 flex flex-col items-center shadow-xs">
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
                          className={`p-2.5 rounded-xl border transition-all duration-200 cursor-pointer ${isSelected || isHovered
                            ? 'bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-700 shadow-xs ring-1 ring-slate-300 dark:ring-slate-700'
                            : 'bg-white/80 dark:bg-slate-900/70 border-slate-200/80 dark:border-slate-800 hover:bg-white dark:hover:bg-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
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

                {/* Tarjetas de los 4 Rangos (Resumidas y Limpias) */}
                <div className="lg:col-span-7 grid grid-cols-1 sm:grid-cols-2 gap-3.5">
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
                        className={`group relative rounded-2xl p-4.5 border transition-all duration-300 cursor-pointer flex flex-col justify-between overflow-hidden ${isSelected || isHovered
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
                            <span className="text-sm font-black text-slate-800">
                              {porcentaje}
                            </span>
                          </div>

                          <div className="mt-2.5">
                            <h4 className="text-sm font-black text-slate-900 tracking-tight">
                              {info.label}
                            </h4>
                            <span className={`text-[11px] font-bold block mt-0.5 ${info.pillText}`}>
                              {info.subtitle}
                            </span>
                          </div>
                        </div>

                        <div className="mt-4 pt-3 border-t border-slate-100">
                          <div className="flex items-baseline justify-between">
                            <div>
                              <span className="text-xl font-black text-slate-900 tracking-tight">
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
            </div>

            {/* ═══════════════════════════════════════════════════════════════════
                SECCIÓN: COMPARACIÓN NO PREJUBILADOS X NO PERTINENTES
               ═══════════════════════════════════════════════════════════════════ */}
            {data?.prejubilacion_pertinencia && (
              <div className="bg-white rounded-3xl border border-slate-200/90 shadow-sm overflow-hidden p-6 sm:p-7 space-y-6">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-rose-50 text-rose-700 border border-rose-200">
                        Población Objetivo Activa
                      </span>
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-slate-100 text-slate-600 border border-slate-200">
                        Corte Oficial
                      </span>
                    </div>
                    <h3 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight flex items-center gap-2 mt-1.5">
                      <Target className="w-5 h-5 text-rose-600" />
                      Docentes No Prejubilados vs No Pertinentes
                    </h3>
                    <p className="text-xs text-slate-500 mt-1 max-w-3xl">
                      Foco crítico de reconversión institucional: Docentes en servicio activo fuera de edad de jubilación que ejercen en cargos o materias desalineadas con su formación de egreso.
                    </p>
                  </div>

                  <div className="text-right bg-rose-50/80 border border-rose-200/80 rounded-2xl p-3 px-4 shrink-0">
                    <span className="text-[10px] font-extrabold text-rose-600 uppercase tracking-wider block">
                      No Prejubilados No Pertinentes
                    </span>
                    <span className="text-2xl font-black text-rose-700 tracking-tight block">
                      {fmt(data.prejubilacion_pertinencia.nacional.no_prejubilados_no_pertinentes)}
                    </span>
                    <span className="text-[11px] font-bold text-rose-600/80 block">
                      {data.prejubilacion_pertinencia.nacional.pct_no_prejubilados_no_pertinentes_sobre_no_prejub}% de los docentes activos
                    </span>
                  </div>
                </div>

                {/* 4 Métricas Comparativas Clave */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="bg-slate-50/80 rounded-2xl p-4 border border-slate-200/70">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">
                      Docentes Activos (No Prejubilados)
                    </span>
                    <span className="text-xl font-black text-slate-900 tracking-tight mt-1 block">
                      {fmt(data.prejubilacion_pertinencia.nacional.no_prejubilados.total)}
                    </span>
                    <span className="text-xs font-semibold text-slate-500 block mt-0.5">
                      {data.prejubilacion_pertinencia.nacional.no_prejubilados.pct_del_padron}% del universo docente
                    </span>
                  </div>

                  <div className="bg-emerald-50/60 rounded-2xl p-4 border border-emerald-200/60">
                    <span className="text-[10px] font-black text-emerald-600 uppercase tracking-wider block">
                      Activos Idóneos (V + A)
                    </span>
                    <span className="text-xl font-black text-emerald-700 tracking-tight mt-1 block">
                      {fmt(data.prejubilacion_pertinencia.nacional.no_prejubilados.V + data.prejubilacion_pertinencia.nacional.no_prejubilados.A)}
                    </span>
                    <span className="text-xs font-semibold text-emerald-600 block mt-0.5">
                      {pct(
                        data.prejubilacion_pertinencia.nacional.no_prejubilados.V + data.prejubilacion_pertinencia.nacional.no_prejubilados.A,
                        data.prejubilacion_pertinencia.nacional.no_prejubilados.total
                      )} idoneidad activa
                    </span>
                  </div>

                  <div className="bg-amber-50/60 rounded-2xl p-4 border border-amber-200/60">
                    <span className="text-[10px] font-black text-amber-700 uppercase tracking-wider block">
                      Prejubilados No Pertinentes
                    </span>
                    <span className="text-xl font-black text-amber-800 tracking-tight mt-1 block">
                      {fmt(data.prejubilacion_pertinencia.nacional.prejubilados.no_pertinentes)}
                    </span>
                    <span className="text-xs font-semibold text-amber-700/80 block mt-0.5">
                      Retiro natural en el corto plazo
                    </span>
                  </div>

                  <div className="bg-rose-50/60 rounded-2xl p-4 border border-rose-200/60">
                    <span className="text-[10px] font-black text-rose-700 uppercase tracking-wider block">
                      Meta de Recambio / Formación
                    </span>
                    <span className="text-xl font-black text-rose-800 tracking-tight mt-1 block">
                      {fmt(data.prejubilacion_pertinencia.nacional.no_prejubilados_no_pertinentes)}
                    </span>
                    <span className="text-xs font-semibold text-rose-700/80 block mt-0.5">
                      Requieren atención formativa activa
                    </span>
                  </div>
                </div>

                {/* Desglose Departamental: No Prejubilados No Pertinentes */}
                <div>
                  <h4 className="text-xs font-black uppercase tracking-wider text-slate-700 mb-3 flex items-center gap-1.5">
                    <MapPin className="w-4 h-4 text-slate-500" />
                    Distribución Departamental de Docentes Activos No Pertinentes
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    {data.prejubilacion_pertinencia.por_departamento.map((dep) => {
                      return (
                        <div key={dep.departamento} className="p-3.5 rounded-2xl bg-slate-50/70 border border-slate-200/80 flex flex-col justify-between">
                          <div className="flex items-center justify-between mb-2">
                            <span className="font-extrabold text-xs text-slate-800">{dep.departamento}</span>
                            <span className="text-[11px] font-black text-rose-700 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded-full">
                              {dep.pct_no_prejub_no_pert}% no pert.
                            </span>
                          </div>
                          <div className="flex items-baseline justify-between text-xs mb-1.5">
                            <span className="text-slate-500 font-semibold">Docentes activos N+SIN:</span>
                            <span className="font-black text-slate-900">{fmt(dep.no_prejub_no_pert)}</span>
                          </div>
                          <div className="w-full bg-slate-200 rounded-full h-1.5 overflow-hidden">
                            <div
                              className="bg-rose-600 h-full rounded-full"
                              style={{ width: `${Math.min(100, dep.pct_no_prejub_no_pert * 3.5)}%` }}
                            />
                          </div>
                          <div className="flex items-center justify-between text-[10px] text-slate-400 mt-2 font-medium">
                            <span>Total activos: {fmt(dep.no_prejubilados)}</span>
                            <span>Prejubilados N+SIN: {fmt(dep.prejub_no_pert)}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* ═══════════════════════════════════════════════════════════════════
                SECCIÓN: DISTRIBUCIÓN Y ENFOQUE DE GÉNERO
               ═══════════════════════════════════════════════════════════════════ */}
            {data?.genero && (
              <div className="bg-white rounded-3xl border border-slate-200/90 shadow-sm overflow-hidden p-6 sm:p-7 space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
                  <div>
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-indigo-50 text-indigo-700 border border-indigo-200">
                      Enfoque Demográfico
                    </span>
                    <h3 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight flex items-center gap-2 mt-1.5">
                      <Users className="w-5 h-5 text-indigo-600" />
                      Estructura Docente por Género y Pertinencia
                    </h3>
                    <p className="text-xs text-slate-500 mt-1">
                      Desglose del magisterio boliviano por género, evaluando tasas de idoneidad y necesidades formativas.
                    </p>
                  </div>
                  <div className="flex items-center gap-4 text-xs font-bold text-slate-600 bg-slate-50 border border-slate-200 p-2.5 px-4 rounded-2xl shrink-0">
                    <div>
                      <span className="text-[10px] text-slate-400 uppercase block font-extrabold">Mujeres</span>
                      <span className="text-indigo-700 font-black">{data.genero.nacional.femenino.pct_del_padron}%</span>
                    </div>
                    <div className="w-px h-6 bg-slate-200" />
                    <div>
                      <span className="text-[10px] text-slate-400 uppercase block font-extrabold">Varones</span>
                      <span className="text-slate-700 font-black">{data.genero.nacional.masculino.pct_del_padron}%</span>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Tarjeta Femenina */}
                  <div className="rounded-2xl p-5 bg-gradient-to-br from-indigo-50/50 via-white to-purple-50/30 border border-indigo-100 space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <div className="w-9 h-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-black text-sm shadow-xs">
                          F
                        </div>
                        <div>
                          <h4 className="font-black text-slate-900 text-sm">Docentes Mujeres</h4>
                          <span className="text-[11px] font-bold text-indigo-600">61.2% del Magisterio Nacional</span>
                        </div>
                      </div>
                      <span className="text-xl font-black text-slate-900">
                        {fmt(data.genero.nacional.femenino.total)}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs pt-1">
                      <div className="p-2.5 rounded-xl bg-white border border-indigo-100/80">
                        <span className="text-[10px] text-slate-400 font-bold block uppercase">Alta Pertinencia</span>
                        <span className="text-base font-black text-emerald-700">{data.genero.nacional.femenino.pct_alta}%</span>
                        <span className="text-[10px] text-slate-500 font-medium block">{fmt(data.genero.nacional.femenino.V)} idóneas</span>
                      </div>
                      <div className="p-2.5 rounded-xl bg-white border border-indigo-100/80">
                        <span className="text-[10px] text-slate-400 font-bold block uppercase">Activas N+SIN</span>
                        <span className="text-base font-black text-rose-700">{fmt(data.genero.nacional.femenino.no_prejub_no_pert)}</span>
                        <span className="text-[10px] text-slate-500 font-medium block">a capacitar/reconversión</span>
                      </div>
                    </div>
                  </div>

                  {/* Tarjeta Masculina */}
                  <div className="rounded-2xl p-5 bg-gradient-to-br from-slate-50 via-white to-blue-50/30 border border-slate-200/80 space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <div className="w-9 h-9 rounded-xl bg-slate-700 text-white flex items-center justify-center font-black text-sm shadow-xs">
                          M
                        </div>
                        <div>
                          <h4 className="font-black text-slate-900 text-sm">Docentes Varones</h4>
                          <span className="text-[11px] font-bold text-slate-600">38.7% del Magisterio Nacional</span>
                        </div>
                      </div>
                      <span className="text-xl font-black text-slate-900">
                        {fmt(data.genero.nacional.masculino.total)}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs pt-1">
                      <div className="p-2.5 rounded-xl bg-white border border-slate-200/80">
                        <span className="text-[10px] text-slate-400 font-bold block uppercase">Alta Pertinencia</span>
                        <span className="text-base font-black text-emerald-700">{data.genero.nacional.masculino.pct_alta}%</span>
                        <span className="text-[10px] text-slate-500 font-medium block">{fmt(data.genero.nacional.masculino.V)} idóneos</span>
                      </div>
                      <div className="p-2.5 rounded-xl bg-white border border-slate-200/80">
                        <span className="text-[10px] text-slate-400 font-bold block uppercase">Activos N+SIN</span>
                        <span className="text-base font-black text-rose-700">{fmt(data.genero.nacional.masculino.no_prejub_no_pert)}</span>
                        <span className="text-[10px] text-slate-500 font-medium block">a capacitar/reconversión</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

          </div>
        )
      }

      {/* ═══════════════════════════════════════════════════════════════════
          PESTAÑA: PERTINENCIA POR ÁREA RURAL VS URBANA (GRÁFICO LINEAL RESUMIDO)
         ═══════════════════════════════════════════════════════════════════ */}
      {
        activeTab === 'rural_urbano' && (
          <div className="space-y-6 animate-in fade-in duration-300">

            {/* ── 3 KPIs Resumidos y Precisos ─────────────────────────────────── */}
            {data?.por_area && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* KPI Rural */}
                <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center font-black">
                      <School className="w-5 h-5 text-emerald-600" />
                    </div>
                    <div>
                      <span className="text-[11px] font-black uppercase tracking-wider text-slate-400 block">
                        Área Rural Nacional
                      </span>
                      <span className="text-xl font-black text-slate-900 tracking-tight">
                        {data.por_area.RURAL.pct_alta}% <span className="text-xs font-bold text-slate-500">Alta Pert.</span>
                      </span>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-sm font-black text-emerald-700 block">{fmt(data.por_area.RURAL.docentes)}</span>
                    <span className="text-[10px] text-slate-400 font-bold block">{data.por_area.RURAL.pct_del_total}% del magisterio</span>
                  </div>
                </div>

                {/* KPI Urbano */}
                <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center font-black">
                      <Building2 className="w-5 h-5 text-blue-600" />
                    </div>
                    <div>
                      <span className="text-[11px] font-black uppercase tracking-wider text-slate-400 block">
                        Área Urbana Nacional
                      </span>
                      <span className="text-xl font-black text-slate-900 tracking-tight">
                        {data.por_area.URBANA.pct_alta}% <span className="text-xs font-bold text-slate-500">Alta Pert.</span>
                      </span>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-sm font-black text-blue-700 block">{fmt(data.por_area.URBANA.docentes)}</span>
                    <span className="text-[10px] text-slate-400 font-bold block">{data.por_area.URBANA.pct_del_total}% del magisterio</span>
                  </div>
                </div>

                {/* KPI Brecha y Meta */}
                <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center font-black">
                      <Target className="w-5 h-5 text-amber-600" />
                    </div>
                    <div>
                      <span className="text-[11px] font-black uppercase tracking-wider text-slate-400 block">
                        Brecha Neta (R vs U)
                      </span>
                      <span className="text-xl font-black text-emerald-700 tracking-tight">
                        +4.15 pp <span className="text-xs font-bold text-slate-500">Rural</span>
                      </span>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-sm font-black text-rose-700 block">
                      {fmt((data.por_area.RURAL.prioridad_formacion || 0) + (data.por_area.URBANA.prioridad_formacion || 0))}
                    </span>
                    <span className="text-[10px] text-slate-400 font-bold block">Meta A+N a capacitar</span>
                  </div>
                </div>
              </div>
            )}

            {/* ── Gráfico Lineal de Tendencia Departamental Rural vs Urbano ──── */}
            <div className="bg-white rounded-3xl border border-slate-200/90 shadow-sm p-6 sm:p-7 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-3">
                <div>
                  <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-emerald-600" />
                    Curva Comparativa de Pertinencia (%) por Departamento: Rural vs Urbana
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Comportamiento continuo de idoneidad curricular docente en los 9 departamentos de Bolivia.
                  </p>
                </div>

                {/* Leyenda concisa */}
                <div className="flex items-center gap-4 text-xs font-bold">
                  <div className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded-full bg-emerald-600" />
                    <span className="text-slate-700">Rural (%)</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded-full bg-blue-600" />
                    <span className="text-slate-700">Urbana (%)</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-4 h-0.5 bg-[#c9a751] border-t border-dashed" />
                    <span className="text-slate-400 text-[11px]">Nacional (75.6%)</span>
                  </div>
                </div>
              </div>

              {/* Trazado SVG del Gráfico Lineal */}
              {departamentosAreaOrdenados.length > 0 && (() => {
                const depts = departamentosAreaOrdenados;
                const W = 900;
                const H = 260;
                const PAD = { top: 30, right: 35, bottom: 45, left: 45 };
                const plotW = W - PAD.left - PAD.right;
                const plotH = H - PAD.top - PAD.bottom;
                const n = depts.length;
                const stepX = plotW / (n - 1);

                // Escala Y acotada de 55% a 95% para máxima legibilidad estética
                const minY = 55;
                const maxY = 95;
                const getY = (val: number) => PAD.top + plotH - ((val - minY) / (maxY - minY)) * plotH;
                const getX = (i: number) => PAD.left + i * stepX;

                // Trazados de líneas continuas
                const pathRural = depts.map((d, i) => `${i === 0 ? 'M' : 'L'} ${getX(i).toFixed(1)} ${getY(d.rural.pct_alta).toFixed(1)}`).join(' ');
                const pathUrbano = depts.map((d, i) => `${i === 0 ? 'M' : 'L'} ${getX(i).toFixed(1)} ${getY(d.urbana.pct_alta).toFixed(1)}`).join(' ');

                // Áreas con degradado sutil
                const areaRural = `${pathRural} L ${getX(n - 1).toFixed(1)} ${PAD.top + plotH} L ${getX(0).toFixed(1)} ${PAD.top + plotH} Z`;
                const areaUrbano = `${pathUrbano} L ${getX(n - 1).toFixed(1)} ${PAD.top + plotH} L ${getX(0).toFixed(1)} ${PAD.top + plotH} Z`;

                const yMeta = getY(75.6);

                return (
                  <div className="relative overflow-x-auto">
                    <svg viewBox={`0 0 ${W} ${H}`} className="w-full min-w-[720px] h-auto select-none">
                      <defs>
                        <linearGradient id="gradRural" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#059669" stopOpacity="0.18" />
                          <stop offset="100%" stopColor="#059669" stopOpacity="0.0" />
                        </linearGradient>
                        <linearGradient id="gradUrbano" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#2563eb" stopOpacity="0.14" />
                          <stop offset="100%" stopColor="#2563eb" stopOpacity="0.0" />
                        </linearGradient>
                      </defs>

                      {/* Ejes y líneas horizontales de referencia */}
                      {[60, 70, 80, 90].map((v) => {
                        const y = getY(v);
                        return (
                          <g key={v}>
                            <line
                              x1={PAD.left}
                              y1={y}
                              x2={PAD.left + plotW}
                              y2={y}
                              stroke="#f1f5f9"
                              strokeWidth={1}
                            />
                            <text
                              x={PAD.left - 8}
                              y={y + 3.5}
                              fill="#94a3b8"
                              fontSize={9}
                              fontWeight="bold"
                              textAnchor="end"
                            >
                              {v}%
                            </text>
                          </g>
                        );
                      })}

                      {/* Línea Promedio Nacional 75.6% */}
                      <line
                        x1={PAD.left}
                        y1={yMeta}
                        x2={PAD.left + plotW}
                        y2={yMeta}
                        stroke="#c9a751"
                        strokeWidth={1.5}
                        strokeDasharray="5 4"
                      />
                      <text
                        x={PAD.left + plotW - 4}
                        y={yMeta - 4}
                        fill="#b45309"
                        fontSize={8.5}
                        fontWeight="900"
                        textAnchor="end"
                      >
                        Nacional 75.6%
                      </text>

                      {/* Áreas sombreadas suaves */}
                      <path d={areaRural} fill="url(#gradRural)" />
                      <path d={areaUrbano} fill="url(#gradUrbano)" />

                      {/* Líneas Principales */}
                      <path
                        d={pathRural}
                        fill="none"
                        stroke="#059669"
                        strokeWidth={2.8}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                      <path
                        d={pathUrbano}
                        fill="none"
                        stroke="#2563eb"
                        strokeWidth={2.8}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />

                      {/* Nodos de Datos y Etiquetas por Departamento */}
                      {depts.map((d, i) => {
                        const cx = getX(i);
                        const cyR = getY(d.rural.pct_alta);
                        const cyU = getY(d.urbana.pct_alta);

                        const isSelected = selectedDeptArea === d.departamento;
                        const isHovered = hoverDeptArea?.departamento === d.departamento;

                        return (
                          <g
                            key={d.departamento}
                            className="cursor-pointer group"
                            onClick={() => setSelectedDeptArea(d.departamento)}
                            onMouseEnter={() => setHoverDeptArea(d)}
                            onMouseLeave={() => setHoverDeptArea(null)}
                          >
                            {/* Línea guía vertical en hover/selección */}
                            {(isSelected || isHovered) && (
                              <line
                                x1={cx}
                                y1={PAD.top}
                                x2={cx}
                                y2={PAD.top + plotH}
                                stroke="#cbd5e1"
                                strokeDasharray="3 3"
                                strokeWidth={1}
                              />
                            )}

                            {/* Nodo Rural */}
                            <circle
                              cx={cx}
                              cy={cyR}
                              r={isSelected || isHovered ? 6 : 4.5}
                              fill="#059669"
                              stroke="#ffffff"
                              strokeWidth={2}
                              className="transition-all duration-200"
                            />
                            <text
                              x={cx}
                              y={cyR - 8}
                              fill="#047857"
                              fontSize={8}
                              fontWeight="900"
                              textAnchor="middle"
                            >
                              {d.rural.pct_alta}%
                            </text>

                            {/* Nodo Urbano */}
                            <circle
                              cx={cx}
                              cy={cyU}
                              r={isSelected || isHovered ? 6 : 4.5}
                              fill="#2563eb"
                              stroke="#ffffff"
                              strokeWidth={2}
                              className="transition-all duration-200"
                            />
                            <text
                              x={cx}
                              y={cyU + 14}
                              fill="#1d4ed8"
                              fontSize={8}
                              fontWeight="900"
                              textAnchor="middle"
                            >
                              {d.urbana.pct_alta}%
                            </text>

                            {/* Nombre del Departamento en Eje X */}
                            <text
                              x={cx}
                              y={PAD.top + plotH + 20}
                              fill={isSelected ? '#0f172a' : '#475569'}
                              fontSize={9.5}
                              fontWeight={isSelected ? '900' : 'bold'}
                              textAnchor="middle"
                            >
                              {d.departamento}
                            </text>
                          </g>
                        );
                      })}
                    </svg>
                  </div>
                );
              })()}
            </div>

            {/* ── Brechas Resumidas y Foco Territorial ────────────────────────── */}
            <div className="bg-white rounded-3xl border border-slate-200/90 shadow-sm p-6 sm:p-7 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div>
                  <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                    <Target className="w-4 h-4 text-emerald-600" />
                    Brecha Territorial Departamental (% Urbano vs % Rural)
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Diferencia neta en puntos porcentuales de idoneidad curricular docente.
                  </p>
                </div>
                <span className="text-[10px] font-black uppercase text-slate-400">
                  9 Departamentos
                </span>
              </div>

              {/* Matriz Compacta de los 9 Departamentos */}
              <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-3 gap-3">
                {departamentosAreaOrdenados.map((d) => {
                  const isSelected = selectedDeptArea === d.departamento;
                  const brecha = d.brecha_alta_urbano_rural;
                  const favorableRural = brecha < 0;

                  return (
                    <div
                      key={d.departamento}
                      onClick={() => setSelectedDeptArea(d.departamento)}
                      className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between ${isSelected
                          ? 'bg-slate-50 border-slate-400 ring-1 ring-slate-300 shadow-xs'
                          : 'bg-white border-slate-200/80 hover:border-slate-300'
                        }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-black text-slate-900">{d.departamento}</span>
                        <span className={`text-[10px] font-black px-2 py-0.5 rounded-md ${favorableRural
                            ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                            : 'bg-blue-50 text-blue-800 border border-blue-200'
                          }`}>
                          {brecha > 0 ? `+${brecha}pp Urbano` : `${brecha}pp Rural`}
                        </span>
                      </div>

                      <div className="mt-3 flex items-center justify-between text-xs">
                        <div className="flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-emerald-600" />
                          <span className="text-slate-600 font-semibold">Rur:</span>
                          <strong className="text-emerald-700">{d.rural.pct_alta}%</strong>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-blue-600" />
                          <span className="text-slate-600 font-semibold">Urb:</span>
                          <strong className="text-blue-700">{d.urbana.pct_alta}%</strong>
                        </div>
                      </div>

                      <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400 font-medium">
                        <span>Padrón: {fmt(d.total_docentes)} doc</span>
                        <span className="text-rose-600 font-bold">{fmt(d.rural.prioridad_formacion)} A+N rural</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

          </div>
        )
      }

      {/* ═══════════════════════════════════════════════════════════════════
          PESTAÑA: DISTRIBUCIÓN POR DEPARTAMENTO (RESUMIDA Y CLARA)
         ═══════════════════════════════════════════════════════════════════ */}
      {
        activeTab === 'territorial' && (
          <div className="space-y-6 animate-in fade-in duration-300">

            {/* 3 Micro-KPIs Territoriales */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center font-black">
                    <MapPin className="w-5 h-5 text-slate-700" />
                  </div>
                  <div>
                    <span className="text-[11px] font-black uppercase tracking-wider text-slate-400 block">
                      Mayor Padrón Departamental
                    </span>
                    <span className="text-xl font-black text-slate-900 tracking-tight">
                      {deptKPIs?.maxPadron?.departamento ?? 'La Paz'} <span className="text-xs font-bold text-slate-500">({fmt(deptKPIs?.maxPadron?.total)} doc)</span>
                    </span>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-sm font-black text-slate-700 block">{pct(deptKPIs?.maxPadron?.total ?? 0, totalDoc)}</span>
                  <span className="text-[10px] text-slate-400 font-bold block">del total país</span>
                </div>
              </div>

              <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center font-black">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                  </div>
                  <div>
                    <span className="text-[11px] font-black uppercase tracking-wider text-slate-400 block">
                      Mayor Idoneidad Curricular (V)
                    </span>
                    <span className="text-xl font-black text-emerald-700 tracking-tight">
                      {deptKPIs?.maxAlta?.departamento ?? 'Pando'} <span className="text-xs font-bold text-slate-500">({deptKPIs?.maxAlta?.pctAlta.toFixed(1)}%)</span>
                    </span>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-sm font-black text-emerald-700 block">{fmt(deptKPIs?.maxAlta?.v)}</span>
                  <span className="text-[10px] text-slate-400 font-bold block">docentes idóneos</span>
                </div>
              </div>

              <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center font-black">
                    <Target className="w-5 h-5 text-amber-600" />
                  </div>
                  <div>
                    <span className="text-[11px] font-black uppercase tracking-wider text-slate-400 block">
                      Foco Meta Formativa BID
                    </span>
                    <span className="text-xl font-black text-amber-700 tracking-tight">
                      La Paz & Santa Cruz
                    </span>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-sm font-black text-amber-800 block">
                    {fmt((deptKPIs?.topMeta1?.prioridadBID ?? 0) + (deptKPIs?.topMeta2?.prioridadBID ?? 0))} doc.
                  </span>
                  <span className="text-[10px] text-slate-400 font-bold block">54.2% meta país</span>
                </div>
              </div>
            </div>

            {/* Matriz Ejecutiva de los 9 Departamentos */}
            <div className="bg-white rounded-3xl border border-slate-200/90 shadow-sm p-6 sm:p-7 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-3">
                <div>
                  <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-blue-600" />
                    Pertinencia en los 9 Departamentos
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Resumen consolidado de idoneidad y demanda formativa por región.
                  </p>
                </div>

                {/* Filtro rápido de ordenamiento */}
                <div className="flex items-center gap-1.5 bg-slate-50 p-1 rounded-xl border border-slate-200 text-xs shrink-0">
                  <span className="text-slate-400 font-bold px-2">Ordenar:</span>
                  <button
                    onClick={() => setSortDeptBy('total')}
                    className={`px-2.5 py-1 rounded-lg font-bold transition-all ${sortDeptBy === 'total' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-800'}`}
                  >
                    Mayor Padrón
                  </button>
                  <button
                    onClick={() => setSortDeptBy('alta')}
                    className={`px-2.5 py-1 rounded-lg font-bold transition-all ${sortDeptBy === 'alta' ? 'bg-white text-emerald-800 shadow-xs' : 'text-slate-500 hover:text-slate-800'}`}
                  >
                    % Idóneo
                  </button>
                  <button
                    onClick={() => setSortDeptBy('prioridad')}
                    className={`px-2.5 py-1 rounded-lg font-bold transition-all ${sortDeptBy === 'prioridad' ? 'bg-white text-amber-800 shadow-xs' : 'text-slate-500 hover:text-slate-800'}`}
                  >
                    Meta BID
                  </button>
                </div>
              </div>

              {/* Grilla 3x3 de los 9 Departamentos */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
                {processedDepartamentos.map((dept) => {
                  const isSelected = selectedDeptDetail === dept.departamento;
                  const pV = dept.total > 0 ? (dept.v / dept.total) * 100 : 0;
                  const pA = dept.total > 0 ? (dept.a / dept.total) * 100 : 0;
                  const pN = dept.total > 0 ? (dept.n / dept.total) * 100 : 0;
                  const pSIN = dept.total > 0 ? (dept.sin / dept.total) * 100 : 0;

                  return (
                    <div
                      key={dept.departamento}
                      onClick={() => setSelectedDeptDetail(isSelected ? null : dept.departamento)}
                      className={`p-4 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between ${isSelected
                          ? 'bg-slate-50 border-blue-500 ring-2 ring-blue-500/20 shadow-sm'
                          : 'bg-white border-slate-200/80 hover:border-slate-300 hover:shadow-xs'
                        }`}
                    >
                      <div>
                        {/* Cabecera */}
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="w-2.5 h-2.5 rounded-full bg-blue-600" />
                            <h4 className="font-black text-slate-900 text-sm tracking-tight">{dept.departamento}</h4>
                          </div>
                          <span className="text-[11px] font-bold text-slate-400">
                            {fmt(dept.ues)} UEs
                          </span>
                        </div>

                        {/* Métricas clave resumidas */}
                        <div className="grid grid-cols-2 gap-2 mt-3 text-xs">
                          <div className="bg-emerald-50/70 p-2 rounded-xl border border-emerald-100">
                            <span className="text-[10px] font-bold text-emerald-800 uppercase block">Idóneo (V)</span>
                            <span className="text-base font-black text-emerald-700 block">{dept.pctAlta.toFixed(1)}%</span>
                            <span className="text-[10px] text-slate-500 font-semibold">{fmt(dept.v)} doc.</span>
                          </div>
                          <div className="bg-amber-50/70 p-2 rounded-xl border border-amber-100">
                            <span className="text-[10px] font-bold text-amber-800 uppercase block">Meta BID (A+N)</span>
                            <span className="text-base font-black text-amber-800 block">{fmt(dept.prioridadBID)}</span>
                            <span className="text-[10px] text-slate-500 font-semibold">{dept.pctPrioridadBID.toFixed(1)}% del depto</span>
                          </div>
                        </div>

                        {/* Barra apilada institucional limpia */}
                        <div className="mt-3">
                          <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden flex">
                            <div style={{ width: `${pV}%` }} className="bg-emerald-600 h-full" title={`Alta: ${pV.toFixed(1)}%`} />
                            <div style={{ width: `${pA}%` }} className="bg-blue-600 h-full" title={`Media: ${pA.toFixed(1)}%`} />
                            <div style={{ width: `${pN}%` }} className="bg-amber-600 h-full" title={`Baja: ${pN.toFixed(1)}%`} />
                            <div style={{ width: `${pSIN}%` }} className="bg-slate-400 h-full" title={`Sin: ${pSIN.toFixed(1)}%`} />
                          </div>
                        </div>
                      </div>

                      {/* Pie de tarjeta */}
                      <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-[11px]">
                        <span className="text-slate-400 font-medium">Padrón: <strong className="text-slate-700">{fmt(dept.total)}</strong></span>
                        <span className="text-blue-600 font-bold hover:underline">
                          {isSelected ? 'Cerrar detalle ▲' : 'Ver detalle ▼'}
                        </span>
                      </div>

                      {/* Desglose desplegable opcional al hacer clic */}
                      {isSelected && (
                        <div className="mt-3 pt-3 border-t border-slate-200/80 space-y-2 text-[11px] animate-in fade-in duration-200">
                          <div className="grid grid-cols-4 gap-1 text-center font-bold">
                            <div className="bg-emerald-50 text-emerald-800 p-1 rounded">
                              <span className="block text-[9px] text-emerald-600 uppercase">V (Alta)</span>
                              {fmt(dept.v)}
                            </div>
                            <div className="bg-blue-50 text-blue-800 p-1 rounded">
                              <span className="block text-[9px] text-blue-600 uppercase">A (Med)</span>
                              {fmt(dept.a)}
                            </div>
                            <div className="bg-amber-50 text-amber-800 p-1 rounded">
                              <span className="block text-[9px] text-amber-600 uppercase">N (Baja)</span>
                              {fmt(dept.n)}
                            </div>
                            <div className="bg-slate-100 text-slate-700 p-1 rounded">
                              <span className="block text-[9px] text-slate-500 uppercase">SIN</span>
                              {fmt(dept.sin)}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

          </div>
        )
      }

      {/* ═══════════════════════════════════════════════════════════════════
          PESTAÑA 3: MATRIZ POR ESPECIALIDAD Y DEPARTAMENTO
         ═══════════════════════════════════════════════════════════════════ */}
      {activeTab === 'especialidad' && (
        <div className="space-y-6 animate-in fade-in duration-300">
          {/* Header y Filtros */}
          <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-sm">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-100">
              <div>
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-[#c9a751]/15 text-[#c9a751] flex items-center justify-center font-black">
                    <BookOpen className="w-5 h-5" />
                  </div>
                  <h3 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                    Matriz de Pertinencia por Especialidad Oficial ESFM
                  </h3>
                </div>
                <p className="text-xs sm:text-sm text-slate-500 mt-1 ml-10">
                  Analiza el estado de pertinencia en cada una de las 22 especialidades oficiales de las ESFM/SEP y cruza los datos por departamento.
                </p>
              </div>

              {/* Controles de filtro */}
              <div className="flex flex-col sm:flex-row items-center gap-3">
                {/* Buscador de Especialidad */}
                <div className="relative w-full sm:w-64">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
                  <input
                    type="text"
                    placeholder="Buscar especialidad..."
                    value={searchEsp}
                    onChange={(e) => setSearchEsp(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 text-xs font-semibold bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white transition-all"
                  />
                </div>

                {/* Filtro por Nivel Educativo */}
                <div className="relative w-full sm:w-52">
                  <select
                    value={filterNivel}
                    onChange={(e) => setFilterNivel(e.target.value)}
                    className="w-full px-3 py-2 text-xs font-bold text-slate-700 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white transition-all cursor-pointer"
                  >
                    <option value="TODOS">Todos los Niveles (22)</option>
                    <option value="INICIAL">Nivel Inicial</option>
                    <option value="PRIMARIA">Nivel Primaria</option>
                    <option value="SECUNDARIA">Nivel Secundaria</option>
                    <option value="TECNICA">Técnica Tecnológica (BTH)</option>
                    <option value="ESPECIAL">Educación Especial</option>
                  </select>
                </div>

                {/* Filtro por Departamento */}
                <div className="relative w-full sm:w-52">
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
            <div className="flex items-center justify-between mt-4 text-xs text-slate-500 font-medium">
              <span>Mostrando <strong>{filteredEspecialidades.length}</strong> de {data?.por_especialidad?.length || 22} especialidades oficiales ESFM agrupadas por nivel</span>
              {filterDepto !== 'TODOS' && (
                <span className="bg-blue-50 text-blue-700 px-2.5 py-1 rounded-lg font-bold">
                  Filtrado por: {filterDepto}
                </span>
              )}
            </div>
          </div>

          {/* Tabla Matriz Institucional de Especialidades */}
          <div className="bg-white rounded-3xl border border-slate-300 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left border-collapse">
                <thead className="bg-slate-800 text-white font-extrabold uppercase text-[10px] tracking-wider">
                  <tr>
                    <th className="py-3 px-4 border-r border-slate-700">Especialidad Oficial ESFM</th>
                    <th className="py-3 px-2 text-center w-16 border-r border-slate-700">Ítem</th>
                    <th className="py-3 px-3 text-right w-24 text-emerald-400 border-r border-slate-700">Alta (V)</th>
                    <th className="py-3 px-3 text-right w-24 text-blue-400 border-r border-slate-700">Media (A)</th>
                    <th className="py-3 px-3 text-right w-24 text-amber-400 border-r border-slate-700">Baja (N)</th>
                    <th className="py-3 px-3 text-right w-20 text-slate-400 border-r border-slate-700">Sin Pert.</th>
                    <th className="py-3 px-3 text-right w-28 bg-slate-900 text-amber-300 font-black border-r border-slate-700">Total Doc.</th>
                    <th className="py-3 px-3 text-right w-20 text-slate-300 border-r border-slate-700">UEs</th>
                    <th className="py-3 px-4 text-center w-32 border-r border-slate-700">Distribución %</th>
                    <th className="py-3 px-3 text-center w-24">Desglose Depto</th>
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
                    const totalGrupoDocentes = grupo.items.reduce((acc, it) => acc + it.docentes, 0);

                    return (
                      <React.Fragment key={grupo.nivelCodigo}>
                        {/* Fila Encabezado de Nivel en Bloque Coloreado */}
                        <tr className={`${estilo.franja} border-t-2 border-b-2 font-black uppercase tracking-wider text-[11px]`}>
                          <td colSpan={10} className="py-2.5 px-4 border-r border-slate-300">
                            <div className="flex items-center justify-between">
                              <span className="flex items-center gap-2">
                                <span className="w-2.5 h-2.5 rounded-full bg-current opacity-80" />
                                <span>{grupo.nivelNombre}</span>
                              </span>
                              <span className="text-[10px] font-bold opacity-80 lowercase tracking-normal">
                                ({grupo.items.length} {grupo.items.length === 1 ? 'especialidad' : 'especialidades'} · {fmt(totalGrupoDocentes)} docentes)
                              </span>
                            </div>
                          </td>
                        </tr>

                        {/* Filas de Especialidades dentro del nivel */}
                        {grupo.items.map((esp) => {
                          let vCount = esp.V?.docentes ?? esp.rangos?.V?.docentes ?? 0;
                          let aCount = esp.A?.docentes ?? esp.rangos?.A?.docentes ?? 0;
                          let nCount = esp.N?.docentes ?? esp.rangos?.N?.docentes ?? 0;
                          let sinCount = esp.SIN?.docentes ?? esp.rangos?.SIN?.docentes ?? 0;
                          let totalCount = esp.docentes;
                          let uesCount = esp.ues;

                          if (filterDepto !== 'TODOS') {
                            const depInfo = esp?.por_departamento?.[filterDepto];
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
                              <tr className={`border-b border-slate-200 transition-colors ${isExpanded ? 'bg-blue-50/50' : 'hover:bg-slate-50/80'}`}>
                                <td className={`py-2.5 px-4 border-r border-slate-200 text-slate-900 ${estilo.borderLeft}`}>
                                  <div className="flex items-center gap-2">
                                    <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider border shrink-0 ${estilo.badge}`}>
                                      {estilo.textNivel}
                                    </span>
                                    {esp.id && (
                                      <span className="text-[10px] font-black px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200 shrink-0 font-mono">
                                        ID {esp.id}
                                      </span>
                                    )}
                                    <span className="font-bold text-slate-900 text-xs truncate max-w-sm" title={esp.especialidad}>
                                      {esp.especialidad}
                                    </span>
                                  </div>
                                </td>
                                <td className="py-2.5 px-1.5 text-center border-r border-slate-200">
                                  <span className="inline-block px-2 py-0.5 rounded bg-slate-100 font-mono text-[11px] font-bold text-slate-700 border border-slate-200">
                                    {esp.hora_item ? `${esp.hora_item}h` : `${esp.horas || 96}h`}
                                  </span>
                                </td>
                                <td className="py-2.5 px-3 text-right font-bold text-emerald-700 border-r border-slate-200 tabular-nums">
                                  <span className="block">{fmt(vCount)}</span>
                                  <span className="text-[9px] font-normal text-emerald-600">{pV.toFixed(1)}%</span>
                                </td>
                                <td className="py-2.5 px-3 text-right font-bold text-blue-700 border-r border-slate-200 tabular-nums">
                                  <span className="block">{fmt(aCount)}</span>
                                  <span className="text-[9px] font-normal text-blue-600">{pA.toFixed(1)}%</span>
                                </td>
                                <td className="py-2.5 px-3 text-right font-bold text-amber-700 border-r border-slate-200 tabular-nums">
                                  <span className="block">{fmt(nCount)}</span>
                                  <span className="text-[9px] font-normal text-amber-600">{pN.toFixed(1)}%</span>
                                </td>
                                <td className="py-2.5 px-3 text-right font-medium text-slate-500 border-r border-slate-200 tabular-nums">
                                  <span className="block">{fmt(sinCount)}</span>
                                  <span className="text-[9px] font-normal text-slate-400">{pSIN.toFixed(1)}%</span>
                                </td>
                                <td className="py-2.5 px-3 text-right font-black text-slate-900 bg-slate-50/70 border-r border-slate-200 text-xs tabular-nums">
                                  {fmt(totalCount)}
                                </td>
                                <td className="py-2.5 px-3 text-right font-semibold text-slate-600 border-r border-slate-200 tabular-nums">
                                  {fmt(uesCount)}
                                </td>

                                {/* Mini barra apilada */}
                                <td className="py-2.5 px-4 border-r border-slate-200">
                                  <div className="w-28 bg-slate-100 rounded-full h-2.5 overflow-hidden flex mx-auto">
                                    <div style={{ width: `${pV}%` }} className="bg-emerald-600 h-full" title={`Alta: ${pV.toFixed(1)}%`} />
                                    <div style={{ width: `${pA}%` }} className="bg-blue-600 h-full" title={`Media: ${pA.toFixed(1)}%`} />
                                    <div style={{ width: `${pN}%` }} className="bg-amber-600 h-full" title={`Baja: ${pN.toFixed(1)}%`} />
                                    <div style={{ width: `${pSIN}%` }} className="bg-slate-400 h-full" title={`Sin Pert: ${pSIN.toFixed(1)}%`} />
                                  </div>
                                </td>

                                {/* Botón para expandir por departamento */}
                                <td className="py-2.5 px-3 text-center">
                                  <button
                                    onClick={() => setExpandedEsp(isExpanded ? null : esp.especialidad)}
                                    className="px-2.5 py-1 text-[11px] font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors inline-flex items-center gap-1 cursor-pointer"
                                  >
                                    <span>9 Deptos</span>
                                    {isExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                                  </button>
                                </td>
                              </tr>

                              {/* Fila expandida con desglose por los 9 departamentos */}
                              {isExpanded && (
                                <tr className="bg-slate-50/90 border-y border-slate-200">
                                  <td colSpan={10} className="p-4 sm:p-6">
                                    <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs">
                                      <div className="flex items-center justify-between mb-3 border-b border-slate-100 pb-2">
                                        <span className="font-black text-xs text-slate-800 uppercase tracking-wide flex items-center gap-2">
                                          <MapPin className="w-3.5 h-3.5 text-blue-600" />
                                          Distribución Departamental: {esp.especialidad} (ID {esp.id})
                                        </span>
                                        <span className="text-[11px] font-bold text-slate-500">
                                          Total: {fmt(esp.docentes)} docentes en {fmt(esp.ues)} UEs
                                        </span>
                                      </div>

                                      <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-9 gap-2 text-xs">
                                        {departamentosList.map((depName) => {
                                          const stats = esp?.por_departamento?.[depName] || { V: 0, A: 0, N: 0, SIN: 0, total: 0 };
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
                      </React.Fragment>
                    );
                  })}
                </tbody>
                <tfoot className="bg-slate-900 text-white font-bold text-xs border-t-2 border-slate-700">
                  <tr>
                    <td className="py-3 px-4 border-r border-slate-800">TOTAL CONSOLIDADO NACIONAL</td>
                    <td className="py-3 px-2 text-center border-r border-slate-800 font-mono text-[11px] text-slate-400">—</td>
                    <td className="py-3 px-3 text-right text-emerald-400 border-r border-slate-800">{fmt(data?.resumen?.V?.docentes || 127560)}</td>
                    <td className="py-3 px-3 text-right text-blue-400 border-r border-slate-800">{fmt(data?.resumen?.A?.docentes || 23585)}</td>
                    <td className="py-3 px-3 text-right text-amber-400 border-r border-slate-800">{fmt(data?.resumen?.N?.docentes || 13931)}</td>
                    <td className="py-3 px-3 text-right text-slate-400 border-r border-slate-800">{fmt(data?.resumen?.SIN?.docentes || 3682)}</td>
                    <td className="py-3 px-3 text-right font-black text-amber-300 bg-slate-950 border-r border-slate-800">{fmt(data?.resumen?.TOTAL?.docentes || 168758)}</td>
                    <td className="py-3 px-3 text-right text-slate-300 border-r border-slate-800">{fmt(data?.resumen?.TOTAL?.ues || 16308)}</td>
                    <td colSpan={2} className="py-3 px-4 text-center text-[10px] text-slate-400 font-normal">22 Especialidades Oficiales ESFM</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════
          PESTAÑA 4: DISTRIBUCIÓN POR NIVELES
         ═══════════════════════════════════════════════════════════════════ */}
      {activeTab === 'niveles' && (
        <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-sm space-y-6 animate-in fade-in duration-300">
          <div>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-[#c9a751]/15 text-[#c9a751] flex items-center justify-center font-black">
                <Layers className="w-5 h-5" />
              </div>
              <h3 className="font-black text-xl sm:text-2xl text-slate-900 tracking-tight">
                Pertinencia por Nivel del Subsistema Regular
              </h3>
            </div>
            <p className="text-xs sm:text-sm text-slate-500 mt-1.5 ml-10">
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
                      <span>Técnico / Univ. / Otros:</span>
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
