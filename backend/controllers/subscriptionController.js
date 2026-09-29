/**
 * Subscription Controller
 * ───────────────────────
 * Architectural Role: Manages the subscription lifecycle via the
 * "Simulated Payment Gateway Module" — a pluggable abstraction layer
 * designed to be replaceable with Razorpay or Stripe in future work.
 * Test card: 4111 1111 1111 1111
 */

const { supabase } = require('../config/supabase');

/**
 * POST /api/subscriptions/pay
 * Simulated Payment Gateway Module — processes test card payments.
 * This module is intentionally designed as a pluggable abstraction layer.
 * In production, swap this with Razorpay/Stripe webhook handlers.
 */
const processPayment = async (req, res) => {
  const { creator_id, amount, card_number, cvv, expiry } = req.body;

  // Simulate network latency (800ms–1.5s)
  const delay = Math.floor(Math.random() * 700) + 800;
  await new Promise((r) => setTimeout(r, delay));

  // Validate test card
  const sanitizedCard = card_number.replace(/\s+/g, '');
  if (sanitizedCard !== '4111111111111111') {
    return res.status(400).json({ error: 'Card declined. Use the designated test card.' });
  }

  if (!/^\d{3,4}$/.test(cvv)) {
    return res.status(400).json({ error: 'Invalid CVV format' });
  }

  if (!/^(0[1-9]|1[0-2])\/\d{2}$/.test(expiry)) {
    return res.status(400).json({ error: 'Invalid expiry format. Expected MM/YY.' });
  }

  const txId = `tx_sim_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

  try {
    // 1. Record transaction
    const { error: txError } = await supabase.from('transactions').insert({
      user_id: req.user.id,
      amount,
      currency: 'INR',
      status: 'succeeded',
      payment_method: 'test_card_4111_simulation',
    });

    if (txError) throw new Error(txError.message);

    // 2. Provision subscription (30-day rolling)
    const periodEnd = new Date();
    periodEnd.setDate(periodEnd.getDate() + 30);

    const { error: subError } = await supabase.from('subscriptions').upsert(
      {
        subscriber_id: req.user.id,
        creator_id,
        status: 'active',
        current_period_end: periodEnd.toISOString(),
      },
      { onConflict: 'subscriber_id,creator_id' }
    );

    if (subError) throw new Error(subError.message);

    return res.json({
      success: true,
      transaction_id: txId,
      message: 'Subscription activated for 30 days',
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};

/**
 * GET /api/subscriptions/status/:creatorId
 * Checks if the authenticated user has an active subscription to a creator.
 */
const checkSubscription = async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('subscriber_id', req.user.id)
      .eq('creator_id', req.params.creatorId)
      .eq('status', 'active')
      .gt('current_period_end', new Date().toISOString())
      .single();

    return res.json({ is_subscribed: !!data });
  } catch (err) {
    return res.json({ is_subscribed: false });
  }
};

/**
 * GET /api/subscriptions/my-subscribers
 * Returns count and list of active subscribers for the authenticated creator.
 */
const getMySubscribers = async (req, res) => {
  try {
    const { data, count, error } = await supabase
      .from('subscriptions')
      .select('*', { count: 'exact' })
      .eq('creator_id', req.user.id)
      .eq('status', 'active')
      .gt('current_period_end', new Date().toISOString());

    if (error) throw new Error(error.message);

    return res.json({ subscribers: data, total: count });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};

module.exports = { processPayment, checkSubscription, getMySubscribers };
