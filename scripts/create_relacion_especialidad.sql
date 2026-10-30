-- ==============================================================================
-- MODELO DE RELACIÓN: ESPECIALIDAD OFICIAL <-> UIE DÉFICIT DE HORAS
-- Permite mapear N cargos/criterios a 1 Especialidad Oficial
-- y calcular en vivo el déficit exacto por especialidad
-- ==============================================================================

-- 1. TABLA: RELACION_ESPECIALIDAD_CARGO
-- Guarda los mapeos oficiales configurables por el usuario o administrador
CREATE TABLE IF NOT EXISTS public.relacion_especialidad (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    especialidad_id INT NOT NULL REFERENCES public.especialidades_oficiales(id) ON DELETE CASCADE,
    dependencia VARCHAR(50) DEFAULT NULL, -- NULL = Aplica a todas (Fiscal, Convenio, Comunitaria)
    subsistema VARCHAR(100) DEFAULT NULL, -- NULL = Aplica a todos, o ej: 'EDUCACIÓN REGULAR'
    nivel VARCHAR(150) DEFAULT NULL,      -- NULL = Aplica a todos, o ej: 'SECUNDARIA', 'PRIMARIA'
    cargo VARCHAR(150) NOT NULL,          -- Nombre exacto del cargo en UIE (ej: 'NORMALISTA MATEMATICAS')
    activo BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (especialidad_id, cargo, nivel, subsistema, dependencia)
);

-- Índices para búsqueda instantánea en joins
CREATE INDEX IF NOT EXISTS idx_rel_esp_cargo ON public.relacion_especialidad(cargo);
CREATE INDEX IF NOT EXISTS idx_rel_esp_nivel ON public.relacion_especialidad(nivel);
CREATE INDEX IF NOT EXISTS idx_rel_esp_id ON public.relacion_especialidad(especialidad_id);

-- RLS y permisos
ALTER TABLE public.relacion_especialidad ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "allow_anon_all" ON public.relacion_especialidad;
CREATE POLICY "allow_anon_all" ON public.relacion_especialidad FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- 2. VISTA ANALÍTICA EN VIVO: DEFICIT CALCULADO POR ESPECIALIDAD OFICIAL
-- Hace el JOIN directo entre uie_deficit_horas y las reglas de relacion_especialidad
CREATE OR REPLACE VIEW public.v_deficit_por_especialidad AS
SELECT 
    eo.id AS especialidad_id,
    eo.nombre AS especialidad,
    u.gestion,
    u.departamento_id,
    u.departamento,
    u.dependencia,
    u.subsistema,
    u.nivel,
    u.cargo,
    u.horas_trabajadas,
    u.horas_planilla,
    u.deficit_horas,
    ROUND(u.deficit_horas::numeric / 88.0, 1) AS items_equiv_88h
FROM public.uie_deficit_horas u
INNER JOIN public.relacion_especialidad r 
    ON u.cargo = r.cargo
    AND (r.nivel IS NULL OR u.nivel ILIKE '%' || r.nivel || '%')
    AND (r.subsistema IS NULL OR u.subsistema ILIKE '%' || r.subsistema || '%')
    AND (r.dependencia IS NULL OR u.dependencia = r.dependencia)
    AND r.activo = true
INNER JOIN public.especialidades_oficiales eo 
    ON eo.id = r.especialidad_id;

-- 3. VISTA RESUMEN CONSOLIDADO POR GESTIÓN Y ESPECIALIDAD
CREATE OR REPLACE VIEW public.v_resumen_deficit_especialidad AS
SELECT 
    eo.id AS especialidad_id,
    eo.nombre AS especialidad,
    u.gestion,
    COUNT(DISTINCT u.id) AS registros_afectados,
    SUM(u.horas_trabajadas) AS total_horas_trabajadas,
    SUM(u.horas_planilla) AS total_horas_planilla,
    SUM(u.deficit_horas) AS total_deficit_horas,
    ROUND(
        CASE 
            WHEN SUM(u.horas_trabajadas) > 0 
            THEN (SUM(u.deficit_horas)::numeric / SUM(u.horas_trabajadas)::numeric) * 100 
            ELSE 0 
        END, 2
    ) AS pct_deficit,
    ROUND(SUM(u.deficit_horas)::numeric / 88.0) AS items_necesarios_88h
FROM public.uie_deficit_horas u
INNER JOIN public.relacion_especialidad r 
    ON u.cargo = r.cargo
    AND (r.nivel IS NULL OR u.nivel ILIKE '%' || r.nivel || '%')
    AND (r.subsistema IS NULL OR u.subsistema ILIKE '%' || r.subsistema || '%')
    AND (r.dependencia IS NULL OR u.dependencia = r.dependencia)
    AND r.activo = true
INNER JOIN public.especialidades_oficiales eo 
    ON eo.id = r.especialidad_id
GROUP BY eo.id, eo.nombre, u.gestion;
