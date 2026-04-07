-- ============================================
-- Migration 002: Tracking Tables
-- Clicks, Orders, Commissions
-- ============================================

-- CLICKS (affiliate link click tracking)
CREATE TABLE clicks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  affiliate_link_id uuid NOT NULL REFERENCES affiliate_links(id) ON DELETE CASCADE,
  ip_address inet,
  user_agent text,
  referrer text,
  country text,
  device_type text CHECK (device_type IN ('desktop', 'mobile', 'tablet')),
  is_unique boolean DEFAULT false,
  session_id text,
  clicked_at timestamptz DEFAULT now()
);

CREATE INDEX idx_clicks_affiliate_link_id ON clicks(affiliate_link_id);
CREATE INDEX idx_clicks_clicked_at ON clicks(clicked_at);

-- ORDERS (mirrored from Shopify, attributed to affiliates)
CREATE TABLE orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shopify_order_id text NOT NULL,
  shopify_order_number text,
  merchant_id uuid NOT NULL REFERENCES merchants(id) ON DELETE CASCADE,
  affiliate_link_id uuid REFERENCES affiliate_links(id),
  influencer_id uuid REFERENCES influencers(id),
  campaign_id uuid REFERENCES campaigns(id),
  customer_email text,
  subtotal_price numeric(12,2) NOT NULL,
  total_price numeric(12,2) NOT NULL,
  total_discounts numeric(12,2) DEFAULT 0,
  commissionable_amount numeric(12,2) NOT NULL,
  currency text DEFAULT 'USD',
  shopify_status text CHECK (shopify_status IN ('pending', 'fulfilled', 'cancelled', 'refunded')),
  financial_status text CHECK (financial_status IN ('pending', 'paid', 'refunded', 'partially_refunded')),
  fulfillment_status text,
  fulfilled_at timestamptz,
  validation_due_at timestamptz,
  is_validated boolean DEFAULT false,
  is_invalidated boolean DEFAULT false,
  invalidation_reason text CHECK (invalidation_reason IN ('refunded', 'cancelled', 'disputed', NULL)),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(shopify_order_id, merchant_id)
);

CREATE INDEX idx_orders_merchant_id ON orders(merchant_id);
CREATE INDEX idx_orders_influencer_id ON orders(influencer_id);
CREATE INDEX idx_orders_campaign_id ON orders(campaign_id);
CREATE INDEX idx_orders_affiliate_link_id ON orders(affiliate_link_id);
CREATE INDEX idx_orders_shopify_order_id ON orders(shopify_order_id);
CREATE INDEX idx_orders_validation_due_at ON orders(validation_due_at) WHERE is_validated = false AND is_invalidated = false;

-- COMMISSIONS
CREATE TABLE commissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  influencer_id uuid NOT NULL REFERENCES influencers(id) ON DELETE CASCADE,
  campaign_id uuid NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  merchant_id uuid NOT NULL REFERENCES merchants(id) ON DELETE CASCADE,
  gross_amount numeric(12,2) NOT NULL,
  commission_percent numeric(5,2) NOT NULL,
  commission_amount numeric(12,2) NOT NULL,
  platform_fee_percent numeric(5,2) NOT NULL,
  platform_fee_amount numeric(12,2) NOT NULL,
  net_amount numeric(12,2) NOT NULL,
  tier_name text NOT NULL,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'validated', 'payable', 'paid', 'invalidated')),
  validated_at timestamptz,
  payout_id uuid,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX idx_commissions_order_id ON commissions(order_id);
CREATE INDEX idx_commissions_influencer_id ON commissions(influencer_id);
CREATE INDEX idx_commissions_campaign_id ON commissions(campaign_id);
CREATE INDEX idx_commissions_merchant_id ON commissions(merchant_id);
CREATE INDEX idx_commissions_status ON commissions(status);
CREATE INDEX idx_commissions_payable ON commissions(influencer_id, status) WHERE status = 'payable';
