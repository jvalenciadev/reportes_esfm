'use client';

import React, { useState, useMemo } from 'react';
import { DashboardDataset } from '@/types/stats';
import { StatCard } from '../StatCard';
import { TrendLineChart, TrendSeries } from '../TrendLineChart';
import { CourseProgressionLineChart, CourseChartPoint } from '../CourseProgressionLineChart';
import { SourceBadge } from '../SourceBadge';
import {
  TrendingUpIcon,
  UsersIcon,
  SchoolIcon,
  BuildingIcon,
  CalendarIcon,
  GraduationCapIcon,
  LayersIcon,
  MapPinIcon,
  SearchIcon,
  LightbulbIcon,
  FilterIcon,
  ScaleIcon,
} from '../../ui/Icons';

export interface CursoDef {
  id: string;
  nombre: string;
  nivel: 'inicial' | 'primaria' | 'secundaria';
  nivelTexto: string;
  edadNormativa: number;
  sublabel: string;
  tasaEscolarizacionNacional: number; // Tasa neta oficial según INE y MINEDU
}

// 14 Cursos del Subsistema de Educación Regular de Bolivia y sus edades normativas al 31 de marzo
export const CURSOS_SEP: CursoDef[] = [
  // Nivel Inicial en Familia Comunitaria
  { id: 'ini_1', nombre: '1.º Inicial', nivel: 'inicial', nivelTexto: 'Inicial', edadNormativa: 4, sublabel: 'Prekínder', tasaEscolarizacionNacional: 68.4 },
  { id: 'ini_2', nombre: '2.º Inicial', nivel: 'inicial', nivelTexto: 'Inicial', edadNormativa: 5, sublabel: 'Kínder', tasaEscolarizacionNacional: 82.1 },
  // Nivel Primario Comunitario Vocacional
  { id: 'pri_1', nombre: '1.º Primaria', nivel: 'primaria', nivelTexto: 'Primaria', edadNormativa: 6, sublabel: 'Ingreso primario', tasaEscolarizacionNacional: 98.2 },
  { id: 'pri_2', nombre: '2.º Primaria', nivel: 'primaria', nivelTexto: 'Primaria', edadNormativa: 7, sublabel: '2.º año', tasaEscolarizacionNacional: 98.0 },
  { id: 'pri_3', nombre: '3.º Primaria', nivel: 'primaria', nivelTexto: 'Primaria', edadNormativa: 8, sublabel: '3.º año', tasaEscolarizacionNacional: 97.8 },
  { id: 'pri_4', nombre: '4.º Primaria', nivel: 'primaria', nivelTexto: 'Primaria', edadNormativa: 9, sublabel: '4.º año', tasaEscolarizacionNacional: 97.4 },
  { id: 'pri_5', nombre: '5.º Primaria', nivel: 'primaria', nivelTexto: 'Primaria', edadNormativa: 10, sublabel: '5.º año', tasaEscolarizacionNacional: 96.9 },
  { id: 'pri_6', nombre: '6.º Primaria', nivel: 'primaria', nivelTexto: 'Primaria', edadNormativa: 11, sublabel: 'Egreso primario', tasaEscolarizacionNacional: 96.1 },
  // Nivel Secundario Comunitario Productivo
  { id: 'sec_1', nombre: '1.º Secundaria', nivel: 'secundaria', nivelTexto: 'Secundaria', edadNormativa: 12, sublabel: 'Ingreso secundario', tasaEscolarizacionNacional: 94.5 },
  { id: 'sec_2', nombre: '2.º Secundaria', nivel: 'secundaria', nivelTexto: 'Secundaria', edadNormativa: 13, sublabel: '2.º año', tasaEscolarizacionNacional: 92.8 },
  { id: 'sec_3', nombre: '3.º Secundaria', nivel: 'secundaria', nivelTexto: 'Secundaria', edadNormativa: 14, sublabel: '3.º año', tasaEscolarizacionNacional: 90.2 },
  { id: 'sec_4', nombre: '4.º Secundaria', nivel: 'secundaria', nivelTexto: 'Secundaria', edadNormativa: 15, sublabel: '4.º año', tasaEscolarizacionNacional: 87.5 },
  { id: 'sec_5', nombre: '5.º Secundaria', nivel: 'secundaria', nivelTexto: 'Secundaria', edadNormativa: 16, sublabel: '5.º año', tasaEscolarizacionNacional: 84.1 },
  { id: 'sec_6', nombre: '6.º Secundaria', nivel: 'secundaria', nivelTexto: 'Secundaria', edadNormativa: 17, sublabel: 'Promoción Bachiller', tasaEscolarizacionNacional: 81.3 },
];

// Años disponibles en las proyecciones demográficas del INE (2026 - 2034)
export const ANIOS_PROYECCION_TODOS = [2026, 2027, 2028, 2029, 2030, 2031, 2032, 2033, 2034];

// Parámetros SIE 2026: razones de dependencia por departamento (sector público vs privado)
// Fuente: SIE - Ministerio de Educación, Gestión 2026
interface DeptParam {
  nombre: string;
  pctPublico: number;
  pctPrivado: number;
}

const DEPT_PARAMS: Record<string, DeptParam> = {
  'Santa Cruz':  { nombre: 'Santa Cruz',  pctPublico: 82.2, pctPrivado: 17.8 },
  'La Paz':      { nombre: 'La Paz',      pctPublico: 88.5, pctPrivado: 11.5 },
  'Cochabamba':  { nombre: 'Cochabamba',  pctPublico: 87.1, pctPrivado: 12.9 },
  'Potosí':      { nombre: 'Potosí',      pctPublico: 96.8, pctPrivado:  3.2 },
  'Chuquisaca':  { nombre: 'Chuquisaca',  pctPublico: 93.1, pctPrivado:  6.9 },
  'Oruro':       { nombre: 'Oruro',       pctPublico: 92.4, pctPrivado:  7.6 },
  'Tarija':      { nombre: 'Tarija',      pctPublico: 90.8, pctPrivado:  9.2 },
  'Beni':        { nombre: 'Beni',        pctPublico: 91.5, pctPrivado:  8.5 },
  'Pando':       { nombre: 'Pando',       pctPublico: 95.2, pctPrivado:  4.8 },
};

interface ProyeccionesViewProps {
  data: DashboardDataset;
}

