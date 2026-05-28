import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { createClient } from 'npm:@supabase/supabase-js@2.45.0';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!;
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const GOOGLE_CLIENT_ID = Deno.env.get('GOOGLE_OAUTH_CLIENT_ID')!;
const GOOGLE_CLIENT_SECRET = Deno.env.get('GOOGLE_OAUTH_CLIENT_SECRET')!;

type Action = 'create' | 'update' | 'delete';

interface SyncBody {
  action: Action;
  event_id: string;
}

async function refreshTokenIfNeeded(admin: ReturnType<typeof createClient>, conn: any) {
  const now = Date.now();
  const exp = new Date(conn.token_expires_at).getTime();
  if (exp - now > 30_000) return conn.access_token;

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: GOOGLE_CLIENT_ID,
      client_secret: GOOGLE_CLIENT_SECRET,
      refresh_token: conn.refresh_token,
      grant_type: 'refresh_token',
    }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(`Refresh failed: ${JSON.stringify(data)}`);

  const newExpires = new Date(Date.now() + (data.expires_in - 60) * 1000).toISOString();
  await admin.from('google_calendar_connections')
    .update({ access_token: data.access_token, token_expires_at: newExpires })
    .eq('user_id', conn.user_id);
  return data.access_token as string;
}

function buildEventResource(event: any) {
  const start = new Date(event.data_evento);
  const end = new Date(start.getTime() + 60 * 60 * 1000); // default 1h
  const summary = event.titulo || 'Evento';
  const description = [
    event.descricao || '',
    event.clientes?.nome ? `Cliente: ${event.clientes.nome}` : '',
    event.clientes?.whatsapp ? `WhatsApp: ${event.clientes.whatsapp}` : '',
    event.services?.nome ? `Serviço: ${event.services.nome}` : '',
  ].filter(Boolean).join('\n');

  return {
    summary,
    description,
    location: event.local || undefined,
    start: { dateTime: start.toISOString(), timeZone: 'America/Sao_Paulo' },
    end: { dateTime: end.toISOString(), timeZone: 'America/Sao_Paulo' },
  };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing auth' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: userErr } = await userClient.auth.getUser();
    if (userErr || !user) {
      return new Response(JSON.stringify({ error: 'Invalid user' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const body = await req.json() as SyncBody;
    if (!body.action || !body.event_id) {
      return new Response(JSON.stringify({ error: 'Missing action or event_id' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

    const { data: conn } = await admin
      .from('google_calendar_connections')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle();

    if (!conn) {
      return new Response(JSON.stringify({ skipped: true, reason: 'no_connection' }), {
        status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const accessToken = await refreshTokenIfNeeded(admin, conn);

    // Fetch event
    const { data: event, error: eventErr } = await admin
      .from('events')
      .select('*, clientes(nome, whatsapp), services(nome)')
      .eq('id', body.event_id)
      .eq('user_id', user.id)
      .maybeSingle();

    if (eventErr || !event) {
      return new Response(JSON.stringify({ error: 'Event not found' }), {
        status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const calendarBase = `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(conn.calendar_id)}/events`;

    if (body.action === 'delete') {
      if (!event.google_event_id) {
        return new Response(JSON.stringify({ skipped: true, reason: 'no_google_event' }), {
          status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      const res = await fetch(`${calendarBase}/${event.google_event_id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (!res.ok && res.status !== 410 && res.status !== 404) {
        const txt = await res.text();
        throw new Error(`Google delete failed [${res.status}]: ${txt}`);
      }
      await admin.from('events').update({ google_event_id: null }).eq('id', event.id);
      return new Response(JSON.stringify({ success: true }), {
        status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const resource = buildEventResource(event);

    if (body.action === 'update' && event.google_event_id) {
      const res = await fetch(`${calendarBase}/${event.google_event_id}`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(resource),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(`Google update failed [${res.status}]: ${JSON.stringify(data)}`);
      return new Response(JSON.stringify({ success: true, google_event_id: data.id }), {
        status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // create (or update without an existing google_event_id)
    const res = await fetch(calendarBase, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(resource),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(`Google create failed [${res.status}]: ${JSON.stringify(data)}`);

    await admin.from('events')
      .update({ google_event_id: data.id })
      .eq('id', event.id);

    return new Response(JSON.stringify({ success: true, google_event_id: data.id }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Unknown error';
    console.error('sync error', msg);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});