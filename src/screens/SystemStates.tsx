import type { Screen, SystemStateMode } from '../types';
import { Button, Card, Icon, PageHeader, SectionTitle } from '../components/ui';

/** Estados del sistema: variantes de vacío y de carga mostradas como catálogo navegable. */

export function SystemStates({
  mode,
  setMode,
  setScreen,
}: {
  mode: SystemStateMode;
  setMode: (m: SystemStateMode) => void;
  setScreen: (s: Screen) => void;
}) {
  return (
    <>
      <PageHeader
        eyebrow="Variantes del sistema"
        title={mode === 'loading' ? 'Estados de carga' : 'Estados vacíos'}
        description={
          mode === 'loading'
            ? 'Skeletons para métricas, gráficas y tablas mientras llegan los datos.'
            : 'Aspecto de la aplicación antes de lanzar la primera campaña.'
        }
      />
      <div className="filter-tabs">
        <button className={mode === 'empty' ? 'active' : ''} onClick={() => setMode('empty')}>
          Estados vacíos
        </button>
        <button className={mode === 'loading' ? 'active' : ''} onClick={() => setMode('loading')}>
          Estados de carga
        </button>
      </div>

      {mode === 'loading' ? (
        <>
          {['metric', 'chart', 'table'].map((type) => (
            <Card className={`skeleton skeleton-${type}`} key={type}>
              <div className="sk-line w30"></div>
              <div className="sk-line w50"></div>
              <div className="sk-content">
                {Array.from({ length: type === 'table' ? 5 : 3 }, (_, i) => (
                  <div className="sk-line" key={i}></div>
                ))}
              </div>
            </Card>
          ))}
        </>
      ) : (
        <div className="empty-grid">
          <Card className="empty-card">
            <span className="empty-icon">
              <Icon name="chart" />
            </span>
            <div className="section-title">Aún no hay datos para analizar</div>
            <p>Lanza tu primera campaña para empezar a medir el índice de susceptibilidad de la organización.</p>
            <Button icon="plus" onClick={() => setScreen('campaign-new')}>
              Crear primera campaña
            </Button>
          </Card>
          <Card>
            <SectionTitle title="Campañas" description="0 campañas" />
            <div className="empty-table">
              <span className="empty-icon">
                <Icon name="target" />
              </span>
              <strong>No hay campañas</strong>
              <p>Las campañas creadas aparecerán aquí con sus resultados.</p>
              <Button variant="secondary" onClick={() => setScreen('campaign-new')}>
                Configurar campaña
              </Button>
            </div>
          </Card>
        </div>
      )}
    </>
  );
}
