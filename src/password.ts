import { useEffect, useRef, useState } from 'react';
import { ZxcvbnFactory } from '@zxcvbn-ts/core';
import { adjacencyGraphs, dictionary } from '@zxcvbn-ts/language-common';
import { ApiError, chequearFortalezaClave } from './api';


const zxcvbn = new ZxcvbnFactory({ dictionary, graphs: adjacencyGraphs });

export const MINIMO_CLAVE = 10;

export interface VeredictoClave {
  score: number;
  etiqueta: 'Muy débil' | 'Débil' | 'Aceptable' | 'Buena' | 'Excelente' | '—';
  cls: 'weak' | 'mid' | 'strong';
  tiempo: string;
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


export interface FortalezaServidor {
  score: number | null;
  errores: string[];
  aviso: string | null;
}

const INTERVALO_MS = 700;
const ESPERA_MINIMA_MS = 6500;

export function useFortalezaServidor(clave: string, activo = true): FortalezaServidor {
  const [resultado, setResultado] = useState<FortalezaServidor>({ score: null, errores: [], aviso: null });
  const ultimo = useRef(0);
  const espera = useRef<number | null>(null);

  useEffect(() => {
    if (espera.current !== null) {
      window.clearTimeout(espera.current);
      espera.current = null;
    }

    if (!activo || clave.length < 8) {
      setResultado({ score: null, errores: [], aviso: null });
      return;
    }

    const consultar = async () => {
      const retraso = ESPERA_MINIMA_MS - (Date.now() - ultimo.current);
      if (retraso > 0) {
        espera.current = window.setTimeout(() => void consultar(), retraso);
        return;
      }
      ultimo.current = Date.now();
      try {
        const r = await chequearFortalezaClave(clave);
        setResultado({ score: r.score, errores: r.errores, aviso: null });
      } catch (e) {
        if (e instanceof ApiError && e.status === 429) {
          setResultado({
            score: null,
            errores: [],
            aviso: `Límite de consultas alcanzado: espera ${e.retryAfter ?? 60} s y sigue escribiendo.`,
          });
        } else if (e instanceof ApiError && e.code === 'HIBP_UNAVAILABLE') {
          setResultado({
            score: null,
            errores: [],
            aviso: 'El servicio de filtraciones no responde (aviso transitorio); el servidor valida igual al enviar.',
          });
        }
      }
    };

    espera.current = window.setTimeout(() => void consultar(), INTERVALO_MS);
    return () => {
      if (espera.current !== null) window.clearTimeout(espera.current);
    };
  }, [clave, activo]);

  return resultado;
}
