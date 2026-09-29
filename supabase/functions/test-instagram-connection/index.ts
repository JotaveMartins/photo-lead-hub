import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { createClient } from 'npm:@supabase/supabase-js@2.45.0';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!;
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
      status, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) return json({ status: 'error', message: 'Não autenticado.' }, 401);
    const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) return json({ status: 'error', message: 'Não autenticado.' }, 401);

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
    const body = await req.json().catch(() => ({}));
    let uid = user.id;
    if (body?.target_user_id && body.target_user_id !== user.id) {
      const { data: isAdmin } = await admin.rpc('has_role', { _user_id: user.id, _role: 'admin' });
      if (!isAdmin) return json({ status: 'error', message: 'Sem permissão.' }, 403);
      uid = body.target_user_id;
    }

    const { data: acc } = await admin.from('social_accounts')
      .select('access_token, instagram_user_id')
      .eq('user_id', uid).eq('provider', 'instagram').maybeSingle();
    if (!acc?.access_token) {
      return json({ status: 'error', message: 'Nenhum Instagram conectado nesta conta.' }, 400);
    }

    const res = await fetch(
      `https://graph.instagram.com/v21.0/me?fields=user_id,username,account_type,profile_picture_url&access_token=${encodeURIComponent(acc.access_token)}`,
    );
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      console.error('test-instagram-connection API error:', res.status, JSON.stringify(data));
      return json({ status: 'error', message: 'O token do Instagram expirou ou faltam permissões. Reconecte.' }, 400);
    }

    await admin.from('social_accounts').update({
      username: data.username ?? null,
      profile_picture_url: data.profile_picture_url ?? null,
      status: 'connected',
    }).eq('user_id', uid).eq('provider', 'instagram');

    return json({
      status: 'ok',
      instagram_user_id: String(data.user_id ?? acc.instagram_user_id ?? ''),
      username: data.username ?? null,
      account_type: data.account_type ?? null,
    });
  } catch (e) {
    console.error('test-instagram-connection error:', e instanceof Error ? e.message : e);
    return json({ status: 'error', message: 'Erro inesperado ao testar a conexão.' }, 500);
  }
});
