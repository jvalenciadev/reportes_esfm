'use client';

import React, { useState, useMemo } from 'react';
import { DashboardDataset, SourceTab } from '@/types/stats';
import { Sidebar } from './Sidebar';
import { ProyeccionesView } from './views/ProyeccionesView';
import { DgfmView } from './views/DgfmView';
import { IneView } from './views/IneView';
import { SieView } from './views/SieView';
import { SeieView } from './views/SeieView';
import { UieDeficitView } from './views/UieDeficitView';
import HistorialDocenteView from './views/HistorialDocenteView';
import Exposicion2031View from './views/Exposicion2031View';
import PertinenciaView from './views/PertinenciaView';
import Image from 'next/image';
import { Sparkles } from 'lucide-react';
import { ResumenView } from './views/Resumen';
interface DashboardShellProps {
  initialData: DashboardDataset;
}

export function DashboardShell({ initialData }: DashboardShellProps) {
  const [currentTab, setCurrentTab] = useState<SourceTab>('proyecciones');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  // Conteos por fuente
  const counts = useMemo(() => {
    const dgfm =
      initialData.inscritos_esfm.length +
      initialData.esfm.length +
      initialData.especialidades.length;
    const ine =
      initialData.ine_matricula.length +
      initialData.ine_poblacion.length +
      initialData.ine_proyeccion_edad.length;
    const sie =
      initialData.sie_total_estudiantes.length +
      initialData.matricula_rural_urbana.length;
    const seie = initialData.discapacidad_seie.length;
    const uie = 17274;
    const total = dgfm + ine + sie + seie + uie + initialData.departamentos.length;
    return { dgfm, ine, sie, seie, uie, total };
  }, [initialData]);

  const titles: Record<SourceTab, { title: string; subtitle: string; tag: string }> = {
    proyecciones: {
      title: 'Proyecciones Escolares (2026 - 2031)',
      subtitle: 'Modelo demográfico normativo INE y escolar SIE desagregado por curso',
      tag: 'PROYECCIONES SEP',
    },
    dgfm: {
      title: 'DGFM · Formación de Maestros',
      subtitle: 'Postulantes históricos a las 46 ESFMs y 40 Especialidades (2016-2026)',
      tag: 'ADMISIONES ESFM',
    },
    ine: {
      title: 'INE · Instituto Nacional de Estadística',
      subtitle: 'Censos, proyecciones demográficas y matrícula escolar',
      tag: 'DEMOGRAFÍA OFICIAL',
    },
    sie: {
      title: 'SIE · Sistema de Información Educativa',
      subtitle: 'Estudiantes del subsistema regular y cobertura rural/urbana',
      tag: 'EDUCACIÓN REGULAR',
    },
    seie: {
      title: 'SEIE · Educación Especial',
      subtitle: 'Inclusión de estudiantes con discapacidad por áreas urbana y rural',
      tag: 'EDUCACIÓN ESPECIAL',
    },
    uie: {
      title: 'UIE · Déficit Docente y Carga Horaria',
      subtitle: 'Balance de horas trabajadas vs planilla fiscal y pronóstico de demanda ESFM',
      tag: 'DÉFICIT HORARIO',
    },
    historial: {
      title: 'Historial Docente 2024 – 2026',
      subtitle: 'Salientes, nuevos ingresantes, impertinencias y maestros sin cargo por departamento',
      tag: 'ANÁLISIS HISTÓRICO',
    },
    exposicion: {
      title: 'Sala de Exposición Estratégica · Proyección ESFM 2031',
      subtitle: 'Dictamen de apertura de especialidades oficiales: Demografía INE, Padrón Docente y Egresados ESFM',
      tag: 'DICTAMEN 2031',
    },
    Resumen: {
      title: 'Resumen general',
      subtitle: 'Descripción breve del módulo o reporte',
      tag: 'NUEVO MÓDULO',
    },
    pertinencia: {
      title: 'Pertinencia Docente',
      subtitle: 'Docentes que enseñan fuera de su especialidad o nivel de formación — desagregado por rango V / A / N',
      tag: 'PERTINENCIA SIE',
    },
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex">
      {/* Sidebar colapsable institucional */}
      <Sidebar
        currentTab={currentTab}
        onSelectTab={setCurrentTab}
        counts={counts}
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
      />

      {/* Contenido principal con transición fluida de ancho */}
      <div
        className={`flex-1 flex flex-col min-w-0 transition-[padding] duration-300 ease-in-out ${isSidebarOpen ? 'lg:pl-72' : 'lg:pl-0'
          }`}
      >
        {/* Barra Superior Institucional con acento #c9a751 */}
        <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-xs border-b border-slate-200/90 px-4 sm:px-8 py-3 flex items-center justify-between gap-4 shadow-2xs">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsSidebarOpen((prev) => !prev)}
              className="p-2 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-600 transition-colors flex items-center gap-1.5 cursor-pointer"
              aria-label={isSidebarOpen ? 'Ocultar menú lateral' : 'Mostrar menú lateral'}
              title={isSidebarOpen ? 'Ocultar menú lateral' : 'Mostrar menú lateral'}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
              </svg>
              {!isSidebarOpen && (
                <span className="hidden md:inline-block text-xs font-medium text-slate-600">Menú</span>
              )}
            </button>

            <div className="flex items-center gap-2.5">
              <Image src="/minedu_2025.png" alt="MINEDU" width={72} height={30} className="hidden sm:inline-block h-6 w-auto object-contain" />
              <span className="text-[10px] font-medium uppercase px-2 py-0.5 rounded bg-[#c9a751]/10 text-[#c9a751] border border-[#c9a751]/30 tracking-wider">
                {titles[currentTab].tag}
              </span>
              <span className="text-xs font-semibold text-slate-300">/</span>
              <span className="text-xs font-medium text-slate-800 truncate max-w-xs sm:max-w-md">
                {titles[currentTab].title}
              </span>
            </div>
          </div>

          {/* Selector de pestañas rápido con color principal #c9a751 */}
          <div className="hidden sm:flex items-center gap-1 bg-slate-100/90 p-1 rounded-xl border border-slate-200 text-xs font-medium">
            <button
              onClick={() => setCurrentTab('proyecciones')}
              className={`px-3 py-1.5 rounded-lg transition-all ${currentTab === 'proyecciones'
                ? 'bg-[#c9a751] text-slate-900 shadow-xs ring-1 ring-[#c9a751]/50 font-semibold'
                : 'text-slate-600 hover:text-slate-900'
                }`}
            >
              Proyecciones
            </button>
            <button
              onClick={() => setCurrentTab('dgfm')}
              className={`px-3 py-1.5 rounded-lg transition-all ${currentTab === 'dgfm'
                ? 'bg-[#c9a751] text-slate-900 shadow-xs ring-1 ring-[#c9a751]/50 font-semibold'
                : 'text-slate-600 hover:text-slate-900'
                }`}
            >
              DGFM
            </button>
            <button
              onClick={() => setCurrentTab('ine')}
              className={`px-3 py-1.5 rounded-lg transition-all ${currentTab === 'ine'
                ? 'bg-[#c9a751] text-slate-900 shadow-xs ring-1 ring-[#c9a751]/50 font-semibold'
                : 'text-slate-600 hover:text-slate-900'
                }`}
            >
              INE
            </button>
            <button
              onClick={() => setCurrentTab('sie')}
              className={`px-3 py-1.5 rounded-lg transition-all ${currentTab === 'sie'
                ? 'bg-[#c9a751] text-slate-900 shadow-xs ring-1 ring-[#c9a751]/50 font-semibold'
                : 'text-slate-600 hover:text-slate-900'
                }`}
            >
              SIE
            </button>
            <button
              onClick={() => setCurrentTab('seie')}
              className={`px-3 py-1.5 rounded-lg transition-all ${currentTab === 'seie'
                ? 'bg-[#c9a751] text-slate-900 shadow-xs ring-1 ring-[#c9a751]/50 font-semibold'
                : 'text-slate-600 hover:text-slate-900'
                }`}
            >
              SEIE
            </button>
            <button
              onClick={() => setCurrentTab('uie')}
              className={`px-3 py-1.5 rounded-lg transition-all ${currentTab === 'uie'
                ? 'bg-[#c9a751] text-slate-900 shadow-xs ring-1 ring-[#c9a751]/50 font-semibold'
                : 'text-slate-600 hover:text-slate-900'
                }`}
            >
              UIE / SIE UE
            </button>
            <button
              onClick={() => setCurrentTab('historial')}
              className={`px-3 py-1.5 rounded-lg transition-all ${currentTab === 'historial'
                ? 'bg-[#c9a751] text-slate-900 shadow-xs ring-1 ring-[#c9a751]/50 font-semibold'
                : 'text-slate-600 hover:text-slate-900'
                }`}
            >
              Historial
            </button>
            <button
              onClick={() => setCurrentTab('exposicion')}
              className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${currentTab === 'exposicion'
                ? 'bg-[#c9a751] text-slate-900 shadow-xs ring-1 ring-[#c9a751]/50 font-bold'
                : 'text-amber-800 hover:text-slate-900 bg-amber-500/10'
                }`}
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-700" />
              Exposición 2031
            </button>
            <button
              onClick={() => setCurrentTab('pertinencia')}
              className={`px-3 py-1.5 rounded-lg transition-all ${currentTab === 'pertinencia'
                ? 'bg-[#c9a751] text-slate-900 shadow-xs ring-1 ring-[#c9a751]/50 font-semibold'
                : 'text-slate-600 hover:text-slate-900'
                }`}
            >
              Pertinencia
            </button>
          </div>
        </header>

        {/* Cuerpo de la vista seleccionada */}
        <main className="flex-1 p-4 sm:p-8 max-w-7xl w-full mx-auto">
          {currentTab === 'proyecciones' && <ProyeccionesView data={initialData} />}
          {currentTab === 'dgfm' && <DgfmView data={initialData} />}
          {currentTab === 'ine' && <IneView data={initialData} />}
          {currentTab === 'sie' && <SieView data={initialData} />}
          {currentTab === 'seie' && <SeieView data={initialData} />}
          {currentTab === 'uie' && <UieDeficitView data={initialData} />}
          {currentTab === 'historial' && <HistorialDocenteView />}
          {currentTab === 'exposicion' && <Exposicion2031View data={initialData} />}

          {currentTab === ('Resumen' as SourceTab) && <ResumenView />}

          {currentTab === 'pertinencia' && <PertinenciaView />}

        </main>
      </div>
    </div>
  );
}
