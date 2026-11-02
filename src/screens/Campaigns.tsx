import { useMemo, useState } from 'react';
import type { Screen } from '../types';
import { campanas, descargarCSV } from '../data';
import type { CampaignRow } from '../data';
import { Badge, Button, Card, DataTable, PageHeader, Select } from '../components/ui';
import { ChannelIcons, Icon } from '../components/ui';

const PAGE_SIZE = 5;
const ESTADOS = ['Todos', 'Activa', 'Finalizada', 'Borrador'] as const;
const GRUPOS = ['Todos los grupos', 'Finanzas Europa', 'Recursos Humanos', 'Soporte y Operaciones', 'Dirección', 'Toda la organización'] as const;

/** Lista de campañas: filtros, buscador, estado, canales, fecha, interacción y paginación reales. */

export function Campaigns({ readonly, setScreen }: { readonly: boolean; setScreen: (s: Screen) => void }) {
  const [estado, setEstado] = useState<string>('Todos');
  const [grupo, setGrupo] = useState<string>(GRUPOS[0]);
  const [busqueda, setBusqueda] = useState('');
  const [pagina, setPagina] = useState(1);

  const filtradas = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    return campanas.filter(
      (c) =>
        (estado === 'Todos' || c.estado === estado) &&
        (grupo === GRUPOS[0] || c.grupo === grupo) &&
        (!q || c.nombre.toLowerCase().includes(q) || c.grupo.toLowerCase().includes(q)),
    );
  }, [estado, grupo, busqueda]);

  const totalPaginas = Math.max(1, Math.ceil(filtradas.length / PAGE_SIZE));
  const paginaActual = Math.min(pagina, totalPaginas);
  const visibles = filtradas.slice((paginaActual - 1) * PAGE_SIZE, paginaActual * PAGE_SIZE);
  const desde = filtradas.length === 0 ? 0 : (paginaActual - 1) * PAGE_SIZE + 1;
  const hasta = Math.min(paginaActual * PAGE_SIZE, filtradas.length);

  const exportar = () => {
    descargarCSV('scytal_campanas.csv', [
      ['Campaña', 'Grupo objetivo', 'Canales', 'Estado', 'Lanzamiento', 'Interacción'],
      ...filtradas.map((c: CampaignRow) => [c.nombre, c.grupo, c.canales, c.estado, c.fecha, c.interaccion]),
    ]);
  };

  return (
    <>
      <PageHeader
        eyebrow="Simulaciones"
        title="Campañas"
        description="Configura y supervisa simulaciones de phishing para tus grupos."
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
      <Card>
        <div className="toolbar">
          <div className="filters">
            <Select
              value={estado}
              onChange={(v) => {
                setEstado(v);
                setPagina(1);
              }}
            >
              {ESTADOS.map((e) => (
                <option key={e}>{e === 'Todos' ? 'Todos los estados' : e}</option>
              ))}
            </Select>
            <Select
              value={grupo}
              onChange={(v) => {
                setGrupo(v);
                setPagina(1);
              }}
            >
              {GRUPOS.map((g) => (
                <option key={g}>{g}</option>
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
                setPagina(1);
              }}
            />
          </div>
          <Button variant="ghost" icon="download" onClick={exportar}>
            CSV
          </Button>
        </div>

        {visibles.length === 0 ? (
          <div className="empty-table">
            <span className="empty-icon">
              <Icon name="target" />
            </span>
            <strong>Sin resultados</strong>
            <p>Ninguna campaña coincide con los filtros aplicados. Ajusta la búsqueda o crea una nueva.</p>
          </div>
        ) : (
          <DataTable
            headers={['Campaña', 'Grupo objetivo', 'Canales', 'Estado', 'Lanzamiento', 'Interacción']}
            rows={visibles.map((c) => [
              <button className="table-link" onClick={() => setScreen('campaign-detail')}>
                {c.nombre}
              </button>,
              c.grupo,
              <ChannelIcons value={c.canales} />,
              c.estado === 'Activa' ? (
                <Badge tone="azul">Activa</Badge>
              ) : c.estado === 'Finalizada' ? (
                <Badge tone="bajo">Finalizada</Badge>
              ) : (
                <Badge>Borrador</Badge>
              ),
              c.fecha,
              <strong>{c.interaccion}</strong>,
            ])}
          />
        )}

        <div className="table-footer">
          <span>
            {filtradas.length === 0
              ? 'Sin campañas que mostrar'
              : `Mostrando ${desde}–${hasta} de ${filtradas.length} campañas`}
          </span>
          <div className="pagination">
            <Button
              small
              variant="secondary"
              disabled={paginaActual <= 1}
              onClick={() => setPagina(Math.max(1, paginaActual - 1))}
            >
              Anterior
            </Button>
            <span aria-live="polite">
              {paginaActual} / {totalPaginas}
            </span>
            <Button
              small
              variant="secondary"
              disabled={paginaActual >= totalPaginas}
              onClick={() => setPagina(Math.min(totalPaginas, paginaActual + 1))}
            >
              Siguiente
            </Button>
          </div>
        </div>
      </Card>
    </>
  );
}
