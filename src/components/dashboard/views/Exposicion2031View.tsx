"use client";

import React, { useState, useEffect, useRef, useMemo } from "react";
import {
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Building2,
  Users,
  GraduationCap,
  Download,
  Maximize2,
  Minimize2,
  ChevronLeft,
  ChevronRight,
  BarChart3,
  MapPin,
  Activity,
  School,
  Clock,
  Compass,
  Award,
  Layers,
  ArrowRight,
  UserMinus,
  UserPlus,
  ShieldAlert,
  Search,
  Check,
  ChevronDown,
  ChevronUp,
  FileSpreadsheet,
  Info,
} from "lucide-react";
import { DashboardDataset } from "@/types/stats";

// ─── Interfaces ──────────────────────────────────────────────────────────────

interface DptoDetalle {
  total_docentes: number;
  impertinentes: number;
  pertinentes: number;
  pct_impert: number;
  rural_docentes: number;
  urbana_docentes: number;
  pct_rural: number;
  pct_urbana: number;
  ues_afectadas: number;
  carga_horaria_uie: number;
  horas_planilla_uie: number;
  deficit_horas_uie: number;
  items_deficit_uie: number;
  pct_cobertura_uie: number;
  egresados_esfm_proyectados: number;
  demanda_2031: number;
  pct_cobertura_2031: number;
  estado_dpto: "DEFICIT" | "EQUILIBRIO" | "SATURADO";
  serie_proyeccion?: Array<{
    anio: number;
    demanda: number;
    var_poblacional_pct: number;
    egresados_anual: number;
    egresados_acumulados: number;
  }>;
}

interface EspecialidadDictamen {
  especialidad: string;
  nivel_educativo?: "INICIAL" | "PRIMARIA" | "SECUNDARIA";
  edades_ine?: string;
  total_ues?: number;
  ues_afectadas_nacional?: number;
  total_docentes: number;
  impertinentes: number;
  pertinentes: number;
  pct_impertinencia: number;
  carga_horaria_uie_nacional?: number;
  horas_planilla_uie_nacional?: number;
  deficit_horas_uie_nacional: number;
  items_deficit_uie_nacional: number;
  pct_cobertura_uie_nacional: number;
  pct_rural_nacional: number;
  pct_urbano_nacional: number;
  egresados_proyectados_2031: number;
  demanda_proyectada_2031: number;
  pct_cobertura: number;
  dictamen: "ABRIR" | "REGULAR" | "CONGELAR";
  color: "emerald" | "amber" | "rose";
  badge: string;
  justificacion: string;
  serie_proyeccion?: Array<{
    anio: number;
    demanda: number;
    var_poblacional_pct: number;
    egresados_anual: number;
    egresados_acumulados: number;
  }>;
  por_dpto: Record<string, DptoDetalle>;
}

interface ExposicionData {
  metadatos: {
    titulo: string;
    horizonte: number;
    fuente: string;
    fecha_generacion: string;
    total_especialidades_oficiales: number;
  };
  resumen_nacional_uie: {
    total_deficit_horas: number;
    total_items_deficit_88h: number;
    total_ues_auditadas: number;
    total_carga_horaria: number;
    total_horas_planilla: number;
    tasa_cobertura_nacional: number;
  };
  eje_1_demografia: {
    descripcion: string;
    nacional_2024: number;
    nacional_2026: number;
    nacional_2031: number;
    matricula_sie_2026: number;
    variacion_nacional_pct: number;
    por_departamento: Record<
      string,
      {
        p2024: number;
        p2026: number;
        p2031: number;
        matricula_sie: number;
        variacion_pct: number;
        tendencia: "EXPANSION" | "ESTABLE" | "CONTRACCION";
      }
    >;
    serie_anios: number[];
    totales_anuales_nacional: number[];
  };
  eje_2_docentes: {
    descripcion: string;
    total_2024: number;
    total_2025: number;
    total_2026: number;
    crecimiento_24_26_neto: number;
    crecimiento_24_26_pct: number;
    salientes_24_25: number;
    entrantes_24_25: number;
    tasa_rotacion_anual_pct: number;
    tasa_reposicion: number;
    total_impertinentes_2026: number;
    total_pertinentes_2026: number;
    porcentaje_impertinencia_nacional: number;
    sin_cargo_2026_total: number;
    salientes_dpto: Record<string, number>;
    entrantes_dpto: Record<string, number>;
    sin_cargo_dpto: Record<string, number>;
    impertinencia_dpto?: Record<
      string,
      {
        total: number;
        impertinentes: number;
        pertinentes: number;
        pct_impertinencia: number;
        nivel_alerta: "CRITICO" | "MODERADO" | "CONTROLADO";
      }
    >;
  };
  eje_3_egresados_esfm: {
    descripcion: string;
    total_inscritos_activas_2022_2026?: number;
    total_inscritos_activas_2021_2026?: number;
    total_egresados_proyectados_2026_2031: number;
    tasa_titulacion_historica: number;
  };
  dictamen_apertura_especialidades: EspecialidadDictamen[];
}

// ─── Datos Históricos Oficiales INE y SIE por Nivel (2011 - 2031) ─────────────

export interface SerieNivelItem {
  anio: number;
  inicial: number;
  primaria: number;
  secundaria: number;
  total: number;
  tipo: "INE Real" | "SIE Real" | "Proyección";
}

export const SERIE_NIVELES_2011_2031: SerieNivelItem[] = [
  { anio: 2011, inicial: 258121, primaria: 1389709, secundaria: 1059980, total: 2707810, tipo: "INE Real" },
  { anio: 2012, inicial: 280057, primaria: 1361227, secundaria: 1078672, total: 2719956, tipo: "INE Real" },
  { anio: 2013, inicial: 297503, primaria: 1348603, secundaria: 1112722, total: 2758828, tipo: "INE Real" },
  { anio: 2014, inicial: 317256, primaria: 1335013, secundaria: 1131625, total: 2783894, tipo: "INE Real" },
  { anio: 2015, inicial: 331285, primaria: 1334890, secundaria: 1153379, total: 2819554, tipo: "INE Real" },
  { anio: 2016, inicial: 348432, primaria: 1344818, secundaria: 1159898, total: 2853148, tipo: "INE Real" },
  { anio: 2017, inicial: 349876, primaria: 1359959, secundaria: 1149757, total: 2859592, tipo: "INE Real" },
  { anio: 2018, inicial: 353898, primaria: 1370726, secundaria: 1146170, total: 2870794, tipo: "INE Real" },
  { anio: 2019, inicial: 367625, primaria: 1378543, secundaria: 1155148, total: 2901316, tipo: "INE Real" },
  { anio: 2020, inicial: 371827, primaria: 1386254, secundaria: 1164677, total: 2922758, tipo: "INE Real" },
  { anio: 2021, inicial: 351285, primaria: 1388989, secundaria: 1189197, total: 2929471, tipo: "INE Real" },
  { anio: 2022, inicial: 351531, primaria: 1398645, secundaria: 1194896, total: 2945072, tipo: "INE Real" },
  { anio: 2023, inicial: 346394, primaria: 1389317, secundaria: 1215453, total: 2951164, tipo: "INE Real" }, // PICO GENERAL
  { anio: 2024, inicial: 333588, primaria: 1372785, secundaria: 1234142, total: 2940515, tipo: "INE Real" },
  { anio: 2025, inicial: 316330, primaria: 1344998, secundaria: 1237573, total: 2898901, tipo: "INE Real" },
  { anio: 2026, inicial: 268886, primaria: 1310438, secundaria: 1235838, total: 2815162, tipo: "SIE Real" },
  { anio: 2027, inicial: 256665, primaria: 1269428, secundaria: 1252410, total: 2778503, tipo: "Proyección" },
  { anio: 2028, inicial: 247401, primaria: 1218576, secundaria: 1262801, total: 2728778, tipo: "Proyección" },
  { anio: 2029, inicial: 232980, primaria: 1167989, secundaria: 1258210, total: 2659179, tipo: "Proyección" },
  { anio: 2030, inicial: 218166, primaria: 1116140, secundaria: 1245261, total: 2579567, tipo: "Proyección" },
  { anio: 2031, inicial: 209925, primaria: 1058805, secundaria: 1226934, total: 2495664, tipo: "Proyección" },
];

export const INE_HISTORICO_MATRICULA = [
  { anio: 2011, total: 2707810, variacion: 0, tasa: 0, publico: 2418677, privado: 289133, primaria: 1389709, secundaria: 1059980, inicial: 258121 },
  { anio: 2012, total: 2719956, variacion: 12146, tasa: 0.4, publico: 2420948, privado: 299008, primaria: 1361227, secundaria: 1078672, inicial: 280057 },
  { anio: 2013, total: 2758828, variacion: 38872, tasa: 1.4, publico: 2449041, privado: 309787, primaria: 1348603, secundaria: 1112722, inicial: 297503 },
  { anio: 2014, total: 2783894, variacion: 25066, tasa: 0.9, publico: 2469989, privado: 313905, primaria: 1335013, secundaria: 1131625, inicial: 317256 },
  { anio: 2015, total: 2819554, variacion: 35660, tasa: 1.3, publico: 2500375, privado: 319179, primaria: 1334890, secundaria: 1153379, inicial: 331285 },
  { anio: 2016, total: 2853148, variacion: 33594, tasa: 1.2, publico: 2526501, privado: 326647, primaria: 1344818, secundaria: 1159898, inicial: 348432 },
  { anio: 2017, total: 2859592, variacion: 6444, tasa: 0.2, publico: 2531032, privado: 328560, primaria: 1359959, secundaria: 1149757, inicial: 349876 },
  { anio: 2018, total: 2870794, variacion: 11202, tasa: 0.4, publico: 2541698, privado: 329096, primaria: 1370726, secundaria: 1146170, inicial: 353898 },
  { anio: 2019, total: 2901316, variacion: 30522, tasa: 1.1, publico: 2568832, privado: 332484, primaria: 1378543, secundaria: 1155148, inicial: 367625 },
  { anio: 2020, total: 2922758, variacion: 21442, tasa: 0.7, publico: 2590709, privado: 332049, primaria: 1386254, secundaria: 1164677, inicial: 371827 },
  { anio: 2021, total: 2929471, variacion: 6713, tasa: 0.2, publico: 2640965, privado: 288506, primaria: 1388989, secundaria: 1189197, inicial: 351285 },
  { anio: 2022, total: 2945072, variacion: 15601, tasa: 0.5, publico: 2646169, privado: 298903, primaria: 1398645, secundaria: 1194896, inicial: 351531 },
  { anio: 2023, total: 2951164, variacion: 6092, tasa: 0.2, publico: 2639889, privado: 311275, primaria: 1389317, secundaria: 1215453, inicial: 346394 },
  { anio: 2024, total: 2940515, variacion: -10649, tasa: -0.4, publico: 2622942, privado: 317573, primaria: 1372785, secundaria: 1234142, inicial: 333588 },
  { anio: 2025, total: 2898901, variacion: -41614, tasa: -1.4, publico: 2580498, privado: 318403, primaria: 1344998, secundaria: 1237573, inicial: 316330 },
];

export const SIE_2026_TOTAL = 2815162;
export const SIE_2026_PUBLICO_TOTAL = 2488923; // SOLO SECTOR PÚBLICO (Fiscal / Convenio)
export const SIE_2026_PRIVADO_TOTAL = 326239;

export const POB_INE_2024_TOTAL = 3219295;
export const POB_INE_2026_TOTAL = 3160110;
export const POB_INE_2031_TOTAL = 2800534;
export const TASA_COBERTURA_PUBLICA_2026 = Number((SIE_2026_PUBLICO_TOTAL / POB_INE_2026_TOTAL * 100).toFixed(1)); // 78.8%

// ─── Impertinencia Departamental Oficial (Padrón Docente 2026) ─────────────
// Ordenados de mayor a menor tasa de impertinencia
export const IMPERTINENCIA_DPTO_ORDENADA = [
  { nombre: "PANDO", total: 2634, impertinentes: 690, pertinentes: 1944, pct: 26.2, nivel: "CRITICO" },
  { nombre: "BENI", total: 8038, impertinentes: 1851, pertinentes: 6187, pct: 23.0, nivel: "CRITICO" },
  { nombre: "ORURO", total: 9450, impertinentes: 2034, pertinentes: 7416, pct: 21.5, nivel: "CRITICO" },
  { nombre: "SANTA CRUZ", total: 34637, impertinentes: 6428, pertinentes: 28209, pct: 18.6, nivel: "MODERADO" },
  { nombre: "CHUQUISACA", total: 10106, impertinentes: 1761, pertinentes: 8345, pct: 17.4, nivel: "MODERADO" },
  { nombre: "COCHABAMBA", total: 29672, impertinentes: 5077, pertinentes: 24595, pct: 17.1, nivel: "MODERADO" },
  { nombre: "TARIJA", total: 9295, impertinentes: 1423, pertinentes: 7872, pct: 15.3, nivel: "CONTROLADO" },
  { nombre: "POTOSI", total: 16322, impertinentes: 2453, pertinentes: 13869, pct: 15.0, nivel: "CONTROLADO" },
  { nombre: "LA PAZ", total: 44294, impertinentes: 6606, pertinentes: 37688, pct: 14.9, nivel: "CONTROLADO" },
];

const DPTOS_ORDEN = [
  "BENI", "CHUQUISACA", "COCHABAMBA", "LA PAZ",
  "ORURO", "PANDO", "POTOSI", "SANTA CRUZ", "TARIJA",
];

// ─── Estructura de Balance Departamental: Demanda Remanente vs Egresados ──────
export type MacroAreaTipo = 'INICIAL' | 'PRIMARIA' | 'SECUNDARIA' | 'SECUNDARIA_BTH' | 'ESPECIAL';

export function getMacroArea(especialidad: string): MacroAreaTipo {
  const u = especialidad.toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  if (u.includes("INICIAL")) return "INICIAL";
  if (u.includes("PRIMARIA")) return "PRIMARIA";
  if (u.includes("ESPECIAL") || u.includes("DISCAPACIDAD")) return "ESPECIAL";
  if (
    u.includes("ELECTROMECANICA") ||
    u.includes("MECANICA") ||
    u.includes("TEXTIL") ||
    u.includes("ELECTRICIDAD") ||
    u.includes("ALIMENTOS") ||
    u.includes("GASTRONOMIA") ||
    u.includes("AGROPECUARIA") ||
    u.includes("BTH")
  ) {
    return "SECUNDARIA_BTH";
  }
  return "SECUNDARIA";
}

export interface MacroAreaStats {
  demanda: number;
  egresados: number;
  real: number;
  paralelos: number | null;
}

export interface MacroDptoFila {
  departamento: string;
  inicial: MacroAreaStats;
  primaria: MacroAreaStats;
  secundaria: MacroAreaStats;
  secundariaBth: MacroAreaStats;
  especial: MacroAreaStats;
  total: MacroAreaStats;
}

export interface DeptBalanceAnio {
  demanda: number;
  egresados: number;
  real: number;
}

export interface DeptBalanceFila {
  departamento: string;
  y2027: DeptBalanceAnio;
  y2028: DeptBalanceAnio;
  y2029: DeptBalanceAnio;
  y2030: DeptBalanceAnio;
  y2031: DeptBalanceAnio;
  admision2027: number | null;
}

// Regla oficial de Apertura de Especialidad (30 docentes por paralelo, mínimo 6 docentes de demanda real)
export function calcularParalelosAdmision(demandaReal2031: number): number | null {
  if (demandaReal2031 < 6) return null;
  return Math.max(1, Math.round(demandaReal2031 / 30));
}

// Datos auditados exactos para Matemática (Nivel Secundaria) según reporte oficial UIE / DGFM / INE
export const MATEMATICA_DEPT_BALANCE: DeptBalanceFila[] = [
  { departamento: "BENI", y2027: { demanda: 46, egresados: 0, real: 46 }, y2028: { demanda: 46, egresados: 27, real: 19 }, y2029: { demanda: 19, egresados: 68, real: -49 }, y2030: { demanda: -49, egresados: 0, real: -49 }, y2031: { demanda: -49, egresados: 45.5, real: -94.5 }, admision2027: calcularParalelosAdmision(-94.5) },
  { departamento: "LA PAZ", y2027: { demanda: 131, egresados: 21, real: 110 }, y2028: { demanda: 110, egresados: 19, real: 91 }, y2029: { demanda: 91, egresados: 30, real: 61 }, y2030: { demanda: 61, egresados: 0, real: 61 }, y2031: { demanda: 61, egresados: 35, real: 26 }, admision2027: calcularParalelosAdmision(26) },
  { departamento: "SANTA CRUZ", y2027: { demanda: 112, egresados: 0, real: 112 }, y2028: { demanda: 112, egresados: 0, real: 112 }, y2029: { demanda: 112, egresados: 32, real: 80 }, y2030: { demanda: 80, egresados: 0, real: 80 }, y2031: { demanda: 80, egresados: 131, real: -51 }, admision2027: calcularParalelosAdmision(-51) },
  { departamento: "PANDO", y2027: { demanda: 12, egresados: 23, real: -11 }, y2028: { demanda: -11, egresados: 13, real: -24 }, y2029: { demanda: -24, egresados: 0, real: -24 }, y2030: { demanda: -24, egresados: 28, real: -52 }, y2031: { demanda: -52, egresados: 61, real: -113 }, admision2027: calcularParalelosAdmision(-113) },
  { departamento: "POTOSI", y2027: { demanda: 101, egresados: 0, real: 101 }, y2028: { demanda: 101, egresados: 0, real: 101 }, y2029: { demanda: 101, egresados: 0, real: 101 }, y2030: { demanda: 101, egresados: 0, real: 101 }, y2031: { demanda: 101, egresados: 0, real: 101 }, admision2027: calcularParalelosAdmision(101) },
  { departamento: "CHUQUISACA", y2027: { demanda: 17, egresados: 0, real: 17 }, y2028: { demanda: 17, egresados: 0, real: 17 }, y2029: { demanda: 17, egresados: 0, real: 17 }, y2030: { demanda: 17, egresados: 22, real: -5 }, y2031: { demanda: -5, egresados: 0, real: -5 }, admision2027: calcularParalelosAdmision(-5) },
  { departamento: "TARIJA", y2027: { demanda: 7, egresados: 0, real: 7 }, y2028: { demanda: 7, egresados: 0, real: 7 }, y2029: { demanda: 7, egresados: 34, real: -27 }, y2030: { demanda: -27, egresados: 31, real: -58 }, y2031: { demanda: -58, egresados: 0, real: -58 }, admision2027: calcularParalelosAdmision(-58) },
  { departamento: "ORURO", y2027: { demanda: 21, egresados: 0, real: 21 }, y2028: { demanda: 21, egresados: 0, real: 21 }, y2029: { demanda: 21, egresados: 0, real: 21 }, y2030: { demanda: 21, egresados: 0, real: 21 }, y2031: { demanda: 21, egresados: 0, real: 21 }, admision2027: calcularParalelosAdmision(21) },
  { departamento: "COCHABAMBA", y2027: { demanda: 60, egresados: 27, real: 33 }, y2028: { demanda: 33, egresados: 27, real: 6 }, y2029: { demanda: 6, egresados: 0, real: 6 }, y2030: { demanda: 6, egresados: 0, real: 6 }, y2031: { demanda: 6, egresados: 0, real: 6 }, admision2027: calcularParalelosAdmision(6) },
];

const SLIDES = [
  { id: "slide1", label: "Crecimiento Poblacional", icon: TrendingUp },
  { id: "slide2", label: "Tendencia de Maestros", icon: Users },
  { id: "slide3", label: "Proyección Egresados ESFM", icon: GraduationCap },
  { id: "slide4", label: "General", icon: Layers },
];

// ─── Componente Principal ────────────────────────────────────────────────────

interface Props {
  data?: DashboardDataset;
}

