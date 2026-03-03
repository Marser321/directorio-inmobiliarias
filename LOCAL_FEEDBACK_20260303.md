# Feedback Local Session - 2026-03-03

## Scope
Rutas revisadas en local para feedback inicial:
- `/`
- `/search`
- `/explore`
- `/partners`
- `/property/1`
- `/property/12`

Evidencia:
- `.migration-evidence/phase1_route_check.log`
- `.migration-evidence/phase1_meta_check.log`

## Lista única de feedback (formato fijo)

| ID | Ruta | Problema observado | Severidad (P0-P3) | Propuesta |
|---|---|---|---|---|
| FB-001 | `/partners` | Title SSR con marca duplicada (`... | Luxe Estate | Luxe Estate`). | P2 | Normalizar metadatos de title por layout/route para evitar duplicados. |
| FB-002 | `/search` | No se detecta `<h1>` en HTML SSR inicial. Riesgo SEO/accesibilidad en render inicial. | P1 | Garantizar un `h1` SSR en la vista principal de búsqueda. |
| FB-003 | `/explore` | No se detecta `<h1>` en HTML SSR inicial. | P1 | Definir heading principal SSR y jerarquía semántica estable. |
| FB-004 | `/property/1`, `/property/12` | No se detecta `<h1>` en HTML SSR inicial en ficha de propiedad. | P1 | Asegurar `h1` SSR con título de propiedad para SEO y screen readers. |
| FB-005 | `/` (discoverability), `/lifestyle/*` | Rutas lifestyle responden `307` a `/search?q=Lifestyle` (flujo genérico). Puede diluir intención por categoría. | P2 | Mapear cada lifestyle a filtros concretos (`zone`, `tags`, `price_band`) en vez de query genérica. |
| FB-006 | `/search`, `/explore` | Backfill parcial de coordenadas: quedan propiedades con `location_id` pero coordenadas incompletas (ver ledger DB). | P1 | Completar centroides faltantes y rerun controlado de backfill para mejorar precisión de mapa/filtros geográficos. |

## Prioridad sugerida
1. P1 semántica SSR (`h1`) en `/search`, `/explore`, `/property/[id]`.
2. P1 completitud de coordenadas para reducir inconsistencias de mapa.
3. P2 limpieza de metadata title.
4. P2 UX de lifestyle routing.

## Verificación UX implementada (2026-03-03)

| ID | Ruta | Problema observado | Severidad (P0-P3) | Propuesta |
|---|---|---|---|---|
| FB-007 | `/search`, cabeceras con CTA | Botones superiores `Ingresar`/`Publicar` sin navegación efectiva. | P0 | Resuelto con componente reutilizable `AuthCtas` y rutas dinámicas por sesión (`/partners/login`, `/partners/registro`, `/partners/dashboard`, `/partners/dashboard/new`). |
| FB-008 | `/search` | Sensación de scroll partido por contenedores con scroll interno + mapa capturando rueda. | P1 | Resuelto: layout con scroll de documento, lista sin `overflow-y` en desktop, mapa sticky y `scrollWheelZoom=false`. |
| FB-009 | `/` bloque `MapWithListings` | En modo split la lista obligaba scroll interno independiente. | P2 | Resuelto: lista en flujo normal (sin `max-h/overflow-y`), mapa sticky en desktop y rueda del mapa desactivada por defecto. |

### Evidencia técnica (gate)
- `.migration-evidence/ux_nav_scroll_lint.log`
- `.migration-evidence/ux_nav_scroll_build.log`
- `.migration-evidence/ux_nav_scroll_test_full.log`
- `.migration-evidence/ux_nav_scroll_smoke.log`
- `.migration-evidence/ux_nav_scroll_smoke_server.log`

## Verificación Buyer Depth (rollout operativo)

| ID | Ruta | Problema observado | Severidad (P0-P3) | Propuesta |
|---|---|---|---|---|
| FB-010 | `/search` + `/compare` | Con flags activos, comparador debe responder contrato completo y no quedar en 503. | P1 | Verificado: `GET /api/compare?ids=1,2` retorna `200` con payload normalizado. |
| FB-011 | `/search` (`zone insights`) | Insights no deben degradar por falta de cliente admin cuando `FEATURE_ZONE_INSIGHTS=true`. | P1 | Verificado: `GET /api/insights/zones` retorna `200` (empty state válido). |
| FB-012 | `/api/alerts/run` | Antes de migración buyer-depth fallaba por tablas ausentes. | P0 | Resuelto: tras aplicar `20260303_buyer_depth_features.sql`, `POST /api/alerts/run` con `x-cron-secret` retorna `200`. |
| FB-013 | `/api/health/config` | Riesgo de drift entre flags declarados y runtime efectivo. | P1 | Verificado: `compare/favoritesSync/savedSearch/whatsappAlerts/zoneInsights` en `true` en runtime local. |
| FB-014 | `funnel events` | Nuevos eventos podían quedar sin trazas efectivas en DB. | P1 | Verificado: existen filas para `compare_opened`, `compare_property_added`, `compare_property_removed`, `saved_search_created`, `whatsapp_alert_sent`. |

