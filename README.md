# 🛡️ Custovia — Alerta de fraude telefónico para adultos mayores

> **Custovia** se lee "Custov-IA": evoca *custodia* —resguardo, protección—
> con la IA adentro.

Prototipo de una app que protege a adultos mayores de estafas telefónicas
(el falso "nieto en apuros", falsos bancos, falsa PDI, premios inexistentes)
y que —esa es la gracia— avisa a la familia **en el momento**, no después.

**Estado actual: Fase 4 (app de la familia + alertas reales).** Una sola
app con dos modos: **abuelito** (el semáforo con cerebro de dos capas:
reglas locales + IA de Claude) y **familia** (vinculación por código,
alarma configurable tipo despertador, historial). Cuando el semáforo llega
a ROJO, la alerta viaja por Supabase en tiempo real a todos los familiares
vinculados, con el motivo y el fragmento sospechoso. Cada pieza es
opcional: sin API key la IA se apaga, sin Supabase las alertas quedan
simuladas — el semáforo protege igual.

---

## Cómo probarla en tu teléfono (5 minutos)

1. Instala **Node.js** (versión 20 o superior) en tu computador: <https://nodejs.org>
2. Instala la app **Expo Go** en tu teléfono (App Store o Google Play).
3. En una terminal, dentro de esta carpeta:

   ```bash
   npm install
   npx expo start
   ```

   > **Nota de compatibilidad**: el proyecto usa **Expo SDK 54** a propósito,
   > porque es la versión que soporta la app Expo Go disponible hoy en la
   > App Store y Google Play (las versiones más nuevas de Expo Go llevan
   > meses esperando aprobación de Apple). No lo subas de versión mientras
   > pruebes con Expo Go.

4. Aparecerá un código QR en la terminal:
   - **Android**: abre Expo Go y escanea el QR.
   - **iPhone**: escanea el QR con la cámara y toca la notificación.
   - Si el teléfono no encuentra el servidor (redes distintas), usa
     `npx expo start --tunnel`.

5. En la app: elige quién llama, toca un **ejemplo** (por ejemplo
   "🏦 Falso banco") y presiona **▶️ INICIAR LLAMADA SIMULADA**. Verás la
   transcripción avanzando por bloques, el puntaje de riesgo subiendo y, al
   cruzar el umbral, la pantalla roja de **¡POSIBLE ESTAFA!** con vibración
   y aviso de voz.

## Activar la IA de Claude (Fase 2, opcional pero recomendado)

Sin este paso la app funciona igual, solo con las reglas locales.

1. **Crea tu API key** (una sola vez):
   - Entra a <https://console.anthropic.com> y crea una cuenta.
   - Carga un saldo pequeño en **Billing** (con US$5 sobra para meses de
     pruebas: cada análisis de llamada cuesta ~1 centavo de dólar).
   - En **API Keys** → *Create Key*. Cópiala entera (empieza con `sk-ant-`).

2. **Configúrala en el proyecto**:

   ```bash
   # en la carpeta del proyecto (Windows PowerShell: usa "copy" en vez de "cp")
   cp .env.example .env
   ```

   Abre el archivo `.env` y pega tu key después del `=`. Ese archivo está
   en `.gitignore`: **nunca** se sube a GitHub ni queda en el código.

3. **Prueba la conexión** (sin necesidad del teléfono):

   ```bash
   npm run probar-ia
   ```

   Envía una estafa "sutil" de prueba y muestra el veredicto de la IA.

4. **Reinicia la app** con `npx expo start --clear` y prueba los ejemplos
   marcados como *(sutil, para la IA)*: las reglas solas los dejan en
   amarillo, pero la IA los detecta y dispara la alerta.

> ⚠️ **Nota para producción**: con el prefijo `EXPO_PUBLIC_` la key queda
> dentro de la app compilada. Para un prototipo personal está bien; antes
> de publicar la app, la key se mueve a un servidor propio (Fase 4).

## Activar la app de la familia (Fase 4, con Supabase)

**Piezas de Supabase que usamos** (todo dentro del plan gratuito):
**Postgres** guarda la vinculación y el historial (3 tablas chicas);
**Realtime** lleva cada alerta al instante de un teléfono al otro. No
usamos Supabase Auth todavía: el código de vinculación de 6 letras hace de
secreto (menos pantallas y costo cero; Auth llega antes de un lanzamiento
real). Las push con la app cerrada usan el servicio gratuito de Expo.

### 1. Crear el proyecto en Supabase (una vez, ~5 min)