export default function Exposicion2031View({ data: dataset }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [data, setData] = useState<ExposicionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [slide, setSlide] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [selectedEsp, setSelectedEsp] = useState<EspecialidadDictamen | null>(null);
  const [searchEsp, setSearchEsp] = useState("");
  const [filterDictamen, setFilterDictamen] = useState<"TODOS" | "ABRIR" | "REGULAR" | "CONGELAR">("TODOS");
  const [copied, setCopied] = useState(false);
  const [showHistoricoTabla, setShowHistoricoTabla] = useState(false);

  // Filtro de visualización de curva por nivel escolar
  const [nivelFiltro, setNivelFiltro] = useState<"COMPARATIVA" | "PRIMARIA" | "SECUNDARIA" | "INICIAL" | "TOTAL">("COMPARATIVA");

  // Modo de visualización de egresados en el gráfico de Slide 3: Acumulado o Anual
  const [modoEgresadosGrafico, setModoEgresadosGrafico] = useState<"ACUMULADO" | "ANUAL">("ACUMULADO");

  // Pestaña activa para la tabla de balance inferior: Macro General vs Evolución Especialidad
  const [tabTablaBalance, setTabTablaBalance] = useState<"macro" | "cohorte">("macro");

  // Horizonte temporal para la Matriz Macro General
  const [macroFiltroAnio, setMacroFiltroAnio] = useState<"2031_acum" | "2027" | "2028" | "2029" | "2030" | "2031">("2031_acum");

  // Modo de lectura para la tabla de cohorte anual (resumido vs detallado)
  const [modoVistaCohorte, setModoVistaCohorte] = useState<"resumido" | "completo">("resumido");

  // Estados para Slide 4 (Matriz General Territorial por Especialidad)
  const [modoVistaGeneral, setModoVistaGeneral] = useState<"combinado" | "cantidad" | "admision" | "comparar_2027_2031">("combinado");
  const [filtroGeneralDictamen, setFiltroGeneralDictamen] = useState<"TODAS" | "CON_APERTURA" | "SATURADAS">("TODAS");
  const [searchGeneral, setSearchGeneral] = useState("");

  useEffect(() => {
    fetch("/api/exposicion-2031")
      .then((r) => r.json())
      .then((json) => {
        setData(json);
        const def =
          json.dictamen_apertura_especialidades?.find((e: EspecialidadDictamen) =>
            e.especialidad.includes("MATEMÁTICA")
          ) || json.dictamen_apertura_especialidades?.[0];
        setSelectedEsp(def ?? null);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  // Fullscreen nativo
  useEffect(() => {
    const handler = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", handler);
    return () => document.removeEventListener("fullscreenchange", handler);
  }, []);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  // Departamentos con datos de Matrícula SIE 2026 (SOLO SECTOR PÚBLICO) vs Población INE (4 a 17 años)
  const dptosAnalisis = useMemo(() => {
    // Matrícula SIE 2026 SOLO PÚBLICO (Fiscal + Convenio)
    const fallbackSiePublico: Record<string, number> = {
      "Beni": 135468,
      "Chuquisaca": 119837,
      "Cochabamba": 458406,
      "La Paz": 604376,
      "Oruro": 127258,
      "Pando": 33897,
      "Potosí": 203267,
      "Santa Cruz": 686989,
      "Tarija": 119425,
    };

    const fallbackIne24: Record<string, number> = {
      "Beni": 171991, "Chuquisaca": 166516, "Cochabamba": 579263,
      "La Paz": 772153, "Oruro": 156252, "Pando": 43409,
      "Potosí": 250751, "Santa Cruz": 932848, "Tarija": 146112,
    };
    const fallbackIne26: Record<string, number> = {
      "Beni": 170549, "Chuquisaca": 159899, "Cochabamba": 570181,
      "La Paz": 749712, "Oruro": 153087, "Pando": 43687,
      "Potosí": 243443, "Santa Cruz": 928105, "Tarija": 141447,
    };
    const fallbackIne31: Record<string, number> = {
      "Beni": 157051, "Chuquisaca": 130726, "Cochabamba": 510658,
      "La Paz": 647709, "Oruro": 133659, "Pando": 39132,
      "Potosí": 213654, "Santa Cruz": 848502, "Tarija": 119443,
    };

    const dptoNames = [
      "Beni", "Chuquisaca", "Cochabamba", "La Paz",
      "Oruro", "Pando", "Potosí", "Santa Cruz", "Tarija",
    ];

    return dptoNames.map((nombre) => {
      let siePub = fallbackSiePublico[nombre] || 0;
      let ine24 = fallbackIne24[nombre] || 0;
      let ine26 = fallbackIne26[nombre] || 0;
      let ine31 = fallbackIne31[nombre] || 0;

      if (dataset) {
        const dptoObj = dataset.departamentos?.find((d) => d.nombre.toLowerCase() === nombre.toLowerCase());
        if (dptoObj) {
          // Filtrar estrictamente dependencias públicas / fiscales / convenios
          const sSum = (dataset.sie_total_estudiantes || [])
            .filter((s) => s.departamento_id === dptoObj.id && !s.dependencia.toLowerCase().includes("privad"))
            .reduce((acc, s) => acc + s.cantidad, 0);
          if (sSum > 0) siePub = sSum;

          const p24 = (dataset.ine_proyeccion_edad || [])
            .filter((p) => p.departamento_id === dptoObj.id && p.anio === 2024 && p.edad >= 4 && p.edad <= 17)
            .reduce((acc, p) => acc + p.cantidad, 0);
          if (p24 > 0) ine24 = p24;

          const p26 = (dataset.ine_proyeccion_edad || [])
            .filter((p) => p.departamento_id === dptoObj.id && p.anio === 2026 && p.edad >= 4 && p.edad <= 17)
            .reduce((acc, p) => acc + p.cantidad, 0);
          if (p26 > 0) ine26 = p26;

          const p31 = (dataset.ine_proyeccion_edad || [])
            .filter((p) => p.departamento_id === dptoObj.id && p.anio === 2031 && p.edad >= 4 && p.edad <= 17)
            .reduce((acc, p) => acc + p.cantidad, 0);
          if (p31 > 0) ine31 = p31;
        }
      }

      const varIne = ine24 > 0 ? Number((((ine31 - ine24) / ine24) * 100).toFixed(1)) : 0;
      // Tasa de cobertura pública sobre la población en edad escolar
      const tasaCobPub = ine26 > 0 ? Number(((siePub / ine26) * 100).toFixed(1)) : 0;

      return {
        nombre,
        matricula_sie_publico: siePub,
        ine_2024: ine24,
        ine_2026: ine26,
        ine_2031: ine31,
        variacion_pct: varIne,
        tasa_cobertura_publica: tasaCobPub,
        tendencia: varIne > 0 ? "EXPANSION" : varIne > -10 ? "ESTABLE" : "CONTRACCION",
      };
    });
  }, [dataset]);

  // Filtro de especialidades para Slide 3
  const espFiltradas = useMemo(() => {
    if (!data) return [];
    return data.dictamen_apertura_especialidades.filter((e) => {
      const matchSearch = !searchEsp.trim() || e.especialidad.toLowerCase().includes(searchEsp.toLowerCase());
      const matchFilter = filterDictamen === "TODOS" || e.dictamen === filterDictamen;
      return matchSearch && matchFilter;
    });
  }, [data, searchEsp, filterDictamen]);

  // Línea SVG demanda en UEs vs egresados ESFM modulada por variación demográfica INE (Inicial 4-5, Primaria 6-11, Secundaria 12-17) y cohortes reales DGFM
  const lineChartPoints = useMemo(() => {
    if (!selectedEsp) return [];
    if (selectedEsp.serie_proyeccion && selectedEsp.serie_proyeccion.length > 0) {
      return selectedEsp.serie_proyeccion.map((p) => ({
        anio: p.anio,
        demanda: Math.round(p.demanda * 10) / 10,
        egresados: modoEgresadosGrafico === "ACUMULADO" ? p.egresados_acumulados : p.egresados_anual,
        egresados_anual: p.egresados_anual,
        egresados_acumulados: p.egresados_acumulados,
        var_poblacional_pct: p.var_poblacional_pct,
      }));
    }
    const anios = [2026, 2027, 2028, 2029, 2030, 2031];
    return anios.map((anio) => ({
      anio,
      demanda: Math.round(selectedEsp.items_deficit_uie_nacional),
      egresados: 0,
      egresados_anual: 0,
      egresados_acumulados: 0,
      var_poblacional_pct: 0,
    }));
  }, [selectedEsp, modoEgresadosGrafico]);

  // Matriz Macro General por Departamentos y las 5 Áreas (Inicial, Primaria, Secundaria, BTH, Especial)
  const macroDptoRows = useMemo<MacroDptoFila[]>(() => {
    if (!data?.dictamen_apertura_especialidades) return [];
    const esps = data.dictamen_apertura_especialidades;
    const dptos = ["BENI", "LA PAZ", "SANTA CRUZ", "PANDO", "POTOSI", "CHUQUISACA", "TARIJA", "ORURO", "COCHABAMBA"];

    return dptos.map((dpto) => {
      const calcArea = (macroTipo: MacroAreaTipo): MacroAreaStats => {
        const areaEsps = esps.filter((e) => getMacroArea(e.especialidad) === macroTipo);
        let baseDemanda = 0;
        const egrAnuales: Record<number, number> = { 2027: 0, 2028: 0, 2029: 0, 2030: 0, 2031: 0 };
        let totalEgrQuinquenio = 0;

        areaEsps.forEach((e) => {
          const dData = e.por_dpto?.[dpto];
          if (!dData) return;
          baseDemanda += (dData.items_deficit_uie || 0);
          totalEgrQuinquenio += (dData.egresados_esfm_proyectados || 0);

          const serie = dData.serie_proyeccion || [];
          [2027, 2028, 2029, 2030, 2031].forEach((y) => {
            const pt = serie.find((p: { anio: number }) => p.anio === y);
            if (pt) {
              egrAnuales[y] += (pt.egresados_anual || 0);
            }
          });
        });

        // Simulación recursiva año por año de cohorte:
        // Demanda(t) = Demanda Real(t-1)
        // Demanda Real(t) = Demanda(t) - Egresados(t)
        let remanente = baseDemanda;
        const progression: Record<number, { demanda: number; egresados: number; real: number }> = {};

        for (const y of [2027, 2028, 2029, 2030, 2031]) {
          const demAnio = remanente;
          const egrAnio = egrAnuales[y] || 0;
          const realAnio = demAnio - egrAnio;
          progression[y] = {
            demanda: Math.round(demAnio),
            egresados: Math.round(egrAnio),
            real: Math.round(realAnio),
          };
          remanente = realAnio;
        }

        if (macroFiltroAnio === "2031_acum") {
          const dTotal = Math.round(baseDemanda);
          const eTotal = Math.round(
            totalEgrQuinquenio > 0
              ? totalEgrQuinquenio
              : egrAnuales[2027] + egrAnuales[2028] + egrAnuales[2029] + egrAnuales[2030] + egrAnuales[2031]
          );
          const rTotal = dTotal - eTotal;
          const paralelos = calcularParalelosAdmision(rTotal);
          return { demanda: dTotal, egresados: eTotal, real: rTotal, paralelos };
        }

        const yNum = Number(macroFiltroAnio);
        const st = progression[yNum] || { demanda: 0, egresados: 0, real: 0 };
        const paralelos = calcularParalelosAdmision(st.real);
        return { demanda: st.demanda, egresados: st.egresados, real: st.real, paralelos };
      };

      const inicial = calcArea("INICIAL");
      const primaria = calcArea("PRIMARIA");
      const secundaria = calcArea("SECUNDARIA");
      const secundariaBth = calcArea("SECUNDARIA_BTH");
      const especial = calcArea("ESPECIAL");

      const totalDem = inicial.demanda + primaria.demanda + secundaria.demanda + secundariaBth.demanda + especial.demanda;
      const totalEgr = inicial.egresados + primaria.egresados + secundaria.egresados + secundariaBth.egresados + especial.egresados;
      const totalReal = totalDem - totalEgr;
      const totalParalelos = calcularParalelosAdmision(totalReal);

      return {
        departamento: dpto,
        inicial,
        primaria,
        secundaria,
        secundariaBth,
        especial,
        total: {
          demanda: totalDem,
          egresados: totalEgr,
          real: totalReal,
          paralelos: totalParalelos,
        },
      };
    });
  }, [data, macroFiltroAnio]);

  // Fila Total Consolidada de la Matriz Macro
  const macroTotalFila = useMemo(() => {
    return macroDptoRows.reduce(
      (acc, r) => {
        const sumArea = (k: keyof Omit<MacroDptoFila, "departamento">) => {
          acc[k].demanda += r[k].demanda;
          acc[k].egresados += r[k].egresados;
          acc[k].real += r[k].real;
          acc[k].paralelos = (acc[k].paralelos || 0) + (r[k].paralelos || 0);
        };
        sumArea("inicial");
        sumArea("primaria");
        sumArea("secundaria");
        sumArea("secundariaBth");
        sumArea("especial");
        sumArea("total");
        return acc;
      },
      {
        inicial: { demanda: 0, egresados: 0, real: 0, paralelos: 0 },
        primaria: { demanda: 0, egresados: 0, real: 0, paralelos: 0 },
        secundaria: { demanda: 0, egresados: 0, real: 0, paralelos: 0 },
        secundariaBth: { demanda: 0, egresados: 0, real: 0, paralelos: 0 },
        especial: { demanda: 0, egresados: 0, real: 0, paralelos: 0 },
        total: { demanda: 0, egresados: 0, real: 0, paralelos: 0 },
      }
    );
  }, [macroDptoRows]);

  // Filas del Balance Departamental Dinámico (Demanda Remanente = Necesidad - Egresados)
  const deptBalanceRows = useMemo<DeptBalanceFila[]>(() => {
    if (!selectedEsp) return [];
    const espNorm = selectedEsp.especialidad.toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    if (espNorm.includes("MATEMATICA")) {
      return MATEMATICA_DEPT_BALANCE;
    }

    const dptos = ["BENI", "LA PAZ", "SANTA CRUZ", "PANDO", "POTOSI", "CHUQUISACA", "TARIJA", "ORURO", "COCHABAMBA"];
    return dptos.map((dpto) => {
      const dptoData = selectedEsp.por_dpto?.[dpto];
      const baseDemand = Math.round(dptoData?.items_deficit_uie || 0);
      const serie = dptoData?.serie_proyeccion || [];
      const getEgr = (anio: number) => {
        const pt = serie.find((p: { anio: number; egresados_anual: number }) => p.anio === anio);
        return pt ? pt.egresados_anual : 0;
      };

      const dem2027 = baseDemand;
      const egr2027 = getEgr(2027);
      const real2027 = dem2027 - egr2027;

      const dem2028 = real2027;
      const egr2028 = getEgr(2028);
      const real2028 = dem2028 - egr2028;

      const dem2029 = real2028;
      const egr2029 = getEgr(2029);
      const real2029 = dem2029 - egr2029;

      const dem2030 = real2029;
      const egr2030 = getEgr(2030);
      const real2030 = dem2030 - egr2030;

      const dem2031 = real2030;
      const egr2031 = getEgr(2031);
      const real2031 = dem2031 - egr2031;

      // Apertura de Especialidad al 2031 (30 docentes por paralelo, mínimo 6 de demanda real)
      const admision2027 = calcularParalelosAdmision(real2031);

      return {
        departamento: dpto,
        y2027: { demanda: dem2027, egresados: egr2027, real: real2027 },
        y2028: { demanda: dem2028, egresados: egr2028, real: real2028 },
        y2029: { demanda: dem2029, egresados: egr2029, real: real2029 },
        y2030: { demanda: dem2030, egresados: egr2030, real: real2030 },
        y2031: { demanda: dem2031, egresados: egr2031, real: real2031 },
        admision2027,
      };
    });
  }, [selectedEsp]);

  // Fila de Total Nacional Consolidado del Balance
  const deptBalanceTotal = useMemo(() => {
    return deptBalanceRows.reduce(
      (acc, r) => ({
        y2027: {
          demanda: acc.y2027.demanda + r.y2027.demanda,
          egresados: acc.y2027.egresados + r.y2027.egresados,
          real: acc.y2027.real + r.y2027.real,
        },
        y2028: {
          demanda: acc.y2028.demanda + r.y2028.demanda,
          egresados: acc.y2028.egresados + r.y2028.egresados,
          real: acc.y2028.real + r.y2028.real,
        },
        y2029: {
          demanda: acc.y2029.demanda + r.y2029.demanda,
          egresados: acc.y2029.egresados + r.y2029.egresados,
          real: acc.y2029.real + r.y2029.real,
        },
        y2030: {
          demanda: acc.y2030.demanda + r.y2030.demanda,
          egresados: acc.y2030.egresados + r.y2030.egresados,
          real: acc.y2030.real + r.y2030.real,
        },
        y2031: {
          demanda: acc.y2031.demanda + r.y2031.demanda,
          egresados: acc.y2031.egresados + r.y2031.egresados,
          real: acc.y2031.real + r.y2031.real,
        },
        admision2027: acc.admision2027 + (typeof r.admision2027 === 'number' ? r.admision2027 : 0),
      }),
      {
        y2027: { demanda: 0, egresados: 0, real: 0 },
        y2028: { demanda: 0, egresados: 0, real: 0 },
        y2029: { demanda: 0, egresados: 0, real: 0 },
        y2030: { demanda: 0, egresados: 0, real: 0 },
        y2031: { demanda: 0, egresados: 0, real: 0 },
        admision2027: 0,
      }
    );
  }, [deptBalanceRows]);

  // Matriz General Territorial de 20 Especialidades x 9 Departamentos (Slide 4)
  const matrizGeneralData = useMemo(() => {
    if (!data?.dictamen_apertura_especialidades) {
      return {
        filas: [],
        dptoTotales: {},
        totalParalelosNac: 0,
        totalDeficitPositivoNac: 0,
        totalReq2027Nac: 0,
        totalReq2031Nac: 0,
      };
    }

    const esps = data.dictamen_apertura_especialidades;
    const dptos = ["BENI", "CHUQUISACA", "COCHABAMBA", "LA PAZ", "ORURO", "PANDO", "POTOSI", "SANTA CRUZ", "TARIJA"];

    const dptoTotales: Record<string, {
      realNeto: number;
      deficitPositivo: number;
      paralelos: number;
      req2027: number;
      req2031: number;
    }> = {};
    dptos.forEach((dp) => {
      dptoTotales[dp] = { realNeto: 0, deficitPositivo: 0, paralelos: 0, req2027: 0, req2031: 0 };
    });

    let totalParalelosNac = 0;
    let totalDeficitPositivoNac = 0;
    let totalReq2027Nac = 0;
    let totalReq2031Nac = 0;

    const filas = esps.map((esp) => {
      let totRealEsp = 0;
      let totParalelosEsp = 0;
      let totDeficitPositivoEsp = 0;

      const sNac = esp.serie_proyeccion || [];
      const p27Nac = sNac.find((p) => p.anio === 2027);
      const p31Nac = sNac.find((p) => p.anio === 2031);
      const totReq2027Esp = Math.round(p27Nac?.demanda ?? esp.items_deficit_uie_nacional ?? 0);
      const totReq2031Esp = Math.round(p31Nac?.demanda ?? esp.demanda_proyectada_2031 ?? 0);

      const dptosVal: Record<string, {
        def: number;
        egr: number;
        real: number;
        par: number;
        req2027: number;
        req2031: number;
      }> = {};

      dptos.forEach((dp) => {
        const dData = esp.por_dpto?.[dp];
        const sDp = dData?.serie_proyeccion || [];
        const p27Dp = sDp.find((p) => p.anio === 2027);
        const p31Dp = sDp.find((p) => p.anio === 2031);

        const def = Math.round(dData?.items_deficit_uie || 0);
        const req2027 = Math.round(p27Dp?.demanda ?? def);
        const req2031 = Math.round(p31Dp?.demanda ?? (dData?.demanda_2031 ?? def));
        const egr = Math.round(dData?.egresados_esfm_proyectados || 0);
        const real = def - egr;
        const par = calcularParalelosAdmision(real) || 0;

        dptosVal[dp] = { def, egr, real, par, req2027, req2031 };
        totRealEsp += real;
        totParalelosEsp += par;
        if (real > 0) totDeficitPositivoEsp += real;

        dptoTotales[dp].realNeto += real;
        dptoTotales[dp].paralelos += par;
        dptoTotales[dp].req2027 += req2027;
        dptoTotales[dp].req2031 += req2031;
        if (real > 0) dptoTotales[dp].deficitPositivo += real;
      });

      totalParalelosNac += totParalelosEsp;
      totalDeficitPositivoNac += totDeficitPositivoEsp;
      totalReq2027Nac += totReq2027Esp;
      totalReq2031Nac += totReq2031Esp;

      return {
        especialidad: esp.especialidad,
        macroArea: getMacroArea(esp.especialidad),
        dictamen: esp.dictamen,
        badge: esp.badge,
        totReq2027Esp,
        totReq2031Esp,
        dptos: dptosVal,
        totRealEsp,
        totParalelosEsp,
        totDeficitPositivoEsp,
      };
    });

    const AREA_ORDER: Record<MacroAreaTipo, number> = {
      INICIAL: 1,
      PRIMARIA: 2,
      SECUNDARIA: 3,
      ESPECIAL: 4,
      SECUNDARIA_BTH: 5,
    };

    filas.sort((a, b) => {
      const diff = (AREA_ORDER[a.macroArea] || 99) - (AREA_ORDER[b.macroArea] || 99);
      if (diff !== 0) return diff;
      return b.totParalelosEsp - a.totParalelosEsp || a.especialidad.localeCompare(b.especialidad);
    });

    return {
      filas,
      dptoTotales,
      totalParalelosNac,
      totalDeficitPositivoNac,
      totalReq2027Nac,
      totalReq2031Nac,
    };
  }, [data]);

  // Exportar CSV de la Matriz General
  const handleExportMatrizGeneral = () => {
    if (!data?.dictamen_apertura_especialidades) return;
    const dptos = ["BENI", "CHUQUISACA", "COCHABAMBA", "LA PAZ", "ORURO", "PANDO", "POTOSI", "SANTA CRUZ", "TARIJA"];
    let csv = "Especialidad,Macro Area,Dictamen,Requerido 2027 Bolivia,Requerido 2031 Bolivia," +
      dptos.map((d) => `${d} Req 2027,${d} Req 2031,${d} Cantidad Real,${d} Paralelos`).join(",") +
      ",Total Real Bolivia,Total Paralelos Bolivia\n";
    matrizGeneralData.filas.forEach((f) => {
      const dCells = dptos.map((d) => `${f.dptos[d].req2027},${f.dptos[d].req2031},${f.dptos[d].real},${f.dptos[d].par}`).join(",");
      csv += `"${f.especialidad}","${f.macroArea}","${f.dictamen}",${f.totReq2027Esp},${f.totReq2031Esp},${dCells},${f.totRealEsp},${f.totParalelosEsp}\n`;
    });
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "matriz_general_comparativa_2027_2031.csv";
    a.click();
  };

  // Exportar CSV
  const handleExport = () => {
    if (!data) return;
    let csv = "Especialidad,Dictamen,Déficit Horas UIE,Ítems Déficit,Cobertura UIE %,Impertinencia %,Egresados 2031,Demanda 2031\n";
    data.dictamen_apertura_especialidades.forEach((e) => {
      csv += `"${e.especialidad}","${e.dictamen}",${e.deficit_horas_uie_nacional},${e.items_deficit_uie_nacional},${e.pct_cobertura_uie_nacional},${e.pct_impertinencia},${e.egresados_proyectados_2031},${e.demanda_proyectada_2031}\n`;
    });
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `dictamen_especialidades_esfm_2031.csv`;
    a.click();
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading || !data) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[500px] space-y-4">
        <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
        <p className="text-slate-600 font-bold text-sm">Cargando visualización de exposición 2031…</p>
        <p className="text-slate-400 text-xs">Consolidando datos INE, SIE y Padrón Docente</p>
      </div>
    );
  }

  const d2 = data.eje_2_docentes;
  const d3 = data.eje_3_egresados_esfm;
  const maxSaliente = Math.max(...Object.values(d2.salientes_dpto));
  const maxEntrante = Math.max(...Object.values(d2.entrantes_dpto));
  const maxSinCargo = Math.max(...Object.values(d2.sin_cargo_dpto));

  const abrirCount = data.dictamen_apertura_especialidades.filter((e) => e.dictamen === "ABRIR").length;
  const regularCount = data.dictamen_apertura_especialidades.filter((e) => e.dictamen === "REGULAR").length;
  const congelarCount = data.dictamen_apertura_especialidades.filter((e) => e.dictamen === "CONGELAR").length;

  // ── Render de slides ──
  const renderSlide = () => {
    // ═════════════════════════════════════════════════════════════════════════
    // SLIDE 1 — CRECIMIENTO POBLACIONAL Y MATRÍCULA ESCOLAR POR NIVEL
    // ═════════════════════════════════════════════════════════════════════════
    if (slide === 0) {
      // Configuración de escalas según el modo seleccionado
      const isComparativa = nivelFiltro === "COMPARATIVA";
      const isTotal = nivelFiltro === "TOTAL";

      // Rango de escala dinámica
      const yMax = isTotal ? 3000000 : 1500000;
      const yMin = isTotal ? 2400000 : 150000;
      const range = yMax - yMin;

      return (
        <div className="space-y-6">
          {/* Encabezado de Diapositiva 1 */}
          <div className="bg-gradient-to-r from-indigo-950 via-slate-900 to-indigo-900 text-white rounded-3xl p-6 sm:p-8 relative overflow-hidden shadow-2xl border border-indigo-800/40">
            <div className="absolute -right-10 -bottom-10 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
            <div className="relative z-10">
              <div className="flex flex-wrap items-center gap-2 mb-3">
                <div className="w-8 h-8 rounded-full bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center">
                  <TrendingUp className="w-4 h-4 text-indigo-300" />
                </div>
                <span className="text-xs font-black text-indigo-300 uppercase tracking-widest">
                  Diapositiva 1 de 4 · Diagnóstico Demográfico y Matrícula Escolar · Datos Preliminares
                </span>
                <span className="ml-auto bg-indigo-500/20 text-indigo-200 border border-indigo-400/30 text-[10px] font-black px-2.5 py-1 rounded-full">
                  INE (2011–2025) · SIE 2026 Efectivo · Proyección 2031
                </span>
              </div>
              <h2 className="text-2xl sm:text-4xl font-black tracking-tight text-white">
                Curva de Matrícula Escolar por Nivel y Contracción Demográfica
              </h2>
              <p className="text-indigo-200 text-sm mt-2 max-w-3xl leading-relaxed">
                Comparativa longitudinal de 20 años desglosada por niveles educativos: <strong>Inicial</strong> (4-5 años), <strong>Primaria</strong> (6-11 años) y <strong>Secundaria</strong> (12-17 años). Análisis del punto de inflexión demográfica y proyección hacia 2031.
              </p>
            </div>
          </div>

          {/* 5 KPIs Nacionales Estratégicos */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3.5">
            <div className="bg-white rounded-2xl border border-indigo-100 shadow-sm p-4 relative overflow-hidden">
              <div className="flex items-center gap-2 mb-1.5">
                <Award className="w-4 h-4 text-indigo-600" />
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-500">Pico Histórico (2023)</span>
              </div>
              <div className="text-2xl font-black text-slate-900">2,951,164</div>
              <div className="text-[11px] text-emerald-600 font-bold mt-1">Máximo nacional INE</div>
            </div>

            <div className="bg-white rounded-2xl border border-amber-100 shadow-sm p-4 relative overflow-hidden">
              <div className="flex items-center gap-2 mb-1.5">
                <Activity className="w-4 h-4 text-amber-600" />
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-500">Matrícula 2025 (INE)</span>
              </div>
              <div className="text-2xl font-black text-slate-900">2,898,901</div>
              <div className="text-[11px] text-rose-600 font-bold mt-1">-41,614 (-1.4% anual)</div>
            </div>

            <div className="bg-gradient-to-br from-blue-50 to-indigo-50/60 rounded-2xl border-2 border-blue-400 shadow-sm p-4 relative overflow-hidden">
              <div className="flex items-center gap-2 mb-1.5">
                <School className="w-4 h-4 text-blue-700" />
                <span className="text-[10px] font-black uppercase tracking-wider text-blue-800">SIE 2026 (Público)</span>
              </div>
              <div className="text-2xl font-black text-blue-950">2,488,923</div>
              <div className="text-[11px] text-blue-700 font-bold mt-1">Fiscal y Convenio en Aula</div>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 relative overflow-hidden">
              <div className="flex items-center gap-2 mb-1.5">
                <Users className="w-4 h-4 text-slate-600" />
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-500">Población 4-17 (INE 26)</span>
              </div>
              <div className="text-2xl font-black text-slate-900">3,160,110</div>
              <div className="text-[11px] text-slate-500 font-bold mt-1">78.8% cobertura pública</div>
            </div>

            <div className="bg-white rounded-2xl border border-rose-100 shadow-sm p-4 relative overflow-hidden">
              <div className="flex items-center gap-2 mb-1.5">
                <TrendingDown className="w-4 h-4 text-rose-600" />
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-500">Proyección 2031 Total</span>
              </div>
              <div className="text-2xl font-black text-rose-700">~2,495,664</div>
              <div className="text-[11px] text-rose-600 font-bold mt-1">-455K vs pico (-15.4%)</div>
            </div>
          </div>

          {/* Gráfico Principal: Evolución Histórica y Proyección por Nivel (2011 – 2031) */}
          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 sm:p-7 space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-indigo-600" />
                  Evolución Histórica y Proyección de la Matrícula Escolar (2011 – 2031) por Nivel
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Comparativa de Inicial, Primaria y Secundaria · Línea sólida: INE Real / SIE 2026 · Línea punteada: Proyección Demográfica
                </p>
              </div>

              {/* Selector de Niveles */}
              <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-2xl border border-slate-200">
                {[
                  { id: "COMPARATIVA", label: "Comparar 3 Niveles" },
                  { id: "PRIMARIA", label: "Primaria" },
                  { id: "SECUNDARIA", label: "Secundaria" },
                  { id: "INICIAL", label: "Inicial" },
                  { id: "TOTAL", label: "Total General" },
                ].map((btn) => (
                  <button
                    key={btn.id}
                    onClick={() => setNivelFiltro(btn.id as any)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer ${nivelFiltro === btn.id
                      ? "bg-white text-slate-900 shadow-sm"
                      : "text-slate-600 hover:text-slate-900"
                      }`}
                  >
                    {btn.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Leyenda y Colores de los Niveles */}
            <div className="flex flex-wrap items-center gap-4 text-xs font-bold pt-1">
              {(isComparativa || nivelFiltro === "PRIMARIA") && (
                <span className="flex items-center gap-1.5 text-indigo-700">
                  <span className="w-3.5 h-3.5 rounded-full bg-indigo-600 inline-block" />
                  Nivel Primaria (Pico 2022: 1.39M → SIE 2026: 1.31M → Proy 2031: 1.05M)
                </span>
              )}
              {(isComparativa || nivelFiltro === "SECUNDARIA") && (
                <span className="flex items-center gap-1.5 text-teal-700">
                  <span className="w-3.5 h-3.5 rounded-full bg-teal-600 inline-block" />
                  Nivel Secundaria (Crecimiento hasta 2028: 1.26M → SIE 2026: 1.23M → Proy 2031: 1.22M)
                </span>
              )}
              {(isComparativa || nivelFiltro === "INICIAL") && (
                <span className="flex items-center gap-1.5 text-amber-700">
                  <span className="w-3.5 h-3.5 rounded-full bg-amber-500 inline-block" />
                  Nivel Inicial (Pico 2020: 371K → SIE 2026: 268K → Proy 2031: 209K)
                </span>
              )}
              {isTotal && (
                <span className="flex items-center gap-1.5 text-slate-800">
                  <span className="w-3.5 h-3.5 rounded-full bg-slate-900 inline-block" />
                  Total Nacional Consolidado (Pico 2023: 2.95M → SIE 2026: 2.81M → Proy 2031: 2.49M)
                </span>
              )}
            </div>

            {/* SVG Curva por Niveles 2011-2031 */}
            <div className="relative w-full overflow-x-auto pt-2 pb-2">
              <svg viewBox="0 0 960 420" className="w-full min-w-[780px] h-[420px] overflow-visible">
                {/* Guías horizontales de escala */}
                {(() => {
                  const guides = isTotal
                    ? [2400000, 2600000, 2800000, 3000000]
                    : [300000, 600000, 900000, 1200000, 1500000];

                  return guides.map((val) => {
                    const y = 360 - ((val - yMin) / range) * 300;
                    return (
                      <g key={val}>
                        <line x1={55} y1={y} x2={930} y2={y} stroke="#f1f5f9" strokeWidth="1" />
                        <text x={45} y={y + 3} textAnchor="end" fontSize="11" fill="#94a3b8" fontWeight="600">
                          {(val / 1000000).toFixed(2)}M
                        </text>
                      </g>
                    );
                  });
                })()}

                <line x1={55} y1={360} x2={930} y2={360} stroke="#cbd5e1" strokeWidth="1.5" />

                {(() => {
                  const pts = SERIE_NIVELES_2011_2031;
                  const totalCount = pts.length;
                  const getX = (idx: number) => 65 + idx * ((850) / (totalCount - 1));
                  const getY = (val: number) => 360 - ((val - yMin) / range) * 300;

                  // Renderizador de línea de un nivel
                  const renderCurve = (
                    field: "inicial" | "primaria" | "secundaria" | "total",
                    color: string,
                    label: string
                  ) => {
                    const hist = pts.slice(0, 16); // 2011 a 2026
                    const proy = pts.slice(15); // 2026 a 2031

                    const pathHist = hist.map((p, i) => `${i === 0 ? "M" : "L"} ${getX(i)} ${getY(p[field])}`).join(" ");
                    const pathProy = proy.map((p, i) => `${i === 0 ? "M" : "L"} ${getX(15 + i)} ${getY(p[field])}`).join(" ");

                    return (
                      <g key={field}>
                        <path d={pathHist} fill="none" stroke={color} strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
                        <path d={pathProy} fill="none" stroke={color} strokeWidth="4" strokeDasharray="7,5" strokeLinecap="round" />

                        {/* Nodos clave: 2011, 2020, 2023, 2026, 2031 */}
                        {pts.map((p, idx) => {
                          const cx = getX(idx);
                          const cy = getY(p[field]);
                          const isSie26 = p.anio === 2026;
                          const isKeyYear = isSie26 || p.anio === 2011 || p.anio === 2023 || p.anio === 2031;

                          return (
                            <g key={p.anio}>
                              <circle
                                cx={cx}
                                cy={cy}
                                r={isSie26 ? 7 : isKeyYear ? 5 : 3.5}
                                fill={color}
                                stroke="#ffffff"
                                strokeWidth={isSie26 ? 3 : 2}
                              />
                              {isKeyYear && (
                                <text
                                  x={cx}
                                  y={cy - 12}
                                  textAnchor="middle"
                                  fontSize="11"
                                  fill={color}
                                  fontWeight="800"
                                >
                                  {(p[field] / 1000000).toFixed(2)}M
                                </text>
                              )}
                            </g>
                          );
                        })}
                      </g>
                    );
                  };

                  return (
                    <g>
                      {/* Curvas según filtro */}
                      {(isComparativa || nivelFiltro === "PRIMARIA") && renderCurve("primaria", "#4f46e5", "Primaria")}
                      {(isComparativa || nivelFiltro === "SECUNDARIA") && renderCurve("secundaria", "#0d9488", "Secundaria")}
                      {(isComparativa || nivelFiltro === "INICIAL") && renderCurve("inicial", "#f59e0b", "Inicial")}
                      {isTotal && renderCurve("total", "#0f172a", "Total Consolidado")}

                      {/* Eje X de Años */}
                      {pts.map((p, idx) => {
                        const cx = getX(idx);
                        const isKey = p.anio === 2011 || p.anio === 2023 || p.anio === 2026 || p.anio === 2031;
                        return (
                          <text
                            key={p.anio}
                            x={cx}
                            y={378}
                            textAnchor="middle"
                            fontSize={isKey ? "12" : "10"}
                            fill={isKey ? "#0f172a" : "#94a3b8"}
                            fontWeight={isKey ? "800" : "500"}
                          >
                            {p.anio}
                          </text>
                        );
                      })}
                    </g>
                  );
                })()}
              </svg>
            </div>

            {/* Banner Explicativo de Dinámica de Niveles */}
            <div className="bg-indigo-50/80 border border-indigo-200/80 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
              <div className="flex items-start gap-2.5">
                <Info className="w-4 h-4 text-indigo-700 shrink-0 mt-0.5" />
                <div className="text-indigo-950 leading-relaxed">
                  <strong>Hallazgo Clave por Niveles:</strong> La caída de natalidad impactó primero en <strong>Inicial</strong> (que declina desde 2020), luego en <strong>Primaria</strong> (descenso acelerado desde 2022 de 1.39M a 1.05M proyectado en 2031). En contraste, <strong>Secundaria</strong> sostiene matrícula hasta 2028 (1.26M) debido a la cohorte acumulada, antes de descender hacia 2031.
                </div>
              </div>
              <button
                onClick={() => setShowHistoricoTabla(!showHistoricoTabla)}
                className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold cursor-pointer transition-all shadow-sm"
              >
                <FileSpreadsheet className="w-3.5 h-3.5" />
                {showHistoricoTabla ? "Ocultar Matriz 2011-2025" : "Ver Matriz Completa INE"}
                {showHistoricoTabla ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>

          {/* Matriz Histórica INE Detallada (Desplegable) */}
          {showHistoricoTabla && (
            <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 overflow-hidden animate-fadeIn">
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-sm font-black text-slate-900 flex items-center gap-2">
                  <FileSpreadsheet className="w-4 h-4 text-indigo-600" />
                  Matriz de Crecimiento Interanual de la Matrícula Escolar (INE 2011 – 2025 + SIE 2026)
                </h4>
                <span className="text-xs text-slate-400 font-semibold">Subsistema de Educación Regular</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead>
                    <tr className="bg-slate-50 text-slate-600 font-black uppercase tracking-wider border-b border-slate-200">
                      <th className="px-3 py-2.5">Gestión</th>
                      <th className="px-3 py-2.5 text-indigo-700">Matrícula Total</th>
                      <th className="px-3 py-2.5">Variación Anual</th>
                      <th className="px-3 py-2.5">Tasa Crec. (%)</th>
                      <th className="px-3 py-2.5">Sector Público</th>
                      <th className="px-3 py-2.5">Sector Privado</th>
                      <th className="px-3 py-2.5 text-indigo-700">Primaria</th>
                      <th className="px-3 py-2.5 text-teal-700">Secundaria</th>
                      <th className="px-3 py-2.5 text-amber-700">Inicial</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                    {INE_HISTORICO_MATRICULA.map((row) => {
                      const isPico = row.anio === 2023;
                      return (
                        <tr key={row.anio} className={`hover:bg-slate-50 transition-colors ${isPico ? "bg-emerald-50/70 font-bold" : ""}`}>
                          <td className="px-3 py-2 font-black text-slate-900 flex items-center gap-1.5">
                            {row.anio}
                            {isPico && <span className="text-[9px] bg-emerald-600 text-white px-1.5 py-0.2 rounded font-black">PICO</span>}
                          </td>
                          <td className="px-3 py-2 font-black text-indigo-700">{row.total.toLocaleString()}</td>
                          <td className={`px-3 py-2 font-bold ${row.variacion > 0 ? "text-emerald-600" : row.variacion < 0 ? "text-rose-600" : "text-slate-400"}`}>
                            {row.anio === 2011 ? "Año base" : `${row.variacion > 0 ? "+" : ""}${row.variacion.toLocaleString()}`}
                          </td>
                          <td className={`px-3 py-2 font-bold ${row.tasa > 0 ? "text-emerald-600" : row.tasa < 0 ? "text-rose-600" : "text-slate-400"}`}>
                            {row.anio === 2011 ? "-" : `${row.tasa > 0 ? "+" : ""}${row.tasa}%`}
                          </td>
                          <td className="px-3 py-2">{row.publico.toLocaleString()}</td>
                          <td className="px-3 py-2">{row.privado.toLocaleString()}</td>
                          <td className="px-3 py-2 font-semibold text-indigo-700">{row.primaria.toLocaleString()}</td>
                          <td className="px-3 py-2 font-semibold text-teal-700">{row.secundaria.toLocaleString()}</td>
                          <td className="px-3 py-2 font-semibold text-amber-700">{row.inicial.toLocaleString()}</td>
                        </tr>
                      );
                    })}
                    {/* Fila Especial SIE 2026 */}
                    <tr className="bg-blue-50/90 font-black text-blue-950 border-t-2 border-blue-300">
                      <td className="px-3 py-2.5 text-blue-900 flex items-center gap-1.5">
                        2026
                        <span className="text-[9px] bg-blue-700 text-white px-1.5 py-0.2 rounded font-black">SIE REAL</span>
                      </td>
                      <td className="px-3 py-2.5 text-blue-900">{SIE_2026_TOTAL.toLocaleString()}</td>
                      <td className="px-3 py-2.5 text-rose-600">-83,739</td>
                      <td className="px-3 py-2.5 text-rose-600">-2.9%</td>
                      <td className="px-3 py-2.5 text-emerald-800 font-black">{SIE_2026_PUBLICO_TOTAL.toLocaleString()}</td>
                      <td className="px-3 py-2.5 text-slate-400">{SIE_2026_PRIVADO_TOTAL.toLocaleString()}</td>
                      <td className="px-3 py-2.5 text-indigo-800">1,310,438</td>
                      <td className="px-3 py-2.5 text-teal-800">1,235,838</td>
                      <td className="px-3 py-2.5 text-amber-800">268,886</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ═══════════════════════════════════════════════════════════════════ */}
          {/* RADIOGRAFÍA DEPARTAMENTAL: SIE 2026 (PÚBLICO) VS POBLACIÓN INE     */}
          {/* ═══════════════════════════════════════════════════════════════════ */}
          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                  <Building2 className="w-5 h-5 text-indigo-600" />
                  Radiografía Departamental: Matrícula SIE 2026 (Sector Público) vs Población INE (4–17 años)
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  * Se toma en cuenta exclusivamente el <strong>Sector Público (Fiscal y Convenio)</strong> de la matrícula SIE para comparar con la población total escolar INE.
                </p>
              </div>
              <span className="text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-1 rounded-full">
                Solo Sector Público: 2,488,923 Estudiantes
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead>
                  <tr className="bg-slate-50 text-slate-600 font-bold uppercase tracking-wider border-b border-slate-100">
                    <th className="px-3 py-2.5">Departamento</th>
                    <th className="px-3 py-2.5 text-blue-700">Matrícula SIE 2026 (Público)</th>
                    <th className="px-3 py-2.5 text-slate-700">Población INE 2024 (4-17)</th>
                    <th className="px-3 py-2.5 text-slate-700">Población INE 2026 (4-17)</th>
                    <th className="px-3 py-2.5 text-rose-600">Población INE 2031 (4-17)</th>
                    {/* <th className="px-3 py-2.5 text-emerald-700">Cobertura Pública (SIE/INE)</th> */}
                    {/* <th className="px-3 py-2.5">Var. INE (24→31)</th> */}
                    <th className="px-3 py-2.5">Tendencia</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                  {dptosAnalisis.map((dpto) => (
                    <tr key={dpto.nombre} className="hover:bg-slate-50 transition-colors">
                      <td className="px-3 py-2.5 font-black text-slate-900">{dpto.nombre}</td>
                      <td className="px-3 py-2.5 font-black text-blue-700">{dpto.matricula_sie_publico.toLocaleString()}</td>
                      <td className="px-3 py-2.5">{dpto.ine_2024.toLocaleString()}</td>
                      <td className="px-3 py-2.5">{dpto.ine_2026.toLocaleString()}</td>
                      <td className="px-3 py-2.5 font-bold text-rose-600">{dpto.ine_2031.toLocaleString()}</td>
                      {/* <td className="px-3 py-2.5 font-black text-emerald-700">{dpto.tasa_cobertura_publica}%</td> */}
                      {/* <td className={`px-3 py-2.5 font-black ${dpto.variacion_pct < 0 ? "text-rose-600" : "text-emerald-600"}`}>
                        {dpto.variacion_pct > 0 ? "+" : ""}{dpto.variacion_pct}%
                      </td> */}
                      <td className="px-3 py-2.5">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black border ${dpto.tendencia === "EXPANSION"
                            ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                            : dpto.tendencia === "ESTABLE"
                              ? "bg-amber-50 text-amber-700 border-amber-200"
                              : "bg-rose-50 text-rose-700 border-rose-200"
                            }`}
                        >
                          {dpto.tendencia === "EXPANSION" && <TrendingUp className="w-3 h-3" />}
                          {dpto.tendencia === "ESTABLE" && <Activity className="w-3 h-3" />}
                          {dpto.tendencia === "CONTRACCION" && <TrendingDown className="w-3 h-3" />}
                          {dpto.tendencia}
                        </span>
                      </td>
                    </tr>
                  ))}
                  {/* Fila Total Nacional */}
                  <tr className="bg-slate-100 font-black text-slate-900 border-t-2 border-slate-300">
                    <td className="px-3 py-2.5">TOTAL NACIONAL (PÚBLICO)</td>
                    <td className="px-3 py-2.5 text-blue-800">{SIE_2026_PUBLICO_TOTAL.toLocaleString()}</td>
                    <td className="px-3 py-2.5">{POB_INE_2024_TOTAL.toLocaleString()}</td>
                    <td className="px-3 py-2.5">{POB_INE_2026_TOTAL.toLocaleString()}</td>
                    <td className="px-3 py-2.5 text-rose-700">{POB_INE_2031_TOTAL.toLocaleString()}</td>
                    {/* <td className="px-3 py-2.5 font-black text-emerald-800">{TASA_COBERTURA_PUBLICA_2026}%</td> */}
                    {/* <td className="px-3 py-2.5 text-rose-700">-13.0%</td> */}
                    <td className="px-3 py-2.5 text-rose-700">CONTRACCIÓN</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      );
    }

    // ═════════════════════════════════════════════════════════════════════════
    // SLIDE 2 — TENDENCIA DE MAESTROS E IMPERTINENCIA EN AULA
    // ═════════════════════════════════════════════════════════════════════════
    if (slide === 1) {
      const dptos = DPTOS_ORDEN;
      const impertLista = IMPERTINENCIA_DPTO_ORDENADA;

      // Dimensiones para gráfico lineal de Impertinencia Departamental
      const maxPct = 30; // 30% max
      const minPct = 10; // 10% min
      const rangePct = maxPct - minPct;

      return (
        <div className="space-y-6">
          {/* Encabezado Diapositiva 2 */}
          <div className="bg-gradient-to-r from-emerald-950 via-teal-900 to-emerald-900 text-white rounded-3xl p-6 sm:p-8 relative overflow-hidden shadow-2xl border border-emerald-800/40">
            <div className="absolute -left-10 -bottom-8 w-80 h-80 bg-emerald-400/10 rounded-full blur-3xl pointer-events-none" />
            <div className="relative z-10">
              <div className="flex flex-wrap items-center gap-2 mb-2">
                <div className="w-8 h-8 rounded-full bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center">
                  <Users className="w-4 h-4 text-emerald-300" />
                </div>
                <span className="text-xs font-black text-emerald-300 uppercase tracking-widest">
                  Diapositiva 2 de 3 · Auditoría de Planilla y Padrón Docente
                </span>
                <span className="ml-auto bg-emerald-500/20 text-emerald-200 border border-emerald-400/30 text-[10px] font-black px-2.5 py-1 rounded-full">
                  Padrón SEP 2024–2026 · 164.448 Registros
                </span>
              </div>
              <h2 className="text-2xl sm:text-4xl font-black tracking-tight text-white">
                Tendencia Docente e Impertinencia en Aula
              </h2>
              <p className="text-emerald-200 text-sm mt-1 max-w-3xl leading-relaxed">
                Diagnóstico de asignación de horas docentes: evolución del padrón 2024–2026, tasa de rotación anual, salientes/entrantes e impertinencia departamental en aula regular.
              </p>
            </div>
          </div>

          {/* 4 KPIs Generales del Padrón Docente */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              { label: "Maestros 2024", value: d2.total_2024.toLocaleString(), sub: "Planilla regular", icon: <Users className="w-5 h-5 text-slate-500" />, color: "bg-slate-50 border-slate-200 text-slate-800" },
              { label: "Maestros 2025", value: d2.total_2025.toLocaleString(), sub: "Planilla regular", icon: <Users className="w-5 h-5 text-blue-500" />, color: "bg-blue-50 border-blue-200 text-blue-900" },
              { label: "Maestros en Aula 2026", value: d2.total_2026.toLocaleString(), sub: "Padrón activo SEP", icon: <Users className="w-5 h-5 text-emerald-600" />, color: "bg-emerald-50 border-emerald-200 text-emerald-900" },
              { label: "Crecimiento Neto (24–26)", value: `+${d2.crecimiento_24_26_neto.toLocaleString()}`, sub: `+${d2.crecimiento_24_26_pct}% en 2 años`, icon: <TrendingUp className="w-5 h-5 text-emerald-600" />, color: "bg-emerald-50 border-emerald-300 text-emerald-900" },
            ].map((k) => (
              <div key={k.label} className={`rounded-2xl border p-4 ${k.color}`}>
                <div className="flex items-center gap-2 mb-1">{k.icon}<span className="text-[11px] font-bold uppercase tracking-wide opacity-70">{k.label}</span></div>
                <div className="text-2xl font-black">{k.value}</div>
                <div className="text-xs mt-0.5 opacity-60 font-medium">{k.sub}</div>
              </div>
            ))}
          </div>

          {/* ═══════════════════════════════════════════════════════════════════ */}
          {/* MÓDULO PRINCIPAL: IMPERTINENCIA EN AULA EN GRÁFICO LINEAL           */}
          {/* ═══════════════════════════════════════════════════════════════════ */}
          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 sm:p-7 space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-base sm:text-lg font-black text-slate-900 flex items-center gap-2">
                  <ShieldAlert className="w-5 h-5 text-rose-600" />
                  Impertinencia en Aula (Padrón 2026) por Departamento
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Porcentaje de docentes frente a grupo que no poseen la especialidad de la materia impartida · Promedio Nacional: <strong>17.2% (28,323 maestros)</strong>
                </p>
              </div>

              <div className="flex items-center gap-3 text-xs font-bold">
                <span className="flex items-center gap-1.5 text-rose-700">
                  <span className="w-3 h-3 rounded-full bg-rose-600 inline-block" />
                  Tasa de Impertinencia (%)
                </span>
                <span className="flex items-center gap-1.5 text-slate-500">
                  <span className="w-3 h-0.5 border-t-2 border-dashed border-slate-400 inline-block" />
                  Promedio Nacional (17.2%)
                </span>
              </div>
            </div>

            {/* Gráfico Lineal SVG de Impertinencia por Departamento */}
            <div className="relative w-full overflow-x-auto pt-3 pb-2">
              <svg viewBox="0 0 960 400" className="w-full min-w-[760px] h-[400px] overflow-visible">
                {/* Zonas de severidad de fondo */}
                {/* Zona Crítica: >= 20% */}
                <rect x={55} y={30} width={875} height={140} fill="#fff1f2" opacity="0.5" />
                <text x={920} y={50} textAnchor="end" fontSize="11" fill="#e11d48" fontWeight="800">
                  ZONA CRÍTICA (&gt; 20%)
                </text>

                {/* Zona Moderada: 16% a 20% */}
                <rect x={55} y={170} width={875} height={56} fill="#fffbeb" opacity="0.5" />
                <text x={920} y={190} textAnchor="end" fontSize="11" fill="#d97706" fontWeight="800">
                  ZONA MODERADA (16% - 20%)
                </text>

                {/* Guías horizontales */}
                {[15, 17.2, 20, 25, 30].map((pct) => {
                  const y = 340 - ((pct - minPct) / rangePct) * 280;
                  const isRef = pct === 17.2;
                  return (
                    <g key={pct}>
                      <line
                        x1={55}
                        y1={y}
                        x2={930}
                        y2={y}
                        stroke={isRef ? "#f43f5e" : "#f1f5f9"}
                        strokeWidth={isRef ? 1.5 : 1}
                        strokeDasharray={isRef ? "5,4" : "none"}
                      />
                      <text x={45} y={y + 3} textAnchor="end" fontSize="11" fill={isRef ? "#f43f5e" : "#94a3b8"} fontWeight={isRef ? "800" : "600"}>
                        {pct}%
                      </text>
                    </g>
                  );
                })}

                <line x1={55} y1={340} x2={930} y2={340} stroke="#cbd5e1" strokeWidth="1.5" />

                {(() => {
                  const items = impertLista;
                  const count = items.length;
                  const getX = (idx: number) => 85 + idx * ((800) / (count - 1));
                  const getY = (val: number) => 340 - ((val - minPct) / rangePct) * 280;

                  const pathD = items.map((it, i) => `${i === 0 ? "M" : "L"} ${getX(i)} ${getY(it.pct)}`).join(" ");
                  const areaD = `M ${getX(0)} 340 ` + items.map((it, i) => `L ${getX(i)} ${getY(it.pct)}`).join(" ") + ` L ${getX(count - 1)} 340 Z`;

                  return (
                    <g>
                      <defs>
                        <linearGradient id="gradImpert" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#f43f5e" stopOpacity="0.2" />
                          <stop offset="100%" stopColor="#f43f5e" stopOpacity="0.02" />
                        </linearGradient>
                      </defs>

                      <path d={areaD} fill="url(#gradImpert)" />
                      <path d={pathD} fill="none" stroke="#e11d48" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />

                      {items.map((it, idx) => {
                        const cx = getX(idx);
                        const cy = getY(it.pct);
                        const isCrit = it.pct >= 20;

                        return (
                          <g key={it.nombre}>
                            {/* Punto */}
                            <circle
                              cx={cx}
                              cy={cy}
                              r={isCrit ? 8 : 6}
                              fill={isCrit ? "#e11d48" : it.pct >= 16 ? "#f59e0b" : "#10b981"}
                              stroke="#ffffff"
                              strokeWidth={2.5}
                            />

                            {/* Badge con porcentaje */}
                            <rect
                              x={cx - 25}
                              y={cy - 30}
                              width={50}
                              height={20}
                              rx={5}
                              fill={isCrit ? "#be123c" : it.pct >= 16 ? "#d97706" : "#059669"}
                            />
                            <text
                              x={cx}
                              y={cy - 16}
                              textAnchor="middle"
                              fontSize="11"
                              fill="#ffffff"
                              fontWeight="800"
                            >
                              {it.pct}%
                            </text>

                            {/* Nombre del Departamento en el eje X */}
                            <text
                              x={cx}
                              y={358}
                              textAnchor="middle"
                              fontSize="12"
                              fill="#0f172a"
                              fontWeight="800"
                            >
                              {it.nombre}
                            </text>
                            <text
                              x={cx}
                              y={374}
                              textAnchor="middle"
                              fontSize="10"
                              fill="#64748b"
                              fontWeight="600"
                            >
                              {it.impertinentes.toLocaleString()} imp.
                            </text>
                          </g>
                        );
                      })}
                    </g>
                  );
                })()}
              </svg>
            </div>

            {/* Tabla Resumen de Impertinencia por Departamento */}
            <div className="overflow-x-auto pt-2">
              <table className="w-full text-xs text-left">
                <thead>
                  <tr className="bg-slate-50 text-slate-600 font-bold uppercase tracking-wider border-b border-slate-100">
                    <th className="px-3 py-2.5">Departamento</th>
                    <th className="px-3 py-2.5 text-slate-800">Total Docentes en Aula</th>
                    <th className="px-3 py-2.5 text-rose-600">Docentes Impertinentes</th>
                    <th className="px-3 py-2.5 text-emerald-600">Docentes Pertinentes</th>
                    <th className="px-3 py-2.5 text-rose-700">Tasa Impertinencia (%)</th>
                    <th className="px-3 py-2.5">Nivel de Alerta</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                  {impertLista.map((row) => (
                    <tr key={row.nombre} className="hover:bg-slate-50 transition-colors">
                      <td className="px-3 py-2 font-black text-slate-900">{row.nombre}</td>
                      <td className="px-3 py-2 font-bold">{row.total.toLocaleString()}</td>
                      <td className="px-3 py-2 font-black text-rose-600">{row.impertinentes.toLocaleString()}</td>
                      <td className="px-3 py-2 font-bold text-emerald-700">{row.pertinentes.toLocaleString()}</td>
                      <td className="px-3 py-2 font-black text-rose-700">{row.pct}%</td>
                      <td className="px-3 py-2">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black border ${row.nivel === "CRITICO"
                            ? "bg-rose-100 text-rose-800 border-rose-300"
                            : row.nivel === "MODERADO"
                              ? "bg-amber-100 text-amber-800 border-amber-300"
                              : "bg-emerald-100 text-emerald-800 border-emerald-300"
                            }`}
                        >
                          {row.nivel}
                        </span>
                      </td>
                    </tr>
                  ))}
                  {/* Fila Total Nacional */}
                  <tr className="bg-slate-100 font-black text-slate-900 border-t-2 border-slate-300">
                    <td className="px-3 py-2.5">TOTAL NACIONAL (9 Dptos)</td>
                    <td className="px-3 py-2.5">164,448</td>
                    <td className="px-3 py-2.5 text-rose-700">28,323</td>
                    <td className="px-3 py-2.5 text-emerald-800">136,125</td>
                    <td className="px-3 py-2.5 text-rose-700">17.2%</td>
                    <td className="px-3 py-2.5 text-amber-800">MODERADO</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* ═══════════════════════════════════════════════════════════════════ */}
          {/* MÓDULO INFERIOR: SALIENTES/ENTRANTES + MAESTROS SIN CARGO         */}
          {/* ═══════════════════════════════════════════════════════════════════ */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {/* Salientes vs Entrantes */}
            <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-5 sm:p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
                  <ArrowRight className="w-4 h-4 text-slate-500" />
                  Salientes vs Entrantes de Planilla 2024–2025 por Dpto.
                </h3>
                <div className="flex items-center gap-3 text-xs font-semibold">
                  <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-rose-400 inline-block" /> Salientes</span>
                  <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-emerald-500 inline-block" /> Entrantes</span>
                </div>
              </div>

              <div className="space-y-3">
                {dptos.map((dpto) => {
                  const sal = d2.salientes_dpto[dpto] || 0;
                  const ent = d2.entrantes_dpto[dpto] || 0;
                  const maxV = Math.max(sal, ent, 1);
                  const balance = ent - sal;
                  return (
                    <div key={dpto}>
                      <div className="flex items-center justify-between text-xs mb-1">
                        <span className="font-bold text-slate-800 w-24">{dpto}</span>
                        <div className="flex items-center gap-3">
                          <span className="text-rose-600 font-semibold flex items-center gap-0.5"><UserMinus className="w-3 h-3" />{sal}</span>
                          <span className="text-emerald-600 font-semibold flex items-center gap-0.5"><UserPlus className="w-3 h-3" />{ent}</span>
                          <span className={`font-black text-[11px] px-1.5 py-0.5 rounded-full ${balance >= 0 ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"}`}>
                            {balance >= 0 ? "+" : ""}{balance}
                          </span>
                        </div>
                      </div>
                      <div className="space-y-0.5">
                        <div className="h-2.5 w-full bg-slate-100 rounded-full overflow-hidden">
                          <div className="h-full bg-rose-400 rounded-full" style={{ width: `${(sal / maxV) * 100}%` }} />
                        </div>
                        <div className="h-2.5 w-full bg-slate-100 rounded-full overflow-hidden">
                          <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${(ent / maxV) * 100}%` }} />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="mt-4 pt-3 border-t border-slate-100 grid grid-cols-2 gap-2 text-xs">
                <div className="bg-rose-50 border border-rose-100 rounded-xl p-2.5 text-center">
                  <div className="text-rose-600 font-black text-lg">{d2.salientes_24_25.toLocaleString()}</div>
                  <div className="text-rose-700 font-semibold">Total Salientes Nacional</div>
                </div>
                <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-2.5 text-center">
                  <div className="text-emerald-600 font-black text-lg">{d2.entrantes_24_25.toLocaleString()}</div>
                  <div className="text-emerald-700 font-semibold">Total Entrantes Nacional</div>
                </div>
              </div>
            </div>

            {/* Maestros Sin Cargo */}
            <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-5 sm:p-6 space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <h3 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-500" />
                  Maestros Sin Cargo por Departamento (2026)
                </h3>
                <span className="text-xs font-black text-amber-800 bg-amber-50 border border-amber-200 rounded-full px-2.5 py-0.5">
                  Total: {d2.sin_cargo_2026_total.toLocaleString()}
                </span>
              </div>

              <p className="text-xs text-slate-500">
                Docentes en planilla fiscal que no tienen horas asignadas a un curso específico, representando capacidad ociosa susceptible de reubicación hacia déficit UIE.
              </p>

              <div className="space-y-2">
                {dptos.map((dpto) => {
                  const sc = d2.sin_cargo_dpto[dpto] || 0;
                  return (
                    <div key={dpto} className="flex items-center gap-2 text-xs">
                      <span className="font-bold text-slate-700 w-24">{dpto}</span>
                      <div className="flex-1 h-3 bg-slate-100 rounded-full overflow-hidden">
                        <div className="h-full bg-amber-400 rounded-full" style={{ width: `${(sc / maxSinCargo) * 100}%` }} />
                      </div>
                      <span className="font-black text-amber-700 w-10 text-right">{sc}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      );
    }

    // ═════════════════════════════════════════════════════════════════════════
    // SLIDE 3 — PROYECCIÓN EGRESADOS ESFM
    // ═════════════════════════════════════════════════════════════════════════
    if (slide === 2) {
      const maxLineChart = selectedEsp
        ? Math.max(selectedEsp.demanda_proyectada_2031, selectedEsp.egresados_proyectados_2031, 10)
        : 1;

      return (
        <div className="space-y-6">
          {/* Encabezado */}
          <div className="bg-gradient-to-r from-amber-950 via-orange-900 to-amber-900 text-white rounded-3xl p-6 sm:p-8 relative overflow-hidden shadow-2xl border border-amber-800/40">
            <div className="absolute -right-8 -top-8 w-80 h-80 bg-amber-400/10 rounded-full blur-3xl pointer-events-none" />
            <div className="relative z-10">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-8 h-8 rounded-full bg-amber-500/20 border border-amber-400/30 flex items-center justify-center">
                  <GraduationCap className="w-4 h-4 text-amber-300" />
                </div>
                <span className="text-xs font-black text-amber-300 uppercase tracking-widest">
                  Diapositiva 3 de 3 · Oferta ESFM vs Demanda en Unidades Educativas
                </span>
              </div>
              <h2 className="text-2xl sm:text-4xl font-black tracking-tight text-white">
                Calculo de Apertura de Especialidades ESFM 2031
              </h2>
              <p className="text-amber-200 text-sm mt-1 max-w-2xl">
                Modelo de correspondencia curricular: Déficit de horas UIE auditadas vs egresados proyectados de las ESFM.
              </p>
            </div>
          </div>

          {/* KPIs ESFM */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              {
                label: "Inscritos Activos ESFM 2022-26",
                value: (
                  d3?.total_inscritos_activas_2022_2026 ??
                  d3?.total_inscritos_activas_2021_2026 ??
                  17616
                ).toLocaleString(),
                color: "bg-amber-50 border-amber-200 text-amber-900",
                icon: <School className="w-5 h-5 text-amber-600" />,
              },
              {
                label: "Egresados Proyectados 2026-31",
                value: (
                  d3?.total_egresados_proyectados_2026_2031 ?? 14429
                ).toLocaleString(),
                color: "bg-orange-50 border-orange-200 text-orange-900",
                icon: <GraduationCap className="w-5 h-5 text-orange-600" />,
              },
              {
                label: "Tasa de Titulación Histórica",
                value: `${d3?.tasa_titulacion_historica ?? 82}%`,
                color: "bg-emerald-50 border-emerald-200 text-emerald-900",
                icon: <Award className="w-5 h-5 text-emerald-600" />,
              },
              {
                label: "Especialidades Oficiales",
                value: `${data.metadatos?.total_especialidades_oficiales ?? 20}`,
                color: "bg-slate-50 border-slate-200 text-slate-800",
                icon: <Layers className="w-5 h-5 text-slate-500" />,
              },
            ].map((k) => (
              <div key={k.label} className={`rounded-2xl border p-4 ${k.color}`}>
                <div className="flex items-center gap-2 mb-1">
                  {k.icon}
                  <span className="text-[11px] font-bold uppercase tracking-wide opacity-70">
                    {k.label}
                  </span>
                </div>
                <div className="text-2xl font-black">{k.value}</div>
              </div>
            ))}
          </div>

          {/* Dictamen resumen */}
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: "ABRIR", count: abrirCount, color: "bg-emerald-50 border-emerald-300 text-emerald-800", icon: <CheckCircle2 className="w-5 h-5 text-emerald-600" />, desc: "Déficit severo en UEs" },
              { label: "REGULAR", count: regularCount, color: "bg-amber-50 border-amber-300 text-amber-800", icon: <AlertTriangle className="w-5 h-5 text-amber-600" />, desc: "Equilibrio vegetativo" },
              { label: "CONGELAR", count: congelarCount, color: "bg-rose-50 border-rose-300 text-rose-800", icon: <XCircle className="w-5 h-5 text-rose-600" />, desc: "Sobreoferta de egresados" },
            ].map((d) => (
              <button
                key={d.label}
                onClick={() => setFilterDictamen(filterDictamen === d.label as any ? "TODOS" : d.label as any)}
                className={`rounded-2xl border p-4 text-left transition-all cursor-pointer hover:shadow-sm active:scale-95 ${d.color} ${filterDictamen === d.label ? "ring-2 ring-offset-1 ring-slate-900" : ""}`}
              >
                <div className="flex items-center gap-2 mb-1">{d.icon}<span className="text-[11px] font-bold uppercase tracking-wide opacity-70">{d.label}</span></div>
                <div className="text-3xl font-black">{d.count}</div>
                <div className="text-xs mt-1 opacity-60">{d.desc}</div>
              </button>
            ))}
          </div>

          {/* Selector de especialidad */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <h3 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
                <Compass className="w-4 h-4 text-indigo-600" />
                Selecciona Especialidad para Análisis Departamental
              </h3>
              <div className="relative w-full sm:w-60">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Buscar especialidad…"
                  value={searchEsp}
                  onChange={(e) => setSearchEsp(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-slate-50/50"
                />
              </div>
            </div>

            <div className="flex flex-wrap gap-2 max-h-48 overflow-y-auto pr-1">
              {espFiltradas.map((esp) => {
                const isSelected = selectedEsp?.especialidad === esp.especialidad;
                return (
                  <button
                    key={esp.especialidad}
                    onClick={() => setSelectedEsp(esp)}
                    className={`px-2.5 py-1.5 rounded-xl text-[11px] font-bold whitespace-nowrap border flex items-center gap-1.5 transition-all cursor-pointer ${isSelected
                      ? "bg-slate-900 text-white border-slate-900 shadow ring-2 ring-indigo-500"
                      : "bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200"
                      }`}
                  >
                    {esp.dictamen === "ABRIR" && <CheckCircle2 className="w-3 h-3 text-emerald-500" />}
                    {esp.dictamen === "REGULAR" && <AlertTriangle className="w-3 h-3 text-amber-500" />}
                    {esp.dictamen === "CONGELAR" && <XCircle className="w-3 h-3 text-rose-500" />}
                    {esp.especialidad}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Detalle especialidad seleccionada */}
          {selectedEsp && (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 pb-4 border-b border-slate-100">
                <div>
                  <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">Especialidad Seleccionada</div>
                  <h3 className="text-2xl font-black text-slate-900">{selectedEsp.especialidad}</h3>
                  <p className="text-xs text-slate-500 mt-1 leading-relaxed max-w-2xl">{selectedEsp.justificacion}</p>
                </div>
                <span className={`shrink-0 px-4 py-2 rounded-2xl text-xs font-black uppercase tracking-wide border flex items-center gap-2 ${selectedEsp.dictamen === "ABRIR" ? "bg-emerald-50 text-emerald-800 border-emerald-300"
                  : selectedEsp.dictamen === "REGULAR" ? "bg-amber-50 text-amber-800 border-amber-300"
                    : "bg-rose-50 text-rose-800 border-rose-300"
                  }`}>
                  {selectedEsp.dictamen === "ABRIR" && <CheckCircle2 className="w-4 h-4 text-emerald-600" />}
                  {selectedEsp.dictamen === "REGULAR" && <AlertTriangle className="w-4 h-4 text-amber-600" />}
                  {selectedEsp.dictamen === "CONGELAR" && <XCircle className="w-4 h-4 text-rose-600" />}
                  {selectedEsp.badge}
                </span>
              </div>

              {/* 6 Stat Cards Oficiales UIE / SIE de la Especialidad */}
              {(() => {
                const nivelKey = selectedEsp.nivel_educativo === "INICIAL" ? "inicial"
                  : selectedEsp.nivel_educativo === "PRIMARIA" ? "primaria"
                    : "secundaria";
                const s2026 = SERIE_NIVELES_2011_2031.find((s) => s.anio === 2026);
                const s2031 = SERIE_NIVELES_2011_2031.find((s) => s.anio === 2031);
                const est2026 = s2026 ? s2026[nivelKey] : 1235838;
                const est2031 = s2031 ? s2031[nivelKey] : 1226934;
                const varDemPct = est2026 > 0 ? Number((((est2031 - est2026) / est2026) * 100).toFixed(1)) : 0;

                return (
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                    {/* Card 1: Docentes */}
                    <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs space-y-1">
                      <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center justify-between">
                        <span>Docentes (Registros)</span>
                        <Users className="w-3.5 h-3.5 text-indigo-600" />
                      </div>
                      <div className="text-xl font-black text-indigo-900">
                        {(selectedEsp.total_docentes || 10379).toLocaleString()}
                      </div>
                      <div className="text-[10px] text-slate-500">Asignaciones en aula regular</div>
                    </div>

                    {/* Card 2: Carga Horaria Total */}
                    <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs space-y-1">
                      <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center justify-between">
                        <span>Carga Horaria Total</span>
                        <TrendingUp className="w-3.5 h-3.5 text-amber-600" />
                      </div>
                      <div className="text-xl font-black text-amber-900">
                        {(selectedEsp.carga_horaria_uie_nacional || 1056288).toLocaleString()}h
                      </div>
                      <div className="text-[10px] text-slate-500">Horas trabajadas aula</div>
                    </div>

                    {/* Card 3: Horas en Planilla */}
                    <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs space-y-1">
                      <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center justify-between">
                        <span>Horas en Planilla</span>
                        <Building2 className="w-3.5 h-3.5 text-purple-600" />
                      </div>
                      <div className="text-xl font-black text-purple-900">
                        {(selectedEsp.horas_planilla_uie_nacional || 1006000).toLocaleString()}h
                      </div>
                      <div className="text-[10px] text-slate-500">Cubiertas por el SEP</div>
                    </div>

                    {/* Card 4: Estudiantes 2026 */}
                    <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs space-y-1">
                      <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center justify-between">
                        <span>Estudiantes 2026</span>
                        <School className="w-3.5 h-3.5 text-blue-600" />
                      </div>
                      <div className="text-xl font-black text-blue-950">
                        {est2026.toLocaleString()}
                      </div>
                      <div className="text-[10px] text-blue-700 font-semibold">
                        FUENTE SIE ({selectedEsp.nivel_educativo || "Secundaria"})
                      </div>
                    </div>

                    {/* Card 5: Estudiantes Proyectados 2031 */}
                    <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs space-y-1">
                      <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center justify-between">
                        <span>Estudiantes Proyectados 2031</span>
                        <TrendingUp className="w-3.5 h-3.5 text-amber-600" />
                      </div>
                      <div className="text-xl font-black text-amber-950">
                        {est2031.toLocaleString()}
                      </div>
                      <div className="text-[10px] font-semibold text-slate-600">
                        FUENTE INE: <span className={varDemPct > 0 ? "text-emerald-700 font-bold" : "text-rose-700 font-bold"}>
                          {varDemPct > 0 ? `+${varDemPct}%` : `${varDemPct}%`}
                        </span> ({selectedEsp.edades_ine || "12 a 17 años"})
                      </div>
                    </div>

                    {/* Card 6: Egresados vs Demanda */}
                    <div className={`p-3.5 rounded-2xl border shadow-xs space-y-1 ${selectedEsp.dictamen === "ABRIR"
                      ? "bg-emerald-50/80 border-emerald-200"
                      : selectedEsp.dictamen === "REGULAR"
                        ? "bg-amber-50/80 border-amber-200"
                        : "bg-rose-50/80 border-rose-200"
                      }`}>
                      <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500 flex items-center justify-between">
                        <span>Egresados vs Demanda</span>
                        <GraduationCap className="w-3.5 h-3.5 text-slate-700" />
                      </div>
                      <div className={`text-xl font-black ${selectedEsp.dictamen === "ABRIR" ? "text-emerald-800" : selectedEsp.dictamen === "REGULAR" ? "text-amber-800" : "text-rose-800"
                        }`}>
                        {selectedEsp.egresados_proyectados_2031} / {selectedEsp.demanda_proyectada_2031}
                      </div>
                      <div className="text-[10px] font-bold text-slate-600">
                        Cobertura 2031: <strong>{selectedEsp.pct_cobertura}%</strong>
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* Gráfico lineal demanda vs egresados con modulador demográfico */}
              <div className="bg-slate-50 rounded-2xl border border-slate-200/90 p-5 shadow-xs space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="text-sm font-extrabold text-slate-800 flex items-center gap-2">
                        <TrendingUp className="w-4 h-4 text-indigo-600" />
                        Demanda en UEs vs Oferta de Egresados ESFM (2026–2031)
                      </h4>
                      <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full border ${selectedEsp.nivel_educativo === "INICIAL"
                        ? "bg-amber-100 text-amber-800 border-amber-300"
                        : selectedEsp.nivel_educativo === "PRIMARIA"
                          ? "bg-indigo-100 text-indigo-800 border-indigo-300"
                          : "bg-teal-100 text-teal-800 border-teal-300"
                        }`}>
                        Nivel: {selectedEsp.nivel_educativo || "SECUNDARIA"} ({selectedEsp.edades_ine || "12 a 17 años"})
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500">
                      Punto de partida 2026 con déficit auditado en aula UIE · Modulado con la variación de población escolar INE · Egresados reales DGFM
                    </p>
                  </div>

                  <div className="flex items-center gap-3">
                    {/* Toggle modo egresados */}
                    <div className="inline-flex rounded-lg border border-slate-200 p-0.5 bg-white text-[11px] font-bold">
                      <button
                        onClick={() => setModoEgresadosGrafico("ACUMULADO")}
                        className={`px-2.5 py-1 rounded-md transition-all cursor-pointer ${modoEgresadosGrafico === "ACUMULADO"
                          ? "bg-amber-500 text-white shadow-xs"
                          : "text-slate-600 hover:bg-slate-100"
                          }`}
                      >
                        Acumulado
                      </button>
                      <button
                        onClick={() => setModoEgresadosGrafico("ANUAL")}
                        className={`px-2.5 py-1 rounded-md transition-all cursor-pointer ${modoEgresadosGrafico === "ANUAL"
                          ? "bg-amber-500 text-white shadow-xs"
                          : "text-slate-600 hover:bg-slate-100"
                          }`}
                      >
                        Anual (DGFM)
                      </button>
                    </div>

                    <div className="flex items-center gap-3 text-[11px] font-semibold">
                      <span className="flex items-center gap-1.5 text-indigo-900">
                        <span className="w-3 h-1 bg-indigo-600 rounded inline-block" /> Demanda (ítems)
                      </span>
                      <span className="flex items-center gap-1.5 text-amber-900">
                        <span className="w-3 h-1 bg-amber-500 rounded inline-block border-dashed" /> Egresados {modoEgresadosGrafico === "ACUMULADO" ? "Acum." : "Anual"}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Gráfica SVG de Alta Legibilidad */}
                <div className="bg-white rounded-xl border border-slate-200/80 p-4 pt-6 shadow-xs">
                  <svg viewBox="0 0 760 380" className="w-full h-[380px] overflow-visible">
                    <defs>
                      <linearGradient id="demAreaGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#4f46e5" stopOpacity="0.12" />
                        <stop offset="100%" stopColor="#4f46e5" stopOpacity="0.0" />
                      </linearGradient>
                      <linearGradient id="egrAreaGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.10" />
                        <stop offset="100%" stopColor="#f59e0b" stopOpacity="0.0" />
                      </linearGradient>
                    </defs>

                    {/* Guías horizontales */}
                    {[60, 120, 180, 240, 310].map((y) => (
                      <line key={y} x1={50} y1={y} x2={710} y2={y} stroke="#f1f5f9" strokeWidth="1.2" strokeDasharray="4,4" />
                    ))}
                    <line x1={50} y1={310} x2={710} y2={310} stroke="#cbd5e1" strokeWidth="2" />

                    {(() => {
                      const minV = 0;
                      const maxV = Math.max(
                        ...lineChartPoints.map((p) => Math.max(p.demanda, p.egresados)),
                        10
                      ) * 1.25;
                      const getX = (i: number) => 85 + i * 115;
                      const getY = (v: number) => 310 - ((v - minV) / (maxV || 1)) * 250;

                      const pathDem = lineChartPoints.map((p, i) => `${i === 0 ? "M" : "L"} ${getX(i)} ${getY(p.demanda)}`).join(" ");
                      const pathEgr = lineChartPoints.map((p, i) => `${i === 0 ? "M" : "L"} ${getX(i)} ${getY(p.egresados)}`).join(" ");

                      return (
                        <g>
                          {/* Líneas verticales tenues por año */}
                          {lineChartPoints.map((_, i) => (
                            <line
                              key={i}
                              x1={getX(i)}
                              y1={35}
                              x2={getX(i)}
                              y2={310}
                              stroke="#f8fafc"
                              strokeWidth="1.5"
                            />
                          ))}

                          {/* Curvas principales */}
                          <path
                            d={pathDem}
                            fill="none"
                            stroke="#4f46e5"
                            strokeWidth="3.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                          <path
                            d={pathEgr}
                            fill="none"
                            stroke="#d97706"
                            strokeWidth="3.5"
                            strokeDasharray="7,5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />

                          {/* Puntos y Etiquetas con Badges */}
                          {lineChartPoints.map((p, i) => {
                            const cx = getX(i);
                            const cyDem = getY(p.demanda);
                            const cyEgr = getY(p.egresados);

                            // Algoritmo anti-colisión para las etiquetas
                            const diffY = Math.abs(cyDem - cyEgr);
                            const isClose = diffY < 30;
                            const demOnTop = cyDem <= cyEgr;

                            const demBadgeY = isClose ? (demOnTop ? cyDem - 18 : cyDem + 18) : cyDem - 18;
                            const egrBadgeY = isClose ? (demOnTop ? cyEgr + 18 : cyEgr - 18) : cyEgr + 18;

                            return (
                              <g key={p.anio}>
                                {/* Líneas conectoras a los puntos */}
                                <line x1={cx} y1={cyDem} x2={cx} y2={demBadgeY} stroke="#c7d2fe" strokeWidth="1" strokeDasharray="2,2" />
                                <line x1={cx} y1={cyEgr} x2={cx} y2={egrBadgeY} stroke="#fde68a" strokeWidth="1" strokeDasharray="2,2" />

                                {/* Punto Demanda */}
                                <circle cx={cx} cy={cyDem} r="6" fill="#4f46e5" stroke="#ffffff" strokeWidth="2.5" className="drop-shadow-sm" />

                                {/* Badge Número Demanda */}
                                <g transform={`translate(${cx}, ${demBadgeY})`}>
                                  <rect
                                    x="-30"
                                    y="-12"
                                    width="60"
                                    height="20"
                                    rx="6"
                                    fill="#e0e7ff"
                                    stroke="#6366f1"
                                    strokeWidth="1.5"
                                    filter="drop-shadow(0 1px 2px rgba(0,0,0,0.06))"
                                  />
                                  <text
                                    x="0"
                                    y="2.5"
                                    textAnchor="middle"
                                    dominantBaseline="middle"
                                    fontSize="11.5"
                                    fill="#1e1b4b"
                                    fontWeight="900"
                                    letterSpacing="-0.2px"
                                  >
                                    {p.demanda}
                                  </text>
                                </g>

                                {/* Punto Egresados */}
                                <circle cx={cx} cy={cyEgr} r="6" fill="#d97706" stroke="#ffffff" strokeWidth="2.5" className="drop-shadow-sm" />

                                {/* Badge Número Egresados */}
                                <g transform={`translate(${cx}, ${egrBadgeY})`}>
                                  <rect
                                    x="-28"
                                    y="-12"
                                    width="56"
                                    height="20"
                                    rx="6"
                                    fill="#fef3c7"
                                    stroke="#f59e0b"
                                    strokeWidth="1.5"
                                    filter="drop-shadow(0 1px 2px rgba(0,0,0,0.06))"
                                  />
                                  <text
                                    x="0"
                                    y="2.5"
                                    textAnchor="middle"
                                    dominantBaseline="middle"
                                    fontSize="11.5"
                                    fill="#78350f"
                                    fontWeight="900"
                                    letterSpacing="-0.2px"
                                  >
                                    {p.egresados}
                                  </text>
                                </g>

                                {/* Badge de Gestión / Año en el Eje X */}
                                <g transform={`translate(${cx}, 330)`}>
                                  <rect
                                    x="-27"
                                    y="-12"
                                    width="54"
                                    height="20"
                                    rx="5"
                                    fill={p.anio === 2026 ? "#312e81" : "#f1f5f9"}
                                  />
                                  <text
                                    x="0"
                                    y="0"
                                    textAnchor="middle"
                                    dominantBaseline="middle"
                                    fontSize="12"
                                    fontWeight="900"
                                    fill={p.anio === 2026 ? "#ffffff" : "#334155"}
                                  >
                                    {p.anio}
                                  </text>
                                </g>

                                {/* Variación Demográfica INE */}
                                <g transform={`translate(${cx}, 352)`}>
                                  {p.anio === 2026 ? (
                                    <text
                                      x="0"
                                      y="0"
                                      textAnchor="middle"
                                      fontSize="10"
                                      fontWeight="800"
                                      fill="#6366f1"
                                    >
                                      Año Base
                                    </text>
                                  ) : (
                                    <text
                                      x="0"
                                      y="0"
                                      textAnchor="middle"
                                      fontSize="11"
                                      fontWeight="800"
                                      fill={p.var_poblacional_pct > 0 ? "#15803d" : "#b91c1c"}
                                    >
                                      {p.var_poblacional_pct > 0 ? `+${p.var_poblacional_pct}%` : `${p.var_poblacional_pct}%`}
                                    </text>
                                  )}
                                </g>
                              </g>
                            );
                          })}
                        </g>
                      );
                    })()}
                  </svg>
                </div>

                {/* Tabla Detallada Año a Año (2024–2031) */}
                <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
                  <table className="w-full text-[11px] text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-100/90 text-slate-700 font-extrabold border-b border-slate-200">
                        <th className="py-2 px-3">Gestión</th>
                        <th className="py-2 px-3 text-center">Variación Población INE</th>
                        <th className="py-2 px-3 text-right">Demanda UIE (Ítems)</th>
                        <th className="py-2 px-3 text-right">Egresados ESFM (Anual DGFM)</th>
                        <th className="py-2 px-3 text-right">Egresados (Acumulado)</th>
                        <th className="py-2 px-3 text-center">Balance / Cobertura</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                      {lineChartPoints.map((p) => {
                        const esBase = p.anio === 2026;
                        const brecha = p.demanda - p.egresados_acumulados;
                        const pctCob = p.demanda > 0 ? Math.round((p.egresados_acumulados / p.demanda) * 100) : 100;
                        return (
                          <tr key={p.anio} className={esBase ? "bg-amber-50/70 font-bold" : "hover:bg-slate-50/80"}>
                            <td className="py-2 px-3 flex items-center gap-1.5">
                              <span>{p.anio}</span>
                              {esBase && (
                                <span className="text-[9px] font-black bg-indigo-100 text-indigo-700 px-1.5 py-0.2 rounded">
                                  Auditoría Base 2026
                                </span>
                              )}
                            </td>
                            <td className="py-2 px-3 text-center">
                              {p.var_poblacional_pct === 0 ? (
                                <span className="text-slate-400 font-semibold">—</span>
                              ) : (
                                <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold ${p.var_poblacional_pct > 0
                                  ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                  : "bg-rose-50 text-rose-700 border border-rose-200"
                                  }`}>
                                  {p.var_poblacional_pct > 0 ? `+${p.var_poblacional_pct}%` : `${p.var_poblacional_pct}%`}
                                </span>
                              )}
                            </td>
                            <td className="py-2 px-3 text-right font-black text-indigo-900">
                              {p.demanda}
                            </td>
                            <td className="py-2 px-3 text-right text-slate-700 font-bold">
                              {p.egresados_anual}
                            </td>
                            <td className="py-2 px-3 text-right font-black text-amber-800">
                              {p.egresados_acumulados}
                            </td>
                            <td className="py-2 px-3 text-center">
                              <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-extrabold ${pctCob >= 100
                                ? "bg-emerald-100 text-emerald-800"
                                : pctCob >= 60
                                  ? "bg-amber-100 text-amber-800"
                                  : "bg-rose-100 text-rose-800"
                                }`}>
                                {pctCob}% ({brecha > 0 ? `-${brecha.toFixed(1)} déficit` : `+${Math.abs(brecha).toFixed(1)} cubierto`})
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Nota de Coherencia Demográfica */}
                <div className="pt-2 border-t border-slate-200/80 flex items-start gap-2.5 text-[11px] text-slate-600 leading-relaxed">
                  <Info className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
                  <div>
                    <strong>Rigor Metodológico Demográfico:</strong> La demanda anual de ítems se ancla en el déficit auditado en aula UIE (<strong>{selectedEsp.items_deficit_uie_nacional} ítems en 2026</strong>) y evoluciona en función directa de la tasa de variación poblacional de su nivel respectivo según el INE (
                    {selectedEsp.nivel_educativo === "INICIAL" && "Inicial: 4 a 5 años, en contracción del -3.6% al -6.4% anual"}
                    {selectedEsp.nivel_educativo === "PRIMARIA" && "Primaria: 6 a 11 años, en contracción del -1.5% al -5.1% anual"}
                    {selectedEsp.nivel_educativo === "SECUNDARIA" && "Secundaria: 12 a 17 años, en expansión moderada hasta 2028 (+0.8%) y posterior descenso hacia 2031 (-1.5%)"}
                    ). Si la población escolar del nivel crece, la demanda de ítems aumenta en idéntica proporción; si está en descenso, se contrae correlativamente. La oferta de egresados corresponde a las cohortes de 5 años registradas en la DGFM con el 82% de titulación histórica, justificando el dictamen <strong>{selectedEsp.dictamen}</strong>.
                  </div>
                </div>
              </div>

              {/* ─── MÓDULO INTEGRAL DE BALANCE DEPARTAMENTAL (MACRO GENERAL & COHORTES) ─── */}
              <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4">
                {/* Cabecera con Conmutador de Pestañas */}
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 border-b border-slate-100 pb-4">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-600" />
                      <h4 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
                        Demanda en UEs vs Oferta de Egresados ESFM · Análisis Territorial
                      </h4>
                    </div>
                    <p className="text-[11px] text-slate-500">
                      Balance consolidado por Subsistema / Nivel y Proyección multi-anual por cohortes reales.
                    </p>
                  </div>

                  {/* Selector de Pestañas Superior */}
                  <div className="inline-flex rounded-xl border border-slate-200 p-1 bg-slate-100/80 text-xs font-bold gap-1 self-start lg:self-auto">
                    <button
                      onClick={() => setTabTablaBalance("macro")}
                      className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${tabTablaBalance === "macro"
                        ? "bg-white text-slate-900 shadow-xs font-black"
                        : "text-slate-600 hover:text-slate-900"
                        }`}
                    >
                      <Layers className="w-3.5 h-3.5 text-indigo-600" />
                      <span>Matriz General por Subsistemas</span>
                      <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-indigo-50 text-indigo-700 font-extrabold">5 Áreas</span>
                    </button>

                    <button
                      onClick={() => setTabTablaBalance("cohorte")}
                      className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${tabTablaBalance === "cohorte"
                        ? "bg-white text-slate-900 shadow-xs font-black"
                        : "text-slate-600 hover:text-slate-900"
                        }`}
                    >
                      <TrendingUp className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Evolución Anual Cohortes ({selectedEsp.especialidad})</span>
                    </button>
                  </div>
                </div>

                {/* ══════════════════════════════════════════════════════════════════
                    PESTAÑA 1: MATRIZ GENERAL POR SUBSISTEMAS / NIVELES
                   ══════════════════════════════════════════════════════════════════ */}
                {tabTablaBalance === "macro" && (
                  <div className="space-y-4">
                    {/* Barra de Filtro de Gestión para la Matriz Macro */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/70 p-3 rounded-xl border border-slate-100">
                      <div className="flex items-center gap-2 text-xs">
                        <span className="font-bold text-slate-700">Horizonte de Análisis:</span>
                        <div className="inline-flex flex-wrap rounded-lg border border-slate-200 bg-white p-0.5 text-[11px] font-bold">
                          {([
                            { id: "2031_acum", label: "Corte Quinquenal al 2031 (Consolidado)" },
                            { id: "2027", label: "Gestión 2027" },
                            { id: "2028", label: "Gestión 2028" },
                            { id: "2029", label: "Gestión 2029" },
                            { id: "2030", label: "Gestión 2030" },
                            { id: "2031", label: "Gestión 2031" },
                          ] as const).map((opt) => (
                            <button
                              key={opt.id}
                              onClick={() => setMacroFiltroAnio(opt.id)}
                              className={`px-2.5 py-1 rounded-md transition-all cursor-pointer ${macroFiltroAnio === opt.id
                                ? "bg-slate-900 text-white shadow-xs font-black"
                                : "text-slate-600 hover:bg-slate-100"
                                }`}
                            >
                              {opt.label}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="flex items-center gap-3 text-[11px] text-slate-500 font-medium">
                        <span className="flex items-center gap-1">
                          <span className="w-2.5 h-2.5 rounded bg-amber-200 border border-amber-400" /> Inicial
                        </span>
                        <span className="flex items-center gap-1">
                          <span className="w-2.5 h-2.5 rounded bg-blue-200 border border-blue-400" /> Primaria
                        </span>
                        <span className="flex items-center gap-1">
                          <span className="w-2.5 h-2.5 rounded bg-emerald-200 border border-emerald-400" /> Secundaria
                        </span>
                        <span className="flex items-center gap-1">
                          <span className="w-2.5 h-2.5 rounded bg-indigo-200 border border-indigo-400" /> BTH (6 ramas)
                        </span>
                        <span className="flex items-center gap-1">
                          <span className="w-2.5 h-2.5 rounded bg-rose-200 border border-rose-400" /> Especial
                        </span>
                      </div>
                    </div>

                    {/* Tabla Macro Consolidada */}
                    <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-2xs">
                      <table className="w-full text-[11px] text-left border-collapse whitespace-nowrap">
                        <thead>
                          {/* Super Cabecera de Subsistemas */}
                          <tr className="text-center font-black text-slate-800 border-b border-slate-200">
                            <th rowSpan={2} className="py-2.5 px-3 text-left bg-slate-100/90 border-r border-slate-300 min-w-[120px]">
                              DEPARTAMENTO
                            </th>
                            <th colSpan={3} className="py-2 px-2 bg-amber-100/70 text-amber-950 border-r border-slate-300">
                              INICIAL
                              <span className="block text-[9px] font-normal text-amber-800">En Familia Comunitaria</span>
                            </th>
                            <th colSpan={3} className="py-2 px-2 bg-blue-100/70 text-blue-950 border-r border-slate-300">
                              PRIMARIA
                              <span className="block text-[9px] font-normal text-blue-800">Comunitaria Vocacional</span>
                            </th>
                            <th colSpan={3} className="py-2 px-2 bg-emerald-100/70 text-emerald-950 border-r border-slate-300">
                              SECUNDARIA
                              <span className="block text-[9px] font-normal text-emerald-800">11 Especialidades Regulares</span>
                            </th>
                            <th colSpan={3} className="py-2 px-2 bg-indigo-100/70 text-indigo-950 border-r border-slate-300">
                              SECUNDARIA BTH
                              <span className="block text-[9px] font-normal text-indigo-800">6 Especialidades Técnicas</span>
                            </th>
                            <th colSpan={3} className="py-2 px-2 bg-rose-100/70 text-rose-950 border-r border-slate-300">
                              ESPECIAL
                              <span className="block text-[9px] font-normal text-rose-800">Personas con Discapacidad</span>
                            </th>
                            <th colSpan={3} className="py-2 px-2 bg-slate-200/90 text-slate-900 border-l border-slate-300 font-black">
                              TOTAL GENERAL
                              <span className="block text-[9px] font-normal text-slate-700">Consolidado SEP</span>
                            </th>
                          </tr>

                          {/* Sub Cabecera de Métricas */}
                          <tr className="text-[10px] font-extrabold text-slate-700 border-b border-slate-300 text-right">
                            {/* INICIAL */}
                            <th className="py-1.5 px-2 bg-amber-50/50 border-r border-slate-200/70">DEMANDA MTROS</th>
                            <th className="py-1.5 px-2 bg-amber-50/50 border-r border-slate-200/70">EGRESADOS</th>
                            <th className="py-1.5 px-2 bg-amber-100/60 border-r border-slate-300 text-amber-950">DEMANDA REAL</th>

                            {/* PRIMARIA */}
                            <th className="py-1.5 px-2 bg-blue-50/50 border-r border-slate-200/70">DEMANDA MTROS</th>
                            <th className="py-1.5 px-2 bg-blue-50/50 border-r border-slate-200/70">EGRESADOS</th>
                            <th className="py-1.5 px-2 bg-blue-100/60 border-r border-slate-300 text-blue-950">DEMANDA REAL</th>

                            {/* SECUNDARIA */}
                            <th className="py-1.5 px-2 bg-emerald-50/50 border-r border-slate-200/70">DEMANDA MTROS</th>
                            <th className="py-1.5 px-2 bg-emerald-50/50 border-r border-slate-200/70">EGRESADOS</th>
                            <th className="py-1.5 px-2 bg-emerald-100/60 border-r border-slate-300 text-emerald-950">DEMANDA REAL</th>

                            {/* SECUNDARIA BTH */}
                            <th className="py-1.5 px-2 bg-indigo-50/50 border-r border-slate-200/70">DEMANDA MTROS</th>
                            <th className="py-1.5 px-2 bg-indigo-50/50 border-r border-slate-200/70">EGRESADOS</th>
                            <th className="py-1.5 px-2 bg-indigo-100/60 border-r border-slate-300 text-indigo-950">DEMANDA REAL</th>

                            {/* ESPECIAL */}
                            <th className="py-1.5 px-2 bg-rose-50/50 border-r border-slate-200/70">DEMANDA MTROS</th>
                            <th className="py-1.5 px-2 bg-rose-50/50 border-r border-slate-200/70">EGRESADOS</th>
                            <th className="py-1.5 px-2 bg-rose-100/60 border-r border-slate-300 text-rose-950">DEMANDA REAL</th>

                            {/* TOTAL GENERAL */}
                            <th className="py-1.5 px-2 bg-slate-100 border-r border-slate-200/70 text-slate-800">DEMANDA MTROS</th>
                            <th className="py-1.5 px-2 bg-slate-100 border-r border-slate-200/70 text-slate-800">EGRESADOS</th>
                            <th className="py-1.5 px-2 bg-slate-200/90 border-l border-slate-300 text-slate-900 font-black">DEMANDA REAL</th>
                          </tr>
                        </thead>

                        <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                          {macroDptoRows.map((row) => {
                            const renderCellReal = (st: MacroAreaStats, bgTint: string) => (
                              <td className={`py-2 px-2 text-right border-r border-slate-200 ${bgTint}`}>
                                {st.real < 0 ? (
                                  <span className="text-rose-600 font-bold">{st.real.toLocaleString()}</span>
                                ) : st.real > 0 ? (
                                  <span className="text-slate-900 font-extrabold flex items-center justify-end gap-1">
                                    <span>{st.real.toLocaleString()}</span>
                                    {st.paralelos && st.paralelos > 0 && (
                                      <span className="text-[9px] px-1 py-0.2 rounded bg-[#84cc16] text-white font-black" title={`${st.paralelos} paralelos requeridos`}>
                                        {st.paralelos}p
                                      </span>
                                    )}
                                  </span>
                                ) : (
                                  <span className="text-slate-400 font-semibold">0</span>
                                )}
                              </td>
                            );

                            return (
                              <tr key={row.departamento} className="hover:bg-slate-50/90 transition-colors">
                                {/* Departamento */}
                                <td className="py-2 px-3 font-bold text-slate-800 bg-slate-50/50 border-r border-slate-200">
                                  {row.departamento}
                                </td>

                                {/* INICIAL */}
                                <td className="py-2 px-2 text-right border-r border-slate-100">{row.inicial.demanda.toLocaleString()}</td>
                                <td className="py-2 px-2 text-right border-r border-slate-100 text-slate-600">{row.inicial.egresados.toLocaleString()}</td>
                                {renderCellReal(row.inicial, "bg-amber-50/30")}

                                {/* PRIMARIA */}
                                <td className="py-2 px-2 text-right border-r border-slate-100">{row.primaria.demanda.toLocaleString()}</td>
                                <td className="py-2 px-2 text-right border-r border-slate-100 text-slate-600">{row.primaria.egresados.toLocaleString()}</td>
                                {renderCellReal(row.primaria, "bg-blue-50/30")}

                                {/* SECUNDARIA */}
                                <td className="py-2 px-2 text-right border-r border-slate-100">{row.secundaria.demanda.toLocaleString()}</td>
                                <td className="py-2 px-2 text-right border-r border-slate-100 text-slate-600">{row.secundaria.egresados.toLocaleString()}</td>
                                {renderCellReal(row.secundaria, "bg-emerald-50/30")}

                                {/* SECUNDARIA BTH */}
                                <td className="py-2 px-2 text-right border-r border-slate-100">{row.secundariaBth.demanda.toLocaleString()}</td>
                                <td className="py-2 px-2 text-right border-r border-slate-100 text-slate-600">{row.secundariaBth.egresados.toLocaleString()}</td>
                                {renderCellReal(row.secundariaBth, "bg-indigo-50/30")}

                                {/* ESPECIAL */}
                                <td className="py-2 px-2 text-right border-r border-slate-100">{row.especial.demanda.toLocaleString()}</td>
                                <td className="py-2 px-2 text-right border-r border-slate-100 text-slate-600">{row.especial.egresados.toLocaleString()}</td>
                                {renderCellReal(row.especial, "bg-rose-50/30")}

                                {/* TOTAL GENERAL */}
                                <td className="py-2 px-2 text-right border-r border-slate-100 bg-slate-50 font-bold">{row.total.demanda.toLocaleString()}</td>
                                <td className="py-2 px-2 text-right border-r border-slate-100 bg-slate-50 text-slate-700 font-bold">{row.total.egresados.toLocaleString()}</td>
                                {renderCellReal(row.total, "bg-slate-100/90 font-black")}
                              </tr>
                            );
                          })}
                        </tbody>

                        {/* Fila Total Bolivia */}
                        <tfoot>
                          {(() => {
                            const tot = macroTotalFila;
                            const renderTotReal = (st: MacroAreaStats, bgTint: string) => (
                              <td className={`py-2.5 px-2 border-r border-slate-300 font-black ${bgTint}`}>
                                {st.real < 0 ? (
                                  <span className="text-rose-700 font-black">{st.real.toLocaleString()}</span>
                                ) : (
                                  <span className="text-slate-900 font-black flex items-center justify-end gap-1">
                                    <span>{st.real.toLocaleString()}</span>
                                    {st.paralelos && st.paralelos > 0 && (
                                      <span className="text-[9px] px-1.5 py-0.2 rounded bg-lime-700 text-white font-black">
                                        {st.paralelos}p
                                      </span>
                                    )}
                                  </span>
                                )}
                              </td>
                            );

                            return (
                              <tr className="bg-slate-100 font-black text-slate-900 border-t-2 border-slate-300 text-right">
                                <td className="py-2.5 px-3 text-left font-black border-r border-slate-300">
                                  TOTAL BOLIVIA
                                </td>
                                {/* INICIAL */}
                                <td className="py-2.5 px-2 border-r border-slate-200">{tot.inicial.demanda.toLocaleString()}</td>
                                <td className="py-2.5 px-2 border-r border-slate-200 text-slate-700">{tot.inicial.egresados.toLocaleString()}</td>
                                {renderTotReal(tot.inicial, "bg-amber-100/60")}

                                {/* PRIMARIA */}
                                <td className="py-2.5 px-2 border-r border-slate-200">{tot.primaria.demanda.toLocaleString()}</td>
                                <td className="py-2.5 px-2 border-r border-slate-200 text-slate-700">{tot.primaria.egresados.toLocaleString()}</td>
                                {renderTotReal(tot.primaria, "bg-blue-100/60")}

                                {/* SECUNDARIA */}
                                <td className="py-2.5 px-2 border-r border-slate-200">{tot.secundaria.demanda.toLocaleString()}</td>
                                <td className="py-2.5 px-2 border-r border-slate-200 text-slate-700">{tot.secundaria.egresados.toLocaleString()}</td>
                                {renderTotReal(tot.secundaria, "bg-emerald-100/60")}

                                {/* SECUNDARIA BTH */}
                                <td className="py-2.5 px-2 border-r border-slate-200">{tot.secundariaBth.demanda.toLocaleString()}</td>
                                <td className="py-2.5 px-2 border-r border-slate-200 text-slate-700">{tot.secundariaBth.egresados.toLocaleString()}</td>
                                {renderTotReal(tot.secundariaBth, "bg-indigo-100/60")}

                                {/* ESPECIAL */}
                                <td className="py-2.5 px-2 border-r border-slate-200">{tot.especial.demanda.toLocaleString()}</td>
                                <td className="py-2.5 px-2 border-r border-slate-200 text-slate-700">{tot.especial.egresados.toLocaleString()}</td>
                                {renderTotReal(tot.especial, "bg-rose-100/60")}

                                {/* TOTAL GENERAL */}
                                <td className="py-2.5 px-2 border-r border-slate-200 bg-slate-200/50">{tot.total.demanda.toLocaleString()}</td>
                                <td className="py-2.5 px-2 border-r border-slate-200 bg-slate-200/50 text-slate-800">{tot.total.egresados.toLocaleString()}</td>
                                {renderTotReal(tot.total, "bg-slate-200 text-slate-900 font-black")}
                              </tr>
                            );
                          })()}
                        </tfoot>
                      </table>
                    </div>

                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-[11px] text-slate-500 pt-2 border-t border-slate-100">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-700">Fórmula Macro:</span>
                        <span>Demanda Real = Demanda Ítems UIE − Egresados ESFM</span>
                        <span>·</span>
                        <span>Badge `Xp`: Número de paralelos (30 doc.) cuando la brecha $\ge 6$ ítems</span>
                      </div>
                      <div className="text-slate-600 font-semibold">
                        * Valores en rojo indican superávit acumulado de maestros en el subsistema respectivo.
                      </div>
                    </div>
                  </div>
                )}

                {/* ══════════════════════════════════════════════════════════════════
                    PESTAÑA 2: EVOLUCIÓN ANUAL POR COHORTE (ESPECIALIDAD SELECCIONADA)
                   ══════════════════════════════════════════════════════════════════ */}
                {tabTablaBalance === "cohorte" && (
                  <div className="space-y-4">
                    {/* Barra de Controles y Selector de Modo de Visualización */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/70 p-3 rounded-xl border border-slate-100">
                      <div>
                        <div className="text-xs font-bold text-slate-800 flex items-center gap-2">
                          <span>Especialidad:</span>
                          <span className="text-indigo-700 font-black uppercase">{selectedEsp.especialidad}</span>
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-200/80 text-slate-700 font-bold">
                            Nivel: {selectedEsp.nivel_educativo || "SECUNDARIA"}
                          </span>
                        </div>
                        <p className="text-[10px] text-slate-500 mt-0.5">
                          Evolución del inventario de déficit: Demanda Ítems (t) = Demanda Real (t-1)
                        </p>
                      </div>

                      {/* Selector de Modo de Lectura */}
                      <div className="inline-flex rounded-lg border border-slate-200 bg-white p-0.5 text-[11px] font-bold">
                        <button
                          onClick={() => setModoVistaCohorte("resumido")}
                          className={`px-3 py-1 rounded-md transition-all cursor-pointer ${modoVistaCohorte === "resumido"
                            ? "bg-emerald-600 text-white shadow-xs font-black"
                            : "text-slate-600 hover:bg-slate-100"
                            }`}
                        >
                          Vista Resumida (Demanda Real Año a Año)
                        </button>
                        <button
                          onClick={() => setModoVistaCohorte("completo")}
                          className={`px-3 py-1 rounded-md transition-all cursor-pointer ${modoVistaCohorte === "completo"
                            ? "bg-slate-900 text-white shadow-xs font-black"
                            : "text-slate-600 hover:bg-slate-100"
                            }`}
                        >
                          Vista Detallada (16 Columnas)
                        </button>
                      </div>
                    </div>

                    {/* Tabla de Cohortes */}
                    <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
                      <table className="w-full text-[11px] text-left border-collapse whitespace-nowrap">
                        <thead>
                          {modoVistaCohorte === "resumido" ? (
                            /* Modo Resumido: Cabecera ultra clara de 7 columnas */
                            <tr className="text-center font-black text-slate-800 border-b border-slate-200">
                              <th className="py-2.5 px-3 text-left bg-slate-100/90 border-r border-slate-300 min-w-[120px]">
                                DEPARTAMENTO
                              </th>
                              <th className="py-2.5 px-3 bg-[#dbeafe]/70 text-slate-900 border-r border-slate-200 text-right">
                                DEMANDA REAL 2027
                              </th>
                              <th className="py-2.5 px-3 bg-[#fef3c7]/90 text-amber-950 border-r border-slate-200 text-right">
                                DEMANDA REAL 2028
                              </th>
                              <th className="py-2.5 px-3 bg-[#e0f2fe]/90 text-sky-950 border-r border-slate-200 text-right">
                                DEMANDA REAL 2029
                              </th>
                              <th className="py-2.5 px-3 bg-[#e2e8f0]/80 text-slate-900 border-r border-slate-200 text-right">
                                DEMANDA REAL 2030
                              </th>
                              <th className="py-2.5 px-3 bg-[#dcfce7]/90 text-emerald-950 border-r border-slate-300 text-right">
                                DEMANDA REAL 2031 (CORTE)
                              </th>
                              <th className="py-2.5 px-3 bg-[#ecfccb] text-lime-950 font-black border-l border-slate-300 text-center min-w-[130px]">
                                ADMISIÓN 2027
                                <span className="block text-[9px] font-bold text-lime-800">(30 doc. / paralelo)</span>
                              </th>
                            </tr>
                          ) : (
                            /* Modo Completo: 16 columnas detalladas */
                            <>
                              <tr className="text-center font-black text-slate-800 border-b border-slate-200">
                                <th rowSpan={2} className="py-2.5 px-3 text-left bg-slate-100/90 border-r border-slate-300 min-w-[120px]">
                                  DEPARTAMENTO
                                </th>
                                <th colSpan={3} className="py-2 px-2 bg-[#dbeafe]/70 text-slate-900 border-r border-slate-300">
                                  2027
                                </th>
                                <th colSpan={3} className="py-2 px-2 bg-[#fef3c7]/90 text-amber-950 border-r border-slate-300">
                                  2028
                                </th>
                                <th colSpan={3} className="py-2 px-2 bg-[#e0f2fe]/90 text-sky-950 border-r border-slate-300">
                                  2029
                                </th>
                                <th colSpan={3} className="py-2 px-2 bg-[#e2e8f0]/80 text-slate-900 border-r border-slate-300">
                                  2030
                                </th>
                                <th colSpan={3} className="py-2 px-2 bg-[#dcfce7]/90 text-emerald-950 border-r border-slate-300">
                                  2031
                                </th>
                                <th rowSpan={2} className="py-2.5 px-3 bg-[#ecfccb] text-lime-950 font-black border-l border-slate-300 text-center min-w-[110px]">
                                  ADMISIÓN 2027
                                  <span className="block text-[9px] font-bold text-lime-800">(30 docentes)</span>
                                </th>
                              </tr>
                              <tr className="text-[10px] font-extrabold text-slate-700 border-b border-slate-300 text-right">
                                <th className="py-1.5 px-2 bg-[#dbeafe]/40 border-r border-slate-200/70">DEMANDA MTROS</th>
                                <th className="py-1.5 px-2 bg-[#dbeafe]/40 border-r border-slate-200/70">EGRESADOS</th>
                                <th className="py-1.5 px-2 bg-[#dbeafe]/60 border-r border-slate-300 text-slate-900">DEMANDA REAL</th>

                                <th className="py-1.5 px-2 bg-[#fef3c7]/40 border-r border-slate-200/70">DEMANDA MTROS</th>
                                <th className="py-1.5 px-2 bg-[#fef3c7]/40 border-r border-slate-200/70">EGRESADOS</th>
                                <th className="py-1.5 px-2 bg-[#fef3c7]/70 border-r border-slate-300 text-amber-950">DEMANDA REAL</th>

                                <th className="py-1.5 px-2 bg-[#e0f2fe]/40 border-r border-slate-200/70">DEMANDA MTROS</th>
                                <th className="py-1.5 px-2 bg-[#e0f2fe]/40 border-r border-slate-200/70">EGRESADOS</th>
                                <th className="py-1.5 px-2 bg-[#e0f2fe]/70 border-r border-slate-300 text-sky-950">DEMANDA REAL</th>

                                <th className="py-1.5 px-2 bg-[#e2e8f0]/40 border-r border-slate-200/70">DEMANDA MTROS</th>
                                <th className="py-1.5 px-2 bg-[#e2e8f0]/40 border-r border-slate-200/70">EGRESADOS</th>
                                <th className="py-1.5 px-2 bg-[#e2e8f0]/70 border-r border-slate-300 text-slate-900">DEMANDA REAL</th>

                                <th className="py-1.5 px-2 bg-[#dcfce7]/40 border-r border-slate-200/70">DEMANDA MTROS</th>
                                <th className="py-1.5 px-2 bg-[#dcfce7]/40 border-r border-slate-200/70">EGRESADOS</th>
                                <th className="py-1.5 px-2 bg-[#dcfce7]/70 border-r border-slate-300 text-emerald-950">DEMANDA REAL</th>
                              </tr>
                            </>
                          )}
                        </thead>

                        <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                          {deptBalanceRows.map((row) => {
                            const fmt = (v: number) => (Number.isInteger(v) ? v.toString() : v.toFixed(1).replace(".", ","));
                            const renderReal = (val: number) => {
                              if (val < 0) return <span className="text-rose-600 font-bold">{fmt(val)}</span>;
                              if (val > 0) return <span className="text-slate-900 font-extrabold">{fmt(val)}</span>;
                              return <span className="text-slate-400 font-semibold">0</span>;
                            };

                            if (modoVistaCohorte === "resumido") {
                              return (
                                <tr key={row.departamento} className="hover:bg-slate-50/90 transition-colors">
                                  <td className="py-2.5 px-3 font-bold text-slate-800 bg-slate-50/50 border-r border-slate-200">
                                    {row.departamento}
                                  </td>
                                  <td className="py-2.5 px-3 text-right border-r border-slate-200 bg-slate-50/20">{renderReal(row.y2027.real)}</td>
                                  <td className="py-2.5 px-3 text-right border-r border-slate-200 bg-amber-50/20">{renderReal(row.y2028.real)}</td>
                                  <td className="py-2.5 px-3 text-right border-r border-slate-200 bg-sky-50/20">{renderReal(row.y2029.real)}</td>
                                  <td className="py-2.5 px-3 text-right border-r border-slate-200 bg-slate-50/20">{renderReal(row.y2030.real)}</td>
                                  <td className="py-2.5 px-3 text-right border-r border-slate-300 bg-emerald-50/30 font-bold">{renderReal(row.y2031.real)}</td>
                                  <td className="py-2.5 px-3 text-center border-l border-slate-200">
                                    {row.admision2027 != null && row.admision2027 > 0 ? (
                                      <span className="inline-flex items-center justify-center px-2.5 py-1 rounded-md bg-[#84cc16] text-white font-black text-xs shadow-xs ring-1 ring-lime-600/30">
                                        {row.admision2027} paralelo{row.admision2027 === 1 ? "" : "s"}
                                      </span>
                                    ) : (
                                      <span className="text-slate-300 font-semibold">—</span>
                                    )}
                                  </td>
                                </tr>
                              );
                            }

                            return (
                              <tr key={row.departamento} className="hover:bg-slate-50/90 transition-colors">
                                <td className="py-2 px-3 font-bold text-slate-800 bg-slate-50/50 border-r border-slate-200">
                                  {row.departamento}
                                </td>
                                {/* 2027 */}
                                <td className="py-2 px-2 text-right border-r border-slate-100">{fmt(row.y2027.demanda)}</td>
                                <td className="py-2 px-2 text-right border-r border-slate-100 text-slate-600">{fmt(row.y2027.egresados)}</td>
                                <td className="py-2 px-2 text-right border-r border-slate-200 bg-slate-50/30">{renderReal(row.y2027.real)}</td>
                                {/* 2028 */}
                                <td className="py-2 px-2 text-right border-r border-slate-100">{fmt(row.y2028.demanda)}</td>
                                <td className="py-2 px-2 text-right border-r border-slate-100 text-slate-600">{fmt(row.y2028.egresados)}</td>
                                <td className="py-2 px-2 text-right border-r border-slate-200 bg-amber-50/20">{renderReal(row.y2028.real)}</td>
                                {/* 2029 */}
                                <td className="py-2 px-2 text-right border-r border-slate-100">{fmt(row.y2029.demanda)}</td>
                                <td className="py-2 px-2 text-right border-r border-slate-100 text-slate-600">{fmt(row.y2029.egresados)}</td>
                                <td className="py-2 px-2 text-right border-r border-slate-200 bg-sky-50/20">{renderReal(row.y2029.real)}</td>
                                {/* 2030 */}
                                <td className="py-2 px-2 text-right border-r border-slate-100">{fmt(row.y2030.demanda)}</td>
                                <td className="py-2 px-2 text-right border-r border-slate-100 text-slate-600">{fmt(row.y2030.egresados)}</td>
                                <td className="py-2 px-2 text-right border-r border-slate-200 bg-slate-50/30">{renderReal(row.y2030.real)}</td>
                                {/* 2031 */}
                                <td className="py-2 px-2 text-right border-r border-slate-100">{fmt(row.y2031.demanda)}</td>
                                <td className="py-2 px-2 text-right border-r border-slate-100 text-slate-600">{fmt(row.y2031.egresados)}</td>
                                <td className="py-2 px-2 text-right border-r border-slate-200 bg-emerald-50/20">{renderReal(row.y2031.real)}</td>
                                {/* ADMISIÓN */}
                                <td className="py-2 px-3 text-center border-l border-slate-200">
                                  {row.admision2027 != null && row.admision2027 > 0 ? (
                                    <span className="inline-flex items-center justify-center w-7 h-6 rounded bg-[#84cc16] text-white font-black text-xs shadow-xs ring-1 ring-lime-600/30">
                                      {row.admision2027}
                                    </span>
                                  ) : (
                                    <span className="text-slate-300 font-semibold">—</span>
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>

                        {/* Fila Total */}
                        <tfoot>
                          {(() => {
                            const fmtTot = (v: number) => (Number.isInteger(v) ? v.toString() : v.toFixed(1).replace(".", ","));
                            const tot = deptBalanceTotal;
                            if (modoVistaCohorte === "resumido") {
                              return (
                                <tr className="bg-slate-100 font-black text-slate-900 border-t-2 border-slate-300 text-right">
                                  <td className="py-2.5 px-3 text-left font-black border-r border-slate-300">
                                    TOTAL BOLIVIA
                                  </td>
                                  <td className="py-2.5 px-3 border-r border-slate-200">{fmtTot(tot.y2027.real)}</td>
                                  <td className="py-2.5 px-3 border-r border-slate-200">{fmtTot(tot.y2028.real)}</td>
                                  <td className="py-2.5 px-3 border-r border-slate-200">{fmtTot(tot.y2029.real)}</td>
                                  <td className="py-2.5 px-3 border-r border-slate-200">{fmtTot(tot.y2030.real)}</td>
                                  <td className="py-2.5 px-3 border-r border-slate-300 font-black bg-emerald-100/40">{fmtTot(tot.y2031.real)}</td>
                                  <td className="py-2.5 px-3 text-center border-l border-slate-300">
                                    <span className="inline-flex items-center justify-center px-2 py-0.5 rounded bg-lime-700 text-white font-black text-xs shadow-xs">
                                      {tot.admision2027} cursos
                                    </span>
                                  </td>
                                </tr>
                              );
                            }

                            return (
                              <tr className="bg-slate-100 font-black text-slate-900 border-t-2 border-slate-300 text-right">
                                <td className="py-2.5 px-3 text-left font-black border-r border-slate-300">
                                  TOTAL BOLIVIA
                                </td>
                                <td className="py-2.5 px-2 border-r border-slate-200">{fmtTot(tot.y2027.demanda)}</td>
                                <td className="py-2.5 px-2 border-r border-slate-200 text-slate-700">{fmtTot(tot.y2027.egresados)}</td>
                                <td className="py-2.5 px-2 border-r border-slate-300 bg-slate-200/50">{fmtTot(tot.y2027.real)}</td>

                                <td className="py-2.5 px-2 border-r border-slate-200">{fmtTot(tot.y2028.demanda)}</td>
                                <td className="py-2.5 px-2 border-r border-slate-200 text-slate-700">{fmtTot(tot.y2028.egresados)}</td>
                                <td className="py-2.5 px-2 border-r border-slate-300 bg-amber-100/40">{fmtTot(tot.y2028.real)}</td>

                                <td className="py-2.5 px-2 border-r border-slate-200">{fmtTot(tot.y2029.demanda)}</td>
                                <td className="py-2.5 px-2 border-r border-slate-200 text-slate-700">{fmtTot(tot.y2029.egresados)}</td>
                                <td className="py-2.5 px-2 border-r border-slate-300 bg-sky-100/40">{fmtTot(tot.y2029.real)}</td>

                                <td className="py-2.5 px-2 border-r border-slate-200">{fmtTot(tot.y2030.demanda)}</td>
                                <td className="py-2.5 px-2 border-r border-slate-200 text-slate-700">{fmtTot(tot.y2030.egresados)}</td>
                                <td className="py-2.5 px-2 border-r border-slate-300 bg-slate-200/50">{fmtTot(tot.y2030.real)}</td>

                                <td className="py-2.5 px-2 border-r border-slate-200">{fmtTot(tot.y2031.demanda)}</td>
                                <td className="py-2.5 px-2 border-r border-slate-200 text-slate-700">{fmtTot(tot.y2031.egresados)}</td>
                                <td className="py-2.5 px-2 border-r border-slate-300 bg-emerald-100/40">{fmtTot(tot.y2031.real)}</td>

                                <td className="py-2.5 px-3 text-center border-l border-slate-300">
                                  <span className="inline-flex items-center justify-center px-2 py-0.5 rounded bg-lime-700 text-white font-black text-xs shadow-xs">
                                    {tot.admision2027} cursos
                                  </span>
                                </td>
                              </tr>
                            );
                          })()}
                        </tfoot>
                      </table>
                    </div>

                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-[11px] text-slate-500 pt-2 border-t border-slate-100">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-700">Fórmula de Cohortes:</span>
                        <span>Demanda Ítems (t) = Demanda Real (t-1)</span>
                        <span>·</span>
                        <span>Demanda Real (t) = Demanda Ítems (t) − Egresados (t)</span>
                      </div>
                      <div className="text-slate-600 font-semibold">
                        * Criterio Admisión 2027: A partir de 6 docentes de demanda real en 2031 se cuenta 1 paralelo (base 30 doc.). Potosí: 101/30 = 3 paralelos.
                      </div>
                    </div>
                  </div>
                )}
              </div>              {/* Barras por departamento */}
              <div>
                <h4 className="text-xs font-extrabold text-slate-800 flex items-center gap-2 mb-3">
                  <BarChart3 className="w-4 h-4 text-slate-500" />
                  Déficit de Ítems por Departamento · {selectedEsp.especialidad}
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {Object.entries(selectedEsp.por_dpto).map(([dpto, v]) => {
                    const maxDef = Math.max(...Object.values(selectedEsp.por_dpto).map((d) => d.items_deficit_uie), 1);
                    const pct = (v.items_deficit_uie / maxDef) * 100;
                    return (
                      <div key={dpto} className="bg-slate-50 rounded-xl p-3 border border-slate-100">
                        <div className="flex items-center justify-between text-xs mb-1.5">
                          <span className="font-bold text-slate-800">{dpto}</span>
                          <div className="flex items-center gap-2 text-[10px]">
                            <span className="text-rose-600 font-semibold">{v.deficit_horas_uie} hrs · {v.items_deficit_uie} ítems</span>
                            <span className="text-slate-400">Impert: {v.pct_impert}%</span>
                          </div>
                        </div>
                        <div className="space-y-0.5">
                          <div className="h-2.5 w-full bg-slate-200 rounded-full overflow-hidden">
                            <div className="h-full bg-rose-400 rounded-full" style={{ width: `${Math.max(pct, pct > 0 ? 2 : 0)}%` }} />
                          </div>
                          <div className="flex justify-between text-[9px] text-slate-400 px-0.5">
                            <span>Rural: {v.pct_rural}% · Urbano: {v.pct_urbana}%</span>
                            <span className={`font-bold ${v.estado_dpto === "DEFICIT" ? "text-rose-500" : v.estado_dpto === "EQUILIBRIO" ? "text-amber-500" : "text-emerald-500"}`}>{v.estado_dpto}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>
      );
    }

    // ═════════════════════════════════════════════════════════════════════════
    // SLIDE 4 — MATRIZ GENERAL (TODAS LAS ESPECIALIDADES X DEPARTAMENTO AL 2031)
    // ═════════════════════════════════════════════════════════════════════════
    if (slide === 3) {
      const dptos = ["BENI", "CHUQUISACA", "COCHABAMBA", "LA PAZ", "ORURO", "PANDO", "POTOSI", "SANTA CRUZ", "TARIJA"];
      const { filas, dptoTotales, totalParalelosNac, totalDeficitPositivoNac } = matrizGeneralData;

      // Filtrado interactivo de filas
      const filasFiltradas = filas.filter((f) => {
        const matchSearch = !searchGeneral.trim() || f.especialidad.toLowerCase().includes(searchGeneral.toLowerCase());
        if (!matchSearch) return false;
        if (filtroGeneralDictamen === "CON_APERTURA") return f.totParalelosEsp > 0;
        if (filtroGeneralDictamen === "SATURADAS") return f.totParalelosEsp === 0;
        return true;
      });

      // Ordenar departamentos por paralelos de mayor a menor para el resumen
      const dptosRank = [...dptos].sort((a, b) => dptoTotales[b].paralelos - dptoTotales[a].paralelos);

      return (
        <div className="space-y-6">
          {/* Encabezado del Slide 4 */}
          <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white rounded-3xl p-6 sm:p-8 relative overflow-hidden shadow-2xl border border-indigo-900/40">
            <div className="absolute -right-10 -bottom-10 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
            <div className="relative z-10">
              <div className="flex flex-wrap items-center gap-2 mb-3">
                <div className="w-8 h-8 rounded-full bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center">
                  <Layers className="w-4 h-4 text-emerald-300" />
                </div>
                <span className="text-xs font-black text-emerald-300 uppercase tracking-widest">
                  Diapositiva 4 de 4 · Matriz General Territorial SEP · Datos Preliminares
                </span>
                <span className="ml-auto bg-emerald-500/20 text-emerald-200 border border-emerald-400/30 text-[10px] font-black px-2.5 py-1 rounded-full">
                  Corte Quinquenal 2031 · 20 Especialidades × 9 Departamentos
                </span>
              </div>
              <h2 className="text-2xl sm:text-4xl font-black tracking-tight text-white">
                Calculo Preliminar: Requerimiento de Docentes y Admisión por Especialidad
              </h2>
              <p className="text-slate-300 text-sm mt-2 max-w-3xl leading-relaxed">
                Consolidado territorial integral al año 2031. Visualización cruzada por <strong>Cantidad</strong> (demanda real neta de docentes en déficit o superávit) y por <strong>Admisión 2027</strong> (número de paralelos recomendados de 30 estudiantes con umbral mínimo de 6 docentes).
              </p>
            </div>
          </div>

          {/* 4 Stat Cards de Alto Impacto */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
            <div className="bg-white rounded-2xl border border-lime-200 shadow-xs p-4 relative overflow-hidden">
              <div className="flex items-center gap-2 mb-1.5">
                <GraduationCap className="w-4 h-4 text-lime-700" />
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-500">Paralelos Recomendados</span>
              </div>
              <div className="text-3xl font-black text-slate-900 flex items-baseline gap-2">
                <span>{totalParalelosNac}</span>
                <span className="text-xs font-bold text-lime-700">cursos ({totalParalelosNac * 30} plazas)</span>
              </div>
              <div className="text-[11px] text-slate-500 font-medium mt-1">Convocatoria Admisión 2027</div>
            </div>

            <div className="bg-white rounded-2xl border border-indigo-200 shadow-xs p-4 relative overflow-hidden">
              <div className="flex items-center gap-2 mb-1.5">
                <Users className="w-4 h-4 text-indigo-600" />
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-500">Déficit Territorial Focalizado</span>
              </div>
              <div className="text-3xl font-black text-indigo-950 flex items-baseline gap-1.5">
                <span>{totalDeficitPositivoNac.toLocaleString()}</span>
                <span className="text-xs font-bold text-indigo-600">docentes</span>
              </div>
              <div className="text-[11px] text-slate-500 font-medium mt-1">En departamentos con necesidad real</div>
            </div>

            <div className="bg-white rounded-2xl border border-blue-200 shadow-xs p-4 relative overflow-hidden">
              <div className="flex items-center gap-2 mb-1.5">
                <CheckCircle2 className="w-4 h-4 text-blue-600" />
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-500">Especialidades con Apertura</span>
              </div>
              <div className="text-3xl font-black text-blue-950">11 <span className="text-sm font-semibold text-slate-400">/ 20</span></div>
              <div className="text-[11px] text-blue-700 font-bold mt-1">55% con déficit justificado</div>
            </div>

            <div className="bg-white rounded-2xl border border-amber-200 shadow-xs p-4 relative overflow-hidden">
              <div className="flex items-center gap-2 mb-1.5">
                <School className="w-4 h-4 text-amber-600" />
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-500">Departamentos con Cupo</span>
              </div>
              <div className="text-3xl font-black text-amber-950">8 <span className="text-sm font-semibold text-slate-400">/ 9</span></div>
              <div className="text-[11px] text-amber-800 font-bold mt-1">Potosí lidera con 7 paralelos</div>
            </div>
          </div>

          {/* Barra de Controles y Filtros */}
          <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs space-y-3">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
              {/* Selector de Modo de Vista */}
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-bold text-slate-700">Modo de Visualización:</span>
                <div className="inline-flex flex-wrap items-center rounded-xl border border-slate-200 p-1 bg-slate-100/80 text-xs font-bold gap-1">
                  <button
                    onClick={() => setModoVistaGeneral("combinado")}
                    className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${modoVistaGeneral === "combinado"
                      ? "bg-white text-slate-900 shadow-xs font-black"
                      : "text-slate-600 hover:text-slate-900"
                      }`}
                  >
                    Combinado (Cantidad + Admisión)
                  </button>
                  <button
                    onClick={() => setModoVistaGeneral("cantidad")}
                    className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${modoVistaGeneral === "cantidad"
                      ? "bg-white text-slate-900 shadow-xs font-black"
                      : "text-slate-600 hover:text-slate-900"
                      }`}
                  >
                    Solo Cantidad (Docentes)
                  </button>
                  <button
                    onClick={() => setModoVistaGeneral("admision")}
                    className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${modoVistaGeneral === "admision"
                      ? "bg-white text-slate-900 shadow-xs font-black"
                      : "text-slate-600 hover:text-slate-900"
                      }`}
                  >
                    Solo Admisión (Paralelos)
                  </button>
                  <button
                    onClick={() => setModoVistaGeneral("comparar_2027_2031")}
                    className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${modoVistaGeneral === "comparar_2027_2031"
                      ? "bg-indigo-900 text-white shadow-xs font-black"
                      : "text-indigo-800 bg-indigo-50/80 hover:bg-indigo-100 hover:text-indigo-950 font-extrabold border border-indigo-200/80"
                      }`}
                  >
                    COMPARAR 2027 - 2031
                  </button>
                </div>
              </div>

              {/* Botón Exportar CSV de la Matriz General */}
              <button
                onClick={handleExportMatrizGeneral}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold shadow-xs cursor-pointer self-start lg:self-auto"
              >
                <Download className="w-3.5 h-3.5 text-indigo-600" />
                <span>Exportar Matriz General CSV</span>
              </button>
            </div>

            {/* Segunda Fila de Filtros y Búsqueda */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 border-t border-slate-100">
              <div className="flex flex-wrap items-center gap-1.5 text-xs">
                <span className="font-bold text-slate-500 text-[11px]">Filtrar Especialidades:</span>
                {(["TODAS", "CON_APERTURA", "SATURADAS"] as const).map((filtro) => (
                  <button
                    key={filtro}
                    onClick={() => setFiltroGeneralDictamen(filtro)}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${filtroGeneralDictamen === filtro
                      ? "bg-slate-900 text-white shadow-xs"
                      : "bg-slate-100 hover:bg-slate-200 text-slate-600"
                      }`}
                  >
                    {filtro === "TODAS" && "Todas las 20"}
                    {filtro === "CON_APERTURA" && "Con Apertura (11)"}
                    {filtro === "SATURADAS" && "Saturadas / Congelar (9)"}
                  </button>
                ))}
              </div>

              <div className="relative w-full sm:w-64">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Buscar especialidad…"
                  value={searchGeneral}
                  onChange={(e) => setSearchGeneral(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                />
              </div>
            </div>
          </div>

          {/* Tabla Matriz General Oficial (20 Especialidades × 9 Departamentos) */}
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-[11px] text-left border-collapse whitespace-nowrap">
                <thead>
                  <tr className="bg-slate-100/90 text-slate-800 font-black border-b border-slate-300">
                    <th className="py-2.5 px-3 text-left border-r border-slate-300 min-w-[230px]">
                      ESPECIALIDAD OFICIAL (SEP)
                    </th>
                    <th className="py-2.5 px-2.5 text-right bg-amber-50 text-amber-950 border-r border-slate-300 min-w-[95px] font-black">
                      REQUERIDO 2027
                      <span className="block text-[9px] font-extrabold text-amber-800">(Convocatoria)</span>
                    </th>
                    <th className="py-2.5 px-2.5 text-right bg-blue-50 text-blue-950 border-r border-slate-300 min-w-[95px] font-black">
                      REQUERIDO 2031
                      <span className="block text-[9px] font-extrabold text-blue-800">(Quinquenio)</span>
                    </th>
                    {dptos.map((dp) => (
                      <th
                        key={dp}
                        className={`py-2.5 px-2 text-center border-r border-slate-200 min-w-[95px] ${
                          modoVistaGeneral === "comparar_2027_2031" ? "bg-indigo-50/70 text-indigo-950" : ""
                        }`}
                      >
                        <span className="block font-black">{dp}</span>
                        {modoVistaGeneral === "comparar_2027_2031" ? (
                          <span className="block text-[8.5px] font-extrabold text-indigo-700 uppercase tracking-tight">
                            2027 vs 2031
                          </span>
                        ) : null}
                      </th>
                    ))}
                    <th className="py-2.5 px-3 text-right bg-slate-200/90 text-slate-950 border-r border-slate-300 min-w-[110px] font-black">
                      TOTAL BOLIVIA
                      <span className="block text-[9px] font-normal text-slate-600">(Balance Real)</span>
                    </th>
                    <th className="py-2.5 px-3 text-center bg-[#ecfccb] text-lime-950 border-l border-slate-300 min-w-[110px] font-black">
                      ADMISIÓN 2027
                      <span className="block text-[9px] font-bold text-lime-800">(30 doc./paralelo)</span>
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                  {filasFiltradas.map((row, idx) => {
                    const hasParalelos = row.totParalelosEsp > 0;
                    const prevRow = idx > 0 ? filasFiltradas[idx - 1] : null;
                    const isNewGroup = !prevRow || prevRow.macroArea !== row.macroArea;

                    const groupMeta: Record<MacroAreaTipo, { label: string; sub: string; bg: string; text: string; border: string }> = {
                      INICIAL: { label: "1. EDUCACIÓN INICIAL", sub: "En Familia Comunitaria · 1 Especialidad", bg: "bg-amber-100/80", text: "text-amber-950", border: "border-amber-300" },
                      PRIMARIA: { label: "2. EDUCACIÓN PRIMARIA", sub: "Comunitaria Vocacional · 1 Especialidad", bg: "bg-blue-100/80", text: "text-blue-950", border: "border-blue-300" },
                      SECUNDARIA: { label: "3. EDUCACIÓN SECUNDARIA", sub: "Formación Humanística Regular · 11 Especialidades", bg: "bg-emerald-100/80", text: "text-emerald-950", border: "border-emerald-300" },
                      ESPECIAL: { label: "4. EDUCACIÓN ESPECIAL", sub: "Personas con Discapacidad · 1 Especialidad", bg: "bg-rose-100/80", text: "text-rose-950", border: "border-rose-300" },
                      SECUNDARIA_BTH: { label: "5. SECUNDARIA BTH (TÉCNICA)", sub: "Bachillerato Técnico Humanístico · 6 Especialidades", bg: "bg-indigo-100/80", text: "text-indigo-950", border: "border-indigo-300" },
                    };

                    const gInfo = groupMeta[row.macroArea];

                    return (
                      <React.Fragment key={row.especialidad}>
                        {isNewGroup && (
                          <tr className={`${gInfo.bg} ${gInfo.text} font-black text-xs border-y ${gInfo.border}`}>
                            <td colSpan={dptos.length + 5} className="py-2 px-3">
                              <div className="flex items-center justify-between">
                                <span className="tracking-wide font-black">{gInfo.label}</span>
                                <span className="text-[10px] font-bold opacity-80">{gInfo.sub}</span>
                              </div>
                            </td>
                          </tr>
                        )}
                        <tr
                          className={`transition-colors ${hasParalelos ? "hover:bg-lime-50/30" : "hover:bg-slate-50/80"}`}
                        >
                          {/* Especialidad + Área */}
                          <td className="py-2 px-3 border-r border-slate-200 bg-slate-50/40">
                            <div className="flex items-center justify-between gap-2">
                              <span className="font-bold text-slate-900">{row.especialidad}</span>
                              <span className={`text-[9px] font-extrabold px-1.5 py-0.2 rounded ${row.macroArea === "INICIAL" ? "bg-amber-100 text-amber-800"
                                : row.macroArea === "PRIMARIA" ? "bg-blue-100 text-blue-800"
                                  : row.macroArea === "SECUNDARIA_BTH" ? "bg-indigo-100 text-indigo-800"
                                    : row.macroArea === "ESPECIAL" ? "bg-rose-100 text-rose-800"
                                      : "bg-emerald-100 text-emerald-800"
                                }`}>
                                {row.macroArea === "SECUNDARIA_BTH" ? "BTH" : row.macroArea}
                              </span>
                            </div>
                          </td>

                          {/* Requerimiento 2027 Nacional */}
                          <td className="py-2 px-2.5 text-right border-r border-slate-200 bg-amber-50/30 font-extrabold text-amber-950">
                            <span>{row.totReq2027Esp.toLocaleString()}</span>
                            <span className="text-[9px] text-amber-800/80 font-semibold block">docentes</span>
                          </td>

                          {/* Requerimiento 2031 Nacional */}
                          <td className="py-2 px-2.5 text-right border-r border-slate-200 bg-blue-50/30 font-extrabold text-blue-950">
                            <span>{row.totReq2031Esp.toLocaleString()}</span>
                            <span className="text-[9px] text-blue-800/80 font-semibold block">docentes</span>
                          </td>

                          {/* Celdas Departamentales */}
                          {dptos.map((dp) => {
                            const cell = row.dptos[dp];
                            const real = cell.real;
                            const par = cell.par;

                            return (
                              <td key={dp} className="py-2 px-2 text-right border-r border-slate-100">
                                {modoVistaGeneral === "combinado" && (
                                  <div>
                                    {par > 0 ? (
                                      <div className="flex items-center justify-end gap-1 font-black text-slate-900">
                                        <span>+{real}</span>
                                        <span
                                          className="inline-flex items-center justify-center px-1.5 py-0.2 rounded bg-[#84cc16] text-white text-[10px] font-black shadow-2xs"
                                          title={`${par} paralelo(s) requeridos (${par * 30} plazas)`}
                                        >
                                          {par}p
                                        </span>
                                      </div>
                                    ) : real > 0 ? (
                                      <span className="text-slate-600 font-semibold" title="Déficit menor a 6 docentes">
                                        +{real}
                                      </span>
                                    ) : real < 0 ? (
                                      <span className="text-rose-600 font-semibold">{real}</span>
                                    ) : (
                                      <span className="text-slate-300 font-semibold">0</span>
                                    )}
                                    <div className="flex items-center justify-end gap-1 text-[8.5px] font-semibold mt-0.5">
                                      <span className="text-amber-800 bg-amber-50 px-1 rounded border border-amber-200/60">&apos;27: {cell.req2027}</span>
                                      <span className="text-slate-400">→</span>
                                      <span className="text-blue-800 bg-blue-50 px-1 rounded border border-blue-200/60">&apos;31: {cell.req2031}</span>
                                    </div>
                                  </div>
                                )}

                                {modoVistaGeneral === "cantidad" && (
                                  <div>
                                    {real > 0 ? (
                                      <span className="font-extrabold text-slate-900">+{real}</span>
                                    ) : real < 0 ? (
                                      <span className="text-rose-600 font-semibold">{real}</span>
                                    ) : (
                                      <span className="text-slate-300 font-semibold">0</span>
                                    )}
                                  </div>
                                )}

                                {modoVistaGeneral === "admision" && (
                                  <div className="text-center">
                                    {par > 0 ? (
                                      <span className="inline-flex items-center justify-center px-2 py-0.5 rounded bg-[#84cc16] text-white text-[10px] font-black shadow-2xs">
                                        {par} paralelo{par === 1 ? "" : "s"}
                                      </span>
                                    ) : (
                                      <span className="text-slate-300 font-semibold">—</span>
                                    )}
                                  </div>
                                )}

                                {modoVistaGeneral === "comparar_2027_2031" && (
                                  <div className="flex flex-col items-stretch p-1 bg-slate-50/90 rounded-lg border border-slate-200/90 text-[10px] shadow-2xs">
                                    <div className="flex items-center justify-between gap-1">
                                      <span className="px-1 py-0.2 rounded bg-amber-100 text-amber-900 font-extrabold text-[8.5px]">
                                        &apos;27
                                      </span>
                                      <span className="font-black text-amber-950 text-[11px]">{cell.req2027}</span>
                                    </div>
                                    <div className="flex items-center justify-between gap-1 mt-0.5 pt-0.5 border-t border-slate-200/80">
                                      <span className="px-1 py-0.2 rounded bg-blue-100 text-blue-900 font-extrabold text-[8.5px]">
                                        &apos;31
                                      </span>
                                      <span className="font-black text-blue-950 text-[11px]">{cell.req2031}</span>
                                    </div>
                                    {par > 0 ? (
                                      <div className="mt-1 text-center">
                                        <span className="inline-flex items-center justify-center w-full px-1 py-0.5 rounded bg-[#84cc16] text-white text-[9px] font-black shadow-2xs">
                                          {par} paralelo{par > 1 ? "s" : ""} (+{real})
                                        </span>
                                      </div>
                                    ) : (
                                      <div className="mt-0.5 text-right text-[8.5px] font-bold text-slate-400">
                                        Saldo: <span className={real < 0 ? "text-rose-600 font-bold" : "text-slate-600 font-bold"}>{real}</span>
                                      </div>
                                    )}
                                  </div>
                                )}
                              </td>
                            );
                          })}

                          {/* Total Cantidad Bolivia */}
                          <td className="py-2 px-3 text-right border-r border-slate-300 bg-slate-100/60 font-black">
                            {modoVistaGeneral === "comparar_2027_2031" ? (
                              <div className="space-y-0.5">
                                <div className="flex items-center justify-end gap-1.5">
                                  <span className="text-[11px] font-extrabold text-amber-950 bg-amber-100 border border-amber-300 px-1.5 py-0.5 rounded shadow-2xs">
                                    &apos;27: {row.totReq2027Esp.toLocaleString()}
                                  </span>
                                  <span className="text-slate-400 font-black">→</span>
                                  <span className="text-[11px] font-extrabold text-blue-950 bg-blue-100 border border-blue-300 px-1.5 py-0.5 rounded shadow-2xs">
                                    &apos;31: {row.totReq2031Esp.toLocaleString()}
                                  </span>
                                </div>
                                <div className="text-[9px] text-slate-500 font-bold">
                                  Saldo Real: {row.totRealEsp > 0 ? `+${row.totRealEsp.toLocaleString()}` : row.totRealEsp.toLocaleString()}
                                </div>
                              </div>
                            ) : (
                              <div>
                                {row.totRealEsp > 0 ? (
                                  <span className="text-emerald-700">+{row.totRealEsp.toLocaleString()}</span>
                                ) : row.totRealEsp < 0 ? (
                                  <span className="text-rose-700">{row.totRealEsp.toLocaleString()}</span>
                                ) : (
                                  <span className="text-slate-400">0</span>
                                )}
                                <div className="text-[9px] text-slate-400 font-medium tracking-tight">
                                  &apos;27: {row.totReq2027Esp.toLocaleString()} → &apos;31: {row.totReq2031Esp.toLocaleString()}
                                </div>
                              </div>
                            )}
                          </td>

                          {/* Total Admisión 2027 (Paralelos) */}
                          <td className="py-2 px-3 text-center border-l border-slate-200 bg-lime-50/40">
                            {row.totParalelosEsp > 0 ? (
                              <span className="inline-flex items-center justify-center px-2.5 py-0.5 rounded bg-lime-700 text-white font-black text-xs shadow-xs">
                                {row.totParalelosEsp} {row.totParalelosEsp === 1 ? "paralelo" : "paralelos"}
                              </span>
                            ) : (
                              <span className="text-slate-300 font-semibold">—</span>
                            )}
                          </td>
                        </tr>
                      </React.Fragment>
                    );
                  })}
                </tbody>

                {/* Footer Totales */}
                <tfoot>
                  {/* Fila 1: Total Real Neto */}
                  <tr className="bg-slate-100 font-black text-slate-900 border-t-2 border-slate-300 text-right">
                    <td className="py-2.5 px-3 text-left font-black border-r border-slate-300">
                      TOTAL BALANCE NETO SEP
                    </td>
                    <td className="py-2.5 px-2.5 border-r border-slate-300 font-black text-amber-950 bg-amber-100/60">
                      {matrizGeneralData.totalReq2027Nac.toLocaleString()} doc.
                    </td>
                    <td className="py-2.5 px-2.5 border-r border-slate-300 font-black text-blue-950 bg-blue-100/60">
                      {matrizGeneralData.totalReq2031Nac.toLocaleString()} doc.
                    </td>
                    {dptos.map((dp) => {
                      const r = dptoTotales[dp].realNeto;
                      const r27 = dptoTotales[dp].req2027;
                      const r31 = dptoTotales[dp].req2031;
                      return (
                        <td key={dp} className="py-2.5 px-2 border-r border-slate-200 font-black">
                          {modoVistaGeneral === "comparar_2027_2031" ? (
                            <div className="flex flex-col items-stretch p-1 bg-white rounded border border-slate-200 text-[10px] space-y-0.5">
                              <div className="flex items-center justify-between text-amber-950 font-black">
                                <span className="text-[8.5px] text-amber-800 font-bold">&apos;27</span>
                                <span>{r27.toLocaleString()}</span>
                              </div>
                              <div className="flex items-center justify-between text-blue-950 font-black pt-0.5 border-t border-slate-100">
                                <span className="text-[8.5px] text-blue-800 font-bold">&apos;31</span>
                                <span>{r31.toLocaleString()}</span>
                              </div>
                              <div className="text-[8.5px] text-slate-500 font-medium text-right pt-0.5">
                                Saldo: <span className={r < 0 ? "text-rose-700 font-bold" : "text-slate-700 font-bold"}>{r.toLocaleString()}</span>
                              </div>
                            </div>
                          ) : (
                            <div>
                              <div>{r < 0 ? <span className="text-rose-700">{r.toLocaleString()}</span> : r}</div>
                              <div className="flex items-center justify-end gap-1 text-[8.5px] text-slate-400 font-medium mt-0.5">
                                <span>&apos;27: {r27}</span>
                                <span>→</span>
                                <span>&apos;31: {r31}</span>
                              </div>
                            </div>
                          )}
                        </td>
                      );
                    })}
                    <td className="py-2.5 px-3 border-r border-slate-300 font-black text-rose-700 bg-slate-200/90">
                      <div>-8,253</div>
                      <div className="text-[9px] text-slate-500 font-normal">
                        &apos;27: {matrizGeneralData.totalReq2027Nac.toLocaleString()} → &apos;31: {matrizGeneralData.totalReq2031Nac.toLocaleString()}
                      </div>
                    </td>
                    <td className="py-2.5 px-3 text-center border-l border-slate-300 bg-lime-100/60 font-black">
                      <span className="inline-flex items-center justify-center px-3 py-1 rounded bg-lime-800 text-white font-black text-xs shadow-xs">
                        {totalParalelosNac} paralelos
                      </span>
                    </td>
                  </tr>

                  {/* Fila 2: Total Déficit Focalizado con Apertura */}
                  <tr className="bg-emerald-50/70 font-extrabold text-emerald-950 border-t border-slate-200 text-right">
                    <td className="py-2 px-3 text-left font-extrabold border-r border-slate-300">
                      DÉFICIT EN ÁREAS DE APERTURA
                    </td>
                    <td className="py-2 px-2.5 border-r border-slate-300 font-black text-slate-800 bg-amber-50/50">
                      +{totalDeficitPositivoNac.toLocaleString()} doc.
                    </td>
                    <td className="py-2 px-2.5 border-r border-slate-300 font-black text-slate-800 bg-blue-50/50">
                      +{totalDeficitPositivoNac.toLocaleString()} doc.
                    </td>
                    {dptos.map((dp) => (
                      <td key={dp} className="py-2 px-2 border-r border-slate-200 font-black text-slate-900">
                        {dptoTotales[dp].deficitPositivo > 0 ? `+${dptoTotales[dp].deficitPositivo}` : "0"}
                      </td>
                    ))}
                    <td className="py-2 px-3 border-r border-slate-300 font-black text-slate-900 bg-emerald-100/80">
                      +{totalDeficitPositivoNac.toLocaleString()} doc.
                    </td>
                    <td className="py-2 px-3 text-center border-l border-slate-300 font-black text-lime-900">
                      {totalParalelosNac * 30} plazas
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>

            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 p-3 bg-slate-50 border-t border-slate-200 text-[11px] text-slate-500">
              <div className="flex items-center gap-2">
                <span className="font-bold text-slate-700">Regla Oficial de Admisión:</span>
                <span>Umbral de justificación $ge 6$ docentes en déficit al 2031 (1 paralelo = 30 estudiantes). Potosí: 101/30 = 3 paralelos.</span>
              </div>
              <div className="text-slate-600 font-semibold">
                * En rojo se indican especialidades con superávit acumulado de maestros formados en ESFM.
              </div>
            </div>
          </div>

          {/* Panel de Resumen por Departamento (Distribución Territorial de Cursos) */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
              <div className="w-2.5 h-2.5 rounded-full bg-lime-600" />
              <h4 className="text-sm font-extrabold text-slate-900">
                Distribución Territorial de la Convocatoria de Admisión 2027 ({totalParalelosNac} Paralelos / {totalParalelosNac * 30} Plazas)
              </h4>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {dptosRank.map((dp) => {
                const totPar = dptoTotales[dp].paralelos;
                const defPos = dptoTotales[dp].deficitPositivo;
                const espsConPar = filas.filter((f) => f.dptos[dp].par > 0);

                return (
                  <div
                    key={dp}
                    className={`p-4 rounded-xl border transition-all ${totPar > 0
                      ? "bg-white border-lime-200 shadow-2xs hover:border-lime-300 ring-1 ring-lime-500/10"
                      : "bg-slate-50/70 border-slate-200 opacity-75"
                      }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-black text-slate-900 text-xs">{dp}</span>
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-black ${totPar > 0 ? "bg-lime-100 text-lime-900 border border-lime-300" : "bg-slate-200 text-slate-600"
                          }`}
                      >
                        {totPar > 0 ? `${totPar} paralelo${totPar === 1 ? "" : "s"} (${totPar * 30} plazas)` : "Sin apertura"}
                      </span>
                    </div>

                    <div className="text-[11px] text-slate-500 mb-2">
                      Déficit en áreas autorizadas: <strong>+{defPos} docentes</strong>
                    </div>

                    {totPar > 0 ? (
                      <div className="space-y-1.5 pt-2 border-t border-slate-100">
                        {espsConPar.map((e) => (
                          <div key={e.especialidad} className="flex items-center justify-between text-[11px]">
                            <span className="text-slate-700 font-medium truncate max-w-[200px]" title={e.especialidad}>
                              {e.especialidad}
                            </span>
                            <span className="font-bold text-slate-900 shrink-0 flex items-center gap-1">
                              <span>+{e.dptos[dp].real} doc.</span>
                              <span className="px-1.5 py-0.2 rounded bg-lime-600 text-white text-[9px] font-black">
                                {e.dptos[dp].par}p
                              </span>
                            </span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-[10px] text-slate-400 italic pt-2 border-t border-slate-100">
                        Demanda cubierta o con déficit menor al umbral de apertura.
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      );
    }

    return null;
  };

  // ─── Layout Principal ─────────────────────────────────────────────────────
  return (
    <div
      ref={containerRef}
      className={`relative ${isFullscreen ? "fixed inset-0 z-50 bg-slate-50 overflow-y-auto p-6 sm:p-10" : ""}`}
    >
      {/* ── Marca de agua ultra translúcida en segundo plano (no interfiere la lectura) ── */}
      <div className="fixed inset-0 z-10 pointer-events-none select-none overflow-hidden flex items-center justify-center">
        {/* Marca diagonal tenue de fondo */}
        <div className="relative rotate-[-24deg] text-center opacity-[0.03] select-none filter blur-[1.5px]">
          <span className="block text-6xl sm:text-8xl lg:text-9xl font-black tracking-[0.2em] text-slate-900 uppercase">
            DATOS PRELIMINARES
          </span>
          <span className="block text-sm sm:text-xl font-bold tracking-[0.4em] text-slate-700 uppercase mt-2">
            DOCUMENTO DE TRABAJO · EN REVISIÓN
          </span>
        </div>
      </div>
      {/* ── Barra de navegación superior ── */}
      <div className={`bg-white border border-slate-200 rounded-2xl shadow-sm mb-5 px-4 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${isFullscreen ? "sticky top-4 z-10" : ""}`}>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1.5">
            {SLIDES.map((s, i) => {
              const Icon = s.icon;
              const isActive = slide === i;
              return (
                <button
                  key={s.id}
                  onClick={() => setSlide(i)}
                  className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${isActive
                    ? "bg-slate-900 text-white shadow"
                    : "hover:bg-slate-100 text-slate-600"
                    }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">{s.label}</span>
                  <span className="sm:hidden">{i + 1}</span>
                </button>
              );
            })}
          </div>
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-100 text-slate-500 border border-slate-200/80 text-[10px] font-medium">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
            Datos preliminares
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setSlide((s) => Math.max(0, s - 1))}
            disabled={slide === 0}
            className="p-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer transition-all"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-xs font-bold text-slate-500">{slide + 1} / {SLIDES.length}</span>
          <button
            onClick={() => setSlide((s) => Math.min(SLIDES.length - 1, s + 1))}
            disabled={slide === SLIDES.length - 1}
            className="p-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer transition-all"
          >
            <ChevronRight className="w-4 h-4" />
          </button>

          <button
            onClick={toggleFullscreen}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-all cursor-pointer"
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4 text-indigo-600" /> : <Maximize2 className="w-4 h-4 text-indigo-600" />}
            {isFullscreen ? "Salir" : "Pantalla Completa"}
          </button>

          <button
            onClick={handleExport}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-extrabold transition-all shadow cursor-pointer"
          >
            {copied ? <Check className="w-4 h-4" /> : <Download className="w-4 h-4" />}
            {copied ? "Listo" : "CSV"}
          </button>
        </div>
      </div>

      {/* ── Contenido de la Diapositiva ── */}
      <div className="transition-all duration-300">
        {renderSlide()}
      </div>

      {/* ── Footer ── */}
      <div className="mt-6 text-center text-[11px] text-slate-400 font-medium pb-2">
        Fuentes: INE Bolivia (2011–2025) · SIE 2026 ({SIE_2026_TOTAL.toLocaleString()} Estudiantes, {SIE_2026_PUBLICO_TOTAL.toLocaleString()} en Sector Público) · Padrón Docente SEP · UIE/SICH ({data.resumen_nacional_uie.total_ues_auditadas.toLocaleString()} UEs) · DGFM ESFM · {data.metadatos.fecha_generacion}
      </div>
    </div>
  );
}
