import { createServiceClient } from "@adltix/database";
import { buildStoreDiscountUrl } from "@adltix/utils";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Affiliate redirect handler (Route Handler, NOT a page).
 *
 * Flow:
 * 1. Look up the affiliate_link by short_code
 * 2. Log the click (fire-and-forget, non-blocking)
 * 3. Build the store discount URL using buildStoreDiscountUrl
 * 4. 302 redirect to the store with discount code auto-applied
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { code: string } }
) {
  const { code } = params;

  // Use service client to bypass RLS for link lookup
  const supabase = createServiceClient();

  // 1. Look up the affiliate link by short_code
  const { data: link, error } = await supabase
    .from("affiliate_links")
    .select(
      `
      id,
      short_code,
      discount_code,
      influencer_id,
      campaign_id,
      campaign:campaigns(
        id,
        merchant:merchants(store_domain)
      )
    `
    )
    .eq("short_code", code)
    .single();

  if (error || !link) {
    // Link not found — redirect to a fallback or show 404
    return new NextResponse("Affiliate link not found", { status: 404 });
  }

  const campaign = link.campaign as any;
  const storeDomain = campaign?.merchant?.store_domain;

  if (!storeDomain) {
    return new NextResponse("Store not configured", { status: 404 });
  }

  // 2. Log the click (fire-and-forget — don't await)
  const clickIp =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    request.headers.get("x-real-ip") ??
    "unknown";
  const userAgent = request.headers.get("user-agent") ?? "";
  const referer = request.headers.get("referer") ?? null;

  // Fire-and-forget: insert click record without blocking the redirect
  supabase
    .from("affiliate_clicks")
    .insert({
      affiliate_link_id: link.id,
      influencer_id: link.influencer_id,
      campaign_id: link.campaign_id,
      ip_address: clickIp,
      user_agent: userAgent,
      referer,
    })
    .then(() => {
      // Also increment the click counter on the link (best-effort)
      return supabase.rpc("increment_link_clicks", {
        link_id: link.id,
      });
    })
    .catch(() => {
      // Silently ignore click logging errors — never block the redirect
    });

  // 3. Build the store discount URL
  const storeUrl = storeDomain.startsWith("http")
    ? storeDomain
    : `https://${storeDomain}`;
  const redirectUrl = buildStoreDiscountUrl(storeUrl, link.discount_code);

  // 4. 302 redirect to the store
  return NextResponse.redirect(redirectUrl, 302);
}