### Evidencia técnica (buyer depth)
- `.migration-evidence/cpl1_check_env.log`
- `.migration-evidence/cpl1_check_env_strict.log`
- `.migration-evidence/cpl2_lint.log`
- `.migration-evidence/cpl2_build.log`
- `.migration-evidence/cpl2_test_full.log`
- `.migration-evidence/cpl2_smoke.log`
- `.migration-evidence/cpl2_test_schema.log`
- `.migration-evidence/cpl2_health_flags.json`
- `.migration-evidence/cpl2_compare_status.txt`
- `.migration-evidence/cpl2_insights_status.txt`
- `.migration-evidence/cps_staging_mcp_sql_20260303.json`
- `.migration-evidence/cps4_test_schema.log`
- `.migration-evidence/cps4_test_full.log`
- `.migration-evidence/cps4_smoke.log`
- `.migration-evidence/cps4_node20_test_schema.log`
- `.migration-evidence/cps4_node20_tests.log`
- `.migration-evidence/cps4_node20_smoke.log`
- `.migration-evidence/cps4_post_validation_sql.json`
- `.migration-evidence/cps4_funnel_new_events_counts.json`

## Verificación Theme Lab Editorial (2026-03-03)

| ID | Ruta | Problema observado | Severidad (P0-P3) | Propuesta |
|---|---|---|---|---|
| FB-015 | `/search` | Percepción de interfaz “plana” sin señales de decisión a simple vista. | P1 | Resuelto: se agrega `depth rail` con resumen de filtros, estado de comparador/favoritos/alertas/insights y capas editoriales por superficie. |
| FB-016 | `/property/[id]` | Ficha visual sin jerarquía fuerte de contexto + acción. | P1 | Resuelto: cabecera editorial con `h1`, tarjetas de contexto y sidebar de decisión (comparador, banda de precio, contacto). |
| FB-017 | `/` + bloques compartidos | Uso inconsistente de acento dorado hardcodeado en componentes core. | P2 | Resuelto: migración a tokens semánticos (`accent-gold-soft/strong`, `surface-*`) en Home/Search/Property touchpoints. |
| FB-018 | `/search`, `/property/[id]` | Riesgo de regresión de accesibilidad/consistencia al activar tema experimental. | P1 | Resuelto: `FEATURE_THEME_LAB_EDITORIAL` con fallback baseline y propagación a runtime (`/api/auth/me`, `/api/health/config`, `auth-context`, `layout`). |

### Evidencia técnica (theme lab editorial)
- `.migration-evidence/theme_lab_lint.log`
- `.migration-evidence/theme_lab_build.log`
- `.migration-evidence/theme_lab_test_full.log`
- `.migration-evidence/theme_lab_smoke.log`

## Verificación Partners/Agencies Depth (2026-03-03)

| ID | Ruta | Problema observado | Severidad (P0-P3) | Propuesta |
|---|---|---|---|---|
| FB-019 | `/partners` | Landing previa sin directorio operativo ni filtros de descubrimiento. | P1 | Resuelto con directorio SSR completo: búsqueda por nombre/ciudad, filtros por plan/verificación, orden operativo y tarjetas con señales de confianza. |
| FB-020 | `/agencies/[slug]` | Perfil público con estructura plana y baja diferenciación entre inmobiliarias. | P1 | Resuelto con hero editorial sobrio, navegación sticky por secciones (`Resumen`, `Propiedades`, `Credenciales`, `Contacto`) y bloques de empty state guiado. |
| FB-021 | `/partners/dashboard` | Acciones rápidas con “coming soon” y navegación privada débil. | P0 | Resuelto con shell persistente para dashboard, menú operativo y quick actions conectadas a rutas reales (`settings`, `leads`, `marketing`, `manager`). |
| FB-022 | `/partners/dashboard/settings` | No existía configuración editable de inmobiliaria con persistencia. | P0 | Resuelto con nueva API interna (`GET/PATCH /api/partners/agency/profile`) + formulario completo con control de permisos (`owner/admin` edita, `member/agent` lectura). |
| FB-023 | `/partners/dashboard/leads` + alias `/partners/dashboard/sniper` | Módulo CRM fragmentado bajo naming “Sniper” y pipeline poco explícito. | P1 | Resuelto con `Leads Center` canónico, métricas por etapa, acciones de estado y alias legacy mantenido por redirección. |

### Evidencia técnica (partners/agencies depth)
- `.migration-evidence/partners_depth_lint.log`
- `.migration-evidence/partners_depth_build.log`
- `.migration-evidence/partners_depth_test_full.log`
- `.migration-evidence/partners_depth_test_schema.log`
- `.migration-evidence/partners_depth_smoke.log`

## Verificación Dashboard + Luxe Studio (2026-03-03)

