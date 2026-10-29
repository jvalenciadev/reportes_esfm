'use client';

import React, { useState, useMemo } from 'react';
import { DashboardDataset, InscritoEsfm } from '@/types/stats';
import { StatCard } from '../StatCard';
import { TrendLineChart, TrendSeries } from '../TrendLineChart';
import { BarVisual } from '../BarVisual';
import { PieChart, PieSlice } from '../PieChart';
import { YearProgression } from '../YearProgression';
import { DataTable, ColumnDef } from '../DataTable';
import { SourceBadge } from '../SourceBadge';
import {
  GraduationCapIcon,
  BuildingIcon,
  ChartPieIcon,
  ChartBarIcon,
  CalendarIcon,
  TrendingUpIcon,
  MapPinIcon,
  LayersIcon,
  SearchIcon,
  XIcon,
  ScaleIcon,
  GridIcon,
  SchoolIcon,
  FilterIcon,
} from '../../ui/Icons';

interface DgfmViewProps {
  data: DashboardDataset;
}

// Mapa de colores institucionales estables por departamento para visualizaciones comparativas
const DEPT_COLORS: Record<string, string> = {
  'La Paz': '#c9a751',
  'Santa Cruz': '#059669',
  'Cochabamba': '#2563EB',
  'Potosí': '#dc2626',
  'Chuquisaca': '#7c3aed',
  'Oruro': '#d97706',
  'Tarija': '#0d9488',
  'Beni': '#475569',
  'Pando': '#e11d48',
};

