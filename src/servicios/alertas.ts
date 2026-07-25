/**
 * Custovia — Alertas en tiempo real (Fase 4).
 *
 * El viaje de una alerta:
 *   1. El cerebro del abuelito llega a ROJO.
 *   2. dispararAlerta() inserta una fila en la tabla "alertas" de Supabase
 *      y envía notificaciones push de Expo a los familiares con token.
 *   3. En el teléfono del familiar:
 *      - app abierta  → Realtime entrega el INSERT al instante (alarma).
 *      - app cerrada  → llega la push (requiere development build).
 *
 * Nada aquí lanza errores hacia la interfaz: si no hay internet, la app
 * del abuelito sigue protegiendo con su semáforo igual que siempre.
 */

import { construirMensajesPush } from './logica';
import { Alerta, obtenerSupabase } from './supabase';

const URL_PUSH_EXPO = 'https://exp.host/--/api/v2/push/send';

export interface ResultadoAlerta {
  ok: boolean;
  familiaresAvisados: number;
}

/**
 * Registra la alerta en Supabase y avisa a todos los familiares.
 * KISS: el push se envía directo desde el teléfono del abuelito al
 * servicio gratuito de Expo (sin servidores propios). En producción esto
 * se movería a una Edge Function de Supabase.
 */
export async function dispararAlerta(datos: {
  abuelitoId: string;
  nombreAbuelito: string;
  motivo: string;
  fragmento: string;
  nivel: 'rojo' | 'prueba';
}): Promise<ResultadoAlerta> {
  const sb = obtenerSupabase();
  if (!sb) return { ok: false, familiaresAvisados: 0 };

  try {
    // 1. Registrar la alerta (esto dispara Realtime hacia la familia).
    const { error: errorInsert } = await sb.from('alertas').insert({
      abuelito_id: datos.abuelitoId,
      nivel: datos.nivel,
      motivo: datos.motivo,
      fragmento: datos.fragmento || null,
    });
    if (errorInsert) return { ok: false, familiaresAvisados: 0 };

    // 2. Buscar a los familiares vinculados.
    const { data: familiares } = await sb
      .from('familiares')
      .select('push_token, sonido')
      .eq('abuelito_id', datos.abuelitoId);

    const total = familiares?.length ?? 0;

    // 3. Push de Expo para los que tienen token (app cerrada).
    const mensajes = construirMensajesPush(
      familiares ?? [],
      datos.nombreAbuelito,
      datos.motivo,
      datos.nivel === 'prueba'
    );
    if (mensajes.length > 0) {
      await fetch(URL_PUSH_EXPO, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(mensajes),
      }).catch(() => undefined); // si el push falla, Realtime igual avisó
    }

    return { ok: true, familiaresAvisados: total };
  } catch {
    return { ok: false, familiaresAvisados: 0 };
  }
}

/**
 * Suscribe el teléfono del familiar a las alertas de su abuelito por
 * Realtime. Devuelve una función para cancelar la suscripción.
 */
export function suscribirseAAlertas(
  abuelitoId: string,
  alRecibir: (alerta: Alerta) => void
): () => void {
  const sb = obtenerSupabase();
  if (!sb) return () => undefined;

  const canal = sb
    .channel(`alertas-${abuelitoId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'alertas',
        filter: `abuelito_id=eq.${abuelitoId}`,
      },
      (evento) => alRecibir(evento.new as Alerta)
    )
    .subscribe();

  return () => {
    sb.removeChannel(canal);
  };
}

/** Últimas alertas del abuelito (historial + revisar si llegó algo con la app cerrada). */
export async function ultimasAlertas(abuelitoId: string, limite = 20): Promise<Alerta[]> {
  const sb = obtenerSupabase();
  if (!sb) return [];
  const { data, error } = await sb
    .from('alertas')
    .select('*')
    .eq('abuelito_id', abuelitoId)
    .order('creado_en', { ascending: false })
    .limit(limite);
  if (error || !data) return [];
  return data as Alerta[];
}

/** Botón de "falsa alarma": la marca para que el sistema aprenda. */
export async function marcarFalsaAlarma(alertaId: string): Promise<boolean> {
  const sb = obtenerSupabase();
  if (!sb) return false;
  const { error } = await sb.from('alertas').update({ falsa_alarma: true }).eq('id', alertaId);
  return !error;
}
