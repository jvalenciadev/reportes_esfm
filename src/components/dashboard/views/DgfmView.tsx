'use client';

import React, { useState, useMemo } from 'react';
import { DashboardDataset, InscritoEsfm } from '@/types/stats';
import { StatCard } from '../StatCard';
import { BarVisual } from '../BarVisual';
import { PieChart, PieSlice } from '../PieChart';
import { YearProgression } from '../YearProgression';
import { DataTable, ColumnDef } from '../DataTable';
import { SourceBadge } from '../SourceBadge';
import {
  GraduationCapIcon,
  BuildingIcon,
  ChartPieIcon,
  CalendarIcon,
} from '../../ui/Icons';

interface DgfmViewProps {
  data: DashboardDataset;
}

export function DgfmView({ data }: DgfmViewProps) {
  const [activeSubTab, setActiveSubTab] = useState<'inscritos' | 'esfm' | 'especialidades'>('inscritos');

  // Cálculos estadísticos
  const totalInscritos = useMemo(
    () => data.inscritos_esfm.reduce((acc, r) => acc + (r.total_inscritos || 0), 0),
    [data.inscritos_esfm]
  );

  // Progresión por año (2016-2026)
  const progressionData = useMemo(() => {
    const map = new Map<number, number>();
    data.inscritos_esfm.forEach((r) => {
      map.set(r.gestion, (map.get(r.gestion) || 0) + (r.total_inscritos || 0));
    });
    return Array.from(map.entries())
      .sort((a, b) => a[0] - b[0])
      .map(([year, value]) => ({ year, value }));
  }, [data.inscritos_esfm]);

  // Torta: Modalidades de Ingreso a ESFM
  const modPieData: PieSlice[] = useMemo(() => {
    const map = new Map<string, number>();
    data.inscritos_esfm.forEach((r) => {
      const mod = r.modalidad || 'Sin mod.';
      map.set(mod, (map.get(mod) || 0) + (r.total_inscritos || 0));
    });
    const colors = ['#1D4ED8', '#059669', '#D97706', '#7C3AED', '#E11D48', '#0284C7'];
    return Array.from(map.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([label, value], idx) => ({
        label: `Modalidad ${label}`,
        value,
        color: colors[idx % colors.length],
      }));
  }, [data.inscritos_esfm]);

  // Torta: Especialidades agrupadas por Área de Formación
  const areaFormacionPieData: PieSlice[] = useMemo(() => {
    let exactas = 0;
    let humanidades = 0;
    let inicialPrimaria = 0;
    let tecnica = 0;
    let otras = 0;

    data.inscritos_esfm.forEach((r) => {
      const esp = (r.especialidades?.nombre || '').toUpperCase();
      const cant = r.total_inscritos || 0;
      if (esp.includes('MATEMÁTICA') || esp.includes('FÍSICA') || esp.includes('QUÍMICA') || esp.includes('BIOLOGÍA')) {
        exactas += cant;
      } else if (esp.includes('INICIAL') || esp.includes('PRIMARIA')) {
        inicialPrimaria += cant;
      } else if (esp.includes('TÉCNICA') || esp.includes('TECNOLÓGICA') || esp.includes('MECÁNICA') || esp.includes('ELECTRICIDAD') || esp.includes('AGROPECUARIA')) {
        tecnica += cant;
      } else if (esp.includes('COMUNICACIÓN') || esp.includes('LENGUAJES') || esp.includes('SOCIALES') || esp.includes('FILOSOFÍA')) {
        humanidades += cant;
      } else {
        otras += cant;
      }
    });

    return [
      { label: 'Inicial y Primaria', value: inicialPrimaria, color: '#1D4ED8', sublabel: 'Nivel base comunitaria' },
      { label: 'Ciencias Exactas y Naturales', value: exactas, color: '#059669', sublabel: 'Física, Química, Matemática' },
      { label: 'Técnica Tecnológica Productiva', value: tecnica, color: '#D97706', sublabel: 'Talleres e industria' },
      { label: 'Comunicación y Ciencias Sociales', value: humanidades, color: '#7C3AED', sublabel: 'Lenguas y sociales' },
      { label: 'Otras Especialidades y Artes', value: otras, color: '#E11D48', sublabel: 'Musical, Artes Plásticas' },
    ];
  }, [data.inscritos_esfm]);

  // Top 10 Especialidades
  const espMap = useMemo(() => {
    const map = new Map<string, number>();
    data.inscritos_esfm.forEach((r) => {
      const espName = r.especialidades?.nombre || `Esp #${r.especialidad_id}`;
      map.set(espName, (map.get(espName) || 0) + (r.total_inscritos || 0));
    });
    return Array.from(map.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([nombre, total]) => ({
        label: nombre,
        value: total,
      }));
  }, [data.inscritos_esfm]);

  // Totales por ESFM
  const esfmTotals = useMemo(() => {
    const map = new Map<number, number>();
    data.inscritos_esfm.forEach((r) => {
      map.set(r.esfm_id, (map.get(r.esfm_id) || 0) + (r.total_inscritos || 0));
    });
    return data.esfm.map((e) => ({
      ...e,
      total_postulantes: map.get(e.id) || 0,
    })).sort((a, b) => b.total_postulantes - a.total_postulantes);
  }, [data.esfm, data.inscritos_esfm]);

  // Columnas de tabla inscritos
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
        <span className="text-blue-800 font-medium truncate block max-w-xs" title={r.especialidades?.nombre}>
          {r.especialidades?.nombre || `Esp #${r.especialidad_id}`}
        </span>
      ),
    },
    {
      key: 'modalidad',
      header: 'Modalidad',
      align: 'center',
      render: (r) => (
        <span className="bg-blue-50 text-blue-800 border border-blue-200 px-2 py-0.5 rounded text-[11px] font-bold">
          Mod. {r.modalidad}
        </span>
      ),
    },
    {
      key: 'total_inscritos',
      header: 'Postulantes',
      align: 'right',
      render: (r) => (
        <span className="font-bold text-slate-900 font-mono">
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
            <span className="text-[10px] font-black uppercase tracking-wider bg-blue-50 text-blue-800 border border-blue-200 px-2.5 py-0.5 rounded-md">
              DGFM · Formación de Maestros
            </span>
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">
            Estadísticas Históricas de Postulación a ESFM (2016 - 2026)
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Datos oficiales de las 46 Escuelas Superiores de Formación de Maestros y 40 especialidades pedagógicas.
          </p>
        </div>
      </div>

      {/* 4 KPIs con Iconos */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Postulantes"
          value={totalInscritos}
          subtitle="2016 - 2026 (11 gestiones)"
          sourceBadge="DGFM"
          sourceColor="blue"
          icon={<GraduationCapIcon size={22} className="text-blue-700" />}
        />
        <StatCard
          title="Gestiones Analizadas"
          value="11 Años"
          subtitle="Series anuales continuas"
          sourceBadge="Periodo"
          sourceColor="blue"
          icon={<CalendarIcon size={22} className="text-blue-700" />}
        />
        <StatCard
          title="Sedes ESFM / UA"
          value={data.esfm.length}
          subtitle="Catálogo nacional activo"
          sourceBadge="Instituciones"
          sourceColor="blue"
          icon={<BuildingIcon size={22} className="text-blue-700" />}
        />
        <StatCard
          title="Especialidades"
          value={data.especialidades.length}
          subtitle="Oferta académica nacional"
          sourceBadge="Carreras"
          sourceColor="blue"
          icon={<ChartPieIcon size={22} className="text-blue-700" />}
        />
      </div>

      {/* Progresión Temporal Año a Año */}
      <YearProgression
        title="Progresión Anual de Postulantes por Convocatoria (2016 - 2026)"
        subtitle="Haga clic en cualquier año para visualizar la variación porcentual y comparar con gestiones anteriores"
        data={progressionData}
        unit="postulantes"
        color="#1D4ED8"
      />

      {/* Gráficos de Torta y Barras */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        <div className="min-w-0">
          <PieChart
            title="Distribución por Áreas de Especialidad Pedagógica"
            subtitle="Participación porcentual de postulantes según macro-campo formativo"
            data={areaFormacionPieData}
            donut={true}
            unit="postulantes"
          />
        </div>
        <div className="min-w-0">
          <PieChart
            title="Postulantes por Modalidad de Admisión"
            subtitle="Proporción de modalidades en las convocatorias"
            data={modPieData}
            donut={true}
            unit="postulantes"
          />
        </div>
      </div>

      <BarVisual
        title="Top 10 Especialidades con Mayor Demanda Nacional"
        subtitle="Especialidades con mayor cantidad de aspirantes en el país"
        items={espMap}
        colorTheme="blue"
        unit="postulantes"
        maxItems={10}
      />

      {/* Sub-Tabs de Tablas y Catálogos */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
        <div className="flex items-center gap-2 mb-4 border-b border-slate-200 pb-3">
          <button
            onClick={() => setActiveSubTab('inscritos')}
            className={`text-xs font-bold px-3 py-1.5 rounded-lg transition-colors ${
              activeSubTab === 'inscritos'
                ? 'bg-blue-700 text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Registros Detallados ({data.inscritos_esfm.length.toLocaleString('es-BO')})
          </button>
          <button
            onClick={() => setActiveSubTab('esfm')}
            className={`text-xs font-bold px-3 py-1.5 rounded-lg transition-colors ${
              activeSubTab === 'esfm'
                ? 'bg-blue-700 text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Catálogo de ESFM ({data.esfm.length})
          </button>
          <button
            onClick={() => setActiveSubTab('especialidades')}
            className={`text-xs font-bold px-3 py-1.5 rounded-lg transition-colors ${
              activeSubTab === 'especialidades'
                ? 'bg-blue-700 text-white shadow-xs'
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
            data={esfmTotals}
            columns={[
              { key: 'id', header: 'ID', width: 'w-16', align: 'center' },
              { key: 'nombre', header: 'Nombre Oficial de la ESFM / Unidad Académica' },
              {
                key: 'total_postulantes',
                header: 'Postulantes Totales Acumulados',
                align: 'right',
                render: (r) => (
                  <span className="font-bold text-slate-900 font-mono">
                    {r.total_postulantes.toLocaleString('es-BO')}
                  </span>
                ),
              },
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
  );
}
