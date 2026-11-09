"""
Patch HistorialDocenteView.tsx with robust null-safety and support for alternative json key names.
"""

PATH = "src/components/dashboard/views/HistorialDocenteView.tsx"

with open(PATH, encoding="utf-8") as f:
    content = f.read()

# 1. Update interfaces
old_interfaces = """interface DptoSalienteEntrante {
  departamento: string;
  salientes: number;
  entrantes: number;
  neto: number;
}

interface SalientesData {
  total_regular_2024: number;
  total_regular_2025: number;
  variacion_neta: number;
  por_departamento: DptoSalienteEntrante[];
}

interface DptoImpertinencia {
  departamento: string;
  total_docentes: number;
  impertinentes: number;
  porcentaje: number;
}

interface ImpertinenciasData {
  total_docentes: number;
  total_impertinentes: number;
  porcentaje_nacional: number;
  por_departamento: DptoImpertinencia[];
}

interface DptoSinCargo {
  departamento: string;
  sin_cargo?: number;
  sin_presencia?: number;
}"""

new_interfaces = """interface DptoSalienteEntrante {
  departamento: string;
  salientes: number;
  entrantes: number;
  neto: number;
  salientes_2024_2025?: number;
  entrantes_2024_2025?: number;
}

interface SalientesData {
  total_regular_2024: number;
  total_regular_2025: number;
  variacion_neta?: number;
  total_salientes?: number;
  total_entrantes?: number;
  por_departamento: DptoSalienteEntrante[];
}

interface DptoImpertinencia {
  departamento: string;
  total_docentes: number;
  impertinentes: number;
  porcentaje: number;
}

interface ImpertinenciasData {
  total_docentes?: number;
  total_docentes_2026?: number;
  total_impertinentes: number;
  porcentaje_nacional?: number;
  por_departamento: DptoImpertinencia[];
}

interface DptoSinCargo {
  departamento: string;
  sin_cargo?: number;
  sin_presencia?: number;
  sin_presencia_2026?: number;
}"""

content = content.replace(old_interfaces, new_interfaces)
content = content.replace(old_interfaces.replace("\n", "\r\n"), new_interfaces.replace("\n", "\r\n"))

# 2. In combinedSinCargo: support sin_presencia_2026
old_sin_pres = """          sinPresencia: r.sin_presencia ?? 0,
        };
      } else {
        map[r.departamento].sinPresencia = r.sin_presencia ?? 0;"""

new_sin_pres = """          sinPresencia: r.sin_presencia ?? r.sin_presencia_2026 ?? 0,
        };
      } else {
        map[r.departamento].sinPresencia = r.sin_presencia ?? r.sin_presencia_2026 ?? 0;"""

content = content.replace(old_sin_pres, new_sin_pres)
content = content.replace(old_sin_pres.replace("\n", "\r\n"), new_sin_pres.replace("\n", "\r\n"))

# 3. Safe variacion_neta calculation in Section 1 (Salientes)
old_salientes_kpi = """                  {/* Crecimiento Neto */}
                  <div className="bg-gradient-to-br from-indigo-900 to-slate-900 rounded-2xl p-4 text-white flex flex-col justify-between shadow-md">
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold text-indigo-300 uppercase tracking-wider">Balance Neto</span>
                        <TrendingUp className="w-4 h-4 text-emerald-400" />
                      </div>
                      <div className="text-2xl font-black text-emerald-400 mt-1">
                        +{salientes.variacion_neta.toLocaleString("es-BO")}
                      </div>
                    </div>
                    <div className="text-xs text-slate-300 mt-3 pt-2 border-t border-white/10">
                      Incremento neto de +0.78%
                    </div>
                  </div>"""

new_salientes_kpi = """                  {/* Crecimiento Neto */}
                  <div className="bg-gradient-to-br from-indigo-900 to-slate-900 rounded-2xl p-4 text-white flex flex-col justify-between shadow-md">
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold text-indigo-300 uppercase tracking-wider">Balance Neto</span>
                        <TrendingUp className="w-4 h-4 text-emerald-400" />
                      </div>
                      <div className="text-2xl font-black text-emerald-400 mt-1">
                        +{((salientes.variacion_neta ?? (salientes.total_regular_2025 - salientes.total_regular_2024)) ?? 0).toLocaleString("es-BO")}
                      </div>
                    </div>
                    <div className="text-xs text-slate-300 mt-3 pt-2 border-t border-white/10">
                      Incremento neto de +0.78%
                    </div>
                  </div>"""

