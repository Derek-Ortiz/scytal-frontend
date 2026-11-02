import { useMemo, useState } from 'react';
import type { AlertItem } from '../data';
import { auditLog, descargarCSV } from '../data';
import { Badge, Button, Card, DataTable, Icon, PageHeader, RiskBadge, SectionTitle, Select } from '../components/ui';

const TIPOS = ['Todos los tipos', 'Acceso', 'Destinatarios', 'Cuentas'] as const;
const SEVERIDADES = ['Toda severidad', 'Crítico', 'Alto', 'Medio', 'Bajo'] as const;

/** Alertas operativas y bitácora de auditoría (dos pestañas). */

export function Alerts({
  alerts,
  setAlerts,
  readonly,
}: {
  alerts: AlertItem[];
  setAlerts: (updater: (prev: AlertItem[]) => AlertItem[]) => void;
  readonly: boolean;
}) {
  const [tab, setTab] = useState<'alerts' | 'audit'>('alerts');
  const [tipo, setTipo] = useState<string>(TIPOS[0]);
  const [severidad, setSeveridad] = useState<string>(SEVERIDADES[0]);

  const filas = useMemo(() => {
    const tipoOk = (a: AlertItem) => {
      if (tipo === TIPOS[0]) return true;
      if (tipo === 'Acceso') return /login|administrativa/i.test(a.tipo);
      if (tipo === 'Destinatarios') return /destinatario/i.test(a.tipo);
      return /contrase/i.test(a.tipo);
    };
    return alerts.filter((a) => tipoOk(a) && (severidad === SEVERIDADES[0] || a.severidad === severidad));
  }, [alerts, tipo, severidad]);

  const marcarRevisadas = () => setAlerts((prev) => prev.map((a) => ({ ...a, estado: 'Resuelta' as const })));

  return (
    <>
      <PageHeader
        eyebrow="Supervisión"
        title="Monitoreo y alertas"
        description="Actividad de seguridad y trazabilidad del sistema."
      />
      <div className="tab-bar">
        <button className={tab === 'alerts' ? 'active' : ''} onClick={() => setTab('alerts')}>
          Alertas <Badge tone="alto">{alerts.filter((a) => a.estado === 'Pendiente').length}</Badge>
        </button>
        <button className={tab === 'audit' ? 'active' : ''} onClick={() => setTab('audit')}>
          Bitácora de auditoría
        </button>
      </div>

      {tab === 'alerts' && (
        <Card>
          <div className="toolbar">
            <div className="filters">
              <Select label="" value={tipo} onChange={setTipo}>
                {TIPOS.map((t) => (
                  <option key={t}>{t}</option>
                ))}
              </Select>
              <Select label="" value={severidad} onChange={setSeveridad}>
                {SEVERIDADES.map((s) => (
                  <option key={s}>{s}</option>
                ))}
              </Select>
            </div>
            {!readonly && (
              <Button variant="secondary" onClick={marcarRevisadas} disabled={alerts.every((a) => a.estado === 'Resuelta')}>
                Marcar todo como revisado
              </Button>
            )}
          </div>
          {filas.length === 0 ? (
            <div className="empty-table">
              <span className="empty-icon">
                <Icon name="bell" />
              </span>
              <strong>Sin alertas para este filtro</strong>
              <p>No hay eventos que coincidan con el tipo y severidad seleccionados.</p>
            </div>
          ) : (
            <DataTable
              headers={['Tipo', 'Contexto', 'Severidad', 'Fecha', 'Estado']}
              rows={filas.map((a) => [
                <strong>{a.tipo}</strong>,
                a.contexto,
                <RiskBadge risk={a.severidad} />,
                a.fecha,
                a.estado === 'Pendiente' ? <Badge tone="alto">Pendiente</Badge> : <Badge tone="bajo">Resuelta</Badge>,
              ])}
            />
          )}
        </Card>
      )}

      {tab === 'audit' && (
        <Card>
          <SectionTitle
            title="Eventos del sistema"
            description="Registro inmutable · retención de 12 meses"
            action={
              <Button
                variant="secondary"
                icon="download"
                onClick={() =>
                  descargarCSV('scytal_auditoria.csv', [
                    ['Evento', 'Actor', 'Dirección IP', 'Marca de tiempo', 'Resultado'],
                    ...auditLog.map((r) => [r.evento, r.actor, r.ip, r.fecha, r.resultado]),
                  ])
                }
              >
                Exportar CSV
              </Button>
            }
          />
          <DataTable
            headers={['Evento', 'Actor', 'Dirección IP', 'Marca de tiempo', 'Resultado']}
            rows={auditLog.map((r) => [
              <strong>{r.evento}</strong>,
              r.actor,
              r.ip,
              r.fecha,
              r.resultado === 'Correcto' ? <Badge tone="bajo">Correcto</Badge> : <Badge tone="critico">Bloqueado</Badge>,
            ])}
          />
        </Card>
      )}
    </>
  );
}
