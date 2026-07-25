/**
 * Custovia — Capa de análisis con IA (Fase 2).
 *
 * Segunda capa del cerebro: la API de Claude (Anthropic) lee la conversación
 * acumulada y detecta estafas sutiles que las reglas por palabras clave no
 * captan (manipulación emocional, recolección de datos personales, presión
 * con culpa o vergüenza).
 *
 * Principios de diseño:
 * - Las reglas locales SIEMPRE corren primero y no dependen de esta capa.
 * - Si no hay internet, no hay API key o la API falla, analizarConIA()
 *   devuelve null y la app sigue funcionando solo con reglas. Nunca lanza
 *   errores hacia la interfaz.
 * - El puntaje final combina ambas capas: el más alto manda (combinarConIA).
 * - Costo controlado: la interfaz solo llama a la IA para números
 *   desconocidos y deja de llamar cuando ya se llegó a rojo (ver
 *   debeConsultarIA). El prompt de sistema es estable para aprovechar el
 *   caché de prompts de la API.
 */

import Anthropic from '@anthropic-ai/sdk';

import { EstadoAnalisis } from './analizador';
import { NivelRiesgo, TipoLlamante, UMBRAL_NARANJA, UMBRAL_ROJO } from './reglas';

// ─── Tipos ──────────────────────────────────────────────────────────────

export type NivelIA = 'ninguno' | 'bajo' | 'medio' | 'alto';

export interface VeredictoIA {
  nivel: NivelIA;
  /** Frase corta en español simple, para mostrar al abuelito y a la familia. */
  motivo: string;
}

/** Cuántos puntos de riesgo aporta cada nivel de la IA al puntaje combinado. */
export const PUNTOS_NIVEL_IA: Record<NivelIA, number> = {
  ninguno: 0,
  bajo: 12, // por sí solo queda en amarillo
  medio: 35, // por sí solo llega a naranja
  alto: 70, // por sí solo dispara el rojo
};

// ─── Configuración de la llamada a la API ───────────────────────────────

// Modelo por defecto de la API de Claude. Cada análisis de bloque es corto
// (~1 centavo de dólar por llamada); si más adelante quieres abaratar aún
// más, puedes cambiarlo por 'claude-haiku-4-5'.
const MODELO = 'claude-opus-5';
const MAX_TOKENS = 2000;
const TIMEOUT_MS = 15_000; // si la API tarda más que esto, seguimos solo con reglas

/**
 * Prompt de sistema: fijo para todas las llamadas (así la API lo cachea y
 * las llamadas siguientes salen más baratas y rápidas).
 */
export const PROMPT_SISTEMA = `Eres el motor de análisis de Custovia, una aplicación que protege a adultos mayores en Chile de estafas telefónicas y avisa a sus familias en tiempo real.

Recibirás la transcripción parcial de una llamada EN CURSO que recibe un adulto mayor desde un número desconocido. La transcripción puede estar incompleta y contiene principalmente lo que dice la persona que llama.

Tu tarea: evaluar el riesgo de que sea una estafa. Juzga QUÉ PIDE y CÓMO presiona quien llama, no quién dice ser.

SEÑALES DE ALTO RIESGO (peticiones que ningún actor legítimo hace por teléfono):
- Pedir claves, PIN, contraseñas, clave dinámica o coordenadas de tarjeta.
- Pedir códigos que llegan por SMS.
- Pedir número de tarjeta, CVV o fecha de vencimiento.
- Pedir transferencias, depósitos, giros o compra de tarjetas de regalo (gift cards).
- Pedir instalar aplicaciones o dar acceso remoto al teléfono o computador.

SEÑALES DE MANIPULACIÓN (incluye las formas SUTILES que no usan palabras obvias):
- Urgencia extrema, amenazas (detención, bloqueo de cuenta, corte de servicio).
- Secretismo ("no le cuente a nadie", "no corte").
- Suplantación: hacerse pasar por banco, PDI, empresa o por un familiar. Incluye la forma sutil de no dar el nombre y hacer que el adulto mayor adivine ("¿no me reconoce?", "soy yo, po").
- Manipulación emocional: culpa, vergüenza, lástima, cariño fingido para pedir plata o favores.
- Recolección de datos personales sin razón clara: RUT, dirección, con quién vive, a qué hora está solo, datos de la casa. Esto es preparación de estafa o robo aunque suene amable.
- Premios, herencias, beneficios o "usted fue seleccionado" sin haber participado en nada.
- "Este es mi número nuevo" viniendo de un desconocido.

SEÑALES QUE BAJAN EL RIESGO:
- Conversación cotidiana sin peticiones peligrosas: un repartidor que avisa que llegó, recordatorio de hora médica, un saludo, una consulta normal.
- Ser número desconocido NO es sospechoso por sí solo. Lo que importa es la conducta.

Niveles de respuesta:
- "ninguno": nada sospechoso hasta ahora.
- "bajo": algo levemente raro, pero explicable; solo mantener atención.
- "medio": varias señales de manipulación o recolección de datos; conviene verificar con quién habla.
- "alto": patrón claro de estafa en curso; hay que alertar a la familia.

El "motivo" debe ser UNA frase corta (máximo 20 palabras), en español chileno simple, entendible por un adulto mayor y su familia. Ejemplos: "Dice ser un familiar pero no da su nombre y pide plata", "Está preguntando datos personales de la casa sin motivo claro".`;

