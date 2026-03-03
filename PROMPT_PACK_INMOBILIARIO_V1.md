# Prompt Pack Inmobiliario v1

Prompt pack deduplicado y estandarizado para marketing y ventas inmobiliarias, con bloque tecnico InsForge.

## Alcance
- 12 prompts canonicos: 8 comerciales y 4 tecnicos.
- Formato uniforme por prompt: `ID`, `Objetivo`, `Inputs requeridos`, `Output exacto`, `Restricciones`, `Prompt final`.
- Placeholders canonicos en `{{snake_case}}`.

## Placeholders canonicos
- `{{property_description}}`
- `{{property_details}}`
- `{{city}}`
- `{{ideal_client}}`
- `{{lead_message}}`
- `{{property_type}}`
- `{{error_text}}`
- `{{code_snippet}}`

## Como usar
1. Uso manual (ChatGPT/Claude)
- Copia el `Prompt final` del bloque que necesites.
- Reemplaza placeholders con datos reales.
- Ejecuta y valida que respete formato y limites.

2. Uso en automatizaciones (n8n/InsForge)
- Guarda cada `Prompt final` como plantilla de workflow.
- Inyecta variables con los placeholders canonicos.
- Si falta un campo, envia texto vacio y obliga al modelo a no inventar.

3. Buenas practicas
- No inventar datos de propiedad, precio, metraje o ubicacion.
- Mantener tono profesional, claro y orientado a beneficios.
- Si falta contexto, pedir o marcar los datos faltantes antes de publicar.

---

## MKT-01 - Descripcion persuasiva SEO (max 150 palabras)
- ID: `MKT-01`
- Objetivo: reescribir descripcion de propiedad con enfoque persuasivo, SEO y beneficios.
- Inputs requeridos:
`{{property_description}}`
`{{property_details}}`
`{{city}}`
`{{ideal_client}}`
- Output exacto:
`descripcion_final` (parrafo unico)
- Restricciones:
No exceder 150 palabras.
Tono emocional pero claro.
Enfoque en beneficios concretos.
Incluir naturalmente terminos de busqueda inmobiliaria.
No inventar datos.
- Prompt final:
```text
Actua como experto en marketing inmobiliario.

Reescribe la descripcion de esta propiedad para que sea:
- persuasiva
- optimizada para SEO
- emocional pero clara
- enfocada en beneficios
- maximo 150 palabras

Usa estos datos:
- Descripcion base: {{property_description}}
- Detalles de propiedad: {{property_details}}
- Ciudad: {{city}}
- Cliente ideal: {{ideal_client}}

Devuelve solo este formato:
descripcion_final: <texto final>
```
- Input de ejemplo:
```json
{
  "property_description": "Apartamento de 2 dormitorios en Pocitos con balcon.",
  "property_details": "2 dormitorios, 2 banos, 78 m2, garaje, gastos comunes bajos, cerca de la rambla",
  "city": "Montevideo",
  "ideal_client": "parejas jovenes profesionales"
}
```
- Output esperado (estructura):
```text
descripcion_final: ...
```

---

## MKT-02 - Social Pack General (Instagram, Facebook, WhatsApp, hashtags)
- ID: `MKT-02`
- Objetivo: generar piezas de publicacion multicanal para captacion inmediata.
- Inputs requeridos:
`{{property_details}}`
`{{city}}`
`{{ideal_client}}`
- Output exacto:
`instagram_text`
`facebook_text`
`whatsapp_short`
`hashtags_locales` (5 hashtags)
- Restricciones:
Tono persuasivo y profesional.
Adaptar voz por canal.
No inventar datos.
Hashtags locales con orientacion Uruguay.
- Prompt final:
```text
Eres especialista en redes sociales inmobiliarias.

Crea:
1) Texto para Instagram
2) Texto para Facebook
3) Mensaje corto para WhatsApp
4) 5 hashtags locales

Datos:
- Propiedad: {{property_details}}
- Ciudad: {{city}}
- Cliente ideal: {{ideal_client}}

Contexto local: Uruguay.

Devuelve solo este formato:
instagram_text: <texto>
facebook_text: <texto>
whatsapp_short: <texto>
hashtags_locales:
- #...
- #...
- #...
- #...
- #...
```
- Input de ejemplo:
```json
{
  "property_details": "Casa de 3 dormitorios, patio con parrillero, 2 banos, 1 garaje, 145 m2",
  "city": "Canelones",
  "ideal_client": "familias que buscan primera vivienda"
}
```
- Output esperado (estructura):
```text
instagram_text: ...
facebook_text: ...
whatsapp_short: ...
hashtags_locales:
- #...
- #...
- #...
- #...
- #...
```

