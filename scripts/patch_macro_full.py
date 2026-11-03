with open('src/components/dashboard/views/Exposicion2031View.tsx', 'r', encoding='utf-8') as f:
    c = f.read()

# 1. Interfaces y clasificador de macro áreas
old_decl = '''export interface DeptBalanceAnio {
  demanda: number;
  egresados: number;
  real: number;
}'''

new_decl = '''export type MacroAreaTipo = 'INICIAL' | 'PRIMARIA' | 'SECUNDARIA' | 'SECUNDARIA_BTH' | 'ESPECIAL';

export function getMacroArea(especialidad: string): MacroAreaTipo {
  const u = especialidad.toUpperCase().normalize("NFD").replace(/[\\u0300-\\u036f]/g, "");
  if (u.includes("INICIAL")) return "INICIAL";
  if (u.includes("PRIMARIA")) return "PRIMARIA";
  if (u.includes("ESPECIAL") || u.includes("DISCAPACIDAD")) return "ESPECIAL";
  if (
    u.includes("ELECTROMECANICA") ||
    u.includes("MECANICA") ||
    u.includes("TEXTIL") ||
    u.includes("ELECTRICIDAD") ||
    u.includes("ALIMENTOS") ||
    u.includes("GASTRONOMIA") ||
    u.includes("AGROPECUARIA") ||
    u.includes("BTH")
  ) {
    return "SECUNDARIA_BTH";
  }
  return "SECUNDARIA";
}

export interface MacroAreaStats {
  demanda: number;
  egresados: number;
  real: number;
  paralelos: number | null;
}

export interface MacroDptoFila {
  departamento: string;
  inicial: MacroAreaStats;
  primaria: MacroAreaStats;
  secundaria: MacroAreaStats;
  secundariaBth: MacroAreaStats;
  especial: MacroAreaStats;
  total: MacroAreaStats;
}

export interface DeptBalanceAnio {
  demanda: number;
  egresados: number;
  real: number;
}'''

assert old_decl in c, 'old_decl no encontrado'
c = c.replace(old_decl, new_decl, 1)

# 2. Agregar estados del componente y cálculo useMemo de la matriz macro
old_states = '''  // Modo de visualización de egresados en el gráfico de Slide 3: Acumulado o Anual
  const [modoEgresadosGrafico, setModoEgresadosGrafico] = useState<"ACUMULADO" | "ANUAL">("ACUMULADO");'''

new_states = '''  // Modo de visualización de egresados en el gráfico de Slide 3: Acumulado o Anual
  const [modoEgresadosGrafico, setModoEgresadosGrafico] = useState<"ACUMULADO" | "ANUAL">("ACUMULADO");

  // Pestaña activa para la tabla de balance inferior: Macro General vs Evolución Especialidad
  const [tabTablaBalance, setTabTablaBalance] = useState<"macro" | "cohorte">("macro");

  // Horizonte temporal para la Matriz Macro General
  const [macroFiltroAnio, setMacroFiltroAnio] = useState<"2031" | "2027" | "2028" | "2029" | "2030">("2031");

  // Modo de lectura para la tabla de cohorte anual (resumido vs detallado)
  const [modoVistaCohorte, setModoVistaCohorte] = useState<"resumido" | "completo">("resumido");'''

assert old_states in c, 'old_states no encontrado'
c = c.replace(old_states, new_states, 1)

# 3. Insertar useMemo macroDptoRows y macroTotalFila
old_memo_pos = '''  // Filas del Balance Departamental Dinámico (Demanda Remanente = Necesidad - Egresados)'''

