import type { Risk, Role } from './types';

/**
 * Modelo de datos simulado de Scytal mientras no exista backend.
 * Todas las pantallas consumen estos mismos datos para mantener coherencia.
 */

export interface AlertItem {
  id: number;
  tipo: string;
  contexto: string;
  severidad: Risk;
  fecha: string;
  estado: 'Pendiente' | 'Resuelta';
}

export interface AuditRow {
  evento: string;
  actor: string;
  ip: string;
  fecha: string;
  resultado: 'Correcto' | 'Bloqueado';
}

export interface CampaignRow {
  id: number;
  nombre: string;
  grupo: string;
  canales: 'mail' | 'qr' | 'mail,qr';
  estado: 'Activa' | 'Finalizada' | 'Borrador';
  fecha: string;
  interaccion: string;
}

export interface RecipientRow {
  id: number;
  nombre: string;
  correo: string;
  cargo: string;
  indice: string;
  riesgo: Risk;
  ultimaCampana: string;
  ultimaActividad: string;
}

export interface GroupRow {
  nombre: string;
  miembros: string;
  indice: string;
  riesgo: Risk;
  destinatarios: RecipientRow[];
}

export interface CampaignRecipientRow {
  nombre: string;
  correo: string;
  abrio: string;
  clic: string;
  datos: string;
  riesgo: Risk;
}

export interface TemplateRow {
  id: number;
  nombre: string;
  categoria: 'Finanzas' | 'RRHH' | 'Soporte' | 'General';
  canal: 'mail' | 'qr';
  actualizada: string;
  descripcion: string;
}

export interface UserRow {
  nombre: string;
  correo: string;
  rol: Role;
  ultimoAcceso: string;
  estado: 'Activo' | 'Invitado';
}

/** Alertas iniciales; el estado vive en App para que badge, dashboard y alertas coincidan. */
export const alertasIniciales: AlertItem[] = [
  { id: 1, tipo: 'Contraseña filtrada detectada', contexto: 'Cuenta · lmendez@acme.es', severidad: 'Crítico', fecha: 'Hace 12 min', estado: 'Pendiente' },
  { id: 2, tipo: 'Destinatario en riesgo crítico', contexto: 'Campaña · Nómina Q2', severidad: 'Alto', fecha: 'Hace 48 min', estado: 'Pendiente' },
  { id: 3, tipo: 'Intentos fallidos de login', contexto: 'IP 185.91.24.18 · 8 intentos', severidad: 'Medio', fecha: 'Hoy, 08:16', estado: 'Resuelta' },
  { id: 4, tipo: 'Nueva cuenta administrativa', contexto: 'Creada por Ana Silva', severidad: 'Bajo', fecha: 'Ayer, 17:42', estado: 'Resuelta' },
];

/** Bitácora de auditoría inmutable. */
export const auditLog: AuditRow[] = [
  { evento: 'Campaña finalizada', actor: 'Ana Silva · org_admin', ip: '192.168.4.21', fecha: '18 jun 2025 · 16:42', resultado: 'Correcto' },
  { evento: 'Inicio de sesión', actor: 'Diego Muñoz · analyst', ip: '192.168.4.38', fecha: '18 jun 2025 · 15:18', resultado: 'Correcto' },
  { evento: 'Cambio de contraseña', actor: 'Ana Silva · org_admin', ip: '192.168.4.21', fecha: '18 jun 2025 · 12:03', resultado: 'Correcto' },
  { evento: 'Intento de login', actor: 'lmendez@acme.es', ip: '185.91.24.18', fecha: '18 jun 2025 · 08:16', resultado: 'Bloqueado' },
  { evento: 'Importación de destinatarios', actor: 'Ana Silva · org_admin', ip: '192.168.4.21', fecha: '17 jun 2025 · 11:54', resultado: 'Correcto' },
  { evento: 'Plantilla editada', actor: 'Ana Silva · org_admin', ip: '192.168.4.21', fecha: '16 jun 2025 · 09:07', resultado: 'Correcto' },
];

