# Flujos de firma en escritorio (sin servlet)

Este documento describe los dos tipos de flujo de firma digital en escritorio cuando **no interviene el servlet intermedio**. Ambos flujos usan AutoFirma instalado localmente y comunicación directa entre el navegador y la aplicación nativa.

---

## 1. Flujo WebSocket local (`AppAfirmaWebSocketClient`)

### ¿Cuándo se usa?
- Navegadores modernos: Chrome, Edge, Firefox ≥ 61, Safari ≥ 11
- Sistema operativo: Windows, macOS, Linux

### Pasos del flujo
1. **La SPA carga `autoscript.js`** y detecta el entorno compatible.
2. **Se genera un puerto aleatorio** (por defecto entre 49152–65535) para el WebSocket local.
3. **El navegador intenta conectar a** `wss://127.0.0.1:<puerto>`.
4. **Si la conexión es exitosa**, se establece un canal persistente con AutoFirma.
5. **La SPA envía el PDF y los parámetros de firma** a través del WebSocket, empaquetados en un objeto JSON. El PDF se codifica en **Base64** (campo `dataB64`).
6. **AutoFirma realiza la firma** usando el certificado seleccionado por el usuario.
7. **El PDF firmado se devuelve** por el mismo WebSocket al navegador.
8. **La SPA sube el PDF firmado** al backend mediante `POST /firmar-spa/:token`.

### Características
- **No hay tráfico hacia el servlet**: el PDF nunca sale del equipo del usuario salvo hacia el backend final.
- **Canal persistente**: permite múltiples operaciones sin reabrir conexión.
- **Detección de AutoFirma**: si el WebSocket no responde, se asume que AutoFirma no está instalado.

---

## 2. Flujo Socket HTTP directo (`AppAfirmaJSSocket`)

### ¿Cuándo se usa?
- Firefox 49–60, Internet Explorer 11, entornos VDI o navegadores legacy
- Cuando el WebSocket local falla o está deshabilitado

### Pasos del flujo
1. **La SPA carga `autoscript.js`** y detecta que el WebSocket no está disponible.
2. **Se construye una URL especial**: `https://127.0.0.1:<puerto>/afirma`.
3. **El navegador realiza peticiones HTTP POST** a esa URL, fragmentando los datos si es necesario (por límites de tamaño de URL/POST).
4. **AutoFirma escucha en ese endpoint** y recibe los datos de la operación.
5. **AutoFirma realiza la firma** usando el certificado seleccionado por el usuario.
6. **El PDF firmado se devuelve** al navegador mediante una respuesta HTTP.
7. **La SPA sube el PDF firmado** al backend mediante `POST /firmar-spa/:token`.

### Características
- **No hay tráfico hacia el servlet**: igual que en WebSocket, el PDF nunca sale del equipo salvo hacia el backend.
- **Conexión stateless**: cada operación es una petición HTTP independiente.
- **Fragmentación de datos**: para sortear límites de tamaño, los datos se dividen en fragmentos (IE: 12KB, Firefox: 458KB, otros: 1MB).
- **Echo de comprobación**: el navegador espera una respuesta de eco para confirmar que AutoFirma está escuchando.

---

## Resumen comparativo

| Característica         | WebSocket local                | Socket HTTP directo           |
|-----------------------|-------------------------------|------------------------------|
| Persistencia          | Conexión persistente           | Stateless (peticiones sueltas)|
| Navegadores           | Chrome, Edge, Firefox ≥ 61... | Firefox 49–60, IE11, VDI     |
| Fragmentación         | No                            | Sí                           |
| Detección de cliente  | Por conexión WebSocket         | Por respuesta HTTP           |
| Seguridad             | Solo local, nunca sale a red  | Solo local, nunca sale a red |
