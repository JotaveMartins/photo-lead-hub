import { createClient } from 'npm:@supabase/supabase-js@2';
import { authenticateCronRequest } from '../_shared/cron-auth.ts';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

/**
 * Executado a cada minuto pelo agendamento gerenciado do backend: publica posts vencidos.
 * Só aceita o segredo privado do agendamento (LOVABLE_CRON_SECRET); a chave pública
 * do site não aciona este processamento. Não é chamado pelo frontend.
 */
Deno.serve(async (req) => {
  if (req.method !== 'POST') return json({ error: 'Método não permitido' }, 405);
  const unauthorized = authenticateCronRequest(req);
  if (unauthorized) return unauthorized;

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
    return json({ error: error.message }, 500);
  }

  const results: Record<string, string> = {};
  for (const post of due ?? []) {
    try {
      // Service-to-service call: the backend service key never leaves the backend.
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

  return json({ processed: (due ?? []).length, results });
});
