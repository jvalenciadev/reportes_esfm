'use client';

import React, { useMemo } from 'react';
import { DashboardDataset } from '@/types/stats';
import { StatCard } from '../StatCard';
import { BarVisual } from '../BarVisual';
import { PieChart, PieSlice } from '../PieChart';
import { YearProgression } from '../YearProgression';
import { SourceBadge } from '../SourceBadge';
import {
  GraduationCapIcon,
  ChartBarIcon,
  SchoolIcon,
  AccessibilityIcon,
  BoliviaCoatIcon,
} from '../../ui/Icons';

interface OverviewViewProps {
  data: DashboardDataset;
  onNavigate: (tab: 'dgfm' | 'ine' | 'sie' | 'seie') => void;
}

export function OverviewView({ data, onNavigate }: OverviewViewProps) {
  // Totales
  const totalInscritosEsfm = useMemo(
    () => data.inscritos_esfm.reduce((acc, r) => acc + (r.total_inscritos || 0), 0),
    [data.inscritos_esfm]
  );
  const totalSieEstudiantes = useMemo(
    () => data.sie_total_estudiantes.reduce((acc, r) => acc + (r.cantidad || 0), 0),
    [data.sie_total_estudiantes]
  );
  const totalDiscapacidad = useMemo(
    () => data.discapacidad_seie.reduce((acc, r) => acc + (r.cantidad_est || 0), 0),
    [data.discapacidad_seie]
  );
  const totalIneMatricula = useMemo(
    () => data.ine_matricula.reduce((acc, r) => acc + (r.cantidad || 0), 0),
    [data.ine_matricula]
  );

  // Progresión por año de Inscritos ESFM (2016 a 2026)
  const esfmYearProgression = useMemo(() => {
    const map = new Map<number, number>();
    data.inscritos_esfm.forEach((r) => {
      map.set(r.gestion, (map.get(r.gestion) || 0) + (r.total_inscritos || 0));
    });
    return Array.from(map.entries())
      .sort((a, b) => a[0] - b[0])
      .map(([year, value]) => ({ year, value }));
  }, [data.inscritos_esfm]);

  // Torta 1: Distribución de Postulantes ESFM por Modalidad
  const modalidadPieData: PieSlice[] = useMemo(() => {
    const map = new Map<string, number>();
    data.inscritos_esfm.forEach((r) => {
      const mod = r.modalidad || 'Sin mod.';
      map.set(mod, (map.get(mod) || 0) + (r.total_inscritos || 0));
    });
    const colors = ['#1D4ED8', '#2563EB', '#3B82F6', '#60A5FA', '#93C5FD', '#BFDBFE'];
    return Array.from(map.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([label, value], idx) => ({
        label: `Modalidad ${label}`,
        value,
        color: colors[idx % colors.length],
      }));
  }, [data.inscritos_esfm]);

  // Torta 2: Distribución por Fuente Institucional (volumen de registros en base)
  const sourcesPieData: PieSlice[] = useMemo(() => {
    const dgfm = data.inscritos_esfm.length + data.esfm.length + data.especialidades.length;
    const ine = data.ine_matricula.length + data.ine_poblacion.length + data.ine_proyeccion_edad.length;
    const sie = data.sie_total_estudiantes.length + data.matricula_rural_urbana.length;
    const seie = data.discapacidad_seie.length;
    return [
      { label: 'DGFM (Formación Docente)', value: dgfm, color: '#1D4ED8', sublabel: 'Admisión ESFM' },
      { label: 'INE (Demografía y Censos)', value: ine, color: '#059669', sublabel: 'Población y Matrícula' },
      { label: 'SIE (Educación Regular)', value: sie, color: '#D97706', sublabel: 'Estadística 2026' },
      { label: 'SEIE (Educación Especial)', value: seie, color: '#7C3AED', sublabel: 'Discapacidad' },
    ];
  }, [data]);

  // Departamentos
  const depMap = new Map<number, { nombre: string; inscritos: number; sie: number }>();
  data.departamentos.forEach((d) => depMap.set(d.id, { nombre: d.nombre, inscritos: 0, sie: 0 }));
  data.inscritos_esfm.forEach((i) => {
    const it = depMap.get(i.departamento_id);
    if (it) it.inscritos += i.total_inscritos || 0;
  });
  data.sie_total_estudiantes.forEach((s) => {
    const it = depMap.get(s.departamento_id);
    if (it) it.sie += s.cantidad || 0;
  });

  const depInscritosBars = Array.from(depMap.values())
    .sort((a, b) => b.inscritos - a.inscritos)
    .map((d) => ({ label: d.nombre, value: d.inscritos, sublabel: 'postulantes' }));

  return (
    <div className="space-y-6">
      {/* Banner Institucional Oficial */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-6 sm:p-8 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="max-w-3xl">
            <div className="flex items-center gap-2.5 mb-2">
              <BoliviaCoatIcon size={26} className="drop-shadow-2xs" />
              <span className="text-xs font-black uppercase tracking-widest text-[#7d6325] font-heraldic">
                Estado Plurinacional de Bolivia · Ministerio de Educación
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight leading-tight font-heraldic">
              Sistema Integrado de Estadística para la Admisión ESFM
            </h1>
            <p className="text-xs sm:text-sm text-slate-600 mt-2 leading-relaxed font-sans">
              Consolidación interinstitucional de series demográficas y educativas para la formulación
              de políticas de cupos y oferta académica docente en las 46 sedes ESFM y Unidades Académicas.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-2 shrink-0">
            <button
              onClick={() => onNavigate('dgfm')}
              className="px-4 py-2.5 rounded-xl bg-blue-700 text-white font-bold text-xs hover:bg-blue-800 transition-all shadow-xs"
            >
              Ver Admisiones DGFM →
            </button>
            <button
              onClick={() => onNavigate('ine')}
              className="px-4 py-2.5 rounded-xl bg-slate-100 text-slate-700 font-bold text-xs hover:bg-slate-200 transition-all border border-slate-200"
            >
              Ver Censos INE →
            </button>
          </div>
        </div>
      </div>

      {/* 4 KPIs con Iconos Institucionales (Sin Emoticones) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Postulantes a ESFM"
          value={totalInscritosEsfm}
          subtitle="2016 - 2026 (11 convocatorias)"
          sourceBadge="DGFM"
          sourceColor="blue"
          icon={<GraduationCapIcon size={22} className="text-blue-700" />}
        />
        <StatCard
          title="Matrícula General INE"
          value={totalIneMatricula}
          subtitle="Series estadísticas 2011 - 2025"
          sourceBadge="INE"
          sourceColor="emerald"
          icon={<ChartBarIcon size={22} className="text-emerald-700" />}
        />
        <StatCard
          title="Estudiantes Regular SIE"
          value={totalSieEstudiantes}
          subtitle="Gestión 2026 (Inicial, Primaria, Sec.)"
          sourceBadge="SIE"
          sourceColor="amber"
          icon={<SchoolIcon size={22} className="text-amber-700" />}
        />
        <StatCard
          title="Educación Especial SEIE"
          value={totalDiscapacidad}
          subtitle="Atención a la Discapacidad"
          sourceBadge="SEIE"
          sourceColor="purple"
          icon={<AccessibilityIcon size={22} className="text-purple-700" />}
        />
      </div>

      {/* Progresión Temporal Año a Año (Para Exposición) */}
      <YearProgression
        title="Progresión Anual de Postulantes a ESFM (2016 - 2026)"
        subtitle="Evolución año por año con tasa de variación porcentual interanual para exposición"
        data={esfmYearProgression}
        unit="postulantes"
        color="#1D4ED8"
      />

      {/* Gráficos de Torta de Todo Tipo */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        <div className="min-w-0">
          <PieChart
            title="Distribución de Postulantes por Modalidad de Ingreso"
            subtitle="Proporción de postulaciones por modalidad en las ESFMs"
            data={modalidadPieData}
            donut={true}
            unit="postulantes"
          />
        </div>
        <div className="min-w-0">
          <PieChart
            title="Distribución de Registros en la Base por Institución"
            subtitle="Participación porcentual de las fuentes oficiales en el repositorio"
            data={sourcesPieData}
            donut={true}
            unit="filas"
          />
        </div>
      </div>

      {/* Gráfico Departamental */}
      <BarVisual
        title="Postulantes Acumulados a ESFM por Departamento (2016-2026)"
        subtitle="Concentración de aspirantes a la docencia por departamento según DGFM"
        items={depInscritosBars}
        colorTheme="blue"
        unit="postulantes"
      />

      {/* Ficha Técnica de Fuentes con Enlaces Oficiales */}
      <SourceBadge
        sourceName="Fuentes Integradas Oficiales de Bolivia"
        institutionTitle="DGFM · INE · SIE · SEIE"
        methodology="Cruce de datos secundarios provenientes de convocatorias ministeriales, registros administrativos anuales del SIE/SEIE y censos nacionales del Instituto Nacional de Estadística."
        links={[
          {
            title: 'SEIE Reportes Estadísticos de Discapacidad',
            url: 'https://seie.minedu.gob.bo/reportes/estadisticas/grupo1/discapacidad',
            institution: 'Ministerio de Educación',
            period: '2011-2025',
          },
          {
            title: 'INE Censos y Discapacidad',
            url: 'https://www.ine.gob.bo/index.php/estadisticas-sociales/censos-discapacidad/',
            institution: 'INE Bolivia',
          },
          {
            title: 'INE Proyecciones de Población',
            url: 'https://www.ine.gob.bo/index.php/censos-y-proyecciones-de-poblacion-sociales/',
            institution: 'INE Bolivia',
            period: '2000-2050',
          },
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
        ]}
      />
    </div>
  );
}
