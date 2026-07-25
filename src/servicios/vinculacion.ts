/**
 * Custovia — Vinculación abuelito ↔ familiares (Fase 4).
 *
 * El abuelito genera un código de 6 letras; el familiar lo escribe en su
 * app y queda vinculado. Todo se guarda en Supabase. Ninguna función
 * lanza errores hacia la interfaz: devuelven null / false si algo falla.
 */

import { generarCodigo, normalizarCodigo } from './logica';
import { Abuelito, Familiar, obtenerSupabase } from './supabase';

/** Crea el registro del abuelito con un código único (reintenta si choca). */
export async function crearAbuelito(nombre: string): Promise<Abuelito | null> {
  const sb = obtenerSupabase();
  if (!sb) return null;

  for (let intento = 0; intento < 3; intento++) {
    const { data, error } = await sb
      .from('abuelitos')
      .insert({ nombre, codigo: generarCodigo() })
      .select()
      .single();
    if (!error && data) return data as Abuelito;
    // Si el código ya existía (colisión rarísima), se genera otro.
  }
  return null;
}

export async function renombrarAbuelito(id: string, nombre: string): Promise<boolean> {
  const sb = obtenerSupabase();
  if (!sb) return false;
  const { error } = await sb.from('abuelitos').update({ nombre }).eq('id', id);
  return !error;
}

/** Busca al abuelito por su código de vinculación (para la app del familiar). */
export async function buscarAbuelitoPorCodigo(codigo: string): Promise<Abuelito | null> {
  const sb = obtenerSupabase();
  if (!sb) return null;
  const { data, error } = await sb
    .from('abuelitos')
    .select('id, nombre, codigo')
    .eq('codigo', normalizarCodigo(codigo))
    .maybeSingle();
  if (error || !data) return null;
  return data as Abuelito;
}

/** Registra a un familiar vinculado a un abuelito. */
export async function registrarFamiliar(
  abuelitoId: string,
  nombre: string,
  pushToken: string | null,
  sonido: string
): Promise<Familiar | null> {
  const sb = obtenerSupabase();
  if (!sb) return null;
  const { data, error } = await sb
    .from('familiares')
    .insert({ abuelito_id: abuelitoId, nombre, push_token: pushToken, sonido })
    .select()
    .single();
  if (error || !data) return null;
  return data as Familiar;
}

/** Actualiza el token push o el sonido elegido por el familiar. */
export async function actualizarFamiliar(
  id: string,
  cambios: { push_token?: string | null; sonido?: string }
): Promise<boolean> {
  const sb = obtenerSupabase();
  if (!sb) return false;
  const { error } = await sb.from('familiares').update(cambios).eq('id', id);
  return !error;
}

/** Cuántos familiares están vinculados a este abuelito (para su pantalla). */
export async function contarFamiliares(abuelitoId: string): Promise<number> {
  const sb = obtenerSupabase();
  if (!sb) return 0;
  const { count, error } = await sb
    .from('familiares')
    .select('id', { count: 'exact', head: true })
    .eq('abuelito_id', abuelitoId);
  if (error || count === null) return 0;
  return count;
}
