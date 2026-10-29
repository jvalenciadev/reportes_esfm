'use client';

import React, { useState, useMemo } from 'react';
import { DashboardDataset, IneMatricula } from '@/types/stats';
import { StatCard } from '../StatCard';
import { TrendLineChart, TrendSeries } from '../TrendLineChart';
import { PieChart, PieSlice } from '../PieChart';
import { DataTable, ColumnDef } from '../DataTable';
import { SourceBadge } from '../SourceBadge';
import { BoliviaDemographicExplorer } from '../BoliviaDemographicExplorer';
import { AgeProjectionExplorer } from '../AgeProjectionExplorer';
import {
  ChartBarIcon,
  UsersIcon,
  TrendingUpIcon,
  CalendarIcon,
  FilterIcon,
  SearchIcon,
  XIcon,
  ScaleIcon,
  MapPinIcon,
} from '../../ui/Icons';

interface IneViewProps {
  data: DashboardDataset;
}

export function IneView({ data }: IneViewProps) {
  const [activeTab, setActiveTab] = useState<'lineas' | 'comparativo_anual' | 'tablas'>('lineas');
  const [poblacionFilter, setPoblacionFilter] = useState<'all' | 'hist' | 'proy'>('all');
  const [selectedDeptId, setSelectedDeptId] = useState<number | 'all'>('all');
  const [chartMode, setChartMode] = useState<'desglose' | 'comparativa_dept'>('desglose');
  const [deptSearchTerm, setDeptSearchTerm] = useState<string>('');
  const [pieYear, setPieYear] = useState<number>(2025);

  // Años disponibles en la matrícula histórica (orden descendente: 2025 -> 2011)
  const matriculaYears = useMemo(() => {
    return Array.from(new Set(data.ine_matricula.map((r) => r.anio))).sort((a, b) => b - a);
  }, [data.ine_matricula]);

  // Lista única de departamentos extraída de ine_matricula
  const departamentosList = useMemo(() => {
    const map = new Map<number, string>();
    data.ine_matricula.forEach((r) => {
      const name = r.departamentos?.nombre || `Departamento ${r.departamento_id}`;
      map.set(r.departamento_id, name);
    });
    return Array.from(map.entries())
      .map(([id, nombre]) => ({ id, nombre }))
      .sort((a, b) => a.nombre.localeCompare(b.nombre));
  }, [data.ine_matricula]);

  const activeDeptName = useMemo(() => {
    if (selectedDeptId === 'all') return 'Total Nacional';
    const found = departamentosList.find((d) => d.id === selectedDeptId);
    return found ? found.nombre : `Departamento #${selectedDeptId}`;
  }, [selectedDeptId, departamentosList]);

  // Datos de matrícula filtrados por departamento seleccionado
  const filteredMatricula = useMemo(() => {
    if (selectedDeptId === 'all') return data.ine_matricula;
    return data.ine_matricula.filter((r) => r.departamento_id === selectedDeptId);
  }, [data.ine_matricula, selectedDeptId]);

  // Cálculos estadísticos
  const totalMatricula = useMemo(
    () => filteredMatricula.reduce((acc, r) => acc + (r.cantidad || 0), 0),
    [filteredMatricula]
  );

  const poblacion2026 = useMemo(() => {
    const item = data.ine_poblacion.find((p) => p.anio === 2026);
    return item ? item.poblacion : 12332500;
  }, [data.ine_poblacion]);

  const poblacion2050 = useMemo(() => {
    const item = data.ine_poblacion.find((p) => p.anio === 2050);
    return item ? item.poblacion : 14500000;
  }, [data.ine_poblacion]);

  const jovenes18Poblacion = useMemo(() => {
    return (
      data.ine_proyeccion_edad
        .filter(
          (p) =>
            p.anio === 2026 &&
            p.edad === 18 &&
            (selectedDeptId === 'all' || p.departamento_id === selectedDeptId)
        )
        .reduce((acc, p) => acc + p.cantidad, 0) || 245000
    );
  }, [data.ine_proyeccion_edad, selectedDeptId]);

  // 1. SERIE LINEAL: Población de Bolivia (2000 - 2050)
  const poblacionLineSeries: TrendSeries[] = useMemo(() => {
    let filtered = [...data.ine_poblacion].sort((a, b) => a.anio - b.anio);
    if (poblacionFilter === 'hist') filtered = filtered.filter((d) => d.anio <= 2024);
    if (poblacionFilter === 'proy') filtered = filtered.filter((d) => d.anio >= 2024);

    return [
      {
        id: 'pob_bolivia',
        name: 'Población Total Bolivia',
        color: '#c9a751',
        data: filtered.map((d) => ({ year: d.anio, value: d.poblacion })),
      },
    ];
  }, [data.ine_poblacion, poblacionFilter]);

  // 2. SERIE LINEAL: Matrícula Escolar INE 2011-2025 (PÚBLICO vs PRIVADO)
  const publicoVsPrivadoSeries: TrendSeries[] = useMemo(() => {
    const mapPub = new Map<number, number>();
    const mapPriv = new Map<number, number>();

    filteredMatricula.forEach((r) => {
      const isPub = (r.tipo || '').toLowerCase().includes('públ') || (r.tipo || '').toLowerCase().includes('publ');
      if (isPub) {
        mapPub.set(r.anio, (mapPub.get(r.anio) || 0) + (r.cantidad || 0));
      } else {
        mapPriv.set(r.anio, (mapPriv.get(r.anio) || 0) + (r.cantidad || 0));
      }
    });

    const years = Array.from(new Set(filteredMatricula.map((r) => r.anio))).sort((a, b) => a - b);

    return [
      {
        id: 'publico',
        name: `Sector Público (${activeDeptName})`,
        color: '#c9a751',
        data: years.map((y) => ({ year: y, value: mapPub.get(y) || 0 })),
      },
      {
        id: 'privado',
        name: `Sector Privado (${activeDeptName})`,
        color: '#475569',
        data: years.map((y) => ({ year: y, value: mapPriv.get(y) || 0 })),
      },
    ];
  }, [filteredMatricula, activeDeptName]);

  // 3. SERIE LINEAL: Matrícula Escolar INE 2011-2025 (INICIAL vs PRIMARIA vs SECUNDARIA)
  const nivelesLineSeries: TrendSeries[] = useMemo(() => {
    const mapInic = new Map<number, number>();
    const mapPrim = new Map<number, number>();
    const mapSecu = new Map<number, number>();

    filteredMatricula.forEach((r) => {
      const niv = (r.nivel || '').toLowerCase();
      const cant = r.cantidad || 0;
      if (niv.includes('inic')) mapInic.set(r.anio, (mapInic.get(r.anio) || 0) + cant);
      else if (niv.includes('prim')) mapPrim.set(r.anio, (mapPrim.get(r.anio) || 0) + cant);
      else if (niv.includes('secu')) mapSecu.set(r.anio, (mapSecu.get(r.anio) || 0) + cant);
    });

    const years = Array.from(new Set(filteredMatricula.map((r) => r.anio))).sort((a, b) => a - b);

    return [
      {
        id: 'primaria',
        name: `Nivel Primaria (${activeDeptName})`,
        color: '#059669',
        data: years.map((y) => ({ year: y, value: mapPrim.get(y) || 0 })),
      },
      {
        id: 'secundaria',
        name: `Nivel Secundaria (${activeDeptName})`,
        color: '#2563EB',
        data: years.map((y) => ({ year: y, value: mapSecu.get(y) || 0 })),
      },
      {
        id: 'inicial',
        name: `Nivel Inicial (${activeDeptName})`,
        color: '#c9a751',
        data: years.map((y) => ({ year: y, value: mapInic.get(y) || 0 })),
      },
    ];
  }, [filteredMatricula, activeDeptName]);

  // 3b. SERIE LINEAL COMPARATIVA DEPARTAMENTAL (2011 - 2025)
  const comparativaDeptSeries: TrendSeries[] = useMemo(() => {
    const deptColors: Record<string, string> = {
      'La Paz': '#2563EB',
      'Santa Cruz': '#059669',
      'Cochabamba': '#c9a751',
      'Potosí': '#7C3AED',
      'Chuquisaca': '#DC2626',
      'Oruro': '#D97706',
      'Tarija': '#0891B2',
      'Beni': '#10B981',
      'Pando': '#64748B',
    };

    const years = Array.from(new Set(data.ine_matricula.map((r) => r.anio))).sort((a, b) => a - b);
    const deptsMap = new Map<number, { nombre: string; byYear: Map<number, number> }>();

    data.ine_matricula.forEach((r) => {
      const id = r.departamento_id;
      const nombre = r.departamentos?.nombre || `Dep #${id}`;
      if (!deptsMap.has(id)) {
        deptsMap.set(id, { nombre, byYear: new Map() });
      }
      const entry = deptsMap.get(id)!;
      entry.byYear.set(r.anio, (entry.byYear.get(r.anio) || 0) + (r.cantidad || 0));
    });

    const palette = ['#2563eb', '#059669', '#c9a751', '#7c3aed', '#dc2626', '#d97706', '#0891b2', '#10b981', '#64748b'];

    return Array.from(deptsMap.entries())
      .sort((a, b) => a[1].nombre.localeCompare(b[1].nombre))
      .map(([deptId, { nombre, byYear }], idx) => ({
        id: `dept_${deptId}`,
        name: nombre,
        color: deptColors[nombre] || palette[idx % palette.length],
        data: years.map((y) => ({ year: y, value: byYear.get(y) || 0 })),
      }));
  }, [data.ine_matricula]);

  // 4. SERIE LINEAL: Proyección por Edades (2024 - 2034) - Cohortes Clave para ESFM
  const edadesLineSeries: TrendSeries[] = useMemo(() => {
    const map17 = new Map<number, number>();
    const map18 = new Map<number, number>();
    const map19 = new Map<number, number>();
    const map20 = new Map<number, number>();

    data.ine_proyeccion_edad.forEach((r) => {
      if (selectedDeptId !== 'all' && r.departamento_id !== selectedDeptId) return;
      if (r.edad === 17) map17.set(r.anio, (map17.get(r.anio) || 0) + r.cantidad);
      else if (r.edad === 18) map18.set(r.anio, (map18.get(r.anio) || 0) + r.cantidad);
      else if (r.edad === 19) map19.set(r.anio, (map19.get(r.anio) || 0) + r.cantidad);
      else if (r.edad === 20) map20.set(r.anio, (map20.get(r.anio) || 0) + r.cantidad);
    });

    const years = Array.from(new Set(data.ine_proyeccion_edad.map((r) => r.anio))).sort((a, b) => a - b);

    return [
      {
        id: 'edad_18',
        name: `18 Años - Admisión ESFM (${activeDeptName})`,
        color: '#c9a751',
        data: years.map((y) => ({ year: y, value: map18.get(y) || 0 })),
      },
      {
        id: 'edad_17',
        name: `17 Años - Egreso Bachiller (${activeDeptName})`,
        color: '#2563EB',
        data: years.map((y) => ({ year: y, value: map17.get(y) || 0 })),
      },
      {
        id: 'edad_19',
        name: `19 Años (${activeDeptName})`,
        color: '#059669',
        data: years.map((y) => ({ year: y, value: map19.get(y) || 0 })),
      },
      {
        id: 'edad_20',
        name: `20 Años (${activeDeptName})`,
        color: '#9333EA',
        data: years.map((y) => ({ year: y, value: map20.get(y) || 0 })),
      },
    ];
  }, [data.ine_proyeccion_edad, selectedDeptId, activeDeptName]);

  // 5. TABLA COMPARATIVA DE CRECIMIENTO AÑO A AÑO
  const comparativoAnualMatricula = useMemo(() => {
    const years = Array.from(new Set(data.ine_matricula.map((r) => r.anio))).sort((a, b) => a - b);
    const rows = years.map((anio) => {
      let total = 0;
      let pub = 0;
      let priv = 0;
      let inic = 0;
      let prim = 0;
      let secu = 0;

      data.ine_matricula
        .filter((r) => r.anio === anio)
        .forEach((r) => {
          const cant = r.cantidad || 0;
          total += cant;
          const isPub = (r.tipo || '').toLowerCase().includes('públ') || (r.tipo || '').toLowerCase().includes('publ');
          if (isPub) pub += cant;
          else priv += cant;

          const niv = (r.nivel || '').toLowerCase();
          if (niv.includes('inic')) inic += cant;
          else if (niv.includes('prim')) prim += cant;
          else if (niv.includes('secu')) secu += cant;
        });

      return { anio, total, pub, priv, inic, prim, secu };
    });

    // Calcular crecimiento respecto al año anterior
    return rows.map((row, idx) => {
      const prev = idx > 0 ? rows[idx - 1] : null;
      const diff = prev ? row.total - prev.total : 0;
      const growthRate = prev && prev.total > 0 ? (diff / prev.total) * 100 : 0;
      return {
        ...row,
        diff,
        growthRate: Math.round(growthRate * 10) / 10,
      };
    });
  }, [data.ine_matricula]);

  // Torta: Proporción Público vs Privado para la gestión seleccionada (Gestión específica pieYear)
  const pubPrivPieData: PieSlice[] = useMemo(() => {
    let pub = 0;
    let priv = 0;
    filteredMatricula
      .filter((r) => r.anio === pieYear)
      .forEach((r) => {
        const isPub = (r.tipo || '').toLowerCase().includes('públ') || (r.tipo || '').toLowerCase().includes('publ');
        if (isPub) pub += r.cantidad || 0;
        else priv += r.cantidad || 0;
      });
    return [
      { label: 'Sector Público', value: pub, color: '#c9a751', sublabel: `${activeDeptName} · ${pieYear}` },
      { label: 'Sector Privado', value: priv, color: '#475569', sublabel: `${activeDeptName} · ${pieYear}` },
    ];
  }, [filteredMatricula, pieYear, activeDeptName]);

  // Torta: Matrícula por Niveles para la gestión seleccionada (Gestión específica pieYear)
  const nivelesPieData: PieSlice[] = useMemo(() => {
    let inic = 0;
    let prim = 0;
    let secu = 0;
    filteredMatricula
      .filter((r) => r.anio === pieYear)
      .forEach((r) => {
        const niv = (r.nivel || '').toLowerCase();
        const cant = r.cantidad || 0;
        if (niv.includes('inic')) inic += cant;
        else if (niv.includes('prim')) prim += cant;
        else if (niv.includes('secu')) secu += cant;
      });
    return [
      { label: 'Nivel Primaria', value: prim, color: '#059669', sublabel: `${activeDeptName} · ${pieYear}` },
      { label: 'Nivel Secundaria', value: secu, color: '#2563EB', sublabel: `${activeDeptName} · ${pieYear}` },
      { label: 'Nivel Inicial', value: inic, color: '#c9a751', sublabel: `${activeDeptName} · ${pieYear}` },
    ];
  }, [filteredMatricula, pieYear, activeDeptName]);

  const pieYearTotal = useMemo(() => {
    return pubPrivPieData.reduce((acc, s) => acc + s.value, 0);
  }, [pubPrivPieData]);

  return (
    <div className="space-y-6">
      {/* Header Institucional INE */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-xs">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] font-semibold uppercase tracking-wider bg-[#faf5e8] text-[#c9a751] border border-[#e5d5a6] px-2.5 py-0.5 rounded-md">
              INE · Instituto Nacional de Estadística
            </span>
          </div>
          <h1 className="text-2xl font-semibold text-slate-900 tracking-tight">
            Tendencias Temporales Lineales y Demografía Oficial
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Análisis lineal en el tiempo: Población (2000-2050), Matrícula Escolar Público vs Privado, Inicial-Primaria-Secundaria (2011-2025) y Cohortes por Edad.
          </p>
        </div>

        {/* Selector de Vistas de Análisis */}
        <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs font-medium shrink-0">
          <button
            onClick={() => setActiveTab('lineas')}
            className={`px-3 py-1.5 rounded-lg transition-all ${activeTab === 'lineas'
              ? 'bg-white text-slate-900 shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
              }`}
          >
            Gráficos Lineales
          </button>
          <button
            onClick={() => setActiveTab('comparativo_anual')}
            className={`px-3 py-1.5 rounded-lg transition-all ${activeTab === 'comparativo_anual'
              ? 'bg-[#c9a751] text-slate-900 shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
              }`}
          >
            Crecimiento Año a Año
          </button>
          <button
            onClick={() => setActiveTab('tablas')}
            className={`px-3 py-1.5 rounded-lg transition-all ${activeTab === 'tablas'
              ? 'bg-white text-slate-900 shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
              }`}
          >
            Tablas Completas
          </button>
        </div>
      </div>

      {/* 4 KPIs Clave */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Población Bolivia 2026"
          value={poblacion2026}
          subtitle="Proyección demográfica oficial"
          sourceBadge="Demografía"
          sourceColor="amber"
          icon={<UsersIcon size={22} className="text-[#a08035]" />}
        />
        <StatCard
          title="Matrícula Total INE"
          value={totalMatricula}
          subtitle="Acumulado histórico 2011-2025"
          sourceBadge="INE Escolar"
          sourceColor="amber"
          icon={<ChartBarIcon size={22} className="text-[#a08035]" />}
        />
        <StatCard
          title="Población al 2050"
          value={poblacion2050}
          subtitle="Proyección demográfica a futuro"
          sourceBadge="Horizonte"
          sourceColor="amber"
          icon={<TrendingUpIcon size={22} className="text-[#a08035]" />}
        />
        <StatCard
          title="Jóvenes 18 Años (2026)"
          value={jovenes18Poblacion}
          subtitle={`Universo de egreso bachiller · ${activeDeptName}`}
          sourceBadge="Postulantes"
          sourceColor="amber"
          icon={<CalendarIcon size={22} className="text-[#a08035]" />}
        />
      </div>

      {/* VISTA 1: GRÁFICOS LINEALES DE TENDENCIAS EN EL TIEMPO */}
      {activeTab === 'lineas' && (
        <div className="space-y-8">
          {/* =========================================================================
              GRUPO 1: SERIES Y COMPARATIVAS DEPARTAMENTALES (INE 2011 - 2025)
             ========================================================================= */}
          <div className="space-y-6">
            <div className="flex items-center gap-2 border-b border-slate-200 pb-3">
              <MapPinIcon size={20} className="text-[#c9a751]" />
              <div>
                <h2 className="text-base font-semibold text-slate-900 tracking-tight">
                  Gráficos Departamentales: Matrícula Escolar y Comparativas (2011 - 2025)
                </h2>
                <p className="text-xs text-slate-500">
                  Seleccione un departamento o active el comparador para analizar curvas entre regiones.
                </p>
              </div>
            </div>

            {/* Panel de Búsqueda, Selección y Comparación Departamental */}
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
                </div>

                {/* Selector de Modo con Iconos */}
                <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs font-medium self-start md:self-auto">
                  <button
                    onClick={() => setChartMode('desglose')}
                    className={`px-3 py-1.5 rounded-lg transition-all ${
                      chartMode === 'desglose'
                        ? 'bg-white text-slate-900 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Detalle por Nivel y Dependencia
                  </button>
                  <button
                    onClick={() => setChartMode('comparativa_dept')}
                    className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
                      chartMode === 'comparativa_dept'
                        ? 'bg-[#c9a751] text-slate-900 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <ScaleIcon size={14} className={chartMode === 'comparativa_dept' ? 'text-slate-900' : 'text-[#c9a751]'} />
                    <span>Comparador entre Departamentos</span>
                  </button>
                </div>
              </div>

              {/* Buscador de Departamentos con Iconos SVG */}
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
                            setChartMode('desglose');
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

            {/* Gráficos de este grupo: Modo Comparativo vs Modo Detalle */}
            {chartMode === 'comparativa_dept' ? (
              <div className="space-y-4">
                <TrendLineChart
                  title="Comparativa Histórica de Matrícula entre Departamentos (2011 - 2025)"
                  subtitle="Curvas simultáneas de los 9 departamentos. Haga clic en los nombres de la leyenda para activar, aislar o comparar departamentos específicos."
                  series={comparativaDeptSeries}
                  unit="estudiantes"
                  height={380}
                  showArea={false}
                  defaultExpanded={false}
                />
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
                  <TrendLineChart
                    title={`Matrícula Escolar: Público vs Privado (${activeDeptName})`}
                    subtitle={`Evolución temporal desagregada por tipo de dependencia en ${activeDeptName} (2011-2025)`}
                    series={publicoVsPrivadoSeries}
                    unit="estudiantes"
                    height={300}
                    showArea={false}
                  />

                  <TrendLineChart
                    title={`Matrícula por Nivel: Inicial, Primaria y Secundaria (${activeDeptName})`}
                    subtitle={`Distribución por etapas escolares en ${activeDeptName} (2011-2025)`}
                    series={nivelesLineSeries}
                    unit="estudiantes"
                    height={300}
                    showArea={false}
                  />
                </div>

                {/* Cabecera y Selector de Gestión para las Tortas de Distribución */}
                <div className="bg-slate-50/90 rounded-xl border border-slate-200 p-4 flex flex-col md:flex-row md:items-center justify-between gap-3 shadow-2xs">
                  <div>
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 block">
                      Estructura Escolar · Gestión {pieYear}
                    </span>
                    <p className="text-xs text-slate-600 mt-0.5">
                      Visualizando matrícula de <strong className="text-slate-900 font-semibold">{activeDeptName}</strong> en el año <strong className="text-slate-900 font-semibold">{pieYear}</strong> ({pieYearTotal.toLocaleString('es-BO')} estudiantes).
                    </p>
                  </div>
                  <div className="flex items-center gap-1 overflow-x-auto pb-1 md:pb-0 shrink-0">
                    <span className="text-xs text-slate-500 font-medium mr-1.5 shrink-0">Gestión:</span>
                    {matriculaYears.map((yr) => (
                      <button
                        key={yr}
                        onClick={() => setPieYear(yr)}
                        className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all shrink-0 ${
                          pieYear === yr
                            ? 'bg-slate-900 text-white shadow-2xs'
                            : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100 hover:text-slate-900'
                        }`}
                      >
                        {yr}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Tortas de Distribución del departamento seleccionado */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
                  <div className="min-w-0">
                    <PieChart
                      title={`Proporción Público vs Privado (${activeDeptName} · ${pieYear})`}
                      subtitle={`Distribución sectorial en la gestión escolar ${pieYear}`}
                      data={pubPrivPieData}
                      donut={true}
                      unit="estudiantes"
                    />
                  </div>
                  <div className="min-w-0">
                    <PieChart
                      title={`Distribución por Nivel Escolar (${activeDeptName} · ${pieYear})`}
                      subtitle={`Concentración por nivel en la gestión escolar ${pieYear}`}
                      data={nivelesPieData}
                      donut={true}
                      unit="estudiantes"
                    />
                  </div>
                </div>
              </>
            )}
          </div>

          {/* =========================================================================
              GRUPO 2: DEMOGRAFÍA NACIONAL Y PROYECCIONES POR EDAD (2000 - 2050)
             ========================================================================= */}
          <div className="space-y-6 pt-4 border-t border-slate-200/80">
            <div className="flex items-center gap-2 border-b border-slate-200 pb-3">
              <TrendingUpIcon size={20} className="text-[#c9a751]" />
              <div>
                <h2 className="text-base font-semibold text-slate-900 tracking-tight">
                  Demografía Nacional y Proyección de Población (INE 2000 - 2050)
                </h2>
                <p className="text-xs text-slate-500">
                  Población general del Estado Plurinacional de Bolivia y pirámide de edades según datos oficiales del INE.
                </p>
              </div>
            </div>

            {/* Explorador Demográfico Población Bolivia */}
            <BoliviaDemographicExplorer data={data.ine_poblacion} />

            {/* Explorador de Proyección por Edad (2024 - 2034) */}
            <AgeProjectionExplorer data={data.ine_proyeccion_edad} />
          </div>
        </div>
      )}

      {/* VISTA 2: COMPARATIVO AÑO A AÑO (CUÁNTO VA CRECIENDO) */}
      {activeTab === 'comparativo_anual' && (
        <div className="space-y-6">
          <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs">
            <div className="mb-4">
              <h3 className="text-lg font-semibold text-slate-900 tracking-tight">
                Matriz Comparativa Interanual: Cuánto Crece la Matrícula Año por Año
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Cálculo de variación interanual absoluta (+/- estudiantes) y tasa de crecimiento porcentual (%) anual.
              </p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-medium uppercase text-[11px]">
                    <th className="py-3 px-3">Gestión</th>
                    <th className="py-3 px-3 text-right">Matrícula Total</th>
                    <th className="py-3 px-3 text-center">Variación Anual</th>
                    <th className="py-3 px-3 text-right">Tasa Crecimiento (%)</th>
                    <th className="py-3 px-3 text-right text-[#c9a751]">Sector Público</th>
                    <th className="py-3 px-3 text-right text-slate-500">Sector Privado</th>
                    <th className="py-3 px-3 text-right text-emerald-700">Primaria</th>
                    <th className="py-3 px-3 text-right text-blue-700">Secundaria</th>
                    <th className="py-3 px-3 text-right text-amber-700">Inicial</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {comparativoAnualMatricula.map((row, idx) => (
                    <tr key={row.anio} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-3 font-medium text-slate-900 text-sm">
                        {row.anio}
                      </td>
                      <td className="py-3 px-3 text-right font-semibold text-slate-900 text-sm">
                        {row.total.toLocaleString('es-BO')}
                      </td>
                      <td className="py-3 px-3 text-center">
                        {idx === 0 ? (
                          <span className="text-[10px] text-slate-400 font-medium">Año base</span>
                        ) : (
                          <span
                            className={`font-medium px-2 py-0.5 rounded text-[11px] ${row.diff >= 0
                              ? 'bg-emerald-50 text-emerald-800'
                              : 'bg-rose-50 text-rose-800'
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
                      <td className="py-3 px-3 text-right font-semibold text-slate-800">
                        {row.pub.toLocaleString('es-BO')}
                      </td>
                      <td className="py-3 px-3 text-right text-slate-600">
                        {row.priv.toLocaleString('es-BO')}
                      </td>
                      <td className="py-3 px-3 text-right text-emerald-800 font-semibold">
                        {row.prim.toLocaleString('es-BO')}
                      </td>
                      <td className="py-3 px-3 text-right text-blue-800 font-semibold">
                        {row.secu.toLocaleString('es-BO')}
                      </td>
                      <td className="py-3 px-3 text-right text-amber-800 font-semibold">
                        {row.inic.toLocaleString('es-BO')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div >
      )
      }

      {/* VISTA 3: TABLAS COMPLETAS EN BRUTO */}
      {
        activeTab === 'tablas' && (
          <div className="space-y-6">
            <DataTable
              title="Matrícula Escolar Histórica INE (2011-2025)"
              subtitle="Detalle completo de los 810 registros por departamento, nivel y tipo de educación"
              data={data.ine_matricula}
              columns={[
                { key: 'anio', header: 'Año', width: 'w-20', align: 'center' },
                {
                  key: 'departamento',
                  header: 'Departamento',
                  render: (r: IneMatricula) => (
                    <span className="font-semibold text-slate-800">
                      {r.departamentos?.nombre || `Dep #${r.departamento_id}`}
                    </span>
                  ),
                },
                { key: 'tipo', header: 'Tipo' },
                { key: 'nivel', header: 'Nivel Educativo' },
                {
                  key: 'cantidad',
                  header: 'Cantidad',
                  align: 'right',
                  render: (r: IneMatricula) => (
                    <span className="font-medium text-slate-900">
                      {(r.cantidad || 0).toLocaleString('es-BO')}
                    </span>
                  ),
                },
              ]}
              searchPlaceholder="Buscar por departamento, nivel..."
              searchFilter={(row, term) =>
                (row.departamentos?.nombre || '').toLowerCase().includes(term) ||
                (row.nivel || '').toLowerCase().includes(term) ||
                (row.tipo || '').toLowerCase().includes(term) ||
                String(row.anio).includes(term)
              }
            />

            <DataTable
              title="Población Total de Bolivia (2000 - 2050)"
              subtitle="51 años continuos de estimaciones censales y proyecciones oficiales"
              data={data.ine_poblacion}
              columns={[
                { key: 'anio', header: 'Año', width: 'w-24', align: 'center' },
                {
                  key: 'poblacion',
                  header: 'Población Total Habitantes',
                  align: 'right',
                  render: (r) => (
                    <span className="font-medium text-slate-900 text-sm">
                      {r.poblacion.toLocaleString('es-BO')} hab.
                    </span>
                  ),
                },
              ]}
              searchPlaceholder="Buscar año..."
            />

            <DataTable
              title="Proyección de Población por Grupos de Edad (2024 - 2034)"
              subtitle="Desglose por departamento, año y edad según proyecciones oficiales del INE"
              data={selectedDeptId === 'all' ? data.ine_proyeccion_edad : data.ine_proyeccion_edad.filter((r) => r.departamento_id === selectedDeptId)}
              columns={[
                { key: 'anio', header: 'Año Proyectado', width: 'w-28', align: 'center' },
                {
                  key: 'departamento',
                  header: 'Departamento',
                  render: (r) => (
                    <span className="font-medium text-slate-700">
                      {r.departamentos?.nombre || (r.departamento_id ? departamentosList.find((d) => d.id === r.departamento_id)?.nombre : 'Nacional')}
                    </span>
                  ),
                },
                { key: 'edad', header: 'Edad (Años)', width: 'w-24', align: 'center' },
                {
                  key: 'cantidad',
                  header: 'Cantidad Proyectada',
                  align: 'right',
                  render: (r) => (
                    <span className="font-semibold text-slate-900">
                      {r.cantidad.toLocaleString('es-BO')}
                    </span>
                  ),
                },
              ]}
              searchPlaceholder="Buscar por año, edad o departamento..."
            />
          </div>
        )
      }

      {/* Ficha Técnica de Fuentes Oficiales INE */}
      <SourceBadge
        sourceName="INE · Instituto Nacional de Estadística"
        institutionTitle="Censos Demográficos y Estadísticas Sociales de Bolivia"
        methodology="Series históricas y proyecciones de población elaboradas por el INE a partir de los Censos Nacionales de Población y Vivienda (CNPV) e información de registros administrativos de matrículas escolares."
        links={[
          {
            title: 'Portal Oficial Censo CPV 2024',
            url: 'http://cpv2024.ine.gob.bo/',
            institution: 'INE CPV 2024',
          },
          {
            title: 'CPV 2024 Resultados Demografía y Población',
            url: 'https://cpv2024.ine.gob.bo/index.php/resultados/resultados-demografia-demografia/resultados-demografia-poblacion/',
            institution: 'INE CPV 2024',
          },
          {
            title: 'INE Censos y Proyecciones de Población Sociales',
            url: 'https://www.ine.gob.bo/index.php/censos-y-proyecciones-de-poblacion-sociales/',
            institution: 'INE Bolivia',
            period: '2000-2050',
          },
          {
            title: 'INE Estadísticas Sociales y Censos Discapacidad',
            url: 'https://www.ine.gob.bo/index.php/estadisticas-sociales/censos-discapacidad/',
            institution: 'INE Bolivia',
          },
        ]}
      />
    </div >
  );
}
