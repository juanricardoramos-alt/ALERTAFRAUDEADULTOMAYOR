/**
 * GuardIA — Reglas locales de detección de fraude telefónico (Fase 1).
 *
 * Cada regla busca CONDUCTAS en la conversación (qué pide el que llama),
 * no juzga quién llama. Los patrones se evalúan sobre texto "normalizado":
 * minúsculas y sin tildes ni eñes (ver normalizar() en analizador.ts).
 * Por eso los patrones se escriben como "contrasena", "codigo", "senora".
 */

export type TipoLlamante = 'contacto' | 'institucional' | 'desconocido';

export type NivelRiesgo = 'verde' | 'amarillo' | 'naranja' | 'rojo';

export type CategoriaSenal = 'critica' | 'manipulacion';

export interface Regla {
  id: string;
  categoria: CategoriaSenal;
  /** Texto corto que se muestra en pantalla y en la alerta a la familia. */
  descripcion: string;
  puntos: number;
  /**
   * Una señal "absoluta" se vigila INCLUSO en llamadas verdes (contactos o
   * números institucionales verificados). Es la protección anti-spoofing:
   * ningún banco real pide claves, códigos SMS ni datos de tarjeta por
   * teléfono, así que si un "600 del banco" lo hace → alerta roja igual.
   */
  absoluta: boolean;
  patrones: RegExp[];
}

/** Puntaje desde el cual la llamada pasa a NARANJA (pregunta de verificación). */
export const UMBRAL_NARANJA = 25;
/** Puntaje desde el cual la llamada pasa a ROJO (posible estafa + alerta familiar). */
export const UMBRAL_ROJO = 50;

const CRITICA = 50; // una sola señal crítica basta para llegar a rojo
const MANIPULACION = 15; // se necesitan varias señales de manipulación

