# Análisis del sistema de cifrado del servlet intermedio

> **Contexto**: Este cifrado solo se usa en el modo servidor intermedio (`AppAfirmaJSWebService`), activo en móvil, IE ≤ 10, y entornos VDI legacy. En desktop moderno (WebSocket local) no existe cifrado porque el PDF nunca sale de la máquina del usuario. Ver [SERVLET_SECURITY.md](./SERVLET_SECURITY.md) para el análisis de acceso al servlet por UUID.

---

## 1. Propósito del cifrado

El servlet (`StorageService` / `RetrieveService`) actúa como un **buzón ciego**: almacena y devuelve blobs sin saber qué contienen. El cifrado intenta garantizar que, incluso si alguien captura el blob del servlet, no pueda leer el PDF firmado ni los parámetros de la operación.

El servidor **nunca tiene la clave**. Solo la tienen:
- El **browser** (la genera, la embebe en la URL de lanzamiento).
- **AutoFirma** (la extrae de la URL que recibe del OS).

### Separación de canales: blob y clave nunca viajan juntos hacia el mismo destino

Esta es la premisa de seguridad fundamental del diseño:

```
Browser → POST https://servlet/StorageService    ← blob cifrado (sin clave)
Browser → afirma://service?...&key=XXXXXXXX     ← clave (URL del OS, no sale por la red)
```

La clave viaja por el **URL scheme del OS** directamente a AutoFirma. Un atacante que intercepta el tráfico HTTP/S entre browser y servlet solo ve el blob cifrado, **sin la clave**.

**Sin embargo**, cuando AutoFirma descarga el resultado firmado del servlet, sí incluye la clave en la URL:

```
AutoFirma → GET https://servlet/RetrieveService?op=get&id=<fileId>&key=XXXXXXXX
```

Un atacante que haga MITM sobre el tráfico de **AutoFirma** (no del browser) obtiene tanto el `id` como la `key` en esa única petición. Con ambos datos puede descargar el blob del `StorageService` y descifrar el PDF sin necesidad de fuerza bruta.

---

## 2. Generación de la clave: `generateCipherKey()`

**Fuente** (autoscript.js, línea 4248):

```javascript
function generateCipherKey() {
    var random;
    if (typeof window.crypto != "undefined" && typeof window.crypto.getRandomValues != "undefined") {
        var randomInts = new Uint32Array(1);
        window.crypto.getRandomValues(randomInts);
        random = zeroFill(randomInts[0] % 100000000, 8);
    }
    else {
        random = zeroFill(Math.floor((AfirmaUtils.getRandom() + 1) % 100000000), 8);
    }
    return random;
}
```

**Resultado**: una cadena de **8 dígitos decimales** con ceros a la izquierda, como `"03847291"`.

### Análisis de entropía

| Propiedad | Valor |
|---|---|
| Espacio de valores posibles | 0 – 99.999.999 → **100.000.000 combinaciones** |
| Entropía real | $\log_2(10^8) \approx \mathbf{26{,}6 \text{ bits}}$ |
| Entropía nominal de DES | 56 bits (2,5 veces mayor) |
| Fallback si no hay `window.crypto` | `Math.random()` → pseudoaleatorio no criptográfico, entropía aún menor |

La llamada a `window.crypto.getRandomValues()` es criptográficamente segura para generar el número, pero el diseño **desperdicia la mayoría de la entropía** al limitar el resultado a 8 dígitos decimales.

---

## 3. Función de cifrado: `cipher()` y `decipher()`

**Fuente** (autoscript.js, líneas 4859–4875):

```javascript
// Cifrado
function cipher(dataB64, key) {
    var data = Cipher.base64ToString(fromBase64UrlSaveToBase64(dataB64));
    var padding = (8 - (data.length % 8)) % 8;
    return padding + "." + Cipher.stringToBase64(
        Cipher.des(key, data, 1, 0, null)  // encrypt=1, mode=0, iv=null
    ).replace(/\+/g, "-").replace(/\//g, "_");
}

// Descifrado
function decipher(cipheredData, key, intermediate) {
    var dotPos = cipheredData.indexOf('.');
    var padding = cipheredData.substr(0, dotPos);
    var deciphered = Cipher.des(key, Cipher.base64ToString(...), 0, 0, null);  // encrypt=0, mode=0
    return Cipher.stringToBase64(deciphered.substr(0, deciphered.length - parseInt(padding) - ...));
}
```

