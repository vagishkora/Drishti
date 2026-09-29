/**
 * creditsController.js
 * Architectural Role: Drishti Credits System
 * A pluggable abstraction layer for in-app currency.
 * Future work: Replace add/spend with Razorpay/Stripe webhook integration.
 * All credit operations use the service role to bypass RLS.
 */
const { getServiceClient } = require('../config/supabase')

const SUBSCRIPTION_COST = 100 // Credits per month subscription
const TOPUP_AMOUNT = 500       // Credits added per top-up

// GET /api/credits/balance — Get current user's credit balance
exports.getBalance = async (req, res) => {
  const supabase = getServiceClient()

  const { data, error } = await supabase.from('credits')
    .select('balance')
    .eq('user_id', req.user.id)
    .single()

  if (error) return res.status(500).json({ error: error.message })
  if (!data) return res.json({ balance: 0 })

  res.json({ balance: data.balance })
}

// POST /api/credits/add — Add 500 credits (Drishti Credits System top-up)
// Architectural Note: This endpoint simulates a successful payment.
// In production, this would be triggered by a Razorpay/Stripe webhook.
exports.addCredits = async (req, res) => {
  const supabase = getServiceClient()

  const { data: existing } = await supabase.from('credits')
    .select('balance')
    .eq('user_id', req.user.id)
    .single()

  if (existing) {
    const { data, error } = await supabase.from('credits')
      .update({ balance: existing.balance + TOPUP_AMOUNT, updated_at: new Date().toISOString() })
      .eq('user_id', req.user.id)
      .select('balance')
      .single()

    if (error) return res.status(500).json({ error: error.message })
    return res.json({ success: true, balance: data.balance, added: TOPUP_AMOUNT })
  } else {
    const { data, error } = await supabase.from('credits').insert({
      user_id: req.user.id,
      balance: TOPUP_AMOUNT
    }).select('balance').single()

    if (error) return res.status(500).json({ error: error.message })
    return res.json({ success: true, balance: data.balance, added: TOPUP_AMOUNT })
  }
}

// POST /api/credits/spend — Spend credits on a creator subscription
exports.spendCredits = async (req, res) => {
  const supabase = getServiceClient()
  const { creator_id } = req.body

  if (!creator_id) return res.status(400).json({ error: 'creator_id is required.' })

  // 1. Fetch current balance
  const { data: creditRow, error: fetchError } = await supabase.from('credits')
    .select('balance')
    .eq('user_id', req.user.id)
    .single()

  if (fetchError || !creditRow) return res.status(404).json({ error: 'Credits account not found.' })
  if (creditRow.balance < SUBSCRIPTION_COST) {
    return res.status(402).json({ error: 'Insufficient credits.', balance: creditRow.balance, required: SUBSCRIPTION_COST })
  }

  // 2. Deduct credits
  const { error: deductError } = await supabase.from('credits')
    .update({ balance: creditRow.balance - SUBSCRIPTION_COST, updated_at: new Date().toISOString() })
    .eq('user_id', req.user.id)

  if (deductError) return res.status(500).json({ error: deductError.message })

  // 3. Provision subscription (30-day rolling)
  const currentPeriodEnd = new Date()
  currentPeriodEnd.setDate(currentPeriodEnd.getDate() + 30)

  const { error: subError } = await supabase.from('subscriptions').upsert({
    subscriber_id: req.user.id,
    creator_id,
    status: 'active',
    current_period_end: currentPeriodEnd.toISOString()
  }, { onConflict: 'subscriber_id,creator_id' })

  if (subError) return res.status(500).json({ error: subError.message })

  // 4. Notify creator of new subscriber
  await supabase.from('notifications').insert({
    recipient_id: creator_id,
    actor_id: req.user.id,
    type: 'subscribe',
  })

  res.json({
    success: true,
    balance: creditRow.balance - SUBSCRIPTION_COST,
    subscribed_until: currentPeriodEnd.toISOString()
  })
}
