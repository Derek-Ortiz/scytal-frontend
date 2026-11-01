import { useRef, useState, type ChangeEvent, type KeyboardEvent, type ReactNode } from 'react';
import { Icon } from './icons';

// Re-export para que las pantallas importen Icon junto a los demás componentes
export { Icon };

/** Sistemas de diseño: componentes reutilizables 100% propios (sin librerías externas). */

export function Button({
  children,
  variant = 'primary',
  icon,
  onClick,
  disabled,
  small,
  type = 'button',
}: {
  children?: ReactNode;
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  icon?: string;
  onClick?: () => void;
  disabled?: boolean;
  small?: boolean;
  type?: 'button' | 'submit';
}) {
  return (
    <button type={type} className={`btn btn-${variant}${small ? ' btn-small' : ''}`} onClick={onClick} disabled={disabled}>
      {icon && <Icon name={icon} size={16} />}
      {children}
    </button>
  );
}

export function Input({
  label,
  placeholder,
  type = 'text',
  value,
  defaultValue,
  onChange,
  hint,
  error,
}: {
  label?: string;
  placeholder?: string;
  type?: string;
  value?: string;
  defaultValue?: string;
  onChange?: (v: string) => void;
  hint?: string;
  error?: string;
}) {
  return (
    <label className="field">
      {label && <span className="field-label">{label}</span>}
      <input
        type={type}
        placeholder={placeholder}
        value={value}
        defaultValue={defaultValue}
        onChange={(e: ChangeEvent<HTMLInputElement>) => onChange?.(e.target.value)}
        className={error ? 'input error' : 'input'}
      />
      {(hint || error) && <span className={error ? 'field-error' : 'field-hint'}>{error || hint}</span>}
    </label>
  );
}

export function Select({
  label,
  children,
  value,
  onChange,
}: {
  label?: string;
  children: ReactNode;
  value?: string;
  onChange?: (v: string) => void;
}) {
  return (
    <label className="field">
      {label && <span className="field-label">{label}</span>}
      <select
        className="input select"
        value={value}
        onChange={(e: ChangeEvent<HTMLSelectElement>) => onChange?.(e.target.value)}
      >
        {children}
      </select>
    </label>
  );
}

export function Badge({ children, tone = 'neutral' }: { children: ReactNode; tone?: string }) {
  const cls = tone.toLowerCase().replace('í', 'i');
  return <span className={`badge badge-${cls}`}>{children}</span>;
}

export function RiskBadge({ risk }: { risk: string }) {
  return <Badge tone={risk}>{risk}</Badge>;
}

export function Card({
  children,
  className = '',
  onClick,
}: {
  children: ReactNode;
  className?: string;
  onClick?: () => void;
}) {
  return (
    <section className={`card ${className}`} onClick={onClick}>
      {children}
    </section>
  );
}

export function SectionTitle({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="section-head">
      <div>
        <div className="section-title">{title}</div>
        {description && <div className="section-desc">{description}</div>}
      </div>
      {action}
    </div>
  );
}

export function PageHeader({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="page-head">
      <div>
        {eyebrow && <div className="eyebrow">{eyebrow}</div>}
        <div className="page-title">{title}</div>
        {description && <div className="page-desc">{description}</div>}
      </div>
      {action && <div className="page-actions">{action}</div>}
    </div>
  );
}

