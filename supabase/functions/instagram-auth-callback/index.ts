import { createClient } from 'npm:@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const INSTAGRAM_APP_ID = Deno.env.get('INSTAGRAM_APP_ID') ?? '';
const INSTAGRAM_APP_SECRET = Deno.env.get('INSTAGRAM_APP_SECRET') ?? '';
const REDIRECT_URI =
  Deno.env.get('INSTAGRAM_REDIRECT_URI') ??
  `${SUPABASE_URL}/functions/v1/instagram-auth-callback`;

const DEFAULT_CRM_ORIGIN = 'https://crm.avanzodigital.com.br';

async function verifyState(state: string): Promise<{ uid: string; origin: string } | null> {
  try {
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
    if (!await crypto.subtle.verify('HMAC', key, sigBytes, enc.encode(payload))) return null;
    const decoded = JSON.parse(atob(payload));
    if (typeof decoded.uid !== 'string' || !decoded.uid || typeof decoded.ts !== 'number') return null;
    const age = Date.now() - decoded.ts;
    if (age < 0 || age > 10 * 60 * 1000) return null;
    return { uid: decoded.uid, origin: typeof decoded.origin === 'string' ? decoded.origin : '' };
  } catch {
    return null;
  }
}

// The gateway serves HTML from the default Edge Function domain as plain text.
// Finish on the CRM origin from the verified, signed state instead. The URL
// carries only a result code, never tokens or provider error text.
function finish(success: boolean, reason = '', signedOrigin = '') {
  let origin = DEFAULT_CRM_ORIGIN;
  try {
    const candidate = new URL(signedOrigin);
    const localDevelopment = candidate.protocol === 'http:' && ['localhost', '127.0.0.1'].includes(candidate.hostname);
    if (!candidate.username && !candidate.password && (candidate.protocol === 'https:' || localDevelopment)) {
      origin = candidate.origin;
    }
  } catch { /* Use the production CRM when no verified origin is available. */ }
  const destination = new URL('/oauth/instagram/callback', origin);
  destination.searchParams.set('result', success ? 'success' : 'error');
  if (!success) destination.searchParams.set('reason', reason || 'unexpected_error');
  return new Response(null, {
    status: 303,
    headers: { Location: destination.toString(), 'Cache-Control': 'no-store', 'Referrer-Policy': 'no-referrer' },
  });
}

Deno.serve(async (req) => {
  const url = new URL(req.url);
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  const verified = state ? await verifyState(state) : null;
  if (!verified) return finish(false, state ? 'invalid_state' : 'missing_parameters');
  const origin = verified.origin;
  if (url.searchParams.get('error')) return finish(false, 'denied', origin);
  if (!code) return finish(false, 'missing_parameters', origin);

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
      console.error('IG token exchange failed', tokenRes.status);
      return finish(false, 'token_exchange_failed', origin);
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
      `https://graph.instagram.com/v21.0/me?fields=id,username,account_type,profile_picture_url&access_token=${accessToken}`,
    );
    const me = await meRes.json();
    if (!meRes.ok || !me.id) {
      console.error('IG profile failed', meRes.status);
      return finish(false, 'profile_unavailable', origin);
    }

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
    const { error } = await admin.from('social_accounts').upsert({
      user_id: verified.uid,
      provider: 'instagram',
      instagram_user_id: String(me.id),
      username: me.username ?? null,
      profile_picture_url: me.profile_picture_url ?? null,
      account_type: me.account_type ?? null,
      access_token: accessToken,
      token_expires_at: new Date(Date.now() + (expiresIn - 60) * 1000).toISOString(),
      status: 'connected',
    }, { onConflict: 'user_id,provider,instagram_user_id' });

    if (error) {
      console.error('Instagram connection could not be saved');
      return finish(false, 'save_failed', origin);
    }

    return finish(true, '', origin);
  } catch {
    console.error('Instagram OAuth callback failed');
    return finish(false, 'unexpected_error', origin);
  }
});
