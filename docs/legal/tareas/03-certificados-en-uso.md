# Tarea: Investigar certificados usados actualmente

## Objetivo

Identificar qué tipos de certificados electrónicos usan en la práctica los perfiles de usuario del proyecto (apoderados, tasadores y otros firmantes), y determinar si producen firmas cualificadas (QES) o solo avanzadas (AES).

---

## Preguntas a responder

- ¿Qué certificado tiene habitualmente un apoderado de empresa?
- ¿Qué certificado tiene habitualmente un tasador homologado?
- ¿Los certificados que usan son emitidos por un QTSP (cualificados) o por una CA genérica?
- ¿El soporte es software (AES) o QSCD —tarjeta, token, DNIe— (QES)?
- ¿Hay diferencia entre sector inmobiliario, bancario y AAPP en el tipo de certificado usado?

---

## Borrador

### Apoderados de empresa

> Persona física que actúa en nombre de una persona jurídica en virtud de poder notarial o estatutario.

#### Certificado habitual

- **FNMT Certificado de Representante de Persona Jurídica** o **Representante de Entidad** — el más extendido en España para actuar en nombre de empresa ante AAPP y en contratos.
- Emitido por FNMT-RCM (QTSP) → certificado **cualificado** en cuanto a emisor.
- Soporte habitual: **almacén software del sistema operativo** → firma resultante **avanzada (AES)**, no cualificada.
- Si el apoderado usa tarjeta criptográfica FNMT o token USB certificado QSCD → firma **cualificada (QES)**.

#### Otros certificados de representante frecuentes

| Emisor | Tipo | Soporte habitual |
|---|---|---|
| Camerfirma | Certificado de Cargo/Representante | Software o tarjeta |
| Firmaprofesional | Certificado corporativo | Software |
| ANF AC | Certificado de representante | Software |

#### Conclusión provisional

La mayoría de apoderados en España firma con FNMT Representante en software → **AES, no QES**. Solo quienes usan tarjeta o token QSCD producen QES.

---

### Tasadores homologados

> Profesional habilitado para valorar inmuebles, vehículos u otros activos. En el ámbito hipotecario, la Ley 2/1981 exige que las tasadoras estén homologadas por el Banco de España.

#### Certificado habitual

- No existe un certificado específico de "tasador" emitido por QTSP.
- Los tasadores suelen firmar con:
  - **Certificado de Ciudadano FNMT** (persona física) → AES
  - **DNIe** (si lo usan) → QES
  - **Certificado corporativo de la empresa tasadora** → AES o QES según soporte
- En algunos sistemas propietarios de tasación (ej. plataformas de bancos), la firma se delega en la propia plataforma mediante sello de empresa.

#### Conclusión provisional

Salvo uso de DNIe o tarjeta QSCD, los tasadores producen **AES**. El nivel depende del soporte, no de su condición profesional.

---

### Otros perfiles relevantes

| Perfil | Certificado habitual | Nivel esperado |
|---|---|---|
| Funcionario AAPP | Empleado Público FNMT / tarjeta de acceso | AES o QES según soporte |
| Notario | Certificado del Consejo General del Notariado (AGN/ANF) | QES (tarjeta obligatoria por protocolo) |
| Agente inmobiliario | Certificado de Ciudadano FNMT | AES |
| Particular (comprador/vendedor) | DNIe o Certificado Ciudadano FNMT | QES (DNIe) o AES (software) |

---

## Tareas pendientes

- [ ] Confirmar con usuarios reales del proyecto qué certificados tienen instalados
- [ ] Comprobar si las empresas tasadoras clientes del proyecto usan plataformas con sello corporativo
- [ ] Verificar si algún flujo actual rechaza o acepta de forma distinta AES vs QES
- [ ] Consultar si los apoderados firmantes tienen tarjeta FNMT o solo certificado software

## Referencias

- FNMT — Tipos de certificado: `https://www.sede.fnmt.gob.es/certificados`
- Ley 2/1981 de Regulación del Mercado Hipotecario
- Reglamento eIDAS Art. 26 (AES) y Art. 28 (QES)
- ETSI EN 319 411-1: políticas de certificación
