import { useEffect, useState } from 'react';
import { descargarCSV } from '../data';
import {
  ApiError,
  exportarReporteCampana,
  exportarReporteGrupo,
  listarCampanas,
  listarGrupos,
  type Campana,
  type Grupo,
} from '../api';
import { Badge, Bars, Button, Card, Icon, PageHeader, RiskBadge, SectionTitle, Logo, DataTable, Select } from '../components/ui';

const REPORTES = [
  {
    titulo: 'Resumen por campaña',
    descripcion: 'Resultados, embudo y detalle por destinatario.',
    icono: 'file',
    pdfTitulo: 'Resumen de campaña',
    pdfSub: 'Resultados y embudo de interacción',
    pdfArchivo: 'campana.csv',
  },
  {
    titulo: 'Madurez por grupo',
    descripcion: 'Índice, distribución y tabla de destinatarios.',
    icono: 'chart',
    pdfTitulo: 'Madurez por grupo',
    pdfSub: 'Comparativa y ranking de riesgo',
    pdfArchivo: 'grupo.csv',
  },
  {
    titulo: 'Resumen ejecutivo',
    descripcion: 'Indicadores clave para dirección.',
    icono: 'shield',
    pdfTitulo: 'Resumen ejecutivo',
    pdfSub: 'Riesgo humano · Trimestre actual',
    pdfArchivo: 'reporte_ejecutivo.pdf',
  },
] as const;


export function Reports() {
  const [sel, setSel] = useState(0);
  const [previewVisible, setPreviewVisible] = useState(true);
  const [aviso, setAviso] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  const [campanas, setCampanas] = useState<Campana[]>([]);
  const [grupos, setGrupos] = useState<Grupo[]>([]);
  const [campanaId, setCampanaId] = useState('');
  const [grupoId, setGrupoId] = useState('');

  useEffect(() => {
    let vivo = true;
    (async () => {
      try {
        const [c, g] = await Promise.all([listarCampanas({ limit: 100 }), listarGrupos(100, 0)]);
        if (!vivo) return;
        setCampanas(c.items);
        setGrupos(g.items);
        setCampanaId((prev) => prev || c.items[0]?.id_campanas || '');
        setGrupoId((prev) => prev || g.items[0]?.id_grupos || '');
      } catch (e) {
        if (vivo) setError(e instanceof ApiError ? e.message : 'No pudimos cargar las campañas y grupos.');
      }
    })();
    return () => {
      vivo = false;
    };
  }, []);

  const rep = REPORTES[sel];

  const descargar = async (formato: 'csv' | 'pdf') => {
    setError(null);
    setAviso(null);
    if (sel === 0) {
      if (!campanaId) {
        setError('Selecciona una campaña para exportar.');
        return;
      }
      setEnviando(true);
      try {
        const archivo = await exportarReporteCampana(campanaId, formato);
        setAviso(`${archivo} descargado correctamente.`);
      } catch (e) {
        setError(e instanceof ApiError ? e.message : 'No pudimos generar el reporte de la campaña.');
      } finally {
        setEnviando(false);
      }
      return;
    }
    if (sel === 1) {
      if (!grupoId) {
        setError('Selecciona un grupo para exportar.');
        return;
      }
      setEnviando(true);
      try {
        const archivo = await exportarReporteGrupo(grupoId, formato);
        setAviso(`${archivo} descargado correctamente.`);
      } catch (e) {
        setError(e instanceof ApiError ? e.message : 'No pudimos generar el reporte del grupo.');
      } finally {
        setEnviando(false);
      }
      return;
    }
    if (formato === 'csv') {
      descargarCSV('scytal_ejecutivo.csv', [
        ['Indicador', 'Valor'],
        ['Campañas totales', String(campanas.length)],
        ['Grupos', String(grupos.length)],
      ]);
      setAviso('scytal_ejecutivo.csv descargado.');
    } else {
      setAviso(`${rep.pdfArchivo} generado correctamente (demo sin backend).`);
    }
  };

  return (
    <>
      <PageHeader
        eyebrow="Documentación"
        title="Reportes"
        description="Genera entregables ejecutivos y datos para análisis."
      />
      {error && (
        <div className="error-banner">
          <span>!</span>
          <div>
            <strong>No pudimos generar el reporte</strong>
            <p>{error}</p>
          </div>
        </div>
      )}
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
                <small>
                  {i === 0
                    ? campanas.length
                      ? `${campanas.length} campañas disponibles`
                      : 'Cargando campañas…'
                    : i === 1
                      ? grupos.length
                        ? `${grupos.length} grupos disponibles`
                        : 'Cargando grupos…'
                      : 'Indicadores de la organización'}
                </small>
              </div>
              <div className="report-actions">
                <Button
                  small
                  variant="secondary"
                  icon="download"
                  disabled={enviando}
                  onClick={() => {
                    setSel(i);
                    void descargar('pdf');
                  }}
                >
                  PDF
                </Button>
                <Button
                  small
                  variant="ghost"
                  icon="download"
                  disabled={enviando}
                  onClick={() => {
                    setSel(i);
                    void descargar('csv');
                  }}
                >
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
          {sel < 2 && (
            <Card>
              <SectionTitle
                title={sel === 0 ? 'Campaña a exportar' : 'Grupo a exportar'}
                description="El backend genera el archivo y lo adjunta como descarga"
              />
              {sel === 0 ? (
                <Select label="Campaña" value={campanaId} onChange={setCampanaId}>
                  {campanas.length === 0 && <option value="">Sin campañas</option>}
                  {campanas.map((c) => (
                    <option key={c.id_campanas} value={c.id_campanas}>
                      {c.nombre}
                    </option>
                  ))}
                </Select>
              ) : (
                <Select label="Grupo" value={grupoId} onChange={setGrupoId}>
                  {grupos.length === 0 && <option value="">Sin grupos</option>}
                  {grupos.map((g) => (
                    <option key={g.id_grupos} value={g.id_grupos}>
                      {g.nombre}
                    </option>
                  ))}
                </Select>
              )}
            </Card>
          )}
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
              <span>Preview · {sel === 0 ? 'Resumen de campaña' : sel === 1 ? 'Madurez por grupo' : rep.pdfArchivo}</span>
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
                  <span>Campañas</span>
                  <strong>{campanas.length || '—'}</strong>
                </div>
                <div>
                  <span>Grupos</span>
                  <strong>{grupos.length || '—'}</strong>
                </div>
                <div>
                  <span>Audiencia</span>
                  <strong>{grupos.reduce((n, g) => n + g.metricas.destinatarios_activos, 0) || '—'}</strong>
                </div>
              </div>
              <div className="pdf-heading">Resumen ejecutivo</div>
              <p>
                Los indicadores se calculan con los datos reales de la organización: campañas finalizadas,
                interacción registrada e índice de madurez por grupo.
              </p>
              <div className="pdf-chart">
                <Bars compact />
              </div>
              <div className="pdf-footer">Scytal Security · Generado el {new Date().toLocaleDateString('es-ES')}</div>
            </div>
          </Card>
        )}
      </div>
    </>
  );
}
