'use client';

import React, { useMemo } from 'react';
import { DashboardDataset } from '@/types/stats';
import { StatCard } from '../StatCard';
import { BarVisual } from '../BarVisual';
import { PieChart, PieSlice } from '../PieChart';
import { YearProgression } from '../YearProgression';
import { DataTable, ColumnDef } from '../DataTable';
import { SourceBadge } from '../SourceBadge';
import {
  AccessibilityIcon,
  UsersIcon,
  TrendingUpIcon,
  CalendarIcon,
} from '../../ui/Icons';

interface SeieViewProps {
  data: DashboardDataset;
}

export function SeieView({ data }: SeieViewProps) {
  // Cálculos estadísticos
  const totalEstudiantes = useMemo(
    () => data.discapacidad_seie.reduce((acc, r) => acc + (r.cantidad_est || 0), 0),
    [data.discapacidad_seie]
  );

  // Progresión por año (2011-2025)
  const progressionData = useMemo(() => {
    const map = new Map<number, number>();
    data.discapacidad_seie.forEach((r) => {
      map.set(r.anio, (map.get(r.anio) || 0) + (r.cantidad_est || 0));
    });
    return Array.from(map.entries())
      .sort((a, b) => a[0] - b[0])
      .map(([year, value]) => ({ year, value }));
  }, [data.discapacidad_seie]);

  // Torta 1: Distribución Urbana vs Rural
  const areaPieData: PieSlice[] = useMemo(() => {
    let urbana = 0;
    let rural = 0;
    data.discapacidad_seie.forEach((r) => {
      if (r.area.toLowerCase().includes('urb')) {
        urbana += r.cantidad_est || 0;
      } else {
        rural += r.cantidad_est || 0;
      }
    });
    return [
      { label: 'Área Urbana', value: urbana, color: '#c9a751', sublabel: 'Centros de educación especial en ciudades' },
      { label: 'Área Rural', value: rural, color: '#059669', sublabel: 'Cobertura en distritos rurales' },
    ];
  }, [data.discapacidad_seie]);

  // Torta 2: Distribución por Quinquenios de Atención
  const quinquenioPieData: PieSlice[] = useMemo(() => {
    let q1 = 0; // 2011-2015
    let q2 = 0; // 2016-2020
    let q3 = 0; // 2021-2025
    data.discapacidad_seie.forEach((r) => {
      if (r.anio >= 2011 && r.anio <= 2015) q1 += r.cantidad_est || 0;
      else if (r.anio >= 2016 && r.anio <= 2020) q2 += r.cantidad_est || 0;
      else if (r.anio >= 2021 && r.anio <= 2025) q3 += r.cantidad_est || 0;
    });
    return [
      { label: 'Periodo 2011 - 2015', value: q1, color: '#d8c386', sublabel: 'Inicio implementación Ley 070' },
      { label: 'Periodo 2016 - 2020', value: q2, color: '#a08035', sublabel: 'Consolidación de centros' },
      { label: 'Periodo 2021 - 2025', value: q3, color: '#c9a751', sublabel: 'Quinquenio reciente' },
    ];
  }, [data.discapacidad_seie]);

  // Columnas tabla SEIE
  const seieColumns: ColumnDef<DashboardDataset['discapacidad_seie'][0]>[] = [
    { key: 'anio', header: 'Año', width: 'w-24', align: 'center' },
    {
      key: 'area',
      header: 'Área Territorial',
      render: (r) => (
        <span
          className={`px-2.5 py-0.5 rounded text-xs font-semibold ${
            r.area.toLowerCase().includes('urb')
              ? 'bg-[#faf5e8] text-[#7d6325] border border-[#e5d5a6]'
              : 'bg-emerald-50 text-emerald-800 border border-emerald-200'
          }`}
        >
          {r.area}
        </span>
      ),
    },
    {
      key: 'cantidad_est',
      header: 'Estudiantes Registrados',
      align: 'right',
      render: (r) => (
        <span className="font-bold text-slate-900 font-mono">
          {(r.cantidad_est || 0).toLocaleString('es-BO')}
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header Institucional SEIE con color principal #c9a751 */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-xs">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] font-black uppercase tracking-wider bg-[#faf5e8] text-[#7d6325] border border-[#e5d5a6] px-2.5 py-0.5 rounded-md">
              SEIE · Educación Especial
            </span>
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">
            Inclusión de Estudiantes con Discapacidad (2011 - 2025)
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Matrícula del Subsistema de Educación Especial en áreas urbana y rural para la planificación de maestros inclusivos.
          </p>
        </div>
      </div>

      {/* 4 KPIs con Iconos */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Registrados"
          value={totalEstudiantes}
          subtitle="Acumulado histórico 2011-2025"
          sourceBadge="SEIE"
          sourceColor="purple"
          icon={<AccessibilityIcon size={22} className="text-[#a08035]" />}
        />
        <StatCard
          title="Área Urbana"
          value={areaPieData[0]?.value || 0}
          subtitle="Concentración en ciudades"
          sourceBadge="Urbana"
          sourceColor="purple"
          icon={<UsersIcon size={22} className="text-[#a08035]" />}
        />
        <StatCard
          title="Área Rural"
          value={areaPieData[1]?.value || 0}
          subtitle="Centros en distritos rurales"
          sourceBadge="Rural"
          sourceColor="purple"
          icon={<TrendingUpIcon size={22} className="text-[#a08035]" />}
        />
        <StatCard
          title="Periodo Histórico"
          value="15 Años"
          subtitle="2011 a 2025 continuo"
          sourceBadge="Años"
          sourceColor="purple"
          icon={<CalendarIcon size={22} className="text-[#a08035]" />}
        />
      </div>

      {/* Progresión Temporal Año a Año */}
      <YearProgression
        title="Progresión Anual de Estudiantes con Discapacidad (2011 - 2025)"
        subtitle="Evolución año por año de la matrícula especial para sustentar la oferta de la especialidad de Educación Especial en ESFM"
        data={progressionData}
        unit="estudiantes"
        color="#c9a751"
      />

      {/* Gráficos de Torta de Todo Tipo */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        <div className="min-w-0">
          <PieChart
            title="Distribución Total: Área Urbana vs Área Rural"
            subtitle="Comparativa acumulada en centros de educación especial"
            data={areaPieData}
            donut={true}
            unit="estudiantes"
          />
        </div>
        <div className="min-w-0">
          <PieChart
            title="Evolución por Quinquenios de Atención Especial"
            subtitle="Comparativa de volumen por etapas de gestión institucional"
            data={quinquenioPieData}
            donut={true}
            unit="estudiantes"
          />
        </div>
      </div>

      {/* Tabla completa de datos */}
      <DataTable
        title="Histórico de Atención a la Discapacidad (2011 - 2025)"
        subtitle="30 registros anuales desagregados por área territorial"
        data={data.discapacidad_seie}
        columns={seieColumns}
        searchPlaceholder="Buscar por año o área..."
      />

      {/* Ficha Técnica con los enlaces oficiales solicitados por el usuario */}
      <SourceBadge
        sourceName="SEIE & INE · Estadísticas de Discapacidad"
        institutionTitle="Ministerio de Educación & Instituto Nacional de Estadística"
        methodology="Registros administrativos anuales del Sistema de Educación Especial (SEIE) cotejados con las variables de discapacidad de los Censos Nacionales de Población y Vivienda."
        links={[
          {
            title: 'SEIE Reportes de Discapacidad',
            url: 'https://seie.minedu.gob.bo/reportes/estadisticas/grupo1/discapacidad',
            institution: 'Ministerio de Educación',
            period: '2011-2025',
          },
          {
            title: 'INE Estadísticas Sociales y Censos Discapacidad',
            url: 'https://www.ine.gob.bo/index.php/estadisticas-sociales/censos-discapacidad/',
            institution: 'INE Bolivia',
          },
        ]}
      />
    </div>
  );
}