/** Campañas — 15 filas para demostrar paginación real (5 por página). */
export const campanas: CampaignRow[] = [
  { id: 1, nombre: 'Q2 · Actualización de nómina', grupo: 'Finanzas Europa', canales: 'mail,qr', estado: 'Activa', fecha: '12 jun 2025', interaccion: '38,4%' },
  { id: 2, nombre: 'Portal de beneficios 2025', grupo: 'Recursos Humanos', canales: 'mail', estado: 'Finalizada', fecha: '28 may 2025', interaccion: '21,7%' },
  { id: 3, nombre: 'Restablecimiento VPN', grupo: 'Soporte y Operaciones', canales: 'mail,qr', estado: 'Finalizada', fecha: '09 may 2025', interaccion: '46,2%' },
  { id: 4, nombre: 'Factura pendiente de proveedor', grupo: 'Finanzas Europa', canales: 'mail', estado: 'Borrador', fecha: '—', interaccion: '—' },
  { id: 5, nombre: 'Nueva política de acceso', grupo: 'Toda la organización', canales: 'mail,qr', estado: 'Finalizada', fecha: '18 abr 2025', interaccion: '17,9%' },
  { id: 6, nombre: 'Actualización de contraseñas · Q3', grupo: 'Toda la organización', canales: 'mail', estado: 'Activa', fecha: '24 jun 2025', interaccion: '29,1%' },
  { id: 7, nombre: 'Portal de RRHH duplicado', grupo: 'Recursos Humanos', canales: 'qr', estado: 'Activa', fecha: '26 jun 2025', interaccion: '24,8%' },
  { id: 8, nombre: 'Confirmación de paquetería', grupo: 'Soporte y Operaciones', canales: 'mail', estado: 'Finalizada', fecha: '30 abr 2025', interaccion: '33,5%' },
  { id: 9, nombre: 'Auditoría fiscal urgente', grupo: 'Finanzas Europa', canales: 'mail', estado: 'Finalizada', fecha: '15 mar 2025', interaccion: '51,3%' },
  { id: 10, nombre: 'Nuevos horarios 2025', grupo: 'Recursos Humanos', canales: 'mail,qr', estado: 'Finalizada', fecha: '02 mar 2025', interaccion: '15,4%' },
  { id: 11, nombre: 'Actualización del antivirus', grupo: 'Soporte y Operaciones', canales: 'mail', estado: 'Activa', fecha: '01 jul 2025', interaccion: '27,6%' },
  { id: 12, nombre: 'Bono de vacaciones pendiente', grupo: 'Toda la organización', canales: 'mail', estado: 'Borrador', fecha: '—', interaccion: '—' },
  { id: 13, nombre: 'Solicitud de reembolso', grupo: 'Finanzas Europa', canales: 'mail', estado: 'Finalizada', fecha: '21 feb 2025', interaccion: '61,9%' },
  { id: 14, nombre: 'Encuesta de clima laboral', grupo: 'Recursos Humanos', canales: 'mail', estado: 'Finalizada', fecha: '12 feb 2025', interaccion: '19,3%' },
  { id: 15, nombre: 'Nómina de diciembre ajustada', grupo: 'Finanzas Europa', canales: 'mail,qr', estado: 'Finalizada', fecha: '28 ene 2025', interaccion: '35,2%' },
];

/** Resultados por destinatario de la campaña "Q2 · Actualización de nómina". */
export const resultadoCampana: CampaignRecipientRow[] = [
  { nombre: 'Lucía Martín', correo: 'lucia.martin@acme.es', abrio: 'Sí · 09:42', clic: 'Sí · 09:44', datos: 'Sí · 09:45', riesgo: 'Crítico' },
  { nombre: 'Carlos Mena', correo: 'carlos.mena@acme.es', abrio: 'Sí · 10:13', clic: 'Sí · 10:16', datos: 'No', riesgo: 'Alto' },
  { nombre: 'Nadia Ruiz', correo: 'nadia.ruiz@acme.es', abrio: 'Sí · 11:08', clic: 'No', datos: 'No', riesgo: 'Medio' },
  { nombre: 'Tomás Vidal', correo: 'tomas.vidal@acme.es', abrio: 'No', clic: 'No', datos: 'No', riesgo: 'Bajo' },
  { nombre: 'Elena Costa', correo: 'elena.costa@acme.es', abrio: 'Sí · 14:31', clic: 'No', datos: 'No', riesgo: 'Medio' },
  { nombre: 'Iván Torres', correo: 'ivan.torres@acme.es', abrio: 'Sí · 16:02', clic: 'Sí · 16:07', datos: 'No', riesgo: 'Alto' },
];