content = content.replace(old_salientes_kpi, new_salientes_kpi)
content = content.replace(old_salientes_kpi.replace("\n", "\r\n"), new_salientes_kpi.replace("\n", "\r\n"))

# 4. Table footer variacion_neta
old_footer = """                          <td className="py-3.5 px-4 font-black text-indigo-700">
                            +{salientes.variacion_neta.toLocaleString()}
                          </td>"""

new_footer = """                          <td className="py-3.5 px-4 font-black text-indigo-700">
                            +{((salientes.variacion_neta ?? (salientes.total_regular_2025 - salientes.total_regular_2024)) ?? 0).toLocaleString()}
                          </td>"""

content = content.replace(old_footer, new_footer)
content = content.replace(old_footer.replace("\n", "\r\n"), new_footer.replace("\n", "\r\n"))

# 5. Impertinencias tab null-safety
old_imp_header = """                    Índice Nacional: {impertinencias.porcentaje_nacional}%
                  </span>
                </div>

                {/* Barra Visual de Pertinencia Nacional */}
                <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200/80 space-y-3">
                  <div className="flex justify-between items-center text-xs">
                    <div className="flex items-center gap-2">
                      <span className="w-3 h-3 rounded-full bg-emerald-500" />
                      <span className="font-bold text-slate-700">
                        Pertinentes: {(impertinencias.total_docentes - impertinencias.total_impertinentes).toLocaleString("es-BO")}{" "}
                        <span className="text-slate-400 font-normal">
                          ({(100 - impertinencias.porcentaje_nacional).toFixed(2)}%)
                        </span>
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="w-3 h-3 rounded-full bg-amber-500" />
                      <span className="font-bold text-amber-700">
                        Impertinentes: {impertinencias.total_impertinentes.toLocaleString("es-BO")}{" "}
                        <span className="text-amber-500 font-normal">({impertinencias.porcentaje_nacional}%)</span>
                      </span>
                    </div>
                  </div>

                  <div className="h-4 w-full bg-slate-200 rounded-full overflow-hidden flex shadow-inner">
                    <div
                      className="h-full bg-gradient-to-r from-emerald-500 to-teal-500 transition-all duration-700"
                      style={{ width: `${100 - impertinencias.porcentaje_nacional}%` }}
                      title="Pertinentes"
                    />
                    <div
                      className="h-full bg-gradient-to-r from-amber-500 to-rose-500 transition-all duration-700"
                      style={{ width: `${impertinencias.porcentaje_nacional}%` }}
                      title="Impertinentes"
                    />
                  </div>"""

new_imp_header = """                    Índice Nacional: {impertinencias.porcentaje_nacional ?? ((impertinencias.total_impertinentes / ((impertinencias.total_docentes || impertinencias.total_docentes_2026) || 1)) * 100).toFixed(2)}%
                  </span>
                </div>

                {/* Barra Visual de Pertinencia Nacional */}
                <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200/80 space-y-3">
                  {(() => {
                    const totalDoc = impertinencias.total_docentes ?? impertinencias.total_docentes_2026 ?? 0;
                    const totalImp = impertinencias.total_impertinentes ?? 0;
                    const pctNac = impertinencias.porcentaje_nacional ?? (totalDoc > 0 ? Number(((totalImp / totalDoc) * 100).toFixed(2)) : 0);
                    return (
                      <>
                        <div className="flex justify-between items-center text-xs">
                          <div className="flex items-center gap-2">
                            <span className="w-3 h-3 rounded-full bg-emerald-500" />
                            <span className="font-bold text-slate-700">
                              Pertinentes: {(totalDoc - totalImp).toLocaleString("es-BO")}{" "}
                              <span className="text-slate-400 font-normal">
                                ({(100 - pctNac).toFixed(2)}%)
                              </span>
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="w-3 h-3 rounded-full bg-amber-500" />
                            <span className="font-bold text-amber-700">
                              Impertinentes: {totalImp.toLocaleString("es-BO")}{" "}
                              <span className="text-amber-500 font-normal">({pctNac}%)</span>
                            </span>
                          </div>
                        </div>

                        <div className="h-4 w-full bg-slate-200 rounded-full overflow-hidden flex shadow-inner">
                          <div
                            className="h-full bg-gradient-to-r from-emerald-500 to-teal-500 transition-all duration-700"
                            style={{ width: `${100 - pctNac}%` }}
                            title="Pertinentes"
                          />
                          <div
                            className="h-full bg-gradient-to-r from-amber-500 to-rose-500 transition-all duration-700"
                            style={{ width: `${pctNac}%` }}
                            title="Impertinentes"
                          />
                        </div>
                      </>
                    );
                  })()}"""

