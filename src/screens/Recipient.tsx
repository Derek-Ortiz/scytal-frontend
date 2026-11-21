import { useEffect, useState } from 'react';
import { Badge, Card, PageHeader, RiskBadge, SectionTitle } from '../components/ui';
import { ApiError, verDestinatario, type DestinatarioDetalle, type Instantanea } from '../api';


const NIVEL: Record<string, string> = {
  critico: 'Crítico',
  alto: 'Alto',
  medio: 'Medio',
  bajo: 'Bajo',
};

export function Recipient({ recipientId, groupName }: { recipientId: string | null; groupName: string }) {
  const [detalle, setDetalle] = useState<DestinatarioDetalle | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!recipientId) return;
    let vivo = true;
    setDetalle(null);
    setError(null);
    verDestinatario(recipientId)
      .then((d) => {
        if (vivo) setDetalle(d);
      })
      .catch((e) => {
        if (vivo) setError(e instanceof ApiError ? e.message : 'No pudimos cargar el destinatario.');
      });
    return () => {
      vivo = false;
    };
  }, [recipientId]);

  if (error) {
    return (
      <div className="error-banner">
        <span>!</span>
        <div>
          <strong>Error</strong>
          <p>{error}</p>
        </div>
      </div>
    );
  }
  if (!detalle) {
    return (
      <>
        <PageHeader eyebrow={`Grupos / ${groupName}`} title="Destinatario" description="Cargando perfil…" />
        <Card>
          <p className="section-desc">Cargando perfil…</p>
        </Card>
      </>
    );
  }

  const historico = detalle.historico;
  const ultimo = historico[0] ?? null;
  const iniciales = detalle.correo.slice(0, 2).toUpperCase();

  return (
    <>
      <PageHeader
        eyebrow={`Grupos / ${groupName}`}
        title={detalle.correo}
        description="Perfil individual con su histórico de simulaciones."
        action={<Badge>{detalle.activo ? 'Activo' : 'Desactivado'}</Badge>}
      />
      <div className="profile-grid">
        <Card>
          <div className="profile-head">
            <div className="avatar large">{iniciales}</div>
            <div>
              <strong>{detalle.correo}</strong>
              <span>{ultimo ? `Último puntaje ${ultimo.puntaje_phishing}` : 'Sin campañas aún'}</span>
            </div>
            {ultimo && <RiskBadge risk={NIVEL[ultimo.nivel] ?? ultimo.nivel} />}
          </div>
          <div className="detail-list">
            {(
              [
                ['Correo', detalle.correo],
                ['ID', detalle.id_destinatarios],
                ['Grupo', groupName],
                ['Estado', detalle.activo ? 'Activo' : 'Desactivado (histórico conservado)'],
                ['Campañas en histórico', String(historico.length)],
                ['Alta', fechaCorta(detalle.creado_en)],
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
          <SectionTitle
            title="Últimos resultados"
            description="Puntaje 0–100 por campaña · mayor = más susceptible"
          />
          {historico.length === 0 ? (
            <p className="section-desc">Aún no participa en campañas finalizadas; el histórico se llena al cerrar cada simulación.</p>
          ) : (
            <div className="detail-list">
              {historico.slice(0, 6).map((h: Instantanea, i) => (
                <div key={`${h.creado_en}-${i}`}>
                  <span>{fechaCorta(h.creado_en)}</span>
                  <strong>
                    {h.puntaje_phishing} · {NIVEL[h.nivel] ?? h.nivel}
                  </strong>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      <Card>
        <SectionTitle title="Historial de campañas" description="Instantáneas de phishing · más reciente primero" />
        {historico.length === 0 ? (
          <div className="empty-table">
            <span className="empty-icon">✉</span>
            <strong>Sin historial</strong>
            <p>Las instantáneas aparecen cuando una campaña que lo incluye finaliza.</p>
          </div>
        ) : (
          <div className="timeline">
            {historico.map((h, i) => (
              <div className="timeline-row" key={`${h.creado_en}-${i}`}>
                <span className={`timeline-dot risk-${(NIVEL[h.nivel] ?? h.nivel).toLowerCase().replace('í', 'i')}`}></span>
                <span className="timeline-date">{fechaCorta(h.creado_en)}</span>
                <div>
                  <strong>{h.campana_id ? `Campaña ${h.campana_id.slice(0, 8)}…` : 'Campaña anterior'}</strong>
                  <span>Puntaje {h.puntaje_phishing} · nivel {NIVEL[h.nivel] ?? h.nivel}</span>
                </div>
                <RiskBadge risk={NIVEL[h.nivel] ?? h.nivel} />
              </div>
            ))}
          </div>
        )}
      </Card>
    </>
  );
}

function fechaCorta(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' });
}
