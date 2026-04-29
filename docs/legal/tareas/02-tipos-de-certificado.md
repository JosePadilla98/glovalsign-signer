# Tarea: Clarificar los tipos de certificado

## Objetivo

Entender qué tipos de certificados electrónicos existen, cuáles permiten firma cualificada vs avanzada, y qué implica cada uno en la práctica para este proyecto.

---

## Preguntas a responder

- ¿Cuántos tipos de certificado existen y en qué difieren?
- ¿Qué hace que un certificado sea "cualificado"?
- ¿Qué autoridades emiten certificados en España?
- ¿Qué certificados comunes tienen los usuarios del proyecto?
- ¿Cómo identificamos desde código el tipo de certificado del firmante?

---

## Borrador

### Taxonomía de certificados

#### Por titular

| Tipo | Titular | Uso típico |
|---|---|---|
| **Persona física** | Individuo | Firma de contratos, trámites con AAPP |
| **Persona jurídica** | Empresa / organización | Representación legal, sellos electrónicos |
| **Representante de persona jurídica** | Persona física que actúa en nombre de empresa | Contratos B2B, poderes notariales |
| **Empleado público** | Funcionario | Actuaciones administrativas |
| **Componente / Servidor SSL** | Máquina / servicio | Autenticación de servidores web (TLS) |

#### Por nivel eIDAS

