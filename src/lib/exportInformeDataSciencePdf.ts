export function exportInformeDataSciencePdf() {
  const fechaHoy = new Date().toLocaleDateString('es-BO', {
    day: '2-digit',
    month: 'long',
    year: 'numeric'
  });

  const html = `
    <!DOCTYPE html>
    <html lang="es">
    <head>
      <meta charset="UTF-8">
      <title>Informe Metodológico de Data Science - Sistema ESFM 2031</title>
      <style>
        @page {
          size: letter portrait;
          margin: 14mm 15mm 15mm 15mm;
        }
        * { box-sizing: border-box; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif; }
        body { margin: 0; color: #0f172a; font-size: 8.8pt; line-height: 1.45; background: #fff; }
        .header { border-bottom: 2.5px solid #0f766e; padding-bottom: 8px; margin-bottom: 12px; }
        .header h1 { margin: 0; font-size: 14pt; font-weight: 900; color: #0f766e; text-transform: uppercase; }
        .header h2 { margin: 2px 0 0 0; font-size: 9.5pt; font-weight: bold; color: #334155; }
        .meta { display: flex; justify-content: space-between; font-size: 7.5pt; color: #64748b; margin-top: 6px; }
        .card { border: 1px solid #cbd5e1; border-radius: 6px; padding: 10px; margin-bottom: 12px; background: #fafafa; page-break-inside: avoid; }
        .card-header { display: flex; align-items: center; justify-content: space-between; border-bottom: 1px solid #e2e8f0; padding-bottom: 5px; margin-bottom: 8px; }
        .card-title { font-size: 9.5pt; font-weight: 900; color: #0369a1; text-transform: uppercase; }
        .badge { font-size: 6.8pt; font-weight: bold; padding: 2px 6px; border-radius: 4px; background: #e0f2fe; color: #0369a1; border: 1px solid #bae6fd; }
        .grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
        .formula-box { background: #f8fafc; border: 1px dashed #cbd5e1; border-radius: 4px; padding: 6px 8px; font-family: monospace; font-size: 7.5pt; color: #0f172a; margin: 6px 0; }
        ul { margin: 4px 0 6px 18px; padding: 0; }
        li { margin-bottom: 3px; font-size: 8.2pt; }
        strong { color: #0f172a; }
        .table-summary { width: 100%; border-collapse: collapse; margin-top: 8px; font-size: 7.8pt; }
        .table-summary th { background: #1e293b; color: #fff; padding: 4px 6px; text-align: left; }
        .table-summary td { border: 1px solid #cbd5e1; padding: 4px 6px; }
        .footer { font-size: 7pt; color: #94a3b8; border-top: 1px solid #e2e8f0; padding-top: 6px; margin-top: 15px; display: flex; justify-content: space-between; }
        @media print {
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .no-print { display: none !important; }
        }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>INFORME TÉCNICO Y METODOLÓGICO DE DATA SCIENCE</h1>
        <h2>Modelos Matemáticos, Algoritmos y Fuentes Oficiales del Sistema Predictivo ESFM 2031</h2>
        <div class="meta">
          <div><strong>Autor:</strong> Equipo de Ciencia de Datos & Arquitectura de Software · DGFM / SEP</div>
          <div><strong>Fecha de Emisión:</strong> ${fechaHoy}</div>
          <div><strong>Estado:</strong> Válido para Planificación Quinquenal de Admisión</div>
        </div>
      </div>

      <!-- MÓDULO 1 -->
      <div class="card">
        <div class="card-header">
          <span class="card-title">1. Evolución y Proyección de Matrícula (2011–2034)</span>
          <span class="badge">Series Temporales ARIMA + Componentes</span>
        </div>
        <div class="grid-2">
          <div>
            <strong>Fuentes de Datos Primarias:</strong>
            <ul>
              <li>Censos Nacionales de Población y Vivienda 2012 y 2024 (INE).</li>
              <li>Series históricas de matrícula efectiva SIE (2011–2024) por departamento y curso.</li>
              <li>Tablas de Fecundidad y Mortalidad Infantil del INE.</li>
            </ul>
          </div>
          <div>
            <strong>Modelos y Algoritmos Aplicados:</strong>
            <ul>
              <li><strong>ARIMA(1,1,1):</strong> Captura la inercia demográfica diferenciada (contracción en valles/altiplano vs expansión en el oriente/amazonia).</li>
              <li><strong>Modelo de Flujo por Cohorte:</strong> Proyección grado a grado según tasas de promoción y rezago escolar.</li>
            </ul>
          </div>
        </div>
        <div class="formula-box">
          Fórmula ARIMA: Y'_t = c + φ₁·Y'_{t-1} + θ₁·ε_{t-1} + ε_t  ||  Factor Corrector: Δ%_ARIMA = (Matrícula_2031 - Matrícula_2026) / Matrícula_2026
        </div>
      </div>

      <!-- MÓDULO 2 -->
      <div class="card">
        <div class="card-header">
          <span class="card-title">2. Déficit por Materia (SIE / UIE)</span>
          <span class="badge">Censo 16.273 UEs & Malla Curricular</span>
        </div>
        <div class="grid-2">
          <div>
            <strong>Fuentes de Datos Primarias:</strong>
            <ul>
              <li>Matriz de Carga Horaria UIE / SIE UE: Censo auditado en 16.273 Unidades Educativas.</li>
              <li>169.000 registros de asignación curricular en aula vs ítems de planilla fiscal.</li>
              <li>Bolsa de 88.063 horas del Bachillerato Técnico Humanístico (BTH).</li>
            </ul>
          </div>
          <div>
            <strong>Lógica de Transformación Horas → Ítems:</strong>
            <ul>
              <li><strong>Divisor Curricular Específico (h_i):</strong> 100h en Inicial, 72h en Primaria, 96-104h en Secundaria, 96-120h en BTH.</li>
              <li><strong>Absorción BTH:</strong> Distribución equitativa (1/8 = 11.008h) a las 8 carreras técnicas reconocidas según tasa de absorción parametrizable.</li>
            </ul>
          </div>
        </div>
        <div class="formula-box">
          ÍtemsDéficit = ceil( HorasDéficit_SIE / h_i )  +  round( (Horas_BTH / 8 × %Absorción) / h_i )
        </div>
      </div>

      <!-- MÓDULO 3 -->
      <div class="card">
        <div class="card-header">
          <span class="card-title">3. Proyección Egresados ESFM</span>
          <span class="badge">Padrón 17.597 Estudiantes & Markov</span>
        </div>
        <div class="grid-2">
          <div>
            <strong>Fuentes de Datos Primarias:</strong>
            <ul>
              <li>Padrón DGFM de estudiantes activos en aulas de las 46 ESFMs y Unidades Académicas.</li>
              <li>Cohortes matriculadas 2022, 2023, 2024, 2025 y 2026 (17.597 estudiantes en total).</li>
            </ul>
          </div>
          <div>
            <strong>Modelo de Deserción y Merma Longitudinal:</strong>
            <ul>
              <li>Cadena de Markov de retención académica a 5 años.</li>
              <li>Tasa empírica histórica de titulación: <strong>82%</strong> (18% merma por rezago o abandono vocacional).</li>
              <li>Proyección: 14.430 egresados al 82% | 17.597 a capacidad plena (100%).</li>
            </ul>
          </div>
        </div>
        <div class="formula-box">
          Egresados_2027_2031 = Σ_{c=2022}^{2026} round( Inscritos_c × FactorTitulación )
        </div>
      </div>

      <!-- MÓDULO 4 -->
      <div class="card">
        <div class="card-header">
          <span class="card-title">4. Pertinencia Docente SEP (Padrón Oficial)</span>
          <span class="badge">169.000 Docentes CAS vs RDA</span>
        </div>
        <div class="grid-2">
          <div>
            <strong>Fuentes de Datos Primarias:</strong>
            <ul>
              <li>Cruce del Padrón CAS (Calificación de Años de Servicio) con la base SIE Docente.</li>
              <li>Registro de Títulos en Provisión Nacional (RDA) de 169.000 docentes en ejercicio.</li>
            </ul>
          </div>
          <div>
            <strong>Clasificación Tridimensional de Calidad:</strong>
            <ul>
              <li><strong>Alta Pertinencia (V):</strong> Título coincide exactamente con la materia dictada.</li>
              <li><strong>Media Pertinencia (A):</strong> Docente con título afín o nivel vecino.</li>
              <li><strong>Baja / Sin Pertinencia (N / SIN):</strong> Inconsistencia total (déficit cualitativo).</li>
              <li>Sustitución programada de docentes no pertinentes al 2031.</li>
            </ul>
          </div>
        </div>
        <div class="formula-box">
          DemandaSustitución = round( (Baja_N + Sin_Pert + [Media_A si aplica]) × %TasaReemplazo )
        </div>
      </div>

      <!-- MÓDULO 5 -->
      <div class="card">
        <div class="card-header">
          <span class="card-title">5. Movilidad y Migración (Titulados ESFM & Planilla SEP)</span>
          <span class="badge">Matriz Estocástica 9x9 (35.474 Registros)</span>
        </div>
        <div class="grid-2">
          <div>
            <strong>Fuentes de Datos Primarias:</strong>
            <ul>
              <li>Trazabilidad longitudinal de 35.474 egresados ESFM (periodo 2014–2025).</li>
              <li>Cruce de Sede ESFM de titulación vs Departamento de radicación efectiva en cobro fiscal.</li>
            </ul>
          </div>
          <div>
            <strong>Modelo de Radicación Real (Retorno a Depto):</strong>
            <ul>
              <li>Matriz de probabilidades condicionales P(Origen → Destino).</li>
              <li>Diagonal: Retención local (Santa Cruz 94.3%, Cochabamba 87.7%, Beni 72.9%).</li>
              <li>Fuera de diagonal: Flujos de retorno hacia departamentos de origen familiar.</li>
            </ul>
          </div>
        </div>
        <div class="formula-box">
          RadicaciónReal(Dest, Esp) = Σ_{Orig=1}^{9} [ EgresadosSede(Orig, Esp) × P(Orig → Dest) ]
        </div>
      </div>

      <!-- MÓDULO 6 -->
      <div class="card" style="border: 1.5px solid #0f766e; background: #f0fdfa;">
        <div class="card-header" style="border-bottom-color: #99f6e4;">
          <span class="card-title" style="color: #0f766e;">6. Balance Predictivo 2031 (Síntesis Multicriterio)</span>
          <span class="badge" style="background:#ccfbf1; color:#0f766e; border-color:#5eead4;">Ecuación Maestra de Admisión</span>
        </div>
        <p style="margin: 4px 0 6px 0; font-size: 8.3pt;">
          Integra la <strong>Demanda Bruta Total</strong> (Aulas sin ítem + Jubilaciones + Prejubilaciones + Reemplazo de No Pertinentes, ajustados por ARIMA y Saldo Migratorio) frente a la <strong>Oferta de Egresados</strong> (Radicación Real o Bolsa Nacional).
        </p>
        <div class="formula-box" style="background:#fff; border-color:#0f766e; font-weight:bold;">
          Brecha Neta = DemandaTotal - OfertaEgresados<br/>
          DemandaTotal = round( (Déficit + BTH + Jub + Prejub + NoPert) × (1 + Δ%_ARIMA) + SaldoMig )
        </div>
        <div style="font-size: 8pt; margin-top: 4px;">
          <strong>Regla de Decisión Operativa:</strong><br/>
          • <strong>Brecha Neta > 0 (+): DÉFICIT REAL.</strong> Se justifica la apertura de plazas de admisión en la ESFM.<br/>
          • <strong>Brecha Neta ≤ 0 (−): SUPERÁVIT / MERCADO CUBIERTO.</strong> Se recomienda congelar o pausar la apertura de cupos para evitar saturación y desempleo profesional.
        </div>
      </div>

      <!-- TABLA RESUMEN -->
      <table class="table-summary">
        <thead>
          <tr>
            <th>Módulo</th>
            <th>Fuente Primaria</th>
            <th>Técnica / Modelo de Data Science</th>
            <th>Variables Clave</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><strong>1. Matrícula</strong></td>
            <td>INE Censos + SIE Anual</td>
            <td>ARIMA(1,1,1) + Cohort Component Method</td>
            <td>Tasa Fecundidad, Proyección 2034, Pirámides</td>
          </tr>
          <tr>
            <td><strong>2. Déficit Materia</strong></td>
            <td>UIE / SIE UE (16.273 UEs)</td>
            <td>Malla Curricular Horaria ÷ h_i + Asignación BTH</td>
            <td>Horas déficit, divisor 72-120h, 88k hrs BTH</td>
          </tr>
          <tr>
            <td><strong>3. Egresados ESFM</strong></td>
            <td>DGFM (17.597 inscritos)</td>
            <td>Cadena de Markov de Absorción y Retención</td>
            <td>Factor Titulación (82% - 100%), Merma 18%</td>
          </tr>
          <tr>
            <td><strong>4. Pertinencia</strong></td>
            <td>CAS Planillas vs RDA</td>
            <td>Clasificación Multiclase de Perfil (V/A/N)</td>
            <td>Tasa de Sustitución No Pertinente, Calidad</td>
          </tr>
          <tr>
            <td><strong>5. Migración</strong></td>
            <td>35.474 egresados vs SEP</td>
            <td>Matriz Estocástica de Transición 9x9</td>
            <td>Tasa de Retención Local, Retorno a Depto</td>
          </tr>
          <tr>
            <td><strong>6. Balance 2031</strong></td>
            <td>Consolidado de 5 Módulos</td>
            <td>Álgebra Matricial de Brecha Neta Quinquenal</td>
            <td>Apertura / Congelamiento de Cupos en ESFMs</td>
          </tr>
        </tbody>
      </table>

      <div class="footer">
        <div>Sistema Predictivo de Admisión Docente ESFM 2031 · Ministerio de Educación · DGFM</div>
        <div>Documento Técnico Metodológico Certificado · Generado para Descarga en PDF</div>
      </div>

      <script>
        window.onload = function() {
          window.print();
        };
      </script>
    </body>
    </html>
  `;

  const ventana = window.open('', '_blank', 'width=1100,height=900');
  if (ventana) {
    ventana.document.write(html);
    ventana.document.close();
  }
}
