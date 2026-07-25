# 💡 Custovia — Funciones pendientes (ideas guardadas)

Ideas del fundador para fases futuras. **No construir todavía.**

Orden acordado:
1. Probar lo ya construido: Fase 2 (IA con API key real) y Fase 4 (familia
   con Supabase en dos teléfonos).
2. Rediseño accesible.
3. Recién entonces estas dos funciones, **de a una**, sin romper la lógica
   ni los tests existentes.

---

## Idea 1 — Altavoz sugerido automáticamente en llamadas desconocidas

**Qué es:** cuando entra una llamada de un número desconocido, la app
muestra al instante un aviso grande y claro sugiriéndole al adulto mayor
que active el altavoz, para que Custovia pueda escuchar la conversación y
ayudar a detectar estafas.

**Por qué importa:** resuelve el problema de "cómo lograr que el abuelito
ponga el altavoz". En vez de depender de que se acuerde, la app lo guía
justo en el momento de riesgo. Convierte una limitación técnica (la app no
puede activar el altavoz sola) en una experiencia guiada y natural.

**Flujo imaginado:**
1. Suena una llamada de número desconocido.
2. Custovia muestra un aviso grande: *"⚠️ Número desconocido. Por tu
   seguridad, activa el altavoz para que yo pueda ayudarte a detectar
   estafas."*
3. El adulto mayor pone el altavoz (botón que ya conoce).
4. Custovia escucha por el micrófono, transcribe y analiza. Si detecta
   estafa → semáforo rojo + alerta a la familia.

**Depende de (por eso es fase futura):**
- Acceso al número de la llamada entrante (CallKit en iPhone / API de
  llamadas en Android).
- Captura de audio por micrófono en modo altavoz (Fase 3 de voz).
- Compilar la app de verdad (no funciona en Expo Go).

**Nota honesta:** la app sugiere el altavoz pero no puede activarlo por el
usuario. Esta idea hace ese gesto lo más fácil y oportuno posible, que es
el máximo alcanzable con las reglas de iOS/Android.

### Notas técnicas (para cuando se construya)

- **El cerebro ya está listo para esto**: `src/brain/` recibe texto de
  cualquier fuente. Esta idea solo agrega (a) el gatillo "llamada entrante
  de desconocido" y (b) la fuente de audio → transcripción de la Fase 3.
- **Detección de llamada entrante**: en Android existe
  `CallScreeningService` / `PhoneStateListener` (requiere permisos
  sensibles y revisión de Google Play); en iOS, CallKit solo permite
  identificar/bloquear números (Call Directory), no observar llamadas en
  vivo desde otra app. Realismo: Android primero, iPhone después con la
  vía VoIP (Fase 5).
- **El aviso en sí es trivial** una vez detectada la llamada: es una
  pantalla más del modo abuelito (mismo estilo del semáforo: gigante,
  ícono + texto + una sola acción).
- Requiere development build con módulos nativos (config plugins o módulo
  propio); mantener el modo simulación intacto como respaldo de demo.

---

## Idea 2 — Reportes periódicos de llamadas revisadas por la IA

**Qué es:** que Custovia genere un resumen periódico (p. ej. semanal) de
las llamadas que revisó y analizó, y se lo envíe a la familia. Algo como:
*"Esta semana Custovia revisó 12 llamadas de Rosa y marcó 2 números
sospechosos."*

**Por qué importa (doble valor):**
- **Retención / valor percibido**: proteger de algo que "no pasó" es
  difícil de sentir. Un informe periódico muestra el trabajo silencioso de
  la app aunque no haya habido estafas, y mantiene a la familia enganchada.
  Clave para que no cancelen la suscripción durante la prueba gratis y
  después.
- **Evidencia**: la familia tiene un registro de lo que ocurre con las
  llamadas del adulto mayor.

**Contenido imaginado del reporte:**
- Cuántas llamadas se revisaron en el período.
- Cuántas fueron de números conocidos vs. desconocidos.
- Cuántas se marcaron como sospechosas y por qué (el motivo que ya genera
  la IA).
- Si hubo alguna alerta roja, un resumen.

**Cómo entregarlo (elegir lo más simple):**
- Dentro de la app de la familia (una pestaña "Resumen").
- Y/o como un mensaje/notificación al familiar.

**Privacidad:** mostrar solo lo necesario, sin guardar audio, con el
consentimiento del adulto mayor — el mismo principio de todas las fases.

### Notas técnicas (para cuando se construya)

- **Lo que ya existe**: la tabla `alertas` en Supabase registra cada alerta
  roja y de prueba con motivo, fragmento y fecha. Eso ya permite la mitad
  del reporte.
- **Lo que falta**: hoy solo se registran las *alertas*, no todas las
  llamadas *analizadas*. Primer paso de esta idea: una tabla
  `llamadas_revisadas` (abuelito_id, tipo_llamante, nivel_final, fecha —
  sin transcripción, por privacidad) que el modo abuelito escriba al
  terminar cada llamada/simulación. Es un INSERT pequeño; cabe en el plan
  gratuito sin problema.
- **Versión KISS del reporte** (sin servidores ni tareas programadas): la
  pestaña "Resumen" de la app de la familia calcula el período al abrirse,
  con dos consultas a Supabase (conteos por semana). Cero costo extra.
- **Versión con notificación semanal** (después): pg_cron + Edge Function
  de Supabase que arma el resumen y lo manda por push de Expo. Solo cuando
  la versión KISS demuestre valor.
- La redacción del resumen en lenguaje simple puede hacerse con plantillas
  fijas (gratis) y, si se quiere más natural, con una llamada barata a la
  API de Claude reutilizando `src/brain/ia.ts` como referencia.
