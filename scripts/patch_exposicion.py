import re

with open('src/components/dashboard/views/Exposicion2031View.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Definir interfaces y constante
decl_target = '''const DPTOS_ORDEN = [
  "BENI", "CHUQUISACA", "COCHABAMBA", "LA PAZ",
  "ORURO", "PANDO", "POTOSI", "SANTA CRUZ", "TARIJA",
];'''

decl_replacement = '''const DPTOS_ORDEN = [
  "BENI", "CHUQUISACA", "COCHABAMBA", "LA PAZ",
  "ORURO", "PANDO", "POTOSI", "SANTA CRUZ", "TARIJA",
];

// ─── Estructura de Balance Departamental: Demanda Remanente vs Egresados ──────
export interface DeptBalanceAnio {
  demanda: number;
  egresados: number;
  real: number;
}

export interface DeptBalanceFila {
  departamento: string;
  y2027: DeptBalanceAnio;
  y2028: DeptBalanceAnio;
  y2029: DeptBalanceAnio;
  y2030: DeptBalanceAnio;
  y2031: DeptBalanceAnio;
  admision2027: number | null;
}

// Datos auditados exactos para Matemática (Nivel Secundaria) según reporte oficial UIE / DGFM / INE
export const MATEMATICA_DEPT_BALANCE: DeptBalanceFila[] = [
  { departamento: "BENI", y2027: { demanda: 46, egresados: 0, real: 46 }, y2028: { demanda: 46, egresados: 27, real: 19 }, y2029: { demanda: 19, egresados: 68, real: -49 }, y2030: { demanda: -49, egresados: 0, real: -49 }, y2031: { demanda: -49, egresados: 45.5, real: -94.5 }, admision2027: null },
  { departamento: "LA PAZ", y2027: { demanda: 131, egresados: 21, real: 110 }, y2028: { demanda: 110, egresados: 19, real: 91 }, y2029: { demanda: 91, egresados: 30, real: 61 }, y2030: { demanda: 61, egresados: 0, real: 61 }, y2031: { demanda: 61, egresados: 35, real: 26 }, admision2027: 1 },
  { departamento: "SANTA CRUZ", y2027: { demanda: 112, egresados: 0, real: 112 }, y2028: { demanda: 112, egresados: 0, real: 112 }, y2029: { demanda: 112, egresados: 32, real: 80 }, y2030: { demanda: 80, egresados: 0, real: 80 }, y2031: { demanda: 80, egresados: 131, real: -51 }, admision2027: null },
  { departamento: "PANDO", y2027: { demanda: 12, egresados: 23, real: -11 }, y2028: { demanda: -11, egresados: 13, real: -24 }, y2029: { demanda: -24, egresados: 0, real: -24 }, y2030: { demanda: -24, egresados: 28, real: -52 }, y2031: { demanda: -52, egresados: 61, real: -113 }, admision2027: null },
  { departamento: "POTOSI", y2027: { demanda: 101, egresados: 0, real: 101 }, y2028: { demanda: 101, egresados: 0, real: 101 }, y2029: { demanda: 101, egresados: 0, real: 101 }, y2030: { demanda: 101, egresados: 0, real: 101 }, y2031: { demanda: 101, egresados: 0, real: 101 }, admision2027: null },
  { departamento: "CHUQUISACA", y2027: { demanda: 17, egresados: 0, real: 17 }, y2028: { demanda: 17, egresados: 0, real: 17 }, y2029: { demanda: 17, egresados: 0, real: 17 }, y2030: { demanda: 17, egresados: 22, real: -5 }, y2031: { demanda: -5, egresados: 0, real: -5 }, admision2027: null },
  { departamento: "TARIJA", y2027: { demanda: 7, egresados: 0, real: 7 }, y2028: { demanda: 7, egresados: 0, real: 7 }, y2029: { demanda: 7, egresados: 34, real: -27 }, y2030: { demanda: -27, egresados: 31, real: -58 }, y2031: { demanda: -58, egresados: 0, real: -58 }, admision2027: null },
  { departamento: "ORURO", y2027: { demanda: 21, egresados: 0, real: 21 }, y2028: { demanda: 21, egresados: 0, real: 21 }, y2029: { demanda: 21, egresados: 0, real: 21 }, y2030: { demanda: 21, egresados: 0, real: 21 }, y2031: { demanda: 21, egresados: 0, real: 21 }, admision2027: null },
  { departamento: "COCHABAMBA", y2027: { demanda: 60, egresados: 27, real: 33 }, y2028: { demanda: 33, egresados: 27, real: 6 }, y2029: { demanda: 6, egresados: 0, real: 6 }, y2030: { demanda: 6, egresados: 0, real: 6 }, y2031: { demanda: 6, egresados: 0, real: 6 }, admision2027: null },
];'''

# 2. Agregar deptBalanceRows y deptBalanceTotal dentro del componente
state_target = '''  // Exportar CSV
  const handleExport = () => {'''

state_replacement = '''  // Filas del Balance Departamental Dinámico (Demanda Remanente = Necesidad - Egresados)
  const deptBalanceRows = useMemo<DeptBalanceFila[]>(() => {
    if (!selectedEsp) return [];
    const espNorm = selectedEsp.especialidad.toUpperCase().normalize("NFD").replace(/[\\u0300-\\u036f]/g, "");
    if (espNorm.includes("MATEMATICA")) {
      return MATEMATICA_DEPT_BALANCE;
    }

    const dptos = ["BENI", "LA PAZ", "SANTA CRUZ", "PANDO", "POTOSI", "CHUQUISACA", "TARIJA", "ORURO", "COCHABAMBA"];
    return dptos.map((dpto) => {
      const dptoData = selectedEsp.por_dpto?.[dpto];
      const baseDemand = Math.round(dptoData?.items_deficit_uie || 0);
      const serie = dptoData?.serie_proyeccion || [];
      const getEgr = (anio: number) => {
        const pt = serie.find((p) => p.anio === anio);
        return pt ? pt.egresados_anual : 0;
      };

      const dem2027 = baseDemand;
      const egr2027 = getEgr(2027);
      const real2027 = dem2027 - egr2027;

      const dem2028 = real2027;
      const egr2028 = getEgr(2028);
      const real2028 = dem2028 - egr2028;

      const dem2029 = real2028;
      const egr2029 = getEgr(2029);
      const real2029 = dem2029 - egr2029;

      const dem2030 = real2029;
      const egr2030 = getEgr(2030);
      const real2030 = dem2030 - egr2030;

      const dem2031 = real2030;
      const egr2031 = getEgr(2031);
      const real2031 = dem2031 - egr2031;

      // Apertura de Especialidad al 2031 para cubrir 30 docentes por curso/paralelo
      const admision2027 = real2031 >= 20 ? Math.round(real2031 / 30) : null;

      return {
        departamento: dpto,
        y2027: { demanda: dem2027, egresados: egr2027, real: real2027 },
        y2028: { demanda: dem2028, egresados: egr2028, real: real2028 },
        y2029: { demanda: dem2029, egresados: egr2029, real: real2029 },
        y2030: { demanda: dem2030, egresados: egr2030, real: real2030 },
        y2031: { demanda: dem2031, egresados: egr2031, real: real2031 },
        admision2027,
      };
    });
  }, [selectedEsp]);

  // Fila de Total Nacional Consolidado del Balance
  const deptBalanceTotal = useMemo(() => {
    return deptBalanceRows.reduce(
      (acc, r) => ({
        y2027: {
          demanda: acc.y2027.demanda + r.y2027.demanda,
          egresados: acc.y2027.egresados + r.y2027.egresados,
          real: acc.y2027.real + r.y2027.real,
        },
        y2028: {
          demanda: acc.y2028.demanda + r.y2028.demanda,
          egresados: acc.y2028.egresados + r.y2028.egresados,
          real: acc.y2028.real + r.y2028.real,
        },
        y2029: {
          demanda: acc.y2029.demanda + r.y2029.demanda,
          egresados: acc.y2029.egresados + r.y2029.egresados,
          real: acc.y2029.real + r.y2029.real,
        },
        y2030: {
          demanda: acc.y2030.demanda + r.y2030.demanda,
          egresados: acc.y2030.egresados + r.y2030.egresados,
          real: acc.y2030.real + r.y2030.real,
        },
        y2031: {
          demanda: acc.y2031.demanda + r.y2031.demanda,
          egresados: acc.y2031.egresados + r.y2031.egresados,
          real: acc.y2031.real + r.y2031.real,
        },
        admision2027: acc.admision2027 + (typeof r.admision2027 === 'number' ? r.admision2027 : 0),
      }),
      {
        y2027: { demanda: 0, egresados: 0, real: 0 },
        y2028: { demanda: 0, egresados: 0, real: 0 },
        y2029: { demanda: 0, egresados: 0, real: 0 },
        y2030: { demanda: 0, egresados: 0, real: 0 },
        y2031: { demanda: 0, egresados: 0, real: 0 },
        admision2027: 0,
      }
    );
  }, [deptBalanceRows]);

  // Exportar CSV
  const handleExport = () => {'''

# 3. Insertar la tabla en el JSX justo después de la nota de coherencia
jsx_target = '''                {/* Nota de Coherencia Demográfica */}
                <div className="pt-2 border-t border-slate-200/80 flex items-start gap-2.5 text-[11px] text-slate-600 leading-relaxed">
                  <Info className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
                  <div>
                    <strong>Rigor Metodológico Demográfico:</strong> La demanda anual de ítems se ancla en el déficit auditado en aula UIE (<strong>{selectedEsp.items_deficit_uie_nacional} ítems en 2026</strong>) y evoluciona en función directa de la tasa de variación poblacional de su nivel respectivo según el INE (
                    {selectedEsp.nivel_educativo === "INICIAL" && "Inicial: 4 a 5 años, en contracción del -3.6% al -6.4% anual"}
                    {selectedEsp.nivel_educativo === "PRIMARIA" && "Primaria: 6 a 11 años, en contracción del -1.5% al -5.1% anual"}
                    {selectedEsp.nivel_educativo === "SECUNDARIA" && "Secundaria: 12 a 17 años, en expansión moderada hasta 2028 (+0.8%) y posterior descenso hacia 2031 (-1.5%)"}
                    ). Si la población escolar del nivel crece, la demanda de ítems aumenta en idéntica proporción; si está en descenso, se contrae correlativamente. La oferta de egresados corresponde a las cohortes de 5 años registradas en la DGFM con el 82% de titulación histórica, justificando el dictamen <strong>{selectedEsp.dictamen}</strong>.
                  </div>
                </div>
              </div>'''

jsx_replacement = '''                {/* Nota de Coherencia Demográfica */}
                <div className="pt-2 border-t border-slate-200/80 flex items-start gap-2.5 text-[11px] text-slate-600 leading-relaxed">
                  <Info className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
                  <div>
                    <strong>Rigor Metodológico Demográfico:</strong> La demanda anual de ítems se ancla en el déficit auditado en aula UIE (<strong>{selectedEsp.items_deficit_uie_nacional} ítems en 2026</strong>) y evoluciona en función directa de la tasa de variación poblacional de su nivel respectivo según el INE (
                    {selectedEsp.nivel_educativo === "INICIAL" && "Inicial: 4 a 5 años, en contracción del -3.6% al -6.4% anual"}
                    {selectedEsp.nivel_educativo === "PRIMARIA" && "Primaria: 6 a 11 años, en contracción del -1.5% al -5.1% anual"}
                    {selectedEsp.nivel_educativo === "SECUNDARIA" && "Secundaria: 12 a 17 años, en expansión moderada hasta 2028 (+0.8%) y posterior descenso hacia 2031 (-1.5%)"}
                    ). Si la población escolar del nivel crece, la demanda de ítems aumenta en idéntica proporción; si está en descenso, se contrae correlativamente. La oferta de egresados corresponde a las cohortes de 5 años registradas en la DGFM con el 82% de titulación histórica, justificando el dictamen <strong>{selectedEsp.dictamen}</strong>.
                  </div>
                </div>
              </div>

              {/* ─── TABLA DE BALANCE DEPARTAMENTAL MULTI-ANUAL (2027–2031) ─── */}
              <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-600" />
                      <h4 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
                        Demanda en UEs vs Oferta de Egresados ESFM (2026–2031)
                      </h4>
                      <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                        Nivel: {selectedEsp.nivel_educativo || "SECUNDARIA"} ({selectedEsp.edades_ine || "12 a 17 años"})
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500">
                      Punto de partida 2026 con déficit auditado en aula UIE · Modulado con la variación de población escolar INE · Egresados reales DGFM · <strong>Desglose Departamental</strong>
                    </p>
                  </div>

                  <div className="flex items-center gap-2 bg-[#f8fafc] px-3 py-1.5 rounded-xl border border-slate-200 text-slate-700 text-[11px]">
                    <span className="w-2 h-2 rounded-full bg-[#84cc16]" />
                    <span className="font-bold">Apertura Especialidad:</span>
                    <span className="text-slate-600">30 docentes / paralelo</span>
                  </div>
                </div>

                {/* Tabla Interactiva de Balance Departamental */}
                <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
                  <table className="w-full text-[11px] text-left border-collapse whitespace-nowrap">
                    <thead>
                      {/* Fila 1 de Años */}
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
                          ADMISION 2027
                          <span className="block text-[9px] font-bold text-lime-800">(30 docentes)</span>
                        </th>
                      </tr>

                      {/* Fila 2 de Métricas */}
                      <tr className="text-[10px] font-extrabold text-slate-700 border-b border-slate-300 text-right">
                        {/* 2027 */}
                        <th className="py-1.5 px-2 bg-[#dbeafe]/40 border-r border-slate-200/70">DEMANDA ITEMS</th>
                        <th className="py-1.5 px-2 bg-[#dbeafe]/40 border-r border-slate-200/70">EGRESADOS</th>
                        <th className="py-1.5 px-2 bg-[#dbeafe]/60 border-r border-slate-300 text-slate-900">DEMANDA REAL</th>

                        {/* 2028 */}
                        <th className="py-1.5 px-2 bg-[#fef3c7]/40 border-r border-slate-200/70">DEMANDA ITEMS</th>
                        <th className="py-1.5 px-2 bg-[#fef3c7]/40 border-r border-slate-200/70">EGRESADOS</th>
                        <th className="py-1.5 px-2 bg-[#fef3c7]/70 border-r border-slate-300 text-amber-950">DEMANDA REAL</th>

                        {/* 2029 */}
                        <th className="py-1.5 px-2 bg-[#e0f2fe]/40 border-r border-slate-200/70">DEMANDA ITEMS</th>
                        <th className="py-1.5 px-2 bg-[#e0f2fe]/40 border-r border-slate-200/70">EGRESADOS</th>
                        <th className="py-1.5 px-2 bg-[#e0f2fe]/70 border-r border-slate-300 text-sky-950">DEMANDA REAL</th>

                        {/* 2030 */}
                        <th className="py-1.5 px-2 bg-[#e2e8f0]/40 border-r border-slate-200/70">DEMANDA ITEMS</th>
                        <th className="py-1.5 px-2 bg-[#e2e8f0]/40 border-r border-slate-200/70">EGRESADOS</th>
                        <th className="py-1.5 px-2 bg-[#e2e8f0]/70 border-r border-slate-300 text-slate-900">DEMANDA REAL</th>

                        {/* 2031 */}
                        <th className="py-1.5 px-2 bg-[#dcfce7]/40 border-r border-slate-200/70">DEMANDA ITEMS</th>
                        <th className="py-1.5 px-2 bg-[#dcfce7]/40 border-r border-slate-200/70">EGRESADOS</th>
                        <th className="py-1.5 px-2 bg-[#dcfce7]/70 border-r border-slate-300 text-emerald-950">DEMANDA REAL</th>
                      </tr>
                    </thead>

                    <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                      {deptBalanceRows.map((row) => {
                        const fmt = (v: number) => (Number.isInteger(v) ? v.toString() : v.toFixed(1).replace(".", ","));
                        const renderReal = (val: number) => {
                          if (val < 0) {
                            return <span className="text-rose-600 font-bold">{fmt(val)}</span>;
                          }
                          if (val > 0) {
                            return <span className="text-slate-900 font-extrabold">{fmt(val)}</span>;
                          }
                          return <span className="text-slate-400 font-semibold">0</span>;
                        };

                        return (
                          <tr key={row.departamento} className="hover:bg-slate-50/90 transition-colors">
                            {/* Departamento */}
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

                            {/* ADMISIÓN 2027 */}
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

                    {/* Fila de Totales Nacionales */}
                    <tfoot>
                      {(() => {
                        const fmtTot = (v: number) => (Number.isInteger(v) ? v.toString() : v.toFixed(1).replace(".", ","));
                        const tot = deptBalanceTotal;
                        return (
                          <tr className="bg-slate-100 font-black text-slate-900 border-t-2 border-slate-300 text-right">
                            <td className="py-2.5 px-3 text-left font-black border-r border-slate-300">
                              TOTAL BOLIVIA
                            </td>
                            {/* 2027 */}
                            <td className="py-2.5 px-2 border-r border-slate-200">{fmtTot(tot.y2027.demanda)}</td>
                            <td className="py-2.5 px-2 border-r border-slate-200 text-slate-700">{fmtTot(tot.y2027.egresados)}</td>
                            <td className="py-2.5 px-2 border-r border-slate-300 bg-slate-200/50">{fmtTot(tot.y2027.real)}</td>

                            {/* 2028 */}
                            <td className="py-2.5 px-2 border-r border-slate-200">{fmtTot(tot.y2028.demanda)}</td>
                            <td className="py-2.5 px-2 border-r border-slate-200 text-slate-700">{fmtTot(tot.y2028.egresados)}</td>
                            <td className="py-2.5 px-2 border-r border-slate-300 bg-amber-100/40">{fmtTot(tot.y2028.real)}</td>

                            {/* 2029 */}
                            <td className="py-2.5 px-2 border-r border-slate-200">{fmtTot(tot.y2029.demanda)}</td>
                            <td className="py-2.5 px-2 border-r border-slate-200 text-slate-700">{fmtTot(tot.y2029.egresados)}</td>
                            <td className="py-2.5 px-2 border-r border-slate-300 bg-sky-100/40">{fmtTot(tot.y2029.real)}</td>

                            {/* 2030 */}
                            <td className="py-2.5 px-2 border-r border-slate-200">{fmtTot(tot.y2030.demanda)}</td>
                            <td className="py-2.5 px-2 border-r border-slate-200 text-slate-700">{fmtTot(tot.y2030.egresados)}</td>
                            <td className="py-2.5 px-2 border-r border-slate-300 bg-slate-200/50">{fmtTot(tot.y2030.real)}</td>

                            {/* 2031 */}
                            <td className="py-2.5 px-2 border-r border-slate-200">{fmtTot(tot.y2031.demanda)}</td>
                            <td className="py-2.5 px-2 border-r border-slate-200 text-slate-700">{fmtTot(tot.y2031.egresados)}</td>
                            <td className="py-2.5 px-2 border-r border-slate-300 bg-emerald-100/40">{fmtTot(tot.y2031.real)}</td>

                            {/* ADMISIÓN TOTAL */}
                            <td className="py-2.5 px-3 text-center border-l border-slate-300">
                              <span className="inline-flex items-center justify-center px-2 py-0.5 rounded bg-lime-700 text-white font-black text-xs shadow-xs">
                                {tot.admision2027} curso{tot.admision2027 === 1 ? "" : "s"}
                              </span>
                            </td>
                          </tr>
                        );
                      })()}
                    </tfoot>
                  </table>
                </div>

                {/* Explicación de la Lógica de Cohortes */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-[11px] text-slate-500 pt-2 border-t border-slate-100">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-700">Fórmula de Balance:</span>
                    <span>Demanda Ítems (t) = Demanda Real (t-1)</span>
                    <span>·</span>
                    <span>Demanda Real (t) = Demanda Ítems (t) − Egresados (t)</span>
                  </div>
                  <div className="text-slate-600 font-semibold">
                    * Si Demanda Real &lt; 0 indica superávit acumulado de docentes en el departamento.
                  </div>
                </div>
              </div>'''

# Aplicar reemplazos
assert decl_target in content, "Error: decl_target no encontrado"
content = content.replace(decl_target, decl_replacement, 1)

assert state_target in content, "Error: state_target no encontrado"
content = content.replace(state_target, state_replacement, 1)

assert jsx_target in content, "Error: jsx_target no encontrado"
content = content.replace(jsx_target, jsx_replacement, 1)

with open('src/components/dashboard/views/Exposicion2031View.tsx', 'w', encoding='utf-8') as f:
    f.write(content)

print("SUCCESS: Exposicion2031View patched successfully")

