import { useState, useCallback } from "react";
import { useNavigate, useSubmit, useActionData, useNavigation } from "react-router";
import type { ActionFunctionArgs } from "react-router";
import {
  Page,
  Card,
  FormLayout,
  TextField,
  Select,
  Button,
  BlockStack,
  InlineStack,
  Text,
  Checkbox,
  Divider,
  Banner,
  Box,
  InlineGrid,
} from "@shopify/polaris";
import { authenticate } from "../shopify.server";
import { createServiceClient } from "@adltix/database";

interface CommissionTierRow {
  id: string;
  name: string;
  min_revenue: string;
  max_revenue: string;
  percent: string;
}

function generateRowId() {
  return `tier_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

export const action = async ({ request }: ActionFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const supabase = createServiceClient();

  const formData = await request.formData();

  // Get merchant
  const { data: merchant } = await supabase
    .from("merchants")
    .select("id")
    .eq("shopify_domain", session.shop)
    .single();

  if (!merchant) {
    return { error: "Merchant not found. Please reinstall the app." };
  }

  const name = formData.get("name") as string;
  const description = formData.get("description") as string;
  const productScope = formData.get("product_scope") as string;
  const cookieDuration = parseInt(formData.get("cookie_duration") as string, 10) || 30;
  const maxInfluencers = formData.get("max_influencers")
    ? parseInt(formData.get("max_influencers") as string, 10)
    : null;
  const applicationRequired = formData.get("application_required") === "true";
  const startDate = formData.get("start_date") as string;
  const endDate = (formData.get("end_date") as string) || null;

  // Parse commission tiers from JSON
  let commissionTiers = [];
  try {
    commissionTiers = JSON.parse(formData.get("commission_tiers") as string);
  } catch {
    return { error: "Invalid commission tiers data." };
  }

  if (!name || name.trim().length === 0) {
    return { error: "Campaign name is required." };
  }

  if (commissionTiers.length === 0) {
    return { error: "At least one commission tier is required." };
  }

  // Validate tiers
  for (const tier of commissionTiers) {
    if (!tier.name || tier.percent <= 0 || tier.percent > 100) {
      return { error: `Invalid tier: "${tier.name || "unnamed"}". Percent must be between 0 and 100.` };
    }
  }

  // Format tiers for storage
  const formattedTiers = commissionTiers.map((tier: any) => ({
    name: tier.name,
    min_revenue: parseFloat(tier.min_revenue) || 0,
    max_revenue: tier.max_revenue ? parseFloat(tier.max_revenue) : null,
    percent: parseFloat(tier.percent),
  }));

  const { data: campaign, error } = await supabase
    .from("campaigns")
    .insert({
      merchant_id: merchant.id,
      name: name.trim(),
      description: description?.trim() || null,
      commission_tiers: formattedTiers,
      product_scope: productScope || "all",
      cookie_duration_days: cookieDuration,
      max_influencers: maxInfluencers,
      application_required: applicationRequired,
      start_date: startDate || new Date().toISOString().split("T")[0],
      end_date: endDate || null,
      status: "active",
      total_revenue_generated: 0,
      total_commissions_paid: 0,
    })
    .select("id")
    .single();

  if (error || !campaign) {
    console.error("Failed to create campaign:", error);
    return { error: "Failed to create campaign. Please try again." };
  }

  return { success: true, campaignId: campaign.id };
};

export default function CampaignNew() {
  const actionData = useActionData<typeof action>();
  const navigation = useNavigation();
  const navigate = useNavigate();
  const submit = useSubmit();
  const isSubmitting = navigation.state === "submitting";

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [productScope, setProductScope] = useState("all");
  const [cookieDuration, setCookieDuration] = useState("30");
  const [maxInfluencers, setMaxInfluencers] = useState("");
  const [applicationRequired, setApplicationRequired] = useState(true);
  const [startDate, setStartDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [endDate, setEndDate] = useState("");

  const [tiers, setTiers] = useState<CommissionTierRow[]>([
    {
      id: generateRowId(),
      name: "Base",
      min_revenue: "0",
      max_revenue: "1000",
      percent: "10",
    },
  ]);

  // Redirect on success
  if (actionData && "success" in actionData && actionData.success && actionData.campaignId) {
    navigate(`/app/campaigns/${actionData.campaignId}`);
  }

  const addTier = useCallback(() => {
    const lastTier = tiers[tiers.length - 1];
    const newMinRevenue = lastTier ? String(parseFloat(lastTier.max_revenue) || 0) : "0";
    setTiers((prev) => [
      ...prev,
      {
        id: generateRowId(),
        name: `Tier ${prev.length + 1}`,
        min_revenue: newMinRevenue,
        max_revenue: "",
        percent: "",
      },
    ]);
  }, [tiers]);

  const removeTier = useCallback((id: string) => {
    setTiers((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const updateTier = useCallback(
    (id: string, field: keyof CommissionTierRow, value: string) => {
      setTiers((prev) =>
        prev.map((t) => (t.id === id ? { ...t, [field]: value } : t))
      );
    },
    []
  );

  const handleSubmit = useCallback(() => {
    const formData = new FormData();
    formData.set("name", name);
    formData.set("description", description);
    formData.set("product_scope", productScope);
    formData.set("cookie_duration", cookieDuration);
    formData.set("max_influencers", maxInfluencers);
    formData.set("application_required", String(applicationRequired));
    formData.set("start_date", startDate);
    formData.set("end_date", endDate);

    const tierData = tiers.map((t) => ({
      name: t.name,
      min_revenue: t.min_revenue,
      max_revenue: t.max_revenue,
      percent: t.percent,
    }));
    formData.set("commission_tiers", JSON.stringify(tierData));

    submit(formData, { method: "post" });
  }, [
    name,
    description,
    productScope,
    cookieDuration,
    maxInfluencers,
    applicationRequired,
    startDate,
    endDate,
    tiers,
    submit,
  ]);

  return (
    <Page
      title="Create Campaign"
      backAction={{ onAction: () => navigate("/app/campaigns") }}
    >
      <BlockStack gap="500">
        {actionData && "error" in actionData && (
          <Banner tone="critical">{actionData.error}</Banner>
        )}

        <Card>
          <BlockStack gap="400">
            <Text as="h2" variant="headingMd">
              Campaign Details
            </Text>
            <FormLayout>
              <TextField
                label="Campaign Name"
                value={name}
                onChange={setName}
                autoComplete="off"
                requiredIndicator
                placeholder="e.g. Summer Collection Launch"
              />
              <TextField
                label="Description"
                value={description}
                onChange={setDescription}
                autoComplete="off"
                multiline={3}
                placeholder="Describe your campaign for influencers..."
              />
            </FormLayout>
          </BlockStack>
        </Card>

        <Card>
          <BlockStack gap="400">
            <InlineStack align="space-between" blockAlign="center">
              <Text as="h2" variant="headingMd">
                Commission Tiers
              </Text>
              <Button onClick={addTier} variant="plain">
                + Add Tier
              </Button>
            </InlineStack>
            <Text as="p" variant="bodyMd" tone="subdued">
              Define the commission structure. Higher tiers reward influencers
              as they drive more revenue.
            </Text>

            {tiers.map((tier, index) => (
              <Box
                key={tier.id}
                padding="400"
                background="bg-surface-secondary"
                borderRadius="200"
              >
                <BlockStack gap="300">
                  <InlineStack align="space-between" blockAlign="center">
                    <Text as="h3" variant="headingSm">
                      {tier.name || `Tier ${index + 1}`}
                    </Text>
                    {tiers.length > 1 && (
                      <Button
                        variant="plain"
                        tone="critical"
                        onClick={() => removeTier(tier.id)}
                      >
                        Remove
                      </Button>
                    )}
                  </InlineStack>
                  <InlineGrid columns={4} gap="300">
                    <TextField
                      label="Tier Name"
                      value={tier.name}
                      onChange={(val) => updateTier(tier.id, "name", val)}
                      autoComplete="off"
                      placeholder="e.g. Bronze"
                    />
                    <TextField
                      label="Min Revenue ($)"
                      type="number"
                      value={tier.min_revenue}
                      onChange={(val) =>
                        updateTier(tier.id, "min_revenue", val)
                      }
                      autoComplete="off"
                      min={0}
                    />
                    <TextField
                      label="Max Revenue ($)"
                      type="number"
                      value={tier.max_revenue}
                      onChange={(val) =>
                        updateTier(tier.id, "max_revenue", val)
                      }
                      autoComplete="off"
                      placeholder="Leave empty for unlimited"
                      min={0}
                    />
                    <TextField
                      label="Commission %"
                      type="number"
                      value={tier.percent}
                      onChange={(val) => updateTier(tier.id, "percent", val)}
                      autoComplete="off"
                      suffix="%"
                      min={0}
                      max={100}
                    />
                  </InlineGrid>
                </BlockStack>
              </Box>
            ))}
          </BlockStack>
        </Card>

        <Card>
          <BlockStack gap="400">
            <Text as="h2" variant="headingMd">
              Campaign Settings
            </Text>
            <FormLayout>
              <FormLayout.Group>
                <Select
                  label="Product Scope"
                  options={[
                    { label: "All Products", value: "all" },
                    { label: "Specific Products", value: "specific" },
                  ]}
                  value={productScope}
                  onChange={setProductScope}
                />
                <TextField
                  label="Cookie Duration (days)"
                  type="number"
                  value={cookieDuration}
                  onChange={setCookieDuration}
                  autoComplete="off"
                  helpText="How long the affiliate attribution lasts"
                  min={1}
                  max={365}
                />
              </FormLayout.Group>
              <FormLayout.Group>
                <TextField
                  label="Max Influencers"
                  type="number"
                  value={maxInfluencers}
                  onChange={setMaxInfluencers}
                  autoComplete="off"
                  placeholder="Leave empty for unlimited"
                  helpText="Maximum number of influencers for this campaign"
                  min={1}
                />
                <div />
              </FormLayout.Group>
              <Checkbox
                label="Require application approval"
                checked={applicationRequired}
                onChange={setApplicationRequired}
                helpText="When enabled, influencers must apply and be approved before joining"
              />
            </FormLayout>
          </BlockStack>
        </Card>

        <Card>
          <BlockStack gap="400">
            <Text as="h2" variant="headingMd">
              Schedule
            </Text>
            <FormLayout>
              <FormLayout.Group>
                <TextField
                  label="Start Date"
                  type="date"
                  value={startDate}
                  onChange={setStartDate}
                  autoComplete="off"
                  requiredIndicator
                />
                <TextField
                  label="End Date"
                  type="date"
                  value={endDate}
                  onChange={setEndDate}
                  autoComplete="off"
                  helpText="Leave empty for an ongoing campaign"
                />
              </FormLayout.Group>
            </FormLayout>
          </BlockStack>
        </Card>

        <InlineStack align="end" gap="300">
          <Button onClick={() => navigate("/app/campaigns")}>Cancel</Button>
          <Button
            variant="primary"
            onClick={handleSubmit}
            loading={isSubmitting}
          >
            Create Campaign
          </Button>
        </InlineStack>

        {/* Spacer for bottom padding */}
        <Box paddingBlockEnd="600" />
      </BlockStack>
    </Page>
  );
}
