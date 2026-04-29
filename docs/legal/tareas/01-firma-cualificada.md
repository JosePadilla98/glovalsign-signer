# Tarea: Definir con precisión qué es una firma cualificada

## Objetivo

Tener una definición clara y precisa de firma electrónica cualificada, sus requisitos legales y técnicos según eIDAS, y cómo se diferencia de la firma simple y la avanzada.

---

## Preguntas a responder

- ¿Qué define exactamente eIDAS como firma cualificada?
- ¿Qué requisitos técnicos debe cumplir el dispositivo de creación de firma (QSCD)?
- ¿Qué requisitos debe cumplir el certificado subyacente?
- ¿Qué equivalencia legal tiene frente a una firma manuscrita?
- ¿En qué se diferencia de la firma simple y la avanzada?

---

## Borrador

### Los tres niveles de firma en eIDAS (art. 3, 25, 26, 27)

| Nivel | Definición resumida | Validez legal |
|---|---|---|
| **Simple** | Datos electrónicos adjuntos a otros datos electrónicos. Cualquier clic, nombre escaneado, etc. | Mínima. No se puede denegar efectos legales por ser electrónica, pero es fácilmente rebatible. |
| **Avanzada (AES)** | Vinculada al firmante de forma única, capaz de detectar cambios posteriores, bajo control exclusivo del firmante. | Media. Válida en muchos contextos contractuales privados. |
| **Cualificada (QES)** | Avanzada + creada con dispositivo cualificado (QSCD) + basada en certificado cualificado emitido por prestador de confianza de la lista de confianza (TSL) de un Estado Miembro. | **Equivale jurídicamente a la firma manuscrita** en toda la UE (art. 25.2 eIDAS). |

---

### Requisitos de la firma cualificada (QES)

Para que una firma sea cualificada deben cumplirse **tres condiciones simultáneamente**:

#### 1. Certificado cualificado (Anexo I eIDAS)

El certificado X.509 debe:
- Ser emitido por un **Prestador de Servicios de Confianza Cualificado (QTSP)** incluido en la TSL del Estado Miembro.
- Identificar al firmante de forma inequívoca (nombre, NIF/DNI o equivalente).
- Indicar el Estado Miembro del QTSP emisor.
- Contener la extensión `id-etsi-qct-esign` que lo identifica como cualificado para firma de persona física.
- Tener una validez temporal explícita y no estar revocado en el momento de la firma.

En España, los QTSPs están publicados en la **Lista de Confianza española** gestionada por el Ministerio de Asuntos Económicos:  
`https://sede.mineco.gob.es/portal/site/sede/PTSL`

Ejemplos de QTSPs españoles: **FNMT-RCM**, **Camerfirma**, **ANF AC**, **Izenpe**, **ACCV**.

#### 2. Dispositivo Cualificado de Creación de Firma (QSCD) — Anexo II eIDAS

El QSCD es el hardware o software donde reside la clave privada. Debe garantizar:
- La clave privada **solo puede generarse una vez y no puede extraerse**.
- La firma se genera **dentro del dispositivo**, sin que la clave privada salga nunca de él.
- Solo el firmante legítimo puede activar el dispositivo (PIN, biometría...).
- Está **certificado** según los criterios del Anexo II, normalmente con criterios Common Criteria EAL4+ o superior.

Ejemplos de QSCD:
- **DNIe** (chip criptográfico del documento)
- **Tarjeta criptográfica** (smart card con certificado FNMT)
- **Token USB** certificado (ej. SafeNet eToken, Thales, etc.)
- **HSM en la nube** certificado (ej. servicios de firma remota cualificada como Uanataca, Firmaprofesional)

> ⚠️ Un certificado instalado en el almacén de Windows/macOS **sin dispositivo QSCD subyacente** NO produce firma cualificada aunque el certificado sea cualificado. El certificado cualificado + QSCD son inseparables.

#### 3. Cumplimiento del Anexo I para la firma en sí

La firma producida debe:
- Contener la referencia al certificado cualificado.
- Ser verificable mediante ese certificado.
- No haber sufrido modificaciones desde el momento de la firma.

---

### Diferencias técnicas entre los tres niveles

| Criterio | Simple | Avanzada (AES) | Cualificada (QES) |
|---|---|---|---|
| Vinculación al firmante | No requerida | Sí (técnica) | Sí (técnica + legal) |
| Integridad del documento | No | Sí (hash) | Sí (hash) |
| Control exclusivo del firmante | No | Sí | Sí (QSCD) |
| Certificado cualificado | No | No obligatorio | **Obligatorio** |
| QSCD | No | No | **Obligatorio** |
| Equivale a firma manuscrita | No | No | **Sí (art. 25.2 eIDAS)** |
| Reconocimiento transfronterizo UE | No | Parcial | **Sí, obligatorio** |

---

### Implicaciones en este proyecto

AutoFirma puede producir **firma cualificada** si:
1. El certificado que usa el usuario está en una smart card / DNIe (QSCD).
2. Ese certificado es cualificado (emitido por un QTSP de la TSL).

AutoFirma produce **firma avanzada** si:
- El certificado está en el almacén software del sistema (sin QSCD), aunque sea emitido por un QTSP.

Desde el código, **AutoScript/AutoFirma no distingue** entre ambos: la diferencia es del certificado y el dispositivo, no del software.

---

## Referencias

- Reglamento (UE) 910/2014 eIDAS — arts. 3, 25, 26, 27 y Anexos I, II
- ETSI EN 319 132 (XAdES), EN 319 122 (CAdES), EN 319 142 (PAdES)
- Lista de Confianza española: `https://sede.mineco.gob.es`
- ENISA: "Qualified Electronic Signatures" guidance

## Estado

- [ ] Revisado con fuente normativa (texto del reglamento)
- [ ] Revisado por persona con conocimiento legal
- [ ] Incorporar a glosario o docs del proyecto si procede
