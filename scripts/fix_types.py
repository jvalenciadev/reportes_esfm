with open('src/components/dashboard/views/Exposicion2031View.tsx', 'r', encoding='utf-8') as f:
    c = f.read()

# 1. Agregar serie_proyeccion a DptoDetalle
old_dpto = '  estado_dpto: "DEFICIT" | "EQUILIBRIO" | "SATURADO";\n}'
new_dpto = '''  estado_dpto: "DEFICIT" | "EQUILIBRIO" | "SATURADO";
  serie_proyeccion?: Array<{
    anio: number;
    demanda: number;
    var_poblacional_pct: number;
    egresados_anual: number;
    egresados_acumulados: number;
  }>;
}'''

assert old_dpto in c, 'old_dpto no encontrado'
c = c.replace(old_dpto, new_dpto, 1)

# 2. Tipar p en find
old_find = 'const pt = serie.find((p) => p.anio === anio);'
new_find = 'const pt = serie.find((p: { anio: number; egresados_anual: number }) => p.anio === anio);'

assert old_find in c, 'old_find no encontrado'
c = c.replace(old_find, new_find, 1)

with open('src/components/dashboard/views/Exposicion2031View.tsx', 'w', encoding='utf-8') as f:
    f.write(c)

print('Updated successfully')

