-- ==============================================================================
-- ESQUEMA ENTIDAD-RELACIÓN: ADMISIÓN ESFM REPORTES
-- ==============================================================================

-- 1. TABLA CATÁLOGO: DEPARTAMENTOS
CREATE TABLE IF NOT EXISTS public.departamentos (
    id INT PRIMARY KEY,
    nombre VARCHAR(50) NOT NULL UNIQUE,
    codigo VARCHAR(5) NOT NULL UNIQUE
);

-- 2. TABLA CATÁLOGO: ESPECIALIDADES
CREATE TABLE IF NOT EXISTS public.especialidades (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(255) NOT NULL UNIQUE
);

-- 3. TABLA: DISCAPACIDAD SEIE (2011-2025)
CREATE TABLE IF NOT EXISTS public.discapacidad_seie (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    area VARCHAR(50) NOT NULL,
    cantidad_est INT NOT NULL,
    anio INT NOT NULL
);

-- 4. TABLA: INE MATRÍCULA (2011-2025)
CREATE TABLE IF NOT EXISTS public.ine_matricula (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    departamento_id INT NOT NULL REFERENCES public.departamentos(id) ON DELETE CASCADE,
    tipo VARCHAR(50) NOT NULL,
    nivel VARCHAR(50) NOT NULL,
    cantidad INT NOT NULL,
    anio INT NOT NULL
);

-- 5. TABLA: INE POBLACIÓN (2000-2050)
CREATE TABLE IF NOT EXISTS public.ine_poblacion (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    anio INT NOT NULL,
    poblacion BIGINT NOT NULL
);

-- 6. TABLA: INE PROYECCIÓN POR EDAD (2024-2034)
CREATE TABLE IF NOT EXISTS public.ine_proyeccion_edad (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    edad INT NOT NULL,
    cantidad INT NOT NULL,
    anio INT NOT NULL,
    departamento_id INT REFERENCES public.departamentos(id)
);
CREATE INDEX IF NOT EXISTS idx_ine_proy_edad_anio_dept ON public.ine_proyeccion_edad (anio, departamento_id, edad);

-- 7. TABLA: INSCRITOS ESFM (2016-2026)
CREATE TABLE IF NOT EXISTS public.inscritos_esfm (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    gestion INT NOT NULL,
    departamento_id INT NOT NULL REFERENCES public.departamentos(id) ON DELETE CASCADE,
    esfm VARCHAR(255) NOT NULL,
    especialidad_id INT NOT NULL REFERENCES public.especialidades(id) ON DELETE CASCADE,
    modalidad VARCHAR(10) NOT NULL,
    total_inscritos INT NOT NULL
);

-- 8. TABLA: MATRÍCULA ESCUELA RURAL URBANA (2000-2025)
CREATE TABLE IF NOT EXISTS public.matricula_rural_urbana (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    area VARCHAR(50) NOT NULL,
    cantidad INT NOT NULL,
    anio INT NOT NULL
);

-- 9. TABLA: SIE TOTAL ESTUDIANTES INICIAL-PRIMARIA-SECUNDARIA (2026)
CREATE TABLE IF NOT EXISTS public.sie_total_estudiantes (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    departamento_id INT NOT NULL REFERENCES public.departamentos(id) ON DELETE CASCADE,
    dependencia VARCHAR(50) NOT NULL,
    cantidad INT NOT NULL,
    nivel INT NOT NULL,
    nivel_texto VARCHAR(50) NOT NULL
);

-- 10. TABLA: SEIE DISCAPACIDAD POR DEPENDENCIA (2011-2025: Fiscal vs Privada)
CREATE TABLE IF NOT EXISTS public.seie_discapacidad_dependencia (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    departamento_id INT NOT NULL REFERENCES public.departamentos(id) ON DELETE CASCADE,
    dependencia VARCHAR(50) NOT NULL,
    cantidad INT NOT NULL,
    anio INT NOT NULL
);

