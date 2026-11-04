import { ZxcvbnFactory } from '@zxcvbn-ts/core';
import { adjacencyGraphs, dictionary } from '@zxcvbn-ts/language-common';

/**
 * Medidor de contraseñas con zxcvbn (misma estimación que aplica el backend:
 * mín. 10 caracteres y zxcvbn ≥ 3). Las etiquetas y el tiempo de ataque se
 * presentan en español; los feedback detallados de la librería se omiten para
 * no mezclar idioma.
 */

const zxcvbn = new ZxcvbnFactory({ dictionary, graphs: adjacencyGraphs });

/** Mínimo de longitud que exige el backend. */
export const MINIMO_CLAVE = 10;

export interface VeredictoClave {
  /** Nivel zxcvbn 0-4 (-1 si está vacía). */
  score: number;
  etiqueta: 'Muy débil' | 'Débil' | 'Aceptable' | 'Buena' | 'Excelente' | '—';
  /** Clase CSS del medidor (.strength-track): weak | mid | strong. */
  cls: 'weak' | 'mid' | 'strong';
  /** Tiempo estimado de agrietamiento (off-line), formateado en español. */
  tiempo: string;
  /** Cumple la regla de negocio del backend: ≥ 10 caracteres y zxcvbn ≥ 3. */
  valida: boolean;
}

const ETIQUETAS: VeredictoClave['etiqueta'][] = ['Muy débil', 'Débil', 'Aceptable', 'Buena', 'Excelente'];

export function evaluarClave(valor: string): VeredictoClave {
  if (!valor) {
    return { score: -1, etiqueta: '—', cls: 'weak', tiempo: '—', valida: false };
  }
  const r = zxcvbn.check(valor);
  const score = r.score as 0 | 1 | 2 | 3 | 4;
  return {
    score,
    etiqueta: ETIQUETAS[score],
    cls: score <= 1 ? 'weak' : score === 2 ? 'mid' : 'strong',
    tiempo: tiempoAtaque(r.crackTimes.offlineSlowHashingXPerSecond.seconds),
    valida: valor.length >= MINIMO_CLAVE && score >= 3,
  };
}

function tiempoAtaque(segundos: number): string {
  if (!Number.isFinite(segundos) || segundos <= 0) return 'instantáneo';
  if (segundos < 1) return 'instantáneo';
  const min = segundos / 60;
  if (min < 1) return `${Math.round(segundos)} s`;
  const horas = min / 60;
  if (horas < 1) return `${Math.round(min)} min`;
  const dias = horas / 24;
  if (dias < 30) return `${Math.round(dias)} días`;
  const meses = dias / 30;
  if (meses < 12) return `${Math.round(meses)} meses`;
  const anos = dias / 365;
  if (anos < 1000) return `${Math.round(anos)} años`;
  if (anos < 1e9) return 'siglos';
  return 'era geológica';
}
