import { useMemo, useState } from 'react';
import { grupos as gruposIniciales } from '../data';
import type { GroupRow, RecipientRow } from '../data';
import { Badge, Button, Card, DataTable, Icon, PageHeader, RiskBadge, SectionTitle } from '../components/ui';

/** Grupos y destinatarios: lista lateral de grupos, tabla, importación CSV y alta de grupos. */

export function Groups({
  readonly,
  onSelectRecipient,
}: {
  readonly: boolean;
  onSelectRecipient: (r: RecipientRow, groupName: string) => void;
}) {
  const [grupos, setGrupos] = useState<GroupRow[]>(gruposIniciales);
  const [sel, setSel] = useState(0);
  const [showForm, setShowForm] = useState(false);
  const [nuevoNombre, setNuevoNombre] = useState('');
  const [importInfo, setImportInfo] = useState<string | null>(null);

  const grupoSel = grupos[Math.min(sel, grupos.length - 1)];
  const totalMiembros = grupos.reduce((n, g) => n + Number(g.miembros), 0);

  const crearGrupo = () => {
    const nombre = nuevoNombre.trim();
    if (!nombre) return;
    const nuevo: GroupRow = { nombre, miembros: '0', indice: '—', riesgo: 'Bajo', destinatarios: [] };
    setGrupos([...grupos, nuevo]);
    setSel(grupos.length);
    setShowForm(false);
    setNuevoNombre('');
  };

  const rows = useMemo(() => grupoSel.destinatarios, [grupoSel]);

  return (
    <>
      <PageHeader
        eyebrow="Audiencia"
        title="Grupos y destinatarios"
        description="Organiza las audiencias y supervisa su evolución."
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

      {showForm && !readonly && (
        <Card className="invite-form">
          <label className="field">
            <span className="field-label">Nombre del grupo</span>
            <input
              className="input"
              placeholder="Ej. Finanzas LATAM"
              value={nuevoNombre}
              onChange={(e) => setNuevoNombre(e.target.value)}
            />
          </label>
          <Button onClick={crearGrupo} disabled={!nuevoNombre.trim()}>
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
            description={`${grupos.length} grupos · ${totalMiembros} miembros en total`}
          />
          {grupos.map((g, i) => (
            <button
              className={`group-row${i === Math.min(sel, grupos.length - 1) ? ' selected' : ''}`}
              onClick={() => {
                setSel(i);
                setImportInfo(null);
              }}
              key={`${g.nombre}-${i}`}
            >
              <span className="avatar-group">
                <Icon name="users" size={15} />
              </span>
              <span>
                <strong>{g.nombre}</strong>
                <small>{g.miembros} miembros</small>
              </span>
              <span className="group-risk">
                <RiskBadge risk={g.riesgo} />
                <small>Índice {g.indice}</small>
              </span>
            </button>
          ))}
        </Card>

        <Card>
          <SectionTitle
            title={grupoSel.nombre}
            description={`${grupoSel.destinatarios.length} destinatarios visibles · índice promedio ${grupoSel.indice}`}
            action={
              !readonly ? (
                <Button small variant="secondary" icon="plus">
                  Agregar
                </Button>
              ) : undefined
            }
          />
          {rows.length === 0 ? (
            <div className="empty-table">
              <span className="empty-icon">
                <Icon name="users" />
              </span>
              <strong>Sin destinatarios</strong>
              <p>Importa un CSV o agrega destinatarios manualmente para este grupo.</p>
              {!readonly && (
                <Button variant="secondary" icon="upload" onClick={() => document.getElementById('csv-import')?.click()}>
                  Importar CSV
                </Button>
              )}
            </div>
          ) : (
            <DataTable
              headers={['Destinatario', 'Cargo', 'Índice', 'Última campaña']}
              rows={rows.map((r) => [
                <button className="table-link" onClick={() => onSelectRecipient(r, grupoSel.nombre)}>
                  {r.nombre}
                </button>,
                r.cargo,
                <strong>{r.indice}</strong>,
                `${r.ultimaCampana} · ${r.ultimaActividad}`,
              ])}
            />
          )}

          {importInfo && (
            <div className="success-banner">
              <Icon name="check" />
              <div>
                <strong>Archivo listo para importar</strong>
                <p>
                  «{importInfo}» se procesará contra el grupo {grupoSel.nombre}. Verás el resultado en la tabla
                  tras la validación.
                </p>
              </div>
            </div>
          )}

          {!readonly && (
            <div className="import-panel">
              <Icon name="upload" />
              <div>
                <strong>Importar destinatarios</strong>
                <p>Arrastra un archivo CSV o descarga la plantilla con las columnas esperadas.</p>
              </div>
              <label className="btn btn-secondary btn-small" htmlFor="csv-import">
                Seleccionar CSV
              </label>
              <input
                id="csv-import"
                type="file"
                accept=".csv,text/csv"
                style={{ display: 'none' }}
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) {
                    setImportInfo(f.name);
                    e.target.value = '';
                  }
                }}
              />
            </div>
          )}
        </Card>
      </div>
    </>
  );
}
