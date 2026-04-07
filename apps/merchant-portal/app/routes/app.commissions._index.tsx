import { useState, useCallback } from "react";
import { useLoaderData } from "react-router";
import type { LoaderFunctionArgs } from "react-router";
import {
  Page,
  Card,
  DataTable,
  BlockStack,
  Text,
  Badge,
  Select,
  InlineStack,
  EmptyState,
} from "@shopify/polaris";
import { authenticate } from "../shopify.server";
import { createServiceClient } from "@adltix/database";
import { formatCurrency } from "@adltix/utils";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const supabase = createServiceClient();

  const url = new URL(request.url);
  const statusFilter = url.searchParams.get("status") || "all";

  // Get merchant
  const { data: merchant } = await supabase
    .from("merchants")
    .select("id")
    .eq("shopify_domain", session.shop)
    .single();

  if (!merchant) {
    return { commissions: [], selectedStatus: "all" };
  }

  // Get commissions with related data
  let query = supabase
    .from("commissions")
    .select(`
      id,
      gross_amount,
      commission_percent,
      commission_amount,
      platform_fee_percent,
      platform_fee_amount,
      net_amount,
      tier_name,
      status,
      created_at,
      order_id,
      influencer_id,
      campaign_id,
      orders (
        id,
        shopify_order_number
      ),
      influencers (
        id,
        first_name,
        last_name
      )
    `)
    .eq("merchant_id", merchant.id)
    .order("created_at", { ascending: false })
    .limit(200);

  if (statusFilter && statusFilter !== "all") {
    query = query.eq("status", statusFilter);
  }

  const { data: commissions } = await query;

  const enriched = (commissions || []).map((c) => {
    const order = c.orders as any;
    const influencer = c.influencers as any;

    return {
      id: c.id,
      orderNumber: order?.shopify_order_number || "—",
      influencerName: influencer
        ? `${influencer.first_name || ""} ${influencer.last_name || ""}`.trim()
        : "Unknown",
      grossAmount: Number(c.gross_amount || 0),
      commissionPercent: Number(c.commission_percent || 0),
      commissionAmount: Number(c.commission_amount || 0),
      platformFeePercent: Number(c.platform_fee_percent || 0),
      platformFeeAmount: Number(c.platform_fee_amount || 0),
      netAmount: Number(c.net_amount || 0),
      tierName: c.tier_name || "—",
      status: c.status,
      date: c.created_at,
    };
  });

  return { commissions: enriched, selectedStatus: statusFilter };
};

const statusBadge = (status: string) => {
  const toneMap: Record<string, "success" | "warning" | "critical" | "info"> = {
    pending: "warning",
    validated: "info",
    payable: "success",
    paid: "success",
    invalidated: "critical",
  };
  return <Badge tone={toneMap[status] || "info"}>{status}</Badge>;
};

export default function CommissionsIndex() {
  const { commissions, selectedStatus } = useLoaderData<typeof loader>();
  const [statusFilter, setStatusFilter] = useState(selectedStatus);

  const handleFilterChange = useCallback((value: string) => {
    setStatusFilter(value);
    const url = new URL(window.location.href);
    if (value === "all") {
      url.searchParams.delete("status");
    } else {
      url.searchParams.set("status", value);
    }
    window.location.href = url.toString();
  }, []);

  const statusOptions = [
    { label: "All Statuses", value: "all" },
    { label: "Pending", value: "pending" },
    { label: "Validated", value: "validated" },
    { label: "Payable", value: "payable" },
    { label: "Paid", value: "paid" },
    { label: "Invalidated", value: "invalidated" },
  ];

  if (commissions.length === 0 && selectedStatus === "all") {
    return (
      <Page title="Commissions">
        <Card>
          <EmptyState
            heading="No commissions yet"
            image="https://cdn.shopify.com/s/files/1/0262/4071/2726/files/emptystate-files.png"
          >
            <p>
              Commission records are created automatically when attributed
              orders come in through influencer links.
            </p>
          </EmptyState>
        </Card>
      </Page>
    );
  }

  const rows = commissions.map((c) => [
    <Text as="span" fontWeight="semibold">
      #{c.orderNumber}
    </Text>,
    c.influencerName,
    formatCurrency(c.grossAmount),
    `${c.commissionPercent}%`,
    formatCurrency(c.commissionAmount),
    formatCurrency(c.platformFeeAmount),
    formatCurrency(c.netAmount),
    statusBadge(c.status),
    new Date(c.date).toLocaleDateString(),
  ]);

  const totalGross = commissions.reduce((sum, c) => sum + c.grossAmount, 0);
  const totalCommission = commissions.reduce(
    (sum, c) => sum + c.commissionAmount,
    0
  );
  const totalPlatformFee = commissions.reduce(
    (sum, c) => sum + c.platformFeeAmount,
    0
  );
  const totalNet = commissions.reduce((sum, c) => sum + c.netAmount, 0);

  return (
    <Page title="Commissions">
      <BlockStack gap="500">
        <Card>
          <BlockStack gap="400">
            <InlineStack align="space-between" blockAlign="end">
              <Text as="h2" variant="headingMd">
                Commission Ledger
              </Text>
              <div style={{ width: "200px" }}>
                <Select
                  label="Filter by Status"
                  labelHidden
                  options={statusOptions}
                  value={statusFilter}
                  onChange={handleFilterChange}
                />
              </div>
            </InlineStack>
            <DataTable
              columnContentTypes={[
                "text",
                "text",
                "numeric",
                "numeric",
                "numeric",
                "numeric",
                "numeric",
                "text",
                "text",
              ]}
              headings={[
                "Order",
                "Influencer",
                "Order Amount",
                "Rate",
                "Commission",
                "Platform Fee",
                "Net (Influencer)",
                "Status",
                "Date",
              ]}
              rows={rows}
              totals={[
                "",
                "",
                formatCurrency(totalGross),
                "",
                formatCurrency(totalCommission),
                formatCurrency(totalPlatformFee),
                formatCurrency(totalNet),
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
