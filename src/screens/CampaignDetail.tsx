import { useCallback, useEffect, useMemo, useState } from 'react';
import { Badge, Button, Card, DataTable, Icon, Input, PageHeader, RiskBadge, SectionTitle } from '../components/ui';
import {
  ApiError,
  actualizarCampana,
  cancelarCampana,
  enviarFeedbackCampana,
  finalizarCampana,
  lanzarCampana,
  listarGrupos,
  verCampana,
  verDestinatariosCampana,
  verPlantilla,
  verQRCampana,
  verStatsCampana,
  type Campana,
  type FilaCampanaDestinatario,
  type Grupo,
  type StatsCampana,
} from '../api';
import { descargarCSV } from '../data';
import { fechaCorta } from './Settings';

const NIVEL: Record<string, string> = { critico: 'Crítico', alto: 'Alto', medio: 'Medio', bajo: 'Bajo' };


export function CampaignDetail({ readonly, campanaId }: { readonly: boolean; campanaId: string | null }) {
  const [campana, setCampana] = useState<Campana | null>(null);
  const [stats, setStats] = useState<StatsCampana | null>(null);
  const [filas, setFilas] = useState<FilaCampanaDestinatario[] | null>(null);
  const [grupos, setGrupos] = useState<Grupo[]>([]);
  const [plantillaNombre, setPlantillaNombre] = useState<string | null>(null);
  const [qr, setQr] = useState<Array<{ zona: string; url: string; qr_base64: string }> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [confirming, setConfirming] = useState<'finish' | 'cancel' | 'relaunch' | null>(null);
  const [busqueda, setBusqueda] = useState('');
  const [expiracionNueva, setExpiracionNueva] = useState('');
  const [ocupado, setOcupado] = useState(false);

  const cargar = useCallback(async () => {
    if (!campanaId) return;
    setError(null);
    try {
      const [c, s, r] = await Promise.all([
        verCampana(campanaId),
        verStatsCampana(campanaId),
        verDestinatariosCampana(campanaId, 100, 0),
      ]);
      setCampana(c);
      setStats(s);
      setFilas(r.items);
      setExpiracionNueva(String(c.expiracion_horas));
      if (c.plantilla_id) {
        verPlantilla(c.plantilla_id)
          .then((t) => setPlantillaNombre(t.nombre))
          .catch(() => setPlantillaNombre(null));
      } else {
        setPlantillaNombre(null);
      }
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'No pudimos cargar la campaña.');
    }
  }, [campanaId]);

  useEffect(() => {
    void cargar();
    listarGrupos(100, 0)
      .then((p) => setGrupos(p.items))
      .catch(() => {});
  }, [cargar]);

  const nombreGrupo = useMemo(
    () => grupos.find((g) => g.id_grupos === campana?.grupo_id)?.nombre ?? null,
    [grupos, campana],
  );


  const lanzar = async () => {
    if (!campana) return;
    setOcupado(true);
    setError(null);
    try {
      const h = Number(expiracionNueva);
      const r = await lanzarCampana(campana.id_campanas, h >= 1 && h <= 8760 ? h : undefined);
      setCampana(r.campana);
      setAviso(`Campaña activa: ${r.emails_programados} correos programados · ${r.zonas_qr} zonas QR generadas.`);
      await cargar();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'No pudimos lanzar la campaña.');
    } finally {
      setOcupado(false);
      setConfirming(null);
    }
  };

  const finalizar = async () => {
    if (!campana) return;
    setOcupado(true);
    setError(null);
    try {
      const r = await finalizarCampana(campana.id_campanas);
      setCampana(r.campana);
      setAviso(`Campaña completada: ${r.instantaneas} instantáneas de phishing y ${r.alertas} alertas generadas.`);
      await cargar();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'No pudimos finalizar la campaña.');
    } finally {
      setOcupado(false);
      setConfirming(null);
    }
  };

  const enviarFeedback = async () => {
    if (!campana) return;
    setOcupado(true);
    setError(null);
    try {
      const r = await enviarFeedbackCampana(campana.id_campanas);
      setAviso(`${r.message} (${r.emails_programados} correos en background).`);
      await cargar();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'No pudimos enviar el feedback.');
    } finally {
      setOcupado(false);
    }
  };

  const cancelar = async () => {
    if (!campana) return;
    setOcupado(true);
    setError(null);
    try {
      const c = await cancelarCampana(campana.id_campanas);
      setCampana(c);
      setAviso('Campaña cancelada: los tokens murieron al instante.');
      await cargar();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'No pudimos cancelar la campaña.');
    } finally {
      setOcupado(false);
      setConfirming(null);
    }
  };

  const redatar = async () => {
    if (!campana) return;
    const h = Number(expiracionNueva);
    if (!(h >= 1 && h <= 8760)) {
      setError('La expiración debe estar entre 1 y 8760 horas.');
      return;
    }
    setOcupado(true);
    setError(null);
    try {
      const c = await actualizarCampana(campana.id_campanas, { expiracion_horas: h });
      setCampana(c);
      setAviso(`Expiración re-datada a ${h} h: los tokens vencidos reviven.`);
      await cargar();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'No pudimos actualizar la expiración.');
    } finally {
      setOcupado(false);
    }
  };

  const mostrarQR = async () => {
    if (!campana) return;
    if (qr) {
      setQr(null);
      return;
    }
    setError(null);
    try {
      const r = await verQRCampana(campana.id_campanas);
      setQr(r.zonas);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'La campaña no tiene zonas QR.');
    }
  };

  const exportar = () => {
    if (!filas) return;
    descargarCSV('scytal_resultados_campana.csv', [
      ['Destinatario', 'Enviado', 'Abrió', 'Clic', 'Envió datos', 'Vencido', 'Puntaje', 'Nivel'],
      ...filas.map((r) => [r.correo, siNo(r.enviado), siNo(r.abrio), siNo(r.clico), siNo(r.subio), siNo(r.vencido), r.puntaje_phishing ?? '', r.nivel ?? '']),
    ]);
  };

  if (!campanaId || !campana) {
    return (
      <>
        <PageHeader eyebrow="Campañas / Resultados" title="Campaña" description="Selecciona una campaña desde la lista." />
        <Card>
          <p className="section-desc">{error ? error : 'Cargando campaña…'}</p>
        </Card>
      </>
    );
  }

  const estado = campana.estado;
  const tieneQR = campana.canales.some((c) => c.canal === 'qr');
  const feedbackYaEnviado = campana.feedback_enviado_en !== null;

  const embudo = [
    ['Enviados', stats?.enviados ?? 0, stats?.total_destinatarios ?? 0],
    ['Abiertos', stats?.abiertos ?? 0, stats?.enviados ?? 0],
    ['Clics', stats?.clics ?? 0, stats?.abiertos ?? 0],
    ['Datos enviados', stats?.subidos ?? 0, stats?.clics ?? 0],
  ] as const;

  const filasVisibles = (filas ?? []).filter((f) => {
    const q = busqueda.trim().toLowerCase();
    return !q || f.correo.toLowerCase().includes(q);
  });

  return (
    <>
      <PageHeader
        eyebrow="Campañas / Resultados"
        title={campana.nombre}
        description={`${nombreGrupo ?? 'Grupo'} · ${plantillaNombre ? `Plantilla: ${plantillaNombre} · ` : ''}Lanzada ${campana.iniciada_en ? fechaCorta(campana.iniciada_en) : 'aún no'} · expira en ${campana.expiracion_horas} h`}
        action={
          readonly ? (
            <Badge>Modo solo lectura</Badge>
          ) : (
            <Badge tone={estado === 'activa' ? 'azul' : estado === 'completada' ? 'bajo' : estado === 'cancelada' ? 'alto' : 'neutral'}>
              {estado}
            </Badge>
          )
        }
      />

      {error && (
        <div className="error-banner">
          <span>!</span>
          <div>
            <strong>Error</strong>
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

      {!readonly && (
        <Card className="actions-card">
          <div className="inline-actions">
            {(estado === 'pendiente' || estado === 'completada' || estado === 'cancelada') && (
              <Button variant="danger" disabled={ocupado} onClick={() => setConfirming('relaunch')}>
                {estado === 'pendiente' ? 'Lanzar campaña' : 'Relanzar campaña'}
              </Button>
            )}
            {estado === 'activa' && (
              <Button variant="danger" disabled={ocupado} onClick={() => setConfirming('finish')}>
                Finalizar y calcular índice
              </Button>
            )}
            {estado === 'activa' && (
              <Button variant="ghost" disabled={ocupado} onClick={() => setConfirming('cancel')}>
                Cancelar campaña
              </Button>
            )}
            {estado === 'pendiente' && (
              <Button variant="ghost" disabled={ocupado} onClick={() => setConfirming('cancel')}>
                Cancelar campaña
              </Button>
            )}
            {estado === 'completada' && !feedbackYaEnviado && (
              <Button disabled={ocupado} onClick={() => void enviarFeedback()}>
                Enviar feedback a destinatarios
              </Button>
            )}
            {feedbackYaEnviado && <Badge tone="bajo">Feedback enviado {fechaCorta(campana.feedback_enviado_en)}</Badge>}
            {tieneQR && (
              <Button variant="secondary" disabled={ocupado} onClick={() => void mostrarQR()}>
                {qr ? 'Ocultar códigos QR' : 'Ver códigos QR por zona'}
              </Button>
            )}
          </div>
          {(estado === 'pendiente' || estado === 'activa') && (
            <div className="invite-form" style={{ marginTop: 10 }}>
              <Input label="Expiración (horas) — en activa re-data los tokens y revive vencidos" value={expiracionNueva} onChange={(v) => setExpiracionNueva(v.replace(/[^0-9]/g, ''))} />
              <Button small variant="secondary" onClick={() => void redatar()} disabled={ocupado}>
                Aplicar expiración
              </Button>
            </div>
          )}
        </Card>
      )}

      {confirming && (
        <div className="warning-box">
          <Icon name="alert" />
          <div>
            <strong>
              {confirming === 'finish'
                ? '¿Confirmas finalizar la campaña?'
                : confirming === 'cancel'
                  ? '¿Confirmas cancelar la campaña?'
                  : '¿Confirmas lanzar / relanzar?'}
            </strong>
            <p>
              {confirming === 'finish' &&
                'Se detiene la simulación, se calcula el índice por destinatario (25% no abrir + 25% no clic + 50% no enviar datos) y se generan alertas por cada formulario enviado. No se puede deshacer.'}
              {confirming === 'cancel' && 'Los tokens mueren AL INSTANTE: escaneos y clics posteriores no registran nada.'}
              {confirming === 'relaunch' &&
                'Se reinician tokens, contadores y expiración; el histórico de eventos y las instantáneas anteriores se conservan.'}
            </p>
          </div>
          <div className="inline-actions">
            <Button variant="ghost" onClick={() => setConfirming(null)}>
              Cancelar
            </Button>
            <Button
              variant="danger"
              disabled={ocupado}
              onClick={() => (confirming === 'finish' ? void finalizar() : confirming === 'cancel' ? void cancelar() : void lanzar())}
            >
              Sí, continuar
            </Button>
          </div>
        </div>
      )}

      {qr && (
        <Card>
          <SectionTitle title="Códigos QR por zona" description="PNG base64 sin atribución a destinatarios; la URL apunta a /track/click?t=…" />
          <div className="qr-zone-grid">
            {qr.map((z) => (
              <div className="qr-zone" key={z.zona}>
                <img src={`data:image/png;base64,${z.qr_base64}`} alt={`QR zona ${z.zona}`} width={130} height={130} />
                <strong>{z.zona}</strong>
                <small title={z.url}>{z.url}</small>
              </div>
            ))}
          </div>
        </Card>
      )}

      <Card className="funnel-card">
        <SectionTitle title="Embudo de interacción" description="Solo el canal correo entra al embudo; los clics QR van aparte (anónimos)" />
        <div className="funnel">
          {embudo.map(([label, valor, base], i) => {
            const pct = base > 0 ? ((valor / base) * 100).toFixed(1).replace('.', ',') : '0,0';
            return (
              <div className="funnel-step" key={label}>
                <div className={`funnel-icon f${i}`}>
                  <Icon name={(['mail', 'eye', 'target', 'alert'] as const)[i]} />
                </div>
                <span>{label}</span>
                <strong>{valor}</strong>
                <small>{pct}%</small>
                {i < 3 && <Icon name="arrow" />}
              </div>
            );
          })}
        </div>
        <p className="section-desc">
          Total destinatarios: {stats?.total_destinatarios ?? '—'} · clics QR: {stats?.qr_clics ?? 0} · estado: {estado}
        </p>
      </Card>

      <Card>
        <SectionTitle
          title="Resultados por destinatario"
          description={`${filasVisibles.length} filas · ordenadas por correo A-Z`}
          action={
            <div className="table-head-actions">
              <div className="search">
                <Icon name="search" size={15} />
                <input placeholder="Buscar…" value={busqueda} onChange={(e) => setBusqueda(e.target.value)} />
              </div>
              <Button small variant="ghost" icon="download" onClick={exportar}>
                CSV
              </Button>
            </div>
          }
        />
        {filas === null ? (
          <p className="section-desc">Cargando resultados…</p>
        ) : (
          <DataTable
            headers={['Destinatario', 'Enviado', 'Abrió', 'Clic', 'Envió datos', 'Token', 'Índice']}
            rows={filasVisibles.map((r) => [
              r.correo,
              siNo(r.enviado),
              siNo(r.abrio),
              siNo(r.clico),
              siNo(r.subio),
              r.vencido ? <Badge tone="alto">Vencido</Badge> : <Badge tone="bajo">Vigente</Badge>,
              r.puntaje_phishing !== null ? (
                <span className="table-head-actions">
                  <strong>{r.puntaje_phishing}</strong> <RiskBadge risk={NIVEL[r.nivel ?? ''] ?? r.nivel ?? '—'} />
                </span>
              ) : (
                <span>—</span>
              ),
            ])}
          />
        )}
      </Card>
    </>
  );
}

function siNo(b: boolean): string {
  return b ? 'Sí' : 'No';
}