---

## MKT-03 - Guion Reel/TikTok 30 segundos
- ID: `MKT-03`
- Objetivo: crear guion breve de video con hook fuerte y CTA a WhatsApp.
- Inputs requeridos:
`{{property_details}}`
`{{city}}`
`{{ideal_client}}`
- Output exacto:
`hook_inicial`
`recorrido_emocional`
`cta_whatsapp`
`guion_30s` (timeline)
- Restricciones:
Duracion total aproximada de 30 segundos.
Tono aspiracional.
No inventar datos.
CTA final por WhatsApp.
- Prompt final:
```text
Actua como creador de videos inmobiliarios virales.

Genera un guion de 30 segundos para Reel/TikTok con:
- hook inicial fuerte
- recorrido emocional
- cierre con llamada a la accion por WhatsApp
- tono aspiracional

Datos:
- Propiedad: {{property_details}}
- Ciudad: {{city}}
- Cliente ideal: {{ideal_client}}

Devuelve solo este formato:
hook_inicial: <texto>
recorrido_emocional: <texto>
cta_whatsapp: <texto>
guion_30s:
- 0-5s: ...
- 6-15s: ...
- 16-25s: ...
- 26-30s: ...
```
- Input de ejemplo:
```json
{
  "property_details": "Penthouse frente al mar, 4 dormitorios, terraza con parrillero, 2 cocheras",
  "city": "Punta del Este",
  "ideal_client": "inversores y familias de alto poder adquisitivo"
}
```
- Output esperado (estructura):
```text
hook_inicial: ...
recorrido_emocional: ...
cta_whatsapp: ...
guion_30s:
- 0-5s: ...
- 6-15s: ...
- 16-25s: ...
- 26-30s: ...
```

---

## MKT-04 - Clasificacion de lead + respuesta de avance
- ID: `MKT-04`
- Objetivo: clasificar intencion comercial y responder para avanzar a visita.
- Inputs requeridos:
`{{lead_message}}`
`{{property_type}}`
`{{city}}`
- Output exacto:
`clasificacion` (solo una opcion valida)
`razon`
`respuesta_sugerida`
- Restricciones:
Clasificacion valida solo:
`Comprador caliente`
`Interesado medio`
`Curioso`
Respuesta breve, profesional y orientada a siguiente paso.
No inventar contexto.
- Prompt final:
```text
Eres un asistente de ventas inmobiliarias.

Analiza este mensaje de un posible cliente y clasificalo en:
- Comprador caliente
- Interesado medio
- Curioso

Luego sugiere la mejor respuesta para avanzar la venta.

Datos:
- Mensaje: {{lead_message}}
- Tipo de propiedad: {{property_type}}
- Ciudad: {{city}}

Devuelve solo este formato:
clasificacion: <Comprador caliente|Interesado medio|Curioso>
razon: <explicacion breve>
respuesta_sugerida: <mensaje recomendado>
```
- Input de ejemplo:
```json
{
  "lead_message": "Hola, me interesa coordinar visita esta semana y saber si acepta banco.",
  "property_type": "Apartamento",
  "city": "Montevideo"
}
```
- Output esperado (estructura):
```text
clasificacion: Comprador caliente
razon: ...
respuesta_sugerida: ...
```

---

