import { NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs';
import { execFile } from 'child_process';
import { promisify } from 'util';

const execFileAsync = promisify(execFile);

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const cwd = process.cwd();
    const exportPath = path.join(cwd, 'public', 'exports', 'Reporte_Pertinencia_Docente_Graficos.xlsx');
    const jsonPath = path.join(cwd, 'src', 'data', 'pertinencia_data.json');
    const ueJsonPath = path.join(cwd, 'src', 'data', 'pertinencia_por_ue.json');
    const scriptPath = path.join(cwd, 'scripts', 'generate_pertinencia_excel.py');

    let shouldRegenerate = !fs.existsSync(exportPath);

    if (!shouldRegenerate && fs.existsSync(jsonPath)) {
      const exportMtime = fs.statSync(exportPath).mtimeMs;
      const jsonMtime = fs.statSync(jsonPath).mtimeMs;
      const scriptMtime = fs.statSync(scriptPath).mtimeMs;
      const ueMtime = fs.existsSync(ueJsonPath) ? fs.statSync(ueJsonPath).mtimeMs : 0;
      if (jsonMtime > exportMtime || scriptMtime > exportMtime || ueMtime > exportMtime) {
        shouldRegenerate = true;
      }
    }

    if (shouldRegenerate) {
      await execFileAsync('python', [scriptPath, exportPath]);
    }

    if (!fs.existsSync(exportPath)) {
      return NextResponse.json(
        { error: 'No se pudo generar el archivo de reporte Excel.' },
        { status: 500 }
      );
    }

    const fileBuffer = fs.readFileSync(exportPath);

    return new Response(fileBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': 'attachment; filename="Reporte_Pertinencia_Docente_Graficos.xlsx"',
        'Cache-Control': 'no-store, no-cache, must-revalidate',
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Error desconocido al exportar';
    console.error('[pertinencia/exportar-excel] Error:', err);
    return NextResponse.json(
      { error: 'Error interno al generar el reporte Excel con gráficos.', details: message },
      { status: 500 }
    );
  }
}
