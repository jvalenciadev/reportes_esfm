-- ==============================================================================
-- FUNCIÓN RPC: GET_DEFICIT_POR_ESPECIALIDAD
-- Calcula en milisegundos sobre sie_unidad_educativa (169.198 registros):
--   - N° Unidades Educativas únicas (COUNT DISTINCT cod_ue)
--   - Total Paralelos
--   - Carga Horaria (Horas trabajadas)
--   - Horas en Planilla
--   - Déficit de Horas (Carga - Planilla)
--   - Ítems necesarios (base 88h)
--   - Porcentaje de cobertura
-- agrupado por Departamento para una Especialidad Oficial dada.
-- ==============================================================================

CREATE OR REPLACE FUNCTION public.get_deficit_por_especialidad(p_especialidad_id INT)
RETURNS TABLE (
    departamento_id INT,
    departamento VARCHAR,
    total_ues BIGINT,
    total_paralelos BIGINT,
    total_carga_horaria BIGINT,
    total_horas_planilla BIGINT,
    total_deficit_horas BIGINT,
    items_deficit_88h NUMERIC,
    pct_cobertura NUMERIC
) AS $$
DECLARE
    v_subs TEXT[];
    v_nivs TEXT[];
    v_op VARCHAR(5);
    v_carga NUMERIC;
BEGIN
    -- 1. Obtener la regla configurada en filtro_especialidad
    SELECT 
        f.subsistemas, 
        f.niveles, 
        f.operador_carga, 
        f.carga_especialidad
    INTO 
        v_subs, 
        v_nivs, 
        v_op, 
        v_carga
    FROM public.filtro_especialidad f
    WHERE f.especialidad_oficial_id = p_especialidad_id
      AND f.activo = true;

    IF v_subs IS NULL OR array_length(v_subs, 1) IS NULL THEN
        RETURN;
    END IF;

    -- 2. Ejecutar la agregación sobre sie_unidad_educativa
    RETURN QUERY
    SELECT 
        s.departamento_id,
        s.departamento,
        COUNT(DISTINCT s.cod_ue)::BIGINT AS total_ues,
        COALESCE(SUM(s.total_paralelos), 0)::BIGINT AS total_paralelos,
        COALESCE(SUM(s.carga_horaria), 0)::BIGINT AS total_carga_horaria,
        COALESCE(SUM(s.horas_planilla), 0)::BIGINT AS total_horas_planilla,
        COALESCE(SUM(s.deficit_horas), 0)::BIGINT AS total_deficit_horas,
        ROUND((COALESCE(SUM(s.deficit_horas), 0)::numeric / 88.0), 1) AS items_deficit_88h,
        ROUND(
            CASE 
                WHEN COALESCE(SUM(s.carga_horaria), 0) > 0 
                THEN (COALESCE(SUM(s.horas_planilla), 0)::numeric / COALESCE(SUM(s.carga_horaria), 0)::numeric) * 100.0
                ELSE 100.0
            END, 1
        ) AS pct_cobertura
    FROM public.sie_unidad_educativa s
    WHERE s.subsistema = ANY(v_subs)
      AND s.nivel = ANY(v_nivs)
      AND (
          v_op IS NULL OR v_carga IS NULL
          OR (v_op = '<=' AND s.carga_horaria <= v_carga)
          OR (v_op = '>=' AND s.carga_horaria >= v_carga)
          OR (v_op = '<'  AND s.carga_horaria <  v_carga)
          OR (v_op = '>'  AND s.carga_horaria >  v_carga)
          OR (v_op = '='  AND s.carga_horaria =  v_carga)
      )
    GROUP BY s.departamento_id, s.departamento
    ORDER BY total_deficit_horas DESC;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- Permisos públicos para anon y authenticated
GRANT EXECUTE ON FUNCTION public.get_deficit_por_especialidad(INT) TO anon, authenticated;
