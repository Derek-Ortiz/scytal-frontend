import { useCallback, useEffect, useState } from 'react';
import type { AlertItem } from '../data';
import type { Risk } from '../types';
import { descargarCSV } from '../data';
import {
  ApiError,
  listarAlertas,
  listarAuditoria,
  resolverAlerta,
  type Alerta,
  type EventoAuditoria,
} from '../api';
import { Badge, Button, Card, DataTable, Icon, PageHeader, RiskBadge, SectionTitle, Select } from '../components/ui';
import { fechaCorta } from './Settings';

const ESTADOS = ['Todos los estados', 'Pendientes', 'Resueltas'] as const;
const TIPOS_BASE = ['Todos los tipos', 'riesgo_phishing'] as const;
const LIMITE_AUDITORIA = 20;

function severidadDe(tipo: string): Risk {
  if (/phishing|filtrad|critic/i.test(tipo)) return 'Crítico';
  if (/login|acceso|bloque/i.test(tipo)) return 'Medio';
  if (/cuenta|rol|admin/i.test(tipo)) return 'Bajo';
  return 'Alto';
}

function aAlertItem(a: Alerta): AlertItem {
  return {
    id: a.id_alertas,
    tipo: a.tipo,
    contexto: a.referencia_tipo
      ? `${a.referencia_tipo} ${a.referencia_id?.slice(0, 8) ?? ''}`
      : 'Sistema',
    severidad: severidadDe(a.tipo),
    fecha: fechaCorta(a.creado_en),
    estado: a.resuelto ? 'Resuelta' : 'Pendiente',
  };
}


