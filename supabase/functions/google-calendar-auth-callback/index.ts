import { createClient } from 'npm:@supabase/supabase-js@2.45.0';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const GOOGLE_CLIENT_ID = Deno.env.get('GOOGLE_OAUTH_CLIENT_ID')!;
const GOOGLE_CLIENT_SECRET = Deno.env.get('GOOGLE_OAUTH_CLIENT_SECRET')!;

const REDIRECT_URI = `${SUPABASE_URL}/functions/v1/google-calendar-auth-callback`;

async function verifyState(state: string): Promise<{ uid: string; origin: string } | null> {
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
    return { uid: decoded.uid, origin: decoded.origin || '' };
  } catch {
    return null;
  }
}

function htmlResponse(body: string, status = 200) {
  return new Response(body, {
    status,
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  });
}

function closePopupHtml(success: boolean, message: string) {
  return `<!doctype html><html><head><meta charset="utf-8"><title>${success ? 'Conectado' : 'Erro'}</title>
<style>body{font-family:system-ui;background:#0f0f0f;color:#fff;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;text-align:center;padding:24px}.box{max-width:380px}</style>
</head><body><div class="box">
<h2>${success ? '✅ Conta conectada!' : '❌ Erro'}</h2>
<p>${message}</p>
<p style="opacity:.6;font-size:13px">Esta janela vai fechar automaticamente.</p>
</div><script>
try{ window.opener && window.opener.postMessage({type:'google-calendar-auth',success:${success}}, '*'); }catch(e){}
setTimeout(()=>window.close(), 1500);
</script></body></html>`;
}

Deno.serve(async (req) => {
  const url = new URL(req.url);
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  const errParam = url.searchParams.get('error');

  if (errParam) {
    return htmlResponse(closePopupHtml(false, `Google retornou: ${errParam}`));
  }
  if (!code || !state) {
    return htmlResponse(closePopupHtml(false, 'Parâmetros ausentes.'));
  }

  const verified = await verifyState(state);
  if (!verified) {
    return htmlResponse(closePopupHtml(false, 'State inválido ou expirado.'));
  }

  try {
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: GOOGLE_CLIENT_ID,
        client_secret: GOOGLE_CLIENT_SECRET,
        redirect_uri: REDIRECT_URI,
        grant_type: 'authorization_code',
      }),
    });
    const tokenData = await tokenRes.json();
    if (!tokenRes.ok) {
      console.error('Token exchange failed', tokenData);
      return htmlResponse(closePopupHtml(false, tokenData.error_description || 'Falha na troca de token.'));
    }

    const { access_token, refresh_token, expires_in, scope } = tokenData;
    if (!refresh_token) {
      return htmlResponse(closePopupHtml(false, 'Refresh token ausente. Revogue o acesso em myaccount.google.com e tente novamente.'));
    }

    const userInfoRes = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: { Authorization: `Bearer ${access_token}` },
    });
    const userInfo = await userInfoRes.json();
    const googleEmail = userInfo.email as string;

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
    const expiresAt = new Date(Date.now() + (expires_in - 60) * 1000).toISOString();

    const { error: upsertErr } = await admin
      .from('google_calendar_connections')
      .upsert({
        user_id: verified.uid,
        google_email: googleEmail,
        access_token,
        refresh_token,
        token_expires_at: expiresAt,
        calendar_id: 'primary',
        scope,
      }, { onConflict: 'user_id' });

    if (upsertErr) {
      console.error('Upsert error', upsertErr);
      return htmlResponse(closePopupHtml(false, 'Erro ao salvar conexão.'));
    }

    return htmlResponse(closePopupHtml(true, `Conectado como ${googleEmail}.`));
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Unknown error';
    console.error('callback error', msg);
    return htmlResponse(closePopupHtml(false, msg));
  }
});