/**
 * Simulated Payment Gateway Module
 * A pluggable abstraction layer designed for research and UX publication workflows.
 * Simulates network latency and strictly validates test card geometry.
 */

export interface PaymentIntent {
  amount: number;
  currency: string;
  creatorId: string;
}

export interface PaymentResult {
  success: boolean;
  transactionId?: string;
  error?: string;
}

export const SimulatedPaymentGateway = {
  processPayment: async (
    _intent: PaymentIntent, 
    cardNumber: string, 
    cvv: string, 
    expiry: string
  ): Promise<PaymentResult> => {
    // Simulate complex network negotiations (800ms - 1.5s)
    const delay = Math.floor(Math.random() * 700) + 800;
    await new Promise(resolve => setTimeout(resolve, delay));

    // Input Sanitization
    const sanitizedCard = cardNumber.replace(/\s+/g, '');
    
    // Hard check for the requested test payload parameters
    if (sanitizedCard !== '4111111111111111') {
      return {
        success: false,
        error: "Card declined. Use the designated test card metric.",
      };
    }

    if (!cvv.match(/^\d{3,4}$/)) {
      return { success: false, error: "Invalid CVV format." };
    }

    if (!expiry.match(/^(0[1-9]|1[0-2])\/\d{2}$/)) {
      return { success: false, error: "Invalid expiry format. Expected MM/YY." };
    }

    // Provision a simulated mock transaction cryptographic ID
    const mockTxID = `tx_sim_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

    return {
      success: true,
      transactionId: mockTxID,
    };
  }
}