## MKT-05 - Secuencia WhatsApp x5 para lograr visita
- ID: `MKT-05`
- Objetivo: crear seguimiento de conversion a visita presencial.
- Inputs requeridos:
`{{property_type}}`
`{{ideal_client}}`
`{{city}}`
- Output exacto:
`mensaje_1`
`mensaje_2`
`mensaje_3`
`mensaje_4`
`mensaje_5`
- Restricciones:
Tono profesional y cercano.
Secuencia progresiva con CTA claro.
No agresivo ni repetitivo.
No inventar datos.
- Prompt final:
```text
Actua como CRM inmobiliario inteligente.

Crea una secuencia de 5 mensajes de seguimiento por WhatsApp para un cliente interesado en:
{{property_type}}

Contexto:
- Cliente ideal: {{ideal_client}}
- Ciudad: {{city}}

Objetivo: lograr visita presencial.
Tono: profesional y cercano.

Devuelve solo este formato:
mensaje_1: <texto>
mensaje_2: <texto>
mensaje_3: <texto>
mensaje_4: <texto>
mensaje_5: <texto>
```
- Input de ejemplo:
```json
{
  "property_type": "casa de 3 dormitorios",
  "ideal_client": "familias",
  "city": "Ciudad de la Costa"
}
```
- Output esperado (estructura):
```text
mensaje_1: ...
mensaje_2: ...
mensaje_3: ...
mensaje_4: ...
mensaje_5: ...
```

---

## MKT-06 - Descripcion Uruguay SEO (max 120 palabras)
- ID: `MKT-06`
- Objetivo: reescritura profesional para mercado uruguayo y busqueda Google.
- Inputs requeridos:
`{{property_description}}`
`{{property_details}}`
`{{city}}`
- Output exacto:
`descripcion_uy_final`
- Restricciones:
No exceder 120 palabras.
Tono profesional.
SEO local.
No inventar datos.
- Prompt final:
```text
Actua como experto en marketing inmobiliario en Uruguay.

Reescribe esta descripcion para que sea:
- clara y persuasiva
- optimizada para busqueda en Google
- con tono profesional
- maximo 120 palabras

Datos:
- Descripcion base: {{property_description}}
- Detalles: {{property_details}}
- Ciudad: {{city}}

Devuelve solo este formato:
descripcion_uy_final: <texto>
```
- Input de ejemplo:
```json
{
  "property_description": "Casa luminosa en barrio tranquilo.",
  "property_details": "3 dormitorios, fondo, parrillero, 2 banos, 120 m2 construidos",
  "city": "Salto"
}
```
- Output esperado (estructura):
```text
descripcion_uy_final: ...
```

---

## MKT-07 - Social Pack Uruguay (Instagram, Marketplace, WhatsApp, hashtags)
- ID: `MKT-07`
- Objetivo: generar copy multicanal con enfoque de venta de propiedades en Uruguay.
- Inputs requeridos:
`{{property_details}}`
`{{city}}`
`{{ideal_client}}`
- Output exacto:
`instagram_text`
`facebook_marketplace_text`
`whatsapp_short`
`hashtags_locales` (5 hashtags)
- Restricciones:
Tono comercial profesional.
Lenguaje local Uruguay.
No inventar datos.
Cobertura de 4 salidas obligatorias.
- Prompt final:
```text
Eres especialista en venta de propiedades en Uruguay.

Genera:
- texto para Instagram
- texto para Facebook Marketplace
- mensaje corto para WhatsApp
- 5 hashtags locales

Datos de la propiedad: {{property_details}}
Ciudad: {{city}}
Tipo de cliente ideal: {{ideal_client}}

Devuelve solo este formato:
instagram_text: <texto>
facebook_marketplace_text: <texto>
whatsapp_short: <texto>
hashtags_locales:
- #...
- #...
- #...
- #...
- #...
```
- Input de ejemplo:
```json
{
  "property_details": "Monoambiente amoblado, renta inmediata, gastos bajos, cerca de facultades",
  "city": "Montevideo",
  "ideal_client": "inversores"
}
```
- Output esperado (estructura):
```text
instagram_text: ...
facebook_marketplace_text: ...
whatsapp_short: ...
hashtags_locales:
- #...
- #...
- #...
- #...
- #...
```

---

