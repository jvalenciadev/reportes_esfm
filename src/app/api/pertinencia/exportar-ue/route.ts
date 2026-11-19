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
    const exportPath = path.join(cwd, 'public', 'exports', 'Reporte_Pertinencia_Por_UE.xlsx');
    const jsonPath = path.join(cwd, 'src', 'data', 'pertinencia_por_ue.json');
    const scriptPath = path.join(cwd, 'scripts', 'generate_ue_excel.py');

    let shouldRegenerate = !fs.existsSync(exportPath);

    if (!shouldRegenerate && fs.existsSync(jsonPath)) {
      const exportMtime = fs.statSync(exportPath).mtimeMs;
      const jsonMtime = fs.statSync(jsonPath).mtimeMs;
      const scriptMtime = fs.statSync(scriptPath).mtimeMs;
      if (jsonMtime > exportMtime || scriptMtime > exportMtime) {
        shouldRegenerate = true;
      }
    }

    if (shouldRegenerate) {
      await execFileAsync('python', [scriptPath, exportPath]);
    }

    if (!fs.existsSync(exportPath)) {
      return NextResponse.json(
        { error: 'No se pudo generar el archivo de reporte por UE.' },
        { status: 500 }
      );
    }

    const fileBuffer = fs.readFileSync(exportPath);

    return new Response(fileBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': 'attachment; filename="Reporte_Pertinencia_Por_UE.xlsx"',
        'Cache-Control': 'no-store, no-cache, must-revalidate',
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Error desconocido al exportar';
    console.error('[pertinencia/exportar-ue] Error:', err);
    return NextResponse.json(
      { error: 'Error interno al generar el reporte Excel por UE.', details: message },
      { status: 500 }
    );
  }
}
