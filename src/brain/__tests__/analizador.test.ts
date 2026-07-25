/**
 * Tests del cerebro de análisis de GuardIA.
 * Se corren con: npm test
 *
 * Cubren los casos clave del diseño:
 * - Estafas clásicas chilenas → deben terminar en ROJO.
 * - El caso difícil (repartidor honesto de número desconocido) → NUNCA rojo.
 * - Anti-spoofing: número institucional que pide datos → ROJO igual.
 * - Contacto de confianza con conversación normal → VERDE siempre.
 */

import {
  analizarBloque,
  crearAnalisis,
  EstadoAnalisis,
  normalizar,
  segmentarTranscripcion,
} from '../analizador';
import { EJEMPLOS } from '../ejemplos';
import { TipoLlamante, UMBRAL_ROJO } from '../reglas';

/** Procesa una conversación completa bloque a bloque, como lo hace la app. */
function analizarConversacion(tipo: TipoLlamante, texto: string): EstadoAnalisis[] {
  const bloques = segmentarTranscripcion(texto);
  const estados: EstadoAnalisis[] = [];
  let estado = crearAnalisis(tipo);
  for (const bloque of bloques) {
    estado = analizarBloque(estado, bloque);
    estados.push(estado);
  }
  return estados;
}

function estadoFinal(tipo: TipoLlamante, texto: string): EstadoAnalisis {
  const estados = analizarConversacion(tipo, texto);
  return estados[estados.length - 1];
}

function ejemplo(titulo: string) {
  const e = EJEMPLOS.find((x) => x.titulo.includes(titulo));
  if (!e) throw new Error(`No existe el ejemplo "${titulo}"`);
  return e;
}

describe('normalizar', () => {
  it('quita tildes, eñes y mayúsculas', () => {
    expect(normalizar('CÓDIGO')).toBe('codigo');
    expect(normalizar('Contraseña')).toBe('contrasena');
    expect(normalizar('señora Rosa')).toBe('senora rosa');
  });
});

describe('segmentarTranscripcion', () => {
  it('divide una conversación larga en varios bloques', () => {
    const bloques = segmentarTranscripcion(ejemplo('Falso banco').texto);
    expect(bloques.length).toBeGreaterThan(2);
    // No se pierde contenido: todo el texto queda repartido en los bloques.
    const juntos = bloques.join(' ');
    expect(juntos).toContain('clave dinámica');
    expect(juntos).toContain('código por SMS');
  });

  it('devuelve un solo bloque para una frase corta', () => {
    expect(segmentarTranscripcion('Hola, ¿cómo está?')).toHaveLength(1);
  });

  it('devuelve lista vacía si no hay texto', () => {
    expect(segmentarTranscripcion('   ')).toHaveLength(0);
  });
});

describe('estafas clásicas → ROJO', () => {
  it('falso banco que pide clave dinámica y código SMS termina en rojo', () => {
    const final = estadoFinal('desconocido', ejemplo('Falso banco').texto);
    expect(final.nivel).toBe('rojo');
    expect(final.puntaje).toBeGreaterThanOrEqual(UMBRAL_ROJO);
    const ids = final.senales.map((s) => s.idRegla);
    expect(ids).toContain('pide_clave');
    expect(ids).toContain('pide_codigo_sms');
  });

  it('el cuento del tío (nieto en apuros) termina en rojo', () => {
    const final = estadoFinal('desconocido', ejemplo('Cuento del tío').texto);
    expect(final.nivel).toBe('rojo');
    const ids = final.senales.map((s) => s.idRegla);
    expect(ids).toContain('suplantacion_familiar');
    expect(ids).toContain('pide_transferencia');
  });

  it('el riesgo va SUBIENDO por bloques (no aparece todo de golpe)', () => {
    const estados = analizarConversacion('desconocido', ejemplo('Cuento del tío').texto);
    const puntajes = estados.map((e) => e.puntaje);
    for (let i = 1; i < puntajes.length; i++) {
      expect(puntajes[i]).toBeGreaterThanOrEqual(puntajes[i - 1]);
    }
    expect(puntajes[0]).toBeLessThan(puntajes[puntajes.length - 1]);
  });

  it('pedir comprar gift cards es señal crítica', () => {
    const final = estadoFinal(
      'desconocido',
      'Para pagar la multa debe comprar tarjetas de regalo en el supermercado.'
    );
    expect(final.nivel).toBe('rojo');
  });

  it('pedir instalar una app de acceso remoto es señal crítica', () => {
    const final = estadoFinal(
      'desconocido',
      'Le vamos a ayudar, solo instale la aplicación AnyDesk en su teléfono.'
    );
    expect(final.nivel).toBe('rojo');
  });
});

