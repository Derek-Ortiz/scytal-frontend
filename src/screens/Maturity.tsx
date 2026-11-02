import { descargarCSV } from '../data';
import { Badge, Button, Card, DataTable, MiniLine, PageHeader, RiskBadge, SectionTitle } from '../components/ui';

/** Índice de madurez: gauge 0–100, tendencia, ranking por grupo con variaciones. */

export function Maturity() {
  const exportar = () =>
    descargarCSV('scytal_madurez.csv', [
      ['Posición', 'Grupo', 'Miembros', 'Índice', 'Nivel', 'Variación'],
      ['01', 'Finanzas Europa', '124', '38,2', 'Alto', '−2,1'],
      ['02', 'Recursos Humanos', '86', '27,4', 'Medio', '+1,4'],
      ['03', 'Soporte y Operaciones', '213', '22,1', 'Medio', '−5,2'],
      ['04', 'Dirección', '18', '16,8', 'Bajo', '−3,7'],
    ]);

  return (
    <>
      <PageHeader
        eyebrow="Analítica"
        title="Índice de madurez"
        description="Comparativa de riesgo y evolución de Acme Corporation."
        action={
          <Button variant="secondary" icon="download" onClick={exportar}>
            Exportar informe
          </Button>
        }
      />
      <div className="maturity-grid">
        <Card className="gauge-card">
          <SectionTitle title="Índice promedio actual" description="Escala 0–100 · menor es mejor" />
          <div className="gauge">
            <svg viewBox="0 0 220 130">
              <path className="gauge-bg" d="M30 110a80 80 0 0 1 160 0" />
              <path className="gauge-low" d="M30 110a80 80 0 0 1 52-75" />
              <path className="gauge-mid" d="M82 35a80 80 0 0 1 64 8" />
              <path className="gauge-high" d="M146 43a80 80 0 0 1 44 67" />
              <line x1="110" y1="110" x2="75" y2="54" />
              <circle cx="110" cy="110" r="7" />
            </svg>
            <div>
              <strong>31,8</strong>
              <Badge tone="medio">Medio</Badge>
            </div>
          </div>
          <div className="gauge-foot">
            <span>
              Anterior: <strong>36,0</strong>
            </span>
            <span>
              Variación: <strong className="positive">−4,2 pts</strong>
            </span>
          </div>
        </Card>
        <Card>
          <SectionTitle title="Tendencia general" description="Promedio ponderado · últimos 6 meses" />
          <MiniLine />
          <div className="axis-labels">
            <span>Ene</span>
            <span>Feb</span>
            <span>Mar</span>
            <span>Abr</span>
            <span>May</span>
            <span>Jun</span>
          </div>
        </Card>
      </div>
      <Card>
        <SectionTitle title="Ranking por grupo" description="Ordenado de mayor a menor exposición" />
        <DataTable
          headers={['Posición', 'Grupo', 'Miembros', 'Índice', 'Nivel', 'Variación']}
          rows={[
            ['01', 'Finanzas Europa', '124', '38,2', <RiskBadge risk="Alto" />, <span className="positive">−2,1</span>],
            ['02', 'Recursos Humanos', '86', '27,4', <RiskBadge risk="Medio" />, <span className="negative">+1,4</span>],
            ['03', 'Soporte y Operaciones', '213', '22,1', <RiskBadge risk="Medio" />, <span className="positive">−5,2</span>],
            ['04', 'Dirección', '18', '16,8', <RiskBadge risk="Bajo" />, <span className="positive">−3,7</span>],
          ]}
        />
      </Card>
    </>
  );
}
