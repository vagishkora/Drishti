/**
 * Supabase Edge Function: verify-razorpay-payment
 * Drishti Payment Gateway — Razorpay Integration
 *
 * Verifies Razorpay payment signature (HMAC SHA256) server-side.
 * On success: marks order as paid, adds credits to user, logs transaction.
 *
 * DEPLOYMENT:
 *   supabase functions deploy verify-razorpay-payment
 *   (secrets should already be set from create-razorpay-order deployment)
 */

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { createHmac } from 'https://deno.land/std@0.177.0/crypto/mod.ts'
import { encode } from 'https://deno.land/std@0.177.0/encoding/hex.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, credits, user_id } = await req.json()

    const RAZORPAY_KEY_SECRET = Deno.env.get('RAZORPAY_KEY_SECRET')
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

    if (!RAZORPAY_KEY_SECRET) throw new Error('Razorpay secret not configured')

    // 1. Verify HMAC SHA256 signature
    const payload = `${razorpay_order_id}|${razorpay_payment_id}`
    const key = new TextEncoder().encode(RAZORPAY_KEY_SECRET)
    const data = new TextEncoder().encode(payload)

    const cryptoKey = await crypto.subtle.importKey(
      'raw', key, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
    )
    const signatureBuffer = await crypto.subtle.sign('HMAC', cryptoKey, data)
    const expectedSignature = Array.from(new Uint8Array(signatureBuffer))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('')

    if (expectedSignature !== razorpay_signature) {
      // Mark order as failed
      const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!)
      await supabase.from('razorpay_orders').update({ status: 'failed' })
        .eq('razorpay_order_id', razorpay_order_id)

      throw new Error('Payment signature verification failed')
    }

    // 2. Signature valid — update everything
    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!)

    // Mark order as paid
    await supabase.from('razorpay_orders').update({
      status: 'paid',
    }).eq('razorpay_order_id', razorpay_order_id)

    // Get current balance
    const { data: userData } = await supabase
      .from('users')
      .select('credits')
      .eq('id', user_id)
      .single()

    const currentBalance = userData?.credits || 0
    const newBalance = currentBalance + credits

    // Add credits to user
    await supabase.from('users').update({ credits: newBalance }).eq('id', user_id)

    // Log credit transaction
    await supabase.from('credit_transactions').insert({
      user_id,
      amount: credits,
      type: 'purchase',
      razorpay_order_id,
      razorpay_payment_id,
      description: `Purchased ${credits} credits via Razorpay`,
    })

    return new Response(
      JSON.stringify({ success: true, new_balance: newBalance }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (err) {
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
