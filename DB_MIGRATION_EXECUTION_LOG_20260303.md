# DB Migration Execution Log - 2026-03-03

- Backend: https://dpxpa3f5.us-east.insforge.app
- Channel: InsForge MCP run-raw-sql
- Generated: 2026-03-03T13:37:40.630Z
- Rule: stop-the-line on blocking failure

## CP0 - Preparacion Operativa
- Timestamp: 2026-03-03T13:37:42.345Z
- Ventana/freeze/backup: requiere verificacion operativa externa (no automatizable desde este runner).
- Estado para esta corrida: asumido por operador y registrado como prerequisito.
- Regla activa: si falla bloque critico, abortar corrida.

## CP1 - Baseline Read-Only
- Timestamp: 2026-03-03T13:37:43.773Z

Inventory

```json
{
  "rows": [
    {
      "properties_location_point_geojson": true,
      "properties_location_lat": true,
      "properties_location_lng": true,
      "vibe_scores": true,
      "stripe_webhook_events": true,
      "property_leads": false,
      "user_funnel_events": true
    }
  ],
  "rowCount": 1,
  "fields": [
    {
      "name": "properties_location_point_geojson",
      "dataTypeID": 16
    },
    {
      "name": "properties_location_lat",
      "dataTypeID": 16
    },
    {
      "name": "properties_location_lng",
      "dataTypeID": 16
    },
    {
      "name": "vibe_scores",
      "dataTypeID": 16
    },
    {
      "name": "stripe_webhook_events",
      "dataTypeID": 16
    },
    {
      "name": "property_leads",
      "dataTypeID": 16
    },
    {
      "name": "user_funnel_events",
      "dataTypeID": 16
    }
  ]
}
```

Counts: properties baseline

```json
{
  "rows": [
    {
      "properties_total": "12",
      "properties_with_location_id": "12"
    }
  ],
  "rowCount": 1,
  "fields": [
    {
      "name": "properties_total",
      "dataTypeID": 20
    },
    {
      "name": "properties_with_location_id",
      "dataTypeID": 20
    }
  ]
}
```

Counts: properties incomplete coords

```json
{
  "rows": [
    {
      "properties_missing_coords_with_location_id": "12"
    }
  ],
  "rowCount": 1,
  "fields": [
    {
      "name": "properties_missing_coords_with_location_id",
      "dataTypeID": 20
    }
  ]
}
```

Counts: locations centroids baseline

```json
{
  "rows": [
    {
      "locations_missing_centroids": null,
      "note": "columns center_lat/center_lng missing at baseline"
    }
  ]
}
```


## CP2 - Bloque SQL A (20260217 core)
- Timestamp: 2026-03-03T13:37:44.455Z

Execution

```text
SQL query executed completed successfully:
{
  "rows": []
}
```

Validation

```json
{
  "rows": [
    {
      "properties_location_point_geojson": true,
      "property_media": true,
      "search_queries": true,
      "service_tiers_stripe_price_id": true,
      "vibe_scores": true,
      "stripe_webhook_events": true
    }
  ],
  "rowCount": 1,
  "fields": [
    {
      "name": "properties_location_point_geojson",
      "dataTypeID": 16
    },
    {
      "name": "property_media",
      "dataTypeID": 16
    },
    {
      "name": "search_queries",
      "dataTypeID": 16
    },
    {
      "name": "service_tiers_stripe_price_id",
      "dataTypeID": 16
    },
    {
      "name": "vibe_scores",
      "dataTypeID": 16
    },
    {
      "name": "stripe_webhook_events",
      "dataTypeID": 16
    }
  ]
}
```


## CP3 - Bloque SQL B1 (20260214 critico)
- Timestamp: 2026-03-03T13:37:45.118Z
- Nota: se aplico compatibilidad de tipo en policy (`p.id = auth.uid()::text`) por `profiles.id` en `text`.

Execution

```text
SQL query executed completed successfully:
{
  "rows": []
}
```

Validation

```json
{
  "rows": [
    {
      "user_funnel_events_count": "0",
      "property_leads_count": "0"
    }
  ],
  "rowCount": 1,
  "fields": [
    {
      "name": "user_funnel_events_count",
      "dataTypeID": 20
    },
    {
      "name": "property_leads_count",
      "dataTypeID": 20
    }
  ]
}
```


## CP4 - Bloque SQL B2 (20260214 helpers/view)
- Timestamp: 2026-03-03T13:37:45.788Z

Execution

```text
SQL query executed completed successfully:
{
  "rows": []
}
```

Validation

```json
{
  "rows": [
    {
      "funnel_daily_summary_exists": true,
      "properties_featured_boost_idx": true,
      "properties_status_created_idx": true
    }
  ],
  "rowCount": 1,
  "fields": [
    {
      "name": "funnel_daily_summary_exists",
      "dataTypeID": 16
    },
    {
      "name": "properties_featured_boost_idx",
      "dataTypeID": 16
    },
    {
      "name": "properties_status_created_idx",
      "dataTypeID": 16
    }
  ]
}
```


## CP5 - Bloque SQL C (20260215 geojson mirror)
- Timestamp: 2026-03-03T13:37:46.450Z

Execution

```text
SQL query executed completed successfully:
{
  "rows": []
}
```

Validation

```json
{
  "rows": [
    {
      "fn_sync_geojson_exists": true,
      "trigger_sync_geojson_exists": true,
      "idx_lat": true,
      "idx_lng": true,
      "idx_lat_lng": true
    }
  ],
  "rowCount": 1,
  "fields": [
    {
      "name": "fn_sync_geojson_exists",
      "dataTypeID": 16
    },
    {
      "name": "trigger_sync_geojson_exists",
      "dataTypeID": 16
    },
    {
      "name": "idx_lat",
      "dataTypeID": 16
    },
    {
      "name": "idx_lng",
      "dataTypeID": 16
    },
    {
      "name": "idx_lat_lng",
      "dataTypeID": 16
    }
  ]
}
```


## CP6 - Bloque SQL D (20260216 centroid/backfill)
- Timestamp: 2026-03-03T13:37:48.012Z

Execution

```text
SQL query executed completed successfully:
{
  "rows": []
}
```

Validation: objects

```json
{
  "rows": [
    {
      "has_center_lat": true,
      "has_center_lng": true,
      "fn_fill_coords_exists": true,
      "trigger_fill_coords_exists": true
    }
  ],
  "rowCount": 1,
  "fields": [
    {
      "name": "has_center_lat",
      "dataTypeID": 16
    },
    {
      "name": "has_center_lng",
      "dataTypeID": 16
    },
    {
      "name": "fn_fill_coords_exists",
      "dataTypeID": 16
    },
    {
      "name": "trigger_fill_coords_exists",
      "dataTypeID": 16
    }
  ]
}
```

Validation: post-backfill counts

```json
{
  "rows": [
    {
      "properties_total": "12",
      "properties_with_location_id": "12",
      "properties_missing_coords_with_location_id": "8"
    }
  ],
  "rowCount": 1,
  "fields": [
    {
      "name": "properties_total",
      "dataTypeID": 20
    },
    {
      "name": "properties_with_location_id",
      "dataTypeID": 20
    },
    {
      "name": "properties_missing_coords_with_location_id",
      "dataTypeID": 20
    }
  ]
}
```

