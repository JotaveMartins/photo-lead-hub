// Endpoint para o BI: preenche profiles.meta_ad_account_id casando pelo nome do cliente.
// Só preenche quando o campo está vazio ou não é um ID numérico (nunca sobrescreve um ID válido).
import { createClient } from 'npm:@supabase/supabase-js@2'
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors'

const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

const normName = (s: string) =>
  s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()
const normId = (s: string) => s.replace(/^act_/, '').trim()
const isNumericId = (s: string | null) => !!s && /^\d{5,}$/.test(normId(s))

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (req.method !== 'POST') return json({ error: 'Método não permitido' }, 405)
  const expected = Deno.env.get('CRM_API_KEY')
  if (!expected) return json({ error: 'API key não configurada' }, 500)
  if (req.headers.get('x-api-key') !== expected) return json({ error: 'Não autorizado' }, 401)

  let body: any
  try { body = await req.json() } catch { return json({ error: 'JSON inválido' }, 400) }
  const items = body?.accounts
  const dryRun = body?.dry_run === true
  if (!Array.isArray(items) || items.length > 1000 ||
      !items.every((i) => i && typeof i.account_id === 'string' && typeof i.name === 'string' && i.account_id.length <= 64 && i.name.length <= 200))
    return json({ error: 'accounts inválido: esperado [{ account_id, name }]' }, 400)

  const db = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
  const { data: profiles, error } = await db.from('profiles').select('user_id, nome, meta_ad_account_id')
  if (error) return json({ error: error.message }, 500)

  const byName = new Map<string, typeof profiles>()
  for (const p of profiles ?? []) {
    const k = normName(p.nome ?? '')
    if (!k) continue
    byName.set(k, [...(byName.get(k) ?? []), p])
  }
  const usedIds = new Set((profiles ?? []).filter((p) => isNumericId(p.meta_ad_account_id)).map((p) => normId(p.meta_ad_account_id!)))

  const results: any[] = []
  for (const it of items) {
    const acc = normId(it.account_id)
    const matches = byName.get(normName(it.name)) ?? []
    if (!/^\d{5,}$/.test(acc)) { results.push({ ...it, status: 'id_invalido' }); continue }
    if (matches.length === 0) { results.push({ ...it, status: 'sem_cliente_no_crm' }); continue }
    if (matches.length > 1) { results.push({ ...it, status: 'nome_ambiguo' }); continue }
    const p = matches[0]
    if (isNumericId(p.meta_ad_account_id)) {
      results.push({ ...it, status: normId(p.meta_ad_account_id!) === acc ? 'ja_vinculado' : 'conflito_id_existente' }); continue
    }
    if (usedIds.has(acc)) { results.push({ ...it, status: 'id_ja_usado_por_outro' }); continue }
    if (!dryRun) {
      const { error: uErr } = await db.from('profiles').update({ meta_ad_account_id: acc }).eq('user_id', p.user_id)
      if (uErr) { results.push({ ...it, status: 'erro', error: uErr.message }); continue }
    }
    usedIds.add(acc)
    results.push({ ...it, status: dryRun ? 'seria_vinculado' : 'vinculado' })
  }
  const summary = results.reduce((a: Record<string, number>, r) => ((a[r.status] = (a[r.status] ?? 0) + 1), a), {})
  return json({ dry_run: dryRun, summary, results })
})
