import { inactiveCrmResponse } from "../_shared/account-access.ts";
const corsHeaders = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-api-key' }
import { createClient } from 'npm:@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const GRAPH = 'https://graph.instagram.com/v21.0';

const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const CLAIMABLE = ['agendado', 'falhou'];
const MAX_SCHEDULED_ATTEMPTS = 3;

export class HttpError extends Error {
  constructor(public status: number, message: string) { super(message); }
}

export type Caller = { kind: 'user'; userId: string } | { kind: 'scheduler' };

function constantTimeEqual(a: string, b: string) {
  const left = new TextEncoder().encode(a);
  const right = new TextEncoder().encode(b);
  let diff = left.length ^ right.length;
  for (let i = 0; i < Math.max(left.length, right.length); i++) diff |= (left[i] ?? 0) ^ (right[i] ?? 0);
  return diff === 0;
}

/**
 * Two accepted callers:
 * - signed-in users (Studio "publish now"), identified by a verified JWT;
 * - the server-side scheduler (run-scheduled-posts), which sends the backend's
 *   service key. That key only exists in backend functions, never in the frontend.
 */
export async function authenticate(req: Request): Promise<Caller | null> {
  const header = req.headers.get('Authorization') ?? '';
  if (!header.startsWith('Bearer ')) return null;
  const token = header.slice(7).trim();
  if (!token) return null;
  if (SERVICE_ROLE_KEY && constantTimeEqual(token, SERVICE_ROLE_KEY)) return { kind: 'scheduler' };
  try {
    const { data, error } = await admin.auth.getClaims(token);
    const claims = data?.claims;
    if (error || claims?.role !== 'authenticated' || typeof claims?.sub !== 'string' || !claims.sub) return null;
    return { kind: 'user', userId: claims.sub };
  } catch {
    return null;
  }
}

/** Server-side permission check before any Instagram call or status change. */
export async function authorizePost(caller: Caller, postId: string) {
  const { data: post, error } = await admin
    .from('scheduled_posts')
    .select('id, user_id, carousel_id, social_account_id, status, attempts, scheduled_at')
    .eq('id', postId)
    .maybeSingle();
  if (error) throw error;
  if (!post) throw new HttpError(404, 'Agendamento não encontrado');

  if (caller.kind === 'user' && caller.userId !== post.user_id) {
    const { data: isAdmin, error: roleError } = await admin.rpc('has_role', { _user_id: caller.userId, _role: 'admin' });
    if (roleError) throw roleError;
    if (isAdmin !== true) throw new HttpError(403, 'Sem permissão para publicar este post');
  }

  // The scheduler may only publish posts that are actually due, never on demand.
  if (caller.kind === 'scheduler' && post.status !== 'publicado') {
    const due = CLAIMABLE.includes(post.status) &&
      (post.attempts ?? 0) < MAX_SCHEDULED_ATTEMPTS &&
      Date.parse(post.scheduled_at) <= Date.now() + 60_000;
    if (!due) throw new HttpError(403, 'Post não está pronto para publicação automática');
  }

  // Carousel and Instagram profile must belong to the same account as the post.
  const { data: carousel, error: carouselError } = await admin
    .from('carousels').select('user_id').eq('id', post.carousel_id).maybeSingle();
  if (carouselError) throw carouselError;
  if (!carousel || carousel.user_id !== post.user_id) throw new HttpError(403, 'Carrossel não pertence a esta conta');
  if (post.social_account_id) {
    const { data: account, error: accountError } = await admin
      .from('social_accounts').select('user_id, provider').eq('id', post.social_account_id).maybeSingle();
    if (accountError) throw accountError;
    if (!account || account.user_id !== post.user_id || account.provider !== 'instagram') {
      throw new HttpError(403, 'Perfil do Instagram não pertence a esta conta');
    }
  }
  return post;
}

async function graph(path: string, params: Record<string, string>, method = 'POST') {
  const url = `${GRAPH}${path}`;
  const body = new URLSearchParams(params);
  const res = method === 'GET'
    ? await fetch(`${url}?${body}`)
    : await fetch(url, { method, body });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data?.error?.message ?? `Instagram API ${res.status}`);
  }
  return data;
}

// A missing permalink must never turn a confirmed publication into a failure.
async function publicationResult(postId: string, mediaId: string, token: string) {
  let permalink: string | null = null;
  try {
    const response = await fetch(`${GRAPH}/${encodeURIComponent(mediaId)}?fields=permalink`, {
      headers: { Authorization: `Bearer ${token}` }, signal: AbortSignal.timeout(8000),
    });
    const data = response.ok ? await response.json() : null;
    if (typeof data?.permalink === 'string') {
      const url = new URL(data.permalink);
      if (url.protocol === 'https:' && !url.username && !url.password &&
          (url.hostname === 'instagram.com' || url.hostname === 'www.instagram.com') &&
          /^\/(p|reel|tv)\/[A-Za-z0-9_-]+\/?$/.test(url.pathname)) {
        permalink = url.origin + url.pathname;
        const { error } = await admin.from('scheduled_posts').update({ instagram_permalink: permalink }).eq('id', postId);
        if (error) console.error('Published Instagram permalink could not be saved');
      }
    }
  } catch { /* The published media ID remains the authoritative success result. */ }
  return { media_id: mediaId, permalink };
}

