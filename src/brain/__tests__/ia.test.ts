/**
 * Tests de la capa de IA de Custovia (Fase 2).
 * Se corren con: npm test
 *
 * Prueban la lógica pura (interpretación de respuestas, combinación de
 * puntajes, control de costos) SIN llamar a la API real — así los tests
 * corren gratis, rápido y sin internet. La conexión real se prueba con:
 * npm run probar-ia
 */

import {
  analizarBloque,
  crearAnalisis,
  EstadoAnalisis,
  segmentarTranscripcion,
} from '../analizador';
import { EJEMPLOS } from '../ejemplos';
import {
  combinarConIA,
  construirMensajeUsuario,
  debeConsultarIA,
  interpretarVeredicto,
  peorVeredicto,
  PUNTOS_NIVEL_IA,
  VeredictoIA,
} from '../ia';
import { TipoLlamante, UMBRAL_ROJO } from '../reglas';

function estadoFinalReglas(tipo: TipoLlamante, texto: string): EstadoAnalisis {
  let estado = crearAnalisis(tipo);
  for (const bloque of segmentarTranscripcion(texto)) {
    estado = analizarBloque(estado, bloque);
  }
  return estado;
}

function ejemplo(titulo: string) {
  const e = EJEMPLOS.find((x) => x.titulo.includes(titulo));
  if (!e) throw new Error(`No existe el ejemplo "${titulo}"`);
  return e;
}

const veredicto = (nivel: VeredictoIA['nivel'], motivo = 'Motivo de prueba'): VeredictoIA => ({
  nivel,
  motivo,
});

describe('interpretarVeredicto (respuesta de la API → veredicto)', () => {
  it('acepta una respuesta válida', () => {
    const v = interpretarVeredicto(
      '{"nivel": "alto", "motivo": "Pide plata haciéndose pasar por un nieto"}'
    );
    expect(v).toEqual({
      nivel: 'alto',
      motivo: 'Pide plata haciéndose pasar por un nieto',
    });
  });

  it('rechaza JSON malformado sin lanzar error', () => {
    expect(interpretarVeredicto('esto no es json')).toBeNull();
    expect(interpretarVeredicto('')).toBeNull();
    expect(interpretarVeredicto('{"nivel": "alto"')).toBeNull();
  });

  it('rechaza niveles desconocidos o motivo vacío', () => {
    expect(interpretarVeredicto('{"nivel": "altísimo", "motivo": "x"}')).toBeNull();
    expect(interpretarVeredicto('{"nivel": "alto", "motivo": ""}')).toBeNull();
    expect(interpretarVeredicto('{"nivel": "alto"}')).toBeNull();
    expect(interpretarVeredicto('null')).toBeNull();
  });
});

describe('combinarConIA (el puntaje más alto manda)', () => {
  it('IA "alto" dispara el rojo aunque las reglas no vieran nada', () => {
    const reglas = estadoFinalReglas('desconocido', 'Hola, ¿cómo está? Quería conversar.');
    expect(reglas.nivel).toBe('amarillo');

    const combinado = combinarConIA(reglas, veredicto('alto'));
    expect(combinado.nivel).toBe('rojo');
    expect(combinado.puntaje).toBe(PUNTOS_NIVEL_IA.alto);
  });

  it('IA "medio" lleva a naranja y sugiere una pregunta de verificación', () => {
    const reglas = estadoFinalReglas('desconocido', 'Hola, buenas tardes.');
    const combinado = combinarConIA(reglas, veredicto('medio'));
    expect(combinado.nivel).toBe('naranja');
    expect(combinado.preguntaSugerida).toBeTruthy();
  });

  it('la IA nunca BAJA el riesgo que ya marcaron las reglas', () => {
    const reglas = estadoFinalReglas('desconocido', 'Necesito que me confirme su clave dinámica.');
    expect(reglas.nivel).toBe('rojo');

    const combinado = combinarConIA(reglas, veredicto('ninguno'));
    expect(combinado.nivel).toBe('rojo');
    expect(combinado.puntaje).toBe(reglas.puntaje);
  });

  it('sin veredicto (API caída) el estado de reglas queda intacto', () => {
    const reglas = estadoFinalReglas('desconocido', 'Su cuenta será bloqueada hoy.');
    expect(combinarConIA(reglas, null)).toBe(reglas);
  });

  it('en llamadas verdes (contacto/institucional) la IA no interviene', () => {
    const reglas = estadoFinalReglas('contacto', 'Hola abuelita, ¿cómo está?');
    const combinado = combinarConIA(reglas, veredicto('alto'));
    expect(combinado.nivel).toBe('verde');
  });
});