| ID | Ruta | Problema observado | Severidad (P0-P3) | Propuesta |
|---|---|---|---|---|
| FB-024 | `/partners/dashboard/properties` | No existía ruta canónica para gestión multimedia por propiedad. | P1 | Resuelto: workspace dedicado con métricas de cobertura, `asset_health`, acciones `Editar`, `Media Center`, `Ver público` y CTA contextual de Luxe Studio. |
| FB-025 | `/partners/dashboard/properties/[id]/media` | Edición de fotos/video/tour dispersa, sin panel único por propiedad. | P0 | Resuelto: Media Center con subida, orden, principal, eliminación, edición de `video_url`/`tour_360_url`, preview y guardado sobre APIs existentes. |
| FB-026 | `/partners/dashboard`, wizard media, workspace/media center | Faltaba inserción comercial contextual “sin vender” para servicios de contenido. | P1 | Resuelto: `LuxeStudioRail` reusable embebido en superficies clave con deep-links a marketing (`service`, `propertyId`, `source`). |
| FB-027 | `/partners/dashboard/marketing` + `POST /api/marketing/requests` | Flujo de marketing sin prefill contextual y validación laxa de payload interno. | P1 | Resuelto: rebrand a `Luxe Studio`, prefill por query params y hardening de endpoint (whitelist `type`, saneamiento `details`, logging operativo). |
| FB-028 | `/partners/dashboard/properties/[id]/media` | Faltaba guía por tipo de propiedad para saber cobertura multimedia mínima recomendada. | P1 | Resuelto: preset dinámico (`house/apartment/land/commercial`) con checklist, porcentaje de completitud y CTA contextual a Luxe Studio según faltantes. |
| FB-029 | `/partners/dashboard/properties/[id]/media` | No había criterio automático de calidad visual por imagen (solo conteo de assets). | P1 | Resuelto: scoring automático por foto (`nitidez`, `exposición`, `contraste`, `composición`), badge por imagen, meta-checklist de calidad y persistencia en metadata al guardar. |

### Evidencia técnica (dashboard + luxe studio)
- `.migration-evidence/partners_dashboard_depth_lint.log`
- `.migration-evidence/partners_dashboard_depth_build.log`
- `.migration-evidence/partners_dashboard_depth_test_full.log`
- `.migration-evidence/partners_dashboard_depth_smoke.log`
- `.migration-evidence/partners_dashboard_depth_smoke_server.log`

## Verificación Geocatastro + Legal + Value Score (2026-03-03)

| ID | Ruta | Problema observado | Severidad (P0-P3) | Propuesta |
|---|---|---|---|---|
| FB-030 | `/property/[id]` | Ficha carecía de contexto catastral y precisión de ubicación visible para decisión rápida. | P1 | Resuelto: bloque `Ficha catastral + Value Score` con precisión (`manual/geocodificada/centroide/sin dato`) y fallback sin bloqueo. |
| FB-031 | `/compare` | Comparación no incluía señal de costo/transparencia de inmobiliaria ni datos catastrales orientativos. | P1 | Resuelto: tarjetas muestran `Value Score` desglosado y módulo catastral por propiedad cuando el entorno lo habilita. |
| FB-032 | `/agencies/[slug]` | Perfil de agencia no tenía indicador público sintético de valor total para cliente. | P1 | Resuelto: agregado bloque `Value Score` (costo/transparencia/operación) en resumen, con metodología y fallback seguro. |
| FB-033 | `/legal/comisiones-inmobiliarias` | No existía hub legal informativo centralizado para comisiones y derechos de consumidor. | P0 | Resuelto: nueva guía legal informativa Uruguay + Maldonado con fuentes y fecha de revisión. |
| FB-034 | `/partners/dashboard/settings` | Configuración de perfil no contemplaba política comercial declarada/verificada. | P0 | Resuelto: sección de comisiones con persistencia (`GET/PATCH /api/partners/agency/commission-profile`) y permisos owner/admin. |

### Evidencia técnica (geocatastro + legal + value score)
- `.migration-evidence/geo_legal_score_cp0_lint.log`
- `.migration-evidence/geo_legal_score_cp0_build.log`
- `.migration-evidence/geo_legal_score_cp0_test_full.log`
- `.migration-evidence/geo_legal_score_cp0_smoke.log`
- `.migration-evidence/geo_legal_score_lint.log`
- `.migration-evidence/geo_legal_score_build.log`
- `.migration-evidence/geo_legal_score_test_unit.log`
- `.migration-evidence/geo_legal_score_test_schema.log`
- `.migration-evidence/geo_legal_score_test_full.log`
- `.migration-evidence/geo_legal_score_smoke.log`
- `.migration-evidence/geo_legal_score_smoke_server.log`
- `.migration-evidence/geo_legal_score_node20_test_schema.log`
- `.migration-evidence/geo_legal_score_node20_test_full.log`
- `.migration-evidence/geo_legal_score_node20_smoke.log`