content = content.replace(old_imp_header, new_imp_header)
content = content.replace(old_imp_header.replace("\n", "\r\n"), new_imp_header.replace("\n", "\r\n"))

# 6. Impertinencias table footer
old_imp_footer = """                          <td className="py-3.5 px-4">{impertinencias.total_docentes.toLocaleString()}</td>
                          <td className="py-3.5 px-4 text-amber-600 font-black">{impertinencias.total_impertinentes.toLocaleString()}</td>
                          <td className="py-3.5 px-4 font-black text-rose-700">{impertinencias.porcentaje_nacional}%</td>"""

new_imp_footer = """                          <td className="py-3.5 px-4">{(impertinencias.total_docentes ?? impertinencias.total_docentes_2026 ?? 0).toLocaleString()}</td>
                          <td className="py-3.5 px-4 text-amber-600 font-black">{(impertinencias.total_impertinentes ?? 0).toLocaleString()}</td>
                          <td className="py-3.5 px-4 font-black text-rose-700">{impertinencias.porcentaje_nacional ?? (((impertinencias.total_impertinentes ?? 0) / ((impertinencias.total_docentes || impertinencias.total_docentes_2026) || 1)) * 100).toFixed(2)}%</td>"""

content = content.replace(old_imp_footer, new_imp_footer)
content = content.replace(old_imp_footer.replace("\n", "\r\n"), new_imp_footer.replace("\n", "\r\n"))

# 7. Safe access to d.salientes and d.entrantes in Card and Table
old_card_vars = """                    const salPct = ((d.salientes / maxSaliente) * 100).toFixed(0);
                    const entPct = ((d.entrantes / maxSaliente) * 100).toFixed(0);
                    const reposicion = (d.entrantes / (d.salientes || 1)).toFixed(2);"""

new_card_vars = """                    const dSal = d.salientes ?? d.salientes_2024_2025 ?? 0;
                    const dEnt = d.entrantes ?? d.entrantes_2024_2025 ?? 0;
                    const salPct = ((dSal / maxSaliente) * 100).toFixed(0);
                    const entPct = ((dEnt / maxSaliente) * 100).toFixed(0);
                    const reposicion = (dEnt / (dSal || 1)).toFixed(2);"""

content = content.replace(old_card_vars, new_card_vars)
content = content.replace(old_card_vars.replace("\n", "\r\n"), new_card_vars.replace("\n", "\r\n"))

old_d_sal_render = """<span className="font-bold text-slate-700">{d.salientes.toLocaleString()}</span>"""
new_d_sal_render = """<span className="font-bold text-slate-700">{(d.salientes ?? d.salientes_2024_2025 ?? 0).toLocaleString()}</span>"""
content = content.replace(old_d_sal_render, new_d_sal_render)

old_d_ent_render = """<span className="font-bold text-slate-700">{d.entrantes.toLocaleString()}</span>"""
new_d_ent_render = """<span className="font-bold text-slate-700">{(d.entrantes ?? d.entrantes_2024_2025 ?? 0).toLocaleString()}</span>"""
content = content.replace(old_d_ent_render, new_d_ent_render)

old_t_sal_render = """<td className="py-3.5 px-4 font-semibold text-rose-600">{r.salientes.toLocaleString()}</td>
                            <td className="py-3.5 px-4 font-semibold text-emerald-600">{r.entrantes.toLocaleString()}</td>"""
new_t_sal_render = """<td className="py-3.5 px-4 font-semibold text-rose-600">{(r.salientes ?? r.salientes_2024_2025 ?? 0).toLocaleString()}</td>
                            <td className="py-3.5 px-4 font-semibold text-emerald-600">{(r.entrantes ?? r.entrantes_2024_2025 ?? 0).toLocaleString()}</td>"""
content = content.replace(old_t_sal_render, new_t_sal_render)
content = content.replace(old_t_sal_render.replace("\n", "\r\n"), new_t_sal_render.replace("\n", "\r\n"))

with open(PATH, "w", encoding="utf-8") as f:
    f.write(content)

print("HistorialDocenteView.tsx successfully patched")

