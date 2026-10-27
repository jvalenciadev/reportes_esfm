'use client';

import React from 'react';
import { SourceTab } from '@/types/stats';
import {
  BuildingIcon,
  GraduationCapIcon,
  ChartBarIcon,
  SchoolIcon,
  AccessibilityIcon,
  LayersIcon,
  BoliviaCoatIcon,
} from '../ui/Icons';

interface SidebarProps {
  currentTab: SourceTab;
  onSelectTab: (tab: SourceTab) => void;
  counts: {
    dgfm: number;
    ine: number;
    sie: number;
    seie: number;
    total: number;
  };
  isOpenMobile: boolean;
  onCloseMobile: () => void;
}

export function Sidebar({
  currentTab,
  onSelectTab,
  counts,
  isOpenMobile,
  onCloseMobile,
}: SidebarProps) {
  const menuItems = [
    {
      id: 'overview' as SourceTab,
      label: 'Visión General',
      sublabel: 'Consolidado Integrado',
      badge: 'SIIE',
      badgeColor: 'bg-slate-100 text-slate-700 border-slate-200',
      count: counts.total,
      tables: '10 tablas estadísticas',
      icon: <LayersIcon size={18} className="text-slate-700" />,
    },
    {
      id: 'dgfm' as SourceTab,
      label: 'DGFM',
      sublabel: 'Formación de Maestros',
      badge: 'ESFM',
      badgeColor: 'bg-blue-50 text-blue-700 border-blue-200',
      count: counts.dgfm,
      tables: 'Postulantes, ESFM, Esp.',
      icon: <GraduationCapIcon size={18} className="text-blue-700" />,
    },
    {
      id: 'ine' as SourceTab,
      label: 'INE',
      sublabel: 'Estadística Nacional',
      badge: 'CENSOS',
      badgeColor: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      count: counts.ine,
      tables: 'Matrícula, Población, Edades',
      icon: <ChartBarIcon size={18} className="text-emerald-700" />,
    },
    {
      id: 'sie' as SourceTab,
      label: 'SIE',
      sublabel: 'Información Educativa',
      badge: 'REGULAR',
      badgeColor: 'bg-amber-50 text-amber-700 border-amber-200',
      count: counts.sie,
      tables: 'Estudiantes 2026, Rural/Urb.',
      icon: <SchoolIcon size={18} className="text-amber-700" />,
    },
    {
      id: 'seie' as SourceTab,
      label: 'SEIE',
      sublabel: 'Educación Especial',
      badge: 'INCLUSIÓN',
      badgeColor: 'bg-purple-50 text-purple-700 border-purple-200',
      count: counts.seie,
      tables: 'Discapacidad Urbana/Rural',
      icon: <AccessibilityIcon size={18} className="text-purple-700" />,
    },
  ];

  const handleSelect = (tab: SourceTab) => {
    onSelectTab(tab);
    onCloseMobile();
  };

  return (
    <>
      {/* Overlay para móviles */}
      {isOpenMobile && (
        <div
          onClick={onCloseMobile}
          className="fixed inset-0 bg-slate-900/30 backdrop-blur-xs z-40 lg:hidden"
        />
      )}

      {/* Sidebar contenedor */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 w-72 bg-white border-r border-slate-200 shadow-xs flex flex-col transition-transform duration-300 ease-in-out lg:translate-x-0 ${
          isOpenMobile ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Cabecera Institucional del Estado Plurinacional */}
        <div className="p-4 border-b border-slate-200 bg-slate-50/70">
          <div className="flex items-center gap-3">
            <BoliviaCoatIcon size={32} className="shrink-0 drop-shadow-2xs" />
            <div className="min-w-0">
              <span className="text-[9px] font-black uppercase tracking-widest text-slate-500 block leading-tight font-heraldic">
                Estado Plurinacional de Bolivia
              </span>
              <h2 className="text-xs font-black text-slate-900 leading-tight uppercase truncate font-heraldic tracking-wide">
                Ministerio de Educación
              </h2>
              <span className="text-[9px] font-extrabold text-[#7d6325] uppercase tracking-wider block font-mono">
                SIIE · Admisión ESFM
              </span>
            </div>
            <button
              onClick={onCloseMobile}
              className="lg:hidden ml-auto p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Lista de Navegación por Fuentes Institucionales */}
        <div className="flex-1 overflow-y-auto p-3 space-y-1.5">
          <div className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
            Sistemas y Fuentes Oficiales
          </div>

          {menuItems.map((item) => {
            const isActive = currentTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => handleSelect(item.id)}
                className={`w-full text-left p-3 rounded-xl border transition-all flex items-start gap-3 ${
                  isActive
                    ? 'bg-blue-50/90 border-blue-300 text-blue-950 shadow-xs ring-1 ring-blue-500/10'
                    : 'bg-white border-transparent text-slate-700 hover:bg-slate-50 hover:border-slate-200'
                }`}
              >
                <div
                  className={`p-2 rounded-lg shrink-0 mt-0.5 border ${
                    isActive ? 'bg-white border-blue-200 shadow-2xs' : 'bg-slate-50 border-slate-200/60'
                  }`}
                >
                  {item.icon}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-1">
                    <span className="font-extrabold text-sm truncate text-slate-900">
                      {item.label}
                    </span>
                    <span
                      className={`text-[9px] font-extrabold px-1.5 py-0.5 rounded border uppercase ${item.badgeColor}`}
                    >
                      {item.badge}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 truncate font-medium mt-0.5">
                    {item.sublabel}
                  </p>
                  <div className="mt-1.5 flex items-center justify-between text-[10px] text-slate-400">
                    <span className="truncate max-w-[120px]">{item.tables}</span>
                    <span className="font-mono font-semibold text-slate-600">
                      {item.count.toLocaleString('es-BO')} reg.
                    </span>
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        {/* Pie de Sidebar Institucional */}
        <div className="p-3.5 border-t border-slate-200 bg-slate-50/60">
          <div className="rounded-xl bg-white p-3 border border-slate-200/90 text-xs text-slate-600 space-y-1 shadow-2xs">
            <div className="flex items-center justify-between font-bold text-slate-800 text-[11px]">
              <span>Base Central Supabase</span>
              <span className="inline-flex items-center gap-1 text-[9px] text-emerald-800 font-bold bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                ● En Línea
              </span>
            </div>
            <p className="text-[10px] text-slate-500 font-medium">
              Datos auditados: <strong className="text-slate-800 font-mono">{counts.total.toLocaleString('es-BO')}</strong> registros
            </p>
          </div>
        </div>
      </aside>
    </>
  );
}
