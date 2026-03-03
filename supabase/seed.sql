-- SEED DATA for Punta del Este Directory

-- 1. Locations
insert into public.locations (slug, name, type) values 
('punta-del-este', 'Punta del Este', 'city'),
('la-barra', 'La Barra', 'zone'),
('jose-ignacio', 'José Ignacio', 'zone');

-- Get IDs (assuming IDs 1, 2, 3 based on insert order, or use subqueries for safety in prod)
-- For this seed, we assume clean slate.

-- 2. Properties
insert into public.properties (
  title, slug, description, price, currency, status, 
  built_area, plot_area, bedrooms, bathrooms, garage_spaces, 
  location_id, 
  main_image, 
  lifestyle_tags,
  features
) values 

-- Property 1: Villa Marítima (The Hero)
(
  'Villa Marítima La Barra', 
  'villa-maritima-la-barra', 
  'Spectacular oceanfront villa steps from Montoya Beach.', 
  2500000, 
  'USD', 
  'for_sale', 
  450, 
  1200, 
  5, 
  6, 
  3, 
  (select id from public.locations where slug = 'la-barra' limit 1),
  'https://images.unsplash.com/photo-1613545325278-f24b0cae1224?auto=format&fit=crop&w=1600&q=80',
  ARRAY['Waterfront', 'Sunset Views', 'Luxury'],
  '{"pool": true, "view_type": "ocean", "security": "24/7"}'::jsonb
),

-- Property 2: Chacra José Ignacio
(
  'Chacra El Silencio', 
  'chacra-el-silencio', 
  'Modern farmhouse surrounded by nature, minutes from the lighthouse.', 
  1800000, 
  'USD', 
  'for_sale', 
  320, 
  5000, 
  4, 
  4, 
  4, 
  (select id from public.locations where slug = 'jose-ignacio' limit 1),
  'https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&w=800&q=80',
  ARRAY['Farm & Ranch', 'Silence', 'Nature'],
  '{"pool": true, "view_type": "forest", "heating": "underfloor"}'::jsonb
),

-- Property 3: Penthouse Peninsula
(
  'Skyline Penthouse Brava', 
  'skyline-penthouse-brava', 
  'Panoramic views of La Brava beach with private rooftop terrace.', 
  950000, 
  'USD', 
  'for_sale', 
  180, 
  0, 
  3, 
  3, 
  2, 
  (select id from public.locations where slug = 'punta-del-este' limit 1),
  'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?auto=format&fit=crop&w=800&q=80',
  ARRAY['Urban Luxury', 'Beachfront', 'Nightlife'],
  '{"jacuzzi": true, "view_type": "ocean", "concierge": true}'::jsonb
),

-- Property 4: Golf Mansion
(
  'The Club Estate', 
  'the-club-estate', 
  'Exclusive mansion inside the Golf Club with fairway views.', 
  3200000, 
  'USD', 
  'for_sale', 
  600, 
  2500, 
  6, 
  7, 
  4, 
  (select id from public.locations where slug = 'punta-del-este' limit 1),
  'https://images.unsplash.com/photo-1587174486073-ae5e5cff23aa?auto=format&fit=crop&w=800&q=80',
  ARRAY['Golf & Country', 'Private Estates', 'Security'],
  '{"pool": true, "golf_access": true, "cinema_room": true}'::jsonb
);
