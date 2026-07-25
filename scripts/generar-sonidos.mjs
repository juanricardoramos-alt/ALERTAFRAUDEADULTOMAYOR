/**
 * Custovia — Generador de los sonidos de alarma (Fase 4).
 *
 * Crea los archivos WAV de assets/sonidos/ desde cero (ondas calculadas),
 * así no dependemos de sonidos con licencia. Solo hace falta correrlo si
 * quieres regenerarlos o agregar tonos nuevos:
 *   node scripts/generar-sonidos.mjs
 */

import { mkdirSync, writeFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const FRECUENCIA_MUESTREO = 22050; // muestras por segundo (suficiente para tonos)
const carpeta = join(dirname(fileURLToPath(import.meta.url)), '..', 'assets', 'sonidos');
mkdirSync(carpeta, { recursive: true });

/** Envuelve muestras PCM 16-bit mono en un archivo WAV. */
function escribirWav(nombre, muestras) {
  const datos = Buffer.alloc(muestras.length * 2);
  for (let i = 0; i < muestras.length; i++) {
    const v = Math.max(-1, Math.min(1, muestras[i]));
    datos.writeInt16LE(Math.round(v * 32767), i * 2);
  }
  const cabecera = Buffer.alloc(44);
  cabecera.write('RIFF', 0);
  cabecera.writeUInt32LE(36 + datos.length, 4);
  cabecera.write('WAVE', 8);
  cabecera.write('fmt ', 12);
  cabecera.writeUInt32LE(16, 16); // tamaño del bloque fmt
  cabecera.writeUInt16LE(1, 20); // PCM
  cabecera.writeUInt16LE(1, 22); // mono
  cabecera.writeUInt32LE(FRECUENCIA_MUESTREO, 24);
  cabecera.writeUInt32LE(FRECUENCIA_MUESTREO * 2, 28); // bytes por segundo
  cabecera.writeUInt16LE(2, 32); // bytes por muestra
  cabecera.writeUInt16LE(16, 34); // bits por muestra
  cabecera.write('data', 36);
  cabecera.writeUInt32LE(datos.length, 40);
  writeFileSync(join(carpeta, nombre), Buffer.concat([cabecera, datos]));
  console.log(`✓ ${nombre} (${((44 + datos.length) / 1024).toFixed(0)} KB)`);
}

const seg = (s) => Math.round(s * FRECUENCIA_MUESTREO);

/** Suaviza inicio y fin de un tramo para que no haga "clic". */
function suavizar(muestras, ms = 8) {
  const n = seg(ms / 1000);
  for (let i = 0; i < n && i < muestras.length; i++) {
    const f = i / n;
    muestras[i] *= f;
    muestras[muestras.length - 1 - i] *= f;
  }
  return muestras;
}

function tono(frecuencia, duracion, volumen = 0.8) {
  const m = new Array(seg(duracion));
  for (let i = 0; i < m.length; i++) {
    m[i] = Math.sin((2 * Math.PI * frecuencia * i) / FRECUENCIA_MUESTREO) * volumen;
  }
  return suavizar(m);
}

const silencio = (duracion) => new Array(seg(duracion)).fill(0);

// ── 1. "clasica": bip-bip-bip de despertador ────────────────────────────
{
  const m = [];
  for (let r = 0; r < 3; r++) {
    for (let b = 0; b < 3; b++) m.push(...tono(880, 0.12), ...silencio(0.08));
    m.push(...silencio(0.35));
  }
  escribirWav('clasica.wav', m);
}

// ── 2. "sirena": barrido continuo que sube y baja ───────────────────────
{
  const duracion = 2.4;
  const m = new Array(seg(duracion));
  let fase = 0;
  for (let i = 0; i < m.length; i++) {
    const t = i / FRECUENCIA_MUESTREO;
    const vaiven = 0.5 - 0.5 * Math.cos((2 * Math.PI * t) / 1.2); // 0→1→0 cada 1.2 s
    const frecuencia = 600 + 600 * vaiven;
    fase += (2 * Math.PI * frecuencia) / FRECUENCIA_MUESTREO;
    m[i] = Math.sin(fase) * 0.75;
  }
  escribirWav('sirena.wav', suavizar(m));
}

// ── 3. "campana": campanadas con armónicos que se apagan ────────────────
{
  const m = [];
  for (let golpe = 0; golpe < 3; golpe++) {
    const dur = 0.85;
    const c = new Array(seg(dur));
    for (let i = 0; i < c.length; i++) {
      const t = i / FRECUENCIA_MUESTREO;
      const caida = Math.exp(-4 * t);
      c[i] =
        (Math.sin(2 * Math.PI * 1046 * t) * 0.6 +
          Math.sin(2 * Math.PI * 2093 * t) * 0.25 +
          Math.sin(2 * Math.PI * 3139 * t) * 0.1) *
        caida;
    }
    m.push(...suavizar(c), ...silencio(0.1));
  }
  escribirWav('campana.wav', m);
}

console.log('\nSonidos generados en assets/sonidos/');
