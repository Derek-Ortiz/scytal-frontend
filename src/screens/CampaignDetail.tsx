import { useMemo, useState } from 'react';
import { resultadoCampana, descargarCSV } from '../data';
import { Badge, Button, Card, DataTable, Icon, PageHeader, RiskBadge, SectionTitle } from '../components/ui';

const FUNNEL: Array<[string, string, string]> = [
  ['Enviados', '124', '100%'],
  ['Abiertos', '98', '79,0%'],
  ['Clics', '47', '37,9%'],
  ['Datos enviados', '18', '14,5%'],
];
const FUNNEL_ICONS = ['mail', 'eye', 'target', 'alert'] as const;

/** Detalle de campaña: embudo de interacción, resultados por destinatario y cierre de campaña. */

export function CampaignDetail({ readonly }: { readonly: boolean }) {
  const [confirming, setConfirming] = useState(false);
  const [finished, setFinished] = useState(false);
  const [busqueda, setBusqueda] = useState('');

  const filas = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    return resultadoCampana.filter((r) => !q || r.nombre.toLowerCase().includes(q) || r.correo.toLowerCase().includes(q));
  }, [busqueda]);

  const exportar = () => {
    descargarCSV('scytal_resultados_nomina_q2.csv', [
      ['Destinatario', 'Correo', 'Abrió', 'Clic', 'Envió datos', 'Riesgo'],
      ...filas.map((r) => [r.nombre, r.correo, r.abrio, r.clic, r.datos, r.riesgo]),
    ]);
  };

  return (
    <>
      <PageHeader
        eyebrow="Campañas / Resultados"
        title="Q2 · Actualización de nómina"
        description="Finanzas Europa · Lanzada el 12 jun 2025 a las 09:00"
        action={
          !readonly && !finished ? (
            <Button variant="danger" onClick={() => setConfirming(true)}>
              Finalizar y enviar feedback
            </Button>
          ) : readonly ? (
            <Badge>Modo solo lectura</Badge>
          ) : undefined
        }
      />

      {finished && (
        <div className="success-banner">
          <Icon name="check" />
          <div>
            <strong>Campaña finalizada y feedback enviado</strong>
            <p>124 destinatarios recibieron material educativo el 18 jun 2025 a las 16:42.</p>
          </div>
        </div>
      )}

      {confirming && !finished && (
        <>
          <div className="warning-box">
            <Icon name="alert" />
            <div>
              <strong>¿Confirmas finalizar la campaña?</strong>
              <p>
                Se detendrá la simulación y se enviará material educativo al grupo objetivo. Esta acción no
                puede deshacerse y quedará registrada en la bitácora.
              </p>
            </div>
          </div>
          <div className="inline-actions">
            <Button variant="ghost" onClick={() => setConfirming(false)}>
              Cancelar
            </Button>
            <Button
              variant="danger"
              onClick={() => {
                setConfirming(false);
                setFinished(true);
              }}
            >
              Sí, finalizar campaña
            </Button>
          </div>
        </>
      )}

      <Card className="funnel-card">
        <SectionTitle title="Embudo de interacción" description="Progreso acumulado en tiempo real" />
        <div className="funnel">
          {FUNNEL.map(([label, value, pct], i) => (
            <div className="funnel-step" key={label}>
              <div className={`funnel-icon f${i}`}>
                <Icon name={FUNNEL_ICONS[i]} />
              </div>
              <span>{label}</span>
              <strong>{value}</strong>
              <small>{pct}</small>
              {i < 3 && <Icon name="arrow" />}
            </div>
          ))}
        </div>
      </Card>

      <Card>
        <SectionTitle
          title="Resultados por destinatario"
          description={`${filas.length} destinatarios · ordenados por índice resultante`}
          action={
            <div className="table-head-actions">
              <div className="search">
                <Icon name="search" size={15} />
                <input placeholder="Buscar…" value={busqueda} onChange={(e) => setBusqueda(e.target.value)} />
              </div>
              <Button small variant="ghost" icon="download" onClick={exportar}>
                CSV
              </Button>
            </div>
          }
        />
        <DataTable
          headers={['Destinatario', 'Correo', 'Abrió', 'Clic', 'Envió datos', 'Riesgo']}
          rows={filas.map((r) => [<strong>{r.nombre}</strong>, r.correo, r.abrio, r.clic, r.datos, <RiskBadge risk={r.riesgo} />])}
        />
      </Card>
    </>
  );
}
