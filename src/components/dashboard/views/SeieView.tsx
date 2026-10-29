'use client';

import React, { useState, useMemo } from 'react';
import { DashboardDataset, SeieDiscapacidadArea, SeieDiscapacidadDependencia, SieDiscapacidad2026 } from '@/types/stats';
import { StatCard } from '../StatCard';
import { TrendLineChart, TrendSeries } from '../TrendLineChart';
import { PieChart, PieSlice } from '../PieChart';
import { YearProgression } from '../YearProgression';
import { DataTable, ColumnDef } from '../DataTable';
import { SourceBadge } from '../SourceBadge';
import {
  AccessibilityIcon,
  UsersIcon,
  TrendingUpIcon,
  CalendarIcon,
  MapPinIcon,
  ChartBarIcon,
  ScaleIcon,
  GridIcon,
  BuildingIcon,
  SchoolIcon,
} from '../../ui/Icons';

interface SeieViewProps {
  data: DashboardDataset;
}

export function SeieView({ data }: SeieViewProps) {
  const [activeTab, setActiveTab] = useState<'lineas' | 'departamentos' | 'gestion_2026' | 'comparativo_anual' | 'tablas'>('lineas');

  // Filtros pestaña tendencias
  const [lineDeptId, setLineDeptId] = useState<number | 'all'>('all');
  const [lineDimension, setLineDimension] = useState<'area' | 'dependencia'>('area');
  const [lineAreaFilter, setLineAreaFilter] = useState<'all' | 'urbana' | 'rural'>('all');
  const [lineDepFilter, setLineDepFilter] = useState<'all' | 'fiscal' | 'privada'>('all');

  // Filtros pestaña departamentos
  const [selectedGestionDept, setSelectedGestionDept] = useState<number>(2025);
  const [chartModeDept, setChartModeDept] = useState<'detalle' | 'comparador'>('comparador');
  const [selectedDeptId, setSelectedDeptId] = useState<number | 'all'>('all');
  const [selectedCompareDepts, setSelectedCompareDepts] = useState<number[]>([1, 2, 3, 7]); // Chuquisaca, La Paz, Cbba, SCZ

  // Filtros pestaña gestión 2026
  const [sie2026DeptId, setSie2026DeptId] = useState<number | 'all'>('all');
  const [sie2026Dependencia, setSie2026Dependencia] = useState<'all' | 'FISCAL' | 'CONVENIO'>('all');

  // Filtros pestaña tablas
  const [activeTableDataset, setActiveTableDataset] = useState<'sie2026' | 'area' | 'dependencia'>('sie2026');

  // Mapa de nombres de departamento por id
  const deptMap = useMemo(() => {
    const map = new Map<number, string>();
    data.departamentos.forEach((d) => map.set(d.id, d.nombre));
    return map;
  }, [data.departamentos]);

  // Lista de departamentos ordenada
  const deptList = useMemo(() => {
    return [...data.departamentos].sort((a, b) => a.id - b.id);
  }, [data.departamentos]);

  // Gestiones disponibles en SEIE (2011 - 2025)
  const availableYears = useMemo(() => {
    const years = new Set<number>();
    (data.seie_discapacidad_area || []).forEach((r) => years.add(r.anio));
    return Array.from(years).sort((a, b) => a - b);
  }, [data.seie_discapacidad_area]);

  // =========================================================================
  // 1. CÁLCULOS GLOBALES PARA KPIS
  // =========================================================================
  const kpiStats = useMemo(() => {
    const areaRows = data.seie_discapacidad_area || [];
    const sieRows = data.sie_discapacidad_2026 || [];

    // Matrícula 2025
    const rows2025 = areaRows.filter((r) => r.anio === 2025);
    const total2025 = rows2025.reduce((acc, r) => acc + r.cantidad, 0);
    const urbana2025 = rows2025.filter((r) => r.area.toLowerCase().includes('urb')).reduce((acc, r) => acc + r.cantidad, 0);
    const rural2025 = rows2025.filter((r) => r.area.toLowerCase().includes('rur')).reduce((acc, r) => acc + r.cantidad, 0);

    // Matrícula 2011
    const rows2011 = areaRows.filter((r) => r.anio === 2011);
    const total2011 = rows2011.reduce((acc, r) => acc + r.cantidad, 0);
    const crecimientoPct = total2011 > 0 ? (((total2025 - total2011) / total2011) * 100).toFixed(1) : '0';

    // Matrícula 2026 Educación Especial (SIE)
    const total2026 = sieRows.reduce((acc, r) => acc + r.cantidad, 0);
    const fiscal2026 = sieRows.filter((r) => r.dependencia.toUpperCase() === 'FISCAL').reduce((acc, r) => acc + r.cantidad, 0);
    const convenio2026 = sieRows.filter((r) => r.dependencia.toUpperCase() === 'CONVENIO').reduce((acc, r) => acc + r.cantidad, 0);

    return {
      total2025,
      total2011,
      crecimientoPct,
      urbana2025,
      rural2025,
      total2026,
      fiscal2026,
      convenio2026,
    };
  }, [data.seie_discapacidad_area, data.sie_discapacidad_2026]);

  // =========================================================================
  // 2. SERIES TEMPORALES HISTÓRICAS (2011 - 2025) CON FILTRO DEPARTAMENTAL
  // =========================================================================
  const lineChartSeries: TrendSeries[] = useMemo(() => {
    const years = availableYears;
    const series: TrendSeries[] = [];

    if (lineDimension === 'area') {
      const areaRows = data.seie_discapacidad_area || [];
      const filtered = lineDeptId === 'all' ? areaRows : areaRows.filter((r) => r.departamento_id === lineDeptId);

      const mapUrb = new Map<number, number>();
      const mapRur = new Map<number, number>();
      const mapTot = new Map<number, number>();

      filtered.forEach((r) => {
        const isUrb = (r.area || '').toLowerCase().includes('urb');
        if (isUrb) {
          mapUrb.set(r.anio, (mapUrb.get(r.anio) || 0) + r.cantidad);
        } else {
          mapRur.set(r.anio, (mapRur.get(r.anio) || 0) + r.cantidad);
        }
        mapTot.set(r.anio, (mapTot.get(r.anio) || 0) + r.cantidad);
      });

      if (lineAreaFilter === 'all' || lineAreaFilter === 'urbana') {
        series.push({
          id: 'urbana',
          name: 'Área Urbana',
          color: '#c9a751',
          data: years.map((y) => ({ year: y, value: mapUrb.get(y) || 0 })),
        });
      }

      if (lineAreaFilter === 'all' || lineAreaFilter === 'rural') {
        series.push({
          id: 'rural',
          name: 'Área Rural',
          color: '#059669',
          data: years.map((y) => ({ year: y, value: mapRur.get(y) || 0 })),
        });
      }

      if (lineAreaFilter === 'all') {
        series.push({
          id: 'total',
          name: 'Total Consolidado',
          color: '#1e293b',
          data: years.map((y) => ({ year: y, value: mapTot.get(y) || 0 })),
        });
      }
    } else {
      // Dependencia: Fiscal vs Privada
      const depRows = data.seie_discapacidad_dependencia || [];
      const filtered = lineDeptId === 'all' ? depRows : depRows.filter((r) => r.departamento_id === lineDeptId);

      const mapFisc = new Map<number, number>();
      const mapPriv = new Map<number, number>();
      const mapTot = new Map<number, number>();

      filtered.forEach((r) => {
        const isFisc = (r.dependencia || '').toLowerCase().includes('fisc');
        if (isFisc) {
          mapFisc.set(r.anio, (mapFisc.get(r.anio) || 0) + r.cantidad);
        } else {
          mapPriv.set(r.anio, (mapPriv.get(r.anio) || 0) + r.cantidad);
        }
        mapTot.set(r.anio, (mapTot.get(r.anio) || 0) + r.cantidad);
      });

      if (lineDepFilter === 'all' || lineDepFilter === 'fiscal') {
        series.push({
          id: 'fiscal',
          name: 'Dependencia Fiscal',
          color: '#2563eb',
          data: years.map((y) => ({ year: y, value: mapFisc.get(y) || 0 })),
        });
      }

      if (lineDepFilter === 'all' || lineDepFilter === 'privada') {
        series.push({
          id: 'privada',
          name: 'Dependencia Privada',
          color: '#e11d48',
          data: years.map((y) => ({ year: y, value: mapPriv.get(y) || 0 })),
        });
      }

      if (lineDepFilter === 'all') {
        series.push({
          id: 'total',
          name: 'Total Consolidado',
          color: '#1e293b',
          data: years.map((y) => ({ year: y, value: mapTot.get(y) || 0 })),
        });
      }
    }

    return series;
  }, [availableYears, lineDimension, lineDeptId, lineAreaFilter, lineDepFilter, data.seie_discapacidad_area, data.seie_discapacidad_dependencia]);

  // Progresión consolidada de la vista lineal seleccionada
  const progressionData = useMemo(() => {
    const areaRows = data.seie_discapacidad_area || [];
    const filtered = lineDeptId === 'all' ? areaRows : areaRows.filter((r) => r.departamento_id === lineDeptId);
    const mapTot = new Map<number, number>();

    filtered.forEach((r) => {
      mapTot.set(r.anio, (mapTot.get(r.anio) || 0) + r.cantidad);
    });

    return availableYears.map((y) => ({
      year: y,
      value: mapTot.get(y) || 0,
    }));
  }, [availableYears, lineDeptId, data.seie_discapacidad_area]);

  // Tasa de Crecimiento Interanual (%) (2012 - 2025)
  const seieTasaCrecimientoSeries: TrendSeries[] = useMemo(() => {
    const areaRows = data.seie_discapacidad_area || [];
    const filtered = lineDeptId === 'all' ? areaRows : areaRows.filter((r) => r.departamento_id === lineDeptId);
    const mapTot = new Map<number, number>();
    filtered.forEach((r) => mapTot.set(r.anio, (mapTot.get(r.anio) || 0) + r.cantidad));

    const dataTot: { year: number; value: number }[] = [];
    for (let i = 1; i < availableYears.length; i++) {
      const y = availableYears[i];
      const prevY = availableYears[i - 1];
      const tot = mapTot.get(y) || 0;
      const prevTot = mapTot.get(prevY) || 1;
      const rate = prevTot > 0 ? Math.round(((tot - prevTot) / prevTot) * 1000) / 10 : 0;
      dataTot.push({ year: y, value: rate });
    }

    return [
      { id: 'tasa_tot', name: 'Tasa Variación Interanual (%)', color: '#c9a751', data: dataTot },
    ];
  }, [availableYears, lineDeptId, data.seie_discapacidad_area]);

  // =========================================================================
  // 3. ESTRUCTURA DEPARTAMENTAL POR GESTIÓN SELECCIONADA (DATOS REALES)
  // =========================================================================
  const departamentalStats = useMemo(() => {
    const areaRows = (data.seie_discapacidad_area || []).filter((r) => r.anio === selectedGestionDept);
    const depRows = (data.seie_discapacidad_dependencia || []).filter((r) => r.anio === selectedGestionDept);

    const nationalTotal = areaRows.reduce((acc, r) => acc + r.cantidad, 0);

    return deptList.map((dept) => {
      const deptAreaRows = areaRows.filter((r) => r.departamento_id === dept.id);
      const deptDepRows = depRows.filter((r) => r.departamento_id === dept.id);

      const urbana = deptAreaRows.filter((r) => r.area.toLowerCase().includes('urb')).reduce((acc, r) => acc + r.cantidad, 0);
      const rural = deptAreaRows.filter((r) => r.area.toLowerCase().includes('rur')).reduce((acc, r) => acc + r.cantidad, 0);
      const totalDept = urbana + rural;

      const fiscal = deptDepRows.filter((r) => r.dependencia.toLowerCase().includes('fisc')).reduce((acc, r) => acc + r.cantidad, 0);
      const privada = deptDepRows.filter((r) => r.dependencia.toLowerCase().includes('priv')).reduce((acc, r) => acc + r.cantidad, 0);

      const pctNacional = nationalTotal > 0 ? Number(((totalDept / nationalTotal) * 100).toFixed(1)) : 0;
      const pctUrbana = totalDept > 0 ? Number(((urbana / totalDept) * 100).toFixed(1)) : 0;
      const pctRural = totalDept > 0 ? Number(((rural / totalDept) * 100).toFixed(1)) : 0;
      const pctFiscal = totalDept > 0 ? Number(((fiscal / totalDept) * 100).toFixed(1)) : 0;
      const pctPrivada = totalDept > 0 ? Number(((privada / totalDept) * 100).toFixed(1)) : 0;

      return {
        id: dept.id,
        nombre: dept.nombre,
        totalDept,
        urbana,
        rural,
        fiscal,
        privada,
        pctNacional,
        pctUrbana,
        pctRural,
        pctFiscal,
        pctPrivada,
        brechaTerritorial: urbana - rural,
      };
    }).sort((a, b) => b.totalDept - a.totalDept);
  }, [data.seie_discapacidad_area, data.seie_discapacidad_dependencia, selectedGestionDept, deptList]);

  // Departamento activo para vista individual en pestaña departamental
  const activeDeptStat = useMemo(() => {
    if (selectedDeptId === 'all') return null;
    return departamentalStats.find((d) => d.id === selectedDeptId) || null;
  }, [selectedDeptId, departamentalStats]);

  // Departamentos activos para comparación
  const compareDeptsStats = useMemo(() => {
    return departamentalStats.filter((d) => selectedCompareDepts.includes(d.id));
  }, [departamentalStats, selectedCompareDepts]);

  // Series comparativas para TrendLineChart
  const compareTrendSeries: TrendSeries[] = useMemo(() => {
    if (compareDeptsStats.length === 0) return [];
    return [
      {
        id: 'total',
        name: 'Total Estudiantes',
        color: '#1e293b',
        data: compareDeptsStats.map((d, i) => ({ year: i + 1, value: d.totalDept })),
      },
      {
        id: 'urbana',
        name: 'Área Urbana',
        color: '#c9a751',
        data: compareDeptsStats.map((d, i) => ({ year: i + 1, value: d.urbana })),
      },
      {
        id: 'rural',
        name: 'Área Rural',
        color: '#059669',
        data: compareDeptsStats.map((d, i) => ({ year: i + 1, value: d.rural })),
      },
      {
        id: 'fiscal',
        name: 'Sector Fiscal',
        color: '#2563eb',
        data: compareDeptsStats.map((d, i) => ({ year: i + 1, value: d.fiscal })),
      },
      {
        id: 'privada',
        name: 'Sector Privado',
        color: '#e11d48',
        data: compareDeptsStats.map((d, i) => ({ year: i + 1, value: d.privada })),
      },
    ];
  }, [compareDeptsStats]);

  // =========================================================================
  // 4. DATOS SIE EDUCACIÓN ESPECIAL GESTIÓN 2026
  // =========================================================================
  const sie2026Aggregates = useMemo(() => {
    const raw = data.sie_discapacidad_2026 || [];
    let filtered = raw;

    if (sie2026DeptId !== 'all') {
      filtered = filtered.filter((r) => r.departamento_id === sie2026DeptId);
    }
    if (sie2026Dependencia !== 'all') {
      filtered = filtered.filter((r) => r.dependencia.toUpperCase() === sie2026Dependencia);
    }

    const totalStudents = filtered.reduce((acc, r) => acc + r.cantidad, 0);

    // Agrupación por Tipo de Discapacidad
    const typeMap = new Map<string, number>();
    filtered.forEach((r) => {
      const t = r.tipo_discapacidad;
      typeMap.set(t, (typeMap.get(t) || 0) + r.cantidad);
    });

    const byType = Array.from(typeMap.entries())
      .map(([tipo, cantidad]) => ({
        tipo,
        cantidad,
        pct: totalStudents > 0 ? Number(((cantidad / totalStudents) * 100).toFixed(1)) : 0,
      }))
      .sort((a, b) => b.cantidad - a.cantidad);

    // Agrupación por Dependencia (Fiscal vs Convenio)
    const depMap = new Map<string, number>();
    filtered.forEach((r) => {
      const dep = r.dependencia.toUpperCase();
      depMap.set(dep, (depMap.get(dep) || 0) + r.cantidad);
    });

    const byDep = Array.from(depMap.entries()).map(([dep, cantidad]) => ({
      dependencia: dep,
      cantidad,
      pct: totalStudents > 0 ? Number(((cantidad / totalStudents) * 100).toFixed(1)) : 0,
    }));

    // Agrupación por Departamento
    const dMap = new Map<number, number>();
    filtered.forEach((r) => {
      dMap.set(r.departamento_id, (dMap.get(r.departamento_id) || 0) + r.cantidad);
    });

    const byDept = deptList
      .map((d) => ({
        id: d.id,
        nombre: d.nombre,
        cantidad: dMap.get(d.id) || 0,
        pct: totalStudents > 0 ? Number((((dMap.get(d.id) || 0) / totalStudents) * 100).toFixed(1)) : 0,
      }))
      .sort((a, b) => b.cantidad - a.cantidad);

    return {
      totalStudents,
      byType,
      byDep,
      byDept,
    };
  }, [data.sie_discapacidad_2026, sie2026DeptId, sie2026Dependencia, deptList]);

  // Slices de Torta para SIE 2026
  const pieSlicesSie2026Type: PieSlice[] = useMemo(() => {
    const palette = ['#c9a751', '#2563eb', '#059669', '#d97706', '#7c3aed', '#db2777', '#0891b2', '#4b5563', '#ea580c'];
    return sie2026Aggregates.byType.map((item, idx) => ({
      label: item.tipo,
      value: item.cantidad,
      color: palette[idx % palette.length],
      sublabel: `${item.pct}% de la matrícula 2026`,
    }));
  }, [sie2026Aggregates.byType]);

  const pieSlicesSie2026Dep: PieSlice[] = useMemo(() => {
    return [
      {
        label: 'Sector Fiscal',
        value: sie2026Aggregates.byDep.find((d) => d.dependencia === 'FISCAL')?.cantidad || 0,
        color: '#2563eb',
        sublabel: 'Centros fiscales directos del Estado',
      },
      {
        label: 'Sector Convenio',
        value: sie2026Aggregates.byDep.find((d) => d.dependencia === 'CONVENIO')?.cantidad || 0,
        color: '#c9a751',
        sublabel: 'Centros administrados mediante convenio',
      },
    ];
  }, [sie2026Aggregates.byDep]);

  // =========================================================================
  // 5. MATRIZ DE CRECIMIENTO INTERANUAL HISTÓRICA (2011 - 2025)
  // =========================================================================
  const comparativoAnualMatriz = useMemo(() => {
    const areaRows = data.seie_discapacidad_area || [];
    const depRows = data.seie_discapacidad_dependencia || [];

    let prevTotal = 0;

    return availableYears.map((anio, idx) => {
      const aRows = areaRows.filter((r) => r.anio === anio);
      const dRows = depRows.filter((r) => r.anio === anio);

      const urb = aRows.filter((r) => r.area.toLowerCase().includes('urb')).reduce((acc, r) => acc + r.cantidad, 0);
      const rur = aRows.filter((r) => r.area.toLowerCase().includes('rur')).reduce((acc, r) => acc + r.cantidad, 0);
      const total = urb + rur;

      const fisc = dRows.filter((r) => r.dependencia.toLowerCase().includes('fisc')).reduce((acc, r) => acc + r.cantidad, 0);
      const priv = dRows.filter((r) => r.dependencia.toLowerCase().includes('priv')).reduce((acc, r) => acc + r.cantidad, 0);

      const diff = idx === 0 ? 0 : total - prevTotal;
      const growthRate = idx === 0 || prevTotal === 0 ? 0 : Number(((diff / prevTotal) * 100).toFixed(2));
      const pctUrbana = total > 0 ? Number(((urb / total) * 100).toFixed(1)) : 0;
      const pctRural = total > 0 ? Number(((rur / total) * 100).toFixed(1)) : 0;
      const pctFiscal = total > 0 ? Number(((fisc / total) * 100).toFixed(1)) : 0;
      const pctPrivada = total > 0 ? Number(((priv / total) * 100).toFixed(1)) : 0;
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
        fisc,
        priv,
        pctFiscal,
        pctPrivada,
        brecha,
      };
    });
  }, [availableYears, data.seie_discapacidad_area, data.seie_discapacidad_dependencia]);

  // =========================================================================
  // 6. COLUMNAS PARA TABLAS ADMINISTRATIVAS
  // =========================================================================
  const columnsSie2026: ColumnDef<SieDiscapacidad2026>[] = [
    { key: 'departamentos', header: 'Departamento', width: 'w-36', render: (r) => <span className="font-semibold text-slate-900">{r.departamentos?.nombre || deptMap.get(r.departamento_id) || `Depto ${r.departamento_id}`}</span> },
    {
      key: 'tipo_discapacidad',
      header: 'Tipo de Discapacidad',
      render: (r) => (
        <span className="px-2.5 py-0.5 rounded text-xs font-semibold bg-slate-100 text-slate-800 border border-slate-200">
          {r.tipo_discapacidad}
        </span>
      ),
    },
    {
      key: 'dependencia',
      header: 'Dependencia',
      width: 'w-28',
      align: 'center',
      render: (r) => (
        <span
          className={`px-2 py-0.5 rounded text-[11px] font-semibold ${
            r.dependencia.toUpperCase() === 'FISCAL'
              ? 'bg-blue-50 text-blue-800 border border-blue-200'
              : 'bg-[#faf5e8] text-[#c9a751] border border-[#e5d5a6]'
          }`}
        >
          {r.dependencia}
        </span>
      ),
    },
    {
      key: 'cantidad',
      header: 'Estudiantes',
      align: 'right',
      width: 'w-28',
      render: (r) => <span className="font-medium text-slate-900">{r.cantidad.toLocaleString('es-BO')}</span>,
    },
    { key: 'anio', header: 'Gestión', align: 'center', width: 'w-20' },
  ];

  const columnsArea: ColumnDef<SeieDiscapacidadArea>[] = [
    { key: 'anio', header: 'Gestión', align: 'center', width: 'w-20' },
    { key: 'departamentos', header: 'Departamento', width: 'w-36', render: (r) => <span className="font-semibold text-slate-900">{r.departamentos?.nombre || deptMap.get(r.departamento_id) || `Depto ${r.departamento_id}`}</span> },
    {
      key: 'area',
      header: 'Área Territorial',
      render: (r) => (
        <span
          className={`px-2.5 py-0.5 rounded text-xs font-semibold ${
            r.area.toLowerCase().includes('urb')
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
      header: 'Estudiantes Registrados',
      align: 'right',
      render: (r) => <span className="font-medium text-slate-900">{r.cantidad.toLocaleString('es-BO')}</span>,
    },
  ];

  const columnsDependencia: ColumnDef<SeieDiscapacidadDependencia>[] = [
    { key: 'anio', header: 'Gestión', align: 'center', width: 'w-20' },
    { key: 'departamentos', header: 'Departamento', width: 'w-36', render: (r) => <span className="font-semibold text-slate-900">{r.departamentos?.nombre || deptMap.get(r.departamento_id) || `Depto ${r.departamento_id}`}</span> },
    {
      key: 'dependencia',
      header: 'Dependencia Institucional',
      render: (r) => (
        <span
          className={`px-2.5 py-0.5 rounded text-xs font-semibold ${
            r.dependencia.toLowerCase().includes('fisc')
              ? 'bg-blue-50 text-blue-800 border border-blue-200'
              : 'bg-rose-50 text-rose-800 border border-rose-200'
          }`}
        >
          {r.dependencia}
        </span>
      ),
    },
    {
      key: 'cantidad',
      header: 'Estudiantes Registrados',
      align: 'right',
      render: (r) => <span className="font-medium text-slate-900">{r.cantidad.toLocaleString('es-BO')}</span>,
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header Institucional SEIE / SIE */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-xs">
        <div>
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <span className="text-[10px] font-semibold uppercase tracking-wider bg-[#faf5e8] text-[#c9a751] border border-[#e5d5a6] px-2.5 py-0.5 rounded-md">
              SEIE & SIE · Subsistema de Educación Especial
            </span>
            <span className="text-[10px] font-medium text-slate-500">
              Inclusión Educativa Departamental (2011 - 2026)
            </span>
          </div>
          <h1 className="text-2xl font-semibold text-slate-900 tracking-tight">
            Estadísticas Oficiales de Discapacidad y Educación Especial
          </h1>
          <p className="text-xs text-slate-500 mt-1 max-w-3xl">
            Información censal y registros administrativos de matrícula de estudiantes con discapacidad: series históricas por Área Territorial (Urbana / Rural), Dependencia Institucional (Fiscal / Privada / Convenio) y Desglose por Tipo de Discapacidad para los 9 departamentos de Bolivia.
          </p>
        </div>
      </div>

      {/* Pestañas de Navegación de Primer Nivel */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 border-b border-slate-200">
        <button
          onClick={() => setActiveTab('lineas')}
          className={`flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap ${
            activeTab === 'lineas'
              ? 'bg-[#c9a751] text-slate-900 shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <TrendingUpIcon size={16} />
          Tendencias Lineales (2011 - 2025)
        </button>
        <button
          onClick={() => setActiveTab('departamentos')}
          className={`flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap ${
            activeTab === 'departamentos'
              ? 'bg-[#c9a751] text-slate-900 shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <MapPinIcon size={16} />
          Desglose Departamental (2011 - 2025)
        </button>
        <button
          onClick={() => setActiveTab('gestion_2026')}
          className={`flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap ${
            activeTab === 'gestion_2026'
              ? 'bg-[#c9a751] text-slate-900 shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <AccessibilityIcon size={16} />
          Gestión 2026 · Tipos de Discapacidad (SIE)
        </button>
        <button
          onClick={() => setActiveTab('comparativo_anual')}
          className={`flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap ${
            activeTab === 'comparativo_anual'
              ? 'bg-[#c9a751] text-slate-900 shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <CalendarIcon size={16} />
          Matriz Interanual (2011 - 2025)
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
          Bases de Datos y Tablas
        </button>
      </div>

      {/* 4 KPIs Clave */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Matrícula Especial 2025"
          value={kpiStats.total2025}
          subtitle={`+${kpiStats.crecimientoPct}% de crecimiento desde 2011`}
          sourceBadge="SEIE 2025"
          sourceColor="purple"
          icon={<AccessibilityIcon size={22} className="text-[#a08035]" />}
        />
        <StatCard
          title="Área Urbana (2025)"
          value={kpiStats.urbana2025}
          subtitle={`${kpiStats.total2025 > 0 ? ((kpiStats.urbana2025 / kpiStats.total2025) * 100).toFixed(1) : 0}% de cobertura en ciudades`}
          sourceBadge="Urbana"
          sourceColor="purple"
          icon={<BuildingIcon size={22} className="text-[#a08035]" />}
        />
        <StatCard
          title="Área Rural (2025)"
          value={kpiStats.rural2025}
          subtitle={`${kpiStats.total2025 > 0 ? ((kpiStats.rural2025 / kpiStats.total2025) * 100).toFixed(1) : 0}% en distritos y provincias`}
          sourceBadge="Rural"
          sourceColor="purple"
          icon={<UsersIcon size={22} className="text-[#a08035]" />}
        />
        <StatCard
          title="Matrícula SIE 2026"
          value={kpiStats.total2026}
          subtitle={`Fiscal: ${kpiStats.fiscal2026.toLocaleString('es-BO')} · Convenio: ${kpiStats.convenio2026.toLocaleString('es-BO')}`}
          sourceBadge="SIE 2026"
          sourceColor="purple"
          icon={<SchoolIcon size={22} className="text-[#a08035]" />}
        />
      </div>

      {/* =========================================================================
          PESTAÑA 1: TENDENCIAS LINEALES HISTÓRICAS (2011 - 2025)
         ========================================================================= */}
      {activeTab === 'lineas' && (
        <div className="space-y-6">
          {/* Panel de Controles y Filtros */}
          <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs space-y-3">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-[#c9a751]" />
                <h3 className="text-sm font-semibold text-slate-900 tracking-tight">
                  Parámetros de la Serie Histórica
                </h3>
              </div>

              {/* Selector Dimensión: Área vs Dependencia */}
              <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
                <button
                  onClick={() => setLineDimension('area')}
                  className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-all ${
                    lineDimension === 'area'
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Área Territorial (Urbana / Rural)
                </button>
                <button
                  onClick={() => setLineDimension('dependencia')}
                  className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-all ${
                    lineDimension === 'dependencia'
                      ? 'bg-[#c9a751] text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Dependencia (Fiscal / Privada)
                </button>
              </div>
            </div>

            {/* Selector de Departamento y Subfiltro */}
            <div className="pt-2 border-t border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-3 flex-wrap">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-xs font-medium text-slate-600 mr-1">Ámbito Territorial:</span>
                <button
                  onClick={() => setLineDeptId('all')}
                  className={`text-xs px-2.5 py-1 rounded-lg border transition-all ${
                    lineDeptId === 'all'
                      ? 'bg-slate-900 text-white border-slate-900 shadow-xs font-medium'
                      : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  Total Nacional
                </button>
                {deptList.map((d) => (
                  <button
                    key={d.id}
                    onClick={() => setLineDeptId(d.id)}
                    className={`text-xs px-2.5 py-1 rounded-lg border transition-all ${
                      lineDeptId === d.id
                        ? 'bg-[#c9a751] text-slate-900 border-[#c9a751] shadow-xs font-medium'
                        : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    {d.nombre}
                  </button>
                ))}
              </div>

              {/* Subfiltro de serie */}
              {lineDimension === 'area' ? (
                <div className="flex items-center gap-1 bg-slate-50 p-1 rounded-lg border border-slate-200 text-xs">
                  <button
                    onClick={() => setLineAreaFilter('all')}
                    className={`px-2 py-0.5 rounded transition-all ${lineAreaFilter === 'all' ? 'bg-white font-medium text-slate-900 shadow-2xs' : 'text-slate-600'}`}
                  >
                    Ambas Áreas
                  </button>
                  <button
                    onClick={() => setLineAreaFilter('urbana')}
                    className={`px-2 py-0.5 rounded transition-all ${lineAreaFilter === 'urbana' ? 'bg-[#c9a751] font-medium text-slate-900 shadow-2xs' : 'text-slate-600'}`}
                  >
                    Urbana
                  </button>
                  <button
                    onClick={() => setLineAreaFilter('rural')}
                    className={`px-2 py-0.5 rounded transition-all ${lineAreaFilter === 'rural' ? 'bg-emerald-600 font-medium text-white shadow-2xs' : 'text-slate-600'}`}
                  >
                    Rural
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-1 bg-slate-50 p-1 rounded-lg border border-slate-200 text-xs">
                  <button
                    onClick={() => setLineDepFilter('all')}
                    className={`px-2 py-0.5 rounded transition-all ${lineDepFilter === 'all' ? 'bg-white font-medium text-slate-900 shadow-2xs' : 'text-slate-600'}`}
                  >
                    Ambas Dependencias
                  </button>
                  <button
                    onClick={() => setLineDepFilter('fiscal')}
                    className={`px-2 py-0.5 rounded transition-all ${lineDepFilter === 'fiscal' ? 'bg-blue-600 font-medium text-white shadow-2xs' : 'text-slate-600'}`}
                  >
                    Fiscal
                  </button>
                  <button
                    onClick={() => setLineDepFilter('privada')}
                    className={`px-2 py-0.5 rounded transition-all ${lineDepFilter === 'privada' ? 'bg-rose-600 font-medium text-white shadow-2xs' : 'text-slate-600'}`}
                  >
                    Privada
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Gráfico 1 y 2 */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
            <TrendLineChart
              title={`Evolución Histórica de Matrícula Especial (2011 - 2025) · ${lineDeptId === 'all' ? 'Total Nacional' : deptMap.get(lineDeptId)}`}
              subtitle={`Desglose por ${lineDimension === 'area' ? 'Área Territorial' : 'Dependencia'} con datos censales del subsistema SEIE`}
              series={lineChartSeries}
              unit="estudiantes"
              height={320}
              showArea={false}
            />

            <TrendLineChart
              title={`Variación Anual Porcentual (%) · ${lineDeptId === 'all' ? 'Total Nacional' : deptMap.get(lineDeptId)}`}
              subtitle="Crecimiento interanual en la matrícula registrada de Educación Especial"
              series={seieTasaCrecimientoSeries}
              unit="%"
              height={320}
              showArea={false}
            />
          </div>

          {/* Progresión de Gestiones */}
          <YearProgression
            title={`Progresión de Matrícula en Educación Especial (2011 - 2025) · ${lineDeptId === 'all' ? 'Total Nacional' : deptMap.get(lineDeptId)}`}
            subtitle="Comportamiento del subsistema a lo largo de 15 años de registro administrativo"
            data={progressionData}
            unit="estudiantes"
            color="#c9a751"
          />
        </div>
      )}

      {/* =========================================================================
          PESTAÑA 2: DESGLOSE DEPARTAMENTAL (DATOS REALES 2011 - 2025)
         ========================================================================= */}
      {activeTab === 'departamentos' && (
        <div className="space-y-6">
          {/* Header y Filtro de Gestión */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div>
                <h2 className="text-base font-semibold text-slate-900 tracking-tight">
                  Matriz Departamental con Datos Reales (SEIE)
                </h2>
                <p className="text-xs text-slate-500">
                  Desglose real de matrícula urbana, rural, fiscal y privada para cada departamento según la gestión seleccionada.
                </p>
              </div>

              {/* Selector de Gestión */}
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-slate-600">Gestión:</span>
                <select
                  value={selectedGestionDept}
                  onChange={(e) => setSelectedGestionDept(Number(e.target.value))}
                  className="text-xs font-semibold bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 focus:outline-hidden focus:ring-1 focus:ring-[#c9a751] focus:border-[#c9a751] text-slate-900 cursor-pointer"
                >
                  {availableYears.map((y) => (
                    <option key={y} value={y}>
                      Gestión {y}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Switch Modo Detalle vs Comparador */}
            <div className="pt-3 border-t border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div className="flex items-center gap-1.5 flex-wrap">
                <button
                  onClick={() => {
                    setSelectedDeptId('all');
                    setChartModeDept('comparador');
                  }}
                  className={`text-xs px-3 py-1 rounded-lg border transition-all ${
                    selectedDeptId === 'all'
                      ? 'bg-slate-900 text-white border-slate-900 shadow-xs font-medium'
                      : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  Vista Comparativa Todos (9)
                </button>
                {deptList.map((d) => (
                  <button
                    key={d.id}
                    onClick={() => {
                      setSelectedDeptId(d.id);
                      setChartModeDept('detalle');
                    }}
                    className={`text-xs px-2.5 py-1 rounded-lg border transition-all ${
                      selectedDeptId === d.id
                        ? 'bg-[#c9a751] text-slate-900 border-[#c9a751] shadow-xs font-medium'
                        : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    {d.nombre}
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl self-start md:self-auto">
                <button
                  onClick={() => setChartModeDept('comparador')}
                  className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-all flex items-center gap-1.5 ${
                    chartModeDept === 'comparador'
                      ? 'bg-[#c9a751] text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <ScaleIcon size={14} />
                  <span>Comparador</span>
                </button>
                <button
                  onClick={() => setChartModeDept('detalle')}
                  className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-all flex items-center gap-1.5 ${
                    chartModeDept === 'detalle'
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <GridIcon size={14} />
                  <span>Ficha Detalle</span>
                </button>
              </div>
            </div>
          </div>

          {/* MODO COMPARADOR */}
          {chartModeDept === 'comparador' ? (
            <div className="space-y-6">
              {/* Selector Multi-departamento */}
              <div className="bg-slate-50/80 rounded-xl p-3.5 border border-slate-200">
                <div className="flex items-center justify-between gap-2 flex-wrap mb-2">
                  <span className="text-[11px] font-medium text-slate-600">
                    Departamentos en comparación activa ({selectedCompareDepts.length} de 9):
                  </span>
                  <div className="flex items-center gap-1.5 text-xs">
                    <button
                      onClick={() => setSelectedCompareDepts(deptList.map((d) => d.id))}
                      className="px-2 py-0.5 rounded border border-slate-200 bg-white hover:bg-slate-100 text-slate-700 text-[11px]"
                    >
                      Seleccionar Todos (9)
                    </button>
                    <button
                      onClick={() => setSelectedCompareDepts([2, 3, 7])}
                      className="px-2 py-0.5 rounded border border-[#c9a751]/30 bg-[#c9a751]/10 text-[#c9a751] hover:bg-[#c9a751]/20 text-[11px]"
                    >
                      Eje Central (LPZ, CBB, SCZ)
                    </button>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 flex-wrap">
                  {deptList.map((dept) => {
                    const isSelected = selectedCompareDepts.includes(dept.id);
                    return (
                      <button
                        key={dept.id}
                        onClick={() => {
                          if (isSelected) {
                            if (selectedCompareDepts.length > 1) {
                              setSelectedCompareDepts(selectedCompareDepts.filter((id) => id !== dept.id));
                            }
                          } else {
                            setSelectedCompareDepts([...selectedCompareDepts, dept.id]);
                          }
                        }}
                        className={`text-xs px-2.5 py-1 rounded-lg border transition-all flex items-center gap-1.5 ${
                          isSelected
                            ? 'bg-[#c9a751] text-slate-900 border-[#c9a751] shadow-xs font-medium'
                            : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100 opacity-60'
                        }`}
                      >
                        <span className={`w-2 h-2 rounded-full ${isSelected ? 'bg-slate-900' : 'bg-slate-300'}`} />
                        <span>{dept.nombre}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Gráfico Comparativo */}
              <TrendLineChart
                title={`Comparativa de Variables en Gestión ${selectedGestionDept}`}
                subtitle={`Contraste entre estudiantes totales, área urbana, área rural, sector fiscal y privado`}
                series={compareTrendSeries}
                xLabelFormatter={(idx) => compareDeptsStats[idx - 1]?.nombre || ''}
                unit="estudiantes"
                height={360}
                showArea={false}
              />

              {/* Tabla Comparativa de Departamentos */}
              <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-medium uppercase text-[11px]">
                      <th className="py-3 px-3">Departamento</th>
                      <th className="py-3 px-3 text-right">Total Gestión {selectedGestionDept}</th>
                      <th className="py-3 px-3 text-center">Part. Nacional</th>
                      <th className="py-3 px-3 text-right">Área Urbana</th>
                      <th className="py-3 px-3 text-right">Área Rural</th>
                      <th className="py-3 px-3 text-right">Sector Fiscal</th>
                      <th className="py-3 px-3 text-right">Sector Privado</th>
                      <th className="py-3 px-3 text-right">Brecha (Urb - Rur)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {departamentalStats.map((d) => (
                      <tr key={d.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3 px-3 font-semibold text-slate-900">{d.nombre}</td>
                        <td className="py-3 px-3 text-right font-semibold text-slate-900">
                          {d.totalDept.toLocaleString('es-BO')}
                        </td>
                        <td className="py-3 px-3 text-center font-medium text-[#c9a751]">
                          <span className="px-2 py-0.5 rounded bg-[#faf5e8] border border-[#e5d5a6]">
                            {d.pctNacional}%
                          </span>
                        </td>
                        <td className="py-3 px-3 text-right font-medium text-amber-800">
                          {d.urbana.toLocaleString('es-BO')}{' '}
                          <span className="text-[10px] text-slate-400">({d.pctUrbana}%)</span>
                        </td>
                        <td className="py-3 px-3 text-right font-medium text-emerald-800">
                          {d.rural.toLocaleString('es-BO')}{' '}
                          <span className="text-[10px] text-slate-400">({d.pctRural}%)</span>
                        </td>
                        <td className="py-3 px-3 text-right font-medium text-blue-800">
                          {d.fiscal.toLocaleString('es-BO')}{' '}
                          <span className="text-[10px] text-slate-400">({d.pctFiscal}%)</span>
                        </td>
                        <td className="py-3 px-3 text-right font-medium text-rose-800">
                          {d.privada.toLocaleString('es-BO')}{' '}
                          <span className="text-[10px] text-slate-400">({d.pctPrivada}%)</span>
                        </td>
                        <td className="py-3 px-3 text-right font-medium text-slate-700">
                          {d.brechaTerritorial.toLocaleString('es-BO')}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            /* MODO FICHA DETALLE */
            <div className="space-y-6">
              {activeDeptStat && (
                <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-3 flex-wrap gap-2">
                    <div>
                      <span className="text-[10px] font-semibold uppercase tracking-wider bg-[#faf5e8] text-[#c9a751] px-2 py-0.5 rounded border border-[#e5d5a6]">
                        Ficha Departamental Real · Gestión {selectedGestionDept}
                      </span>
                      <h3 className="text-lg font-semibold text-slate-900 mt-1">
                        {activeDeptStat.nombre} · Educación Especial
                      </h3>
                    </div>
                    <span className="text-xs font-semibold text-[#c9a751] bg-[#faf5e8] px-2.5 py-1 rounded-lg border border-[#e5d5a6]">
                      {activeDeptStat.pctNacional}% de la Matrícula Nacional
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                      <span className="text-[11px] text-slate-500 font-medium">Estudiantes Atendidos</span>
                      <p className="text-xl font-semibold text-slate-900 mt-0.5">
                        {activeDeptStat.totalDept.toLocaleString('es-BO')}
                      </p>
                      <span className="text-[10px] text-slate-400">Gestión {selectedGestionDept}</span>
                    </div>
                    <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                      <span className="text-[11px] text-slate-500 font-medium">Concentración Urbana</span>
                      <p className="text-xl font-semibold text-amber-700 mt-0.5">
                        {activeDeptStat.urbana.toLocaleString('es-BO')}
                      </p>
                      <span className="text-[10px] text-slate-400">{activeDeptStat.pctUrbana}% del departamento</span>
                    </div>
                    <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                      <span className="text-[11px] text-slate-500 font-medium">Cobertura Rural</span>
                      <p className="text-xl font-semibold text-emerald-700 mt-0.5">
                        {activeDeptStat.rural.toLocaleString('es-BO')}
                      </p>
                      <span className="text-[10px] text-slate-400">{activeDeptStat.pctRural}% del departamento</span>
                    </div>
                    <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                      <span className="text-[11px] text-slate-500 font-medium">Sector Fiscal / Privado</span>
                      <p className="text-xl font-semibold text-blue-700 mt-0.5">
                        {activeDeptStat.fiscal.toLocaleString('es-BO')}
                      </p>
                      <span className="text-[10px] text-slate-400">Fiscal ({activeDeptStat.pctFiscal}%) · Privado ({activeDeptStat.privada.toLocaleString('es-BO')})</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Tortas de distribución departamental */}
              {activeDeptStat && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
                  <PieChart
                    title={`Distribución Territorial (${activeDeptStat.nombre})`}
                    subtitle={`Urbana vs Rural en la gestión ${selectedGestionDept}`}
                    data={[
                      { label: 'Área Urbana', value: activeDeptStat.urbana, color: '#c9a751', sublabel: `${activeDeptStat.pctUrbana}% en ciudades` },
                      { label: 'Área Rural', value: activeDeptStat.rural, color: '#059669', sublabel: `${activeDeptStat.pctRural}% en comunidades` },
                    ]}
                    donut={true}
                    unit="estudiantes"
                  />
                  <PieChart
                    title={`Dependencia Institucional (${activeDeptStat.nombre})`}
                    subtitle={`Fiscal vs Privada en la gestión ${selectedGestionDept}`}
                    data={[
                      { label: 'Sector Fiscal', value: activeDeptStat.fiscal, color: '#2563eb', sublabel: `${activeDeptStat.pctFiscal}% sector público` },
                      { label: 'Sector Privado', value: activeDeptStat.privada, color: '#e11d48', sublabel: `${activeDeptStat.pctPrivada}% sector privado` },
                    ]}
                    donut={true}
                    unit="estudiantes"
                  />
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* =========================================================================
          PESTAÑA 3: GESTIÓN 2026 · EDUCACIÓN ESPECIAL (SIE)
         ========================================================================= */}
      {activeTab === 'gestion_2026' && (
        <div className="space-y-6">
          {/* Header y Filtros Gestión 2026 */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[10px] font-semibold uppercase tracking-wider bg-purple-50 text-purple-700 border border-purple-200 px-2 py-0.5 rounded">
                    Registro Censal SIE Gestión 2026
                  </span>
                </div>
                <h2 className="text-base font-semibold text-slate-900 tracking-tight">
                  Matrícula de Educación Especial por Tipo de Discapacidad y Dependencia (2026)
                </h2>
                <p className="text-xs text-slate-500">
                  Desglose oficial de estudiantes inscritos en centros de educación especial en 9 categorías de discapacidad y dependencias Fiscal y Convenio.
                </p>
              </div>

              {/* Resumen Total */}
              <div className="bg-slate-50 px-4 py-2 rounded-xl border border-slate-200 text-right">
                <span className="text-[11px] text-slate-500 font-medium">Estudiantes Filtrados:</span>
                <p className="text-xl font-bold text-slate-900">
                  {sie2026Aggregates.totalStudents.toLocaleString('es-BO')}
                </p>
              </div>
            </div>

            {/* Controles de Filtro */}
            <div className="pt-3 border-t border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-3 flex-wrap">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-xs font-medium text-slate-600 mr-1">Departamento:</span>
                <button
                  onClick={() => setSie2026DeptId('all')}
                  className={`text-xs px-2.5 py-1 rounded-lg border transition-all ${
                    sie2026DeptId === 'all'
                      ? 'bg-slate-900 text-white border-slate-900 shadow-xs font-medium'
                      : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  Nacional
                </button>
                {deptList.map((d) => (
                  <button
                    key={d.id}
                    onClick={() => setSie2026DeptId(d.id)}
                    className={`text-xs px-2.5 py-1 rounded-lg border transition-all ${
                      sie2026DeptId === d.id
                        ? 'bg-[#c9a751] text-slate-900 border-[#c9a751] shadow-xs font-medium'
                        : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    {d.nombre}
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl text-xs">
                <button
                  onClick={() => setSie2026Dependencia('all')}
                  className={`px-3 py-1 rounded-lg font-medium transition-all ${
                    sie2026Dependencia === 'all' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600'
                  }`}
                >
                  Fiscal y Convenio
                </button>
                <button
                  onClick={() => setSie2026Dependencia('FISCAL')}
                  className={`px-3 py-1 rounded-lg font-medium transition-all ${
                    sie2026Dependencia === 'FISCAL' ? 'bg-blue-600 text-white shadow-2xs' : 'text-slate-600'
                  }`}
                >
                  Solo Fiscal
                </button>
                <button
                  onClick={() => setSie2026Dependencia('CONVENIO')}
                  className={`px-3 py-1 rounded-lg font-medium transition-all ${
                    sie2026Dependencia === 'CONVENIO' ? 'bg-[#c9a751] text-slate-900 shadow-2xs' : 'text-slate-600'
                  }`}
                >
                  Solo Convenio
                </button>
              </div>
            </div>
          </div>

          {/* Tortas de Distribución 2026 */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
            <PieChart
              title={`Matrícula por Tipo de Discapacidad (2026)`}
              subtitle={`${sie2026DeptId === 'all' ? 'Total Nacional' : deptMap.get(sie2026DeptId)} · 9 Categorías de Educación Especial`}
              data={pieSlicesSie2026Type}
              donut={true}
              unit="estudiantes"
            />
            <PieChart
              title={`Distribución por Dependencia (2026)`}
              subtitle={`${sie2026DeptId === 'all' ? 'Total Nacional' : deptMap.get(sie2026DeptId)} · Centros Fiscales vs Centros de Convenio`}
              data={pieSlicesSie2026Dep}
              donut={true}
              unit="estudiantes"
            />
          </div>

          {/* Ranking por Tipo de Discapacidad */}
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-3">
            <h3 className="text-sm font-semibold text-slate-900 tracking-tight">
              Desglose Detallado por Tipo de Discapacidad (Gestión 2026)
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {sie2026Aggregates.byType.map((item, idx) => (
                <div key={item.tipo} className="p-3 rounded-lg border border-slate-200 bg-slate-50/60 hover:bg-slate-50 transition-colors">
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="font-semibold text-slate-800 truncate" title={item.tipo}>
                      {idx + 1}. {item.tipo}
                    </span>
                    <span className="font-semibold text-[#c9a751] bg-[#faf5e8] px-1.5 py-0.5 rounded border border-[#e5d5a6] text-[10px]">
                      {item.pct}%
                    </span>
                  </div>
                  <p className="text-lg font-bold text-slate-900">
                    {item.cantidad.toLocaleString('es-BO')}{' '}
                    <span className="text-[11px] font-normal text-slate-500">estudiantes</span>
                  </p>
                  <div className="w-full bg-slate-200 h-1.5 rounded-full mt-2 overflow-hidden">
                    <div
                      className="bg-[#c9a751] h-full rounded-full transition-all"
                      style={{ width: `${Math.min(100, Math.max(3, item.pct))}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Tabla de Distribución Departamental 2026 */}
          <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-medium uppercase text-[11px]">
                  <th className="py-3 px-3">Departamento</th>
                  <th className="py-3 px-3 text-right">Estudiantes Especial 2026</th>
                  <th className="py-3 px-3 text-center">Part. Nacional</th>
                  <th className="py-3 px-3 text-left">Tipo de Discapacidad Mayoritario</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {sie2026Aggregates.byDept.map((d) => {
                  const deptRows = (data.sie_discapacidad_2026 || []).filter((r) => r.departamento_id === d.id);
                  const typeTotals = new Map<string, number>();
                  deptRows.forEach((r) => typeTotals.set(r.tipo_discapacidad, (typeTotals.get(r.tipo_discapacidad) || 0) + r.cantidad));
                  const topType = Array.from(typeTotals.entries()).sort((a, b) => b[1] - a[1])[0];

                  return (
                    <tr key={d.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-3 font-semibold text-slate-900">{d.nombre}</td>
                      <td className="py-3 px-3 text-right font-semibold text-slate-900">
                        {d.cantidad.toLocaleString('es-BO')}
                      </td>
                      <td className="py-3 px-3 text-center font-medium text-[#c9a751]">
                        <span className="px-2 py-0.5 rounded bg-[#faf5e8] border border-[#e5d5a6]">
                          {d.pct}%
                        </span>
                      </td>
                      <td className="py-3 px-3 text-slate-700">
                        {topType ? (
                          <span>
                            <strong className="text-slate-900">{topType[0]}</strong> ({topType[1].toLocaleString('es-BO')} est.)
                          </span>
                        ) : (
                          '-'
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* =========================================================================
          PESTAÑA 4: MATRIZ DE CRECIMIENTO INTERANUAL (2011 - 2025)
         ========================================================================= */}
      {activeTab === 'comparativo_anual' && (
        <div className="space-y-6">
          <div className="flex items-center gap-2 border-b border-slate-200 pb-3">
            <CalendarIcon size={20} className="text-[#c9a751]" />
            <div>
              <h2 className="text-base font-semibold text-slate-900 tracking-tight">
                Balance Histórico Interanual de Educación Especial (2011 - 2025)
              </h2>
              <p className="text-xs text-slate-500">
                Matriz analítica de 15 gestiones consecutivas: variaciones absolutas (+/- estudiantes), tasas de crecimiento anual, distribución territorial y dependencia.
              </p>
            </div>
          </div>

          <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-medium uppercase text-[11px]">
                  <th className="py-3 px-3">Gestión</th>
                  <th className="py-3 px-3 text-right">Total Estudiantes</th>
                  <th className="py-3 px-3 text-right">Variación Anual</th>
                  <th className="py-3 px-3 text-center">Tasa (%)</th>
                  <th className="py-3 px-3 text-right">Área Urbana</th>
                  <th className="py-3 px-3 text-center">% Urbano</th>
                  <th className="py-3 px-3 text-right">Área Rural</th>
                  <th className="py-3 px-3 text-center">% Rural</th>
                  <th className="py-3 px-3 text-right">Sector Fiscal</th>
                  <th className="py-3 px-3 text-right">Sector Privado</th>
                  <th className="py-3 px-3 text-right">Brecha (Urb - Rur)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {comparativoAnualMatriz.map((row) => (
                  <tr key={row.anio} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-2.5 px-3 font-semibold text-slate-900">{row.anio}</td>
                    <td className="py-2.5 px-3 text-right font-semibold text-slate-900">
                      {row.total.toLocaleString('es-BO')}
                    </td>
                    <td
                      className={`py-2.5 px-3 text-right font-medium ${
                        row.diff > 0
                          ? 'text-emerald-600'
                          : row.diff < 0
                          ? 'text-red-500'
                          : 'text-slate-400'
                      }`}
                    >
                      {row.diff > 0 ? `+${row.diff.toLocaleString('es-BO')}` : row.diff.toLocaleString('es-BO')}
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      <span
                        className={`px-2 py-0.5 rounded text-[11px] font-semibold ${
                          row.growthRate > 0
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : row.growthRate < 0
                            ? 'bg-red-50 text-red-700 border border-red-200'
                            : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        {row.growthRate > 0 ? `+${row.growthRate}%` : `${row.growthRate}%`}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-right font-medium text-amber-800">
                      {row.urb.toLocaleString('es-BO')}
                    </td>
                    <td className="py-2.5 px-3 text-center font-medium text-slate-600">
                      {row.pctUrbana}%
                    </td>
                    <td className="py-2.5 px-3 text-right font-medium text-emerald-800">
                      {row.rur.toLocaleString('es-BO')}
                    </td>
                    <td className="py-2.5 px-3 text-center font-medium text-slate-600">
                      {row.pctRural}%
                    </td>
                    <td className="py-2.5 px-3 text-right font-medium text-blue-800">
                      {row.fisc.toLocaleString('es-BO')}
                    </td>
                    <td className="py-2.5 px-3 text-right font-medium text-rose-800">
                      {row.priv.toLocaleString('es-BO')}
                    </td>
                    <td className="py-2.5 px-3 text-right font-medium text-slate-700">
                      {row.brecha.toLocaleString('es-BO')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* =========================================================================
          PESTAÑA 5: REGISTROS ADMINISTRATIVOS Y FUENTES (3 TABLAS)
         ========================================================================= */}
      {activeTab === 'tablas' && (
        <div className="space-y-6">
          {/* Subnavegación de Tablas */}
          <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <span className="text-xs font-semibold text-slate-700">Seleccionar Base de Datos Oficial:</span>
            <div className="flex items-center gap-1.5 flex-wrap">
              <button
                onClick={() => setActiveTableDataset('sie2026')}
                className={`text-xs px-3 py-1.5 rounded-lg border font-medium transition-all ${
                  activeTableDataset === 'sie2026'
                    ? 'bg-[#c9a751] text-slate-900 border-[#c9a751] shadow-xs'
                    : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                }`}
              >
                1. SIE Educación Especial 2026 ({data.sie_discapacidad_2026?.length || 0} filas)
              </button>
              <button
                onClick={() => setActiveTableDataset('area')}
                className={`text-xs px-3 py-1.5 rounded-lg border font-medium transition-all ${
                  activeTableDataset === 'area'
                    ? 'bg-[#c9a751] text-slate-900 border-[#c9a751] shadow-xs'
                    : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                }`}
              >
                2. SEIE Área Urbana-Rural ({data.seie_discapacidad_area?.length || 0} filas)
              </button>
              <button
                onClick={() => setActiveTableDataset('dependencia')}
                className={`text-xs px-3 py-1.5 rounded-lg border font-medium transition-all ${
                  activeTableDataset === 'dependencia'
                    ? 'bg-[#c9a751] text-slate-900 border-[#c9a751] shadow-xs'
                    : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                }`}
              >
                3. SEIE Fiscal-Privada ({data.seie_discapacidad_dependencia?.length || 0} filas)
              </button>
            </div>
          </div>

          {activeTableDataset === 'sie2026' && (
            <DataTable
              title="SIE Educación Especial Gestión 2026 (por Tipo de Discapacidad y Dependencia)"
              subtitle="153 registros censales detallados con departamento, tipo de discapacidad y dependencia administrativa"
              data={data.sie_discapacidad_2026 || []}
              columns={columnsSie2026}
              searchPlaceholder="Buscar por departamento, tipo o dependencia..."
            />
          )}

          {activeTableDataset === 'area' && (
            <DataTable
              title="SEIE Discapacidad por Área Territorial (2011 - 2025)"
              subtitle="270 registros anuales desagregados por departamento y área (Urbana y Rural)"
              data={data.seie_discapacidad_area || []}
              columns={columnsArea}
              searchPlaceholder="Buscar por año, departamento o área..."
            />
          )}

          {activeTableDataset === 'dependencia' && (
            <DataTable
              title="SEIE Discapacidad por Dependencia Institucional (2011 - 2025)"
              subtitle="270 registros anuales desagregados por departamento y sector (Fiscal y Privada)"
              data={data.seie_discapacidad_dependencia || []}
              columns={columnsDependencia}
              searchPlaceholder="Buscar por año, departamento o dependencia..."
            />
          )}

          <SourceBadge
            sourceName="SEIE & SIE · Estadísticas Oficiales de Educación Especial"
            institutionTitle="Ministerio de Educación de Bolivia · Dirección General de Educación Especial"
            methodology="Registros administrativos censales del Subsistema de Educación Especial (SEIE y SIE) consolidados por departamento, dependencia y tipo de atención."
            links={[
              {
                title: 'SEIE Reportes de Discapacidad',
                url: 'https://seie.minedu.gob.bo/reportes/estadisticas/grupo1/discapacidad',
                institution: 'Ministerio de Educación',
                period: '2011-2025',
              },
              {
                title: 'Sistema de Información Educativa (SIE)',
                url: 'https://sie.minedu.gob.bo/',
                institution: 'Ministerio de Educación',
                period: 'Gestión 2026',
              },
            ]}
          />
        </div>
      )}
    </div>
  );
}