export const REGLAS: Regla[] = [
  // ─── Señales CRÍTICAS: peticiones que ningún actor legítimo hace ───────
  {
    id: 'pide_clave',
    categoria: 'critica',
    descripcion: 'Pide clave, PIN o contraseña',
    puntos: CRITICA,
    absoluta: true,
    patrones: [
      /\b(deme|dame|digame|dime|necesito|entregue(me)?|indique(me)?|confirme(me)?|ingrese|digite|me\s+(da|dice|indica|confirma|entrega)|cual\s+es)\b[^.!?]{0,60}\b(clave|contrasena|password|pin)\b/,
      /\b(clave|contrasena|pin)\b[^.!?]{0,50}\b(me\s+la\s+(da|dice|entrega|confirma)|por\s+telefono|para\s+(verificar|confirmar|validar|revertir|desbloquear))/,
      /\bclave\s+dinamica\b/,
      /\bcoordenadas\s+de\s+(su\s+|la\s+)?tarjeta\b/,
    ],
  },
  {
    id: 'pide_codigo_sms',
    categoria: 'critica',
    descripcion: 'Pide un código que llegó por SMS',
    puntos: CRITICA,
    absoluta: true,
    patrones: [
      /\bcodigo\b[^.!?]{0,60}\b(sms|mensaje|texto|celular|telefono|llego|llegara|va\s+a\s+llegar|enviamos|mandamos)\b/,
      /\b(le\s+llego|le\s+(enviamos|mandamos)|recibio|le\s+acaba\s+de\s+llegar)\b[^.!?]{0,40}\bcodigo\b/,
      /\b(leame|me\s+lee|digame|deme|dicteme|indiqueme)\b[^.!?]{0,40}\bcodigo\b/,
    ],
  },
  {
    id: 'pide_datos_tarjeta',
    categoria: 'critica',
    descripcion: 'Pide número de tarjeta, CVV o vencimiento',
    puntos: CRITICA,
    absoluta: true,
    patrones: [
      /\bnumero\s+de\s+(su\s+|la\s+)?tarjeta\b/,
      /\b(cvv|cvc)\b/,
      /\bcodigo\s+de\s+seguridad\b/,
      /\bfecha\s+de\s+(vencimiento|expiracion)\b/,
      /\b(tres|3)\s+(digitos|numeros)\s+(de\s+atras|detras|al\s+reverso)\b/,
    ],
  },
  {
    id: 'pide_transferencia',
    categoria: 'critica',
    descripcion: 'Pide transferir, depositar o girar dinero',
    puntos: CRITICA,
    absoluta: false, // un banco real sí puede hablar de transferencias
    patrones: [
      /\b(transfiera(me)?|transferir|deposite(me)?|gire(me)?|girar)\b/,
      /\b(hacer|haga|haces|realizar|realice)\s+(una\s+|la\s+|un\s+|el\s+)?(transferencia|deposito|giro)\b/,
      /\b(mandar|enviar|pasar)\s+(la\s+)?(plata|dinero)\b/,
      /\bvaya\s+(a\s+un|al)\s+(cajero|banco|servipag|caja\s+vecina)\b/,
    ],
  },
  {
    id: 'pide_gift_cards',
    categoria: 'critica',
    descripcion: 'Pide comprar tarjetas de regalo',
    puntos: CRITICA,
    absoluta: true,
    patrones: [/\btarjetas?\s+de\s+regalo\b/, /\bgift\s*cards?\b/],
  },
  {
    id: 'pide_acceso_remoto',
    categoria: 'critica',
    descripcion: 'Pide instalar una app o dar acceso remoto',
    puntos: CRITICA,
    absoluta: true,
    patrones: [
      /\b(anydesk|teamviewer)\b/,
      /\bacceso\s+remoto\b/,
      /\bcontrol\s+(remoto|de\s+su\s+(telefono|celular|computador|equipo))\b/,
      /\b(instale|instalar|descargue|descargar|baje|bajar)\b[^.!?]{0,40}\b(aplicacion|app|programa)\b/,
    ],
  },

  // ─── Señales de MANIPULACIÓN: tácticas de presión típicas de estafa ────
  {
    id: 'urgencia',
    categoria: 'manipulacion',
    descripcion: 'Urgencia extrema',
    puntos: MANIPULACION,
    absoluta: false,
    patrones: [
      /\b(ahora\s+mismo|ya\s+mismo|de\s+inmediato|inmediatamente|es\s+urgente|urgencia|en\s+este\s+(mismo\s+)?momento)\b/,
      /\btiene\s+(solo\s+)?\w+\s+minutos\b/,
      /\b(antes\s+de\s+que\s+sea\s+tarde|o\s+(pierde|perdera)\s+(todo|su\s+(plata|dinero)))\b/,
      /\bsolo\s+por\s+hoy\b/,
    ],
  },
  {
    id: 'secretismo',
    categoria: 'manipulacion',
    descripcion: 'Pide secreto o que no corte',
    puntos: MANIPULACION,
    absoluta: false,
    patrones: [
      /\bno\s+le\s+(diga|cuente|comente)\s+(nada\s+)?a\s+nadie\b/,
      /\bno\s+(le|les)\s+(diga|cuente|comente)\s+nada\b/,
      /\bno\s+se\s+lo\s+(diga|cuente|comente)\b/,
      /\b(es\s+)?(confidencial|secreto)\b/,
      /\bno\s+(corte|cuelgue)\b/,
      /\bmantengase\s+en\s+(la\s+)?linea\b/,
    ],
  },
  {
    id: 'suplantacion_institucion',
    categoria: 'manipulacion',
    descripcion: 'Dice ser banco, policía o empresa',
    puntos: MANIPULACION,
    absoluta: false,
    patrones: [
      /\b(le\s+hablo|le\s+hablamos|lo\s+llamo|lo\s+llamamos|la\s+llamo|la\s+llamamos|llamando)\s+de(l|sde)?\s+(el\s+)?banco\b/,
      /\b(departamento|area|unidad|seccion)\s+de\s+(seguridad|fraudes?|riesgo)\b/,
      /\bsomos\s+de\s+la\s+(pdi|policia|fiscalia)\b/,
      /\b(pdi|carabineros|investigaciones|fiscalia)\b/,
      /\bservicio\s+de\s+impuestos\b/,
      /\bcompania\s+de\s+(luz|agua|telefono|gas)\b/,
    ],
  },
  {
    id: 'suplantacion_familiar',
    categoria: 'manipulacion',
    descripcion: 'Dice ser un familiar (nieto, hijo)',
    puntos: 20, // el "cuento del tío" parte casi siempre así
    absoluta: false,
    patrones: [
      /\b(soy|habla)\s+(su|tu)\s+(niet[oa]|hij[oa]|sobrin[oa])\b/,
      /\babuel(o|a|ito|ita)\s*,?\s+soy\s+yo\b/,
      /\bsoy\s+yo\s*,?\s+(su|tu)\s+(niet[oa]|hij[oa])\b/,
      /\bno\s+(me\s+)?reconoce(s)?\s*(la\s+voz)?\b/,
    ],
  },
  {
    id: 'numero_nuevo',
    categoria: 'manipulacion',
    descripcion: '"Este es mi número nuevo"',
    puntos: MANIPULACION,
    absoluta: false,
    patrones: [
      /\b(numero\s+nuevo|nuevo\s+numero)\b/,
      /\bcambie\s+de\s+(numero|celular|telefono)\b/,
      /\b(se\s+me\s+(echo\s+a\s+perder|perdio|rompio)|perdi)\s+(el|mi)\s+(celular|telefono)\b/,
    ],
  },
  {
    id: 'pariente_apuros',
    categoria: 'manipulacion',
    descripcion: 'Dice estar en problemas y necesitar plata',
    puntos: 20,
    absoluta: false,
    patrones: [
      /\bestoy\s+(preso|detenid[oa]|en\s+problemas|en\s+un\s+apuro|hospitalizad[oa]|en\s+la\s+comisaria)\b/,
      /\btuve\s+un\s+accidente\b/,
      /\bnecesito\s+(plata|dinero)\s+urgente\b/,
      /\b(pagar\s+la\s+fianza|sacarme\s+de\s+aqui)\b/,
    ],
  },
  {
    id: 'amenaza',
    categoria: 'manipulacion',
    descripcion: 'Amenaza (detención, bloqueo, corte)',
    puntos: MANIPULACION,
    absoluta: false,
    patrones: [
      /\b(orden\s+de\s+(arresto|detencion|embargo)|sera\s+detenid[oa]|va\s+a\s+ser\s+detenid[oa])\b/,
      /\b(demanda|demandad[oa]|multa)\b/,
      /\b(cuenta|tarjeta)\s+(sera\s+|va\s+a\s+ser\s+)?(bloqueada|suspendida|congelada)\b/,
      /\b(bloquear(emos)?|suspender(emos)?)\s+(su|la)\s+(cuenta|tarjeta|linea)\b/,
      /\bcorte\s+de(l)?\s+(servicio|suministro|luz|agua)\b/,
      /\b(clonada|clonaron|comprometida|hackeada|hackeado|uso\s+fraudulento|compras\s+sospechosas|movimientos\s+(sospechosos|extranos))\b/,
    ],
  },
  {
    id: 'premio_inesperado',
    categoria: 'manipulacion',
    descripcion: 'Premio, herencia o dinero inesperado',
    puntos: MANIPULACION,
    absoluta: false,
    patrones: [
      /\b(se\s+gano|usted\s+gano|ha\s+ganado|salio\s+(ganador|premiad[oa]))\b/,
      /\b(premio|sorteo|loteria|kino|herencia)\b/,
      /\b(le\s+corresponde|tiene)\s+(un\s+)?(pago|reembolso|devolucion)\s+(pendiente|a\s+su\s+favor)\b/,
    ],
  },
];
