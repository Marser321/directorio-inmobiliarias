-- =====================================================
-- MIGRATION: Mirror location_point_geojson into location_lat/location_lng
-- =====================================================

alter table public.properties
  add column if not exists location_lat double precision;

alter table public.properties
  add column if not exists location_lng double precision;

create or replace function public.sync_properties_lat_lng_from_geojson()
returns trigger
language plpgsql
as $fn$
declare
  lon double precision;
  lat double precision;
begin
  if new.location_point_geojson is null then
    new.location_lat := null;
    new.location_lng := null;
    return new;
  end if;

  if
    jsonb_typeof(new.location_point_geojson) = 'object' and
    coalesce(new.location_point_geojson->>'type', '') = 'Point' and
    jsonb_typeof(new.location_point_geojson->'coordinates') = 'array' and
    jsonb_array_length(new.location_point_geojson->'coordinates') >= 2
  then
    begin
      lon := (new.location_point_geojson->'coordinates'->>0)::double precision;
      lat := (new.location_point_geojson->'coordinates'->>1)::double precision;
    exception
      when others then
        lon := null;
        lat := null;
    end;

    if lon is not null and lat is not null and lon between -180 and 180 and lat between -90 and 90 then
      new.location_lng := lon;
      new.location_lat := lat;
    else
      new.location_lng := null;
      new.location_lat := null;
    end if;
  else
    new.location_lat := null;
    new.location_lng := null;
  end if;

  return new;
end;
$fn$;

drop trigger if exists properties_sync_lat_lng_geojson_trigger on public.properties;
create trigger properties_sync_lat_lng_geojson_trigger
before insert or update of location_point_geojson
on public.properties
for each row
execute function public.sync_properties_lat_lng_from_geojson();

with extracted as (
  select
    p.id,
    case
      when p.location_point_geojson is not null
        and jsonb_typeof(p.location_point_geojson) = 'object'
        and coalesce(p.location_point_geojson->>'type', '') = 'Point'
        and jsonb_typeof(p.location_point_geojson->'coordinates') = 'array'
        and jsonb_array_length(p.location_point_geojson->'coordinates') >= 2
        and (p.location_point_geojson->'coordinates'->>0) ~ '^-?(?:[0-9]+(?:\\.[0-9]+)?|\\.[0-9]+)$'
      then (p.location_point_geojson->'coordinates'->>0)::double precision
      else null
    end as lng,
    case
      when p.location_point_geojson is not null
        and jsonb_typeof(p.location_point_geojson) = 'object'
        and coalesce(p.location_point_geojson->>'type', '') = 'Point'
        and jsonb_typeof(p.location_point_geojson->'coordinates') = 'array'
        and jsonb_array_length(p.location_point_geojson->'coordinates') >= 2
        and (p.location_point_geojson->'coordinates'->>1) ~ '^-?(?:[0-9]+(?:\\.[0-9]+)?|\\.[0-9]+)$'
      then (p.location_point_geojson->'coordinates'->>1)::double precision
      else null
    end as lat
  from public.properties p
)
update public.properties p
set
  location_lng = case when extracted.lng between -180 and 180 then extracted.lng else null end,
  location_lat = case when extracted.lat between -90 and 90 then extracted.lat else null end
from extracted
where extracted.id = p.id;

create index if not exists properties_location_lat_idx on public.properties(location_lat);
create index if not exists properties_location_lng_idx on public.properties(location_lng);
create index if not exists properties_location_lat_lng_idx on public.properties(location_lat, location_lng);
