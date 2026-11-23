'use client';

import React, { useState, useMemo } from 'react';
import { DashboardDataset, SourceTab } from '@/types/stats';
import { Sidebar } from './Sidebar';
import { UieDeficitView } from './views/UieDeficitView';
import PertinenciaView from './views/PertinenciaView';
import { BalancePredictivoView } from './views/BalancePredictivoView';
import MapaUeView from './views/MapaUeView';
import Image from 'next/image';
import { ShieldCheck, Menu, Sun, Moon } from 'lucide-react';
import { ExecutiveDashboardView } from './views/ExecutiveDashboardView';
import { useTheme } from '@/context/ThemeContext';

interface DashboardShellProps {
  initialData: DashboardDataset;
}

export function DashboardShell({ initialData }: DashboardShellProps) {
  const [currentTab, setCurrentTab] = useState<SourceTab>('dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const { theme, toggleTheme } = useTheme();

  // Conteos consolidados
  const counts = useMemo(() => {
    const uie = 17274;
    const total = 168758 + uie;
    return { uie, total };
  }, []);

  const titles: Record<SourceTab, { title: string; subtitle: string; tag: string }> = {
    dashboard: {
      title: 'Panel Ejecutivo de Mando',
      subtitle: 'Diagnóstico Integral del SEP, Cobertura Educativa y Proyecciones Docentes al 2031',
      tag: 'PANEL GENERAL',
    },
    uie: {
      title: 'UIE · Déficit de Carga Horaria',
      subtitle: 'Balance de horas aula trabajadas vs planilla fiscal y requerimiento de ítems',
      tag: 'DÉFICIT HORARIO',
    },
    pertinencia: {
      title: 'Pertinencia Curricular Docente',
      subtitle: 'Padrón oficial de 168.758 docentes: evaluación de especialidad de egreso y prejubilación',
      tag: 'PERTINENCIA SEP',
    },
    mapa: {
      title: 'Cartografía Oficial de Unidades Educativas',
      subtitle: '16.204 establecimientos georreferenciados con capas de pertinencia, prejubilación y jubilación',
      tag: 'GEO-PORTAL',
    },
    balance: {
      title: 'Balance Predictivo de Admisión ESFM 2031',
      subtitle: 'Matriz multicriterio de oferta docente, egresados en formación y proyecciones de aula',
      tag: 'DECISIÓN ESFM',
    },
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 flex transition-colors duration-200">
      {/* Sidebar mejorado colapsable */}
      <Sidebar
        currentTab={currentTab}
        onSelectTab={setCurrentTab}
        counts={counts}
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
      />

      {/* Contenido principal con transición fluida de ancho */}
      <div
        className={`flex-1 flex flex-col min-w-0 transition-[padding] duration-300 ease-in-out ${
          isSidebarOpen ? 'lg:pl-80' : 'lg:pl-0'
        }`}
      >
        {/* Barra Superior Institucional Minimalista con Modo Oscuro/Claro */}
        <header className="sticky top-0 z-30 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200/90 dark:border-slate-800 px-4 sm:px-6 py-2.5 flex items-center justify-between gap-4 shadow-2xs transition-colors duration-200">
          {/* Lado izquierdo: Botón Menú + Identidad Institucional + Módulo actual */}
          <div className="flex items-center gap-3 min-w-0">
            <button
              onClick={() => setIsSidebarOpen((prev) => !prev)}
              className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 transition-colors flex items-center gap-1.5 cursor-pointer shadow-2xs"
              aria-label={isSidebarOpen ? 'Ocultar menú lateral' : 'Mostrar menú lateral'}
              title={isSidebarOpen ? 'Ocultar menú lateral' : 'Mostrar menú lateral'}
            >
              <Menu className="w-4 h-4" />
              {!isSidebarOpen && (
                <span className="hidden md:inline-block text-xs font-bold text-slate-700 dark:text-slate-200">Módulos</span>
              )}
            </button>

            <div className="flex items-center gap-2.5 min-w-0">
              <Image
                src="/minedu_2025.png"
                alt="MINEDU"
                width={72}
                height={28}
                className="hidden sm:inline-block h-6 w-auto object-contain shrink-0 drop-shadow-xs"
              />
              <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-md bg-[#c9a751]/15 dark:bg-[#c9a751]/25 text-[#937527] dark:text-[#f1d07c] border border-[#c9a751]/40 tracking-wider shrink-0">
                {titles[currentTab]?.tag || 'SEP'}
              </span>
              <span className="text-slate-300 dark:text-slate-700 hidden sm:inline">/</span>
              <div className="min-w-0">
                <h1 className="text-xs sm:text-sm font-black text-slate-900 dark:text-white truncate">
                  {titles[currentTab]?.title || 'Sistema'}
                </h1>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium truncate hidden md:block">
                  {titles[currentTab]?.subtitle}
                </p>
              </div>
            </div>
          </div>

          {/* Lado derecho: Selector Modo Oscuro/Claro + Estado oficial */}
          <div className="flex items-center gap-2 shrink-0">
            {/* Botón Switch Modo Oscuro / Modo Claro */}
            <button
              type="button"
              onClick={toggleTheme}
              className="p-2 sm:px-3 sm:py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-100/90 dark:bg-slate-800/90 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition-all cursor-pointer flex items-center gap-1.5 shadow-2xs"
              title={theme === 'dark' ? 'Cambiar a Modo Claro' : 'Cambiar a Modo Oscuro'}
              aria-label="Alternar tema visual"
            >
              {theme === 'dark' ? (
                <>
                  <Sun className="w-4 h-4 text-amber-400" />
                  <span className="hidden sm:inline text-xs font-bold text-slate-200">Claro</span>
                </>
              ) : (
                <>
                  <Moon className="w-4 h-4 text-slate-700" />
                  <span className="hidden sm:inline text-xs font-bold text-slate-700">Oscuro</span>
                </>
              )}
            </button>

            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-100/90 dark:bg-slate-800/90 border border-slate-200/80 dark:border-slate-700 text-[11px] font-bold text-slate-700 dark:text-slate-300">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>Padrón SEP Activo</span>
            </div>

            <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-[#faf5e8] dark:bg-amber-950/40 border border-[#e5d4a4] dark:border-amber-800/60 text-[11px] font-black text-[#937527] dark:text-amber-400">
              <ShieldCheck className="w-3.5 h-3.5 text-[#c9a751]" />
              <span className="hidden xs:inline">DGFM 2026</span>
            </div>
          </div>
        </header>

        {/* Cuerpo de la vista seleccionada */}
        <main
          className={`flex-1 w-full ${
            currentTab === 'mapa'
              ? 'p-0 h-[calc(100vh-53px)] overflow-hidden max-w-none'
              : 'p-3 sm:p-6 lg:p-8 max-w-[1850px] mx-auto'
          }`}
        >
          {currentTab === 'dashboard' && <ExecutiveDashboardView data={initialData} />}
          {currentTab === 'uie' && <UieDeficitView data={initialData} />}
          {currentTab === 'pertinencia' && <PertinenciaView />}
          {currentTab === 'mapa' && <MapaUeView />}
          {currentTab === 'balance' && <BalancePredictivoView />}
        </main>
      </div>
    </div>
  );
}
export default DashboardShell;