### Algoritmo real vs. comentario en el código

El comentario de la función dice _"DES, modo CBC"_ pero la llamada pasa `mode=0`:

```javascript
Cipher.des(key, data, encrypt, mode=0, iv=null)
//                              ^^^^^^ — 0 = ECB, NO CBC
// En el código de Cipher.des:  if (mode == 1) { ... CBC ... }
```

**El modo real es ECB (Electronic Codebook)**, no CBC.

| Propiedad | DES-CBC | DES-ECB (modo real) |
|---|---|---|
| Encadena bloques | Sí, con IV | No |
| Bloques idénticos → cifrado idéntico | No | **Sí** — revela patrones en el plaintext |
| Requiere IV | Sí | No |
| Seguridad relativa | Mayor | **Menor** |

---

## 4. Capas de envoltorio de datos

Antes de llegar al servlet, el PDF pasa por múltiples transformaciones:

```
PDF binario
  → Base64                        (transporte texto)
    → envuelto en XML             (parámetros de la operación)
      → Base64 URL-safe           (serialización del XML)
        → DES-ECB cifrado         (cipher(key))
          → Base64 + padding prefix   (formato final)
            → POST al StorageService  (campo "dat=")
```

El cuerpo POST enviado al servlet tiene este formato:

```
op=put&v=1_0&id=<fileId>&dat=<padding>.<DES-ECB-Base64URLsafe>
```

El servlet almacena el valor del campo `dat` tal cual. No lo lee, no lo valida, no lo descifra.

---

## 5. Dónde viaja la clave

La `cipherKey` se embebe directamente en la URL de lanzamiento de AutoFirma:

```
afirma://service?op=sign&...&key=03847291&...
```

Esta URL es lanzada por el browser mediante `window.location` o un elemento `<a>`. Consecuencias:

- **Historial del navegador**: la URL `afirma://...` puede quedar registrada.
- **Lista de procesos del OS**: en Windows, la URL se pasa como argumento a `AutoFirma.exe`; es visible en el Administrador de tareas durante unos instantes.
- **Logs del servidor** (si el browser hace un request antes de redirigir): podría aparecer en `Referer`.
- **Logs de Tomcat**: si se loguean los query params completos del `op=put`, la clave no aparece (viaja en el cuerpo POST), pero la URL de `op=get` construida para AutoFirma sí la incluye como query param.

---

## 6. Ataque de fuerza bruta offline

### Cuándo aplica este ataque

Este ataque solo es relevante cuando el atacante tiene **el blob pero no la clave**. Si tiene ambos (MITM sobre el tráfico de AutoFirma, ver sección 1), puede descifrar directamente sin fuerza bruta.

El escenario de fuerza bruta aplica cuando el atacante tiene acceso al blob pero no al canal del OS:
1. **Acceso al almacenamiento del servlet** — leyó el disco/memoria de Tomcat o los logs de query params del `op=put`.
2. **Interceptó solo el tráfico del browser** al `StorageService` (no el de AutoFirma al `RetrieveService`).
3. **Conoce el `id`** (filtrado en logs) y descargó el blob del servlet, pero no capturó el GET de AutoFirma.

### Ejecución del ataque

Una vez obtenido el blob, el ataque es completamente **offline**:

1. Para cada valor `k` en `[0, 99_999_999]` (100 millones de iteraciones):
   - Derivar la clave DES de la cadena `zeroFill(k, 8)`.
   - Intentar descifrar el blob con DES-ECB.
   - Verificar si el resultado contiene XML válido (estructura conocida: `<params>`, `<param>`, `<key>`...).
2. Al encontrar el XML, extraer el PDF en Base64 del campo correspondiente.

### Velocidad estimada

| Hardware | Velocidad DES aprox. | Tiempo para 10^8 claves |
|---|---|---|
| CPU moderna (1 núcleo) | ~50–100 M ops/s | **1–2 segundos** |
| GPU (RTX 3090) | ~10.000 M ops/s | **< 10 milisegundos** |
| Hardware dedicado (EFF Deep Crack, 1998) | ~90.000 M ops/s | **< 1 milisegundo** |

