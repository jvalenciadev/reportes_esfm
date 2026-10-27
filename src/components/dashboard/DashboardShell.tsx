'use client';

import React, { useState, useMemo } from 'react';
import { DashboardDataset, SourceTab } from '@/types/stats';
import { Sidebar } from './Sidebar';
import { OverviewView } from './views/OverviewView';
import { DgfmView } from './views/DgfmView';
import { IneView } from './views/IneView';
import { SieView } from './views/SieView';
import { SeieView } from './views/SeieView';
import { BoliviaCoatIcon } from '../ui/Icons';

interface DashboardShellProps {
  initialData: DashboardDataset;
}

export function DashboardShell({ initialData }: DashboardShellProps) {
  const [currentTab, setCurrentTab] = useState<SourceTab>('overview');
  const [isMobileOpen, setIsMobileOpen] = useState(false);

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
    const total = dgfm + ine + sie + seie + initialData.departamentos.length;
    return { dgfm, ine, sie, seie, total };
  }, [initialData]);

  const titles: Record<SourceTab, { title: string; subtitle: string; tag: string }> = {
    overview: {
      title: 'Panel General Integrado',
      subtitle: 'Consolidación de las 4 fuentes estadísticas oficiales de Bolivia',
      tag: 'CONSOLIDADO INTEGRADO',
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
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex">
      {/* Sidebar fijo institucional */}
      <Sidebar
        currentTab={currentTab}
        onSelectTab={setCurrentTab}
        counts={counts}
        isOpenMobile={isMobileOpen}
        onCloseMobile={() => setIsMobileOpen(false)}
      />

      {/* Contenido principal */}
      <div className="flex-1 lg:pl-72 flex flex-col min-w-0">
        {/* Barra Superior Institucional con acento #c9a751 */}
        <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-xs border-b border-slate-200/90 px-4 sm:px-8 py-3 flex items-center justify-between gap-4 shadow-2xs">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsMobileOpen(true)}
              className="lg:hidden p-2 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-600"
              aria-label="Abrir menú lateral"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>

            <div className="flex items-center gap-2">
              <span className="hidden sm:inline-block">
                <BoliviaCoatIcon size={20} />
              </span>
              <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded bg-[#faf5e8] text-[#7d6325] border border-[#e5d5a6] tracking-wider">
                {titles[currentTab].tag}
              </span>
              <span className="text-xs font-semibold text-slate-300">/</span>
              <span className="text-xs font-bold text-slate-800 truncate max-w-xs sm:max-w-md">
                {titles[currentTab].title}
              </span>
            </div>
          </div>

          {/* Selector de pestañas rápido con color principal #c9a751 */}
          <div className="hidden sm:flex items-center gap-1 bg-slate-100/90 p-1 rounded-xl border border-slate-200 text-xs font-bold">
            <button
              onClick={() => setCurrentTab('overview')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                currentTab === 'overview'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              General
            </button>
            <button
              onClick={() => setCurrentTab('dgfm')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                currentTab === 'dgfm'
                  ? 'bg-[#c9a751] text-slate-900 shadow-xs ring-1 ring-[#c9a751]/50'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              DGFM
            </button>
            <button
              onClick={() => setCurrentTab('ine')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                currentTab === 'ine'
                  ? 'bg-[#c9a751] text-slate-900 shadow-xs ring-1 ring-[#c9a751]/50'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              INE
            </button>
            <button
              onClick={() => setCurrentTab('sie')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                currentTab === 'sie'
                  ? 'bg-[#c9a751] text-slate-900 shadow-xs ring-1 ring-[#c9a751]/50'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              SIE
            </button>
            <button
              onClick={() => setCurrentTab('seie')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                currentTab === 'seie'
                  ? 'bg-[#c9a751] text-slate-900 shadow-xs ring-1 ring-[#c9a751]/50'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              SEIE
            </button>
          </div>
        </header>

        {/* Cuerpo de la vista seleccionada */}
        <main className="flex-1 p-4 sm:p-8 max-w-7xl w-full mx-auto">
          {currentTab === 'overview' && (
            <OverviewView
              data={initialData}
              onNavigate={(tab) => setCurrentTab(tab)}
            />
          )}
          {currentTab === 'dgfm' && <DgfmView data={initialData} />}
          {currentTab === 'ine' && <IneView data={initialData} />}
          {currentTab === 'sie' && <SieView data={initialData} />}
          {currentTab === 'seie' && <SeieView data={initialData} />}
        </main>
      </div>
    </div>
  );
}
