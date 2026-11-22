import { useEffect, useState } from 'react';
import type { Screen } from '../types';
import { Badge, Button, Card, EmailPreview, Icon, Input, PageHeader, SectionTitle } from '../components/ui';
import {
  ApiError,
  crearCampana,
  definirCanalesCampana,
  lanzarCampana,
  listarGrupos,
  listarPlantillas,
  type Canal,
  type Campana,
  type Grupo,
  type Plantilla,
} from '../api';
import { AVISO, filtrarTexto } from '../filtros';

const STEPS = ['Información', 'Plantilla', 'Canales', 'Confirmación'] as const;


export function CampaignWizard({
  setScreen,
  onOpenCampaign,
}: {
  setScreen: (s: Screen) => void;
  onOpenCampaign: (id: string) => void;
}) {
  const [step, setStep] = useState(1);
  const [grupos, setGrupos] = useState<Grupo[]>([]);
  const [plantillas, setPlantillas] = useState<Plantilla[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  const [nombre, setNombre] = useState('');
  const [grupoId, setGrupoId] = useState('');
  const [expiracion, setExpiracion] = useState('72');
  const [plantillaId, setPlantillaId] = useState<string | null>(null);
  const [canales, setCanales] = useState({ correo: true, qr: false });
  const [zonasTexto, setZonasTexto] = useState('Recepción\nSala de reuniones');

  useEffect(() => {
    Promise.all([listarGrupos(100, 0), listarPlantillas({ limit: 100 })])
      .then(([g, t]) => {
        setGrupos(g.items);
        setPlantillas(t.items);
      })
      .catch((e) => setError(e instanceof ApiError ? e.message : 'No pudimos cargar grupos y plantillas.'));
  }, []);

  const grupoSel = grupos.find((g) => g.id_grupos === grupoId) ?? null;
  const plantillaSel = plantillas.find((p) => p.id_plantillas === plantillaId) ?? null;
  const seleccionadas: Canal[] = [
    ...(canales.correo ? (['correo'] as Canal[]) : []),
    ...(canales.qr ? (['qr'] as Canal[]) : []),
  ];
  const zonas = zonasTexto
    .split('\n')
    .map((z) => z.trim())
    .filter(Boolean)
    .slice(0, 50);

  const puedePaso1 = nombre.trim().length > 0 && !!grupoId && Number(expiracion) >= 1 && Number(expiracion) <= 8760;
  const puedePaso2 = !!plantillaId;
  const puedePaso3 = seleccionadas.length > 0 && (!canales.qr || zonas.length > 0);

  const guardar = async (lanzar: boolean) => {
    setError(null);
    if (!grupoSel) return;
    setEnviando(true);
    try {
      let c: Campana = await crearCampana({
        nombre: nombre.trim(),
        grupo_id: grupoSel.id_grupos,
        plantilla_id: plantillaId ?? undefined,
        expiracion_horas: Number(expiracion) || undefined,
      });
      if (seleccionadas.length > 0) {
        c = await definirCanalesCampana(c.id_campanas, {
          canales: seleccionadas,
          ...(canales.qr ? { zonas } : {}),
        });
      }
      if (lanzar) {
        const r = await lanzarCampana(c.id_campanas);
        setScreen('campaign-detail');
        onOpenCampaign(r.campana.id_campanas);
      } else {
        setScreen('campaign-detail');
        onOpenCampaign(c.id_campanas);
      }
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'No pudimos crear la campaña.');
    } finally {
      setEnviando(false);
    }
  };

  return (
    <>
      <PageHeader
        eyebrow="Campañas / Nueva"
        title="Configurar campaña"
        description="Crea una simulación segura y controlada (§12)."
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
      <div className="wizard-steps">
        {STEPS.map((s, i) => (
          <div className={`wizard-step${step === i + 1 ? ' active' : ''}${step > i + 1 ? ' done' : ''}`} key={s}>
            <span>{step > i + 1 ? <Icon name="check" size={14} /> : i + 1}</span>
            <div>
              <strong>{s}</strong>
              <small>Paso {i + 1}</small>
            </div>
          </div>
        ))}
      </div>

      <Card className="wizard-card">
        {step === 1 && (
          <>
            <SectionTitle title="Información básica" description="Identifica la campaña y define su audiencia." />
            <div className="form-grid">
              <Input
                label="Nombre de campaña"
                value={nombre}
                onChange={(v) => setNombre(filtrarTexto(v))}
                placeholder="Ej. Actualización de nómina Q3"
                hint="1–255 caracteres · visible solo para tu equipo."
              />
              <label className="field">
                <span className="field-label">Grupo de destinatarios</span>
                <select className="input" value={grupoId} onChange={(e) => setGrupoId(e.target.value)}>
                  <option value="">Seleccionar grupo…</option>
                  {grupos.map((g) => (
                    <option key={g.id_grupos} value={g.id_grupos}>
                      {g.nombre} · {g.metricas.destinatarios_activos} activos
                    </option>
                  ))}
                </select>
              </label>
              <Input label="Expiración de los tokens (horas)" value={expiracion} onChange={(v) => setExpiracion(v.replace(/[^0-9]/g, ''))} hint="1–8760 · por defecto 72 h. Editable también con la campaña activa." />
            </div>
            {grupoSel && grupoSel.metricas.destinatarios_activos === 0 && (
              <div className="warning-box">
                <Icon name="alert" />
                <div>
                  <strong>Este grupo no tiene destinatarios activos</strong>
                  <p>El lanzamiento requiere al menos un destinatario activo; agrega miembros en «Grupos y destinatarios».</p>
                </div>
              </div>
            )}
          </>
        )}

        {step === 2 && (
          <>
            <SectionTitle title="Selecciona una plantilla" description="Incluye las globales de fábrica y las de tu organización." />
            <div className="template-choice">
              <div className="template-list">
                {plantillas.map((t) => (
                  <button
                    className={`template-option${plantillaId === t.id_plantillas ? ' selected' : ''}`}
                    onClick={() => setPlantillaId(t.id_plantillas)}
                    key={t.id_plantillas}
                  >
                    <span className="template-icon">
                      <Icon name={t.canal === 'correo' ? 'mail' : 'qr'} />
                    </span>
                    <span>
                      <strong>{t.nombre}</strong>
                      <small>
                        {t.perfil} · {t.canal === 'correo' ? 'Correo' : 'QR'}
                        {t.org_id === null ? ' · global' : ''}
                      </small>
                    </span>
                    {plantillaId === t.id_plantillas && <Icon name="check" size={15} />}
                  </button>
                ))}
                {plantillas.length === 0 && <p className="section-desc">No hay plantillas disponibles.</p>}
              </div>
              <EmailPreview asunto={plantillaSel?.asunto ?? 'Sin plantilla seleccionada'} />
            </div>
          </>
        )}

        {step === 3 && (
          <>
            <SectionTitle
              title="Canales de simulación"
              description="REEMPLAZA el set completo. El QR es anónimo y exige al menos una zona."
            />
            <div className="channel-choice">
              {(
                [
                  ['correo', 'Correo electrónico', 'Envía la simulación a la bandeja de cada destinatario.'],
                  ['qr', 'Código QR', 'Zonas con QR anónimo; los clics van aparte (qr_clics).'],
                ] as const
              ).map(([id, titulo, descripcion]) => (
                <label className="check-card" key={id}>
                  <input type="checkbox" checked={canales[id]} onChange={() => setCanales({ ...canales, [id]: !canales[id] })} />
                  <span className="check-ui">
                    <Icon name="check" size={13} />
                  </span>
                  <span className="channel-big">
                    <Icon name={id} />
                  </span>
                  <span>
                    <strong>{titulo}</strong>
                    <small>{descripcion}</small>
                  </span>
                </label>
              ))}
            </div>
            {canales.qr && (
              <label className="field">
                <span className="field-label">Zonas QR (una por línea, 1–100 caracteres, máx 50)</span>
                <textarea className="textarea" value={zonasTexto} onChange={(e) => setZonasTexto(e.target.value)} rows={4} />
                <span className="field-hint">{zonas.length} zonas definidas.</span>
              </label>
            )}
            {!canales.correo && !canales.qr && (
              <div className="warning-box">
                <Icon name="alert" />
                <div>
                  <strong>Selecciona al menos un canal</strong>
                  <p>La campaña necesita un canal para llegar a la audiencia.</p>
                </div>
              </div>
            )}
            {canales.qr && zonas.length === 0 && (
              <div className="warning-box">
                <Icon name="alert" />
                <div>
                  <strong>El canal QR necesita zonas</strong>
                  <p>Define al menos una zona (una por línea).</p>
                </div>
              </div>
            )}
          </>
        )}

        {step === 4 && (
          <>
            <SectionTitle title="Revisa antes de lanzar" description="Se crean tokens por destinatario; el envío de correos corre en background." />
            <div className="summary-grid">
              {(
                [
                  ['Campaña', nombre.trim() || 'Sin título'],
                  ['Audiencia', grupoSel ? `${grupoSel.nombre} · ${grupoSel.metricas.destinatarios_activos} activos` : 'Sin grupo'],
                  ['Plantilla', plantillaSel?.nombre ?? '—'],
                  ['Canales', seleccionadas.map((c) => (c === 'correo' ? 'Correo' : `QR (${zonas.length} zonas)`)).join(' + ') || '—'],
                  ['Expiración', `${expiracion} h`],
                ] as const
              ).map(([k, v]) => (
                <div className="summary-item" key={k}>
                  <span>{k}</span>
                  <strong>{v}</strong>
                </div>
              ))}
            </div>
            <div className="info-box">
              <Icon name="mail" />
              <div>
                <strong>Qué ocurre al lanzar</strong>
                <p>
                  Cada destinatario activo recibe un enlace único {`{FRONTEND_BASE_URL}/track/click?t=…`} y el píxel de
                  apertura; los QR se generan por zona. Los contadores se reinician si relanzas una campaña terminada.
                </p>
              </div>
            </div>
            <div className="warning-box">
              <Icon name="shield" />
              <div>
                <strong>Uso responsable</strong>
                <p>
                  Confirma que esta campaña cuenta con autorización de tu organización. Scytal nunca almacena lo que se
                  escribe en los formularios falsos.
                </p>
              </div>
            </div>
          </>
        )}

        <div className="wizard-actions">
          <Button variant="secondary" onClick={() => (step === 1 ? setScreen('campaigns') : setStep(step - 1))}>
            Atrás
          </Button>
          {step < 4 ? (
            <Button
              disabled={(step === 1 && !puedePaso1) || (step === 2 && !puedePaso2) || (step === 3 && !puedePaso3)}
              onClick={() => setStep(step + 1)}
            >
              Continuar <Icon name="arrow" size={14} />
            </Button>
          ) : (
            <span className="table-head-actions">
              <Button variant="ghost" disabled={enviando} onClick={() => void guardar(false)}>
                Guardar borrador
              </Button>
              <Button disabled={enviando} onClick={() => void guardar(true)}>
                {enviando ? 'Lanzando…' : 'Lanzar campaña'}
              </Button>
            </span>
          )}
        </div>
      </Card>
      <p className="wizard-note">
        <Badge tone="medio">Tip</Badge> Guarda como borrador para completar la configuración después (estado `pendiente`).
        <br />
        <small>{AVISO.texto}</small>
      </p>
    </>
  );
}