1. En <https://supabase.com/dashboard> crea un proyecto (plan Free).
2. **SQL Editor → New query** → pega el contenido completo del archivo
   [`supabase/esquema.sql`](supabase/esquema.sql) → **Run**. Eso crea las
   tablas, el tiempo real y las políticas de acceso del prototipo.
3. **Settings → API**: copia la *Project URL* y la clave *anon public*.

### 2. Pegar las claves en el `.env`

En el `.env` (el mismo de la API key de Claude; si no existe, copia
`.env.example`):

```
EXPO_PUBLIC_SUPABASE_URL=https://TUPROYECTO.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJ...
```

La clave `anon` está diseñada para usarse en apps. La `service_role`
**jamás** va en la app. El `.env` sigue fuera de GitHub.

### 3. Probar el flujo completo (con Expo Go, hoy mismo)

Necesitas 2 teléfonos (o un teléfono + otro a mano de un familiar):

1. `npx expo start --clear` y abre la app en ambos teléfonos.
2. **Teléfono del abuelito**: elige "Es mi teléfono". En la tarjeta
   "👨‍👩‍👧 Tu familia" aparece el **código de 6 letras** (ponle nombre, p. ej.
   "Rosa").
3. **Teléfono del familiar**: elige "Soy familiar", escribe el código, tu
   nombre y (opcional) el teléfono del abuelito para el botón LLAMAR.
4. En el tablero del familiar: configura tu alarma (sonido, volumen,
   vibración, botón *Probar*) y toca **"Enviar alerta de prueba"** → debe
   sonar la alarma en ese mismo teléfono (viajó a Supabase y volvió).
5. La prueba de verdad: en el teléfono del abuelito corre el ejemplo
   "🏦 Falso banco" del modo simulación. Al llegar a ROJO → en el teléfono
   del familiar irrumpe la alarma con el motivo y el botón de llamar.

> En Expo Go esto funciona **con la app de la familia abierta** (Realtime).
> Para recibir alertas con la app cerrada, sigue el paso 4.

### 4. Push con la app cerrada (development build con EAS, gratis)

Expo Go ya no soporta notificaciones push; se necesita compilar una
versión de desarrollo (gratis con EAS):

```bash
npm install -g eas-cli
eas login          # cuenta gratuita de expo.dev
eas init           # crea el proyecto EAS (responde que sí)
eas build --profile development --platform android
```

Al terminar (~15 min en la nube), instala el APK del enlace en el teléfono
Android del familiar, ábrelo con `npx expo start`, vuelve a vincularte, y
las alertas llegarán **aunque la app esté cerrada**, por el canal del
sonido que ese familiar eligió.

> **iPhone, honesto**: instalar development builds con push en iOS exige la
> membresía de pago de Apple Developer (US$99/año). Para el MVP: prueba
> push en un Android (gratis) y usa el iPhone con Expo Go (Realtime con la
> app abierta funciona perfecto). Cuando haya presupuesto, el mismo
> comando con `--platform ios` lo resuelve.

## Cómo correr los tests del cerebro

```bash
npm test
```

Son 48 pruebas automáticas. De la Fase 4: códigos de vinculación sin
caracteres confundibles; mensajes push armados por familiar con el canal de
su sonido; el resumen de alerta prioriza el motivo de la IA; la config de
alarma se repara sola si está corrupta. De la Fase 1: estafas clásicas → rojo;
repartidor honesto de número desconocido → nunca rojo; número institucional
clonado que pide datos → rojo igual (anti-spoofing); contacto de confianza →
verde siempre. De la Fase 2: la IA solo puede subir el riesgo, nunca
bajarlo; sin internet el estado de reglas queda intacto; control de costos
(no se llama a la IA para contactos ni cuando ya hay rojo); y los casos
sutiles de verdad se les escapan a las reglas (para que la demo de la IA
tenga sentido). Los tests no llaman a la API real: corren gratis y sin
internet.

---

## Cómo está organizado el código

