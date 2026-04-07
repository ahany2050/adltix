/**
 * Shopify Discount Code Management
 *
 * Creates and manages discount codes for affiliate attribution.
 * Uses Shopify's GraphQL Admin API to create price rules and discount codes.
 */

interface CreateDiscountCodeInput {
  session: {
    shop: string;
    accessToken: string;
  };
  code: string;
  title: string;
  /** Discount percentage (0 for tracking-only, or a positive number for actual discount) */
  percentOff?: number;
}

/**
 * Create a Shopify discount code for affiliate attribution.
 *
 * If percentOff is 0, creates a "tracking-only" code that gives $0 off
 * but still shows up in order data for attribution.
 * If percentOff > 0, creates an actual percentage discount.
 */
export async function createShopifyDiscountCode({
  session,
  code,
  title,
  percentOff = 0,
}: CreateDiscountCodeInput): Promise<{ success: boolean; error?: string }> {
  const apiVersion = "2025-01";
  const url = `https://${session.shop}/admin/api/${apiVersion}/graphql.json`;

  // Use discountCodeBasicCreate for simple percentage or fixed-amount discounts
  const mutation = `
    mutation discountCodeBasicCreate($basicCodeDiscount: DiscountCodeBasicInput!) {
      discountCodeBasicCreate(basicCodeDiscount: $basicCodeDiscount) {
        codeDiscountNode {
          id
          codeDiscount {
            ... on DiscountCodeBasic {
              title
              codes(first: 1) {
                edges {
                  node {
                    code
                  }
                }
              }
            }
          }
        }
        userErrors {
          field
          message
        }
      }
    }
  `;

  const variables = {
    basicCodeDiscount: {
      title,
      code,
      startsAt: new Date().toISOString(),
      customerGets: {
        value:
          percentOff > 0
            ? { percentage: percentOff / 100 }
            : { percentage: 0 },
        items: {
          all: true,
        },
      },
      customerSelection: {
        all: true,
      },
      appliesOncePerCustomer: true,
      usageLimit: null, // Unlimited uses for affiliate tracking
    },
  };

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Shopify-Access-Token": session.accessToken,
      },
      body: JSON.stringify({ query: mutation, variables }),
    });

    const result = await response.json();
    const userErrors = result.data?.discountCodeBasicCreate?.userErrors;

    if (userErrors && userErrors.length > 0) {
      return {
        success: false,
        error: userErrors.map((e: any) => e.message).join(", "),
      };
    }

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Delete a Shopify discount code (when disabling an affiliate link).
 */
export async function deleteShopifyDiscountCode({
  session,
  discountId,
}: {
  session: { shop: string; accessToken: string };
  discountId: string;
}): Promise<{ success: boolean; error?: string }> {
  const apiVersion = "2025-01";
  const url = `https://${session.shop}/admin/api/${apiVersion}/graphql.json`;

  const mutation = `
    mutation discountCodeDelete($id: ID!) {
      discountCodeDelete(id: $id) {
        deletedCodeDiscountId
        userErrors {
          field
          message
        }
      }
    }
  `;

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Shopify-Access-Token": session.accessToken,
      },
      body: JSON.stringify({ query: mutation, variables: { id: discountId } }),
    });

    const result = await response.json();
    const userErrors = result.data?.discountCodeDelete?.userErrors;

    if (userErrors && userErrors.length > 0) {
      return {
        success: false,
        error: userErrors.map((e: any) => e.message).join(", "),
      };
    }

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}