/** Grupos con sus destinatarios; alimenta la vista Grupos y el perfil individual. */
export const grupos: GroupRow[] = [
  {
    nombre: 'Finanzas Europa',
    miembros: '124',
    indice: '38,2',
    riesgo: 'Alto',
    destinatarios: [
      { id: 101, nombre: 'Lucía Martín', correo: 'lucia.martin@acme.es', cargo: 'Analista financiera', indice: '72,4', riesgo: 'Crítico', ultimaCampana: 'Nómina Q2', ultimaActividad: '12 jun 2025' },
      { id: 102, nombre: 'Carlos Mena', correo: 'carlos.mena@acme.es', cargo: 'Tesorería', indice: '64,1', riesgo: 'Alto', ultimaCampana: 'Nómina Q2', ultimaActividad: '12 jun 2025' },
      { id: 103, nombre: 'Nadia Ruiz', correo: 'nadia.ruiz@acme.es', cargo: 'Contabilidad', indice: '48,9', riesgo: 'Medio', ultimaCampana: 'Factura vencida', ultimaActividad: '28 may 2025' },
      { id: 104, nombre: 'Tomás Vidal', correo: 'tomas.vidal@acme.es', cargo: 'Finanzas', indice: '21,3', riesgo: 'Bajo', ultimaCampana: 'Nómina Q2', ultimaActividad: '12 jun 2025' },
      { id: 105, nombre: 'Elena Costa', correo: 'elena.costa@acme.es', cargo: 'Compras', indice: '41,7', riesgo: 'Medio', ultimaCampana: 'Factura vencida', ultimaActividad: '28 may 2025' },
    ],
  },
  {
    nombre: 'Recursos Humanos',
    miembros: '86',
    indice: '27,4',
    riesgo: 'Medio',
    destinatarios: [
      { id: 201, nombre: 'Marta León', correo: 'marta.leon@acme.es', cargo: 'RRHH', indice: '52,5', riesgo: 'Medio', ultimaCampana: 'Beneficios 2025', ultimaActividad: '28 may 2025' },
      { id: 202, nombre: 'Iván Torres', correo: 'ivan.torres@acme.es', cargo: 'RRHH', indice: '59,2', riesgo: 'Alto', ultimaCampana: 'Beneficios 2025', ultimaActividad: '28 may 2025' },
      { id: 203, nombre: 'Sofía Blanco', correo: 'sofia.blanco@acme.es', cargo: 'RRHH', indice: '24,1', riesgo: 'Bajo', ultimaCampana: 'Clima laboral', ultimaActividad: '12 feb 2025' },
      { id: 204, nombre: 'Hugo Peralta', correo: 'hugo.peralta@acme.es', cargo: 'Reclutamiento', indice: '33,8', riesgo: 'Medio', ultimaCampana: 'Beneficios 2025', ultimaActividad: '28 may 2025' },
    ],
  },
  {
    nombre: 'Soporte y Operaciones',
    miembros: '213',
    indice: '22,1',
    riesgo: 'Medio',
    destinatarios: [
      { id: 301, nombre: 'Claudio Reyes', correo: 'claudio.reyes@acme.es', cargo: 'Operaciones', indice: '44,6', riesgo: 'Medio', ultimaCampana: 'Restablecimiento VPN', ultimaActividad: '09 may 2025' },
      { id: 302, nombre: 'Julia Serrano', correo: 'julia.serrano@acme.es', cargo: 'Soporte TI', indice: '18,2', riesgo: 'Bajo', ultimaCampana: 'Restablecimiento VPN', ultimaActividad: '09 may 2025' },
      { id: 303, nombre: 'Alfredo Lima', correo: 'alfredo.lima@acme.es', cargo: 'Operaciones', indice: '31,5', riesgo: 'Medio', ultimaCampana: 'Paquetería', ultimaActividad: '30 abr 2025' },
      { id: 304, nombre: 'Berta Ocaña', correo: 'berta.ocana@acme.es', cargo: 'Soporte TI', indice: '12,9', riesgo: 'Bajo', ultimaCampana: 'Restablecimiento VPN', ultimaActividad: '09 may 2025' },
    ],
  },
  {
    nombre: 'Dirección',
    miembros: '18',
    indice: '16,8',
    riesgo: 'Bajo',
    destinatarios: [
      { id: 401, nombre: 'Sara Otero', correo: 'sara.otero@acme.es', cargo: 'Dirección general', indice: '26,7', riesgo: 'Medio', ultimaCampana: 'Política de acceso', ultimaActividad: '18 abr 2025' },
      { id: 402, nombre: 'Marcos Peña', correo: 'marcos.pena@acme.es', cargo: 'Dirección', indice: '9,8', riesgo: 'Bajo', ultimaCampana: 'Política de acceso', ultimaActividad: '18 abr 2025' },
      { id: 403, nombre: 'Inés Roldán', correo: 'ines.roldan@acme.es', cargo: 'Dirección', indice: '14,5', riesgo: 'Bajo', ultimaCampana: 'Política de acceso', ultimaActividad: '18 abr 2025' },
    ],
  },
];

