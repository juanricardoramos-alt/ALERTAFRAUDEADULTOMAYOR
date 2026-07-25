/**
 * Custovia — Analizador de conversaciones (Fase 1: reglas locales).
 *
 * Recibe texto (la transcripción de una llamada, venga de donde venga:
 * simulación, reconocimiento de voz o VoIP) y lo procesa por bloques,
 * acumulando un puntaje de riesgo. Es lógica pura, sin nada de interfaz,
 * para poder probarla con tests automáticos y reutilizarla en el backend.
 */

import {
  NivelRiesgo,
  REGLAS,
  TipoLlamante,
  UMBRAL_NARANJA,
  UMBRAL_ROJO,
} from './reglas';

export interface SenalDetectada {
  idRegla: string;
  descripcion: string;
  puntos: number;
  absoluta: boolean;
  /** El pedazo exacto de la conversación que gatilló la señal. */
  fragmento: string;
}

export interface EstadoAnalisis {
  tipoLlamante: TipoLlamante;
  puntaje: number;
  nivel: NivelRiesgo;
  senales: SenalDetectada[];
  /** Pregunta de verificación sugerida al abuelito (estado naranja). */
  preguntaSugerida: string | null;
}

/**
 * Deja el texto en minúsculas y sin tildes ni eñes, para que las reglas
 * funcionen aunque la transcripción venga escrita de cualquier forma
 * ("Código", "codigo" y "CÓDIGO" deben dar lo mismo).
 */
export function normalizar(texto: string): string {
  return texto
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

/**
 * Divide una transcripción en bloques del tamaño aproximado de lo que una
 * persona alcanza a decir en 10-15 segundos.
 *
 * - Cada salto de línea es un corte de bloque obligatorio (en el modo
 *   simulación, cada línea que escribas se analiza como un momento
 *   distinto de la llamada).
 * - Dentro de una línea, se corta por frases (. ! ? …) y las frases
 *   cortas se van juntando hasta ~160 caracteres.
 */
export function segmentarTranscripcion(texto: string): string[] {
  const LARGO_MAX_BLOQUE = 160;
  const bloques: string[] = [];

  for (const linea of texto.split(/\n+/)) {
    const frases = (linea.match(/[^.!?…]+[.!?…]*/g) ?? [])
      .map((f) => f.trim())
      .filter((f) => f.length > 0);

    let actual = '';
    for (const frase of frases) {
      if (actual && (actual + ' ' + frase).length > LARGO_MAX_BLOQUE) {
        bloques.push(actual);
        actual = frase;
      } else {
        actual = actual ? actual + ' ' + frase : frase;
      }
    }
    if (actual) bloques.push(actual);
  }
  return bloques;
}

/** Estado inicial de una llamada, según quién llama (Lógica 1: filtro por número). */
export function crearAnalisis(tipoLlamante: TipoLlamante): EstadoAnalisis {
  return {
    tipoLlamante,
    puntaje: 0,
    // Contactos y números institucionales verificados parten en verde;
    // un número desconocido parte en amarillo (analizando).
    nivel: tipoLlamante === 'desconocido' ? 'amarillo' : 'verde',
    senales: [],
    preguntaSugerida: null,
  };
}

function calcularNivel(estado: EstadoAnalisis): NivelRiesgo {
  if (estado.tipoLlamante !== 'desconocido') {
    // Vigilancia pasiva anti-spoofing: una llamada "verde" solo cambia de
    // color ante señales absolutas (pedir claves, códigos, datos de tarjeta),
    // y en ese caso pasa DIRECTO a rojo.
    return estado.senales.some((s) => s.absoluta) ? 'rojo' : 'verde';
  }
  if (estado.puntaje >= UMBRAL_ROJO) return 'rojo';
  if (estado.puntaje >= UMBRAL_NARANJA) return 'naranja';
  return 'amarillo';
}

/** Sugiere una pregunta de verificación según lo detectado (estado naranja). */
function sugerirPregunta(estado: EstadoAnalisis): string | null {
  if (estado.nivel !== 'naranja') return null;
  const ids = new Set(estado.senales.map((s) => s.idRegla));
  if (ids.has('suplantacion_familiar') || ids.has('pariente_apuros')) {
    return 'Pregúntele: "¿Cómo se llama tu mamá?" o "¿Cuándo nos vimos por última vez?" Un familiar real responde al tiro.';
  }
  if (ids.has('premio_inesperado')) {
    return 'Pregúntele: "¿En qué concurso participé yo?" Si usted no participó en nada, es engaño.';
  }
  if (ids.has('suplantacion_institucion')) {
    return 'Dígale: "Voy a cortar y llamaré yo al número oficial". Una institución real no tiene problema con eso.';
  }
  return 'Pida el nombre completo de quien llama y diga que usted devolverá el llamado al número oficial.';
}

/**
 * Analiza UN bloque de conversación y devuelve el nuevo estado.
 * No modifica el estado anterior (así la interfaz puede comparar
 * "antes vs después" para animar el semáforo, vibrar, etc.).
 */
export function analizarBloque(
  estado: EstadoAnalisis,
  bloque: string
): EstadoAnalisis {
  const texto = normalizar(bloque);
  const yaDetectadas = new Set(estado.senales.map((s) => s.idRegla));
  const nuevasSenales: SenalDetectada[] = [];

  for (const regla of REGLAS) {
    // En llamadas verdes (contacto/institucional) solo vigilamos señales absolutas.
    if (estado.tipoLlamante !== 'desconocido' && !regla.absoluta) continue;
    // Cada señal suma puntos UNA sola vez por llamada (no se duplica).
    if (yaDetectadas.has(regla.id)) continue;

    for (const patron of regla.patrones) {
      const coincidencia = texto.match(patron);
      if (coincidencia) {
        nuevasSenales.push({
          idRegla: regla.id,
          descripcion: regla.descripcion,
          puntos: regla.puntos,
          absoluta: regla.absoluta,
          fragmento: extraerFragmento(bloque, coincidencia.index ?? 0, coincidencia[0].length),
        });
        yaDetectadas.add(regla.id);
        break; // basta con un patrón por regla
      }
    }
  }

  const nuevoEstado: EstadoAnalisis = {
    ...estado,
    puntaje: estado.puntaje + nuevasSenales.reduce((sum, s) => sum + s.puntos, 0),
    senales: [...estado.senales, ...nuevasSenales],
    preguntaSugerida: null,
  };
  nuevoEstado.nivel = calcularNivel(nuevoEstado);
  nuevoEstado.preguntaSugerida = sugerirPregunta(nuevoEstado);
  return nuevoEstado;
}

/**
 * Recupera el pedazo de conversación que gatilló la señal, para mostrarlo
 * en pantalla y enviarlo a la familia. Se trabaja sobre la versión sin
 * tildes del texto (mismo largo que la normalizada, así las posiciones
 * calzan); el fragmento conserva las mayúsculas originales.
 */
function extraerFragmento(original: string, inicio: number, largo: number): string {
  const sinAcentos = original.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const desde = Math.max(0, inicio - 15);
  const hasta = Math.min(sinAcentos.length, inicio + largo + 25);
  const prefijo = desde > 0 ? '…' : '';
  const sufijo = hasta < sinAcentos.length ? '…' : '';
  return prefijo + sinAcentos.slice(desde, hasta).trim() + sufijo;
}
