-- ==============================================================================
-- SISTEMA MATERIAS SIE: TABLA DE FILTROS CRUD Y VISTAS ANALÍTICAS AGREGADAS
-- Ejecutar en Supabase SQL Editor para soporte completo en Vercel y producción
-- ==============================================================================

-- 1. TABLA PERSISTENTE PARA EL CRUD DE FILTROS DE MATERIA (Soporte Vercel)
CREATE TABLE IF NOT EXISTS public.filtro_especialidad_materia (
    id SERIAL PRIMARY KEY,
    especialidad_oficial_id INT NOT NULL REFERENCES public.especialidades_oficiales(id) ON DELETE CASCADE,
    subsistemas TEXT[] NOT NULL DEFAULT '{}',
    niveles TEXT[] NOT NULL DEFAULT '{}',
    materias TEXT[] NOT NULL DEFAULT '{}',
    operador_carga VARCHAR(5),
    carga_especialidad NUMERIC,
    materias_condiciones JSONB DEFAULT '[]'::jsonb,
    activo BOOLEAN NOT NULL DEFAULT true,
    descripcion TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT uq_filtro_esp_materia UNIQUE (especialidad_oficial_id)
);

ALTER TABLE public.filtro_especialidad_materia ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "allow_anon_all" ON public.filtro_especialidad_materia;
CREATE POLICY "allow_anon_all" ON public.filtro_especialidad_materia 
FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- 2. VISTA BASE ACTUALIZADA (COINCIDENCIA EXACTA Y CONTIENE RESILIENTE)
CREATE OR REPLACE VIEW public.v_deficit_por_especialidad_materia AS
SELECT 
    eo.id AS especialidad_id,
    eo.nombre AS especialidad,
    s.cod_dep,
    s.departamento,
    s.cod_dis,
    s.distrito,
    s.area,
    s.cod_ue,
    s.ue,
    s.subsistema,
    s.nivel,
    s.materia,
    s.hora_tra,
    s.hora_pla,
    s.deficit,
    CASE 
        WHEN eo.nombre ILIKE '%ESPECIAL%' THEN ROUND(s.deficit::numeric / 108.0, 2)
        ELSE ROUND(s.deficit::numeric / 88.0, 2)
    END AS items_deficit_equiv
FROM public.sie_deficit_materia s
INNER JOIN public.relacion_especialidad_materia r 
    ON (
        (r.tipo_coincidencia = 'EXACTA' AND UPPER(s.materia) = UPPER(r.materia))
        OR (r.tipo_coincidencia = 'CONTIENE' AND UPPER(s.materia) LIKE '%' || UPPER(r.materia) || '%')
    )
    AND (r.nivel IS NULL OR UPPER(s.nivel) = UPPER(r.nivel))
    AND (
        r.subsistema IS NULL 
        OR UPPER(s.subsistema) = UPPER(r.subsistema)
        OR UPPER(r.subsistema) LIKE '%' || UPPER(s.subsistema) || '%'
    )
    AND r.activo = true
INNER JOIN public.especialidades_oficiales eo 
    ON eo.id = r.especialidad_id;

-- 3. VISTA AGREGADA DEPARTAMENTAL (Resuelve el límite de 1.000 filas de PostgREST)
CREATE OR REPLACE VIEW public.v_deficit_materia_departamento AS
SELECT 
    v.especialidad_id,
    v.especialidad,
    v.cod_dep AS departamento_id,
    v.departamento,
    COUNT(DISTINCT v.cod_ue)::BIGINT AS ues_afectadas,
    COALESCE(SUM(v.hora_tra), 0)::BIGINT AS carga_horaria,
    COALESCE(SUM(v.hora_pla), 0)::BIGINT AS horas_planilla,
    COALESCE(SUM(v.deficit), 0)::BIGINT AS deficit_horas,
    ROUND(CAST(SUM(v.deficit) AS numeric) / (CASE WHEN v.especialidad ILIKE '%ESPECIAL%' THEN 108.0 ELSE 88.0 END), 1) AS items_deficit_equiv,
    CASE 
        WHEN SUM(v.hora_tra) > 0 THEN ROUND((CAST(SUM(v.hora_pla) AS numeric) / SUM(v.hora_tra)) * 100.0, 1) 
        ELSE 100.0 
    END AS pct_cobertura
FROM public.v_deficit_por_especialidad_materia v
GROUP BY v.especialidad_id, v.especialidad, v.cod_dep, v.departamento;

-- 4. VISTA DE RESUMEN NACIONAL
CREATE OR REPLACE VIEW public.v_deficit_materia_nacional AS
SELECT 
    v.especialidad_id,
    v.especialidad,
    COUNT(DISTINCT v.cod_ue)::BIGINT AS total_ues,
    COALESCE(SUM(v.hora_tra), 0)::BIGINT AS carga_horaria,
    COALESCE(SUM(v.hora_pla), 0)::BIGINT AS horas_planilla,
    COALESCE(SUM(v.deficit), 0)::BIGINT AS deficit_horas,
    ROUND(CAST(SUM(v.deficit) AS numeric) / (CASE WHEN v.especialidad ILIKE '%ESPECIAL%' THEN 108.0 ELSE 88.0 END), 1) AS items_deficit_equiv,
    CASE 
        WHEN SUM(v.hora_tra) > 0 THEN ROUND((CAST(SUM(v.hora_pla) AS numeric) / SUM(v.hora_tra)) * 100.0, 1) 
        ELSE 100.0 
    END AS pct_cobertura
FROM public.v_deficit_por_especialidad_materia v
GROUP BY v.especialidad_id, v.especialidad;

-- 5. VISTA DE DESGLOSE DE MATERIAS
CREATE OR REPLACE VIEW public.v_deficit_materia_breakdown AS
SELECT 
    v.especialidad_id,
    v.materia,
    v.nivel,
    COUNT(DISTINCT v.cod_ue)::BIGINT AS ues_afectadas,
    COALESCE(SUM(v.hora_tra), 0)::BIGINT AS carga_horaria,
    COALESCE(SUM(v.deficit), 0)::BIGINT AS deficit_horas
FROM public.v_deficit_por_especialidad_materia v
GROUP BY v.especialidad_id, v.materia, v.nivel;