-- 11. TABLA: SEIE DISCAPACIDAD POR ÁREA (2011-2025: Rural vs Urbana)
CREATE TABLE IF NOT EXISTS public.seie_discapacidad_area (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    departamento_id INT NOT NULL REFERENCES public.departamentos(id) ON DELETE CASCADE,
    area VARCHAR(50) NOT NULL,
    cantidad INT NOT NULL,
    anio INT NOT NULL
);

-- 12. TABLA: SIE DISCAPACIDAD GESTIÓN 2026 (Por Tipo de Discapacidad y Dependencia)
CREATE TABLE IF NOT EXISTS public.sie_discapacidad_2026 (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    departamento_id INT NOT NULL REFERENCES public.departamentos(id) ON DELETE CASCADE,
    dependencia VARCHAR(50) NOT NULL,
    tipo_discapacidad VARCHAR(100) NOT NULL,
    cantidad INT NOT NULL,
    anio INT NOT NULL DEFAULT 2026
);

-- 13. TABLA: UIE DÉFICIT DE HORAS Y CARGA HORARIA VS PLANILLA (2021-2025)
CREATE TABLE IF NOT EXISTS public.uie_deficit_horas (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    gestion INT NOT NULL,
    departamento_id INT NOT NULL REFERENCES public.departamentos(id) ON DELETE CASCADE,
    departamento VARCHAR(50) NOT NULL,
    dependencia VARCHAR(50) NOT NULL,
    subsistema VARCHAR(100) NOT NULL,
    nivel VARCHAR(150) NOT NULL,
    cargo VARCHAR(150) NOT NULL,
    horas_trabajadas INT NOT NULL,
    horas_planilla INT NOT NULL,
    deficit_horas INT NOT NULL
);

-- ÍNDICES DE RENDIMIENTO PARA REPORTES Y FILTRADOS
CREATE INDEX IF NOT EXISTS idx_ine_matricula_dep_anio ON public.ine_matricula(departamento_id, anio);
CREATE INDEX IF NOT EXISTS idx_inscritos_esfm_dep_gestion ON public.inscritos_esfm(departamento_id, gestion);
CREATE INDEX IF NOT EXISTS idx_inscritos_esfm_especialidad ON public.inscritos_esfm(especialidad_id);
CREATE INDEX IF NOT EXISTS idx_sie_total_dep ON public.sie_total_estudiantes(departamento_id);
CREATE INDEX IF NOT EXISTS idx_seie_disc_dep_anio ON public.seie_discapacidad_dependencia(anio, departamento_id);
CREATE INDEX IF NOT EXISTS idx_seie_disc_area_anio ON public.seie_discapacidad_area(anio, departamento_id);
CREATE INDEX IF NOT EXISTS idx_sie_disc_2026_dep ON public.sie_discapacidad_2026(departamento_id, tipo_discapacidad);
CREATE INDEX IF NOT EXISTS idx_uie_deficit_gestion_dept ON public.uie_deficit_horas(gestion, departamento_id);
CREATE INDEX IF NOT EXISTS idx_uie_deficit_subsistema ON public.uie_deficit_horas(subsistema, nivel);
CREATE INDEX IF NOT EXISTS idx_uie_deficit_dependencia ON public.uie_deficit_horas(dependencia);

-- HABILITAR RLS Y POLÍTICAS DE LECTURA PÚBLICA PARA DASHBOARDS
DO $$
DECLARE
    tbl text;
BEGIN
    FOR tbl IN
        SELECT table_name
        FROM information_schema.tables
        WHERE table_schema = 'public'
          AND table_name IN (
            'departamentos', 'especialidades', 'discapacidad_seie',
            'ine_matricula', 'ine_poblacion', 'ine_proyeccion_edad',
            'inscritos_esfm', 'matricula_rural_urbana', 'sie_total_estudiantes',
            'seie_discapacidad_dependencia', 'seie_discapacidad_area', 'sie_discapacidad_2026',
            'uie_deficit_horas'
          )
    LOOP
        EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY;', tbl);
        EXECUTE format('DROP POLICY IF EXISTS "allow_anon_all" ON public.%I;', tbl);
        EXECUTE format('CREATE POLICY "allow_anon_all" ON public.%I FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);', tbl);
    END LOOP;
END $$;