export function Alerts({
  setAlerts,
  readonly,
}: {
  setAlerts: (updater: (prev: AlertItem[]) => AlertItem[]) => void;
  readonly: boolean;
}) {
  const [tab, setTab] = useState<'alerts' | 'audit'>('alerts');
  const [estado, setEstado] = useState<string>(ESTADOS[0]);
  const [tipo, setTipo] = useState<string>(TIPOS_BASE[0]);

  const [alertas, setAlertas] = useState<Alerta[]>([]);
  const [totalAlertas, setTotalAlertas] = useState(0);
  const [eventos, setEventos] = useState<EventoAuditoria[]>([]);
  const [totalEventos, setTotalEventos] = useState(0);
  const [offsetEventos, setOffsetEventos] = useState(0);
  const [tipos, setTipos] = useState<string[]>([...TIPOS_BASE]);

  const [error, setError] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [cargando, setCargando] = useState(true);

  const cargar = useCallback(async () => {
    setError(null);
    try {
      const [paginaAlertas, paginaEventos] = await Promise.all([
        listarAlertas({
          limit: 100,
          tipo: tipo === TIPOS_BASE[0] ? undefined : tipo,
          resuelto: estado === ESTADOS[0] ? undefined : estado === ESTADOS[1],
        }),
        listarAuditoria({ limit: LIMITE_AUDITORIA, offset: offsetEventos }),
      ]);
      setAlertas(paginaAlertas.items);
      setTotalAlertas(paginaAlertas.total);
      setEventos(paginaEventos.items);
      setTotalEventos(paginaEventos.total);
      setAlerts(() => paginaAlertas.items.map(aAlertItem));
      setTipos((prev) => {
        const nuevos = [...new Set(paginaAlertas.items.map((a) => a.tipo))].filter((t) => !prev.includes(t));
        return nuevos.length ? [...prev, ...nuevos] : prev;
      });
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'No pudimos cargar las alertas y la bitácora.');
    } finally {
      setCargando(false);
    }
  }, [estado, tipo, offsetEventos, setAlerts]);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  const resolver = async (id: string) => {
    setError(null);
    setAviso(null);
    try {
      await resolverAlerta(id);
      setAviso('Alerta marcada como resuelta.');
      await cargar();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'No pudimos resolver la alerta.');
    }
  };

  const marcarRevisadas = async () => {
    setError(null);
    setAviso(null);
    const pendientes = alertas.filter((a) => !a.resuelto);
    try {
      const resultados = await Promise.allSettled(pendientes.map((a) => resolverAlerta(a.id_alertas)));
      const fallos = resultados.filter((r) => r.status === 'rejected').length;
      setAviso(
        fallos === 0
          ? `${pendientes.length} alertas marcadas como revisadas.`
          : `${pendientes.length - fallos} resueltas · ${fallos} no se pudieron resolver.`,
      );
      await cargar();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'No pudimos actualizar las alertas.');
    }
  };

  const exportarAuditoria = () =>
    descargarCSV('scytal_auditoria.csv', [
      ['Tipo', 'Actor', 'Detalle', 'Marca de tiempo'],
      ...eventos.map((e) => [e.tipo, e.actor_correo ?? e.actor_tipo, e.detalle, fechaCorta(e.creado_en)]),
    ]);

  const pendientes = alertas.filter((a) => !a.resuelto).length;

  return (
    <>
      <PageHeader
        eyebrow="Supervisión"
        title="Monitoreo y alertas"
        description="Actividad de seguridad y trazabilidad del sistema."
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
      {aviso && (
        <div className="success-banner">
          <Icon name="check" />
          <div>
            <strong>Listo</strong>
            <p>{aviso}</p>
          </div>
        </div>
      )}
      <div className="tab-bar">
        <button className={tab === 'alerts' ? 'active' : ''} onClick={() => setTab('alerts')}>
          Alertas <Badge tone="alto">{pendientes}</Badge>
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
                {tipos.map((t) => (
                  <option key={t}>{t}</option>
                ))}
              </Select>
              <Select label="" value={estado} onChange={setEstado}>
                {ESTADOS.map((s) => (
                  <option key={s}>{s}</option>
                ))}
              </Select>
            </div>
            {!readonly && (
              <Button variant="secondary" onClick={() => void marcarRevisadas()} disabled={pendientes === 0}>
                Marcar todo como revisado
              </Button>
            )}
          </div>
          {cargando ? (
            <div className="empty-table">
              <strong>Cargando alertas…</strong>
            </div>
          ) : alertas.length === 0 ? (
            <div className="empty-table">
              <span className="empty-icon">
                <Icon name="bell" />
              </span>
              <strong>Sin alertas para este filtro</strong>
              <p>No hay eventos que coincidan con el tipo y el estado seleccionados.</p>
            </div>
          ) : (
            <DataTable
              headers={['Tipo', 'Contexto', 'Severidad', 'Fecha', 'Estado', '']}
              rows={alertas.map((a) => [
                <strong>{a.tipo}</strong>,
                a.referencia_tipo
                  ? `${a.referencia_tipo} ${a.referencia_id?.slice(0, 8) ?? ''}`
                  : 'Sistema',
                <RiskBadge risk={severidadDe(a.tipo)} />,
                fechaCorta(a.creado_en),
                a.resuelto ? <Badge tone="bajo">Resuelta</Badge> : <Badge tone="alto">Pendiente</Badge>,
                !readonly && !a.resuelto ? (
                  <Button small variant="ghost" onClick={() => void resolver(a.id_alertas)}>
                    Resolver
                  </Button>
                ) : (
                  ''
                ),
              ])}
            />
          )}
          <div className="table-footer">
            <span>
              {alertas.length} de {totalAlertas} alertas
            </span>
          </div>
        </Card>
      )}

      {tab === 'audit' && (
        <Card>
          <SectionTitle
            title="Eventos del sistema"
            description="Registro inmutable · solo eventos de tu organización"
            action={
              <Button variant="secondary" icon="download" onClick={exportarAuditoria} disabled={eventos.length === 0}>
                Exportar CSV
              </Button>
            }
          />
          {cargando ? (
            <div className="empty-table">
              <strong>Cargando bitácora…</strong>
            </div>
          ) : eventos.length === 0 ? (
            <div className="empty-table">
              <span className="empty-icon">
                <Icon name="file" />
              </span>
              <strong>Sin eventos registrados</strong>
              <p>Los inicios de sesión, cambios de rol y exportaciones aparecerán aquí.</p>
            </div>
          ) : (
            <DataTable
              headers={['Tipo', 'Actor', 'Detalle', 'Marca de tiempo']}
              rows={eventos.map((e) => [
                <strong>{e.tipo}</strong>,
                e.actor_correo ?? e.actor_tipo,
                e.detalle,
                fechaCorta(e.creado_en),
              ])}
            />
          )}
          <div className="table-footer">
            <span>
              {eventos.length} de {totalEventos} eventos
            </span>
            <div className="pagination">
              <Button
                small
                variant="secondary"
                disabled={offsetEventos === 0}
                onClick={() => setOffsetEventos(Math.max(0, offsetEventos - LIMITE_AUDITORIA))}
              >
                Anterior
              </Button>
              <Button
                small
                variant="secondary"
                disabled={offsetEventos + LIMITE_AUDITORIA >= totalEventos}
                onClick={() => setOffsetEventos(offsetEventos + LIMITE_AUDITORIA)}
              >
                Siguiente
              </Button>
            </div>
          </div>
        </Card>
      )}
    </>
  );
}
