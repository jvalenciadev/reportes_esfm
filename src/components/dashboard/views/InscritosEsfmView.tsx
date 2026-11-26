'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  BarChart3,
  Building2,
  ChevronDown,
  ChevronRight,
  Download,
  Filter,
  GraduationCap,
  Layers,
  MapPin,
  Search,
  Table2,
  TrendingUp,
  Users,
  BookOpen,
  X,
} from 'lucide-react';

interface RegistroInscrito {
  d: string; // Departamento
  e: string; // ESFM / UA
  g: number; // Gestión (2022-2026)
  a: number; // Anio_Que_Cursa (1-5)
  s: string; // Especialidad
  c: number; // Cantidad de estudiantes
}

interface InscritosDataset {
  fuente: string;
  total_registros: number;
  gestiones: number[];
  anios: number[];
  departamentos: string[];
  registros: RegistroInscrito[];
}

interface AnioCounts {
  1: number;
  2: number;
  3: number;
  4: number;
  5: number;
  total: number;
}

interface EspNode {
  especialidad: string;
  anios: AnioCounts;
}

interface EsfmNode {
  esfm: string;
  anios: AnioCounts;
  especialidades: EspNode[];
}

interface DeptoNode {
  departamento: string;
  anios: AnioCounts;
  esfms: EsfmNode[];
  especialidadesCount: number;
}

const ANIO_COLORS: Record<1 | 2 | 3 | 4 | 5, { bg: string; hex: string; label: string }> = {
  1: { bg: 'bg-[#0f2942]', hex: '#0f2942', label: '1º Año' },
  2: { bg: 'bg-[#2563eb]', hex: '#2563eb', label: '2º Año' },
  3: { bg: 'bg-[#c9a751]', hex: '#c9a751', label: '3º Año' },
  4: { bg: 'bg-[#059669]', hex: '#059669', label: '4º Año' },
  5: { bg: 'bg-[#64748b]', hex: '#64748b', label: '5º Año' },
};

type NivelEspecialidad = 'INICIAL' | 'PRIMARIA' | 'SECUNDARIA' | 'TECNICA' | 'ESPECIAL';

const NIVEL_ORDER: NivelEspecialidad[] = ['INICIAL', 'PRIMARIA', 'SECUNDARIA', 'TECNICA', 'ESPECIAL'];

const NIVEL_WEIGHT: Record<NivelEspecialidad, number> = {
  INICIAL: 1,
  PRIMARIA: 2,
  SECUNDARIA: 3,
  TECNICA: 4,
  ESPECIAL: 5,
};

const NIVEL_META: Record<
  NivelEspecialidad,
  {
    label: string;
    shortLabel: string;
    pillActive: string;
    badge: string;
    cardHeader: string;
    chipActive: string;
    dot: string;
  }
> = {
  INICIAL: {
    label: 'Educación Inicial',
    shortLabel: 'Inicial',
    pillActive: 'bg-emerald-600 text-white border-emerald-600',
    badge: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800',
    cardHeader: 'bg-emerald-50/90 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-200 border-emerald-200 dark:border-emerald-800',
    chipActive: 'bg-emerald-600 text-white border-emerald-600',
    dot: 'bg-emerald-500',
  },
  PRIMARIA: {
    label: 'Educación Primaria',
    shortLabel: 'Primaria',
    pillActive: 'bg-blue-600 text-white border-blue-600',
    badge: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/60 dark:text-blue-300 dark:border-blue-800',
    cardHeader: 'bg-blue-50/90 dark:bg-blue-950/40 text-blue-900 dark:text-blue-200 border-blue-200 dark:border-blue-800',
    chipActive: 'bg-blue-600 text-white border-blue-600',
    dot: 'bg-blue-500',
  },
  SECUNDARIA: {
    label: 'Educación Secundaria',
    shortLabel: 'Secundaria',
    pillActive: 'bg-[#0f2942] text-white border-[#0f2942]',
    badge: 'bg-slate-100 text-[#0f2942] border-slate-300 dark:bg-slate-800 dark:text-slate-200 dark:border-slate-700',
    cardHeader: 'bg-[#0f2942]/5 dark:bg-slate-800/80 text-[#0f2942] dark:text-white border-slate-200 dark:border-slate-700',
    chipActive: 'bg-[#0f2942] text-white border-[#0f2942]',
    dot: 'bg-[#0f2942] dark:bg-sky-400',
  },
  TECNICA: {
    label: 'Técnica Tecnológica (BTH)',
    shortLabel: 'Técnica',
    pillActive: 'bg-[#c9a751] text-[#0f172a] border-[#c9a751] font-black',
    badge: 'bg-[#faf5e8] text-[#937527] border-[#e5d4a4] dark:bg-amber-950/50 dark:text-[#c9a751] dark:border-[#c9a751]/40',
    cardHeader: 'bg-[#faf5e8] dark:bg-amber-950/30 text-[#937527] dark:text-[#c9a751] border-[#e5d4a4] dark:border-[#c9a751]/40',
    chipActive: 'bg-[#c9a751] text-[#0f172a] border-[#c9a751] font-black',
    dot: 'bg-[#c9a751]',
  },
  ESPECIAL: {
    label: 'Educación Especial',
    shortLabel: 'Especial',
    pillActive: 'bg-purple-600 text-white border-purple-600',
    badge: 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/60 dark:text-purple-300 dark:border-purple-800',
    cardHeader: 'bg-purple-50/90 dark:bg-purple-950/40 text-purple-900 dark:text-purple-200 border-purple-200 dark:border-purple-800',
    chipActive: 'bg-purple-600 text-white border-purple-600',
    dot: 'bg-purple-500',
  },
};

const TECNICA_SET = new Set([
  'AGROPECUARIA',
  'CARPINTERÍA INDUSTRIAL EN MADERA Y METAL',
  'ELECTRICIDAD Y ELECTRÓNICA',
  'ELECTROMECÁNICA',
  'INDUSTRIA TEXTIL Y CONFECCIÓN',
  'MECÁNICA AUTOMOTRIZ',
  'MECÁNICA INDUSTRIAL',
  'TRANSFORMACIÓN DE ALIMENTOS Y GASTRONOMÍA',
]);

function getNivelEspecialidad(especialidad: string): NivelEspecialidad {
  const s = especialidad.trim().toUpperCase();
  if (s.includes('INICIAL')) return 'INICIAL';
  if (s.includes('PRIMARIA')) return 'PRIMARIA';
  if (s.includes('ESPECIAL') || s.includes('DISCAPACIDAD')) return 'ESPECIAL';
  if (TECNICA_SET.has(s)) return 'TECNICA';
  return 'SECUNDARIA';
}

function emptyAnios(): AnioCounts {
  return { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, total: 0 };
}

function addAnioCount(target: AnioCounts, anio: number, qty: number): void {
  if (anio >= 1 && anio <= 5) {
    target[anio as 1 | 2 | 3 | 4 | 5] += qty;
  }
  target.total += qty;
}

function StackedAnioBar({
  anios,
  maxTotal,
  visibleAnios,
  fmt,
}: {
  anios: AnioCounts;
  maxTotal: number;
  visibleAnios: (1 | 2 | 3 | 4 | 5)[];
  fmt: (n: number) => string;
}) {
  return (
    <div className="space-y-1.5">
      <div className="w-full h-5 bg-slate-100 dark:bg-slate-800 rounded-md overflow-hidden flex">
        {visibleAnios.map((a) => {
          const val = anios[a];
          const w = (val / maxTotal) * 100;
          if (w <= 0) return null;
          const textColor = a === 3 ? 'text-[#0f172a]' : 'text-white';
          return (
            <div
              key={a}
              style={{ width: `${w}%` }}
              className={`${ANIO_COLORS[a].bg} h-full flex items-center justify-center overflow-hidden transition-all`}
              title={`${ANIO_COLORS[a].label}: ${fmt(val)}`}
            >
              {w >= 7 && (
                <span className={`text-[10px] font-black tabular-nums leading-none ${textColor}`}>
                  {fmt(val)}
                </span>
              )}
            </div>
          );
        })}
      </div>
      <div className="flex flex-wrap items-center gap-x-2.5 gap-y-0.5 text-[10px] text-slate-600 dark:text-slate-400">
        {visibleAnios.map((a) => (
          <span key={a} className="inline-flex items-center gap-1 tabular-nums">
            <span className={`w-2 h-2 rounded-xs ${ANIO_COLORS[a].bg}`} />
            <span className="font-semibold">{a}º:</span>
            <strong className="text-[#0f2942] dark:text-slate-200">{fmt(anios[a])}</strong>
          </span>
        ))}
      </div>
    </div>
  );
}

