/**
 * Custovia — Prueba de conexión con la API de Claude (Fase 2).
 *
 * Verifica que tu API key funciona SIN necesidad del teléfono:
 *   1. Copia .env.example a .env y pega tu key.
 *   2. Corre:  npm run probar-ia
 *
 * Envía una conversación de estafa "sutil" (sin palabras clave obvias,
 * las reglas locales no la detectan) y muestra el veredicto de la IA.
 */

import Anthropic from '@anthropic-ai/sdk';
import { readFileSync } from 'fs';

// ── Leer la API key desde .env (sin dependencias extra) ─────────────────
function leerEnv() {
  try {
    const contenido = readFileSync(new URL('../.env', import.meta.url), 'utf8');
    for (const linea of contenido.split('\n')) {
      const limpia = linea.trim();
      if (limpia.startsWith('EXPO_PUBLIC_ANTHROPIC_API_KEY=')) {
        return limpia.slice('EXPO_PUBLIC_ANTHROPIC_API_KEY='.length).trim();
      }
    }
  } catch {
    /* no existe .env */
  }
  return '';
}

const apiKey = leerEnv() || process.env.EXPO_PUBLIC_ANTHROPIC_API_KEY || '';

if (!apiKey) {
  console.log('❌ No encontré la API key.');
  console.log('   1. Copia .env.example a .env (en la raíz del proyecto)');
  console.log('   2. Pega tu key después de EXPO_PUBLIC_ANTHROPIC_API_KEY=');
  console.log('   3. Vuelve a correr: npm run probar-ia');
  process.exit(1);
}

// ── La misma configuración que usa la app (src/brain/ia.ts) ─────────────
const CONVERSACION_SUTIL = `Buenas tardes, don José, ¿cómo está? Lo llamamos por el nuevo beneficio para el adulto mayor de su comuna.
Usted quedó en la lista de vecinos seleccionados, es sin costo.
Para inscribirlo necesito confirmar algunos datos, ¿ya? ¿Me confirma su RUT y su dirección exacta?
¿Y usted vive solito o lo acompaña alguien? ¿A qué hora suele estar en la casa, para la visita del evaluador?`;

console.log('🛡️  Custovia — probando la conexión con la API de Claude…\n');
console.log('Conversación de prueba (estafa sutil, invisible para las reglas locales):');
console.log('─'.repeat(60));
console.log(CONVERSACION_SUTIL);
console.log('─'.repeat(60) + '\n');

const cliente = new Anthropic({ apiKey });

try {
  const respuesta = await cliente.messages.create(
    {
      model: 'claude-opus-5',
      max_tokens: 2000,
      output_config: {
        effort: 'low',
        format: {
          type: 'json_schema',
          schema: {
            type: 'object',
            properties: {
              nivel: { type: 'string', enum: ['ninguno', 'bajo', 'medio', 'alto'] },
              motivo: { type: 'string' },
            },
            required: ['nivel', 'motivo'],
            additionalProperties: false,
          },
        },
      },
      system:
        'Eres el motor de análisis de Custovia, que protege a adultos mayores en Chile de estafas telefónicas. ' +
        'Evalúa la transcripción parcial de una llamada de un número desconocido: juzga qué pide y cómo presiona quien llama. ' +
        'La recolección de datos personales sin razón clara (RUT, dirección, con quién vive, horarios) es preparación de estafa o robo aunque suene amable. ' +
        'Responde nivel ("ninguno"|"bajo"|"medio"|"alto") y motivo (frase corta en español simple, máx 20 palabras).',
      messages: [
        {
          role: 'user',
          content: `Transcripción acumulada de la llamada:\n"""\n${CONVERSACION_SUTIL}\n"""`,
        },
      ],
    },
    { timeout: 30_000 }
  );

  if (respuesta.stop_reason === 'refusal') {
    console.log('⚠️  La API declinó analizar este texto. Intenta de nuevo.');
    process.exit(1);
  }

  const texto = respuesta.content.find((b) => b.type === 'text')?.text ?? '';
  const veredicto = JSON.parse(texto);

  const iconos = { ninguno: '✅', bajo: '❓', medio: '⚠️', alto: '🚨' };
  console.log('✅ ¡Conexión exitosa! Veredicto de la IA:\n');
  console.log(`   ${iconos[veredicto.nivel] ?? '❓'} Nivel de riesgo: ${veredicto.nivel.toUpperCase()}`);
  console.log(`   💬 Motivo: ${veredicto.motivo}\n`);
  console.log(
    `   (tokens usados — entrada: ${respuesta.usage.input_tokens}, salida: ${respuesta.usage.output_tokens})`
  );
  console.log('\nTodo listo: la app ya puede usar la IA. Corre: npx expo start --clear');
} catch (error) {
  if (error?.status === 401) {
    console.log('❌ La API key no es válida (error 401). Revisa que la copiaste completa en el .env.');
  } else if (error?.status === 429) {
    console.log('❌ Límite de uso alcanzado (error 429). Espera un momento o revisa tu plan en console.anthropic.com.');
  } else {
    console.log(`❌ Error al conectar: ${error?.message ?? error}`);
    console.log('   ¿Tienes internet? ¿La key empieza con "sk-ant-"?');
  }
  process.exit(1);
}