export function DgfmView({ data }: DgfmViewProps) {
  // Pestaña principal activa
  const [activeTab, setActiveTab] = useState<'especialidades' | 'apertura' | 'esfm' | 'tablas'>('especialidades');

  // Subpestaña para la sección de tablas
  const [activeSubTab, setActiveSubTab] = useState<'inscritos' | 'esfm' | 'especialidades'>('inscritos');

  // Gestiones únicas ordenadas cronológicamente
  const gestiones = useMemo(() => {
    const set = new Set<number>();
    data.inscritos_esfm.forEach((r) => set.add(r.gestion));
    return Array.from(set).sort((a, b) => a - b);
  }, [data.inscritos_esfm]);

  const latestGestion = gestiones[gestiones.length - 1] || 2026;

  // Lista única de departamentos ordenados
  const departamentosList = useMemo(() => {
    return [...data.departamentos].sort((a, b) => a.nombre.localeCompare(b.nombre));
  }, [data.departamentos]);

  // Especialidades enriquecidas con total de postulantes histórico
  const especialidadesStats = useMemo(() => {
    const map = new Map<
      number,
      {
        id: number;
        nombre: string;
        total: number;
        deptsSet: Set<number>;
        gestionesSet: Set<number>;
      }
    >();

    data.especialidades.forEach((e) => {
      map.set(e.id, {
        id: e.id,
        nombre: e.nombre,
        total: 0,
        deptsSet: new Set(),
        gestionesSet: new Set(),
      });
    });

    data.inscritos_esfm.forEach((r) => {
      const esp = map.get(r.especialidad_id);
      if (esp) {
        esp.total += r.total_inscritos || 0;
        esp.deptsSet.add(r.departamento_id);
        esp.gestionesSet.add(r.gestion);
      }
    });

    return Array.from(map.values()).sort((a, b) => b.total - a.total);
  }, [data.especialidades, data.inscritos_esfm]);

  // Selección de especialidad activa para análisis
  const [selectedEspId, setSelectedEspId] = useState<number>(() => {
    return especialidadesStats[0]?.id || 1;
  });
  const [espSearchTerm, setEspSearchTerm] = useState<string>('');

  // Departamentos seleccionados para el comparador de la especialidad
  const [selectedCompareDepts, setSelectedCompareDepts] = useState<string[]>([
    'La Paz',
    'Santa Cruz',
    'Cochabamba',
  ]);

  // Gestión seleccionada para la Matriz de Apertura
  const [selectedMatrizGestion, setSelectedMatrizGestion] = useState<number>(latestGestion);
  const [matrizFilter, setMatrizFilter] = useState<'todas' | 'abiertas' | 'no_ofertadas'>('todas');
  const [matrizSearch, setMatrizSearch] = useState<string>('');

  // Filtros del Módulo ESFM
  const [selectedDeptEsfm, setSelectedDeptEsfm] = useState<number | 'all'>('all');
  const [selectedEsfmId, setSelectedEsfmId] = useState<number>(() => {
    return data.esfm[0]?.id || 1;
  });
  const [esfmSearchTerm, setEsfmSearchTerm] = useState<string>('');

  // =========================================================================
  // ÍNDICES EN MEMORIA (O(1) lookups para alto rendimiento)
  // =========================================================================

  // Mapa compuesto: `${especialidadId}_${deptId}_${gestion}` => total_inscritos
  const espDeptGestionIndex = useMemo(() => {
    const map = new Map<string, number>();
    data.inscritos_esfm.forEach((r) => {
      const key = `${r.especialidad_id}_${r.departamento_id}_${r.gestion}`;
      map.set(key, (map.get(key) || 0) + (r.total_inscritos || 0));
    });
    return map;
  }, [data.inscritos_esfm]);

  // Mapa de ESFM por departamento
  const esfmByDept = useMemo(() => {
    const map = new Map<number, typeof data.esfm>();
    // Determinar departamento de cada ESFM a partir de inscritos_esfm
    const esfmDeptMap = new Map<number, number>();
    data.inscritos_esfm.forEach((r) => {
      if (!esfmDeptMap.has(r.esfm_id)) {
        esfmDeptMap.set(r.esfm_id, r.departamento_id);
      }
    });

    data.esfm.forEach((e) => {
      const deptId = esfmDeptMap.get(e.id) || 1;
      const list = map.get(deptId) || [];
      list.push(e);
      map.set(deptId, list);
    });
    return { map, esfmDeptMap };
  }, [data.esfm, data.inscritos_esfm]);

  // =========================================================================
  // MÓDULO 1: ANÁLISIS POR ESPECIALIDAD Y CRECIMIENTO INTERANUAL
  // =========================================================================

  const currentEsp = useMemo(() => {
    return especialidadesStats.find((e) => e.id === selectedEspId) || especialidadesStats[0];
  }, [especialidadesStats, selectedEspId]);

  // 1a. Gráfico Lineal: Evolución de la Especialidad por Departamento (2016 - 2026)
  const espDeptLineSeries: TrendSeries[] = useMemo(() => {
    if (!currentEsp) return [];

    return departamentosList
      .filter((dept) => selectedCompareDepts.includes(dept.nombre))
      .map((dept) => {
        const seriesData = gestiones.map((year) => {
          const key = `${currentEsp.id}_${dept.id}_${year}`;
          return {
            year,
            value: espDeptGestionIndex.get(key) || 0,
          };
        });

        return {
          id: `dept_${dept.id}`,
          name: dept.nombre,
          color: DEPT_COLORS[dept.nombre] || '#c9a751',
          data: seriesData,
        };
      });
  }, [currentEsp, departamentosList, selectedCompareDepts, gestiones, espDeptGestionIndex]);

  // 1b. Gráfico Lineal: Tasa de Crecimiento Interanual (%) de la Especialidad por Departamento
  const espDeptGrowthRateSeries: TrendSeries[] = useMemo(() => {
    if (!currentEsp) return [];

    return departamentosList
      .filter((dept) => selectedCompareDepts.includes(dept.nombre))
      .map((dept) => {
        const rates: { year: number; value: number }[] = [];

        for (let i = 1; i < gestiones.length; i++) {
          const year = gestiones[i];
          const prevYear = gestiones[i - 1];

          const currVal = espDeptGestionIndex.get(`${currentEsp.id}_${dept.id}_${year}`) || 0;
          const prevVal = espDeptGestionIndex.get(`${currentEsp.id}_${dept.id}_${prevYear}`) || 0;

          let rate = 0;
          if (prevVal > 0) {
            rate = Math.round(((currVal - prevVal) / prevVal) * 1000) / 10;
          } else if (currVal > 0) {
            rate = 100; // Nueva apertura en esa gestión
          } else {
            rate = 0; // Sin oferta consecutiva
          }

          rates.push({ year, value: rate });
        }

        return {
          id: `growth_${dept.id}`,
          name: dept.nombre,
          color: DEPT_COLORS[dept.nombre] || '#c9a751',
          data: rates,
        };
      });
  }, [currentEsp, departamentosList, selectedCompareDepts, gestiones, espDeptGestionIndex]);

  // 1c. Tabla de balance departamental para la especialidad seleccionada
  const espDeptTableData = useMemo(() => {
    if (!currentEsp) return [];

    return departamentosList.map((dept) => {
      const histData = gestiones.map((y) => espDeptGestionIndex.get(`${currentEsp.id}_${dept.id}_${y}`) || 0);
      const totalDept = histData.reduce((acc, v) => acc + v, 0);
      const latestVal = histData[histData.length - 1] || 0;
      const initialVal = histData.find((v) => v > 0) || 0;
      const firstYear = gestiones[histData.findIndex((v) => v > 0)] || null;
      const activeYearsCount = histData.filter((v) => v > 0).length;

      const diff = latestVal - initialVal;
      const pctGrowth = initialVal > 0 ? Number(((diff / initialVal) * 100).toFixed(1)) : 0;

      return {
        deptNombre: dept.nombre,
        totalDept,
        latestVal,
        firstYear,
        activeYearsCount,
        pctGrowth,
        isCurrentlyActive: latestVal > 0,
      };
    }).sort((a, b) => b.totalDept - a.totalDept);
  }, [currentEsp, departamentosList, gestiones, espDeptGestionIndex]);

  // =========================================================================
  // MÓDULO 2: MATRIZ DE APERTURA TERRITORIAL DE ESPECIALIDADES
  // =========================================================================

  // Especialidades filtradas para la matriz
  const filteredEspecialidadesMatriz = useMemo(() => {
    return especialidadesStats.filter((esp) => {
      const matchSearch = esp.nombre.toLowerCase().includes(matrizSearch.toLowerCase());
      if (!matchSearch) return false;

      // Evaluar si estuvo abierta en la gestión seleccionada
      let isOpenInGestion = false;
      for (const dept of departamentosList) {
        if ((espDeptGestionIndex.get(`${esp.id}_${dept.id}_${selectedMatrizGestion}`) || 0) > 0) {
          isOpenInGestion = true;
          break;
        }
      }

      if (matrizFilter === 'abiertas') return isOpenInGestion;
      if (matrizFilter === 'no_ofertadas') return !isOpenInGestion;
      return true;
    });
  }, [especialidadesStats, matrizSearch, matrizFilter, departamentosList, espDeptGestionIndex, selectedMatrizGestion]);

  // Gráfico Lineal: Cantidad de Departamentos con Oferta de la Especialidad a través de los Años
  const espDispersiónTerritorialSeries: TrendSeries[] = useMemo(() => {
    if (!currentEsp) return [];

    const counts = gestiones.map((year) => {
      let deptsOffering = 0;
      departamentosList.forEach((dept) => {
        if ((espDeptGestionIndex.get(`${currentEsp.id}_${dept.id}_${year}`) || 0) > 0) {
          deptsOffering++;
        }
      });
      return { year, value: deptsOffering };
    });

    return [
      {
        id: 'depts_ofertando',
        name: `Departamentos con Convocatoria Abierta (${currentEsp.nombre})`,
        color: '#c9a751',
        data: counts,
      },
    ];
  }, [currentEsp, gestiones, departamentosList, espDeptGestionIndex]);

  // =========================================================================
  // MÓDULO 3: RENDIMIENTO Y OFERTA POR ESFM / SEDES
  // =========================================================================

  // ESFM filtradas por departamento y búsqueda
  const filteredEsfmList = useMemo(() => {
    let list = data.esfm;
    if (selectedDeptEsfm !== 'all') {
      const deptList = esfmByDept.map.get(selectedDeptEsfm) || [];
      const deptIds = new Set(deptList.map((e) => e.id));
      list = list.filter((e) => deptIds.has(e.id));
    }
    if (esfmSearchTerm.trim()) {
      list = list.filter((e) => e.nombre.toLowerCase().includes(esfmSearchTerm.toLowerCase()));
    }
    return list;
  }, [data.esfm, selectedDeptEsfm, esfmByDept, esfmSearchTerm]);

  const currentEsfm = useMemo(() => {
    return data.esfm.find((e) => e.id === selectedEsfmId) || filteredEsfmList[0] || data.esfm[0];
  }, [data.esfm, selectedEsfmId, filteredEsfmList]);

  // Serie histórica de postulantes de la ESFM seleccionada
  const esfmTrendSeries: TrendSeries[] = useMemo(() => {
    if (!currentEsfm) return [];

    const seriesData = gestiones.map((year) => {
      let total = 0;
      data.inscritos_esfm.forEach((r) => {
        if (r.esfm_id === currentEsfm.id && r.gestion === year) {
          total += r.total_inscritos || 0;
        }
      });
      return { year, value: total };
    });

    return [
      {
        id: `esfm_${currentEsfm.id}`,
        name: currentEsfm.nombre,
        color: '#c9a751',
        data: seriesData,
      },
    ];
  }, [currentEsfm, gestiones, data.inscritos_esfm]);

  // Distribución de especialidades en la ESFM seleccionada (última gestión)
  const esfmEspPieData: PieSlice[] = useMemo(() => {
    if (!currentEsfm) return [];

    const map = new Map<string, number>();
    data.inscritos_esfm.forEach((r) => {
      if (r.esfm_id === currentEsfm.id && r.gestion === selectedMatrizGestion) {
        const name = r.especialidades?.nombre || `Esp #${r.especialidad_id}`;
        map.set(name, (map.get(name) || 0) + (r.total_inscritos || 0));
      }
    });

    const colors = ['#c9a751', '#059669', '#2563EB', '#7c3aed', '#dc2626', '#d97706', '#0d9488'];
    return Array.from(map.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([label, value], idx) => ({
        label,
        value,
        color: colors[idx % colors.length],
        sublabel: `Gestión ${selectedMatrizGestion}`,
      }));
  }, [currentEsfm, selectedMatrizGestion, data.inscritos_esfm]);

  // Globales para KPIs
  const totalInscritosGlobal = useMemo(
    () => data.inscritos_esfm.reduce((acc, r) => acc + (r.total_inscritos || 0), 0),
    [data.inscritos_esfm]
  );

  const totalInscritosLatest = useMemo(() => {
    return data.inscritos_esfm
      .filter((r) => r.gestion === latestGestion)
      .reduce((acc, r) => acc + (r.total_inscritos || 0), 0);
  }, [data.inscritos_esfm, latestGestion]);

  // Columnas para tabla detallada de inscritos
  const inscritosColumns: ColumnDef<InscritoEsfm>[] = [
    { key: 'gestion', header: 'Gestión', width: 'w-24', align: 'center' },
    {
      key: 'departamento',
      header: 'Departamento',
      render: (r) => (
        <span className="font-semibold text-slate-800">
          {r.departamentos?.nombre || `Dep #${r.departamento_id}`}
        </span>
      ),
    },
    {
      key: 'esfm',
      header: 'ESFM / Unidad Académica',
      render: (r) => (
        <span className="text-slate-700 font-medium truncate block max-w-xs" title={r.esfm?.nombre}>
          {r.esfm?.nombre || `ESFM #${r.esfm_id}`}
        </span>
      ),
    },
    {
      key: 'especialidad',
      header: 'Especialidad',
      render: (r) => (
        <span className="text-[#c9a751] font-medium truncate block max-w-xs" title={r.especialidades?.nombre}>
          {r.especialidades?.nombre || `Esp #${r.especialidad_id}`}
        </span>
      ),
    },
    {
      key: 'modalidad',
      header: 'Modalidad',
      align: 'center',
      render: (r) => (
        <span className="bg-[#faf5e8] text-[#c9a751] border border-[#e5d5a6] px-2 py-0.5 rounded text-[11px] font-medium">
          Mod. {r.modalidad}
        </span>
      ),
    },
    {
      key: 'total_inscritos',
      header: 'Postulantes',
      align: 'right',
      render: (r) => (
        <span className="font-medium text-slate-900">
          {(r.total_inscritos || 0).toLocaleString('es-BO')}
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header Institucional DGFM */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-xs">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] font-semibold uppercase tracking-wider bg-[#faf5e8] text-[#c9a751] border border-[#e5d5a6] px-2.5 py-0.5 rounded-md">
              DGFM · Formación de Maestros
            </span>
            <span className="text-[10px] font-medium text-slate-500">
              Sistema Nacional de Admisión Docente (46 Sedes ESFM / UA)
            </span>
          </div>
          <h1 className="text-2xl font-semibold text-slate-900 tracking-tight">
            Convocatorias y Demanda de Admisión a las ESFM (2016 - 2026)
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Registro histórico de postulantes y oferta de carreras en las 46 Escuelas Superiores de Formación de Maestros (ESFM) y Unidades Académicas (UA) en 11 gestiones académicas.
          </p>
        </div>
      </div>

      {/* Pestañas de Navegación de Primer Nivel */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 border-b border-slate-200">
        <button
          onClick={() => setActiveTab('especialidades')}
          className={`flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap ${
            activeTab === 'especialidades'
              ? 'bg-[#c9a751] text-slate-900 shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <GraduationCapIcon size={16} />
          Especialidad & Crecimiento por Departamento
        </button>
        <button
          onClick={() => setActiveTab('apertura')}
          className={`flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap ${
            activeTab === 'apertura'
              ? 'bg-[#c9a751] text-slate-900 shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <MapPinIcon size={16} />
          Matriz de Apertura Territorial (¿Dónde se abrió?)
        </button>
        <button
          onClick={() => setActiveTab('esfm')}
          className={`flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap ${
            activeTab === 'esfm'
              ? 'bg-[#c9a751] text-slate-900 shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <BuildingIcon size={16} />
          Sedes Formadoras (ESFM y UA)
        </button>
        <button
          onClick={() => setActiveTab('tablas')}
          className={`flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap ${
            activeTab === 'tablas'
              ? 'bg-[#c9a751] text-slate-900 shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <ChartBarIcon size={16} />
          Registros y Catálogos Oficiales
        </button>
      </div>

      {/* 4 KPIs con Iconos Institucionales */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Postulantes Totales"
          value={totalInscritosGlobal}
          subtitle="Acumulado histórico 2016-2026"
          sourceBadge="DGFM"
          sourceColor="amber"
          icon={<GraduationCapIcon size={22} className="text-[#a08035]" />}
        />
        <StatCard
          title={`Convocatoria ${latestGestion}`}
          value={totalInscritosLatest}
          subtitle="Postulantes en última gestión"
          sourceBadge="Gestión"
          sourceColor="amber"
          icon={<CalendarIcon size={22} className="text-[#a08035]" />}
        />
        <StatCard
          title="Sedes ESFM / UA"
          value={data.esfm.length}
          subtitle="46 sedes en los 9 departamentos"
          sourceBadge="Instituciones"
          sourceColor="amber"
          icon={<BuildingIcon size={22} className="text-[#a08035]" />}
        />
        <StatCard
          title="Especialidades Ofertadas"
          value={data.especialidades.length}
          subtitle="Catálogo de carreras pedagógicas"
          sourceBadge="Carreras"
          sourceColor="amber"
          icon={<ChartPieIcon size={22} className="text-[#a08035]" />}
        />
      </div>

      {/* =========================================================================
          MÓDULO 1: DINÁMICA POR ESPECIALIDAD Y CRECIMIENTO INTERANUAL POR DEPARTAMENTO
         ========================================================================= */}
      {activeTab === 'especialidades' && (
        <div className="space-y-6">
          {/* Panel de Selección de Especialidad y Departamentos */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-100 pb-3">
              <div>
                <span className="text-[10px] font-semibold uppercase tracking-wider bg-[#faf5e8] text-[#c9a751] px-2 py-0.5 rounded border border-[#e5d5a6]">
                  Selección de Especialidad Pedagógica
                </span>
                <h3 className="text-sm font-semibold text-slate-900 mt-1">
                  Evolución y Crecimiento de Postulantes por Departamento
                </h3>
              </div>

              {/* Buscador Rápido de Especialidad */}
              <div className="relative w-full sm:w-72">
                <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none text-slate-400">
                  <SearchIcon size={14} />
                </div>
                <input
                  type="text"
                  value={espSearchTerm}
                  onChange={(e) => setEspSearchTerm(e.target.value)}
                  placeholder="Buscar especialidad..."
                  className="w-full text-xs pl-8 pr-7 py-1.5 rounded-lg border border-slate-200 focus:outline-hidden focus:ring-1 focus:ring-[#c9a751] focus:border-[#c9a751] bg-slate-50/50"
                />
                {espSearchTerm && (
                  <button
                    onClick={() => setEspSearchTerm('')}
                    className="absolute inset-y-0 right-0 pr-2 flex items-center text-slate-400 hover:text-slate-600"
                  >
                    <XIcon size={13} />
                  </button>
                )}
              </div>
            </div>

            {/* Carrusel / Lista de Botones de Especialidad */}
            <div className="space-y-2">
              <span className="text-[11px] font-medium text-slate-600">
                Especialidad en análisis:
              </span>
              <div className="flex items-center gap-1.5 flex-wrap max-h-36 overflow-y-auto pr-1">
                {especialidadesStats
                  .filter((e) => e.nombre.toLowerCase().includes(espSearchTerm.toLowerCase()))
                  .map((esp) => {
                    const isSelected = selectedEspId === esp.id;
                    return (
                      <button
                        key={esp.id}
                        onClick={() => setSelectedEspId(esp.id)}
                        className={`text-xs px-2.5 py-1.5 rounded-lg border transition-all flex items-center gap-1.5 ${
                          isSelected
                            ? 'bg-[#c9a751] text-slate-900 border-[#c9a751] shadow-xs font-semibold'
                            : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                        }`}
                      >
                        <span>{esp.nombre}</span>
                        <span className="text-[10px] opacity-75">
                          ({(esp.total / 1000).toFixed(1)}k)
                        </span>
                      </button>
                    );
                  })}
              </div>
            </div>

            {/* Selector de Departamentos a Contrastar */}
            <div className="space-y-2 pt-2 border-t border-slate-100">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <span className="text-[11px] font-medium text-slate-600">
                  Departamentos a contrastar en el gráfico ({selectedCompareDepts.length}):
                </span>
                <div className="flex items-center gap-1.5 text-xs">
                  <button
                    onClick={() => setSelectedCompareDepts(departamentosList.map((d) => d.nombre))}
                    className="px-2 py-0.5 rounded border border-slate-200 bg-white hover:bg-slate-100 text-slate-700 text-[11px]"
                  >
                    Todos (9)
                  </button>
                  <button
                    onClick={() => setSelectedCompareDepts(['La Paz', 'Santa Cruz', 'Cochabamba'])}
                    className="px-2 py-0.5 rounded border border-[#c9a751]/30 bg-[#faf5e8] text-[#c9a751] hover:bg-[#faf5e8]/80 text-[11px]"
                  >
                    Eje Central
                  </button>
                  <button
                    onClick={() => setSelectedCompareDepts(['La Paz'])}
                    className="px-2 py-0.5 rounded border border-slate-200 bg-white text-slate-500 text-[11px]"
                  >
                    Limpiar
                  </button>
                </div>
              </div>
              <div className="flex items-center gap-1.5 flex-wrap">
                {departamentosList.map((dept) => {
                  const isSelected = selectedCompareDepts.includes(dept.nombre);
                  return (
                    <button
                      key={dept.nombre}
                      onClick={() => {
                        if (isSelected) {
                          if (selectedCompareDepts.length > 1) {
                            setSelectedCompareDepts(selectedCompareDepts.filter((n) => n !== dept.nombre));
                          }
                        } else {
                          setSelectedCompareDepts([...selectedCompareDepts, dept.nombre]);
                        }
                      }}
                      className={`text-xs px-2.5 py-1 rounded-lg border transition-all flex items-center gap-1.5 ${
                        isSelected
                          ? 'bg-slate-900 text-white border-slate-900 shadow-xs font-medium'
                          : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100 opacity-60'
                      }`}
                    >
                      <span
                        className="w-2 h-2 rounded-full"
                        style={{ backgroundColor: DEPT_COLORS[dept.nombre] || '#c9a751' }}
                      />
                      <span>{dept.nombre}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Gráficos Lineales de Especialidad: Volumen y Tasa de Crecimiento */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
            {/* Gráfico 1: Evolución Anual de Postulantes por Departamento */}
            <TrendLineChart
              title={`Inscritos por Departamento: ${currentEsp?.nombre || ''}`}
              subtitle={`Evolución anual de aspirantes (2016 - 2026) entre los ${selectedCompareDepts.length} departamentos seleccionados`}
              series={espDeptLineSeries}
              unit="postulantes"
              height={340}
              showArea={false}
            />

            {/* Gráfico 2: Tasa de Crecimiento Interanual (%) por Departamento */}
            <TrendLineChart
              title={`Ritmo de Crecimiento Interanual (%): ${currentEsp?.nombre || ''}`}
              subtitle="Variación porcentual interanual por departamento (valores negativos reflejan contracción de postulaciones)"
              series={espDeptGrowthRateSeries}
              unit="%"
              height={340}
              showArea={false}
            />
          </div>

          {/* Tabla de Balance Departamental para la Especialidad */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-3">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2.5 flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-[#c9a751]" />
                <h3 className="text-sm font-semibold text-slate-900">
                  Balance Departamental Consolidado · {currentEsp?.nombre}
                </h3>
              </div>
              <span className="text-xs text-slate-500 font-medium">
                {currentEsp?.total.toLocaleString('es-BO')} postulantes acumulados a nivel nacional
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-medium uppercase text-[11px]">
                    <th className="py-2.5 px-3">Departamento</th>
                    <th className="py-2.5 px-3 text-right">Total Acumulado</th>
                    <th className="py-2.5 px-3 text-center">Estado Gestión {latestGestion}</th>
                    <th className="py-2.5 px-3 text-right">Postulantes {latestGestion}</th>
                    <th className="py-2.5 px-3 text-center">Primera Convocatoria</th>
                    <th className="py-2.5 px-3 text-center">Gestiones Abierta</th>
                    <th className="py-2.5 px-3 text-right">Crecimiento Neto (%)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {espDeptTableData.map((row) => (
                    <tr key={row.deptNombre} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-2.5 px-3 font-semibold text-slate-900 flex items-center gap-2">
                        <span
                          className="w-2 h-2 rounded-full"
                          style={{ backgroundColor: DEPT_COLORS[row.deptNombre] || '#c9a751' }}
                        />
                        {row.deptNombre}
                      </td>
                      <td className="py-2.5 px-3 text-right font-semibold text-slate-900">
                        {row.totalDept.toLocaleString('es-BO')}
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                            row.isCurrentlyActive
                              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                              : 'bg-slate-100 text-slate-500 border border-slate-200'
                          }`}
                        >
                          {row.isCurrentlyActive ? 'Convocatoria Abierta' : 'Sin Convocatoria'}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-right font-medium text-slate-800">
                        {row.latestVal > 0 ? row.latestVal.toLocaleString('es-BO') : '-'}
                      </td>
                      <td className="py-2.5 px-3 text-center text-slate-600">
                        {row.firstYear ? `Gestión ${row.firstYear}` : 'No aperturada'}
                      </td>
                      <td className="py-2.5 px-3 text-center text-slate-600">
                        {row.activeYearsCount} de {gestiones.length} gestiones
                      </td>
                      <td className="py-2.5 px-3 text-right">
                        <span
                          className={`font-semibold ${
                            row.pctGrowth > 0
                              ? 'text-emerald-600'
                              : row.pctGrowth < 0
                              ? 'text-red-500'
                              : 'text-slate-400'
                          }`}
                        >
                          {row.pctGrowth > 0 ? `+${row.pctGrowth}%` : `${row.pctGrowth}%`}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          MÓDULO 2: MATRIZ DE APERTURA TERRITORIAL DE ESPECIALIDADES
         ========================================================================= */}
      {activeTab === 'apertura' && (
        <div className="space-y-6">
          {/* Header del Módulo de Apertura */}
          <div className="flex items-center gap-2 border-b border-slate-200 pb-3">
            <MapPinIcon size={20} className="text-[#c9a751]" />
            <div>
              <h2 className="text-base font-semibold text-slate-900 tracking-tight">
                Matriz de Apertura Territorial de Especialidades Pedagógicas
              </h2>
              <p className="text-xs text-slate-500">
                Verificación departamental de la convocatoria y apertura de cada especialidad docente por gestión académica.
              </p>
            </div>
          </div>

          {/* Controles de la Matriz: Gestión, Filtros y Búsqueda */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
              {/* Selector de Gestión */}
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-medium text-slate-700">Gestión Académica:</span>
                <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
                  {gestiones.map((y) => (
                    <button
                      key={y}
                      onClick={() => setSelectedMatrizGestion(y)}
                      className={`text-xs px-2.5 py-1 rounded-lg font-medium transition-all ${
                        selectedMatrizGestion === y
                          ? 'bg-[#c9a751] text-slate-900 shadow-xs font-semibold'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      {y}
                    </button>
                  ))}
                </div>
              </div>

              {/* Filtro de Estado de Apertura */}
              <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl self-start md:self-auto">
                <button
                  onClick={() => setMatrizFilter('todas')}
                  className={`text-xs px-2.5 py-1 rounded-lg font-medium transition-all ${
                    matrizFilter === 'todas'
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Todas ({especialidadesStats.length})
                </button>
                <button
                  onClick={() => setMatrizFilter('abiertas')}
                  className={`text-xs px-2.5 py-1 rounded-lg font-medium transition-all ${
                    matrizFilter === 'abiertas'
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Solo Abiertas
                </button>
                <button
                  onClick={() => setMatrizFilter('no_ofertadas')}
                  className={`text-xs px-2.5 py-1 rounded-lg font-medium transition-all ${
                    matrizFilter === 'no_ofertadas'
                      ? 'bg-slate-700 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Sin Convocatoria
                </button>
              </div>
            </div>

            {/* Buscador de Carreras en la Matriz */}
            <div className="relative w-full">
              <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none text-slate-400">
                <SearchIcon size={14} />
              </div>
              <input
                type="text"
                value={matrizSearch}
                onChange={(e) => setMatrizSearch(e.target.value)}
                placeholder="Buscar carrera pedagógica en la matriz..."
                className="w-full text-xs pl-8 pr-7 py-2 rounded-lg border border-slate-200 focus:outline-hidden focus:ring-1 focus:ring-[#c9a751] focus:border-[#c9a751] bg-slate-50/50"
              />
              {matrizSearch && (
                <button
                  onClick={() => setMatrizSearch('')}
                  className="absolute inset-y-0 right-0 pr-2 flex items-center text-slate-400 hover:text-slate-600"
                >
                  <XIcon size={13} />
                </button>
              )}
            </div>
          </div>

          {/* Gráfico de Dispersión Territorial Histórica */}
          <TrendLineChart
            title={`Dispersión Territorial de Oferta: ${currentEsp?.nombre || ''}`}
            subtitle={`Cantidad de departamentos (de 9 posibles) en los que se abrió convocatoria anualmente para ${currentEsp?.nombre}`}
            series={espDispersiónTerritorialSeries}
            unit="departamentos"
            height={260}
            showArea={true}
          />

          {/* Matriz Cruzada de Cobertura */}
          <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-xs">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-medium uppercase text-[11px]">
                  <th className="py-3 px-3 min-w-[220px]">Especialidad Pedagógica</th>
                  <th className="py-3 px-2 text-center min-w-[70px]">Total Nac.</th>
                  {departamentosList.map((dept) => (
                    <th key={dept.nombre} className="py-3 px-2 text-center min-w-[85px]">
                      {dept.nombre}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredEspecialidadesMatriz.map((esp) => {
                  let totalNacGestion = 0;
                  const deptValues = departamentosList.map((dept) => {
                    const val = espDeptGestionIndex.get(`${esp.id}_${dept.id}_${selectedMatrizGestion}`) || 0;
                    totalNacGestion += val;
                    return val;
                  });

                  return (
                    <tr key={esp.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-2.5 px-3 font-semibold text-slate-900">
                        <button
                          onClick={() => {
                            setSelectedEspId(esp.id);
                            setActiveTab('especialidades');
                          }}
                          className="hover:text-[#c9a751] transition-colors text-left"
                          title="Haga clic para ver tendencias históricas de esta carrera"
                        >
                          {esp.nombre}
                        </button>
                      </td>
                      <td className="py-2.5 px-2 text-center font-semibold text-slate-800 bg-slate-50/60">
                        {totalNacGestion > 0 ? totalNacGestion.toLocaleString('es-BO') : '-'}
                      </td>
                      {deptValues.map((val, idx) => {
                        const dept = departamentosList[idx];
                        const isOpen = val > 0;
                        return (
                          <td key={dept.nombre} className="py-2.5 px-2 text-center">
                            {isOpen ? (
                              <span className="inline-flex flex-col items-center justify-center px-1.5 py-0.5 rounded-md bg-[#faf5e8] border border-[#e5d5a6] text-slate-900 font-semibold text-[11px]">
                                <span>{val.toLocaleString('es-BO')}</span>
                              </span>
                            ) : (
                              <span className="text-slate-300 font-light text-xs">-</span>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* =========================================================================
          MÓDULO 3: RENDIMIENTO Y OFERTA POR ESFM / SEDES
         ========================================================================= */}
      {activeTab === 'esfm' && (
        <div className="space-y-6">
          {/* Header del Módulo ESFM */}
          <div className="flex items-center gap-2 border-b border-slate-200 pb-3">
            <BuildingIcon size={20} className="text-[#c9a751]" />
            <div>
              <h2 className="text-base font-semibold text-slate-900 tracking-tight">
                Indicadores y Demanda por Sede Formadora (ESFM y UA)
              </h2>
              <p className="text-xs text-slate-500">
                Historial de postulantes inscritos y catálogo de especialidades convocadas por institución educativa en cada departamento.
              </p>
            </div>
          </div>

          {/* Panel de Selección: Departamento + ESFM */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4">
            {/* Filtro por Departamento */}
            <div className="space-y-2">
              <span className="text-xs font-medium text-slate-700">1. Filtrar por Departamento:</span>
              <div className="flex items-center gap-1.5 flex-wrap">
                <button
                  onClick={() => setSelectedDeptEsfm('all')}
                  className={`text-xs px-3 py-1 rounded-lg border transition-all ${
                    selectedDeptEsfm === 'all'
                      ? 'bg-slate-900 text-white border-slate-900 shadow-xs font-medium'
                      : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  Todas las Sedes (46)
                </button>
                {departamentosList.map((dept) => {
                  const isSelected = selectedDeptEsfm === dept.id;
                  return (
                    <button
                      key={dept.id}
                      onClick={() => setSelectedDeptEsfm(dept.id)}
                      className={`text-xs px-2.5 py-1 rounded-lg border transition-all ${
                        isSelected
                          ? 'bg-[#c9a751] text-slate-900 border-[#c9a751] shadow-xs font-semibold'
                          : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      {dept.nombre}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Selector de ESFM */}
            <div className="space-y-2 pt-2 border-t border-slate-100">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <span className="text-xs font-medium text-slate-700">
                  2. Seleccione la ESFM o Unidad Académica ({filteredEsfmList.length} disponibles):
                </span>
                <div className="relative w-full sm:w-64">
                  <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none text-slate-400">
                    <SearchIcon size={14} />
                  </div>
                  <input
                    type="text"
                    value={esfmSearchTerm}
                    onChange={(e) => setEsfmSearchTerm(e.target.value)}
                    placeholder="Buscar sede ESFM..."
                    className="w-full text-xs pl-8 pr-7 py-1.5 rounded-lg border border-slate-200 focus:outline-hidden focus:ring-1 focus:ring-[#c9a751] focus:border-[#c9a751] bg-slate-50/50"
                  />
                  {esfmSearchTerm && (
                    <button
                      onClick={() => setEsfmSearchTerm('')}
                      className="absolute inset-y-0 right-0 pr-2 flex items-center text-slate-400 hover:text-slate-600"
                    >
                      <XIcon size={13} />
                    </button>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-1.5 flex-wrap max-h-40 overflow-y-auto pr-1">
                {filteredEsfmList.map((e) => {
                  const isSelected = selectedEsfmId === e.id;
                  return (
                    <button
                      key={e.id}
                      onClick={() => setSelectedEsfmId(e.id)}
                      className={`text-xs px-2.5 py-1.5 rounded-lg border transition-all text-left ${
                        isSelected
                          ? 'bg-[#c9a751] text-slate-900 border-[#c9a751] shadow-xs font-semibold'
                          : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      {e.nombre}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Visualizaciones de la ESFM: Serie Histórica y Torta de Especialidades */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
            <TrendLineChart
              title={`Histórico de Postulación: ${currentEsfm?.nombre || ''}`}
              subtitle="Evolución anual de inscritos durante las 11 convocatorias (2016 - 2026)"
              series={esfmTrendSeries}
              unit="postulantes"
              height={320}
              showArea={true}
            />

            <PieChart
              title={`Especialidades Ofertadas en ${currentEsfm?.nombre || ''}`}
              subtitle={`Distribución de aspirantes según carrera · Gestión ${selectedMatrizGestion}`}
              data={esfmEspPieData}
              donut={true}
              unit="postulantes"
            />
          </div>
        </div>
      )}

      {/* =========================================================================
          MÓDULO 4: REGISTROS Y CATÁLOGOS OFICIALES
         ========================================================================= */}
      {activeTab === 'tablas' && (
        <div className="space-y-6">
          {/* Sub-Tabs de Tablas y Catálogos */}
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
            <div className="flex items-center gap-2 mb-4 border-b border-slate-200 pb-3">
              <button
                onClick={() => setActiveSubTab('inscritos')}
                className={`text-xs font-medium px-3 py-1.5 rounded-lg transition-colors ${
                  activeSubTab === 'inscritos'
                    ? 'bg-[#c9a751] text-slate-900 shadow-xs font-semibold'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                Registros Detallados ({data.inscritos_esfm.length.toLocaleString('es-BO')})
              </button>
              <button
                onClick={() => setActiveSubTab('esfm')}
                className={`text-xs font-medium px-3 py-1.5 rounded-lg transition-colors ${
                  activeSubTab === 'esfm'
                    ? 'bg-[#c9a751] text-slate-900 shadow-xs font-semibold'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                Catálogo de ESFM ({data.esfm.length})
              </button>
              <button
                onClick={() => setActiveSubTab('especialidades')}
                className={`text-xs font-medium px-3 py-1.5 rounded-lg transition-colors ${
                  activeSubTab === 'especialidades'
                    ? 'bg-[#c9a751] text-slate-900 shadow-xs font-semibold'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                Especialidades ({data.especialidades.length})
              </button>
            </div>

            {activeSubTab === 'inscritos' && (
              <DataTable
                title="Tabla de Inscritos a ESFM (2016-2026)"
                subtitle="Detalle completo con buscador interactivo y relaciones a departamentos, ESFM y especialidades"
                data={data.inscritos_esfm}
                columns={inscritosColumns}
                searchPlaceholder="Buscar por ESFM, especialidad, departamento..."
                searchFilter={(row, term) =>
                  (row.esfm?.nombre || '').toLowerCase().includes(term) ||
                  (row.especialidades?.nombre || '').toLowerCase().includes(term) ||
                  (row.departamentos?.nombre || '').toLowerCase().includes(term) ||
                  String(row.gestion).includes(term) ||
                  (row.modalidad || '').toLowerCase().includes(term)
                }
              />
            )}

            {activeSubTab === 'esfm' && (
              <DataTable
                title="Catálogo de Escuelas Superiores de Formación de Maestros (ESFM y UA)"
                subtitle="46 sedes oficiales de formación docente en Bolivia"
                data={data.esfm}
                columns={[
                  { key: 'id', header: 'ID', width: 'w-16', align: 'center' },
                  { key: 'nombre', header: 'Nombre Oficial de la ESFM / Unidad Académica' },
                ]}
                searchPlaceholder="Buscar ESFM..."
              />
            )}

            {activeSubTab === 'especialidades' && (
              <DataTable
                title="Catálogo Oficial de Especialidades Pedagógicas"
                subtitle="40 áreas de formación docente inicial"
                data={data.especialidades}
                columns={[
                  { key: 'id', header: 'ID', width: 'w-16', align: 'center' },
                  { key: 'nombre', header: 'Nombre de la Especialidad Pedagógica' },
                ]}
                searchPlaceholder="Buscar especialidad..."
              />
            )}
          </div>

          {/* Ficha Técnica de Fuente DGFM */}
          <SourceBadge
            sourceName="DGFM · Convocatorias de Admisión Docente"
            institutionTitle="Dirección General de Formación de Maestros · Ministerio de Educación"
            methodology="Registros administrativos consolidados a partir de las actas de inscripción y resultados de las convocatorias públicas anuales de admisión a las ESFM y Unidades Académicas (2016-2026)."
            links={[
              {
                title: 'Portal Oficial Ministerio de Educación de Bolivia',
                url: 'https://www.minedu.gob.bo/',
                institution: 'Ministerio de Educación',
                period: '2016-2026',
              },
            ]}
          />
        </div>
      )}
    </div>
  );
}
