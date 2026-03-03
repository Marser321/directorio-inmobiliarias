-- Enable the pgvector extension to work with embedding vectors
create extension if not exists vector;

-- Create a table for properties if it doesn't exist (assuming it might, but ensuring structure for vector)
-- Note: You likely already have a properties table. This migration assumes adding a vector column to it.
-- If you need to create the column, uncomment the following line:
-- alter table properties add column if not exists embedding vector(1536);

-- Create a function to search for properties by cosine distance
create or replace function match_properties (
  query_embedding vector(1536),
  match_threshold float,
  match_count int
)
returns table (
  id bigint,
  content text,
  similarity float
)
language plpgsql
as $$
begin
  return query
  select
    properties.id,
    properties.description as content,
    1 - (properties.embedding <=> query_embedding) as similarity
  from properties
  where 1 - (properties.embedding <=> query_embedding) > match_threshold
  order by properties.embedding <=> query_embedding
  limit match_count;
end;
$$;
