# Investigación: qué certificados parecen usar otras tasadoras españolas

Fecha de revisión: 29/04/2026

## Respuesta corta

- Sí hay evidencia pública de que varias tasadoras ya trabajan con informes firmados digitalmente o con mecanismos de autenticación/validación del informe.
- No he encontrado fuentes públicas suficientes para afirmar, empresa por empresa, si los tasadores/apoderados ya usan **certificados cualificados** o si están usando solo firma **avanzada**.
- La norma oficial vigente sí obliga a que las firmas de los informes sean electrónicas, pero en el texto oficial que he contrastado no se baja hasta decir "solo cualificada". Las fuentes privadas del sector se dividen entre:
  - decir que la firma puede ser **cualificada o avanzada**
  - o recomendar **cualificada** como vía más segura
- Conclusión práctica: hoy sí se puede defender que el sector ya está operando con firma electrónica real; lo que **no** se puede defender con fuentes públicas abiertas es que Tinsa, Gesvalt, Arquitasa o JLL ya tengan desplegado, de forma demostrable y homogénea, certificado cualificado en todos sus tasadores/apoderados.

## El punto clave que más cambia la respuesta

Una cosa es que una tasadora publique:

- "informe firmado digitalmente"
- un validador de firma
- un servicio de autenticación
- o un sistema para verificar que el informe no ha sido alterado

Y otra muy distinta es saber:

- qué certificado exacto lleva la firma
- quién lo emite
- si el certificado es de persona física, representante o sello
- si tiene o no atributos de certificado cualificado

Ese salto **no** aparece en abierto en las fuentes localizadas.

## Marco sectorial que sí está contrastado

### Lo que dice la fuente oficial

