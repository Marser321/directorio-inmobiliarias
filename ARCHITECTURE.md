# 🏗️ ARCHITECTURE.md - Antigravity Maldonado ReOS

## Sistema Operativo Inmobiliario (ReOS) para Punta del Este

---

## 1. Filosofía Arquitectónica: Monolito Modular

El proyecto sigue una arquitectura de **Monolito Modular**, que combina la simplicidad de despliegue de un monolito con la organización clara de microservicios.

### Estructura de Carpetas por Dominio

```
app/
├── (public)/              # Rutas públicas
│   ├── property/[slug]/   # Fichas de propiedades
│   ├── explore/           # Lifestyle Matching Map
│   └── search/            # Búsqueda tradicional
├── partners/              # Portal de inmobiliarias
│   ├── dashboard/         # Panel de agencia
│   └── properties/        # Gestión de propiedades
├── admin/                 # Super Admin
│   ├── agencies/          # Gestión de inmobiliarias
│   ├── duplicates/        # Revisión de duplicados
│   └── analytics/         # Métricas
└── api/
    ├── properties/        # CRUD de propiedades
    ├── agencies/          # CRUD de agencias
    ├── leads/             # Gestión de prospectos
    └── webhooks/          # Stripe, etc.
```

### Ventajas de este Enfoque

1. **Despliegue Simple**: Un solo `npm run build` + Vercel
2. **Separación Clara**: Cada dominio tiene su carpeta
3. **Escalabilidad Futura**: Fácil extracción a microservicios si es necesario

---

## 2. Multi-Tenencia (Multi-Tenancy)

### Modelo de Aislamiento: Row Level Security (RLS)

Cada inmobiliaria (`agency`) opera en un "silo" virtual dentro de la misma base de datos.

```
┌─────────────────────────────────────────────────┐
│                   PostgreSQL                     │
│  ┌──────────┐  ┌──────────┐  ┌──────────────┐   │
│  │ Agency A │  │ Agency B │  │ Agency C     │   │
│  │ Props: 50│  │ Props: 20│  │ Props: 100   │   │
│  │ Users: 3 │  │ Users: 1 │  │ Users: 5     │   │
│  └──────────┘  └──────────┘  └──────────────┘   │
│                    RLS Policies                  │
└─────────────────────────────────────────────────┘
```

### Flujo de Autenticación

1. Usuario hace login → Supabase Auth genera JWT
2. JWT contiene `user_id` en claims
3. RLS policies usan `auth.uid()` para filtrar datos
4. Usuario solo ve propiedades de su `agency_id`

### Políticas RLS Clave

```sql
-- Los miembros de una agencia solo ven sus propiedades
CREATE POLICY "Agency members see own properties"
  ON properties FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM agency_users
      WHERE agency_users.agency_id = properties.agency_id
        AND agency_users.user_id = auth.uid()
    )
  );
```

---

## 3. Sistema de Deduplicación (3 Capas)

### Problema: "La Misma Casa, 5 Anuncios"

En Punta del Este es común que:
- 3 inmobiliarias publiquen la misma propiedad
- Un propietario publique en MercadoLibre + InfoCasas + Gallito
- Las fotos sean idénticas pero con distinto agente

### Solución: Triple Capa de Detección

```
┌─────────────────────────────────────────────────┐
│          CAPA 1: NORMALIZACIÓN DE DIRECCIONES   │
│  "Av. Roosevelt 1234" = "Avenida Roosevelt 1234"│
│  Usa: Google Geocoding API + similarity()       │
└─────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────┐
│          CAPA 2: HASHING PERCEPTUAL (pHash)     │
│  Detecta fotos idénticas aunque:                │
│  - Tengan distinto tamaño                       │
│  - Tengan marca de agua diferente               │
│  - Estén ligeramente recortadas                 │
│  Usa: hamming_distance() <= 10 = duplicado      │
└─────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────┐
│          CAPA 3: GEOFENCING (20m Radio)         │
│  Dos propiedades a <20m son sospechosas         │
│  Confirma con: mismo # habitaciones, ±10% precio│
│  Usa: ST_DWithin(location_point, ..., 20)       │
└─────────────────────────────────────────────────┘
```

