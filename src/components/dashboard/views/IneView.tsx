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
} from '../../ui/Icons';

interface IneViewProps {
  data: DashboardDataset;
}

export function IneView({ data }: IneViewProps) {
  const [activeTab, setActiveTab] = useState<'lineas' | 'comparativo_anual' | 'tablas'>('lineas');
  const [poblacionFilter, setPoblacionFilter] = useState<'all' | 'hist' | 'proy'>('all');

  // Cálculos estadísticos
  const totalMatricula = useMemo(
    () => data.ine_matricula.reduce((acc, r) => acc + (r.cantidad || 0), 0),
    [data.ine_matricula]
  );

  const poblacion2026 = useMemo(() => {
    const item = data.ine_poblacion.find((p) => p.anio === 2026);
    return item ? item.poblacion : 12332500;
  }, [data.ine_poblacion]);

  const poblacion2050 = useMemo(() => {
    const item = data.ine_poblacion.find((p) => p.anio === 2050);
    return item ? item.poblacion : 14500000;
  }, [data.ine_poblacion]);

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

    data.ine_matricula.forEach((r) => {
      const isPub = (r.tipo || '').toLowerCase().includes('públ') || (r.tipo || '').toLowerCase().includes('publ');
      if (isPub) {
        mapPub.set(r.anio, (mapPub.get(r.anio) || 0) + (r.cantidad || 0));
      } else {
        mapPriv.set(r.anio, (mapPriv.get(r.anio) || 0) + (r.cantidad || 0));
      }
    });

    const years = Array.from(new Set(data.ine_matricula.map((r) => r.anio))).sort((a, b) => a - b);

    return [
      {
        id: 'publico',
        name: 'Sector Público',
        color: '#c9a751',
        data: years.map((y) => ({ year: y, value: mapPub.get(y) || 0 })),
      },
      {
        id: 'privado',
        name: 'Sector Privado',
        color: '#475569',
        data: years.map((y) => ({ year: y, value: mapPriv.get(y) || 0 })),
      },
    ];
  }, [data.ine_matricula]);

  // 3. SERIE LINEAL: Matrícula Escolar INE 2011-2025 (INICIAL vs PRIMARIA vs SECUNDARIA)
  const nivelesLineSeries: TrendSeries[] = useMemo(() => {
    const mapInic = new Map<number, number>();
    const mapPrim = new Map<number, number>();
    const mapSecu = new Map<number, number>();

    data.ine_matricula.forEach((r) => {
      const niv = (r.nivel || '').toLowerCase();
      const cant = r.cantidad || 0;
      if (niv.includes('inic')) mapInic.set(r.anio, (mapInic.get(r.anio) || 0) + cant);
      else if (niv.includes('prim')) mapPrim.set(r.anio, (mapPrim.get(r.anio) || 0) + cant);
      else if (niv.includes('secu')) mapSecu.set(r.anio, (mapSecu.get(r.anio) || 0) + cant);
    });

    const years = Array.from(new Set(data.ine_matricula.map((r) => r.anio))).sort((a, b) => a - b);

    return [
      {
        id: 'primaria',
        name: 'Nivel Primaria',
        color: '#059669',
        data: years.map((y) => ({ year: y, value: mapPrim.get(y) || 0 })),
      },
      {
        id: 'secundaria',
        name: 'Nivel Secundaria',
        color: '#2563EB',
        data: years.map((y) => ({ year: y, value: mapSecu.get(y) || 0 })),
      },
      {
        id: 'inicial',
        name: 'Nivel Inicial',
        color: '#c9a751',
        data: years.map((y) => ({ year: y, value: mapInic.get(y) || 0 })),
      },
    ];
  }, [data.ine_matricula]);

  // 4. SERIE LINEAL: Proyección por Edades (2024 - 2034) - Cohortes Clave para ESFM
  const edadesLineSeries: TrendSeries[] = useMemo(() => {
    const map17 = new Map<number, number>();
    const map18 = new Map<number, number>();
    const map19 = new Map<number, number>();
    const map20 = new Map<number, number>();

    data.ine_proyeccion_edad.forEach((r) => {
      if (r.edad === 17) map17.set(r.anio, r.cantidad);
      else if (r.edad === 18) map18.set(r.anio, r.cantidad);
      else if (r.edad === 19) map19.set(r.anio, r.cantidad);
      else if (r.edad === 20) map20.set(r.anio, r.cantidad);
    });

    const years = Array.from(new Set(data.ine_proyeccion_edad.map((r) => r.anio))).sort((a, b) => a - b);

    return [
      {
        id: 'edad_18',
        name: '18 Años (Edad ingreso ESFM)',
        color: '#c9a751',
        data: years.map((y) => ({ year: y, value: map18.get(y) || 0 })),
      },
      {
        id: 'edad_17',
        name: '17 Años (Egreso Bachiller)',
        color: '#2563EB',
        data: years.map((y) => ({ year: y, value: map17.get(y) || 0 })),
      },
      {
        id: 'edad_19',
        name: '19 Años',
        color: '#059669',
        data: years.map((y) => ({ year: y, value: map19.get(y) || 0 })),
      },
      {
        id: 'edad_20',
        name: '20 Años',
        color: '#9333EA',
        data: years.map((y) => ({ year: y, value: map20.get(y) || 0 })),
      },
    ];
  }, [data.ine_proyeccion_edad]);

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

  // Torta: Proporción Público vs Privado acumulada (datos reales INE 2011-2025)
  const pubPrivPieData: PieSlice[] = useMemo(() => {
    let pub = 0;
    let priv = 0;
    data.ine_matricula.forEach((r) => {
      const isPub = (r.tipo || '').toLowerCase().includes('públ') || (r.tipo || '').toLowerCase().includes('publ');
      if (isPub) pub += r.cantidad || 0;
      else priv += r.cantidad || 0;
    });
    return [
      { label: 'Sector Público', value: pub, color: '#c9a751', sublabel: 'Unidades educativas estatales' },
      { label: 'Sector Privado', value: priv, color: '#475569', sublabel: 'Unidades educativas particulares' },
    ];
  }, [data.ine_matricula]);

  // Torta: Matrícula por Niveles
  const nivelesPieData: PieSlice[] = useMemo(() => {
    let inic = 0;
    let prim = 0;
    let secu = 0;
    data.ine_matricula.forEach((r) => {
      const niv = (r.nivel || '').toLowerCase();
      const cant = r.cantidad || 0;
      if (niv.includes('inic')) inic += cant;
      else if (niv.includes('prim')) prim += cant;
      else if (niv.includes('secu')) secu += cant;
    });
    return [
      { label: 'Nivel Primaria', value: prim, color: '#059669', sublabel: 'Mayor población' },
      { label: 'Nivel Secundaria', value: secu, color: '#2563EB', sublabel: 'Bachilleres potenciales' },
      { label: 'Nivel Inicial', value: inic, color: '#c9a751', sublabel: 'Primera infancia' },
    ];
  }, [data.ine_matricula]);

  return (
    <div className="space-y-6">
      {/* Header Institucional INE */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-xs">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] font-black uppercase tracking-wider bg-[#faf5e8] text-[#7d6325] border border-[#e5d5a6] px-2.5 py-0.5 rounded-md">
              INE · Instituto Nacional de Estadística
            </span>
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">
            Tendencias Temporales Lineales y Demografía Oficial
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Análisis lineal en el tiempo: Población (2000-2050), Matrícula Escolar Público vs Privado, Inicial-Primaria-Secundaria (2011-2025) y Cohortes por Edad.
          </p>
        </div>

        {/* Selector de Vistas de Análisis */}
        <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs font-bold shrink-0">
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
          value={data.ine_proyeccion_edad.find((p) => p.anio === 2026 && p.edad === 18)?.cantidad || 245000}
          subtitle="Universo de egreso bachiller"
          sourceBadge="Postulantes"
          sourceColor="amber"
          icon={<CalendarIcon size={22} className="text-[#a08035]" />}
        />
      </div>

      {/* VISTA 1: GRÁFICOS LINEALES DE TENDENCIAS EN EL TIEMPO */}
      {activeTab === 'lineas' && (
        <div className="space-y-6">
          {/* 1. EXPLORADOR DEMOGRÁFICO CREATIVO: POBLACIÓN DE BOLIVIA (2000 - 2050) */}
          <BoliviaDemographicExplorer data={data.ine_poblacion} />

          {/* 2 y 3. LÍNEAS DE MATRÍCULA ESCOLAR: PÚBLICO VS PRIVADO & NIVELES EDUCATIVOS */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
            <TrendLineChart
              title="Matrícula Escolar: Sector Público vs Sector Privado (2011-2025)"
              subtitle="Evolución real de la matrícula escolar según el registro INE por tipo de dependencia"
              series={publicoVsPrivadoSeries}
              unit="estudiantes"
              height={300}
              showArea={false}
            />

            <TrendLineChart
              title="Matrícula por Nivel: Inicial vs Primaria vs Secundaria"
              subtitle="Tendencia temporal desagregada por los tres niveles del subsistema regular (2011-2025)"
              series={nivelesLineSeries}
              unit="estudiantes"
              height={300}
              showArea={false}
            />
          </div>

          {/* 4. EXPLORADOR DETALLADO DE PROYECCIÓN POR EDAD CON RANGO SELECCIONABLE (2024 - 2034) */}
          <AgeProjectionExplorer data={data.ine_proyeccion_edad} />

          {/* Tortas de Distribución */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
            <div className="min-w-0">
              <PieChart
                title="Proporción Acumulada: Sector Público vs Sector Privado"
                subtitle="Participación porcentual en las series históricas INE (2011-2025)"
                data={pubPrivPieData}
                donut={true}
                unit="estudiantes"
              />
            </div>
            <div className="min-w-0">
              <PieChart
                title="Distribución Acumulada por Nivel Escolar"
                subtitle="Concentración en Inicial, Primaria y Secundaria"
                data={nivelesPieData}
                donut={true}
                unit="estudiantes"
              />
            </div>
          </div>
        </div>
      )}

      {/* VISTA 2: COMPARATIVO AÑO A AÑO (CUÁNTO VA CRECIENDO) */}
      {activeTab === 'comparativo_anual' && (
        <div className="space-y-6">
          <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs">
            <div className="mb-4">
              <h3 className="text-lg font-black text-slate-900 tracking-tight">
                Matriz Comparativa Interanual: Cuánto Crece la Matrícula Año por Año
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Cálculo de variación interanual absoluta (+/- estudiantes) y tasa de crecimiento porcentual (%) anual.
              </p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase text-[11px]">
                    <th className="py-3 px-3">Gestión</th>
                    <th className="py-3 px-3 text-right">Matrícula Total</th>
                    <th className="py-3 px-3 text-center">Variación Anual</th>
                    <th className="py-3 px-3 text-right">Tasa Crecimiento (%)</th>
                    <th className="py-3 px-3 text-right text-[#7d6325]">Sector Público</th>
                    <th className="py-3 px-3 text-right text-slate-500">Sector Privado</th>
                    <th className="py-3 px-3 text-right text-emerald-700">Primaria</th>
                    <th className="py-3 px-3 text-right text-blue-700">Secundaria</th>
                    <th className="py-3 px-3 text-right text-amber-700">Inicial</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {comparativoAnualMatricula.map((row, idx) => (
                    <tr key={row.anio} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-3 font-bold font-mono text-slate-900 text-sm">
                        {row.anio}
                      </td>
                      <td className="py-3 px-3 text-right font-black font-mono text-slate-900 text-sm">
                        {row.total.toLocaleString('es-BO')}
                      </td>
                      <td className="py-3 px-3 text-center">
                        {idx === 0 ? (
                          <span className="text-[10px] text-slate-400 font-medium">Año base</span>
                        ) : (
                          <span
                            className={`font-mono font-bold px-2 py-0.5 rounded text-[11px] ${row.diff >= 0
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
                            className={`font-mono font-black text-xs ${row.growthRate >= 0 ? 'text-emerald-700' : 'text-rose-700'
                              }`}
                          >
                            {row.growthRate >= 0 ? `+${row.growthRate}%` : `${row.growthRate}%`}
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-3 text-right font-mono font-semibold text-slate-800">
                        {row.pub.toLocaleString('es-BO')}
                      </td>
                      <td className="py-3 px-3 text-right font-mono text-slate-600">
                        {row.priv.toLocaleString('es-BO')}
                      </td>
                      <td className="py-3 px-3 text-right font-mono text-emerald-800 font-semibold">
                        {row.prim.toLocaleString('es-BO')}
                      </td>
                      <td className="py-3 px-3 text-right font-mono text-blue-800 font-semibold">
                        {row.secu.toLocaleString('es-BO')}
                      </td>
                      <td className="py-3 px-3 text-right font-mono text-amber-800 font-semibold">
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
                    <span className="font-bold text-slate-900 font-mono">
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
                    <span className="font-bold text-slate-900 font-mono text-sm">
                      {r.poblacion.toLocaleString('es-BO')} hab.
                    </span>
                  ),
                },
              ]}
              searchPlaceholder="Buscar año..."
            />

            <DataTable
              title="Proyección de Población por Grupos de Edad (2024 - 2034)"
              subtitle="Desglose por año y edad para la planificación educativa"
              data={data.ine_proyeccion_edad}
              columns={[
                { key: 'anio', header: 'Año Proyectado', width: 'w-28', align: 'center' },
                { key: 'edad', header: 'Edad (Años)', width: 'w-28', align: 'center' },
                {
                  key: 'cantidad',
                  header: 'Cantidad Proyectada',
                  align: 'right',
                  render: (r) => (
                    <span className="font-bold text-slate-900 font-mono">
                      {r.cantidad.toLocaleString('es-BO')}
                    </span>
                  ),
                },
              ]}
              searchPlaceholder="Buscar por año o edad..."
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
