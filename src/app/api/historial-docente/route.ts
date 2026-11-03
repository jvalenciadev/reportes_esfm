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
      let items = data.salientes_entrantes || [];
      if (dpto) {
        items = items.filter(
          (r: { departamento: string }) =>
            r.departamento.toLowerCase() === dpto.toLowerCase()
        );
      }
      return NextResponse.json(items);
    } else if (report === "impertinencias") {
      let items = data.impertinencias || [];
      if (dpto) {
        items = items.filter(
          (r: { departamento: string }) =>
            r.departamento.toLowerCase() === dpto.toLowerCase()
        );
      }
      return NextResponse.json(items);
    } else if (report === "sin_cargo") {
      let items = data.sin_cargo || [];
      if (dpto) {
        items = items.filter(
          (r: { departamento: string }) =>
            r.departamento.toLowerCase() === dpto.toLowerCase()
        );
      }
      return NextResponse.json(items);
    } else {
      return NextResponse.json(data);
    }
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
