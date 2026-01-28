import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Criar cliente Supabase Admin (com service_role key)
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )

    // Verificar autenticação do usuário que está chamando
    const authHeader = req.headers.get('Authorization')!
    const token = authHeader.replace('Bearer ', '')

    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token)

    if (authError || !user) {
      throw new Error('Não autorizado')
    }

    // Verificar se o usuário é admin
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('hierarchy')
      .eq('id', user.id)
      .single()

    if (!profile || profile.hierarchy !== 'admin') {
      throw new Error('Apenas administradores podem criar colaboradores')
    }

    // Pegar dados do body
    const { full_name, email, phone, cpf, hierarchy, job_title_id, team_id } = await req.json()

    // Gerar senha temporária
    const tempPassword = Math.random().toString(36).slice(-8) + 'Aa1!'

    // Criar usuário usando Admin API (NÃO faz login automático!)
    const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password: tempPassword,
      email_confirm: true, // Auto-confirmar email
      user_metadata: {
        full_name,
        must_change_password: true, // Forçar mudança de senha no primeiro acesso
      }
    })

    if (createError) {
      throw createError
    }

    if (!newUser.user) {
      throw new Error('Falha ao criar usuário')
    }

    // Atualizar profile com todos os dados
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .update({
        full_name,
        email,
        phone: phone || null,
        cpf: cpf || null,
        hierarchy,
        job_title_id: job_title_id || null,
        team_id: team_id || null,
      })
      .eq('id', newUser.user.id)

    if (profileError) {
      // Se falhar ao atualizar profile, deletar o usuário criado
      await supabaseAdmin.auth.admin.deleteUser(newUser.user.id)
      throw new Error(`Erro ao criar profile: ${profileError.message}`)
    }

    return new Response(
      JSON.stringify({
        success: true,
        user_id: newUser.user.id,
        email: email,
        temp_password: tempPassword,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )

  } catch (error: any) {
    console.error('Erro ao criar colaborador:', error)

    // Retornar erro mais detalhado
    const errorMessage = error.message || error.msg || JSON.stringify(error)

    return new Response(
      JSON.stringify({
        success: false,
        error: errorMessage,
        details: error
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    )
  }
})