export function DataTable({ headers, rows }: { headers: string[]; rows: ReactNode[][] }) {
  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            {headers.map((h) => (
              <th key={h}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i}>
              {row.map((cell, j) => (
                <td key={j}>{cell}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function Logo({ compact = false }: { compact?: boolean }) {
  return (
    <div className="logo">
      <span className="logo-mark">
        <svg viewBox="0 0 30 30" aria-hidden="true">
          <path d="M15 2 26 8v14l-11 6L4 22V8z" />
          <path d="M10 11.5c1.5-3 8.4-3.2 10.2-.3 1.4 2.3-1 3.5-5.2 3.8-4.5.3-6.5 1.8-5 4.2 1.8 2.8 8.4 2.5 10.1-.6" />
        </svg>
      </span>
      {!compact && <span>scytal</span>}
    </div>
  );
}

/* ---------- Composición reutilizada entre pantallas ---------- */

export function Metric({ label, value, trend, tone }: { label: string; value: string; trend: string; tone?: string }) {
  return (
    <Card className="metric">
      <div className="metric-label">{label}</div>
      <div className="metric-row">
        <div className="metric-value">{value}</div>
        {tone && <Badge tone={tone}>{trend}</Badge>}
        {!tone && <Badge>{trend}</Badge>}
      </div>
    </Card>
  );
}

export function MiniLine({ danger = false }: { danger?: boolean }) {
  return (
    <svg className={`line-chart${danger ? ' danger-line' : ''}`} viewBox="0 0 600 180" preserveAspectRatio="none" aria-label="Gráfica de tendencia">
      <g className="grid-lines">
        <path d="M0 25H600M0 75H600M0 125H600M0 175H600" />
      </g>
      <path className="area" d="M0 40 C60 55 80 42 120 68 S190 84 235 78 S300 112 350 100 S430 120 475 130 S550 137 600 148 V180H0Z" />
      <path className="line" d="M0 40 C60 55 80 42 120 68 S190 84 235 78 S300 112 350 100 S430 120 475 130 S550 137 600 148" />
      {[
        ['0', '40'],
        ['110', '62'],
        ['235', '78'],
        ['350', '100'],
        ['475', '130'],
        ['600', '148'],
      ].map(([x, y]) => (
        <circle key={x} cx={x} cy={y} r="4" />
      ))}
    </svg>
  );
}

export function Bars({ compact = false }: { compact?: boolean }) {
  const data: Array<[string, string, number]> = compact
    ? [
        ['Bajo', '42%', 68],
        ['Medio', '29%', 51],
        ['Alto', '19%', 35],
        ['Crítico', '10%', 20],
      ]
    : [
        ['Bajo', '42%', 68],
        ['Medio', '29%', 51],
        ['Alto', '19%', 35],
        ['Crítico', '10%', 20],
      ];
  return (
    <div className="bars">
      {data.map(([label, v, h]) => (
        <div className="bar-col" key={label}>
          <div
            className={`bar bar-${label.toLowerCase().replace('í', 'i')}`}
            style={{ height: `${h}%` }}
          >
            <span>{v}</span>
          </div>
          <div className="bar-label">{label}</div>
        </div>
      ))}
    </div>
  );
}

export function ChannelIcons({ value }: { value: string }) {
  return (
    <div className="channel-icons">
      {value.split(',').map((c) => (
        <span className="channel" key={c} title={c === 'mail' ? 'Correo' : 'Código QR'}>
          <Icon name={c} size={15} />
        </span>
      ))}
    </div>
  );
}

export function EmailPreview({ asunto = 'Actualización de nómina requerida' }: { asunto?: string }) {
  return (
    <div className="email-preview">
      <div className="preview-bar">
        <span></span>
        <span></span>
        <span></span>
      </div>
      <div className="email-meta">
        <strong>{asunto}</strong>
        <span>
          De: Portal Financiero &lt;nomina@portal-acme.com&gt;
        </span>
      </div>
      <div className="email-body">
        <div className="fake-logo">
          ACME <b>Finance</b>
        </div>
        <p>Hola,</p>
        <p>Hemos actualizado nuestro portal de nómina. Para mantener el acceso, revisa tus datos antes del viernes.</p>
        <div className="fake-button">Revisar mis datos</div>
        <small>Este mensaje fue enviado automáticamente.</small>
      </div>
    </div>
  );
}

/** Código OTP de 6 dígitos con avance automático.
 *  Puede usarse controlado (`value` + `onChange` con la cadena de 6 dígitos)
 *  para los flujos reales del backend, o sin props para maquetas. */
export function Otp({ value, onChange }: { value?: string; onChange?: (codigo: string) => void }) {
  const refs = useRef<Array<HTMLInputElement | null>>([]);
  const [local, setLocal] = useState<string[]>(['4', '5', '6', '', '', '']);

  const controlado = value !== undefined && onChange !== undefined;
  const digitos: string[] = controlado
    ? Array.from({ length: 6 }, (_, i) => value?.[i] ?? '')
    : local;

  const aplicar = (nuevos: string[]) => {
    if (controlado) onChange?.(nuevos.join(''));
    else setLocal(nuevos);
  };

  const setDigit = (i: number, raw: string) => {
    const clean = raw.replace(/[^0-9]/g, '').slice(-1);
    const next = [...digitos];
    next[i] = clean;
    aplicar(next);
    if (clean && i < 5) refs.current[i + 1]?.focus();
  };

  const onKey = (i: number, e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !digitos[i] && i > 0) refs.current[i - 1]?.focus();
  };

  return (
    <div className="otp">
      {digitos.map((d, i) => (
        <input
          key={i}
          ref={(el) => {
            refs.current[i] = el;
          }}
          inputMode="numeric"
          maxLength={1}
          aria-label={`Dígito ${i + 1}`}
          value={d}
          onChange={(e) => setDigit(i, e.target.value)}
          onKeyDown={(e) => onKey(i, e)}
        />
      ))}
    </div>
  );
}

/** QR_SR simulado determinista (regenerable cambiando `variant`). */
export function QrPattern({ variant = 0 }: { variant?: number }) {
  const size = 21;
  const bit = (x: number, y: number) => {
    const finder =
      (x < 7 && y < 7) || (x > size - 8 && y < 7) || (x < 7 && y > size - 8);
    if (finder) {
      const lx = x < 7 ? x : x - (size - 7);
      const ly = y < 7 ? y : y - (size - 7);
      return lx === 0 || lx === 6 || ly === 0 || ly === 6 || (lx >= 2 && lx <= 4 && ly >= 2 && ly <= 4);
    }
    const h = ((x + 1) * 73856093) ^ ((y + 1) * 19349663) ^ ((variant + 1) * 15771589);
    return (((h >>> 9) ^ (h >>> 13)) & 1) === 1;
  };
  const cells: Array<[number, number]> = [];
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) if (bit(x, y)) cells.push([x, y]);
  return (
    <svg viewBox="0 0 21 21" aria-hidden="true">
      <rect width="21" height="21" fill="white" />
      {cells.map(([x, y]) => (
        <rect key={`${x}-${y}`} x={x} y={y} width="1" height="1" fill="currentColor" />
      ))}
    </svg>
  );
}
