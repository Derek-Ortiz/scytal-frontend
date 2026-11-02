import { useState } from 'react';
import type { Screen } from '../types';
import { Badge, Button, Card, EmailPreview, Icon, Input, PageHeader, SectionTitle } from '../components/ui';

/** Editor de plantilla: asunto, cuerpo, preview de correo y landing simulada. */

export function TemplateEdit({ readonly, setScreen }: { readonly: boolean; setScreen: ScreenSetter2 }) {
  const [asunto, setAsunto] = useState('Acción requerida: actualiza tus datos de nómina');
  const [cuerpo, setCuerpo] = useState(
    'Hola {{nombre}},\n\nHemos actualizado el portal de nómina de {{empresa}}. Para mantener el acceso, revisa tus datos antes del viernes.\n\nGracias,\nEquipo de Finanzas',
  );
  const [guardado, setGuardado] = useState(false);

  return (
    <>
      <PageHeader
        eyebrow="Plantillas / Finanzas"
        title="Actualización de nómina"
        description="Plantilla de correo · última edición hace 2 días"
        action={
          !readonly ? (
            <Button onClick={() => setGuardado(true)}>Guardar cambios</Button>
          ) : (
            <Badge>Modo solo lectura</Badge>
          )
        }
      />
      {guardado && !readonly && (
        <div className="success-banner">
          <Icon name="check" />
          <div>
            <strong>Plantilla guardada</strong>
            <p>La nueva versión queda disponible para la próxima campaña.</p>
          </div>
        </div>
      )}
      <div className="editor-grid">
        <Card>
          <SectionTitle title="Contenido del correo" description="Usa variables como {{nombre}} y {{empresa}}." />
          <Input label="Asunto" value={asunto} onChange={setAsunto} />
          <label className="field">
            <span className="field-label">Cuerpo del mensaje</span>
            <textarea
              className="textarea"
              value={cuerpo}
              onChange={(e) => setCuerpo(e.target.value)}
              readOnly={readonly}
            />
          </label>
          {!readonly && (
            <div className="inline-actions">
              <Button variant="ghost" onClick={() => setScreen('templates')}>
                Volver a la biblioteca
              </Button>
            </div>
          )}
        </Card>
        <div className="preview-stack">
          <Card>
            <SectionTitle title="Preview del correo" description="Escritorio · datos de prueba" />
            <EmailPreview asunto={asunto} />
          </Card>
          <Card>
            <SectionTitle title="Landing page simulada" description="Captura datos bajo dominio controlado · no almacena credenciales" />
            <div className="landing-preview">
              <div className="fake-logo">
                ACME <b>Finance</b>
              </div>
              <strong>Verifica tus datos de acceso</strong>
              <div className="fake-input"></div>
              <div className="fake-input"></div>
              <div className="fake-button">Continuar</div>
            </div>
          </Card>
        </div>
      </div>
    </>
  );
}

type ScreenSetter2 = (s: Screen) => void;
