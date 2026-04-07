-- ============================================
-- Migration 003: Payouts, Platform Fees, Webhook Events
-- ============================================

-- PAYOUTS (batch payouts to influencers via Stripe Connect)
CREATE TABLE payouts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  influencer_id uuid NOT NULL REFERENCES influencers(id) ON DELETE CASCADE,
  stripe_transfer_id text,
  stripe_payout_id text,
  amount numeric(12,2) NOT NULL,
  currency text DEFAULT 'USD',
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'paid', 'failed')),
  commission_ids uuid[] NOT NULL DEFAULT '{}',
  period_start date,
  period_end date,
  failure_reason text,
  paid_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX idx_payouts_influencer_id ON payouts(influencer_id);
CREATE INDEX idx_payouts_status ON payouts(status);

-- PLATFORM FEES (ledger of platform revenue)
CREATE TABLE platform_fees (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  commission_id uuid NOT NULL REFERENCES commissions(id) ON DELETE CASCADE,
  merchant_id uuid REFERENCES merchants(id),
  influencer_id uuid REFERENCES influencers(id),
  amount numeric(12,2) NOT NULL,
  percent numeric(5,2) NOT NULL,
  stripe_application_fee_id text,
  collected_at timestamptz,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_platform_fees_commission_id ON platform_fees(commission_id);
CREATE INDEX idx_platform_fees_merchant_id ON platform_fees(merchant_id);

-- WEBHOOK EVENTS LOG (idempotency tracking for Shopify webhooks)
CREATE TABLE webhook_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shopify_webhook_id text UNIQUE NOT NULL,
  merchant_id uuid REFERENCES merchants(id),
  shopify_topic text NOT NULL,
  shopify_order_id text,
  shop_domain text NOT NULL,
  payload jsonb,
  processed boolean DEFAULT false,
  error text,
  received_at timestamptz DEFAULT now(),
  processed_at timestamptz
);

CREATE INDEX idx_webhook_events_shopify_webhook_id ON webhook_events(shopify_webhook_id);
CREATE INDEX idx_webhook_events_shop_domain ON webhook_events(shop_domain);
CREATE INDEX idx_webhook_events_unprocessed ON webhook_events(processed) WHERE processed = false;
