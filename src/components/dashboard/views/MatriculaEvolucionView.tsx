"use client";

/**
 * MatriculaEvolucionView
 * Módulo Ejecutivo de Alta Fidelidad Visual (Pantalla Completa y Diseño Premium)
 * - Modo Pantalla Completa Nativo y Viewport Completo
 * - Curvas Bézier Suaves (Splines) con Relleno de Área Gradiente
 * - Etiquetas de Datos Numéricas Permanentes (Data Labels Estilo Pill)
 * - Eje Dual: Estudiantes Efectivos (SIE) + Tasa de Cobertura (%)
 * - Registro Real SIE (2011–2026) vs Proyección Planificada (2027–2034)
 */

import React, { useState, useRef, useCallback, useEffect } from "react";
import {
  TrendingUp,
  Maximize2,
  Minimize2,
  Percent,
  Users,
  GraduationCap,
  Calendar,
  X,
  Layers,
  CheckCircle2,
  Tag,
  Sparkles,
  Award,
} from "lucide-react";
import matriculaData from "@/data/matricula_proyeccion.json";

// ─── Tipos ────────────────────────────────────────────────────────────────────
interface PuntoSerie {
  anio: number;
  tipo: "HISTORICO" | "REAL_SIE" | "PROYECCION";
  matricula_real: number | null;
  modelo_1_ine: number | null;
  modelo_2_cobertura: number | null;
  modelo_arima: number | null;
  modelo_consenso?: number | null;
  tasa_cob_pct: number | null;
}

interface DesagregacionesData {
  por_nivel?: Record<string, PuntoSerie[]>;
  por_area?: Record<string, PuntoSerie[]>;
  por_departamento?: Record<string, PuntoSerie[]>;
}

interface MatriculaProyeccionData {
  serie_nacional: PuntoSerie[];
  desagregaciones?: DesagregacionesData;
  metadata: {
    modelo_arima: string;
    fecha_generacion: string;
    pico_historico?: { anio: number; matricula: number };
    punto_inflexion?: number;
    tasa_cobertura_base?: number;
    tasa_cobertura_proyectada_2034?: number;
    anclas_2026?: Record<string, any>;
  };
}

const fmt = (n: number | null): string =>
  n == null ? "—" : n.toLocaleString("es-BO");

const fmtM = (n: number | null): string => {
  if (n == null) return "—";
  return `${(n / 1_000_000).toFixed(2)}M`;
};

