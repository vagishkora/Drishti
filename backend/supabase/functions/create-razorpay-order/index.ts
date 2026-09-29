/**
 * Supabase Edge Function: create-razorpay-order
 * Drishti Payment Gateway — Razorpay Integration
 *
 * Creates a Razorpay order server-side using the secret key.
 * Called by the frontend's razorpay.ts → createOrder()
 *
 * DEPLOYMENT:
 *   1. Install Supabase CLI: npm install -g supabase
 *   2. Login: supabase login
 *   3. Link project: supabase link --project-ref YOUR_PROJECT_REF
 *   4. Set secrets:
 *        supabase secrets set RAZORPAY_KEY_ID=rzp_test_...
 *        supabase secrets set RAZORPAY_KEY_SECRET=your_secret
 *        supabase secrets set SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
 *   5. Deploy: supabase functions deploy create-razorpay-order
 */

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
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
    const { amount, credits, user_id } = await req.json()

    const RAZORPAY_KEY_ID = Deno.env.get('RAZORPAY_KEY_ID')
    const RAZORPAY_KEY_SECRET = Deno.env.get('RAZORPAY_KEY_SECRET')
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

    if (!RAZORPAY_KEY_ID || !RAZORPAY_KEY_SECRET) {
      throw new Error('Razorpay keys not configured')
    }

    // 1. Create Razorpay order via their API
    const razorpayRes = await fetch('https://api.razorpay.com/v1/orders', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Basic ' + btoa(`${RAZORPAY_KEY_ID}:${RAZORPAY_KEY_SECRET}`),
      },
      body: JSON.stringify({
        amount: amount, // in paise
        currency: 'INR',
        receipt: `drishti_${user_id}_${Date.now()}`,
      }),
    })

    if (!razorpayRes.ok) {
      const errData = await razorpayRes.text()
      throw new Error(`Razorpay API error: ${errData}`)
    }

    const order = await razorpayRes.json()

    // 2. Store order in Supabase (using service role to bypass RLS)
    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!)
    await supabase.from('razorpay_orders').insert({
      user_id,
      razorpay_order_id: order.id,
      amount: amount,
      credits: credits,
      status: 'created',
    })

    return new Response(
      JSON.stringify({ order_id: order.id, amount: order.amount, currency: order.currency }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (err) {
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
