import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

/**
 * Process Payouts — Supabase Edge Function
 *
 * Runs weekly or on-demand. Creates Stripe Connect transfers for influencers
 * who have accumulated payable commissions above the minimum threshold ($50).
 *
 * Flow:
 * 1. Find influencers with payable commissions totaling >= $50
 * 2. For each eligible influencer with a verified Stripe Connect account:
 *    a. Sum their payable commissions
 *    b. Create a Stripe Transfer
 *    c. Create a payout record
 *    d. Update commission statuses to 'paid'
 */

const MINIMUM_PAYOUT = 50.00; // $50 minimum

Deno.serve(async (req) => {
  const authHeader = req.headers.get("Authorization");
  const cronSecret = Deno.env.get("CRON_SECRET");

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return new Response("Unauthorized", { status: 401 });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const stripeSecretKey = Deno.env.get("STRIPE_SECRET_KEY");
  if (!stripeSecretKey) {
    return new Response(
      JSON.stringify({ error: "STRIPE_SECRET_KEY not configured" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }

  // Find all payable commissions grouped by influencer
  const { data: payableCommissions, error: queryError } = await supabase
    .from("commissions")
    .select(`
      id,
      influencer_id,
      net_amount,
      currency
    `)
    .eq("status", "payable");

  if (queryError) {
    return new Response(JSON.stringify({ error: queryError.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  if (!payableCommissions || payableCommissions.length === 0) {
    return new Response(
      JSON.stringify({ processed: 0, message: "No payable commissions" }),
      { headers: { "Content-Type": "application/json" } }
    );
  }

  // Group by influencer
  const byInfluencer = new Map<
    string,
    { commissions: typeof payableCommissions; total: number }
  >();

  for (const c of payableCommissions) {
    const existing = byInfluencer.get(c.influencer_id) || {
      commissions: [],
      total: 0,
    };
    existing.commissions.push(c);
    existing.total += Number(c.net_amount);
    byInfluencer.set(c.influencer_id, existing);
  }

  let processedCount = 0;
  let skippedCount = 0;
  const errors: string[] = [];

  for (const [influencerId, data] of byInfluencer) {
    // Check minimum threshold
    if (data.total < MINIMUM_PAYOUT) {
      skippedCount++;
      continue;
    }

    // Get influencer's Stripe Connect account
    const { data: influencer } = await supabase
      .from("influencers")
      .select("stripe_account_id, stripe_account_status")
      .eq("id", influencerId)
      .single();

    if (!influencer?.stripe_account_id || influencer.stripe_account_status !== "active") {
      skippedCount++;
      continue;
    }

    try {
      // Create Stripe Transfer
      const amountInCents = Math.round(data.total * 100);
      const commissionIds = data.commissions.map((c) => c.id);
      const idempotencyKey = `payout-${influencerId}-${new Date().toISOString().slice(0, 10)}`;

      const transferResponse = await fetch("https://api.stripe.com/v1/transfers", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${stripeSecretKey}`,
          "Content-Type": "application/x-www-form-urlencoded",
          "Idempotency-Key": idempotencyKey,
        },
        body: new URLSearchParams({
          amount: String(amountInCents),
          currency: "usd",
          destination: influencer.stripe_account_id,
          description: `Adltix payout - ${commissionIds.length} commissions`,
          "metadata[influencer_id]": influencerId,
          "metadata[commission_count]": String(commissionIds.length),
        }),
      });

      if (!transferResponse.ok) {
        const err = await transferResponse.text();
        errors.push(`Transfer failed for ${influencerId}: ${err}`);
        continue;
      }

      const transfer = await transferResponse.json();

      // Create payout record
      const { data: payout } = await supabase
        .from("payouts")
        .insert({
          influencer_id: influencerId,
          stripe_transfer_id: transfer.id,
          amount: data.total,
          currency: "USD",
          status: "paid",
          commission_ids: commissionIds,
          period_start: new Date(
            new Date().getFullYear(),
            new Date().getMonth(),
            1
          ).toISOString().slice(0, 10),
          period_end: new Date().toISOString().slice(0, 10),
          paid_at: new Date().toISOString(),
        })
        .select("id")
        .single();

      // Update commissions to paid
      await supabase
        .from("commissions")
        .update({
          status: "paid",
          payout_id: payout?.id,
        })
        .in("id", commissionIds);

      // Update influencer total_paid_out
      const { data: currentInfluencer } = await supabase
        .from("influencers")
        .select("total_paid_out")
        .eq("id", influencerId)
        .single();

      if (currentInfluencer) {
        await supabase
          .from("influencers")
          .update({
            total_paid_out: Number(currentInfluencer.total_paid_out) + data.total,
          })
          .eq("id", influencerId);
      }

      processedCount++;
    } catch (err) {
      errors.push(`Error processing ${influencerId}: ${err}`);
    }
  }

  return new Response(
    JSON.stringify({
      processed: processedCount,
      skipped: skippedCount,
      errors: errors.length > 0 ? errors : undefined,
      timestamp: new Date().toISOString(),
    }),
    { headers: { "Content-Type": "application/json" } }
  );
});
