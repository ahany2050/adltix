-- ============================================
-- Migration 005: Functions and Triggers
-- ============================================

-- Auto-update updated_at timestamp on row modification
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at trigger to all tables that have the column
CREATE TRIGGER set_updated_at BEFORE UPDATE ON merchants
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER set_updated_at BEFORE UPDATE ON influencers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER set_updated_at BEFORE UPDATE ON campaigns
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER set_updated_at BEFORE UPDATE ON orders
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER set_updated_at BEFORE UPDATE ON commissions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER set_updated_at BEFORE UPDATE ON payouts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Generate unique affiliate short code (8 alphanumeric characters)
CREATE OR REPLACE FUNCTION generate_affiliate_code()
RETURNS text AS $$
DECLARE
  chars text := 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  result text := '';
  i integer;
BEGIN
  FOR i IN 1..8 LOOP
    result := result || substr(chars, floor(random() * length(chars) + 1)::int, 1);
  END LOOP;
  RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Generate discount code for affiliate (prefixed with ADLTIX-)
CREATE OR REPLACE FUNCTION generate_discount_code()
RETURNS text AS $$
DECLARE
  chars text := 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  result text := 'ADLTIX-';
  i integer;
BEGIN
  FOR i IN 1..8 LOOP
    result := result || substr(chars, floor(random() * length(chars) + 1)::int, 1);
  END LOOP;
  RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Helper: Get influencer's total revenue for a campaign in the current calendar month
CREATE OR REPLACE FUNCTION get_monthly_campaign_revenue(
  p_campaign_id uuid,
  p_influencer_id uuid
)
RETURNS numeric AS $$
DECLARE
  total numeric;
BEGIN
  SELECT COALESCE(SUM(commissionable_amount), 0)
  INTO total
  FROM orders
  WHERE campaign_id = p_campaign_id
    AND influencer_id = p_influencer_id
    AND created_at >= date_trunc('month', now())
    AND is_invalidated = false;
  RETURN total;
END;
$$ LANGUAGE plpgsql STABLE;
