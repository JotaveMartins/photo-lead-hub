import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { duplicateAccountMessage, isDuplicateEmailError, normalizeEmail } from './logic.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    // Verify the caller is authenticated
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Não autorizado' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

    // Create client with caller's token to check role
    const callerClient = createClient(supabaseUrl, serviceRoleKey, {
      global: { headers: { Authorization: authHeader } },
    })

    const { data: { user: caller } } = await callerClient.auth.getUser()
    if (!caller) {
      return new Response(JSON.stringify({ error: 'Não autorizado' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Check if caller is admin using has_role function
    const { data: isAdmin } = await callerClient.rpc('has_role', {
      _user_id: caller.id,
      _role: 'admin',
    })

    if (!isAdmin) {
      return new Response(JSON.stringify({ error: 'Acesso negado. Apenas administradores podem criar usuários.' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const body = await req.json()
    const nome = typeof body?.nome === 'string' ? body.nome.trim() : ''
    const email = normalizeEmail(body?.email)
    const plano_basico = body?.plano_basico
    if (!nome || !email) {
      return new Response(JSON.stringify({ error: 'Nome e email são obrigatórios' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Generate random 8-char password
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789'
    let password = ''
    for (let i = 0; i < 8; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length))
    }

    // Create user with service role (admin API)
    const adminClient = createClient(supabaseUrl, serviceRoleKey)
    const { data: newUser, error: createError } = await adminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { nome },
    })

    if (createError) {
      if (isDuplicateEmailError(createError)) {
        // Read-only lookup: never alter, delete or recreate the existing account.
        const { data: existing } = await adminClient.from('profiles').select('user_id, nome, created_at').eq('email', email).maybeSingle()
        const { data: access } = existing
          ? await adminClient.from('crm_account_access').select('mode').eq('user_id', existing.user_id).maybeSingle()
          : { data: null }
        console.warn('create-user: email already registered', { caller: caller.id, existing_user: existing?.user_id ?? null })
        return new Response(JSON.stringify({
          error: duplicateAccountMessage(existing ? { ...existing, inTrial: access?.mode === 'trial' } : null),
          code: 'email_exists',
        }), { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
      }
      console.error('create-user: auth createUser failed', { caller: caller.id, code: (createError as { code?: string }).code, status: createError.status, message: createError.message })
      return new Response(JSON.stringify({ error: createError.message }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Assign 'user' role
    const { error: roleError } = await adminClient.from('user_roles').insert({
      user_id: newUser.user.id,
      role: 'user',
    })
    if (roleError) console.error('create-user: role insert failed', { user: newUser.user.id, message: roleError.message })

    // Save generated password and plan flag in profile
    const { error: profileError } = await adminClient
      .from('profiles')
      .update({ senha: password, plano_basico: !!plano_basico })
      .eq('user_id', newUser.user.id)
    if (profileError) console.error('create-user: profile update failed', { user: newUser.user.id, message: profileError.message })
    console.log('create-user: account created', { caller: caller.id, user: newUser.user.id, plano_basico: !!plano_basico })

    return new Response(JSON.stringify({ 
      user: { id: newUser.user.id, email: newUser.user.email },
      password 
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error) {
    console.error('create-user: unexpected failure', (error as Error).message)
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