describe('peorVeredicto (el riesgo no baja durante la llamada)', () => {
  it('conserva el veredicto de mayor riesgo', () => {
    const bajo = veredicto('bajo');
    const alto = veredicto('alto');
    expect(peorVeredicto(bajo, alto)).toBe(alto);
    expect(peorVeredicto(alto, bajo)).toBe(alto);
    expect(peorVeredicto(null, bajo)).toBe(bajo);
    expect(peorVeredicto(alto, null)).toBe(alto);
    expect(peorVeredicto(null, null)).toBeNull();
  });
});

describe('debeConsultarIA (control de costos)', () => {
  const KEY_ORIGINAL = process.env.EXPO_PUBLIC_ANTHROPIC_API_KEY;
  beforeEach(() => {
    process.env.EXPO_PUBLIC_ANTHROPIC_API_KEY = 'sk-ant-clave-de-prueba';
  });
  afterAll(() => {
    process.env.EXPO_PUBLIC_ANTHROPIC_API_KEY = KEY_ORIGINAL;
  });

  it('consulta para desconocidos con riesgo aún bajo', () => {
    expect(debeConsultarIA('desconocido', 0, null)).toBe(true);
    expect(debeConsultarIA('desconocido', 30, veredicto('bajo'))).toBe(true);
  });

  it('NO consulta para contactos ni institucionales', () => {
    expect(debeConsultarIA('contacto', 0, null)).toBe(false);
    expect(debeConsultarIA('institucional', 0, null)).toBe(false);
  });

  it('NO consulta si las reglas ya marcaron rojo (no hay nada que confirmar)', () => {
    expect(debeConsultarIA('desconocido', UMBRAL_ROJO, null)).toBe(false);
  });

  it('NO consulta si la propia IA ya marcó alto', () => {
    expect(debeConsultarIA('desconocido', 10, veredicto('alto'))).toBe(false);
  });

  it('NO consulta si no hay API key configurada', () => {
    process.env.EXPO_PUBLIC_ANTHROPIC_API_KEY = '';
    expect(debeConsultarIA('desconocido', 0, null)).toBe(false);
  });
});

describe('los ejemplos sutiles de verdad se les escapan a las reglas', () => {
  // Esto protege la demo: si un cambio futuro en las reglas hiciera que
  // estos casos ya no fueran "sutiles", el test avisa.
  it('la encuesta que junta datos queda en amarillo con las reglas solas', () => {
    const final = estadoFinalReglas('desconocido', ejemplo('Encuesta que junta datos').texto);
    expect(final.nivel).toBe('amarillo');
  });

  it('el falso nieto con vergüenza no llega a rojo con las reglas solas', () => {
    const final = estadoFinalReglas('desconocido', ejemplo('Falso nieto con vergüenza').texto);
    expect(final.puntaje).toBeLessThan(UMBRAL_ROJO);
  });

  it('pero con IA "alto" ambos disparan la alerta roja', () => {
    for (const titulo of ['Encuesta que junta datos', 'Falso nieto con vergüenza']) {
      const reglas = estadoFinalReglas('desconocido', ejemplo(titulo).texto);
      expect(combinarConIA(reglas, veredicto('alto')).nivel).toBe('rojo');
    }
  });
});

describe('construirMensajeUsuario', () => {
  it('incluye la transcripción completa delimitada', () => {
    const mensaje = construirMensajeUsuario('Aló, ¿me confirma su RUT?');
    expect(mensaje).toContain('Aló, ¿me confirma su RUT?');
    expect(mensaje).toContain('"""');
  });
});
