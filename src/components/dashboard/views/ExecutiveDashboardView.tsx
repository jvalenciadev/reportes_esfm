'use client';

import React, { useState } from 'react';
import MatriculaEvolucionView from './MatriculaEvolucionView';
import DeficitMateriaDinamicoView from './DeficitMateriaDinamicoView';
import EgresadosProyeccionView from './EgresadosProyeccionView';
import PertinenciaView from './PertinenciaView';
import MigracionDocenteView from './MigracionDocenteView';
import { DashboardDataset } from '@/types/stats';
import {
  TrendingUp,
  Scale,
  GraduationCap,
  ShieldCheck,
  ArrowLeftRight,
  Maximize2,
  Minimize2,
  FileText
} from 'lucide-react';
import { exportInformeDataSciencePdf } from '@/lib/exportInformeDataSciencePdf';

interface ExecutiveDashboardViewProps {
  data: DashboardDataset;
}

export function ExecutiveDashboardView({ data }: ExecutiveDashboardViewProps) {
  const [moduloPrincipal, setModuloPrincipal] = useState<'matricula' | 'deficit_materia' | 'egresados_esfm' | 'pertinencia' | 'migracion'>('matricula');
  const [isFullScreen, setIsFullScreen] = useState<boolean>(false);

  const toggleFullScreen = () => {
    if (typeof document === 'undefined') return;
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => { });
      setIsFullScreen(true);
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen().catch(() => { });
      }
      setIsFullScreen(false);
    }
  };

  return (
    <div className="space-y-5 animate-fadeIn pb-12 w-full">
      {/* ═══════════════════════════════════════════════════════════════
          SELECTOR DE MÓDULOS DE ALTA RESOLUCIÓN GRÁFICA (PANTALLA COMPLETA)
      ═══════════════════════════════════════════════════════════════ */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 bg-white rounded-2xl border border-slate-200/90 shadow-2xs">
        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={() => setModuloPrincipal('matricula')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${moduloPrincipal === 'matricula'
              ? 'bg-slate-900 text-white shadow-xs'
              : 'bg-slate-100 text-slate-600 hover:text-slate-900 hover:bg-slate-200/70'
              }`}
          >
            <TrendingUp className="w-4 h-4 text-emerald-400" />
            <span>Proyección de Matrícula (2011–2034)</span>
          </button>

          <button
            type="button"
            onClick={() => setModuloPrincipal('deficit_materia')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${moduloPrincipal === 'deficit_materia'
              ? 'bg-indigo-600 text-white shadow-xs'
              : 'bg-slate-100 text-slate-600 hover:text-slate-900 hover:bg-slate-200/70'
              }`}
          >
            <Scale className="w-4 h-4 text-indigo-300" />
            <span>Matriz de Calor: Déficit de Ítems Docentes por Especialidad y Departamento
            </span>
          </button>

          <button
            type="button"
            onClick={() => setModuloPrincipal('egresados_esfm')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${moduloPrincipal === 'egresados_esfm'
              ? 'bg-amber-600 text-white shadow-xs'
              : 'bg-slate-100 text-slate-600 hover:text-slate-900 hover:bg-slate-200/70'
              }`}
          >
            <GraduationCap className="w-4 h-4 text-amber-300" />
            <span>Proyección Egresados ESFM</span>
          </button>

          <button
            type="button"
            onClick={() => setModuloPrincipal('pertinencia')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${moduloPrincipal === 'pertinencia'
              ? 'bg-emerald-600 text-white shadow-xs'
              : 'bg-slate-100 text-slate-600 hover:text-slate-900 hover:bg-slate-200/70'
              }`}
          >
            <ShieldCheck className="w-4 h-4 text-emerald-300" />
            <span>Pertinencia Docente SEP</span>
          </button>

          <button
            type="button"
            onClick={() => setModuloPrincipal('migracion')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all border shadow-2xs ${moduloPrincipal === 'migracion'
              ? 'bg-cyan-700 text-white border-cyan-800 shadow-xs ring-2 ring-cyan-500/30'
              : 'bg-cyan-50 dark:bg-cyan-950/40 text-cyan-800 dark:text-cyan-300 border-cyan-200 dark:border-cyan-800/60 hover:bg-cyan-100 dark:hover:bg-cyan-900/60'
              }`}
          >
            <ArrowLeftRight className={`w-4 h-4 ${moduloPrincipal === 'migracion' ? 'text-white' : 'text-cyan-600 dark:text-cyan-400'}`} />
            <span>Movilidad y Migración</span>
          </button>
        </div>

        <div className="flex items-center gap-2">
          {/* Botón Descargar Informe Técnico Data Science */}
          <button
            type="button"
            onClick={exportInformeDataSciencePdf}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-emerald-700 text-white hover:bg-emerald-800 transition-all shadow-xs shrink-0 cursor-pointer border border-emerald-800"
            title="Descargar informe metodológico de Data Science en PDF (Modelos, Algoritmos y Fuentes)"
          >
            <FileText className="w-3.5 h-3.5 text-emerald-200" />
            <span>Descargar Informe (PDF)</span>
          </button>

          <span className="hidden xl:inline-block text-[11px] font-semibold text-slate-400 bg-slate-50 px-3 py-1.5 rounded-full border border-slate-100">
            {moduloPrincipal === 'matricula'
              ? 'Fuente: INE 2024-2034 + Cierre Auditado Aula SIE 2026'
              : moduloPrincipal === 'deficit_materia'
                ? 'Fuente: UIE / SIE UE (Octubre 2026) · Especialidades Oficiales BD'
                : moduloPrincipal === 'egresados_esfm'
                  ? 'Fuente: DGFM · Modelo de Cohortes Activas ESFM (Titulación 82% / Merma 18%)'
                  : moduloPrincipal === 'pertinencia'
                    ? 'Fuente: DGFM / SEP · Padrón Docente Oficial (Rangos V, A, N, SIN)'
                    : 'Fuente: DGFM · migracion_planilla_2024_2025_2026.xls & entrantes_salientes.xlsx'}
          </span>


        </div>
      </div>

      {moduloPrincipal === 'matricula' ? (
        <MatriculaEvolucionView />
      ) : moduloPrincipal === 'deficit_materia' ? (
        <DeficitMateriaDinamicoView />
      ) : moduloPrincipal === 'egresados_esfm' ? (
        <EgresadosProyeccionView />
      ) : moduloPrincipal === 'pertinencia' ? (
        <PertinenciaView />
      ) : (
        <MigracionDocenteView />
      )}

    </div>
  );
}