export interface ExportPdfParams {
  filtroDepto: string;
  filtroNivel: string;
  factorTit: number;
  tasaJubilacion: number;
  tasaPrejubilacion: number;
  tasaReemplazoNoPert: number;
  pctAbsorcionBth: number;
  tipoAsignacionEgresados: 'radicacion' | 'bolsa';
  aplicarArima: boolean;
  pctMigracion: number;
  totales: {
    totDeficit: number;
    totJub: number;
    totPrejub: number;
    totNoPert: number;
    totSaldoMig: number;
    totDemanda: number;
    totEgresados: number;
    totBrecha: number;
  };
  especialidades: Array<{
    especialidad_id: number;
    nombre: string;
    hora_item: number;
    nivel_nombre: string;
    metrics: {
      deficit_calculado: number;
      items_bth_absorbidos: number;
      jubilacion_calculada: number;
      prejubilacion_calculada: number;
      reemplazo_nopert: number;
      saldo_mig_aplicado: number;
      demanda_total: number;
      egresados_2027_2031: number;
      brecha_neta: number;
    };
  }>;
}

export function exportBalancePredictivoPdf(params: ExportPdfParams) {
  const {
    filtroDepto,
    filtroNivel,
    factorTit,
    tasaJubilacion,
    tasaPrejubilacion,
    tasaReemplazoNoPert,
    pctAbsorcionBth,
    tipoAsignacionEgresados,
    aplicarArima,
    pctMigracion,
    totales,
    especialidades
  } = params;

  const fechaHoy = new Date().toLocaleDateString('es-BO', {
    day: '2-digit',
    month: 'long',
    year: 'numeric'
  });

  const fmt = (n: number) => n.toLocaleString('es-BO');

  const rowsHtml = especialidades.map((esp, i) => {
    const m = esp.metrics;
    const esDeficit = m.brecha_neta > 0;
    const colorBrecha = esDeficit ? '#b91c1c' : '#047857';
    const bgBrecha = esDeficit ? '#fef2f2' : '#ecfdf5';
    const badgeTexto = esDeficit ? `+${fmt(m.brecha_neta)} (Déficit)` : `${fmt(m.brecha_neta)} (Cubierto)`;

    return `
      <tr style="border-bottom: 1px solid #e2e8f0; font-size: 8.5pt;">
        <td style="padding: 4px 6px; text-align: center; color: #64748b;">${esp.especialidad_id}</td>
        <td style="padding: 4px 6px; font-weight: bold; color: #0f172a;">
          ${esp.nombre}
          <span style="display: block; font-size: 7pt; font-weight: normal; color: #64748b;">${esp.nivel_nombre} · ${esp.hora_item}h/ítem</span>
        </td>
        <td style="padding: 4px 6px; text-align: right; background: #f8fafc;">${fmt(m.deficit_calculado)}</td>
        <td style="padding: 4px 6px; text-align: right;">${fmt(m.items_bth_absorbidos)}</td>
        <td style="padding: 4px 6px; text-align: right;">${fmt(m.jubilacion_calculada)}</td>
        <td style="padding: 4px 6px; text-align: right;">${fmt(m.prejubilacion_calculada)}</td>
        <td style="padding: 4px 6px; text-align: right;">${fmt(m.reemplazo_nopert)}</td>
        <td style="padding: 4px 6px; text-align: right; color: ${m.saldo_mig_aplicado >= 0 ? '#047857' : '#b91c1c'};">
          ${m.saldo_mig_aplicado >= 0 ? '+' : ''}${fmt(m.saldo_mig_aplicado)}
        </td>
        <td style="padding: 4px 6px; text-align: right; font-weight: bold; background: #eff6ff; color: #1e3a8a;">
          ${fmt(m.demanda_total)}
        </td>
        <td style="padding: 4px 6px; text-align: right; font-weight: bold; background: #ecfdf5; color: #065f46;">
          ${fmt(m.egresados_2027_2031)}
        </td>
        <td style="padding: 4px 6px; text-align: right; font-weight: bold; background: ${bgBrecha}; color: ${colorBrecha};">
          ${badgeTexto}
        </td>
      </tr>
    `;
  }).join('');

  const html = `
    <!DOCTYPE html>
    <html lang="es">
    <head>
      <meta charset="UTF-8">
      <title>Informe Oficial - Balance Predictivo de Admisión ESFM 2031</title>
      <style>
        @page {
          size: letter landscape;
          margin: 10mm 12mm 12mm 12mm;
        }
        * { box-sizing: border-box; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif; }
        body { margin: 0; color: #0f172a; font-size: 9pt; line-height: 1.35; background: #fff; }
        .header { display: flex; justify-content: space-between; align-items: flex-start; padding-bottom: 8px; border-bottom: 2px solid #0f766e; margin-bottom: 10px; }
        .title h1 { margin: 0; font-size: 15pt; font-weight: 900; color: #0f766e; letter-spacing: -0.5px; }
        .title p { margin: 2px 0 0 0; font-size: 8pt; color: #475569; }
        .meta { text-align: right; font-size: 7.5pt; color: #64748b; }
        .kpis { display: grid; grid-template-columns: repeat(6, 1fr); gap: 6px; margin-bottom: 10px; }
        .kpi { border: 1px solid #cbd5e1; border-radius: 6px; padding: 6px; background: #f8fafc; }
        .kpi-title { font-size: 6.8pt; font-weight: bold; text-transform: uppercase; color: #64748b; }
        .kpi-val { font-size: 12pt; font-weight: 900; color: #0f172a; margin-top: 2px; }
        .kpi-sub { font-size: 6.5pt; color: #94a3b8; }
        .params { background: #f1f5f9; border-left: 3px solid #0284c7; padding: 6px 10px; font-size: 7.5pt; margin-bottom: 10px; border-radius: 0 4px 4px 0; }
        table { width: 100%; border-collapse: collapse; margin-top: 6px; }
        th { background: #1e293b; color: #fff; font-size: 7.5pt; font-weight: bold; text-transform: uppercase; padding: 5px 6px; text-align: center; }
        tfoot td { background: #e2e8f0; font-weight: 900; font-size: 8.5pt; padding: 5px 6px; }
        .doc-section { margin-top: 14px; page-break-inside: avoid; border: 1px solid #cbd5e1; border-radius: 6px; padding: 10px; background: #fafafa; font-size: 7.8pt; }
        .doc-section h2 { font-size: 9.5pt; margin: 0 0 6px 0; color: #0f766e; border-bottom: 1px solid #e2e8f0; padding-bottom: 4px; }
        .doc-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; }
        .doc-box { background: #fff; border: 1px solid #e2e8f0; border-radius: 4px; padding: 6px 8px; }
        .doc-box strong { color: #0369a1; display: block; margin-bottom: 2px; font-size: 8pt; }
        .formula { background: #f8fafc; font-family: monospace; font-size: 7pt; padding: 4px; border-radius: 3px; border: 1px dashed #cbd5e1; margin-top: 3px; display: block; }
        .footer { margin-top: 12px; font-size: 7pt; color: #94a3b8; display: flex; justify-content: space-between; border-top: 1px solid #e2e8f0; padding-top: 6px; }
        @media print {
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .no-print { display: none !important; }
        }
      </style>
    </head>
    <body>
      <div class="header">
        <div class="title">
          <h1>INFORME OFICIAL: BALANCE PREDICTIVO DE ADMISIÓN ESFM 2031</h1>
          <p>Planificación Quinquenal de Cupos de Formación Docente · Estado Plurinacional de Bolivia</p>
        </div>
        <div class="meta">
          <div><strong>Fecha Emisión:</strong> ${fechaHoy}</div>
          <div><strong>Ámbito:</strong> ${filtroDepto === 'TODOS' ? 'CONSOLIDADO NACIONAL (9 DEPTOS)' : 'DEPARTAMENTO: ' + filtroDepto}</div>
          <div><strong>Nivel Filtro:</strong> ${filtroNivel}</div>
          <div><strong>Modelo Asignación:</strong> ${tipoAsignacionEgresados === 'radicacion' ? 'Radicación Real (Matriz)' : 'Bolsa Nacional (Cuota)'}</div>
        </div>
      </div>

      <!-- PARÁMETROS ACTIVOS EN LA SIMULACIÓN -->
      <div class="params">
        <strong>Variables de Simulación Activas:</strong>
        Titulación ESFM: <b>${factorTit}%</b> |
        Jubilación Docente: <b>${tasaJubilacion}%</b> |
        Prejubilación 26-31: <b>${tasaPrejubilacion}%</b> |
        Reemplazo No Pertinentes: <b>${tasaReemplazoNoPert}%</b> |
        Absorción BTH: <b>${pctAbsorcionBth}%</b> (de 88.063 hrs) |
        Demografía ARIMA: <b>${aplicarArima ? 'Activada' : 'Desactivada'}</b> |
        Saldo Migratorio: <b>${pctMigracion}%</b>
      </div>

      <!-- RIBBON DE KPIS -->
      <div class="kpis">
        <div class="kpi">
          <div class="kpi-title">Déficit Histórico SIE</div>
          <div class="kpi-val" style="color:#b45309;">${fmt(totales.totDeficit)}</div>
          <div class="kpi-sub">Aulas sin ítem oficial</div>
        </div>
        <div class="kpi">
          <div class="kpi-title">Bajas (Jub + Prejub)</div>
          <div class="kpi-val" style="color:#4338ca;">${fmt(totales.totJub + totales.totPrejub)}</div>
          <div class="kpi-sub">Vacancias 2026–2031</div>
        </div>
        <div class="kpi">
          <div class="kpi-title">No Pertinencia (Sustitución)</div>
          <div class="kpi-val" style="color:#d97706;">${fmt(totales.totNoPert)}</div>
          <div class="kpi-sub">Docentes fuera de especialidad</div>
        </div>
        <div class="kpi" style="background:#eff6ff;">
          <div class="kpi-title" style="color:#1e40af;">Demanda Bruta Total</div>
          <div class="kpi-val" style="color:#1e3a8a;">${fmt(totales.totDemanda)}</div>
          <div class="kpi-sub">Aulas requeridas al 2031</div>
        </div>
        <div class="kpi" style="background:#ecfdf5;">
          <div class="kpi-title" style="color:#065f46;">Oferta Egresados ESFM</div>
          <div class="kpi-val" style="color:#047857;">${fmt(totales.totEgresados)}</div>
          <div class="kpi-sub">Cohortes activas (factor ${factorTit}%)</div>
        </div>
        <div class="kpi" style="background:${totales.totBrecha > 0 ? '#fef2f2' : '#ecfdf5'};">
          <div class="kpi-title" style="color:${totales.totBrecha > 0 ? '#991b1b' : '#065f46'};">
            ${totales.totBrecha > 0 ? 'Déficit Neto a Abrir' : 'Superávit / Saturación'}
          </div>
          <div class="kpi-val" style="color:${totales.totBrecha > 0 ? '#b91c1c' : '#047857'};">
            ${totales.totBrecha > 0 ? '+' : ''}${fmt(totales.totBrecha)}
          </div>
          <div class="kpi-sub">Balance final 2031</div>
        </div>
      </div>

      <!-- TABLA PRINCIPAL DE ESPECIALIDADES -->
      <table>
        <thead>
          <tr>
            <th style="width:30px;">ID</th>
            <th style="text-align:left;">Especialidad / Carrera Docente</th>
            <th style="width:65px;">Déficit SIE</th>
            <th style="width:65px;">BTH 88k</th>
            <th style="width:60px;">Jubilados</th>
            <th style="width:60px;">Prejub.</th>
            <th style="width:65px;">Sust. NoPert</th>
            <th style="width:65px;">Saldo Mig.</th>
            <th style="width:80px; background:#1e3a8a;">Demanda Total</th>
            <th style="width:80px; background:#065f46;">Oferta Egres.</th>
            <th style="width:90px; background:#0f172a;">Brecha Neta</th>
          </tr>
        </thead>
        <tbody>
          ${rowsHtml}
        </tbody>
        <tfoot>
          <tr>
            <td colspan="2" style="text-align:left;">TOTAL CONSOLIDADO (${especialidades.length} ESPECIALIDADES)</td>
            <td style="text-align:right;">${fmt(totales.totDeficit)}</td>
            <td style="text-align:right;">—</td>
            <td style="text-align:right;">${fmt(totales.totJub)}</td>
            <td style="text-align:right;">${fmt(totales.totPrejub)}</td>
            <td style="text-align:right;">${fmt(totales.totNoPert)}</td>
            <td style="text-align:right; color:${totales.totSaldoMig >= 0 ? '#047857' : '#b91c1c'};">
              ${totales.totSaldoMig >= 0 ? '+' : ''}${fmt(totales.totSaldoMig)}
            </td>
            <td style="text-align:right; color:#1e3a8a;">${fmt(totales.totDemanda)}</td>
            <td style="text-align:right; color:#065f46;">${fmt(totales.totEgresados)}</td>
            <td style="text-align:right; color:${totales.totBrecha > 0 ? '#b91c1c' : '#047857'};">
              ${totales.totBrecha > 0 ? '+' : ''}${fmt(totales.totBrecha)}
            </td>
          </tr>
        </tfoot>
      </table>

      <!-- DOCUMENTACIÓN Y METODOLOGÍA -->
      <div class="doc-section">
        <h2>Documentación Metodológica y Fuentes Oficiales</h2>
        <div class="doc-grid">
          <div class="doc-box">
            <strong>1. Demanda Bruta Quinquenal</strong>
            Cuantifica las necesidades docentes reales proyectadas al 2031 sumando déficit histórico acumulado en unidades educativas, vacancias por retiro legal y regularización de pertinencia académica.
            <span class="formula">Demanda = (Déficit + BTH + Jub + Prejub + NoPert) × (1 + ARIMA) + SaldoMig</span>
          </div>

          <div class="doc-box">
            <strong>2. Radicación Real vs Retorno a Depto</strong>
            Calculado con la <em>Matriz de Transición Empírica (35.474 egresados)</em>. Pondera dónde estudió el docente vs dónde radica cobrando en planilla SEP para modelar la migración interdepartamental real.
            <span class="formula">Radicación(Dest, Esp) = Σ [ EgresadosSede(Orig) × P(Orig → Dest) ]</span>
          </div>

          <div class="doc-box">
            <strong>3. Interpretación de la Brecha Neta</strong>
            <b>Positiva (+): DÉFICIT REAL.</b> La oferta de egresados de la ESFM no cubre la demanda requerida; se justifica abrir cupos o crear nuevas cohortes.<br/>
            <b>Negativa (−): SUPERÁVIT / SATURACIÓN.</b> El mercado docente está cubierto o saturado; riesgo de desempleo profesional.
          </div>
        </div>
      </div>

      <div class="footer">
        <div>Sistema Integrado de Planificación de Admisión ESFM · Ministerio de Educación · DGFM / SEP</div>
        <div>Generado automáticamente desde el Dashboard Predictivo 2031</div>
      </div>

      <script>
        window.onload = function() {
          window.print();
        };
      </script>
    </body>
    </html>
  `;

  const ventana = window.open('', '_blank', 'width=1100,height=850');
  if (ventana) {
    ventana.document.write(html);
    ventana.document.close();
  }
}
