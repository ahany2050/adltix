import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

/**
 * Validate Commissions — Supabase Edge Function
 *
 * Runs hourly (via cron). Checks for commissions that have passed their
 * validation window (14 days after order fulfillment) and marks them as payable.
 *
 * Flow:
 * 1. Find commissions with status = 'pending'
 * 2. Where the associated order is fulfilled
 * 3. And validation_due_at has passed
 * 4. And the order is not invalidated (no refund/cancel)
 * 5. Update commission status to 'payable'
 */
Deno.serve(async (req) => {
  // Verify authorization
  const authHeader = req.headers.get("Authorization");
  const cronSecret = Deno.env.get("CRON_SECRET");

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return new Response("Unauthorized", { status: 401 });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const now = new Date().toISOString();

  // Find orders that have passed their validation window
  const { data: validatableOrders, error: queryError } = await supabase
    .from("orders")
    .select("id")
    .eq("is_validated", false)
    .eq("is_invalidated", false)
    .eq("shopify_status", "fulfilled")
    .not("validation_due_at", "is", null)
    .lte("validation_due_at", now);

  if (queryError) {
    console.error("Query error:", queryError);
    return new Response(JSON.stringify({ error: queryError.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  if (!validatableOrders || validatableOrders.length === 0) {
    return new Response(
      JSON.stringify({ validated: 0, message: "No commissions to validate" }),
      { headers: { "Content-Type": "application/json" } }
    );
  }

  const orderIds = validatableOrders.map((o) => o.id);
  let validatedCount = 0;
  const errors: string[] = [];

  // Process in batches of 50
  for (let i = 0; i < orderIds.length; i += 50) {
    const batch = orderIds.slice(i, i + 50);

    try {
      // Mark orders as validated
      await supabase
        .from("orders")
        .update({ is_validated: true })
        .in("id", batch);

      // Update commissions to payable
      const { data: updated, error: updateError } = await supabase
        .from("commissions")
        .update({
          status: "payable",
          validated_at: now,
        })
        .in("order_id", batch)
        .eq("status", "pending")
        .select("id");

      if (updateError) {
        errors.push(`Batch ${i}: ${updateError.message}`);
      } else {
        validatedCount += (updated || []).length;
      }
    } catch (err) {
      errors.push(`Batch ${i}: ${err}`);
    }
  }

  // Update influencer total earnings
  if (validatedCount > 0) {
    // Get all influencers with newly payable commissions
    const { data: payableCommissions } = await supabase
      .from("commissions")
      .select("influencer_id, net_amount")
      .in("order_id", orderIds)
      .eq("status", "payable");

    if (payableCommissions) {
      // Group by influencer
      const byInfluencer = new Map<string, number>();
      for (const c of payableCommissions) {
        const current = byInfluencer.get(c.influencer_id) || 0;
        byInfluencer.set(c.influencer_id, current + Number(c.net_amount));
      }

      // Update each influencer's total earnings
      for (const [influencerId, amount] of byInfluencer) {
        const { data: influencer } = await supabase
          .from("influencers")
          .select("total_earnings")
          .eq("id", influencerId)
          .single();

        if (influencer) {
          await supabase
            .from("influencers")
            .update({
              total_earnings: Number(influencer.total_earnings) + amount,
            })
            .eq("id", influencerId);
        }
      }
    }
  }

  return new Response(
    JSON.stringify({
      validated: validatedCount,
      errors: errors.length > 0 ? errors : undefined,
      timestamp: now,
    }),
    { headers: { "Content-Type": "application/json" } }
  );
});