```
App.tsx                        ← elige el modo (abuelito / familia)
metro.config.js                ← ajuste del empaquetador para la librería de la IA
eas.json                       ← perfil del development build (push)
supabase/esquema.sql           ← tablas + Realtime (pegar en Supabase una vez)
scripts/
  probar-ia.mjs                ← prueba tu API key desde el computador
  generar-sonidos.mjs          ← regenera los sonidos de alarma (WAV propios)
assets/sonidos/                ← clasica / sirena / campana
src/
  brain/                       ← el "cerebro" (lógica pura, sin interfaz)
    reglas.ts                  ← capa 1: señales por palabras clave y puntajes
    analizador.ts              ← normaliza, segmenta y puntúa por bloques
    ia.ts                      ← capa 2: análisis con la API de Claude
    ejemplos.ts                ← conversaciones de demo (incluye las sutiles)
  servicios/                   ← Fase 4 (Supabase, push, alarma, perfil)
    logica.ts                  ← lo puro y testeable (códigos, mensajes push…)
    supabase.ts / vinculacion.ts / alertas.ts
    notificaciones.ts / alarma.ts / perfil.ts
  components/
    PantallaModo.tsx           ← ¿teléfono del abuelito o del familiar?
    PantallaInicio.tsx         ← simulación + tarjeta "Tu familia" (código)
    PantallaLlamada.tsx        ← LA pantalla del abuelito (semáforo)
    PantallaFamilia.tsx        ← vinculación, alarma, prueba, historial
    PantallaAlarma.tsx         ← la alarma que irrumpe en el teléfono familiar
    TarjetaFamilia.tsx         ← código de vinculación del abuelito
```

El cerebro recibe **texto**, venga de donde venga (simulación hoy;
reconocimiento de voz o VoIP mañana). Así el mismo motor sirve para todas
las vías de acceso al audio.

### Cómo funciona el puntaje

- El texto se analiza en **bloques** (~10-15 segundos de conversación).
- Señales **críticas** (+50): pedir claves/PIN, códigos SMS, datos de
  tarjeta, transferencias, gift cards, acceso remoto. Una sola basta para
  llegar a rojo.
- Señales de **manipulación** (+15 a +20): urgencia, secretismo,
  suplantación ("soy tu nieto", "del banco"), "número nuevo", amenazas,
  premios. Se necesitan varias para escalar.
- Umbrales: **25 = naranja** (se sugiere una pregunta de verificación),
  **50 = rojo** (posible estafa + alerta a la familia).
- Cada señal suma **una sola vez** por llamada.
- **Filtro por número**: contactos y números institucionales (600) parten
  en verde y solo se vigilan señales *absolutas* (ningún banco real pide
  claves por teléfono) → protección anti-spoofing. Números desconocidos
  parten en amarillo y se analiza todo.
- **Capa de IA** (números desconocidos): tras cada bloque, la conversación
  acumulada se envía a la API de Claude, que responde un nivel
  (`ninguno`/`bajo` +12/`medio` +35/`alto` +70) y un motivo en una frase.
  El puntaje final es el **mayor** entre reglas e IA; la IA nunca baja el
  riesgo. Costos cuidados: no se consulta para contactos, se deja de
  consultar al llegar a rojo, y el prompt fijo aprovecha el caché de la API.
- **Regla de oro**: la IA **nunca** cuelga la llamada. Solo pinta la
  pantalla, vibra y avisa. Colgar es siempre decisión humana.

---

## Plan de fases

- ✅ **Fase 1 — Prototipo con simulación**: semáforo, cerebro de reglas
  locales, modo simulación por texto, tests.
- ✅ **Fase 2 — Análisis con matices** (esta versión): la API de Claude
  como segunda capa del cerebro, con las reglas locales como respaldo
  instantáneo. Detecta manipulación emocional y recolección de datos.
- ⬜ **Fase 3 — Voz**: reconocimiento de voz del dispositivo (modo
  altavoz) alimentando el mismo cerebro.
- ✅ **Fase 4 — App de la familia** (esta versión): modo familia en la
  misma app, vinculación por código, alertas en tiempo real vía Supabase,
  alarma tipo despertador configurable (sonido/volumen/vibración),
  historial, falsa alarma, y push con development build de EAS.
  Pendiente de la Fase 4: directorio de números de confianza sincronizado.
- ⬜ **Fase 5 — Acceso a llamadas reales**: número virtual VoIP, o
  alianza con operador. (Ni iOS ni Android permiten escuchar llamadas
  nativas por privacidad.)

**Ideas guardadas para después** (ver
[`docs/IDEAS-PENDIENTES.md`](docs/IDEAS-PENDIENTES.md)): sugerir el
altavoz automáticamente en llamadas de desconocidos, y reportes
periódicos para la familia de las llamadas revisadas. Orden acordado:
probar Fases 2 y 4 → rediseño accesible → estas ideas, de a una.

## Privacidad desde el diseño

- El audio se descarta al instante; solo se procesa texto.
- Solo se guardan los fragmentos con riesgo; el resto se borra.
- Aviso al contestar: "esta llamada está siendo supervisada por un
  sistema de seguridad".
- Procesamiento local en el teléfono siempre que sea posible.
