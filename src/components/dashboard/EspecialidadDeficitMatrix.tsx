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

interface DepartamentoStat {
  departamento_id: number;
  departamento: string;
  total_ues: number;
  total_docentes: number;
  total_paralelos: number;
  total_carga_horaria: number;
  total_horas_planilla: number;
  total_deficit_horas: number;
  promedio_horas_docente: number;
  items_deficit: number;
  items_deficit_88h: number;
  pct_cobertura: number;
}

interface ResumenNacional {
  total_ues: number;
  total_docentes: number;
  total_paralelos: number;
  total_carga_horaria: number;
  total_horas_planilla: number;
  total_deficit_horas: number;
  promedio_horas_docente: number;
  hora_item_bd?: number;
  base_horas_aplicada: number;
  es_promedio_dinamico: boolean;
  items_deficit: number;
  items_deficit_88h: number;
  pct_cobertura: number;
}

interface RangoItem {
  rango: string;
  cantidad_docentes: number;
  pct_del_total: number;
  horas_totales: number;
  promedio_rango: number;
}

interface UnidadEducativaItem {
  id: number;
  cod_ue: number;
  unidad_educativa: string;
  departamento_id: number;
  departamento: string;
  dependencia: string;
  subsistema: string;
  nivel: string;
  cargo: string;
  total_paralelos: number;
  carga_horaria: number;
  horas_planilla: number;
  deficit_horas: number;
}

interface EspecialidadDeficitMatrixProps {
  onGoToConfig?: () => void;
}