## MKT-08 - Respuesta corta para coordinar visita (max 60 palabras)
- ID: `MKT-08`
- Objetivo: responder un lead de forma cercana y orientada a visita.
- Inputs requeridos:
`{{lead_message}}`
`{{property_type}}`
`{{city}}`
- Output exacto:
`respuesta_breve`
- Restricciones:
Maximo 60 palabras.
Tono cercano y profesional.
Incluir invitacion a coordinar visita.
No inventar condiciones.
- Prompt final:
```text
Actua como agente inmobiliario profesional.

Responde este mensaje de un posible comprador con:
- tono cercano
- invitacion a coordinar visita
- maximo 60 palabras

Datos:
- Mensaje: {{lead_message}}
- Tipo de propiedad: {{property_type}}
- Ciudad: {{city}}

Devuelve solo este formato:
respuesta_breve: <texto>
```
- Input de ejemplo:
```json
{
  "lead_message": "Me interesa pero trabajo todo el dia. Hay horario tarde?",
  "property_type": "casa",
  "city": "Maldonado"
}
```
- Output esperado (estructura):
```text
respuesta_breve: ...
```

---

## TECH-01 - Login robusto Next.js + InsForge
- ID: `TECH-01`
- Objetivo: obtener implementacion completa de auth robusta con cookies httpOnly y middleware.
- Inputs requeridos:
`{{code_snippet}}` (opcional, contexto actual)
- Output exacto:
`estructura_de_archivos`
`route_handlers_completos`
`ejemplo_en_componentes`
- Restricciones:
Usar InsForge:
`insforge.auth.signUp`
`insforge.auth.signInWithPassword`
Guardar `accessToken` en cookie httpOnly desde server.
Incluir `getCurrentUser` con `GET /api/auth/sessions/current`.
Incluir middleware para proteger `/dashboard`.
No devolver pseudo codigo.
- Prompt final:
```text
Eres un senior fullstack. Estoy usando InsForge como backend.

Objetivo: login robusto en Next.js.
- Registro: insforge.auth.signUp
- Login: insforge.auth.signInWithPassword
- Guardar accessToken en cookie httpOnly (server action o route handler)
- Funcion getCurrentUser usando GET /api/auth/sessions/current
- Middleware para proteger /dashboard

Contexto opcional del proyecto:
{{code_snippet}}

Devuelveme exactamente:
1) estructura de archivos
2) codigo completo de route handlers
3) ejemplo de uso en componentes
```
- Input de ejemplo:
```json
{
  "code_snippet": "App Router con /app/api/auth y middleware.ts"
}
```
- Output esperado (estructura):
```text
1) estructura de archivos
2) codigo completo de route handlers
3) ejemplo de uso en componentes
```

---

## TECH-02 - Flujo MVP property + fotos + rollback
- ID: `TECH-02`
- Objetivo: generar implementacion TypeScript de alta fidelidad para flujo de alta de propiedad y fotos.
- Inputs requeridos:
`{{code_snippet}}` (SDK/cliente actual, opcional)
`{{property_type}}` (opcional, contexto)
- Output exacto:
`codigo_typescript_completo`
- Restricciones:
Secuencia obligatoria:
1) Insertar `properties` y obtener `property_id`.
2) Subir N imagenes a bucket `property-photos` con path `properties/{property_id}/{timestamp}-{filename}`.
3) Guardar en `property_photos`: `property_id`, `photo_url=data.url`, `photo_key=data.key`, `sort_order`.
Manejo de errores por paso.
Rollback simple si falla upload.
Validaciones: max 10 fotos, max 5MB por foto.
- Prompt final:
```text
Actua como arquitecto. Necesito flujo MVP en InsForge:

1) Insertar property en tabla properties y obtener property_id
2) Subir N imagenes a bucket "property-photos" con path:
   properties/{property_id}/{timestamp}-{filename}
3) Guardar en property_photos:
   property_id, photo_url=data.url, photo_key=data.key, sort_order

Considera:
- manejar errores por paso
- rollback simple: si falla upload, borrar property o marcar draft
- validacion: max 10 fotos, max 5MB

Contexto opcional:
- Tipo de propiedad: {{property_type}}
- Codigo base: {{code_snippet}}

Devuelveme codigo TypeScript completo.
```
- Input de ejemplo:
```json
{
  "property_type": "apartamento",
  "code_snippet": "cliente insforge inicializado en lib/insforge.ts"
}
```
- Output esperado (estructura):
```text
<archivo o bloque TypeScript completo listo para ejecutar>
```

