const Razorpay = require('razorpay');
const crypto = require('crypto');
const { supabaseAdmin } = require('../config/supabase');

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

exports.createOrder = async (req, res) => {
  try {
    const { amount, credits, user_id } = req.body;
    
    const options = {
      amount: amount, // amount in paise
      currency: "INR",
      receipt: `receipt_${Date.now()}`,
    };

    const order = await razorpay.orders.create(options);
    
    // Log to DB
    const { error: dbError } = await supabaseAdmin.from('razorpay_orders').insert({
      user_id,
      razorpay_order_id: order.id,
      amount,
      credits,
      status: 'created'
    });

    if (dbError) throw dbError;

    res.json({
      order_id: order.id,
      amount: order.amount,
      currency: order.currency
    });
  } catch (error) {
    console.error('Razorpay Create Order Error:', error);
    res.status(500).json({ error: error.message });
  }
};

exports.verifyPayment = async (req, res) => {
  try {
    const { 
      razorpay_order_id, 
      razorpay_payment_id, 
      razorpay_signature,
      credits,
      user_id 
    } = req.body;

    const body = razorpay_order_id + "|" + razorpay_payment_id;
    const expectedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(body.toString())
      .digest('hex');

    if (expectedSignature === razorpay_signature) {
      // Payment is valid
      
      // 1. Update order status
      await supabaseAdmin.from('razorpay_orders')
        .update({ status: 'paid' })
        .eq('razorpay_order_id', razorpay_order_id);

      // 2. Add credits via RPC
      const { data: newBalance, error: creditError } = await supabaseAdmin.rpc('add_credits', {
        user_id_input: user_id,
        credits_input: credits
      });

      if (creditError) throw creditError;

      // 3. Log transaction
      await supabaseAdmin.from('credit_transactions').insert({
        user_id,
        amount: credits,
        type: 'purchase',
        description: `Purchased ${credits} credits`,
        razorpay_order_id,
        razorpay_payment_id
      });

      res.json({ success: true, new_balance: newBalance });
    } else {
      res.status(400).json({ error: 'Invalid signature' });
    }
  } catch (error) {
    console.error('Razorpay Verify Payment Error:', error);
    res.status(500).json({ error: error.message });
  }
};