new_memo_code = '''  // Matriz Macro General por Departamentos y las 5 Áreas (Inicial, Primaria, Secundaria, BTH, Especial)
  const macroDptoRows = useMemo<MacroDptoFila[]>(() => {
    if (!data?.dictamen_apertura_especialidades) return [];
    const esps = data.dictamen_apertura_especialidades;
    const dptos = ["BENI", "LA PAZ", "SANTA CRUZ", "PANDO", "POTOSI", "CHUQUISACA", "TARIJA", "ORURO", "COCHABAMBA"];

    return dptos.map((dpto) => {
      const calcArea = (macroTipo: MacroAreaTipo): MacroAreaStats => {
        const areaEsps = esps.filter((e) => getMacroArea(e.especialidad) === macroTipo);
        let totDem = 0;
        let totEgr = 0;

        areaEsps.forEach((e) => {
          const dData = e.por_dpto?.[dpto];
          if (!dData) return;
          if (macroFiltroAnio === "2031") {
            totDem += Math.round(dData.items_deficit_uie || 0);
            totEgr += dData.egresados_esfm_proyectados || 0;
          } else {
            const anioNum = Number(macroFiltroAnio);
            const serie = dData.serie_proyeccion || [];
            const pt = serie.find((p: { anio: number }) => p.anio === anioNum);
            totDem += pt ? Math.round(pt.demanda) : Math.round(dData.items_deficit_uie || 0);
            totEgr += pt ? (pt.egresados_anual || 0) : 0;
          }
        });

        const real = totDem - totEgr;
        const paralelos = calcularParalelosAdmision(real);
        return { demanda: totDem, egresados: totEgr, real, paralelos };
      };

      const inicial = calcArea("INICIAL");
      const primaria = calcArea("PRIMARIA");
      const secundaria = calcArea("SECUNDARIA");
      const secundariaBth = calcArea("SECUNDARIA_BTH");
      const especial = calcArea("ESPECIAL");

      const totalDem = inicial.demanda + primaria.demanda + secundaria.demanda + secundariaBth.demanda + especial.demanda;
      const totalEgr = inicial.egresados + primaria.egresados + secundaria.egresados + secundariaBth.egresados + especial.egresados;
      const totalReal = totalDem - totalEgr;
      const totalParalelos = calcularParalelosAdmision(totalReal);

      return {
        departamento: dpto,
        inicial,
        primaria,
        secundaria,
        secundariaBth,
        especial,
        total: {
          demanda: totalDem,
          egresados: totalEgr,
          real: totalReal,
          paralelos: totalParalelos,
        },
      };
    });
  }, [data, macroFiltroAnio]);

  // Fila Total Consolidada de la Matriz Macro
  const macroTotalFila = useMemo(() => {
    return macroDptoRows.reduce(
      (acc, r) => {
        const sumArea = (k: keyof Omit<MacroDptoFila, "departamento">) => {
          acc[k].demanda += r[k].demanda;
          acc[k].egresados += r[k].egresados;
          acc[k].real += r[k].real;
          acc[k].paralelos = (acc[k].paralelos || 0) + (r[k].paralelos || 0);
        };
        sumArea("inicial");
        sumArea("primaria");
        sumArea("secundaria");
        sumArea("secundariaBth");
        sumArea("especial");
        sumArea("total");
        return acc;
      },
      {
        inicial: { demanda: 0, egresados: 0, real: 0, paralelos: 0 },
        primaria: { demanda: 0, egresados: 0, real: 0, paralelos: 0 },
        secundaria: { demanda: 0, egresados: 0, real: 0, paralelos: 0 },
        secundariaBth: { demanda: 0, egresados: 0, real: 0, paralelos: 0 },
        especial: { demanda: 0, egresados: 0, real: 0, paralelos: 0 },
        total: { demanda: 0, egresados: 0, real: 0, paralelos: 0 },
      }
    );
  }, [macroDptoRows]);

  // Filas del Balance Departamental Dinámico (Demanda Remanente = Necesidad - Egresados)'''

assert old_memo_pos in c, 'old_memo_pos no encontrado'
c = c.replace(old_memo_pos, new_memo_code, 1)

# 4. Reemplazar la sección visual completa de la tabla por el diseño enriquecido con pestañas
jsx_start = '''              {/* ─── TABLA DE BALANCE DEPARTAMENTAL MULTI-ANUAL (2027–2031) ─── */}'''
jsx_end = '''              {/* Barras por departamento */}'''

pos_start = c.find(jsx_start)
pos_end = c.find(jsx_end)
assert pos_start != -1 and pos_end != -1, "No se encontró el bloque JSX de tabla departamental"

