import { useState } from 'react';
import { campanas, descargarCSV } from '../data';
import { Badge, Bars, Button, Card, Icon, PageHeader, RiskBadge, SectionTitle, Logo, DataTable } from '../components/ui';

const REPORTES = [
  {
    titulo: 'Resumen por campaña',
    descripcion: 'Resultados, embudo y detalle por destinatario.',
    icono: 'file',
    fecha: '18 jun 2025',
    pdfTitulo: 'Resumen de campaña',
    pdfSub: 'Q2 · Actualización de nómina',
    pdfArchivo: 'reporte_campana_Q2.pdf',
  },
  {
    titulo: 'Madurez por grupo',
    descripcion: 'Evolución comparativa y ranking de riesgo.',
    icono: 'chart',
    fecha: '17 jun 2025',
    pdfTitulo: 'Madurez por grupo',
    pdfSub: 'Comparativa Abril – Junio 2025',
    pdfArchivo: 'reporte_madurez_grupos.pdf',
  },
  {
    titulo: 'Resumen ejecutivo',
    descripcion: 'Indicadores clave para dirección.',
    icono: 'shield',
    fecha: '12 jun 2025',
    pdfTitulo: 'Resumen ejecutivo',
    pdfSub: 'Riesgo humano · Trimestre actual',
    pdfArchivo: 'reporte_ejecutivo.pdf',
  },
] as const;

/** Reportes: generación de entregables, descargas reales de CSV y preview visual estilo PDF. */

export function Reports() {
  const [sel, setSel] = useState(0);
  const [previewVisible, setPreviewVisible] = useState(true);
  const [aviso, setAviso] = useState<string | null>(null);

  const rep = REPORTES[sel];

  const descargarPdf = () => setAviso(`${rep.pdfArchivo} generado correctamente (demo sin backend).`);
  const descargarCsv = () => {
    if (sel === 0) {
      descargarCSV('scytal_campanas.csv', [
        ['Campaña', 'Grupo', 'Estado', 'Fecha', 'Interacción'],
        ...campanas.map((c) => [c.nombre, c.grupo, c.estado, c.fecha, c.interaccion]),
      ]);
    } else if (sel === 1) {
      descargarCSV('scytal_madurez.csv', [
        ['Grupo', 'Miembros', 'Índice', 'Variación'],
        ['Finanzas Europa', '124', '38,2', '−2,1'],
        ['Recursos Humanos', '86', '27,4', '+1,4'],
        ['Soporte y Operaciones', '213', '22,1', '−5,2'],
        ['Dirección', '18', '16,8', '−3,7'],
      ]);
    } else {
      descargarCSV('scytal_ejecutivo.csv', [
        ['Indicador', 'Valor'],
        ['Índice promedio', '31,8'],
        ['Riesgo alto o crítico', '14,6%'],
        ['Interacción media', '30,1%'],
      ]);
    }
    setAviso(`${rep.pdfArchivo.replace('.pdf', '.csv')} descargado.`);
  };

  return (
    <>
      <PageHeader
        eyebrow="Documentación"
        title="Reportes"
        description="Genera entregables ejecutivos y datos para análisis."
      />
      {aviso && (
        <div className="success-banner">
          <Icon name="check" />
          <div>
            <strong>Listo</strong>
            <p>{aviso}</p>
          </div>
        </div>
      )}
      <div className="report-layout">
        <div className="report-list">
          {REPORTES.map((r, i) => (
            <Card
              className={`report-item${i === sel ? ' selected' : ''}`}
              key={r.titulo}
              onClick={() => {
                setSel(i);
                setPreviewVisible(true);
              }}
            >
              <span className="report-icon">
                <Icon name={r.icono} />
              </span>
              <div>
                <strong>{r.titulo}</strong>
                <span>{r.descripcion}</span>
                <small>Última generación: {r.fecha}</small>
              </div>
              <div className="report-actions">
                <Button
                  small
                  variant="secondary"
                  icon="download"
                  onClick={() => {
                    setSel(i);
                    descargarPdf();
                  }}
                >
                  PDF
                </Button>
                <Button small variant="ghost" icon="download" onClick={() => { setSel(i); descargarCsv(); }}>
                  CSV
                </Button>
                <button
                  className="btn btn-ghost btn-small"
                  aria-label="Alternar preview"
                  onClick={(e) => {
                    e.stopPropagation();
                    setPreviewVisible(!previewVisible);
                  }}
                >
                  <Icon name="eye" size={15} />
                </button>
              </div>
            </Card>
          ))}
          {previewVisible && (
            <Card>
              <SectionTitle
                title="Qué incluye el PDF"
                description="Estructura del documento para auditoría y dirección"
              />
              <DataTable
                headers={['Sección', 'Contenido']}
                rows={[
                  ['Carátula', 'Organización, periodo y marca de confidencialidad'],
                  ['KPIs', 'Índice de phishing, interacción y tamaño de audiencia'],
                  ['Riesgo', (<span>Distribución por nivel <RiskBadge risk="Bajo" /> <RiskBadge risk="Medio" /> <RiskBadge risk="Alto" /> <RiskBadge risk="Crítico" /></span>)],
                  ['Detalle', 'Embudo de interacción y hallazgos del equipo de seguridad'],
                ]}
              />
            </Card>
          )}
        </div>
        {previewVisible && (
          <Card className="pdf-shell">
            <div className="pdf-toolbar">
              <span>Preview · {rep.pdfArchivo}</span>
              <Badge>3 páginas</Badge>
            </div>
            <div className="pdf-page">
              <div className="pdf-brand">
                <Logo compact />
                <span>CONFIDENCIAL</span>
              </div>
              <div className="pdf-title">{rep.pdfTitulo}</div>
              <div className="pdf-sub">{rep.pdfSub}</div>
              <div className="pdf-rule"></div>
              <div className="pdf-kpis">
                <div>
                  <span>Índice</span>
                  <strong>
                    {sel === 1 ? '38,2' : sel === 2 ? '31,8' : '31,8'}
                  </strong>
                </div>
                <div>
                  <span>Interacción</span>
                  <strong>
                    {sel === 1 ? '27%' : sel === 2 ? '30%' : '38%'}
                  </strong>
                </div>
                <div>
                  <span>Audiencia</span>
                  <strong>
                    {sel === 1 ? '441' : sel === 2 ? '847' : '124'}
                  </strong>
                </div>
              </div>
              <div className="pdf-heading">Resumen ejecutivo</div>
              <p>
                La campaña muestra una mejora de 4,2 puntos respecto al periodo anterior. El principal foco de
                exposición se concentra en el grupo de mayor índice; el material educativo post-campaña ya fue
                asignado.
              </p>
              <div className="pdf-chart">
                <Bars compact />
              </div>
              <div className="pdf-footer">Scytal Security · Generado el {rep.fecha}</div>
            </div>
          </Card>
        )}
      </div>
    </>
  );
}
