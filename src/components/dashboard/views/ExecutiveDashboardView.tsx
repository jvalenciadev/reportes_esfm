'use client';

import React, { useState, useMemo } from 'react';
import MatriculaEvolucionView from './MatriculaEvolucionView';
import DeficitMateriaDinamicoView from './DeficitMateriaDinamicoView';
import EgresadosProyeccionView from './EgresadosProyeccionView';
import PertinenciaView from './PertinenciaView';
import { DashboardDataset } from '@/types/stats';
import {
  Users,
  GraduationCap,
  School,
  TrendingUp,
  Clock,
  Sparkles,
  AlertCircle,
  Filter,
  CheckCircle2,
  Award,
  BookOpen,
  Layers,
  Compass,
  ChevronDown,
  MapPin,
  ArrowUpRight,
  ShieldCheck,
  Building2,
  Calendar,
  Percent,
  Check,
  Info,
  Scale
} from 'lucide-react';

// Cargar fuentes de datos del backend
import tasaCoberturaData from '@/data/tasa_cobertura.json';
import pertinenciaData from '@/data/pertinencia_data.json';
import exposicionData from '@/data/exposicion_2031.json';

interface ExecutiveDashboardViewProps {
  data: DashboardDataset;
}

export function ExecutiveDashboardView({ data }: ExecutiveDashboardViewProps) {
  // ─── Estados de Filtros Globales (Paso 1) ──────────────────────────────────
  const [selectedDepto, setSelectedDepto] = useState<string>('TODOS');
  const [selectedNivel, setSelectedNivel] = useState<string>('TODOS');
  const [selectedGestionCob, setSelectedGestionCob] = useState<string>('2022');
  const [moduloPrincipal, setModuloPrincipal] = useState<'matricula' | 'deficit_materia' | 'egresados_esfm' | 'pertinencia'>('matricula');

  const deptosList = [
    'BENI', 'CHUQUISACA', 'COCHABAMBA', 'LA PAZ',
    'ORURO', 'PANDO', 'POTOSÍ', 'SANTA CRUZ', 'TARIJA'
  ];

  const nivelesList = [
    { id: 'TODOS', label: 'Todos los Niveles' },
    { id: 'inicial', label: 'Inicial' },
    { id: 'primaria', label: 'Primaria' },
    { id: 'secundaria', label: 'Secundaria' }
  ];

  const aniosCobertura = tasaCoberturaData.anios || [2012, 2013, 2014, 2015, 2016, 2017, 2018, 2019, 2020, 2021, 2022];

  // ─── 1. Cálculo del KPI: Maestros SEP (Padrón Docente Oficial) ───────────────
  const maestrosKpi = useMemo(() => {
    const rawResumen = pertinenciaData.resumen || {};
    const porDepto = pertinenciaData.por_departamento || [];
    const porNivel = pertinenciaData.por_nivel || [];

    let total = rawResumen.TOTAL?.docentes || 168758;
    let v = rawResumen.V?.docentes || 127560;
    let a = rawResumen.A?.docentes || 23585;
    let n = rawResumen.N?.docentes || 13931;
    let sin = rawResumen.SIN?.docentes || 3682;

    if (selectedDepto !== 'TODOS') {
      const deptoNorm = selectedDepto === 'POTOSÍ' ? 'POTOSI' : selectedDepto;
      const found = porDepto.find(d => d.departamento.toUpperCase() === deptoNorm);
      if (found) {
        v = found.rangos.V?.docentes || 0;
        a = found.rangos.A?.docentes || 0;
        n = found.rangos.N?.docentes || 0;
        sin = found.rangos.SIN?.docentes || 0;
        total = v + a + n + sin;
      }
    } else if (selectedNivel !== 'TODOS') {
      const found = porNivel.find(nl => nl.nivel.toLowerCase().includes(selectedNivel.toLowerCase()));
      if (found) {
        v = found.rangos.V?.docentes || 0;
        a = found.rangos.A?.docentes || 0;
        n = found.rangos.N?.docentes || 0;
        sin = found.rangos.SIN?.docentes || 0;
        total = v + a + n + sin;
      }
    }

    const pctAlta = total > 0 ? ((v / total) * 100).toFixed(1) : '0';
    const pctMedia = total > 0 ? ((a / total) * 100).toFixed(1) : '0';
    const pctBaja = total > 0 ? ((n / total) * 100).toFixed(1) : '0';
    const pctSin = total > 0 ? ((sin / total) * 100).toFixed(1) : '0';

    return { total, v, a, n, sin, pctAlta, pctMedia, pctBaja, pctSin };
  }, [selectedDepto, selectedNivel]);

  // ─── 2. Cálculo del KPI: Tasa de Cobertura Educativa (Excel 2012-2024) ────────
  const coberturaKpi = useMemo(() => {
    const nacional = tasaCoberturaData.nacional as Record<string, Record<string, number>>;
    const porDepto = tasaCoberturaData.por_departamento as Record<string, Record<string, Record<string, number>>>;

    const yr = selectedGestionCob;
    let tasaActual = 0;
    let tasa2012 = 0;
    let serieHistorica: { anio: string; valor: number }[] = [];

    const nivelKey = selectedNivel === 'TODOS' ? 'total' : selectedNivel.toLowerCase();

    if (selectedDepto === 'TODOS') {
      const dic = nacional[nivelKey] || nacional['total'] || {};
      tasaActual = dic[yr] ?? 0.8625;
      tasa2012 = dic['2012'] ?? 0.7700;
      serieHistorica = aniosCobertura.map(a => ({
        anio: String(a),
        valor: dic[String(a)] ? Number((dic[String(a)] * 100).toFixed(1)) : 0
      }));
    } else {
      const deptoKey = selectedDepto.toUpperCase();
      const deptoDic = porDepto[deptoKey] || {};
      const dic = deptoDic[nivelKey] || deptoDic['total'] || {};
      tasaActual = dic[yr] ?? 0;
      tasa2012 = dic['2012'] ?? 0;
      serieHistorica = aniosCobertura.map(a => ({
        anio: String(a),
        valor: dic[String(a)] ? Number((dic[String(a)] * 100).toFixed(1)) : 0
      }));
    }

    const pctActual = (tasaActual * 100).toFixed(1);
    const difPuntos = ((tasaActual - tasa2012) * 100).toFixed(1);

    return {
      tasaActual: Number(pctActual),
      difPuntos: Number(difPuntos),
      serieHistorica
    };
  }, [selectedDepto, selectedNivel, selectedGestionCob, aniosCobertura]);

  // ─── 3. Otros KPIs del Sistema DGFM / SEP ─────────────────────────────────────
  const kpisGenerales = useMemo(() => {
    // Matrícula SIE 2026
    let matricula = exposicionData.eje_1_demografia?.matricula_sie_2026 || 2815162;
    if (selectedDepto !== 'TODOS') {
      const deptoNorm = selectedDepto === 'POTOSÍ' ? 'POTOSI' : selectedDepto;
      const dptoInfo = (exposicionData.eje_1_demografia?.por_departamento as any)?.[deptoNorm];
      if (dptoInfo?.matricula_sie) {
        matricula = dptoInfo.matricula_sie;
      }
    }

    // Estudiantes ESFM en formación activa (cohorte 2022-2026)
    const estudiantesESFM = exposicionData.eje_3_egresados_esfm?.total_inscritos_activas_2022_2026 || 17597;

    // Egresados proyectados 2026-2031
    const egresadosProyectados = exposicionData.eje_3_egresados_esfm?.total_egresados_proyectados_2026_2031 || 14427;
    const tasaTitulación = exposicionData.eje_3_egresados_esfm?.tasa_titulacion_historica || 82;

    // Salientes anuales (rotación de planilla 2024->2025)
    let salientesAnuales = exposicionData.eje_2_docentes?.salientes_24_25 || 3476;
    let entrantesAnuales = exposicionData.eje_2_docentes?.entrantes_24_25 || 4695;
    if (selectedDepto !== 'TODOS') {
      const deptoNorm = selectedDepto === 'POTOSÍ' ? 'POTOSI' : selectedDepto;
      salientesAnuales = (exposicionData.eje_2_docentes as any)?.salientes_dpto?.[deptoNorm] || Math.round(salientesAnuales / 9);
      entrantesAnuales = (exposicionData.eje_2_docentes as any)?.entrantes_dpto?.[deptoNorm] || Math.round(entrantesAnuales / 9);
    }
    const reposicionRatio = (entrantesAnuales / (salientesAnuales || 1)).toFixed(2);

    // Horas deficitarias en UIE
    const deficitHoras = exposicionData.resumen_nacional_uie?.total_deficit_horas || 944368;
    const itemsDeficit = exposicionData.resumen_nacional_uie?.total_items_deficit_88h || 10731;
    const uesAuditadas = exposicionData.resumen_nacional_uie?.total_ues_auditadas || 16273;
    const coberturaHorariaPlanilla = exposicionData.resumen_nacional_uie?.tasa_cobertura_nacional || 94.13;

    // Relación alumno-docente
    const ratioDocenteAlumno = maestrosKpi.total > 0 ? (matricula / maestrosKpi.total).toFixed(1) : '16.7';

    return {
      matricula,
      estudiantesESFM,
      egresadosProyectados,
      tasaTitulación,
      salientesAnuales,
      entrantesAnuales,
      reposicionRatio,
      deficitHoras,
      itemsDeficit,
      uesAuditadas,
      coberturaHorariaPlanilla,
      ratioDocenteAlumno
    };
  }, [selectedDepto, maestrosKpi.total]);

  return (
    <div className="space-y-8 animate-fadeIn pb-16">

      {/* ─── Cabecera Institucional Ejecutiva ───────────────────────────────── */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-blue-950 text-white rounded-3xl p-6 sm:p-8 shadow-xl border border-slate-700/60 relative overflow-hidden">
        <div className="absolute right-0 top-0 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute right-40 bottom-0 w-64 h-64 bg-amber-500/10 rounded-full blur-2xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/15 border border-emerald-400/30 text-emerald-300 text-xs font-bold tracking-wide">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              DGFM · SISTEMA DE PLANIFICACIÓN ESTRATÉGICA DOCENTE 2031
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
              Panel de Control Ejecutivo del Magisterio y SEP
            </h1>
            <p className="text-slate-300 text-sm max-w-3xl leading-relaxed">
              Consolidación oficial de métricas de cobertura escolar, pertinencia docente, capacidad instalada de las ESFM y déficit de horas académicas en Bolivia.
            </p>
          </div>

          <div className="shrink-0 flex flex-col sm:flex-row gap-3">
            <div className="bg-white/10 backdrop-blur-md rounded-2xl px-4 py-3 border border-white/15 text-right">
              <span className="text-[11px] font-bold text-slate-300 uppercase tracking-wider block">Universo Padrón SEP</span>
              <span className="text-2xl font-black text-amber-300 tracking-tight">168.758</span>
              <span className="text-[11px] text-slate-300 block">Docentes en Aula Auditados</span>
            </div>
          </div>
        </div>

        {/* ─── Barra de Filtros Globales Reactivos (Paso 1) ───────────────────── */}
        <div className="mt-8 pt-6 border-t border-slate-700/80 grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* Selector Departamento */}
          <div className="bg-slate-900/80 rounded-2xl p-3 border border-slate-700/70">
            <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5 mb-1.5">
              <MapPin className="w-3.5 h-3.5 text-blue-400" />
              Departamento
            </label>
            <select
              value={selectedDepto}
              onChange={(e) => setSelectedDepto(e.target.value)}
              className="w-full bg-slate-800 text-white text-xs font-bold rounded-xl px-3 py-2 border border-slate-600 focus:outline-none focus:ring-2 focus:ring-[#c9a751]"
            >
              <option value="TODOS">Bolivia (Nacional Completo)</option>
              {deptosList.map((d) => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
          </div>

          {/* Selector Nivel Educativo */}
          <div className="bg-slate-900/80 rounded-2xl p-3 border border-slate-700/70">
            <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5 mb-1.5">
              <BookOpen className="w-3.5 h-3.5 text-emerald-400" />
              Nivel Educativo
            </label>
            <select
              value={selectedNivel}
              onChange={(e) => setSelectedNivel(e.target.value)}
              className="w-full bg-slate-800 text-white text-xs font-bold rounded-xl px-3 py-2 border border-slate-600 focus:outline-none focus:ring-2 focus:ring-[#c9a751]"
            >
              {nivelesList.map((nl) => (
                <option key={nl.id} value={nl.id}>{nl.label}</option>
              ))}
            </select>
          </div>

          {/* Selector Gestión Cobertura */}
          <div className="bg-slate-900/80 rounded-2xl p-3 border border-slate-700/70">
            <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5 mb-1.5">
              <Calendar className="w-3.5 h-3.5 text-amber-400" />
              Gestión Cobertura (Excel 2012-2024)
            </label>
            <select
              value={selectedGestionCob}
              onChange={(e) => setSelectedGestionCob(e.target.value)}
              className="w-full bg-slate-800 text-white text-xs font-bold rounded-xl px-3 py-2 border border-slate-600 focus:outline-none focus:ring-2 focus:ring-[#c9a751]"
            >
              {aniosCobertura.map((yr) => (
                <option key={yr} value={String(yr)}>Gestión {yr}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════
          SELECTOR DE MÓDULO DESTACADO: MATRÍCULA vs DÉFICIT POR MATERIA (SIE)
      ═══════════════════════════════════════════════════════════════ */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 bg-white rounded-2xl border border-slate-200/90 shadow-2xs">
        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={() => setModuloPrincipal('matricula')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              moduloPrincipal === 'matricula'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:text-slate-900 hover:bg-slate-200/70'
            }`}
          >
            <TrendingUp className="w-4 h-4 text-emerald-400" />
            <span>Evolución y Proyección de Matrícula (2011–2034)</span>
          </button>

          <button
            type="button"
            onClick={() => setModuloPrincipal('deficit_materia')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              moduloPrincipal === 'deficit_materia'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:text-slate-900 hover:bg-slate-200/70'
            }`}
          >
            <Scale className="w-4 h-4 text-indigo-300" />
            <span>Déficit por Materia (SIE / UIE)</span>
          </button>

          <button
            type="button"
            onClick={() => setModuloPrincipal('egresados_esfm')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              moduloPrincipal === 'egresados_esfm'
                ? 'bg-amber-600 text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:text-slate-900 hover:bg-slate-200/70'
            }`}
          >
            <GraduationCap className="w-4 h-4 text-amber-300" />
            <span>Proyección Egresados ESFM (mermando abandonos)</span>
          </button>

          <button
            type="button"
            onClick={() => setModuloPrincipal('pertinencia')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              moduloPrincipal === 'pertinencia'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:text-slate-900 hover:bg-slate-200/70'
            }`}
          >
            <ShieldCheck className="w-4 h-4 text-emerald-300" />
            <span>Pertinencia Docente SEP (Padrón Oficial)</span>
          </button>
        </div>

        <span className="text-[11px] font-semibold text-slate-400 bg-slate-50 px-3 py-1 rounded-full border border-slate-100">
          {moduloPrincipal === 'matricula'
            ? 'Fuente: INE 2024-2034 + Cierre Auditado Aula SIE 2026'
            : moduloPrincipal === 'deficit_materia'
            ? 'Fuente: UIE / SIE UE (Octubre 2026) · Especialidades Oficiales BD'
            : moduloPrincipal === 'egresados_esfm'
            ? 'Fuente: DGFM · Modelo de Cohortes Activas ESFM (Titulación 82% / Merma 18%)'
            : 'Fuente: DGFM / SEP · Padrón Docente Oficial (Rangos V, A, N, SIN)'}
        </span>
      </div>

      {moduloPrincipal === 'matricula' ? (
        <MatriculaEvolucionView />
      ) : moduloPrincipal === 'deficit_materia' ? (
        <DeficitMateriaDinamicoView />
      ) : moduloPrincipal === 'egresados_esfm' ? (
        <EgresadosProyeccionView />
      ) : (
        <PertinenciaView />
      )}

      {/* ─── SECCIÓN 1: INDICADORES KPI EJECUTIVOS (PASO 1) ──────────────────── */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-blue-100 text-blue-800 text-[11px] font-black tracking-wide uppercase">
              Fase 1 · Consolidación de Indicadores Clave
            </div>
            <h2 className="text-xl font-black text-slate-900 tracking-tight mt-1">
              1. Indicadores KPI Ejecutivos del SEP y la Formación Docente
            </h2>
          </div>
          <span className="text-xs text-slate-500 font-semibold bg-slate-100 px-3 py-1.5 rounded-full border border-slate-200">
            Filtro Activo: <strong className="text-slate-800">{selectedDepto === 'TODOS' ? 'Nacional' : selectedDepto}</strong> | <strong className="text-slate-800">{selectedNivel}</strong>
          </span>
        </div>

        {/* Grid de 7 KPIs Ejecutivos Principales */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">

          {/* KPI 1: Maestros Actuales del SEP */}
          <div className="bg-white rounded-2xl p-5 border border-slate-200/90 shadow-xs flex flex-col justify-between hover:shadow-md transition-shadow">
            <div>
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400">Padrón Docente SEP</span>
                <span className="p-2 rounded-xl bg-blue-50 text-blue-700"><Users className="w-4 h-4" /></span>
              </div>
              <div className="mt-2">
                <span className="text-3xl font-black text-slate-900 tracking-tight">
                  {maestrosKpi.total.toLocaleString('es-BO')}
                </span>
                <span className="text-xs text-slate-500 font-semibold block mt-0.5">Maestros en aula regular</span>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-100 space-y-1.5 text-[11px]">
              <div className="flex justify-between items-center text-slate-600">
                <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-emerald-500" /> Alta Pertinencia (V):</span>
                <strong className="text-emerald-700">{maestrosKpi.pctAlta}% ({maestrosKpi.v.toLocaleString('es-BO')})</strong>
              </div>
              <div className="flex justify-between items-center text-slate-600">
                <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-amber-500" /> Baja Pertinencia (N):</span>
                <strong className="text-amber-800">{maestrosKpi.pctBaja}% ({maestrosKpi.n.toLocaleString('es-BO')})</strong>
              </div>
              <div className="flex justify-between items-center text-slate-600">
                <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-slate-400" /> Téc./Univ./Otros (SIN):</span>
                <strong className="text-slate-700">{maestrosKpi.pctSin}% ({maestrosKpi.sin.toLocaleString('es-BO')})</strong>
              </div>
            </div>
          </div>

          {/* KPI 2: Matrícula Escolar Regular */}
          <div className="bg-white rounded-2xl p-5 border border-slate-200/90 shadow-xs flex flex-col justify-between hover:shadow-md transition-shadow">
            <div>
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400">Matrícula Escolar SIE</span>
                <span className="p-2 rounded-xl bg-emerald-50 text-emerald-700"><School className="w-4 h-4" /></span>
              </div>
              <div className="mt-2">
                <span className="text-3xl font-black text-slate-900 tracking-tight">
                  {kpisGenerales.matricula.toLocaleString('es-BO')}
                </span>
                <span className="text-xs text-slate-500 font-semibold block mt-0.5">Estudiantes matriculados (2026)</span>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-100 text-[11px] space-y-1">
              <div className="flex justify-between items-center text-slate-600">
                <span>Relación Alumno/Docente:</span>
                <strong className="text-slate-800 font-bold">~{kpisGenerales.ratioDocenteAlumno} alumnos/profesor</strong>
              </div>
              <div className="flex justify-between items-center text-slate-500">
                <span>Población Escolar INE (2026):</span>
                <strong className="text-slate-700">3.160.110</strong>
              </div>
            </div>
          </div>

          {/* KPI 3: Tasa de Cobertura Educativa (Excel Oficial 2012-2024) */}
          <div className="bg-gradient-to-br from-emerald-50/70 to-teal-50/50 rounded-2xl p-5 border border-emerald-200 shadow-xs flex flex-col justify-between hover:shadow-md transition-shadow relative overflow-hidden">
            <div className="absolute -right-3 -bottom-3 w-20 h-20 bg-emerald-300/15 rounded-full blur-xl pointer-events-none" />
            <div>
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-black uppercase tracking-wider text-emerald-800 flex items-center gap-1">
                  <Percent className="w-3.5 h-3.5 text-emerald-700" /> Tasa de Cobertura
                </span>
                <span className="px-2 py-0.5 rounded-full bg-emerald-200/80 text-emerald-800 text-[10px] font-black">
                  Gestión {selectedGestionCob}
                </span>
              </div>
              <div className="mt-2">
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-black text-emerald-950 tracking-tight">
                    {coberturaKpi.tasaActual}%
                  </span>
                  <span className="text-xs font-bold text-emerald-700 flex items-center">
                    <ArrowUpRight className="w-3.5 h-3.5" /> +{coberturaKpi.difPuntos}%
                  </span>
                </div>
                <span className="text-xs text-emerald-800 font-medium block mt-0.5">
                  Cobertura sobre población escolar regular
                </span>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-emerald-200/60 text-[11px] space-y-1">
              <div className="flex justify-between items-center text-emerald-900">
                <span>Línea Base (2012):</span>
                <strong>77.0% nacional</strong>
              </div>
              <div className="text-[10px] text-emerald-700 font-semibold">
                Fuente: tasa de cobertura 2012-2024.xlsx
              </div>
            </div>
          </div>

          {/* KPI 4: Estudiantes en Formación ESFM */}
          <div className="bg-white rounded-2xl p-5 border border-slate-200/90 shadow-xs flex flex-col justify-between hover:shadow-md transition-shadow">
            <div>
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400">Estudiantes en ESFM</span>
                <span className="p-2 rounded-xl bg-purple-50 text-purple-700"><GraduationCap className="w-4 h-4" /></span>
              </div>
              <div className="mt-2">
                <span className="text-3xl font-black text-slate-900 tracking-tight">
                  {kpisGenerales.estudiantesESFM.toLocaleString('es-BO')}
                </span>
                <span className="text-xs text-slate-500 font-semibold block mt-0.5">Cohorte activa 2022–2026</span>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-100 text-[11px] space-y-1">
              <div className="flex justify-between items-center text-slate-600">
                <span>Red Institucional:</span>
                <strong className="text-slate-800">46 ESFMs y UAs</strong>
              </div>
              <div className="flex justify-between items-center text-slate-500">
                <span>Especialidades Oficiales:</span>
                <strong className="text-slate-700">20 curriculares</strong>
              </div>
            </div>
          </div>

          {/* KPI 5: Egresados Proyectados hacia 2031 */}
          <div className="bg-white rounded-2xl p-5 border border-slate-200/90 shadow-xs flex flex-col justify-between hover:shadow-md transition-shadow">
            <div>
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400">Egresados Proyectados</span>
                <span className="p-2 rounded-xl bg-indigo-50 text-indigo-700"><Award className="w-4 h-4" /></span>
              </div>
              <div className="mt-2">
                <span className="text-3xl font-black text-slate-900 tracking-tight">
                  {kpisGenerales.egresadosProyectados.toLocaleString('es-BO')}
                </span>
                <span className="text-xs text-slate-500 font-semibold block mt-0.5">Horizonte 2026–2031</span>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-100 text-[11px] space-y-1">
              <div className="flex justify-between items-center text-slate-600">
                <span>Tasa de Titulación Histórica:</span>
                <strong className="text-indigo-700 font-bold">{kpisGenerales.tasaTitulación}% de egreso</strong>
              </div>
              <div className="flex justify-between items-center text-slate-500">
                <span>Abandono / Deserción:</span>
                <strong className="text-slate-700 font-medium">18% estimado</strong>
              </div>
            </div>
          </div>

          {/* KPI 6: Salidas / Jubilaciones Anuales */}
          <div className="bg-white rounded-2xl p-5 border border-slate-200/90 shadow-xs flex flex-col justify-between hover:shadow-md transition-shadow">
            <div>
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400">Rotación de Planilla</span>
                <span className="p-2 rounded-xl bg-amber-50 text-amber-700"><Clock className="w-4 h-4" /></span>
              </div>
              <div className="mt-2">
                <span className="text-3xl font-black text-slate-900 tracking-tight">
                  {kpisGenerales.salientesAnuales.toLocaleString('es-BO')}
                </span>
                <span className="text-xs text-slate-500 font-semibold block mt-0.5">Salientes por año (jubilación/cesantía)</span>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-100 text-[11px] space-y-1">
              <div className="flex justify-between items-center text-slate-600">
                <span>Nuevos Entrantes Anuales:</span>
                <strong className="text-emerald-700 font-bold">+{kpisGenerales.entrantesAnuales.toLocaleString('es-BO')}</strong>
              </div>
              <div className="flex justify-between items-center text-slate-500">
                <span>Tasa de Reposición Fiscal:</span>
                <strong className="text-slate-700">{kpisGenerales.reposicionRatio} por vacante</strong>
              </div>
            </div>
          </div>

          {/* KPI 7: Déficit de Horas UIE / Demanda */}
          <div className="bg-white rounded-2xl p-5 border border-rose-200/80 shadow-xs flex flex-col justify-between hover:shadow-md transition-shadow lg:col-span-2">
            <div>
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-extrabold uppercase tracking-wider text-rose-800 flex items-center gap-1.5">
                  <AlertCircle className="w-4 h-4 text-rose-600" />
                  Déficit Acumulado de Horas Académicas (UIE)
                </span>
                <span className="px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 text-[10px] font-black">
                  16.273 UEs Auditadas
                </span>
              </div>
              <div className="mt-2 flex flex-col sm:flex-row sm:items-baseline gap-4">
                <div>
                  <span className="text-3xl font-black text-rose-700 tracking-tight">
                    {kpisGenerales.deficitHoras.toLocaleString('es-BO')}
                  </span>
                  <span className="text-xs text-slate-500 font-semibold block mt-0.5">Horas sin cobertura fiscal en aula</span>
                </div>
                <div className="bg-rose-50 px-3 py-1.5 rounded-xl border border-rose-200">
                  <span className="text-[11px] text-rose-800 font-bold block">
                    Equivalente a {kpisGenerales.itemsDeficit.toLocaleString('es-BO')} ítems docentes de 88 horas
                  </span>
                </div>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-100 flex flex-col sm:flex-row justify-between text-[11px] gap-2">
              <div className="text-slate-600">
                Cobertura horaria de planilla: <strong className="text-emerald-700 font-bold">{kpisGenerales.coberturaHorariaPlanilla}%</strong>
              </div>
              <div className="text-slate-500">
                Brecha principal concentrada en: <strong className="text-slate-800 font-semibold">Técnica Tecnológica y Fís-Quím</strong>
              </div>
            </div>
          </div>

        </div>

        {/* ─── Micro-Módulo: Evolución de la Tasa de Cobertura 2012-2022/2024 ─── */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/90 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
            <div>
              <h3 className="text-sm font-black text-slate-900 tracking-tight flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-emerald-600" />
                Evolución de la Tasa de Cobertura Escolar Regular (2012 – 2022)
              </h3>
              <p className="text-xs text-slate-500">
                Datos oficiales procesados desde <code className="bg-slate-100 px-1 py-0.5 rounded text-slate-700">tasa de cobertura 2012-2024.xlsx</code> para {selectedDepto === 'TODOS' ? 'el Estado Plurinacional' : selectedDepto}.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-500">Nivel analizado:</span>
              <span className="text-xs font-black px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200 capitalize">
                {selectedNivel === 'TODOS' ? 'Global Regular' : selectedNivel}
              </span>
            </div>
          </div>

          {/* Gráfico de barras horizontales/verticales interactivas */}
          <div className="grid grid-cols-6 sm:grid-cols-11 gap-2 pt-2 items-end">
            {coberturaKpi.serieHistorica.map((item) => {
              const isSelected = item.anio === selectedGestionCob;
              const barHeightPct = Math.max(10, Math.min(100, (item.valor - 50) * 2)); // Escala visual 50% a 100%

              return (
                <div
                  key={item.anio}
                  onClick={() => setSelectedGestionCob(item.anio)}
                  className={`flex flex-col items-center gap-1.5 cursor-pointer group transition-all ${
                    isSelected ? 'scale-105' : 'hover:opacity-80'
                  }`}
                >
                  <span className={`text-[11px] font-black ${isSelected ? 'text-emerald-700' : 'text-slate-600'}`}>
                    {item.valor}%
                  </span>
                  <div className="w-full bg-slate-100 rounded-t-lg h-24 flex items-end p-0.5">
                    <div
                      style={{ height: `${barHeightPct}%` }}
                      className={`w-full rounded-t transition-all ${
                        isSelected
                          ? 'bg-gradient-to-t from-emerald-700 to-emerald-500 shadow-sm'
                          : 'bg-emerald-400/80 group-hover:bg-emerald-500'
                      }`}
                    />
                  </div>
                  <span className={`text-[10px] font-extrabold ${isSelected ? 'text-slate-900 bg-emerald-100 px-1.5 py-0.5 rounded' : 'text-slate-400'}`}>
                    {item.anio}
                  </span>
                </div>
              );
            })}
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between text-xs text-slate-500 gap-2">
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              La tasa de cobertura educativa regular nacional se expandió en <strong>+{coberturaKpi.difPuntos} puntos porcentuales</strong> entre 2012 y el corte más reciente.
            </span>
            <span className="text-[11px] text-slate-400">
              Clic en cualquier año para inspeccionar el KPI de cobertura en esa gestión.
            </span>
          </div>
        </div>

      </div>

      {/* ─── Hoja de Ruta de Desarrollo en Fases (Transparencia Ejecutiva) ────── */}
      <div className="bg-slate-50 rounded-2xl p-4.5 border border-slate-200/80 text-xs text-slate-600">
        <div className="flex items-center justify-between mb-2">
          <strong className="text-slate-800 font-extrabold flex items-center gap-2">
            <Layers className="w-4 h-4 text-blue-600" />
            Progreso del Desarrollo Modular del Dashboard DGFM
          </strong>
          <span className="text-[11px] font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200">
            Paso 1 de 9 Activo
          </span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mt-3 text-[11px]">
          <div className="p-2.5 rounded-xl bg-white border border-emerald-300 shadow-2xs">
            <span className="font-black text-emerald-700 block">✓ 1. Indicadores KPI Ejecutivos</span>
            <span className="text-slate-500">Padrón SEP, Cobertura 2012-2024, ESFM, Rotación y UIE.</span>
          </div>
          <div className="p-2.5 rounded-xl bg-white border border-emerald-300 shadow-2xs">
            <span className="font-bold text-emerald-700 block">✓ 2. Evolución Educativa & Proyección</span>
            <span className="text-slate-500">Matrícula histórica, ARIMA(1,1,0), Modelo INE y Cobertura SIE con matriz de grados.</span>
          </div>
          <div className="p-2.5 rounded-xl bg-slate-100/80 border border-slate-200 text-slate-400">
            <span className="font-bold text-slate-600 block">3-9. Demanda, Especialidad y Admisión</span>
            <span>Oferta-demanda, balance, mapa territorial y cupos 2027.</span>
          </div>
        </div>
      </div>

    </div>
  );
}
