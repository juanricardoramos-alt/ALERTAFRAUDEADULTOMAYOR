/**
 * Custovia — Conversaciones de ejemplo para el modo simulación.
 * Sirven para demos con familiares, inversionistas y abuelitos de prueba.
 */

import { TipoLlamante } from './reglas';

export interface Ejemplo {
  titulo: string;
  emoji: string;
  tipoLlamante: TipoLlamante;
  texto: string;
}

export const EJEMPLOS: Ejemplo[] = [
  {
    titulo: 'Falso banco (estafa)',
    emoji: '🏦',
    tipoLlamante: 'desconocido',
    texto:
      'Buenas tardes, le hablamos del departamento de seguridad del banco. ' +
      'Detectamos compras sospechosas con su tarjeta y su cuenta será bloqueada en los próximos minutos. ' +
      'Para revertirlo necesito que me confirme su clave dinámica ahora mismo. ' +
      'Le va a llegar un código por SMS, léamelo por favor. ' +
      'No corte, esta llamada es confidencial.',
  },
  {
    titulo: 'Cuento del tío: nieto en apuros (estafa)',
    emoji: '🧑',
    tipoLlamante: 'desconocido',
    texto:
      'Aló, abuelita, soy yo, su nieto. ¿No me reconoce la voz? ' +
      'Cambié de número, este es mi número nuevo, guárdelo. ' +
      'Estoy en un problema grave, tuve un accidente con el auto. ' +
      'Por favor no le diga nada a mis papás, se lo pido. ' +
      'Necesito que me transfiera plata ahora mismo, es urgente.',
  },
  {
    titulo: 'Repartidor real (inofensiva)',
    emoji: '📦',
    tipoLlamante: 'desconocido',
    texto:
      'Aló, ¿hablo con la señora Rosa? La llamo por el despacho de la farmacia. ' +
      'Estoy afuera de su casa con su pedido de remedios. ' +
      '¿Me puede abrir la puerta, por favor? Muchas gracias, que tenga muy buena tarde.',
  },
  {
    titulo: 'Número 600 clonado que pide datos (spoofing)',
    emoji: '🎭',
    tipoLlamante: 'institucional',
    texto:
      'Le hablamos del banco por una actualización de seguridad de su cuenta. ' +
      'Es un proceso rápido. Para validar su identidad, indíqueme el código de seguridad ' +
      'que está detrás de su tarjeta y la fecha de vencimiento.',
  },
  {
    titulo: 'Nieta real llamando (contacto guardado)',
    emoji: '💚',
    tipoLlamante: 'contacto',
    texto:
      'Hola abuelita, ¿cómo está? La llamaba para avisarle que el domingo vamos ' +
      'a ir a almorzar a su casa con los niños. ¿Le llevamos algo? ' +
      'Ya, un abrazo grande, nos vemos el domingo.',
  },

  // ─── Casos SUTILES: sin palabras clave obvias. Las reglas locales casi ──
  // ─── no reaccionan; es la capa de IA (Fase 2) la que debe detectarlos. ──
  {
    titulo: 'Encuesta que junta datos (sutil, para la IA)',
    emoji: '🕵️',
    tipoLlamante: 'desconocido',
    texto:
      'Buenas tardes, don José, ¿cómo está? Lo llamamos por el nuevo beneficio para el adulto mayor de su comuna.\n' +
      'Usted quedó en la lista de vecinos seleccionados, es sin costo.\n' +
      'Para inscribirlo necesito confirmar algunos datos, ¿ya? ¿Me confirma su RUT y su dirección exacta?\n' +
      '¿Y usted vive solito o lo acompaña alguien? ¿A qué hora suele estar en la casa, para la visita del evaluador?',
  },
  {
    titulo: 'Falso nieto con vergüenza (sutil, para la IA)',
    emoji: '🎭',
    tipoLlamante: 'desconocido',
    texto:
      'Aló, ¿abuelita? Tanto tiempo, ¿cómo ha estado?\n' +
      '¿No me va a decir que no sabe quién soy? … Sí, po, ese mismo, el regalón.\n' +
      'Oiga, la llamaba porque ando con un tema medio complicado, me da vergüenza contarle por teléfono.\n' +
      'Es que ando corto de plata y usted es la única que me entiende. No le vaya a comentar a mi mamá eso sí, porque se enoja.\n' +
      'Yo le mando los datos de la cuenta de un amigo que me está ayudando, ¿ya?',
  },
];
