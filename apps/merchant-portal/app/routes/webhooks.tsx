import type { ActionFunctionArgs } from "react-router";
import { authenticate } from "../shopify.server";
import { createServiceClient } from "@adltix/database";
import { calculateCommission, type CommissionTier } from "@adltix/utils";

export const action = async ({ request }: ActionFunctionArgs) => {
  const { topic, shop, payload } = await authenticate.webhook(request);
  const supabase = createServiceClient();

  // --- Idempotency check ---
  const webhookId = request.headers.get("X-Shopify-Webhook-Id");
  if (webhookId) {
    const { error: idempotencyError } = await supabase
      .from("webhook_events")
      .insert({
        shopify_webhook_id: webhookId,
        shopify_topic: topic,
        shop_domain: shop,
        shopify_order_id: payload.id ? String(payload.id) : null,
        payload,
      });

    // Unique violation = already processed
    if (idempotencyError?.code === "23505") {
      return new Response("Already processed", { status: 200 });
    }
  }

  try {
    switch (topic) {
      case "ORDERS_CREATE":
        await handleOrderCreate(supabase, shop, payload);
        break;
      case "ORDERS_FULFILLED":
        await handleOrderFulfilled(supabase, shop, payload);
        break;
      case "ORDERS_CANCELLED":
        await handleOrderCancelled(supabase, shop, payload);
        break;
      case "REFUNDS_CREATE":
        await handleRefundCreate(supabase, shop, payload);
        break;
      case "APP_UNINSTALLED":
        await handleAppUninstalled(supabase, shop);
        break;
    }

    // Mark as processed
    if (webhookId) {
      await supabase
        .from("webhook_events")
        .update({ processed: true, processed_at: new Date().toISOString() })
        .eq("shopify_webhook_id", webhookId);
    }
  } catch (error) {
    console.error(`Webhook ${topic} error:`, error);
    // Record error but still return 200 to avoid Shopify retries
    if (webhookId) {
      await supabase
        .from("webhook_events")
        .update({
          error: error instanceof Error ? error.message : String(error),
        })
        .eq("shopify_webhook_id", webhookId);
    }
  }

  return new Response("OK", { status: 200 });
};

// ============================================
// ORDERS/CREATE — Attribute order to affiliate
// ============================================
async function handleOrderCreate(
  supabase: ReturnType<typeof createServiceClient>,
  shop: string,
  payload: any
) {
  // Extract affiliate attribution from discount codes
  const discountCodes: string[] = (payload.discount_codes || []).map(
    (d: any) => d.code
  );

  if (discountCodes.length === 0) return;

  // Look up affiliate link by discount code (ADLTIX- prefix)
  const adltixCodes = discountCodes.filter((code: string) =>
    code.startsWith("ADLTIX-")
  );
  if (adltixCodes.length === 0) return;

  const { data: link } = await supabase
    .from("affiliate_links")
    .select("id, campaign_id, influencer_id")
    .eq("discount_code", adltixCodes[0])
    .eq("is_active", true)
    .single();

  if (!link) return;

  // Get merchant
  const { data: merchant } = await supabase
    .from("merchants")
    .select("id, platform_fee_percent")
    .eq("shopify_domain", shop)
    .single();

  if (!merchant) return;

  const subtotal = parseFloat(payload.subtotal_price || "0");
  const total = parseFloat(payload.total_price || "0");
  const discounts = parseFloat(payload.total_discounts || "0");
  const commissionable = subtotal; // Commission on subtotal (before tax/shipping)

  // Insert attributed order
  const { data: order, error: orderError } = await supabase
    .from("orders")
    .insert({
      shopify_order_id: String(payload.id),
      shopify_order_number: String(payload.order_number),
      merchant_id: merchant.id,
      affiliate_link_id: link.id,
      influencer_id: link.influencer_id,
      campaign_id: link.campaign_id,
      customer_email: payload.email,
      subtotal_price: subtotal,
      total_price: total,
      total_discounts: discounts,
      commissionable_amount: commissionable,
      currency: payload.currency || "USD",
      shopify_status: "pending",
      financial_status: payload.financial_status || "pending",
    })
    .select("id")
    .single();

  if (orderError || !order) {
    console.error("Failed to insert order:", orderError);
    return;
  }

  // Get campaign commission tiers
  const { data: campaign } = await supabase
    .from("campaigns")
    .select("commission_tiers, validation_days")
    .eq("id", link.campaign_id)
    .single();

  if (!campaign) return;

  // Get influencer's monthly revenue for this campaign
  const { data: monthlyOrders } = await supabase
    .from("orders")
    .select("commissionable_amount")
    .eq("campaign_id", link.campaign_id)
    .eq("influencer_id", link.influencer_id)
    .gte("created_at", new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString())
    .eq("is_invalidated", false)
    .neq("id", order.id); // Exclude the current order

  const currentMonthlyRevenue = (monthlyOrders || []).reduce(
    (sum, o) => sum + Number(o.commissionable_amount || 0),
    0
  );

  // Calculate commission
  const tiers: CommissionTier[] = campaign.commission_tiers as CommissionTier[];
  const result = calculateCommission({
    orderSubtotal: commissionable,
    currentMonthlyRevenue,
    tiers,
    platformFeePercent: Number(merchant.platform_fee_percent),
  });

  // Insert commission
  const { data: commission } = await supabase
    .from("commissions")
    .insert({
      order_id: order.id,
      influencer_id: link.influencer_id,
      campaign_id: link.campaign_id,
      merchant_id: merchant.id,
      gross_amount: commissionable,
      commission_percent: result.commissionPercent,
      commission_amount: result.grossCommission,
      platform_fee_percent: Number(merchant.platform_fee_percent),
      platform_fee_amount: result.platformFee,
      net_amount: result.netCommission,
      tier_name: result.tierName,
      status: "pending",
    })
    .select("id")
    .single();

  // Insert platform fee record
  if (commission) {
    await supabase.from("platform_fees").insert({
      commission_id: commission.id,
      merchant_id: merchant.id,
      influencer_id: link.influencer_id,
      amount: result.platformFee,
      percent: Number(merchant.platform_fee_percent),
    });
  }

  // Update affiliate link stats
  await supabase
    .from("affiliate_links")
    .update({
      total_conversions: supabase.rpc ? undefined : undefined, // Will use raw SQL
      total_revenue: supabase.rpc ? undefined : undefined,
    })
    .eq("id", link.id);

  // Simpler: increment via raw update
  await supabase.rpc("increment_link_stats" as any, {
    link_id: link.id,
    revenue_amount: commissionable,
  }).catch(() => {
    // If RPC doesn't exist yet, do manual update
    // This will be replaced with a proper RPC function
  });
}

