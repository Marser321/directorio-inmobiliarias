-- =====================================================
-- MIGRATION: Location centroids + property coordinate backfill
-- =====================================================

alter table public.locations
  add column if not exists center_lat double precision;

alter table public.locations
  add column if not exists center_lng double precision;

with centroid_seed(slug, center_lat, center_lng) as (
  values
    ('punta-del-este', -34.9594::double precision, -54.9439::double precision),
    ('la-barra', -34.8850::double precision, -54.7956::double precision),
    ('jose-ignacio', -34.8358::double precision, -54.6392::double precision)
)
update public.locations l
set
  center_lat = centroid_seed.center_lat,
  center_lng = centroid_seed.center_lng
from centroid_seed
where l.slug = centroid_seed.slug;

create or replace function public.fill_property_coords_from_location_centroid()
returns trigger
language plpgsql
as $fn$
declare
  loc_lat double precision;
  loc_lng double precision;
begin
  if new.location_point_geojson is not null then
    return new;
  end if;

  if new.location_lat is not null and new.location_lng is not null then
    if new.location_lat between -90 and 90 and new.location_lng between -180 and 180 then
      new.location_point_geojson := jsonb_build_object(
        'type', 'Point',
        'coordinates', jsonb_build_array(new.location_lng, new.location_lat)
      );
    else
      new.location_lat := null;
      new.location_lng := null;
    end if;
    return new;
  end if;

  if new.location_id is null then
    return new;
  end if;

  select l.center_lat, l.center_lng
  into loc_lat, loc_lng
  from public.locations l
  where l.id = new.location_id;

  if loc_lat is null or loc_lng is null then
    return new;
  end if;

  if loc_lat between -90 and 90 and loc_lng between -180 and 180 then
    new.location_lat := loc_lat;
    new.location_lng := loc_lng;
    new.location_point_geojson := jsonb_build_object(
      'type', 'Point',
      'coordinates', jsonb_build_array(loc_lng, loc_lat)
    );
  end if;

  return new;
end;
$fn$;

drop trigger if exists properties_fill_coords_from_location_trigger on public.properties;
create trigger properties_fill_coords_from_location_trigger
before insert or update of location_id, location_lat, location_lng
on public.properties
for each row
execute function public.fill_property_coords_from_location_centroid();

update public.properties p
set
  location_lat = l.center_lat,
  location_lng = l.center_lng,
  location_point_geojson = jsonb_build_object(
    'type', 'Point',
    'coordinates', jsonb_build_array(l.center_lng, l.center_lat)
  )
from public.locations l
where p.location_id = l.id
  and l.center_lat is not null
  and l.center_lng is not null
  and (
    p.location_point_geojson is null
    or p.location_lat is null
    or p.location_lng is null
  );

create index if not exists locations_center_lat_idx on public.locations(center_lat);
create index if not exists locations_center_lng_idx on public.locations(center_lng);