Validation: locations missing centroids

```json
{
  "rows": [
    {
      "locations_missing_centroids": "12"
    }
  ],
  "rowCount": 1,
  "fields": [
    {
      "name": "locations_missing_centroids",
      "dataTypeID": 20
    }
  ]
}
```

Validation: sample updated rows

```json
{
  "rows": [
    {
      "id": "11",
      "location_id": "1",
      "location_lat": -34.9594,
      "location_lng": -54.9439,
      "location_point_geojson": {
        "type": "Point",
        "coordinates": [
          -54.9439,
          -34.9594
        ]
      }
    },
    {
      "id": "3",
      "location_id": "3",
      "location_lat": -34.8358,
      "location_lng": -54.6392,
      "location_point_geojson": {
        "type": "Point",
        "coordinates": [
          -54.6392,
          -34.8358
        ]
      }
    },
    {
      "id": "2",
      "location_id": "1",
      "location_lat": -34.9594,
      "location_lng": -54.9439,
      "location_point_geojson": {
        "type": "Point",
        "coordinates": [
          -54.9439,
          -34.9594
        ]
      }
    },
    {
      "id": "1",
      "location_id": "4",
      "location_lat": -34.885,
      "location_lng": -54.7956,
      "location_point_geojson": {
        "type": "Point",
        "coordinates": [
          -54.7956,
          -34.885
        ]
      }
    }
  ],
  "rowCount": 4,
  "fields": [
    {
      "name": "id",
      "dataTypeID": 20
    },
    {
      "name": "location_id",
      "dataTypeID": 20
    },
    {
      "name": "location_lat",
      "dataTypeID": 701
    },
    {
      "name": "location_lng",
      "dataTypeID": 701
    },
    {
      "name": "location_point_geojson",
      "dataTypeID": 3802
    }
  ]
}
```


## CP6.1 - Snapshot Final Objetos Criticos
- Timestamp: 2026-03-03T13:37:48.317Z

Snapshot

```json
{
  "rows": [
    {
      "properties_location_point_geojson": true,
      "vibe_scores": true,
      "stripe_webhook_events": true,
      "property_leads": true,
      "user_funnel_events": true,
      "funnel_daily_summary": true
    }
  ],
  "rowCount": 1,
  "fields": [
    {
      "name": "properties_location_point_geojson",
      "dataTypeID": 16
    },
    {
      "name": "vibe_scores",
      "dataTypeID": 16
    },
    {
      "name": "stripe_webhook_events",
      "dataTypeID": 16
    },
    {
      "name": "property_leads",
      "dataTypeID": 16
    },
    {
      "name": "user_funnel_events",
      "dataTypeID": 16
    },
    {
      "name": "funnel_daily_summary",
      "dataTypeID": 16
    }
  ]
}
```


## CP Summary
- Timestamp: 2026-03-03T13:37:48.318Z
- B2 incident: NO
- SQL critical blocks completed: YES

## CP7 - Validacion funcional y contrato
- Timestamp: 2026-03-03T13:39:18Z

Salida completa: npm run test:schema

```text

> realpde@0.1.0 test:schema
> node --import tsx scripts/check-release-schema.ts

[dotenv@17.2.4] injecting env (12) from .env.local -- tip: 🔐 encrypt with Dotenvx: https://dotenvx.com
OK: properties
OK: property_media
OK: search_queries
OK: service_tiers
OK: vibe_scores
OK: stripe_webhook_events

Release schema contract check passed.
```

Salida completa: npm run test:full