La [Orden ECM/599/2025](https://www.boe.es/diario_boe/txt.php?id=BOE-A-2025-11815) modifica la Orden ECO/805/2003 y deja dos ideas claras:

- se extiende la obligación de firma electrónica del informe a todos los intervinientes que firman la tasación
- "necesariamente las firmas serán electrónicas y cumplirán la normativa vigente sobre firma electrónica"

Lo importante aquí es esto:

- la fuente oficial **sí obliga** a firma electrónica
- pero en el texto contrastado **no he visto** que diga literalmente que tenga que ser siempre solo firma cualificada

### Lo que dicen fuentes privadas del sector

Las fuentes privadas vivas que he encontrado van por estas líneas:

- [Mailcomms Group](https://mailcommsgroup.com/blog/firma-electronica-obligatoria-en-informes-de-tasacion-a-partir-del-12-de-agosto/) dice que la norma exige firma electrónica **cualificada o avanzada** de los profesionales y entidades implicadas.
- [Lleida.net](https://blog.lleida.net/es/firma-electronica-en-informes-de-tasacion/) dice también que la nueva norma implica uso obligatorio de firma electrónica **cualificada o avanzada**.
- [Docusign](https://www.docusign.com/es-es/blog/como-cumplir-con-la-firma-electronica-obligatoria-para-informes-de-tasacion) no lo plantea como obligación cerrada, pero sí **recomienda** firma cualificada para máxima aceptación y valor legal.

Conclusión de este bloque:

- la obligación de firma electrónica sí está clara
- el salto a "todas las tasadoras ya usan certificado cualificado" no está probado en las fuentes abiertas

## Empresa por empresa

## 1. Tinsa

### Lo que sí he podido contrastar

- Tinsa publica una herramienta oficial para [validar la firma digital](https://www.tinsa.es/gestiones/validar-firma-digital/).
- Tinsa publica además un [validador de informes](https://www.tinsa.es/gestiones/validador-informes/) donde indica expresamente que sus documentos están firmados digitalmente y que también se pueden verificar los datos de la firma.
- Tinsa publicó una noticia corporativa sobre el lanzamiento de su [herramienta de validación de firma digital](https://www.tinsa.es/sala-de-prensa/corporativo/herramienta-validacion-firma-digital-pdf/).

### Qué significa esto

- Tinsa no está en un escenario "papel escaneado" o "firma dibujada".
- Tiene un flujo real de documentos firmados digitalmente y verificables.

### Lo que no he podido contrastar

- No he encontrado una fuente pública abierta de Tinsa que diga qué emisor de certificado usan sus firmantes.
- No he encontrado una fuente pública abierta que permita afirmar si el certificado del tasador/apoderado es **cualificado** o solo **avanzado**.

### Conclusión para Tinsa

- **Sí**: usan firma digital real en informes.
- **No contrastado**: que el certificado usado por tasadores/apoderados sea ya cualificado.

## 2. Gesvalt

### Lo que sí he podido contrastar

- Gesvalt mantiene un [Servicio de autentificación](https://services.gesvalt.es/) de tasaciones.
- En su propia web pública enlaza ese servicio como [Servicio de autentificación](https://gesvalt.es/documentacion-necesaria-para-las-valoraciones-con-garantia-hipotecaria/).
- Ese servicio pide "Datos del certificado" y permite comprobar autenticidad de la tasación.
- El PDF demo público de Gesvalt, enlazado desde ese servicio, es un [certificado de tasación demo](https://services.gesvalt.es/wp-content/uploads/2022/04/certificado-gesvalt-demo.pdf) donde aparecen:
  - el técnico tasador identificado nominalmente
  - la fecha de visita
  - la finalidad hipotecaria
  - y un bloque de "representante de la entidad"

### Qué significa esto

- Gesvalt sí parece tener un circuito formal de certificación/autenticación del documento.
- Además, el demo muestra que el proceso separa al menos la figura del tasador y la del representante de la entidad.

### Lo que no he podido contrastar

- El PDF demo no expone el tipo de certificado ni el prestador concreto.
- No he encontrado una fuente pública abierta que permita decir si esas firmas son ya **cualificadas** o simplemente **avanzadas**.

### Conclusión para Gesvalt

- **Sí**: hay evidencia pública clara de autenticación formal y de documento de tasación estructurado.
- **No contrastado**: el nivel exacto del certificado de los firmantes.

## 3. Arquitasa

Nota previa:

- El encargo menciona "Aquitasa".
- No he localizado una tasadora española viva y homologada con ese nombre exacto en las fuentes consultadas.
- La compañía viva y claramente localizable es [Arquitasa](https://arquitasa.com/), que encaja con el sector y la homologación. He investigado esa.

### Lo que sí he podido contrastar

- Arquitasa dice en su página de [tasación de vivienda](https://arquitasa.com/tasacion-vivienda/) que lo que recibe el cliente es "informe firmado digitalmente y factura".
- En el mismo flujo dice que, tras la validación interna, "el informe queda firmado digitalmente y listo para descargar".

### Qué significa esto

- Arquitasa comunica públicamente que entrega informes firmados digitalmente.
- Eso apunta a que ya hay un flujo operativo de firma digital en producción.

### Lo que no he podido contrastar

- No he encontrado fuente pública viva que identifique el tipo exacto de certificado del tasador o del apoderado.
- No he encontrado un validador público o una muestra de PDF firmada donde se vea la cadena de confianza o el emisor.

### Conclusión para Arquitasa

- **Sí**: hay evidencia pública de informe firmado digitalmente.
- **No contrastado**: que ya estén usando certificados cualificados en sus firmantes.

## 4. JLL

### Lo que sí he podido contrastar

- JLL publicó una nota oficial sobre un sistema de [verificación de tasaciones con blockchain](https://www.jll.com/es-es/newsroom/jll-aplica-blockchain-verificacion-tasaciones-inmobiliarias).
- En esa nota JLL explica que antes el proceso requería validación manual y envío de documentos con firmas por correo/interacción manual, y que el nuevo sistema permitía verificar que el informe no había sido alterado.
- La misma idea aparece replicada en esta fuente externa viva: [Economist & Jurist / Revista Inmueble](https://revistainmueble.economistjurist.es/jll-aplica-blockchain-de-forma-pionera-en-la-verificacion-de-las-tasaciones-inmobiliarias/).

### Qué significa esto

- JLL sí tenía un problema real de verificación/autenticidad de informes de tasación y montó una capa específica para resolverlo.
- Eso refuerza que trabajaban con documentos firmados o al menos formalmente validados.

### Lo que no he podido contrastar

- No he encontrado fuente pública viva que diga qué certificados usaban los firmantes.
- Tampoco he encontrado una fuente pública viva que permita decir si la firma subyacente era cualificada o avanzada.

### Conclusión para JLL

- **Sí**: hay evidencia de sistema de verificación/autenticidad del informe.
- **No contrastado**: tipo exacto de certificado del tasador/apoderado.

## 5. Tasalia

### Lo que sí he podido contrastar

- La web corporativa de [Tasalia](https://www.tasalia.es/) sigue viva.
- Pero el dato más relevante no es tecnológico, sino registral: el [BOE](https://www.boe.es/diario_boe/txt.php?id=BOE-A-2026-8695) publica la **baja** de Tasalia Sociedad de Tasación, S.A. en el Registro especial de sociedades de tasación, con efectos de 31/12/2025, por fusión por absorción por Alia Tasaciones, S.A.

### Qué significa esto

- Si hablamos de "actualmente", Tasalia ya no debe analizarse como sociedad de tasación independiente activa en el registro especial.

### Lo que no he podido contrastar

- No he encontrado fuente pública viva de Tasalia que hable de firma digital del informe, certificado del tasador o validador del documento.
- Y además, al haber baja registral, la pregunta sobre "qué usan actualmente" queda desdibujada: la continuidad operativa relevante probablemente estaría en **Alia Tasaciones**, no en Tasalia como entidad separada.

### Conclusión para Tasalia

- **No hay fuentes públicas suficientes para contrastar** qué certificado usa actualmente Tasalia en informes de tasación.
- Además, su baja registral hace que la empresa a investigar, si quieres estado actual real, probablemente deba ser **Alia Tasaciones**.

## Conclusión global

Si tengo que responder de forma muy directa:

- **Tinsa**: sí hay evidencia de informes firmados digitalmente y validador público. No puedo probar si usan cualificado.
- **Gesvalt**: sí hay evidencia de autenticación/certificado de tasación y de roles de tasador + entidad. No puedo probar si usan cualificado.
- **Arquitasa**: sí hay evidencia de entrega de informe firmado digitalmente. No puedo probar si usan cualificado.
- **JLL**: sí hay evidencia de verificación de informes y de documentos firmados dentro del proceso. No puedo probar si usan cualificado.
- **Tasalia**: no hay base pública suficiente para decir qué usa hoy y, además, ya no figura como sociedad independiente activa en el registro especial desde 2026.

## Respuesta a la pregunta de fondo

### ¿Ya disponen de cualificados o solo avanzados?

Con fuentes públicas abiertas, mi respuesta es esta:

- **No puedo demostrar por empresa que ya dispongan de certificados cualificados.**
- **Sí puedo demostrar que varias ya están operando con firma digital o autenticación formal del informe.**
- **La hipótesis prudente** es que el sector ya está montado para firma electrónica y que, tras la reforma de 2025, tiene incentivos claros para pasar a esquemas más robustos.
- Pero si la pregunta es estricta y probatoria, la respuesta correcta es: **no hay fuentes públicas suficientes para separar con seguridad, por tasadora, si hoy están en cualificada o en avanzada**.

## Qué haría falta para saberlo de verdad

Para cerrar esta duda con seguridad haría falta al menos una de estas dos cosas por empresa:

- un PDF real firmado por esa tasadora para inspeccionar la firma y su certificado
- o una fuente pública/directa de la tasadora o de su proveedor donde se indique expresamente el tipo de certificado usado

Sin eso, lo demás son indicios, no prueba.

## Fuentes

### Fuentes oficiales

- [BOE - Orden ECM/599/2025](https://www.boe.es/diario_boe/txt.php?id=BOE-A-2025-11815)
- [BOE - Baja de Tasalia en el Registro especial de sociedades de tasación](https://www.boe.es/diario_boe/txt.php?id=BOE-A-2026-8695)

### Fuentes corporativas de tasadoras

- [Tinsa - Valida gratis la firma digital de tu tasación](https://www.tinsa.es/gestiones/validar-firma-digital/)
- [Tinsa - Validador de informes](https://www.tinsa.es/gestiones/validador-informes/)
- [Tinsa - Noticia sobre herramienta de validación de firma digital](https://www.tinsa.es/sala-de-prensa/corporativo/herramienta-validacion-firma-digital-pdf/)
- [Gesvalt - Servicio de autentificación](https://services.gesvalt.es/)
- [Gesvalt - Página que enlaza el servicio de autentificación](https://gesvalt.es/documentacion-necesaria-para-las-valoraciones-con-garantia-hipotecaria/)
- [Gesvalt - Certificado de tasación demo](https://services.gesvalt.es/wp-content/uploads/2022/04/certificado-gesvalt-demo.pdf)
- [Arquitasa - Tasación de vivienda](https://arquitasa.com/tasacion-vivienda/)
- [JLL - Blockchain para verificación de tasaciones](https://www.jll.com/es-es/newsroom/jll-aplica-blockchain-verificacion-tasaciones-inmobiliarias)
- [Tasalia - Web corporativa](https://www.tasalia.es/)

### Fuentes sectoriales / privadas vivas

- [Mailcomms Group - Firma electrónica obligatoria en informes de tasación](https://mailcommsgroup.com/blog/firma-electronica-obligatoria-en-informes-de-tasacion-a-partir-del-12-de-agosto/)
- [Docusign - Cómo cumplir con la firma electrónica obligatoria para informes de tasación](https://www.docusign.com/es-es/blog/como-cumplir-con-la-firma-electronica-obligatoria-para-informes-de-tasacion)
- [Lleida.net - Firma electrónica en informes de tasación](https://blog.lleida.net/es/firma-electronica-en-informes-de-tasacion/)
- [Economist & Jurist / Revista Inmueble - JLL aplica blockchain a la verificación de tasaciones](https://revistainmueble.economistjurist.es/jll-aplica-blockchain-de-forma-pionera-en-la-verificacion-de-las-tasaciones-inmobiliarias/)
- [Dateas - reproducción de la baja de Tasalia en BOE](https://www.dateas.com/en-us/boe/2026/04/20/resolucion-de-8-de-abril-de-2026-del-banco-de-espana-por-la-10071758)