/** Biblioteca de plantillas. */
export const plantillas: TemplateRow[] = [
  { id: 1, nombre: 'Actualización de nómina', categoria: 'Finanzas', canal: 'mail', actualizada: 'Hace 2 días', descripcion: 'Portal de nómina con revisión de datos pendiente.' },
  { id: 2, nombre: 'Factura vencida', categoria: 'Finanzas', canal: 'mail', actualizada: 'Hace 4 días', descripcion: 'Aviso de impago con adjunto simulado.' },
  { id: 3, nombre: 'Nuevo portal de beneficios', categoria: 'RRHH', canal: 'qr', actualizada: 'Hace 6 días', descripcion: 'Landing externa verificada por código QR.' },
  { id: 4, nombre: 'Restablecimiento de VPN', categoria: 'Soporte', canal: 'mail', actualizada: 'Hace 8 días', descripcion: 'Solicitud de credenciales de acceso remoto.' },
  { id: 5, nombre: 'Paquete pendiente de entrega', categoria: 'General', canal: 'qr', actualizada: 'Hace 10 días', descripcion: 'Etiqueta de envío con código QR rastreable.' },
  { id: 6, nombre: 'Documento compartido en Drive', categoria: 'General', canal: 'mail', actualizada: 'Hace 12 días', descripcion: 'Enlace a documento interno con permisos.' },
];

/** Historial individual reutilizado por el perfil de cada destinatario (demo). */
export const historialDemo: Array<{ fecha: string; campana: string; accion: string; riesgo: Risk }> = [
  { fecha: '12 jun 2025', campana: 'Q2 · Actualización de nómina', accion: 'Envió datos', riesgo: 'Crítico' },
  { fecha: '09 may 2025', campana: 'Restablecimiento VPN', accion: 'Hizo clic', riesgo: 'Alto' },
  { fecha: '18 abr 2025', campana: 'Nueva política de acceso', accion: 'Solo abrió', riesgo: 'Medio' },
  { fecha: '04 mar 2025', campana: 'Factura vencida', accion: 'Sin interacción', riesgo: 'Bajo' },
];

/** Usuarios de la organización para Configuración → Usuarios. */
export const usuariosIniciales: UserRow[] = [
  { nombre: 'Ana Silva', correo: 'ana.silva@acme.es', rol: 'org_admin', ultimoAcceso: 'Ahora', estado: 'Activo' },
  { nombre: 'Diego Muñoz', correo: 'diego.munoz@acme.es', rol: 'analyst', ultimoAcceso: 'Hoy, 15:18', estado: 'Activo' },
  { nombre: 'Marta León', correo: 'marta.leon@acme.es', rol: 'analyst', ultimoAcceso: 'Ayer, 09:31', estado: 'Activo' },
];

/** Descarga real de un CSV (utilidad usada por dashboard, campañas, reportes y auditoría). */
export function descargarCSV(nombre: string, filas: Array<Array<string | number>>): void {
  const csv = filas.map((f) => f.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(';')).join('\n');
  const blob = new Blob([`\ufeff${csv}`], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = nombre;
  a.click();
  URL.revokeObjectURL(url);
}