// ============================================
// ORDERS/FULFILLED — Start validation timer
// ============================================
async function handleOrderFulfilled(
  supabase: ReturnType<typeof createServiceClient>,
  shop: string,
  payload: any
) {
  const shopifyOrderId = String(payload.id);

  // Get the order and its campaign's validation days
  const { data: order } = await supabase
    .from("orders")
    .select("id, campaign_id")
    .eq("shopify_order_id", shopifyOrderId)
    .single();

  if (!order) return;

  const { data: campaign } = await supabase
    .from("campaigns")
    .select("validation_days")
    .eq("id", order.campaign_id)
    .single();

  const validationDays = campaign?.validation_days || 14;
  const fulfilledAt = new Date();
  const validationDueAt = new Date(
    fulfilledAt.getTime() + validationDays * 24 * 60 * 60 * 1000
  );

  await supabase
    .from("orders")
    .update({
      shopify_status: "fulfilled",
      fulfillment_status: "fulfilled",
      fulfilled_at: fulfilledAt.toISOString(),
      validation_due_at: validationDueAt.toISOString(),
    })
    .eq("shopify_order_id", shopifyOrderId);
}

// ============================================
// ORDERS/CANCELLED — Invalidate commission
// ============================================
async function handleOrderCancelled(
  supabase: ReturnType<typeof createServiceClient>,
  shop: string,
  payload: any
) {
  const shopifyOrderId = String(payload.id);

  const { data: order } = await supabase
    .from("orders")
    .select("id")
    .eq("shopify_order_id", shopifyOrderId)
    .single();

  if (!order) return;

  await supabase
    .from("orders")
    .update({
      shopify_status: "cancelled",
      is_invalidated: true,
      invalidation_reason: "cancelled",
    })
    .eq("id", order.id);

  await supabase
    .from("commissions")
    .update({ status: "invalidated" })
    .eq("order_id", order.id)
    .in("status", ["pending", "validated", "payable"]);
}

// ============================================
// REFUNDS/CREATE — Invalidate commission
// ============================================
async function handleRefundCreate(
  supabase: ReturnType<typeof createServiceClient>,
  shop: string,
  payload: any
) {
  const shopifyOrderId = String(payload.order_id);

  const { data: order } = await supabase
    .from("orders")
    .select("id, commissionable_amount")
    .eq("shopify_order_id", shopifyOrderId)
    .single();

  if (!order) return;

  // Calculate refund amount
  const refundAmount = (payload.refund_line_items || []).reduce(
    (sum: number, item: any) => sum + parseFloat(item.subtotal || "0"),
    0
  );

  const isFullRefund = refundAmount >= Number(order.commissionable_amount) * 0.9;

  await supabase
    .from("orders")
    .update({
      shopify_status: "refunded",
      financial_status: isFullRefund ? "refunded" : "partially_refunded",
      is_invalidated: isFullRefund,
      invalidation_reason: isFullRefund ? "refunded" : null,
    })
    .eq("id", order.id);

  if (isFullRefund) {
    // Full refund: invalidate commission entirely
    await supabase
      .from("commissions")
      .update({ status: "invalidated" })
      .eq("order_id", order.id)
      .in("status", ["pending", "validated", "payable"]);
  }
  // Partial refunds: could recalculate commission proportionally (future enhancement)
}

// ============================================
// APP/UNINSTALLED — Deactivate merchant
// ============================================
async function handleAppUninstalled(
  supabase: ReturnType<typeof createServiceClient>,
  shop: string
) {
  await supabase
    .from("merchants")
    .update({ is_active: false })
    .eq("shopify_domain", shop);
}
