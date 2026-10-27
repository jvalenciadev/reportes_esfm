-- ==============================================================================
-- SCHEMA v2: Agrega tabla esfm y actualiza inscritos_esfm con esfm_id
-- Ejecutar en el SQL Editor de Supabase
-- ==============================================================================

-- 1. Limpiar tablas existentes (orden respeta FKs)
TRUNCATE TABLE public.inscritos_esfm RESTART IDENTITY CASCADE;
TRUNCATE TABLE public.sie_total_estudiantes RESTART IDENTITY CASCADE;
TRUNCATE TABLE public.ine_matricula RESTART IDENTITY CASCADE;
TRUNCATE TABLE public.discapacidad_seie RESTART IDENTITY CASCADE;
TRUNCATE TABLE public.ine_poblacion RESTART IDENTITY CASCADE;
TRUNCATE TABLE public.ine_proyeccion_edad RESTART IDENTITY CASCADE;
TRUNCATE TABLE public.matricula_rural_urbana RESTART IDENTITY CASCADE;
TRUNCATE TABLE public.especialidades RESTART IDENTITY CASCADE;
TRUNCATE TABLE public.departamentos RESTART IDENTITY CASCADE;

-- 2. Eliminar tabla inscritos_esfm (se redefinirá con esfm_id)
DROP TABLE IF EXISTS public.inscritos_esfm;

-- 3. Nueva tabla catálogo: ESFM
CREATE TABLE IF NOT EXISTS public.esfm (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(255) NOT NULL UNIQUE
);

-- 4. Tabla inscritos_esfm actualizada (usa esfm_id en lugar de esfm text)
CREATE TABLE IF NOT EXISTS public.inscritos_esfm (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    gestion INT NOT NULL,
    departamento_id INT NOT NULL REFERENCES public.departamentos(id) ON DELETE CASCADE,
    esfm_id INT NOT NULL REFERENCES public.esfm(id) ON DELETE CASCADE,
    especialidad_id INT NOT NULL REFERENCES public.especialidades(id) ON DELETE CASCADE,
    modalidad VARCHAR(10) NOT NULL,
    total_inscritos INT NOT NULL
);

-- 5. Índices
CREATE INDEX IF NOT EXISTS idx_inscritos_esfm_dep_gestion ON public.inscritos_esfm(departamento_id, gestion);
CREATE INDEX IF NOT EXISTS idx_inscritos_esfm_especialidad ON public.inscritos_esfm(especialidad_id);
CREATE INDEX IF NOT EXISTS idx_inscritos_esfm_esfm ON public.inscritos_esfm(esfm_id);
CREATE INDEX IF NOT EXISTS idx_esfm_nombre ON public.esfm(nombre);

-- 6. RLS para la nueva tabla esfm
ALTER TABLE public.esfm ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "allow_anon_all" ON public.esfm;
CREATE POLICY "allow_anon_all" ON public.esfm
    FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- RLS para inscritos_esfm (recreada)
ALTER TABLE public.inscritos_esfm ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "allow_anon_all" ON public.inscritos_esfm;
CREATE POLICY "allow_anon_all" ON public.inscritos_esfm
    FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