```text

> realpde@0.1.0 test:full
> node scripts/run-funnel-suite.mjs

No server detected on http://localhost:3000. Starting `npm run dev`...

> realpde@0.1.0 dev
> next dev --webpack

▲ Next.js 16.1.6 (webpack)
- Local:         http://localhost:3000
- Network:       http://192.168.1.4:3000
- Environments: .env.local

✓ Starting...
✓ Ready in 1340ms
 GET /api/health/config 200 in 522ms (compile: 505ms, render: 17ms)
 GET /api/health/config 200 in 5ms (compile: 3ms, render: 2ms)
 GET /api/health/config 200 in 4ms (compile: 2ms, render: 1904µs)
 GET /api/search/properties?limit=5 200 in 866ms (compile: 361ms, render: 504ms)
 POST /api/events/funnel 202 in 874ms (compile: 356ms, render: 518ms)
✔ funnel endpoint accepts valid public events (933.494917ms)
 POST /api/events/funnel 400 in 4ms (compile: 1554µs, render: 3ms)
✔ funnel endpoint rejects metadata with PII (6.661792ms)
 GET /api/search/properties?status=for_sale&price_min=100000&price_max=20000000&bedrooms=1&bathrooms=1&limit=20 200 in 173ms (compile: 2ms, render: 171ms)
 GET /api/search/properties?limit=1 200 in 161ms (compile: 1167µs, render: 160ms)
 GET /api/search/properties?sort=price_asc&limit=20 200 in 158ms (compile: 1279µs, render: 157ms)
 GET /api/search/properties?sort=price_desc&limit=20 200 in 169ms (compile: 1035µs, render: 168ms)
 POST /api/events/funnel 202 in 385ms (compile: 1060µs, render: 384ms)
 GET /api/search/properties?sort=newest&limit=2 200 in 168ms (compile: 6ms, render: 162ms)
 POST /api/events/funnel 202 in 173ms (compile: 11ms, render: 162ms)
 GET /api/search/properties?sort=newest&limit=2&cursor=eyJvZmZzZXQiOjJ9 200 in 156ms (compile: 1090µs, render: 155ms)
 POST /api/events/funnel 202 in 157ms (compile: 3ms, render: 155ms)
 GET /api/search/properties?limit=40 200 in 158ms (compile: 1443µs, render: 156ms)
 POST /api/events/funnel 202 in 158ms (compile: 3ms, render: 156ms)
 POST /api/events/funnel 202 in 168ms (compile: 3ms, render: 165ms)
✔ funnel sequence Search -> Ficha -> WhatsApp is accepted (1216.37375ms)
 GET /api/search/properties?search_as_move=true&north=-34.8258&south=-34.8458&east=-54.629200000000004&west=-54.6492&limit=50 200 in 171ms (compile: 1320µs, render: 170ms)
 GET /api/search/properties?limit=1 200 in 4ms (compile: 1712µs, render: 2ms)
 GET /api/search/properties?q=no-result-1772545095600-zzz&limit=12 200 in 163ms (compile: 847µs, render: 162ms)
 POST /api/leads 201 in 1477ms (compile: 995ms, render: 482ms)
✔ lead fallback endpoint creates pending lead (1490.921458ms)
 POST /api/leads 400 in 6ms (compile: 2ms, render: 4ms)
✔ lead fallback validation rejects malformed payload (9.164583ms)
✔ checklist passes with complete publish requirements (0.476375ms)
✔ checklist fails when media count is below minimum (0.075666ms)
✔ checklist fails when description or location is incomplete (0.067417ms)
✔ resolvePropertyCoordinates uses manual coordinates first (0.782583ms)
✔ resolvePropertyCoordinates uses geocoded point before centroid (1.991167ms)
✔ resolvePropertyCoordinates falls back to centroid when geocoding flag is disabled (0.142834ms)
✔ resolvePropertyCoordinates returns none when no source is available (0.059416ms)
✔ search API returns contract fields (911.547708ms)
✔ combined filters enforce constraints (175.480958ms)
✔ price sorting modes are respected (329.985625ms)
✔ cursor pagination returns next page without duplicates (398.162084ms)
✔ search_as_move filters by real map bounds (333.479542ms)
✔ empty results return valid response shape (167.571583ms)
✔ featured outranks non-featured when other factors are equal (3.840917ms)
✔ tie score is stable and resolves by id descending (0.100916ms)
✔ lifestyle match boosts score when filters are present (0.088125ms)
✔ price band match influences ranking inside a target range (0.069833ms)
✔ ranking is deterministic for repeated executions (0.447792ms)
ℹ tests 23
ℹ suites 0
ℹ pass 23
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 3854.246083
 GET /api/health/config 200 in 4ms (compile: 2ms, render: 1681µs)
 GET /api/search/properties?status=for_sale&limit=24&sort=relevance 200 in 160ms (compile: 4ms, render: 157ms)
 GET /api/search/properties?status=for_sale&limit=24&sort=relevance 200 in 3ms (compile: 1023µs, render: 1535µs)
 GET /api/search/properties?status=for_sale&limit=24&sort=relevance 200 in 4ms (compile: 1370µs, render: 2ms)
 GET /api/search/properties?status=for_sale&limit=24&sort=relevance 200 in 1927µs (compile: 748µs, render: 1179µs)
 GET /api/search/properties?status=for_sale&limit=24&sort=relevance 200 in 1590µs (compile: 592µs, render: 999µs)
 GET /api/search/properties?status=for_sale&limit=24&sort=relevance 200 in 2ms (compile: 847µs, render: 1204µs)
 GET /api/search/properties?status=for_sale&limit=24&sort=relevance 200 in 9ms (compile: 2ms, render: 6ms)
 GET /api/search/properties?status=for_sale&limit=24&sort=relevance 200 in 9ms (compile: 2ms, render: 6ms)
 GET /api/search/properties?status=for_sale&limit=24&sort=relevance 200 in 8ms (compile: 2ms, render: 6ms)
 GET /api/search/properties?status=for_sale&limit=24&sort=relevance 200 in 8ms (compile: 1708µs, render: 6ms)
 GET /api/search/properties?status=for_sale&limit=24&sort=relevance 200 in 8ms (compile: 1387µs, render: 6ms)
 GET /api/search/properties?status=for_sale&limit=24&sort=relevance 200 in 5ms (compile: 2ms, render: 3ms)
 GET /api/search/properties?status=for_sale&limit=24&sort=relevance 200 in 5ms (compile: 1445µs, render: 3ms)
 GET /api/search/properties?status=for_sale&limit=24&sort=relevance 200 in 4ms (compile: 1304µs, render: 3ms)
 GET /api/search/properties?status=for_sale&limit=24&sort=relevance 200 in 4ms (compile: 888µs, render: 3ms)
 GET /api/search/properties?status=for_sale&limit=24&sort=relevance 200 in 9ms (compile: 2ms, render: 7ms)
 GET /api/search/properties?status=for_sale&limit=24&sort=relevance 200 in 9ms (compile: 2ms, render: 7ms)
 GET /api/search/properties?status=for_sale&limit=24&sort=relevance 200 in 9ms (compile: 2ms, render: 7ms)
 GET /api/search/properties?status=for_sale&limit=24&sort=relevance 200 in 9ms (compile: 2ms, render: 7ms)
 GET /api/search/properties?status=for_sale&limit=24&sort=relevance 200 in 9ms (compile: 1989µs, render: 7ms)
 GET /api/search/properties?status=for_sale&limit=24&sort=relevance 200 in 8ms (compile: 1748µs, render: 7ms)
 GET /api/search/properties?status=for_sale&limit=24&sort=relevance 200 in 8ms (compile: 1593µs, render: 7ms)
 GET /api/search/properties?status=for_sale&limit=24&sort=relevance 200 in 8ms (compile: 1491µs, render: 7ms)
 GET /api/search/properties?status=for_sale&limit=24&sort=relevance 200 in 8ms (compile: 3ms, render: 5ms)
 GET /api/search/properties?status=for_sale&limit=24&sort=relevance 200 in 8ms (compile: 2ms, render: 5ms)
 GET /api/search/properties?status=for_sale&limit=24&sort=relevance 200 in 8ms (compile: 2ms, render: 5ms)
 GET /api/search/properties?status=for_sale&limit=24&sort=relevance 200 in 8ms (compile: 2ms, render: 5ms)
 GET /api/search/properties?status=for_sale&limit=24&sort=relevance 200 in 8ms (compile: 2ms, render: 5ms)
 GET /api/search/properties?status=for_sale&limit=24&sort=relevance 200 in 7ms (compile: 1752µs, render: 5ms)
 GET /api/search/properties?status=for_sale&limit=24&sort=relevance 200 in 7ms (compile: 1445µs, render: 5ms)
 GET /api/search/properties?status=for_sale&limit=24&sort=relevance 200 in 10ms (compile: 4ms, render: 6ms)
 GET /api/search/properties?status=for_sale&limit=24&sort=relevance 200 in 9ms (compile: 3ms, render: 6ms)
 GET /api/search/properties?status=for_sale&limit=24&sort=relevance 200 in 9ms (compile: 2ms, render: 6ms)
 GET /api/search/properties?status=for_sale&limit=24&sort=relevance 200 in 8ms (compile: 2ms, render: 6ms)
 GET /api/search/properties?status=for_sale&limit=24&sort=relevance 200 in 8ms (compile: 2ms, render: 6ms)
 GET /api/search/properties?status=for_sale&limit=24&sort=relevance 200 in 8ms (compile: 2ms, render: 6ms)
 GET /api/search/properties?status=for_sale&limit=24&sort=relevance 200 in 8ms (compile: 2ms, render: 6ms)
 GET /api/search/properties?status=for_sale&limit=24&sort=relevance 200 in 8ms (compile: 1936µs, render: 6ms)
 GET /api/search/properties?status=for_sale&limit=24&sort=relevance 200 in 11ms (compile: 4ms, render: 7ms)
 GET /api/search/properties?status=for_sale&limit=24&sort=relevance 200 in 11ms (compile: 3ms, render: 7ms)
 GET /api/search/properties?status=for_sale&limit=24&sort=relevance 200 in 10ms (compile: 3ms, render: 7ms)
 GET /api/search/properties?status=for_sale&limit=24&sort=relevance 200 in 10ms (compile: 3ms, render: 7ms)
 GET /api/search/properties?status=for_sale&limit=24&sort=relevance 200 in 10ms (compile: 3ms, render: 7ms)
 GET /api/search/properties?status=for_sale&limit=24&sort=relevance 200 in 10ms (compile: 3ms, render: 7ms)
 GET /api/search/properties?status=for_sale&limit=24&sort=relevance 200 in 10ms (compile: 3ms, render: 7ms)
 GET /api/search/properties?status=for_sale&limit=24&sort=relevance 200 in 10ms (compile: 3ms, render: 7ms)
 GET /api/search/properties?status=for_sale&limit=24&sort=relevance 200 in 9ms (compile: 2ms, render: 6ms)
 GET /api/search/properties?status=for_sale&limit=24&sort=relevance 200 in 8ms (compile: 2ms, render: 6ms)
 GET /api/search/properties?status=for_sale&limit=24&sort=relevance 200 in 8ms (compile: 2ms, render: 6ms)
 GET /api/search/properties?status=for_sale&limit=24&sort=relevance 200 in 8ms (compile: 2ms, render: 6ms)
 GET /api/search/properties?status=for_sale&limit=24&sort=relevance 200 in 8ms (compile: 1944µs, render: 6ms)
 GET /api/search/properties?status=for_sale&limit=24&sort=relevance 200 in 8ms (compile: 1851µs, render: 6ms)
 GET /api/search/properties?status=for_sale&limit=24&sort=relevance 200 in 8ms (compile: 1785µs, render: 6ms)
 GET /api/search/properties?status=for_sale&limit=24&sort=relevance 200 in 8ms (compile: 1720µs, render: 6ms)
 GET /api/search/properties?status=for_sale&limit=24&sort=relevance 200 in 9ms (compile: 3ms, render: 7ms)
 GET /api/search/properties?status=for_sale&limit=24&sort=relevance 200 in 9ms (compile: 2ms, render: 7ms)
 GET /api/search/properties?status=for_sale&limit=24&sort=relevance 200 in 9ms (compile: 2ms, render: 7ms)
 GET /api/search/properties?status=for_sale&limit=24&sort=relevance 200 in 9ms (compile: 2ms, render: 7ms)
 GET /api/search/properties?status=for_sale&limit=24&sort=relevance 200 in 9ms (compile: 2ms, render: 7ms)
 GET /api/search/properties?status=for_sale&limit=24&sort=relevance 200 in 9ms (compile: 2ms, render: 7ms)
 GET /api/search/properties?status=for_sale&limit=24&sort=relevance 200 in 9ms (compile: 2ms, render: 7ms)
 GET /api/search/properties?status=for_sale&limit=24&sort=relevance 200 in 9ms (compile: 1942µs, render: 7ms)
 GET /api/search/properties?status=for_sale&limit=24&sort=relevance 200 in 10ms (compile: 4ms, render: 6ms)
 GET /api/search/properties?status=for_sale&limit=24&sort=relevance 200 in 9ms (compile: 3ms, render: 6ms)
 GET /api/search/properties?status=for_sale&limit=24&sort=relevance 200 in 9ms (compile: 3ms, render: 6ms)
 GET /api/search/properties?status=for_sale&limit=24&sort=relevance 200 in 9ms (compile: 3ms, render: 6ms)
 GET /api/search/properties?status=for_sale&limit=24&sort=relevance 200 in 9ms (compile: 2ms, render: 6ms)
 GET /api/search/properties?status=for_sale&limit=24&sort=relevance 200 in 9ms (compile: 2ms, render: 6ms)
 GET /api/search/properties?status=for_sale&limit=24&sort=relevance 200 in 8ms (compile: 2ms, render: 6ms)
 GET /api/search/properties?status=for_sale&limit=24&sort=relevance 200 in 8ms (compile: 1842µs, render: 6ms)
 GET /api/search/properties?status=for_sale&limit=24&sort=relevance 200 in 9ms (compile: 4ms, render: 6ms)
 GET /api/search/properties?status=for_sale&limit=24&sort=relevance 200 in 9ms (compile: 3ms, render: 6ms)
 GET /api/search/properties?status=for_sale&limit=24&sort=relevance 200 in 9ms (compile: 3ms, render: 6ms)
 GET /api/search/properties?status=for_sale&limit=24&sort=relevance 200 in 9ms (compile: 3ms, render: 6ms)
 GET /api/search/properties?status=for_sale&limit=24&sort=relevance 200 in 9ms (compile: 3ms, render: 6ms)
 GET /api/search/properties?status=for_sale&limit=24&sort=relevance 200 in 9ms (compile: 3ms, render: 6ms)
 GET /api/search/properties?status=for_sale&limit=24&sort=relevance 200 in 8ms (compile: 3ms, render: 6ms)
 GET /api/search/properties?status=for_sale&limit=24&sort=relevance 200 in 8ms (compile: 3ms, render: 6ms)
 GET /api/search/properties?status=for_sale&limit=24&sort=relevance 200 in 8ms (compile: 3ms, render: 6ms)
 GET /api/search/properties?status=for_sale&limit=24&sort=relevance 200 in 8ms (compile: 2ms, render: 6ms)
 GET /api/search/properties?status=for_sale&limit=24&sort=relevance 200 in 8ms (compile: 2ms, render: 6ms)
 GET /api/search/properties?status=for_sale&limit=24&sort=relevance 200 in 8ms (compile: 2ms, render: 6ms)
{
  "baseUrl": "http://localhost:3000",
  "requests": 80,
  "concurrency": 8,
  "elapsed_ms": 128.8,
  "rps": 621.11,
  "latency_ms": {
    "min": 2.65,
    "p50": 11.31,
    "p95": 22.81,
    "p99": 23.03,
    "max": 23.03
  },
  "failed_requests": 0,
  "error_rate": 0,
  "thresholds": {
    "p95_ms": 350,
    "max_error_rate": 0.01
  }
}
 GET /api/search/properties?status=for_sale&limit=24&sort=relevance 200 in 8ms (compile: 2ms, render: 6ms)
 GET /api/search/properties?status=for_sale&limit=24&sort=relevance 200 in 8ms (compile: 2ms, render: 6ms)
 GET /api/search/properties?status=for_sale&limit=24&sort=relevance 200 in 8ms (compile: 1953µs, render: 6ms)
[?25h
```

