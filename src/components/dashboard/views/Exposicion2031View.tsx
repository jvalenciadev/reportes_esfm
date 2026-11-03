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

const SLIDES = [
  { id: "slide1", label: "Crecimiento Poblacional", icon: TrendingUp },
  { id: "slide2", label: "Tendencia de Maestros", icon: Users },
  { id: "slide3", label: "Proyección Egresados ESFM", icon: GraduationCap },
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
                  Diapositiva 1 de 3 · Diagnóstico Demográfico y Matrícula Escolar
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
                    <th className="px-3 py-2.5 text-emerald-700">Cobertura Pública (SIE/INE)</th>
                    <th className="px-3 py-2.5">Var. INE (24→31)</th>
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
                      <td className="px-3 py-2.5 font-black text-emerald-700">{dpto.tasa_cobertura_publica}%</td>
                      <td className={`px-3 py-2.5 font-black ${dpto.variacion_pct < 0 ? "text-rose-600" : "text-emerald-600"}`}>
                        {dpto.variacion_pct > 0 ? "+" : ""}{dpto.variacion_pct}%
                      </td>
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
                    <td className="px-3 py-2.5 font-black text-emerald-800">{TASA_COBERTURA_PUBLICA_2026}%</td>
                    <td className="px-3 py-2.5 text-rose-700">-13.0%</td>
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
                Dictamen de Apertura de Especialidades ESFM 2031
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

              {/* 6 Stat Cards Oficiales UIE / SIE UE de la Especialidad */}
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs space-y-1">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center justify-between">
                    <span>Unidades Educativas</span>
                    <School className="w-3.5 h-3.5 text-blue-600" />
                  </div>
                  <div className="text-xl font-black text-slate-900">
                    {(selectedEsp.total_ues || 4885).toLocaleString()}
                  </div>
                  <div className="text-[10px] text-slate-500">Colegios con esta especialidad</div>
                </div>

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

                <div className="bg-rose-50/80 p-3.5 rounded-2xl border border-rose-200 shadow-xs space-y-1">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-rose-700 flex items-center justify-between">
                    <span>Déficit de Horas</span>
                    <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
                  </div>
                  <div className="text-xl font-black text-rose-900">
                    {selectedEsp.deficit_horas_uie_nacional.toLocaleString()}h
                  </div>
                  <div className="text-[10px] text-rose-700 font-bold">
                    Ítems: {selectedEsp.items_deficit_uie_nacional} · {selectedEsp.pct_cobertura_uie_nacional}% cob.
                  </div>
                </div>

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

              {/* Barras por departamento */}
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

    return null;
  };

  // ─── Layout Principal ─────────────────────────────────────────────────────
  return (
    <div
      ref={containerRef}
      className={`${isFullscreen ? "fixed inset-0 z-50 bg-slate-50 overflow-y-auto p-6 sm:p-10" : ""}`}
    >
      {/* ── Barra de navegación superior ── */}
      <div className={`bg-white border border-slate-200 rounded-2xl shadow-sm mb-5 px-4 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${isFullscreen ? "sticky top-4 z-10" : ""}`}>
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
