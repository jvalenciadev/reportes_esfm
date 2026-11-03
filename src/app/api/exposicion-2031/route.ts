import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";

const DATA_PATH = path.join(process.cwd(), "src/data/exposicion_2031.json");

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const dpto = searchParams.get("departamento") || "TODOS";
    const dictamenFiltro = searchParams.get("dictamen") || "TODOS";

    if (!fs.existsSync(DATA_PATH)) {
      return NextResponse.json({ error: "Datos de exposición no encontrados. Ejecute build_exposicion_data.py" }, { status: 404 });
    }

    const raw = fs.readFileSync(DATA_PATH, "utf-8");
    const data = JSON.parse(raw);

    // Si pide filtro por departamento específico
    if (dpto !== "TODOS" && dpto !== "NACIONAL") {
      const dptoNorm = dpto.toUpperCase().replace("Í", "I").replace("Á", "A").replace("É", "E").replace("Ó", "O").replace("Ú", "U").trim();
      
      // Filtrar demografía INE para ese dpto
      const dptoIne = data.eje_1_demografia.por_departamento[dptoNorm] || null;
      
      // Filtrar dictamen de especialidades considerando los datos del departamento
      const dictamenDpto = data.dictamen_apertura_especialidades.map((esp: any) => {
        const dptoStat = esp.por_dpto[dptoNorm] || { total: 0, impertinentes: 0, pct_impert: 0 };
        return {
          ...esp,
          dpto_especifico: {
            departamento: dptoNorm,
            total_docentes: dptoStat.total,
            impertinentes: dptoStat.impertinentes,
            pct_impertinencia: dptoStat.pct_impert
          }
        };
      });

      return NextResponse.json({
        ...data,
        departamento_seleccionado: dptoNorm,
        demografia_departamento: dptoIne,
        dictamen_apertura_especialidades: dictamenDpto.filter((esp: any) => 
          dictamenFiltro === "TODOS" ? true : esp.dictamen === dictamenFiltro
        )
      });
    }

    if (dictamenFiltro !== "TODOS") {
      return NextResponse.json({
        ...data,
        dictamen_apertura_especialidades: data.dictamen_apertura_especialidades.filter(
          (esp: any) => esp.dictamen === dictamenFiltro
        )
      });
    }

    return NextResponse.json(data);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Error al procesar exposición" }, { status: 500 });
  }
}
