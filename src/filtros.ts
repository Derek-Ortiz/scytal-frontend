
const LETRAS = 'A-Za-z0-9áéíóúüñÁÉÍÓÚÜÑ';

export function filtrarCorreo(valor: string): string {
  return valor.replace(new RegExp(`[^${LETRAS}@._+\\-]`, 'g'), '');
}

export function filtrarTexto(valor: string): string {
  return valor.replace(new RegExp(`[^${LETRAS} .,\\-_()&]`, 'g'), '');
}

export function filtrarClave(valor: string): string {
  return valor.replace(new RegExp(`[^${LETRAS}.\\-!?¡¿*_~]`, 'g'), '');
}

export const AVISO = {
  correo: 'Solo letras (á–ñ), números y @ . _ + -',
  texto: 'Letras (á–ñ), números, espacios y - _ . , ( ) &',
  clave: 'Letras (á–ñ), números y . - _ ! ? ¡ ¿ * ~',
};
