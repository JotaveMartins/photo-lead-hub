import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

Deno.serve(async () => {
  const url = Deno.env.get('SUPABASE_URL')!
  const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  const admin = createClient(url, key)
  const email = 'meta.tester@avanzodigital.com.br'
  const password = 'MetaTester2026!'
  const { data, error } = await admin.auth.admin.createUser({
    email, password, email_confirm: true, user_metadata: { nome: 'Meta Tester' },
  })
  let userId = data?.user?.id
  if (error && !userId) {
    const { data: list } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 })
    userId = list?.users?.find((u) => u.email === email)?.id
    if (userId) await admin.auth.admin.updateUserById(userId, { password, email_confirm: true })
  }
  if (!userId) return new Response(JSON.stringify({ error: error?.message }), { status: 400 })
  await admin.from('user_roles').delete().eq('user_id', userId)
  const { error: rErr } = await admin.from('user_roles').insert({ user_id: userId, role: 'tester' })
  await admin.from('profiles').update({ senha: password, nome: 'Meta Tester' }).eq('user_id', userId)
  return new Response(JSON.stringify({ userId, email, roleError: rErr?.message ?? null }), {
    headers: { 'Content-Type': 'application/json' },
  })
})
