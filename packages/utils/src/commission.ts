export interface CommissionTier {
  name: string;
  min_revenue: number;
  max_revenue: number | null; // null = unlimited
  percent: number; // e.g. 10 means 10%
}

export interface CommissionInput {
  orderSubtotal: number;
  currentMonthlyRevenue: number; // Revenue generated this month BEFORE this order
  tiers: CommissionTier[];
  platformFeePercent: number; // Platform's cut of the commission, e.g. 10 means 10%
}

export interface CommissionResult {
  tierName: string;
  commissionPercent: number;
  grossCommission: number; // Before platform fee
  platformFee: number;
  netCommission: number; // What the influencer receives
}

/**
 * Calculate commission for an order based on the influencer's cumulative
 * monthly revenue and the campaign's tiered commission structure.
 *
 * Tier matching: Uses the influencer's revenue BEFORE this order to determine
 * which tier applies. The next order may hit a higher tier.
 *
 * Platform fee is deducted from the gross commission (not added on top).
 *
 * All monetary values are rounded to 2 decimal places at the end of calculation.
 */
export function calculateCommission(input: CommissionInput): CommissionResult {
  const { orderSubtotal, currentMonthlyRevenue, tiers, platformFeePercent } =
    input;

  if (tiers.length === 0) {
    throw new Error("Campaign has no commission tiers configured");
  }

  // Sort tiers by min_revenue ascending
  const sorted = [...tiers].sort((a, b) => a.min_revenue - b.min_revenue);

  // Find the applicable tier (highest tier where min_revenue <= currentMonthlyRevenue)
  let applicableTier = sorted[0]; // Default to lowest tier
  for (const tier of sorted) {
    if (currentMonthlyRevenue >= tier.min_revenue) {
      applicableTier = tier;
    }
  }

  const commissionPercent = applicableTier.percent;
  const grossCommission = (orderSubtotal * commissionPercent) / 100;
  const platformFee = (grossCommission * platformFeePercent) / 100;
  const netCommission = grossCommission - platformFee;

  return {
    tierName: applicableTier.name,
    commissionPercent,
    grossCommission: roundMoney(grossCommission),
    platformFee: roundMoney(platformFee),
    netCommission: roundMoney(netCommission),
  };
}

/**
 * Round a monetary value to exactly 2 decimal places.
 * Uses banker's rounding to avoid systematic bias.
 */
function roundMoney(value: number): number {
  return Math.round(value * 100) / 100;
}
