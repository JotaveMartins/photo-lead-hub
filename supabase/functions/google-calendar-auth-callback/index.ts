import { createClient } from 'npm:@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const GOOGLE_CLIENT_ID = Deno.env.get('GOOGLE_OAUTH_CLIENT_ID')!;
const GOOGLE_CLIENT_SECRET = Deno.env.get('GOOGLE_OAUTH_CLIENT_SECRET')!;
const REDIRECT_URI = `${SUPABASE_URL}/functions/v1/google-calendar-auth-callback`;
const DEFAULT_CRM_ORIGIN = 'https://crm.avanzodigital.com.br';

async function verifyState(state: string): Promise<{ uid: string; origin: string } | null> {
  try {
    const parts = state.split('.');
    if (parts.length !== 2) return null;
    const [payload, sigB64] = parts;
    const enc = new TextEncoder();
    const key = await crypto.subtle.importKey(
      'raw', enc.encode(SERVICE_ROLE_KEY), { name: 'HMAC', hash: 'SHA-256' }, false, ['verify'],
    );
    const signature = Uint8Array.from(
      atob(sigB64.replace(/-/g, '+').replace(/_/g, '/')), (char) => char.charCodeAt(0),
    );
    if (!await crypto.subtle.verify('HMAC', key, signature, enc.encode(payload))) return null;
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
// carries only a result code, never credentials, email or provider error text.
function finish(success: boolean, reason = '', signedOrigin = '') {
  let origin = DEFAULT_CRM_ORIGIN;
  try {
    const candidate = new URL(signedOrigin);
    const localDevelopment = candidate.protocol === 'http:' && ['localhost', '127.0.0.1'].includes(candidate.hostname);
    if (!candidate.username && !candidate.password && (candidate.protocol === 'https:' || localDevelopment)) {
      origin = candidate.origin;
    }
  } catch { /* Use the production CRM when no verified origin is available. */ }
  const destination = new URL('/oauth/google-calendar/callback', origin);
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
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code, client_id: GOOGLE_CLIENT_ID, client_secret: GOOGLE_CLIENT_SECRET,
        redirect_uri: REDIRECT_URI, grant_type: 'authorization_code',
      }),
    });
    const tokenData = await tokenRes.json();
    if (!tokenRes.ok) {
      console.error('Google token exchange failed', tokenRes.status);
      return finish(false, 'token_exchange_failed', origin);
    }
    const { access_token, refresh_token, expires_in, scope } = tokenData;
    if (!refresh_token) return finish(false, 'missing_refresh_token', origin);
    const userInfoRes = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: { Authorization: `Bearer ${access_token}` },
    });
    const userInfo = await userInfoRes.json();
    if (!userInfoRes.ok || typeof userInfo.email !== 'string' || !userInfo.email) {
      return finish(false, 'profile_unavailable', origin);
    }
    const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
    const { error } = await admin.from('google_calendar_connections').upsert({
      user_id: verified.uid, google_email: userInfo.email, access_token, refresh_token,
      token_expires_at: new Date(Date.now() + (expires_in - 60) * 1000).toISOString(),
      calendar_id: 'primary', scope,
    }, { onConflict: 'user_id' });
    if (error) {
      console.error('Google connection could not be saved');
      return finish(false, 'save_failed', origin);
    }
    return finish(true, '', origin);
  } catch {
    console.error('Google Calendar OAuth callback failed');
    return finish(false, 'unexpected_error', origin);
  }
});
