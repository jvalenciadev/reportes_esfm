import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";

const JSON_PATH = path.join(process.cwd(), "src/data/historial_reportes.json");

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const report = searchParams.get("report") || "all";
  const dpto = searchParams.get("departamento") || "";

  try {
    if (!fs.existsSync(JSON_PATH)) {
      return NextResponse.json(
        { error: "Archivo de reportes históricos no encontrado" },
        { status: 404 }
      );
    }

    const raw = fs.readFileSync(JSON_PATH, "utf-8");
    const data = JSON.parse(raw);

    if (report === "salientes_entrantes") {
      const se = data.salientes_entrantes || {};
      const porDpto = (se.por_departamento || []).map((r: any) => ({
        departamento: r.departamento,
        salientes: r.salientes ?? r.salientes_2024_2025 ?? 0,
        entrantes: r.entrantes ?? r.entrantes_2024_2025 ?? 0,
        neto: r.neto ?? ((r.entrantes ?? r.entrantes_2024_2025 ?? 0) - (r.salientes ?? r.salientes_2024_2025 ?? 0)),
      }));

      const filtered = dpto
        ? porDpto.filter((r: any) => r.departamento.toLowerCase() === dpto.toLowerCase())
        : porDpto;

      const total2024 = se.total_regular_2024 ?? 0;
      const total2025 = se.total_regular_2025 ?? 0;

      return NextResponse.json({
        total_regular_2024: total2024,
        total_regular_2025: total2025,
        total_salientes: se.total_salientes ?? filtered.reduce((acc: number, cur: any) => acc + cur.salientes, 0),
        total_entrantes: se.total_entrantes ?? filtered.reduce((acc: number, cur: any) => acc + cur.entrantes, 0),
        variacion_neta: se.variacion_neta ?? (total2025 - total2024),
        por_departamento: filtered,
      });
    } else if (report === "impertinencias") {
      const imp = data.impertinencias || {};
      const totalDoc = imp.total_docentes ?? imp.total_docentes_2026 ?? 0;
      const totalImp = imp.total_impertinentes ?? 0;
      const pctNac = imp.porcentaje_nacional ?? (totalDoc > 0 ? Number(((totalImp / totalDoc) * 100).toFixed(2)) : 0);

      let porDpto = imp.por_departamento || [];
      if (dpto) {
        porDpto = porDpto.filter((r: any) => r.departamento.toLowerCase() === dpto.toLowerCase());
      }

      return NextResponse.json({
        total_docentes: totalDoc,
        total_impertinentes: totalImp,
        porcentaje_nacional: pctNac,
        por_departamento: porDpto,
      });
    } else if (report === "sin_cargo") {
      const sc = data.sin_cargo || {};
      const sc2026 = sc.sin_cargo_2026 || { total: 0, por_departamento: [] };
      const sp2026 = sc.sin_presencia_2026 || { total: 0, por_departamento: [] };

      let porDptoSc = (sc2026.por_departamento || []).map((r: any) => ({
        departamento: r.departamento,
        sin_cargo: r.sin_cargo ?? 0,
      }));
      let porDptoSp = (sp2026.por_departamento || []).map((r: any) => ({
        departamento: r.departamento,
        sin_presencia: r.sin_presencia ?? r.sin_presencia_2026 ?? 0,
      }));

      if (dpto) {
        porDptoSc = porDptoSc.filter((r: any) => r.departamento.toLowerCase() === dpto.toLowerCase());
        porDptoSp = porDptoSp.filter((r: any) => r.departamento.toLowerCase() === dpto.toLowerCase());
      }

      return NextResponse.json({
        sin_cargo_2026: {
          total: sc2026.total ?? 0,
          descripcion: sc2026.descripcion ?? sc.descripcion ?? "",
          por_departamento: porDptoSc,
        },
        sin_presencia_2026: {
          total: sp2026.total ?? 0,
          descripcion: sp2026.descripcion ?? sc.descripcion ?? "",
          por_departamento: porDptoSp,
        },
      });
    } else {
      return NextResponse.json(data);
    }
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
