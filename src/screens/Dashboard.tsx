import type { Screen } from '../types';
import type { AlertItem } from '../data';
import { descargarCSV } from '../data';
import { Badge, Button, Card, DataTable, Metric, MiniLine, PageHeader, RiskBadge, SectionTitle, Bars } from '../components/ui';
import { Icon } from '../components/icons';

/** Vista general: métricas, gráficas y alertas recientes. */

export function Dashboard({ alerts, setScreen }: { alerts: AlertItem[]; setScreen: (s: Screen) => void }) {
  const pendientes = alerts.filter((a) => a.estado === 'Pendiente').length;

  const exportar = () => {
    descargarCSV('scytal_resumen.csv', [
      ['Métrica', 'Valor', 'Variación'],
      ['Índice promedio de phishing', '31,8', '−4,2 pts'],
      ['Riesgo alto o crítico', '14,6%', '−2,1%'],
      ['Campañas activas', '3', '2 en curso'],
      ['Alertas sin resolver', String(pendientes), 'Actualizado'],
    ]);
  };

  return (
    <>
      <PageHeader
        eyebrow="Visión general"
        title="Buenos días, Ana"
        description="Estado de seguridad de Acme Corporation · actualizado hace 4 minutos"
        action={
          <Button icon="download" variant="secondary" onClick={exportar}>
            Exportar resumen
          </Button>
        }
      />
      <div className="metric-grid">
        <Metric label="Índice promedio de phishing" value="31,8" trend="−4,2 pts" tone="bajo" />
        <Metric label="Riesgo alto o crítico" value="14,6%" trend="−2,1%" tone="bajo" />
        <Metric label="Campañas activas" value="3" trend="2 en curso" />
        <Metric label="Alertas sin resolver" value={String(pendientes)} trend="+2 hoy" tone="alto" />
      </div>
      <div className="chart-grid">
        <Card>
          <SectionTitle
            title="Tendencia de susceptibilidad"
            description="Índice promedio · últimas 6 campañas"
            action={<Badge tone="bajo">Mejora sostenida</Badge>}
          />
          <MiniLine />
          <div className="axis-labels">
            <span>Feb</span>
            <span>Mar</span>
            <span>Abr</span>
            <span>May</span>
            <span>Jun</span>
            <span>Jul</span>
          </div>
        </Card>
        <Card>
          <SectionTitle title="Distribución por riesgo" description="847 destinatarios activos" />
          <Bars />
        </Card>
      </div>
      <Card>
        <SectionTitle
          title="Alertas recientes"
          description="Eventos que requieren revisión"
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
