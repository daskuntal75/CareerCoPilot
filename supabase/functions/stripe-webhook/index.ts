import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

/**
 * Stripe Webhook Handler
 *
 * Handles Stripe webhook events for real-time subscription synchronization.
 * This replaces polling and ensures subscription status is always up-to-date.
 *
 * Events handled:
 * - checkout.session.completed - New subscription created
 * - customer.subscription.created - Subscription activated
 * - customer.subscription.updated - Subscription changed (upgrade/downgrade)
 * - customer.subscription.deleted - Subscription cancelled
 * - invoice.payment_succeeded - Successful payment
 * - invoice.payment_failed - Failed payment
 */

// Price to tier mapping
const PRICE_TIERS: Record<string, string> = {
  "price_1SoAhfJjsRVco0hGqutMTfLW": "pro",           // Pro Monthly
  "price_1SoAhqJjsRVco0hGeyMemSS5": "premium",       // Premium Monthly
  "price_1SoAi1JjsRVco0hGfuI2cIHn": "pro",           // Pro Annual
  "price_1SoAmfJjsRVco0hGCgED3x64": "premium",       // Premium Annual
};

const logStep = (step: string, details?: Record<string, unknown>) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[STRIPE-WEBHOOK] ${step}${detailsStr}`);
};

serve(async (req) => {
  // Only accept POST requests
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  try {
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");

    if (!stripeKey) {
      throw new Error("STRIPE_SECRET_KEY is not configured");
    }

    if (!webhookSecret) {
      throw new Error("STRIPE_WEBHOOK_SECRET is not configured");
    }

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });

    // Get the signature from headers
    const signature = req.headers.get("stripe-signature");
    if (!signature) {
      logStep("Missing stripe-signature header");
      return new Response("Missing signature", { status: 400 });
    }

    // Get the raw body
    const body = await req.text();

    // Verify the webhook signature
    let event: Stripe.Event;
    try {
      event = await stripe.webhooks.constructEventAsync(
        body,
        signature,
        webhookSecret
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      logStep("Webhook signature verification failed", { error: message });
      return new Response(`Webhook signature verification failed: ${message}`, {
        status: 400,
      });
    }

    logStep("Webhook received", { type: event.type, id: event.id });

    // Initialize Supabase client
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    // Handle different event types
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        await handleCheckoutCompleted(supabaseClient, stripe, session);
        break;
      }

      case "customer.subscription.created":
      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription;
        await handleSubscriptionChange(supabaseClient, stripe, subscription);
        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        await handleSubscriptionDeleted(supabaseClient, stripe, subscription);
        break;
      }

      case "invoice.payment_succeeded": {
        const invoice = event.data.object as Stripe.Invoice;
        await handlePaymentSucceeded(supabaseClient, invoice);
        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        await handlePaymentFailed(supabaseClient, stripe, invoice);
        break;
      }

      default:
        logStep("Unhandled event type", { type: event.type });
    }

    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});

/**
 * Handle checkout.session.completed - new subscription created
 */
async function handleCheckoutCompleted(
  supabase: any,
  stripe: Stripe,
  session: Stripe.Checkout.Session
) {
  logStep("Processing checkout completed", { sessionId: session.id });

  if (session.mode !== "subscription") {
    logStep("Not a subscription checkout, skipping");
    return;
  }

  const customerEmail = session.customer_email || session.customer_details?.email;
  if (!customerEmail) {
    logStep("No customer email found");
    return;
  }

  // Find the user by email
  const { data: users, error: userError } = await supabase.auth.admin.listUsers();
  if (userError) {
    logStep("Error listing users", { error: userError.message });
    return;
  }

  const user = users.users.find((u: any) => u.email === customerEmail);
  if (!user) {
    logStep("User not found for email", { email: customerEmail });
    return;
  }

  // Log the successful checkout
  await supabase.from("audit_log").insert({
    user_id: user.id,
    action_type: "subscription_created",
    action_target: session.subscription as string,
    action_data: {
      session_id: session.id,
      customer_id: session.customer,
      amount_total: session.amount_total,
    },
    approval_status: "approved",
  });

  logStep("Checkout completed processed", { userId: user.id });
}

/**
 * Handle subscription created/updated
 */
async function handleSubscriptionChange(
  supabase: any,
  stripe: Stripe,
  subscription: Stripe.Subscription
) {
  logStep("Processing subscription change", {
    subscriptionId: subscription.id,
    status: subscription.status,
  });

  // Get customer email
  const customer = await stripe.customers.retrieve(subscription.customer as string);
  if (customer.deleted || !("email" in customer) || !customer.email) {
    logStep("Customer not found or deleted");
    return;
  }

  // Find the user
  const { data: users } = await supabase.auth.admin.listUsers();
  const user = users?.users.find((u: any) => u.email === customer.email);

  if (!user) {
    logStep("User not found for customer", { email: customer.email });
    return;
  }

  // Get subscription details
  const priceId = subscription.items.data[0]?.price.id;
  const tier = PRICE_TIERS[priceId] || "pro";
  const subscriptionEnd = new Date(subscription.current_period_end * 1000);

  // Update or create subscription record in database
  const subscriptionData = {
    user_id: user.id,
    stripe_customer_id: subscription.customer as string,
    stripe_subscription_id: subscription.id,
    stripe_price_id: priceId,
    tier,
    status: subscription.status,
    current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
    current_period_end: subscriptionEnd.toISOString(),
    cancel_at_period_end: subscription.cancel_at_period_end,
    updated_at: new Date().toISOString(),
  };

  // Upsert subscription record
  const { error: upsertError } = await supabase
    .from("subscriptions")
    .upsert(subscriptionData, {
      onConflict: "user_id",
    });

  if (upsertError) {
    logStep("Error upserting subscription", { error: upsertError.message });
  }

  // Log the change
  await supabase.from("audit_log").insert({
    user_id: user.id,
    action_type: "subscription_updated",
    action_target: subscription.id,
    action_data: {
      tier,
      status: subscription.status,
      price_id: priceId,
      period_end: subscriptionEnd.toISOString(),
    },
    approval_status: "approved",
  });

  logStep("Subscription change processed", { userId: user.id, tier });
}

/**
 * Handle subscription deleted/cancelled
 */
async function handleSubscriptionDeleted(
  supabase: any,
  stripe: Stripe,
  subscription: Stripe.Subscription
) {
  logStep("Processing subscription deletion", { subscriptionId: subscription.id });

  // Get customer email
  const customer = await stripe.customers.retrieve(subscription.customer as string);
  if (customer.deleted || !("email" in customer) || !customer.email) {
    logStep("Customer not found or deleted");
    return;
  }

  // Find the user
  const { data: users } = await supabase.auth.admin.listUsers();
  const user = users?.users.find((u: any) => u.email === customer.email);

  if (!user) {
    logStep("User not found for customer", { email: customer.email });
    return;
  }

  // Update subscription status to cancelled
  const { error: updateError } = await supabase
    .from("subscriptions")
    .update({
      status: "cancelled",
      tier: "free",
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", user.id);

  if (updateError) {
    logStep("Error updating subscription", { error: updateError.message });
  }

  // Log the cancellation
  await supabase.from("audit_log").insert({
    user_id: user.id,
    action_type: "subscription_cancelled",
    action_target: subscription.id,
    action_data: {
      cancelled_at: new Date().toISOString(),
    },
    approval_status: "approved",
  });

  logStep("Subscription deletion processed", { userId: user.id });
}

/**
 * Handle successful payment
 */
async function handlePaymentSucceeded(
  supabase: any,
  invoice: Stripe.Invoice
) {
  logStep("Processing payment succeeded", { invoiceId: invoice.id });

  if (!invoice.customer_email) {
    logStep("No customer email on invoice");
    return;
  }

  // Find the user
  const { data: users } = await supabase.auth.admin.listUsers();
  const user = users?.users.find((u: any) => u.email === invoice.customer_email);

  if (!user) {
    logStep("User not found", { email: invoice.customer_email });
    return;
  }

  // Log the payment
  await supabase.from("audit_log").insert({
    user_id: user.id,
    action_type: "payment_succeeded",
    action_target: invoice.id,
    action_data: {
      amount_paid: invoice.amount_paid,
      currency: invoice.currency,
    },
    approval_status: "approved",
  });

  logStep("Payment succeeded processed", { userId: user.id });
}

/**
 * Handle failed payment
 */
async function handlePaymentFailed(
  supabase: any,
  stripe: Stripe,
  invoice: Stripe.Invoice
) {
  logStep("Processing payment failed", { invoiceId: invoice.id });

  if (!invoice.customer_email) {
    logStep("No customer email on invoice");
    return;
  }

  // Find the user
  const { data: users } = await supabase.auth.admin.listUsers();
  const user = users?.users.find((u: any) => u.email === invoice.customer_email);

  if (!user) {
    logStep("User not found", { email: invoice.customer_email });
    return;
  }

  // Log the failed payment
  await supabase.from("audit_log").insert({
    user_id: user.id,
    action_type: "payment_failed",
    action_target: invoice.id,
    action_data: {
      amount_due: invoice.amount_due,
      currency: invoice.currency,
      attempt_count: invoice.attempt_count,
    },
    approval_status: "approved",
  });

  // Optionally send notification to user about failed payment
  try {
    await supabase.functions.invoke("send-notification", {
      body: {
        userId: user.id,
        type: "payment_failed",
        title: "Payment Failed",
        message: "We couldn't process your payment. Please update your payment method.",
      },
    });
  } catch (err) {
    logStep("Failed to send payment failure notification", {
      error: err instanceof Error ? err.message : String(err),
    });
  }

  logStep("Payment failed processed", { userId: user.id });
}