export function EspecialidadDeficitMatrix({ onGoToConfig }: EspecialidadDeficitMatrixProps) {
  const [especialidades, setEspecialidades] = useState<any[]>([]);
  const [selectedEspecialidadId, setSelectedEspecialidadId] = useState<number>(2); // Primaria por defecto o primera
  const [loadingList, setLoadingList] = useState<boolean>(true);
  const [loadingData, setLoadingData] = useState<boolean>(false);

  // Base de cálculo personalizada (null = usa el promedio del filtro dinámicamente)
  const [customBaseHoras, setCustomBaseHoras] = useState<string>('');
  const [modoBase, setModoBase] = useState<'bd' | 'promedio' | 'manual'>('promedio');
  const [showRangoAnalysis, setShowRangoAnalysis] = useState<boolean>(true);

  const [reportData, setReportData] = useState<{
    especialidad: any;
    filtro: any;
    filtro_configurado: boolean;
    departamentos: DepartamentoStat[];
    resumen_nacional: ResumenNacional | null;
    distribucion_rangos?: RangoItem[];
    filtro_cargos_aplicados?: number;
    mensaje?: string;
  } | null>(null);

  // Modal para detalle de UEs por departamento
  const [selectedDeptForUes, setSelectedDeptForUes] = useState<{ id: number; nombre: string } | null>(null);
  const [uesList, setUesList] = useState<UnidadEducativaItem[]>([]);
  const [loadingUes, setLoadingUes] = useState<boolean>(false);
  const [searchUe, setSearchUe] = useState<string>('');

  // Ordenamiento de la tabla
  const [sortBy, setSortBy] = useState<'deficit' | 'ues' | 'docentes' | 'carga' | 'planilla' | 'cobertura' | 'nombre'>('deficit');
  const [sortAsc, setSortAsc] = useState<boolean>(false);

  // 1. Cargar lista de especialidades
  useEffect(() => {
    async function loadEsp() {
      setLoadingList(true);
      try {
        const res = await fetch('/api/filtros-especialidad?action=especialidades');
        if (res.ok) {
          const list = await res.json();
          setEspecialidades(list || []);
          if (list && list.length > 0) {
            // Seleccionar Primaria si existe, o el primero
            const primaria = list.find((e: any) => e.nombre.includes('PRIMARIA'));
            setSelectedEspecialidadId(primaria ? primaria.id : list[0].id);
          }
        }
      } catch (e) {
        console.error('Error cargando especialidades:', e);
      } finally {
        setLoadingList(false);
      }
    }
    loadEsp();
  }, []);

  // 2. Cargar reporte analítico para la especialidad seleccionada
  const fetchReport = useCallback(async (espId: number, baseHorasOverride?: string) => {
    setLoadingData(true);
    try {
      let url = `/api/especialidad-deficit?especialidad_id=${espId}`;
      if (baseHorasOverride && !isNaN(Number(baseHorasOverride)) && Number(baseHorasOverride) > 0) {
        url += `&base_horas=${encodeURIComponent(baseHorasOverride)}`;
      }
      const res = await fetch(url);
      if (res.ok) {
        const json = await res.json();
        setReportData(json);
      } else {
        setReportData(null);
      }
    } catch (e) {
      console.error('Error cargando reporte:', e);
      setReportData(null);
    } finally {
      setLoadingData(false);
    }
  }, []);

  useEffect(() => {
    if (selectedEspecialidadId) {
      fetchReport(selectedEspecialidadId, customBaseHoras);
    }
  }, [selectedEspecialidadId, customBaseHoras, fetchReport]);

  const handleApplyCustomHoras = (val: string) => {
    setCustomBaseHoras(val);
  };

  const handleResetToPromedio = () => {
    setCustomBaseHoras('');
  };

  // 3. Cargar UEs de un departamento específico
  const openUesModal = async (deptId: number, deptNombre: string) => {
    setSelectedDeptForUes({ id: deptId, nombre: deptNombre });
    setLoadingUes(true);
    setSearchUe('');
    try {
      const res = await fetch(
        `/api/especialidad-deficit?especialidad_id=${selectedEspecialidadId}&departamento_id=${deptId}&view=ues`
      );
      if (res.ok) {
        const json = await res.json();
        setUesList(json.unidades_educativas || []);
      }
    } catch (e) {
      console.error(e);
      setUesList([]);
    } finally {
      setLoadingUes(false);
    }
  };

  // Departamentos ordenados
  const sortedDepartamentos = useMemo(() => {
    if (!reportData?.departamentos) return [];
    const list = [...reportData.departamentos];
    list.sort((a, b) => {
      let diff = 0;
      if (sortBy === 'deficit') diff = b.total_deficit_horas - a.total_deficit_horas;
      else if (sortBy === 'ues') diff = b.total_ues - a.total_ues;
      else if (sortBy === 'docentes') diff = b.total_docentes - a.total_docentes;
      else if (sortBy === 'carga') diff = b.total_carga_horaria - a.total_carga_horaria;
      else if (sortBy === 'planilla') diff = b.total_horas_planilla - a.total_horas_planilla;
      else if (sortBy === 'cobertura') diff = a.pct_cobertura - b.pct_cobertura;
      else diff = a.departamento.localeCompare(b.departamento);
      return sortAsc ? -diff : diff;
    });
    return list;
  }, [reportData?.departamentos, sortBy, sortAsc]);

  // UEs filtradas en el modal
  const filteredUes = useMemo(() => {
    if (!searchUe.trim()) return uesList;
    const q = searchUe.toLowerCase().trim();
    return uesList.filter(
      (u) =>
        u.unidad_educativa.toLowerCase().includes(q) ||
        String(u.cod_ue).includes(q) ||
        u.dependencia.toLowerCase().includes(q) ||
        u.cargo.toLowerCase().includes(q)
    );
  }, [uesList, searchUe]);

  // Exportar a CSV
  const handleExportCSV = () => {
    if (!reportData || !reportData.departamentos) return;
    const espNombre = reportData.especialidad?.nombre || 'especialidad';
    const baseHoras = reportData.resumen_nacional?.base_horas_aplicada || 88;
    const rows = [
      ['Departamento', 'Nro Unidades Educativas', 'Docentes (Asignaciones)', 'Paralelos', 'Carga Horaria (hrs)', 'Horas Planilla', 'Deficit Horas', `Items Requeridos (${baseHoras}h)`, 'Items (88h estandar)', 'Pct Cobertura'],
      ...reportData.departamentos.map((d) => [
        d.departamento,
        d.total_ues,
        d.total_docentes,
        d.total_paralelos,
        d.total_carga_horaria,
        d.total_horas_planilla,
        d.total_deficit_horas,
        d.items_deficit,
        d.items_deficit_88h,
        `${d.pct_cobertura}%`,
      ]),
      [
        'TOTAL NACIONAL',
        reportData.resumen_nacional?.total_ues || 0,
        reportData.resumen_nacional?.total_docentes || 0,
        reportData.resumen_nacional?.total_paralelos || 0,
        reportData.resumen_nacional?.total_carga_horaria || 0,
        reportData.resumen_nacional?.total_horas_planilla || 0,
        reportData.resumen_nacional?.total_deficit_horas || 0,
        reportData.resumen_nacional?.items_deficit || 0,
        reportData.resumen_nacional?.items_deficit_88h || 0,
        `${reportData.resumen_nacional?.pct_cobertura || 0}%`,
      ],
    ];

    const csvContent =
      'data:text/csv;charset=utf-8,' + rows.map((e) => e.join(',')).join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `deficit_${espNombre.replace(/[^a-zA-Z0-9]/g, '_')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleToggleSort = (column: 'deficit' | 'ues' | 'docentes' | 'carga' | 'planilla' | 'cobertura' | 'nombre') => {
    if (sortBy === column) {
      setSortAsc(!sortAsc);
    } else {
      setSortBy(column);
      setSortAsc(false);
    }
  };

  const esEspecial = reportData?.especialidad?.nombre?.toUpperCase().includes('ESPECIAL') || false;
  const horaItemBd = reportData?.resumen_nacional?.hora_item_bd ?? (reportData?.especialidad?.hora_item || (esEspecial ? 108.0 : 88.0));
  const promedioHorasDocente = reportData?.resumen_nacional?.promedio_horas_docente || 88.0;
  const baseHorasActual = customBaseHoras && !isNaN(Number(customBaseHoras)) && Number(customBaseHoras) > 0
    ? Number(customBaseHoras)
    : (modoBase === 'bd' ? horaItemBd : (reportData?.resumen_nacional?.base_horas_aplicada || promedioHorasDocente));
  const esPromedioAutomatico = modoBase === 'promedio';

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* HEADER Y SELECTOR DE ESPECIALIDAD */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#faf5e8] text-[#937527] border border-[#e5d4a4]">
                Matriz Analítica Oficial SICH 2025
              </span>
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                Cálculo Dinámico de Ítems
              </span>
            </div>
            <h2 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
              <GraduationCapIcon className="w-6 h-6 text-[#c9a751]" />
              Déficit y Carga Horaria por Especialidad
            </h2>
            <p className="text-xs text-slate-500 mt-1 max-w-2xl">
              Cálculo estricto filtrado por cargos, subsistema y nivel. Los ítems se calculan sobre el{' '}
              <strong>promedio de horas por docente obtenido directamente del filtro</strong>.
            </p>
          </div>

          <div className="flex items-center gap-2">
            {onGoToConfig && (
              <button
                onClick={onGoToConfig}
                className="px-3 py-2 text-xs font-semibold rounded-lg bg-slate-100 hover:bg-[#faf5e8] text-slate-700 hover:text-[#937527] border border-slate-200 transition-colors"
              >
                Configurador de Filtros ✎
              </button>
            )}
            <button
              onClick={handleExportCSV}
              disabled={!reportData?.departamentos?.length}
              className="px-3.5 py-2 text-xs font-bold text-white bg-[#c9a751] hover:bg-[#b09141] rounded-lg transition-colors shadow-xs disabled:opacity-50"
            >
              Exportar CSV ⤓
            </button>
          </div>
        </div>

        {/* SELECTOR DE ESPECIALIDAD */}
        <div className="pt-3 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex-1 max-w-xl">
            <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block mb-1">
              Selecciona la Especialidad Oficial (20 Especialidades):
            </label>
            <select
              value={selectedEspecialidadId}
              onChange={(e) => {
                setSelectedEspecialidadId(Number(e.target.value));
                setCustomBaseHoras(''); // Reiniciar a promedio dinámico de esa especialidad
              }}
              disabled={loadingList}
              className="w-full text-xs font-bold text-slate-900 bg-slate-50 border border-slate-300 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#c9a751] focus:bg-white transition-all"
            >
              {especialidades.map((esp) => (
                <option key={esp.id} value={esp.id}>
                  {esp.id}. {esp.nombre}
                </option>
              ))}
            </select>
          </div>

          {/* BADGES DEL FILTRO APLICADO */}
          {reportData?.filtro && (
            <div className="text-xs bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                Criterios del Filtro Aplicados:
              </span>
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200 text-[10px] font-semibold">
                  {reportData.filtro.subsistemas?.join(', ') || 'Sin subsistema'}
                </span>
                <span className="px-2 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-200 text-[10px] font-semibold">
                  {reportData.filtro.niveles?.join(', ') || 'Sin nivel'}
                </span>
                <span className="px-2 py-0.5 rounded bg-purple-50 text-purple-700 border border-purple-200 text-[10px] font-bold">
                  {reportData.filtro_cargos_aplicados || reportData.filtro.cargos?.length || 0} cargos filtrados
                </span>
                {reportData.filtro.operador_carga && reportData.filtro.carga_especialidad !== null ? (
                  <span className="px-2 py-0.5 rounded bg-[#faf5e8] text-[#937527] border border-[#e5d4a4] text-[10px] font-bold">
                    Carga {reportData.filtro.operador_carga} {reportData.filtro.carga_especialidad} hrs
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-500 border border-slate-200 text-[10px] italic">
                    Sin restricción de horas
                  </span>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* AVISO SI NO ESTÁ CONFIGURADO */}
      {reportData && !reportData.filtro_configurado && (
        <div className="bg-amber-50 border border-amber-200 p-5 rounded-2xl text-amber-900 text-xs flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <AlertTriangleIcon className="w-6 h-6 text-amber-600 shrink-0" />
            <div>
              <strong className="block text-sm font-bold">Especialidad sin configurar</strong>
              <p className="text-amber-800 mt-0.5">
                Esta especialidad no tiene definidos sus subsistemas, niveles o cargos en el filtro. Configúrala para calcular sus horas y déficit.
              </p>
            </div>
          </div>
          {onGoToConfig && (
            <button
              onClick={onGoToConfig}
              className="px-3.5 py-2 bg-[#c9a751] hover:bg-[#b09141] text-white font-bold rounded-lg shrink-0 transition-colors"
            >
              Ir al Configurador
            </button>
          )}
        </div>
      )}

      {/* STAT CARDS NACIONALES DE LA ESPECIALIDAD */}
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
            <div className="text-[10px] text-slate-500">Colegios con esta especialidad</div>
          </div>

          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-1">
            <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 flex items-center justify-between">
              <span>Docentes (Registros)</span>
              <GraduationCapIcon className="w-3.5 h-3.5 text-indigo-600" />
            </div>
            <div className="text-lg font-bold text-indigo-900">
              {reportData.resumen_nacional.total_docentes.toLocaleString('es-BO')}
            </div>
            <div className="text-[10px] text-slate-500">Asignaciones en el filtro</div>
          </div>

          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-1">
            <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 flex items-center justify-between">
              <span>Carga Horaria Total</span>
              <TrendingUpIcon className="w-3.5 h-3.5 text-amber-600" />
            </div>
            <div className="text-lg font-bold text-amber-900">
              {reportData.resumen_nacional.total_carga_horaria.toLocaleString('es-BO')}h
            </div>
            <div className="text-[10px] text-slate-500">Horas trabajadas aula</div>
          </div>

          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-1">
            <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 flex items-center justify-between">
              <span>Horas en Planilla</span>
              <BuildingIcon className="w-3.5 h-3.5 text-purple-600" />
            </div>
            <div className="text-lg font-bold text-purple-900">
              {reportData.resumen_nacional.total_horas_planilla.toLocaleString('es-BO')}h
            </div>
            <div className="text-[10px] text-slate-500">Cubiertas por el SEP</div>
          </div>

          <div className="bg-red-50/70 p-4 rounded-xl border border-red-200 shadow-xs space-y-1">
            <div className="text-[10px] font-bold uppercase tracking-wider text-red-700 flex items-center justify-between">
              <span>Déficit de Horas</span>
              <AlertTriangleIcon className="w-3.5 h-3.5 text-red-600" />
            </div>
            <div className="text-lg font-bold text-red-900">
              {reportData.resumen_nacional.total_deficit_horas.toLocaleString('es-BO')}h
            </div>
            <div className="text-[10px] text-red-600 font-medium">
              Cobertura: {reportData.resumen_nacional.pct_cobertura}%
            </div>
          </div>

          {/* TARJETA ÍTEMS BASADOS EN EL PROMEDIO DEL FILTRO */}
          <div className="bg-[#faf5e8] p-4 rounded-xl border border-[#e5d4a4] shadow-xs space-y-1">
            <div className="text-[10px] font-bold uppercase tracking-wider text-[#937527] flex items-center justify-between">
              <span>Ítems Requeridos</span>
              <ScaleIcon className="w-3.5 h-3.5 text-[#c9a751]" />
            </div>
            <div className="text-lg font-bold text-[#937527]">
              {reportData.resumen_nacional.items_deficit.toLocaleString('es-BO')}
            </div>
            <div className="text-[10px] text-slate-600 font-medium">
              Base: <strong className="text-slate-900">{baseHorasActual} hrs/ítem</strong>
              <span className="text-[#937527] ml-1">({modoBase === "bd" ? "base BD" : modoBase === "promedio" ? "promedio" : "manual"})</span>
            </div>
          </div>
        </div>
      )}

      {/* PANEL DE ANÁLISIS DE PROMEDIO DE HORAS Y RANGOS (METODOLOGÍA DEL USUARIO) */}
      {reportData?.resumen_nacional && reportData?.distribucion_rangos && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div
            className="p-4 bg-slate-50/80 border-b border-slate-200 flex items-center justify-between cursor-pointer hover:bg-slate-100 transition-colors"
            onClick={() => setShowRangoAnalysis(!showRangoAnalysis)}
          >
            <div className="flex items-center gap-2">
              <ChartBarIcon className="w-4 h-4 text-[#c9a751]" />
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                Metodología de Cálculo del Ítem: Base {baseHorasActual} hrs/docente ({modoBase === "bd" ? "Base de Datos" : modoBase === "promedio" ? "Promedio Filtro" : "Manual"})
              </h3>
            </div>
            <div className="flex items-center gap-2 text-xs">
              <span className="text-slate-500 text-[11px]">
                {showRangoAnalysis ? 'Ocultar distribución ▲' : 'Ver rangos y distribución de docentes ▼'}
              </span>
            </div>
          </div>

          {showRangoAnalysis && (
            <div className="p-5 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-[#faf5e8]/60 p-4 rounded-xl border border-[#e5d4a4]">
                <div>
                  <span className="text-[11px] font-bold uppercase text-[#937527] block">
                    Fórmula de Horas por Ítem
                  </span>
                  <div className="font-mono text-xs font-bold text-slate-900 mt-1">
                    Carga Horaria ({reportData.resumen_nacional.total_carga_horaria.toLocaleString('es-BO')}h) ÷ Docentes ({reportData.resumen_nacional.total_docentes.toLocaleString('es-BO')})
                  </div>
                  <div className="text-xs font-bold text-[#937527] mt-0.5">
                    = {reportData.resumen_nacional.promedio_horas_docente} hrs/docente
                  </div>
                </div>

                <div>
                  <span className="text-[11px] font-bold uppercase text-slate-600 block">
                    Cálculo del Déficit en Ítems
                  </span>
                  <div className="font-mono text-xs font-bold text-slate-900 mt-1">
                    Déficit ({reportData.resumen_nacional.total_deficit_horas.toLocaleString('es-BO')}h) ÷ Base ({baseHorasActual}h)
                  </div>
                  <div className="text-xs font-bold text-red-700 mt-0.5">
                    = {reportData.resumen_nacional.items_deficit.toLocaleString('es-BO')} Ítems Necesarios
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
                      placeholder={String(promedioHorasDocente)}
                      value={customBaseHoras}
                      onChange={(e) => {
                        setModoBase('manual');
                        handleApplyCustomHoras(e.target.value);
                      }}
                      className="w-24 text-xs font-bold px-2.5 py-1.5 border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-[#c9a751]"
                    />
                    <span className="text-xs text-slate-500 font-semibold">hrs</span>
                  </div>

                  {/* 2 OPCIONES: BASE BD vs SACAR PROMEDIO */}
                  <div className="flex flex-wrap items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => {
                        setModoBase('bd');
                        handleApplyCustomHoras(String(horaItemBd));
                      }}
                      className={`px-2.5 py-1 text-[11px] rounded-lg border font-bold transition-all flex items-center gap-1 ${
                        modoBase === 'bd'
                          ? 'bg-[#c9a751] text-white border-[#b38f38] shadow-xs'
                          : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                      }`}
                      title="Usar valor hora_item configurado en la base de datos"
                    >
                      <span>🏛️ Base BD ({horaItemBd}h)</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setModoBase('promedio');
                        handleResetToPromedio();
                      }}
                      className={`px-2.5 py-1 text-[11px] rounded-lg border font-bold transition-all flex items-center gap-1 ${
                        modoBase === 'promedio'
                          ? 'bg-[#c9a751] text-white border-[#b38f38] shadow-xs'
                          : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                      }`}
                      title="Calcular con el promedio exacto del filtro (Carga ÷ Docentes)"
                    >
                      <span>📊 Promedio ({promedioHorasDocente}h)</span>
                    </button>
                  </div>

                  <p className="text-[10px] text-slate-500 mt-1.5 font-medium">
                    {modoBase === 'bd' && `Usando base oficial de la base de datos (${horaItemBd}h)`}
                    {modoBase === 'promedio' && 'Usando promedio exacto del filtro'}
                    {modoBase === 'manual' && `Usando base manual: ${customBaseHoras}h`}
                  </p>
                </div>
              </div>

              {/* TABLA DE RANGOS DE HORAS (IDÉNTICA A LA DEL USUARIO) */}
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-50 text-slate-600 border-b border-slate-200 uppercase tracking-wider text-[10px] font-bold">
                    <tr>
                      <th className="py-2.5 px-3">Rango de Horas</th>
                      <th className="py-2.5 px-3 text-right">Cantidad de Docentes</th>
                      <th className="py-2.5 px-3 text-right">% del Total</th>
                      <th className="py-2.5 px-3 text-right">Horas Carga Total</th>
                      <th className="py-2.5 px-3 text-right">Promedio del Rango</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {reportData.distribucion_rangos.map((r) => (
                      <tr key={r.rango} className="hover:bg-slate-50">
                        <td className="py-2 px-3 font-semibold text-slate-800">{r.rango}</td>
                        <td className="py-2 px-3 text-right font-mono">{r.cantidad_docentes.toLocaleString('es-BO')}</td>
                        <td className="py-2 px-3 text-right font-mono text-slate-600">{r.pct_del_total}%</td>
                        <td className="py-2 px-3 text-right font-mono font-medium text-slate-900">{r.horas_totales.toLocaleString('es-BO')} hrs</td>
                        <td className="py-2 px-3 text-right font-mono text-slate-500">{r.promedio_rango} hrs/doc</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-slate-100 border-t-2 border-slate-300 font-bold text-slate-900">
                    <tr>
                      <td className="py-2.5 px-3 uppercase text-[11px]">Total General</td>
                      <td className="py-2.5 px-3 text-right font-mono">{reportData.resumen_nacional.total_docentes.toLocaleString('es-BO')}</td>
                      <td className="py-2.5 px-3 text-right font-mono">100.0%</td>
                      <td className="py-2.5 px-3 text-right font-mono">{reportData.resumen_nacional.total_carga_horaria.toLocaleString('es-BO')} hrs</td>
                      <td className="py-2.5 px-3 text-right font-mono text-[#937527]">{reportData.resumen_nacional.promedio_horas_docente} hrs/doc</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TABLA DEPARTAMENTAL */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-5 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <MapPinIcon className="w-4 h-4 text-[#c9a751]" />
              Matriz Departamental para: {reportData?.especialidad?.nombre || 'Especialidad'}
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
            Calculando matriz analítica para {reportData?.especialidad?.nombre || 'la especialidad'}...
          </div>
        ) : sortedDepartamentos.length === 0 ? (
          <div className="p-16 text-center text-slate-400 text-xs">
            No se encontraron registros para esta combinación de filtros.
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
                    onClick={() => handleToggleSort('docentes')}
                    className="py-3 px-3 text-right cursor-pointer hover:bg-slate-100 transition-colors"
                  >
                    Docentes {sortBy === 'docentes' && (sortAsc ? '▲' : '▼')}
                  </th>
                  <th className="py-3 px-3 text-right">Paralelos</th>
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
                    <span className="text-[#937527]">Ítems (~{baseHorasActual}h)</span>
                  </th>
                  <th className="py-3 px-3 text-center">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {sortedDepartamentos.map((dept, index) => {
                  const hasDeficit = dept.total_deficit_horas > 0;
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
                        {dept.total_ues.toLocaleString('es-BO')}
                      </td>
                      <td className="py-3.5 px-3 text-right font-mono text-indigo-700 font-semibold">
                        {dept.total_docentes.toLocaleString('es-BO')}
                      </td>
                      <td className="py-3.5 px-3 text-right font-mono text-slate-500">
                        {dept.total_paralelos.toLocaleString('es-BO')}
                      </td>
                      <td className="py-3.5 px-3 text-right font-mono font-semibold text-slate-900">
                        {dept.total_carga_horaria.toLocaleString('es-BO')}h
                      </td>
                      <td className="py-3.5 px-3 text-right font-mono text-slate-600">
                        {dept.total_horas_planilla.toLocaleString('es-BO')}h
                      </td>
                      <td className="py-3.5 px-3 text-right font-mono">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full font-bold text-xs ${
                            hasDeficit
                              ? 'bg-red-50 text-red-700 border border-red-200'
                              : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          }`}
                        >
                          {dept.total_deficit_horas.toLocaleString('es-BO')}h
                        </span>
                      </td>
                      <td className="py-3.5 px-3 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <div className="w-14 bg-slate-200 rounded-full h-1.5 overflow-hidden">
                            <div
                              className={`h-full rounded-full ${
                                dept.pct_cobertura >= 95
                                  ? 'bg-emerald-500'
                                  : dept.pct_cobertura >= 85
                                  ? 'bg-amber-500'
                                  : 'bg-red-500'
                              }`}
                              style={{ width: `${Math.min(100, Math.max(0, dept.pct_cobertura))}%` }}
                            />
                          </div>
                          <span className="text-[11px] font-mono text-slate-600">
                            {dept.pct_cobertura}%
                          </span>
                        </div>
                      </td>
                      <td className="py-3.5 px-3 text-right font-mono font-bold text-[#937527] bg-[#faf5e8]/30">
                        {dept.items_deficit.toLocaleString('es-BO')}
                      </td>
                      <td className="py-3.5 px-3 text-center" onClick={(e) => e.stopPropagation()}>
                        <button
                          type="button"
                          onClick={() => openUesModal(dept.departamento_id, dept.departamento)}
                          className="px-2.5 py-1 text-[11px] font-semibold text-[#937527] bg-[#faf5e8] hover:bg-[#f3ebd3] border border-[#e5d4a4] rounded-lg transition-colors"
                        >
                          Ver UEs
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>

              {/* FILA DE TOTAL NACIONAL */}
              {reportData?.resumen_nacional && (
                <tfoot className="bg-slate-100 border-t-2 border-slate-300 font-bold text-slate-900">
                  <tr>
                    <td className="py-3.5 px-3 uppercase tracking-wider text-xs">
                      TOTAL NACIONAL
                    </td>
                    <td className="py-3.5 px-3 text-right font-mono">
                      {reportData.resumen_nacional.total_ues.toLocaleString('es-BO')} UEs
                    </td>
                    <td className="py-3.5 px-3 text-right font-mono text-indigo-900">
                      {reportData.resumen_nacional.total_docentes.toLocaleString('es-BO')}
                    </td>
                    <td className="py-3.5 px-3 text-right font-mono text-slate-600">
                      {reportData.resumen_nacional.total_paralelos.toLocaleString('es-BO')}
                    </td>
                    <td className="py-3.5 px-3 text-right font-mono text-amber-900">
                      {reportData.resumen_nacional.total_carga_horaria.toLocaleString('es-BO')}h
                    </td>
                    <td className="py-3.5 px-3 text-right font-mono text-purple-900">
                      {reportData.resumen_nacional.total_horas_planilla.toLocaleString('es-BO')}h
                    </td>
                    <td className="py-3.5 px-3 text-right font-mono text-red-700">
                      {reportData.resumen_nacional.total_deficit_horas.toLocaleString('es-BO')}h
                    </td>
                    <td className="py-3.5 px-3 text-center font-mono">
                      {reportData.resumen_nacional.pct_cobertura}%
                    </td>
                    <td className="py-3.5 px-3 text-right font-mono text-[#937527] text-sm bg-[#faf5e8]">
                      {reportData.resumen_nacional.items_deficit.toLocaleString('es-BO')} ítems
                    </td>
                    <td className="py-3.5 px-3 text-center text-slate-400">—</td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        )}
      </div>

      {/* MODAL DETALLE DE UNIDADES EDUCATIVAS POR DEPARTAMENTO */}
      {selectedDeptForUes && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">
            {/* Modal Header */}
            <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-[#937527]">
                  {reportData?.especialidad?.nombre}
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
                  placeholder="Buscar unidad educativa, código SIE o cargo..."
                  value={searchUe}
                  onChange={(e) => setSearchUe(e.target.value)}
                  className="w-full text-xs pl-8 pr-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#c9a751]"
                />
                <SearchIcon className="w-4 h-4 text-slate-400 absolute left-2.5 top-2.5" />
              </div>
              <span className="text-xs text-slate-500 shrink-0">
                {filteredUes.length} de {uesList.length} registros
              </span>
            </div>

            {/* Lista UEs */}
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
                <div className="divide-y divide-slate-100">
                  {filteredUes.map((ue) => (
                    <div
                      key={ue.id}
                      className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 hover:bg-slate-50 px-2 rounded-lg transition-colors"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-[10px] text-slate-400">
                            #{ue.cod_ue}
                          </span>
                          <span className="text-xs font-bold text-slate-900">
                            {ue.unidad_educativa}
                          </span>
                          <span className="px-1.5 py-0.2 rounded text-[9px] font-semibold bg-slate-100 text-slate-600 border border-slate-200">
                            {ue.dependencia}
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-500 mt-0.5">
                          {ue.subsistema} · {ue.nivel} · <span className="font-mono text-purple-700 font-semibold">{ue.cargo}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-4 text-xs font-mono shrink-0">
                        <div className="text-right">
                          <span className="text-slate-400 block text-[9px] uppercase">Carga</span>
                          <span className="text-slate-800 font-semibold">{ue.carga_horaria}h</span>
                        </div>
                        <div className="text-right">
                          <span className="text-slate-400 block text-[9px] uppercase">Planilla</span>
                          <span className="text-slate-800 font-semibold">{ue.horas_planilla}h</span>
                        </div>
                        <div className="text-right">
                          <span className="text-slate-400 block text-[9px] uppercase">Déficit</span>
                          <span className="font-bold text-red-700 bg-red-50 px-2 py-0.5 rounded border border-red-200">
                            {ue.deficit_horas} hrs
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
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
