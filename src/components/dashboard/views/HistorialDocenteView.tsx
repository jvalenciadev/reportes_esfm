"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  Users,
  UserCheck,
  UserX,
  UserPlus,
  UserMinus,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Building2,
  Filter,
  Download,
  RefreshCw,
  BarChart3,
  Layers,
  ArrowRight,
  ChevronRight,
  ShieldAlert,
  ArrowUpDown,
  Search,
  Sparkles,
  HelpCircle,
  CheckCircle2,
  Copy,
  Check
} from "lucide-react";

// ─── Interfaces ─────────────────────────────────────────────────────────────
interface DptoSalienteEntrante {
  departamento: string;
  salientes: number;
  entrantes: number;
  neto: number;
  salientes_2024_2025?: number;
  entrantes_2024_2025?: number;
}

interface SalientesData {
  total_regular_2024: number;
  total_regular_2025: number;
  variacion_neta?: number;
  total_salientes?: number;
  total_entrantes?: number;
  por_departamento: DptoSalienteEntrante[];
}

interface DptoImpertinencia {
  departamento: string;
  total_docentes: number;
  impertinentes: number;
  porcentaje: number;
}

interface ImpertinenciasData {
  total_docentes?: number;
  total_docentes_2026?: number;
  total_impertinentes: number;
  porcentaje_nacional?: number;
  por_departamento: DptoImpertinencia[];
}

interface DptoSinCargo {
  departamento: string;
  sin_cargo?: number;
  sin_presencia?: number;
  sin_presencia_2026?: number;
}

interface SinCargoData {
  sin_cargo_2026: { total: number; descripcion: string; por_departamento: DptoSinCargo[] };
  sin_presencia_2026: { total: number; descripcion: string; por_departamento: DptoSinCargo[] };
}

type TabId = "salientes" | "impertinencias" | "sin_cargo";
type ViewMode = "cards" | "table";

const DEPARTAMENTOS_BOLIVIA = [
  "TODOS",
  "BENI",
  "CHUQUISACA",
  "COCHABAMBA",
  "LA PAZ",
  "ORURO",
  "PANDO",
  "POTOSI",
  "SANTA CRUZ",
  "TARIJA",
];