/** Esquema JSON que la API está obligada a respetar (salida estructurada). */
export const ESQUEMA_VEREDICTO = {
  type: 'object' as const,
  properties: {
    nivel: {
      type: 'string' as const,
      enum: ['ninguno', 'bajo', 'medio', 'alto'],
      description: 'Nivel de riesgo de estafa detectado en la conversación',
    },
    motivo: {
      type: 'string' as const,
      description:
        'Frase corta en español simple explicando la sospecha (máx 20 palabras)',
    },
  },
  required: ['nivel', 'motivo'],
  additionalProperties: false as const,
};

/** Construye el mensaje de usuario que se envía a la API en cada análisis. */
export function construirMensajeUsuario(transcripcion: string): string {
  return (
    'Transcripción acumulada de la llamada hasta este momento (puede estar incompleta):\n' +
    '"""\n' +
    transcripcion.trim() +
    '\n"""'
  );
}

// ─── Interpretación de la respuesta (lógica pura, con tests) ────────────

const NIVELES_VALIDOS: NivelIA[] = ['ninguno', 'bajo', 'medio', 'alto'];

/**
 * Convierte el texto JSON que devuelve la API en un VeredictoIA.
 * Devuelve null ante cualquier cosa inesperada (nunca lanza error).
 */
export function interpretarVeredicto(textoJson: string): VeredictoIA | null {
  try {
    const datos = JSON.parse(textoJson);
    if (
      datos &&
      typeof datos === 'object' &&
      NIVELES_VALIDOS.includes(datos.nivel) &&
      typeof datos.motivo === 'string' &&
      datos.motivo.trim().length > 0
    ) {
      return { nivel: datos.nivel, motivo: datos.motivo.trim() };
    }
    return null;
  } catch {
    return null;
  }
}

/** De dos veredictos, conserva el de mayor riesgo (el riesgo nunca baja en una llamada). */
export function peorVeredicto(
  a: VeredictoIA | null,
  b: VeredictoIA | null
): VeredictoIA | null {
  if (!a) return b;
  if (!b) return a;
  return PUNTOS_NIVEL_IA[b.nivel] > PUNTOS_NIVEL_IA[a.nivel] ? b : a;
}

// ─── Combinación de las dos capas ───────────────────────────────────────

/**
 * Combina el estado de las reglas locales con el veredicto de la IA.
 * El puntaje más alto manda (más vale prevenir). Solo aplica a números
 * desconocidos: los verdes se rigen por la vigilancia anti-spoofing de
 * las reglas y no consultan a la IA.
 */
