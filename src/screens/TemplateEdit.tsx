import { useEffect, useState } from 'react';
import type { Screen } from '../types';
import { Badge, Button, Card, Icon, Input, PageHeader, SectionTitle } from '../components/ui';
import {
  ApiError,
  actualizarPlantilla,
  crearPlantilla,
  previsualizarPlantilla,
  verPlantilla,
  type Canal,
  type Plantilla,
} from '../api';
import { filtrarTexto } from '../filtros';
import { fechaCorta } from './Settings';


export function TemplateEdit({
  readonly,
  setScreen,
  plantillaId,
}: {
  readonly: boolean;
  setScreen: (s: Screen) => void;
  plantillaId: string | null;
}) {
  const [cargada, setCargada] = useState<Plantilla | null>(null);
  const [nombre, setNombre] = useState('');
  const [perfil, setPerfil] = useState('corporativo');
  const [canal, setCanal] = useState<Canal>('correo');
  const [asunto, setAsunto] = useState('');
  const [contenido, setContenido] = useState(
    '<p>Hola,</p><p>Revisa tus datos antes de que tu sesión expire.</p><p><a href="{{enlace}}">Actualizar ahora</a></p><p>Gracias,<br>Equipo de TI</p>',
  );
  const [landing, setLanding] = useState(
    '<div style="font-family:sans-serif;max-width:420px;margin:40px auto"><h2>Portal corporativo</h2><form action="/track/submit" method="post"><input name="usuario" placeholder="Usuario" style="width:100%;padding:8px;margin:6px 0"><input name="contrasena" type="password" placeholder="Contraseña" style="width:100%;padding:8px;margin:6px 0"><button style="padding:8px 16px">Continuar</button></form></div>',
  );
  const [error, setError] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [soloLecturaGlobal, setSoloLecturaGlobal] = useState(false);
  const [abriendoLanding, setAbriendoLanding] = useState(false);

  useEffect(() => {
    if (!plantillaId) return;
    let vivo = true;
    setError(null);
    verPlantilla(plantillaId)
      .then((t) => {
        if (!vivo) return;
        setCargada(t);
        setNombre(t.nombre);
        setPerfil(t.perfil);
        setCanal(t.canal);
        setAsunto(t.asunto ?? '');
        setContenido(t.contenido_html);
        setLanding(t.landing_html);
        setSoloLecturaGlobal(t.org_id === null);
      })
      .catch((e) => {
        if (vivo) setError(e instanceof ApiError ? e.message : 'No pudimos cargar la plantilla.');
      });
    return () => {
      vivo = false;
    };
  }, [plantillaId]);

  const enUso = cargada?.en_uso === true;
  const bloqueado = readonly || soloLecturaGlobal;

  const abrirLandingReal = async () => {
    if (!cargada) return;
    setAbriendoLanding(true);
    setError(null);
    try {
      const { url } = await previsualizarPlantilla(cargada.id_plantillas);
      window.open(url, '_blank', 'noopener,noreferrer');
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'No pudimos generar el enlace de previsualización.');
    } finally {
      setAbriendoLanding(false);
    }
  };

  const guardar = async () => {
    const n = nombre.trim();
    const p = perfil.trim();
    const a = asunto.trim();
    if (!n || !p || !contenido.trim() || !landing.trim()) {
      setError('Nombre, perfil, contenido y landing son obligatorios.');
      return;
    }
    if (canal === 'correo' && !a) {
      setError('El canal «correo» exige un asunto (regla §11).');
      return;
    }
    setEnviando(true);
    setError(null);
    try {
      if (plantillaId) {
        await actualizarPlantilla(plantillaId, {
          nombre: n,
          perfil: p,
          canal,
          ...(canal === 'correo' ? { asunto: a } : {}),
          contenido_html: contenido,
          landing_html: landing,
        });
      } else {
        await crearPlantilla({
          nombre: n,
          perfil: p,
          canal,
          ...(canal === 'correo' ? { asunto: a } : {}),
          contenido_html: contenido,
          landing_html: landing,
        });
      }
      setScreen('templates');
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'No pudimos guardar la plantilla.');
    } finally {
      setEnviando(false);
    }
  };

  return (
    <>
      <PageHeader
        eyebrow={cargada ? `Plantillas / ${cargada.perfil}` : 'Plantillas / Nueva'}
        title={cargada ? cargada.nombre : 'Nueva plantilla'}
        description={
          cargada
            ? `${cargada.canal === 'correo' ? 'Correo' : 'QR'} · actualizada ${fechaCorta(cargada.actualizado_en)}${cargada.org_id === null ? ' · plantilla global (solo lectura)' : ''}`
            : 'Plantilla propia de tu organización.'
        }
        action={
          bloqueado ? (
            <Badge>{soloLecturaGlobal ? 'Global · solo lectura' : 'Modo solo lectura'}</Badge>
          ) : (
            <Button onClick={() => void guardar()} disabled={enviando}>
              {enviando ? 'Guardando…' : 'Guardar cambios'}
            </Button>
          )
        }
      />
      {enUso && !bloqueado && (
        <div className="warning-box">
          <Icon name="alert" />
          <div>
            <strong>Plantilla en uso</strong>
            <p>Una campaña pendiente o activa la referencia: puedes editarla pero no eliminarla de la biblioteca.</p>
          </div>
        </div>
      )}
      {error && (
        <div className="error-banner">
          <span>!</span>
          <div>
            <strong>Error</strong>
            <p>{error}</p>
          </div>
        </div>
      )}

      <div className="editor-grid">
        <Card>
          <SectionTitle
            title="Contenido del correo"
            description="Marcadores admitidos: {{enlace}} y {{pixel}} (si faltan, el backend los añade al enviar)."
          />
          <Input label="Nombre" value={nombre} onChange={(v) => setNombre(filtrarTexto(v))} disabled={bloqueado} />
          <Input label="Perfil (audiencia)" value={perfil} onChange={(v) => setPerfil(filtrarTexto(v))} hint="Orienta el buscador por perfil." disabled={bloqueado} />
          <label className="field">
            <span className="field-label">Canal</span>
            <select className="input" value={canal} onChange={(e) => setCanal(e.target.value as Canal)} disabled={bloqueado}>
              <option value="correo">Correo electrónico</option>
              <option value="qr">Código QR (landing sin asunto)</option>
            </select>
          </label>
          <Input
            label={canal === 'correo' ? 'Asunto (obligatorio)' : 'Asunto (solo se usa en correo)'}
            value={asunto}
            onChange={(v) => setAsunto(filtrarTexto(v))}
            hint={canal === 'correo' ? 'Regla §11: canal correo ⇒ asunto obligatorio.' : 'El canal qr no lleva asunto.'}
            disabled={bloqueado}
          />
          <label className="field">
            <span className="field-label">Cuerpo HTML del correo</span>
            <textarea className="textarea" value={contenido} onChange={(e) => setContenido(e.target.value)} readOnly={bloqueado} rows={8} />
          </label>
          {!bloqueado && (
            <div className="inline-actions">
              <Button variant="ghost" onClick={() => setScreen('templates')}>
                Volver a la biblioteca
              </Button>
            </div>
          )}
        </Card>

        <div className="preview-stack">
          <Card>
            <SectionTitle title="Preview del correo" description="Render aislado del HTML guardado" />
            {canal === 'correo' ? (
              <iframe
                sandbox=""
                title="Preview del correo"
                className="html-frame"
                srcDoc={contenido}
              />
            ) : (
              <EmailPreviewQR />
            )}
          </Card>
          <Card>
            <SectionTitle
              title="Landing page simulada"
              description="Los formularios apuntan a /track (el contenido del formulario NUNCA se guarda)."
            />
            <iframe sandbox="" title="Preview de la landing" className="html-frame tall" srcDoc={landing} />
            {cargada && (
              <div className="inline-actions" style={{ marginTop: 10 }}>
                <Button variant="ghost" onClick={() => void abrirLandingReal()} disabled={abriendoLanding}>
                  {abriendoLanding ? 'Generando enlace…' : 'Abrir landing real (enlace 30 min)'}
                </Button>
              </div>
            )}
          </Card>
        </div>
      </div>
    </>
  );
}

function EmailPreviewQR() {
  return (
    <div className="landing-preview">
      <div className="fake-logo">SCYTAL <b>QR</b></div>
      <strong>La landing se entrega vía código QR</strong>
      <div className="fake-input"></div>
      <div className="fake-input"></div>
      <div className="fake-button">Escanear</div>
    </div>
  );
}
