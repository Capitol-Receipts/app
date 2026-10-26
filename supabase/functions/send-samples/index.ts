// Retired one-off sample sender. Deployed as a stub that answers 410; safe to delete in Supabase.
Deno.serve(() => new Response("Gone", { status: 410 }));