### Tablas Involucradas

| Tabla | Propósito |
|-------|-----------|
| `property_addresses` | Direcciones normalizadas |
| `property_image_hashes` | pHash de cada imagen |
| `duplicate_candidates` | Pares sospechosos para revisión |

### Flujo de Detección

1. **Al crear propiedad**: Edge Function calcula hashes
2. **Búsqueda pasiva**: Cron job busca duplicados cada noche
3. **Revisión manual**: Admin revisa `duplicate_candidates`
4. **Acción**: Merge, rechazar, o confirmar duplicado

---

## 4. Modelo de Datos Principal

### Diagrama ER Simplificado

```
agencies ──┬── agency_users ─── profiles
           │
           └── properties ──┬── property_images
                            ├── property_addresses
                            └── property_image_hashes
                                        │
                            duplicate_candidates
```

### Campos JSONB Dinámicos

El campo `properties.features` usa JSONB para atributos específicos:

```json
// Para una CHACRA
{
  "indice_coneat": 85,
  "aguadas": 2,
  "monte_nativo_hectareas": 5
}

// Para un APARTAMENTO
{
  "amenities": ["gym", "pool", "bbq"],
  "expensas_usd": 350,
  "piso": 12
}
```

---

## 5. Lifestyle Matching Engine

### Tags de Estilo de Vida

Cada propiedad tiene `lifestyle_tags` que permiten búsquedas por "vibe":

| Tag | Zonas Típicas |
|-----|---------------|
| `nightlife` | La Barra, Punta del Este centro |
| `silence` | José Ignacio, Garzón |
| `golf` | Beverly Hills, Cantegril |
| `surf` | La Barra, Montoya, Manantiales |
| `family` | Pinares, San Rafael |

### Cálculo de Vibe Score

```sql
-- Ejemplo: Score de vida nocturna
SELECT 
  p.id,
  COUNT(poi.id) as nightlife_score
FROM properties p
LEFT JOIN points_of_interest poi 
  ON ST_DWithin(p.location_point, poi.location, 1000)
  AND poi.category = 'restaurant_bar'
  AND poi.winter_open = true
GROUP BY p.id;
```

---

## 6. APIs y Edge Functions

### Edge Functions de Supabase

| Función | Propósito | Trigger |
|---------|-----------|---------|
| `enrich-property` | Calcula Vibe Score + mejora descripción | POST property |
| `verify-document` | Valida certificados UTE/BPS | Upload documento |
| `calculate-phash` | Genera hash de imagen | Upload imagen |

### API Routes de Next.js

| Ruta | Método | Propósito |
|------|--------|-----------|
| `/api/properties` | GET/POST | CRUD propiedades |
| `/api/search` | POST | Búsqueda con filtros |
| `/api/stripe/webhook` | POST | Pagos y suscripciones |

---

## 7. Seguridad

### Principios

1. **RLS por Defecto**: Todas las tablas tienen RLS habilitado
2. **Least Privilege**: Cada rol tiene acceso mínimo necesario
3. **Audit Trail**: `data_quality_log` registra cambios

### Roles del Sistema

| Rol | Acceso |
|-----|--------|
| `user` | Solo lectura pública |
| `owner` | Sus propiedades publicadas |
| `agent` | Propiedades de su agencia |
| `admin` | Todo el sistema |

---

## 8. Performance

### Índices Clave

```sql
-- Búsqueda geoespacial
CREATE INDEX properties_geo_idx ON properties USING gist(location_point);

-- Filtros por lifestyle
CREATE INDEX properties_lifestyle_idx ON properties USING gin(lifestyle_tags);

-- Búsqueda por features JSONB
CREATE INDEX properties_features_idx ON properties USING gin(features);

-- Propiedades destacadas
CREATE INDEX properties_featured_idx ON properties(is_featured) WHERE is_featured = true;
```

### Estrategia de Caché

- **ISR (Incremental Static Regeneration)**: Páginas de propiedades
- **SWR**: Resultados de búsqueda en cliente
- **Edge Caching**: Imágenes vía Supabase Storage CDN