const fmtAxis = (v: number): string => {
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(2)}M`;
  if (v >= 1_000) return `${Math.round(v / 1_000)}k`;
  return `${v}`;
};

// Generador de Curvas Bézier Suaves (Cubic Splines)
function smoothPath(points: [number, number][]): string {
  if (points.length === 0) return "";
  if (points.length === 1) return `M ${points[0][0]},${points[0][1]}`;

  let d = `M ${points[0][0]},${points[0][1]}`;
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i === 0 ? 0 : i - 1];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[i + 2 < points.length ? i + 2 : i + 1];

    const cp1x = p1[0] + (p2[0] - p0[0]) / 6;
    const cp1y = p1[1] + (p2[1] - p0[1]) / 6;
    const cp2x = p2[0] - (p3[0] - p1[0]) / 6;
    const cp2y = p2[1] - (p3[1] - p1[1]) / 6;

    d += ` C ${cp1x.toFixed(1)},${cp1y.toFixed(1)} ${cp2x.toFixed(1)},${cp2y.toFixed(1)} ${p2[0].toFixed(1)},${p2[1].toFixed(1)}`;
  }
  return d;
}

// ─── Componente SVG del Gráfico de Alta Fidelidad ─────────────────────────────
function GraficoPremium({
  serie,
  anioSeleccionado,
  onSelectAnio,
  visibles,
  mostrarTodasCantidades,
  margenErrorArimaPct = 10,
  height = 540,
  isFullscreen = false,
  subtituloSegmento,
}: {
  serie: PuntoSerie[];
  anioSeleccionado: number;
  onSelectAnio: (anio: number) => void;
  visibles: Set<string>;
  mostrarTodasCantidades: boolean;
  margenErrorArimaPct?: number;
  height?: number;
  isFullscreen?: boolean;
  subtituloSegmento?: string;
}) {
  const [hoverPunto, setHoverPunto] = useState<PuntoSerie | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  const CHART_W = isFullscreen ? 1600 : 1240;
  const PAD = isFullscreen
    ? { top: 56, right: 85, bottom: 56, left: 85 }
    : { top: 48, right: 75, bottom: 52, left: 75 };
  const INNER_W = CHART_W - PAD.left - PAD.right;
  const INNER_H = height - PAD.top - PAD.bottom;

  const anios = serie.map((p) => p.anio);
  const minAnio = anios[0];
  const maxAnio = anios[anios.length - 1];

  // Escala dinámica del eje Y adaptable a cualquier nivel, área o departamento
  const allValues: number[] = [];
  serie.forEach((p) => {
    if (p.matricula_real) allValues.push(p.matricula_real);
    if (p.modelo_1_ine) allValues.push(p.modelo_1_ine);
    if (p.modelo_2_cobertura) allValues.push(p.modelo_2_cobertura);
    if (p.modelo_arima) allValues.push(p.modelo_arima);
    if (p.modelo_consenso) allValues.push(p.modelo_consenso);
  });
  const rawMin = allValues.length ? Math.min(...allValues) : 2_000_000;
  const rawMax = allValues.length ? Math.max(...allValues) : 3_600_000;
  const rangeSpan = Math.max(rawMax - rawMin, 50_000);
  // Margen superior generoso (24%) para garantizar que la curva de Población Niños (INE) nunca se salga por arriba
  const paddingYTop = Math.max(rangeSpan * 0.24, 45_000);
  const paddingYBottom = Math.max(rangeSpan * 0.12, 20_000);

  const stepRound = rawMax > 1_500_000 ? 50_000 : rawMax > 400_000 ? 25_000 : 10_000;
  const minY = Math.max(0, Math.floor((rawMin - paddingYBottom) / stepRound) * stepRound);
  const maxY = Math.ceil((rawMax + paddingYTop) / stepRound) * stepRound;
  const minCob = 50;
  const maxCob = 100;

  const scX = (anio: number) =>
    PAD.left + ((anio - minAnio) / (maxAnio - minAnio)) * INNER_W;
  const scY = (val: number) =>
    PAD.top + INNER_H - ((val - minY) / (maxY - minY)) * INNER_H;
  const scYCob = (cob: number) =>
    PAD.top + INNER_H - ((cob - minCob) / (maxCob - minCob)) * INNER_H;

  const stepTick = (maxY - minY) / 4;
  const yTicksEst = [
    Math.round(minY + stepTick),
    Math.round(minY + 2 * stepTick),
    Math.round(minY + 3 * stepTick),
    Math.round(maxY),
  ];
  const yTicksCob = [70, 80, 90, 100];

  const ptPoblacion = serie.map((p): [number, number] => {
    const val = p.modelo_1_ine ?? (p.matricula_real ? Math.round(p.matricula_real * 1.15) : 0);
    return [scX(p.anio), scY(val)];
  });

  const ptEstudiantes = serie.map((p): [number, number] => {
    const val = p.matricula_real ?? p.modelo_2_cobertura ?? 0;
    return [scX(p.anio), scY(val)];
  });

  const ptCobertura = serie
    .filter((p) => p.tasa_cob_pct != null)
    .map((p): [number, number] => [scX(p.anio), scYCob(p.tasa_cob_pct!)]);

  const ptArima = serie
    .filter((p) => p.modelo_arima != null)
    .map((p): [number, number] => [scX(p.anio), scY(p.modelo_arima!)]);

  const ptConsenso = serie
    .filter((p) => p.modelo_consenso != null)
    .map((p): [number, number] => [scX(p.anio), scY(p.modelo_consenso!)]);

  // Banda de Error Dinámica de ARIMA con el % de error calibrable
  const ptArimaHigh = serie
    .filter((p) => p.modelo_arima != null)
    .map((p): [number, number] => {
      const val = p.modelo_arima! * (1 + margenErrorArimaPct / 100);
      return [scX(p.anio), scY(val)];
    });

  const ptArimaLow = serie
    .filter((p) => p.modelo_arima != null)
    .map((p): [number, number] => {
      const val = p.modelo_arima! * (1 - margenErrorArimaPct / 100);
      return [scX(p.anio), scY(val)];
    })
    .reverse();

  let pathArimaBand = "";
  if (ptArimaHigh.length > 0 && ptArimaLow.length > 0) {
    pathArimaBand =
      smoothPath(ptArimaHigh) +
      " L " +
      ptArimaLow.map((p) => `${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(" L ") +
      " Z";
  }

  const pathEstudiantes = smoothPath(ptEstudiantes);
  const pathAreaEstudiantes =
    pathEstudiantes +
    ` L ${scX(maxAnio)},${PAD.top + INNER_H} L ${scX(minAnio)},${PAD.top + INNER_H} Z`;

  const xSep = scX(2026);
  const xInicio = PAD.left;
  const xFin = PAD.left + INNER_W;
  const anchoReal = xSep - xInicio;
  const anchoProy = xFin - xSep;
  const xRealCenter = xInicio + anchoReal / 2;
  const xProyCenter = xSep + anchoProy / 2;

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<SVGSVGElement>) => {
      const rect = svgRef.current?.getBoundingClientRect();
      if (!rect) return;
      const mx = e.clientX - rect.left - PAD.left;
      const rawAnio = minAnio + (mx / INNER_W) * (maxAnio - minAnio);
      const closest = serie.reduce((prev, cur) =>
        Math.abs(cur.anio - rawAnio) < Math.abs(prev.anio - rawAnio) ? cur : prev
      );
      setHoverPunto(closest);
    },
    [serie, minAnio, maxAnio]
  );

  const puntoActivo = hoverPunto ?? serie.find((p) => p.anio === anioSeleccionado) ?? serie[0];
  const aniosClave = new Set([2012, 2018, 2022, 2023, 2024, 2026, 2031, 2034]);

  return (
    <div className="relative w-full h-full select-none">
      <svg
        ref={svgRef}
        viewBox={`0 0 ${CHART_W} ${height}`}
        className="w-full h-full"
        onMouseMove={handleMouseMove}
        onMouseLeave={() => setHoverPunto(null)}
        onClick={() => {
          if (hoverPunto) onSelectAnio(hoverPunto.anio);
        }}
      >
        <defs>
          {/* Gradiente Esmeralda para Estudiantes */}
          <linearGradient id="gradEstudiantesVibrant" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#059669" stopOpacity="0.22" />
            <stop offset="60%" stopColor="#059669" stopOpacity="0.05" />
            <stop offset="100%" stopColor="#059669" stopOpacity="0.0" />
          </linearGradient>

          {/* Sombreado de la Zona Proyectada */}
          <linearGradient id="gradZonaProyPremium" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#F8FAFC" stopOpacity="0.3" />
            <stop offset="100%" stopColor="#F1F5F9" stopOpacity="0.85" />
          </linearGradient>

          {/* Sombra de Etiquetas (Pill Badges) */}
          <filter id="shadowPill" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="2" stdDeviation="2" floodColor="#0F172A" floodOpacity="0.08" />
          </filter>
        </defs>

        {/* Fondo Zona Proyectada (Delimitada con precisión matemática) */}
        <rect
          x={xSep}
          y={PAD.top}
          width={anchoProy}
          height={INNER_H}
          fill="url(#gradZonaProyPremium)"
          stroke="#E2E8F0"
          strokeWidth={0.8}
          rx={4}
        />

        {/* Línea Divisoria Oficial SIE (2026) vs Proyección */}
        <line
          x1={xSep}
          y1={PAD.top - 28}
          x2={xSep}
          y2={PAD.top + INNER_H}
          stroke="#059669"
          strokeWidth={1.8}
          strokeDasharray="4,4"
        />

        {/* ─── Contenedores Superiores Delimitados por Zona ─── */}
        {/* Zona 1: Registro Real SIE (Cubre de PAD.left a xSep) */}
        <g>
          <rect
            x={xInicio}
            y={PAD.top - 28}
            width={anchoReal - 4}
            height={22}
            rx={6}
            fill="#ECFDF5"
            stroke="#A7F3D0"
            strokeWidth={1}
          />
          <text
            x={xRealCenter - 2}
            y={PAD.top - 13}
            fill="#065F46"
            fontSize={10}
            fontWeight="800"
            textAnchor="middle"
            letterSpacing="0.03em"
          >
            {subtituloSegmento
              ? `● REGISTRO REAL SIE (2011–2026) · ${subtituloSegmento.toUpperCase()}`
              : "● REGISTRO REAL OFICIAL SIE (2011–2026)"}
          </text>
        </g>

        {/* Zona 2: Proyección Planificada (Cubre de xSep a xFin) */}
        <g>
          <rect
            x={xSep + 4}
            y={PAD.top - 28}
            width={anchoProy - 4}
            height={22}
            rx={6}
            fill="#F1F5F9"
            stroke="#CBD5E1"
            strokeWidth={1}
          />
          <text
            x={xProyCenter + 2}
            y={PAD.top - 13}
            fill="#334155"
            fontSize={10}
            fontWeight="800"
            textAnchor="middle"
            letterSpacing="0.03em"
          >
            ▲ PROYECCIÓN PLANIFICADA (2027–2034)
          </text>
        </g>

        {/* Grilla Horizontal */}
        {yTicksEst.map((v) => (
          <g key={v}>
            <line x1={PAD.left} y1={scY(v)} x2={PAD.left + INNER_W} y2={scY(v)} stroke="#E2E8F0" strokeWidth={1} strokeDasharray="3,3" />
            <text x={PAD.left - 10} y={scY(v) + 3.5} fill="#64748B" fontSize={10.5} fontWeight="600" textAnchor="end">
              {fmtAxis(v)}
            </text>
          </g>
        ))}

        {/* Eje Derecho Cobertura */}
        {yTicksCob.map((pct) => (
          <g key={`cob-${pct}`}>
            <text x={PAD.left + INNER_W + 12} y={scYCob(pct) + 3.5} fill="#0284C7" fontSize={10.5} fontWeight="bold" textAnchor="start">
              {pct}%
            </text>
          </g>
        ))}

        {/* Años Eje X */}
        {serie.map((p, i) => {
          const esPar = i % 2 === 0;
          const esClave = p.anio === 2026 || p.anio === 2031 || p.anio === 2023;
          if (!esPar && !esClave) return null;

          return (
            <text
              key={p.anio}
              x={scX(p.anio)}
              y={PAD.top + INNER_H + 20}
              fill={esClave ? "#065F46" : "#64748B"}
              fontSize={11}
              fontWeight={esClave ? "900" : "500"}
              textAnchor="middle"
            >
              {p.anio}
            </text>
          );
        })}

        {/* Relleno de Área Degradada para Estudiantes */}
        {visibles.has("estudiantes") && (
          <path d={pathAreaEstudiantes} fill="url(#gradEstudiantesVibrant)" />
        )}

        {/* Banda de Error Dinámica de ARIMA */}
        {visibles.has("arima") && pathArimaBand && (
          <path d={pathArimaBand} fill="#8B5CF6" fillOpacity={0.14} stroke="#8B5CF6" strokeWidth={0.8} strokeDasharray="3,3" />
        )}

        {/* Línea Población Niños (INE) */}
        {visibles.has("poblacion") && ptPoblacion.length > 1 && (
          <path d={smoothPath(ptPoblacion)} fill="none" stroke="#D97706" strokeWidth={2.4} strokeDasharray="6,4" />
        )}

        {/* Línea Tasa de Cobertura (%) */}
        {visibles.has("cobertura") && ptCobertura.length > 1 && (
          <path d={smoothPath(ptCobertura)} fill="none" stroke="#0284C7" strokeWidth={2.8} />
        )}

        {/* Línea ARIMA Inercial */}
        {visibles.has("arima") && ptArima.length > 1 && (
          <path d={smoothPath(ptArima)} fill="none" stroke="#8B5CF6" strokeWidth={2.0} strokeDasharray="3,3" />
        )}

        {/* Línea Consenso Híbrido (INE + SIE) */}
        {visibles.has("consenso") && ptConsenso.length > 1 && (
          <path d={smoothPath(ptConsenso)} fill="none" stroke="#4F46E5" strokeWidth={3.0} strokeDasharray="6,3" />
        )}

        {/* Línea Maestra: Estudiantes Matriculados SIE */}
        {visibles.has("estudiantes") && ptEstudiantes.length > 1 && (
          <path d={pathEstudiantes} fill="none" stroke="#059669" strokeWidth={3.8} />
        )}

        {/* ═══════════════════════════════════════════════════════════════
            ETIQUETAS NUMÉRICAS DIRECTAS EN EL GRÁFICO (DATA LABELS)
        ═══════════════════════════════════════════════════════════════ */}
        {serie.map((p) => {
          const x = scX(p.anio);
          const estVal = p.matricula_real ?? p.modelo_2_cobertura;
          const cobVal = p.tasa_cob_pct;
          const pobVal = p.modelo_1_ine ?? (p.matricula_real ? Math.round(p.matricula_real * 1.15) : null);
          const arimaVal = p.modelo_arima;
          const consensoVal = p.modelo_consenso;

          const debeMostrar = mostrarTodasCantidades || aniosClave.has(p.anio);
          if (!debeMostrar) return null;

          const yEst = estVal ? scY(estVal) : 0;
          const yCob = cobVal ? scYCob(cobVal) : 0;
          const yPob = pobVal ? scY(pobVal) : 0;
          const yArima = arimaVal ? scY(arimaVal) : 0;
          const yConsenso = consensoVal ? scY(consensoVal) : 0;

          const es2026 = p.anio === 2026;
          const es2023 = p.anio === 2023;
          const es2031 = p.anio === 2031;

          return (
            <g key={`labels-premium-${p.anio}`}>
              {/* Etiqueta Cobertura (%) */}
              {visibles.has("cobertura") && cobVal && (
                <g>
                  <circle cx={x} cy={yCob} r={3.5} fill="#0284C7" stroke="#FFFFFF" strokeWidth={1.5} />
                  <rect
                    x={x - 18}
                    y={yCob - 20}
                    width={36}
                    height={16}
                    rx={5}
                    fill="#F0F9FF"
                    stroke="#7DD3FC"
                    strokeWidth={0.8}
                    filter="url(#shadowPill)"
                  />
                  <text x={x} y={yCob - 8.5} fill="#0369A1" fontSize={9} fontWeight="800" textAnchor="middle">
                    {cobVal}%
                  </text>
                </g>
              )}

              {/* Etiqueta Población Niños (INE) */}
              {visibles.has("poblacion") && pobVal && (
                <g key={`pob-${p.anio}`}>
                  <circle cx={x} cy={yPob} r={3} fill="#D97706" />
                  <rect
                    x={x - 20}
                    y={yPob - 18}
                    width={40}
                    height={15}
                    rx={4}
                    fill="#FFFBEB"
                    stroke="#FCD34D"
                    strokeWidth={0.8}
                    filter="url(#shadowPill)"
                  />
                  <text x={x} y={yPob - 7.5} fill="#B45309" fontSize={8.5} fontWeight="bold" textAnchor="middle">
                    {fmtAxis(pobVal)}
                  </text>
                </g>
              )}

              {/* Etiqueta Modelo ARIMA con Cifra Real Exacta y Rango de Error ±X% */}
              {visibles.has("arima") && arimaVal && (
                <g key={`arima-${p.anio}`}>
                  <circle
                    cx={x}
                    cy={yArima}
                    r={es2026 || es2031 ? 5.5 : 4}
                    fill="#7C3AED"
                    stroke="#FFFFFF"
                    strokeWidth={1.8}
                  />
                  <g transform={`translate(${x}, ${yArima - 16})`}>
                    <rect
                      x={es2026 || es2031 ? -48 : -30}
                      y={-14}
                      width={es2026 || es2031 ? 96 : 60}
                      height={18}
                      rx={5}
                      fill="#F5F3FF"
                      stroke="#8B5CF6"
                      strokeWidth={es2026 || es2031 ? 1.6 : 1}
                      filter="url(#shadowPill)"
                    />
                    <text
                      x={0}
                      y={-1.5}
                      fill="#5B21B6"
                      fontSize={es2026 || es2031 ? 10 : 9}
                      fontWeight="800"
                      textAnchor="middle"
                    >
                      {fmt(arimaVal)}
                    </text>
                  </g>
                  {/* Rango numérico con el % de error calibrado */}
                  {(es2026 || es2031) && (
                    <text
                      x={x}
                      y={yArima + 15}
                      fill="#6D28D9"
                      fontSize={8.5}
                      fontWeight="bold"
                      textAnchor="middle"
                    >
                      ±{margenErrorArimaPct}% [{fmt(Math.round(arimaVal * (1 - margenErrorArimaPct / 100)))} - {fmt(Math.round(arimaVal * (1 + margenErrorArimaPct / 100)))}]
                    </text>
                  )}
                </g>
              )}

              {/* Etiqueta Modelo Consenso Híbrido (INE + SIE) */}
              {visibles.has("consenso") && consensoVal && p.anio >= 2027 && (
                <g key={`consenso-${p.anio}`}>
                  <circle
                    cx={x}
                    cy={yConsenso}
                    r={es2031 ? 5 : 3.5}
                    fill="#4F46E5"
                    stroke="#FFFFFF"
                    strokeWidth={1.8}
                  />
                  <g transform={`translate(${x}, ${yConsenso + (es2031 ? 16 : 14)})`}>
                    <rect
                      x={es2031 ? -42 : -30}
                      y={-10}
                      width={es2031 ? 84 : 60}
                      height={18}
                      rx={5}
                      fill="#EEF2FF"
                      stroke="#818CF8"
                      strokeWidth={es2031 ? 1.5 : 1}
                      filter="url(#shadowPill)"
                    />
                    <text
                      x={0}
                      y={2.5}
                      fill="#3730A3"
                      fontSize={es2031 ? 9.5 : 8.5}
                      fontWeight="800"
                      textAnchor="middle"
                    >
                      {es2031 ? `Híb: ${fmt(consensoVal)}` : fmt(consensoVal)}
                    </text>
                  </g>
                </g>
              )}

              {/* Etiqueta Maestra: Estudiantes en Aula */}
              {visibles.has("estudiantes") && estVal && (
                <g>
                  {/* Halo Exterior */}
                  <circle
                    cx={x}
                    cy={yEst}
                    r={es2026 || es2023 || es2031 ? 8 : 5}
                    fill={es2026 ? "#059669" : es2023 ? "#1E40AF" : es2031 ? "#7C3AED" : "#059669"}
                    fillOpacity={0.25}
                  />
                  {/* Núcleo */}
                  <circle
                    cx={x}
                    cy={yEst}
                    r={es2026 || es2023 || es2031 ? 5 : 3.5}
                    fill={es2026 ? "#059669" : es2023 ? "#1E40AF" : es2031 ? "#7C3AED" : "#059669"}
                    stroke="#FFFFFF"
                    strokeWidth={2}
                  />

                  {/* Badge Flotante con Cifra Numérica */}
                  <g transform={`translate(${x}, ${yEst + (es2026 ? 26 : -14)})`}>
                    <rect
                      x={es2026 || es2023 || es2031 ? -48 : -27}
                      y={-16}
                      width={es2026 || es2023 || es2031 ? 96 : 54}
                      height={20}
                      rx={6}
                      fill={es2026 ? "#ECFDF5" : es2023 ? "#EFF6FF" : es2031 ? "#F5F3FF" : "#FFFFFF"}
                      stroke={es2026 ? "#059669" : es2023 ? "#3B82F6" : es2031 ? "#8B5CF6" : "#CBD5E1"}
                      strokeWidth={es2026 ? 1.8 : 1.2}
                      filter="url(#shadowPill)"
                    />
                    <text
                      x={0}
                      y={-2}
                      fill={es2026 ? "#065F46" : es2023 ? "#1E40AF" : es2031 ? "#5B21B6" : "#0F172A"}
                      fontSize={es2026 || es2023 || es2031 ? 10.5 : 9.5}
                      fontWeight="900"
                      textAnchor="middle"
                    >
                      {es2026
                        ? `${fmt(estVal)} (SIE)`
                        : es2023
                          ? `${fmt(estVal)} ★`
                          : es2031
                            ? `${fmt(estVal)}`
                            : fmtAxis(estVal)}
                    </text>
                  </g>
                </g>
              )}
            </g>
          );
        })}

        {/* Línea Guía de Año Seleccionado */}
        {puntoActivo && (
          <line
            x1={scX(puntoActivo.anio)}
            y1={PAD.top}
            x2={scX(puntoActivo.anio)}
            y2={PAD.top + INNER_H}
            stroke="#059669"
            strokeWidth={1.8}
            strokeDasharray="3,2"
          />
        )}
      </svg>
    </div>
  );
}

