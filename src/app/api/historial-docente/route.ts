import { NextRequest, NextResponse } from "next/server";
import Database from "better-sqlite3";
import path from "path";

const DB_PATH = path.join(process.cwd(), "src/data/historial.db");

function getDb() {
  return new Database(DB_PATH, { readonly: true });
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const report = searchParams.get("report") || "all";
  const dpto = searchParams.get("departamento") || "";

  try {
    const db = getDb();

    if (report === "salientes_entrantes") {
      return getSalientesEntrantes(db, dpto);
    } else if (report === "impertinencias") {
      return getImpertinencias(db, dpto);
    } else if (report === "sin_cargo") {
      return getSinCargo(db, dpto);
    } else {
      // Return summary from pre-computed JSON
      const fs = await import("fs");
      const jsonPath = path.join(process.cwd(), "src/data/historial_reportes.json");
      const data = JSON.parse(fs.readFileSync(jsonPath, "utf-8"));
      return NextResponse.json(data);
    }
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

function getSalientesEntrantes(db: Database.Database, dpto: string) {
  const rows = db.prepare(`
    SELECT
      COALESCE(s.departamento, e.departamento) as departamento,
      COALESCE(s.salientes, 0) as salientes,
      COALESCE(e.entrantes, 0) as entrantes,
      COALESCE(e.entrantes, 0) - COALESCE(s.salientes, 0) as neto
    FROM (
      SELECT departamento, COUNT(DISTINCT ci) as salientes
      FROM hist_2024
      WHERE subsistema = 'REGULAR'
        AND ci NOT IN (SELECT ci FROM hist_2025 WHERE subsistema = 'REGULAR')
        ${dpto ? "AND departamento = ?" : ""}
      GROUP BY departamento
    ) s
    FULL OUTER JOIN (
      SELECT departamento, COUNT(DISTINCT ci) as entrantes
      FROM hist_2025
      WHERE subsistema = 'REGULAR'
        AND ci NOT IN (SELECT ci FROM hist_2024 WHERE subsistema = 'REGULAR')
        ${dpto ? "AND departamento = ?" : ""}
      GROUP BY departamento
    ) e ON s.departamento = e.departamento
    ORDER BY COALESCE(s.departamento, e.departamento)
  `).all(...(dpto ? [dpto, dpto] : []));

  const total2024 = (db.prepare(`SELECT COUNT(DISTINCT ci) as t FROM hist_2024 WHERE subsistema='REGULAR'`).get() as { t: number }).t;
  const total2025 = (db.prepare(`SELECT COUNT(DISTINCT ci) as t FROM hist_2025 WHERE subsistema='REGULAR'`).get() as { t: number }).t;

  return NextResponse.json({
    total_regular_2024: total2024,
    total_regular_2025: total2025,
    variacion_neta: total2025 - total2024,
    por_departamento: rows,
  });
}

function getImpertinencias(db: Database.Database, dpto: string) {
  const rows = db.prepare(`
    SELECT
      departamento,
      COUNT(*) as total_docentes,
      SUM(CASE WHEN pertinencia='NO' THEN 1 ELSE 0 END) as impertinentes,
      ROUND(SUM(CASE WHEN pertinencia='NO' THEN 1 ELSE 0 END) * 100.0 / COUNT(*), 2) as porcentaje
    FROM hist_2026
    ${dpto ? "WHERE departamento = ?" : ""}
    GROUP BY departamento
    ORDER BY impertinentes DESC
  `).all(...(dpto ? [dpto] : []));

  const totales = db.prepare(`
    SELECT COUNT(*) as total, SUM(CASE WHEN pertinencia='NO' THEN 1 ELSE 0 END) as impert
    FROM hist_2026
  `).get() as { total: number; impert: number };

  return NextResponse.json({
    total_docentes: totales.total,
    total_impertinentes: totales.impert,
    porcentaje_nacional: parseFloat(((totales.impert / totales.total) * 100).toFixed(2)),
    por_departamento: rows,
  });
}

function getSinCargo(db: Database.Database, dpto: string) {
  // 2026 con cargo vacío
  const sinCargoRows = db.prepare(`
    SELECT departamento, COUNT(*) as sin_cargo
    FROM hist_2026
    WHERE TRIM(cargo) = ''
    ${dpto ? "AND departamento = ?" : ""}
    GROUP BY departamento
    ORDER BY sin_cargo DESC
  `).all(...(dpto ? [dpto] : []));

  const totalSinCargo = (db.prepare(
    `SELECT COUNT(*) as t FROM hist_2026 WHERE TRIM(cargo) = ''`
  ).get() as { t: number }).t;

  // 2025 REGULAR sin presencia en 2026
  const sinPresencia = db.prepare(`
    SELECT h25.departamento, COUNT(DISTINCT h25.ci) as sin_presencia
    FROM hist_2025 h25
    WHERE h25.subsistema = 'REGULAR'
      AND h25.ci NOT IN (SELECT ci FROM hist_2026)
      ${dpto ? "AND h25.departamento = ?" : ""}
    GROUP BY h25.departamento
    ORDER BY h25.departamento
  `).all(...(dpto ? [dpto] : []));

  const totalSinPresencia = (db.prepare(`
    SELECT COUNT(DISTINCT ci) as t FROM hist_2025
    WHERE subsistema = 'REGULAR'
      AND ci NOT IN (SELECT ci FROM hist_2026)
  `).get() as { t: number }).t;

  return NextResponse.json({
    sin_cargo_2026: {
      total: totalSinCargo,
      descripcion: "Docentes en 2026 con campo cargo vacío",
      por_departamento: sinCargoRows,
    },
    sin_presencia_2026: {
      total: totalSinPresencia,
      descripcion: "Docentes en planilla REGULAR 2025 que no aparecen en el archivo 2026",
      por_departamento: sinPresencia,
    },
  });
}
