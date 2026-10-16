import Stripe from "stripe";

const globalForStripe = globalThis as unknown as { stripe?: Stripe };

function createStripeClient(): Stripe {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) {
    // Don't throw at import time (Next's build process imports every route
    // module to collect page data, and this app should still build/run
    // fine before Stripe is configured) — instead, throw a clear error only
    // the moment a billing route actually tries to use the client.
    return new Proxy(
      {},
      {
        get() {
          throw new Error(
            "STRIPE_SECRET_KEY is not set in the server environment — add it to .env.local before using billing."
          );
        },
      }
    ) as unknown as Stripe;
  }
  return new Stripe(key, { typescript: true });
}

export const stripe = globalForStripe.stripe ?? createStripeClient();

if (process.env.NODE_ENV !== "production") globalForStripe.stripe = stripe;
