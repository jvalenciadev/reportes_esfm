-- ==============================================================================
-- TABLA: ESPECIALIDADES OFICIALES ESFM
-- Catálogo oficial de las 20 especialidades curriculares
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.especialidades_oficiales (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(255) NOT NULL UNIQUE
);

-- Habilitar RLS y lectura pública
ALTER TABLE public.especialidades_oficiales ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "allow_anon_all" ON public.especialidades_oficiales;
CREATE POLICY "allow_anon_all" ON public.especialidades_oficiales FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- Limpieza e inserción de las 20 especialidades oficiales
TRUNCATE TABLE public.especialidades_oficiales RESTART IDENTITY CASCADE;

INSERT INTO public.especialidades_oficiales (nombre) VALUES
  ('CIENCIAS NATURALES: FÍSICA - QUÍMICA'),
  ('EDUCACIÓN PRIMARIA COMUNITARIA VOCACIONAL'),
  ('EDUCACIÓN MUSICAL'),
  ('ARTES PLÁSTICAS Y VISUALES'),
  ('EDUCACIÓN INICIAL EN FAMILIA COMUNITARIA'),
  ('EDUCACIÓN FÍSICA Y DEPORTES'),
  ('TRANSFORMACIÓN DE ALIMENTOS Y GASTRONOMÍA'),
  ('COMUNICACIÓN Y LENGUAJES: LENGUA CASTELLANA'),
  ('MATEMÁTICA'),
  ('VALORES, ESPIRITUALIDAD Y RELIGIONES'),
  ('COSMOVISIONES, FILOSOFÍAS Y SICOLOGÍA'),
  ('CIENCIAS NATURALES: BIOLOGÍA - GEOGRAFÍA'),
  ('AGROPECUARIA'),
  ('ELECTRICIDAD Y ELECTRÓNICA'),
  ('MECÁNICA AUTOMOTRIZ'),
  ('ELECTROMECÁNICA'),
  ('COMUNICACIÓN Y LENGUAJES: LENGUA EXTRANJERA (INGLÉS)'),
  ('INDUSTRIA TEXTIL Y CONFECCIÓN'),
  ('EDUCACIÓN ESPECIAL PARA PERSONAS CON DISCAPACIDAD'),
  ('CIENCIAS SOCIALES')
ON CONFLICT (nombre) DO NOTHING;

