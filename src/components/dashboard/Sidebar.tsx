'use client';

import React from 'react';
import { SourceTab } from '@/types/stats';
import {
  LayoutDashboard,
  Compass,
  MapPin,
  Scale,
  X,
  TrendingUp,
  ChevronRight,
  ShieldCheck,
  Sparkles,
  GraduationCap,
  BarChart3,
} from 'lucide-react';
import Image from 'next/image';

interface SidebarProps {
  currentTab: SourceTab;
  onSelectTab: (tab: SourceTab) => void;
  counts: {
    dgfm?: number;
    ine?: number;
    sie?: number;
    seie?: number;
    uie?: number;
    total?: number;
  };
  isOpen: boolean;
  onClose: () => void;
}

export function Sidebar({
  currentTab,
  onSelectTab,
  counts,
  isOpen,
  onClose,
}: SidebarProps) {
  const menuItems = [
    {
      id: 'dashboard' as SourceTab,
      number: '01',
      label: 'Dashboard Ejecutivo',
      sublabel: 'Diagnóstico Estratégico SEP',
      badge: 'MANDO',
      badgeColor: 'bg-emerald-50 text-emerald-800 border-emerald-200',
      activeColor: 'from-emerald-600 to-teal-700',
      icon: <LayoutDashboard size={19} />,
      metric: 'Visión General',
    },
    {
      id: 'uie' as SourceTab,
      number: '02',
      label: 'UIE / SIE UE',
      sublabel: 'Déficit de Carga Horaria',
      badge: 'DÉFICIT',
      badgeColor: 'bg-rose-50 text-rose-800 border-rose-200',
      activeColor: 'from-rose-600 to-rose-700',
      icon: <Scale size={19} />,
      metric: `${(counts.uie ?? 16273).toLocaleString('es-BO')} UEs`,
    },
    {
      id: 'mapa' as SourceTab,
      number: '03',
      label: 'Cartografía Oficial',
      sublabel: 'Georreferenciación Leaflet',
      badge: '16.2K UEs',
      badgeColor: 'bg-blue-50 text-blue-800 border-blue-200',
      activeColor: 'from-blue-600 to-indigo-700',
      icon: <MapPin size={19} />,
      metric: 'Filtros Dinámicos',
    },
    {
      id: 'balance' as SourceTab,
      number: '04',
      label: 'Balance Predictivo',
      sublabel: 'Admisión ESFM 2031',
      badge: 'DECISIÓN',
      badgeColor: 'bg-purple-50 text-purple-800 border-purple-200',
      activeColor: 'from-purple-600 to-indigo-800',
      icon: <TrendingUp size={19} />,
      metric: 'Demanda Multicriterio',
    },
    {
      id: 'inscritos' as SourceTab,
      number: '05',
      label: 'Matrícula ESFM',
      sublabel: 'Inscritos por Año y Especialidad',
      badge: '2022-2026',
      badgeColor: 'bg-[#faf5e8] text-[#937527] border-[#e5d4a4]',
      activeColor: 'from-[#0f2942] to-[#c9a751]',
      icon: <GraduationCap size={19} />,
      metric: '46 ESFMs · 22 Esp.',
    },
    {
      id: 'resumen_depto' as SourceTab,
      number: '06',
      label: 'Resumen Departamental',
      sublabel: 'Jubilación, Prejub. y ARIMA',
      badge: '9 DEPTOS',
      badgeColor: 'bg-indigo-50 text-indigo-800 border-indigo-200',
      activeColor: 'from-indigo-700 to-slate-900',
      icon: <BarChart3 size={19} />,
      metric: '2027–2031 Anual',
    },
  ];

  const handleSelect = (tab: SourceTab) => {
    onSelectTab(tab);
    if (typeof window !== 'undefined' && window.innerWidth < 1024) {
      onClose();
    }
  };

  return (
    <>
      {/* Backdrop con desenfoque suave para pantallas táctiles y móviles */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-40 lg:hidden transition-opacity"
          onClick={onClose}
        />
      )}

      {/* Sidebar contenedor con ancho óptimo */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 w-80 bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-100 flex flex-col shadow-2xl lg:shadow-xl border-r border-slate-200 dark:border-slate-800/80 transition-all duration-300 ease-out select-none ${isOpen ? 'translate-x-0' : '-translate-x-full'
          }`}
      >
        {/* Cabecera Institucional con diseño sobrio */}
        <div className="p-5 border-b border-slate-200 dark:border-slate-800/80 bg-linear-to-b from-slate-50 to-white dark:from-slate-900 dark:to-slate-950 relative">
          {/* Acento tricolor sutil en la parte superior */}
          <div className="absolute top-0 left-0 right-0 h-1 bg-linear-to-r from-red-500 via-amber-400 to-emerald-500" />

          <div className="flex items-center justify-between pt-1">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-slate-100 dark:bg-white/10 p-1.5 flex items-center justify-center border border-slate-200 dark:border-white/15 shadow-2xs">
                <Image
                  src="/minedu_2025.png"
                  alt="MINEDU"
                  width={38}
                  height={38}
                  className="h-7 w-auto object-contain drop-shadow-xs"
                />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] font-black uppercase tracking-widest text-[#937527] dark:text-[#c9a751]">
                    MINISTERIO DE EDUCACIÓN
                  </span>
                </div>
                <h1 className="font-black text-sm text-slate-900 dark:text-white tracking-tight leading-tight">
                  DGFM · SEP Bolivia
                </h1>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">
                  Inteligencia de Datos y Cartografía
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="lg:hidden p-2 rounded-xl text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/10 transition-colors cursor-pointer"
              aria-label="Cerrar menú"
            >
              <X size={18} />
            </button>
          </div>

          {/* Badge de estado del sistema */}
          <div className="mt-4 pt-3 border-t border-slate-200 dark:border-slate-800/60 flex items-center justify-between text-[11px]">
            <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-400">
              <span className="w-2 h-2 rounded-full bg-emerald-500 dark:bg-emerald-400 animate-pulse" />
              <span className="font-medium">Gestión Oficial</span>
            </div>
            <span className="font-black text-amber-800 dark:text-amber-400 bg-amber-100/70 dark:bg-amber-400/10 px-2 py-0.5 rounded-md border border-amber-300 dark:border-amber-400/20">
              5 Módulos Estratégicos
            </span>
          </div>
        </div>

        {/* Lista de Navegación con Tarjetas Mejoradas */}
        <div className="flex-1 overflow-y-auto p-3.5 space-y-2 custom-scrollbar">
          <div className="px-2 py-1 flex items-center justify-between text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500">
            <span>Módulos del Sistema</span>
            <Sparkles className="w-3 h-3 text-[#937527] dark:text-[#c9a751]" />
          </div>

          {menuItems.map((item) => {
            const isActive = currentTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => handleSelect(item.id)}
                className={`w-full text-left p-3 rounded-2xl transition-all flex items-center justify-between gap-3 group relative cursor-pointer border ${isActive
                  ? 'bg-linear-to-r from-amber-500/10 via-amber-500/5 to-transparent dark:from-slate-900 dark:to-slate-800 border-[#c9a751] shadow-md text-slate-900 dark:text-white ring-1 ring-[#c9a751]/50'
                  : 'bg-slate-50/70 hover:bg-slate-100/90 dark:bg-slate-900/40 dark:hover:bg-slate-900/90 border-slate-200/80 hover:border-slate-300 dark:border-slate-800/70 dark:hover:border-slate-700 text-slate-700 dark:text-slate-300'
                  }`}
              >
                {/* Indicador de barra vertical activa en el borde izquierdo */}
                {isActive && (
                  <div className="absolute left-0 top-3 bottom-3 w-1.5 rounded-r-full bg-[#c9a751] shadow-xs shadow-[#c9a751]/50" />
                )}

                <div className="flex items-center gap-3 min-w-0 pl-1">
                  {/* Contenedor del ícono con color distintivo */}
                  <div
                    className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-all ${isActive
                      ? 'bg-[#c9a751] text-slate-950 shadow-md shadow-[#c9a751]/30 font-black'
                      : 'bg-white dark:bg-slate-800/80 text-slate-600 dark:text-slate-400 group-hover:text-slate-900 dark:group-hover:text-slate-100 group-hover:bg-slate-100 dark:group-hover:bg-slate-800 border border-slate-200 dark:border-slate-700/60 shadow-2xs'
                      }`}
                  >
                    {item.icon}
                  </div>

                  {/* Textos y metadata */}
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-mono font-bold text-slate-400 dark:text-slate-500">
                        {item.number}
                      </span>
                      <span className="text-xs font-black truncate text-slate-900 dark:text-white">
                        {item.label}
                      </span>
                    </div>
                    <div className="text-[10px] truncate text-slate-500 dark:text-slate-400 font-medium mt-0.5">
                      {item.sublabel}
                    </div>
                    <div className="text-[9px] text-[#937527] dark:text-[#c9a751] font-semibold mt-0.5">
                      {item.metric}
                    </div>
                  </div>
                </div>

                {/* Badge lateral y flecha */}
                <div className="flex flex-col items-end gap-1 shrink-0">
                  <span
                    className={`text-[9px] font-black px-2 py-0.5 rounded-md border shrink-0 uppercase tracking-wider ${isActive
                      ? 'bg-[#c9a751]/15 text-[#85681c] border-[#c9a751]/30 dark:bg-[#c9a751]/20 dark:text-[#f3d484] dark:border-[#c9a751]/40'
                      : 'bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700'
                      }`}
                  >
                    {item.badge}
                  </span>
                  <ChevronRight
                    className={`w-3.5 h-3.5 transition-transform ${isActive
                      ? 'text-[#c9a751] translate-x-0.5'
                      : 'text-slate-400 group-hover:text-slate-600 dark:text-slate-600 dark:group-hover:text-slate-400'
                      }`}
                  />
                </div>
              </button>
            );
          })}
        </div>

        {/* Footer Institucional del Sidebar */}
        <div className="p-4 border-t border-slate-200 dark:border-slate-800/80 bg-slate-50/90 dark:bg-slate-950/90 text-slate-500 dark:text-slate-400 text-[10px] space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 font-bold text-slate-700 dark:text-slate-300">
              <ShieldCheck className="w-4 h-4 text-emerald-500 dark:text-emerald-400 shrink-0" />
              <span>Padrón Oficial Verificado</span>
            </div>
            <span className="text-slate-600 dark:text-slate-400 font-mono text-[9px] font-bold bg-white dark:bg-slate-900 px-1.5 py-0.5 rounded border border-slate-200 dark:border-slate-800 shadow-2xs">
              v2.6 PRO
            </span>
          </div>

          <div className="grid grid-cols-2 gap-1.5 pt-1 text-[9px] text-slate-500 dark:text-slate-400 border-t border-slate-200 dark:border-slate-900">
            <div className="bg-white dark:bg-slate-900/60 p-1.5 rounded-lg border border-slate-200 dark:border-slate-800/60 shadow-2xs">
              <span className="block text-slate-400 dark:text-slate-500 font-medium">Establecimientos:</span>
              <strong className="text-slate-800 dark:text-white font-mono font-bold">16.204 UEs</strong>
            </div>
            <div className="bg-white dark:bg-slate-900/60 p-1.5 rounded-lg border border-slate-200 dark:border-slate-800/60 shadow-2xs">
              <span className="block text-slate-400 dark:text-slate-500 font-medium">Docentes Evaluados:</span>
              <strong className="text-slate-800 dark:text-white font-mono font-bold">168.758 Doc.</strong>
            </div>
          </div>

          <p className="text-[9px] text-slate-400 dark:text-slate-500 text-center pt-1 font-medium leading-tight">
            Dirección General de Formación de Maestros · Bolivia
          </p>
        </div>
      </aside>
    </>
  );
}
export default Sidebar;
