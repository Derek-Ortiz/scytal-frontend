import { useState } from 'react';
import type { Screen } from '../types';
import { plantillas } from '../data';
import { Badge, Button, Card, EmailPreview, Icon, Input, PageHeader, SectionTitle, Select } from '../components/ui';

const STEPS = ['Información', 'Plantilla', 'Canales', 'Confirmación'] as const;
const GRUPOS_WIZARD = [
  'Seleccionar grupo…',
  'Finanzas Europa · 124 miembros',
  'Recursos Humanos · 86 miembros',
  'Soporte y Operaciones · 213 miembros',
  'Dirección · 18 miembros',
];

/** Wizard de configuración de campaña en cuatro pasos: Información → Plantilla → Canales → Confirmación. */

export function CampaignWizard({ setScreen }: { setScreen: (s: Screen) => void }) {
  const [step, setStep] = useState(1);
  const [nombre, setNombre] = useState('Actualización de credenciales · Q3');
  const [grupo, setGrupo] = useState(GRUPOS_WIZARD[0]);
  const [plantillaSel, setPlantillaSel] = useState(0);
  const [canales, setCanales] = useState({ mail: true, qr: true });

  const seleccionadas = [canales.mail && 'Correo electrónico', canales.qr && 'Código QR'].filter(Boolean) as string[];
  const puedeContinuar = step !== 3 || seleccionadas.length > 0;

  return (
    <>
      <PageHeader
        eyebrow="Campañas / Nueva"
        title="Configurar campaña"
        description="Crea una simulación segura y controlada."
      />
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
                onChange={setNombre}
                hint="Visible únicamente para tu equipo."
              />
              <Select label="Grupo de destinatarios" value={grupo} onChange={setGrupo}>
                {GRUPOS_WIZARD.map((g) => (
                  <option key={g}>{g}</option>
                ))}
              </Select>
            </div>
            <div className="info-box">
              <Icon name="users" />
              <div>
                <strong>Acerca de los destinatarios</strong>
                <p>
                  Los destinatarios no necesitan una cuenta en Scytal. Solo recibirán la simulación por los
                  canales seleccionados.
                </p>
              </div>
            </div>
          </>
        )}

        {step === 2 && (
          <>
            <SectionTitle title="Selecciona una plantilla" description="Recomendadas según el perfil del grupo." />
            <div className="template-choice">
              <div className="template-list">
                {plantillas.slice(0, 3).map((t, i) => (
                  <button
                    className={`template-option${plantillaSel === i ? ' selected' : ''}`}
                    onClick={() => setPlantillaSel(i)}
                    key={t.id}
                  >
                    <span className="template-icon">
                      <Icon name={t.canal} />
                    </span>
                    <span>
                      <strong>{t.nombre}</strong>
                      <small>
                        {t.categoria} · {t.canal === 'mail' ? 'Correo' : 'Código QR'}
                      </small>
                    </span>
                    {plantillaSel === i && <Icon name="check" size={15} />}
                  </button>
                ))}
              </div>
              <EmailPreview asunto={plantillas[plantillaSel].nombre} />
            </div>
          </>
        )}

        {step === 3 && (
          <>
            <SectionTitle
              title="Canales de simulación"
              description="Combina correo electrónico y códigos QR rastreables en una misma campaña."
            />
            <div className="channel-choice">
              {(
                [
                  ['mail', 'Correo electrónico', 'Envía la simulación directamente a la bandeja corporativa.'],
                  ['qr', 'Código QR', 'Incluye un código QR único y rastreable dentro del correo.'],
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
            {seleccionadas.length === 0 && (
              <div className="warning-box">
                <Icon name="alert" />
                <div>
                  <strong>Selecciona al menos un canal</strong>
                  <p>La campaña necesita un canal para llegar a la audiencia.</p>
                </div>
              </div>
            )}
          </>
        )}

        {step === 4 && (
          <>
            <SectionTitle title="Revisa antes de lanzar" description="Una vez activa, la audiencia no puede modificarse." />
            <div className="summary-grid">
              {(
                [
                  ['Campaña', nombre.trim() || 'Sin título'],
                  ['Audiencia', grupo === GRUPOS_WIZARD[0] ? 'Sin grupo asignado' : grupo],
                  ['Plantilla', plantillas[plantillaSel].nombre],
                  ['Canales', seleccionadas.join(' + ')],
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
                  Los integrantes del grupo recibirán la simulación durante las próximas 48 horas y verás la
                  interacción en tiempo real.
                </p>
              </div>
            </div>
            <div className="warning-box">
              <Icon name="shield" />
              <div>
                <strong>Uso responsable</strong>
                <p>
                  Confirma que esta campaña cuenta con autorización de tu organización y cumple sus políticas
                  internas. Scytal nunca almacena contraseñas introducidas.
                </p>
              </div>
            </div>
          </>
        )}

        <div className="wizard-actions">
          <Button
            variant="secondary"
            onClick={() => (step === 1 ? setScreen('campaigns') : setStep(step - 1))}
          >
            Atrás
          </Button>
          <Button disabled={!puedeContinuar} onClick={() => (step === 4 ? setScreen('campaign-detail') : setStep(step + 1))}>
            {step === 4 ? 'Lanzar campaña' : 'Continuar'} {step < 4 && <Icon name="arrow" size={14} />}
          </Button>
        </div>
      </Card>
      <p className="wizard-note">
        <Badge tone="medio">Demo</Badge> Al lanzar se navega a los resultados de la campaña Q2 como ejemplo.
      </p>
    </>
  );
}