export default function InscritosEsfmView() {
  const [dataset, setDataset] = useState<InscritosDataset | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Modo de visualización: Tabla Dinámica vs Gráficos Analíticos
  const [viewMode, setViewMode] = useState<'tabla' | 'graficos'>('tabla');

  // Filtros: por defecto gestión 2026 y todos los años (1° a 5°)
  const [selectedGestion, setSelectedGestion] = useState<number | 'TODAS'>(2026);
  const [selectedAnio, setSelectedAnio] = useState<number | 'TODOS'>('TODOS');
  const [selectedNivel, setSelectedNivel] = useState<NivelEspecialidad | 'TODOS'>('TODOS');
  const [selectedEspecialidades, setSelectedEspecialidades] = useState<Set<string>>(new Set());
  const [showEspPanel, setShowEspPanel] = useState<boolean>(false);
  const [popoverTab, setPopoverTab] = useState<NivelEspecialidad | 'TODOS'>('TODOS');
  const [espQuickSearch, setEspQuickSearch] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [espSortMode, setEspSortMode] = useState<'nivel' | 'matricula' | 'alfabetico'>('nivel');
  const [mounted, setMounted] = useState<boolean>(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Drill-down dinámico en tabla
  const [expandedDeptos, setExpandedDeptos] = useState<Set<string>>(new Set());
  const [expandedEsfms, setExpandedEsfms] = useState<Set<string>>(new Set());

  // Drill-down interactivo en gráficos
  const [chartDepto, setChartDepto] = useState<string | null>(null);
  const [chartEsfm, setChartEsfm] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/inscritos-esfm')
      .then((res) => {
        if (!res.ok) throw new Error('Error cargando datos de inscritos ESFM');
        return res.json();
      })
      .then((json: InscritosDataset) => {
        setDataset(json);
        setLoading(false);
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : 'Error desconocido');
        setLoading(false);
      });
  }, []);

  const fmt = (n: number) => n.toLocaleString('es-BO');

  // Catálogo agrupado de especialidades por nivel (Inicial, Primaria, Secundaria, Técnica, Especial)
  const especialidadesByNivel = useMemo(() => {
    const groups: Record<NivelEspecialidad, { especialidad: string; total: number }[]> = {
      INICIAL: [],
      PRIMARIA: [],
      SECUNDARIA: [],
      TECNICA: [],
      ESPECIAL: [],
    };
    const totalsByNivel: Record<NivelEspecialidad, number> = {
      INICIAL: 0,
      PRIMARIA: 0,
      SECUNDARIA: 0,
      TECNICA: 0,
      ESPECIAL: 0,
    };
    if (!dataset) return { groups, totalsByNivel };

    const espCounts = new Map<string, number>();
    for (const r of dataset.registros) {
      if (selectedGestion !== 'TODAS' && r.g !== selectedGestion) continue;
      if (selectedAnio !== 'TODOS' && r.a !== selectedAnio) continue;
      espCounts.set(r.s, (espCounts.get(r.s) || 0) + r.c);
    }

    for (const [esp, total] of espCounts.entries()) {
      const nivel = getNivelEspecialidad(esp);
      groups[nivel].push({ especialidad: esp, total });
      totalsByNivel[nivel] += total;
    }

    for (const niv of NIVEL_ORDER) {
      groups[niv].sort((a, b) => b.total - a.total);
    }

    return { groups, totalsByNivel };
  }, [dataset, selectedGestion, selectedAnio]);

  // Construcción jerárquica dinámica: Departamento -> ESFM -> Especialidad x Anio_Que_Cursa
  const { deptosTree, nationalTotals, totalEsfms, totalEspecialidades } = useMemo(() => {
    if (!dataset) {
      return {
        deptosTree: [] as DeptoNode[],
        nationalTotals: emptyAnios(),
        totalEsfms: 0,
        totalEspecialidades: 0,
      };
    }

    const term = searchTerm.trim().toUpperCase();
    const deptoMap = new Map<
      string,
      {
        anios: AnioCounts;
        esfms: Map<string, { anios: AnioCounts; esps: Map<string, AnioCounts> }>;
        espSet: Set<string>;
      }
    >();

    const natTotals = emptyAnios();
    const allEsfms = new Set<string>();
    const allEsps = new Set<string>();

    for (const r of dataset.registros) {
      if (selectedGestion !== 'TODAS' && r.g !== selectedGestion) continue;
      if (selectedAnio !== 'TODOS' && r.a !== selectedAnio) continue;
      if (selectedNivel !== 'TODOS' && getNivelEspecialidad(r.s) !== selectedNivel) continue;
      if (selectedEspecialidades.size > 0 && !selectedEspecialidades.has(r.s)) continue;
      if (term) {
        const match =
          r.d.includes(term) || r.e.includes(term) || r.s.includes(term);
        if (!match) continue;
      }

      addAnioCount(natTotals, r.a, r.c);
      allEsfms.add(`${r.d}::${r.e}`);
      allEsps.add(r.s);

      let dEntry = deptoMap.get(r.d);
      if (!dEntry) {
        dEntry = { anios: emptyAnios(), esfms: new Map(), espSet: new Set() };
        deptoMap.set(r.d, dEntry);
      }
      addAnioCount(dEntry.anios, r.a, r.c);
      dEntry.espSet.add(r.s);

      let eEntry = dEntry.esfms.get(r.e);
      if (!eEntry) {
        eEntry = { anios: emptyAnios(), esps: new Map() };
        dEntry.esfms.set(r.e, eEntry);
      }
      addAnioCount(eEntry.anios, r.a, r.c);

      let sEntry = eEntry.esps.get(r.s);
      if (!sEntry) {
        sEntry = emptyAnios();
        eEntry.esps.set(r.s, sEntry);
      }
      addAnioCount(sEntry, r.a, r.c);
    }

    const tree: DeptoNode[] = Array.from(deptoMap.entries())
      .map(([departamento, dVal]) => {
        const esfms: EsfmNode[] = Array.from(dVal.esfms.entries())
          .map(([esfm, eVal]) => {
            const especialidades: EspNode[] = Array.from(eVal.esps.entries())
              .map(([especialidad, sAnios]) => ({
                especialidad,
                anios: sAnios,
              }))
              .sort((a, b) => {
                if (espSortMode === 'matricula') {
                  return b.anios.total - a.anios.total;
                }
                if (espSortMode === 'alfabetico') {
                  return a.especialidad.localeCompare(b.especialidad, 'es');
                }
                // 'nivel' (Por defecto): Agrupado por orden de Nivel (Inicial -> Primaria -> Secundaria -> Técnica -> Especial) y alfabético
                const nivA = NIVEL_WEIGHT[getNivelEspecialidad(a.especialidad)];
                const nivB = NIVEL_WEIGHT[getNivelEspecialidad(b.especialidad)];
                if (nivA !== nivB) return nivA - nivB;
                return a.especialidad.localeCompare(b.especialidad, 'es');
              });

            return {
              esfm,
              anios: eVal.anios,
              especialidades,
            };
          })
          .sort((a, b) => b.anios.total - a.anios.total);

        return {
          departamento,
          anios: dVal.anios,
          esfms,
          especialidadesCount: dVal.espSet.size,
        };
      })
      .sort((a, b) => b.anios.total - a.anios.total);

    return {
      deptosTree: tree,
      nationalTotals: natTotals,
      totalEsfms: allEsfms.size,
      totalEspecialidades: allEsps.size,
    };
  }, [dataset, selectedGestion, selectedAnio, selectedNivel, selectedEspecialidades, searchTerm, espSortMode]);

  // Datos para los 4 gráficos analíticos
  const chartAnalytics = useMemo(() => {
    if (!dataset) {
      return {
        trendByGestion: [] as { gestion: number; total: number; diffPct: number | null }[],
        esfmChartList: [] as { esfm: string; depto: string; anios: AnioCounts }[],
        espChartList: [] as { especialidad: string; anios: AnioCounts }[],
      };
    }

    const term = searchTerm.trim().toUpperCase();
    const gestionTotals = new Map<number, number>();
    dataset.gestiones.forEach((g) => gestionTotals.set(g, 0));

    for (const r of dataset.registros) {
      if (selectedAnio !== 'TODOS' && r.a !== selectedAnio) continue;
      if (selectedNivel !== 'TODOS' && getNivelEspecialidad(r.s) !== selectedNivel) continue;
      if (selectedEspecialidades.size > 0 && !selectedEspecialidades.has(r.s)) continue;
      if (chartDepto && r.d !== chartDepto) continue;
      if (chartEsfm && r.e !== chartEsfm) continue;
      if (term && !(r.d.includes(term) || r.e.includes(term) || r.s.includes(term))) continue;
      gestionTotals.set(r.g, (gestionTotals.get(r.g) || 0) + r.c);
    }

    const trendByGestion = dataset.gestiones.map((g, idx) => {
      const total = gestionTotals.get(g) || 0;
      const prev = idx > 0 ? gestionTotals.get(dataset.gestiones[idx - 1]) || 0 : 0;
      const diffPct = idx > 0 && prev > 0 ? ((total - prev) / prev) * 100 : null;
      return { gestion: g, total, diffPct };
    });

    // ESFMs filtradas por chartDepto (o todas top 15)
    const esfmAgg = new Map<string, { esfm: string; depto: string; anios: AnioCounts }>();
    const espAgg = new Map<string, AnioCounts>();

    for (const d of deptosTree) {
      if (chartDepto && d.departamento !== chartDepto) continue;
      for (const e of d.esfms) {
        const key = `${d.departamento}::${e.esfm}`;
        esfmAgg.set(key, { esfm: e.esfm, depto: d.departamento, anios: e.anios });

        if (chartEsfm && e.esfm !== chartEsfm) continue;
        for (const s of e.especialidades) {
          let sObj = espAgg.get(s.especialidad);
          if (!sObj) {
            sObj = emptyAnios();
            espAgg.set(s.especialidad, sObj);
          }
          for (const a of [1, 2, 3, 4, 5] as const) {
            sObj[a] += s.anios[a];
          }
          sObj.total += s.anios.total;
        }
      }
    }

    const esfmChartList = Array.from(esfmAgg.values())
      .sort((a, b) => b.anios.total - a.anios.total)
      .slice(0, chartDepto ? 20 : 14);

    const espChartList = Array.from(espAgg.entries())
      .map(([especialidad, anios]) => ({ especialidad, anios }))
      .sort((a, b) => b.anios.total - a.anios.total);

    return { trendByGestion, esfmChartList, espChartList };
  }, [dataset, deptosTree, selectedAnio, selectedNivel, selectedEspecialidades, searchTerm, chartDepto, chartEsfm]);

  const toggleEspecialidad = (esp: string) => {
    setSelectedEspecialidades((prev) => {
      const next = new Set(prev);
      if (next.has(esp)) next.delete(esp);
      else next.add(esp);
      return next;
    });
  };

  const clearEspecialidadFilters = () => {
    setSelectedNivel('TODOS');
    setSelectedEspecialidades(new Set());
  };

  const toggleDepto = (depto: string) => {
    setExpandedDeptos((prev) => {
      const next = new Set(prev);
      if (next.has(depto)) next.delete(depto);
      else next.add(depto);
      return next;
    });
  };

  const toggleEsfm = (depto: string, esfm: string) => {
    const key = `${depto}::${esfm}`;
    setExpandedEsfms((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const expandAll = () => {
    const allD = new Set(deptosTree.map((d) => d.departamento));
    const allE = new Set<string>();
    deptosTree.forEach((d) =>
      d.esfms.forEach((e) => allE.add(`${d.departamento}::${e.esfm}`))
    );
    setExpandedDeptos(allD);
    setExpandedEsfms(allE);
  };

  const collapseAll = () => {
    setExpandedDeptos(new Set());
    setExpandedEsfms(new Set());
  };

  const handleExportCsv = () => {
    const headers = [
      'Gestion',
      'Departamento',
      'ESFM_UA',
      'Especialidad',
      '1er_Anio',
      '2do_Anio',
      '3er_Anio',
      '4to_Anio',
      '5to_Anio',
      'Total',
    ];
    const rows: string[] = [headers.join(',')];
    const gLabel = selectedGestion === 'TODAS' ? '2022-2026' : String(selectedGestion);

    for (const d of deptosTree) {
      for (const e of d.esfms) {
        for (const s of e.especialidades) {
          rows.push(
            [
              gLabel,
              `"${d.departamento}"`,
              `"${e.esfm}"`,
              `"${s.especialidad}"`,
              s.anios[1],
              s.anios[2],
              s.anios[3],
              s.anios[4],
              s.anios[5],
              s.anios.total,
            ].join(',')
          );
        }
      }
    }

    const blob = new Blob(['\uFEFF' + rows.join('\n')], {
      type: 'text/csv;charset=utf-8;',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Matricula_ESFM_${gLabel}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const visibleAnios: (1 | 2 | 3 | 4 | 5)[] =
    selectedAnio === 'TODOS'
      ? [1, 2, 3, 4, 5]
      : [selectedAnio as 1 | 2 | 3 | 4 | 5];

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-3">
        <div className="w-10 h-10 border-4 border-[#c9a751] border-t-transparent rounded-full animate-spin" />
        <span className="text-sm font-bold text-slate-500 dark:text-slate-400">
          Cargando matrícula histórica ESFM 2022–2026...
        </span>
      </div>
    );
  }

  if (error || !dataset) {
    return (
      <div className="p-6 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-2xl text-rose-800 dark:text-rose-200 text-sm font-semibold">
        {error || 'No se pudo cargar el dataset de inscritos.'}
      </div>
    );
  }

  const maxDeptoTotal = deptosTree[0]?.anios.total || 1;
  const maxTrendTotal = Math.max(...chartAnalytics.trendByGestion.map((t) => t.total), 1);
  const maxEsfmTotal = chartAnalytics.esfmChartList[0]?.anios.total || 1;
  const maxEspTotal = chartAnalytics.espChartList[0]?.anios.total || 1;

  return (
    <div className="space-y-6 animate-in fade-in duration-300 pb-12">
      {/* Barra de Filtros + Conmutador Tabla / Gráficos (Paleta Institucional) */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-[#e5d4a4]/80 dark:border-slate-800 shadow-xs space-y-4">
        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4">
          {/* Filtro por Gestión */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[11px] font-black uppercase tracking-wider text-[#937527] dark:text-[#c9a751] flex items-center gap-1.5 mr-1">
              <Filter className="w-3.5 h-3.5 text-[#c9a751]" />
              Gestión:
            </span>
            <button
              type="button"
              onClick={() => setSelectedGestion('TODAS')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer border ${selectedGestion === 'TODAS'
                ? 'bg-[#0f2942] text-white border-[#0f2942] shadow-xs'
                : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-[#faf5e8] dark:hover:bg-slate-700'
                }`}
            >
              Todas (2022–2026)
            </button>
            {dataset.gestiones.map((g) => (
              <button
                key={g}
                type="button"
                onClick={() => setSelectedGestion(g)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer border ${selectedGestion === g
                  ? 'bg-[#c9a751] text-[#0f172a] border-[#c9a751] font-black shadow-xs'
                  : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-[#faf5e8] dark:hover:bg-slate-700'
                  }`}
              >
                {g}
              </button>
            ))}
          </div>

          {/* Conmutador Tabla / Gráficos + Buscador + Exportación */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Switch Tabla Dinámica / Gráficos */}
            <div className="inline-flex p-1 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
              <button
                type="button"
                onClick={() => setViewMode('tabla')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${viewMode === 'tabla'
                  ? 'bg-[#0f2942] text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-300 hover:text-slate-900'
                  }`}
              >
                <Table2 className="w-3.5 h-3.5 text-[#c9a751]" />
                Tabla Dinámica
              </button>
              <button
                type="button"
                onClick={() => setViewMode('graficos')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${viewMode === 'graficos'
                  ? 'bg-[#c9a751] text-[#0f172a] font-black shadow-xs'
                  : 'text-slate-600 dark:text-slate-300 hover:text-slate-900'
                  }`}
              >
                <BarChart3 className="w-3.5 h-3.5" />
                Gráficos
              </button>
            </div>

            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Buscar Depto, ESFM o Especialidad..."
                className="pl-9 pr-3 py-1.5 w-60 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-semibold text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-[#c9a751]/50"
              />
            </div>

            {viewMode === 'tabla' && (
              <button
                type="button"
                onClick={expandedDeptos.size > 0 ? collapseAll : expandAll}
                className="px-3 py-1.5 rounded-xl text-xs font-bold border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-[#faf5e8] dark:hover:bg-slate-700 transition-colors cursor-pointer flex items-center gap-1.5"
              >
                <Layers className="w-3.5 h-3.5 text-[#0f2942] dark:text-[#c9a751]" />
                {expandedDeptos.size > 0 ? 'Colapsar todo' : 'Expandir todo'}
              </button>
            )}

            <button
              type="button"
              onClick={handleExportCsv}
              className="px-3 py-1.5 rounded-xl text-xs font-bold border border-[#c9a751]/60 bg-[#faf5e8] dark:bg-slate-800 text-[#937527] dark:text-[#c9a751] hover:bg-[#f3e7c6] dark:hover:bg-slate-700 transition-colors cursor-pointer flex items-center gap-1.5"
            >
              <Download className="w-3.5 h-3.5" />
              Exportar CSV
            </button>
          </div>
        </div>

        {/* Filtro por Año que Cursa (Anio_Que_Cursa) */}
        <div className="flex flex-wrap items-center gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
          <span className="text-[11px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5 mr-1">
            <GraduationCap className="w-3.5 h-3.5 text-[#0f2942] dark:text-[#c9a751]" />
            Año que Cursa:
          </span>
          <button
            type="button"
            onClick={() => setSelectedAnio('TODOS')}
            className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer border ${selectedAnio === 'TODOS'
              ? 'bg-[#0f2942] text-white border-[#0f2942] shadow-2xs'
              : 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-[#faf5e8]'
              }`}
          >
            Todos (1º a 5º)
          </button>
          {dataset.anios.map((a) => (
            <button
              key={a}
              type="button"
              onClick={() => setSelectedAnio(a)}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer border ${selectedAnio === a
                ? 'bg-[#c9a751] text-[#0f172a] border-[#c9a751] font-black shadow-2xs'
                : 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-[#faf5e8]'
                }`}
            >
              {a}º Año
            </button>
          ))}
        </div>

        {/* Filtro Creativo por Nivel y Especialidad (Inicial · Primaria · Secundaria · Técnica · Especial) */}
        <div className="pt-3 border-t border-slate-100 dark:border-slate-800 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[11px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5 mr-1">
                <BookOpen className="w-3.5 h-3.5 text-[#0f2942] dark:text-[#c9a751]" />
                Nivel / Área:
              </span>
              <button
                type="button"
                onClick={() => setSelectedNivel('TODOS')}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer border ${selectedNivel === 'TODOS'
                  ? 'bg-[#0f2942] text-white border-[#0f2942] shadow-2xs'
                  : 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-[#faf5e8]'
                  }`}
              >
                Todas (22)
              </button>
              {NIVEL_ORDER.map((niv) => {
                const meta = NIVEL_META[niv];
                const count = especialidadesByNivel.groups[niv].length;
                const isActive = selectedNivel === niv;
                return (
                  <button
                    key={niv}
                    type="button"
                    onClick={() => setSelectedNivel(isActive ? 'TODOS' : niv)}
                    className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer border inline-flex items-center gap-1.5 ${isActive
                      ? meta.pillActive
                      : 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-[#faf5e8]'
                      }`}
                  >
                    <span className={`w-2 h-2 rounded-full ${isActive ? 'bg-white' : meta.dot}`} />
                    <span>{meta.shortLabel}</span>
                    <span className="opacity-75 text-[10px]">({count})</span>
                  </button>
                );
              })}
            </div>

            <div className="flex items-center gap-2">
              {(selectedNivel !== 'TODOS' || selectedEspecialidades.size > 0) && (
                <button
                  type="button"
                  onClick={clearEspecialidadFilters}
                  className="px-2.5 py-1 rounded-lg text-[11px] font-bold text-rose-700 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 hover:bg-rose-100 transition-colors cursor-pointer inline-flex items-center gap-1"
                >
                  <X className="w-3 h-3" />
                  Limpiar
                </button>
              )}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => {
                    setPopoverTab(selectedNivel);
                    setShowEspPanel((v) => !v);
                  }}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer border inline-flex items-center gap-1.5 ${showEspPanel || selectedEspecialidades.size > 0
                    ? 'bg-[#c9a751] text-[#0f172a] border-[#c9a751] font-black shadow-2xs'
                    : 'bg-[#faf5e8] dark:bg-slate-800 text-[#937527] dark:text-[#c9a751] border-[#e5d4a4] dark:border-[#c9a751]/40 hover:bg-[#f3e7c6]'
                    }`}
                >
                  <Filter className="w-3.5 h-3.5" />
                  <span>
                    {selectedEspecialidades.size > 0
                      ? `${selectedEspecialidades.size} Especialidad${selectedEspecialidades.size > 1 ? 'es' : ''} sel.`
                      : 'Explorar Especialidades'}
                  </span>
                  {showEspPanel ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                </button>

                {/* Modal Diálogo Centrado para Explorar Especialidades (Montado en Portal a document.body) */}
                {showEspPanel && mounted && createPortal(
                  <div className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-5 bg-slate-950/70 backdrop-blur-xs">
                    <div
                      className="absolute inset-0"
                      onClick={() => setShowEspPanel(false)}
                    />
                    <div
                      style={{
                        width: 'min(92vw, 750px)',
                        height: '60vh',
                        maxHeight: '60vh',
                      }}
                      className="relative z-10 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl flex flex-col overflow-hidden"
                    >
                      {/* Header + Buscador interno (Fijo al tope) */}
                      <div className="px-5 py-3 bg-[#0f2942] text-white flex items-center justify-between gap-3 shrink-0">
                        <div className="flex items-center gap-2">
                          <BookOpen className="w-4 h-4 text-[#c9a751]" />
                          <h3 className="text-sm font-black tracking-tight">
                            Especialidades
                          </h3>
                        </div>
                        <div className="flex items-center gap-2.5">
                          <div className="relative w-48 sm:w-60">
                            <Search className="w-3.5 h-3.5 text-slate-300 absolute left-2.5 top-1/2 -translate-y-1/2" />
                            <input
                              type="text"
                              value={espQuickSearch}
                              onChange={(e) => setEspQuickSearch(e.target.value)}
                              placeholder="Buscar especialidad..."
                              autoFocus
                              className="w-full pl-8 pr-2.5 py-1.5 rounded-lg bg-white/10 text-xs text-white placeholder:text-slate-300 border border-white/20 focus:outline-none focus:ring-1 focus:ring-[#c9a751]"
                            />
                          </div>
                          {selectedEspecialidades.size > 0 && (
                            <button
                              type="button"
                              onClick={() => setSelectedEspecialidades(new Set())}
                              className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-[#c9a751] text-[#0f172a] hover:bg-[#d8b65e] cursor-pointer shrink-0 transition-colors shadow-xs"
                            >
                              Limpiar
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => setShowEspPanel(false)}
                            className="p-1.5 rounded-lg hover:bg-white/15 text-slate-200 hover:text-white cursor-pointer transition-colors"
                            title="Cerrar ventana"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      {/* Pestañas por Nivel (Fijo) */}
                      <div className="px-4 py-2 bg-slate-50 dark:bg-slate-950/80 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center gap-1.5 shrink-0">
                        <button
                          type="button"
                          onClick={() => setPopoverTab('TODOS')}
                          className={`px-3 py-1 rounded-lg text-xs font-bold cursor-pointer transition-all border ${popoverTab === 'TODOS'
                            ? 'bg-[#0f2942] text-white border-[#0f2942] shadow-xs'
                            : 'text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:border-[#c9a751]'
                            }`}
                        >
                          Todas (22)
                        </button>
                        {NIVEL_ORDER.map((niv) => {
                          const meta = NIVEL_META[niv];
                          const isTabActive = popoverTab === niv;
                          return (
                            <button
                              key={niv}
                              type="button"
                              onClick={() => setPopoverTab(niv)}
                              className={`px-2.5 py-1 rounded-lg text-xs font-bold cursor-pointer transition-all border inline-flex items-center gap-1.5 ${isTabActive
                                ? meta.pillActive + ' shadow-xs'
                                : 'text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:border-[#c9a751]'
                                }`}
                            >
                              <span className={`w-1.5 h-1.5 rounded-full ${isTabActive ? 'bg-white' : meta.dot}`} />
                              <span>{meta.shortLabel}</span>
                              <span className="opacity-75 text-[10px]">
                                ({especialidadesByNivel.groups[niv].length})
                              </span>
                            </button>
                          );
                        })}
                      </div>

                      {/* Contenedor central con scrollbar estricto (deslizador nativo y visible) */}
                      <div
                        style={{
                          flex: '1 1 0px',
                          minHeight: 0,
                          overflowY: 'auto',
                        }}
                        className="p-3.5 space-y-1.5 bg-slate-50/50 dark:bg-slate-900/40 custom-scrollbar"
                      >
                        {(popoverTab === 'TODOS' ? NIVEL_ORDER : [popoverTab]).flatMap((niv) => {
                          const meta = NIVEL_META[niv];
                          const q = espQuickSearch.trim().toUpperCase();
                          return especialidadesByNivel.groups[niv]
                            .filter((item) => !q || item.especialidad.includes(q))
                            .map((item) => {
                              const isSelected = selectedEspecialidades.has(item.especialidad);
                              return (
                                <button
                                  key={item.especialidad}
                                  type="button"
                                  onClick={() => toggleEspecialidad(item.especialidad)}
                                  className={`w-full text-left px-3 py-2 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-3 shadow-2xs ${isSelected
                                    ? meta.chipActive
                                    : 'bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 border-slate-200 dark:border-slate-700 hover:border-[#c9a751] hover:bg-[#faf5e8]'
                                    }`}
                                >
                                  <div className="flex items-center gap-2.5 min-w-0">
                                    <span
                                      className={`w-2 h-2 rounded-full shrink-0 ${isSelected ? 'bg-white' : meta.dot
                                        }`}
                                    />
                                    <span className="text-xs font-bold leading-normal truncate" title={item.especialidad}>
                                      {item.especialidad}
                                    </span>
                                    <span
                                      className={`text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded border shrink-0 ${isSelected
                                        ? 'border-white/40 text-white'
                                        : meta.badge
                                        }`}
                                    >
                                      {meta.shortLabel}
                                    </span>
                                  </div>
                                  <span
                                    className={`text-xs font-black tabular-nums shrink-0 ml-2 ${isSelected ? 'text-white' : 'text-[#0f2942] dark:text-[#c9a751]'
                                      }`}
                                  >
                                    {fmt(item.total)}{' '}
                                    <span
                                      className={`text-[10px] font-medium ${isSelected ? 'text-white/80' : 'text-slate-400'
                                        }`}
                                    >
                                      est.
                                    </span>
                                  </span>
                                </button>
                              );
                            });
                        })}
                      </div>

                      {/* Footer Modal fijo al pie */}
                      <div className="px-5 py-2.5 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between shrink-0">
                        <span className="text-xs text-slate-500 font-semibold truncate mr-2">
                          {selectedEspecialidades.size > 0
                            ? `${selectedEspecialidades.size} especialidad(es) seleccionada(s)`
                            : 'Mostrando todas las especialidades'}
                        </span>
                        <button
                          type="button"
                          onClick={() => setShowEspPanel(false)}
                          className="px-5 py-1.5 rounded-lg text-xs font-black bg-[#0f2942] text-white hover:bg-[#1b3d5e] cursor-pointer shadow-xs transition-colors shrink-0"
                        >
                          Aplicar
                        </button>
                      </div>
                    </div>
                  </div>,
                  document.body
                )}
              </div>
            </div>
          </div>

          {/* Chips rápidos de especialidades seleccionadas */}
          {selectedEspecialidades.size > 0 && (
            <div className="flex flex-wrap items-center gap-1.5">
              {Array.from(selectedEspecialidades).map((esp) => {
                const meta = NIVEL_META[getNivelEspecialidad(esp)];
                return (
                  <button
                    key={esp}
                    type="button"
                    onClick={() => toggleEspecialidad(esp)}
                    className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold border inline-flex items-center gap-1.5 cursor-pointer ${meta.badge}`}
                  >
                    <span>{esp}</span>
                    <X className="w-3 h-3" />
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* KPIs Resumen Dinámicos (Dorado & Azul Marino Institucional) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-[#e5d4a4]/80 dark:border-slate-800 shadow-xs flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-[#faf5e8] dark:bg-slate-800 border border-[#e5d4a4] dark:border-[#c9a751]/40 flex items-center justify-center text-[#c9a751] shrink-0">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">
              Participantes ({selectedGestion === 'TODAS' ? '2022–2026' : selectedGestion})
            </span>
            <span className="text-2xl font-black text-[#0f2942] dark:text-white">
              {fmt(nationalTotals.total)}
            </span>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200 dark:border-slate-800 shadow-xs flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-[#0f2942]/10 dark:bg-slate-800 border border-[#0f2942]/20 dark:border-slate-700 flex items-center justify-center text-[#0f2942] dark:text-[#c9a751] shrink-0">
            <Building2 className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">
              ESFM / UA Habilitadas
            </span>
            <span className="text-2xl font-black text-[#0f2942] dark:text-white">
              {totalEsfms}
            </span>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200 dark:border-slate-800 shadow-xs flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 flex items-center justify-center text-emerald-700 dark:text-emerald-400 shrink-0">
            <BookOpen className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">
              Especialidades Activas
            </span>
            <span className="text-2xl font-black text-[#0f2942] dark:text-white">
              {totalEspecialidades}
            </span>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200 dark:border-slate-800 shadow-xs flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-[#faf5e8] dark:bg-slate-800 border border-[#e5d4a4] dark:border-[#c9a751]/40 flex items-center justify-center text-[#937527] dark:text-[#c9a751] shrink-0">
            <GraduationCap className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">
              1º Año vs 5º Año
            </span>
            <span className="text-lg font-black text-[#0f2942] dark:text-white">
              {fmt(nationalTotals[1])} <span className="text-xs font-bold text-[#c9a751]">vs</span>{' '}
              {fmt(nationalTotals[5])}
            </span>
          </div>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════
          MODO 1: TABLA DINÁMICA JERÁRQUICA
         ═══════════════════════════════════════════════════════════════════ */}
      {viewMode === 'tabla' && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
          <div className="px-5 py-3.5 border-b border-[#e5d4a4]/60 dark:border-slate-800 flex flex-col xl:flex-row xl:items-center justify-between gap-3 bg-[#faf5e8]/60 dark:bg-slate-950/40">
            <div>
              <h2 className="text-sm font-black text-[#0f2942] dark:text-white flex items-center gap-2">
                <MapPin className="w-4 h-4 text-[#c9a751]" />
                Desglose Dinámico: Departamento → ESFM / UA → Especialidad por Año que Cursa
              </h2>
              <p className="text-[11px] text-slate-600 dark:text-slate-400 font-medium">
                Haz clic en un <strong>Departamento</strong> para ver sus ESFMs habilitadas, y clic en una{' '}
                <strong>ESFM</strong> para desagregar por Especialidad y Año (1º a 5º).
              </p>
            </div>

            {/* Controles de Jerarquía: Leyenda de Colores + Ordenador de Especialidades */}
            <div className="flex flex-wrap items-center gap-2 shrink-0">
              {/* Leyenda de Niveles */}
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-[10px] font-bold">
                <span className="text-slate-400 font-medium">Nivel:</span>
                <span className="inline-flex items-center gap-1 text-[#0f2942] dark:text-white">
                  <span className="w-2 h-2 rounded-full bg-[#0f2942]" /> Depto
                </span>
                <span className="text-slate-300">|</span>
                <span className="inline-flex items-center gap-1 text-[#937527] dark:text-[#c9a751]">
                  <span className="w-2 h-2 rounded-full bg-[#c9a751]" /> ESFM
                </span>
                <span className="text-slate-300">|</span>
                <span className="inline-flex items-center gap-1 text-slate-600 dark:text-slate-300">
                  <span className="w-2 h-2 rounded-full bg-blue-500" /> Especialidad
                </span>
              </div>

              {/* Selector de Orden de Especialidades */}
              <div className="inline-flex items-center gap-1 bg-white dark:bg-slate-800 p-0.5 rounded-lg border border-slate-200 dark:border-slate-700 text-[11px]">
                <span className="text-slate-400 font-bold px-1.5 text-[10px]">Ordenar Esp:</span>
                <button
                  type="button"
                  onClick={() => setEspSortMode('nivel')}
                  title="Agrupar por Nivel (Inicial, Primaria, Secundaria, Técnica, Especial) y luego alfabético"
                  className={`px-2 py-0.5 rounded text-[10px] font-bold transition-all cursor-pointer ${espSortMode === 'nivel'
                    ? 'bg-[#0f2942] text-white shadow-2xs'
                    : 'text-slate-600 dark:text-slate-300 hover:text-slate-900'
                    }`}
                >
                  Por Nivel
                </button>
                <button
                  type="button"
                  onClick={() => setEspSortMode('matricula')}
                  title="Ordenar por mayor cantidad de estudiantes matriculados"
                  className={`px-2 py-0.5 rounded text-[10px] font-bold transition-all cursor-pointer ${espSortMode === 'matricula'
                    ? 'bg-[#c9a751] text-[#0f172a] font-black shadow-2xs'
                    : 'text-slate-600 dark:text-slate-300 hover:text-slate-900'
                    }`}
                >
                  Mayor Matrícula
                </button>
                <button
                  type="button"
                  onClick={() => setEspSortMode('alfabetico')}
                  title="Ordenar alfabéticamente A-Z todas las especialidades"
                  className={`px-2 py-0.5 rounded text-[10px] font-bold transition-all cursor-pointer ${espSortMode === 'alfabetico'
                    ? 'bg-[#0f2942] text-white shadow-2xs'
                    : 'text-slate-600 dark:text-slate-300 hover:text-slate-900'
                    }`}
                >
                  A-Z
                </button>
              </div>

              <span className="text-[11px] font-black bg-[#0f2942] text-[#c9a751] px-2.5 py-1 rounded-lg border border-[#c9a751]/40">
                {deptosTree.length} Departamentos
              </span>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[#0f172a] text-white text-[11px] uppercase tracking-wider border-b-2 border-[#c9a751]">
                  <th className="py-3 px-4 font-black">Departamento / ESFM / Especialidad</th>
                  <th className="py-3 px-3 font-black text-center">Desglose</th>
                  {visibleAnios.map((a) => (
                    <th key={a} className="py-3 px-3 font-black text-right">
                      {a}º Año
                    </th>
                  ))}
                  <th className="py-3 px-4 font-black text-right bg-[#0f2942] text-[#c9a751]">Total</th>
                  <th className="py-3 px-4 font-black text-right">% Part.</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
                {deptosTree.length === 0 ? (
                  <tr>
                    <td
                      colSpan={visibleAnios.length + 4}
                      className="py-12 text-center text-slate-500 dark:text-slate-400 font-semibold"
                    >
                      No se encontraron registros para los filtros seleccionados.
                    </td>
                  </tr>
                ) : (
                  deptosTree.map((depto) => {
                    const isDeptoOpen = expandedDeptos.has(depto.departamento);
                    const pctNac =
                      nationalTotals.total > 0
                        ? (depto.anios.total / nationalTotals.total) * 100
                        : 0;

                    return (
                      <React.Fragment key={depto.departamento}>
                        {/* NIVEL 1: DEPARTAMENTO (Azul Marino Institucional) */}
                        <tr
                          onClick={() => toggleDepto(depto.departamento)}
                          className="bg-slate-100/95 dark:bg-slate-800/90 hover:bg-slate-200/90 dark:hover:bg-slate-800 transition-colors cursor-pointer font-bold border-l-[6px] border-l-[#0f2942] border-t-2 border-slate-300 dark:border-slate-700"
                        >
                          <td className="py-3 px-4 text-[#0f2942] dark:text-white">
                            <div className="flex items-center gap-2.5">
                              {isDeptoOpen ? (
                                <ChevronDown className="w-4 h-4 text-[#0f2942] dark:text-[#c9a751] shrink-0" />
                              ) : (
                                <ChevronRight className="w-4 h-4 text-slate-400 shrink-0" />
                              )}
                              <span className="px-1.5 py-0.5 rounded text-[9px] font-black uppercase tracking-wider bg-[#0f2942] text-white shrink-0 shadow-2xs">
                                DEPARTAMENTO
                              </span>
                              <span className="text-xs font-black uppercase tracking-wide">{depto.departamento}</span>
                            </div>
                          </td>
                          <td className="py-3 px-3 text-center">
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-black bg-white dark:bg-slate-900 text-[#0f2942] dark:text-[#c9a751] border border-slate-300 dark:border-slate-700 shadow-2xs">
                              {depto.esfms.length} ESFM · {depto.especialidadesCount} Esp.
                            </span>
                          </td>
                          {visibleAnios.map((a) => (
                            <td
                              key={a}
                              className="py-3 px-3 text-right tabular-nums font-bold text-slate-800 dark:text-slate-200"
                            >
                              {fmt(depto.anios[a])}
                            </td>
                          ))}
                          <td className="py-3 px-4 text-right tabular-nums font-black text-[#0f2942] dark:text-white bg-slate-200 dark:bg-slate-700">
                            {fmt(depto.anios.total)}
                          </td>
                          <td className="py-3 px-4 text-right tabular-nums">
                            <div className="flex items-center justify-end gap-2">
                              <div className="w-14 h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden hidden sm:block">
                                <div
                                  className="h-full bg-[#0f2942] dark:bg-[#c9a751] rounded-full"
                                  style={{ width: `${Math.min(pctNac, 100)}%` }}
                                />
                              </div>
                              <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300">
                                {pctNac.toFixed(1)}%
                              </span>
                            </div>
                          </td>
                        </tr>

                        {/* NIVEL 2: ESFM / UA DEL DEPARTAMENTO (Dorado Institucional) */}
                        {isDeptoOpen &&
                          depto.esfms.map((esfm) => {
                            const esfmKey = `${depto.departamento}::${esfm.esfm}`;
                            const isEsfmOpen = expandedEsfms.has(esfmKey);
                            const pctDepto =
                              depto.anios.total > 0
                                ? (esfm.anios.total / depto.anios.total) * 100
                                : 0;

                            return (
                              <React.Fragment key={esfmKey}>
                                <tr
                                  onClick={() => toggleEsfm(depto.departamento, esfm.esfm)}
                                  className="bg-[#faf5e8] dark:bg-amber-950/25 hover:bg-[#f3e7c6] dark:hover:bg-amber-950/40 transition-colors cursor-pointer border-l-[6px] border-l-[#c9a751] border-t border-[#e5d4a4]/60 dark:border-amber-900/30"
                                >
                                  <td className="py-2.5 pl-8 pr-4 font-bold text-[#0f172a] dark:text-[#faf5e8]">
                                    <div className="flex items-center gap-2">
                                      {isEsfmOpen ? (
                                        <ChevronDown className="w-3.5 h-3.5 text-[#c9a751] shrink-0" />
                                      ) : (
                                        <ChevronRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                      )}
                                      <span className="px-1.5 py-0.5 rounded text-[9px] font-black uppercase tracking-wider bg-[#c9a751] text-[#0f172a] border border-[#b8953f] shrink-0 shadow-2xs">
                                        ESFM / UA
                                      </span>
                                      <Building2 className="w-3.5 h-3.5 text-[#937527] dark:text-[#c9a751] shrink-0" />
                                      <span className="text-xs">{esfm.esfm}</span>
                                    </div>
                                  </td>
                                  <td className="py-2.5 px-3 text-center">
                                    <span className="inline-block px-2 py-0.5 rounded text-[10px] font-black bg-white dark:bg-slate-800 text-[#937527] dark:text-[#c9a751] border border-[#e5d4a4] dark:border-amber-800 shadow-2xs">
                                      {esfm.especialidades.length} Especialidades
                                    </span>
                                  </td>
                                  {visibleAnios.map((a) => (
                                    <td
                                      key={a}
                                      className="py-2.5 px-3 text-right tabular-nums font-semibold text-[#0f2942] dark:text-slate-200"
                                    >
                                      {fmt(esfm.anios[a])}
                                    </td>
                                  ))}
                                  <td className="py-2.5 px-4 text-right tabular-nums font-black text-[#937527] dark:text-[#c9a751] bg-[#f3e7c6] dark:bg-amber-950/50">
                                    {fmt(esfm.anios.total)}
                                  </td>
                                  <td className="py-2.5 px-4 text-right tabular-nums text-[11px] font-bold text-[#937527] dark:text-[#c9a751]">
                                    {pctDepto.toFixed(1)}% dpto
                                  </td>
                                </tr>

                                {/* NIVEL 3: ESPECIALIDADES DE LA ESFM (Codificado por Nivel Pedagógico) */}
                                {isEsfmOpen &&
                                  esfm.especialidades.map((esp) => {
                                    const pctEsfm =
                                      esfm.anios.total > 0
                                        ? (esp.anios.total / esfm.anios.total) * 100
                                        : 0;
                                    const nivel = getNivelEspecialidad(esp.especialidad);
                                    const meta = NIVEL_META[nivel];
                                    return (
                                      <tr
                                        key={`${esfmKey}::${esp.especialidad}`}
                                        className="bg-white dark:bg-slate-900 hover:bg-[#faf5e8]/50 dark:hover:bg-slate-800/50 transition-colors border-l-[6px] border-l-slate-200 dark:border-slate-800 hover:border-l-[#c9a751]"
                                      >
                                        <td className="py-2 pl-14 pr-4 font-medium text-slate-700 dark:text-slate-300">
                                          <div className="flex items-center gap-2 flex-wrap">
                                            <span className="text-slate-300 dark:text-slate-600 font-mono text-xs select-none">└─</span>
                                            <span
                                              className={`w-2 h-2 rounded-full shrink-0 ${meta.dot}`}
                                            />
                                            <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                                              {esp.especialidad}
                                            </span>
                                            <span
                                              className={`px-1.5 py-0.5 rounded text-[9px] font-extrabold uppercase tracking-wide border shadow-2xs ${meta.badge}`}
                                            >
                                              {meta.shortLabel}
                                            </span>
                                          </div>
                                        </td>
                                        <td className="py-2 px-3 text-center">
                                          <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                                            Especialidad
                                          </span>
                                        </td>
                                        {visibleAnios.map((a) => (
                                          <td
                                            key={a}
                                            className="py-2 px-3 text-right tabular-nums text-slate-600 dark:text-slate-400"
                                          >
                                            {esp.anios[a] > 0 ? fmt(esp.anios[a]) : '—'}
                                          </td>
                                        ))}
                                        <td className="py-2 px-4 text-right tabular-nums font-bold text-slate-800 dark:text-slate-100 bg-slate-50/70 dark:bg-slate-800/30">
                                          {fmt(esp.anios.total)}
                                        </td>
                                        <td className="py-2 px-4 text-right tabular-nums text-[10px] font-semibold text-slate-500 dark:text-slate-400">
                                          {pctEsfm.toFixed(1)}%
                                        </td>
                                      </tr>
                                    );
                                  })}
                              </React.Fragment>
                            );
                          })}
                      </React.Fragment>
                    );
                  })
                )}

                {/* TOTAL NACIONAL */}
                {deptosTree.length > 0 && (
                  <tr className="bg-[#faf5e8] dark:bg-slate-800 border-t-2 border-[#c9a751] font-black text-[#0f2942] dark:text-white">
                    <td className="py-3.5 px-4 uppercase tracking-wide">
                      TOTAL NACIONAL
                    </td>
                    <td className="py-3.5 px-3 text-center text-[11px]">
                      {totalEsfms} ESFM · {totalEspecialidades} Esp.
                    </td>
                    {visibleAnios.map((a) => (
                      <td key={a} className="py-3.5 px-3 text-right tabular-nums">
                        {fmt(nationalTotals[a])}
                      </td>
                    ))}
                    <td className="py-3.5 px-4 text-right tabular-nums bg-[#0f2942] text-[#c9a751]">
                      {fmt(nationalTotals.total)}
                    </td>
                    <td className="py-3.5 px-4 text-right tabular-nums">100.0%</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════
          MODO 2: GRÁFICOS ANALÍTICOS INTERACTIVOS (4 VISUALIZACIONES)
         ═══════════════════════════════════════════════════════════════════ */}
      {viewMode === 'graficos' && (
        <div className="space-y-6">
          {/* Leyenda de Años + Breadcrumb de Drill-down */}
          <div className="bg-white dark:bg-slate-900 px-4 py-3 rounded-2xl border border-[#e5d4a4]/80 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-3 text-xs font-bold">
              <span className="text-[11px] font-black uppercase tracking-wider text-slate-400">
                Cohorte por Año:
              </span>
              {visibleAnios.map((a) => (
                <span key={a} className="inline-flex items-center gap-1.5 text-slate-700 dark:text-slate-300">
                  <span className={`w-3 h-3 rounded-xs ${ANIO_COLORS[a].bg}`} />
                  {ANIO_COLORS[a].label}
                </span>
              ))}
            </div>

            {(chartDepto || chartEsfm) && (
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <span className="text-slate-400 font-semibold">Filtro gráfico activo:</span>
                {chartDepto && (
                  <button
                    type="button"
                    onClick={() => {
                      setChartDepto(null);
                      setChartEsfm(null);
                    }}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#0f2942] text-[#c9a751] font-bold cursor-pointer"
                  >
                    {chartDepto}
                    <X className="w-3 h-3" />
                  </button>
                )}
                {chartEsfm && (
                  <button
                    type="button"
                    onClick={() => setChartEsfm(null)}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#c9a751] text-[#0f172a] font-bold cursor-pointer"
                  >
                    {chartEsfm}
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Gráfico 1: Barras Apiladas por Departamento */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-black text-[#0f2942] dark:text-white flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-[#c9a751]" />
                    1. Participantes por Departamento (1º a 5º Año)
                  </h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Clic en un departamento para filtrar ESFMs y Especialidades.
                  </p>
                </div>
              </div>

              <div className="space-y-2.5">
                {deptosTree.map((d) => {
                  const isSel = chartDepto === d.departamento;
                  return (
                    <button
                      key={d.departamento}
                      type="button"
                      onClick={() => {
                        setChartDepto(isSel ? null : d.departamento);
                        setChartEsfm(null);
                      }}
                      className={`w-full text-left p-2 rounded-xl transition-all cursor-pointer border ${isSel
                        ? 'bg-[#faf5e8] dark:bg-slate-800 border-[#c9a751] ring-1 ring-[#c9a751]'
                        : 'border-transparent hover:bg-slate-50 dark:hover:bg-slate-800/50'
                        }`}
                    >
                      <div className="flex items-center justify-between text-xs mb-1">
                        <span className="font-bold text-[#0f2942] dark:text-white">
                          {d.departamento}{' '}
                          <span className="text-[10px] font-semibold text-slate-400">
                            ({d.esfms.length} ESFM)
                          </span>
                        </span>
                        <span className="font-black tabular-nums text-[#0f2942] dark:text-[#c9a751]">
                          {fmt(d.anios.total)}
                        </span>
                      </div>
                      <StackedAnioBar
                        anios={d.anios}
                        maxTotal={maxDeptoTotal}
                        visibleAnios={visibleAnios}
                        fmt={fmt}
                      />
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Gráfico 2: Tendencia Histórica por Gestión (2022–2026) */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-xs space-y-4 flex flex-col justify-between">
              <div>
                <h3 className="text-sm font-black text-[#0f2942] dark:text-white flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-[#c9a751]" />
                  2. Evolución Histórica por Gestión (2022–2026)
                </h3>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  {chartDepto ? `Filtrado por ${chartDepto}` : 'Consolidado Nacional'}
                  {chartEsfm ? ` · ${chartEsfm}` : ''}
                </p>
              </div>

              <div className="h-64 flex items-end justify-around gap-3 pt-6 pb-2 px-2 border-b border-slate-100 dark:border-slate-800">
                {chartAnalytics.trendByGestion.map((item) => {
                  const hPct = Math.max((item.total / maxTrendTotal) * 100, 4);
                  const isCurrent = selectedGestion === item.gestion || item.gestion === 2026;
                  return (
                    <button
                      key={item.gestion}
                      type="button"
                      onClick={() => setSelectedGestion(item.gestion)}
                      className="flex-1 flex flex-col items-center gap-1.5 group cursor-pointer h-full justify-end"
                    >
                      <span className="text-[10px] font-black tabular-nums text-[#0f2942] dark:text-white">
                        {fmt(item.total)}
                      </span>
                      {item.diffPct !== null && (
                        <span
                          className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${item.diffPct >= 0
                            ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300'
                            : 'bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300'
                            }`}
                        >
                          {item.diffPct >= 0 ? '+' : ''}
                          {item.diffPct.toFixed(1)}%
                        </span>
                      )}
                      <div className="w-full max-w-[54px] flex-1 flex items-end">
                        <div
                          style={{ height: `${hPct}%` }}
                          className={`w-full rounded-t-xl transition-all ${isCurrent
                            ? 'bg-[#c9a751] shadow-md'
                            : 'bg-[#0f2942] group-hover:bg-[#c9a751]'
                            }`}
                        />
                      </div>
                      <span
                        className={`text-xs font-black ${selectedGestion === item.gestion
                          ? 'text-[#c9a751]'
                          : 'text-slate-600 dark:text-slate-300'
                          }`}
                      >
                        {item.gestion}
                      </span>
                    </button>
                  );
                })}
              </div>

              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Haz clic en cualquier barra de gestión para actualizar los filtros de ESFMs y Especialidades.
              </p>
            </div>

            {/* Gráfico 3: ESFM / UA Habilitadas */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-xs space-y-4">
              <div>
                <h3 className="text-sm font-black text-[#0f2942] dark:text-white flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-[#c9a751]" />
                  3. ESFM / UA Habilitadas {chartDepto ? `en ${chartDepto}` : '(Top 14 Nacional)'}
                </h3>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Clic en una ESFM para visualizar el desglose de sus especialidades.
                </p>
              </div>

              <div className="space-y-2 max-h-[420px] overflow-y-auto pr-1 custom-scrollbar">
                {chartAnalytics.esfmChartList.map((e) => {
                  const isSel = chartEsfm === e.esfm;
                  return (
                    <button
                      key={`${e.depto}::${e.esfm}`}
                      type="button"
                      onClick={() => setChartEsfm(isSel ? null : e.esfm)}
                      className={`w-full text-left p-2 rounded-xl transition-all cursor-pointer border ${isSel
                        ? 'bg-[#faf5e8] dark:bg-slate-800 border-[#c9a751] ring-1 ring-[#c9a751]'
                        : 'border-transparent hover:bg-slate-50 dark:hover:bg-slate-800/50'
                        }`}
                    >
                      <div className="flex items-center justify-between text-[11px] mb-1 gap-2">
                        <span className="font-bold text-[#0f2942] dark:text-white truncate">
                          {e.esfm}{' '}
                          {!chartDepto && (
                            <span className="text-[10px] font-medium text-slate-400">
                              ({e.depto})
                            </span>
                          )}
                        </span>
                        <span className="font-black tabular-nums text-[#0f2942] dark:text-[#c9a751] shrink-0">
                          {fmt(e.anios.total)}
                        </span>
                      </div>
                      <StackedAnioBar
                        anios={e.anios}
                        maxTotal={maxEsfmTotal}
                        visibleAnios={visibleAnios}
                        fmt={fmt}
                      />
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Gráfico 4: Especialidades por Año que Cursa */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-xs space-y-4">
              <div>
                <h3 className="text-sm font-black text-[#0f2942] dark:text-white flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-[#c9a751]" />
                  4. Distribución por Especialidad ({chartAnalytics.espChartList.length})
                </h3>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  {chartEsfm
                    ? `Especialidades en ${chartEsfm}`
                    : chartDepto
                      ? `Especialidades en ${chartDepto}`
                      : 'Consolidado Nacional por Especialidad'}
                </p>
              </div>

              <div className="space-y-2 max-h-[420px] overflow-y-auto pr-1 custom-scrollbar">
                {chartAnalytics.espChartList.map((s) => (
                  <div
                    key={s.especialidad}
                    className="p-2 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                  >
                    <div className="flex items-center justify-between text-[11px] mb-1 gap-2">
                      <span className="font-bold text-slate-800 dark:text-slate-200 truncate">
                        {s.especialidad}
                      </span>
                      <span className="font-black tabular-nums text-[#0f2942] dark:text-[#c9a751] shrink-0">
                        {fmt(s.anios.total)}
                      </span>
                    </div>
                    <StackedAnioBar
                      anios={s.anios}
                      maxTotal={maxEspTotal}
                      visibleAnios={visibleAnios}
                      fmt={fmt}
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
