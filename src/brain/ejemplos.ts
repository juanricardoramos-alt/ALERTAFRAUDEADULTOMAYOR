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
];
