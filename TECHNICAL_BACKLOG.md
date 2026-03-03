# Technical Backlog (Shared)

## Prioritization policy
- `P0`: release stability and security blockers.
- `P1`: convergence debt that impacts operation and product quality.
- `P2`: DX/performance/observability improvements.

## Items

### TB-001
- Priority: `P0`
- Labels: `db`, `api`
- Context: `profiles.id` is `text` in current backend while policy logic uses `auth.uid()` (`uuid`).
- Expected impact: removes policy-level type mismatch risk in future migrations.
- Risk: medium (schema alignment may require migration and policy updates).
- Acceptance criteria:
  - unified identifier contract documented and applied
  - no explicit cast workaround needed in new policies
  - `npm run test:schema` and `npm run test:full` remain green

### TB-002
- Priority: `P0`
- Labels: `db`, `observability`
- Context: location centroid backfill is partial (`locations.center_lat/lng` still missing in rows).
- Expected impact: better geo filters and map precision in search/explore.
- Risk: low/medium (data quality dependent).
- Acceptance criteria:
  - reduce `properties_missing_coords_with_location_id` to near-zero or justified exceptions
  - rerun and log checkpoint evidence
  - no regression in search API tests

### TB-003
- Priority: `P1`
- Labels: `frontend`, `api`
- Context: SSR semantic heading gaps (`h1`) detected in `/search`, `/explore`, `/property/[id]`.
- Expected impact: SEO/accessibility baseline improvement.
- Risk: low.
- Acceptance criteria:
  - each route renders one stable `h1` in SSR HTML
  - smoke + visual QA unchanged functionally

### TB-004
- Priority: `P1`
- Labels: `frontend`, `devex`
- Context: metadata inconsistency in partners route title.
- Expected impact: consistent branding and SEO metadata quality.
- Risk: low.
- Acceptance criteria:
  - no duplicated brand fragments in route titles
  - metadata snapshots updated

### TB-005
- Priority: `P1`
- Labels: `frontend`, `api`
- Context: lifestyle URLs currently redirect to generic search query.
- Expected impact: improves intent fidelity and conversion tracking by category.
- Risk: medium (routing/filter mapping changes).
- Acceptance criteria:
  - each lifestyle route maps to deterministic filters
  - funnel metrics preserve attribution by lifestyle

### TB-006
- Priority: `P2`
- Labels: `devex`
- Context: onboarding quality depends on consistent env checks and docs usage.
- Expected impact: faster setup and fewer runtime misconfigurations.
- Risk: low.
- Acceptance criteria:
  - `npm run check:env` adopted in local and CI docs
  - onboarding reproducible in <15 minutes

### TB-007
- Priority: `P2`
- Labels: `observability`, `api`
- Context: validation relies mostly on command outputs; no unified health summary artifact per gate.
- Expected impact: faster incident triage and clearer rollouts.
- Risk: low.
- Acceptance criteria:
  - add gate summary artifact per run (`schema/full/smoke`)
  - keep retention policy in repo docs

### TB-008
- Priority: `P1`
- Labels: `frontend`, `api`, `conversion`
- Context: buyer depth roadmap requires persistent favorites + compare flow to increase decision confidence.
- Expected impact: more return sessions and higher `view_to_whatsapp`/`view_to_lead`.
- Risk: medium (new API + UI state sync).
- Acceptance criteria:
  - guest favorites persist locally and logged user can sync to server
  - compare flow supports 2-4 properties with stable URL
  - funnel events include compare actions

### TB-009
- Priority: `P1`
- Labels: `api`, `db`, `observability`
- Context: saved search + WhatsApp alerts add proactive conversion channel.
- Expected impact: higher return intent capture and recurring engagement.
- Risk: medium/high (provider integration + consent constraints).
- Acceptance criteria:
  - saved search CRUD available with explicit consent fields
  - alert run endpoint is secret-protected and idempotent by delivery table unique key
  - Meta provider responses persisted (`sent`/`failed`) with error traces

### TB-010
- Priority: `P1`
- Labels: `frontend`, `ux`, `design-system`
- Context: theme lab editorial mejoró la profundidad visual en Home/Search/Property; falta ampliar la misma consistencia a rutas secundarias (`/explore`, `/partners`, dashboard).
- Expected impact: percepción de producto más sólida y uniforme en todo el funnel.
- Risk: low/medium (ajustes visuales transversales).
- Acceptance criteria:
  - tokens semánticos reemplazan acentos hardcodeados en rutas secundarias
  - contraste AA validado en overlays y textos clave
  - sin regresión en navegación y performance básica

