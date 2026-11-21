import { useCallback, useEffect, useState } from 'react';
import { Badge, Button, Card, DataTable, Icon, Input, PageHeader, RiskBadge, SectionTitle } from '../components/ui';
import {
  ApiError,
  borrarGrupo,
  crearDestinatario,
  crearGrupo,
  desactivarDestinatario,
  importarDestinatariosCSV,
  listarDestinatarios,
  listarGrupos,
  actualizarGrupo,
  type Destinatario,
  type Grupo,
  type RespuestaCSV,
} from '../api';
import { AVISO, filtrarCorreo } from '../filtros';
import { descargarCSV } from '../data';


function riesgoDeIndice(i: number | null): string {
  if (i === null) return 'Bajo';
  if (i >= 60) return 'Crítico';
  if (i >= 40) return 'Alto';
  if (i >= 20) return 'Medio';
  return 'Bajo';
}

export function Groups({
  readonly,
  onSelectRecipient,
}: {
  readonly: boolean;
  onSelectRecipient: (id: string, groupName: string) => void;
}) {
  const [grupos, setGrupos] = useState<Grupo[] | null>(null);
  const [sel, setSel] = useState<string | null>(null);
  const [destinatarios, setDestinatarios] = useState<Destinatario[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);

  const [showForm, setShowForm] = useState(false);
  const [nuevoNombre, setNuevoNombre] = useState('');
  const [nuevoPerfil, setNuevoPerfil] = useState('');

  const [editando, setEditando] = useState(false);
  const [editNombre, setEditNombre] = useState('');
  const [editPerfil, setEditPerfil] = useState('');

  const [showDest, setShowDest] = useState(false);
  const [correoDest, setCorreoDest] = useState('');

  const [importando, setImportando] = useState(false);
  const [resultadoCSV, setResultadoCSV] = useState<RespuestaCSV | null>(null);

  const cargarGrupos = useCallback(async () => {
    setError(null);
    try {
      const pagina = await listarGrupos(100, 0);
      setGrupos(pagina.items);
      setSel((actual) => actual ?? pagina.items[0]?.id_grupos ?? null);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'No pudimos cargar los grupos.');
    }
  }, []);

  const cargarDestinatarios = useCallback(async (grupoId: string) => {
    setDestinatarios(null);
    try {
      const pagina = await listarDestinatarios({ grupo_id: grupoId, limit: 100 });
      setDestinatarios(pagina.items);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'No pudimos cargar los destinatarios.');
    }
  }, []);

  useEffect(() => {
    void cargarGrupos();
  }, [cargarGrupos]);

  useEffect(() => {
    if (sel) void cargarDestinatarios(sel);
  }, [sel, cargarDestinatarios]);

  const refrescar = async () => {
    await cargarGrupos();
    if (sel) await cargarDestinatarios(sel);
  };

  const grupoSel = grupos?.find((g) => g.id_grupos === sel) ?? null;

  const crear = async () => {
    const nombre = nuevoNombre.trim();
    const perfil = nuevoPerfil.trim();
    if (!nombre || !perfil) return;
    setError(null);
    try {
      const g = await crearGrupo({ nombre, perfil });
      setShowForm(false);
      setNuevoNombre('');
      setNuevoPerfil('');
      setSel(g.id_grupos);
      await cargarGrupos();
      setAviso(`Grupo «${g.nombre}» creado.`);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'No pudimos crear el grupo.');
    }
  };

  const guardarEdicion = async () => {
    if (!grupoSel) return;
    const nombre = editNombre.trim();
    const perfil = editPerfil.trim();
    if (!nombre && !perfil) return;
    setError(null);
    try {
      await actualizarGrupo(grupoSel.id_grupos, { ...(nombre ? { nombre } : {}), ...(perfil ? { perfil } : {}) });
      setEditando(false);
      await cargarGrupos();
      setAviso('Grupo actualizado.');
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'No pudimos actualizar el grupo.');
    }
  };

  const eliminarGrupo = async () => {
    if (!grupoSel) return;
    if (!window.confirm(`¿Eliminar «${grupoSel.nombre}»? Se borran también sus destinatarios (no se puede deshacer).`)) return;
    setError(null);
    try {
      await borrarGrupo(grupoSel.id_grupos);
      setSel(null);
      await cargarGrupos();
      setAviso('Grupo eliminado.');
    } catch (e) {
      if (e instanceof ApiError && e.code === 'CONFLICT') {
        setError('El grupo tiene campañas asociadas: no se puede eliminar (409 CONFLICT).');
      } else {
        setError(e instanceof ApiError ? e.message : 'No pudimos eliminar el grupo.');
      }
    }
  };

  const agregarDestinatario = async () => {
    if (!grupoSel) return;
    const correo = correoDest.trim();
    if (!correo.includes('@')) return;
    setError(null);
    try {
      await crearDestinatario({ correo, grupo_id: grupoSel.id_grupos });
      setCorreoDest('');
      setShowDest(false);
      await refrescar();
      setAviso(`Destinatario ${correo} agregado al grupo.`);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'No pudimos agregar el destinatario.');
    }
  };

  const desactivar = async (d: Destinatario) => {
    if (!window.confirm(`¿Desactivar a ${d.correo}? Su histórico se conserva.`)) return;
    setError(null);
    try {
      await desactivarDestinatario(d.id_destinatarios);
      await refrescar();
      setAviso(`${d.correo} quedó desactivo (los datos se conservan).`);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'No pudimos desactivar al destinatario.');
    }
  };

  const importar = async (file: File) => {
    setImportando(true);
    setError(null);
    setResultadoCSV(null);
    try {
      const r = await importarDestinatariosCSV(file);
      setResultadoCSV(r);
      await refrescar();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'La importación falló.');
    } finally {
      setImportando(false);
    }
  };

  const totalMiembros = grupos?.reduce((n, g) => n + g.metricas.destinatarios_activos, 0) ?? 0;

  return (
    <>
      <PageHeader
        eyebrow="Audiencia"
        title="Grupos y destinatarios"
        description="Organiza las audiencias y supervisa su evolución (§9 y §10)."
        action={
          !readonly ? (
            <Button icon="plus" onClick={() => setShowForm(!showForm)}>
              Nuevo grupo
            </Button>
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

      {showForm && !readonly && (
        <Card className="invite-form">
          <Input label="Nombre del grupo" value={nuevoNombre} onChange={setNuevoNombre} placeholder="Ej. Finanzas LATAM" hint="1–150 caracteres. Duplicado en la org → 409." />
          <Input label="Perfil de la audiencia" value={nuevoPerfil} onChange={setNuevoPerfil} placeholder="Ej. finanzas, soporte TI" hint="1–100 caracteres; orienta las plantillas recomendadas." />
          <Button onClick={() => void crear()} disabled={!nuevoNombre.trim() || !nuevoPerfil.trim()}>
            Crear grupo
          </Button>
          <Button variant="ghost" onClick={() => setShowForm(false)}>
            Cancelar
          </Button>
        </Card>
      )}

      <div className="split-layout">
        <Card className="group-list">
          <SectionTitle
            title="Grupos"
            description={`${grupos?.length ?? '…'} grupos · ${totalMiembros} destinatarios activos`}
          />
          {grupos === null && <p className="section-desc">Cargando grupos…</p>}
          {grupos?.length === 0 && <p className="section-desc">Aún no hay grupos. Crea el primero con «Nuevo grupo».</p>}
          {grupos?.map((g) => (
            <button
              className={`group-row${g.id_grupos === sel ? ' selected' : ''}`}
              onClick={() => {
                setSel(g.id_grupos);
                setEditando(false);
                setResultadoCSV(null);
                setAviso(null);
              }}
              key={g.id_grupos}
            >
              <span className="avatar-group">
                <Icon name="users" size={15} />
              </span>
              <span>
                <strong>{g.nombre}</strong>
                <small>{g.perfil} · {g.metricas.destinatarios_activos} activos</small>
              </span>
              <span className="group-risk">
                <RiskBadge risk={riesgoDeIndice(g.metricas.indice_promedio)} />
                <small>Índice {g.metricas.indice_promedio ?? '—'}</small>
              </span>
            </button>
          ))}
        </Card>

        <Card>
          <SectionTitle
            title={grupoSel?.nombre ?? 'Sin grupo seleccionado'}
            description={
              grupoSel
                ? `${grupoSel.metricas.destinatarios_activos} destinatarios activos · índice promedio ${grupoSel.metricas.indice_promedio ?? '—'}`
                : 'Selecciona un grupo de la lista.'
            }
            action={
              !readonly && grupoSel ? (
                <span className="table-head-actions">
                  <Button small variant="secondary" icon="gear" onClick={() => { setEditando(!editando); setEditNombre(grupoSel.nombre); setEditPerfil(grupoSel.perfil); }}>
                    Editar
                  </Button>
                  <Button small variant="ghost" onClick={() => void eliminarGrupo()}>
                    Eliminar
                  </Button>
                </span>
              ) : undefined
            }
          />

          {editando && grupoSel && !readonly && (
            <div className="invite-form">
              <Input label="Nuevo nombre" value={editNombre} onChange={setEditNombre} />
              <Input label="Nuevo perfil" value={editPerfil} onChange={setEditPerfil} />
              <Button onClick={() => void guardarEdicion()} disabled={!editNombre.trim() && !editPerfil.trim()}>
                Guardar
              </Button>
              <Button variant="ghost" onClick={() => setEditando(false)}>
                Cancelar
              </Button>
            </div>
          )}

          {grupoSel && (
            <>
              {destinatarios === null ? (
                <p className="section-desc">Cargando destinatarios…</p>
              ) : destinatarios.length === 0 ? (
                <div className="empty-table">
                  <span className="empty-icon">
                    <Icon name="users" />
                  </span>
                  <strong>Sin destinatarios</strong>
                  <p>Importa un CSV o agrega destinatarios manualmente para este grupo.</p>
                  {!readonly && (
                    <span className="table-head-actions">
                      <Button small variant="secondary" icon="plus" onClick={() => setShowDest(true)}>
                        Agregar
                      </Button>
                      <Button small variant="secondary" icon="upload" onClick={() => document.getElementById('csv-import')?.click()}>
                        Importar CSV
                      </Button>
                    </span>
                  )}
                </div>
              ) : (
                <DataTable
                  headers={['Destinatario', 'Estado', 'Creado', ...(readonly ? [] : ['Acciones'])]}
                  rows={destinatarios.map((d) => [
                    <button className="table-link" onClick={() => onSelectRecipient(d.id_destinatarios, grupoSel.nombre)} key={d.id_destinatarios}>
                      {d.correo}
                    </button>,
                    d.activo ? <Badge tone="bajo">Activo</Badge> : <Badge tone="neutral">Desactivado</Badge>,
                    fechaCorta(d.creado_en),
                    ...(readonly
                      ? []
                      : [
                          d.activo ? (
                            <Button key={d.id_destinatarios} small variant="ghost" onClick={() => void desactivar(d)}>
                              Desactivar
                            </Button>
                          ) : (
                            <Badge key={d.id_destinatarios} tone="neutral">Histórico conservado</Badge>
                          ),
                        ]),
                  ])}
                />
              )}

              {showDest && !readonly && (
                <div className="invite-form">
                  <Input
                    label="Correo del destinatario"
                    value={correoDest}
                    onChange={(v) => setCorreoDest(filtrarCorreo(v))}
                    hint={`${AVISO.correo} · se normaliza en minúsculas.`}
                  />
                  <Button onClick={() => void agregarDestinatario()} disabled={!correoDest.trim().includes('@')}>
                    Agregar al grupo
                  </Button>
                  <Button variant="ghost" onClick={() => setShowDest(false)}>
                    Cancelar
                  </Button>
                </div>
              )}

              {resultadoCSV && (
                <div className="success-banner">
                  <Icon name="check" />
                  <div>
                    <strong>Importación terminada</strong>
                    <p>
                      {resultadoCSV.total_filas} filas leídas · {resultadoCSV.creados} creadas · {resultadoCSV.duplicados} duplicadas ·{' '}
                      {resultadoCSV.invalidos} inválidas.
                      {resultadoCSV.errores.length > 0 && (
                        <>
                          <br />
                          Detalle: {resultadoCSV.errores.slice(0, 5).join(' · ')}
                          {resultadoCSV.errores.length > 5 && ` (+${resultadoCSV.errores.length - 5} más)`}
                        </>
                      )}
                    </p>
                  </div>
                </div>
              )}

              {!readonly && (
                <div className="import-panel">
                  <Icon name="upload" />
                  <div>
                    <strong>Importar destinatarios</strong>
                    <p>
                      CSV con encabezados EXACTOS «correo,grupo» (el grupo va por NOMBRE). Máx 2 MB y 5.000 filas · nunca
                      falla por filas inválidas: las reporta.
                    </p>
                  </div>
                  <Button small variant="ghost" icon="download" onClick={() => descargarCSV('plantilla_destinatarios.csv', [['correo', 'grupo'], ['juan.perez@empresa.com', grupoSel.nombre]])}>
                    Plantilla
                  </Button>
                  <label className="btn btn-secondary btn-small" htmlFor="csv-import">
                    {importando ? 'Importando…' : 'Seleccionar CSV'}
                  </label>
                  <input
                    id="csv-import"
                    type="file"
                    accept=".csv,text/csv"
                    style={{ display: 'none' }}
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) void importar(f);
                      e.target.value = '';
                    }}
                  />
                </div>
              )}
            </>
          )}
        </Card>
      </div>
    </>
  );
}

function fechaCorta(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' });
}
