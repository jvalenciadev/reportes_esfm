-- ==============================================================================
-- TABLA: FILTRO_ESPECIALIDAD
-- Configuración de reglas y filtros dinámicos por Especialidad Oficial
-- Permite asociar:
--   - múltiples subsistemas
--   - múltiples niveles
--   - múltiples cargos
--   - operador de carga global: '>', '=', '<', '<=', '>=' o NULL (sin restricción)
--   - carga horaria objetivo global (puede ser NULL = sin restricción)
--   - cargos_condiciones: JSONB con condiciones individuales por cargo
--     Formato: [{"cargo": "NOMBRE CARGO", "operador": ">=", "horas": 48}, ...]
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.filtro_especialidad (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    especialidad_oficial_id INT NOT NULL REFERENCES public.especialidades_oficiales(id) ON DELETE CASCADE,
    subsistemas TEXT[] NOT NULL DEFAULT '{}',
    niveles TEXT[] NOT NULL DEFAULT '{}',
    cargos TEXT[] NOT NULL DEFAULT '{}',
    operador_carga VARCHAR(5) DEFAULT NULL,          -- NULL = sin restricción de carga global
    carga_especialidad NUMERIC DEFAULT NULL,          -- NULL = sin restricción de carga global
    cargos_condiciones JSONB NOT NULL DEFAULT '[]',  -- Condiciones individuales por cargo
    activo BOOLEAN NOT NULL DEFAULT true,
    descripcion TEXT DEFAULT '',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT uq_filtro_especialidad UNIQUE (especialidad_oficial_id)
);

-- Migración: Si la tabla ya existe, agregar columnas nuevas de forma segura
ALTER TABLE public.filtro_especialidad
    ALTER COLUMN operador_carga DROP NOT NULL;
ALTER TABLE public.filtro_especialidad
    ALTER COLUMN carga_especialidad DROP NOT NULL;
ALTER TABLE public.filtro_especialidad
    ADD COLUMN IF NOT EXISTS cargos_condiciones JSONB NOT NULL DEFAULT '[]';

CREATE INDEX IF NOT EXISTS idx_filtro_esp_id ON public.filtro_especialidad(especialidad_oficial_id);
CREATE INDEX IF NOT EXISTS idx_filtro_cargos_cond ON public.filtro_especialidad USING GIN(cargos_condiciones);

ALTER TABLE public.filtro_especialidad ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "allow_anon_all" ON public.filtro_especialidad;
CREATE POLICY "allow_anon_all" ON public.filtro_especialidad FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- Sembrar las 20 especialidades oficiales por defecto
INSERT INTO public.filtro_especialidad (especialidad_oficial_id, subsistemas, niveles, cargos, operador_carga, carga_especialidad, cargos_condiciones, activo, descripcion)
SELECT
    eo.id,
    ARRAY['EDUCACIÓN REGULAR']::TEXT[],
    CASE
        WHEN eo.nombre ILIKE '%INICIAL%' THEN ARRAY['INICIAL']::TEXT[]
        WHEN eo.nombre ILIKE '%PRIMARIA%' THEN ARRAY['PRIMARIA']::TEXT[]
        WHEN eo.nombre ILIKE '%ESPECIAL%' THEN ARRAY['INTELECTUAL', 'AUDITIVA', 'VISUAL', 'FISICA MOTORA']::TEXT[]
        ELSE ARRAY['SECUNDARIA', 'SECUNDARIA (BTH)']::TEXT[]
    END,
    CASE
        WHEN eo.nombre ILIKE '%INGLÉS%' THEN ARRAY['LENGUA EXTRANJERA', 'INGLÉS', 'BTH INGLÉS']::TEXT[]
        WHEN eo.nombre ILIKE '%FÍSICA - QUÍMICA%' THEN ARRAY['FÍSICA', 'QUÍMICA', 'FÍSICA-QUÍMICA']::TEXT[]
        WHEN eo.nombre ILIKE '%MATEMÁTICA%' THEN ARRAY['MATEMÁTICAS', 'MATEMÁTICA']::TEXT[]
        WHEN eo.nombre ILIKE '%BIOLOGÍA%' THEN ARRAY['BIOLOGÍA', 'GEOGRAFÍA', 'BIOLOGÍA-GEOGRAFÍA']::TEXT[]
        WHEN eo.nombre ILIKE '%ARTES PLÁSTICAS%' THEN ARRAY['ARTES PLÁSTICAS', 'DIBUJO TÉCNICO']::TEXT[]
        WHEN eo.nombre ILIKE '%MUSICAL%' THEN ARRAY['MÚSICA', 'EDUCACIÓN MUSICAL']::TEXT[]
        WHEN eo.nombre ILIKE '%FÍSICA Y DEPORTES%' THEN ARRAY['EDUCACIÓN FÍSICA', 'DEPORTES']::TEXT[]
        WHEN eo.nombre ILIKE '%SOCIALES%' THEN ARRAY['CIENCIAS SOCIALES', 'HISTORIA']::TEXT[]
        WHEN eo.nombre ILIKE '%CASTELLANA%' THEN ARRAY['LENGUAJE', 'COMUNICACIÓN Y LENGUAJES']::TEXT[]
        ELSE ARRAY[]::TEXT[]
    END,
    NULL,       -- Sin restricción de carga global por defecto
    NULL,       -- Sin restricción de carga global por defecto
    '[]'::JSONB,
    true,
    'Regla base de filtro para ' || eo.nombre
FROM public.especialidades_oficiales eo
ON CONFLICT (especialidad_oficial_id) DO NOTHING;
