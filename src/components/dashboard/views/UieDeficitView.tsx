'use client';

import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { DashboardDataset } from '@/types/stats';
import summaryRaw from '@/data/sieUnidadEducativaSummary.json';
import { StatCard } from '../StatCard';
import { SourceBadge } from '../SourceBadge';
import {
  ScaleIcon,
  TrendingUpIcon,
  MapPinIcon,
  ChartBarIcon,
  SearchIcon,
  LayersIcon,
  GridIcon,
  SchoolIcon,
  BuildingIcon,
  AlertTriangleIcon,
  GraduationCapIcon,
} from '../../ui/Icons';
import { FiltrosEspecialidadManager } from '../FiltrosEspecialidadManager';
import { EspecialidadDeficitMatrix } from '../EspecialidadDeficitMatrix';
import { FiltrosMateriaManager } from '../FiltrosMateriaManager';
import { MateriaDeficitMatrix } from '../MateriaDeficitMatrix';

interface UieDeficitViewProps {
  data: DashboardDataset;
}

export function UieDeficitView({ data }: UieDeficitViewProps) {
  const summary = summaryRaw;
  const [activeTab, setActiveTab] = useState<'departamentos' | 'subsistemas' | 'top_deficit' | 'matriz_especialidad' | 'filtros_especialidad' | 'matriz_materia' | 'filtros_materia' | 'explorador' | 'sql'>('matriz_materia');

  // Estados Tab 1: Departamentos
  const [selectedDeptSort, setSelectedDeptSort] = useState<'deficit' | 'ues' | 'paralelos' | 'nombre'>('deficit');

  // Estados Tab 2: Subsistemas y Niveles
  const [filterSubsistemaTab2, setFilterSubsistemaTab2] = useState<string>('all');

  // Estados Tab 3: Top Déficit
  const [searchTopUe, setSearchTopUe] = useState<string>('');
  const [topDeptFilter, setTopDeptFilter] = useState<string>('all');

  // Estados Tab 4: Explorador API Supabase
  const [apiView, setApiView] = useState<'detalle' | 'catalogo' | 'resumen'>('detalle');
  const [apiDept, setApiDept] = useState<string>('all');
  const [apiDependencia, setApiDependencia] = useState<string>('all');
  const [apiSubsistema, setApiSubsistema] = useState<string>('all');
  const [apiNivel, setApiNivel] = useState<string>('all');
  const [apiSearch, setApiSearch] = useState<string>('');
  const [apiRecords, setApiRecords] = useState<any[]>([]);
  const [apiTotal, setApiTotal] = useState<number>(0);
  const [apiLoading, setApiLoading] = useState<boolean>(false);
  const [apiPage, setApiPage] = useState<number>(0);
  const [apiError, setApiError] = useState<string | null>(null);
  const limitPerPage = 50;

  // Función para consultar API de Unidades Educativas
  const fetchApiData = useCallback(async () => {
    setApiLoading(true);
    setApiError(null);
    try {
      const params = new URLSearchParams({
        view: apiView,
        limit: String(limitPerPage),
        offset: String(apiPage * limitPerPage),
      });
      if (apiDept !== 'all') params.set('departamento_id', apiDept);
      if (apiDependencia !== 'all') params.set('dependencia', apiDependencia);
      if (apiSubsistema !== 'all') params.set('subsistema', apiSubsistema);
      if (apiNivel !== 'all') params.set('nivel', apiNivel);
      if (apiSearch.trim()) params.set('search', apiSearch.trim());

      const res = await fetch(`/api/unidad-educativa?${params.toString()}`);
      if (!res.ok) {
        throw new Error(`Error ${res.status}: ${res.statusText}`);
      }
      const json = await res.json();
      setApiRecords(json.data || []);
      setApiTotal(json.total || 0);
    } catch (err: any) {
      setApiError(err.message || 'Error de conexión');
      setApiRecords([]);
      setApiTotal(0);
    } finally {
      setApiLoading(false);
    }
  }, [apiView, apiDept, apiDependencia, apiSubsistema, apiNivel, apiSearch, apiPage]);

  useEffect(() => {
    if (activeTab === 'explorador') {
      fetchApiData();
    }
  }, [activeTab, fetchApiData]);

  // Lista ordenada de departamentos
  const departamentosList = useMemo(() => {
    const list = Object.values(summary.departamentos);
    return list.sort((a, b) => {
      if (selectedDeptSort === 'deficit') return b.total_deficit_horas - a.total_deficit_horas;
      if (selectedDeptSort === 'ues') return b.total_ues - a.total_ues;
      if (selectedDeptSort === 'paralelos') return b.total_paralelos - a.total_paralelos;
      return a.departamento.localeCompare(b.departamento);
    });
  }, [summary.departamentos, selectedDeptSort]);

  // Niveles filtrados
  const nivelesList = useMemo(() => {
    let list = Object.values(summary.niveles);
    if (filterSubsistemaTab2 !== 'all') {
      list = list.filter((n) => n.subsistema === filterSubsistemaTab2);
    }
    return list.sort((a, b) => b.total_deficit_horas - a.total_deficit_horas);
  }, [summary.niveles, filterSubsistemaTab2]);

  // Top UEs filtradas
  const filteredTopUes = useMemo(() => {
    let list = summary.top_deficit_ues;
    if (topDeptFilter !== 'all') {
      list = list.filter((u) => u.departamento.toLowerCase() === topDeptFilter.toLowerCase());
    }
    if (searchTopUe.trim()) {
      const q = searchTopUe.toLowerCase().trim();
      list = list.filter(
        (u) =>
          u.unidad_educativa.toLowerCase().includes(q) ||
          String(u.cod_ue).includes(q)
      );
    }
    return list;
  }, [summary.top_deficit_ues, topDeptFilter, searchTopUe]);

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* HEADER PRINCIPAL */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#faf5e8] text-[#937527] border border-[#e5d4a4]">
              SIE / SICH Carga Horaria 2026
            </span>
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
              16.273 Unidades Educativas
            </span>
            <SourceBadge
              sourceName="SIE / SICH"
              institutionTitle="Ministerio de Educación - Sistema de Información Educativa"
              links={[
                {
                  title: 'Planilla Oficial y Carga Horaria de Unidades Educativas',
                  institution: 'SEP Bolivia',
                  url: 'https://sie.minedu.gob.bo',
                },
              ]}
            />
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <SchoolIcon className="w-8 h-8 text-[#c9a751]" />
            Déficit de Horas y Unidades Educativas
          </h1>
          <p className="text-sm text-slate-500 mt-1 max-w-3xl">
            Análisis consolidado de carga horaria, horas trabajadas y planilla docente en las 16.273 Unidades Educativas de Bolivia (Fiscales, Convenio y Comunitarias).
          </p>
        </div>

        {/* Totalizador rápido */}
        <div className="flex items-center gap-3 bg-red-50 border border-red-200 px-4 py-2.5 rounded-xl shadow-xs">
          <AlertTriangleIcon className="w-6 h-6 text-red-600 shrink-0" />
          <div>
            <div className="text-xs font-semibold uppercase tracking-wider text-red-700">Déficit Nacional</div>
            <div className="text-lg font-bold text-red-900 leading-tight">
              {summary.nacional.total_deficit_horas.toLocaleString('es-BO')} hrs
            </div>
            <div className="text-[11px] text-red-600 font-medium">
              ≈ {summary.nacional.items_deficit_88h.toLocaleString('es-BO')} ítems (88h)
            </div>
          </div>
        </div>
      </div>

      {/* STAT CARDS NACIONALES */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        <StatCard
          title="Unidades Educativas"
          value={summary.nacional.total_ues.toLocaleString('es-BO')}
          icon={<SchoolIcon className="w-5 h-5 text-blue-600" />}
          subtitle="Catálogo único cod_ue"
        />
        <StatCard
          title="Paralelos / Cursos"
          value={(summary.nacional.total_paralelos / 1000).toFixed(1) + ' K'}
          icon={<GridIcon className="w-5 h-5 text-emerald-600" />}
          subtitle={`${summary.nacional.total_paralelos.toLocaleString('es-BO')} paralelos`}
        />
        <StatCard
          title="Carga Horaria"
          value={(summary.nacional.total_carga_horaria / 1_000_000).toFixed(2) + ' M'}
          icon={<TrendingUpIcon className="w-5 h-5 text-amber-600" />}
          subtitle="Horas trabajadas aula"
        />
        <StatCard
          title="Horas Planilla"
          value={(summary.nacional.total_horas_planilla / 1_000_000).toFixed(2) + ' M'}
          icon={<BuildingIcon className="w-5 h-5 text-purple-600" />}
          subtitle="Horas cubiertas SEP"
        />
        <StatCard
          title="Déficit de Horas"
          value={(summary.nacional.total_deficit_horas / 1000).toFixed(1) + ' K'}
          icon={<ScaleIcon className="w-5 h-5 text-red-600" />}
          subtitle={`${summary.nacional.items_deficit_88h.toLocaleString('es-BO')} ítems equiv.`}
          sourceBadge="Déficit"
          sourceColor="amber"
        />
      </div>

      {/* TABS DE NAVEGACIÓN */}
      <div className="flex border-b border-slate-200 overflow-x-auto gap-2">
        <button
          onClick={() => setActiveTab('departamentos')}
          className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 whitespace-nowrap transition-colors ${
            activeTab === 'departamentos'
              ? 'border-[#c9a751] text-[#937527] font-semibold'
              : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
          }`}
        >
          <MapPinIcon className="w-4 h-4" />
          Matriz Departamental
        </button>

        <button
          onClick={() => setActiveTab('subsistemas')}
          className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 whitespace-nowrap transition-colors ${
            activeTab === 'subsistemas'
              ? 'border-[#c9a751] text-[#937527] font-semibold'
              : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
          }`}
        >
          <LayersIcon className="w-4 h-4" />
          Subsistemas y Niveles ({Object.keys(summary.niveles).length})
        </button>

        <button
          onClick={() => setActiveTab('top_deficit')}
          className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 whitespace-nowrap transition-colors ${
            activeTab === 'top_deficit'
              ? 'border-[#c9a751] text-[#937527] font-semibold'
              : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
          }`}
        >
          <AlertTriangleIcon className="w-4 h-4 text-red-500" />
          Top 100 UEs con Mayor Déficit
        </button>

        <button
          onClick={() => setActiveTab('matriz_especialidad')}
          className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 whitespace-nowrap transition-colors ${
            activeTab === 'matriz_especialidad'
              ? 'border-[#c9a751] text-[#937527] font-semibold'
              : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
          }`}
        >
          <GraduationCapIcon className="w-4 h-4 text-[#c9a751]" />
          Déficit por Especialidad (Matriz)
        </button>

        <button
          onClick={() => setActiveTab('filtros_especialidad')}
          className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 whitespace-nowrap transition-colors ${
            activeTab === 'filtros_especialidad'
              ? 'border-[#c9a751] text-[#937527] font-semibold'
              : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
          }`}
        >
          <GridIcon className="w-4 h-4" />
          Filtros por Cargo (CRUD)
        </button>

        <button
          onClick={() => setActiveTab('matriz_materia')}
          className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 whitespace-nowrap transition-colors ${
            activeTab === 'matriz_materia'
              ? 'border-indigo-600 text-indigo-700 font-bold bg-indigo-50/50'
              : 'border-transparent text-slate-600 hover:text-indigo-600 hover:border-indigo-300'
          }`}
        >
          <GraduationCapIcon className="w-4 h-4 text-indigo-600" />
          Déficit por Materia (SIE)
          <span className="text-[10px] font-black px-1.5 py-0.2 rounded bg-indigo-100 text-indigo-800">NUEVO</span>
        </button>

        <button
          onClick={() => setActiveTab('filtros_materia')}
          className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 whitespace-nowrap transition-colors ${
            activeTab === 'filtros_materia'
              ? 'border-indigo-600 text-indigo-700 font-bold bg-indigo-50/50'
              : 'border-transparent text-slate-600 hover:text-indigo-600 hover:border-indigo-300'
          }`}
        >
          <GridIcon className="w-4 h-4 text-indigo-600" />
          Filtros de Materia (CRUD)
        </button>

        <button
          onClick={() => setActiveTab('explorador')}
          className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 whitespace-nowrap transition-colors ${
            activeTab === 'explorador'
              ? 'border-[#c9a751] text-[#937527] font-semibold'
              : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
          }`}
        >
          <SearchIcon className="w-4 h-4" />
          Explorador en Vivo (Supabase)
        </button>

        <button
          onClick={() => setActiveTab('sql')}
          className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 whitespace-nowrap transition-colors ${
            activeTab === 'sql'
              ? 'border-[#c9a751] text-[#937527] font-semibold'
              : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
          }`}
        >
          <GridIcon className="w-4 h-4 text-slate-400" />
          Estructura SQL & Migración
        </button>
      </div>

      {/* TAB 1: MATRIZ DEPARTAMENTAL */}
      {activeTab === 'departamentos' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 rounded-xl border border-slate-200">
            <div>
              <h2 className="text-base font-bold text-slate-800">Distribución de Déficit por Departamentos</h2>
              <p className="text-xs text-slate-500">
                Comparativa de las 16.273 unidades educativas y la brecha horaria entre planilla oficial y carga trabajada.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-slate-500">Ordenar por:</span>
              <select
                value={selectedDeptSort}
                onChange={(e) => setSelectedDeptSort(e.target.value as any)}
                className="text-xs border border-slate-300 rounded-lg px-2.5 py-1.5 bg-slate-50 font-medium text-slate-700 focus:outline-none focus:ring-1 focus:ring-[#c9a751]"
              >
                <option value="deficit">Mayor Déficit Horas</option>
                <option value="ues">Cantidad de UEs</option>
                <option value="paralelos">Cantidad de Paralelos</option>
                <option value="nombre">Nombre de Departamento</option>
              </select>
            </div>
          </div>

          {/* TABLA DEPARTAMENTAL */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs sm:text-sm">
                <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-4">Departamento</th>
                    <th className="py-3 px-3 text-right">UEs</th>
                    <th className="py-3 px-3 text-right">Paralelos</th>
                    <th className="py-3 px-3 text-right">Carga Horaria</th>
                    <th className="py-3 px-3 text-right">Horas Planilla</th>
                    <th className="py-3 px-4 text-right text-red-700">Déficit Horas</th>
                    <th className="py-3 px-4 text-right text-red-700">Ítems (88h)</th>
                    <th className="py-3 px-4 text-center">Impacto</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {departamentosList.map((d) => {
                    const maxDeficit = 320433; // Santa Cruz
                    const pctImpact = Math.round((d.total_deficit_horas / maxDeficit) * 100);
                    return (
                      <tr key={d.departamento} className="hover:bg-amber-50/30 transition-colors">
                        <td className="py-3 px-4 font-semibold text-slate-900 flex items-center gap-2">
                          <MapPinIcon className="w-4 h-4 text-[#c9a751]" />
                          {d.departamento}
                        </td>
                        <td className="py-3 px-3 text-right text-slate-700 font-medium">
                          {d.total_ues.toLocaleString('es-BO')}
                        </td>
                        <td className="py-3 px-3 text-right text-slate-600">
                          {d.total_paralelos.toLocaleString('es-BO')}
                        </td>
                        <td className="py-3 px-3 text-right text-slate-700">
                          {d.total_carga_horaria.toLocaleString('es-BO')}
                        </td>
                        <td className="py-3 px-3 text-right text-slate-700">
                          {d.total_horas_planilla.toLocaleString('es-BO')}
                        </td>
                        <td className="py-3 px-4 text-right font-bold text-red-600">
                          {d.total_deficit_horas.toLocaleString('es-BO')}
                        </td>
                        <td className="py-3 px-4 text-right font-semibold text-red-700">
                          {d.items_deficit_88h.toLocaleString('es-BO')}
                        </td>
                        <td className="py-3 px-4">
                          <div className="w-24 sm:w-32 bg-slate-100 rounded-full h-2 overflow-hidden mx-auto">
                            <div
                              className="bg-red-500 h-2 rounded-full"
                              style={{ width: `${pctImpact}%` }}
                            />
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot className="bg-slate-100 font-bold text-slate-900 border-t-2 border-slate-300">
                  <tr>
                    <td className="py-3 px-4">TOTAL BOLIVIA</td>
                    <td className="py-3 px-3 text-right">{summary.nacional.total_ues.toLocaleString('es-BO')}</td>
                    <td className="py-3 px-3 text-right">{summary.nacional.total_paralelos.toLocaleString('es-BO')}</td>
                    <td className="py-3 px-3 text-right">{summary.nacional.total_carga_horaria.toLocaleString('es-BO')}</td>
                    <td className="py-3 px-3 text-right">{summary.nacional.total_horas_planilla.toLocaleString('es-BO')}</td>
                    <td className="py-3 px-4 text-right text-red-700">{summary.nacional.total_deficit_horas.toLocaleString('es-BO')}</td>
                    <td className="py-3 px-4 text-right text-red-700">{summary.nacional.items_deficit_88h.toLocaleString('es-BO')}</td>
                    <td className="py-3 px-4 text-center">100%</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          {/* DESGLOSE POR DEPENDENCIA */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {Object.values(summary.dependencias).map((dep) => (
              <div key={dep.dependencia} className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                    Dependencia: {dep.dependencia}
                  </span>
                  <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
                    {dep.total_ues.toLocaleString('es-BO')} UEs
                  </span>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-500">Total Paralelos:</span>
                    <span className="font-semibold text-slate-800">{dep.total_paralelos.toLocaleString('es-BO')}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-500">Carga Horaria:</span>
                    <span className="font-semibold text-slate-800">{dep.total_carga_horaria.toLocaleString('es-BO')}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-500">Horas Planilla:</span>
                    <span className="font-semibold text-slate-800">{dep.total_horas_planilla.toLocaleString('es-BO')}</span>
                  </div>
                  <div className="pt-2 border-t border-slate-100 flex justify-between text-sm">
                    <span className="font-bold text-red-700">Déficit:</span>
                    <span className="font-bold text-red-700">{dep.total_deficit_horas.toLocaleString('es-BO')} hrs</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 2: SUBSISTEMAS Y NIVELES */}
      {activeTab === 'subsistemas' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 rounded-xl border border-slate-200">
            <div>
              <h2 className="text-base font-bold text-slate-800">Carga Horaria y Déficit por Nivel Educativo</h2>
              <p className="text-xs text-slate-500">
                Los 17 niveles registrados en Educación Regular, Educación Alternativa y Educación Especial.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-slate-500">Filtrar Subsistema:</span>
              <select
                value={filterSubsistemaTab2}
                onChange={(e) => setFilterSubsistemaTab2(e.target.value)}
                className="text-xs border border-slate-300 rounded-lg px-2.5 py-1.5 bg-slate-50 font-medium text-slate-700 focus:outline-none focus:ring-1 focus:ring-[#c9a751]"
              >
                <option value="all">Todos los Subsistemas</option>
                <option value="EDUCACIÓN REGULAR">Educación Regular</option>
                <option value="EDUCACIÓN ALTERNATIVA">Educación Alternativa</option>
                <option value="EDUCACIÓN ESPECIAL">Educación Especial</option>
              </select>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs sm:text-sm">
                <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-4">Nivel</th>
                    <th className="py-3 px-3">Subsistema</th>
                    <th className="py-3 px-3 text-right">Paralelos</th>
                    <th className="py-3 px-3 text-right">Carga Horaria</th>
                    <th className="py-3 px-3 text-right">Horas Planilla</th>
                    <th className="py-3 px-4 text-right text-red-700">Déficit Horas</th>
                    <th className="py-3 px-4 text-right text-red-700">Ítems (88h)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {nivelesList.map((n) => (
                    <tr key={n.nivel} className="hover:bg-amber-50/30 transition-colors">
                      <td className="py-3 px-4 font-semibold text-slate-900">{n.nivel}</td>
                      <td className="py-3 px-3 text-xs text-slate-500 font-medium">
                        <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                          {n.subsistema}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-right text-slate-600">{n.total_paralelos.toLocaleString('es-BO')}</td>
                      <td className="py-3 px-3 text-right text-slate-700">{n.total_carga_horaria.toLocaleString('es-BO')}</td>
                      <td className="py-3 px-3 text-right text-slate-700">{n.total_horas_planilla.toLocaleString('es-BO')}</td>
                      <td className="py-3 px-4 text-right font-bold text-red-600">{n.total_deficit_horas.toLocaleString('es-BO')}</td>
                      <td className="py-3 px-4 text-right font-semibold text-red-700">
                        {Math.round(n.total_deficit_horas / 88.0).toLocaleString('es-BO')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: TOP 100 UEs CON MAYOR DÉFICIT */}
      {activeTab === 'top_deficit' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 rounded-xl border border-slate-200">
            <div>
              <h2 className="text-base font-bold text-slate-800">Ranking de Unidades Educativas con Mayor Déficit</h2>
              <p className="text-xs text-slate-500">
                Las 100 unidades educativas con mayor cantidad de horas trabajadas no cubiertas por planilla.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <input
                type="text"
                placeholder="Buscar por Nombre o COD UE..."
                value={searchTopUe}
                onChange={(e) => setSearchTopUe(e.target.value)}
                className="text-xs border border-slate-300 rounded-lg px-3 py-1.5 w-60 focus:outline-none focus:ring-1 focus:ring-[#c9a751]"
              />
              <select
                value={topDeptFilter}
                onChange={(e) => setTopDeptFilter(e.target.value)}
                className="text-xs border border-slate-300 rounded-lg px-2.5 py-1.5 bg-slate-50 font-medium text-slate-700 focus:outline-none focus:ring-1 focus:ring-[#c9a751]"
              >
                <option value="all">Todos los Departamentos</option>
                {Object.keys(summary.departamentos).map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs sm:text-sm">
                <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-3 text-center">#</th>
                    <th className="py-3 px-3">COD UE</th>
                    <th className="py-3 px-4">Unidad Educativa</th>
                    <th className="py-3 px-3">Departamento</th>
                    <th className="py-3 px-3">Dependencia</th>
                    <th className="py-3 px-3 text-right">Carga Horaria</th>
                    <th className="py-3 px-3 text-right">Horas Planilla</th>
                    <th className="py-3 px-4 text-right text-red-700">Déficit Horas</th>
                    <th className="py-3 px-4 text-right text-red-700">Ítems (88h)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredTopUes.map((u, idx) => (
                    <tr key={u.cod_ue} className="hover:bg-amber-50/30 transition-colors">
                      <td className="py-3 px-3 text-center font-bold text-slate-400">{idx + 1}</td>
                      <td className="py-3 px-3 font-mono font-semibold text-slate-700">{u.cod_ue}</td>
                      <td className="py-3 px-4 font-bold text-slate-900">{u.unidad_educativa}</td>
                      <td className="py-3 px-3 text-slate-700">{u.departamento}</td>
                      <td className="py-3 px-3">
                        <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-700">
                          {u.dependencia}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-right text-slate-700">{u.carga.toLocaleString('es-BO')}</td>
                      <td className="py-3 px-3 text-right text-slate-700">{u.planilla.toLocaleString('es-BO')}</td>
                      <td className="py-3 px-4 text-right font-bold text-red-600">{u.deficit.toLocaleString('es-BO')}</td>
                      <td className="py-3 px-4 text-right font-bold text-red-700">{u.items_88h}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: EXPLORADOR EN VIVO (SUPABASE) */}
      {activeTab === 'explorador' && (
        <div className="space-y-6">
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h2 className="text-base font-bold text-slate-900">Buscador y Explorador Directo de Supabase</h2>
                <p className="text-xs text-slate-500">
                  Consulta en tiempo real la base de datos de Unidades Educativas y registros de horas.
                </p>
              </div>

              {/* Selector de tipo de vista */}
              <div className="inline-flex rounded-lg border border-slate-300 p-1 bg-slate-50">
                <button
                  onClick={() => {
                    setApiView('detalle');
                    setApiPage(0);
                  }}
                  className={`px-3 py-1 text-xs font-semibold rounded-md transition-colors ${
                    apiView === 'detalle' ? 'bg-[#c9a751] text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Detalle por Ítem (169K)
                </button>
                <button
                  onClick={() => {
                    setApiView('catalogo');
                    setApiPage(0);
                  }}
                  className={`px-3 py-1 text-xs font-semibold rounded-md transition-colors ${
                    apiView === 'catalogo' ? 'bg-[#c9a751] text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Catálogo UEs (16.2K)
                </button>
                <button
                  onClick={() => {
                    setApiView('resumen');
                    setApiPage(0);
                  }}
                  className={`px-3 py-1 text-xs font-semibold rounded-md transition-colors ${
                    apiView === 'resumen' ? 'bg-[#c9a751] text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Vista Resumen
                </button>
              </div>
            </div>

            {/* FILTROS INTERACTIVOS */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3 pt-2">
              <div>
                <label className="block text-[11px] font-semibold text-slate-500 mb-1">Buscar (Nombre / COD UE)</label>
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Ej: Lucio Lens o 52210001"
                    value={apiSearch}
                    onChange={(e) => {
                      setApiSearch(e.target.value);
                      setApiPage(0);
                    }}
                    className="w-full text-xs pl-8 pr-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#c9a751]"
                  />
                  <SearchIcon className="w-4 h-4 text-slate-400 absolute left-2.5 top-2.5" />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-500 mb-1">Departamento</label>
                <select
                  value={apiDept}
                  onChange={(e) => {
                    setApiDept(e.target.value);
                    setApiPage(0);
                  }}
                  className="w-full text-xs border border-slate-300 rounded-lg px-2.5 py-2 bg-white text-slate-700 focus:outline-none focus:ring-1 focus:ring-[#c9a751]"
                >
                  <option value="all">Todos los Deptos</option>
                  <option value="1">Chuquisaca</option>
                  <option value="2">La Paz</option>
                  <option value="3">Cochabamba</option>
                  <option value="4">Oruro</option>
                  <option value="5">Potosí</option>
                  <option value="6">Tarija</option>
                  <option value="7">Santa Cruz</option>
                  <option value="8">Beni</option>
                  <option value="9">Pando</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-500 mb-1">Dependencia</label>
                <select
                  value={apiDependencia}
                  onChange={(e) => {
                    setApiDependencia(e.target.value);
                    setApiPage(0);
                  }}
                  className="w-full text-xs border border-slate-300 rounded-lg px-2.5 py-2 bg-white text-slate-700 focus:outline-none focus:ring-1 focus:ring-[#c9a751]"
                >
                  <option value="all">Todas las Dependencias</option>
                  <option value="FISCAL">Fiscal</option>
                  <option value="CONVENIO">Convenio</option>
                  <option value="COMUNITARIA">Comunitaria</option>
                </select>
              </div>

              {apiView !== 'catalogo' && (
                <>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-500 mb-1">Subsistema</label>
                    <select
                      value={apiSubsistema}
                      onChange={(e) => {
                        setApiSubsistema(e.target.value);
                        setApiPage(0);
                      }}
                      className="w-full text-xs border border-slate-300 rounded-lg px-2.5 py-2 bg-white text-slate-700 focus:outline-none focus:ring-1 focus:ring-[#c9a751]"
                    >
                      <option value="all">Todos los Subsistemas</option>
                      <option value="EDUCACIÓN REGULAR">Educación Regular</option>
                      <option value="EDUCACIÓN ALTERNATIVA">Educación Alternativa</option>
                      <option value="EDUCACIÓN ESPECIAL">Educación Especial</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-500 mb-1">Nivel</label>
                    <select
                      value={apiNivel}
                      onChange={(e) => {
                        setApiNivel(e.target.value);
                        setApiPage(0);
                      }}
                      className="w-full text-xs border border-slate-300 rounded-lg px-2.5 py-2 bg-white text-slate-700 focus:outline-none focus:ring-1 focus:ring-[#c9a751]"
                    >
                      <option value="all">Todos los Niveles</option>
                      {Object.keys(summary.niveles).map((n) => (
                        <option key={n} value={n}>
                          {n}
                        </option>
                      ))}
                    </select>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* MENSAJE DE ESTADO O ERROR */}
          {apiError && (
            <div className="bg-amber-50 border border-amber-200 p-4 rounded-xl text-amber-800 text-xs">
              <div className="font-semibold flex items-center gap-1.5">
                <AlertTriangleIcon className="w-4 h-4 text-amber-600" />
                Aviso de Conexión Supabase
              </div>
              <p className="mt-1">{apiError}</p>
            </div>
          )}

          {/* TABLA DE RESULTADOS API */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between text-xs text-slate-600">
              <span>
                Mostrando {apiRecords.length} de <strong>{apiTotal.toLocaleString('es-BO')}</strong> registros encontrados
              </span>
              <div className="flex items-center gap-2">
                <button
                  disabled={apiPage === 0 || apiLoading}
                  onClick={() => setApiPage((p) => Math.max(0, p - 1))}
                  className="px-2.5 py-1 rounded border border-slate-300 bg-white disabled:opacity-40 font-medium hover:bg-slate-50"
                >
                  Anterior
                </button>
                <span>Pág. {apiPage + 1}</span>
                <button
                  disabled={(apiPage + 1) * limitPerPage >= apiTotal || apiLoading}
                  onClick={() => setApiPage((p) => p + 1)}
                  className="px-2.5 py-1 rounded border border-slate-300 bg-white disabled:opacity-40 font-medium hover:bg-slate-50"
                >
                  Siguiente
                </button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs sm:text-sm">
                <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-3">COD UE</th>
                    <th className="py-3 px-4">Unidad Educativa</th>
                    <th className="py-3 px-3">Depto</th>
                    <th className="py-3 px-3">Dependencia</th>
                    {apiView !== 'catalogo' && (
                      <>
                        <th className="py-3 px-3">Subsistema</th>
                        <th className="py-3 px-3">Nivel</th>
                        <th className="py-3 px-3 text-right">Paralelos</th>
                        <th className="py-3 px-3 text-right">Carga Horaria</th>
                        <th className="py-3 px-3 text-right">Planilla</th>
                        <th className="py-3 px-4 text-right text-red-700">Déficit Horas</th>
                      </>
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {apiLoading ? (
                    <tr>
                      <td colSpan={10} className="py-8 text-center text-slate-400">
                        Cargando registros desde Supabase...
                      </td>
                    </tr>
                  ) : apiRecords.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="py-8 text-center text-slate-400">
                        No se encontraron registros con los filtros seleccionados.
                      </td>
                    </tr>
                  ) : (
                    apiRecords.map((r, i) => (
                      <tr key={r.id || r.cod_ue || i} className="hover:bg-amber-50/30 transition-colors">
                        <td className="py-3 px-3 font-mono font-semibold text-slate-700">{r.cod_ue}</td>
                        <td className="py-3 px-4 font-bold text-slate-900">{r.unidad_educativa}</td>
                        <td className="py-3 px-3 text-slate-700">{r.departamento}</td>
                        <td className="py-3 px-3">
                          <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-700">
                            {r.dependencia}
                          </span>
                        </td>
                        {apiView !== 'catalogo' && (
                          <>
                            <td className="py-3 px-3 text-xs text-slate-500">{r.subsistema}</td>
                            <td className="py-3 px-3 font-medium text-slate-700">{r.nivel}</td>
                            <td className="py-3 px-3 text-right text-slate-600">{r.total_paralelos ?? 0}</td>
                            <td className="py-3 px-3 text-right text-slate-700">{r.carga_horaria ?? r.total_carga_horaria ?? 0}</td>
                            <td className="py-3 px-3 text-right text-slate-700">{r.horas_planilla ?? r.total_horas_planilla ?? 0}</td>
                            <td className="py-3 px-4 text-right font-bold text-red-600">
                              {r.deficit_horas ?? r.total_deficit_horas ?? 0}
                            </td>
                          </>
                        )}
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB: MATRIZ DE DÉFICIT POR ESPECIALIDAD */}
      {activeTab === 'matriz_especialidad' && (
        <EspecialidadDeficitMatrix onGoToConfig={() => setActiveTab('filtros_especialidad')} />
      )}

      {/* TAB: CONFIGURADOR DE FILTROS CRUD (CARGO) */}
      {activeTab === 'filtros_especialidad' && (
        <FiltrosEspecialidadManager />
      )}

      {/* TAB: MATRIZ DE DÉFICIT POR MATERIA (SIE GRANULAR) */}
      {activeTab === 'matriz_materia' && (
        <MateriaDeficitMatrix />
      )}

      {/* TAB: CONFIGURADOR DE FILTROS CRUD (MATERIA) */}
      {activeTab === 'filtros_materia' && (
        <FiltrosMateriaManager />
      )}

      {/* TAB 5: ESTRUCTURA SQL Y MIGRACIÓN */}
      {activeTab === 'sql' && (
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs">
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <GridIcon className="w-5 h-5 text-[#c9a751]" />
              Esquema de Base de Datos y Scripts de Migración
            </h2>
            <p className="text-sm text-slate-500 mt-1">
              Las tablas y vistas han sido estructuradas en Supabase con éxito.
            </p>

            <div className="mt-5 space-y-4">
              <div className="p-4 bg-slate-50 rounded-lg border border-slate-200">
                <div className="text-xs font-bold text-slate-800 uppercase tracking-wide">
                  1. Script de Creación DDL y Vistas Analíticas
                </div>
                <div className="text-xs text-slate-600 mt-1">
                  Archivo: <code className="text-[#937527] bg-[#faf5e8] px-1.5 py-0.5 rounded font-mono">scripts/setup_sie_unidad_educativa.sql</code>
                </div>
                <ul className="text-xs text-slate-600 mt-2 list-disc list-inside space-y-1">
                  <li>Tabla extra maestra: <code>unidad_educativa</code> (16.273 filas).</li>
                  <li>Tabla de detalle: <code>sie_unidad_educativa</code> (169.198 registros con cálculo de déficit).</li>
                  <li>Índices de alta velocidad y políticas RLS <code>allow_anon_all</code>.</li>
                  <li>Vistas analíticas <code>v_resumen_unidad_educativa</code> y <code>v_resumen_departamento_nivel</code>.</li>
                </ul>
              </div>

              <div className="p-4 bg-slate-50 rounded-lg border border-slate-200">
                <div className="text-xs font-bold text-slate-800 uppercase tracking-wide">
                  2. Migración Completada en Supabase
                </div>
                <div className="text-xs text-slate-600 mt-1">
                  Estado: <span className="font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">100% Sincronizado</span>
                </div>
                <p className="text-xs text-slate-600 mt-2">
                  16.273 Unidades Educativas y 169.198 registros de carga horaria cargados en la base de datos de producción.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
