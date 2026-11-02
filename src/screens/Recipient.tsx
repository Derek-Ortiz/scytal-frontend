import { grupos, historialDemo } from '../data';
import type { RecipientRow } from '../data';
import { Badge, Card, MiniLine, PageHeader, RiskBadge, SectionTitle } from '../components/ui';

/** Perfil individual de destinatario con evolución e historial. */

export function Recipient({ recipient, groupName }: { recipient: RecipientRow | null; groupName: string }) {
  const r = recipient ?? grupos[0].destinatarios[0];
  const iniciales = r.nombre
    .split(' ')
    .map((w) => w.charAt(0))
    .slice(0, 2)
    .join('');

  return (
    <>
      <PageHeader
        eyebrow={`Grupos / ${groupName}`}
        title={r.nombre}
        description={r.correo}
        action={<Badge>Altas vía importación CSV</Badge>}
      />
      <div className="profile-grid">
        <Card>
          <div className="profile-head">
            <div className="avatar large">{iniciales}</div>
            <div>
              <strong>{r.nombre}</strong>
              <span>{r.cargo}</span>
            </div>
            <RiskBadge risk={r.riesgo} />
          </div>
          <div className="detail-list">
            {(
              [
                ['Correo', r.correo],
                ['Cargo', r.cargo],
                ['Grupo', groupName],
                ['Índice actual', `${r.indice} · ${r.riesgo}`],
                ['Última campaña', r.ultimaCampana],
                ['Última actividad', r.ultimaActividad],
              ] as const
            ).map(([k, v]) => (
              <div key={k}>
                <span>{k}</span>
                <strong>{v}</strong>
              </div>
            ))}
          </div>
        </Card>
        <Card>
          <SectionTitle title="Evolución del índice" description="Últimas 6 campañas · de menor a mayor riesgo" />
          <MiniLine danger />
          <div className="axis-labels">
            <span>Factura</span>
            <span>VPN</span>
            <span>Beneficios</span>
            <span>Nómina</span>
            <span>Banco</span>
            <span>Nómina Q2</span>
          </div>
        </Card>
      </div>

      <Card>
        <SectionTitle title="Historial de campañas" description="Actividad y resultado individual" />
        <div className="timeline">
          {historialDemo.map((h) => (
            <div className="timeline-row" key={h.campana}>
              <span className={`timeline-dot risk-${h.riesgo.toLowerCase().replace('í', 'i')}`}></span>
              <span className="timeline-date">{h.fecha}</span>
              <div>
                <strong>{h.campana}</strong>
                <span>{h.accion}</span>
              </div>
              <RiskBadge risk={h.riesgo} />
            </div>
          ))}
        </div>
      </Card>
    </>
  );
}
