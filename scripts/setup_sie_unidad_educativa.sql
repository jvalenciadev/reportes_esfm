-- ==============================================================================
-- 1. ELIMINACIÓN DE TABLAS Y VISTAS ANTIGUAS DE UIE DÉFICIT
-- ==============================================================================
DROP VIEW IF EXISTS public.v_resumen_deficit_especialidad CASCADE;
DROP VIEW IF EXISTS public.v_deficit_por_especialidad CASCADE;
DROP TABLE IF EXISTS public.relacion_especialidad CASCADE;
DROP TABLE IF EXISTS public.uie_deficit_horas CASCADE;

-- ==============================================================================
-- 2. TABLA EXTRA: UNIDAD_EDUCATIVA (CATÁLOGO MAESTRO DE 16.273 UNIDADES EDUCATIVAS)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.unidad_educativa (
    cod_ue BIGINT PRIMARY KEY,
    unidad_educativa VARCHAR(255) NOT NULL,
    departamento_id INT NOT NULL,
    departamento VARCHAR(50) NOT NULL,
    dependencia VARCHAR(50) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ue_dept ON public.unidad_educativa(departamento_id);
CREATE INDEX IF NOT EXISTS idx_ue_dep ON public.unidad_educativa(dependencia);
CREATE INDEX IF NOT EXISTS idx_ue_nombre ON public.unidad_educativa(unidad_educativa);

ALTER TABLE public.unidad_educativa ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "allow_anon_all" ON public.unidad_educativa;
CREATE POLICY "allow_anon_all" ON public.unidad_educativa FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- ==============================================================================
-- 3. TABLA PRINCIPAL: SIE_UNIDAD_EDUCATIVA (DETALLE DE CARGA HORARIA Y DÉFICIT)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.sie_unidad_educativa (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    cod_ue BIGINT NOT NULL REFERENCES public.unidad_educativa(cod_ue) ON DELETE CASCADE,
    departamento_id INT NOT NULL,
    departamento VARCHAR(50) NOT NULL,
    unidad_educativa VARCHAR(255) NOT NULL,
    dependencia VARCHAR(50) NOT NULL,
    subsistema VARCHAR(100) NOT NULL,
    nivel VARCHAR(150) NOT NULL,
    nro_estudiantes INT NOT NULL DEFAULT 0,
    total_paralelos INT NOT NULL DEFAULT 0,
    carga_horaria INT NOT NULL DEFAULT 0,
    horas_planilla INT NOT NULL DEFAULT 0,
    deficit_horas INT GENERATED ALWAYS AS (carga_horaria - horas_planilla) STORED,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sie_ue_cod ON public.sie_unidad_educativa(cod_ue);
CREATE INDEX IF NOT EXISTS idx_sie_ue_dept ON public.sie_unidad_educativa(departamento_id);
CREATE INDEX IF NOT EXISTS idx_sie_ue_dep ON public.sie_unidad_educativa(dependencia);
CREATE INDEX IF NOT EXISTS idx_sie_ue_sub_nivel ON public.sie_unidad_educativa(subsistema, nivel);
CREATE INDEX IF NOT EXISTS idx_sie_ue_deficit ON public.sie_unidad_educativa(deficit_horas DESC);

ALTER TABLE public.sie_unidad_educativa ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "allow_anon_all" ON public.sie_unidad_educativa;
CREATE POLICY "allow_anon_all" ON public.sie_unidad_educativa FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- ==============================================================================
-- 4. VISTAS ANALÍTICAS CONSOLIDADAS DE ALTO RENDIMIENTO
-- ==============================================================================

-- Vista 1: Resumen por Unidad Educativa (Totales consolidados y cálculo de ítems a 88h)
CREATE OR REPLACE VIEW public.v_resumen_unidad_educativa AS
SELECT 
    s.cod_ue,
    s.unidad_educativa,
    s.departamento_id,
    s.departamento,
    s.dependencia,
    COUNT(s.id) AS registros_items,
    SUM(s.nro_estudiantes) AS total_estudiantes,
    SUM(s.total_paralelos) AS total_paralelos,
    SUM(s.carga_horaria) AS total_carga_horaria,
    SUM(s.horas_planilla) AS total_horas_planilla,
    SUM(s.deficit_horas) AS total_deficit_horas,
    ROUND(SUM(s.deficit_horas)::numeric / 88.0, 1) AS items_deficit_88h
FROM public.sie_unidad_educativa s
GROUP BY s.cod_ue, s.unidad_educativa, s.departamento_id, s.departamento, s.dependencia;

-- Vista 2: Resumen por Departamento y Nivel
CREATE OR REPLACE VIEW public.v_resumen_departamento_nivel AS
SELECT 
    s.departamento_id,
    s.departamento,
    s.dependencia,
    s.subsistema,
    s.nivel,
    COUNT(DISTINCT s.cod_ue) AS total_ues,
    SUM(s.nro_estudiantes) AS total_estudiantes,
    SUM(s.total_paralelos) AS total_paralelos,
    SUM(s.carga_horaria) AS total_carga_horaria,
    SUM(s.horas_planilla) AS total_horas_planilla,
    SUM(s.deficit_horas) AS total_deficit_horas,
    ROUND(SUM(s.deficit_horas)::numeric / 88.0, 1) AS items_deficit_88h
FROM public.sie_unidad_educativa s
GROUP BY s.departamento_id, s.departamento, s.dependencia, s.subsistema, s.nivel;

-- Vista 3: Resumen Nacional por Subsistema y Nivel
CREATE OR REPLACE VIEW public.v_resumen_nacional_subsistema AS
SELECT 
    s.subsistema,
    s.nivel,
    COUNT(DISTINCT s.cod_ue) AS total_ues,
    SUM(s.nro_estudiantes) AS total_estudiantes,
    SUM(s.total_paralelos) AS total_paralelos,
    SUM(s.carga_horaria) AS total_carga_horaria,
    SUM(s.horas_planilla) AS total_horas_planilla,
    SUM(s.deficit_horas) AS total_deficit_horas,
    ROUND(SUM(s.deficit_horas)::numeric / 88.0, 1) AS items_deficit_88h
FROM public.sie_unidad_educativa s
GROUP BY s.subsistema, s.nivel;
