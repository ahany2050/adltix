import { useLoaderData } from "react-router";
import type { LoaderFunctionArgs } from "react-router";
import {
  Page,
  Card,
  DataTable,
  BlockStack,
  Text,
  Badge,
  EmptyState,
  InlineGrid,
} from "@shopify/polaris";
import { authenticate } from "../shopify.server";
import { createServiceClient } from "@adltix/database";
import { formatCurrency } from "@adltix/utils";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const supabase = createServiceClient();

  // Get merchant
  const { data: merchant } = await supabase
    .from("merchants")
    .select("id")
    .eq("shopify_domain", session.shop)
    .single();

  if (!merchant) {
    return { payouts: [], stats: { totalPaid: 0, pendingPayouts: 0, totalPayouts: 0 } };
  }

  // Get payouts with influencer data
  const { data: payouts } = await supabase
    .from("payouts")
    .select(`
      id,
      amount,
      currency,
      status,
      stripe_transfer_id,
      stripe_payout_id,
      payout_method,
      period_start,
      period_end,
      created_at,
      paid_at,
      influencer_id,
      influencers (
        id,
        first_name,
        last_name,
        email
      )
    `)
    .eq("merchant_id", merchant.id)
    .order("created_at", { ascending: false })
    .limit(200);

  const enriched = (payouts || []).map((p) => {
    const influencer = p.influencers as any;
    return {
      id: p.id,
      influencerName: influencer
        ? `${influencer.first_name || ""} ${influencer.last_name || ""}`.trim()
        : "Unknown",
      influencerEmail: influencer?.email || "—",
      amount: Number(p.amount || 0),
      currency: p.currency || "USD",
      status: p.status,
      stripeReference: p.stripe_transfer_id || p.stripe_payout_id || "—",
      payoutMethod: p.payout_method || "stripe",
      periodStart: p.period_start,
      periodEnd: p.period_end,
      date: p.paid_at || p.created_at,
    };
  });

  const totalPaid = enriched
    .filter((p) => p.status === "paid")
    .reduce((sum, p) => sum + p.amount, 0);
  const pendingPayouts = enriched
    .filter((p) => p.status === "pending" || p.status === "processing")
    .reduce((sum, p) => sum + p.amount, 0);

  return {
    payouts: enriched,
    stats: {
      totalPaid,
      pendingPayouts,
      totalPayouts: enriched.length,
    },
  };
};

const statusBadge = (status: string) => {
  const toneMap: Record<string, "success" | "warning" | "critical" | "info"> = {
    pending: "warning",
    processing: "info",
    paid: "success",
    failed: "critical",
  };
  return <Badge tone={toneMap[status] || "info"}>{status}</Badge>;
};

export default function PayoutsIndex() {
  const { payouts, stats } = useLoaderData<typeof loader>();

  if (payouts.length === 0) {
    return (
      <Page title="Payouts">
        <Card>
          <EmptyState
            heading="No payouts yet"
            image="https://cdn.shopify.com/s/files/1/0262/4071/2726/files/emptystate-files.png"
          >
            <p>
              When commissions are validated and ready for payment, payout
              records will appear here. Payouts are processed through Stripe
              Connect.
            </p>
          </EmptyState>
        </Card>
      </Page>
    );
  }

  const rows = payouts.map((p) => [
    <Text as="span" fontWeight="semibold">
      {p.influencerName}
    </Text>,
    p.influencerEmail,
    formatCurrency(p.amount, p.currency),
    statusBadge(p.status),
    p.stripeReference,
    p.payoutMethod,
    new Date(p.date).toLocaleDateString(),
  ]);

  return (
    <Page title="Payouts">
      <BlockStack gap="500">
        {/* Stats */}
        <InlineGrid columns={3} gap="400">
          <Card>
            <BlockStack gap="200">
              <Text as="p" variant="bodyMd" tone="subdued">
                Total Paid
              </Text>
              <Text as="p" variant="headingLg" fontWeight="semibold">
                {formatCurrency(stats.totalPaid)}
              </Text>
            </BlockStack>
          </Card>
          <Card>
            <BlockStack gap="200">
              <Text as="p" variant="bodyMd" tone="subdued">
                Pending Payouts
              </Text>
              <Text as="p" variant="headingLg" fontWeight="semibold">
                {formatCurrency(stats.pendingPayouts)}
              </Text>
            </BlockStack>
          </Card>
          <Card>
            <BlockStack gap="200">
              <Text as="p" variant="bodyMd" tone="subdued">
                Total Payouts
              </Text>
              <Text as="p" variant="headingLg" fontWeight="semibold">
                {String(stats.totalPayouts)}
              </Text>
            </BlockStack>
          </Card>
        </InlineGrid>

        {/* Payout Table */}
        <Card>
          <BlockStack gap="400">
            <Text as="h2" variant="headingMd">
              Payout History
            </Text>
            <DataTable
              columnContentTypes={[
                "text",
                "text",
                "numeric",
                "text",
                "text",
                "text",
                "text",
              ]}
              headings={[
                "Influencer",
                "Email",
                "Amount",
                "Status",
                "Stripe Reference",
                "Method",
                "Date",
              ]}
              rows={rows}
              totals={[
                "",
                "",
                formatCurrency(
                  payouts.reduce((sum, p) => sum + p.amount, 0)
                ),
                "",
                "",
                "",
                "",
              ]}
              showTotalsInFooter
            />
          </BlockStack>
        </Card>
      </BlockStack>
    </Page>
  );
}
