'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  GraduationCapIcon,
  BuildingIcon,
  ScaleIcon,
  TrendingUpIcon,
  AlertTriangleIcon,
  SearchIcon,
  MapPinIcon,
  XIcon,
} from '../ui/Icons';

interface EspecialidadItem {
  id: number;
  nombre: string;
  reglas_total: number;
  reglas_activas: number;
}

interface ResumenNacional {
  total_ues: number;
  carga_horaria: number;
  horas_planilla: number;
  deficit_horas: number;
  items_deficit_equiv: number;
  pct_cobertura: number;
}

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

interface MateriaBreakdown {
  materia: string;
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
  nivel: string;
  materia: string;
  hora_tra: number;
  hora_pla: number;
  deficit: number;
  items_deficit_equiv: number;
}

export function MateriaDeficitMatrix() {
  const [especialidades, setEspecialidades] = useState<EspecialidadItem[]>([]);
  const [selectedEspId, setSelectedEspId] = useState<number>(1);
  const [loading, setLoading] = useState<boolean>(true);
  const [resumen, setResumen] = useState<ResumenNacional | null>(null);
  const [departamentos, setDepartamentos] = useState<DepartamentoDato[]>([]);
  const [materiasBreakdown, setMateriasBreakdown] = useState<MateriaBreakdown[]>([]);
  const [sinDatos, setSinDatos] = useState<boolean>(false);
  const [searchEsp, setSearchEsp] = useState<string>('');

  // Modal / Desglose de UEs
  const [selectedDeptUes, setSelectedDeptUes] = useState<{ id: number; nombre: string } | null>(null);
  const [uesList, setUesList] = useState<UeDetalle[]>([]);
  const [loadingUes, setLoadingUes] = useState<boolean>(false);

  // 1. Cargar lista de especialidades
  const loadEspecialidades = useCallback(async () => {
    try {
      const res = await fetch('/api/materia-deficit');
      if (res.ok) {
        const data = await res.json();
        const list: EspecialidadItem[] = data.especialidades || [];
        setEspecialidades(list);
        if (list.length > 0 && !selectedEspId) {
          setSelectedEspId(list[0].id);
        }
      }
    } catch (e: any) {
      console.error('Error cargando especialidades en matriz:', e);
    }
  }, [selectedEspId]);

  // 2. Cargar cálculo de déficit por materia para la especialidad seleccionada
  const loadMatriz = useCallback(async (espId: number) => {
    setLoading(true);
    setSinDatos(false);
    try {
      const res = await fetch(`/api/materia-deficit?especialidad_id=${espId}`);
      if (res.ok) {
        const data = await res.json();
        setResumen(data.resumen_nacional);
        setDepartamentos(data.departamentos || []);
        setMateriasBreakdown(data.materias_breakdown || []);
        setSinDatos(Boolean(data.sin_datos));
      }
    } catch (e: any) {
      console.error('Error calculando matriz por materia:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  // 3. Cargar desglose de UEs para un departamento
  const loadUesDept = async (deptId: number, deptNombre: string) => {
    setSelectedDeptUes({ id: deptId, nombre: deptNombre });
    setLoadingUes(true);
    try {
      const res = await fetch(
        `/api/materia-deficit?especialidad_id=${selectedEspId}&view=ues&departamento_id=${deptId}`
      );
      if (res.ok) {
        const data = await res.json();
        setUesList(data.ues || []);
      }
    } catch (e: any) {
      console.error('Error cargando UEs del departamento:', e);
    } finally {
      setLoadingUes(false);
    }
  };

  useEffect(() => {
    loadEspecialidades();
  }, [loadEspecialidades]);

  useEffect(() => {
    if (selectedEspId) {
      loadMatriz(selectedEspId);
      setSelectedDeptUes(null);
    }
  }, [selectedEspId, loadMatriz]);

  const especialidadActual = useMemo(() => {
    return especialidades.find((e) => e.id === selectedEspId);
  }, [especialidades, selectedEspId]);

  const filteredEspecialidades = useMemo(() => {
    if (!searchEsp.trim()) return especialidades;
    const q = searchEsp.toLowerCase();
    return especialidades.filter((e) => e.nombre.toLowerCase().includes(q));
  }, [especialidades, searchEsp]);

  return (
    <div className="space-y-6">
      {/* Selector Rápido de Especialidad */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="text-[10px] font-bold text-indigo-600 uppercase tracking-wider">
              Enfoque Granular por Asignatura / Materia
            </div>
            <h3 className="text-xl font-black text-slate-900 mt-0.5">
              Matriz de Déficit por Especialidad
            </h3>
          </div>

          <div className="relative w-full sm:w-72">
            <SearchIcon className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              placeholder="Filtrar especialidad..."
              value={searchEsp}
              onChange={(e) => setSearchEsp(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 font-semibold"
            />
          </div>
        </div>

        {/* Chips horizontales de especialidades */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-thin">
          {filteredEspecialidades.map((esp) => {
            const isSelected = esp.id === selectedEspId;
            return (
              <button
                key={esp.id}
                onClick={() => setSelectedEspId(esp.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold shrink-0 transition-all flex items-center gap-1.5 border ${
                  isSelected
                    ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                    : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                }`}
              >
                <span>{esp.nombre}</span>
                {esp.reglas_total > 0 && (
                  <span
                    className={`text-[10px] px-1.5 py-0.2 rounded-full font-black ${
                      isSelected ? 'bg-white/20 text-white' : 'bg-indigo-100 text-indigo-700'
                    }`}
                  >
                    {esp.reglas_total}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Alerta si la especialidad no tiene datos en sie_deficit_materia */}
      {sinDatos && (
        <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-start gap-3">
          <AlertTriangleIcon className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <div className="font-bold text-sm">Sin registros vinculados para esta especialidad</div>
            <p className="mt-0.5 text-amber-800">
              No se hallaron coincidencias entre las reglas de materia configuradas y los registros cargados en{' '}
              <code className="bg-amber-100 px-1 py-0.5 rounded font-mono text-[11px]">sie_deficit_materia</code>.
              Verifique en el <b>Configurador de Materias</b> que los nombres de las asignaturas coincidan exactamente o use el tipo &quot;CONTIENE&quot;.
            </p>
          </div>
        </div>
      )}

      {/* KPIs Nacionales */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">UEs Afectadas</div>
          <div className="text-xl font-black text-slate-800 mt-1">
            {(resumen?.total_ues ?? 0).toLocaleString()}
          </div>
          <div className="text-[10px] text-slate-500 mt-1">Unidades Educativas</div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Carga Horaria</div>
          <div className="text-xl font-black text-slate-800 mt-1">
            {(resumen?.carga_horaria ?? 0).toLocaleString()}
          </div>
          <div className="text-[10px] text-slate-500 mt-1">Horas Trabajadas</div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Horas Planilla</div>
          <div className="text-xl font-black text-slate-800 mt-1">
            {(resumen?.horas_planilla ?? 0).toLocaleString()}
          </div>
          <div className="text-[10px] text-slate-500 mt-1">Horas Pagadas</div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <div className="text-[10px] font-bold text-rose-500 uppercase tracking-wider">Déficit Horas</div>
          <div className="text-xl font-black text-rose-600 mt-1">
            {(resumen?.deficit_horas ?? 0).toLocaleString()}
          </div>
          <div className="text-[10px] text-rose-600/80 mt-1">Horas faltantes</div>
        </div>

        <div className="bg-gradient-to-br from-indigo-900 to-slate-900 p-4 rounded-2xl text-white shadow-xs">
          <div className="text-[10px] font-bold text-indigo-300 uppercase tracking-wider">Ítems Déficit</div>
          <div className="text-xl font-black text-emerald-400 mt-1">
            {(resumen?.items_deficit_equiv ?? 0).toLocaleString()}
          </div>
          <div className="text-[10px] text-slate-300 mt-1">Equivalentes 88h/108h</div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Cobertura</div>
          <div className="text-xl font-black text-indigo-600 mt-1">
            {resumen?.pct_cobertura ?? 100}%
          </div>
          <div className="text-[10px] text-slate-500 mt-1">Planilla / Carga</div>
        </div>
      </div>

      {/* Grid: Desglose por Departamento + Materias Curriculares */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Tabla Departamental */}
        <div className="lg:col-span-8 bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <MapPinIcon className="w-4 h-4 text-slate-500" />
              <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                Déficit por Departamento (9 Departamentos)
              </span>
            </div>
            <span className="text-[11px] text-slate-400">Granularidad SIE Materias</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-100/70 border-b border-slate-200 text-slate-600 text-[10px] font-bold uppercase tracking-wider">
                  <th className="py-3 px-4">Departamento</th>
                  <th className="py-3 px-3 text-right">UEs</th>
                  <th className="py-3 px-3 text-right">Carga Horas</th>
                  <th className="py-3 px-3 text-right">Planilla</th>
                  <th className="py-3 px-3 text-right text-rose-600">Déficit Horas</th>
                  <th className="py-3 px-3 text-right font-black text-indigo-700">Ítems Equiv.</th>
                  <th className="py-3 px-3 text-right">Cobertura</th>
                  <th className="py-3 px-4 text-center">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {departamentos.map((d) => (
                  <tr key={d.departamento_id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-4 font-bold text-slate-900">{d.departamento}</td>
                    <td className="py-3 px-3 text-right font-semibold text-slate-700">
                      {d.ues_afectadas.toLocaleString()}
                    </td>
                    <td className="py-3 px-3 text-right text-slate-600">
                      {d.carga_horaria.toLocaleString()}
                    </td>
                    <td className="py-3 px-3 text-right text-slate-600">
                      {d.horas_planilla.toLocaleString()}
                    </td>
                    <td className="py-3 px-3 text-right font-bold text-rose-600">
                      {d.deficit_horas > 0 ? `-${d.deficit_horas.toLocaleString()}` : '0'}
                    </td>
                    <td className="py-3 px-3 text-right font-black text-indigo-700">
                      {d.items_deficit_equiv > 0 ? d.items_deficit_equiv.toFixed(1) : '—'}
                    </td>
                    <td className="py-3 px-3 text-right">
                      <span
                        className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          d.pct_cobertura >= 90
                            ? 'bg-emerald-50 text-emerald-700'
                            : d.pct_cobertura >= 75
                            ? 'bg-amber-50 text-amber-700'
                            : 'bg-rose-50 text-rose-700'
                        }`}
                      >
                        {d.pct_cobertura}%
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <button
                        onClick={() => loadUesDept(d.departamento_id, d.departamento)}
                        className="px-2 py-1 text-[10px] font-bold text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-colors"
                      >
                        Ver UEs
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Materias Curriculares que Aportan al Cálculo */}
        <div className="lg:col-span-4 bg-white rounded-2xl border border-slate-200 shadow-sm p-4 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2">
            <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider">
              Materias Asociadas
            </h4>
            <span className="text-[11px] font-bold text-slate-400">
              {materiasBreakdown.length} materias
            </span>
          </div>

          {materiasBreakdown.length === 0 ? (
            <div className="p-6 text-center text-xs text-slate-400">
              No hay materias con horas computadas.
            </div>
          ) : (
            <div className="space-y-2.5 max-h-[460px] overflow-y-auto pr-1">
              {materiasBreakdown.map((m, idx) => (
                <div key={idx} className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black text-slate-800">{m.materia}</span>
                    <span className="text-[10px] font-extrabold px-1.5 py-0.2 rounded bg-indigo-100 text-indigo-700">
                      {m.nivel || 'Nivel n/a'}
                    </span>
                  </div>
                  <div className="grid grid-cols-3 text-[11px] text-slate-600 pt-1 border-t border-slate-200/60">
                    <div>
                      <span className="text-slate-400 block text-[9px] uppercase">UEs</span>
                      <span className="font-bold">{m.ues_afectadas}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[9px] uppercase">Carga</span>
                      <span className="font-bold">{m.carga_horaria}h</span>
                    </div>
                    <div>
                      <span className="text-rose-400 block text-[9px] uppercase">Déficit</span>
                      <span className="font-black text-rose-600">{m.deficit_horas}h</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Modal / Panel de Desglose de Unidades Educativas */}
      {selectedDeptUes && (
        <div className="bg-white rounded-2xl border-2 border-indigo-200 shadow-lg p-5 space-y-4 animate-in fade-in duration-300">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <span className="text-[10px] font-bold text-indigo-600 uppercase tracking-wider">
                Desglose de Unidades Educativas con Déficit
              </span>
              <h4 className="text-base font-black text-slate-900 mt-0.5">
                {selectedDeptUes.nombre} &mdash; {especialidadActual?.nombre}
              </h4>
            </div>
            <button
              onClick={() => setSelectedDeptUes(null)}
              className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
            >
              <XIcon className="w-5 h-5" />
            </button>
          </div>

          {loadingUes ? (
            <div className="p-8 text-center text-xs text-slate-400">
              Cargando Unidades Educativas...
            </div>
          ) : uesList.length === 0 ? (
            <div className="p-6 text-center text-xs text-slate-400">
              No se hallaron registros con déficit de materia para este departamento.
            </div>
          ) : (
            <div className="overflow-x-auto max-h-96 overflow-y-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 text-[10px] font-bold uppercase tracking-wider">
                    <th className="py-2.5 px-3">Cód. SIE</th>
                    <th className="py-2.5 px-3">Unidad Educativa</th>
                    <th className="py-2.5 px-3">Distrito</th>
                    <th className="py-2.5 px-3">Área</th>
                    <th className="py-2.5 px-3">Materia</th>
                    <th className="py-2.5 px-3 text-right">Hora Tra.</th>
                    <th className="py-2.5 px-3 text-right">Hora Pla.</th>
                    <th className="py-2.5 px-3 text-right text-rose-600">Déficit</th>
                    <th className="py-2.5 px-3 text-right font-black text-indigo-700">Ítems</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {uesList.map((ue, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/80">
                      <td className="py-2.5 px-3 font-mono text-slate-500">{ue.cod_ue}</td>
                      <td className="py-2.5 px-3 font-bold text-slate-900">{ue.ue}</td>
                      <td className="py-2.5 px-3 text-slate-600">{ue.distrito}</td>
                      <td className="py-2.5 px-3">
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-700">
                          {ue.area}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 font-semibold text-slate-800">{ue.materia}</td>
                      <td className="py-2.5 px-3 text-right text-slate-600">{ue.hora_tra}</td>
                      <td className="py-2.5 px-3 text-right text-slate-600">{ue.hora_pla}</td>
                      <td className="py-2.5 px-3 text-right font-bold text-rose-600">-{ue.deficit}</td>
                      <td className="py-2.5 px-3 text-right font-black text-indigo-700">
                        {ue.items_deficit_equiv.toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