describe('el caso difícil: desconocido inofensivo NO dispara alarma', () => {
  it('repartidor real de número desconocido queda en amarillo, sin señales', () => {
    const final = estadoFinal('desconocido', ejemplo('Repartidor real').texto);
    expect(final.nivel).toBe('amarillo');
    expect(final.senales).toHaveLength(0);
    expect(final.puntaje).toBe(0);
  });

  it('pero si el "repartidor" pide una transferencia, sí es rojo', () => {
    const final = estadoFinal(
      'desconocido',
      'Su paquete está retenido en la aduana. Para liberarlo transfiera 45 mil pesos ahora mismo.'
    );
    expect(final.nivel).toBe('rojo');
  });
});

describe('anti-spoofing: los números "verdes" no quedan 100% ciegos', () => {
  it('número institucional que pide datos de tarjeta → rojo igual', () => {
    const final = estadoFinal('institucional', ejemplo('Número 600 clonado').texto);
    expect(final.nivel).toBe('rojo');
    expect(final.senales.some((s) => s.absoluta)).toBe(true);
  });

  it('número institucional con conversación normal se mantiene verde', () => {
    const final = estadoFinal(
      'institucional',
      'Le recordamos su hora médica de mañana a las 10 en la clínica. Llegue 15 minutos antes.'
    );
    expect(final.nivel).toBe('verde');
    expect(final.senales).toHaveLength(0);
  });

  it('en llamadas verdes, la manipulación sola no cambia el color (solo señales absolutas)', () => {
    const final = estadoFinal(
      'contacto',
      'Es urgente, ahora mismo, no le digas a nadie que te llamé.'
    );
    expect(final.nivel).toBe('verde');
  });
});

describe('contacto de confianza', () => {
  it('nieta real conversando normal → verde de principio a fin', () => {
    const estados = analizarConversacion('contacto', ejemplo('Nieta real').texto);
    for (const e of estados) {
      expect(e.nivel).toBe('verde');
    }
  });
});

describe('mecánica del puntaje', () => {
  it('una señal repetida suma puntos una sola vez', () => {
    const texto = 'Deme su clave. Por favor deme su clave. Insisto, deme su clave.';
    const final = estadoFinal('desconocido', texto);
    const idsClave = final.senales.filter((s) => s.idRegla === 'pide_clave');
    expect(idsClave).toHaveLength(1);
  });

  it('la manipulación acumulada pasa por naranja antes de llegar a rojo', () => {
    // Suplantación (15) + amenaza (15) = 30 → naranja, todavía sin petición peligrosa.
    const estados = analizarConversacion(
      'desconocido',
      'Le hablamos del banco, somos del departamento de fraudes.\n' +
        'Su cuenta será bloqueada hoy.\n' +
        'Debe hacer una transferencia para protegerla.'
    );
    const niveles = estados.map((e) => e.nivel);
    expect(niveles).toContain('naranja');
    expect(niveles[niveles.length - 1]).toBe('rojo');
  });

  it('en naranja se sugiere una pregunta de verificación', () => {
    const final = estadoFinal(
      'desconocido',
      'Aló abuelita, soy su nieto. Se me perdió el celular, guarde este número.'
    );
    expect(final.nivel).toBe('naranja');
    expect(final.preguntaSugerida).toBeTruthy();
    expect(final.preguntaSugerida).toContain('mamá');
  });

  it('las señales guardan el fragmento de texto que las gatilló', () => {
    const final = estadoFinal('desconocido', 'Necesito que me confirme su clave dinámica.');
    expect(final.senales[0].fragmento.toLowerCase()).toContain('clave');
  });
});
