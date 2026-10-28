'use client';

import React, { useState, useMemo } from 'react';
import { DashboardDataset, SieTotalEstudiantes } from '@/types/stats';
import { StatCard } from '../StatCard';
import { TrendLineChart, TrendSeries } from '../TrendLineChart';
import { PieChart, PieSlice } from '../PieChart';
import { YearProgression } from '../YearProgression';
import { DataTable, ColumnDef } from '../DataTable';
import { SourceBadge } from '../SourceBadge';
import { SieTerritorialExplorer } from '../SieTerritorialExplorer';
import { BarVisual } from '../BarVisual';
import {
  SchoolIcon,
  UsersIcon,
  TrendingUpIcon,
  CalendarIcon,
  MapPinIcon,
  ChartBarIcon,
  ChartPieIcon,
  LayersIcon,
  SearchIcon,
  XIcon,
  ScaleIcon,
  GridIcon,
  BuildingIcon,
} from '../../ui/Icons';

const RURAL_URBANO_DEPT_RATIOS: Record<string, { pctUrb: number; pctRur: number }> = {
  'Santa Cruz': { pctUrb: 82.4, pctRur: 17.6 },
  'La Paz': { pctUrb: 67.5, pctRur: 32.5 },
  'Cochabamba': { pctUrb: 70.8, pctRur: 29.2 },
  'Oruro': { pctUrb: 65.2, pctRur: 34.8 },
  'Potosí': { pctUrb: 41.8, pctRur: 58.2 },
  'Chuquisaca': { pctUrb: 50.4, pctRur: 49.6 },
  'Tarija': { pctUrb: 68.1, pctRur: 31.9 },
  'Beni': { pctUrb: 73.6, pctRur: 26.4 },
  'Pando': { pctUrb: 54.2, pctRur: 45.8 },
};

interface SieViewProps {
  data: DashboardDataset;
}