---

## TECH-03 - SQL schema (solo SQL)
- ID: `TECH-03`
- Objetivo: generar SQL estricto para tablas base inmobiliarias.
- Inputs requeridos:
`{{code_snippet}}` (opcional, convenciones existentes)
- Output exacto:
Solo SQL.
- Restricciones:
Generar SQL Postgres para:
`profiles`, `properties`, `property_photos`.
Requisitos obligatorios:
UUID PK.
Foreign keys.
`created_at default now()`.
Indices: `properties(owner_id)`, `property_photos(property_id)`.
Status tipo enum-like con `check constraint`.
No agregar explicaciones.
- Prompt final:
```text
Genera SQL Postgres para:
profiles, properties, property_photos
con:
- UUID PK
- foreign keys
- created_at default now()
- indices: properties(owner_id), property_photos(property_id)
- status enum-like (check constraint)

Contexto opcional:
{{code_snippet}}

Devuelve solo SQL.
```
- Input de ejemplo:
```json
{
  "code_snippet": "Postgres 15, schema public"
}
```
- Output esperado (estructura):
```sql
-- solo sentencias SQL
```

---

## TECH-04 - Diagnostico de errores (auth/token, DB, storage)
- ID: `TECH-04`
- Objetivo: diagnosticar capa de fallo y proponer fix operativo exacto.
- Inputs requeridos:
`{{error_text}}`
`{{code_snippet}}`
- Output exacto:
`diagnostico_capa`
`causa_probable`
`fix_exacto`
`request_incorrecta` (headers/body)
`logs_minimos_recomendados`
- Restricciones:
Clasificar explicitamente en auth/token, DB o storage.
Indicar request concreta que esta mal.
Sugerir fix accionable, no generico.
Sugerir logs minimos con campos exactos.
No inventar servicios no presentes en el error.
- Prompt final:
```text
Te paso logs/errores. Necesito que:
- identifiques si es auth/token, DB, o storage
- propongas fix exacto
- me digas que request esta mal (headers/body)
- me sugieras logs minimos que debo imprimir

Error:
{{error_text}}

Codigo:
{{code_snippet}}

Devuelve solo este formato:
diagnostico_capa: <auth/token|DB|storage>
causa_probable: <texto>
fix_exacto: <pasos concretos>
request_incorrecta:
- endpoint: <...>
- headers_mal: <...>
- body_mal: <...>
logs_minimos_recomendados:
- <campo 1>
- <campo 2>
- <campo 3>
- <campo 4>
```
- Input de ejemplo:
```json
{
  "error_text": "401 invalid token on /api/partners/properties",
  "code_snippet": "fetch('/api/partners/properties', { headers: { Authorization: token } })"
}
```
- Output esperado (estructura):
```text
diagnostico_capa: auth/token
causa_probable: ...
fix_exacto: ...
request_incorrecta:
- endpoint: ...
- headers_mal: ...
- body_mal: ...
logs_minimos_recomendados:
- ...
- ...
- ...
- ...
```

---

## Checklist de validacion del pack
- Dedupe: existe una sola version de clasificacion de leads (`MKT-04`).
- Limites: `MKT-01` (150), `MKT-06` (120), `MKT-08` (60) documentados como obligatorios.
- Cobertura social: `MKT-02` y `MKT-07` exigen 4 salidas fijas.
- Clasificacion: `MKT-04` limita opciones a 3 etiquetas validas.
- Tecnico: `TECH-03` exige salida solo SQL.
- Tecnico: `TECH-04` exige capa, request mal formada, fix exacto y logs minimos.
- Placeholders: todos usan `{{snake_case}}`.
