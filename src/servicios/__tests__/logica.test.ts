/**
 * Tests de la lógica pura de la Fase 4 (vinculación y alertas).
 * Se corren con: npm test — sin red, sin Supabase, sin teléfono.
 */

import { analizarBloque, crearAnalisis } from '../../brain/analizador';
import {
  codigoValido,
  completarConfigAlarma,
  CONFIG_ALARMA_DEFECTO,
  construirMensajesPush,
  generarCodigo,
  LARGO_CODIGO,
  normalizarCodigo,
  resumenParaAlerta,
} from '../logica';

describe('código de vinculación', () => {
  it('genera códigos del largo correcto y sin caracteres confundibles', () => {
    for (let i = 0; i < 200; i++) {
      const codigo = generarCodigo();
      expect(codigo).toHaveLength(LARGO_CODIGO);
      // Sin 0/O ni 1/I/L, que se confunden al dictarlos por teléfono.
      expect(codigo).not.toMatch(/[01OIL]/);
      expect(codigoValido(codigo)).toBe(true);
    }
  });

  it('normaliza lo que escribe el familiar (espacios, guiones, minúsculas)', () => {
    expect(normalizarCodigo('  ab c-def ')).toBe('ABCDEF');
    expect(normalizarCodigo('xyz-234')).toBe('XYZ234');
  });

  it('rechaza códigos con formato inválido', () => {
    expect(codigoValido('ABC')).toBe(false);
    expect(codigoValido('ABCDEFG')).toBe(false);
    expect(codigoValido('ABC10D')).toBe(false); // contiene 1 y 0
    expect(codigoValido('')).toBe(false);
  });
});

describe('configuración de la alarma', () => {
  it('completa una config vacía con los valores por defecto', () => {
    expect(completarConfigAlarma(null)).toEqual(CONFIG_ALARMA_DEFECTO);
    expect(completarConfigAlarma({})).toEqual(CONFIG_ALARMA_DEFECTO);
  });

  it('conserva los valores válidos y corrige los inválidos', () => {
    expect(completarConfigAlarma({ sonido: 'sirena', volumen: 0.4, vibrar: false })).toEqual({
      sonido: 'sirena',
      volumen: 0.4,
      vibrar: false,
    });
    expect(completarConfigAlarma({ sonido: 'reggaeton', volumen: 7 })).toEqual(
      CONFIG_ALARMA_DEFECTO
    );
  });
});

describe('resumen para la alerta (lo que ve la familia)', () => {
  it('prioriza el motivo de la IA cuando existe', () => {
    const estado = analizarBloque(
      crearAnalisis('desconocido'),
      'Necesito que me confirme su clave dinámica.'
    );
    const resumen = resumenParaAlerta(estado, {
      nivel: 'alto',
      motivo: 'Pide la clave del banco por teléfono',
    });
    expect(resumen.motivo).toBe('Pide la clave del banco por teléfono');
    expect(resumen.fragmento).toContain('clave');
  });

  it('sin IA, usa la descripción de la última señal de las reglas', () => {
    const estado = analizarBloque(
      crearAnalisis('desconocido'),
      'Debe comprar tarjetas de regalo hoy mismo.'
    );
    const resumen = resumenParaAlerta(estado, null);
    expect(resumen.motivo).toContain('tarjetas de regalo');
  });

  it('sin señales ni IA, entrega un motivo genérico y no explota', () => {
    const resumen = resumenParaAlerta(crearAnalisis('desconocido'), null);
    expect(resumen.motivo.length).toBeGreaterThan(0);
    expect(resumen.fragmento).toBe('');
  });
});

describe('mensajes push de Expo', () => {
  const familiares = [
    { push_token: 'ExponentPushToken[aaa]', sonido: 'sirena' },
    { push_token: null, sonido: 'clasica' }, // sin token (Expo Go): solo Realtime
    { push_token: 'ExponentPushToken[bbb]', sonido: 'inventado' }, // sonido corrupto
  ];

  it('arma un mensaje por familiar con token, con el canal de SU sonido', () => {
    const mensajes = construirMensajesPush(familiares, 'Rosa', 'Pide claves por teléfono', false);
    expect(mensajes).toHaveLength(2);
    expect(mensajes[0]).toMatchObject({
      to: 'ExponentPushToken[aaa]',
      title: '🚨 ¡Posible estafa a Rosa!',
      body: 'Pide claves por teléfono',
      priority: 'high',
      channelId: 'alertas-sirena',
    });
    // Un sonido desconocido cae al canal de la alarma clásica.
    expect(mensajes[1].channelId).toBe('alertas-clasica');
  });

  it('las alertas de prueba se distinguen en el título', () => {
    const mensajes = construirMensajesPush(familiares, 'Rosa', 'Prueba', true);
    expect(mensajes[0].title).toContain('Prueba de alerta');
    expect(mensajes[0].title).not.toContain('estafa');
  });

  it('sin familiares con token, no se envía nada (y no explota)', () => {
    expect(construirMensajesPush([], 'Rosa', 'x', false)).toEqual([]);
    expect(
      construirMensajesPush([{ push_token: null, sonido: 'clasica' }], 'Rosa', 'x', false)
    ).toEqual([]);
  });
});