export default function HistorialDocenteView() {
  const [activeTab, setActiveTab] = useState<TabId>("salientes");
  const [viewMode, setViewMode] = useState<ViewMode>("cards");
  const [selectedDpto, setSelectedDpto] = useState<string>("TODOS");
  const [searchTerm, setSearchTerm] = useState("");

  const [salientes, setSalientes] = useState<SalientesData | null>(null);
  const [impertinencias, setImpertinencias] = useState<ImpertinenciasData | null>(null);
  const [sinCargo, setSinCargo] = useState<SinCargoData | null>(null);
  const [loading, setLoading] = useState(false);

  // Sorting
  const [sortField, setSortField] = useState<string>("");
  const [sortAsc, setSortAsc] = useState<boolean>(false);

  // Feedback toast
  const [copied, setCopied] = useState(false);

  // Fetch API
  const fetchData = useCallback(async (tab: TabId) => {
    setLoading(true);
    try {
      const endpoint =
        tab === "sin_cargo"
          ? "/api/historial-docente?report=sin_cargo"
          : tab === "impertinencias"
          ? "/api/historial-docente?report=impertinencias"
          : "/api/historial-docente?report=salientes_entrantes";

      const res = await fetch(endpoint);
      if (!res.ok) throw new Error("Error consultando API");
      const data = await res.json();

      if (tab === "salientes") setSalientes(data);
      else if (tab === "impertinencias") setImpertinencias(data);
      else setSinCargo(data);
    } catch (err) {
      console.error("Error al cargar historial:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData(activeTab);
  }, [activeTab, fetchData]);

  const handleTabChange = (t: TabId) => {
    setActiveTab(t);
    setSortField("");
    setSortAsc(false);
  };

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(false);
    }
  };

  // Helper de copia/exportación rápida a CSV
  const exportCurrentData = () => {
    let csvContent = "";
    if (activeTab === "salientes" && salientes) {
      csvContent = "Departamento,Salientes (2024 no 2025),Entrantes (2025 no 2024),Balance Neto\n";
      salientes.por_departamento.forEach((r) => {
        csvContent += `"${r.departamento}",${r.salientes},${r.entrantes},${r.neto}\n`;
      });
    } else if (activeTab === "impertinencias" && impertinencias) {
      csvContent = "Departamento,Total Docentes 2026,Impertinentes,Porcentaje Impertinencia (%)\n";
      impertinencias.por_departamento.forEach((r) => {
        csvContent += `"${r.departamento}",${r.total_docentes},${r.impertinentes},${r.porcentaje}\n`;
      });
    } else if (activeTab === "sin_cargo" && sinCargo) {
      csvContent = "Departamento,Sin Cargo en Hoja 2026,Docentes 2025 Fuera de 2026\n";
      const mapa: Record<string, { a: number; b: number }> = {};
      sinCargo.sin_cargo_2026.por_departamento.forEach((r) => {
        mapa[r.departamento] = { a: r.sin_cargo ?? 0, b: 0 };
      });
      sinCargo.sin_presencia_2026.por_departamento.forEach((r) => {
        if (!mapa[r.departamento]) mapa[r.departamento] = { a: 0, b: 0 };
        mapa[r.departamento].b = r.sin_presencia ?? 0;
      });
      Object.entries(mapa).forEach(([dpto, v]) => {
        csvContent += `"${dpto}",${v.a},${v.b}\n`;
      });
    }

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `reporte_${activeTab}_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  // ───────────────────────────────────────────────────────────────────────────
  // SECCIÓN 1: SALIENTES Y ENTRANTES 2024 → 2025
  // ───────────────────────────────────────────────────────────────────────────
  const filteredSalientes = useMemo(() => {
    if (!salientes) return [];
    let list = [...salientes.por_departamento];

    if (selectedDpto !== "TODOS") {
      list = list.filter((r) => r.departamento.toUpperCase() === selectedDpto.toUpperCase());
    }
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      list = list.filter((r) => r.departamento.toLowerCase().includes(q));
    }

    if (sortField) {
      list.sort((a, b) => {
        const valA = (a as unknown as Record<string, number | string>)[sortField];
        const valB = (b as unknown as Record<string, number | string>)[sortField];
        if (typeof valA === "number" && typeof valB === "number") {
          return sortAsc ? valA - valB : valB - valA;
        }
        return sortAsc
          ? String(valA).localeCompare(String(valB))
          : String(valB).localeCompare(String(valA));
      });
    }
    return list;
  }, [salientes, selectedDpto, searchTerm, sortField, sortAsc]);

  const maxSaliente = useMemo(() => {
    if (!salientes) return 1;
    return Math.max(...salientes.por_departamento.map((d) => Math.max(d.salientes, d.entrantes)), 1);
  }, [salientes]);

  const totalSalientes = useMemo(() => {
    return salientes?.por_departamento.reduce((acc, cur) => acc + cur.salientes, 0) ?? 0;
  }, [salientes]);

  const totalEntrantes = useMemo(() => {
    return salientes?.por_departamento.reduce((acc, cur) => acc + cur.entrantes, 0) ?? 0;
  }, [salientes]);

  // ───────────────────────────────────────────────────────────────────────────
  // SECCIÓN 2: IMPERTINENCIAS 2026
  // ───────────────────────────────────────────────────────────────────────────
  const filteredImpertinencias = useMemo(() => {
    if (!impertinencias) return [];
    let list = [...impertinencias.por_departamento];

    if (selectedDpto !== "TODOS") {
      list = list.filter((r) => r.departamento.toUpperCase() === selectedDpto.toUpperCase());
    }
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      list = list.filter((r) => r.departamento.toLowerCase().includes(q));
    }

    if (sortField) {
      list.sort((a, b) => {
        const valA = (a as unknown as Record<string, number | string>)[sortField];
        const valB = (b as unknown as Record<string, number | string>)[sortField];
        if (typeof valA === "number" && typeof valB === "number") {
          return sortAsc ? valA - valB : valB - valA;
        }
        return sortAsc
          ? String(valA).localeCompare(String(valB))
          : String(valB).localeCompare(String(valA));
      });
    }
    return list;
  }, [impertinencias, selectedDpto, searchTerm, sortField, sortAsc]);

  // ───────────────────────────────────────────────────────────────────────────
  // SECCIÓN 3: SIN CARGO 2026
  // ───────────────────────────────────────────────────────────────────────────
  const combinedSinCargo = useMemo(() => {
    if (!sinCargo) return [];
    const map: Record<string, { departamento: string; sinCargo: number; sinPresencia: number }> = {};

    sinCargo.sin_cargo_2026.por_departamento.forEach((r) => {
      map[r.departamento] = {
        departamento: r.departamento,
        sinCargo: r.sin_cargo ?? 0,
        sinPresencia: 0,
      };
    });

    sinCargo.sin_presencia_2026.por_departamento.forEach((r) => {
      if (!map[r.departamento]) {
        map[r.departamento] = {
          departamento: r.departamento,
          sinCargo: 0,
          sinPresencia: r.sin_presencia ?? r.sin_presencia_2026 ?? 0,
        };
      } else {
        map[r.departamento].sinPresencia = r.sin_presencia ?? r.sin_presencia_2026 ?? 0;
      }
    });

    let list = Object.values(map);

    if (selectedDpto !== "TODOS") {
      list = list.filter((r) => r.departamento.toUpperCase() === selectedDpto.toUpperCase());
    }
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      list = list.filter((r) => r.departamento.toLowerCase().includes(q));
    }

    if (sortField) {
      list.sort((a, b) => {
        const valA = (a as unknown as Record<string, number | string>)[sortField];
        const valB = (b as unknown as Record<string, number | string>)[sortField];
        if (typeof valA === "number" && typeof valB === "number") {
          return sortAsc ? valA - valB : valB - valA;
        }
        return sortAsc
          ? String(valA).localeCompare(String(valB))
          : String(valB).localeCompare(String(valA));
      });
    } else {
      list.sort((a, b) => b.sinCargo - a.sinCargo);
    }

    return list;
  }, [sinCargo, selectedDpto, searchTerm, sortField, sortAsc]);

  return (
    <div className="space-y-6 text-slate-800 animate-fadeIn">
      {/* ─── ENCABEZADO PRINCIPAL (HERO MINISTERIAL) ────────────────────── */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 text-white rounded-3xl p-6 sm:p-8 shadow-xl relative overflow-hidden border border-slate-700/50">
        <div className="absolute -right-10 -bottom-10 w-72 h-72 bg-[#c9a751]/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute right-40 -top-10 w-60 h-60 bg-indigo-500/10 rounded-full blur-2xl pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#c9a751]/20 border border-[#c9a751]/40 text-[#f3df9b] text-xs font-semibold tracking-wide uppercase">
              <Sparkles className="w-3.5 h-3.5 text-[#c9a751]" />
              Auditoría Histórica de Planillas SEP 2024 – 2026
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
              Historial y Movilidad de Maestros del Subsistema Regular
            </h1>
            <p className="text-sm text-slate-300 leading-relaxed">
              Consolidación oficial de más de 533.000 registros del padrón docente: cruce por Cédula de Identidad (CI), trazabilidad de ingresos/egresos, evaluación de pertinencia académica y detección de ítems sin asignación.
            </p>
          </div>

          <div className="flex flex-wrap sm:flex-nowrap items-center gap-3">
            <button
              onClick={() => fetchData(activeTab)}
              disabled={loading}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-semibold backdrop-blur-sm border border-white/15 transition-all shadow-sm active:scale-95 disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
              Actualizar Datos
            </button>
            <button
              onClick={exportCurrentData}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#c9a751] hover:bg-[#d8b45a] text-slate-950 text-xs font-bold transition-all shadow-lg shadow-[#c9a751]/20 active:scale-95"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-950" /> : <Download className="w-4 h-4 text-slate-950" />}
              {copied ? "Descargado" : "Exportar CSV"}
            </button>
          </div>
        </div>

        {/* ─── PESTAÑAS PRINCIPALES INTERACTIVAS ──────────────────────────── */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-8 pt-6 border-t border-white/10">
          {/* Tab 1 */}
          <button
            onClick={() => handleTabChange("salientes")}
            className={`text-left p-4 rounded-2xl transition-all border relative overflow-hidden group ${
              activeTab === "salientes"
                ? "bg-white text-slate-900 border-white shadow-lg ring-2 ring-[#c9a751]/60"
                : "bg-white/5 hover:bg-white/10 text-slate-200 border-white/10"
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <span
                className={`p-2 rounded-xl ${
                  activeTab === "salientes" ? "bg-indigo-100 text-indigo-700" : "bg-white/10 text-indigo-300"
                }`}
              >
                <TrendingUp className="w-5 h-5" />
              </span>
              <span
                className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                  activeTab === "salientes" ? "bg-emerald-100 text-emerald-800" : "bg-emerald-500/20 text-emerald-300"
                }`}
              >
                +1.219 Neto
              </span>
            </div>
            <div className="text-xs font-semibold opacity-75 uppercase tracking-wider">Reporte 1</div>
            <div className="text-base font-bold mt-0.5">Salientes vs Entrantes</div>
            <div className="text-xs mt-1 line-clamp-1 opacity-70">
              Cruce por CI de gestiones 2024 a 2025
            </div>
          </button>

          {/* Tab 2 */}
          <button
            onClick={() => handleTabChange("impertinencias")}
            className={`text-left p-4 rounded-2xl transition-all border relative overflow-hidden group ${
              activeTab === "impertinencias"
                ? "bg-white text-slate-900 border-white shadow-lg ring-2 ring-[#c9a751]/60"
                : "bg-white/5 hover:bg-white/10 text-slate-200 border-white/10"
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <span
                className={`p-2 rounded-xl ${
                  activeTab === "impertinencias" ? "bg-amber-100 text-amber-700" : "bg-white/10 text-amber-300"
                }`}
              >
                <AlertTriangle className="w-5 h-5" />
              </span>
              <span
                className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                  activeTab === "impertinencias" ? "bg-amber-100 text-amber-800" : "bg-amber-500/20 text-amber-300"
                }`}
              >
                17.22% Nac.
              </span>
            </div>
            <div className="text-xs font-semibold opacity-75 uppercase tracking-wider">Reporte 2</div>
            <div className="text-base font-bold mt-0.5">Impertinencias 2026</div>
            <div className="text-xs mt-1 line-clamp-1 opacity-70">
              Docentes ejerciendo fuera de su especialidad
            </div>
          </button>

          {/* Tab 3 */}
          <button
            onClick={() => handleTabChange("sin_cargo")}
            className={`text-left p-4 rounded-2xl transition-all border relative overflow-hidden group ${
              activeTab === "sin_cargo"
                ? "bg-white text-slate-900 border-white shadow-lg ring-2 ring-[#c9a751]/60"
                : "bg-white/5 hover:bg-white/10 text-slate-200 border-white/10"
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <span
                className={`p-2 rounded-xl ${
                  activeTab === "sin_cargo" ? "bg-rose-100 text-rose-700" : "bg-white/10 text-rose-300"
                }`}
              >
                <UserX className="w-5 h-5" />
              </span>
              <span
                className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                  activeTab === "sin_cargo" ? "bg-rose-100 text-rose-800" : "bg-rose-500/20 text-rose-300"
                }`}
              >
                2.684 Registros
              </span>
            </div>
            <div className="text-xs font-semibold opacity-75 uppercase tracking-wider">Reporte 3</div>
            <div className="text-base font-bold mt-0.5">Maestros sin Cargo</div>
            <div className="text-xs mt-1 line-clamp-1 opacity-70">
              Campo cargo vacío en 2026 y bajas de 2025
            </div>
          </button>
        </div>
      </div>

      {/* ─── BARRA DE CONTROL Y FILTROS RÁPIDOS ──────────────────────────── */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs flex flex-wrap items-center justify-between gap-4">
        {/* Selector de Departamento en Chips */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 max-w-full text-xs font-medium scrollbar-thin">
          <span className="text-slate-400 font-semibold px-2 flex items-center gap-1">
            <Filter className="w-3.5 h-3.5" /> Dpto:
          </span>
          {DEPARTAMENTOS_BOLIVIA.map((dep) => (
            <button
              key={dep}
              onClick={() => setSelectedDpto(dep)}
              className={`px-3 py-1.5 rounded-lg transition-all whitespace-nowrap ${
                selectedDpto === dep
                  ? "bg-slate-900 text-white font-bold shadow-xs"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              {dep === "TODOS" ? "Todos los Departamentos" : dep}
            </button>
          ))}
        </div>

        {/* Buscador y Toggle de Vista */}
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-56">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Buscar departamento..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#c9a751]/50 bg-slate-50/50"
            />
          </div>

          <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs">
            <button
              onClick={() => setViewMode("cards")}
              className={`p-1.5 rounded-lg flex items-center gap-1 font-semibold transition-all ${
                viewMode === "cards" ? "bg-white text-slate-900 shadow-xs" : "text-slate-500 hover:text-slate-800"
              }`}
              title="Vista en Tarjetas Analíticas"
            >
              <BarChart3 className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Tarjetas</span>
            </button>
            <button
              onClick={() => setViewMode("table")}
              className={`p-1.5 rounded-lg flex items-center gap-1 font-semibold transition-all ${
                viewMode === "table" ? "bg-white text-slate-900 shadow-xs" : "text-slate-500 hover:text-slate-800"
              }`}
              title="Vista en Tabla Completa"
            >
              <Layers className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Tabla</span>
            </button>
          </div>
        </div>
      </div>

      {/* ─── CONTENIDO DINÁMICO SEGÚN PESTAÑA ────────────────────────────── */}
      {loading ? (
        <div className="bg-white rounded-3xl p-16 text-center border border-slate-200 shadow-xs flex flex-col items-center justify-center gap-3">
          <div className="w-10 h-10 border-4 border-[#c9a751] border-t-transparent rounded-full animate-spin" />
          <p className="text-slate-600 font-medium text-sm">Procesando y agregando base de datos oficial...</p>
        </div>
      ) : (
        <>
          {/* =================================================================== */}
          {/* VISTA 1: SALIENTES Y ENTRANTES 2024 - 2025 */}
          {/* =================================================================== */}
          {activeTab === "salientes" && salientes && (
            <div className="space-y-6">
              {/* Diagrama de Flujo y Balance Nacional */}
              <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/90 shadow-sm">
                <div className="flex items-center justify-between mb-6 flex-wrap gap-2">
                  <div>
                    <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                      <TrendingUp className="w-5 h-5 text-indigo-600" />
                      Dinámica Nacional del Movimiento Docente (2024 → 2025)
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Seguimiento unívoco por Cédula de Identidad en todo el Subsistema de Educación Regular
                    </p>
                  </div>
                  <span className="text-xs font-semibold px-3 py-1 bg-indigo-50 text-indigo-700 rounded-full border border-indigo-200">
                    Tasa de Reposición: 1.35x
                  </span>
                </div>

                {/* Tarjetas de Embudo de Flujo */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                  {/* Total 2024 */}
                  <div className="bg-slate-50/80 rounded-2xl p-4 border border-slate-200 flex flex-col justify-between">
                    <div>
                      <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Planilla 2024</div>
                      <div className="text-2xl font-black text-slate-800 mt-1">
                        {salientes.total_regular_2024.toLocaleString("es-BO")}
                      </div>
                    </div>
                    <div className="text-xs text-slate-500 mt-3 pt-2 border-t border-slate-200 flex items-center gap-1">
                      <Users className="w-3.5 h-3.5 text-slate-400" />
                      Maestros regulares activos
                    </div>
                  </div>

                  {/* Salientes */}
                  <div className="bg-rose-50/70 rounded-2xl p-4 border border-rose-200 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold text-rose-600 uppercase tracking-wider">Salientes</span>
                        <UserMinus className="w-4 h-4 text-rose-500" />
                      </div>
                      <div className="text-2xl font-black text-rose-600 mt-1">
                        -{totalSalientes.toLocaleString("es-BO")}
                      </div>
                    </div>
                    <div className="text-xs text-rose-700/80 mt-3 pt-2 border-t border-rose-200">
                      Estaban en 2024, no en 2025 (2.21%)
                    </div>
                  </div>

                  {/* Entrantes */}
                  <div className="bg-emerald-50/70 rounded-2xl p-4 border border-emerald-200 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold text-emerald-600 uppercase tracking-wider">Nuevos Ingresos</span>
                        <UserPlus className="w-4 h-4 text-emerald-500" />
                      </div>
                      <div className="text-2xl font-black text-emerald-600 mt-1">
                        +{totalEntrantes.toLocaleString("es-BO")}
                      </div>
                    </div>
                    <div className="text-xs text-emerald-700/80 mt-3 pt-2 border-t border-emerald-200">
                      Están en 2025, no en 2024 (2.96%)
                    </div>
                  </div>

                  {/* Total 2025 */}
                  <div className="bg-slate-50/80 rounded-2xl p-4 border border-slate-200 flex flex-col justify-between">
                    <div>
                      <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Planilla 2025</div>
                      <div className="text-2xl font-black text-slate-800 mt-1">
                        {salientes.total_regular_2025.toLocaleString("es-BO")}
                      </div>
                    </div>
                    <div className="text-xs text-slate-500 mt-3 pt-2 border-t border-slate-200 flex items-center gap-1">
                      <Users className="w-3.5 h-3.5 text-slate-400" />
                      Maestros regulares activos
                    </div>
                  </div>

                  {/* Crecimiento Neto */}
                  <div className="bg-gradient-to-br from-indigo-900 to-slate-900 rounded-2xl p-4 text-white flex flex-col justify-between shadow-md">
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold text-indigo-300 uppercase tracking-wider">Balance Neto</span>
                        <TrendingUp className="w-4 h-4 text-emerald-400" />
                      </div>
                      <div className="text-2xl font-black text-emerald-400 mt-1">
                        +{((salientes.variacion_neta ?? (salientes.total_regular_2025 - salientes.total_regular_2024)) ?? 0).toLocaleString("es-BO")}
                      </div>
                    </div>
                    <div className="text-xs text-slate-300 mt-3 pt-2 border-t border-white/10">
                      Incremento neto de +0.78%
                    </div>
                  </div>
                </div>
              </div>

              {/* Vista Condicional: Cards o Tabla */}
              {viewMode === "cards" ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                  {filteredSalientes.map((d) => {
                    const dSal = d.salientes ?? d.salientes_2024_2025 ?? 0;
                    const dEnt = d.entrantes ?? d.entrantes_2024_2025 ?? 0;
                    const salPct = ((dSal / maxSaliente) * 100).toFixed(0);
                    const entPct = ((dEnt / maxSaliente) * 100).toFixed(0);
                    const reposicion = (dEnt / (dSal || 1)).toFixed(2);

                    return (
                      <div
                        key={d.departamento}
                        className="bg-white rounded-2xl p-5 border border-slate-200/90 shadow-xs hover:shadow-md transition-all group flex flex-col justify-between"
                      >
                        <div>
                          <div className="flex items-start justify-between gap-2 mb-4">
                            <div>
                              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Departamento</div>
                              <h4 className="text-lg font-black text-slate-800 group-hover:text-indigo-600 transition-colors">
                                {d.departamento}
                              </h4>
                            </div>
                            <span
                              className={`text-xs font-black px-2.5 py-1 rounded-full border ${
                                d.neto >= 0
                                  ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                  : "bg-rose-50 text-rose-700 border-rose-200"
                              }`}
                            >
                              {d.neto >= 0 ? `+${d.neto.toLocaleString()}` : d.neto.toLocaleString()} Neto
                            </span>
                          </div>

                          {/* Comparativo Visual Salientes vs Entrantes */}
                          <div className="space-y-3 bg-slate-50/70 p-3.5 rounded-xl border border-slate-100">
                            <div>
                              <div className="flex justify-between text-xs mb-1">
                                <span className="font-semibold text-rose-600 flex items-center gap-1">
                                  <UserMinus className="w-3.5 h-3.5" /> Salientes
                                </span>
                                <span className="font-bold text-slate-700">{(d.salientes ?? d.salientes_2024_2025 ?? 0).toLocaleString()}</span>
                              </div>
                              <div className="h-2 w-full bg-slate-200 rounded-full overflow-hidden">
                                <div
                                  className="h-full bg-rose-500 rounded-full transition-all duration-500"
                                  style={{ width: `${salPct}%` }}
                                />
                              </div>
                            </div>

                            <div>
                              <div className="flex justify-between text-xs mb-1">
                                <span className="font-semibold text-emerald-600 flex items-center gap-1">
                                  <UserPlus className="w-3.5 h-3.5" /> Nuevos Entrantes
                                </span>
                                <span className="font-bold text-slate-700">{(d.entrantes ?? d.entrantes_2024_2025 ?? 0).toLocaleString()}</span>
                              </div>
                              <div className="h-2 w-full bg-slate-200 rounded-full overflow-hidden">
                                <div
                                  className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                                  style={{ width: `${entPct}%` }}
                                />
                              </div>
                            </div>
                          </div>
                        </div>

                        <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                          <span>Índice de reposición:</span>
                          <span className="font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded-md">
                            {reposicion}x nuevos / baja
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 text-[11px] font-bold uppercase tracking-wider">
                          <th className="py-3.5 px-4 cursor-pointer hover:bg-slate-100" onClick={() => handleSort("departamento")}>
                            <div className="flex items-center gap-1">
                              Departamento <ArrowUpDown className="w-3 h-3 text-slate-400" />
                            </div>
                          </th>
                          <th className="py-3.5 px-4 cursor-pointer hover:bg-slate-100 text-rose-600" onClick={() => handleSort("salientes")}>
                            <div className="flex items-center gap-1">
                              Salientes (2024 no 2025) <ArrowUpDown className="w-3 h-3 text-slate-400" />
                            </div>
                          </th>
                          <th className="py-3.5 px-4 cursor-pointer hover:bg-slate-100 text-emerald-600" onClick={() => handleSort("entrantes")}>
                            <div className="flex items-center gap-1">
                              Nuevos Entrantes (2025) <ArrowUpDown className="w-3 h-3 text-slate-400" />
                            </div>
                          </th>
                          <th className="py-3.5 px-4 cursor-pointer hover:bg-slate-100" onClick={() => handleSort("neto")}>
                            <div className="flex items-center gap-1">
                              Balance Neto <ArrowUpDown className="w-3 h-3 text-slate-400" />
                            </div>
                          </th>
                          <th className="py-3.5 px-4 text-center">Gráfico Comparativo</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-xs">
                        {filteredSalientes.map((r) => (
                          <tr key={r.departamento} className="hover:bg-slate-50/80 transition-colors">
                            <td className="py-3.5 px-4 font-bold text-slate-800">{r.departamento}</td>
                            <td className="py-3.5 px-4 font-semibold text-rose-600">{(r.salientes ?? r.salientes_2024_2025 ?? 0).toLocaleString()}</td>
                            <td className="py-3.5 px-4 font-semibold text-emerald-600">{(r.entrantes ?? r.entrantes_2024_2025 ?? 0).toLocaleString()}</td>
                            <td className="py-3.5 px-4 font-extrabold">
                              <span
                                className={`inline-flex px-2 py-0.5 rounded-full ${
                                  r.neto >= 0 ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"
                                }`}
                              >
                                {r.neto >= 0 ? `+${r.neto.toLocaleString()}` : r.neto.toLocaleString()}
                              </span>
                            </td>
                            <td className="py-3.5 px-4 min-w-[180px]">
                              <div className="space-y-1">
                                <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                                  <div
                                    className="h-full bg-rose-500 rounded-full"
                                    style={{ width: `${(r.salientes / maxSaliente) * 100}%` }}
                                  />
                                </div>
                                <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                                  <div
                                    className="h-full bg-emerald-500 rounded-full"
                                    style={{ width: `${(r.entrantes / maxSaliente) * 100}%` }}
                                  />
                                </div>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr className="bg-slate-100 font-bold text-slate-800 text-xs border-t border-slate-200">
                          <td className="py-3.5 px-4">TOTAL NACIONAL</td>
                          <td className="py-3.5 px-4 text-rose-600 font-black">{totalSalientes.toLocaleString()}</td>
                          <td className="py-3.5 px-4 text-emerald-600 font-black">{totalEntrantes.toLocaleString()}</td>
                          <td className="py-3.5 px-4 font-black text-indigo-700">
                            +{((salientes.variacion_neta ?? (salientes.total_regular_2025 - salientes.total_regular_2024)) ?? 0).toLocaleString()}
                          </td>
                          <td className="py-3.5 px-4 text-center text-slate-500 font-medium">Planilla auditada</td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* =================================================================== */}
          {/* VISTA 2: IMPERTINENCIAS 2026 */}
          {/* =================================================================== */}
          {activeTab === "impertinencias" && impertinencias && (
            <div className="space-y-6">
              {/* Barra de Diagnóstico Nacional y Semáforo */}
              <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/90 shadow-sm">
                <div className="flex items-center justify-between mb-6 flex-wrap gap-2">
                  <div>
                    <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                      <AlertTriangle className="w-5 h-5 text-amber-500" />
                      Diagnóstico de Pertinencia Docente · Gestión 2026
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Docentes que ejercen un cargo que no coincide con su especialidad académica registrada en el SEP
                    </p>
                  </div>
                  <span className="text-xs font-bold px-3 py-1 bg-amber-50 text-amber-700 rounded-full border border-amber-200 flex items-center gap-1">
                    <ShieldAlert className="w-3.5 h-3.5 text-amber-600" />
                    Índice Nacional: {impertinencias.porcentaje_nacional ?? ((impertinencias.total_impertinentes / ((impertinencias.total_docentes || impertinencias.total_docentes_2026) || 1)) * 100).toFixed(2)}%
                  </span>
                </div>

                {/* Barra Visual de Pertinencia Nacional */}
                <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200/80 space-y-3">
                  {(() => {
                    const totalDoc = impertinencias.total_docentes ?? impertinencias.total_docentes_2026 ?? 0;
                    const totalImp = impertinencias.total_impertinentes ?? 0;
                    const pctNac = impertinencias.porcentaje_nacional ?? (totalDoc > 0 ? Number(((totalImp / totalDoc) * 100).toFixed(2)) : 0);
                    return (
                      <>
                        <div className="flex justify-between items-center text-xs">
                          <div className="flex items-center gap-2">
                            <span className="w-3 h-3 rounded-full bg-emerald-500" />
                            <span className="font-bold text-slate-700">
                              Pertinentes: {(totalDoc - totalImp).toLocaleString("es-BO")}{" "}
                              <span className="text-slate-400 font-normal">
                                ({(100 - pctNac).toFixed(2)}%)
                              </span>
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="w-3 h-3 rounded-full bg-amber-500" />
                            <span className="font-bold text-amber-700">
                              Impertinentes: {totalImp.toLocaleString("es-BO")}{" "}
                              <span className="text-amber-500 font-normal">({pctNac}%)</span>
                            </span>
                          </div>
                        </div>

                        <div className="h-4 w-full bg-slate-200 rounded-full overflow-hidden flex shadow-inner">
                          <div
                            className="h-full bg-gradient-to-r from-emerald-500 to-teal-500 transition-all duration-700"
                            style={{ width: `${100 - pctNac}%` }}
                            title="Pertinentes"
                          />
                          <div
                            className="h-full bg-gradient-to-r from-amber-500 to-rose-500 transition-all duration-700"
                            style={{ width: `${pctNac}%` }}
                            title="Impertinentes"
                          />
                        </div>
                      </>
                    );
                  })()}
                </div>

                {/* 3 Callouts Semáforo */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-5">
                  <div className="bg-rose-50/60 p-4 rounded-xl border border-rose-200/70">
                    <div className="text-[11px] font-bold text-rose-700 uppercase tracking-wide">
                      Alerta Crítica (&gt; 20%)
                    </div>
                    <div className="text-sm font-semibold text-slate-800 mt-1">Pando, Beni y Tarija</div>
                    <div className="text-xs text-rose-600 mt-0.5">
                      Pando lidera con 26.2% de impertinencia en aula.
                    </div>
                  </div>
                  <div className="bg-amber-50/60 p-4 rounded-xl border border-amber-200/70">
                    <div className="text-[11px] font-bold text-amber-700 uppercase tracking-wide">
                      Nivel Medio (15% - 20%)
                    </div>
                    <div className="text-sm font-semibold text-slate-800 mt-1">La Paz, Santa Cruz, Cochabamba, Potosí</div>
                    <div className="text-xs text-amber-600 mt-0.5">
                      Concentran el mayor volumen bruto en maestros.
                    </div>
                  </div>
                  <div className="bg-emerald-50/60 p-4 rounded-xl border border-emerald-200/70">
                    <div className="text-[11px] font-bold text-emerald-700 uppercase tracking-wide">
                      Mejor Alineación (&lt; 15%)
                    </div>
                    <div className="text-sm font-semibold text-slate-800 mt-1">Oruro (14.1%) y Chuquisaca (15.5%)</div>
                    <div className="text-xs text-emerald-600 mt-0.5">Mayor compatibilidad de formación académica.</div>
                  </div>
                </div>
              </div>

              {/* Cards o Tabla */}
              {viewMode === "cards" ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                  {filteredImpertinencias.map((d) => {
                    const esCritico = d.porcentaje >= 20;
                    const esModerado = d.porcentaje >= 16 && d.porcentaje < 20;

                    return (
                      <div
                        key={d.departamento}
                        className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs hover:shadow-md transition-all group flex flex-col justify-between"
                      >
                        <div>
                          <div className="flex items-start justify-between gap-2 mb-3">
                            <div>
                              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Departamento</div>
                              <h4 className="text-lg font-black text-slate-800 group-hover:text-amber-600 transition-colors">
                                {d.departamento}
                              </h4>
                            </div>
                            <span
                              className={`text-xs font-black px-2.5 py-1 rounded-full border ${
                                esCritico
                                  ? "bg-rose-50 text-rose-700 border-rose-200"
                                  : esModerado
                                  ? "bg-amber-50 text-amber-700 border-amber-200"
                                  : "bg-emerald-50 text-emerald-700 border-emerald-200"
                              }`}
                            >
                              {d.porcentaje}% Impertinencia
                            </span>
                          </div>

                          <div className="space-y-3 bg-slate-50/70 p-3.5 rounded-xl border border-slate-100 mt-2">
                            <div className="flex justify-between text-xs">
                              <span className="text-slate-500 font-medium">Total Docentes:</span>
                              <span className="font-bold text-slate-800">{d.total_docentes.toLocaleString()}</span>
                            </div>
                            <div className="flex justify-between text-xs">
                              <span className="text-rose-600 font-medium">Maestros Impertinentes:</span>
                              <span className="font-bold text-rose-600">{d.impertinentes.toLocaleString()}</span>
                            </div>
                            <div className="flex justify-between text-xs">
                              <span className="text-emerald-600 font-medium">Maestros Pertinentes:</span>
                              <span className="font-bold text-emerald-600">
                                {(d.total_docentes - d.impertinentes).toLocaleString()}
                              </span>
                            </div>

                            <div className="pt-2">
                              <div className="h-2 w-full bg-slate-200 rounded-full overflow-hidden">
                                <div
                                  className={`h-full rounded-full transition-all duration-500 ${
                                    esCritico ? "bg-rose-500" : esModerado ? "bg-amber-500" : "bg-emerald-500"
                                  }`}
                                  style={{ width: `${d.porcentaje}%` }}
                                />
                              </div>
                            </div>
                          </div>
                        </div>

                        <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                          <span>Estado ministerial:</span>
                          <span
                            className={`font-semibold ${
                              esCritico ? "text-rose-600" : esModerado ? "text-amber-600" : "text-emerald-600"
                            }`}
                          >
                            {esCritico ? "Atención Requerida" : esModerado ? "Monitoreo Normal" : "Rango Aceptable"}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 text-[11px] font-bold uppercase tracking-wider">
                          <th className="py-3.5 px-4 cursor-pointer hover:bg-slate-100" onClick={() => handleSort("departamento")}>
                            <div className="flex items-center gap-1">
                              Departamento <ArrowUpDown className="w-3 h-3 text-slate-400" />
                            </div>
                          </th>
                          <th className="py-3.5 px-4 cursor-pointer hover:bg-slate-100" onClick={() => handleSort("total_docentes")}>
                            <div className="flex items-center gap-1">
                              Total Docentes 2026 <ArrowUpDown className="w-3 h-3 text-slate-400" />
                            </div>
                          </th>
                          <th className="py-3.5 px-4 cursor-pointer hover:bg-slate-100 text-amber-600" onClick={() => handleSort("impertinentes")}>
                            <div className="flex items-center gap-1">
                              Impertinentes <ArrowUpDown className="w-3 h-3 text-slate-400" />
                            </div>
                          </th>
                          <th className="py-3.5 px-4 cursor-pointer hover:bg-slate-100" onClick={() => handleSort("porcentaje")}>
                            <div className="flex items-center gap-1">
                              % Impertinencia <ArrowUpDown className="w-3 h-3 text-slate-400" />
                            </div>
                          </th>
                          <th className="py-3.5 px-4 text-center">Nivel de Alerta</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-xs">
                        {filteredImpertinencias.map((r) => {
                          const esCritico = r.porcentaje >= 20;
                          return (
                            <tr key={r.departamento} className="hover:bg-slate-50/80 transition-colors">
                              <td className="py-3.5 px-4 font-bold text-slate-800">{r.departamento}</td>
                              <td className="py-3.5 px-4 font-medium text-slate-600">{r.total_docentes.toLocaleString()}</td>
                              <td className="py-3.5 px-4 font-bold text-amber-600">{r.impertinentes.toLocaleString()}</td>
                              <td className="py-3.5 px-4 font-black">
                                <span
                                  className={`px-2.5 py-1 rounded-full ${
                                    esCritico
                                      ? "bg-rose-50 text-rose-700 border border-rose-200"
                                      : "bg-amber-50 text-amber-700 border border-amber-200"
                                  }`}
                                >
                                  {r.porcentaje}%
                                </span>
                              </td>
                              <td className="py-3.5 px-4 min-w-[160px]">
                                <div className="h-2 w-full bg-slate-200 rounded-full overflow-hidden">
                                  <div
                                    className={`h-full rounded-full ${esCritico ? "bg-rose-500" : "bg-amber-500"}`}
                                    style={{ width: `${r.porcentaje}%` }}
                                  />
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                      <tfoot>
                        <tr className="bg-slate-100 font-bold text-slate-800 text-xs border-t border-slate-200">
                          <td className="py-3.5 px-4">TOTAL NACIONAL</td>
                          <td className="py-3.5 px-4">{(impertinencias.total_docentes ?? impertinencias.total_docentes_2026 ?? 0).toLocaleString()}</td>
                          <td className="py-3.5 px-4 text-amber-600 font-black">{(impertinencias.total_impertinentes ?? 0).toLocaleString()}</td>
                          <td className="py-3.5 px-4 font-black text-rose-700">{impertinencias.porcentaje_nacional ?? (((impertinencias.total_impertinentes ?? 0) / ((impertinencias.total_docentes || impertinencias.total_docentes_2026) || 1)) * 100).toFixed(2)}%</td>
                          <td className="py-3.5 px-4 text-center text-slate-500 font-medium">Promedio ponderado</td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* =================================================================== */}
          {/* VISTA 3: MAESTROS SIN CARGO */}
          {/* =================================================================== */}
          {activeTab === "sin_cargo" && sinCargo && (
            <div className="space-y-6">
              {/* Resumen Dual Clarísimo */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {/* Caso 1 */}
                <div className="bg-white rounded-3xl p-6 border-l-4 border-l-rose-500 border-slate-200 shadow-sm relative overflow-hidden">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-[11px] font-bold text-rose-600 uppercase tracking-wider bg-rose-50 px-2.5 py-1 rounded-md border border-rose-200">
                      Caso A · Auditoría 2026
                    </span>
                    <span className="p-2 rounded-xl bg-rose-100 text-rose-700">
                      <UserX className="w-5 h-5" />
                    </span>
                  </div>
                  <h3 className="text-lg font-black text-slate-900">En Planilla 2026 sin Cargo Asignado</h3>
                  <div className="text-3xl font-black text-rose-600 my-2">
                    {sinCargo.sin_cargo_2026.total.toLocaleString("es-BO")}{" "}
                    <span className="text-xs font-semibold text-slate-500">maestros</span>
                  </div>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    Registros oficiales que figuran activos con número de cédula en la nómina 2026 pero mantienen la celda de &quot;cargo&quot; en blanco o sin definir.
                  </p>
                </div>

                {/* Caso 2 */}
                <div className="bg-white rounded-3xl p-6 border-l-4 border-l-indigo-500 border-slate-200 shadow-sm relative overflow-hidden">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-[11px] font-bold text-indigo-600 uppercase tracking-wider bg-indigo-50 px-2.5 py-1 rounded-md border border-indigo-200">
                      Caso B · Transición 2025 → 2026
                    </span>
                    <span className="p-2 rounded-xl bg-indigo-100 text-indigo-700">
                      <ShieldAlert className="w-5 h-5" />
                    </span>
                  </div>
                  <h3 className="text-lg font-black text-slate-900">En Planilla 2025 Fuera del Archivo 2026</h3>
                  <div className="text-3xl font-black text-indigo-600 my-2">
                    {sinCargo.sin_presencia_2026.total.toLocaleString("es-BO")}{" "}
                    <span className="text-xs font-semibold text-slate-500">maestros</span>
                  </div>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    Docentes que figuraban en Educación Regular 2025 y no tienen coincidencia por CI en la base 2026 (jubilaciones, traslados a alternativa/superior, o bajas).
                  </p>
                </div>
              </div>

              {/* Comparador Departamental Side-by-Side */}
              <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm">
                <div className="flex items-center justify-between mb-6 flex-wrap gap-2">
                  <div>
                    <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                      <Building2 className="w-5 h-5 text-indigo-600" />
                      Distribución Departamental de Casos sin Cargo y Discrepancias
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Comparativa directa por departamento para control y conciliación ministerial
                    </p>
                  </div>
                </div>

                {viewMode === "cards" ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                    {combinedSinCargo.map((d) => {
                      const pctA = ((d.sinCargo / (sinCargo.sin_cargo_2026.total || 1)) * 100).toFixed(1);
                      const pctB = ((d.sinPresencia / (sinCargo.sin_presencia_2026.total || 1)) * 100).toFixed(1);

                      return (
                        <div
                          key={d.departamento}
                          className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs hover:shadow-md transition-all group flex flex-col justify-between"
                        >
                          <div>
                            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Departamento</div>
                            <h4 className="text-lg font-black text-slate-800 group-hover:text-indigo-600 transition-colors mb-3">
                              {d.departamento}
                            </h4>

                            <div className="space-y-3 bg-slate-50 p-3.5 rounded-xl border border-slate-100">
                              <div>
                                <div className="flex justify-between text-xs mb-1">
                                  <span className="font-semibold text-rose-600">Cargo Vacío (2026):</span>
                                  <span className="font-bold text-slate-800">{d.sinCargo.toLocaleString()}</span>
                                </div>
                                <div className="h-1.5 w-full bg-slate-200 rounded-full overflow-hidden">
                                  <div className="h-full bg-rose-500 rounded-full" style={{ width: `${pctA}%` }} />
                                </div>
                                <div className="text-[10px] text-slate-400 mt-0.5 text-right">{pctA}% del total nacional</div>
                              </div>

                              <div className="pt-2 border-t border-slate-200">
                                <div className="flex justify-between text-xs mb-1">
                                  <span className="font-semibold text-indigo-600">Bajas de 2025 a 2026:</span>
                                  <span className="font-bold text-slate-800">{d.sinPresencia.toLocaleString()}</span>
                                </div>
                                <div className="h-1.5 w-full bg-slate-200 rounded-full overflow-hidden">
                                  <div className="h-full bg-indigo-500 rounded-full" style={{ width: `${pctB}%` }} />
                                </div>
                                <div className="text-[10px] text-slate-400 mt-0.5 text-right">{pctB}% del total nacional</div>
                              </div>
                            </div>
                          </div>

                          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                            <span>Prioridad de auditoría:</span>
                            <span
                              className={`font-bold ${
                                d.sinCargo > 300 ? "text-rose-600" : d.sinCargo > 100 ? "text-amber-600" : "text-emerald-600"
                              }`}
                            >
                              {d.sinCargo > 300 ? "Alta" : d.sinCargo > 100 ? "Media" : "Normal"}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 text-[11px] font-bold uppercase tracking-wider">
                            <th className="py-3.5 px-4 cursor-pointer hover:bg-slate-100" onClick={() => handleSort("departamento")}>
                              <div className="flex items-center gap-1">
                                Departamento <ArrowUpDown className="w-3 h-3 text-slate-400" />
                              </div>
                            </th>
                            <th className="py-3.5 px-4 cursor-pointer hover:bg-slate-100 text-rose-600" onClick={() => handleSort("sinCargo")}>
                              <div className="flex items-center gap-1">
                                Cargo Vacío en 2026 <ArrowUpDown className="w-3 h-3 text-slate-400" />
                              </div>
                            </th>
                            <th className="py-3.5 px-4 cursor-pointer hover:bg-slate-100 text-indigo-600" onClick={() => handleSort("sinPresencia")}>
                              <div className="flex items-center gap-1">
                                Bajas de 2025 Fuera de 2026 <ArrowUpDown className="w-3 h-3 text-slate-400" />
                              </div>
                            </th>
                            <th className="py-3.5 px-4 text-center">Nivel de Concentración</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-xs">
                          {combinedSinCargo.map((r) => (
                            <tr key={r.departamento} className="hover:bg-slate-50/80 transition-colors">
                              <td className="py-3.5 px-4 font-bold text-slate-800">{r.departamento}</td>
                              <td className="py-3.5 px-4 font-bold text-rose-600">{r.sinCargo.toLocaleString()}</td>
                              <td className="py-3.5 px-4 font-bold text-indigo-600">{r.sinPresencia.toLocaleString()}</td>
                              <td className="py-3.5 px-4 min-w-[160px]">
                                <div className="h-2 w-full bg-slate-200 rounded-full overflow-hidden">
                                  <div
                                    className="h-full bg-rose-500 rounded-full"
                                    style={{
                                      width: `${(r.sinCargo / (sinCargo.sin_cargo_2026.total || 1)) * 100 * 3}%`,
                                    }}
                                  />
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                        <tfoot>
                          <tr className="bg-slate-100 font-bold text-slate-800 text-xs border-t border-slate-200">
                            <td className="py-3.5 px-4">TOTAL NACIONAL</td>
                            <td className="py-3.5 px-4 text-rose-600 font-black">{sinCargo.sin_cargo_2026.total.toLocaleString()}</td>
                            <td className="py-3.5 px-4 text-indigo-600 font-black">{sinCargo.sin_presencia_2026.total.toLocaleString()}</td>
                            <td className="py-3.5 px-4 text-center text-slate-500 font-medium">Totales auditados</td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </>
      )}

      {/* ─── FOOTER CON METADATOS ────────────────────────────────────────── */}
      <div className="p-4 rounded-2xl bg-slate-100/80 border border-slate-200 text-xs text-slate-500 flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <HelpCircle className="w-4 h-4 text-slate-400" />
          <span>
            Archivo fuente: <strong className="text-slate-700">-UIEhistorial2024-2026.xlsx</strong> (Hojas: 2024, 2025 y 2026 Regular).
          </span>
        </div>
        <div className="text-[11px] text-slate-400">
          Ministerio de Educación de Bolivia · DGFM / ESFM · Sistema Integrado de Estadística
        </div>
      </div>
    </div>
  );
}
