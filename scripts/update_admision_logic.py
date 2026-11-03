with open('src/components/dashboard/views/Exposicion2031View.tsx', 'r', encoding='utf-8') as f:
    c = f.read()

# 1. Función helper para cálculo de admisión y actualización de MATEMATICA_DEPT_BALANCE
old_balance = '''// Datos auditados exactos para Matemática (Nivel Secundaria) según reporte oficial UIE / DGFM / INE
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

new_balance = '''// Regla oficial de Apertura de Especialidad (30 docentes por paralelo, mínimo 6 docentes de demanda real)
export function calcularParalelosAdmision(demandaReal2031: number): number | null {
  if (demandaReal2031 < 6) return null;
  return Math.max(1, Math.round(demandaReal2031 / 30));
}

// Datos auditados exactos para Matemática (Nivel Secundaria) según reporte oficial UIE / DGFM / INE
export const MATEMATICA_DEPT_BALANCE: DeptBalanceFila[] = [
  { departamento: "BENI", y2027: { demanda: 46, egresados: 0, real: 46 }, y2028: { demanda: 46, egresados: 27, real: 19 }, y2029: { demanda: 19, egresados: 68, real: -49 }, y2030: { demanda: -49, egresados: 0, real: -49 }, y2031: { demanda: -49, egresados: 45.5, real: -94.5 }, admision2027: calcularParalelosAdmision(-94.5) },
  { departamento: "LA PAZ", y2027: { demanda: 131, egresados: 21, real: 110 }, y2028: { demanda: 110, egresados: 19, real: 91 }, y2029: { demanda: 91, egresados: 30, real: 61 }, y2030: { demanda: 61, egresados: 0, real: 61 }, y2031: { demanda: 61, egresados: 35, real: 26 }, admision2027: calcularParalelosAdmision(26) },
  { departamento: "SANTA CRUZ", y2027: { demanda: 112, egresados: 0, real: 112 }, y2028: { demanda: 112, egresados: 0, real: 112 }, y2029: { demanda: 112, egresados: 32, real: 80 }, y2030: { demanda: 80, egresados: 0, real: 80 }, y2031: { demanda: 80, egresados: 131, real: -51 }, admision2027: calcularParalelosAdmision(-51) },
  { departamento: "PANDO", y2027: { demanda: 12, egresados: 23, real: -11 }, y2028: { demanda: -11, egresados: 13, real: -24 }, y2029: { demanda: -24, egresados: 0, real: -24 }, y2030: { demanda: -24, egresados: 28, real: -52 }, y2031: { demanda: -52, egresados: 61, real: -113 }, admision2027: calcularParalelosAdmision(-113) },
  { departamento: "POTOSI", y2027: { demanda: 101, egresados: 0, real: 101 }, y2028: { demanda: 101, egresados: 0, real: 101 }, y2029: { demanda: 101, egresados: 0, real: 101 }, y2030: { demanda: 101, egresados: 0, real: 101 }, y2031: { demanda: 101, egresados: 0, real: 101 }, admision2027: calcularParalelosAdmision(101) },
  { departamento: "CHUQUISACA", y2027: { demanda: 17, egresados: 0, real: 17 }, y2028: { demanda: 17, egresados: 0, real: 17 }, y2029: { demanda: 17, egresados: 0, real: 17 }, y2030: { demanda: 17, egresados: 22, real: -5 }, y2031: { demanda: -5, egresados: 0, real: -5 }, admision2027: calcularParalelosAdmision(-5) },
  { departamento: "TARIJA", y2027: { demanda: 7, egresados: 0, real: 7 }, y2028: { demanda: 7, egresados: 0, real: 7 }, y2029: { demanda: 7, egresados: 34, real: -27 }, y2030: { demanda: -27, egresados: 31, real: -58 }, y2031: { demanda: -58, egresados: 0, real: -58 }, admision2027: calcularParalelosAdmision(-58) },
  { departamento: "ORURO", y2027: { demanda: 21, egresados: 0, real: 21 }, y2028: { demanda: 21, egresados: 0, real: 21 }, y2029: { demanda: 21, egresados: 0, real: 21 }, y2030: { demanda: 21, egresados: 0, real: 21 }, y2031: { demanda: 21, egresados: 0, real: 21 }, admision2027: calcularParalelosAdmision(21) },
  { departamento: "COCHABAMBA", y2027: { demanda: 60, egresados: 27, real: 33 }, y2028: { demanda: 33, egresados: 27, real: 6 }, y2029: { demanda: 6, egresados: 0, real: 6 }, y2030: { demanda: 6, egresados: 0, real: 6 }, y2031: { demanda: 6, egresados: 0, real: 6 }, admision2027: calcularParalelosAdmision(6) },
];'''

assert old_balance in c, 'old_balance no encontrado'
c = c.replace(old_balance, new_balance, 1)

# 2. Reemplazar la asignación dinámica
old_dyn = '''      // Apertura de Especialidad al 2031 para cubrir 30 docentes por curso/paralelo
      const admision2027 = real2031 >= 20 ? Math.round(real2031 / 30) : null;'''

new_dyn = '''      // Apertura de Especialidad al 2031 (30 docentes por paralelo, mínimo 6 de demanda real)
      const admision2027 = calcularParalelosAdmision(real2031);'''

assert old_dyn in c, 'old_dyn no encontrado'
c = c.replace(old_dyn, new_dyn, 1)

# 3. Actualizar la nota de la fórmula en el footer de la tabla
old_footer_note = '''                  <div className="text-slate-600 font-semibold">
                    * Si Demanda Real &lt; 0 indica superávit acumulado de docentes en el departamento.
                  </div>'''

new_footer_note = '''                  <div className="text-slate-600 font-semibold">
                    * Criterio Admisión 2027: Desde 6 docentes de demanda real en 2031 cuenta como paralelo (base 30 docentes/curso). Potosí: 101/30 = 3 paralelos.
                  </div>'''

assert old_footer_note in c, 'old_footer_note no encontrado'
c = c.replace(old_footer_note, new_footer_note, 1)

with open('src/components/dashboard/views/Exposicion2031View.tsx', 'w', encoding='utf-8') as f:
    f.write(c)

print('SUCCESS: Updated admision 2027 logic successfully')
