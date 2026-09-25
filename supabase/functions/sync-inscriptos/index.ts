// Endpoint deshabilitado (código legado sin uso).
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-signature',
}

Deno.serve((req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders })
  return new Response(JSON.stringify({ error: 'Endpoint deshabilitado' }), {
    status: 410,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
})
