/**
 * Custovia — Perfil local del teléfono (Fase 4).
 *
 * Guarda en el propio teléfono qué rol tiene esta instalación
 * ("abuelito" o "familia") y sus datos de vinculación, para que la app
 * abra directo en el modo correcto.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

import { Abuelito, Familiar } from './supabase';

export interface PerfilAbuelito {
  modo: 'abuelito';
  /** Datos en Supabase; null si aún no se configura Supabase (Fases 1-2 siguen funcionando). */
  abuelito: Abuelito | null;
}

export interface PerfilFamilia {
  modo: 'familia';
  familiar: Familiar;
  abuelito: { id: string; nombre: string };
  /** Teléfono del abuelito para el botón LLAMAR (se guarda solo en este teléfono). */
  telefonoAbuelito: string;
}

export type Perfil = PerfilAbuelito | PerfilFamilia;

const CLAVE_PERFIL = 'custovia.perfil';

export async function cargarPerfil(): Promise<Perfil | null> {
  try {
    const crudo = await AsyncStorage.getItem(CLAVE_PERFIL);
    if (!crudo) return null;
    const datos = JSON.parse(crudo);
    if (datos?.modo === 'abuelito' || datos?.modo === 'familia') return datos as Perfil;
    return null;
  } catch {
    return null;
  }
}

export async function guardarPerfil(perfil: Perfil): Promise<void> {
  try {
    await AsyncStorage.setItem(CLAVE_PERFIL, JSON.stringify(perfil));
  } catch {
    /* sin storage: el modo se preguntará de nuevo al reabrir */
  }
}

export async function borrarPerfil(): Promise<void> {
  try {
    await AsyncStorage.removeItem(CLAVE_PERFIL);
  } catch {
    /* nada que borrar */
  }
}