### TB-011
- Priority: `P2`
- Labels: `frontend`, `performance`, `observability`
- Context: motion cinemático requiere control operativo (duraciones, fps, interacción en equipos medios).
- Expected impact: mejor fluidez percibida sin costo excesivo de render.
- Risk: low.
- Acceptance criteria:
  - presupuesto de animaciones definido por componente (200/350/500ms)
  - `prefers-reduced-motion` cubre Home/Search/Property completos
  - métricas de interacción documentadas (LCP/CLS/INP local + staging)

### TB-012
- Priority: `P1`
- Labels: `frontend`, `partners`, `ux`
- Context: dashboard partners ya tiene shell y rutas reales, pero falta completar rutas dedicadas para gestión de propiedades (listado/tab dedicado) sin depender del overview.
- Expected impact: flujo operativo más directo para equipos de inmobiliaria con alta rotación de inventario.
- Risk: low/medium (reorganización de navegación y estados).
- Acceptance criteria:
  - ruta dedicada de propiedades en dashboard (`/partners/dashboard/properties`) con filtros básicos
  - acciones de crear/editar/publicar accesibles sin scroll largo
  - cobertura smoke sin regresiones de navegación

### TB-013
- Priority: `P1`
- Labels: `api`, `partners`, `security`
- Context: `PATCH /api/partners/agency/profile` ya restringe por rol, pero falta auditoría operativa de cambios de perfil (quién cambió qué).
- Expected impact: trazabilidad de cambios y resolución rápida de incidentes de configuración.
- Risk: low.
- Acceptance criteria:
  - registrar eventos de actualización de perfil en tabla de logs admin/agency
  - incluir actor, agency_id, campos alterados y timestamp UTC
  - endpoint mantiene respuesta actual sin romper contrato

### TB-014
- Priority: `P1`
- Labels: `frontend`, `partners`, `media`
- Context: ya existe workspace y media center, pero falta extender presets operativos (plantillas de cobertura por tipo de propiedad y validación visual automática de calidad de assets).
- Expected impact: mejora de consistencia en inventario multimedia y reducción de fichas incompletas.
- Risk: low/medium.
- Acceptance criteria:
  - checklist de cobertura configurable por tipo (casa/apto/terreno)
  - alertas visuales por propiedad con acciones sugeridas
  - persistencia actual (`property_media`, `properties.video_url/virtual_tour_url`) se mantiene sin regresión
- Status update (`2026-03-03`):
  - implementado baseline de presets por tipo en Media Center con porcentaje de completitud y CTA contextual.
  - implementada fase 2: scoring automático por imagen (nitidez, exposición, contraste, composición) con impacto en checklist.
  - pendiente fase 3: calibración por dataset real + consolidación server-side de métricas de calidad.

### TB-015
- Priority: `P1`
- Labels: `api`, `partners`, `marketing`
- Context: `POST /api/marketing/requests` quedó hardened en validación de tipo y details, falta observabilidad de punta a punta para SLA de Luxe Studio.
- Expected impact: soporte más rápido ante incidentes y trazabilidad por origen (`source/property_id`).
- Risk: low.
- Acceptance criteria:
  - dashboard operativo de solicitudes por estado y source
  - alertas internas cuando fallen creaciones o aumente `rejected/failed`
  - reporte semanal con tiempos por estado (`pending -> delivered`)

### TB-016
- Priority: `P1`
- Labels: `geo`, `api`, `frontend`
- Context: se agregó lookup Geocatastro en modo puntual (ficha + comparador) con fallback; falta robustecer confiabilidad del proveedor y normalización de campos para padrones heterogéneos.
- Expected impact: mejor calidad de decisión geográfica sin fricción de navegación.
- Risk: medium (dependencia externa y variabilidad de esquemas ArcGIS).
- Acceptance criteria:
  - monitor de latencia/error del proveedor por ventana horaria
  - normalización estable de `padron/localidad/area_m2` con tests de regresión
  - fallback explícito en UI sin errores 500

### TB-017
- Priority: `P1`
- Labels: `legal`, `scoring`, `partners`
- Context: se incorporó política comercial declarada/verificada y Value Score v1; falta calibración con datos reales y revisión legal periódica de la guía informativa.
- Expected impact: mayor transparencia para comprador/inversor y comparabilidad entre agencias.
- Risk: medium (sensibilidad legal/comercial y sesgo del scoring).
- Acceptance criteria:
  - revisión legal con fecha absoluta y owner por ciclo
  - calibración trimestral de pesos de score (`cost/transparency/operational`)
  - tablero de auditoría de cambios en comisión por agencia (quién/cuándo/qué)

