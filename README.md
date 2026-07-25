# 🛡️ Custovia — Alerta de fraude telefónico para adultos mayores

> **Custovia** se lee "Custov-IA": evoca *custodia* —resguardo, protección—
> con la IA adentro.

Prototipo de una app que protege a adultos mayores de estafas telefónicas
(el falso "nieto en apuros", falsos bancos, falsa PDI, premios inexistentes)
y que —esa es la gracia— avisa a la familia **en el momento**, no después.

**Estado actual: Fase 1 (modo simulación).** La app del abuelito ya funciona
con su semáforo de riesgo a pantalla completa, y el "cerebro" de análisis
detecta las estafas clásicas chilenas usando reglas locales. La conversación
se ingresa como texto (simulando la transcripción de una llamada).

---

## Cómo probarla en tu teléfono (5 minutos)

1. Instala **Node.js** (versión 20 o superior) en tu computador: <https://nodejs.org>
2. Instala la app **Expo Go** en tu teléfono (App Store o Google Play).
3. En una terminal, dentro de esta carpeta:

   ```bash
   npm install
   npx expo start
   ```

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

## Cómo correr los tests del cerebro

```bash
npm test
```

Son 19 pruebas automáticas que verifican los casos clave del diseño:
estafas clásicas → rojo; repartidor honesto de número desconocido → nunca
rojo; número institucional clonado que pide datos → rojo igual
(anti-spoofing); contacto de confianza → verde siempre.

---

## Cómo está organizado el código

```
App.tsx                        ← une las dos pantallas
src/
  brain/                       ← el "cerebro" (lógica pura, sin interfaz)
    reglas.ts                  ← las señales de fraude y sus puntajes
    analizador.ts              ← normaliza, segmenta y puntúa por bloques
    ejemplos.ts                ← conversaciones de demo
    __tests__/analizador.test.ts
  components/
    PantallaInicio.tsx         ← configurar la simulación (para la demo)
    PantallaLlamada.tsx        ← LA pantalla del abuelito (semáforo)
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
- **Regla de oro**: la IA **nunca** cuelga la llamada. Solo pinta la
  pantalla, vibra y avisa. Colgar es siempre decisión humana.

---

## Plan de fases

- ✅ **Fase 1 — Prototipo con simulación** (esta versión): semáforo,
  cerebro de reglas locales, modo simulación por texto, tests.
- ⬜ **Fase 2 — Análisis con matices**: integrar la API de Claude
  (Anthropic) sobre las reglas locales, para entender contexto y tono.
- ⬜ **Fase 3 — Voz**: reconocimiento de voz del dispositivo (modo
  altavoz) alimentando el mismo cerebro.
- ⬜ **Fase 4 — App de la familia**: vinculación, números de confianza,
  alertas push en tiempo real, historial, botón de falsa alarma
  (backend simple: Supabase o Firebase).
- ⬜ **Fase 5 — Acceso a llamadas reales**: número virtual VoIP, o
  alianza con operador. (Ni iOS ni Android permiten escuchar llamadas
  nativas por privacidad.)

## Privacidad desde el diseño

- El audio se descarta al instante; solo se procesa texto.
- Solo se guardan los fragmentos con riesgo; el resto se borra.
- Aviso al contestar: "esta llamada está siendo supervisada por un
  sistema de seguridad".
- Procesamiento local en el teléfono siempre que sea posible.
