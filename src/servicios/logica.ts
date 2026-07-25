/**
 * Custovia — Lógica pura de la Fase 4 (vinculación y alertas).
 *
 * Todo lo que se puede calcular sin red ni teléfono vive aquí, para poder
 * probarlo con tests (npm test). Las llamadas reales a Supabase y a las
 * notificaciones están en los otros archivos de esta carpeta.
 */

import { EstadoAnalisis } from '../brain/analizador';
import { VeredictoIA } from '../brain/ia';

// ─── Código de vinculación ──────────────────────────────────────────────

/**
 * Alfabeto sin caracteres confundibles (sin 0/O, 1/I/L) — pensado para que
 * un adulto mayor pueda dictarlo por teléfono sin errores.
 */
const ALFABETO_CODIGO = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
export const LARGO_CODIGO = 6;

export function generarCodigo(): string {
  let codigo = '';
  for (let i = 0; i < LARGO_CODIGO; i++) {
    codigo += ALFABETO_CODIGO[Math.floor(Math.random() * ALFABETO_CODIGO.length)];
  }
  return codigo;
}

/** Limpia lo que escribió el familiar: espacios, guiones, minúsculas. */
export function normalizarCodigo(texto: string): string {
  return texto.toUpperCase().replace(/[\s-]/g, '').trim();
}

export function codigoValido(texto: string): boolean {
  return new RegExp(`^[${ALFABETO_CODIGO}]{${LARGO_CODIGO}}$`).test(normalizarCodigo(texto));
}

// ─── Configuración de la alarma del familiar ────────────────────────────

export type NombreSonido = 'clasica' | 'sirena' | 'campana';

export interface ConfigAlarma {
  sonido: NombreSonido;
  /** 0.0 a 1.0 (en la interfaz se elige bajo / medio / fuerte). */
  volumen: number;
  vibrar: boolean;
}

export const CONFIG_ALARMA_DEFECTO: ConfigAlarma = {
  sonido: 'clasica',
  volumen: 1.0,
  vibrar: true,
};

/** Mezcla una config guardada (posiblemente parcial o antigua) con los valores por defecto. */
export function completarConfigAlarma(parcial: unknown): ConfigAlarma {
  const p = (parcial ?? {}) as Partial<ConfigAlarma>;
  return {
    sonido: p.sonido === 'sirena' || p.sonido === 'campana' ? p.sonido : 'clasica',
    volumen:
      typeof p.volumen === 'number' && p.volumen >= 0 && p.volumen <= 1
        ? p.volumen
        : CONFIG_ALARMA_DEFECTO.volumen,
    vibrar: typeof p.vibrar === 'boolean' ? p.vibrar : CONFIG_ALARMA_DEFECTO.vibrar,
  };
}

// ─── Resumen de la alerta (qué se le muestra a la familia) ──────────────

export interface ResumenAlerta {
  motivo: string;
  fragmento: string;
}

/**
 * Arma el texto de la alerta a partir del estado del cerebro: prioriza el
 * motivo de la IA (ya viene en una frase simple); si no hay, usa las
 * señales de las reglas locales.
 */
export function resumenParaAlerta(
  estado: EstadoAnalisis,
  veredicto: VeredictoIA | null
): ResumenAlerta {
  const motivo =
    veredicto?.motivo ??
    (estado.senales.length > 0
      ? estado.senales[estado.senales.length - 1].descripcion
      : 'Señales de posible estafa en la llamada');

  const fragmento = estado.senales
    .map((s) => `«${s.fragmento}»`)
    .join(' ')
    .slice(0, 280);

  return { motivo, fragmento };
}

// ─── Mensajes push de Expo ──────────────────────────────────────────────

export interface FamiliarNotificable {
  push_token: string | null;
  sonido: string;
}

export interface MensajePushExpo {
  to: string;
  title: string;
  body: string;
  sound: 'default';
  priority: 'high';
  channelId: string;
}

/**
 * Arma los mensajes para el servicio push de Expo: uno por familiar con
 * token, cada uno en el canal Android del sonido que ese familiar eligió.
 * (Los familiares sin token —p. ej. usando Expo Go— igual reciben la
 * alerta por Realtime cuando la app está abierta.)
 */
export function construirMensajesPush(
  familiares: FamiliarNotificable[],
  nombreAbuelito: string,
  motivo: string,
  esPrueba: boolean
): MensajePushExpo[] {
  const titulo = esPrueba
    ? `🔔 Prueba de alerta de ${nombreAbuelito}`
    : `🚨 ¡Posible estafa a ${nombreAbuelito}!`;

  return familiares
    .filter((f): f is FamiliarNotificable & { push_token: string } =>
      Boolean(f.push_token && f.push_token.trim())
    )
    .map((f) => ({
      to: f.push_token,
      title: titulo,
      body: motivo,
      sound: 'default' as const,
      priority: 'high' as const,
      channelId: `alertas-${f.sonido === 'sirena' || f.sonido === 'campana' ? f.sonido : 'clasica'}`,
    }));
}
