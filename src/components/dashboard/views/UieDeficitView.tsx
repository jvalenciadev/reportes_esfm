'use client';

import React, { useState } from 'react';
import { DashboardDataset } from '@/types/stats';
import summaryRaw from '@/data/sieUnidadEducativaSummary.json';
import { StatCard } from '../StatCard';
import { SourceBadge } from '../SourceBadge';
import {
  ScaleIcon,
  TrendingUpIcon,
  GridIcon,
  SchoolIcon,
  BuildingIcon,
  GraduationCapIcon,
} from '../../ui/Icons';
import { FiltrosEspecialidadManager } from '../FiltrosEspecialidadManager';
import { EspecialidadDeficitMatrix } from '../EspecialidadDeficitMatrix';
import { FiltrosMateriaManager } from '../FiltrosMateriaManager';
import { MateriaDeficitMatrix } from '../MateriaDeficitMatrix';

interface UieDeficitViewProps {
  data: DashboardDataset;
}

export function UieDeficitView({ data: _data }: UieDeficitViewProps) {
  const summary = summaryRaw;
  const [activeTab, setActiveTab] = useState<
    'matriz_materia' | 'filtros_materia' | 'matriz_especialidad' | 'filtros_especialidad'
  >('matriz_materia');

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* HEADER PRINCIPAL */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-5">
        <div>
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#faf5e8] dark:bg-amber-950/50 text-[#937527] dark:text-amber-300 border border-[#e5d4a4] dark:border-amber-800/60">
              SIE / SICH Carga Horaria 2026
            </span>
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60">
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
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
            <SchoolIcon className="w-8 h-8 text-[#c9a751]" />
            Déficit de Horas y Carga Horaria (UIE / SIE)
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 max-w-3xl">
            Análisis consolidado de carga horaria, horas trabajadas y planilla docente en el Sistema Educativo Plurinacional.
          </p>
        </div>

        <div className="flex items-center gap-3 self-start md:self-auto shrink-0">
          <div className="text-right px-4 py-2 bg-red-50 dark:bg-red-950/50 rounded-xl border border-red-200 dark:border-red-900/60">
            <div className="text-xs font-semibold uppercase tracking-wider text-red-700 dark:text-red-400">Déficit Nacional</div>
            <div className="text-lg font-bold text-red-900 dark:text-red-200 leading-tight">
              {summary.nacional.total_deficit_horas.toLocaleString('es-BO')} hrs
            </div>
            <div className="text-[11px] text-red-600 dark:text-red-300 font-medium">
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

      {/* TABS DE NAVEGACIÓN UIE */}
      <div className="flex border-b border-slate-200 overflow-x-auto gap-2">
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
      </div>

      {/* CONTENIDO DE TABS */}
      {activeTab === 'matriz_materia' && (
        <MateriaDeficitMatrix onGoToConfig={() => setActiveTab('filtros_materia')} />
      )}

      {activeTab === 'filtros_materia' && (
        <FiltrosMateriaManager />
      )}

      {activeTab === 'matriz_especialidad' && (
        <EspecialidadDeficitMatrix onGoToConfig={() => setActiveTab('filtros_especialidad')} />
      )}

      {activeTab === 'filtros_especialidad' && (
        <FiltrosEspecialidadManager />
      )}
    </div>
  );
}
export default UieDeficitView;
