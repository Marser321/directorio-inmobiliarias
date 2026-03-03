import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'

serve(() =>
  new Response(
    JSON.stringify({
      error: 'Deprecated endpoint',
      message: 'Supabase function disabled after InsForge cutover.',
    }),
    {
      status: 410,
      headers: { 'Content-Type': 'application/json' },
    }
  )
)
