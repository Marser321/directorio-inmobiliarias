# SEO.md - Search Engine Dominance Strategy

## URL Taxonomy
We will use a **Hierarchical path structure** to capture long-tail traffic.

### 1. Structure
`/[city]/[zone]/[lifestyle-or-type]`

### 2. Examples
| URL Pattern | Target Keywords | Logic |
|---|---|---|
| `/punta-del-este` | "Inmobiliaria Punta del Este" | City Landing |
| `/punta-del-este/la-barra` | "Propiedades en La Barra" | Zone Landing |
| `/punta-del-este/la-barra/waterfront` | "Casas frente al mar La Barra" | Lifestyle Filter |
| `/punta-del-este/jose-ignacio/chacras` | "Chacras en Jose Ignacio" | Property Type |

## Implementation Plan
1.  **Dynamic Route**: Create `app/[city]/[...slug]/page.tsx` catch-all.
2.  **Metadata Generation**: Dynamic title/description based on params.
    - Title: "{Lifecycle} Homes for Sale in {Zone} | PuntaRealEstate"
    - Desc: "Find exclusive {lifestyle} properties in {zone}. {count} listings available."
3.  **Sitemap**: Auto-generate sitemap.xml from Database Combinations.
