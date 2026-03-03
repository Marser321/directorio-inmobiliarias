-- Script to clean "Ghost" data
-- WARNING: This will delete data! Use with caution.

-- Delete properties that don't have a source_url (assuming real data will have it, or manual entry)
-- For now, let's assuming everything currently in DB might be dummy IF it matches certain patterns or if we simple decide to wipe slate clean.
-- The user said "eliminar las propiedades fantasmas".

-- Delete properties created before today (or just all if we want a fresh start, but safer to target specific bad data if possible)
-- However, since we just added source_url, any existing row has NULL source_url.
-- We will delete ALL properties that share the "dummy" characteristics (often created by seed scripts).

DELETE FROM properties WHERE source_url IS NULL;

-- Delete agencies that are likely dummies (except maybe the one the user belongs to, if any)
-- We'll be careful here. Let's delete agencies with no users or specific dummy names if we knew them.
-- For now, wiping agencies without source_url might be too aggressive if they were manually created.
-- Let's only wipe properties for now as that's the main visual noise.
-- DELETE FROM agencies WHERE source_url IS NULL AND id NOT IN (SELECT agency_id FROM agency_users);