Salida completa: npm run smoke

```text

> realpde@0.1.0 smoke
> node scripts/audit-links-images-auth.mjs

Audit base URL: http://localhost:3000

=== Pages ===
[
  {
    "path": "/",
    "status": 200,
    "location": null
  },
  {
    "path": "/search",
    "status": 200,
    "location": null
  },
  {
    "path": "/explore",
    "status": 200,
    "location": null
  },
  {
    "path": "/partners",
    "status": 200,
    "location": null
  },
  {
    "path": "/partners/login",
    "status": 200,
    "location": null
  },
  {
    "path": "/partners/registro",
    "status": 200,
    "location": null
  },
  {
    "path": "/demo-antigravity",
    "status": 200,
    "location": null
  },
  {
    "path": "/images/placeholders/luxury-mansion.jpg",
    "status": 200,
    "location": null
  },
  {
    "path": "/images/placeholders/luxury-cinema.jpg",
    "status": 200,
    "location": null
  },
  {
    "path": "/images/placeholders/luxury-tennis.jpg",
    "status": 200,
    "location": null
  },
  {
    "path": "/images/placeholders/luxury-villa.jpg",
    "status": 200,
    "location": null
  },
  {
    "path": "/images/placeholders/luxury-pool.jpg",
    "status": 200,
    "location": null
  },
  {
    "path": "/images/placeholders/luxury-interior.jpg",
    "status": 200,
    "location": null
  },
  {
    "path": "/images/placeholders/luxury-estate.jpg",
    "status": 200,
    "location": null
  },
  {
    "path": "/images/placeholders/luxury-garden.jpg",
    "status": 200,
    "location": null
  },
  {
    "path": "/images/placeholders/luxury-hamptons.jpg",
    "status": 200,
    "location": null
  },
  {
    "path": "/images/placeholders/luxury-living.jpg",
    "status": 200,
    "location": null
  },
  {
    "path": "/images/placeholders/luxury-penthouse.jpg",
    "status": 200,
    "location": null
  },
  {
    "path": "/images/placeholders/luxury-view.jpg",
    "status": 200,
    "location": null
  },
  {
    "path": "/images/placeholders/luxury-sunset.jpg",
    "status": 200,
    "location": null
  },
  {
    "path": "/images/placeholders/luxury-terrace.jpg",
    "status": 200,
    "location": null
  },
  {
    "path": "/lifestyle/beachfront",
    "status": 307,
    "location": "/search?q=Lifestyle"
  },
  {
    "path": "/lifestyle/golf",
    "status": 307,
    "location": "/search?q=Lifestyle"
  },
  {
    "path": "/lifestyle/urban",
    "status": 307,
    "location": "/search?q=Lifestyle"
  },
  {
    "path": "/lifestyle/farm",
    "status": 307,
    "location": "/search?q=Lifestyle"
  },
  {
    "path": "/property/12",
    "status": 200,
    "location": null
  },
  {
    "path": "/property/1",
    "status": 200,
    "location": null
  },
  {
    "path": "/property/3",
    "status": 200,
    "location": null
  },
  {
    "path": "/property/6",
    "status": 200,
    "location": null
  },
  {
    "path": "/property/2",
    "status": 200,
    "location": null
  },
  {
    "path": "/property/8",
    "status": 200,
    "location": null
  },
  {
    "path": "/privacidad",
    "status": 200,
    "location": null
  },
  {
    "path": "/terminos",
    "status": 200,
    "location": null
  },
  {
    "path": "/partners/dashboard",
    "status": 307,
    "location": "/partners/login"
  }
]

=== Broken Internal Links ===
[]

=== Broken Images ===
[]

=== API Checks ===
[
  {
    "path": "/api/auth/me",
    "method": "GET",
    "status": 200
  },
  {
    "path": "/api/marketing/tiers",
    "method": "GET",
    "status": 200
  },
  {
    "path": "/api/marketing/requests",
    "method": "GET",
    "status": 401
  },
  {
    "path": "/api/partners/onboarding",
    "method": "POST",
    "status": 401
  },
  {
    "path": "/api/partners/properties",
    "method": "POST",
    "status": 401
  },
  {
    "path": "/api/stripe/checkout/featured",
    "method": "POST",
    "status": 401
  },
  {
    "path": "/api/stripe/checkout/subscription",
    "method": "POST",
    "status": 401
  },
  {
    "path": "/api/stripe/checkout/service-request",
    "method": "POST",
    "status": 401
  }
]

=== API Failures ===
[]

=== Summary ===
{
  "pagesVisited": 34,
  "internalLinksChecked": 31,
  "imagesChecked": 23,
  "brokenLinks": 0,
  "brokenImages": 0,
  "apiFailures": 0
}
```

