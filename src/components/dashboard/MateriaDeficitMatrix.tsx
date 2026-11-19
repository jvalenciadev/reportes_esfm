'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  GraduationCapIcon,
  SchoolIcon,
  ScaleIcon,
  BuildingIcon,
  TrendingUpIcon,
  AlertTriangleIcon,
  CheckIcon,
  SearchIcon,
  MapPinIcon,
  XIcon,
  ChartBarIcon,
  GridIcon,
} from '../ui/Icons';

interface DepartamentoDato {
  departamento_id: number;
  departamento: string;
  ues_afectadas: number;
  carga_horaria: number;
  horas_planilla: number;
  deficit_horas: number;
  items_deficit_equiv: number;
  pct_cobertura: number;
}

interface ResumenNacional {
  total_ues: number;
  carga_horaria: number;
  horas_planilla: number;
  deficit_horas: number;
  hora_item_bd?: number;
  base_horas_aplicada?: number;
  es_promedio_dinamico?: boolean;
  items_deficit_equiv: number;
  pct_cobertura: number;
}

interface MateriaBreakdown {
  materia: string;
  sub_materia?: string;
  nivel: string;
  ues_afectadas: number;
  carga_horaria: number;
  deficit_horas: number;
}

interface UeDetalle {
  cod_ue: number;
  ue: string;
  distrito: string;
  area: string;
  subsistema?: string;
  nivel: string;
  grado?: number | string;
  paralelo?: string;
  materia: string;
  sub_materia?: string;
  hora_tra: number;
  hora_pla: number;
  deficit: number;
  items_deficit_equiv: number;
}

interface EspecialidadItem {
  id: number;
  nombre: string;
  hora_item?: number;
  reglas_total: number;
  reglas_activas: number;
}

interface ReportData {
  especialidad_id: number;
  especialidad: string;
  filtro?: any;
  filtro_configurado?: boolean;
  resumen_nacional: ResumenNacional | null;
  departamentos: DepartamentoDato[];
  materias_breakdown: MateriaBreakdown[];
  sin_datos: boolean;
  total_registros: number;
}

interface MateriaDeficitMatrixProps {
  onGoToConfig?: () => void;
}