type NivelFilter = "todos" | "inicial" | "primaria" | "secundaria";
type AreaFilter = "todos" | "urbana" | "rural";
type DepFilter =
  | "todos"
  | "chuquisaca"
  | "la_paz"
  | "cochabamba"
  | "oruro"
  | "potosi"
  | "tarija"
  | "santa_cruz"
  | "beni"
  | "pando";

const DEPARTAMENTOS = [
  { id: "todos", nombre: "Bolivia", codigo: "BOL" },
  { id: "chuquisaca", nombre: "Chuquisaca", codigo: "CH" },
  { id: "la_paz", nombre: "La Paz", codigo: "LP" },
  { id: "cochabamba", nombre: "Cochabamba", codigo: "CB" },
  { id: "oruro", nombre: "Oruro", codigo: "OR" },
  { id: "potosi", nombre: "Potosí", codigo: "PT" },
  { id: "tarija", nombre: "Tarija", codigo: "TJ" },
  { id: "santa_cruz", nombre: "Santa Cruz", codigo: "SC" },
  { id: "beni", nombre: "Beni", codigo: "BN" },
  { id: "pando", nombre: "Pando", codigo: "PD" },
];

// ─── Componente Principal ─────────────────────────────────────────────────────
export default function MatriculaEvolucionView() {
  const data = matriculaData as MatriculaProyeccionData;

  const [anioSeleccionado, setAnioSeleccionado] = useState<number>(2026);
  const [visibles, setVisibles] = useState<Set<string>>(
    new Set(["poblacion", "estudiantes", "cobertura", "arima", "consenso"])
  );
  const [mostrarTodasCantidades, setMostrarTodasCantidades] = useState<boolean>(true);
  const [margenErrorArimaPct, setMargenErrorArimaPct] = useState<number>(10);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Filtros de Segmentación
  const [filtroNivel, setFiltroNivel] = useState<NivelFilter>("todos");
  const [filtroArea, setFiltroArea] = useState<AreaFilter>("todos");
  const [filtroDep, setFiltroDep] = useState<DepFilter>("todos");

  // Resolver la serie activa multidimensional
  const serieActiva = React.useMemo(() => {
    let base: PuntoSerie[] = data.serie_nacional;

    // 1. Base por Departamento, Nivel o Área
    if (filtroDep !== "todos" && data.desagregaciones?.por_departamento?.[filtroDep]) {
      base = data.desagregaciones.por_departamento[filtroDep];
    } else if (filtroNivel !== "todos" && data.desagregaciones?.por_nivel?.[filtroNivel]) {
      base = data.desagregaciones.por_nivel[filtroNivel];
    } else if (filtroArea !== "todos" && data.desagregaciones?.por_area?.[filtroArea]) {
      base = data.desagregaciones.por_area[filtroArea];
    }

    // 2. Combinación Departamento + Nivel
    if (filtroDep !== "todos" && filtroNivel !== "todos" && data.desagregaciones?.por_departamento?.[filtroDep]) {
      const shareNivel = filtroNivel === "primaria" ? 0.4655 : filtroNivel === "secundaria" ? 0.4390 : 0.0955;
      base = data.desagregaciones.por_departamento[filtroDep].map((p) => ({
        ...p,
        matricula_real: p.matricula_real ? Math.round(p.matricula_real * shareNivel) : null,
        modelo_1_ine: p.modelo_1_ine ? Math.round(p.modelo_1_ine * shareNivel) : null,
        modelo_2_cobertura: p.modelo_2_cobertura ? Math.round(p.modelo_2_cobertura * shareNivel) : null,
        modelo_arima: p.modelo_arima ? Math.round(p.modelo_arima * shareNivel) : null,
        modelo_consenso: p.modelo_consenso ? Math.round(p.modelo_consenso * shareNivel) : null,
      }));
    }

    // 3. Combinación con Área (Urbana / Rural)
    if (filtroArea !== "todos" && (filtroDep !== "todos" || filtroNivel !== "todos")) {
      const shareArea = filtroArea === "urbana" ? 0.6958 : 0.3042;
      base = base.map((p) => ({
        ...p,
        matricula_real: p.matricula_real ? Math.round(p.matricula_real * shareArea) : null,
        modelo_1_ine: p.modelo_1_ine ? Math.round(p.modelo_1_ine * shareArea) : null,
        modelo_2_cobertura: p.modelo_2_cobertura ? Math.round(p.modelo_2_cobertura * shareArea) : null,
        modelo_arima: p.modelo_arima ? Math.round(p.modelo_arima * shareArea) : null,
        modelo_consenso: p.modelo_consenso ? Math.round(p.modelo_consenso * shareArea) : null,
      }));
    }

    return base;
  }, [data, filtroDep, filtroNivel, filtroArea]);

  const toggleSerie = (key: string) => {
    setVisibles((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        if (next.size > 1) next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  // Manejo de Fullscreen Nativo del Navegador
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      if (containerRef.current?.requestFullscreen) {
        containerRef.current.requestFullscreen().catch(() => {
          setIsFullscreen(true);
        });
      } else {
        setIsFullscreen(true);
      }
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      }
      setIsFullscreen(false);
    }
  };

  useEffect(() => {
    const handleFsChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener("fullscreenchange", handleFsChange);
    return () => document.removeEventListener("fullscreenchange", handleFsChange);
  }, []);

  const puntoActual =
    serieActiva.find((p) => p.anio === anioSeleccionado) ??
    serieActiva[serieActiva.length - 1] ??
    data.serie_nacional[15];

  const pobActual =
    puntoActual.modelo_1_ine ??
    (puntoActual.tasa_cob_pct
      ? Math.round((puntoActual.matricula_real ?? 0) / (puntoActual.tasa_cob_pct / 100))
      : 0);
  const cobActual = puntoActual.tasa_cob_pct;
  const estActual =
    puntoActual.matricula_real ??
    puntoActual.modelo_2_cobertura ??
    (cobActual ? Math.round(pobActual * (cobActual / 100)) : 0);

  const hayFiltrosActivos = filtroDep !== "todos" || filtroNivel !== "todos" || filtroArea !== "todos";

  const resetFiltros = () => {
    setFiltroDep("todos");
    setFiltroNivel("todos");
    setFiltroArea("todos");
  };

  const nombreSegmento = () => {
    const parts = [];
    if (filtroDep !== "todos") {
      const depObj = DEPARTAMENTOS.find((d) => d.id === filtroDep);
      parts.push(depObj ? depObj.nombre : filtroDep);
    } else {
      parts.push("Bolivia");
    }
    if (filtroNivel !== "todos") {
      parts.push(filtroNivel.charAt(0).toUpperCase() + filtroNivel.slice(1));
    }
    if (filtroArea !== "todos") {
      parts.push(filtroArea === "urbana" ? "Urbana" : "Rural");
    }
    return parts.join(" · ");
  };

  return (
    <div
      ref={containerRef}
      className={`bg-white transition-all ${isFullscreen
        ? "fixed inset-0 z-50 w-screen h-screen overflow-y-auto flex flex-col p-4 sm:p-6 bg-slate-50"
        : "rounded-3xl border border-slate-200/90 shadow-sm overflow-hidden"
        }`}
    >
      {/* ─── Encabezado de Máxima Jerarquía ─── */}
      <div className={`p-5 sm:p-6 bg-slate-50/90 border-b border-slate-100 flex flex-col lg:flex-row lg:items-center justify-between gap-4 ${isFullscreen ? "w-[92%] lg:w-[90%] mx-auto bg-transparent border-b-slate-200 px-0" : ""
        }`}>
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-black tracking-wide mb-1.5">
            <TrendingUp className="w-4 h-4 text-emerald-700" />
            DIRECCIÓN GENERAL DE FORMACIÓN DE MAESTROS (DGFM)
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
            Evolución y Proyección de la Matrícula Escolar con Tasa de Cobertura (2011–2034)
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Registro Oficial del SIE hasta la fecha (2011–2026) y Proyección Planificada hacia 2034.
          </p>
        </div>

        {/* Acceso Rápido + Botón Pantalla Completa */}
        <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
          <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-xl p-1 shadow-2xs">
            <span className="text-[10px] font-bold text-slate-400 px-2">Gestión:</span>
            {[
              { yr: 2023, label: "2023 (Pico)" },
              { yr: 2026, label: "2026 (Actual SIE)" },
              { yr: 2031, label: "2031 (Meta DGFM)" },
            ].map(({ yr, label }) => (
              <button
                key={yr}
                type="button"
                onClick={() => setAnioSeleccionado(yr)}
                className={`px-3 py-1 rounded-lg text-xs font-black transition-all ${anioSeleccionado === yr
                  ? "bg-emerald-700 text-white shadow-xs"
                  : "text-slate-600 hover:bg-slate-100"
                  }`}
              >
                {label}
              </button>
            ))}
          </div>

        </div>
      </div>

      {/* ─── Barra de Segmentación Multidimensional (Departamento, Nivel y Área) ─── */}
      <div className={`px-5 py-3 bg-slate-50/80 border-b border-slate-200 flex flex-col gap-2.5 ${isFullscreen ? "w-[92%] lg:w-[90%] mx-auto rounded-2xl bg-white border border-slate-200 shadow-2xs my-2 px-4" : ""
        }`}>


        {/* Fila 2: Nivel Educativo y Área Urbana/Rural */}
        <div className="flex items-center justify-between gap-3 flex-wrap pt-1.5 border-t border-slate-200/60">
          <div className="flex items-center gap-3 flex-wrap">
            {/* Nivel */}
            <div className="flex items-center gap-1 flex-wrap">
              <span className="text-[11px] font-black text-slate-700 flex items-center gap-1 uppercase tracking-wider mr-1">
                <GraduationCap className="w-3.5 h-3.5 text-emerald-600" /> Nivel:
              </span>
              {[
                { id: "todos", label: "Todos los Niveles" },
                { id: "inicial", label: "Inicial (4–5)" },
                { id: "primaria", label: "Primaria (6–11)" },
                { id: "secundaria", label: "Secundaria (12–17)" },
              ].map((niv) => (
                <button
                  key={niv.id}
                  type="button"
                  onClick={() => setFiltroNivel(niv.id as NivelFilter)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${filtroNivel === niv.id
                    ? "bg-emerald-700 text-white shadow-xs font-black"
                    : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"
                    }`}
                >
                  {niv.label}
                </button>
              ))}
            </div>

            {/* Separador vertical */}
            <div className="hidden sm:block h-4 w-[1px] bg-slate-300" />

            {/* Área Urbana / Rural */}
            <div className="flex items-center gap-1 flex-wrap">
              <span className="text-[11px] font-black text-slate-700 flex items-center gap-1 uppercase tracking-wider mr-1">
                <Layers className="w-3.5 h-3.5 text-sky-600" /> Área:
              </span>
              {[
                { id: "todos", label: "Consolidado" },
                { id: "urbana", label: "Urbana (~70%)" },
                { id: "rural", label: "Rural (~30%)" },
              ].map((area) => (
                <button
                  key={area.id}
                  type="button"
                  onClick={() => setFiltroArea(area.id as AreaFilter)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${filtroArea === area.id
                    ? "bg-sky-700 text-white shadow-xs font-black"
                    : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"
                    }`}
                >
                  {area.label}
                </button>
              ))}
            </div>
          </div>

          {/* Badge del Filtro Activo + Botón Restablecer */}
          {hayFiltrosActivos && (
            <div className="flex items-center gap-1.5 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-lg text-xs text-amber-900">
              <span className="font-bold">Segmento:</span>
              <span className="font-black text-amber-950">{nombreSegmento()}</span>
              <button
                type="button"
                onClick={resetFiltros}
                className="ml-1 text-[10px] font-bold bg-amber-200 hover:bg-amber-300 text-amber-900 px-1.5 py-0.5 rounded transition-all flex items-center gap-0.5"
                title="Restablecer a Total Nacional"
              >
                <X className="w-3 h-3" /> Restablecer
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ─── Fila Compacta de Cifras del Año Seleccionado (Discreta y Elegante) ─── */}
      <div className={`px-5 py-2.5 bg-slate-50 border-b border-slate-100 flex items-center justify-between text-xs text-slate-600 flex-wrap gap-2 ${isFullscreen ? "w-[92%] lg:w-[90%] mx-auto rounded-2xl bg-white border border-slate-200 shadow-2xs my-2 px-4" : ""
        }`}>
        <div className="flex items-center gap-2">
          <span className="font-bold text-slate-800 bg-white border border-slate-200 px-2.5 py-0.5 rounded-lg shadow-2xs">
            Gestión {anioSeleccionado}
          </span>
          <span className="text-[11px] text-slate-400">
            {puntoActual.anio <= 2026 ? "Registro Oficial SIE" : "Proyección INE + SIE"}
          </span>
        </div>

        <div className="flex items-center gap-2 font-medium text-slate-700 text-xs flex-wrap">
          <span className="text-amber-800 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-md">
            Población: <strong>{fmtAxis(pobActual)}</strong>
          </span>
          {cobActual != null && (
            <>
              <span className="text-slate-400 font-bold">×</span>
              <span className="text-sky-800 bg-sky-50 border border-sky-200 px-2 py-0.5 rounded-md">
                Cobertura: <strong>{cobActual}%</strong>
              </span>
              <span className="text-slate-400 font-bold">=</span>
            </>
          )}
          <span className="text-emerald-900 bg-emerald-50 border border-emerald-300 px-2.5 py-0.5 rounded-md font-bold">
            Estudiantes: <strong>{fmt(estActual)}</strong>
          </span>

          {visibles.has("arima") && puntoActual.modelo_arima && (
            <span className="text-purple-900 bg-purple-50 border border-purple-300 px-2.5 py-0.5 rounded-md font-bold">
              ARIMA: <strong>{fmt(puntoActual.modelo_arima)}</strong> (±{margenErrorArimaPct}%: [{fmt(Math.round(puntoActual.modelo_arima * (1 - margenErrorArimaPct / 100)))} - {fmt(Math.round(puntoActual.modelo_arima * (1 + margenErrorArimaPct / 100)))}])
            </span>
          )}

          {visibles.has("consenso") && puntoActual.modelo_consenso && puntoActual.anio >= 2027 && (
            <span className="text-indigo-900 bg-indigo-50 border border-indigo-300 px-2.5 py-0.5 rounded-md font-bold">
              Consenso Híbrido: <strong>{fmt(puntoActual.modelo_consenso)}</strong>
            </span>
          )}
        </div>
      </div>

      {/* ─── Barra de Herramientas y Series ─── */}
      <div className={`px-5 py-3 bg-white border-b border-slate-100 flex items-center justify-between gap-3 flex-wrap ${isFullscreen ? "w-[92%] lg:w-[90%] mx-auto rounded-2xl border border-slate-200 shadow-2xs my-2 px-4" : ""
        }`}>
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-bold text-slate-700 flex items-center gap-1">
            <Layers className="w-3.5 h-3.5 text-slate-400" /> Series Activas:
          </span>

          <button
            type="button"
            onClick={() => toggleSerie("estudiantes")}
            className={`px-3 py-1.5 rounded-xl text-xs font-extrabold border transition-all ${visibles.has("estudiantes")
              ? "bg-emerald-50 border-emerald-400 text-emerald-900 shadow-2xs"
              : "bg-slate-100 text-slate-400 border-slate-200"
              }`}
          >
            <span className="inline-block w-2.5 h-2.5 rounded-full bg-emerald-600 mr-1.5" />
            Estudiantes en Aula (SIE)
          </button>

          <button
            type="button"
            onClick={() => toggleSerie("cobertura")}
            className={`px-3 py-1.5 rounded-xl text-xs font-extrabold border transition-all ${visibles.has("cobertura")
              ? "bg-sky-50 border-sky-300 text-sky-900 shadow-2xs"
              : "bg-slate-100 text-slate-400 border-slate-200"
              }`}
          >
            <span className="inline-block w-2.5 h-2.5 rounded-full bg-sky-600 mr-1.5" />
            Tasa de Cobertura (%)
          </button>

          <button
            type="button"
            onClick={() => toggleSerie("poblacion")}
            className={`px-3 py-1.5 rounded-xl text-xs font-extrabold border transition-all ${visibles.has("poblacion")
              ? "bg-amber-50 border-amber-300 text-amber-900 shadow-2xs"
              : "bg-slate-100 text-slate-400 border-slate-200"
              }`}
          >
            <span className="inline-block w-2.5 h-2.5 rounded-full bg-amber-600 mr-1.5" />
            Población en Edad Escolar (INE)
          </button>

          <button
            type="button"
            onClick={() => toggleSerie("arima")}
            className={`px-3 py-1.5 rounded-xl text-xs font-extrabold border transition-all ${visibles.has("arima")
              ? "bg-purple-50 border-purple-300 text-purple-900 shadow-2xs"
              : "bg-slate-100 text-slate-400 border-slate-200"
              }`}
          >
            <span className="inline-block w-2.5 h-2.5 rounded-full bg-purple-600 mr-1.5" />
            Inercia ARIMA
          </button>

          <button
            type="button"
            onClick={() => toggleSerie("consenso")}
            className={`px-3 py-1.5 rounded-xl text-xs font-extrabold border transition-all ${visibles.has("consenso")
              ? "bg-indigo-50 border-indigo-400 text-indigo-900 shadow-2xs"
              : "bg-slate-100 text-slate-400 border-slate-200"
              }`}
          >
            <span className="inline-block w-2.5 h-2.5 rounded-full bg-indigo-600 mr-1.5" />
            Consenso Híbrido (INE + SIE)
          </button>
        </div>

        {/* Controles de ARIMA y Etiquetas */}
        <div className="flex items-center gap-2 flex-wrap">
          {visibles.has("arima") && (
            <div className="flex items-center gap-1.5 bg-purple-50 border border-purple-200 px-3 py-1 rounded-xl text-xs text-purple-900 shadow-2xs">
              <span className="font-bold">Error ARIMA:</span>
              {[5, 10, 15, 20].map((pct) => (
                <button
                  key={pct}
                  type="button"
                  onClick={() => setMargenErrorArimaPct(pct)}
                  className={`px-2 py-0.5 rounded-lg text-xs font-black transition-all ${margenErrorArimaPct === pct
                    ? "bg-purple-700 text-white shadow-2xs"
                    : "bg-white text-purple-700 hover:bg-purple-100 border border-purple-200"
                    }`}
                >
                  ±{pct}%
                </button>
              ))}
            </div>
          )}

          <button
            type="button"
            onClick={() => setMostrarTodasCantidades(!mostrarTodasCantidades)}
            className={`text-xs font-extrabold px-3 py-1.5 rounded-xl border flex items-center gap-1.5 transition-all ${mostrarTodasCantidades
              ? "bg-emerald-700 text-white border-emerald-700 shadow-2xs"
              : "bg-slate-100 text-slate-700 border-slate-300 hover:bg-slate-200"
              }`}
          >
            <Tag className="w-3.5 h-3.5" />
            <span>{mostrarTodasCantidades ? "Cantidades Numéricas: ACTIVADAS" : "Mostrar Todas las Cantidades"}</span>
          </button>
        </div>
      </div>

      {/* ─── Lienzo Principal (Gráfico SVG de Gran Envergadura) ─── */}
      <div className={`bg-white transition-all ${isFullscreen
        ? "flex-1 w-[92%] lg:w-[90%] mx-auto my-3 p-6 rounded-3xl border border-slate-200/90 shadow-sm flex flex-col justify-center min-h-[660px]"
        : "p-4 sm:p-6 w-full min-h-[520px]"
        }`}>
        <GraficoPremium
          serie={serieActiva}
          anioSeleccionado={anioSeleccionado}
          onSelectAnio={(yr) => setAnioSeleccionado(yr)}
          visibles={visibles}
          mostrarTodasCantidades={mostrarTodasCantidades}
          margenErrorArimaPct={margenErrorArimaPct}
          height={isFullscreen ? 660 : 520}
          isFullscreen={isFullscreen}
          subtituloSegmento={nombreSegmento()}
        />
      </div>

      {/* ─── Pie Institucional ─── */}
      <div className={`p-5 bg-slate-50 border-t border-slate-200 text-xs space-y-2.5 ${isFullscreen ? "w-[92%] lg:w-[90%] mx-auto rounded-2xl bg-white border border-slate-200 shadow-2xs mb-6 px-4" : ""
        }`}>
        <div className="flex items-start gap-2.5 text-slate-700">
          <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
          <p className="leading-relaxed">
            <strong className="text-slate-900">Fundamento Técnico para Autoridades:</strong> Con los datos reales del SIE consolidados hasta 2026 (**2.815.162 estudiantes**), la Tasa de Cobertura ha alcanzado el **88.8%**. Hacia 2031, la cobertura crecerá al **91.4%**, pero la población de niños disminuye en **360.000**. El producto matemático arroja **2.558.288 estudiantes efectivos**, lo que confirma que no se deben habilitar nuevos cupos en educación primaria e inicial, sino focalizarlos en especialidades con déficit en secundaria y bachillerato técnico humanístico.
          </p>
        </div>

        {/* Explicación Metodológica de ARIMA en 3 Pasos Claros y Visuales */}
        <div className="bg-purple-50/70 border border-purple-200/90 p-3.5 rounded-2xl text-xs space-y-2">
          <div className="flex items-center gap-2 font-extrabold text-purple-950">
            <Sparkles className="w-4 h-4 text-purple-700" />
            <span>¿Cómo proyecta el Modelo ARIMA y por qué la curva se va frenando?</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1 text-[11.5px]">
            <div className="bg-white p-2.5 rounded-xl border border-purple-100 shadow-2xs">
              <span className="font-bold text-purple-900 block mb-0.5">1. Caída Histórica Observada</span>
              <p className="text-slate-600">
                La matrícula en aula cayó en <strong>-10.649</strong> estudiantes en 2024 y en <strong>-41.614</strong> en 2025.
              </p>
            </div>

            <div className="bg-white p-2.5 rounded-xl border border-purple-100 shadow-2xs">
              <span className="font-bold text-purple-900 block mb-0.5">2. Amortiguamiento Gradual (No Recta)</span>
              <p className="text-slate-600">
                El modelo no traza una línea recta infinita: cada año el impacto es menor (de <strong>-38.694</strong> en 2026 hasta <strong>-26.895</strong> en 2031).
              </p>
            </div>

            <div className="bg-white p-2.5 rounded-xl border border-purple-100 shadow-2xs">
              <span className="font-bold text-purple-900 block mb-0.5">3. Pronóstico Inercial 2031</span>
              <p className="text-slate-600">
                Sitúa la matrícula en <strong>2.703.844 estudiantes</strong>, con un margen de error calibrable en tiempo real.
              </p>
            </div>
          </div>
        </div>

        {/* Explicación del Modelo de Consenso Híbrido (Ensamble INE + SIE) */}
        {visibles.has("consenso") && (
          <div className="bg-indigo-50/70 border border-indigo-200/90 p-3.5 rounded-2xl text-xs space-y-2">
            <div className="flex items-center gap-2 font-extrabold text-indigo-950">
              <Award className="w-4 h-4 text-indigo-700" />
              <span>Modelo de Consenso Híbrido (Ensamble Óptimo INE + SIE)</span>
            </div>
            <p className="text-slate-600 leading-relaxed text-[11.5px]">
              Combina el <strong>50% del Modelo Planificado (INE × Cobertura)</strong> con el <strong>50% del Modelo ARIMA Inercial (SIE)</strong>. Mientras el censo del INE proyecta el techo demográfico y el ARIMA proyecta la retención estadística en aula, el consenso equilibra ambas fuerzas situando la matrícula 2031 en <strong>2.629.666 estudiantes</strong> (el punto medio metodológico más robusto para la toma de decisiones).
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
