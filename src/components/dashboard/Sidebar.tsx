'use client';

import React from 'react';
import Image from 'next/image';
import { SourceTab } from '@/types/stats';
import {
  BuildingIcon,
  GraduationCapIcon,
  ChartBarIcon,
  SchoolIcon,
  AccessibilityIcon,
  LayersIcon,
  TrendingUpIcon,
  ScaleIcon,
} from '../ui/Icons';

interface SidebarProps {
  currentTab: SourceTab;
  onSelectTab: (tab: SourceTab) => void;
  counts: {
    dgfm: number;
    ine: number;
    sie: number;
    seie: number;
    uie?: number;
    total: number;
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
      id: 'proyecciones' as SourceTab,
      label: 'Proyecciones',
      sublabel: 'Matrícula por Curso',
      badge: '2026-2031',
      badgeColor: 'bg-[#faf5e8] text-[#c9a751] border-[#e5d5a6]',
      count: counts.ine,
      tables: 'INE Edades & SIE Cursos',
      icon: <TrendingUpIcon size={18} className="text-[#c9a751]" />,
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
    {
      id: 'uie' as SourceTab,
      label: 'UIE',
      sublabel: 'Déficit Docente y Horas',
      badge: 'DÉFICIT',
      badgeColor: 'bg-rose-50 text-rose-700 border-rose-200',
      count: counts.uie ?? 17274,
      tables: 'Carga Horaria vs Planilla',
      icon: <ScaleIcon size={18} className="text-rose-700" />,
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
      {/* Overlay para móviles */}
      {isOpen && (
        <div
          onClick={onClose}
          className="fixed inset-0 bg-slate-900/30 backdrop-blur-xs z-40 lg:hidden"
        />
      )}

      {/* Sidebar contenedor colapsable */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 w-72 bg-white border-r border-slate-200/90 shadow-xs flex flex-col transition-transform duration-300 ease-in-out ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Cabecera Institucional del Estado Plurinacional */}
        <div className="p-4 border-b border-slate-200 bg-white">
          <div className="flex items-center justify-between gap-3">
            <div className="flex flex-col">
              <Image
                src="/minedu_2025.png"
                alt="Ministerio de Educación"
                width={160}
                height={67}
                className="h-10 w-auto object-contain"
                priority
              />
              <span className="text-[10px] font-medium text-[#c9a751] uppercase tracking-wider mt-1.5 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-[#c9a751]" />
                SIIE · Admisión ESFM
              </span>
            </div>
            <button
              onClick={onClose}
              title="Ocultar menú lateral"
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
              aria-label="Ocultar menú lateral"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
              </svg>
            </button>
          </div>
        </div>

        {/* Lista de Navegación por Fuentes Institucionales */}
        <div className="flex-1 overflow-y-auto p-3 space-y-1.5">
          <div className="px-2 py-1 text-[10px] font-medium uppercase tracking-wider text-slate-400">
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
                    <span className="font-medium text-sm truncate text-slate-900">
                      {item.label}
                    </span>
                    <span
                      className={`text-[9px] font-medium px-1.5 py-0.5 rounded border uppercase ${item.badgeColor}`}
                    >
                      {item.badge}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 truncate font-medium mt-0.5">
                    {item.sublabel}
                  </p>
                  <div className="mt-1.5 flex items-center justify-between text-[10px] text-slate-400">
                    <span className="truncate max-w-[120px]">{item.tables}</span>
                    <span className="font-semibold text-slate-600">
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
            <div className="flex items-center justify-between font-medium text-slate-800 text-[11px]">
              <span>Base Central Supabase</span>
              <span className="inline-flex items-center gap-1 text-[9px] text-emerald-800 font-medium bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                ● En Línea
              </span>
            </div>
            <p className="text-[10px] text-slate-500 font-medium">
              Datos auditados: <strong className="text-slate-800">{counts.total.toLocaleString('es-BO')}</strong> registros
            </p>
          </div>
        </div>
      </aside>
    </>
  );
}
