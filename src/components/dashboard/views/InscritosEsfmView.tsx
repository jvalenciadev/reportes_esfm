'use client';

import React, { useEffect, useMemo, useState } from 'react';
import {
  Building2,
  ChevronDown,
  ChevronRight,
  Download,
  Filter,
  GraduationCap,
  Layers,
  MapPin,
  Search,
  Users,
  BookOpen,
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

function emptyAnios(): AnioCounts {
  return { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, total: 0 };
}

function addAnioCount(target: AnioCounts, anio: number, qty: number): void {
  if (anio >= 1 && anio <= 5) {
    target[anio as 1 | 2 | 3 | 4 | 5] += qty;
  }
  target.total += qty;
}

export default function InscritosEsfmView() {
  const [dataset, setDataset] = useState<InscritosDataset | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Filtros: por defecto gestión 2026 y todos los años (1° a 5°)
  const [selectedGestion, setSelectedGestion] = useState<number | 'TODAS'>(2026);
  const [selectedAnio, setSelectedAnio] = useState<number | 'TODOS'>('TODOS');
  const [searchTerm, setSearchTerm] = useState<string>('');

  // Drill-down dinámico
  const [expandedDeptos, setExpandedDeptos] = useState<Set<string>>(new Set());
  const [expandedEsfms, setExpandedEsfms] = useState<Set<string>>(new Set());

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
              .sort((a, b) => b.anios.total - a.anios.total);

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
  }, [dataset, selectedGestion, selectedAnio, searchTerm]);

  const toggleDepto = (depto: string) => {
    setExpandedDeptos((prev) => {
      const next = new Set(prev);
      if (next.has(depto)) {
        next.delete(depto);
      } else {
        next.add(depto);
      }
      return next;
    });
  };

  const toggleEsfm = (depto: string, esfm: string) => {
    const key = `${depto}::${esfm}`;
    setExpandedEsfms((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
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
        <div className="w-10 h-10 border-4 border-amber-500 border-t-transparent rounded-full animate-spin" />
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

  return (
    <div className="space-y-6 animate-in fade-in duration-300 pb-12">
      {/* Barra de Filtros Dinámicos */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4">
          {/* Filtro por Gestión */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[11px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5 mr-1">
              <Filter className="w-3.5 h-3.5 text-amber-600" />
              Gestión:
            </span>
            <button
              type="button"
              onClick={() => setSelectedGestion('TODAS')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer border ${
                selectedGestion === 'TODAS'
                  ? 'bg-slate-900 dark:bg-amber-600 text-white border-slate-900 dark:border-amber-600 shadow-xs'
                  : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700'
              }`}
            >
              Todas (2022–2026)
            </button>
            {dataset.gestiones.map((g) => (
              <button
                key={g}
                type="button"
                onClick={() => setSelectedGestion(g)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer border ${
                  selectedGestion === g
                    ? 'bg-amber-600 text-white border-amber-600 shadow-xs'
                    : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700'
                }`}
              >
                {g}
              </button>
            ))}
          </div>

          {/* Buscador + Exportación */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Buscar Depto, ESFM o Especialidad..."
                className="pl-9 pr-3 py-1.5 w-64 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-semibold text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-500/40"
              />
            </div>

            <button
              type="button"
              onClick={expandedDeptos.size > 0 ? collapseAll : expandAll}
              className="px-3 py-1.5 rounded-xl text-xs font-bold border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors cursor-pointer flex items-center gap-1.5"
            >
              <Layers className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
              {expandedDeptos.size > 0 ? 'Colapsar todo' : 'Expandir todo'}
            </button>

            <button
              type="button"
              onClick={handleExportCsv}
              className="px-3 py-1.5 rounded-xl text-xs font-bold border border-emerald-300 dark:border-emerald-700 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 transition-colors cursor-pointer flex items-center gap-1.5"
            >
              <Download className="w-3.5 h-3.5" />
              Exportar CSV
            </button>
          </div>
        </div>

        {/* Filtro por Año que Cursa (Anio_Que_Cursa) */}
        <div className="flex flex-wrap items-center gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
          <span className="text-[11px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5 mr-1">
            <GraduationCap className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
            Año que Cursa:
          </span>
          <button
            type="button"
            onClick={() => setSelectedAnio('TODOS')}
            className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer border ${
              selectedAnio === 'TODOS'
                ? 'bg-indigo-600 text-white border-indigo-600 shadow-2xs'
                : 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100'
            }`}
          >
            Todos (1º a 5º)
          </button>
          {dataset.anios.map((a) => (
            <button
              key={a}
              type="button"
              onClick={() => setSelectedAnio(a)}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer border ${
                selectedAnio === a
                  ? 'bg-indigo-600 text-white border-indigo-600 shadow-2xs'
                  : 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100'
              }`}
            >
              {a}º Año
            </button>
          ))}
        </div>
      </div>

      {/* KPIs Resumen Dinámicos */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200 dark:border-slate-800 shadow-xs flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800 flex items-center justify-center text-amber-600 dark:text-amber-400 shrink-0">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">
              Participantes ({selectedGestion === 'TODAS' ? '2022–2026' : selectedGestion})
            </span>
            <span className="text-2xl font-black text-slate-900 dark:text-white">
              {fmt(nationalTotals.total)}
            </span>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200 dark:border-slate-800 shadow-xs flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 flex items-center justify-center text-indigo-600 dark:text-indigo-400 shrink-0">
            <Building2 className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">
              ESFM / UA Habilitadas
            </span>
            <span className="text-2xl font-black text-slate-900 dark:text-white">
              {totalEsfms}
            </span>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200 dark:border-slate-800 shadow-xs flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shrink-0">
            <BookOpen className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">
              Especialidades Activas
            </span>
            <span className="text-2xl font-black text-slate-900 dark:text-white">
              {totalEspecialidades}
            </span>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200 dark:border-slate-800 shadow-xs flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-purple-50 dark:bg-purple-950/60 border border-purple-200 dark:border-purple-800 flex items-center justify-center text-purple-600 dark:text-purple-400 shrink-0">
            <GraduationCap className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">
              1º Año vs 5º Año
            </span>
            <span className="text-lg font-black text-slate-900 dark:text-white">
              {fmt(nationalTotals[1])} <span className="text-xs font-bold text-slate-400">vs</span>{' '}
              {fmt(nationalTotals[5])}
            </span>
          </div>
        </div>
      </div>

      {/* Tabla Dinámica Jerárquica (Departamento -> ESFM -> Especialidad x Año que Cursa) */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
        <div className="px-5 py-3.5 border-b border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-slate-50/70 dark:bg-slate-950/40">
          <div>
            <h2 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-2">
              <MapPin className="w-4 h-4 text-amber-600" />
              Desglose Dinámico: Departamento → ESFM / UA → Especialidad por Año que Cursa
            </h2>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
              Haz clic en un <strong>Departamento</strong> para ver sus ESFMs habilitadas, y clic en una{' '}
              <strong>ESFM</strong> para desagregar por Especialidad y Año (1º a 5º).
            </p>
          </div>
          <span className="text-[11px] font-bold bg-amber-100/80 dark:bg-amber-950/60 text-amber-900 dark:text-amber-300 px-2.5 py-1 rounded-lg border border-amber-200 dark:border-amber-800">
            {deptosTree.length} Departamentos
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-900 text-white text-[11px] uppercase tracking-wider">
                <th className="py-3 px-4 font-black">Departamento / ESFM / Especialidad</th>
                <th className="py-3 px-3 font-black text-center">Desglose</th>
                {visibleAnios.map((a) => (
                  <th key={a} className="py-3 px-3 font-black text-right">
                    {a}º Año
                  </th>
                ))}
                <th className="py-3 px-4 font-black text-right bg-slate-800">Total</th>
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
                      {/* NIVEL 1: DEPARTAMENTO */}
                      <tr
                        onClick={() => toggleDepto(depto.departamento)}
                        className="bg-white dark:bg-slate-900 hover:bg-amber-50/60 dark:hover:bg-slate-800/70 transition-colors cursor-pointer font-bold"
                      >
                        <td className="py-3 px-4 text-slate-900 dark:text-white">
                          <div className="flex items-center gap-2">
                            {isDeptoOpen ? (
                              <ChevronDown className="w-4 h-4 text-amber-600 shrink-0" />
                            ) : (
                              <ChevronRight className="w-4 h-4 text-slate-400 shrink-0" />
                            )}
                            <span>{depto.departamento}</span>
                          </div>
                        </td>
                        <td className="py-3 px-3 text-center">
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-extrabold bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                            {depto.esfms.length} ESFM · {depto.especialidadesCount} Esp.
                          </span>
                        </td>
                        {visibleAnios.map((a) => (
                          <td
                            key={a}
                            className="py-3 px-3 text-right tabular-nums text-slate-700 dark:text-slate-300"
                          >
                            {fmt(depto.anios[a])}
                          </td>
                        ))}
                        <td className="py-3 px-4 text-right tabular-nums font-black text-slate-900 dark:text-white bg-slate-50/80 dark:bg-slate-800/40">
                          {fmt(depto.anios.total)}
                        </td>
                        <td className="py-3 px-4 text-right tabular-nums">
                          <div className="flex items-center justify-end gap-2">
                            <div className="w-14 h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden hidden sm:block">
                              <div
                                className="h-full bg-amber-500 rounded-full"
                                style={{ width: `${Math.min(pctNac, 100)}%` }}
                              />
                            </div>
                            <span className="text-[11px] font-bold text-slate-600 dark:text-slate-300">
                              {pctNac.toFixed(1)}%
                            </span>
                          </div>
                        </td>
                      </tr>

                      {/* NIVEL 2: ESFM / UA DEL DEPARTAMENTO */}
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
                                className="bg-indigo-50/40 dark:bg-indigo-950/20 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 transition-colors cursor-pointer border-l-4 border-l-indigo-500"
                              >
                                <td className="py-2.5 pl-9 pr-4 font-bold text-indigo-950 dark:text-indigo-200">
                                  <div className="flex items-center gap-2">
                                    {isEsfmOpen ? (
                                      <ChevronDown className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                                    ) : (
                                      <ChevronRight className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                                    )}
                                    <Building2 className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                                    <span>{esfm.esfm}</span>
                                  </div>
                                </td>
                                <td className="py-2.5 px-3 text-center">
                                  <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                                    {esfm.especialidades.length} Especialidades
                                  </span>
                                </td>
                                {visibleAnios.map((a) => (
                                  <td
                                    key={a}
                                    className="py-2.5 px-3 text-right tabular-nums font-semibold text-indigo-900 dark:text-indigo-200"
                                  >
                                    {fmt(esfm.anios[a])}
                                  </td>
                                ))}
                                <td className="py-2.5 px-4 text-right tabular-nums font-black text-indigo-950 dark:text-white bg-indigo-100/40 dark:bg-indigo-900/30">
                                  {fmt(esfm.anios.total)}
                                </td>
                                <td className="py-2.5 px-4 text-right tabular-nums text-[11px] font-bold text-indigo-700 dark:text-indigo-300">
                                  {pctDepto.toFixed(1)}% dpto
                                </td>
                              </tr>

                              {/* NIVEL 3: ESPECIALIDADES DE LA ESFM */}
                              {isEsfmOpen &&
                                esfm.especialidades.map((esp) => {
                                  const pctEsfm =
                                    esfm.anios.total > 0
                                      ? (esp.anios.total / esfm.anios.total) * 100
                                      : 0;
                                  return (
                                    <tr
                                      key={`${esfmKey}::${esp.especialidad}`}
                                      className="bg-emerald-50/25 dark:bg-slate-900/60 hover:bg-emerald-50/60 dark:hover:bg-slate-800/50 transition-colors border-l-4 border-l-emerald-500"
                                    >
                                      <td className="py-2 pl-16 pr-4 font-medium text-slate-700 dark:text-slate-300">
                                        <div className="flex items-center gap-2">
                                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                                          <span>{esp.especialidad}</span>
                                        </div>
                                      </td>
                                      <td className="py-2 px-3 text-center text-[10px] font-semibold text-slate-400">
                                        Especialidad
                                      </td>
                                      {visibleAnios.map((a) => (
                                        <td
                                          key={a}
                                          className="py-2 px-3 text-right tabular-nums text-slate-600 dark:text-slate-400"
                                        >
                                          {esp.anios[a] > 0 ? fmt(esp.anios[a]) : '—'}
                                        </td>
                                      ))}
                                      <td className="py-2 px-4 text-right tabular-nums font-bold text-slate-800 dark:text-slate-100 bg-slate-50/50 dark:bg-slate-800/30">
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
                <tr className="bg-amber-50/90 dark:bg-amber-950/40 border-t-2 border-amber-300 dark:border-amber-700 font-black text-slate-900 dark:text-white">
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
                  <td className="py-3.5 px-4 text-right tabular-nums bg-amber-100/80 dark:bg-amber-900/50">
                    {fmt(nationalTotals.total)}
                  </td>
                  <td className="py-3.5 px-4 text-right tabular-nums">100.0%</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
