// Endpoint para o BI: leads de WhatsApp (trigger, origem "Tráfego Pago") e status da conexão por conta Meta.
import { createClient } from 'npm:@supabase/supabase-js@2'
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors'

const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
const DATE = /^\d{4}-\d{2}-\d{2}$/

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (req.method !== 'POST') return json({ error: 'Método não permitido' }, 405)

  const expected = Deno.env.get('CRM_API_KEY')
  if (!expected) return json({ error: 'API key não configurada' }, 500)
  if (req.headers.get('x-api-key') !== expected) return json({ error: 'Não autorizado' }, 401)

  let body: any
  try { body = await req.json() } catch { return json({ error: 'JSON inválido' }, 400) }
  const { accounts, from, to } = body ?? {}
  if (!Array.isArray(accounts) || accounts.length > 1000 || !accounts.every((a) => typeof a === 'string' && a.length <= 64))
    return json({ error: 'accounts inválido' }, 400)
  if (typeof from !== 'string' || typeof to !== 'string' || !DATE.test(from) || !DATE.test(to))
    return json({ error: 'from/to inválidos' }, 400)

  const norm = (s: string) => s.replace(/^act_/, '').trim()
  const wanted = [...new Set(accounts.map(norm).filter(Boolean))]
  const result: Record<string, { in_crm: boolean; whatsapp_connected: boolean; leads: number }> = {}
  for (const a of wanted) result[a] = { in_crm: false, whatsapp_connected: false, leads: 0 }
  if (!wanted.length) return json({ accounts: result })

  const db = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
  const variants = wanted.flatMap((a) => [a, `act_${a}`])
  const { data: profiles, error } = await db.from('profiles').select('user_id, meta_ad_account_id').in('meta_ad_account_id', variants)
  if (error) return json({ error: error.message }, 500)

  const userToAcc = new Map<string, string>()
  for (const p of profiles ?? []) {
    const acc = norm(String(p.meta_ad_account_id))
    if (result[acc]) { result[acc].in_crm = true; userToAcc.set(p.user_id, acc) }
  }
  const userIds = [...userToAcc.keys()]
  if (!userIds.length) return json({ accounts: result })

  const { data: inst } = await db.from('whatsapp_instances').select('user_id, status').in('user_id', userIds)
  for (const i of inst ?? []) {
    if (i.status === 'connected' || i.status === 'open') result[userToAcc.get(i.user_id!)!].whatsapp_connected = true
  }

  // Intervalo em horário de São Paulo (UTC-3)
  const start = `${from}T00:00:00-03:00`
  const end = `${to}T23:59:59.999-03:00`
  const { data: leads, error: lErr } = await db.from('leads').select('user_id')
    .in('user_id', userIds).eq('origem', 'Tráfego Pago').is('deleted_at', null)
    .gte('created_at', start).lte('created_at', end).limit(100000)
  if (lErr) return json({ error: lErr.message }, 500)
  for (const l of leads ?? []) result[userToAcc.get(l.user_id)!].leads++

  return json({ accounts: result })
})
