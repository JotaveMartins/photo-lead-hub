// Leads Tráfego Pago pela data de contato (ou criação quando ausente), no período exato do BI.
import { createClient } from 'npm:@supabase/supabase-js@2'
const corsHeaders = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-api-key' }

const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
const DATE = /^\d{4}-\d{2}-\d{2}$/
const validDate = (s: string) => DATE.test(s) && Number.isFinite(Date.parse(`${s}T12:00:00Z`)) && new Date(`${s}T12:00:00Z`).toISOString().slice(0, 10) === s

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
  if (typeof from !== 'string' || typeof to !== 'string' || !validDate(from) || !validDate(to) || from > to)
    return json({ error: 'from/to inválidos' }, 400)

  if (body.date_basis != null && body.date_basis !== 'contact_or_created')
    return json({ error: 'date_basis inválido' }, 400)

  const norm = (s: string) => s.trim().replace(/^act_/i, '')
  const wanted = [...new Set(accounts.map(norm).filter(Boolean))]
  const result: Record<string, { in_crm: boolean; whatsapp_connected: boolean; leads: number; client_url: string | null; mapping_ambiguous?: boolean }> = {}
  for (const a of wanted) result[a] = { in_crm: false, whatsapp_connected: false, leads: 0, client_url: null }
  const response = () => json({ accounts: result, date_basis: 'contact_or_created', period: { from, to }, timezone: 'America/Sao_Paulo' })
  if (!wanted.length) return response()

  const db = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
  const variants = wanted.flatMap((a) => [a, `act_${a}`])
  // Read every match: the REST row limit must not hide an ambiguous mapping.
  const profiles: { user_id: string; meta_ad_account_id: string | null }[] = []
  for (let offset = 0; ; offset += 1000) {
    const { data, error } = await db.from('profiles').select('user_id, meta_ad_account_id')
      .in('meta_ad_account_id', variants).order('user_id').range(offset, offset + 999)
    if (error) return json({ error: error.message }, 500)
    profiles.push(...(data ?? []))
    if (!data || data.length < 1000) break
  }

  const accountUsers = new Map<string, Set<string>>()
  const userToAcc = new Map<string, string>()
  for (const p of profiles ?? []) {
    const acc = norm(String(p.meta_ad_account_id))
    if (result[acc]) {
      result[acc].in_crm = true
      userToAcc.set(p.user_id, acc)
      const users = accountUsers.get(acc) ?? new Set<string>()
      users.add(p.user_id)
      accountUsers.set(acc, users)
    }
  }
  for (const [acc, users] of accountUsers) {
    if (users.size === 1) {
      const userId = [...users][0]
      // This is a navigation destination, never an authentication credential.
      if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(userId))
        result[acc].client_url = `https://crm.avanzodigital.com.br/admin/clientes/${userId}`
    } else {
      // Never mix different companies into one BI client's total.
      result[acc].mapping_ambiguous = true
      for (const userId of users) userToAcc.delete(userId)
    }
  }
  const userIds = [...userToAcc.keys()]
  if (!userIds.length) return response()

  const { data: inst, error: instErr } = await db.from('whatsapp_instances').select('user_id, status').in('user_id', userIds)
  if (instErr) return json({ error: instErr.message }, 500)
  for (const i of inst ?? []) {
    if (i.status === 'connected' || i.status === 'open') result[userToAcc.get(i.user_id!)!].whatsapp_connected = true
  }

  // DATE contact values are calendar days; created_at timestamps use São Paulo boundaries.
  const start = `${from}T00:00:00-03:00`
  const nextDay = new Date(`${to}T12:00:00Z`)
  nextDay.setUTCDate(nextDay.getUTCDate() + 1)
  const endExclusive = `${nextDay.toISOString().slice(0, 10)}T00:00:00-03:00`
  const seen = new Set<string>()
  // Disjoint branches implement COALESCE(data_contato, created_at) without OR double counting.
  for (const byContact of [true, false]) {
    for (let offset = 0; ; offset += 1000) {
      let query = db.from('leads').select('id, user_id')
        .in('user_id', userIds).eq('origem', 'Tráfego Pago').is('deleted_at', null)
      query = byContact
        ? query.gte('data_contato', from).lte('data_contato', to)
        : query.is('data_contato', null).gte('created_at', start).lt('created_at', endExclusive)
      const { data: leads, error: lErr } = await query.order('id').range(offset, offset + 999)
      if (lErr) return json({ error: lErr.message }, 500)
      for (const lead of leads ?? []) {
        if (!seen.has(lead.id)) {
          seen.add(lead.id)
          result[userToAcc.get(lead.user_id)!].leads++
        }
      }
      if (!leads || leads.length < 1000) break
    }
  }

  return response()
})
