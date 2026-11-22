import { useCallback, useEffect, useState } from 'react';
import type { Screen } from '../types';
import { Badge, Button, Card, ChannelIcons, DataTable, Icon, PageHeader, Select } from '../components/ui';
import { ApiError, listarCampanas, listarGrupos, type Campana, type EstadoCampana, type Grupo } from '../api';
import { descargarCSV } from '../data';


const PAGE_SIZE = 5;

const ESTADOS: Array<readonly [EstadoCampana | 'todos', string]> = [
  ['todos', 'Todos los estados'],
  ['pendiente', 'Pendiente'],
  ['activa', 'Activa'],
  ['completada', 'Completada'],
  ['cancelada', 'Cancelada'],
];

export function Campaigns({
  readonly,
  setScreen,
  onOpenCampaign,
}: {
  readonly: boolean;
  setScreen: (s: Screen) => void;
  onOpenCampaign: (id: string) => void;
}) {
  const [estado, setEstado] = useState<EstadoCampana | 'todos'>('todos');
  const [grupo, setGrupo] = useState<string>('todos');
  const [busqueda, setBusqueda] = useState('');
  const [pagina, setPagina] = useState(1);
  const [paginaDatos, setPaginaDatos] = useState<{ items: Campana[]; total: number } | null>(null);
  const [grupos, setGrupos] = useState<Grupo[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let vivo = true;
    listarGrupos(100, 0)
      .then((p) => {
        if (vivo) setGrupos(p.items);
      })
      .catch(() => {
      });
    return () => {
      vivo = false;
    };
  }, []);

  const cargar = useCallback(async () => {
    setError(null);
    try {
      const p = await listarCampanas({
        estado: estado === 'todos' ? undefined : estado,
        grupo_id: grupo === 'todos' ? undefined : grupo,
        limit: PAGE_SIZE,
        offset: (pagina - 1) * PAGE_SIZE,
      });
      setPaginaDatos({ items: p.items, total: p.total });
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'No pudimos cargar las campañas.');
    }
  }, [estado, grupo, pagina]);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  const nombreGrupo = (id: string): string => grupos.find((g) => g.id_grupos === id)?.nombre ?? id.slice(0, 8) + '…';

  const filtradas = (paginaDatos?.items ?? []).filter((c) => {
    const q = busqueda.trim().toLowerCase();
    return !q || c.nombre.toLowerCase().includes(q) || nombreGrupo(c.grupo_id).toLowerCase().includes(q);
  });

  const total = paginaDatos?.total ?? 0;
  const totalPaginas = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const exportar = () => {
    descargarCSV('scytal_campanas.csv', [
      ['Campaña', 'Grupo', 'Canales', 'Estado', 'Lanzada', 'Creada'],
      ...filtradas.map((c) => [
        c.nombre,
        nombreGrupo(c.grupo_id),
        c.canales.map((x) => x.canal).join('+') || '—',
        c.estado,
        c.iniciada_en ? fecha(c.iniciada_en) : '—',
        fecha(c.creado_en),
      ]),
    ]);
  };

  const badgeEstado = (e: EstadoCampana) => {
    if (e === 'activa') return <Badge tone="azul">Activa</Badge>;
    if (e === 'completada') return <Badge tone="bajo">Completada</Badge>;
    if (e === 'cancelada') return <Badge tone="alto">Cancelada</Badge>;
    if (e === 'programada') return <Badge tone="medio">Programada</Badge>;
    return <Badge>Pendiente</Badge>;
  };

  return (
    <>
      <PageHeader
        eyebrow="Simulaciones"
        title="Campañas"
        description="Configura y supervisa simulaciones de phishing para tus grupos (§12)."
        action={
          !readonly ? (
            <Button icon="plus" onClick={() => setScreen('campaign-new')}>
              Nueva campaña
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
      <Card>
        <div className="toolbar">
          <div className="filters">
            <Select
              value={estado}
              onChange={(v) => {
                setEstado(v as EstadoCampana | 'todos');
                setPagina(1);
              }}
            >
              {ESTADOS.map(([v, label]) => (
                <option key={v} value={v}>
                  {label}
                </option>
              ))}
            </Select>
            <Select
              value={grupo}
              onChange={(v) => {
                setGrupo(v);
                setPagina(1);
              }}
            >
              <option value="todos">Todos los grupos</option>
              {grupos.map((g) => (
                <option key={g.id_grupos} value={g.id_grupos}>
                  {g.nombre}
                </option>
              ))}
            </Select>
          </div>
          <div className="search">
            <Icon name="search" size={16} />
            <input
              placeholder="Buscar campaña…"
              value={busqueda}
              onChange={(e) => {
                setBusqueda(e.target.value);
              }}
            />
          </div>
          <Button variant="ghost" icon="download" onClick={exportar}>
            CSV
          </Button>
        </div>

        {filtradas.length === 0 ? (
          <div className="empty-table">
            <span className="empty-icon">
              <Icon name="target" />
            </span>
            <strong>Sin resultados</strong>
            <p>Ninguna campaña coincide con los filtros aplicados. Ajusta la búsqueda o crea una nueva.</p>
          </div>
        ) : (
          <DataTable
            headers={['Campaña', 'Grupo objetivo', 'Canales', 'Estado', 'Lanzamiento']}
            rows={filtradas.map((c) => [
              <button className="table-link" onClick={() => onOpenCampaign(c.id_campanas)} key={c.id_campanas}>
                {c.nombre}
              </button>,
              nombreGrupo(c.grupo_id),
              <ChannelIcons value={c.canales.map((x) => x.canal).join(',')} />,
              badgeEstado(c.estado),
              c.iniciada_en ? fecha(c.iniciada_en) : '—',
            ])}
          />
        )}

        <div className="table-footer">
          <span>
            {total === 0 ? 'Sin campañas que mostrar' : `Mostrando ${(pagina - 1) * PAGE_SIZE + 1}–${Math.min(pagina * PAGE_SIZE, total)} de ${total} campañas`}
          </span>
          <div className="pagination">
            <Button small variant="secondary" disabled={pagina <= 1} onClick={() => setPagina(Math.max(1, pagina - 1))}>
              Anterior
            </Button>
            <span aria-live="polite">
              {pagina} / {totalPaginas}
            </span>
            <Button small variant="secondary" disabled={pagina >= totalPaginas} onClick={() => setPagina(Math.min(totalPaginas, pagina + 1))}>
              Siguiente
            </Button>
          </div>
        </div>
      </Card>
    </>
  );
}

function fecha(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' });
}