Para referencia: el espacio completo de DES es $2^{56} \approx 7{,}2 \times 10^{16}$ operaciones — **700 millones de veces mayor** que el espacio real de esta clave.

---

## 7. Por qué existe este cifrado (justificación de diseño)

A pesar de sus debilidades, este cifrado cumple un propósito específico en el contexto de AutoFirma:

1. **Compatibilidad Java/JavaScript**: el Ministerio necesitaba un esquema que funcionase igualmente en el servlet Java (servidor) y en el cliente JavaScript del browser, sin dependencias externas modernas. DES-ECB es trivial de implementar en ambos entornos.

2. **El servlet es ciego por diseño**: el objetivo no es proteger el PDF contra el operador del servidor (que no debe poder leer nada), sino contra un atacante con acceso al almacenamiento del servlet (disco, logs) pero sin acceso a la red. El cifrado añade esfuerzo en ese escenario concreto.

3. **La ventana temporal es muy corta**: el blob solo existe en el servlet durante los pocos segundos que tarda AutoFirma en descargarlo (TTL típico: 60–120 segundos). Un atacante necesitaría capturar el blob **y** romper el cifrado dentro de esa ventana — aunque como el ataque es offline e instantáneo, el TTL no protege una vez que el blob ha sido capturado.

4. **No protege contra MITM**: si el atacante intercepta el tráfico de AutoFirma hacia el `RetrieveService`, obtiene `id` + `key` en un solo GET y puede descifrar directamente. El cifrado solo defiende contra el atacante que tiene el blob pero no el canal del OS.

5. **Aceptado por el Ministerio como riesgo residual**: este diseño es el estándar oficial del `@firma` para compatibilidad con entornos legacy. La alternativa segura es el modo trifásico (no pasa el PDF por el servlet en claro ni cifrado, sino solo hashes).

---

## 8. Comparativa: modo simple vs. modo trifásico

### Por qué el modo trifásico elimina la brecha

En modo simple, el PDF completo viaja cifrado al servlet. En modo trifásico, el **servidor de firma ya tiene el PDF** desde el principio y solo delega la operación criptográfica al cliente:

1. El **pre-signer** calcula los hashes de las porciones del PDF que hay que firmar y los envía a AutoFirma.
2. AutoFirma firma únicamente los hashes con la clave privada del usuario.
3. El **post-signer** recibe la firma y la embebe en el PDF original que ya tenía localmente.

Lo que viaja por el servlet son unos pocos kilobytes de hash + firma, no el documento. Aunque un atacante capture y descifre ese payload, **no obtiene el PDF**. La brecha DES-ECB queda sin objeto porque no hay documento que proteger en tránsito.

| Característica | Modo simple (servlet) | Modo trifásico |
|---|---|---|
| ¿El PDF completo viaja al servlet? | **Sí** (cifrado DES-ECB) | **No** — el PDF queda en el servidor de firma |
| ¿Qué viaja por el servlet? | PDF + parámetros (cifrados) | Solo hashes y valor de firma |
| Cifrado del payload | DES-ECB, 26,6 bits de entropía | No aplica (el PDF no viaja) |
| Requisito en el servidor de firma | Solo servlet de almacenamiento | Pre-signer y post-signer adicionales |
| Seguridad del PDF en tránsito | Débil (rompible en < 2 segundos) | Alta (el PDF nunca sale del servidor) |
| Complejidad de integración | Baja | Alta |

---

## 9. Resumen de debilidades

| Debilidad | Impacto |
|---|---|
| DES retirado por NIST en 2005 | Algoritmo obsoleto, hardware dedicado lo rompe en < 1 ms |
| Modo ECB (no CBC) | Bloques idénticos producen cifrado idéntico, filtra patrones |
| Solo 26,6 bits de entropía efectiva | Fuerza bruta completa en 1–2 segundos en CPU moderna |
| Clave en la URL de invocación del OS | Exposición en historial del browser, procesos del OS, logs |
| Clave en el GET de AutoFirma al `RetrieveService` | Un MITM sobre el tráfico de AutoFirma obtiene `id` + `key` sin necesitar fuerza bruta |
| Fallback a `Math.random()` | En browsers sin `window.crypto`, la clave es predecible |
| No protege contra MITM activo | El modelo de amenaza del cifrado es solo acceso al almacenamiento, no intercepción de red |
