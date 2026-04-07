import { useState, useCallback } from "react";
import {
  useLoaderData,
  useActionData,
  useSubmit,
  useNavigation,
} from "react-router";
import type { LoaderFunctionArgs, ActionFunctionArgs } from "react-router";
import {
  Page,
  Card,
  BlockStack,
  InlineStack,
  Text,
  TextField,
  Button,
  Badge,
  Banner,
  Divider,
  Box,
  Link,
} from "@shopify/polaris";
import { authenticate } from "../shopify.server";
import { createServiceClient } from "@adltix/database";
import { formatPercent } from "@adltix/utils";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const supabase = createServiceClient();

  // Get merchant
  const { data: merchant } = await supabase
    .from("merchants")
    .select(
      "id, name, shopify_domain, platform_fee_percent, subscription_plan, subscription_status, email"
    )
    .eq("shopify_domain", session.shop)
    .single();

  if (!merchant) {
    return {
      merchant: null,
      shopDomain: session.shop,
    };
  }

  return {
    merchant: {
      id: merchant.id,
      name: merchant.name,
      shopifyDomain: merchant.shopify_domain,
      email: merchant.email,
      platformFeePercent: Number(merchant.platform_fee_percent || 10),
      subscriptionPlan: merchant.subscription_plan || "free",
      subscriptionStatus: merchant.subscription_status || "active",
    },
    shopDomain: session.shop,
  };
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const supabase = createServiceClient();
  const formData = await request.formData();
  const intent = formData.get("intent") as string;

  // Get merchant
  const { data: merchant } = await supabase
    .from("merchants")
    .select("id")
    .eq("shopify_domain", session.shop)
    .single();

  if (!merchant) {
    return { error: "Merchant not found" };
  }

  if (intent === "update_platform_fee") {
    const feePercent = parseFloat(formData.get("platform_fee_percent") as string);

    if (isNaN(feePercent) || feePercent < 0 || feePercent > 100) {
      return { error: "Platform fee must be between 0 and 100." };
    }

    const { error } = await supabase
      .from("merchants")
      .update({ platform_fee_percent: feePercent })
      .eq("id", merchant.id);

    if (error) {
      return { error: "Failed to update platform fee." };
    }

    return { success: true, message: "Platform fee updated successfully." };
  }

  return { error: "Unknown action" };
};

const planBadge = (plan: string) => {
  const toneMap: Record<string, "success" | "warning" | "info"> = {
    free: "info",
    starter: "warning",
    growth: "success",
    enterprise: "success",
  };
  return (
    <Badge tone={toneMap[plan] || "info"}>
      {plan.charAt(0).toUpperCase() + plan.slice(1)}
    </Badge>
  );
};

const statusBadge = (status: string) => {
  const toneMap: Record<string, "success" | "warning" | "critical"> = {
    active: "success",
    trialing: "warning",
    past_due: "critical",
    cancelled: "critical",
  };
  return <Badge tone={toneMap[status] || "info"}>{status}</Badge>;
};

export default function SettingsIndex() {
  const { merchant, shopDomain } = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const submit = useSubmit();
  const navigation = useNavigation();
  const isSubmitting = navigation.state === "submitting";

  const [platformFee, setPlatformFee] = useState(
    String(merchant?.platformFeePercent || 10)
  );

  const handleSaveFee = useCallback(() => {
    const formData = new FormData();
    formData.set("intent", "update_platform_fee");
    formData.set("platform_fee_percent", platformFee);
    submit(formData, { method: "post" });
  }, [platformFee, submit]);

  if (!merchant) {
    return (
      <Page title="Settings">
        <Card>
          <Banner tone="critical">
            Merchant account not found. Please reinstall the app.
          </Banner>
        </Card>
      </Page>
    );
  }

  return (
    <Page title="Settings">
      <BlockStack gap="500">
        {actionData && "error" in actionData && (
          <Banner tone="critical">{actionData.error}</Banner>
        )}
        {actionData && "success" in actionData && actionData.message && (
          <Banner tone="success">{actionData.message}</Banner>
        )}

        {/* Platform Fee */}
        <Card>
          <BlockStack gap="400">
            <Text as="h2" variant="headingMd">
              Platform Fee
            </Text>
            <Text as="p" variant="bodyMd" tone="subdued">
              The platform fee is deducted from each commission before paying the
              influencer. For example, with a 10% platform fee on a $50
              commission, the influencer receives $45 and the platform retains
              $5.
            </Text>
            <InlineStack gap="300" blockAlign="end">
              <div style={{ width: "200px" }}>
                <TextField
                  label="Platform Fee Percent"
                  type="number"
                  value={platformFee}
                  onChange={setPlatformFee}
                  autoComplete="off"
                  suffix="%"
                  min={0}
                  max={100}
                  step={0.5}
                />
              </div>
              <Button
                variant="primary"
                onClick={handleSaveFee}
                loading={isSubmitting}
              >
                Save
              </Button>
            </InlineStack>
            <Text as="p" variant="bodyMd">
              Current fee:{" "}
              <Text as="span" fontWeight="semibold">
                {formatPercent(merchant.platformFeePercent)}
              </Text>
            </Text>
          </BlockStack>
        </Card>

        {/* Subscription */}
        <Card>
          <BlockStack gap="400">
            <Text as="h2" variant="headingMd">
              Subscription Plan
            </Text>
            <BlockStack gap="200">
              <InlineStack gap="300" blockAlign="center">
                <Text as="p" variant="bodyMd">
                  Current Plan:
                </Text>
                {planBadge(merchant.subscriptionPlan)}
              </InlineStack>
              <InlineStack gap="300" blockAlign="center">
                <Text as="p" variant="bodyMd">
                  Status:
                </Text>
                {statusBadge(merchant.subscriptionStatus)}
              </InlineStack>
            </BlockStack>
            <Divider />
            <Text as="p" variant="bodyMd" tone="subdued">
              Manage your subscription plan and billing through the Shopify
              admin.
            </Text>
            <InlineStack>
              <Button
                url={`https://${shopDomain}/admin/settings/billing`}
                external
              >
                Manage Billing in Shopify
              </Button>
            </InlineStack>
          </BlockStack>
        </Card>

        {/* Store Info */}
        <Card>
          <BlockStack gap="400">
            <Text as="h2" variant="headingMd">
              Store Information
            </Text>
            <BlockStack gap="200">
              <InlineStack gap="300">
                <Text as="p" variant="bodyMd" tone="subdued">
                  Store:
                </Text>
                <Text as="p" variant="bodyMd">
                  {merchant.name || merchant.shopifyDomain}
                </Text>
              </InlineStack>
              <InlineStack gap="300">
                <Text as="p" variant="bodyMd" tone="subdued">
                  Domain:
                </Text>
                <Text as="p" variant="bodyMd">
                  {merchant.shopifyDomain}
                </Text>
              </InlineStack>
              <InlineStack gap="300">
                <Text as="p" variant="bodyMd" tone="subdued">
                  Email:
                </Text>
                <Text as="p" variant="bodyMd">
                  {merchant.email || "—"}
                </Text>
              </InlineStack>
            </BlockStack>
          </BlockStack>
        </Card>

        <Box paddingBlockEnd="600" />
      </BlockStack>
    </Page>
  );
}
