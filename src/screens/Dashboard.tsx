import { useEffect, useState } from 'react';
import type { Screen } from '../types';
import type { AlertItem } from '../data';
import { descargarCSV } from '../data';
import { Badge, Button, Card, DataTable, Metric, MiniLine, PageHeader, RiskBadge, SectionTitle, Bars } from '../components/ui';
import { Icon } from '../components/icons';
import { ApiError, listarCampanas, listarGrupos, verOrganizacion, type Organizacion } from '../api';


export function Dashboard({
  alerts,
  setScreen,
  user,
}: {
  alerts: AlertItem[];
  setScreen: (s: Screen) => void;
  user: { correo: string; org_id: string | null } | null;
}) {
  const pendientes = alerts.filter((a) => a.estado === 'Pendiente').length;
  const [org, setOrg] = useState<Organizacion | null>(null);
  const [indiceProm, setIndiceProm] = useState<number | null>(null);
  const [campañasActivas, setCampanasActivas] = useState<number | null>(null);
  const [destinatarios, setDestinatarios] = useState<number | null>(null);

  useEffect(() => {
    let vivo = true;
    if (user?.org_id) {
      verOrganizacion(user.org_id)
        .then((o) => {
          if (vivo) setOrg(o);
        })
        .catch(() => {
        });
    }
    listarGrupos(100, 0)
      .then((p) => {
        if (!vivo) return;
        const conIndice = p.items.filter((g) => g.metricas.indice_promedio !== null);
        if (conIndice.length > 0) {
          const suma = conIndice.reduce((n, g) => n + (g.metricas.indice_promedio ?? 0), 0);
          setIndiceProm(Math.round((suma / conIndice.length) * 10) / 10);
        }
        setDestinatarios(p.items.reduce((n, g) => n + g.metricas.destinatarios_activos, 0));
      })
      .catch(() => {
      });
    listarCampanas({ limit: 100 })
      .then((p) => {
        if (vivo) setCampanasActivas(p.items.filter((c) => c.estado === 'activa').length);
      })
      .catch((e) => {
        if (vivo && e instanceof ApiError) console.warn('No se pudieron listar campañas:', e.message);
      });
    return () => {
      vivo = false;
    };
  }, [user?.org_id]);

  const nombre = user?.correo.split('@')[0] ?? 'invitado';

  const exportar = () => {
    descargarCSV('scytal_resumen.csv', [
      ['Métrica', 'Valor'],
      ['Índice promedio de phishing', indiceProm !== null ? String(indiceProm) : '—'],
      ['Destinatarios activos', String(destinatarios ?? org?.metricas?.destinatarios_activos ?? '—')],
      ['Campañas activas', String(campañasActivas ?? org?.metricas?.campanas_activas ?? '—')],
      ['Alertas sin resolver', String(pendientes)],
    ]);
  };

  const fmt = (n: number | null | undefined): string => (n === null || n === undefined ? '—' : String(n).replace('.', ','));

  return (
    <>
      <PageHeader
        eyebrow="Visión general"
        title={`Hola, ${nombre}`}
        description={org ? `Estado de seguridad de ${org.nombre} · datos en vivo del backend` : 'Estado de seguridad de tu organización'}
        action={
          <Button icon="download" variant="secondary" onClick={exportar}>
            Exportar resumen
          </Button>
        }
      />
      <div className="metric-grid">
        <Metric
          label="Índice promedio de phishing"
          value={fmt(indiceProm)}
          trend="promedio de tus grupos"
          tone={indiceProm !== null && indiceProm >= 40 ? 'alto' : 'bajo'}
        />
        <Metric label="Destinatarios activos" value={fmt(destinatarios ?? org?.metricas?.destinatarios_activos)} trend="en tus grupos" />
        <Metric
          label="Campañas activas"
          value={fmt(campañasActivas ?? org?.metricas?.campanas_activas)}
          trend={`${org?.metricas?.campanas_totales ?? '—'} totales`}
        />
        <Metric label="Alertas sin resolver" value={String(pendientes)} trend="se actualizan al finalizar campañas" tone="alto" />
      </div>
      <div className="chart-grid">
        <Card>
          <SectionTitle
            title="Tendencia de susceptibilidad"
            description="La gráfica se alimenta de las instantáneas al finalizar cada campaña"
            action={<Badge tone="bajo">Vista de tendencia</Badge>}
          />
          <MiniLine />
          <div className="axis-labels">
            <span>C1</span>
            <span>C2</span>
            <span>C3</span>
            <span>C4</span>
            <span>C5</span>
            <span>C6</span>
          </div>
        </Card>
        <Card>
          <SectionTitle title="Distribución por riesgo" description={`${fmt(destinatarios ?? org?.metricas?.destinatarios_activos)} destinatarios activos`} />
          <Bars />
        </Card>
      </div>
      <Card>
        <SectionTitle
          title="Alertas recientes"
          description="El backend genera 1 alerta por cada destinatario que envió datos en el formulario falso (al finalizar la campaña)"
          action={
            <Button variant="ghost" onClick={() => setScreen('alerts')}>
              Ver todas <Icon name="arrow" size={14} />
            </Button>
          }
        />
        <DataTable
          headers={['Alerta', 'Contexto', 'Severidad', 'Fecha', 'Estado']}
          rows={alerts.map((a) => [
            <strong>{a.tipo}</strong>,
            a.contexto,
            <RiskBadge risk={a.severidad} />,
            a.fecha,
            a.estado === 'Pendiente' ? <Badge tone="alto">Pendiente</Badge> : <Badge tone="bajo">Resuelta</Badge>,
          ])}
        />
      </Card>
    </>
  );
}
