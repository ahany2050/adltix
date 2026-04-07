import { createClient } from "@/lib/supabase/server";
import { formatPercent, formatCurrency } from "@adltix/utils";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

interface Props {
  params: { id: string };
}

export default async function CampaignDetailPage({ params }: Props) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  // Fetch campaign with tiers and merchant
  const { data: campaign, error } = await supabase
    .from("campaigns")
    .select(
      `
      id,
      name,
      description,
      status,
      start_date,
      end_date,
      created_at,
      merchant:merchants(id, store_name, store_domain),
      commission_tiers(id, name, percent, min_revenue, max_revenue)
    `
    )
    .eq("id", params.id)
    .single();

  if (error || !campaign) {
    redirect("/campaigns");
  }

  // Check if user already applied
  const { data: existingApplication } = await supabase
    .from("campaign_applications")
    .select("id, status, created_at")
    .eq("campaign_id", campaign.id)
    .eq("influencer_id", user.id)
    .maybeSingle();

  const merchant = campaign.merchant as any;
  const tiers = ((campaign.commission_tiers as any[]) ?? []).sort(
    (a: any, b: any) => a.min_revenue - b.min_revenue
  );

  // Server action to apply
  async function applyToCampaign(formData: FormData) {
    "use server";

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) redirect("/login");

    const message = formData.get("message") as string;
    const campaignId = formData.get("campaignId") as string;

    await supabase.from("campaign_applications").insert({
      campaign_id: campaignId,
      influencer_id: user.id,
      message: message || null,
      status: "pending",
    });

    revalidatePath(`/campaigns/${campaignId}`);
  }

  return (
    <div>
      {/* Back link */}
      <a
        href="/campaigns"
        className="mb-6 inline-flex items-center gap-1 text-subheadline text-apple-blue hover:underline"
      >
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <polyline points="15 18 9 12 15 6" />
        </svg>
        Back to Campaigns
      </a>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Main content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Campaign header */}
          <div className="apple-card">
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-apple-md bg-apple-indigo/10 font-display text-title-3 text-apple-indigo">
                {merchant?.store_name?.[0]?.toUpperCase() ?? "M"}
              </div>
              <div>
                <p className="text-subheadline text-secondary">
                  {merchant?.store_name ?? "Merchant"}
                </p>
                <p className="text-caption-1 text-tertiary">
                  {merchant?.store_domain ?? ""}
                </p>
              </div>
            </div>

            <h1 className="font-display text-title-1 text-primary">
              {campaign.name}
            </h1>

            {campaign.description && (
              <p className="mt-3 text-body text-secondary leading-relaxed">
                {campaign.description}
              </p>
            )}

            <div className="mt-4 flex flex-wrap gap-3">
              <span
                className={
                  campaign.status === "active"
                    ? "badge-success"
                    : "badge-neutral"
                }
              >
                {campaign.status === "active" ? "Active" : campaign.status}
              </span>
              {campaign.start_date && (
                <span className="badge-neutral">
                  Started{" "}
                  {new Date(campaign.start_date).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })}
                </span>
              )}
              {campaign.end_date && (
                <span className="badge-neutral">
                  Ends{" "}
                  {new Date(campaign.end_date).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })}
                </span>
              )}
            </div>
          </div>

          {/* Commission tiers */}
          <div className="apple-card">
            <h2 className="font-display text-title-3 text-primary mb-4">
              Commission Tiers
            </h2>
            {tiers.length === 0 ? (
              <p className="text-callout text-secondary">
                No commission tiers configured yet.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-separator">
                      <th className="pb-3 text-left text-footnote font-medium text-secondary">
                        Tier
                      </th>
                      <th className="pb-3 text-left text-footnote font-medium text-secondary">
                        Commission
                      </th>
                      <th className="pb-3 text-left text-footnote font-medium text-secondary">
                        Revenue Range
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-separator">
                    {tiers.map((tier: any) => (
                      <tr key={tier.id}>
                        <td className="py-3 text-subheadline font-medium text-primary">
                          {tier.name}
                        </td>
                        <td className="py-3">
                          <span className="rounded-pill bg-apple-green/10 px-3 py-1 text-footnote font-semibold text-apple-green">
                            {formatPercent(tier.percent, 0)}
                          </span>
                        </td>
                        <td className="py-3 text-subheadline text-secondary">
                          {formatCurrency(tier.min_revenue)}
                          {tier.max_revenue
                            ? ` - ${formatCurrency(tier.max_revenue)}`
                            : "+"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Sidebar: Apply form */}
        <div className="lg:col-span-1">
          <div className="apple-card sticky top-8">
            <h2 className="font-display text-title-3 text-primary mb-4">
              {existingApplication ? "Application Status" : "Apply to Campaign"}
            </h2>

            {existingApplication ? (
              <div>
                <div className="mb-4">
                  {existingApplication.status === "approved" ? (
                    <span className="badge-success">Approved</span>
                  ) : existingApplication.status === "pending" ? (
                    <span className="badge-warning">Pending Review</span>
                  ) : (
                    <span className="badge-error">Not Accepted</span>
                  )}
                </div>
                <p className="text-subheadline text-secondary">
                  {existingApplication.status === "approved"
                    ? "You have been approved for this campaign. Check your Links page for your affiliate link."
                    : existingApplication.status === "pending"
                      ? "Your application is under review. We will notify you once the merchant makes a decision."
                      : "Unfortunately, your application was not accepted for this campaign."}
                </p>
                <p className="mt-2 text-caption-1 text-tertiary">
                  Applied on{" "}
                  {new Date(existingApplication.created_at).toLocaleDateString(
                    "en-US",
                    { month: "long", day: "numeric", year: "numeric" }
                  )}
                </p>
              </div>
            ) : (
              <form action={applyToCampaign} className="space-y-4">
                <input type="hidden" name="campaignId" value={campaign.id} />

                <div>
                  <label
                    htmlFor="message"
                    className="mb-1.5 block text-subheadline font-medium text-primary"
                  >
                    Message (optional)
                  </label>
                  <textarea
                    id="message"
                    name="message"
                    rows={4}
                    placeholder="Tell the merchant why you're a great fit for this campaign..."
                    className="apple-input resize-none"
                  />
                </div>

                <button type="submit" className="btn-primary w-full">
                  Submit Application
                </button>

                <p className="text-caption-1 text-tertiary text-center">
                  The merchant will review your application and approve or
                  decline it.
                </p>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