### TB-018
- Priority: `P0`
- Labels: `release`, `env`, `auth`
- Status: `fixed`
- Owner: `platform`
- Date: `2026-03-03`
- Context: producción quedó con flags/keys mal serializadas en Vercel (`\"true\\n\"`), lo que deshabilitó `auth` y endpoints feature-gated.
- Expected impact: elimina bloqueantes de signup/onboarding por drift de entorno.
- Risk: low/medium (riesgo operacional reaparece si se vuelve a cargar env por método no saneado).
- Acceptance criteria:
  - `/api/health/config` reporta flags habilitadas y `envDiagnostics.malformedCount=0`
  - `/api/auth/signup` deja de responder `503` por feature flag
  - existe flujo reproducible de carga env con validación pre/post

### TB-019
- Priority: `P1`
- Labels: `geo`, `reliability`, `api`
- Status: `open`
- Owner: `backend`
- Date: `2026-03-03`
- Context: `GET /api/geo/cadastre/lookup` devuelve `503` intermitente por `provider_error` del proveedor externo (ArcGIS/Geocatastro), aunque el flag está habilitado.
- Expected impact: reduce errores técnicos en lookup catastral y mejora confianza del comparador/ficha.
- Risk: medium (dependencia de tercero y límites de rate/latencia).
- Acceptance criteria:
  - retry/backoff y clasificación de errores implementada
  - fallback UX consistente con `data:null` cuando corresponda
  - métrica operativa de disponibilidad/latencia en dashboard manager

## Theme Lab Acceptance Checklist (2026-03-03)
- [ ] Flag `FEATURE_THEME_LAB_EDITORIAL` OFF mantiene baseline intacto en `/`, `/search`, `/property/[id]`.
- [ ] Flag `FEATURE_THEME_LAB_EDITORIAL` ON aplica capas editoriales y tokens semánticos en las 3 rutas foco.
- [ ] CTAs y railes de decisión siguen operativos (compare/favorites/alerts/insights) con navegación funcional.
- [ ] No hay scroll anidado regresivo en `/search` ni en bloques de mapa/lista.
- [ ] Gate técnico en verde: `lint`, `build`, `test:full`, `smoke`.

## Partners/Agencies Depth Acceptance Checklist (2026-03-03)
- [x] `/partners` funciona como directorio completo con filtros y empty states guiados.
- [x] `/agencies/[slug]` muestra estructura profunda por secciones con navegación sticky.
- [x] Dashboard partners reemplaza quick actions “coming soon” por rutas reales.
- [x] `GET/PATCH /api/partners/agency/profile` operativo con control de permisos (`owner/admin` editan; `member/agent` lectura).
- [x] `Leads Center` canónico en `/partners/dashboard/leads` y alias `/partners/dashboard/sniper` mantenido.
- [x] Gate técnico en verde: `lint`, `build`, `test:schema`, `test:full`, `smoke`.

## Dashboard + Luxe Studio Acceptance Checklist (2026-03-03)
- [x] `/partners/dashboard/properties` operativo como ruta canónica de inventario multimedia.
- [x] `/partners/dashboard/properties/[id]/media` permite subir/ordenar/principal/eliminar fotos y editar `video_url`/`tour_360_url`.
- [x] Media Center incluye preset de cobertura por tipo de propiedad con checklist accionable.
- [x] Media Center incluye scoring visual por imagen (`nitidez/exposición/contraste/composición`) y meta-checklist de calidad.
- [x] `LuxeStudioRail` visible en dashboard, wizard media y media center con deep-link contextual a marketing.
- [x] `/partners/dashboard/marketing` recibe prefill de `service/propertyId/source`.
- [x] `POST /api/marketing/requests` valida `type` por whitelist y sanea `details` sin romper contrato.
- [x] Gate técnico en verde: `lint`, `build`, `test:full`, `smoke`.

## Geo/Legal/Score Acceptance Checklist (2026-03-03)
- [x] Flag `FEATURE_GEOCATASTRO_LOOKUP` propagado a runtime (`/api/auth/me`, `/api/health/config`, auth context).
- [x] `GET /api/geo/cadastre/lookup` operativo con rate-limit, telemetry y fallback.
- [x] `GET/PATCH /api/partners/agency/commission-profile` operativo con permisos owner/admin.
- [x] `GET /api/agencies/value-score` operativo con desglose `cost/transparency/operational`.
- [x] UI enriquecida en `/property/[id]`, `/compare`, `/agencies/[slug]` sin romper contratos previos.
- [x] Hub legal `/legal/comisiones-inmobiliarias` publicado con fuentes y disclaimer.
- [x] Gate técnico en verde: `check:env`, `lint`, `build`, `test:unit`, `test:schema`, `test:full`, `smoke`.

## Quincenal roadmap suggestion
- Sprint Q1: `TB-001`, `TB-002`, `TB-003`
- Sprint Q2: `TB-004`, `TB-005`, `TB-006`, `TB-007`
