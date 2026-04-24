# Seguridad del servlet AutoFirma en producción

## Pregunta raíz: ¿cualquiera en la red puede acceder a los PDFs?

**Respuesta corta**: los PDFs están protegidos únicamente por un `id` de operación. No hay autenticación propia en los servlets de AutoFirma. En la práctica, el nivel de seguridad es aceptable si se cumplen los requisitos de producción descritos en este documento.

---

## 1. Cómo funciona la protección actual

Los servlets (`StorageService`, `RetrieveService`) son HTTP simples. No validan tokens, sesiones ni certificados. La única protección es el `id` de operación:

```
GET /afirma-signature-storage/StorageService?op=get&id=<UUID>
```

**¿Es adivinable el `id`?**

Los servlets generan los IDs como **UUIDs v4** (aleatorios). Con 122 bits de entropía, el espacio de búsqueda es $2^{122} \approx 5.3 \times 10^{36}$ combinaciones. El brute force es computacionalmente inviable incluso con recursos masivos.

---

## 2. Vectores de ataque reales

El riesgo no es adivinar el UUID, sino **interceptarlo o filtrarlo**:

| Vector | Severidad | Condición |
|---|---|---|
| **MITM en tránsito** | Alta | Si el servlet sirve HTTP en lugar de HTTPS. El `id` y el PDF viajan en claro. |
| `id` expuesto en logs del servidor | Media | Si Tomcat/nginx loguean los query params, el `id` queda registrado en texto plano en los logs. |
| `id` expuesto en logs del browser | Baja | Si `autoscript.js` o la SPA loguean las URLs de los servlets en la consola. |
| **CORS abierto** | Media | Con `allowed.origins=*`, cualquier web puede hacer requests al servlet usando las credenciales del navegador del usuario. |
| Ventana temporal del TTL | Baja | El PDF está almacenado en memoria/disco durante el TTL. Si el TTL es largo, la ventana de exposición es mayor. |
| Servlet expuesto públicamente sin necesidad | Media | En producción solo con usuarios móviles es necesario que el servlet sea accesible desde internet. Para desktop-only, podría estar en red interna. |

---

## 3. Problema detectado en la configuración actual

El fichero [`servlet/config/tps_config.properties`](../../servlet/config/tps_config.properties) tiene:

```properties
allowed.origins=*
```

Esto significa que **cualquier dominio web puede hacer requests al servlet desde el navegador del usuario**. En producción debe restringirse al dominio de la SPA:

```properties
# Producción
allowed.origins=https://glovalsign.tudominio.com
```

---

## 4. Qué protege la firma PAdES (y qué no)

La firma PAdES que produce AutoFirma garantiza:

- **Integridad**: cualquier modificación del PDF después de firmado invalida la firma. Un atacante que obtuviese el PDF del servlet **no podría modificarlo** sin que se detecte al verificar la firma.
- **No repudio**: la firma está ligada criptográficamente al certificado del firmante.
- **Autenticidad**: el certificado permite verificar quién firmó.

Lo que **no protege PAdES**:
- La confidencialidad del PDF en tránsito → responsabilidad de HTTPS.
- El acceso de lectura al PDF mientras está en el servlet → responsabilidad del `id` + TTL corto.

---

## 5. Comparativa de exposición por modo de firma

| Modo | ¿El PDF sale de la máquina del usuario? | ¿Pasa por el servlet? |
|---|---|---|
| **Desktop (WebSocket local)** | No. El PDF nunca sale. | No. |
| **Móvil / trifásico (servlet)** | Sí, viaja al servlet en Base64. | Sí, obligatoriamente. |

En desktop moderno (Chrome/Edge/Safari), el PDF permanece en la máquina del usuario en todo momento. El servlet solo es necesario en móvil o navegadores legacy.

---

## 6. Checklist de seguridad para producción

- [ ] **HTTPS obligatorio** entre browser y servlet, y entre AutoFirma app y servlet.
- [ ] **`allowed.origins`** en `tps_config.properties` restringido al dominio de la SPA.
- [ ] **TTL corto** en el `StorageService` para minimizar la ventana de exposición.
- [ ] **Proxy inverso** (nginx/Apache) delante de Tomcat con TLS terminado en el proxy.
- [ ] **Logs de Tomcat** configurados para no registrar query params completos (o rotar y cifrar logs).
- [ ] Si el servlet solo se usa en producción con usuarios móviles: valorar restringir acceso por IP o red a las URLs `/afirma-signature-storage/*` y `/afirma-signature-retriever/*`.
- [ ] Si el PDF contiene datos especialmente sensibles: considerar cifrado a nivel de aplicación antes de enviarlo al servlet (aunque complica la firma trifásica y requiere coordinación con AutoFirma).
