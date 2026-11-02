import { useMemo, useState } from 'react';
import type { Screen } from '../types';
import { plantillas } from '../data';
import { Badge, Button, Card, Icon, PageHeader } from '../components/ui';

const CATEGORIAS = ['Todas', 'Finanzas', 'RRHH', 'Soporte', 'General'] as const;

/** Biblioteca de plantillas con filtros por categoría. */

export function Templates({ readonly, setScreen }: { readonly: boolean; setScreen: (s: Screen) => void }) {
  const [cat, setCat] = useState<(typeof CATEGORIAS)[number]>('Todas');

  const listado = useMemo(
    () => plantillas.filter((t) => cat === 'Todas' || t.categoria === cat),
    [cat],
  );

  return (
    <>
      <PageHeader
        eyebrow="Contenido"
        title="Plantillas de phishing"
        description="Mensajes controlados adaptados al contexto de cada perfil."
        action={
          !readonly ? (
            <Button icon="plus" onClick={() => setScreen('template-edit')}>
              Nueva plantilla
            </Button>
          ) : (
            <Badge>Modo solo lectura</Badge>
          )
        }
      />
      <div className="filter-tabs">
        {CATEGORIAS.map((c) => {
          const n = c === 'Todas' ? plantillas.length : plantillas.filter((t) => t.categoria === c).length;
          return (
            <button key={c} className={cat === c ? 'active' : ''} onClick={() => setCat(c)}>
              {c} <span>{n}</span>
            </button>
          );
        })}
      </div>
      <div className="template-grid">
        {listado.map((t) => (
          <Card className="template-card" key={t.id}>
            <div className="template-thumb">
              <div className="mini-mail">
                <span></span>
                <span></span>
                <b></b>
                <i></i>
              </div>
              <span className="channel-float">
                <Icon name={t.canal} size={15} />
              </span>
            </div>
            <div className="template-info">
              <Badge>{t.categoria}</Badge>
              <strong>{t.nombre}</strong>
              <span>
                {t.descripcion}
                <br />
                {t.canal === 'mail' ? 'Correo' : 'Código QR'} · actualizada {t.actualizada.toLowerCase()}
              </span>
              <Button small variant="secondary" onClick={() => setScreen('template-edit')}>
                {readonly ? 'Ver plantilla' : 'Editar plantilla'}
              </Button>
            </div>
          </Card>
        ))}
      </div>
      {listado.length === 0 && (
        <Card>
          <div className="empty-table">
            <span className="empty-icon">
              <Icon name="file" />
            </span>
            <strong>Sin plantillas en esta categoría</strong>
            <p>No hay contenido que coincida con el filtro seleccionado.</p>
          </div>
        </Card>
      )}
    </>
  );
}
