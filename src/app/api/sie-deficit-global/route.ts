import { NextRequest, NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs';
import { execFile } from 'child_process';
import { promisify } from 'util';

const execFileAsync = promisify(execFile);

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const cwd = process.cwd();
    const filePath = path.join(cwd, 'src/data/sie_deficit_resumen_global.json');
    const filtrosPath = path.join(cwd, 'src/data/filtros_materia_config.json');
    const scriptSie = path.join(cwd, 'src/scripts/build_sie_deficit_resumen.py');
    const scriptEgr = path.join(cwd, 'src/scripts/build_egresados_proyeccion.py');

    const { searchParams } = new URL(req.url);
    const forceRebuild = searchParams.get('rebuild') === '1' || searchParams.get('force') === '1';

    let shouldRebuild = forceRebuild || !fs.existsSync(filePath);

    if (!shouldRebuild && fs.existsSync(filtrosPath) && fs.existsSync(filePath)) {
      const filtrosMtime = fs.statSync(filtrosPath).mtimeMs;
      const resumenMtime = fs.statSync(filePath).mtimeMs;
      if (filtrosMtime > resumenMtime) {
        shouldRebuild = true;
      }
    }

    if (shouldRebuild) {
      try {
        if (fs.existsSync(scriptSie)) {
          await execFileAsync('python', [scriptSie], { cwd });
        }
        if (fs.existsSync(scriptEgr)) {
          await execFileAsync('python', [scriptEgr], { cwd });
        }
      } catch (calcErr) {
        console.warn('Aviso recalculando sie_deficit_resumen_global:', calcErr);
      }
    }

    if (!fs.existsSync(filePath)) {
      return NextResponse.json({ error: 'Archivo de déficit no disponible' }, { status: 404 });
    }

    const stat = fs.statSync(filePath);
    const raw = fs.readFileSync(filePath, 'utf-8');
    const data = JSON.parse(raw);

    return NextResponse.json({
      ...data,
      _mtime: stat.mtimeMs,
      _updatedAt: stat.mtime.toISOString(),
      _recalculated: shouldRebuild,
    }, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
      }
    });
  } catch (err: any) {
    console.error('[api/sie-deficit-global] Error:', err);
    return NextResponse.json({ error: err.message || 'Error cargando déficit global' }, { status: 500 });
  }
}
