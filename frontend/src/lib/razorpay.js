/* ============================================================================
   Razorpay checkout — the whole order → pay → verify sequence in one place.

   Trust boundary: this file never decides what anything costs. It asks the
   backend to create an order, opens Razorpay's widget with the id the backend
   returned, and hands the callback straight back for signature verification.
   A payment is only real once /payment/verify says so.
   ============================================================================ */

import {
  apiCreatePaymentOrder,
  apiVerifyPayment,
  apiMarkPaymentFailed,
} from './api';

const CHECKOUT_SRC = 'https://checkout.razorpay.com/v1/checkout.js';

let scriptPromise = null;

/**
 * Injects Razorpay's checkout script once and resolves when it is ready.
 * Repeat calls share the same promise, so opening checkout twice does not add
 * a second <script> tag.
 */
export const loadRazorpayCheckout = () => {
  if (window.Razorpay) return Promise.resolve(true);
  if (scriptPromise) return scriptPromise;

  scriptPromise = new Promise((resolve, reject) => {
    const existing = document.querySelector(`script[src="${CHECKOUT_SRC}"]`);
    const script = existing || document.createElement('script');

    script.addEventListener('load', () => resolve(true));
    script.addEventListener('error', () => {
      scriptPromise = null;
      reject(new Error('Could not load the payment gateway. Check your connection and try again.'));
    });

    if (!existing) {
      script.src = CHECKOUT_SRC;
      script.async = true;
      document.body.appendChild(script);
    }
  });

  return scriptPromise;
};

/**
 * Runs a complete checkout.
 *
 * @param {object}   args
 * @param {string}   args.productId
 * @param {number}   args.quantity
 * @param {string}   args.destinationPincode
 * @param {object}   args.buyer                 { name, email, contact } — prefills the widget
 * @param {function} args.onStage               called with 'creating' | 'awaiting-payment' | 'verifying'
 *
 * Resolves with { status: 'paid', order } or { status: 'dismissed' }.
 * Rejects with an Error whose message is safe to show the user.
 */
export const startCheckout = async ({
  productId,
  quantity,
  destinationPincode,
  buyer = {},
  onStage = () => {},
}) => {
  await loadRazorpayCheckout();

  onStage('creating');
  const order = await apiCreatePaymentOrder({ productId, quantity, destinationPincode });

  onStage('awaiting-payment');

  return new Promise((resolve, reject) => {
    // Guards against the double-resolve you get when Razorpay fires both
    // `payment.failed` and the modal's dismiss handler.
    let settled = false;
    const settle = (fn, value) => {
      if (settled) return;
      settled = true;
      fn(value);
    };

    const checkout = new window.Razorpay({
      key: order.keyId,
      order_id: order.razorpayOrderId,
      amount: order.amount,
      currency: order.currency,
      name: 'EcoMatch',
      description: order.product?.title || 'Material purchase',
      image: '/vite.svg',
      prefill: {
        name: buyer.name || '',
        email: buyer.email || '',
        contact: buyer.contact || '',
      },
      notes: { productId },
      theme: { color: '#15803d' },

      handler: async (response) => {
        try {
          onStage('verifying');
          const verified = await apiVerifyPayment({
            razorpay_order_id: response.razorpay_order_id,
            razorpay_payment_id: response.razorpay_payment_id,
            razorpay_signature: response.razorpay_signature,
          });
          settle(resolve, { status: 'paid', order: verified.order, message: verified.message });
        } catch (err) {
          settle(reject, err);
        }
      },

      modal: {
        ondismiss: async () => {
          // Closing the widget is a normal user action, not an error — but the
          // order must not sit in CREATED forever.
          try {
            await apiMarkPaymentFailed(order.razorpayOrderId, 'Checkout was closed before payment.');
          } catch {
            /* best effort — the buyer already walked away */
          }
          settle(resolve, { status: 'dismissed' });
        },
      },
    });

    checkout.on('payment.failed', async (event) => {
      const reason =
        event?.error?.description || 'The payment could not be completed. No amount was charged.';
      try {
        await apiMarkPaymentFailed(order.razorpayOrderId, reason);
      } catch {
        /* reporting the failure is best effort */
      }
      settle(reject, new Error(reason));
    });

    checkout.open();
  });
};

/** ₹ formatting for a paise integer, which is how the backend stores money. */
export const formatPaise = (paise) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format((paise || 0) / 100);

/** ₹ formatting for a plain rupee number. */
export const formatRupees = (rupees) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(rupees || 0);
