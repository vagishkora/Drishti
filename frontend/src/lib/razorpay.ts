import { supabase } from './supabase'

/**
 * razorpay.ts — Drishti Payment Gateway — Razorpay Integration
 */
const RAZORPAY_KEY_ID = import.meta.env.VITE_RAZORPAY_KEY_ID || ''

export interface CreditPack {
  name: string
  credits: number
  amount: number // in paise (₹49 = 4900)
  displayPrice: string
  popular?: boolean
}

export const CREDIT_PACKS: CreditPack[] = [
  { name: 'Starter Pack', credits: 500, amount: 4900, displayPrice: '₹49' },
  { name: 'Popular Pack', credits: 1200, amount: 9900, displayPrice: '₹99', popular: true },
  { name: 'Premium Pack', credits: 2500, amount: 19900, displayPrice: '₹199' },
]

/**
 * Create a Razorpay order via the Express backend.
 */
export async function createOrder(pack: CreditPack, userId: string) {
  const { data: { session } } = await supabase.auth.getSession()
  
  const response = await fetch('http://localhost:3001/api/razorpay/order', {
    method: 'POST',
    headers: { 
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${session?.access_token}`
    },
    body: JSON.stringify({ amount: pack.amount, credits: pack.credits, user_id: userId })
  })
  if (!response.ok) throw new Error('Failed to create order')
  return await response.json() as { order_id: string; amount: number; currency: string }
}

/**
 * Open the Razorpay checkout popup.
 */
export function openCheckout(
  orderId: string,
  amount: number,
  userName: string,
  userEmail: string,
  onSuccess: (response: { razorpay_payment_id: string; razorpay_order_id: string; razorpay_signature: string }) => void,
  onFailure: (error: any) => void
): void {
  if (!RAZORPAY_KEY_ID) {
    onFailure(new Error('Razorpay key not configured'))
    return
  }

  const loadAndOpen = () => {
    const options = {
      key: RAZORPAY_KEY_ID,
      amount,
      currency: 'INR',
      name: 'Drishti (दृष्टि)',
      description: 'Buy Drishti Credits',
      order_id: orderId,
      prefill: { name: userName, email: userEmail },
      theme: { color: '#7C3AED' },
      handler: onSuccess,
      modal: { ondismiss: () => onFailure(new Error('Payment cancelled')) },
    }

    const rzp = new (window as any).Razorpay(options)
    rzp.on('payment.failed', onFailure)
    rzp.open()
  }

  if ((window as any).Razorpay) {
    loadAndOpen()
  } else {
    const script = document.createElement('script')
    script.src = 'https://checkout.razorpay.com/v1/checkout.js'
    script.onload = loadAndOpen
    script.onerror = () => onFailure(new Error('Failed to load Razorpay SDK'))
    document.body.appendChild(script)
  }
}

/**
 * Verify payment via the Express backend.
 */
export async function verifyPayment(
  razorpayOrderId: string,
  razorpayPaymentId: string,
  razorpaySignature: string,
  credits: number,
  userId: string
) {
  const { data: { session } } = await supabase.auth.getSession()

  const response = await fetch('http://localhost:3001/api/razorpay/verify', {
    method: 'POST',
    headers: { 
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${session?.access_token}`
    },
    body: JSON.stringify({
      razorpay_order_id: razorpayOrderId,
      razorpay_payment_id: razorpayPaymentId,
      razorpay_signature: razorpaySignature,
      credits,
      user_id: userId,
    })
  })
  if (!response.ok) throw new Error('Payment verification failed')
  return await response.json() as { success: boolean; new_balance: number }
}
