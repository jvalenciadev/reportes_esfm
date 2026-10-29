-- ==============================================================================
-- DDL: CREACIÓN DE TABLA public.uie_deficit_horas
-- Ejecutar este script primero en el SQL Editor de Supabase
-- ==============================================================================

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

-- Índices de alto rendimiento para filtros
CREATE INDEX IF NOT EXISTS idx_uie_deficit_gestion_dept ON public.uie_deficit_horas(gestion, departamento_id);
CREATE INDEX IF NOT EXISTS idx_uie_deficit_subsistema ON public.uie_deficit_horas(subsistema, nivel);
CREATE INDEX IF NOT EXISTS idx_uie_deficit_dependencia ON public.uie_deficit_horas(dependencia);

-- Habilitar RLS y políticas de lectura y escritura
ALTER TABLE public.uie_deficit_horas ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "allow_anon_all" ON public.uie_deficit_horas;
CREATE POLICY "allow_anon_all" ON public.uie_deficit_horas FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
