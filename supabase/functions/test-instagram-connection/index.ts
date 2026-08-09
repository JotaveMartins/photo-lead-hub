import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';

const TOKEN = Deno.env.get('INSTAGRAM_ACCESS_TOKEN') ?? '';
const IG_USER_ID = Deno.env.get('INSTAGRAM_USER_ID') ?? '';

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