export async function publishPost(postId: string) {
  const { data: post, error } = await admin
    .from('scheduled_posts')
    .select('id, user_id, carousel_id, social_account_id, status, attempts, instagram_media_id, instagram_permalink')
    .eq('id', postId)
    .maybeSingle();
  if (error) throw error;
  if (!post) throw new HttpError(404, 'Agendamento não encontrado');
  if (post.status === 'publicado') return { alreadyPublished: true, media_id: post.instagram_media_id, permalink: post.instagram_permalink ?? null };
  if (!CLAIMABLE.includes(post.status)) {
    throw new HttpError(409, post.status === 'publicando' ? 'Publicação já em andamento' : 'Este post não pode ser publicado');
  }

  // Atomic claim: only one request can move this exact post/attempt to "publicando".
  // A concurrent manual click and the scheduler therefore cannot publish twice.
  const { data: claimed, error: claimError } = await admin.from('scheduled_posts')
    .update({ status: 'publicando', attempts: (post.attempts ?? 0) + 1, last_error: null })
    .eq('id', post.id)
    .eq('attempts', post.attempts ?? 0)
    .in('status', CLAIMABLE)
    .select('id')
    .maybeSingle();
  if (claimError) throw claimError;
  if (!claimed) throw new HttpError(409, 'Publicação já em andamento');

  try {
    const inactive = await inactiveCrmResponse(admin, post.user_id, corsHeaders);
    if (inactive) {
      const reason = await inactive.json();
      throw new Error(reason.error || "Não foi possível verificar o acesso ao CRM");
    }
    const { data: account } = await admin
      .from('social_accounts')
      .select('instagram_user_id, access_token, token_expires_at, username')
      .eq('id', post.social_account_id)
      .eq('user_id', post.user_id)
      .eq('provider', 'instagram')
      .maybeSingle();
    if (!account?.access_token || !account.instagram_user_id) {
      throw new Error('Conta do Instagram não conectada');
    }
    if (account.token_expires_at && new Date(account.token_expires_at) < new Date()) {
      throw new Error('Token do Instagram expirado — reconecte a conta');
    }

    const { data: carousel } = await admin
      .from('carousels')
      .select('legenda, rendered_slides')
      .eq('id', post.carousel_id)
      .maybeSingle();

    const paths = (carousel?.rendered_slides ?? []) as string[];
    if (!Array.isArray(paths) || paths.length === 0) {
      throw new Error('Carrossel sem imagens renderizadas');
    }

    // Signed URLs válidas por 2h para a Meta baixar as imagens
    const { data: signed, error: signErr } = await admin.storage
      .from('carousel-renders')
      .createSignedUrls(paths, 60 * 60 * 2);
    if (signErr) throw signErr;
    const urls = (signed ?? []).map((s) => s.signedUrl).filter(Boolean) as string[];
    if (urls.length !== paths.length) throw new Error('Falha ao assinar URLs das imagens');

    const igUser = account.instagram_user_id;
    const token = account.access_token;

    if (urls.length === 1) {
      const single = await graph(`/${igUser}/media`, {
        image_url: urls[0],
        caption: carousel?.legenda ?? '',
        access_token: token,
      });
      const published = await graph(`/${igUser}/media_publish`, {
        creation_id: single.id,
        access_token: token,
      });
      await admin.from('scheduled_posts').update({
        status: 'publicado',
        published_at: new Date().toISOString(),
        instagram_media_id: published.id,
        last_error: null,
      }).eq('id', post.id);
      return publicationResult(post.id, published.id, token);
    }

    // 1. containers filhos
    const children: string[] = [];
    for (const url of urls) {
      const child = await graph(`/${igUser}/media`, {
        image_url: url,
        is_carousel_item: 'true',
        access_token: token,
      });
      children.push(child.id);
    }

    // 2. container do carrossel
    const container = await graph(`/${igUser}/media`, {
      media_type: 'CAROUSEL',
      children: children.join(','),
      caption: carousel?.legenda ?? '',
      access_token: token,
    });

    // 3. aguarda o processamento
    for (let i = 0; i < 20; i++) {
      const st = await graph(`/${container.id}`, {
        fields: 'status_code,status',
        access_token: token,
      }, 'GET');
      if (st.status_code === 'FINISHED') break;
      if (st.status_code === 'ERROR') throw new Error(st.status ?? 'Erro ao processar mídia');
      await sleep(3000);
    }

    // 4. publica
    const published = await graph(`/${igUser}/media_publish`, {
      creation_id: container.id,
      access_token: token,
    });

    await admin.from('scheduled_posts').update({
      status: 'publicado',
      published_at: new Date().toISOString(),
      instagram_media_id: published.id,
      last_error: null,
    }).eq('id', post.id);

    return publicationResult(post.id, published.id, token);
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Erro desconhecido';
    console.error('publish error', postId, msg);
    await admin.from('scheduled_posts')
      .update({ status: 'falhou', last_error: msg })
      .eq('id', postId);
    throw e;
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'Método não permitido' }, 405);
  try {
    const caller = await authenticate(req);
    if (!caller) return json({ error: 'Não autenticado' }, 401);
    const body = await req.json().catch(() => null);
    const postId = body?.post_id;
    if (typeof postId !== 'string' || !UUID.test(postId)) return json({ error: 'post_id obrigatório' }, 400);
    await authorizePost(caller, postId);
    const result = await publishPost(postId);
    return json({ ok: true, ...result });
  } catch (e) {
    if (e instanceof HttpError) return json({ error: e.message }, e.status);
    const msg = e instanceof Error ? e.message : 'Erro desconhecido';
    return json({ error: msg }, 500);
  }
});