new_jsx = '''              {/* ─── MÓDULO INTEGRAL DE BALANCE DEPARTAMENTAL (MACRO GENERAL & COHORTES) ─── */}
              <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4">
                {/* Cabecera con Conmutador de Pestañas */}
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 border-b border-slate-100 pb-4">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-600" />
                      <h4 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
                        Demanda en UEs vs Oferta de Egresados ESFM · Análisis Territorial
                      </h4>
                    </div>
                    <p className="text-[11px] text-slate-500">
                      Balance consolidado por Subsistema / Nivel y Proyección multi-anual por cohortes reales.
                    </p>
                  </div>

                  {/* Selector de Pestañas Superior */}
                  <div className="inline-flex rounded-xl border border-slate-200 p-1 bg-slate-100/80 text-xs font-bold gap-1 self-start lg:self-auto">
                    <button
                      onClick={() => setTabTablaBalance("macro")}
                      className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                        tabTablaBalance === "macro"
                          ? "bg-white text-slate-900 shadow-xs font-black"
                          : "text-slate-600 hover:text-slate-900"
                      }`}
                    >
                      <Layers className="w-3.5 h-3.5 text-indigo-600" />
                      <span>Matriz General por Subsistemas</span>
                      <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-indigo-50 text-indigo-700 font-extrabold">5 Áreas</span>
                    </button>

                    <button
                      onClick={() => setTabTablaBalance("cohorte")}
                      className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                        tabTablaBalance === "cohorte"
                          ? "bg-white text-slate-900 shadow-xs font-black"
                          : "text-slate-600 hover:text-slate-900"
                      }`}
                    >
                      <TrendingUp className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Evolución Anual Cohortes ({selectedEsp.especialidad})</span>
                    </button>
                  </div>
                </div>

                {/* ══════════════════════════════════════════════════════════════════
                    PESTAÑA 1: MATRIZ GENERAL POR SUBSISTEMAS / NIVELES
                   ══════════════════════════════════════════════════════════════════ */}
                {tabTablaBalance === "macro" && (
                  <div className="space-y-4">
                    {/* Barra de Filtro de Gestión para la Matriz Macro */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/70 p-3 rounded-xl border border-slate-100">
                      <div className="flex items-center gap-2 text-xs">
                        <span className="font-bold text-slate-700">Horizonte de Análisis:</span>
                        <div className="inline-flex rounded-lg border border-slate-200 bg-white p-0.5 text-[11px] font-bold">
                          {(["2031", "2027", "2028", "2029", "2030"] as const).map((y) => (
                            <button
                              key={y}
                              onClick={() => setMacroFiltroAnio(y)}
                              className={`px-2.5 py-1 rounded-md transition-all cursor-pointer ${
                                macroFiltroAnio === y
                                  ? "bg-slate-900 text-white shadow-xs font-black"
                                  : "text-slate-600 hover:bg-slate-100"
                              }`}
                            >
                              {y === "2031" ? "Corte Quinquenal al 2031 (Recomendado)" : `Gestión ${y}`}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="flex items-center gap-3 text-[11px] text-slate-500 font-medium">
                        <span className="flex items-center gap-1">
                          <span className="w-2.5 h-2.5 rounded bg-amber-200 border border-amber-400" /> Inicial
                        </span>
                        <span className="flex items-center gap-1">
                          <span className="w-2.5 h-2.5 rounded bg-blue-200 border border-blue-400" /> Primaria
                        </span>
                        <span className="flex items-center gap-1">
                          <span className="w-2.5 h-2.5 rounded bg-emerald-200 border border-emerald-400" /> Secundaria
                        </span>
                        <span className="flex items-center gap-1">
                          <span className="w-2.5 h-2.5 rounded bg-indigo-200 border border-indigo-400" /> BTH (6 ramas)
                        </span>
                        <span className="flex items-center gap-1">
                          <span className="w-2.5 h-2.5 rounded bg-rose-200 border border-rose-400" /> Especial
                        </span>
                      </div>
                    </div>

                    {/* Tabla Macro Consolidada */}
                    <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-2xs">
                      <table className="w-full text-[11px] text-left border-collapse whitespace-nowrap">
                        <thead>
                          {/* Super Cabecera de Subsistemas */}
                          <tr className="text-center font-black text-slate-800 border-b border-slate-200">
                            <th rowSpan={2} className="py-2.5 px-3 text-left bg-slate-100/90 border-r border-slate-300 min-w-[120px]">
                              DEPARTAMENTO
                            </th>
                            <th colSpan={3} className="py-2 px-2 bg-amber-100/70 text-amber-950 border-r border-slate-300">
                              INICIAL
                              <span className="block text-[9px] font-normal text-amber-800">En Familia Comunitaria</span>
                            </th>
                            <th colSpan={3} className="py-2 px-2 bg-blue-100/70 text-blue-950 border-r border-slate-300">
                              PRIMARIA
                              <span className="block text-[9px] font-normal text-blue-800">Comunitaria Vocacional</span>
                            </th>
                            <th colSpan={3} className="py-2 px-2 bg-emerald-100/70 text-emerald-950 border-r border-slate-300">
                              SECUNDARIA
                              <span className="block text-[9px] font-normal text-emerald-800">11 Especialidades Regulares</span>
                            </th>
                            <th colSpan={3} className="py-2 px-2 bg-indigo-100/70 text-indigo-950 border-r border-slate-300">
                              SECUNDARIA BTH
                              <span className="block text-[9px] font-normal text-indigo-800">6 Especialidades Técnicas</span>
                            </th>
                            <th colSpan={3} className="py-2 px-2 bg-rose-100/70 text-rose-950 border-r border-slate-300">
                              ESPECIAL
                              <span className="block text-[9px] font-normal text-rose-800">Personas con Discapacidad</span>
                            </th>
                            <th colSpan={3} className="py-2 px-2 bg-slate-200/90 text-slate-900 border-l border-slate-300 font-black">
                              TOTAL GENERAL
                              <span className="block text-[9px] font-normal text-slate-700">Consolidado SEP</span>
                            </th>
                          </tr>

                          {/* Sub Cabecera de Métricas */}
                          <tr className="text-[10px] font-extrabold text-slate-700 border-b border-slate-300 text-right">
                            {/* INICIAL */}
                            <th className="py-1.5 px-2 bg-amber-50/50 border-r border-slate-200/70">DEMANDA MTROS</th>
                            <th className="py-1.5 px-2 bg-amber-50/50 border-r border-slate-200/70">EGRESADOS</th>
                            <th className="py-1.5 px-2 bg-amber-100/60 border-r border-slate-300 text-amber-950">DEMANDA REAL</th>

                            {/* PRIMARIA */}
                            <th className="py-1.5 px-2 bg-blue-50/50 border-r border-slate-200/70">DEMANDA MTROS</th>
                            <th className="py-1.5 px-2 bg-blue-50/50 border-r border-slate-200/70">EGRESADOS</th>
                            <th className="py-1.5 px-2 bg-blue-100/60 border-r border-slate-300 text-blue-950">DEMANDA REAL</th>

                            {/* SECUNDARIA */}
                            <th className="py-1.5 px-2 bg-emerald-50/50 border-r border-slate-200/70">DEMANDA MTROS</th>
                            <th className="py-1.5 px-2 bg-emerald-50/50 border-r border-slate-200/70">EGRESADOS</th>
                            <th className="py-1.5 px-2 bg-emerald-100/60 border-r border-slate-300 text-emerald-950">DEMANDA REAL</th>

                            {/* SECUNDARIA BTH */}
                            <th className="py-1.5 px-2 bg-indigo-50/50 border-r border-slate-200/70">DEMANDA MTROS</th>
                            <th className="py-1.5 px-2 bg-indigo-50/50 border-r border-slate-200/70">EGRESADOS</th>
                            <th className="py-1.5 px-2 bg-indigo-100/60 border-r border-slate-300 text-indigo-950">DEMANDA REAL</th>

                            {/* ESPECIAL */}
                            <th className="py-1.5 px-2 bg-rose-50/50 border-r border-slate-200/70">DEMANDA MTROS</th>
                            <th className="py-1.5 px-2 bg-rose-50/50 border-r border-slate-200/70">EGRESADOS</th>
                            <th className="py-1.5 px-2 bg-rose-100/60 border-r border-slate-300 text-rose-950">DEMANDA REAL</th>

                            {/* TOTAL GENERAL */}
                            <th className="py-1.5 px-2 bg-slate-100 border-r border-slate-200/70 text-slate-800">DEMANDA MTROS</th>
                            <th className="py-1.5 px-2 bg-slate-100 border-r border-slate-200/70 text-slate-800">EGRESADOS</th>
                            <th className="py-1.5 px-2 bg-slate-200/90 border-l border-slate-300 text-slate-900 font-black">DEMANDA REAL</th>
                          </tr>
                        </thead>

                        <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                          {macroDptoRows.map((row) => {
                            const renderCellReal = (st: MacroAreaStats, bgTint: string) => (
                              <td className={`py-2 px-2 text-right border-r border-slate-200 ${bgTint}`}>
                                {st.real < 0 ? (
                                  <span className="text-rose-600 font-bold">{st.real.toLocaleString()}</span>
                                ) : st.real > 0 ? (
                                  <span className="text-slate-900 font-extrabold flex items-center justify-end gap-1">
                                    <span>{st.real.toLocaleString()}</span>
                                    {st.paralelos && st.paralelos > 0 && (
                                      <span className="text-[9px] px-1 py-0.2 rounded bg-[#84cc16] text-white font-black" title={`${st.paralelos} paralelos requeridos`}>
                                        {st.paralelos}p
                                      </span>
                                    )}
                                  </span>
                                ) : (
                                  <span className="text-slate-400 font-semibold">0</span>
                                )}
                              </td>
                            );

                            return (
                              <tr key={row.departamento} className="hover:bg-slate-50/90 transition-colors">
                                {/* Departamento */}
                                <td className="py-2 px-3 font-bold text-slate-800 bg-slate-50/50 border-r border-slate-200">
                                  {row.departamento}
                                </td>

                                {/* INICIAL */}
                                <td className="py-2 px-2 text-right border-r border-slate-100">{row.inicial.demanda.toLocaleString()}</td>
                                <td className="py-2 px-2 text-right border-r border-slate-100 text-slate-600">{row.inicial.egresados.toLocaleString()}</td>
                                {renderCellReal(row.inicial, "bg-amber-50/30")}

                                {/* PRIMARIA */}
                                <td className="py-2 px-2 text-right border-r border-slate-100">{row.primaria.demanda.toLocaleString()}</td>
                                <td className="py-2 px-2 text-right border-r border-slate-100 text-slate-600">{row.primaria.egresados.toLocaleString()}</td>
                                {renderCellReal(row.primaria, "bg-blue-50/30")}

                                {/* SECUNDARIA */}
                                <td className="py-2 px-2 text-right border-r border-slate-100">{row.secundaria.demanda.toLocaleString()}</td>
                                <td className="py-2 px-2 text-right border-r border-slate-100 text-slate-600">{row.secundaria.egresados.toLocaleString()}</td>
                                {renderCellReal(row.secundaria, "bg-emerald-50/30")}

                                {/* SECUNDARIA BTH */}
                                <td className="py-2 px-2 text-right border-r border-slate-100">{row.secundariaBth.demanda.toLocaleString()}</td>
                                <td className="py-2 px-2 text-right border-r border-slate-100 text-slate-600">{row.secundariaBth.egresados.toLocaleString()}</td>
                                {renderCellReal(row.secundariaBth, "bg-indigo-50/30")}

                                {/* ESPECIAL */}
                                <td className="py-2 px-2 text-right border-r border-slate-100">{row.especial.demanda.toLocaleString()}</td>
                                <td className="py-2 px-2 text-right border-r border-slate-100 text-slate-600">{row.especial.egresados.toLocaleString()}</td>
                                {renderCellReal(row.especial, "bg-rose-50/30")}

                                {/* TOTAL GENERAL */}
                                <td className="py-2 px-2 text-right border-r border-slate-100 bg-slate-50 font-bold">{row.total.demanda.toLocaleString()}</td>
                                <td className="py-2 px-2 text-right border-r border-slate-100 bg-slate-50 text-slate-700 font-bold">{row.total.egresados.toLocaleString()}</td>
                                {renderCellReal(row.total, "bg-slate-100/90 font-black")}
                              </tr>
                            );
                          })}
                        </tbody>

                        {/* Fila Total Bolivia */}
                        <tfoot>
                          {(() => {
                            const tot = macroTotalFila;
                            const renderTotReal = (st: MacroAreaStats, bgTint: string) => (
                              <td className={`py-2.5 px-2 border-r border-slate-300 font-black ${bgTint}`}>
                                {st.real < 0 ? (
                                  <span className="text-rose-700 font-black">{st.real.toLocaleString()}</span>
                                ) : (
                                  <span className="text-slate-900 font-black flex items-center justify-end gap-1">
                                    <span>{st.real.toLocaleString()}</span>
                                    {st.paralelos && st.paralelos > 0 && (
                                      <span className="text-[9px] px-1.5 py-0.2 rounded bg-lime-700 text-white font-black">
                                        {st.paralelos}p
                                      </span>
                                    )}
                                  </span>
                                )}
                              </td>
                            );

                            return (
                              <tr className="bg-slate-100 font-black text-slate-900 border-t-2 border-slate-300 text-right">
                                <td className="py-2.5 px-3 text-left font-black border-r border-slate-300">
                                  TOTAL BOLIVIA
                                </td>
                                {/* INICIAL */}
                                <td className="py-2.5 px-2 border-r border-slate-200">{tot.inicial.demanda.toLocaleString()}</td>
                                <td className="py-2.5 px-2 border-r border-slate-200 text-slate-700">{tot.inicial.egresados.toLocaleString()}</td>
                                {renderTotReal(tot.inicial, "bg-amber-100/60")}

                                {/* PRIMARIA */}
                                <td className="py-2.5 px-2 border-r border-slate-200">{tot.primaria.demanda.toLocaleString()}</td>
                                <td className="py-2.5 px-2 border-r border-slate-200 text-slate-700">{tot.primaria.egresados.toLocaleString()}</td>
                                {renderTotReal(tot.primaria, "bg-blue-100/60")}

                                {/* SECUNDARIA */}
                                <td className="py-2.5 px-2 border-r border-slate-200">{tot.secundaria.demanda.toLocaleString()}</td>
                                <td className="py-2.5 px-2 border-r border-slate-200 text-slate-700">{tot.secundaria.egresados.toLocaleString()}</td>
                                {renderTotReal(tot.secundaria, "bg-emerald-100/60")}

                                {/* SECUNDARIA BTH */}
                                <td className="py-2.5 px-2 border-r border-slate-200">{tot.secundariaBth.demanda.toLocaleString()}</td>
                                <td className="py-2.5 px-2 border-r border-slate-200 text-slate-700">{tot.secundariaBth.egresados.toLocaleString()}</td>
                                {renderTotReal(tot.secundariaBth, "bg-indigo-100/60")}

                                {/* ESPECIAL */}
                                <td className="py-2.5 px-2 border-r border-slate-200">{tot.especial.demanda.toLocaleString()}</td>
                                <td className="py-2.5 px-2 border-r border-slate-200 text-slate-700">{tot.especial.egresados.toLocaleString()}</td>
                                {renderTotReal(tot.especial, "bg-rose-100/60")}

                                {/* TOTAL GENERAL */}
                                <td className="py-2.5 px-2 border-r border-slate-200 bg-slate-200/50">{tot.total.demanda.toLocaleString()}</td>
                                <td className="py-2.5 px-2 border-r border-slate-200 bg-slate-200/50 text-slate-800">{tot.total.egresados.toLocaleString()}</td>
                                {renderTotReal(tot.total, "bg-slate-200 text-slate-900 font-black")}
                              </tr>
                            );
                          })()}
                        </tfoot>
                      </table>
                    </div>

                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-[11px] text-slate-500 pt-2 border-t border-slate-100">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-700">Fórmula Macro:</span>
                        <span>Demanda Real = Demanda Ítems UIE − Egresados ESFM</span>
                        <span>·</span>
                        <span>Badge `Xp`: Número de paralelos (30 doc.) cuando la brecha $\\ge 6$ ítems</span>
                      </div>
                      <div className="text-slate-600 font-semibold">
                        * Valores en rojo indican superávit acumulado de maestros en el subsistema respectivo.
                      </div>
                    </div>
                  </div>
                )}

                {/* ══════════════════════════════════════════════════════════════════
                    PESTAÑA 2: EVOLUCIÓN ANUAL POR COHORTE (ESPECIALIDAD SELECCIONADA)
                   ══════════════════════════════════════════════════════════════════ */}
                {tabTablaBalance === "cohorte" && (
                  <div className="space-y-4">
                    {/* Barra de Controles y Selector de Modo de Visualización */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/70 p-3 rounded-xl border border-slate-100">
                      <div>
                        <div className="text-xs font-bold text-slate-800 flex items-center gap-2">
                          <span>Especialidad:</span>
                          <span className="text-indigo-700 font-black uppercase">{selectedEsp.especialidad}</span>
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-200/80 text-slate-700 font-bold">
                            Nivel: {selectedEsp.nivel_educativo || "SECUNDARIA"}
                          </span>
                        </div>
                        <p className="text-[10px] text-slate-500 mt-0.5">
                          Evolución del inventario de déficit: Demanda Ítems (t) = Demanda Real (t-1)
                        </p>
                      </div>

                      {/* Selector de Modo de Lectura */}
                      <div className="inline-flex rounded-lg border border-slate-200 bg-white p-0.5 text-[11px] font-bold">
                        <button
                          onClick={() => setModoVistaCohorte("resumido")}
                          className={`px-3 py-1 rounded-md transition-all cursor-pointer ${
                            modoVistaCohorte === "resumido"
                              ? "bg-emerald-600 text-white shadow-xs font-black"
                              : "text-slate-600 hover:bg-slate-100"
                          }`}
                        >
                          Vista Resumida (Demanda Real Año a Año)
                        </button>
                        <button
                          onClick={() => setModoVistaCohorte("completo")}
                          className={`px-3 py-1 rounded-md transition-all cursor-pointer ${
                            modoVistaCohorte === "completo"
                              ? "bg-slate-900 text-white shadow-xs font-black"
                              : "text-slate-600 hover:bg-slate-100"
                          }`}
                        >
                          Vista Detallada (16 Columnas)
                        </button>
                      </div>
                    </div>

                    {/* Tabla de Cohortes */}
                    <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
                      <table className="w-full text-[11px] text-left border-collapse whitespace-nowrap">
                        <thead>
                          {modoVistaCohorte === "resumido" ? (
                            /* Modo Resumido: Cabecera ultra clara de 7 columnas */
                            <tr className="text-center font-black text-slate-800 border-b border-slate-200">
                              <th className="py-2.5 px-3 text-left bg-slate-100/90 border-r border-slate-300 min-w-[120px]">
                                DEPARTAMENTO
                              </th>
                              <th className="py-2.5 px-3 bg-[#dbeafe]/70 text-slate-900 border-r border-slate-200 text-right">
                                DEMANDA REAL 2027
                              </th>
                              <th className="py-2.5 px-3 bg-[#fef3c7]/90 text-amber-950 border-r border-slate-200 text-right">
                                DEMANDA REAL 2028
                              </th>
                              <th className="py-2.5 px-3 bg-[#e0f2fe]/90 text-sky-950 border-r border-slate-200 text-right">
                                DEMANDA REAL 2029
                              </th>
                              <th className="py-2.5 px-3 bg-[#e2e8f0]/80 text-slate-900 border-r border-slate-200 text-right">
                                DEMANDA REAL 2030
                              </th>
                              <th className="py-2.5 px-3 bg-[#dcfce7]/90 text-emerald-950 border-r border-slate-300 text-right">
                                DEMANDA REAL 2031 (CORTE)
                              </th>
                              <th className="py-2.5 px-3 bg-[#ecfccb] text-lime-950 font-black border-l border-slate-300 text-center min-w-[130px]">
                                ADMISIÓN 2027
                                <span className="block text-[9px] font-bold text-lime-800">(30 doc. / paralelo)</span>
                              </th>
                            </tr>
                          ) : (
                            /* Modo Completo: 16 columnas detalladas */
                            <>
                              <tr className="text-center font-black text-slate-800 border-b border-slate-200">
                                <th rowSpan={2} className="py-2.5 px-3 text-left bg-slate-100/90 border-r border-slate-300 min-w-[120px]">
                                  DEPARTAMENTO
                                </th>
                                <th colSpan={3} className="py-2 px-2 bg-[#dbeafe]/70 text-slate-900 border-r border-slate-300">
                                  2027
                                </th>
                                <th colSpan={3} className="py-2 px-2 bg-[#fef3c7]/90 text-amber-950 border-r border-slate-300">
                                  2028
                                </th>
                                <th colSpan={3} className="py-2 px-2 bg-[#e0f2fe]/90 text-sky-950 border-r border-slate-300">
                                  2029
                                </th>
                                <th colSpan={3} className="py-2 px-2 bg-[#e2e8f0]/80 text-slate-900 border-r border-slate-300">
                                  2030
                                </th>
                                <th colSpan={3} className="py-2 px-2 bg-[#dcfce7]/90 text-emerald-950 border-r border-slate-300">
                                  2031
                                </th>
                                <th rowSpan={2} className="py-2.5 px-3 bg-[#ecfccb] text-lime-950 font-black border-l border-slate-300 text-center min-w-[110px]">
                                  ADMISIÓN 2027
                                  <span className="block text-[9px] font-bold text-lime-800">(30 docentes)</span>
                                </th>
                              </tr>
                              <tr className="text-[10px] font-extrabold text-slate-700 border-b border-slate-300 text-right">
                                <th className="py-1.5 px-2 bg-[#dbeafe]/40 border-r border-slate-200/70">DEMANDA MTROS</th>
                                <th className="py-1.5 px-2 bg-[#dbeafe]/40 border-r border-slate-200/70">EGRESADOS</th>
                                <th className="py-1.5 px-2 bg-[#dbeafe]/60 border-r border-slate-300 text-slate-900">DEMANDA REAL</th>

                                <th className="py-1.5 px-2 bg-[#fef3c7]/40 border-r border-slate-200/70">DEMANDA MTROS</th>
                                <th className="py-1.5 px-2 bg-[#fef3c7]/40 border-r border-slate-200/70">EGRESADOS</th>
                                <th className="py-1.5 px-2 bg-[#fef3c7]/70 border-r border-slate-300 text-amber-950">DEMANDA REAL</th>

                                <th className="py-1.5 px-2 bg-[#e0f2fe]/40 border-r border-slate-200/70">DEMANDA MTROS</th>
                                <th className="py-1.5 px-2 bg-[#e0f2fe]/40 border-r border-slate-200/70">EGRESADOS</th>
                                <th className="py-1.5 px-2 bg-[#e0f2fe]/70 border-r border-slate-300 text-sky-950">DEMANDA REAL</th>

                                <th className="py-1.5 px-2 bg-[#e2e8f0]/40 border-r border-slate-200/70">DEMANDA MTROS</th>
                                <th className="py-1.5 px-2 bg-[#e2e8f0]/40 border-r border-slate-200/70">EGRESADOS</th>
                                <th className="py-1.5 px-2 bg-[#e2e8f0]/70 border-r border-slate-300 text-slate-900">DEMANDA REAL</th>

                                <th className="py-1.5 px-2 bg-[#dcfce7]/40 border-r border-slate-200/70">DEMANDA MTROS</th>
                                <th className="py-1.5 px-2 bg-[#dcfce7]/40 border-r border-slate-200/70">EGRESADOS</th>
                                <th className="py-1.5 px-2 bg-[#dcfce7]/70 border-r border-slate-300 text-emerald-950">DEMANDA REAL</th>
                              </tr>
                            </>
                          )}
                        </thead>

                        <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                          {deptBalanceRows.map((row) => {
                            const fmt = (v: number) => (Number.isInteger(v) ? v.toString() : v.toFixed(1).replace(".", ","));
                            const renderReal = (val: number) => {
                              if (val < 0) return <span className="text-rose-600 font-bold">{fmt(val)}</span>;
                              if (val > 0) return <span className="text-slate-900 font-extrabold">{fmt(val)}</span>;
                              return <span className="text-slate-400 font-semibold">0</span>;
                            };

                            if (modoVistaCohorte === "resumido") {
                              return (
                                <tr key={row.departamento} className="hover:bg-slate-50/90 transition-colors">
                                  <td className="py-2.5 px-3 font-bold text-slate-800 bg-slate-50/50 border-r border-slate-200">
                                    {row.departamento}
                                  </td>
                                  <td className="py-2.5 px-3 text-right border-r border-slate-200 bg-slate-50/20">{renderReal(row.y2027.real)}</td>
                                  <td className="py-2.5 px-3 text-right border-r border-slate-200 bg-amber-50/20">{renderReal(row.y2028.real)}</td>
                                  <td className="py-2.5 px-3 text-right border-r border-slate-200 bg-sky-50/20">{renderReal(row.y2029.real)}</td>
                                  <td className="py-2.5 px-3 text-right border-r border-slate-200 bg-slate-50/20">{renderReal(row.y2030.real)}</td>
                                  <td className="py-2.5 px-3 text-right border-r border-slate-300 bg-emerald-50/30 font-bold">{renderReal(row.y2031.real)}</td>
                                  <td className="py-2.5 px-3 text-center border-l border-slate-200">
                                    {row.admision2027 != null && row.admision2027 > 0 ? (
                                      <span className="inline-flex items-center justify-center px-2.5 py-1 rounded-md bg-[#84cc16] text-white font-black text-xs shadow-xs ring-1 ring-lime-600/30">
                                        {row.admision2027} paralelo{row.admision2027 === 1 ? "" : "s"}
                                      </span>
                                    ) : (
                                      <span className="text-slate-300 font-semibold">—</span>
                                    )}
                                  </td>
                                </tr>
                              );
                            }

                            return (
                              <tr key={row.departamento} className="hover:bg-slate-50/90 transition-colors">
                                <td className="py-2 px-3 font-bold text-slate-800 bg-slate-50/50 border-r border-slate-200">
                                  {row.departamento}
                                </td>
                                {/* 2027 */}
                                <td className="py-2 px-2 text-right border-r border-slate-100">{fmt(row.y2027.demanda)}</td>
                                <td className="py-2 px-2 text-right border-r border-slate-100 text-slate-600">{fmt(row.y2027.egresados)}</td>
                                <td className="py-2 px-2 text-right border-r border-slate-200 bg-slate-50/30">{renderReal(row.y2027.real)}</td>
                                {/* 2028 */}
                                <td className="py-2 px-2 text-right border-r border-slate-100">{fmt(row.y2028.demanda)}</td>
                                <td className="py-2 px-2 text-right border-r border-slate-100 text-slate-600">{fmt(row.y2028.egresados)}</td>
                                <td className="py-2 px-2 text-right border-r border-slate-200 bg-amber-50/20">{renderReal(row.y2028.real)}</td>
                                {/* 2029 */}
                                <td className="py-2 px-2 text-right border-r border-slate-100">{fmt(row.y2029.demanda)}</td>
                                <td className="py-2 px-2 text-right border-r border-slate-100 text-slate-600">{fmt(row.y2029.egresados)}</td>
                                <td className="py-2 px-2 text-right border-r border-slate-200 bg-sky-50/20">{renderReal(row.y2029.real)}</td>
                                {/* 2030 */}
                                <td className="py-2 px-2 text-right border-r border-slate-100">{fmt(row.y2030.demanda)}</td>
                                <td className="py-2 px-2 text-right border-r border-slate-100 text-slate-600">{fmt(row.y2030.egresados)}</td>
                                <td className="py-2 px-2 text-right border-r border-slate-200 bg-slate-50/30">{renderReal(row.y2030.real)}</td>
                                {/* 2031 */}
                                <td className="py-2 px-2 text-right border-r border-slate-100">{fmt(row.y2031.demanda)}</td>
                                <td className="py-2 px-2 text-right border-r border-slate-100 text-slate-600">{fmt(row.y2031.egresados)}</td>
                                <td className="py-2 px-2 text-right border-r border-slate-200 bg-emerald-50/20">{renderReal(row.y2031.real)}</td>
                                {/* ADMISIÓN */}
                                <td className="py-2 px-3 text-center border-l border-slate-200">
                                  {row.admision2027 != null && row.admision2027 > 0 ? (
                                    <span className="inline-flex items-center justify-center w-7 h-6 rounded bg-[#84cc16] text-white font-black text-xs shadow-xs ring-1 ring-lime-600/30">
                                      {row.admision2027}
                                    </span>
                                  ) : (
                                    <span className="text-slate-300 font-semibold">—</span>
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>

                        {/* Fila Total */}
                        <tfoot>
                          {(() => {
                            const fmtTot = (v: number) => (Number.isInteger(v) ? v.toString() : v.toFixed(1).replace(".", ","));
                            const tot = deptBalanceTotal;
                            if (modoVistaCohorte === "resumido") {
                              return (
                                <tr className="bg-slate-100 font-black text-slate-900 border-t-2 border-slate-300 text-right">
                                  <td className="py-2.5 px-3 text-left font-black border-r border-slate-300">
                                    TOTAL BOLIVIA
                                  </td>
                                  <td className="py-2.5 px-3 border-r border-slate-200">{fmtTot(tot.y2027.real)}</td>
                                  <td className="py-2.5 px-3 border-r border-slate-200">{fmtTot(tot.y2028.real)}</td>
                                  <td className="py-2.5 px-3 border-r border-slate-200">{fmtTot(tot.y2029.real)}</td>
                                  <td className="py-2.5 px-3 border-r border-slate-200">{fmtTot(tot.y2030.real)}</td>
                                  <td className="py-2.5 px-3 border-r border-slate-300 font-black bg-emerald-100/40">{fmtTot(tot.y2031.real)}</td>
                                  <td className="py-2.5 px-3 text-center border-l border-slate-300">
                                    <span className="inline-flex items-center justify-center px-2 py-0.5 rounded bg-lime-700 text-white font-black text-xs shadow-xs">
                                      {tot.admision2027} cursos
                                    </span>
                                  </td>
                                </tr>
                              );
                            }

                            return (
                              <tr className="bg-slate-100 font-black text-slate-900 border-t-2 border-slate-300 text-right">
                                <td className="py-2.5 px-3 text-left font-black border-r border-slate-300">
                                  TOTAL BOLIVIA
                                </td>
                                <td className="py-2.5 px-2 border-r border-slate-200">{fmtTot(tot.y2027.demanda)}</td>
                                <td className="py-2.5 px-2 border-r border-slate-200 text-slate-700">{fmtTot(tot.y2027.egresados)}</td>
                                <td className="py-2.5 px-2 border-r border-slate-300 bg-slate-200/50">{fmtTot(tot.y2027.real)}</td>

                                <td className="py-2.5 px-2 border-r border-slate-200">{fmtTot(tot.y2028.demanda)}</td>
                                <td className="py-2.5 px-2 border-r border-slate-200 text-slate-700">{fmtTot(tot.y2028.egresados)}</td>
                                <td className="py-2.5 px-2 border-r border-slate-300 bg-amber-100/40">{fmtTot(tot.y2028.real)}</td>

                                <td className="py-2.5 px-2 border-r border-slate-200">{fmtTot(tot.y2029.demanda)}</td>
                                <td className="py-2.5 px-2 border-r border-slate-200 text-slate-700">{fmtTot(tot.y2029.egresados)}</td>
                                <td className="py-2.5 px-2 border-r border-slate-300 bg-sky-100/40">{fmtTot(tot.y2029.real)}</td>

                                <td className="py-2.5 px-2 border-r border-slate-200">{fmtTot(tot.y2030.demanda)}</td>
                                <td className="py-2.5 px-2 border-r border-slate-200 text-slate-700">{fmtTot(tot.y2030.egresados)}</td>
                                <td className="py-2.5 px-2 border-r border-slate-300 bg-slate-200/50">{fmtTot(tot.y2030.real)}</td>

                                <td className="py-2.5 px-2 border-r border-slate-200">{fmtTot(tot.y2031.demanda)}</td>
                                <td className="py-2.5 px-2 border-r border-slate-200 text-slate-700">{fmtTot(tot.y2031.egresados)}</td>
                                <td className="py-2.5 px-2 border-r border-slate-300 bg-emerald-100/40">{fmtTot(tot.y2031.real)}</td>

                                <td className="py-2.5 px-3 text-center border-l border-slate-300">
                                  <span className="inline-flex items-center justify-center px-2 py-0.5 rounded bg-lime-700 text-white font-black text-xs shadow-xs">
                                    {tot.admision2027} cursos
                                  </span>
                                </td>
                              </tr>
                            );
                          })()}
                        </tfoot>
                      </table>
                    </div>

                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-[11px] text-slate-500 pt-2 border-t border-slate-100">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-700">Fórmula de Cohortes:</span>
                        <span>Demanda Ítems (t) = Demanda Real (t-1)</span>
                        <span>·</span>
                        <span>Demanda Real (t) = Demanda Ítems (t) − Egresados (t)</span>
                      </div>
                      <div className="text-slate-600 font-semibold">
                        * Criterio Admisión 2027: A partir de 6 docentes de demanda real en 2031 se cuenta 1 paralelo (base 30 doc.). Potosí: 101/30 = 3 paralelos.
                      </div>
                    </div>
                  </div>
                )}
              </div>'''

c = c[:pos_start] + new_jsx + c[pos_end:]

with open('src/components/dashboard/views/Exposicion2031View.tsx', 'w', encoding='utf-8') as f:
    f.write(c)

print('SUCCESS: Matriz Macro General and enhanced cohorte view applied successfully')
