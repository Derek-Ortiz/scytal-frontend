import { useEffect, useState } from 'react';
import type { Risk } from '../types';
import { descargarCSV } from '../data';
import { ApiError, listarGrupos, resumenMadurez, type Grupo, type ResumenMadurez } from '../api';
import { Badge, Button, Card, DataTable, PageHeader, RiskBadge, SectionTitle } from '../components/ui';
import { fechaCorta } from './Settings';

function nivelDe(indice: number | null): Risk {
  if (indice === null) return 'Medio';
  if (indice >= 66) return 'Bajo';
  if (indice >= 40) return 'Medio';
  if (indice >= 20) return 'Alto';
  return 'Crítico';
}

function valor(indice: number | null): string {
  return indice === null ? '—' : indice.toFixed(1).replace('.', ',');
}


export function Maturity() {
  const [resumen, setResumen] = useState<ResumenMadurez | null>(null);
  const [grupos, setGrupos] = useState<Grupo[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    let vivo = true;
    (async () => {
      try {
        const [r, g] = await Promise.all([resumenMadurez(), listarGrupos(100, 0)]);
        if (!vivo) return;
        setResumen(r);
        setGrupos(g.items);
      } catch (e) {
        if (!vivo) return;
        setError(e instanceof ApiError ? e.message : 'No pudimos cargar el índice de madurez.');
      } finally {
        if (vivo) setCargando(false);
      }
    })();
    return () => {
      vivo = false;
    };
  }, []);

  const ranking = [...grupos].sort((a, b) => {
    const ia = a.metricas.indice_promedio;
    const ib = b.metricas.indice_promedio;
    if (ia === null && ib === null) return 0;
    if (ia === null) return 1;
    if (ib === null) return -1;
    return ia - ib;
  });

  const indice = resumen?.indice_promedio ?? null;
  const nivel = nivelDe(indice);
  const distribucion = resumen?.distribucion;

  const exportar = () =>
    descargarCSV('scytal_madurez.csv', [
      ['Posición', 'Grupo', 'Miembros', 'Índice', 'Nivel'],
      ...ranking.map((g, i) => [
        String(i + 1).padStart(2, '0'),
        g.nombre,
        String(g.metricas.destinatarios_activos),
        valor(g.metricas.indice_promedio),
        nivelDe(g.metricas.indice_promedio),
      ]),
    ]);

  return (
    <>
      <PageHeader
        eyebrow="Analítica"
        title="Índice de madurez"
        description="Comparativa de riesgo y evolución de tu organización."
        action={
          <Button variant="secondary" icon="download" onClick={exportar} disabled={ranking.length === 0}>
            Exportar informe
          </Button>
        }
      />
      {error && (
        <div className="error-banner">
          <span>!</span>
          <div>
            <strong>No pudimos cargar</strong>
            <p>{error}</p>
          </div>
        </div>
      )}
      <div className="maturity-grid">
        <Card className="gauge-card">
          <SectionTitle title="Índice promedio actual" description="Escala 0–100 · mayor es más resistente" />
          <div className="gauge">
            <svg viewBox="0 0 220 130">
              <path className="gauge-bg" d="M30 110a80 80 0 0 1 160 0" />
              <path className="gauge-low" d="M30 110a80 80 0 0 1 52-75" />
              <path className="gauge-mid" d="M82 35a80 80 0 0 1 64 8" />
              <path className="gauge-high" d="M146 43a80 80 0 0 1 44 67" />
              <line x1="110" y1="110" x2="75" y2="54" />
              <circle cx="110" cy="110" r="7" />
            </svg>
            <div>
              <strong>{cargando ? '…' : valor(indice)}</strong>
              <Badge tone={nivel === 'Crítico' ? 'critico' : nivel === 'Alto' ? 'alto' : nivel === 'Medio' ? 'medio' : 'bajo'}>
                {nivel}
              </Badge>
            </div>
          </div>
          <div className="gauge-foot">
            <span>
              Destinatarios activos: <strong>{resumen?.destinatarios_activos ?? '—'}</strong>
            </span>
            <span>
              Última finalización: <strong>{fechaCorta(resumen?.ultima_finalizacion)}</strong>
            </span>
          </div>
        </Card>
        <Card>
          <SectionTitle
            title="Distribución de riesgo"
            description="Destinatarios por nivel de exposición"
          />
          {distribucion ? (
            <DataTable
              headers={['Nivel', 'Destinatarios']}
              rows={[
                ['Crítico', String(distribucion.critico)],
                ['Alto', String(distribucion.alto)],
                ['Medio', String(distribucion.medio)],
                ['Bajo', String(distribucion.bajo)],
              ]}
            />
          ) : (
            <div className="empty-table">
              <strong>Sin datos todavía</strong>
              <p>Finaliza una campaña para ver la distribución.</p>
            </div>
          )}
          <div className="axis-labels">
            <span>
              Campañas: <strong>{resumen ? `${resumen.campanas.completadas}/${resumen.campanas.total}` : '—'}</strong>
            </span>
          </div>
        </Card>
      </div>
      <Card>
        <SectionTitle title="Ranking por grupo" description="Ordenado de mayor a menor exposición" />
        {cargando ? (
          <div className="empty-table">
            <strong>Cargando grupos…</strong>
          </div>
        ) : ranking.length === 0 ? (
          <div className="empty-table">
            <strong>Aún no hay grupos</strong>
            <p>Crea un grupo con destinatarios para empezar a medir la madurez.</p>
          </div>
        ) : (
          <DataTable
            headers={['Posición', 'Grupo', 'Miembros', 'Índice', 'Nivel']}
            rows={ranking.map((g, i) => [
              String(i + 1).padStart(2, '0'),
              <strong>{g.nombre}</strong>,
              String(g.metricas.destinatarios_activos),
              valor(g.metricas.indice_promedio),
              <RiskBadge risk={nivelDe(g.metricas.indice_promedio)} />,
            ])}
          />
        )}
      </Card>
    </>
  );
}