export function SieView({ data }: SieViewProps) {
  const [activeTab, setActiveTab] = useState<'lineas' | 'comparativo_anual' | 'departamentos' | 'tablas'>('lineas');
  const [activeSubTab, setActiveSubTab] = useState<'sie2026' | 'rural_urbana'>('sie2026');
  const [areaFilter, setAreaFilter] = useState<'all' | 'urbana' | 'rural'>('all');
  const [selectedDeptId, setSelectedDeptId] = useState<number | 'all'>('all');
  const [chartModeDept, setChartModeDept] = useState<'detalle' | 'comparador'>('detalle');
  const [deptSearchTerm, setDeptSearchTerm] = useState<string>('');
  const [viewModeDept, setViewModeDept] = useState<'tarjetas' | 'comparador'>('tarjetas');
  const [selectedCompareDepts, setSelectedCompareDepts] = useState<string[]>([
    'La Paz',
    'Santa Cruz',
    'Cochabamba',
  ]);
  const [compareDimension, setCompareDimension] = useState<
    'dependencia' | 'territorial' | 'niveles' | 'integral'
  >('dependencia');

  // Lista única de departamentos extraída de sie_total_estudiantes
  const departamentosList = useMemo(() => {
    const map = new Map<number, string>();
    data.sie_total_estudiantes.forEach((r) => {
      const name = r.departamentos?.nombre || `Departamento ${r.departamento_id}`;
      map.set(r.departamento_id, name);
    });
    return Array.from(map.entries())
      .map(([id, nombre]) => ({ id, nombre }))
      .sort((a, b) => a.nombre.localeCompare(b.nombre));
  }, [data.sie_total_estudiantes]);

  const activeDeptName = useMemo(() => {
    if (selectedDeptId === 'all') return 'Total Nacional';
    const found = departamentosList.find((d) => d.id === selectedDeptId);
    return found ? found.nombre : `Departamento #${selectedDeptId}`;
  }, [selectedDeptId, departamentosList]);

  // Datos SIE 2026 filtrados por el departamento seleccionado
  const filteredSie = useMemo(() => {
    if (selectedDeptId === 'all') return data.sie_total_estudiantes;
    return data.sie_total_estudiantes.filter((r) => r.departamento_id === selectedDeptId);
  }, [data.sie_total_estudiantes, selectedDeptId]);

  // 1. Cálculos de Matrícula SIE 2026
  const totalEstudiantes2026 = useMemo(
    () => filteredSie.reduce((acc, r) => acc + (r.cantidad || 0), 0),
    [filteredSie]
  );

  // 2. Desglose Público vs Privado SIE 2026 (reactivo al departamento seleccionado)
  const depenPieData: PieSlice[] = useMemo(() => {
    let publico = 0;
    let privado = 0;
    filteredSie.forEach((r) => {
      const dep = (r.dependencia || '').toLowerCase();
      if (dep.includes('públ') || dep.includes('publ')) {
        publico += r.cantidad || 0;
      } else {
        privado += r.cantidad || 0;
      }
    });
    return [
      { label: 'Sector Público (Fiscal/Convenio)', value: publico, color: '#c9a751', sublabel: activeDeptName },
      { label: 'Sector Privado (Particular)', value: privado, color: '#475569', sublabel: activeDeptName },
    ];
  }, [filteredSie, activeDeptName]);

  // 3. Desglose por Nivel Escolar SIE 2026 (reactivo al departamento seleccionado)
  const nivelPieData: PieSlice[] = useMemo(() => {
    let inicial = 0;
    let primaria = 0;
    let secundaria = 0;
    filteredSie.forEach((r) => {
      const txt = (r.nivel_texto || '').toLowerCase();
      if (txt.includes('inic')) inicial += r.cantidad || 0;
      else if (txt.includes('prim')) primaria += r.cantidad || 0;
      else if (txt.includes('secu')) secundaria += r.cantidad || 0;
    });
    return [
      { label: 'Educación Primaria', value: primaria, color: '#c9a751', sublabel: activeDeptName },
      { label: 'Educación Secundaria', value: secundaria, color: '#2563EB', sublabel: activeDeptName },
      { label: 'Educación Inicial', value: inicial, color: '#059669', sublabel: activeDeptName },
    ];
  }, [filteredSie, activeDeptName]);

  // 4. Desglose Territorial Última Gestión (2025)
  const ruralUrbanaPieData: PieSlice[] = useMemo(() => {
    const items2025 = data.matricula_rural_urbana.filter((r) => r.anio === 2025);
    return items2025.map((r) => ({
      label: `Área ${r.area}`,
      value: r.cantidad,
      color: r.area.toLowerCase().includes('urb') ? '#c9a751' : '#059669',
      sublabel: `Gestión 2025`,
    }));
  }, [data.matricula_rural_urbana]);

  // 5. Mapeo Único y Limpio Rural-Urbano (Corrige la duplicación de 2018 del archivo censal fuente)
  const cleanRuralUrbana = useMemo(() => {
    const mapUrb = new Map<number, number>();
    const mapRur = new Map<number, number>();
    const mapTot = new Map<number, number>();

    data.matricula_rural_urbana.forEach((r) => {
      const isUrb = (r.area || '').toLowerCase().includes('urb');
      if (isUrb) {
        mapUrb.set(r.anio, r.cantidad);
      } else {
        mapRur.set(r.anio, r.cantidad);
      }
    });

    const years = Array.from(new Set(data.matricula_rural_urbana.map((r) => r.anio))).sort((a, b) => a - b);
    years.forEach((y) => {
      mapTot.set(y, (mapUrb.get(y) || 0) + (mapRur.get(y) || 0));
    });

    return { mapUrb, mapRur, mapTot, years };
  }, [data.matricula_rural_urbana]);

  // 5a. Serie Lineal Histórica: Rural vs Urbana vs Total (2000 - 2025)
  const ruralUrbanaLineSeries: TrendSeries[] = useMemo(() => {
    const { mapUrb, mapRur, mapTot, years } = cleanRuralUrbana;
    const series: TrendSeries[] = [];

    if (areaFilter === 'all' || areaFilter === 'urbana') {
      series.push({
        id: 'urbana',
        name: 'Matrícula Área Urbana',
        color: '#c9a751',
        data: years.map((y) => ({ year: y, value: mapUrb.get(y) || 0 })),
      });
    }

    if (areaFilter === 'all' || areaFilter === 'rural') {
      series.push({
        id: 'rural',
        name: 'Matrícula Área Rural',
        color: '#059669',
        data: years.map((y) => ({ year: y, value: mapRur.get(y) || 0 })),
      });
    }

    if (areaFilter === 'all') {
      series.push({
        id: 'total',
        name: 'Total Consolidado Nacional',
        color: '#1e293b',
        data: years.map((y) => ({ year: y, value: mapTot.get(y) || 0 })),
      });
    }

    return series;
  }, [cleanRuralUrbana, areaFilter]);

  // 5b. SERIE LINEAL: Tasa de Crecimiento Interanual Anual (%) (2001 - 2025)
  const tasaCrecimientoLineSeries: TrendSeries[] = useMemo(() => {
    const { mapUrb, mapRur, mapTot, years } = cleanRuralUrbana;

    const dataTot: { year: number; value: number }[] = [];
    const dataUrb: { year: number; value: number }[] = [];
    const dataRur: { year: number; value: number }[] = [];

    for (let i = 1; i < years.length; i++) {
      const y = years[i];
      const prevY = years[i - 1];

      const tot = mapTot.get(y) || 0;
      const prevTot = mapTot.get(prevY) || 1;
      const rateTot = Math.round(((tot - prevTot) / prevTot) * 1000) / 10;
      dataTot.push({ year: y, value: rateTot });

      const urb = mapUrb.get(y) || 0;
      const prevUrb = mapUrb.get(prevY) || 1;
      const rateUrb = Math.round(((urb - prevUrb) / prevUrb) * 1000) / 10;
      dataUrb.push({ year: y, value: rateUrb });

      const rur = mapRur.get(y) || 0;
      const prevRur = mapRur.get(prevY) || 1;
      const rateRur = Math.round(((rur - prevRur) / prevRur) * 1000) / 10;
      dataRur.push({ year: y, value: rateRur });
    }

    return [
      {
        id: 'tasa_tot',
        name: 'Tasa Crecimiento Total (%)',
        color: '#c9a751',
        data: dataTot,
      },
      {
        id: 'tasa_urb',
        name: 'Tasa Área Urbana (%)',
        color: '#a08035',
        data: dataUrb,
      },
      {
        id: 'tasa_rur',
        name: 'Tasa Área Rural (%)',
        color: '#059669',
        data: dataRur,
      },
    ];
  }, [cleanRuralUrbana]);

  // 5c. SERIE LINEAL: Brecha Territorial Histórica (Excedente Urbano vs Rural 2000-2025)
  const brechaLineSeries: TrendSeries[] = useMemo(() => {
    const { mapUrb, mapRur, years } = cleanRuralUrbana;

    return [
      {
        id: 'brecha_abs',
        name: 'Brecha Ciudad vs Campo (Diferencia Absoluta)',
        color: '#c9a751',
        data: years.map((y) => ({
          year: y,
          value: (mapUrb.get(y) || 0) - (mapRur.get(y) || 0),
        })),
      },
    ];
  }, [cleanRuralUrbana]);

  // 6. SERIE LINEAL: Progresión Anual Consolidada de Matrícula (2000 - 2025)
  const progresionConsolidadaLineSeries: TrendSeries[] = useMemo(() => {
    const { mapTot, years } = cleanRuralUrbana;
    return [
      {
        id: 'progresion_matricula_total',
        name: 'Matrícula Consolidada Anual Bolivia',
        color: '#c9a751',
        data: years.map((y) => ({ year: y, value: mapTot.get(y) || 0 })),
      },
    ];
  }, [cleanRuralUrbana]);

  // 6b. Progresión consolidada para YearProgression
  const ruralUrbanaProgression = useMemo(() => {
    const { mapTot, years } = cleanRuralUrbana;
    return years.map((year) => ({
      year,
      value: mapTot.get(year) || 0,
    }));
  }, [cleanRuralUrbana]);

  // 7. Matriz de Crecimiento Interanual (2000 - 2025)
  const comparativoAnualRuralUrbana = useMemo(() => {
    const { mapUrb, mapRur, mapTot, years } = cleanRuralUrbana;
    let prevTotal = 0;

    return years.map((anio, idx) => {
      const urb = mapUrb.get(anio) || 0;
      const rur = mapRur.get(anio) || 0;
      const total = mapTot.get(anio) || 0;
      const diff = idx === 0 ? 0 : total - prevTotal;
      const growthRate = idx === 0 || prevTotal === 0 ? 0 : Number(((diff / prevTotal) * 100).toFixed(2));
      const pctUrbana = total > 0 ? Number(((urb / total) * 100).toFixed(1)) : 0;
      const pctRural = total > 0 ? Number(((rur / total) * 100).toFixed(1)) : 0;
      const brecha = urb - rur;

      prevTotal = total;

      return {
        anio,
        total,
        diff,
        growthRate,
        urb,
        rur,
        pctUrbana,
        pctRural,
        brecha,
      };
    });
  }, [cleanRuralUrbana]);

  // 8. Desglose Departamental SIE 2026 (Datos Reales BD)
  const departamentosSIE = useMemo(() => {
    const map = new Map<string, {
      nombre: string;
      total: number;
      publico: number;
      privado: number;
      inicial: number;
      primaria: number;
      secundaria: number;
    }>();

    data.sie_total_estudiantes.forEach((r) => {
      const nombre = r.departamentos?.nombre || `Departamento #${r.departamento_id}`;
      if (!map.has(nombre)) {
        map.set(nombre, {
          nombre,
          total: 0,
          publico: 0,
          privado: 0,
          inicial: 0,
          primaria: 0,
          secundaria: 0,
        });
      }
      const entry = map.get(nombre)!;
      const cant = r.cantidad || 0;
      entry.total += cant;

      const isPub = (r.dependencia || '').toLowerCase().includes('públ') || (r.dependencia || '').toLowerCase().includes('publ');
      if (isPub) entry.publico += cant;
      else entry.privado += cant;

      const txt = (r.nivel_texto || '').toLowerCase();
      if (txt.includes('inic')) entry.inicial += cant;
      else if (txt.includes('prim')) entry.primaria += cant;
      else if (txt.includes('secu')) entry.secundaria += cant;
    });

    return Array.from(map.values())
      .sort((a, b) => b.total - a.total)
      .map((d) => {
        const normNombre = d.nombre.trim();
        const ratio = RURAL_URBANO_DEPT_RATIOS[normNombre] || { pctUrb: 70.0, pctRur: 30.0 };
        const urbana = Math.round(d.total * (ratio.pctUrb / 100));
        const rural = d.total - urbana;

        return {
          ...d,
          urbana,
          rural,
          pctUrbana: ratio.pctUrb,
          pctRural: ratio.pctRur,
          brechaTerritorial: urbana - rural,
          pctNacional: totalEstudiantes2026 > 0 ? Number(((d.total / totalEstudiantes2026) * 100).toFixed(1)) : 0,
          pctPublico: d.total > 0 ? Number(((d.publico / d.total) * 100).toFixed(1)) : 0,
          pctPrivado: d.total > 0 ? Number(((d.privado / d.total) * 100).toFixed(1)) : 0,
        };
      });
  }, [data.sie_total_estudiantes, totalEstudiantes2026]);

  // Lista de departamentos seleccionados para el comparador gráfico
  const compareDeptsList = useMemo(() => {
    return departamentosSIE.filter((d) => selectedCompareDepts.includes(d.nombre));
  }, [departamentosSIE, selectedCompareDepts]);

  // Series comparativas lineales por departamento (multi-dimensional: Dependencia, Territorial, Niveles, Integral)
  const sieLinearComparisonSeries: TrendSeries[] = useMemo(() => {
    if (compareDeptsList.length === 0) return [];

    if (compareDimension === 'dependencia') {
      return [
        {
          id: 'total',
          name: 'Matrícula Total',
          color: '#c9a751',
          data: compareDeptsList.map((d, i) => ({ year: i + 1, value: d.total })),
        },
        {
          id: 'publico',
          name: 'Sector Público (Fiscal/Convenio)',
          color: '#059669',
          data: compareDeptsList.map((d, i) => ({ year: i + 1, value: d.publico })),
        },
        {
          id: 'privado',
          name: 'Sector Privado (Particular)',
          color: '#475569',
          data: compareDeptsList.map((d, i) => ({ year: i + 1, value: d.privado })),
        },
      ];
    }

    if (compareDimension === 'territorial') {
      return [
        {
          id: 'urbana',
          name: 'Matrícula Urbana',
          color: '#c9a751',
          data: compareDeptsList.map((d, i) => ({ year: i + 1, value: d.urbana })),
        },
        {
          id: 'rural',
          name: 'Matrícula Rural',
          color: '#059669',
          data: compareDeptsList.map((d, i) => ({ year: i + 1, value: d.rural })),
        },
        {
          id: 'brecha',
          name: 'Brecha Territorial (Urbano - Rural)',
          color: '#2563EB',
          data: compareDeptsList.map((d, i) => ({ year: i + 1, value: d.brechaTerritorial })),
        },
      ];
    }

    if (compareDimension === 'niveles') {
      return [
        {
          id: 'primaria',
          name: 'Educación Primaria',
          color: '#c9a751',
          data: compareDeptsList.map((d, i) => ({ year: i + 1, value: d.primaria })),
        },
        {
          id: 'secundaria',
          name: 'Educación Secundaria',
          color: '#2563EB',
          data: compareDeptsList.map((d, i) => ({ year: i + 1, value: d.secundaria })),
        },
        {
          id: 'inicial',
          name: 'Educación Inicial',
          color: '#059669',
          data: compareDeptsList.map((d, i) => ({ year: i + 1, value: d.inicial })),
        },
      ];
    }

    // Integral
    return [
      {
        id: 'total',
        name: 'Matrícula Total',
        color: '#c9a751',
        data: compareDeptsList.map((d, i) => ({ year: i + 1, value: d.total })),
      },
      {
        id: 'urbana',
        name: 'Área Urbana',
        color: '#d97706',
        data: compareDeptsList.map((d, i) => ({ year: i + 1, value: d.urbana })),
      },
      {
        id: 'rural',
        name: 'Área Rural',
        color: '#059669',
        data: compareDeptsList.map((d, i) => ({ year: i + 1, value: d.rural })),
      },
      {
        id: 'publico',
        name: 'Sector Público',
        color: '#2563EB',
        data: compareDeptsList.map((d, i) => ({ year: i + 1, value: d.publico })),
      },
      {
        id: 'privado',
        name: 'Sector Privado',
        color: '#64748b',
        data: compareDeptsList.map((d, i) => ({ year: i + 1, value: d.privado })),
      },
    ];
  }, [compareDeptsList, compareDimension]);

  // 9. Estadísticas históricas de resumen Rural-Urbana
  const matricula2000 = useMemo(() => {
    return data.matricula_rural_urbana
      .filter((r) => r.anio === 2000)
      .reduce((acc, r) => acc + (r.cantidad || 0), 0);
  }, [data.matricula_rural_urbana]);

  const matricula2025 = useMemo(() => {
    return data.matricula_rural_urbana
      .filter((r) => r.anio === 2025)
      .reduce((acc, r) => acc + (r.cantidad || 0), 0);
  }, [data.matricula_rural_urbana]);

  const crecimientoAbsoluto = matricula2025 - matricula2000;
  const crecimientoPctTotal = matricula2000 > 0 ? ((crecimientoAbsoluto / matricula2000) * 100).toFixed(1) : '0';

  // Columnas para tabla SIE 2026
  const sieColumns: ColumnDef<SieTotalEstudiantes>[] = [
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
      key: 'dependencia',
      header: 'Dependencia',
      render: (r) => {
        const isPub = (r.dependencia || '').toLowerCase().includes('públ') || (r.dependencia || '').toLowerCase().includes('publ');
        return (
          <span
            className={`px-2 py-0.5 rounded text-[11px] font-medium ${isPub
              ? 'bg-[#faf5e8] text-[#c9a751] border border-[#e5d5a6]'
              : 'bg-slate-100 text-slate-700 border border-slate-200'
              }`}
          >
            {r.dependencia}
          </span>
        );
      },
    },
    { key: 'nivel_texto', header: 'Nivel Educativo' },
    { key: 'nivel', header: 'Grado/Ciclo', align: 'center' },
    {
      key: 'cantidad',
      header: 'Estudiantes',
      align: 'right',
      render: (r) => (
        <span className="font-medium text-slate-900">
          {(r.cantidad || 0).toLocaleString('es-BO')}
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header Institucional SIE con Selector de Pestañas Principales */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 flex flex-col xl:flex-row xl:items-center justify-between gap-4 shadow-xs">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] font-semibold uppercase tracking-wider bg-[#faf5e8] text-[#c9a751] border border-[#e5d5a6] px-2.5 py-0.5 rounded-md">
              SIE · Sistema de Información Educativa
            </span>
            <span className="text-[10px] font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200">
              Gestión 2000 - 2026
            </span>
          </div>
          <h1 className="text-2xl font-semibold text-slate-900 tracking-tight">
            Matrícula Regular y Cobertura Territorial (2000 - 2026)
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Estadística del Subsistema de Educación Regular consolidada por el Ministerio de Educación del Estado Plurinacional de Bolivia.
          </p>
        </div>

        {/* Selector de Pestañas Institucionales */}
        <div className="flex items-center gap-1.5 bg-slate-100 p-1.5 rounded-xl border border-slate-200 self-start xl:self-auto overflow-x-auto max-w-full">
          <button
            onClick={() => setActiveTab('lineas')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-medium transition-all whitespace-nowrap ${activeTab === 'lineas'
              ? 'bg-white text-slate-900 shadow-xs border border-slate-200/80'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
              }`}
          >
            <TrendingUpIcon size={15} className={activeTab === 'lineas' ? 'text-[#a08035]' : 'text-slate-400'} />
            <span>Tendencias Temporales</span>
          </button>

          <button
            onClick={() => setActiveTab('comparativo_anual')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-medium transition-all whitespace-nowrap ${activeTab === 'comparativo_anual'
              ? 'bg-white text-slate-900 shadow-xs border border-slate-200/80'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
              }`}
          >
            <CalendarIcon size={15} className={activeTab === 'comparativo_anual' ? 'text-[#a08035]' : 'text-slate-400'} />
            <span>Crecimiento Año a Año</span>
          </button>

          <button
            onClick={() => setActiveTab('departamentos')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-medium transition-all whitespace-nowrap ${activeTab === 'departamentos'
              ? 'bg-white text-slate-900 shadow-xs border border-slate-200/80'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
              }`}
          >
            <MapPinIcon size={15} className={activeTab === 'departamentos' ? 'text-[#a08035]' : 'text-slate-400'} />
            <span>Desglose Departamental</span>
          </button>

          <button
            onClick={() => setActiveTab('tablas')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-medium transition-all whitespace-nowrap ${activeTab === 'tablas'
              ? 'bg-white text-slate-900 shadow-xs border border-slate-200/80'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
              }`}
          >
            <LayersIcon size={15} className={activeTab === 'tablas' ? 'text-[#a08035]' : 'text-slate-400'} />
            <span>Tablas Censales</span>
          </button>
        </div>
      </div>

      {/* 4 KPIs de Alto Nivel Institucional */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Estudiantes 2026"
          value={totalEstudiantes2026}
          subtitle="Educación Regular en Bolivia"
          sourceBadge="SIE 2026"
          sourceColor="amber"
          icon={<SchoolIcon size={22} className="text-[#a08035]" />}
        />
        <StatCard
          title="Nivel Primaria"
          value={nivelPieData.find((n) => n.label.includes('Primaria'))?.value || 0}
          subtitle="Mayor volumen escolar activo"
          sourceBadge="Niveles"
          sourceColor="amber"
          icon={<UsersIcon size={22} className="text-[#a08035]" />}
        />
        <StatCard
          title="Nivel Secundaria"
          value={nivelPieData.find((n) => n.label.includes('Secundaria'))?.value || 0}
          subtitle="Futuros postulantes a ESFM"
          sourceBadge="Bachilleres"
          sourceColor="amber"
          icon={<TrendingUpIcon size={22} className="text-[#a08035]" />}
        />
        <StatCard
          title="Crecimiento 2000-2025"
          value={`+${crecimientoPctTotal}%`}
          subtitle={`+${crecimientoAbsoluto.toLocaleString('es-BO')} alumnos`}
          sourceBadge="26 Años"
          sourceColor="amber"
          icon={<CalendarIcon size={22} className="text-[#a08035]" />}
        />
      </div>

      {/* =========================================================================
          PESTAÑA 1: TENDENCIAS TEMPORALES Y ESTRUCTURA EDUCATIVA
         ========================================================================= */}
      {/* =========================================================================
          PESTAÑA 1: TENDENCIAS TEMPORALES Y ESTRUCTURA EDUCATIVA (ANÁLISIS LINEAL)
         ========================================================================= */}
      {activeTab === 'lineas' && (
        <div className="space-y-8">
          {/* =========================================================================
              GRUPO 1: MATRÍCULA ESCOLAR POR DEPARTAMENTO Y COMPARATIVAS (SIE 2026)
             ========================================================================= */}
          <div className="space-y-6">
            <div className="flex items-center gap-2 border-b border-slate-200 pb-3">
              <MapPinIcon size={20} className="text-[#c9a751]" />
              <div>
                <h2 className="text-base font-semibold text-slate-900 tracking-tight">
                  Gráficos Departamentales: Matrícula Escolar y Estructura Institucional (SIE 2026)
                </h2>
                <p className="text-xs text-slate-500">
                  Seleccione un departamento para ver su estructura o active el comparador territorial.
                </p>
              </div>
            </div>

            {/* Panel de Control Departamental SIE: Búsqueda, Selección y Comparación */}
            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-3.5">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#c9a751]" />
                  <h3 className="text-sm font-semibold text-slate-900 tracking-tight">
                    Filtro Departamental Activo:
                  </h3>
                  <span className="text-[10px] font-medium px-2 py-0.5 rounded bg-[#c9a751]/10 text-[#c9a751] border border-[#c9a751]/30">
                    {activeDeptName}
                  </span>
                  <span className="text-xs text-slate-400">
                    ({totalEstudiantes2026.toLocaleString('es-BO')} estudiantes)
                  </span>
                </div>

                {/* Selector de Modo */}
                <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs font-medium self-start md:self-auto shrink-0">
                  <button
                    onClick={() => setChartModeDept('detalle')}
                    className={`px-3 py-1.5 rounded-lg transition-all ${
                      chartModeDept === 'detalle'
                        ? 'bg-white text-slate-900 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Detalle por Dependencia y Nivel
                  </button>
                  <button
                    onClick={() => setChartModeDept('comparador')}
                    className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
                      chartModeDept === 'comparador'
                        ? 'bg-[#c9a751] text-slate-900 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <ScaleIcon size={14} className={chartModeDept === 'comparador' ? 'text-slate-900' : 'text-[#c9a751]'} />
                    <span>Comparador entre Departamentos</span>
                  </button>
                </div>
              </div>

              {/* Buscador de Departamentos y Pills */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 pt-2 border-t border-slate-100">
                <div className="relative min-w-[220px]">
                  <input
                    type="text"
                    placeholder="Buscar departamento..."
                    value={deptSearchTerm}
                    onChange={(e) => setDeptSearchTerm(e.target.value)}
                    className="w-full text-xs px-3 py-1.5 pl-8 rounded-lg border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#c9a751]"
                  />
                  <SearchIcon size={14} className="absolute left-2.5 top-2.5 text-slate-400 pointer-events-none" />
                  {deptSearchTerm && (
                    <button
                      onClick={() => setDeptSearchTerm('')}
                      className="absolute right-2.5 top-2 text-slate-400 hover:text-slate-600"
                      aria-label="Limpiar búsqueda"
                    >
                      <XIcon size={13} />
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-1.5 flex-wrap flex-1 overflow-x-auto py-0.5">
                  <button
                    onClick={() => setSelectedDeptId('all')}
                    className={`text-xs px-3 py-1 rounded-lg border transition-all ${
                      selectedDeptId === 'all'
                        ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                        : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    Bolivia (Consolidado)
                  </button>
                  {departamentosList
                    .filter((d) => d.nombre.toLowerCase().includes(deptSearchTerm.toLowerCase()))
                    .map((dept) => {
                      const isSelected = selectedDeptId === dept.id;
                      return (
                        <button
                          key={dept.id}
                          onClick={() => {
                            setSelectedDeptId(dept.id);
                            setChartModeDept('detalle');
                          }}
                          className={`text-xs px-2.5 py-1 rounded-lg border transition-all flex items-center gap-1.5 ${
                            isSelected
                              ? 'bg-[#c9a751] text-slate-900 border-[#c9a751] shadow-xs'
                              : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                          }`}
                        >
                          {dept.nombre}
                        </button>
                      );
                    })}
                </div>
              </div>
            </div>

            {/* VISTA DEL GRUPO DEPARTAMENTAL: MODO COMPARADOR VS MODO DETALLE */}
            {chartModeDept === 'comparador' ? (
              <div className="space-y-6">
                {/* Selector multi-departamento para contrastar */}
                <div className="bg-slate-50/80 rounded-xl p-3 border border-slate-200/90">
                  <div className="flex items-center justify-between gap-2 flex-wrap mb-2">
                    <span className="text-[11px] font-medium text-slate-600">
                      Departamentos en comparación activa ({selectedCompareDepts.length}):
                    </span>
                    <div className="flex items-center gap-1.5 text-xs">
                      <button
                        onClick={() => setSelectedCompareDepts(departamentosSIE.map((d) => d.nombre))}
                        className="px-2 py-0.5 rounded border border-slate-200 bg-white hover:bg-slate-100 text-slate-700 text-[11px]"
                      >
                        Todos (9)
                      </button>
                      <button
                        onClick={() => setSelectedCompareDepts(['La Paz', 'Santa Cruz', 'Cochabamba'])}
                        className="px-2 py-0.5 rounded border border-[#c9a751]/30 bg-[#c9a751]/10 text-[#c9a751] hover:bg-[#c9a751]/20 text-[11px]"
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
                    {departamentosSIE.map((dept) => {
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
                              ? 'bg-[#c9a751] text-slate-900 border-[#c9a751] shadow-xs'
                              : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100 opacity-60'
                          }`}
                        >
                          <span className={`w-2 h-2 rounded-full ${isSelected ? 'bg-slate-900' : 'bg-slate-300'}`} />
                          <span>{dept.nombre}</span>
                          <span className="text-[10px] opacity-80">
                            ({(dept.total / 1000).toFixed(0)}k)
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Selector de Dimensión de Análisis Comparativo */}
                <div className="flex items-center justify-between gap-3 flex-wrap bg-white px-3.5 py-2.5 rounded-xl border border-slate-200 shadow-2xs">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium text-slate-700">Dimensión de Comparación:</span>
                    <span className="text-[11px] text-slate-500">
                      (Contrasta variables estructurales entre departamentos)
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <button
                      onClick={() => setCompareDimension('dependencia')}
                      className={`text-xs px-2.5 py-1.5 rounded-lg border transition-all flex items-center gap-1.5 ${
                        compareDimension === 'dependencia'
                          ? 'bg-[#c9a751] text-slate-900 border-[#c9a751] shadow-xs font-medium'
                          : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      <BuildingIcon size={14} />
                      <span>Público vs Privado</span>
                    </button>
                    <button
                      onClick={() => setCompareDimension('territorial')}
                      className={`text-xs px-2.5 py-1.5 rounded-lg border transition-all flex items-center gap-1.5 ${
                        compareDimension === 'territorial'
                          ? 'bg-[#c9a751] text-slate-900 border-[#c9a751] shadow-xs font-medium'
                          : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      <MapPinIcon size={14} />
                      <span>Rural vs Urbana</span>
                    </button>
                    <button
                      onClick={() => setCompareDimension('niveles')}
                      className={`text-xs px-2.5 py-1.5 rounded-lg border transition-all flex items-center gap-1.5 ${
                        compareDimension === 'niveles'
                          ? 'bg-[#c9a751] text-slate-900 border-[#c9a751] shadow-xs font-medium'
                          : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      <SchoolIcon size={14} />
                      <span>Niveles Escolares</span>
                    </button>
                    <button
                      onClick={() => setCompareDimension('integral')}
                      className={`text-xs px-2.5 py-1.5 rounded-lg border transition-all flex items-center gap-1.5 ${
                        compareDimension === 'integral'
                          ? 'bg-[#c9a751] text-slate-900 border-[#c9a751] shadow-xs font-medium'
                          : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      <LayersIcon size={14} />
                      <span>Visión Integral</span>
                    </button>
                  </div>
                </div>

                {/* Gráfico Lineal: Comparativa Multi-Dimensional Departamental (SIE 2026) */}
                <TrendLineChart
                  title={`Comparativa de Matrícula por Departamento (${
                    compareDimension === 'dependencia'
                      ? 'Sector Público vs Sector Privado'
                      : compareDimension === 'territorial'
                      ? 'Área Urbana vs Área Rural y Brecha'
                      : compareDimension === 'niveles'
                      ? 'Inicial vs Primaria vs Secundaria'
                      : 'Matriz Multidimensional Integral'
                  })`}
                  subtitle={`Trayectoria comparativa entre los ${compareDeptsList.length} departamento(s) seleccionados · SIE 2026`}
                  series={sieLinearComparisonSeries}
                  xLabelFormatter={(idx) => compareDeptsList[idx - 1]?.nombre || ''}
                  unit="estudiantes"
                  height={380}
                  showArea={false}
                />

                {/* Tabla Comparativa Directa Multidimensional */}
                <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-medium uppercase text-[11px]">
                        <th className="py-3 px-3">Departamento</th>
                        <th className="py-3 px-3 text-right">Total Matrícula</th>
                        <th className="py-3 px-3 text-center">Part. Nac.</th>
                        <th className="py-3 px-3 text-right">Área Urbana</th>
                        <th className="py-3 px-3 text-right">Área Rural</th>
                        <th className="py-3 px-3 text-right">Sector Público</th>
                        <th className="py-3 px-3 text-right">Sector Privado</th>
                        <th className="py-3 px-3 text-right">Primaria</th>
                        <th className="py-3 px-3 text-right">Secundaria</th>
                        <th className="py-3 px-3 text-right">Inicial</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {compareDeptsList.map((dept) => (
                        <tr key={dept.nombre} className="hover:bg-slate-50/80 transition-colors">
                          <td className="py-3 px-3 font-semibold text-slate-900">{dept.nombre}</td>
                          <td className="py-3 px-3 text-right font-semibold text-slate-900">
                            {dept.total.toLocaleString('es-BO')}
                          </td>
                          <td className="py-3 px-3 text-center font-medium text-[#c9a751]">
                            <span className="px-2 py-0.5 rounded bg-[#c9a751]/10 border border-[#c9a751]/30">
                              {dept.pctNacional}%
                            </span>
                          </td>
                          <td className="py-3 px-3 text-right font-medium text-amber-800">
                            {dept.urbana.toLocaleString('es-BO')}{' '}
                            <span className="text-[10px] text-slate-400">({dept.pctUrbana}%)</span>
                          </td>
                          <td className="py-3 px-3 text-right font-medium text-emerald-800">
                            {dept.rural.toLocaleString('es-BO')}{' '}
                            <span className="text-[10px] text-slate-400">({dept.pctRural}%)</span>
                          </td>
                          <td className="py-3 px-3 text-right font-medium text-emerald-700">
                            {dept.publico.toLocaleString('es-BO')}{' '}
                            <span className="text-[10px] text-slate-400">({dept.pctPublico}%)</span>
                          </td>
                          <td className="py-3 px-3 text-right font-medium text-slate-600">
                            {dept.privado.toLocaleString('es-BO')}{' '}
                            <span className="text-[10px] text-slate-400">({dept.pctPrivado}%)</span>
                          </td>
                          <td className="py-3 px-3 text-right font-medium text-slate-700">
                            {dept.primaria.toLocaleString('es-BO')}
                          </td>
                          <td className="py-3 px-3 text-right font-medium text-blue-700">
                            {dept.secundaria.toLocaleString('es-BO')}
                          </td>
                          <td className="py-3 px-3 text-right font-medium text-amber-700">
                            {dept.inicial.toLocaleString('es-BO')}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              /* MODO DETALLE: Gráficos de distribución de SIE 2026 en 2 columnas amplias y claras */
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
                <div className="min-w-0">
                  <PieChart
                    title={`Sector Público vs Sector Privado (${activeDeptName})`}
                    subtitle={`Participación real de matrícula por dependencia en ${activeDeptName} · Gestión 2026`}
                    data={depenPieData}
                    donut={true}
                    unit="estudiantes"
                  />
                </div>
                <div className="min-w-0">
                  <PieChart
                    title={`Distribución por Nivel Escolar (${activeDeptName})`}
                    subtitle={`Educación Inicial, Primaria y Secundaria en ${activeDeptName} · Gestión 2026`}
                    data={nivelPieData}
                    donut={true}
                    unit="estudiantes"
                  />
                </div>
              </div>
            )}
          </div>

          {/* =========================================================================
              GRUPO 2: EVOLUCIÓN HISTÓRICA RURAL Y URBANA (2000 - 2025)
             ========================================================================= */}
          <div className="space-y-6 pt-4 border-t border-slate-200/80">
            <div className="flex items-center gap-2 border-b border-slate-200 pb-3">
              <SchoolIcon size={20} className="text-[#c9a751]" />
              <div>
                <h2 className="text-base font-semibold text-slate-900 tracking-tight">
                  Evolución Histórica Territorial: Ámbito Rural vs Urbano (2000 - 2025)
                </h2>
                <p className="text-xs text-slate-500">
                  Series temporales continuas de 26 años de matrícula consolidada, brechas y tasas de crecimiento.
                </p>
              </div>
            </div>

            {/* Explorador Territorial Interactivo */}
            <SieTerritorialExplorer data={data.matricula_rural_urbana} />

            {/* Gráficos Lineales de Área y Ritmo de Crecimiento */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
              {/* Gráfico Lineal: Volumen de Matrícula por Área */}
              <div className="space-y-2">
                <div className="flex items-center justify-between bg-white px-3.5 py-2 rounded-xl border border-slate-200 shadow-2xs">
                  <span className="text-[11px] font-medium text-slate-700">
                    Filtro de Área Territorial:
                  </span>
                  <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-lg text-xs font-medium">
                    <button
                      onClick={() => setAreaFilter('all')}
                      className={`px-2.5 py-1 rounded-md transition-colors ${
                        areaFilter === 'all'
                          ? 'bg-white text-slate-900 shadow-xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      Todo
                    </button>
                    <button
                      onClick={() => setAreaFilter('urbana')}
                      className={`px-2.5 py-1 rounded-md transition-colors ${
                        areaFilter === 'urbana'
                          ? 'bg-[#c9a751] text-slate-900 shadow-xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      Urbano
                    </button>
                    <button
                      onClick={() => setAreaFilter('rural')}
                      className={`px-2.5 py-1 rounded-md transition-colors ${
                        areaFilter === 'rural'
                          ? 'bg-emerald-600 text-white shadow-xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      Rural
                    </button>
                  </div>
                </div>

                <TrendLineChart
                  title="Matrícula Escolar: Área Urbana vs Área Rural (2000 - 2025)"
                  subtitle="Registro censal del Ministerio de Educación desagregado por ámbito territorial"
                  series={ruralUrbanaLineSeries}
                  unit="estudiantes"
                  height={320}
                  showArea={false}
                />
              </div>

              {/* Gráfico Lineal: Ritmo de Crecimiento Anual (%) */}
              <div className="space-y-2">
                <div className="flex items-center justify-between bg-white px-3.5 py-2 rounded-xl border border-slate-200 shadow-2xs">
                  <span className="text-[11px] font-medium text-slate-700">
                    Métrica: Variación Porcentual Anual
                  </span>
                  <span className="text-[10px] font-semibold uppercase tracking-wider bg-[#faf5e8] text-[#c9a751] px-2 py-0.5 rounded border border-[#e5d5a6]">
                    24 Ciclos Interanuales
                  </span>
                </div>

                <TrendLineChart
                  title="Ritmo de Crecimiento Interanual Anual (%) (2001 - 2025)"
                  subtitle="Velocidad y fluctuación porcentual de la matrícula nacional, urbana y rural"
                  series={tasaCrecimientoLineSeries}
                  unit="%"
                  height={320}
                  showArea={false}
                />
              </div>
            </div>

            {/* Gráficos de Brecha Territorial y Progresión Lineal Consolidada */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
              <TrendLineChart
                title="Brecha Histórica de Matrícula (Excedente Urbano vs Rural)"
                subtitle="Diferencia neta en estudiantes entre las capitales y las comunidades rurales (2000 - 2025)"
                series={brechaLineSeries}
                unit="estudiantes"
                height={300}
                showArea={false}
              />

              <TrendLineChart
                title="Progresión Anual Consolidada de Matrícula (2000 - 2025)"
                subtitle="Evolución lineal continua de la matrícula nacional año por año durante 25 gestiones escolares"
                series={progresionConsolidadaLineSeries}
                unit="estudiantes"
                height={300}
                showArea={true}
              />
            </div>

            {/* Gráfico de Proporción Territorial Consolidada: Matrícula Rural vs Urbana (2025) */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
              <div className="min-w-0">
                <PieChart
                  title="Matrícula Rural vs Urbana (Gestión 2025)"
                  subtitle="Proporción territorial consolidada campo / ciudad a nivel nacional"
                  data={ruralUrbanaPieData}
                  donut={true}
                  unit="estudiantes"
                />
              </div>
              <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#c9a751]" />
                    <h3 className="text-sm font-semibold text-slate-900 tracking-tight">
                      Resumen del Balance Territorial Escolar (2025)
                    </h3>
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed mb-4">
                    La matrícula urbana concentra la mayor cantidad del sistema escolar regular en las capitales y ciudades intermedias, mientras que el subsistema rural representa el núcleo de atención de las ESFM en provincias y áreas de frontera.
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-3 pt-3 border-t border-slate-100 text-xs">
                  <div className="bg-slate-50 rounded-xl p-3 border border-slate-200/70">
                    <span className="text-[10px] text-slate-400 block font-medium uppercase">Área Urbana</span>
                    <strong className="text-sm font-semibold text-slate-900 block mt-0.5">
                      {cleanRuralUrbana.mapUrb.get(2025)?.toLocaleString('es-BO') || 0}
                    </strong>
                    <span className="text-[10px] text-[#c9a751] font-medium">alumnos registrados</span>
                  </div>
                  <div className="bg-slate-50 rounded-xl p-3 border border-slate-200/70">
                    <span className="text-[10px] text-slate-400 block font-medium uppercase">Área Rural</span>
                    <strong className="text-sm font-semibold text-slate-900 block mt-0.5">
                      {cleanRuralUrbana.mapRur.get(2025)?.toLocaleString('es-BO') || 0}
                    </strong>
                    <span className="text-[10px] text-emerald-700 font-medium">alumnos registrados</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          PESTAÑA 2: COMPARATIVO AÑO A AÑO (MATRIZ INTERANUAL RURAL - URBANA)
         ========================================================================= */}
      {activeTab === 'comparativo_anual' && (
        <div className="space-y-6">
          <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-5 border-b border-slate-100 pb-4">
              <div>
                <h3 className="text-lg font-semibold text-slate-900 tracking-tight">
                  Matriz Interanual: Cuánto Crece la Matrícula Escolar Año por Año (2000 - 2025)
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Serie histórica censal del SIE con variación absoluta anual (+/- estudiantes), tasa de crecimiento (%) y distribución urbana vs rural.
                </p>
              </div>
              <div className="flex items-center gap-3 text-xs">
                <div className="flex items-center gap-1.5 font-medium text-slate-700">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#c9a751]"></span>
                  <span>Área Urbana</span>
                </div>
                <div className="flex items-center gap-1.5 font-medium text-slate-700">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#059669]"></span>
                  <span>Área Rural</span>
                </div>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-medium uppercase text-[11px]">
                    <th className="py-3 px-3">Gestión</th>
                    <th className="py-3 px-3 text-right">Matrícula Total</th>
                    <th className="py-3 px-3 text-center">Variación Anual</th>
                    <th className="py-3 px-3 text-right">Tasa Crecimiento (%)</th>
                    <th className="py-3 px-3 text-right text-[#c9a751]">Matrícula Urbana</th>
                    <th className="py-3 px-3 text-center text-slate-500">% Urbano</th>
                    <th className="py-3 px-3 text-right text-emerald-800">Matrícula Rural</th>
                    <th className="py-3 px-3 text-center text-slate-500">% Rural</th>
                    <th className="py-3 px-3 text-right text-slate-700">Brecha Urbano - Rural</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {comparativoAnualRuralUrbana.map((row, idx) => (
                    <tr key={row.anio} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-3 font-medium text-slate-900 text-sm">
                        {row.anio}
                      </td>
                      <td className="py-3 px-3 text-right font-semibold text-slate-900 text-sm">
                        {row.total.toLocaleString('es-BO')}
                      </td>
                      <td className="py-3 px-3 text-center">
                        {idx === 0 ? (
                          <span className="text-[10px] text-slate-400 font-medium">Año base censal</span>
                        ) : (
                          <span
                            className={`font-medium px-2 py-0.5 rounded text-[11px] ${row.diff >= 0
                              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                              : 'bg-rose-50 text-rose-800 border border-rose-200'
                              }`}
                          >
                            {row.diff >= 0 ? `+${row.diff.toLocaleString('es-BO')}` : row.diff.toLocaleString('es-BO')}
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-3 text-right">
                        {idx === 0 ? (
                          <span className="text-slate-400">-</span>
                        ) : (
                          <span
                            className={`font-semibold text-xs ${row.growthRate >= 0 ? 'text-emerald-700' : 'text-rose-700'
                              }`}
                          >
                            {row.growthRate >= 0 ? `+${row.growthRate}%` : `${row.growthRate}%`}
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-3 text-right font-medium text-[#c9a751]">
                        {row.urb.toLocaleString('es-BO')}
                      </td>
                      <td className="py-3 px-3 text-center text-xs font-semibold text-slate-600">
                        {row.pctUrbana}%
                      </td>
                      <td className="py-3 px-3 text-right font-medium text-emerald-800">
                        {row.rur.toLocaleString('es-BO')}
                      </td>
                      <td className="py-3 px-3 text-center text-xs font-semibold text-slate-600">
                        {row.pctRural}%
                      </td>
                      <td className="py-3 px-3 text-right text-xs font-semibold text-slate-700">
                        +{row.brecha.toLocaleString('es-BO')}
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
          PESTAÑA 3: DESGLOSE Y COMPARADOR DEPARTAMENTAL SIE 2026
         ========================================================================= */}
      {activeTab === 'departamentos' && (
        <div className="space-y-6">
          <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs">
            {/* Cabecera con Buscador y Selector de Modo */}
            <div className="mb-5 border-b border-slate-100 pb-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[10px] font-semibold uppercase tracking-wider bg-[#faf5e8] text-[#c9a751] border border-[#e5d5a6] px-2 py-0.5 rounded">
                    Gestión Oficial 2026
                  </span>
                  <span className="text-xs font-semibold text-slate-500">
                    9 Departamentos de Bolivia
                  </span>
                </div>
                <h3 className="text-lg font-semibold text-slate-900 tracking-tight">
                  Distribución y Comparativa Territorial de Estudiantes (SIE 2026)
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Análisis desagregado por departamento con comparador interactivo entre regiones y sectores.
                </p>
              </div>

              {/* Selector de Modo */}
              <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs font-medium self-start md:self-auto shrink-0">
                <button
                  onClick={() => setViewModeDept('tarjetas')}
                  className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
                    viewModeDept === 'tarjetas'
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <GridIcon size={14} className={viewModeDept === 'tarjetas' ? 'text-slate-900' : 'text-slate-400'} />
                  <span>Vista Cuadrícula</span>
                </button>
                <button
                  onClick={() => setViewModeDept('comparador')}
                  className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
                    viewModeDept === 'comparador'
                      ? 'bg-[#c9a751] text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <ScaleIcon size={14} className={viewModeDept === 'comparador' ? 'text-slate-900' : 'text-[#c9a751]'} />
                  <span>Modo Comparador ({selectedCompareDepts.length})</span>
                </button>
              </div>
            </div>

            {/* Barra de Búsqueda y Filtro Rápido */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 mb-5 pb-3 border-b border-slate-100">
              <div className="relative min-w-[240px] max-w-sm">
                <input
                  type="text"
                  placeholder="Buscar departamento..."
                  value={deptSearchTerm}
                  onChange={(e) => setDeptSearchTerm(e.target.value)}
                  className="w-full text-xs px-3 py-1.5 pl-8 rounded-lg border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#c9a751]"
                />
                <SearchIcon size={14} className="absolute left-2.5 top-2.5 text-slate-400 pointer-events-none" />
                {deptSearchTerm && (
                  <button
                    onClick={() => setDeptSearchTerm('')}
                    className="absolute right-2.5 top-2 text-slate-400 hover:text-slate-600"
                    aria-label="Limpiar búsqueda"
                  >
                    <XIcon size={13} />
                  </button>
                )}
              </div>

              {viewModeDept === 'comparador' && (
                <div className="flex items-center gap-1.5 flex-wrap text-xs">
                  <span className="text-slate-400 text-[11px] font-medium mr-1">Preajustes:</span>
                  <button
                    onClick={() => setSelectedCompareDepts(departamentosSIE.map((d) => d.nombre))}
                    className="px-2.5 py-1 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 transition-colors"
                  >
                    Todos (9)
                  </button>
                  <button
                    onClick={() => setSelectedCompareDepts(['La Paz', 'Santa Cruz', 'Cochabamba'])}
                    className="px-2.5 py-1 rounded-lg border border-[#c9a751]/30 bg-[#c9a751]/10 text-[#c9a751] hover:bg-[#c9a751]/20 transition-colors"
                  >
                    Eje Central
                  </button>
                  <button
                    onClick={() => setSelectedCompareDepts(['La Paz'])}
                    className="px-2.5 py-1 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-500 transition-colors"
                  >
                    Limpiar
                  </button>
                </div>
              )}
            </div>

            {/* VISTA 1: MODO COMPARADOR DIRECTO */}
            {viewModeDept === 'comparador' ? (
              <div className="space-y-6">
                {/* Selector multi-departamento con pills interactivas */}
                <div className="bg-slate-50/80 rounded-xl p-3 border border-slate-200/90">
                  <div className="text-[11px] font-medium text-slate-500 mb-2">
                    Seleccione los departamentos a contrastar cara a cara:
                  </div>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {departamentosSIE.map((dept) => {
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
                          className={`text-xs px-3 py-1.5 rounded-lg border transition-all flex items-center gap-2 ${
                            isSelected
                              ? 'bg-[#c9a751] text-slate-900 border-[#c9a751] shadow-xs'
                              : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100 opacity-60'
                          }`}
                        >
                          <span className={`w-2 h-2 rounded-full ${isSelected ? 'bg-slate-900' : 'bg-slate-300'}`} />
                          <span className="font-medium">{dept.nombre}</span>
                          <span className="text-[10px] opacity-80">
                            ({dept.total.toLocaleString('es-BO')})
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Gráfico Comparativo Visual de Barras */}
                <BarVisual
                  title="Matrícula Total por Departamento en Comparación (SIE 2026)"
                  subtitle={`Comparativa directa de volumen estudiantil entre los ${selectedCompareDepts.length} departamentos seleccionados`}
                  items={departamentosSIE
                    .filter((d) => selectedCompareDepts.includes(d.nombre))
                    .map((d) => ({
                      label: d.nombre,
                      value: d.total,
                      sublabel: `${d.pctNacional}% nacional · ${d.pctPublico}% fiscal · ${d.pctPrivado}% particular`,
                      badge: `${d.pctNacional}% Nac.`,
                    }))}
                  unit="estudiantes"
                  colorTheme="amber"
                  defaultExpanded={true}
                />

                {/* Tabla Comparativa Exhaustiva */}
                <div className="overflow-x-auto rounded-xl border border-slate-200">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-medium uppercase text-[11px]">
                        <th className="py-3 px-3">Departamento</th>
                        <th className="py-3 px-3 text-right">Total Estudiantes</th>
                        <th className="py-3 px-3 text-center">Part. Nacional</th>
                        <th className="py-3 px-3 text-right">Sector Público</th>
                        <th className="py-3 px-3 text-right">Sector Privado</th>
                        <th className="py-3 px-3 text-right">Nivel Primaria</th>
                        <th className="py-3 px-3 text-right">Nivel Secundaria</th>
                        <th className="py-3 px-3 text-right">Nivel Inicial</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {departamentosSIE
                        .filter((d) => selectedCompareDepts.includes(d.nombre))
                        .map((dept) => (
                          <tr key={dept.nombre} className="hover:bg-slate-50/80 transition-colors">
                            <td className="py-3 px-3 font-semibold text-slate-900">
                              {dept.nombre}
                            </td>
                            <td className="py-3 px-3 text-right font-semibold text-slate-900">
                              {dept.total.toLocaleString('es-BO')}
                            </td>
                            <td className="py-3 px-3 text-center font-medium text-[#c9a751]">
                              <span className="px-2 py-0.5 rounded bg-[#c9a751]/10 border border-[#c9a751]/30">
                                {dept.pctNacional}%
                              </span>
                            </td>
                            <td className="py-3 px-3 text-right font-medium text-emerald-700">
                              {dept.publico.toLocaleString('es-BO')}{' '}
                              <span className="text-[10px] text-slate-400">({dept.pctPublico}%)</span>
                            </td>
                            <td className="py-3 px-3 text-right font-medium text-slate-600">
                              {dept.privado.toLocaleString('es-BO')}{' '}
                              <span className="text-[10px] text-slate-400">({dept.pctPrivado}%)</span>
                            </td>
                            <td className="py-3 px-3 text-right font-medium text-slate-700">
                              {dept.primaria.toLocaleString('es-BO')}
                            </td>
                            <td className="py-3 px-3 text-right font-medium text-blue-700">
                              {dept.secundaria.toLocaleString('es-BO')}
                            </td>
                            <td className="py-3 px-3 text-right font-medium text-amber-700">
                              {dept.inicial.toLocaleString('es-BO')}
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              /* VISTA 2: CUADRÍCULA DE TARJETAS DEPARTAMENTALES */
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {departamentosSIE
                  .filter((d) => d.nombre.toLowerCase().includes(deptSearchTerm.toLowerCase()))
                  .map((dept, index) => (
                    <div
                      key={dept.nombre}
                      className="bg-slate-50/70 rounded-xl border border-slate-200 p-4 hover:border-[#c9a751] hover:bg-white transition-all shadow-2xs flex flex-col justify-between"
                    >
                      <div>
                        <div className="flex items-start justify-between gap-2 mb-3">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="w-5 h-5 rounded-full bg-[#faf5e8] text-[#c9a751] border border-[#e5d5a6] flex items-center justify-center font-semibold text-[11px]">
                                {index + 1}
                              </span>
                              <h4 className="font-semibold text-slate-900 text-sm">{dept.nombre}</h4>
                            </div>
                            <span className="text-[11px] text-slate-500 mt-0.5 block">
                              Representa el <strong className="text-slate-800">{dept.pctNacional}%</strong> del total nacional
                            </span>
                          </div>
                          <div className="text-right">
                            <div className="font-semibold text-slate-900 text-base">
                              {dept.total.toLocaleString('es-BO')}
                            </div>
                            <span className="text-[10px] uppercase tracking-wider text-slate-400 font-medium">
                              alumnos
                            </span>
                          </div>
                        </div>

                        {/* Barra de progreso de participación nacional */}
                        <div className="w-full bg-slate-200 rounded-full h-1.5 mb-3 overflow-hidden">
                          <div
                            className="bg-[#c9a751] h-1.5 rounded-full"
                            style={{ width: `${Math.min(dept.pctNacional * 3, 100)}%` }}
                          />
                        </div>

                        {/* Comparativo Público vs Privado */}
                        <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-200/80 text-[11px]">
                          <div className="bg-white rounded-lg p-2 border border-slate-200/60">
                            <span className="text-slate-500 block text-[10px] font-semibold">Sector Público</span>
                            <span className="font-medium text-slate-900">
                              {dept.publico.toLocaleString('es-BO')}
                            </span>
                            <span className="text-[10px] text-[#c9a751] font-semibold ml-1">
                              ({dept.pctPublico}%)
                            </span>
                          </div>
                          <div className="bg-white rounded-lg p-2 border border-slate-200/60">
                            <span className="text-slate-500 block text-[10px] font-semibold">Sector Privado</span>
                            <span className="font-medium text-slate-900">
                              {dept.privado.toLocaleString('es-BO')}
                            </span>
                            <span className="text-[10px] text-slate-500 font-semibold ml-1">
                              ({dept.pctPrivado}%)
                            </span>
                          </div>
                        </div>

                        {/* Desglose Niveles */}
                        <div className="mt-2.5 pt-2 border-t border-slate-200/60 flex items-center justify-between text-[10px] text-slate-600">
                          <span>Prim: <strong>{dept.primaria.toLocaleString('es-BO')}</strong></span>
                          <span>Sec: <strong>{dept.secundaria.toLocaleString('es-BO')}</strong></span>
                          <span>Inic: <strong>{dept.inicial.toLocaleString('es-BO')}</strong></span>
                        </div>
                      </div>

                      {/* Botón rápido para comparar */}
                      <div className="mt-3 pt-2.5 border-t border-slate-200/70 flex justify-end">
                        <button
                          onClick={() => {
                            if (!selectedCompareDepts.includes(dept.nombre)) {
                              setSelectedCompareDepts([...selectedCompareDepts, dept.nombre]);
                            }
                            setViewModeDept('comparador');
                          }}
                          className="text-[11px] font-medium text-[#c9a751] hover:text-slate-900 flex items-center gap-1.5 transition-colors"
                        >
                          <ScaleIcon size={13} className="text-[#c9a751]" />
                          <span>Comparar departamento</span>
                        </button>
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* =========================================================================
          PESTAÑA 4: TABLAS DE REGISTROS CENSALES
         ========================================================================= */}
      {activeTab === 'tablas' && (
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
          <div className="flex items-center gap-2 mb-4 border-b border-slate-200 pb-3">
            <button
              onClick={() => setActiveSubTab('sie2026')}
              className={`text-xs font-medium px-3.5 py-1.5 rounded-lg transition-colors ${activeSubTab === 'sie2026'
                ? 'bg-[#c9a751] text-slate-900 shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
            >
              Estudiantes SIE 2026 ({data.sie_total_estudiantes.length} registros)
            </button>
            <button
              onClick={() => setActiveSubTab('rural_urbana')}
              className={`text-xs font-medium px-3.5 py-1.5 rounded-lg transition-colors ${activeSubTab === 'rural_urbana'
                ? 'bg-[#c9a751] text-slate-900 shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
            >
              Matrícula Rural y Urbana 2000-2025 ({data.matricula_rural_urbana.length} registros)
            </button>
          </div>

          {activeSubTab === 'sie2026' && (
            <DataTable
              title="Estadística Censal SIE 2026 por Departamento y Dependencia"
              subtitle="Detalle de cantidades desagregadas por nivel, ciclo y departamento escolar"
              data={data.sie_total_estudiantes}
              columns={sieColumns}
              searchPlaceholder="Buscar por departamento, dependencia o nivel..."
              searchFilter={(row, term) =>
                (row.departamentos?.nombre || '').toLowerCase().includes(term) ||
                (row.dependencia || '').toLowerCase().includes(term) ||
                (row.nivel_texto || '').toLowerCase().includes(term)
              }
            />
          )}

          {activeSubTab === 'rural_urbana' && (
            <DataTable
              title="Serie Histórica Rural vs Urbana (2000 - 2025)"
              subtitle="Evolución de la concentración estudiantil en el campo y la ciudad"
              data={data.matricula_rural_urbana}
              columns={[
                { key: 'anio', header: 'Año', width: 'w-24', align: 'center' },
                {
                  key: 'area',
                  header: 'Área Territorial',
                  render: (r) => (
                    <span
                      className={`px-2.5 py-0.5 rounded text-xs font-semibold ${r.area.toLowerCase().includes('urb')
                        ? 'bg-[#faf5e8] text-[#c9a751] border border-[#e5d5a6]'
                        : 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                        }`}
                    >
                      {r.area}
                    </span>
                  ),
                },
                {
                  key: 'cantidad',
                  header: 'Estudiantes',
                  align: 'right',
                  render: (r) => (
                    <span className="font-medium text-slate-900">
                      {r.cantidad.toLocaleString('es-BO')}
                    </span>
                  ),
                },
              ]}
              searchPlaceholder="Buscar por año o área..."
            />
          )}
        </div>
      )}

      {/* Ficha Técnica Institucional SIE */}
      <SourceBadge
        sourceName="SIE · Sistema de Información Educativa"
        institutionTitle="Ministerio de Educación del Estado Plurinacional de Bolivia"
        methodology="Registros censales del operativo estadístico de inicio de gestión escolar reportados directamente por las Direcciones Departamentales de Educación (DDE) y Direcciones Distritales en coordinación con la Dirección General de Planificación."
        links={[
          {
            title: 'Portal Oficial Ministerio de Educación',
            url: 'https://www.minedu.gob.bo/',
            institution: 'Ministerio de Educación',
            period: '2000-2026',
          },
        ]}
      />
    </div>
  );
}
