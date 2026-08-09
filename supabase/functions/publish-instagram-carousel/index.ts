import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { createClient } from 'npm:@supabase/supabase-js@2.45.0';

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

export async function publishPost(postId: string) {
  const { data: post, error } = await admin
    .from('scheduled_posts')
    .select('id, user_id, carousel_id, social_account_id, status, attempts')
    .eq('id', postId)
    .maybeSingle();
  if (error) throw error;
  if (!post) throw new Error('Agendamento não encontrado');
  if (post.status === 'publicado') return { alreadyPublished: true };

  await admin.from('scheduled_posts')
    .update({ status: 'publicando', attempts: (post.attempts ?? 0) + 1, last_error: null })
    .eq('id', post.id);

  try {
    const { data: account } = await admin
      .from('social_accounts')
      .select('instagram_user_id, access_token, token_expires_at, username')
      .eq('id', post.social_account_id)
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
      return { media_id: published.id };
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

    return { media_id: published.id };
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
  try {
    const { post_id } = await req.json();
    if (!post_id) return json({ error: 'post_id obrigatório' }, 400);
    const result = await publishPost(post_id);
    return json({ ok: true, ...result });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Erro desconhecido';
    return json({ error: msg }, 500);
  }
});