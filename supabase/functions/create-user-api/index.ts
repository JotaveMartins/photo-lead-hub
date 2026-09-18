import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-api-key',
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return json({ error: 'Método não permitido' }, 405)
  }

  try {
    const expectedKey = Deno.env.get('CRM_API_KEY')
    if (!expectedKey) {
      return json({ error: 'API key não configurada no servidor' }, 500)
    }

    const authHeader = req.headers.get('Authorization') || ''
    const providedKey =
      req.headers.get('x-api-key') ||
      (authHeader.toLowerCase().startsWith('bearer ') ? authHeader.slice(7) : '')

    if (providedKey !== expectedKey) {
      return json({ error: 'Não autorizado' }, 401)
    }

    let payload: { nome?: string; email?: string }
    try {
      payload = await req.json()
    } catch {
      return json({ error: 'JSON inválido' }, 400)
    }

    const nome = (payload.nome || '').trim()
    const email = (payload.email || '').trim().toLowerCase()

    if (!nome || nome.length > 255) {
      return json({ error: 'Campo "nome" é obrigatório (até 255 caracteres)' }, 400)
    }
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return json({ error: 'Campo "email" é obrigatório e deve ser válido' }, 400)
    }

    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789'
    let password = ''
    const bytes = new Uint8Array(8)
    crypto.getRandomValues(bytes)
    for (let i = 0; i < 8; i++) password += chars.charAt(bytes[i] % chars.length)

    const adminClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )

    const { data: newUser, error: createError } = await adminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { nome },
    })

    if (createError) {
      return json({ error: createError.message }, 400)
    }

    await adminClient.from('user_roles').insert({ user_id: newUser.user.id, role: 'user' })

    await adminClient
      .from('profiles')
      .update({ senha: password, plano_basico: false })
      .eq('user_id', newUser.user.id)

    return json({
      user: { id: newUser.user.id, email: newUser.user.email, nome },
      password,
    })
  } catch (error) {
    return json({ error: (error as Error).message }, 500)
  }
})
