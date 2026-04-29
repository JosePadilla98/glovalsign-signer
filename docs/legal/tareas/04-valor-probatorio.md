# Tarea: Valor probatorio y implicaciones legales de AES vs QES

## Objetivo

Entender qué valor tiene cada nivel de firma electrónica ante un tribunal español, qué diferencias prácticas existen entre firma avanzada (AES) y cualificada (QES) en caso de disputa, y qué implica cada nivel en términos de autoría e imputabilidad.

---

## Preguntas a responder

- ¿Qué valor probatorio tiene una firma avanzada ante un tribunal español?
- ¿Y una firma cualificada?
- ¿Puede impugnarse más fácilmente una AES que una QES?
- ¿Qué ocurre si el firmante niega haber firmado (repudio)?
- ¿Qué implica cada nivel en la atribución legal de autoría?
- ¿Cambia algo la Ley 6/2020 respecto a eIDAS en este punto?

---

## Borrador

### Marco legal aplicable

| Norma | Ámbito | Relevancia |
|---|---|---|
| Reglamento (UE) 910/2014 (eIDAS) | UE | Define los tres niveles y sus efectos transfronterizos |
| Ley 6/2020 de servicios electrónicos de confianza | España | Complementa eIDAS en el ordenamiento español |
| Ley 1/2000 (LEC) — arts. 326 y 384 | España | Valor probatorio de documentos electrónicos en juicio |
| Código Civil arts. 1225–1230 | España | Eficacia de documentos privados |

---

### Valor probatorio de la firma cualificada (QES)

- **Art. 25.2 eIDAS**: la QES tiene el efecto jurídico equivalente a una firma manuscrita en **todos los Estados Miembro**.
- En España, esto se refuerza con el **art. 3.4 Ley 6/2020**: la QES goza de presunción de validez y autenticidad salvo prueba en contrario.
- Ante un tribunal: la parte que la presenta **no tiene que probar** su autenticidad; es la contraparte quien debe demostrar que fue falsificada o que no corresponde al firmante.
- El **no repudio** está garantizado técnicamente: la clave privada usada está en un QSCD bajo control exclusivo del firmante, y el QTSP puede acreditarlo.

### Valor probatorio de la firma avanzada (AES)

- **Art. 25.1 eIDAS**: la AES no puede ser denegada como prueba solo por ser electrónica, pero **no tiene presunción automática de equivalencia a firma manuscrita**.
- En España, el **art. 326.3 LEC** permite impugnar documentos con firma electrónica no cualificada; en ese caso, la parte que la presenta **debe probar su autenticidad** mediante pericial informática u otros medios.
- No existe presunción legal de validez: el juez valora libremente la prueba.
- El no repudio es más débil: si el firmante alega que no fue él (ej. que le robaron la contraseña del almacén software), es más difícil rebatirlo técnicamente que con un QSCD.

---

### Diferencias ante tribunal: resumen comparativo

| Aspecto | AES | QES |
|---|---|---|
| Presunción de validez | ❌ No automática | ✅ Sí (equivale a manuscrita) |
| Carga de la prueba en impugnación | Quien presenta debe probar | Quien impugna debe refutar |
| Resistencia al repudio | Media (depende de la implementación) | Alta (QSCD + QTSP acredita) |
| Peritaje informático necesario | Habitual si se impugna | Excepcional |
| Efecto transfronterizo UE | Reconocida, sin presunción automática | Reconocida y equivalente a manuscrita |
| Uso en trámites con AAPP | Aceptada salvo norma específica | Siempre aceptada |

---

### Implicaciones legales en la autoría

#### Firma cualificada

- La identidad del firmante está **garantizada por el QTSP** en el momento de emisión del certificado (verificación presencial o equivalente).
- El uso de la clave privada implica que el firmante tuvo **control exclusivo** del QSCD (art. 26.d eIDAS).
- Si el firmante niega la firma, debe demostrar que el QSCD fue comprometido — una defensa muy difícil.

#### Firma avanzada

- La identidad está vinculada al certificado, pero el **proceso de identificación inicial** puede ser menos riguroso (ej. descarga por software sin comparecencia).
- El firmante puede alegar que otro accedió a su almacén de certificados (robo de contraseña, malware, etc.).
- La autoría es **técnicamente atribuible** pero **jurídicamente más contestable**.

---

### Ley 6/2020: novedades relevantes

- Deroga la anterior Ley 59/2003 de firma electrónica.
- Establece que los prestadores de servicios de confianza **cualificados** españoles deben supervisarse por el Ministerio de Asuntos Económicos (actualmente MINECO / Secretaría de Estado de Digitalización).
- Mantiene la equivalencia QES ↔ firma manuscrita.
- No modifica el régimen de la AES respecto a eIDAS: sigue sin presunción automática.
- **Art. 5**: los documentos con firma electrónica no cualificada tienen el valor que las partes les atribuyan o el que determine el juez según las circunstancias.

---

### Implicaciones en este proyecto

- Para contratos con efectos jurídicos relevantes (poderes, hipotecas, contratos de compraventa), la AES puede ser suficiente si ambas partes la aceptan y el sistema conserva evidencias (logs, IP, timestamp, OTP...).
- Si un firmante impugna su firma AES, el sistema debe poder aportar **evidencias adicionales** (audit trail, OTP por SMS, correo de confirmación) que soporten la atribución de autoría.
- La QES elimina esa dependencia de evidencias adicionales: basta el propio archivo de firma.
- Si el proyecto opera en sectores regulados (financiero, notarial, AAPP) donde se exige QES por normativa sectorial, la AES no sería suficiente independientemente de su valor técnico.

---

## Tareas pendientes

- [ ] Revisar si algún contrato tipo del proyecto está sujeto a normativa sectorial que exija QES
- [ ] Definir qué evidencias adicionales genera el sistema para reforzar AES en caso de litigio
- [ ] Consultar con asesoría jurídica si el audit trail actual es suficiente para defender una AES impugnada
- [ ] Evaluar si añadir timestamp cualificado (TSA) mejoraría el valor probatorio de las firmas AES actuales

## Referencias

- Reglamento (UE) 910/2014 eIDAS — Arts. 25, 26, 28
- Ley 6/2020, de 11 de noviembre, reguladora de determinados aspectos de los servicios electrónicos de confianza
- Ley 1/2000 de Enjuiciamiento Civil — Arts. 326, 384
- Código Civil — Arts. 1225–1230
- FNMT: guía de efectos jurídicos de la firma electrónica
