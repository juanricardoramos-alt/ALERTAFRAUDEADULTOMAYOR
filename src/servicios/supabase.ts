/**
 * Custovia — Conexión con Supabase (Fase 4).
 *
 * Piezas de Supabase que usamos y por qué:
 * - Postgres (tablas abuelitos/familiares/alertas): guarda la vinculación
 *   y el historial de alertas.
 * - Realtime: cada INSERT en "alertas" llega al instante a los teléfonos
 *   de la familia suscritos (es lo que hace sonar la alarma en vivo).
 * - NO usamos Supabase Auth todavía (KISS): el código de vinculación hace
 *   de secreto compartido. Antes de un lanzamiento real se agrega Auth.
 *
 * Las claves viven en .env (nunca en el código ni en GitHub):
 *   EXPO_PUBLIC_SUPABASE_URL / EXPO_PUBLIC_SUPABASE_ANON_KEY
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';

export function supabaseConfigurado(): boolean {
  const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
  const key = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
  return Boolean(url && url.startsWith('http') && key && key.length > 20);
}

let cliente: SupabaseClient | null = null;

/** Cliente único de Supabase, o null si aún no está configurado el .env. */
export function obtenerSupabase(): SupabaseClient | null {
  if (!supabaseConfigurado()) return null;
  if (!cliente) {
    cliente = createClient(
      process.env.EXPO_PUBLIC_SUPABASE_URL!,
      process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!,
      {
        // No usamos cuentas de usuario todavía: sin sesiones que guardar.
        auth: { persistSession: false, autoRefreshToken: false },
      }
    );
  }
  return cliente;
}

// ─── Formas de las filas de la base de datos ────────────────────────────

export interface Abuelito {
  id: string;
  nombre: string;
  codigo: string;
}

export interface Familiar {
  id: string;
  abuelito_id: string;
  nombre: string;
  push_token: string | null;
  sonido: string;
}

export interface Alerta {
  id: string;
  abuelito_id: string;
  nivel: 'rojo' | 'prueba';
  motivo: string;
  fragmento: string | null;
  falsa_alarma: boolean;
  creado_en: string;
}
