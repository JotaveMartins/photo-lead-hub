import { createClient } from 'npm:@supabase/supabase-js@2.45.0';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const INSTAGRAM_APP_ID = Deno.env.get('INSTAGRAM_APP_ID') ?? '';
const INSTAGRAM_APP_SECRET = Deno.env.get('INSTAGRAM_APP_SECRET') ?? '';
const REDIRECT_URI =
  Deno.env.get('INSTAGRAM_REDIRECT_URI') ??
  `${SUPABASE_URL}/functions/v1/instagram-auth-callback`;

async function verifyState(state: string): Promise<{ uid: string } | null> {
  const parts = state.split('.');
  if (parts.length !== 2) return null;
  const [payload, sigB64] = parts;
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw', enc.encode(SERVICE_ROLE_KEY),
    { name: 'HMAC', hash: 'SHA-256' }, false, ['verify'],
  );
  const sigBytes = Uint8Array.from(
    atob(sigB64.replace(/-/g, '+').replace(/_/g, '/')),
    (c) => c.charCodeAt(0),
  );
  const ok = await crypto.subtle.verify('HMAC', key, sigBytes, enc.encode(payload));
  if (!ok) return null;
  try {
    const decoded = JSON.parse(atob(payload));
    if (Date.now() - decoded.ts > 10 * 60 * 1000) return null;
    return { uid: decoded.uid };
  } catch {
    return null;
  }
}

function closePopupHtml(success: boolean, message: string) {
  return `<!doctype html><html><head><meta charset="utf-8"><title>${success ? 'Conectado' : 'Erro'}</title>
<style>body{font-family:system-ui;background:#0f0f0f;color:#fff;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;text-align:center;padding:24px}.box{max-width:380px}</style>
</head><body><div class="box">
<h2>${success ? '✅ Instagram conectado!' : '❌ Erro'}</h2>
<p>${message}</p>
<p style="opacity:.6;font-size:13px">Esta janela vai fechar automaticamente.</p>
</div><script>
try{ window.opener && window.opener.postMessage({type:'instagram-auth',success:${success}}, '*'); }catch(e){}
setTimeout(()=>window.close(), 1500);
</script></body></html>`;
}

const html = (body: string) =>
  new Response(body, { status: 200, headers: { 'Content-Type': 'text/html; charset=utf-8' } });

Deno.serve(async (req) => {
  const url = new URL(req.url);
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  const errParam = url.searchParams.get('error_description') || url.searchParams.get('error');

  if (errParam) return html(closePopupHtml(false, `Instagram retornou: ${errParam}`));
  if (!code || !state) return html(closePopupHtml(false, 'Parâmetros ausentes.'));

  const verified = await verifyState(state);
  if (!verified) return html(closePopupHtml(false, 'State inválido ou expirado.'));

  try {
    // 1. short-lived token
    const tokenRes = await fetch('https://api.instagram.com/oauth/access_token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: INSTAGRAM_APP_ID,
        client_secret: INSTAGRAM_APP_SECRET,
        grant_type: 'authorization_code',
        redirect_uri: REDIRECT_URI,
        code: code.replace(/#_$/, ''),
      }),
    });
    const tokenData = await tokenRes.json();
    if (!tokenRes.ok || !tokenData.access_token) {
      console.error('IG token exchange failed', tokenData);
      return html(closePopupHtml(false, tokenData.error_message || 'Falha na troca de token.'));
    }

    // 2. long-lived token (60 days)
    const llRes = await fetch(
      `https://graph.instagram.com/access_token?${new URLSearchParams({
        grant_type: 'ig_exchange_token',
        client_secret: INSTAGRAM_APP_SECRET,
        access_token: tokenData.access_token,
      })}`,
    );
    const llData = await llRes.json();
    const accessToken = llData.access_token ?? tokenData.access_token;
    const expiresIn = llData.expires_in ?? 3600;

    // 3. profile
    const meRes = await fetch(
      `https://graph.instagram.com/v21.0/me?fields=id,username,profile_picture_url&access_token=${accessToken}`,
    );
    const me = await meRes.json();
    if (!meRes.ok || !me.id) {
      console.error('IG profile failed', me);
      return html(closePopupHtml(false, 'Não foi possível ler o perfil do Instagram.'));
    }

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
    const { error } = await admin.from('social_accounts').upsert({
      user_id: verified.uid,
      provider: 'instagram',
      instagram_user_id: String(me.id),
      username: me.username ?? null,
      profile_picture_url: me.profile_picture_url ?? null,
      access_token: accessToken,
      token_expires_at: new Date(Date.now() + (expiresIn - 60) * 1000).toISOString(),
      status: 'connected',
    }, { onConflict: 'user_id,provider' });

    if (error) {
      console.error('social_accounts upsert error', error);
      return html(closePopupHtml(false, 'Erro ao salvar conexão.'));
    }

    return html(closePopupHtml(true, `Conectado como @${me.username ?? me.id}.`));
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Unknown error';
    console.error('instagram callback error', msg);
    return html(closePopupHtml(false, msg));
  }
});