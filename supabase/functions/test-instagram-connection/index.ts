import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { createClient } from 'npm:@supabase/supabase-js@2.45.0';

const TOKEN = Deno.env.get('INSTAGRAM_ACCESS_TOKEN') ?? '';
const IG_USER_ID = Deno.env.get('INSTAGRAM_USER_ID') ?? '';
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!;
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  try {
    if (!TOKEN) {
      console.error('test-instagram-connection: missing INSTAGRAM_ACCESS_TOKEN');
      return json({ status: 'error', message: 'Integração do Instagram ainda não configurada.' }, 400);
    }

    const fields = 'user_id,username,account_type,profile_picture_url';
    const url = `https://graph.instagram.com/v21.0/me?fields=${fields}&access_token=${encodeURIComponent(TOKEN)}`;
    const res = await fetch(url);
    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      console.error('test-instagram-connection API error:', res.status, JSON.stringify(data));
      return json(
        {
          status: 'error',
          message:
            'Não foi possível validar o token do Instagram. Ele pode ter expirado ou faltam permissões.',
        },
        400,
      );
    }

    // Persist the validated account for the signed-in user so the UI reflects it
    try {
      const authHeader = req.headers.get('Authorization');
      if (authHeader) {
        const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
          global: { headers: { Authorization: authHeader } },
        });
        const { data: { user } } = await userClient.auth.getUser();
        if (user) {
          const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
          const row = {
            user_id: user.id,
            provider: 'instagram',
            instagram_user_id: String(data.user_id ?? IG_USER_ID ?? ''),
            username: data.username ?? null,
            profile_picture_url: data.profile_picture_url ?? null,
            access_token: TOKEN,
            token_expires_at: new Date(Date.now() + 60 * 24 * 3600 * 1000).toISOString(),
            status: 'connected',
            updated_at: new Date().toISOString(),
          };
          await admin.from('social_accounts').delete()
            .eq('user_id', user.id).eq('provider', 'instagram');
          const { error: insErr } = await admin.from('social_accounts').insert(row);
          if (insErr) console.error('social_accounts insert error:', insErr.message);
        }
      }
    } catch (e) {
      console.error('persist account error:', e instanceof Error ? e.message : e);
    }

    return json({
      status: 'ok',
      instagram_user_id: String(data.user_id ?? IG_USER_ID ?? ''),
      username: data.username ?? null,
      account_type: data.account_type ?? null,
      profile_picture_url: data.profile_picture_url ?? null,
    });
  } catch (e) {
    console.error('test-instagram-connection error:', e instanceof Error ? e.message : e);
    return json({ status: 'error', message: 'Erro inesperado ao testar a conexão.' }, 500);
  }
});