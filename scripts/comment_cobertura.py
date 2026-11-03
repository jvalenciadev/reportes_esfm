with open('src/components/dashboard/views/Exposicion2031View.tsx', 'r', encoding='utf-8') as f:
    c = f.read()

# 1. Comentar en thead
old_th = '''                    <th className="px-3 py-2.5 text-emerald-700">Cobertura Pública (SIE/INE)</th>
                    <th className="px-3 py-2.5">Var. INE (24→31)</th>'''

new_th = '''                    {/* <th className="px-3 py-2.5 text-emerald-700">Cobertura Pública (SIE/INE)</th> */}
                    {/* <th className="px-3 py-2.5">Var. INE (24→31)</th> */}'''

assert old_th in c, 'old_th no encontrado'
c = c.replace(old_th, new_th, 1)

# 2. Comentar en tbody
old_td = '''                      <td className="px-3 py-2.5 font-black text-emerald-700">{dpto.tasa_cobertura_publica}%</td>
                      <td className={`px-3 py-2.5 font-black ${dpto.variacion_pct < 0 ? "text-rose-600" : "text-emerald-600"}`}>
                        {dpto.variacion_pct > 0 ? "+" : ""}{dpto.variacion_pct}%
                      </td>'''

new_td = '''                      {/* <td className="px-3 py-2.5 font-black text-emerald-700">{dpto.tasa_cobertura_publica}%</td> */}
                      {/* <td className={`px-3 py-2.5 font-black ${dpto.variacion_pct < 0 ? "text-rose-600" : "text-emerald-600"}`}>
                        {dpto.variacion_pct > 0 ? "+" : ""}{dpto.variacion_pct}%
                      </td> */}'''

assert old_td in c, 'old_td no encontrado'
c = c.replace(old_td, new_td, 1)

# 3. Comentar en tfoot
old_tot = '''                    <td className="px-3 py-2.5 font-black text-emerald-800">{TASA_COBERTURA_PUBLICA_2026}%</td>
                    <td className="px-3 py-2.5 text-rose-700">-13.0%</td>'''

new_tot = '''                    {/* <td className="px-3 py-2.5 font-black text-emerald-800">{TASA_COBERTURA_PUBLICA_2026}%</td> */}
                    {/* <td className="px-3 py-2.5 text-rose-700">-13.0%</td> */}'''

assert old_tot in c, 'old_tot no encontrado'
c = c.replace(old_tot, new_tot, 1)

with open('src/components/dashboard/views/Exposicion2031View.tsx', 'w', encoding='utf-8') as f:
    f.write(c)

print('Commented out successfully')