## CP7.1 - Compatibilidad Node 20 y Node 24
- Timestamp: 2026-03-03T13:40:36Z

Versiones detectadas

```text
node -v => v24.13.0
node@20 -v => v20.20.0
```

Salida completa: Node20 test:schema

```text
[dotenv@17.2.4] injecting env (12) from .env.local -- tip: 🔐 prevent building .env in docker: https://dotenvx.com/prebuild
OK: properties
OK: property_media
OK: search_queries
OK: service_tiers
OK: vibe_scores
OK: stripe_webhook_events

Release schema contract check passed.
```

Salida completa: Node20 test:full

```text
No server detected on http://localhost:3000. Starting `npm run dev`...

> realpde@0.1.0 dev
> next dev --webpack

▲ Next.js 16.1.6 (webpack)
- Local:         http://localhost:3000
- Network:       http://192.168.1.4:3000
- Environments: .env.local

✓ Starting...
✓ Ready in 1252ms
 GET /api/health/config 200 in 513ms (compile: 499ms, render: 14ms)
TAP version 13
 GET /api/health/config 200 in 13ms (compile: 5ms, render: 8ms)
 GET /api/health/config 200 in 10ms (compile: 3ms, render: 8ms)
 POST /api/events/funnel 202 in 1242ms (compile: 477ms, render: 765ms)
# Subtest: funnel endpoint accepts valid public events
 GET /api/search/properties?limit=5 200 in 1251ms (compile: 480ms, render: 770ms)
ok 1 - funnel endpoint accepts valid public events
  ---
  duration_ms: 1299.510417
  ...
 POST /api/events/funnel 400 in 5ms (compile: 2ms, render: 3ms)
# Subtest: funnel endpoint rejects metadata with PII
ok 2 - funnel endpoint rejects metadata with PII
  ---
  duration_ms: 10.563667
  ...
 GET /api/search/properties?status=for_sale&price_min=100000&price_max=20000000&bedrooms=1&bathrooms=1&limit=20 200 in 222ms (compile: 4ms, render: 218ms)
 GET /api/search/properties?limit=1 200 in 223ms (compile: 1591µs, render: 221ms)
 GET /api/search/properties?sort=price_asc&limit=20 200 in 171ms (compile: 8ms, render: 163ms)
 GET /api/search/properties?sort=price_desc&limit=20 200 in 159ms (compile: 1929µs, render: 157ms)
 POST /api/events/funnel 202 in 398ms (compile: 11ms, render: 388ms)
 GET /api/search/properties?sort=newest&limit=2 200 in 271ms (compile: 2ms, render: 269ms)
 GET /api/search/properties?sort=newest&limit=2&cursor=eyJvZmZzZXQiOjJ9 200 in 157ms (compile: 1143µs, render: 156ms)
 POST /api/events/funnel 202 in 482ms (compile: 1781µs, render: 480ms)
 GET /api/search/properties?limit=40 200 in 159ms (compile: 1282µs, render: 158ms)
 POST /api/events/funnel 202 in 159ms (compile: 1947µs, render: 157ms)
 GET /api/search/properties?search_as_move=true&north=-34.8258&south=-34.8458&east=-54.629200000000004&west=-54.6492&limit=50 200 in 160ms (compile: 1111µs, render: 159ms)
 POST /api/events/funnel 202 in 157ms (compile: 1385µs, render: 155ms)
 GET /api/search/properties?q=no-result-1772545187152-zzz&limit=12 200 in 163ms (compile: 1118µs, render: 162ms)
 POST /api/events/funnel 202 in 158ms (compile: 1624µs, render: 156ms)
# Subtest: funnel sequence Search -> Ficha -> WhatsApp is accepted
ok 3 - funnel sequence Search -> Ficha -> WhatsApp is accepted
  ---
  duration_ms: 1593.651459
  ...
 GET /api/search/properties?limit=1 200 in 3ms (compile: 1298µs, render: 1689µs)
 POST /api/leads 201 in 1565ms (compile: 838ms, render: 727ms)
# Subtest: lead fallback endpoint creates pending lead
ok 4 - lead fallback endpoint creates pending lead
  ---
  duration_ms: 1571.375583
  ...
 POST /api/leads 400 in 8ms (compile: 3ms, render: 5ms)
# Subtest: lead fallback validation rejects malformed payload
ok 5 - lead fallback validation rejects malformed payload
  ---
  duration_ms: 13.234042
  ...
# Subtest: checklist passes with complete publish requirements
ok 6 - checklist passes with complete publish requirements
  ---
  duration_ms: 0.787708
  ...
# Subtest: checklist fails when media count is below minimum
ok 7 - checklist fails when media count is below minimum
  ---
  duration_ms: 0.309167
  ...
# Subtest: checklist fails when description or location is incomplete
ok 8 - checklist fails when description or location is incomplete
  ---
  duration_ms: 0.136125
  ...
# Subtest: resolvePropertyCoordinates uses manual coordinates first
ok 9 - resolvePropertyCoordinates uses manual coordinates first
  ---
  duration_ms: 0.754166
  ...
# Subtest: resolvePropertyCoordinates uses geocoded point before centroid
ok 10 - resolvePropertyCoordinates uses geocoded point before centroid
  ---
  duration_ms: 2.24925
  ...
# Subtest: resolvePropertyCoordinates falls back to centroid when geocoding flag is disabled
ok 11 - resolvePropertyCoordinates falls back to centroid when geocoding flag is disabled
  ---
  duration_ms: 0.187292
  ...
# Subtest: resolvePropertyCoordinates returns none when no source is available
ok 12 - resolvePropertyCoordinates returns none when no source is available
  ---
  duration_ms: 0.0625
  ...
# Subtest: search API returns contract fields
ok 13 - search API returns contract fields
  ---
  duration_ms: 1301.356083
  ...
# Subtest: combined filters enforce constraints
ok 14 - combined filters enforce constraints
  ---
  duration_ms: 226.848708
  ...
# Subtest: price sorting modes are respected
ok 15 - price sorting modes are respected
  ---
  duration_ms: 341.228709
  ...
# Subtest: cursor pagination returns next page without duplicates
ok 16 - cursor pagination returns next page without duplicates
  ---
  duration_ms: 431.748625
  ...
# Subtest: search_as_move filters by real map bounds
ok 17 - search_as_move filters by real map bounds
  ---
  duration_ms: 323.106459
  ...
# Subtest: empty results return valid response shape
ok 18 - empty results return valid response shape
  ---
  duration_ms: 166.910708
  ...
# Subtest: featured outranks non-featured when other factors are equal
ok 19 - featured outranks non-featured when other factors are equal
  ---
  duration_ms: 2.472959
  ...
# Subtest: tie score is stable and resolves by id descending
ok 20 - tie score is stable and resolves by id descending
  ---
  duration_ms: 0.270458
  ...
# Subtest: lifestyle match boosts score when filters are present
ok 21 - lifestyle match boosts score when filters are present
  ---
  duration_ms: 0.223542
  ...
# Subtest: price band match influences ranking inside a target range
ok 22 - price band match influences ranking inside a target range
  ---
  duration_ms: 0.188416
  ...
# Subtest: ranking is deterministic for repeated executions
ok 23 - ranking is deterministic for repeated executions
  ---
  duration_ms: 1.124208
  ...
1..23
# tests 23
# suites 0
# pass 23
# fail 0
# cancelled 0
# skipped 0
# todo 0
# duration_ms 4760.128667
 GET /api/health/config 200 in 5ms (compile: 3ms, render: 1805µs)
 GET /api/search/properties?status=for_sale&limit=24&sort=relevance 200 in 247ms (compile: 5ms, render: 242ms)
 GET /api/search/properties?status=for_sale&limit=24&sort=relevance 200 in 5ms (compile: 2ms, render: 3ms)
 GET /api/search/properties?status=for_sale&limit=24&sort=relevance 200 in 5ms (compile: 3ms, render: 2ms)
 GET /api/search/properties?status=for_sale&limit=24&sort=relevance 200 in 3ms (compile: 1401µs, render: 1775µs)
 GET /api/search/properties?status=for_sale&limit=24&sort=relevance 200 in 4ms (compile: 1406µs, render: 2ms)
 GET /api/search/properties?status=for_sale&limit=24&sort=relevance 200 in 12ms (compile: 7ms, render: 6ms)
 GET /api/search/properties?status=for_sale&limit=24&sort=relevance 200 in 9ms (compile: 4ms, render: 6ms)
 GET /api/search/properties?status=for_sale&limit=24&sort=relevance 200 in 9ms (compile: 3ms, render: 6ms)
 GET /api/search/properties?status=for_sale&limit=24&sort=relevance 200 in 7ms (compile: 1794µs, render: 6ms)
 GET /api/search/properties?status=for_sale&limit=24&sort=relevance 200 in 9ms (compile: 5ms, render: 4ms)
 GET /api/search/properties?status=for_sale&limit=24&sort=relevance 200 in 7ms (compile: 3ms, render: 4ms)
 GET /api/search/properties?status=for_sale&limit=24&sort=relevance 200 in 6ms (compile: 1956µs, render: 4ms)
 GET /api/search/properties?status=for_sale&limit=24&sort=relevance 200 in 6ms (compile: 1590µs, render: 4ms)
 GET /api/search/properties?status=for_sale&limit=24&sort=relevance 200 in 6ms (compile: 1282µs, render: 4ms)
 GET /api/search/properties?status=for_sale&limit=24&sort=relevance 200 in 11ms (compile: 5ms, render: 6ms)
 GET /api/search/properties?status=for_sale&limit=24&sort=relevance 200 in 9ms (compile: 3ms, render: 6ms)
 GET /api/search/properties?status=for_sale&limit=24&sort=relevance 200 in 9ms (compile: 3ms, render: 6ms)
 GET /api/search/properties?status=for_sale&limit=24&sort=relevance 200 in 9ms (compile: 3ms, render: 6ms)
 GET /api/search/properties?status=for_sale&limit=24&sort=relevance 200 in 8ms (compile: 3ms, render: 6ms)
 GET /api/search/properties?status=for_sale&limit=24&sort=relevance 200 in 8ms (compile: 2ms, render: 6ms)
 GET /api/search/properties?status=for_sale&limit=24&sort=relevance 200 in 8ms (compile: 2ms, render: 6ms)
 GET /api/search/properties?status=for_sale&limit=24&sort=relevance 200 in 10ms (compile: 3ms, render: 7ms)
 GET /api/search/properties?status=for_sale&limit=24&sort=relevance 200 in 9ms (compile: 2ms, render: 7ms)
 GET /api/search/properties?status=for_sale&limit=24&sort=relevance 200 in 9ms (compile: 2ms, render: 7ms)
 GET /api/search/properties?status=for_sale&limit=24&sort=relevance 200 in 9ms (compile: 2ms, render: 7ms)
 GET /api/search/properties?status=for_sale&limit=24&sort=relevance 200 in 9ms (compile: 1920µs, render: 7ms)
 GET /api/search/properties?status=for_sale&limit=24&sort=relevance 200 in 8ms (compile: 1659µs, render: 7ms)
 GET /api/search/properties?status=for_sale&limit=24&sort=relevance 200 in 13ms (compile: 4ms, render: 9ms)
 GET /api/search/properties?status=for_sale&limit=24&sort=relevance 200 in 12ms (compile: 3ms, render: 9ms)
 GET /api/search/properties?status=for_sale&limit=24&sort=relevance 200 in 11ms (compile: 2ms, render: 9ms)
 GET /api/search/properties?status=for_sale&limit=24&sort=relevance 200 in 11ms (compile: 2ms, render: 9ms)
 GET /api/search/properties?status=for_sale&limit=24&sort=relevance 200 in 11ms (compile: 2ms, render: 9ms)
 GET /api/search/properties?status=for_sale&limit=24&sort=relevance 200 in 11ms (compile: 2ms, render: 9ms)
 GET /api/search/properties?status=for_sale&limit=24&sort=relevance 200 in 11ms (compile: 1926µs, render: 9ms)
 GET /api/search/properties?status=for_sale&limit=24&sort=relevance 200 in 11ms (compile: 1826µs, render: 9ms)
 GET /api/search/properties?status=for_sale&limit=24&sort=relevance 200 in 10ms (compile: 3ms, render: 8ms)
 GET /api/search/properties?status=for_sale&limit=24&sort=relevance 200 in 10ms (compile: 3ms, render: 8ms)
 GET /api/search/properties?status=for_sale&limit=24&sort=relevance 200 in 10ms (compile: 3ms, render: 8ms)
 GET /api/search/properties?status=for_sale&limit=24&sort=relevance 200 in 10ms (compile: 2ms, render: 8ms)
 GET /api/search/properties?status=for_sale&limit=24&sort=relevance 200 in 10ms (compile: 2ms, render: 8ms)
 GET /api/search/properties?status=for_sale&limit=24&sort=relevance 200 in 10ms (compile: 2ms, render: 8ms)
 GET /api/search/properties?status=for_sale&limit=24&sort=relevance 200 in 10ms (compile: 2ms, render: 8ms)
 GET /api/search/properties?status=for_sale&limit=24&sort=relevance 200 in 9ms (compile: 1779µs, render: 8ms)
 GET /api/search/properties?status=for_sale&limit=24&sort=relevance 200 in 10ms (compile: 4ms, render: 7ms)
 GET /api/search/properties?status=for_sale&limit=24&sort=relevance 200 in 10ms (compile: 4ms, render: 7ms)
 GET /api/search/properties?status=for_sale&limit=24&sort=relevance 200 in 10ms (compile: 3ms, render: 7ms)
 GET /api/search/properties?status=for_sale&limit=24&sort=relevance 200 in 10ms (compile: 3ms, render: 7ms)
 GET /api/search/properties?status=for_sale&limit=24&sort=relevance 200 in 10ms (compile: 3ms, render: 7ms)
 GET /api/search/properties?status=for_sale&limit=24&sort=relevance 200 in 10ms (compile: 3ms, render: 7ms)
 GET /api/search/properties?status=for_sale&limit=24&sort=relevance 200 in 10ms (compile: 3ms, render: 7ms)
 GET /api/search/properties?status=for_sale&limit=24&sort=relevance 200 in 10ms (compile: 3ms, render: 7ms)
 GET /api/search/properties?status=for_sale&limit=24&sort=relevance 200 in 11ms (compile: 5ms, render: 6ms)
 GET /api/search/properties?status=for_sale&limit=24&sort=relevance 200 in 10ms (compile: 4ms, render: 6ms)
 GET /api/search/properties?status=for_sale&limit=24&sort=relevance 200 in 10ms (compile: 4ms, render: 6ms)
 GET /api/search/properties?status=for_sale&limit=24&sort=relevance 200 in 10ms (compile: 4ms, render: 6ms)
 GET /api/search/properties?status=for_sale&limit=24&sort=relevance 200 in 9ms (compile: 3ms, render: 6ms)
 GET /api/search/properties?status=for_sale&limit=24&sort=relevance 200 in 9ms (compile: 3ms, render: 6ms)
 GET /api/search/properties?status=for_sale&limit=24&sort=relevance 200 in 9ms (compile: 3ms, render: 6ms)
 GET /api/search/properties?status=for_sale&limit=24&sort=relevance 200 in 9ms (compile: 3ms, render: 6ms)
 GET /api/search/properties?status=for_sale&limit=24&sort=relevance 200 in 9ms (compile: 2ms, render: 7ms)
 GET /api/search/properties?status=for_sale&limit=24&sort=relevance 200 in 9ms (compile: 2ms, render: 7ms)
 GET /api/search/properties?status=for_sale&limit=24&sort=relevance 200 in 9ms (compile: 2ms, render: 7ms)
 GET /api/search/properties?status=for_sale&limit=24&sort=relevance 200 in 9ms (compile: 2ms, render: 7ms)
 GET /api/search/properties?status=for_sale&limit=24&sort=relevance 200 in 9ms (compile: 2ms, render: 7ms)
 GET /api/search/properties?status=for_sale&limit=24&sort=relevance 200 in 9ms (compile: 1931µs, render: 7ms)
 GET /api/search/properties?status=for_sale&limit=24&sort=relevance 200 in 9ms (compile: 1856µs, render: 7ms)
 GET /api/search/properties?status=for_sale&limit=24&sort=relevance 200 in 8ms (compile: 1780µs, render: 7ms)
 GET /api/search/properties?status=for_sale&limit=24&sort=relevance 200 in 9ms (compile: 3ms, render: 6ms)
 GET /api/search/properties?status=for_sale&limit=24&sort=relevance 200 in 8ms (compile: 2ms, render: 6ms)
 GET /api/search/properties?status=for_sale&limit=24&sort=relevance 200 in 8ms (compile: 2ms, render: 6ms)
 GET /api/search/properties?status=for_sale&limit=24&sort=relevance 200 in 8ms (compile: 1941µs, render: 6ms)
 GET /api/search/properties?status=for_sale&limit=24&sort=relevance 200 in 8ms (compile: 1868µs, render: 6ms)
 GET /api/search/properties?status=for_sale&limit=24&sort=relevance 200 in 8ms (compile: 1797µs, render: 6ms)
 GET /api/search/properties?status=for_sale&limit=24&sort=relevance 200 in 8ms (compile: 1728µs, render: 6ms)
 GET /api/search/properties?status=for_sale&limit=24&sort=relevance 200 in 8ms (compile: 1657µs, render: 6ms)
 GET /api/search/properties?status=for_sale&limit=24&sort=relevance 200 in 9ms (compile: 3ms, render: 6ms)
 GET /api/search/properties?status=for_sale&limit=24&sort=relevance 200 in 9ms (compile: 3ms, render: 6ms)
 GET /api/search/properties?status=for_sale&limit=24&sort=relevance 200 in 9ms (compile: 2ms, render: 6ms)
 GET /api/search/properties?status=for_sale&limit=24&sort=relevance 200 in 9ms (compile: 2ms, render: 6ms)
 GET /api/search/properties?status=for_sale&limit=24&sort=relevance 200 in 9ms (compile: 2ms, render: 6ms)
 GET /api/search/properties?status=for_sale&limit=24&sort=relevance 200 in 8ms (compile: 2ms, render: 6ms)
 GET /api/search/properties?status=for_sale&limit=24&sort=relevance 200 in 8ms (compile: 2ms, render: 6ms)
 GET /api/search/properties?status=for_sale&limit=24&sort=relevance 200 in 8ms (compile: 1896µs, render: 6ms)
 GET /api/search/properties?status=for_sale&limit=24&sort=relevance 200 in 3ms (compile: 1081µs, render: 2ms)
 GET /api/search/properties?status=for_sale&limit=24&sort=relevance 200 in 3ms (compile: 846µs, render: 2ms)
{
  "baseUrl": "http://localhost:3000",
  "requests": 80,
  "concurrency": 8,
  "elapsed_ms": 149.78,
  "rps": 534.13,
  "latency_ms": {
    "min": 4.92,
    "p50": 13.06,
    "p95": 24.26,
    "p99": 27.81,
    "max": 27.81
  },
  "failed_requests": 0,
  "error_rate": 0,
  "thresholds": {
    "p95_ms": 350,
    "max_error_rate": 0.01
  }
}
[?25h
```