export function MateriaDeficitMatrix({ onGoToConfig }: MateriaDeficitMatrixProps) {
  const [especialidades, setEspecialidades] = useState<EspecialidadItem[]>([]);
  const [selectedEspId, setSelectedEspId] = useState<number>(0);
  const [loadingList, setLoadingList] = useState<boolean>(true);
  const [loadingData, setLoadingData] = useState<boolean>(false);

  const [reportData, setReportData] = useState<ReportData | null>(null);
  const [showMateriasPanel, setShowMateriasPanel] = useState<boolean>(true);
  const [showMetodologia, setShowMetodologia] = useState<boolean>(true);
  const [customBaseHoras, setCustomBaseHoras] = useState<string>('');
  const [modoBase, setModoBase] = useState<'bd' | 'promedio' | 'manual'>('bd');

  // Modal UEs por departamento
  const [selectedDeptForUes, setSelectedDeptForUes] = useState<{ id: number; nombre: string } | null>(null);
  const [uesList, setUesList] = useState<UeDetalle[]>([]);
  const [loadingUes, setLoadingUes] = useState<boolean>(false);
  const [searchUe, setSearchUe] = useState<string>('');

  // Ordenamiento tabla
  const [sortBy, setSortBy] = useState<'deficit' | 'ues' | 'carga' | 'planilla' | 'cobertura' | 'nombre'>('deficit');
  const [sortAsc, setSortAsc] = useState<boolean>(false);
  const [tabModoVista, setTabModoVista] = useState<'ambos' | 'grafico' | 'tabla'>('ambos');
  const [hoverDeptIndex, setHoverDeptIndex] = useState<number | null>(null);

  // 1. Cargar lista de especialidades con conteo de reglas
  useEffect(() => {
    async function loadList() {
      setLoadingList(true);
      try {
        const res = await fetch('/api/materia-deficit');
        if (res.ok) {
          const data = await res.json();
          const list: EspecialidadItem[] = data.especialidades || [];
          setEspecialidades(list);
          if (list.length > 0) {
            const primaria = list.find((e) => e.nombre.includes('PRIMARIA'));
            setSelectedEspId(primaria ? primaria.id : list[0].id);
          }
        }
      } catch (e) {
        console.error('Error cargando especialidades (materia):', e);
      } finally {
        setLoadingList(false);
      }
    }
    loadList();
  }, []);

  // 2. Cargar reporte de déficit por materia para la especialidad seleccionada
  const fetchReport = useCallback(async (espId: number, baseHorasOverride?: string) => {
    setLoadingData(true);
    try {
      let url = `/api/materia-deficit?especialidad_id=${espId}`;
      if (baseHorasOverride && !isNaN(Number(baseHorasOverride)) && Number(baseHorasOverride) > 0) {
        url += `&base_horas=${encodeURIComponent(baseHorasOverride)}`;
      }
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setReportData(data);
      } else {
        setReportData(null);
      }
    } catch (e) {
      console.error('Error cargando reporte materia:', e);
      setReportData(null);
    } finally {
      setLoadingData(false);
    }
  }, []);

  useEffect(() => {
    if (selectedEspId) {
      fetchReport(selectedEspId, customBaseHoras);
      setSelectedDeptForUes(null);
      setUesList([]);
    }
  }, [selectedEspId, customBaseHoras, fetchReport]);

  // 3. Cargar UEs de un departamento
  const openUesModal = async (deptId: number, deptNombre: string) => {
    setSelectedDeptForUes({ id: deptId, nombre: deptNombre });
    setLoadingUes(true);
    setSearchUe('');
    try {
      const res = await fetch(
        `/api/materia-deficit?especialidad_id=${selectedEspId}&view=ues&departamento_id=${deptId}`
      );
      if (res.ok) {
        const data = await res.json();
        setUesList(data.ues || []);
      }
    } catch (e) {
      console.error('Error cargando UEs materia:', e);
      setUesList([]);
    } finally {
      setLoadingUes(false);
    }
  };

  // Tabla departamental ordenada
  const sortedDepartamentos = useMemo(() => {
    if (!reportData?.departamentos) return [];
    const list = [...reportData.departamentos];
    list.sort((a, b) => {
      let diff = 0;
      if (sortBy === 'deficit') diff = b.deficit_horas - a.deficit_horas;
      else if (sortBy === 'ues') diff = b.ues_afectadas - a.ues_afectadas;
      else if (sortBy === 'carga') diff = b.carga_horaria - a.carga_horaria;
      else if (sortBy === 'planilla') diff = b.horas_planilla - a.horas_planilla;
      else if (sortBy === 'cobertura') diff = a.pct_cobertura - b.pct_cobertura;
      else diff = a.departamento.localeCompare(b.departamento);
      return sortAsc ? -diff : diff;
    });
    return list;
  }, [reportData?.departamentos, sortBy, sortAsc]);

  const filteredUes = useMemo(() => {
    if (!searchUe.trim()) return uesList;
    const q = searchUe.toLowerCase().trim();
    return uesList.filter(
      (u) =>
        u.ue.toLowerCase().includes(q) ||
        String(u.cod_ue).includes(q) ||
        u.materia.toLowerCase().includes(q) ||
        (u.sub_materia && u.sub_materia.toLowerCase().includes(q)) ||
        (u.subsistema && u.subsistema.toLowerCase().includes(q)) ||
        (u.nivel && u.nivel.toLowerCase().includes(q)) ||
        u.distrito.toLowerCase().includes(q)
    );
  }, [uesList, searchUe]);

  const handleToggleSort = (col: typeof sortBy) => {
    if (sortBy === col) setSortAsc(!sortAsc);
    else { setSortBy(col); setSortAsc(false); }
  };

  // CSV Export
  const handleExportCSV = () => {
    if (!reportData?.departamentos?.length) return;
    const espNombre = reportData.especialidad || 'materia';
    const rows = [
      ['Departamento', 'UEs Afectadas', 'Carga Horaria (hrs)', 'Horas Planilla', 'Deficit Horas', 'Items Equiv.', 'Pct Cobertura'],
      ...reportData.departamentos.map((d) => [
        d.departamento,
        d.ues_afectadas,
        d.carga_horaria,
        d.horas_planilla,
        d.deficit_horas,
        d.items_deficit_equiv,
        `${d.pct_cobertura}%`,
      ]),
      [
        'TOTAL NACIONAL',
        reportData.resumen_nacional?.total_ues || 0,
        reportData.resumen_nacional?.carga_horaria || 0,
        reportData.resumen_nacional?.horas_planilla || 0,
        reportData.resumen_nacional?.deficit_horas || 0,
        reportData.resumen_nacional?.items_deficit_equiv || 0,
        `${reportData.resumen_nacional?.pct_cobertura || 100}%`,
      ],
    ];
    const csvContent =
      'data:text/csv;charset=utf-8,' + rows.map((e) => e.join(',')).join('\n');
    const link = document.createElement('a');
    link.setAttribute('href', encodeURI(csvContent));
    link.setAttribute('download', `deficit_materia_${espNombre.replace(/[^a-zA-Z0-9]/g, '_')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const especialidadActual = especialidades.find((e) => e.id === selectedEspId);
  const esEspecial = (especialidadActual?.nombre || reportData?.especialidad || '').toUpperCase().includes('ESPECIAL');
  const horaItemBd = reportData?.resumen_nacional?.hora_item_bd ?? especialidadActual?.hora_item ?? (esEspecial ? 108.0 : 88.0);
  const totalCarga = reportData?.resumen_nacional?.carga_horaria || 0;
  const totalUes = reportData?.resumen_nacional?.total_ues || 1;
  const promedioHorasDocente = totalUes > 0 ? Number((totalCarga / totalUes).toFixed(2)) : 88.0;

  const baseHorasActual = customBaseHoras && !isNaN(Number(customBaseHoras)) && Number(customBaseHoras) > 0
    ? Number(customBaseHoras)
    : (modoBase === 'bd' ? horaItemBd : (reportData?.resumen_nacional?.base_horas_aplicada || horaItemBd));
  const sinDatos = reportData?.sin_datos ?? false;
  const filtroConfigurado = (especialidadActual?.reglas_total ?? 0) > 0;

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* HEADER Y SELECTOR */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
                Matriz Analítica SIE — Materias Curriculares
              </span>
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                Granularidad por Asignatura
              </span>
            </div>
            <h2 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
              <GraduationCapIcon className="w-6 h-6 text-indigo-500" />
              Déficit y Carga Horaria por Materia
            </h2>
            <p className="text-xs text-slate-500 mt-1 max-w-2xl">
              Cálculo filtrado por materias curriculares vinculadas a cada especialidad oficial ESFM. Los ítems se calculan
              sobre <strong>88h (Secundaria) ó 108h (Educación Especial)</strong> según corresponda.
            </p>
          </div>

          <div className="flex items-center gap-2">
            {onGoToConfig && (
              <button
                onClick={onGoToConfig}
                className="px-3 py-2 text-xs font-semibold rounded-lg bg-slate-100 hover:bg-indigo-50 text-slate-700 hover:text-indigo-700 border border-slate-200 transition-colors"
              >
                Configurador de Materias ✎
              </button>
            )}
            <button
              onClick={handleExportCSV}
              disabled={!reportData?.departamentos?.length}
              className="px-3.5 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors shadow-xs disabled:opacity-50"
            >
              Exportar CSV ⤓
            </button>
          </div>
        </div>

        {/* SELECTOR DE ESPECIALIDAD */}
        <div className="pt-3 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex-1 max-w-xl">
            <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block mb-1">
              Selecciona la Especialidad Oficial ({especialidades.length} Especialidades):
            </label>
            <select
              value={selectedEspId}
              onChange={(e) => setSelectedEspId(Number(e.target.value))}
              disabled={loadingList}
              className="w-full text-xs font-bold text-slate-900 bg-slate-50 border border-slate-300 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all"
            >
              {especialidades.map((esp) => (
                <option key={esp.id} value={esp.id}>
                  {esp.id}. {esp.nombre}
                </option>
              ))}
            </select>
          </div>

          {/* BADGES DEL FILTRO APLICADO */}
          {reportData?.filtro ? (
            <div className="text-xs bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                Criterios del Filtro Aplicados (CRUD):
              </span>
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200 text-[10px] font-semibold">
                  {reportData.filtro.subsistemas?.join(', ') || 'Sin subsistema'}
                </span>
                <span className="px-2 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-200 text-[10px] font-semibold">
                  {reportData.filtro.niveles?.join(', ') || 'Sin nivel'}
                </span>
                <span className="px-2 py-0.5 rounded bg-purple-50 text-purple-700 border border-purple-200 text-[10px] font-bold">
                  {reportData.filtro.materias?.length || 0} materias filtradas
                </span>
                {reportData.filtro.operador_carga && reportData.filtro.carga_especialidad !== null ? (
                  <span className="px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-200 text-[10px] font-bold">
                    Carga {reportData.filtro.operador_carga} {reportData.filtro.carga_especialidad} hrs
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-500 border border-slate-200 text-[10px] italic">
                    Sin restricción de horas
                  </span>
                )}
              </div>
            </div>
          ) : especialidadActual && (
            <div className="text-xs bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                Reglas de Materia Configuradas:
              </span>
              <div className="flex flex-wrap items-center gap-1.5">
                <span
                  className={`px-2 py-0.5 rounded text-[10px] font-semibold border ${especialidadActual.reglas_activas > 0
                    ? 'bg-indigo-50 text-indigo-700 border-indigo-200'
                    : 'bg-slate-100 text-slate-500 border-slate-200'
                    }`}
                >
                  {especialidadActual.reglas_activas} activas
                </span>
                <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200 text-[10px] font-semibold">
                  {especialidadActual.reglas_total} total
                </span>
                {especialidadActual.reglas_total === 0 && (
                  <span className="px-2 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-200 text-[10px] italic">
                    Sin configurar
                  </span>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* AVISO SI NO ESTÁ CONFIGURADO */}
      {reportData && !filtroConfigurado && (
        <div className="bg-amber-50 border border-amber-200 p-5 rounded-2xl text-amber-900 text-xs flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <AlertTriangleIcon className="w-6 h-6 text-amber-600 shrink-0" />
            <div>
              <strong className="block text-sm font-bold">Especialidad sin materias configuradas</strong>
              <p className="text-amber-800 mt-0.5">
                Esta especialidad no tiene materias curriculares vinculadas. Configúralas para calcular el déficit por asignatura.
              </p>
            </div>
          </div>
          {onGoToConfig && (
            <button
              onClick={onGoToConfig}
              className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg shrink-0 transition-colors"
            >
              Ir al Configurador
            </button>
          )}
        </div>
      )}

      {/* KPI CARDS NACIONALES */}
      {reportData?.resumen_nacional && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-1">
            <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 flex items-center justify-between">
              <span>Unidades Educativas</span>
              <SchoolIcon className="w-3.5 h-3.5 text-blue-600" />
            </div>
            <div className="text-lg font-bold text-slate-900">
              {reportData.resumen_nacional.total_ues.toLocaleString('es-BO')}
            </div>
            <div className="text-[10px] text-slate-500">UEs con esta materia</div>
          </div>

          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-1">
            <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 flex items-center justify-between">
              <span>Materias Vinculadas</span>
              <GridIcon className="w-3.5 h-3.5 text-indigo-600" />
            </div>
            <div className="text-lg font-bold text-indigo-900">
              {reportData.materias_breakdown?.length ?? 0}
            </div>
            <div className="text-[10px] text-slate-500">Asignaturas con datos</div>
          </div>

          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-1">
            <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 flex items-center justify-between">
              <span>Carga Horaria Total</span>
              <TrendingUpIcon className="w-3.5 h-3.5 text-amber-600" />
            </div>
            <div className="text-lg font-bold text-amber-900">
              {reportData.resumen_nacional.carga_horaria.toLocaleString('es-BO')}h
            </div>
            <div className="text-[10px] text-slate-500">Horas trabajadas aula</div>
          </div>

          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-1">
            <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 flex items-center justify-between">
              <span>Horas en Planilla</span>
              <BuildingIcon className="w-3.5 h-3.5 text-purple-600" />
            </div>
            <div className="text-lg font-bold text-purple-900">
              {reportData.resumen_nacional.horas_planilla.toLocaleString('es-BO')}h
            </div>
            <div className="text-[10px] text-slate-500">Cubiertas por el SEP</div>
          </div>

          <div className="bg-red-50/70 p-4 rounded-xl border border-red-200 shadow-xs space-y-1">
            <div className="text-[10px] font-bold uppercase tracking-wider text-red-700 flex items-center justify-between">
              <span>Déficit de Horas</span>
              <AlertTriangleIcon className="w-3.5 h-3.5 text-red-600" />
            </div>
            <div className="text-lg font-bold text-red-900">
              {reportData.resumen_nacional.deficit_horas.toLocaleString('es-BO')}h
            </div>
            <div className="text-[10px] text-red-600 font-medium">
              Cobertura: {reportData.resumen_nacional.pct_cobertura}%
            </div>
          </div>

          <div className="bg-indigo-50 p-4 rounded-xl border border-indigo-200 shadow-xs space-y-1">
            <div className="text-[10px] font-bold uppercase tracking-wider text-indigo-700 flex items-center justify-between">
              <span>Ítems Requeridos</span>
              <ScaleIcon className="w-3.5 h-3.5 text-indigo-500" />
            </div>
            <div className="text-lg font-bold text-indigo-900">
              {reportData.resumen_nacional.items_deficit_equiv.toLocaleString('es-BO')}
            </div>
            <div className="text-[10px] text-slate-600 font-medium">
              Base: <strong className="text-slate-900">{baseHorasActual} hrs/ítem</strong>
              <span className="text-indigo-700 ml-1">
                ({modoBase === 'bd' ? `BD: ${horaItemBd}h` : modoBase === 'promedio' ? 'promedio' : 'manual'})
              </span>
            </div>
          </div>
        </div>
      )}

      {/* PANEL METODOLOGÍA DE CÁLCULO DEL ÍTEM (BASE BD vs PROMEDIO) */}
      {reportData?.resumen_nacional && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div
            className="p-4 bg-slate-50/80 border-b border-slate-200 flex items-center justify-between cursor-pointer hover:bg-slate-100 transition-colors"
            onClick={() => setShowMetodologia(!showMetodologia)}
          >
            <div className="flex items-center gap-2">
              <ChartBarIcon className="w-4 h-4 text-indigo-600" />
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                Metodología de Cálculo del Ítem: Base {baseHorasActual} hrs/docente ({modoBase === 'bd' ? 'Base de Datos Oficial' : modoBase === 'promedio' ? 'Promedio' : 'Manual'})
              </h3>
            </div>
            <span className="text-slate-500 text-[11px]">
              {showMetodologia ? 'Ocultar metodología ▲' : 'Ver opciones de cálculo ▼'}
            </span>
          </div>

          {showMetodologia && (
            <div className="p-5 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-indigo-50/50 p-4 rounded-xl border border-indigo-200">
                <div>
                  <span className="text-[11px] font-bold uppercase text-indigo-900 block">
                    Fórmula de Horas por Ítem
                  </span>
                  <div className="font-mono text-xs font-bold text-slate-900 mt-1">
                    Carga Horaria ({reportData.resumen_nacional.carga_horaria.toLocaleString('es-BO')}h) ÷ UEs ({reportData.resumen_nacional.total_ues.toLocaleString('es-BO')})
                  </div>
                  <div className="text-xs font-bold text-indigo-700 mt-0.5">
                    = {promedioHorasDocente} hrs/UE promedio
                  </div>
                </div>

                <div>
                  <span className="text-[11px] font-bold uppercase text-slate-600 block">
                    Cálculo del Déficit en Ítems
                  </span>
                  <div className="font-mono text-xs font-bold text-slate-900 mt-1">
                    Déficit ({reportData.resumen_nacional.deficit_horas.toLocaleString('es-BO')}h) ÷ Base ({baseHorasActual}h)
                  </div>
                  <div className="text-xs font-bold text-red-700 mt-0.5">
                    = {reportData.resumen_nacional.items_deficit_equiv.toLocaleString('es-BO')} Ítems Necesarios
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-[11px] font-bold uppercase text-slate-700 block">
                      Ajustar Base Horas por Ítem:
                    </label>
                  </div>
                  <div className="flex items-center gap-1.5 mb-2">
                    <input
                      type="number"
                      step="0.1"
                      min="1"
                      max="200"
                      placeholder={String(horaItemBd)}
                      value={customBaseHoras}
                      onChange={(e) => {
                        setModoBase('manual');
                        setCustomBaseHoras(e.target.value);
                      }}
                      className="w-24 text-xs font-bold px-2.5 py-1.5 border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                    <span className="text-xs text-slate-500 font-semibold">hrs</span>
                  </div>

                  {/* 2 OPCIONES: BASE BD vs PROMEDIO */}
                  <div className="flex flex-wrap items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => {
                        setModoBase('bd');
                        setCustomBaseHoras(String(horaItemBd));
                      }}
                      className={`px-2.5 py-1 text-[11px] rounded-lg border font-bold transition-all flex items-center gap-1 ${modoBase === 'bd'
                        ? 'bg-indigo-600 text-white border-indigo-700 shadow-xs'
                        : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                        }`}
                      title="Usar valor oficial hora_item configurado en especialidades_oficiales"
                    >
                      <span>Base BD ({horaItemBd}h)</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setModoBase('promedio');
                        setCustomBaseHoras(String(promedioHorasDocente));
                      }}
                      className={`px-2.5 py-1 text-[11px] rounded-lg border font-bold transition-all flex items-center gap-1 ${modoBase === 'promedio'
                        ? 'bg-indigo-600 text-white border-indigo-700 shadow-xs'
                        : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                        }`}
                      title="Calcular con promedio Carga ÷ UEs"
                    >
                      <span>Promedio ({promedioHorasDocente}h)</span>
                    </button>
                  </div>

                  <p className="text-[10px] text-slate-500 mt-1.5 font-medium">
                    {modoBase === 'bd' && `Usando base oficial de la base de datos (${horaItemBd}h)`}
                    {modoBase === 'promedio' && `Usando promedio calculado: ${promedioHorasDocente}h`}
                    {modoBase === 'manual' && `Usando base manual: ${customBaseHoras}h`}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* PANEL MATERIAS CURRICULARES ASOCIADAS (colapsable, como el panel de rangos) */}
      {reportData?.materias_breakdown && reportData.materias_breakdown.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div
            className="p-4 bg-slate-50/80 border-b border-slate-200 flex items-center justify-between cursor-pointer hover:bg-slate-100 transition-colors"
            onClick={() => setShowMateriasPanel(!showMateriasPanel)}
          >
            <div className="flex items-center gap-2">
              <ChartBarIcon className="w-4 h-4 text-indigo-500" />
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                Materias Curriculares Vinculadas: {reportData.materias_breakdown.length} asignaturas con registros SIE
              </h3>
            </div>
            <span className="text-slate-500 text-[11px]">
              {showMateriasPanel ? 'Ocultar ▲' : 'Ver materias ▼'}
            </span>
          </div>

          {showMateriasPanel && (
            <div className="p-5">
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-50 text-slate-600 border-b border-slate-200 uppercase tracking-wider text-[10px] font-bold">
                    <tr>
                      <th className="py-2.5 px-3">Materia / Asignatura</th>
                      <th className="py-2.5 px-3">Sub-materia</th>
                      <th className="py-2.5 px-3">Nivel</th>
                      <th className="py-2.5 px-3 text-right">UEs</th>
                      <th className="py-2.5 px-3 text-right">Carga Horaria</th>
                      <th className="py-2.5 px-3 text-right text-red-600">Déficit Horas</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {reportData.materias_breakdown.map((m, idx) => (
                      <tr key={idx} className="hover:bg-slate-50">
                        <td className="py-2 px-3 font-semibold text-slate-800 whitespace-nowrap">{m.materia}</td>
                        <td className="py-2 px-3 text-slate-700 min-w-[200px]">
                          {m.sub_materia && m.sub_materia.trim() !== '' ? (
                            <span className="inline-block px-2 py-0.5 rounded bg-amber-50 text-amber-900 border border-amber-200 text-[11px] font-medium leading-relaxed">
                              {m.sub_materia}
                            </span>
                          ) : (
                            <span className="text-slate-400 italic text-[11px]">—</span>
                          )}
                        </td>
                        <td className="py-2 px-3">
                          <span className="px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-200 text-[10px] font-semibold">
                            {m.nivel || 'N/A'}
                          </span>
                        </td>
                        <td className="py-2 px-3 text-right font-mono">{m.ues_afectadas.toLocaleString('es-BO')}</td>
                        <td className="py-2 px-3 text-right font-mono text-slate-700">{m.carga_horaria.toLocaleString('es-BO')} hrs</td>
                        <td className="py-2 px-3 text-right font-mono font-bold text-red-700">{m.deficit_horas.toLocaleString('es-BO')} hrs</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-slate-100 border-t-2 border-slate-300 font-bold text-slate-900">
                    <tr>
                      <td className="py-2.5 px-3 uppercase text-[11px]" colSpan={3}>Total</td>
                      <td className="py-2.5 px-3 text-right font-mono">{reportData.resumen_nacional?.total_ues.toLocaleString('es-BO')}</td>
                      <td className="py-2.5 px-3 text-right font-mono">{reportData.resumen_nacional?.carga_horaria.toLocaleString('es-BO')} hrs</td>
                      <td className="py-2.5 px-3 text-right font-mono text-red-700">{reportData.resumen_nacional?.deficit_horas.toLocaleString('es-BO')} hrs</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* BARRA DE CONTROL DE VISTA (GRÁFICO vs TABLA) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3 rounded-2xl border border-slate-200 shadow-2xs">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-slate-700 uppercase tracking-wider ml-2">Visualización:</span>
          <button
            type="button"
            onClick={() => setTabModoVista('ambos')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
              tabModoVista === 'ambos'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:text-slate-900'
            }`}
          >
            📑 Ambos (Gráfico + Tabla)
          </button>
          <button
            type="button"
            onClick={() => setTabModoVista('grafico')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
              tabModoVista === 'grafico'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:text-slate-900'
            }`}
          >
            📊 Solo Gráfico
          </button>
          <button
            type="button"
            onClick={() => setTabModoVista('tabla')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
              tabModoVista === 'tabla'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:text-slate-900'
            }`}
          >
            📋 Solo Tabla
          </button>
        </div>

        <div className="flex items-center gap-3 text-xs text-slate-500 font-semibold pr-2">
          <span className="inline-flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-sm bg-rose-500 inline-block" /> Horas Déficit
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-sm bg-emerald-500 inline-block" /> Horas en Planilla
          </span>
          <span className="text-indigo-600 font-bold ml-1">
            🏷️ Ítems Base: {baseHorasActual}h/ítem
          </span>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════
          GRÁFICO VISUAL COMPARATIVO DE DÉFICIT DEPARTAMENTAL
      ═══════════════════════════════════════════════════════════════ */}
      {(tabModoVista === 'ambos' || tabModoVista === 'grafico') && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
            <div>
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <ChartBarIcon className="w-4 h-4 text-indigo-500" />
                Gráfico Comparativo de Déficit e Ítems por Departamento (9 Departamentos)
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Comparación directa de Carga Pagada vs Déficit de Horas. Los globos superiores indican los <strong>Ítems Docentes Necesarios</strong> calculados con la base oficial de <strong>{baseHorasActual} hrs/ítem</strong>.
              </p>
            </div>
            <span className="text-[11px] font-bold text-slate-400 bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-200 font-mono">
              Base: {modoBase === 'bd' ? `BD Oficial (${horaItemBd}h)` : `${baseHorasActual}h`}
            </span>
          </div>

          {loadingData ? (
            <div className="p-16 text-center text-slate-400 text-xs">
              Cargando gráfico analítico de materias...
            </div>
          ) : sortedDepartamentos.length === 0 ? (
            <div className="p-16 text-center text-slate-400 text-xs">
              Sin datos para graficar.
            </div>
          ) : (
            <div className="w-full select-none">
              {(() => {
                const SVG_W = 920;
                const SVG_H = 300;
                const PAD = { top: 40, bottom: 65, left: 70, right: 25 };
                const plotW = SVG_W - PAD.left - PAD.right;
                const plotH = SVG_H - PAD.top - PAD.bottom;
                const maxVal = Math.max(
                  ...sortedDepartamentos.map((d) => Math.max(d.carga_horaria, d.horas_planilla, d.deficit_horas)),
                  50
                );
                const maxHorasY = Math.ceil(maxVal * 1.18);
                const stepX = plotW / sortedDepartamentos.length;
                const barW = Math.min(stepX * 0.36, 26);
                const yTicks = [0, 0.25, 0.5, 0.75, 1.0].map((p) => Math.round(maxHorasY * p));

                return (
                  <svg viewBox={`0 0 ${SVG_W} ${SVG_H}`} className="w-full h-auto">
                    {/* Líneas de cuadrícula horizontales */}
                    {yTicks.map((val) => {
                      const y = PAD.top + plotH - (val / maxHorasY) * plotH;
                      return (
                        <g key={`ytick-${val}`}>
                          <line x1={PAD.left} y1={y} x2={PAD.left + plotW} y2={y} stroke="#E2E8F0" strokeDasharray="4,4" />
                          <text x={PAD.left - 8} y={y + 3.5} fill="#64748B" fontSize={10} fontWeight="bold" textAnchor="end">
                            {val.toLocaleString('es-BO')}h
                          </text>
                        </g>
                      );
                    })}

                    {/* Eje X */}
                    <line x1={PAD.left} y1={PAD.top + plotH} x2={PAD.left + plotW} y2={PAD.top + plotH} stroke="#CBD5E1" strokeWidth={1.5} />

                    {/* Columnas Departamentales */}
                    {sortedDepartamentos.map((d, i) => {
                      const cx = PAD.left + i * stepX + stepX / 2;
                      const hPlan = Math.max(3, (d.horas_planilla / maxHorasY) * plotH);
                      const yPlan = PAD.top + plotH - hPlan;
                      const xPlan = cx - barW - 2;

                      const hDef = Math.max(3, (d.deficit_horas / maxHorasY) * plotH);
                      const yDef = PAD.top + plotH - hDef;
                      const xDef = cx + 2;

                      const isHover = hoverDeptIndex === i;
                      const pillY = Math.min(yPlan, yDef) - 20;

                      return (
                        <g
                          key={d.departamento_id}
                          className="cursor-pointer transition-all"
                          onMouseEnter={() => setHoverDeptIndex(i)}
                          onMouseLeave={() => setHoverDeptIndex(null)}
                          onClick={() => openUesModal(d.departamento_id, d.departamento)}
                        >
                          {/* Fondo de realce en hover */}
                          {isHover && (
                            <rect
                              x={PAD.left + i * stepX + 3}
                              y={PAD.top}
                              width={stepX - 6}
                              height={plotH}
                              fill="#EEF2F6"
                              rx={8}
                              opacity={0.7}
                            />
                          )}

                          {/* Barra Planilla (Verde) */}
                          <rect
                            x={xPlan}
                            y={yPlan}
                            width={barW}
                            height={hPlan}
                            rx={4}
                            fill="#10B981"
                            opacity={isHover ? 1 : 0.88}
                          />

                          {/* Barra Déficit (Rojo) */}
                          <rect
                            x={xDef}
                            y={yDef}
                            width={barW}
                            height={hDef}
                            rx={4}
                            fill="#F43F5E"
                            opacity={isHover ? 1 : 0.92}
                          />

                          {/* Badge Flotante con Ítems Necesarios */}
                          <g>
                            <rect
                              x={cx - 32}
                              y={pillY}
                              width={64}
                              height={17}
                              rx={5}
                              fill={d.deficit_horas > 0 ? '#FFF1F2' : '#F0FDF4'}
                              stroke={d.deficit_horas > 0 ? '#FDA4AF' : '#86EFAC'}
                              strokeWidth={1}
                              filter="drop-shadow(0 1px 1px rgba(0,0,0,0.05))"
                            />
                            <text
                              x={cx}
                              y={pillY + 11.5}
                              fill={d.deficit_horas > 0 ? '#9F1239' : '#166534'}
                              fontSize={9.5}
                              fontWeight="800"
                              textAnchor="middle"
                            >
                              {d.deficit_horas > 0 ? `${d.items_deficit_equiv} ítems` : '✓ 0 ítems'}
                            </text>
                          </g>

                          {/* Nombre del Departamento en el Eje X */}
                          <text
                            x={cx}
                            y={PAD.top + plotH + 18}
                            fill={isHover ? '#0F172A' : '#334155'}
                            fontSize={10}
                            fontWeight={isHover ? '900' : '700'}
                            textAnchor="middle"
                          >
                            {d.departamento.length > 10 ? d.departamento.slice(0, 9) + '.' : d.departamento}
                          </text>

                          {/* Subtexto % Cobertura */}
                          <text
                            x={cx}
                            y={PAD.top + plotH + 32}
                            fill={d.pct_cobertura >= 90 ? '#059669' : d.pct_cobertura >= 75 ? '#D97706' : '#DC2626'}
                            fontSize={9}
                            fontWeight="800"
                            textAnchor="middle"
                          >
                            {d.pct_cobertura}% cob.
                          </text>

                          {/* Horas déficit debajo de cobertura */}
                          <text
                            x={cx}
                            y={PAD.top + plotH + 46}
                            fill="#94A3B8"
                            fontSize={8.5}
                            fontWeight="600"
                            textAnchor="middle"
                          >
                            {d.deficit_horas > 0 ? `-${d.deficit_horas.toLocaleString('es-BO')}h` : '0h def.'}
                          </text>
                        </g>
                      );
                    })}
                  </svg>
                );
              })()}
            </div>
          )}
        </div>
      )}

      {/* TABLA DEPARTAMENTAL */}
      {(tabModoVista === 'ambos' || tabModoVista === 'tabla') && (
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-5 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <MapPinIcon className="w-4 h-4 text-indigo-500" />
              Matriz Departamental para:{' '}
              {especialidadActual?.nombre || 'Especialidad'}
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Haz clic en cualquier departamento para ver el listado de Unidades Educativas afectadas.
            </p>
          </div>
          <span className="text-xs text-slate-400 font-mono">
            {sortedDepartamentos.length} Departamentos
          </span>
        </div>

        {loadingData ? (
          <div className="p-16 text-center text-slate-400 text-xs">
            Calculando matriz analítica de materias para {especialidadActual?.nombre || 'la especialidad'}...
          </div>
        ) : sortedDepartamentos.length === 0 ? (
          <div className="p-16 text-center text-slate-400 text-xs">
            No se encontraron registros para esta especialidad.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 text-slate-600 border-b border-slate-200 font-bold uppercase tracking-wider text-[10px]">
                <tr>
                  <th
                    onClick={() => handleToggleSort('nombre')}
                    className="py-3 px-3 cursor-pointer hover:bg-slate-100 transition-colors"
                  >
                    Departamento {sortBy === 'nombre' && (sortAsc ? '▲' : '▼')}
                  </th>
                  <th
                    onClick={() => handleToggleSort('ues')}
                    className="py-3 px-3 text-right cursor-pointer hover:bg-slate-100 transition-colors"
                  >
                    N° UEs {sortBy === 'ues' && (sortAsc ? '▲' : '▼')}
                  </th>
                  <th
                    onClick={() => handleToggleSort('carga')}
                    className="py-3 px-3 text-right cursor-pointer hover:bg-slate-100 transition-colors"
                  >
                    Carga Horaria {sortBy === 'carga' && (sortAsc ? '▲' : '▼')}
                  </th>
                  <th
                    onClick={() => handleToggleSort('planilla')}
                    className="py-3 px-3 text-right cursor-pointer hover:bg-slate-100 transition-colors"
                  >
                    Horas Planilla {sortBy === 'planilla' && (sortAsc ? '▲' : '▼')}
                  </th>
                  <th
                    onClick={() => handleToggleSort('deficit')}
                    className="py-3 px-3 text-right cursor-pointer hover:bg-slate-100 transition-colors"
                  >
                    Déficit Horas {sortBy === 'deficit' && (sortAsc ? '▲' : '▼')}
                  </th>
                  <th
                    onClick={() => handleToggleSort('cobertura')}
                    className="py-3 px-3 text-center cursor-pointer hover:bg-slate-100 transition-colors"
                  >
                    % Cobertura {sortBy === 'cobertura' && (sortAsc ? '▲' : '▼')}
                  </th>
                  <th className="py-3 px-3 text-right">
                    <span className="text-indigo-700">Ítems (~{baseHorasActual}h)</span>
                  </th>
                  <th className="py-3 px-3 text-center">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {sortedDepartamentos.map((dept, index) => {
                  const hasDeficit = dept.deficit_horas > 0;
                  return (
                    <tr
                      key={dept.departamento_id}
                      className="hover:bg-slate-50/80 transition-colors cursor-pointer"
                      onClick={() => openUesModal(dept.departamento_id, dept.departamento)}
                    >
                      <td className="py-3.5 px-3 font-bold text-slate-900 flex items-center gap-2">
                        <span className="w-5 h-5 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center text-[10px] font-semibold shrink-0">
                          {index + 1}
                        </span>
                        {dept.departamento}
                      </td>
                      <td className="py-3.5 px-3 text-right font-mono font-medium text-slate-700">
                        {dept.ues_afectadas.toLocaleString('es-BO')}
                      </td>
                      <td className="py-3.5 px-3 text-right font-mono font-semibold text-slate-900">
                        {dept.carga_horaria.toLocaleString('es-BO')}h
                      </td>
                      <td className="py-3.5 px-3 text-right font-mono text-slate-600">
                        {dept.horas_planilla.toLocaleString('es-BO')}h
                      </td>
                      <td className="py-3.5 px-3 text-right font-mono">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full font-bold text-xs ${hasDeficit
                            ? 'bg-red-50 text-red-700 border border-red-200'
                            : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            }`}
                        >
                          {dept.deficit_horas.toLocaleString('es-BO')}h
                        </span>
                      </td>
                      <td className="py-3.5 px-3 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <div className="w-14 bg-slate-200 rounded-full h-1.5 overflow-hidden">
                            <div
                              className={`h-full rounded-full ${dept.pct_cobertura >= 95
                                ? 'bg-emerald-500'
                                : dept.pct_cobertura >= 85
                                  ? 'bg-amber-500'
                                  : 'bg-red-500'
                                }`}
                              style={{ width: `${Math.min(100, Math.max(0, dept.pct_cobertura))}%` }}
                            />
                          </div>
                          <span className="text-[11px] font-mono text-slate-600">{dept.pct_cobertura}%</span>
                        </div>
                      </td>
                      <td className="py-3.5 px-3 text-right font-mono font-bold text-indigo-700 bg-indigo-50/30">
                        {dept.items_deficit_equiv.toLocaleString('es-BO')}
                      </td>
                      <td className="py-3.5 px-3 text-center" onClick={(e) => e.stopPropagation()}>
                        <button
                          type="button"
                          onClick={() => openUesModal(dept.departamento_id, dept.departamento)}
                          className="px-2.5 py-1 text-[11px] font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-lg transition-colors"
                        >
                          Ver UEs
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>

              {/* FILA TOTAL NACIONAL */}
              {reportData?.resumen_nacional && (
                <tfoot className="bg-slate-100 border-t-2 border-slate-300 font-bold text-slate-900">
                  <tr>
                    <td className="py-3.5 px-3 uppercase tracking-wider text-xs">TOTAL NACIONAL</td>
                    <td className="py-3.5 px-3 text-right font-mono">
                      {reportData.resumen_nacional.total_ues.toLocaleString('es-BO')} UEs
                    </td>
                    <td className="py-3.5 px-3 text-right font-mono text-amber-900">
                      {reportData.resumen_nacional.carga_horaria.toLocaleString('es-BO')}h
                    </td>
                    <td className="py-3.5 px-3 text-right font-mono text-purple-900">
                      {reportData.resumen_nacional.horas_planilla.toLocaleString('es-BO')}h
                    </td>
                    <td className="py-3.5 px-3 text-right font-mono text-red-700">
                      {reportData.resumen_nacional.deficit_horas.toLocaleString('es-BO')}h
                    </td>
                    <td className="py-3.5 px-3 text-center font-mono">
                      {reportData.resumen_nacional.pct_cobertura}%
                    </td>
                    <td className="py-3.5 px-3 text-right font-mono text-indigo-700 text-sm bg-indigo-50">
                      {reportData.resumen_nacional.items_deficit_equiv.toLocaleString('es-BO')} ítems
                    </td>
                    <td className="py-3.5 px-3 text-center text-slate-400">—</td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        )}
      </div>
      )}

      {/* MODAL DETALLE DE UNIDADES EDUCATIVAS */}
      {selectedDeptForUes && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-7xl max-h-[90vh] flex flex-col overflow-hidden">
            {/* Modal Header */}
            <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-600">
                  {especialidadActual?.nombre}
                </span>
                <h3 className="text-base font-bold text-slate-900">
                  Unidades Educativas en {selectedDeptForUes.nombre}
                </h3>
              </div>
              <button
                onClick={() => setSelectedDeptForUes(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200 transition-colors"
              >
                <XIcon className="w-5 h-5" />
              </button>
            </div>

            {/* Buscador */}
            <div className="p-4 bg-white border-b border-slate-100 flex items-center justify-between gap-3">
              <div className="relative flex-1">
                <input
                  type="text"
                  placeholder="Buscar por UE, código SIE, materia o distrito..."
                  value={searchUe}
                  onChange={(e) => setSearchUe(e.target.value)}
                  className="w-full text-xs pl-8 pr-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
                <SearchIcon className="w-4 h-4 text-slate-400 absolute left-2.5 top-2.5" />
              </div>
              <span className="text-xs text-slate-500 shrink-0">
                {filteredUes.length} de {uesList.length} registros
              </span>
            </div>

            {/* Tabla UEs */}
            <div className="p-6 overflow-y-auto flex-1">
              {loadingUes ? (
                <div className="py-12 text-center text-slate-400 text-xs">
                  Cargando escuelas de {selectedDeptForUes.nombre}...
                </div>
              ) : filteredUes.length === 0 ? (
                <div className="py-12 text-center text-slate-400 text-xs">
                  No se encontraron unidades educativas.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 text-[10px] font-bold uppercase tracking-wider">
                      <tr>
                        <th className="py-2.5 px-3">Cód. SIE</th>
                        <th className="py-2.5 px-3">Unidad Educativa</th>
                        <th className="py-2.5 px-3">Subsistema</th>
                        <th className="py-2.5 px-3">Nivel</th>
                        <th className="py-2.5 px-3 text-center">Grado</th>
                        <th className="py-2.5 px-3 text-center">Par.</th>
                        <th className="py-2.5 px-3">Materia</th>
                        <th className="py-2.5 px-3">Sub-materia</th>
                        <th className="py-2.5 px-3 text-right">Hora Tra.</th>
                        <th className="py-2.5 px-3 text-right">Hora Pla.</th>
                        <th className="py-2.5 px-3 text-right text-red-600">Déficit</th>
                        <th className="py-2.5 px-3 text-right font-black text-indigo-700">Ítems</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-medium">
                      {filteredUes.map((ue, idx) => (
                        <tr key={idx} className="hover:bg-slate-50/80">
                          <td className="py-2.5 px-3 font-mono text-slate-500 whitespace-nowrap">{ue.cod_ue}</td>
                          <td className="py-2.5 px-3 font-bold text-slate-900 whitespace-nowrap">{ue.ue}</td>
                          <td className="py-2.5 px-3 text-[11px] text-slate-600 font-semibold">{ue.subsistema || '—'}</td>
                          <td className="py-2.5 px-3 text-[11px] text-slate-600">{ue.nivel || '—'}</td>
                          <td className="py-2.5 px-3 text-center font-mono">{ue.grado || '—'}</td>
                          <td className="py-2.5 px-3 text-center font-mono">{ue.paralelo || '—'}</td>
                          <td className="py-2.5 px-3 font-bold text-slate-800 whitespace-nowrap">{ue.materia}</td>
                          <td className="py-2.5 px-3 text-slate-700 min-w-[220px]">
                            {ue.sub_materia && ue.sub_materia.trim() !== '' ? (
                              <span className="inline-block px-2 py-0.5 rounded bg-amber-50 text-amber-900 border border-amber-200 text-[11px] font-medium leading-relaxed">
                                {ue.sub_materia}
                              </span>
                            ) : (
                              <span className="text-slate-400 italic text-[11px]">—</span>
                            )}
                          </td>
                          <td className="py-2.5 px-3 text-right text-slate-600 font-mono">{ue.hora_tra}</td>
                          <td className="py-2.5 px-3 text-right text-slate-600 font-mono">{ue.hora_pla}</td>
                          <td className="py-2.5 px-3 text-right font-bold text-red-600">
                            <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-red-50 border border-red-200 font-mono">
                              -{ue.deficit}h
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-right font-black text-indigo-700 font-mono">
                            {ue.items_deficit_equiv.toFixed(2)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Footer Modal */}
            <div className="px-6 py-3 bg-slate-50 border-t border-slate-200 flex justify-end">
              <button
                type="button"
                onClick={() => setSelectedDeptForUes(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-200 rounded-lg transition-colors"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