export function combinarConIA(
  estado: EstadoAnalisis,
  veredicto: VeredictoIA | null
): EstadoAnalisis {
  if (estado.tipoLlamante !== 'desconocido' || !veredicto) return estado;

  const puntosIA = PUNTOS_NIVEL_IA[veredicto.nivel];
  // La IA solo puede SUBIR el riesgo, nunca bajarlo (más vale prevenir).
  if (puntosIA <= estado.puntaje) return estado;

  const puntaje = puntosIA;
  let nivel: NivelRiesgo = 'amarillo';
  if (puntaje >= UMBRAL_ROJO) nivel = 'rojo';
  else if (puntaje >= UMBRAL_NARANJA) nivel = 'naranja';

  return {
    ...estado,
    puntaje,
    nivel,
    preguntaSugerida:
      nivel === 'naranja'
        ? estado.preguntaSugerida ??
          'Pida el nombre completo de quien llama y diga que usted devolverá el llamado.'
        : estado.preguntaSugerida,
  };
}

/**
 * Decide si vale la pena gastar una llamada a la IA en este momento.
 * - Solo números desconocidos (los verdes usan vigilancia anti-spoofing local).
 * - Si las reglas o la IA ya marcaron rojo, no hay nada más que confirmar.
 */
export function debeConsultarIA(
  tipoLlamante: TipoLlamante,
  puntajeReglas: number,
  veredictoActual: VeredictoIA | null
): boolean {
  if (!iaConfigurada()) return false;
  if (tipoLlamante !== 'desconocido') return false;
  if (puntajeReglas >= UMBRAL_ROJO) return false;
  if (veredictoActual && PUNTOS_NIVEL_IA[veredictoActual.nivel] >= UMBRAL_ROJO) return false;
  return true;
}

// ─── Llamada real a la API de Claude ────────────────────────────────────

/** ¿Hay una API key configurada en el .env? */
export function iaConfigurada(): boolean {
  const key = process.env.EXPO_PUBLIC_ANTHROPIC_API_KEY;
  return typeof key === 'string' && key.trim().length > 0;
}

let cliente: Anthropic | null = null;

function obtenerCliente(): Anthropic {
  if (!cliente) {
    cliente = new Anthropic({
      apiKey: process.env.EXPO_PUBLIC_ANTHROPIC_API_KEY,
      // Necesario para la vista previa web (npx expo start --web). En el
      // teléfono no tiene efecto. El .env ya documenta que en producción
      // la key se mueve a un backend.
      dangerouslyAllowBrowser: true,
    });
  }
  return cliente;
}

/**
 * Envía la transcripción acumulada a la API de Claude y devuelve el
 * veredicto, o null si algo falla (sin internet, key inválida, timeout…).
 * NUNCA lanza errores: la app debe seguir funcionando solo con reglas.
 */
export async function analizarConIA(
  transcripcion: string
): Promise<VeredictoIA | null> {
  if (!iaConfigurada() || transcripcion.trim().length === 0) return null;

  try {
    const respuesta = await obtenerCliente().messages.create(
      {
        model: MODELO,
        max_tokens: MAX_TOKENS,
        output_config: {
          effort: 'low', // clasificación corta: rapidez y bajo costo
          format: { type: 'json_schema', schema: ESQUEMA_VEREDICTO },
        },
        system: [
          {
            type: 'text',
            text: PROMPT_SISTEMA,
            // El prompt es idéntico en cada llamada: la API lo cachea y las
            // llamadas siguientes de la misma llamada salen más baratas.
            cache_control: { type: 'ephemeral' },
          },
        ],
        messages: [{ role: 'user', content: construirMensajeUsuario(transcripcion) }],
      },
      { timeout: TIMEOUT_MS, maxRetries: 1 }
    );

    // Si los clasificadores de seguridad declinaran la solicitud, no hay
    // veredicto que leer: seguimos solo con las reglas locales.
    if (respuesta.stop_reason === 'refusal') return null;

    const bloqueTexto = respuesta.content.find((b) => b.type === 'text');
    return bloqueTexto ? interpretarVeredicto(bloqueTexto.text) : null;
  } catch {
    return null; // sin internet, key mala, timeout, sobrecarga… reglas al mando
  }
}