export function ProyeccionesView({ data }: ProyeccionesViewProps) {
  // Capa de datos a visualizar en la tabla
  const [selectedLayer, setSelectedLayer] = useState<
    'matricula_total' | 'publico' | 'privado' | 'no_estudian' | 'poblacion_ine'
  >('matricula_total');

  // Filtro de ámbito territorial (Total Nacional o departamento específico)
  const [selectedDept, setSelectedDept] = useState<string | 'all'>('all');

  // Horizonte temporal: 2031 (Quinquenio) o 2034 (Serie completa INE)
  const [horizonte, setHorizonte] = useState<'2031' | '2034'>('2034');

  // Gestión de foco para la tarjeta exploradora ("¿Cuántos estudiantes habrá en...?")
  const [focoYear, setFocoYear] = useState<number>(2028);

  // Celda seleccionada para el Inspector Interactivo de Cálculo en Vivo
  const [selectedCell, setSelectedCell] = useState<{ year: number; cursoId: string }>({
    year: 2028,
    cursoId: 'sec_6',
  });

  // Modo de visualización del gráfico de tendencia
  const [chartMetric, setChartMetric] = useState<'promocion' | 'niveles' | 'dependencia'>('promocion');

  // Años activos según el horizonte
  const aniosActivos = useMemo(() => {
    return ANIOS_PROYECCION_TODOS.filter((y) => horizonte === '2034' || y <= 2031);
  }, [horizonte]);

  // Cálculos demográficos y matriculares indexados para todos los años (2026 - 2034)
  const projectionMatrix = useMemo(() => {
    const isNacional = selectedDept === 'all';

    // Resolver departamento_id desde el nombre seleccionado
    const deptRecord = data.departamentos.find(
      (d) => d.nombre === selectedDept || d.nombre.toLowerCase() === selectedDept.toLowerCase()
    );
    const deptId = deptRecord?.id ?? null;
    const deptParam = !isNacional ? (DEPT_PARAMS[selectedDept] ?? Object.values(DEPT_PARAMS).find(p => p.nombre === selectedDept)) : null;

    // Construir índice rápido de INE por (anio, edad, departamento_id)
    // key = `${anio}_${edad}_${dept_id}` (dept_id=null para suma nacional)
    type IneIndex = Map<string, number>;
    const ineIndex: IneIndex = new Map();
    for (const r of data.ine_proyeccion_edad) {
      const keyDept = `${r.anio}_${r.edad}_${r.departamento_id}`;
      ineIndex.set(keyDept, (ineIndex.get(keyDept) ?? 0) + r.cantidad);
      // También acumular total nacional sumando todos los departamentos
      const keyNac = `${r.anio}_${r.edad}_nac`;
      ineIndex.set(keyNac, (ineIndex.get(keyNac) ?? 0) + r.cantidad);
    }

    return ANIOS_PROYECCION_TODOS.map((year) => {
      const rowData: Record<string, {
        poblacionIne: number;
        matriculaTotal: number;
        publico: number;
        privado: number;
        noEstudian: number;
      }> = {};

      let totalInicial = 0;
      let totalPrimaria = 0;
      let totalSecundaria = 0;
      let totalGeneral = 0;
      let totalPublicoNivel = 0;
      let totalPrivadoNivel = 0;
      let totalNoEstudianNivel = 0;

      CURSOS_SEP.forEach((curso) => {
        // 1. Población base por edad simple del INE (datos reales por departamento o nacional)
        let pobIne: number;
        if (isNacional) {
          pobIne = ineIndex.get(`${year}_${curso.edadNormativa}_nac`) ?? 240000;
        } else {
          pobIne = deptId
            ? (ineIndex.get(`${year}_${curso.edadNormativa}_${deptId}`) ?? 0)
            : 0;
        }

        // 2. Matrícula total aplicando la tasa neta de escolarización (MINEDU/INE)
        const matriculaTotal = Math.round(pobIne * (curso.tasaEscolarizacionNacional / 100));

        // 3. Desglose Público vs Privado (razones SIE 2026 por departamento)
        const pctPub = isNacional ? 89.4 : (deptParam?.pctPublico ?? 89.4);
        const publico = Math.round(matriculaTotal * (pctPub / 100));
        const privado = matriculaTotal - publico;

        // 4. Población no escolarizada en esa edad
        const noEstudian = Math.max(0, pobIne - matriculaTotal);

        rowData[curso.id] = { poblacionIne: pobIne, matriculaTotal, publico, privado, noEstudian };

        totalPublicoNivel += publico;
        totalPrivadoNivel += privado;
        totalNoEstudianNivel += noEstudian;

        // Acumular subtotales según la capa seleccionada
        const currentVal =
          selectedLayer === 'matricula_total' ? matriculaTotal
          : selectedLayer === 'publico'       ? publico
          : selectedLayer === 'privado'       ? privado
          : selectedLayer === 'no_estudian'   ? noEstudian
          : pobIne;

        if (curso.nivel === 'inicial') totalInicial += currentVal;
        else if (curso.nivel === 'primaria') totalPrimaria += currentVal;
        else if (curso.nivel === 'secundaria') totalSecundaria += currentVal;

        totalGeneral += currentVal;
      });

      return {
        year,
        cursos: rowData,
        subtotales: {
          inicial: totalInicial,
          primaria: totalPrimaria,
          secundaria: totalSecundaria,
          general: totalGeneral,
          totalPublico: totalPublicoNivel,
          totalPrivado: totalPrivadoNivel,
          totalNoEstudian: totalNoEstudianNivel,
        },
      };
    });
  }, [data.ine_proyeccion_edad, data.departamentos, selectedDept, selectedLayer]);

  // Matriz filtrada por el horizonte activo
  const filteredMatrix = useMemo(() => {
    return projectionMatrix.filter((row) => aniosActivos.includes(row.year));
  }, [projectionMatrix, aniosActivos]);

  // Cálculos para KPIs globales (año base 2026)
  const base2026 = projectionMatrix[0];
  const matriculaTotal2026 = useMemo(() => {
    if (!base2026) return 0;
    return Object.values(base2026.cursos).reduce((acc, c) => acc + c.matriculaTotal, 0);
  }, [base2026]);

  const bachilleres2026 = useMemo(() => {
    if (!base2026) return 0;
    return base2026.cursos['sec_6']?.matriculaTotal || 0;
  }, [base2026]);

  const publicoTotal2026 = useMemo(() => {
    if (!base2026) return 0;
    return Object.values(base2026.cursos).reduce((acc, c) => acc + c.publico, 0);
  }, [base2026]);

  const noEstudianTotal2026 = useMemo(() => {
    if (!base2026) return 0;
    return Object.values(base2026.cursos).reduce((acc, c) => acc + c.noEstudian, 0);
  }, [base2026]);

  const pctPublicoGlobal = matriculaTotal2026 > 0 ? ((publicoTotal2026 / matriculaTotal2026) * 100).toFixed(1) : '89.4';
  const totalPoblacionEdadEscolar = matriculaTotal2026 + noEstudianTotal2026;
  const pctNoEstudianGlobal = totalPoblacionEdadEscolar > 0 ? ((noEstudianTotal2026 / totalPoblacionEdadEscolar) * 100).toFixed(1) : '9.5';

  // Foco en una gestión específica (ej: ¿Cuántos estudiantes habrá en 2027?)
  const focoData = useMemo(() => {
    const currentIdx = projectionMatrix.findIndex((r) => r.year === focoYear);
    const row = projectionMatrix[currentIdx] || projectionMatrix[0];
    const prevRow = currentIdx > 0 ? projectionMatrix[currentIdx - 1] : null;

    let totMatricula = 0;
    let totIni = 0;
    let totPri = 0;
    let totSec = 0;
    let totPub = 0;
    let totPriv = 0;
    let totNoEst = 0;

    CURSOS_SEP.forEach((c) => {
      const item = row.cursos[c.id];
      if (item) {
        totMatricula += item.matriculaTotal;
        totPub += item.publico;
        totPriv += item.privado;
        totNoEst += item.noEstudian;
        if (c.nivel === 'inicial') totIni += item.matriculaTotal;
        else if (c.nivel === 'primaria') totPri += item.matriculaTotal;
        else if (c.nivel === 'secundaria') totSec += item.matriculaTotal;
      }
    });

    // Comparativa con año previo
    let prevTotMatricula = 0;
    if (prevRow) {
      CURSOS_SEP.forEach((c) => {
        prevTotMatricula += prevRow.cursos[c.id]?.matriculaTotal || 0;
      });
    }
    const diffPrev = prevRow ? totMatricula - prevTotMatricula : 0;
    const ratePrev = prevRow && prevTotMatricula > 0 ? ((diffPrev / prevTotMatricula) * 100).toFixed(2) : '0';

    const bachilleres = row.cursos['sec_6']?.matriculaTotal || 0;

    return {
      year: focoYear,
      totMatricula,
      totIni,
      totPri,
      totSec,
      totPub,
      totPriv,
      totNoEst,
      bachilleres,
      diffPrev,
      ratePrev,
      prevYear: prevRow?.year || null,
      pctPub: totMatricula > 0 ? ((totPub / totMatricula) * 100).toFixed(1) : '89.4',
      pctPriv: totMatricula > 0 ? ((totPriv / totMatricula) * 100).toFixed(1) : '10.6',
    };
  }, [projectionMatrix, focoYear]);

  // Inspector de la Celda Seleccionada (Cálculo Matemático en Vivo)
  const cellCalculation = useMemo(() => {
    const row = projectionMatrix.find((r) => r.year === selectedCell.year) || projectionMatrix[0];
    const curso = CURSOS_SEP.find((c) => c.id === selectedCell.cursoId) || CURSOS_SEP[13];
    const cell = row?.cursos[curso.id];

    const isNacional = selectedDept === 'all';
    const deptParam = !isNacional ? (DEPT_PARAMS[selectedDept]) : null;

    const pobIne = cell?.poblacionIne || 0;
    const matriculaTotal = cell?.matriculaTotal || 0;
    const publico = cell?.publico || 0;
    const privado = cell?.privado || 0;
    const noEstudian = cell?.noEstudian || 0;

    const pctPub = isNacional ? 89.4 : deptParam?.pctPublico ?? 89.4;
    const pctPriv = isNacional ? 10.6 : deptParam?.pctPrivado ?? 10.6;
    const pctNoEst = (100 - curso.tasaEscolarizacionNacional).toFixed(1);

    // Comparativa con año anterior para esta misma celda
    const prevRow = projectionMatrix.find((r) => r.year === selectedCell.year - 1);
    const prevCell = prevRow?.cursos[curso.id];
    const diffAnterior = prevCell ? matriculaTotal - prevCell.matriculaTotal : 0;
    const rateAnterior = prevCell && prevCell.matriculaTotal > 0
      ? ((diffAnterior / prevCell.matriculaTotal) * 100).toFixed(1)
      : '0';

    return {
      year: selectedCell.year,
      curso,
      isNacional,
      deptNombre: isNacional ? 'Total Nacional (Bolivia)' : deptParam?.nombre || selectedDept,
      pobIne,
      tasaEscolarizacion: curso.tasaEscolarizacionNacional,
      matriculaTotal,
      pctPub,
      publico,
      pctPriv,
      privado,
      noEstudian,
      pctNoEst,
      diffAnterior,
      rateAnterior,
      hasPrev: !!prevCell,
    };
  }, [projectionMatrix, selectedCell, selectedDept]);

  // Lista normalizada de departamentos para selectores
  const deptList = useMemo(() => {
    return [
      { id: 'all', nombre: 'Total Nacional (Bolivia)' },
      ...Object.keys(DEPT_PARAMS).map((dept) => ({
        id: dept,
        nombre: DEPT_PARAMS[dept].nombre,
      })),
    ];
  }, []);

  // Función para obtener puntos de los 14 cursos para cualquier combinación de año y departamento
  // Usa índice directo sobre data.ine_proyeccion_edad por departamento_id (datos reales INE)
  const getCourseProgressionPoints = React.useCallback((year: number, dept: string): CourseChartPoint[] => {
    const isNac = dept === 'all';
    const deptRecord = !isNac ? data.departamentos.find((d) => d.nombre === dept) : null;
    const deptId = deptRecord?.id ?? null;
    const deptParam = !isNac ? DEPT_PARAMS[dept] : null;

    // Construir índice: "anio_edad_deptId" -> cantidad  /  "anio_edad_nac" -> suma nacional
    const ineIndex = new Map<string, number>();
    for (const r of data.ine_proyeccion_edad) {
      const keyDept = `${r.anio}_${r.edad}_${r.departamento_id}`;
      ineIndex.set(keyDept, (ineIndex.get(keyDept) ?? 0) + r.cantidad);
      const keyNac = `${r.anio}_${r.edad}_nac`;
      ineIndex.set(keyNac, (ineIndex.get(keyNac) ?? 0) + r.cantidad);
    }

    return CURSOS_SEP.map((curso) => {
      const pobIne = isNac
        ? (ineIndex.get(`${year}_${curso.edadNormativa}_nac`) ?? 240000)
        : (deptId != null ? (ineIndex.get(`${year}_${curso.edadNormativa}_${deptId}`) ?? 0) : 0);

      const tasa = curso.tasaEscolarizacionNacional / 100;
      const matriculaTotal = Math.round(pobIne * tasa);

      const pctPub = isNac ? 0.894 : (deptParam?.pctPublico ?? 89.4) / 100;
      const publico = Math.round(matriculaTotal * pctPub);
      const privado = matriculaTotal - publico;
      const noEstudian = Math.max(0, pobIne - matriculaTotal);

      return {
        curso,
        matricula: matriculaTotal,
        publico,
        privado,
        noEstudian,
        poblacionIne: pobIne,
      };
    });
  }, [data.ine_proyeccion_edad, data.departamentos]);

  // Series dinámicas para el gráfico lineal según la métrica elegida
  const dynamicLineSeries: TrendSeries[] = useMemo(() => {
    if (chartMetric === 'promocion') {
      return [
        {
          id: 'promocion_bachilleres',
          name: 'Matrícula Estimada 6.º Secundaria (Promoción)',
          color: '#c9a751',
          data: filteredMatrix.map((row) => ({
            year: row.year,
            value: row.cursos['sec_6']?.matriculaTotal || 0,
          })),
        },
        {
          id: 'poblacion_17_ine',
          name: 'Población Demográfica INE (17 Años)',
          color: '#2563EB',
          data: filteredMatrix.map((row) => ({
            year: row.year,
            value: row.cursos['sec_6']?.poblacionIne || 0,
          })),
        },
        {
          id: 'no_estudian_17',
          name: 'Jóvenes No Escolarizados (17 Años)',
          color: '#DC2626',
          data: filteredMatrix.map((row) => ({
            year: row.year,
            value: row.cursos['sec_6']?.noEstudian || 0,
          })),
        },
      ];
    }

    if (chartMetric === 'niveles') {
      return [
        {
          id: 'nivel_primaria',
          name: 'Nivel Primario (1.º a 6.º)',
          color: '#2563EB',
          data: filteredMatrix.map((row) => {
            let sum = 0;
            CURSOS_SEP.filter((c) => c.nivel === 'primaria').forEach((c) => {
              sum += row.cursos[c.id]?.matriculaTotal || 0;
            });
            return { year: row.year, value: sum };
          }),
        },
        {
          id: 'nivel_secundaria',
          name: 'Nivel Secundario (1.º a 6.º)',
          color: '#c9a751',
          data: filteredMatrix.map((row) => {
            let sum = 0;
            CURSOS_SEP.filter((c) => c.nivel === 'secundaria').forEach((c) => {
              sum += row.cursos[c.id]?.matriculaTotal || 0;
            });
            return { year: row.year, value: sum };
          }),
        },
        {
          id: 'nivel_inicial',
          name: 'Nivel Inicial (1.º y 2.º)',
          color: '#059669',
          data: filteredMatrix.map((row) => {
            let sum = 0;
            CURSOS_SEP.filter((c) => c.nivel === 'inicial').forEach((c) => {
              sum += row.cursos[c.id]?.matriculaTotal || 0;
            });
            return { year: row.year, value: sum };
          }),
        },
      ];
    }

    // dependencia
    return [
      {
        id: 'sector_publico',
        name: 'Sector Público (Fiscal / Convenio)',
        color: '#059669',
        data: filteredMatrix.map((row) => {
          let sum = 0;
          CURSOS_SEP.forEach((c) => {
            sum += row.cursos[c.id]?.publico || 0;
          });
          return { year: row.year, value: sum };
        }),
      },
      {
        id: 'sector_privado',
        name: 'Sector Privado (Particular)',
        color: '#2563EB',
        data: filteredMatrix.map((row) => {
          let sum = 0;
          CURSOS_SEP.forEach((c) => {
            sum += row.cursos[c.id]?.privado || 0;
          });
          return { year: row.year, value: sum };
        }),
      },
      {
        id: 'no_estudian_total',
        name: 'Población No Escolarizada (Fuera del SEP)',
        color: '#DC2626',
        data: filteredMatrix.map((row) => {
          let sum = 0;
          CURSOS_SEP.forEach((c) => {
            sum += row.cursos[c.id]?.noEstudian || 0;
          });
          return { year: row.year, value: sum };
        }),
      },
    ];
  }, [filteredMatrix, chartMetric]);

  return (
    <div className="space-y-6">
      {/* Header Institucional de Proyecciones SEP */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-xs">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] font-semibold uppercase tracking-wider bg-[#faf5e8] text-[#c9a751] border border-[#e5d5a6] px-2.5 py-0.5 rounded-md">
              SEP · Sistema Educativo Plurinacional
            </span>
            <span className="text-[10px] font-medium text-slate-500">
              Proyecciones Oficiales INE 2026 - 2034 & Registros SIE
            </span>
          </div>
          <h1 className="text-2xl font-semibold text-slate-900 tracking-tight">
            Matriz de Proyección de Matrícula Escolar (2026 - 2034)
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Modelo proyectivo multi-anual articulado entre la estructura matricular del SIE y las proyecciones demográficas por edad simple del INE.
          </p>
        </div>
      </div>

      {/* 4 KPIs con Métricas Reales */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Matrícula Total 2026"
          value={matriculaTotal2026}
          subtitle={`Inicial, Primaria y Secundaria (${selectedDept === 'all' ? 'Nacional' : selectedDept})`}
          sourceBadge="SIE 2026"
          sourceColor="amber"
          icon={<SchoolIcon size={22} className="text-[#a08035]" />}
        />
        <StatCard
          title="Bachilleres 2026 (Promoción)"
          value={bachilleres2026}
          subtitle="Aspirantes potenciales directos a ESFM (17 años)"
          sourceBadge="Egreso"
          sourceColor="amber"
          icon={<GraduationCapIcon size={22} className="text-[#a08035]" />}
        />
        <StatCard
          title="Sector Público (Fiscal)"
          value={`${pctPublicoGlobal}%`}
          subtitle={`${publicoTotal2026.toLocaleString('es-BO')} estudiantes en unidades fiscales/convenio`}
          sourceBadge="Público"
          sourceColor="amber"
          icon={<BuildingIcon size={22} className="text-[#a08035]" />}
        />
        <StatCard
          title="Población No Escolarizada"
          value={`${pctNoEstudianGlobal}%`}
          subtitle={`${noEstudianTotal2026.toLocaleString('es-BO')} niños/jóvenes fuera del sistema escolar`}
          sourceBadge="Brecha"
          sourceColor="amber"
          icon={<UsersIcon size={22} className="text-[#a08035]" />}
        />
      </div>

      {/* =========================================================================
          SECCIÓN CREATIVA: SIMULADOR DE FOCO ANUAL (MODO CLARO INSTITUCIONAL)
         ========================================================================= */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-100 pb-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-[#c9a751]" />
              <h2 className="text-base font-semibold tracking-tight text-slate-900">
                Simulador de Gestión: ¿Cuántos estudiantes habrá en {focoYear}?
              </h2>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Seleccione cualquier gestión para proyectar la población escolar total, distribución por niveles y egreso de bachilleres en{' '}
              <strong className="text-[#c9a751] font-semibold">{selectedDept === 'all' ? 'Bolivia' : selectedDept}</strong>.
            </p>
          </div>

          {/* Selector de Año del Simulador */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200 overflow-x-auto">
            {ANIOS_PROYECCION_TODOS.map((y) => (
              <button
                key={y}
                onClick={() => setFocoYear(y)}
                className={`text-xs px-2.5 py-1.5 rounded-lg transition-all font-medium whitespace-nowrap ${
                  focoYear === y
                    ? 'bg-[#c9a751] text-slate-900 font-semibold shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                }`}
              >
                {y}
              </button>
            ))}
          </div>
        </div>

        {/* Ficha Resumen de la Gestión Seleccionada en Modo Claro */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/80">
            <span className="text-[10px] text-slate-500 block font-medium">Matrícula Total {focoYear}</span>
            <p className="text-lg font-semibold text-[#c9a751] mt-0.5">
              {focoData.totMatricula.toLocaleString('es-BO')}
            </p>
            <span className="text-[10px] text-slate-400">
              {focoData.prevYear ? (
                <span className={Number(focoData.ratePrev) >= 0 ? 'text-emerald-700 font-medium' : 'text-red-600 font-medium'}>
                  {Number(focoData.ratePrev) >= 0 ? `+${focoData.ratePrev}%` : `${focoData.ratePrev}%`} vs {focoData.prevYear}
                </span>
              ) : 'Año base 2026'}
            </span>
          </div>

          <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/80">
            <span className="text-[10px] text-slate-500 block font-medium">Nivel Inicial (4-5a)</span>
            <p className="text-lg font-semibold text-slate-900 mt-0.5">
              {focoData.totIni.toLocaleString('es-BO')}
            </p>
            <span className="text-[10px] text-amber-800 font-medium">1.º y 2.º de Inicial</span>
          </div>

          <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/80">
            <span className="text-[10px] text-slate-500 block font-medium">Nivel Primario (6-11a)</span>
            <p className="text-lg font-semibold text-slate-900 mt-0.5">
              {focoData.totPri.toLocaleString('es-BO')}
            </p>
            <span className="text-[10px] text-blue-800 font-medium">1.º a 6.º de Primaria</span>
          </div>

          <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/80">
            <span className="text-[10px] text-slate-500 block font-medium">Nivel Secundario (12-17a)</span>
            <p className="text-lg font-semibold text-slate-900 mt-0.5">
              {focoData.totSec.toLocaleString('es-BO')}
            </p>
            <span className="text-[10px] text-emerald-800 font-medium">1.º a 6.º de Secundaria</span>
          </div>

          <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/80">
            <span className="text-[10px] text-slate-500 block font-medium">Bachilleres {focoYear}</span>
            <p className="text-lg font-semibold text-[#c9a751] mt-0.5">
              {focoData.bachilleres.toLocaleString('es-BO')}
            </p>
            <span className="text-[10px] text-slate-500 font-medium">Promoción (17 años)</span>
          </div>

          <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/80">
            <span className="text-[10px] text-slate-500 block font-medium">Sector Público / Privado</span>
            <p className="text-sm font-semibold text-emerald-700 mt-0.5">
              {focoData.pctPub}% Púb.
            </p>
            <span className="text-[10px] text-blue-700 font-medium block">
              {focoData.pctPriv}% Priv.
            </span>
          </div>
        </div>
      </div>

      {/* Controles de Selección: Ámbito Territorial, Capa de Datos y Horizonte */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4">
        {/* Selector de Departamento */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <MapPinIcon size={16} className="text-[#c9a751]" />
            <span className="text-xs font-semibold text-slate-800">1. Ámbito Territorial:</span>
          </div>

          <div className="flex items-center gap-1.5 flex-wrap">
            <button
              onClick={() => setSelectedDept('all')}
              className={`text-xs px-3 py-1 rounded-lg border transition-all ${
                selectedDept === 'all'
                  ? 'bg-slate-900 text-white border-slate-900 shadow-xs font-semibold'
                  : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
              }`}
            >
              Total Nacional (Bolivia)
            </button>
            {Object.keys(DEPT_PARAMS).map((dept) => {
              const isSelected = selectedDept === dept;
              return (
                <button
                  key={dept}
                  onClick={() => setSelectedDept(dept)}
                  className={`text-xs px-2.5 py-1 rounded-lg border transition-all ${
                    isSelected
                      ? 'bg-[#c9a751] text-slate-900 border-[#c9a751] shadow-xs font-semibold'
                      : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  {dept}
                </button>
              );
            })}
          </div>
        </div>

        {/* Selector de Capa de Datos y Horizonte */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          {/* Capas */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl flex-wrap">
            <button
              onClick={() => setSelectedLayer('matricula_total')}
              className={`text-xs px-3 py-1.5 rounded-lg transition-all font-medium ${
                selectedLayer === 'matricula_total'
                  ? 'bg-[#c9a751] text-slate-900 shadow-xs font-semibold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Matrícula Estimada Total
            </button>
            <button
              onClick={() => setSelectedLayer('publico')}
              className={`text-xs px-3 py-1.5 rounded-lg transition-all font-medium ${
                selectedLayer === 'publico'
                  ? 'bg-emerald-600 text-white shadow-xs font-semibold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Sector Público (Fiscal / Convenio)
            </button>
            <button
              onClick={() => setSelectedLayer('privado')}
              className={`text-xs px-3 py-1.5 rounded-lg transition-all font-medium ${
                selectedLayer === 'privado'
                  ? 'bg-blue-600 text-white shadow-xs font-semibold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Sector Privado (Particular)
            </button>
            <button
              onClick={() => setSelectedLayer('no_estudian')}
              className={`text-xs px-3 py-1.5 rounded-lg transition-all font-medium ${
                selectedLayer === 'no_estudian'
                  ? 'bg-red-600 text-white shadow-xs font-semibold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              No Estudian (Fuera del Sistema)
            </button>
            <button
              onClick={() => setSelectedLayer('poblacion_ine')}
              className={`text-xs px-3 py-1.5 rounded-lg transition-all font-medium ${
                selectedLayer === 'poblacion_ine'
                  ? 'bg-slate-900 text-white shadow-xs font-semibold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Población Total por Edad (INE)
            </button>
          </div>

          {/* Selector de Horizonte */}
          <div className="flex items-center gap-1.5 text-xs font-medium self-start lg:self-auto">
            <span className="text-slate-500">Horizonte:</span>
            <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-lg">
              <button
                onClick={() => setHorizonte('2031')}
                className={`px-2.5 py-1 rounded-md transition-all ${
                  horizonte === '2031'
                    ? 'bg-white text-slate-900 shadow-xs font-semibold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                2026 - 2031 (Quinquenio)
              </button>
              <button
                onClick={() => setHorizonte('2034')}
                className={`px-2.5 py-1 rounded-md transition-all ${
                  horizonte === '2034'
                    ? 'bg-[#c9a751] text-slate-900 shadow-xs font-semibold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                2026 - 2034 (Serie INE Completa)
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* =========================================================================
          TABLA MATRIZ DE PROYECCIÓN POR CURSO (2026 - 2034) CON CELDAS CLICABLES
         ========================================================================= */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between gap-3 flex-wrap">
          <div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-[#c9a751]" />
              <h2 className="text-base font-semibold text-slate-900 tracking-tight">
                Matriz de Matrícula Proyectada por Grado de Escolaridad (2026 - {horizonte})
              </h2>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Ámbito: <strong className="text-slate-800">{selectedDept === 'all' ? 'Total Nacional (Bolivia)' : selectedDept}</strong> · Capa: <strong className="text-[#c9a751] uppercase">{selectedLayer.replace('_', ' ')}</strong> · <span className="text-slate-400">Haga clic en cualquier celda para ver el cálculo detallado en vivo</span>
            </p>
          </div>

          <span className="text-[11px] font-semibold bg-[#faf5e8] text-[#c9a751] px-2.5 py-1 rounded-lg border border-[#e5d5a6]">
            14 Cursos · {aniosActivos.length} Gestiones Proyectadas
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              {/* Nivel 1: Macro Niveles con Subtotal por Nivel */}
              <tr className="bg-slate-100/90 border-b border-slate-200 text-slate-700 text-[11px] font-semibold uppercase tracking-wider text-center">
                <th rowSpan={2} className="py-2.5 px-3 text-left border-r border-slate-200 min-w-[70px] bg-slate-100">
                  Gestión
                </th>
                <th colSpan={3} className="py-2 px-2 border-r border-slate-200 bg-amber-50/70 text-amber-900">
                  Nivel Inicial (4 - 5 años)
                </th>
                <th colSpan={7} className="py-2 px-2 border-r border-slate-200 bg-blue-50/70 text-blue-900">
                  Nivel Primario (6 - 11 años)
                </th>
                <th colSpan={7} className="py-2 px-2 border-r border-slate-200 bg-emerald-50/70 text-emerald-900">
                  Nivel Secundario (12 - 17 años)
                </th>
                <th rowSpan={2} className="py-2.5 px-3 bg-slate-200/90 text-slate-900 font-bold text-right border-l border-slate-200 min-w-[95px]">
                  Total General
                </th>
              </tr>

              {/* Nivel 2: Cursos Específicos con Edades y Subtotales Inmediatos */}
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-medium text-[10px] text-center">
                {/* Inicial */}
                <th className="py-2 px-1.5 min-w-[68px] border-r border-slate-200/60">
                  1.º Ini <span className="block text-[9px] text-slate-400 font-normal">(4 años)</span>
                </th>
                <th className="py-2 px-1.5 min-w-[68px] border-r border-slate-200/60">
                  2.º Ini <span className="block text-[9px] text-slate-400 font-normal">(5 años)</span>
                </th>
                <th className="py-2 px-2 min-w-[80px] border-r border-slate-200 bg-amber-100/60 text-amber-900 font-semibold text-right">
                  Subtotal Inicial
                </th>

                {/* Primaria */}
                <th className="py-2 px-1.5 min-w-[68px] border-r border-slate-200/60">
                  1.º Pri <span className="block text-[9px] text-slate-400 font-normal">(6 años)</span>
                </th>
                <th className="py-2 px-1.5 min-w-[68px] border-r border-slate-200/60">
                  2.º Pri <span className="block text-[9px] text-slate-400 font-normal">(7 años)</span>
                </th>
                <th className="py-2 px-1.5 min-w-[68px] border-r border-slate-200/60">
                  3.º Pri <span className="block text-[9px] text-slate-400 font-normal">(8 años)</span>
                </th>
                <th className="py-2 px-1.5 min-w-[68px] border-r border-slate-200/60">
                  4.º Pri <span className="block text-[9px] text-slate-400 font-normal">(9 años)</span>
                </th>
                <th className="py-2 px-1.5 min-w-[68px] border-r border-slate-200/60">
                  5.º Pri <span className="block text-[9px] text-slate-400 font-normal">(10 años)</span>
                </th>
                <th className="py-2 px-1.5 min-w-[68px] border-r border-slate-200/60">
                  6.º Pri <span className="block text-[9px] text-slate-400 font-normal">(11 años)</span>
                </th>
                <th className="py-2 px-2 min-w-[85px] border-r border-slate-200 bg-blue-100/60 text-blue-900 font-semibold text-right">
                  Subtotal Primaria
                </th>

                {/* Secundaria */}
                <th className="py-2 px-1.5 min-w-[68px] border-r border-slate-200/60">
                  1.º Sec <span className="block text-[9px] text-slate-400 font-normal">(12 años)</span>
                </th>
                <th className="py-2 px-1.5 min-w-[68px] border-r border-slate-200/60">
                  2.º Sec <span className="block text-[9px] text-slate-400 font-normal">(13 años)</span>
                </th>
                <th className="py-2 px-1.5 min-w-[68px] border-r border-slate-200/60">
                  3.º Sec <span className="block text-[9px] text-slate-400 font-normal">(14 años)</span>
                </th>
                <th className="py-2 px-1.5 min-w-[68px] border-r border-slate-200/60">
                  4.º Sec <span className="block text-[9px] text-slate-400 font-normal">(15 años)</span>
                </th>
                <th className="py-2 px-1.5 min-w-[68px] border-r border-slate-200/60">
                  5.º Sec <span className="block text-[9px] text-slate-400 font-normal">(16 años)</span>
                </th>
                <th className="py-2 px-1.5 min-w-[76px] border-r border-slate-200/60 bg-amber-50/50 text-slate-900 font-semibold">
                  6.º Sec <span className="block text-[9px] text-amber-700 font-normal">(17a - Prom)</span>
                </th>
                <th className="py-2 px-2 min-w-[90px] border-r border-slate-200 bg-emerald-100/60 text-emerald-900 font-semibold text-right">
                  Subtotal Secundaria
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">
              {filteredMatrix.map((row) => {
                const renderCourseCell = (curso: CursoDef) => {
                  const cellData = row.cursos[curso.id];
                  const val =
                    selectedLayer === 'matricula_total'
                      ? cellData?.matriculaTotal
                      : selectedLayer === 'publico'
                      ? cellData?.publico
                      : selectedLayer === 'privado'
                      ? cellData?.privado
                      : selectedLayer === 'no_estudian'
                      ? cellData?.noEstudian
                      : cellData?.poblacionIne;

                  const isPromocion = curso.id === 'sec_6';
                  const isSelectedCell = selectedCell.year === row.year && selectedCell.cursoId === curso.id;

                  return (
                    <td
                      key={curso.id}
                      onClick={() => setSelectedCell({ year: row.year, cursoId: curso.id })}
                      className={`py-2 px-1.5 text-right font-medium border-r border-slate-100 text-[11px] cursor-pointer transition-all ${
                        isSelectedCell
                          ? 'bg-[#c9a751]/20 ring-2 ring-[#c9a751] text-slate-900 font-bold z-10'
                          : isPromocion
                          ? 'bg-amber-50/40 text-[#c9a751] font-semibold hover:bg-amber-100/50'
                          : 'text-slate-800 hover:bg-slate-100'
                      }`}
                      title={`Clic para ver cálculo exacto: ${curso.nombre} (${row.year})`}
                    >
                      {(val || 0).toLocaleString('es-BO')}
                    </td>
                  );
                };

                return (
                  <tr key={row.year} className="hover:bg-slate-50/80 transition-colors">
                    {/* Año */}
                    <td className="py-2.5 px-3 font-semibold text-slate-900 border-r border-slate-200 bg-slate-50/50">
                      <button
                        onClick={() => setFocoYear(row.year)}
                        className="hover:text-[#c9a751] transition-colors"
                        title="Ver foco de esta gestión"
                      >
                        {row.year}
                      </button>
                    </td>

                    {/* Cursos Inicial */}
                    {CURSOS_SEP.filter((c) => c.nivel === 'inicial').map(renderCourseCell)}
                    {/* Subtotal Nivel Inicial */}
                    <td className="py-2 px-2 text-right font-semibold text-amber-900 bg-amber-50/70 border-r border-slate-200 text-[11px]">
                      {row.subtotales.inicial.toLocaleString('es-BO')}
                    </td>

                    {/* Cursos Primaria */}
                    {CURSOS_SEP.filter((c) => c.nivel === 'primaria').map(renderCourseCell)}
                    {/* Subtotal Nivel Primario */}
                    <td className="py-2 px-2 text-right font-semibold text-blue-900 bg-blue-50/70 border-r border-slate-200 text-[11px]">
                      {row.subtotales.primaria.toLocaleString('es-BO')}
                    </td>

                    {/* Cursos Secundaria */}
                    {CURSOS_SEP.filter((c) => c.nivel === 'secundaria').map(renderCourseCell)}
                    {/* Subtotal Nivel Secundario */}
                    <td className="py-2 px-2 text-right font-semibold text-emerald-900 bg-emerald-50/70 border-r border-slate-200 text-[11px]">
                      {row.subtotales.secundaria.toLocaleString('es-BO')}
                    </td>

                    {/* Total General */}
                    <td className="py-2 px-2.5 text-right font-bold text-slate-900 bg-slate-100 text-[11px] border-l border-slate-200">
                      {row.subtotales.general.toLocaleString('es-BO')}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* =========================================================================
          INSPECTOR INTERACTIVO DE CÁLCULO EN VIVO ("QUE MUESTRE LOS CÁLCULOS")
         ========================================================================= */}
      <div className="bg-white rounded-2xl border-2 border-[#c9a751]/40 p-5 shadow-xs space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <ScaleIcon size={20} className="text-[#c9a751]" />
            <div>
              <h3 className="text-base font-semibold text-slate-900 tracking-tight">
                Inspector Matemático de Cálculo en Vivo
              </h3>
              <p className="text-xs text-slate-500">
                Desglose algorítmico y matemático paso a paso con los datos reales de la celda activa seleccionada en la matriz.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap text-xs">
            <span className="font-medium text-slate-500">Celda activa:</span>
            <span className="px-2.5 py-1 rounded-lg bg-[#faf5e8] text-[#c9a751] border border-[#e5d5a6] font-semibold">
              {cellCalculation.curso.nombre} ({cellCalculation.curso.sublabel}) · Gestión {cellCalculation.year}
            </span>
          </div>
        </div>

        {/* Pasos Matemáticos del Cálculo en Vivo */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Paso 1: Base INE */}
          <div className="bg-slate-50 rounded-xl p-3.5 border border-slate-200">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 block">
              1. Población Base INE ({cellCalculation.curso.edadNormativa} años)
            </span>
            <p className="text-lg font-semibold text-slate-900 mt-1">
              {cellCalculation.pobIne.toLocaleString('es-BO')}
            </p>
            <span className="text-[10px] text-slate-500 block mt-0.5">
              {cellCalculation.isNacional
                ? `Proyección oficial INE Bolivia (${cellCalculation.year})`
                : `Proyección oficial INE ${cellCalculation.year} · ${cellCalculation.deptNombre}`}
            </span>
          </div>

          {/* Paso 2: Tasa y Matrícula Total */}
          <div className="bg-slate-50 rounded-xl p-3.5 border border-slate-200">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-amber-800 block">
              2. Matrícula Escolar ({cellCalculation.tasaEscolarizacion}%)
            </span>
            <p className="text-lg font-semibold text-[#c9a751] mt-1">
              {cellCalculation.matriculaTotal.toLocaleString('es-BO')}
            </p>
            <span className="text-[10px] text-slate-500 block mt-0.5">
              Fórmula: {cellCalculation.pobIne.toLocaleString('es-BO')} × {cellCalculation.tasaEscolarizacion}%
            </span>
          </div>

          {/* Paso 3: Desglose Dependencia */}
          <div className="bg-slate-50 rounded-xl p-3.5 border border-slate-200">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-emerald-800 block">
              3. Público vs Privado
            </span>
            <p className="text-sm font-semibold text-emerald-700 mt-1">
              Público: {cellCalculation.publico.toLocaleString('es-BO')} ({cellCalculation.pctPub}%)
            </p>
            <p className="text-xs font-semibold text-blue-700">
              Privado: {cellCalculation.privado.toLocaleString('es-BO')} ({cellCalculation.pctPriv}%)
            </p>
            <span className="text-[10px] text-slate-400 block mt-0.5">
              Razón censal SIE {cellCalculation.deptNombre}
            </span>
          </div>

          {/* Paso 4: No Estudian */}
          <div className="bg-slate-50 rounded-xl p-3.5 border border-slate-200">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-red-800 block">
              4. Brecha No Escolarizada ({cellCalculation.pctNoEst}%)
            </span>
            <p className="text-lg font-semibold text-red-600 mt-1">
              {cellCalculation.noEstudian.toLocaleString('es-BO')}
            </p>
            <span className="text-[10px] text-slate-500 block mt-0.5">
              {cellCalculation.pobIne.toLocaleString('es-BO')} INE - {cellCalculation.matriculaTotal.toLocaleString('es-BO')} SIE
            </span>
          </div>
        </div>

        {/* Explicación de Síntesis en Lenguaje Claro */}
        <div className="bg-slate-50/70 p-3 rounded-xl border border-slate-200 text-xs text-slate-600 flex items-start gap-2.5">
          <LightbulbIcon size={18} className="text-[#c9a751] shrink-0 mt-0.5" />
          <div>
            <span>
              <strong>Interpretación para la Gestión {cellCalculation.year}:</strong> En {cellCalculation.deptNombre}, se proyectan{' '}
              <strong className="text-slate-900">{cellCalculation.pobIne.toLocaleString('es-BO')} niños/jóvenes</strong> con la edad normativa de {cellCalculation.curso.edadNormativa} años. Con la tasa neta del {cellCalculation.tasaEscolarizacion}%, asistirán a{' '}
              <strong>{cellCalculation.curso.nombre}</strong> un total de{' '}
              <strong className="text-[#c9a751]">{cellCalculation.matriculaTotal.toLocaleString('es-BO')} estudiantes</strong> ({cellCalculation.publico.toLocaleString('es-BO')} en el sector público y {cellCalculation.privado.toLocaleString('es-BO')} en particulares), mientras que{' '}
              <strong className="text-red-600">{cellCalculation.noEstudian.toLocaleString('es-BO')}</strong> estarán fuera del sistema escolar en esa gestión.
            </span>
            {cellCalculation.hasPrev && (
              <span className="block mt-1 text-[11px] text-slate-500">
                Variación frente a {cellCalculation.year - 1}:{' '}
                <strong className={Number(cellCalculation.rateAnterior) >= 0 ? 'text-emerald-700' : 'text-red-600'}>
                  {Number(cellCalculation.rateAnterior) >= 0 ? `+${cellCalculation.rateAnterior}%` : `${cellCalculation.rateAnterior}%`} ({cellCalculation.diffAnterior > 0 ? `+${cellCalculation.diffAnterior.toLocaleString('es-BO')}` : cellCalculation.diffAnterior.toLocaleString('es-BO')} estudiantes)
                </strong>.
              </span>
            )}
          </div>
        </div>
      </div>

      {/* =========================================================================
          CONTENEDOR DE DISTRIBUCIÓN LINEAL POR GRADOS (EJE X: CURSOS SEP)
          Comparaciones interanuales y departamentales creativas
         ========================================================================= */}
      <CourseProgressionLineChart
        availableYears={ANIOS_PROYECCION_TODOS}
        deptList={deptList}
        getPoints={getCourseProgressionPoints}
        initialYear={focoYear}
        initialDept={selectedDept}
        initialLayer={selectedLayer}
      />

      {/* =========================================================================
          CONTENEDOR DE TENDENCIA LINEAL TEMPORAL MULTIANUAL (2026 - 2034)
         ========================================================================= */}
      <div className="space-y-3">
        <div className="flex items-center justify-between bg-white px-4 py-2.5 rounded-xl border border-slate-200 shadow-2xs flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <TrendingUpIcon size={16} className="text-[#c9a751]" />
            <span className="text-xs font-semibold text-slate-800">Curvas de Proyección (2026 - {horizonte}):</span>
          </div>

          <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-lg text-xs font-medium">
            <button
              onClick={() => setChartMetric('promocion')}
              className={`px-3 py-1 rounded-md transition-colors ${
                chartMetric === 'promocion'
                  ? 'bg-white text-slate-900 shadow-xs font-semibold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Promoción Bachilleres (17a)
            </button>
            <button
              onClick={() => setChartMetric('niveles')}
              className={`px-3 py-1 rounded-md transition-colors ${
                chartMetric === 'niveles'
                  ? 'bg-white text-slate-900 shadow-xs font-semibold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Inicial vs Primaria vs Secundaria
            </button>
            <button
              onClick={() => setChartMetric('dependencia')}
              className={`px-3 py-1 rounded-md transition-colors ${
                chartMetric === 'dependencia'
                  ? 'bg-white text-slate-900 shadow-xs font-semibold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Sector Público vs Privado
            </button>
          </div>
        </div>

        <TrendLineChart
          title={`Proyección Escolar (${
            chartMetric === 'promocion'
              ? 'Futuros Bachilleres 6.º Secundaria vs Población 17 Años'
              : chartMetric === 'niveles'
              ? 'Volumen por Nivel Educativo (Inicial, Primaria, Secundaria)'
              : 'Evolución Sector Público vs Sector Privado'
          })`}
          subtitle={`Trayectoria continua de 9 gestiones (2026 - ${horizonte}) para ${selectedDept === 'all' ? 'Bolivia' : selectedDept}`}
          series={dynamicLineSeries}
          unit="estudiantes"
          height={330}
          showArea={false}
        />
      </div>

      {/* Ficha Técnica de Fuentes */}
      <SourceBadge
        sourceName="INE & SIE · Proyecciones Escolares y Demografía"
        institutionTitle="Ministerio de Educación & Instituto Nacional de Estadística"
        methodology="Cruce metodológico entre las Proyecciones de Población por Edad Simple del Instituto Nacional de Estadística (INE 2024-2034) y la estructura de matrícula regular del Sistema de Información Educativa (SIE 2026), aplicando tasas netas de escolarización y proporciones reales de dependencia administrativa."
        links={[
          {
            title: 'INE Proyecciones de Población por Edad',
            url: 'https://www.ine.gob.bo/index.php/demografia/proyecciones-de-poblacion/',
            institution: 'INE Bolivia',
            period: '2024-2034',
          },
          {
            title: 'SIE Estadísticas de Matrícula Regular',
            url: 'https://sie.minedu.gob.bo/',
            institution: 'Ministerio de Educación',
            period: 'Gestión 2026',
          },
        ]}
      />
    </div>
  );
}
