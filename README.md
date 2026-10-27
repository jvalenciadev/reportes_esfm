# Sistema Integrado de Estadística ESFM | Ministerio de Educación de Bolivia

Plataforma analítica e interactiva para la visualización, monitoreo y proyección de datos educativos en el Estado Plurinacional de Bolivia:
- **DGFM:** Dirección General de Formación de Maestros (Inscritos y oferta académica de las 27 ESFM/UA).
- **INE:** Instituto Nacional de Estadística (Proyecciones de población 2000-2050, cohortes de edad 17-20 años y matrícula censal escolar).
- **SIE:** Sistema de Información Educativa (Matrícula escolar regular, desglose territorial Rural-Urbano 2000-2025 y distribución departamental 2026).
- **SEIE:** Subsistema de Educación Especial y Alternativa.

---

## 🛠️ Stack Tecnológico
- **Frontend:** Next.js 15+ (App Router), React 19, TypeScript
- **Estilos:** TailwindCSS, Vanilla CSS, diseño institucional oficial (Paleta dorada `#c9a751` y pizarra)
- **Base de Datos:** Supabase (PostgreSQL)
- **Visualización:** Gráficos SVG interactivos nativos (Líneas de tendencia temporales con soporte pantalla completa, Matrices de crecimiento interanual, Gráficos Donut/Pie y Tablas de datos filtrables).

---

## 🚀 Instalación y Ejecución

```bash
# 1. Instalar dependencias
npm install

# 2. Configurar variables de entorno (.env.local)
# NEXT_PUBLIC_SUPABASE_URL=...
# NEXT_PUBLIC_SUPABASE_ANON_KEY=...

# 3. Iniciar entorno de desarrollo
npm run dev
```

Abra [http://localhost:3000](http://localhost:3000) en su navegador.
