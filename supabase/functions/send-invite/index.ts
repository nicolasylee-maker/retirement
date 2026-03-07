import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  const authHeader = req.headers.get('Authorization')
  if (!authHeader) {
    return new Response(JSON.stringify({ error: 'Missing authorization header' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  const adminEmail = Deno.env.get('ADMIN_EMAIL')

  // Verify JWT and extract caller email
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? ''
  const callerClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
  })
  const { data: { user: caller }, error: authError } = await callerClient.auth.getUser()

  if (authError || !caller) {
    return new Response(JSON.stringify({ error: 'Invalid token' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  if (!adminEmail || caller.email !== adminEmail) {
    return new Response(JSON.stringify({ error: 'Forbidden' }), {
      status: 403,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  let body: { email?: string; override?: string | null; overrideExpiresAt?: string | null }
  try {
    body = await req.json()
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON body' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  const { email, override, overrideExpiresAt } = body
  if (!email || typeof email !== 'string') {
    return new Response(JSON.stringify({ error: 'email is required' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  const adminClient = createClient(supabaseUrl, serviceRoleKey)

  const appUrl = Deno.env.get('APP_URL') ?? 'https://retireplanner.ca'

  // Normalise expiry — only relevant for trial, clear it for permanent overrides
  const expiresAt = override === 'trial' ? (overrideExpiresAt ?? null) : null

  const resendKey = Deno.env.get('RESEND_API_KEY') ?? ''

  const tierLabel = override === 'lifetime' ? 'lifetime'
    : override === 'beta' ? 'beta'
    : override === 'trial' && expiresAt
      ? `${Math.ceil((new Date(expiresAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24))}-day trial`
    : 'free'

  // Try to generate an invite link (creates user without sending Supabase's default email)
  const { data: linkData, error: linkError } = await adminClient.auth.admin.generateLink({
    type: 'invite',
    email,
    options: { data: { subscription_override: override ?? null }, redirectTo: appUrl },
  })

  if (linkError) {
    // 422 from Supabase means the user already exists
    const alreadyExists =
      linkError.message?.toLowerCase().includes('already been registered') ||
      (linkError as { status?: number }).status === 422

    if (!alreadyExists) {
      console.error('[send-invite] generateLink error', linkError)
      return new Response(JSON.stringify({ error: 'Failed to create invite' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // User already exists — update their override and send a notification email
    const { error: updateError } = await adminClient
      .from('users')
      .update({ subscription_override: override ?? null, override_expires_at: expiresAt })
      .eq('email', email)

    if (updateError) {
      console.error('[send-invite] update override error', updateError)
      return new Response(JSON.stringify({ error: 'Failed to update subscription override' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: 'RetirePlanner <hello@retireplanner.ca>',
        to: [email],
        subject: 'Your RetirePlanner.ca access has been updated',
        text: `Hi,\n\nYour account has been granted ${tierLabel} access to RetirePlanner.ca.\n\nSign in to get started:\n${appUrl}\n\n— The RetirePlanner Team`,
        html: `<div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px 24px;color:#111">
  <p style="font-size:20px;font-weight:600;margin:0 0 16px">RetirePlanner.ca</p>
  <p style="margin:0 0 12px">Your account has been granted <strong>${tierLabel}</strong> access to RetirePlanner.ca.</p>
  <a href="${appUrl}" style="display:inline-block;margin:16px 0;padding:12px 24px;background:#7c3aed;color:#fff;text-decoration:none;border-radius:8px;font-weight:500">Sign in to RetirePlanner.ca</a>
  <p style="margin:24px 0 0;color:#666;font-size:13px">— The RetirePlanner Team</p>
</div>`,
      }),
    })
  } else {
    // New user — send branded invite email via Resend with the confirmation link
    const confirmUrl = linkData?.properties?.action_link ?? ''

    // Write override_expires_at (the auth trigger only writes subscription_override)
    if (linkData?.user?.id && expiresAt) {
      await adminClient
        .from('users')
        .update({ override_expires_at: expiresAt })
        .eq('id', linkData.user.id)
    }

    const emailRes = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: 'RetirePlanner <hello@retireplanner.ca>',
        to: [email],
        subject: "You're invited to RetirePlanner.ca",
        text: `Hi,\n\nYou've been invited to RetirePlanner.ca with ${tierLabel} access.\n\nClick the link below to accept your invite and get started:\n${confirmUrl}\n\n— The RetirePlanner Team`,
        html: `<div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px 24px;color:#111">
  <p style="font-size:20px;font-weight:600;margin:0 0 16px">RetirePlanner.ca</p>
  <p style="margin:0 0 12px">You've been invited to RetirePlanner.ca with <strong>${tierLabel}</strong> access.</p>
  <p style="margin:0 0 12px">Click below to accept your invite and create your account:</p>
  <a href="${confirmUrl}" style="display:inline-block;margin:16px 0;padding:12px 24px;background:#7c3aed;color:#fff;text-decoration:none;border-radius:8px;font-weight:500">Accept Invite</a>
  <p style="margin:24px 0 0;color:#666;font-size:13px">— The RetirePlanner Team</p>
</div>`,
      }),
    })

    if (!emailRes.ok) {
      console.error('[send-invite] Resend error', await emailRes.text())
      return new Response(JSON.stringify({ error: 'User created but invite email failed to send' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }
  }

  return new Response(JSON.stringify({ success: true }), {
    status: 200,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
})
