import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { createClient } from 'npm:@supabase/supabase-js@2.45.0';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

/** Executado a cada minuto pelo agendador: publica posts vencidos. */
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  const now = new Date().toISOString();
  const { data: due, error } = await admin
    .from('scheduled_posts')
    .select('id, attempts')
    .in('status', ['agendado', 'falhou'])
    .lte('scheduled_at', now)
    .lt('attempts', 3)
    .limit(10);

  if (error) {
    console.error('scheduler query error', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const results: Record<string, string> = {};
  for (const post of due ?? []) {
    try {
      const res = await fetch(`${SUPABASE_URL}/functions/v1/publish-instagram-carousel`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
        },
        body: JSON.stringify({ post_id: post.id }),
      });
      const body = await res.json().catch(() => ({}));
      results[post.id] = res.ok ? 'publicado' : (body.error ?? `erro ${res.status}`);
    } catch (e) {
      results[post.id] = e instanceof Error ? e.message : 'erro';
    }
  }

  return new Response(JSON.stringify({ processed: (due ?? []).length, results }), {
    status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
});