import { createServiceClient } from "@adltix/database";
import { buildStoreDiscountUrl } from "@adltix/utils";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Affiliate redirect handler (Route Handler, NOT a page).
 *
 * Flow:
 * 1. Look up the affiliate_link by short_code
 * 2. Log the click (fire-and-forget, non-blocking)
 * 3. Build the store discount URL
 * 4. 302 redirect to the store with discount code auto-applied
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { code: string } }
) {
  const { code } = params;
  const supabase = createServiceClient();

  // 1. Look up the affiliate link
  const { data: link, error } = await supabase
    .from("affiliate_links")
    .select("id, short_code, discount_code, full_url, influencer_id, campaign_id")
    .eq("short_code", code)
    .eq("is_active", true)
    .single();

  if (error || !link) {
    return new NextResponse("Affiliate link not found", { status: 404 });
  }

  // 2. Log click (fire-and-forget — don't block the redirect)
  const clickIp =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    request.headers.get("x-real-ip") ??
    "unknown";
  const userAgent = request.headers.get("user-agent") ?? "";
  const referrer = request.headers.get("referer") ?? null;

  // Use void + async IIFE to avoid PromiseLike issues
  void (async () => {
    try {
      await supabase.from("clicks").insert({
        affiliate_link_id: link.id,
        ip_address: clickIp,
        user_agent: userAgent,
        referrer,
      });
      // Increment click counter
      await supabase.rpc("increment_link_clicks", { link_id: link.id });
    } catch {
      // Silently ignore — never block redirect
    }
  })();

  // 3. Build redirect URL — use the store discount URL
  const redirectUrl = buildStoreDiscountUrl(link.full_url, link.discount_code);

  // 4. 302 redirect
  return NextResponse.redirect(redirectUrl, 302);
}