Salida completa: Node20 smoke

```text
Audit base URL: http://localhost:3000

=== Pages ===
[
  {
    "path": "/",
    "status": 200,
    "location": null
  },
  {
    "path": "/search",
    "status": 200,
    "location": null
  },
  {
    "path": "/explore",
    "status": 200,
    "location": null
  },
  {
    "path": "/partners",
    "status": 200,
    "location": null
  },
  {
    "path": "/partners/login",
    "status": 200,
    "location": null
  },
  {
    "path": "/partners/registro",
    "status": 200,
    "location": null
  },
  {
    "path": "/demo-antigravity",
    "status": 200,
    "location": null
  },
  {
    "path": "/images/placeholders/luxury-mansion.jpg",
    "status": 200,
    "location": null
  },
  {
    "path": "/images/placeholders/luxury-cinema.jpg",
    "status": 200,
    "location": null
  },
  {
    "path": "/images/placeholders/luxury-tennis.jpg",
    "status": 200,
    "location": null
  },
  {
    "path": "/images/placeholders/luxury-villa.jpg",
    "status": 200,
    "location": null
  },
  {
    "path": "/images/placeholders/luxury-pool.jpg",
    "status": 200,
    "location": null
  },
  {
    "path": "/images/placeholders/luxury-interior.jpg",
    "status": 200,
    "location": null
  },
  {
    "path": "/images/placeholders/luxury-estate.jpg",
    "status": 200,
    "location": null
  },
  {
    "path": "/images/placeholders/luxury-garden.jpg",
    "status": 200,
    "location": null
  },
  {
    "path": "/images/placeholders/luxury-hamptons.jpg",
    "status": 200,
    "location": null
  },
  {
    "path": "/images/placeholders/luxury-living.jpg",
    "status": 200,
    "location": null
  },
  {
    "path": "/images/placeholders/luxury-penthouse.jpg",
    "status": 200,
    "location": null
  },
  {
    "path": "/images/placeholders/luxury-view.jpg",
    "status": 200,
    "location": null
  },
  {
    "path": "/images/placeholders/luxury-sunset.jpg",
    "status": 200,
    "location": null
  },
  {
    "path": "/images/placeholders/luxury-terrace.jpg",
    "status": 200,
    "location": null
  },
  {
    "path": "/lifestyle/beachfront",
    "status": 307,
    "location": "/search?q=Lifestyle"
  },
  {
    "path": "/lifestyle/golf",
    "status": 307,
    "location": "/search?q=Lifestyle"
  },
  {
    "path": "/lifestyle/urban",
    "status": 307,
    "location": "/search?q=Lifestyle"
  },
  {
    "path": "/lifestyle/farm",
    "status": 307,
    "location": "/search?q=Lifestyle"
  },
  {
    "path": "/property/12",
    "status": 200,
    "location": null
  },
  {
    "path": "/property/1",
    "status": 200,
    "location": null
  },
  {
    "path": "/property/3",
    "status": 200,
    "location": null
  },
  {
    "path": "/property/6",
    "status": 200,
    "location": null
  },
  {
    "path": "/property/2",
    "status": 200,
    "location": null
  },
  {
    "path": "/property/8",
    "status": 200,
    "location": null
  },
  {
    "path": "/privacidad",
    "status": 200,
    "location": null
  },
  {
    "path": "/terminos",
    "status": 200,
    "location": null
  },
  {
    "path": "/partners/dashboard",
    "status": 307,
    "location": "/partners/login"
  }
]

=== Broken Internal Links ===
[]

=== Broken Images ===
[]

=== API Checks ===
[
  {
    "path": "/api/auth/me",
    "method": "GET",
    "status": 200
  },
  {
    "path": "/api/marketing/tiers",
    "method": "GET",
    "status": 200
  },
  {
    "path": "/api/marketing/requests",
    "method": "GET",
    "status": 401
  },
  {
    "path": "/api/partners/onboarding",
    "method": "POST",
    "status": 401
  },
  {
    "path": "/api/partners/properties",
    "method": "POST",
    "status": 401
  },
  {
    "path": "/api/stripe/checkout/featured",
    "method": "POST",
    "status": 401
  },
  {
    "path": "/api/stripe/checkout/subscription",
    "method": "POST",
    "status": 401
  },
  {
    "path": "/api/stripe/checkout/service-request",
    "method": "POST",
    "status": 401
  }
]

=== API Failures ===
[]

=== Summary ===
{
  "pagesVisited": 34,
  "internalLinksChecked": 31,
  "imagesChecked": 23,
  "brokenLinks": 0,
  "brokenImages": 0,
  "apiFailures": 0
}
```

## CP7.2 - Verificacion de persistencia real
- Timestamp: 2026-03-03T13:41:03Z

```text
SQL query executed completed successfully:
{
  "rows": [
    {
      "property_leads_count": "2",
      "user_funnel_events_count": "14",
      "funnel_daily_summary_rows": "1"
    }
  ],
  "rowCount": 1
}
```

## CP8 - Rollback y contingencia
- Timestamp: 2026-03-03T13:41:20Z
- Estado: no requerido (corrida final sin fallos bloqueantes).
- Nota: hubo intento previo abortado en CP3 por incompatibilidad de tipos en policy; se aplico stop-the-line y rerun controlado con compatibilidad de tipo en B1.
