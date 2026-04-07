import { nanoid } from "nanoid";

/**
 * Generate a unique 8-character alphanumeric affiliate code.
 * Uses nanoid with a URL-safe alphabet (a-z, A-Z, 0-9).
 */
export function generateAffiliateCode(): string {
  const alphabet =
    "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  // nanoid with custom alphabet
  let code = "";
  const bytes = new Uint8Array(8);
  crypto.getRandomValues(bytes);
  for (let i = 0; i < 8; i++) {
    code += alphabet[bytes[i] % alphabet.length];
  }
  return code;
}

/**
 * Build the full affiliate redirect URL.
 * Example: https://app.adltix.com/r/abc123XY
 */
export function buildAffiliateUrl(
  portalDomain: string,
  code: string
): string {
  return `${portalDomain}/r/${code}`;
}

/**
 * Build the store redirect URL with the discount code applied.
 * Example: https://store.myshopify.com/discount/ADLTIX-abc123XY
 */
export function buildStoreDiscountUrl(
  storeUrl: string,
  discountCode: string
): string {
  // Shopify's discount URL format auto-applies the code
  const base = storeUrl.replace(/\/$/, "");
  return `${base}/discount/${discountCode}`;
}