| Nivel | Descripción | Emitido por |
|---|---|---|
| **No cualificado** | Certificado válido técnicamente pero no reconocido como cualificado por eIDAS; puede producir firmas avanzadas (AES) si cumple Art. 26, pero nunca QES | Cualquier CA (ej. Let's Encrypt, CA corporativa) |
| **Cualificado** | Cumple Anexo I eIDAS, emitido por QTSP de la TSL; permite producir QES cuando el soporte es QSCD | Solo QTSPs reconocidos por el Estado |

> Un certificado es cualificado solo si su emisor está en la **Lista de Servicios de Confianza (TSL)** del Estado Miembro **y** el certificado tiene la extensión OID `id-etsi-qct-esign` (para personas físicas) o `id-etsi-qct-eseal` (para sellos de empresa).

#### Por soporte (dónde está la clave privada)

| Soporte | Ejemplo | Puede ser QSCD | Firma producida |
|---|---|---|---|
| Almacén software del SO | Certificado FNMT en Windows | ❌ | Avanzada (AES) |
| Archivo P12/PFX | Fichero exportado del FNMT | ❌ | Avanzada (AES) |
| Tarjeta criptográfica (smart card) | Tarjeta FNMT, Camerfirma tarjeta | ✅ (si certificada) | **Cualificada (QES)** |
| DNIe | DNI electrónico español | ✅ | **Cualificada (QES)** |
| Token USB | SafeNet eToken, Thales | ✅ (si certificado) | **Cualificada (QES)** |
| Firma remota en HSM cloud | Uanataca Remote, Firmaprofesional | ✅ (si certificado QSCD) | **Cualificada (QES)** |

---

### Principales emisores (QTSPs) en España

Todos los siguientes están en la TSL española y pueden emitir certificados cualificados:

#### FNMT-RCM (Fábrica Nacional de Moneda y Timbre)

- Organismo público, el más usado en España
- **Certificado de Ciudadano**: persona física, gratuito, se descarga por software → ⚠️ **no es QSCD** por defecto → firma avanzada
- **Certificado en tarjeta**: persona física en tarjeta criptográfica → ✅ QSCD → firma cualificada
- **DNIe**: emitido por la Policía Nacional pero con infraestructura FNMT → ✅ QSCD → firma cualificada
- **Certificado de Representante**: para actuar en nombre de empresa
- URL: `https://www.sede.fnmt.gob.es/certificados`

#### Camerfirma

- Promovido por las Cámaras de Comercio
- Certificados para empresas y profesionales
- Ofrece tanto software como tarjeta
- Conocido en sectores como notariado, registros mercantiles
- URL: `https://www.camerfirma.com`

#### ANF AC (Agencia Notarial de Certificación)

- Vinculada al Consejo General del Notariado
- Usada en trámites notariales y registrales
- URL: `https://www.anf.es`

#### Izenpe

- QTSP del País Vasco
- Certificados para ciudadanos vascos y administración autonómica
- URL: `https://www.izenpe.eus`

#### ACCV (Agencia de Tecnología y Certificación Electrónica, Valencia)

- QTSP de la Comunitat Valenciana
- URL: `https://www.accv.es`

#### Uanataca / Firmaprofesional / Logalty

- Ofrecen servicios de **firma remota cualificada** (el QSCD está en un HSM en la nube)
- El usuario autentica con un segundo factor (SMS OTP, biometría) en lugar de tarjeta física
- Interesante para firma en móvil sin app AutoFirma

---

### Cómo identificar el tipo de certificado de un firmante

Cuando AutoFirma devuelve el certificado en Base64, se puede parsear para obtener:

```
Emisor (Issuer CN): identifica el QTSP
OID de política: id-etsi-qct-esign = cualificado para persona física
Soporte: no detectable desde el certificado en sí
```

La presencia del OID **no garantiza** que la firma sea cualificada si el soporte no es QSCD. Pero desde el software no podemos verificar el soporte: es responsabilidad del proceso de emisión del QTSP garantizarlo.

**Extensiones OID relevantes (ETSI EN 319 411)**:

| OID | Significado |
|---|---|
| `0.4.0.194121.1.1` | `id-etsi-qct-esign` — certificado cualificado para firma de PF |
| `0.4.0.194121.1.2` | `id-etsi-qct-eseal` — certificado cualificado para sello de empresa |
| `0.4.0.194121.1.3` | `id-etsi-qct-web` — certificado cualificado para autenticación web |

---

### Resumen: certificado → tipo de firma resultante

```
Certificado FNMT ciudadano (software, sin tarjeta)
  → Avanzada (AES)

Certificado FNMT en tarjeta criptográfica certificada QSCD
  → Cualificada (QES)

DNIe (chip)
  → Cualificada (QES)

Certificado Camerfirma en software
  → Avanzada (AES)

Certificado Camerfirma en tarjeta certificada
  → Cualificada (QES)

Certificado de empresa (persona jurídica, cualquier QTSP)
  → Sello electrónico (no es firma de PF)

Certificado Let's Encrypt / CA interna
  → No cualificado (sin nivel QES); puede producir AES si cumple Art. 26 eIDAS, pero nunca QES
```

---

### Implicaciones en este proyecto

- La mayoría de usuarios firmará con **FNMT ciudadano en software** → firma avanzada. Esto es suficiente para la mayoría de contratos privados y trámites.
- Los usuarios con **DNIe o tarjeta criptográfica** producirán firma cualificada automáticamente cuando usen AutoFirma, sin cambio de código.
- En **móvil Android**, AutoFirma soporta lectura del DNIe por **NFC**, lo que permite firma cualificada desde el teléfono sin necesidad de servicios externos ni hardware adicional.
- Si el proyecto requiere firma cualificada garantizada, habría que validar el OID del certificado recibido tras la firma.
- Para usuarios móvil **sin DNIe ni QSCD físico**, la alternativa es integrar un **servicio de firma remota cualificada** (Uanataca, Firmaprofesional) en lugar del flujo AutoFirma estándar.

---

## Tareas pendientes

- [ ] Verificar qué certificados tienen realmente los usuarios tipo del proyecto
- [ ] Decidir si el sistema debe validar el OID y rechazar firmas no cualificadas en ciertos flujos
- [ ] Evaluar servicios de firma remota cualificada para el flujo móvil
- [ ] Documentar en el README qué nivel de firma produce el sistema según configuración

## Referencias

- Reglamento (UE) 910/2014 eIDAS — Anexo I (certificados cualificados)
- ETSI EN 319 411-1 y 411-2 (políticas de certificación)
- Lista de Confianza española: `https://sede.mineco.gob.es/portal/site/sede/PTSL`
- FNMT: `https://www.sede.fnmt.gob.es/certificados`
