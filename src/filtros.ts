/**
 * Listas blancas de entrada (defensa en profundidad contra inyecciones).
 * Cada solo carácter que no pertenece a la lista del campo se descarta
 * mientras se escribe o se pega; lo que llegue a la API queda restringido
 * a valores inocuos (el backend, además, valida y parametriza por su lado).
 *
 * Nunca se admiten: `" ' ` ; / \ < > $ % = | { } [ ] :` ni saltos de línea,
 * espacios tabuladores (según campo) ni códigos de control.
 */

/** Letras latinas con acentos y eñe (mayúsculas y minúsculas). */
const LETRAS = 'A-Za-z0-9áéíóúüñÁÉÍÓÚÜÑ';

/** Correo: letras (con acentos), números y `@ . _ - +`. Sin espacios. */
export function filtrarCorreo(valor: string): string {
  return valor.replace(new RegExp(`[^${LETRAS}@._+\\-]`, 'g'), '');
}

/** Texto libre (p. ej. organización): añade espacio y `- _ . , ( ) &`. */
export function filtrarTexto(valor: string): string {
  return valor.replace(new RegExp(`[^${LETRAS} .,\\-_()&]`, 'g'), '');
}

/** Contraseña: letras (con acentos), números y `- _ . ! ? ¡ ¿ * ~`. Sin espacios. */
export function filtrarClave(valor: string): string {
  return valor.replace(new RegExp(`[^${LETRAS}.\\-!?¡¿*_~]`, 'g'), '');
}

/** Texto para las pistas de cada campo. */
export const AVISO = {
  correo: 'Solo letras (á–ñ), números y @ . _ + -',
  texto: 'Letras (á–ñ), números, espacios y - _ . , ( ) &',
  clave: 'Letras (á–ñ), números y . - _ ! ? ¡ ¿ * ~',
};
