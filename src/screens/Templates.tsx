import { useCallback, useEffect, useState } from 'react';
import { Badge, Button, Card, Icon, Input, PageHeader, SectionTitle } from '../components/ui';
import {
  ApiError,
  borrarPlantilla,
  importarPlantillaURL,
  listarPlantillas,
  type Canal,
  type Plantilla,
} from '../api';
import { filtrarTexto } from '../filtros';
import { fechaCorta } from './Settings';


export function Templates({
  readonly,
  onEditTemplate,
}: {
  readonly: boolean;
  onEditTemplate: (id: string | null) => void;
}) {
  const [plantillas, setPlantillas] = useState<Plantilla[] | null>(null);
  const [canal, setCanal] = useState<'todos' | Canal>('todos');
  const [perfil, setPerfil] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);

  const [showImport, setShowImport] = useState(false);
  const [url, setUrl] = useState('');
  const [nombreImport, setNombreImport] = useState('');
  const [canalImport, setCanalImport] = useState<Canal>('correo');
  const [asuntoImport, setAsuntoImport] = useState('');
  const [importando, setImportando] = useState(false);

  const cargar = useCallback(async () => {
    setError(null);
    try {
      const pagina = await listarPlantillas({ canal: canal === 'todos' ? undefined : canal, perfil: perfil.trim() || undefined, limit: 100 });
      setPlantillas(pagina.items);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'No pudimos cargar las plantillas.');
    }
  }, [canal, perfil]);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  const eliminar = async (t: Plantilla) => {
    if (!window.confirm(`¿Eliminar la plantilla «${t.nombre}»?`)) return;
    setError(null);
    try {
      await borrarPlantilla(t.id_plantillas);
      await cargar();
      setAviso('Plantilla eliminada.');
    } catch (e) {
      if (e instanceof ApiError && e.code === 'CONFLICT') {
        setError('Una campaña pendiente o activa usa esta plantilla: no se puede eliminar (409 CONFLICT).');
      } else if (e instanceof ApiError && e.code === 'FORBIDDEN') {
        setError('Es una plantilla global: solo se puede ver, no editar ni borrar.');
      } else {
        setError(e instanceof ApiError ? e.message : 'No pudimos eliminar la plantilla.');
      }
    }
  };

  const importar = async () => {
    const u = url.trim();
    if (!/^https?:\/\//.test(u)) {
      setError('La URL debe empezar por http:// o https://');
      return;
    }
    setImportando(true);
    setError(null);
    try {
      const t = await importarPlantillaURL({
        url: u,
        ...(nombreImport.trim() ? { nombre: nombreImport.trim() } : {}),
        perfil: 'corporativo',
        canal: canalImport,
        ...(asuntoImport.trim() && canalImport === 'correo' ? { asunto: asuntoImport.trim() } : {}),
      });
      setShowImport(false);
      setUrl('');
      setNombreImport('');
      setAsuntoImport('');
      await cargar();
      setAviso(`Plantilla clonada: «${t.nombre}». Las páginas importadas congelan el HTML y añaden la leyenda «PÁGINA DE PRUEBA».`);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'La importación por URL falló.');
    } finally {
      setImportando(false);
    }
  };

  return (    <>
      <PageHeader
        eyebrow="Contenido"
        title="Plantillas de phishing"
        description="Plantillas globales de fábrica (solo lectura) y las tuyas propias (§11)."
        action={
          !readonly ? (
            <span className="table-head-actions">
              <Button variant="secondary" icon="upload" onClick={() => setShowImport(!showImport)}>
                Importar por URL
              </Button>
              <Button icon="plus" onClick={() => onEditTemplate(null)}>
                Nueva plantilla
              </Button>
            </span>
          ) : (
            <Badge>Modo solo lectura</Badge>
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

      {showImport && !readonly && (
        <Card className="invite-form">
          <SectionTitle title="Clonar una página de login real" description="El backend descarga el HTML (con guardas SSRF), congela los formularios hacia /track y añade la leyenda «PÁGINA DE PRUEBA»." />
          <Input label="URL de la página" value={url} onChange={setUrl} placeholder="https://ejemplo.com/login" hint="http/https · máx 2048 caracteres. Destinos internos/privados se rechazan (SSRF)." />
          <Input label="Nombre (opcional)" value={nombreImport} onChange={(v) => setNombreImport(filtrarTexto(v))} hint="Si lo dejas vacío: «Import {dominio}»." />
          <Input label="Asunto (canal correo)" value={asuntoImport} onChange={(v) => setAsuntoImport(filtrarTexto(v))} hint="Si lo dejas vacío: «Verificación de seguridad de {dominio}»." />
          <div className="form-grid">
            <label className="field">
              <span className="field-label">Canal</span>
              <select className="input" value={canalImport} onChange={(e) => setCanalImport(e.target.value as Canal)}>
                <option value="correo">Correo</option>
                <option value="qr">Código QR</option>
              </select>
            </label>
          </div>
          <Button onClick={() => void importar()} disabled={importando || !url.trim()}>
            {importando ? 'Clonando página…' : 'Importar plantilla'}
          </Button>
          <Button variant="ghost" onClick={() => setShowImport(false)}>
            Cancelar
          </Button>
        </Card>
      )}

      <div className="toolbar">
        <div className="filters">
          <label className="field">
            <span className="field-label">Buscar por perfil</span>
            <input className="input" placeholder="Ej. finanzas" value={perfil} onChange={(e) => setPerfil(e.target.value)} />
          </label>
        </div>
        <div className="filter-tabs">
          {(['todos', 'correo', 'qr'] as const).map((c) => (
            <button key={c} className={canal === c ? 'active' : ''} onClick={() => setCanal(c)}>
              {c === 'todos' ? 'Todas' : c === 'correo' ? 'Correo' : 'QR'}
            </button>
          ))}
        </div>
      </div>

      {plantillas === null && <Card><p className="section-desc">Cargando plantillas…</p></Card>}
      {plantillas !== null && plantillas.length === 0 && (
        <Card>
          <div className="empty-table">
            <span className="empty-icon">
              <Icon name="file" />
            </span>
            <strong>Sin plantillas</strong>
            <p>No hay plantillas que coincidan con el filtro; crea una nueva o importála por URL.</p>
          </div>
        </Card>
      )}
      <div className="template-grid">
        {plantillas?.map((t) => {
          const global = t.org_id === null;
          const propia = !global && !readonly;
          return (
            <Card className="template-card" key={t.id_plantillas}>
              <div className="template-thumb">
                <div className="mini-mail">
                  <span></span>
                  <span></span>
                  <b></b>
                  <i></i>
                </div>
                <span className="channel-float">
                  <Icon name={t.canal === 'correo' ? 'mail' : 'qr'} size={15} />
                </span>
              </div>
              <div className="template-info">
                <span className="table-head-actions">
                  <Badge>{t.perfil}</Badge>
                  {global ? <Badge tone="medio">Global · solo lectura</Badge> : t.en_uso ? <Badge tone="azul">En uso</Badge> : null}
                </span>
                <strong>{t.nombre}</strong>
                <span>
                  {t.canal === 'correo' ? `Asunto: ${t.asunto ?? '—'}` : 'Landing para código QR'}
                  <br />
                  Actualizada {fechaCorta(t.actualizado_en)}
                </span>
                {!readonly && (
                  <span className="table-head-actions">
                    {propia ? (
                      <>
                        <Button small variant="secondary" onClick={() => onEditTemplate(t.id_plantillas)}>
                          Editar
                        </Button>
                        <Button small variant="ghost" disabled={t.en_uso} onClick={() => void eliminar(t)} title={t.en_uso ? 'En uso por una campaña' : 'Eliminar plantilla'}>
                          Eliminar
                        </Button>
                      </>
                    ) : (
                      <Button small variant="ghost" onClick={() => onEditTemplate(t.id_plantillas)}>
                        Ver plantilla
                      </Button>
                    )}
                  </span>
                )}
              </div>
            </Card>
          );
        })}
      </div>
    </>
  );
}
