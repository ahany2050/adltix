import { createClient } from "@/lib/supabase/server";
import { formatPercent } from "@adltix/utils";
import Link from "next/link";
import { redirect } from "next/navigation";

export default async function CampaignsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  // Fetch active campaigns with their commission tiers
  const { data: campaigns } = await supabase
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
    .eq("status", "active")
    .order("created_at", { ascending: false });

  // Check which campaigns the user has already applied to
  const { data: applications } = await supabase
    .from("campaign_applications")
    .select("campaign_id, status")
    .eq("influencer_id", user.id);

  const appliedMap = new Map(
    (applications ?? []).map((a) => [a.campaign_id, a.status])
  );

  return (
    <div>
      {/* Page header */}
      <div className="mb-8">
        <h1 className="font-display text-title-1 text-primary">Campaigns</h1>
        <p className="mt-1 text-callout text-secondary">
          Browse active campaigns from merchants and apply to earn commissions.
        </p>
      </div>

      {/* Campaign grid */}
      {!campaigns || campaigns.length === 0 ? (
        <div className="apple-card py-16 text-center">
          <svg
            width="48"
            height="48"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="mx-auto mb-3 text-tertiary"
          >
            <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
          </svg>
          <p className="text-callout text-secondary">
            No active campaigns right now
          </p>
          <p className="mt-1 text-footnote text-tertiary">
            Check back soon for new opportunities
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {campaigns.map((campaign) => {
            const merchant = campaign.merchant as any;
            const tiers = (campaign.commission_tiers as any[]) ?? [];
            const applicationStatus = appliedMap.get(campaign.id);
            const topTier = tiers.reduce(
              (max, t) => (t.percent > (max?.percent ?? 0) ? t : max),
              tiers[0]
            );

            return (
              <Link
                key={campaign.id}
                href={`/campaigns/${campaign.id}`}
                className="apple-card group block"
              >
                {/* Merchant info */}
                <div className="mb-4 flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-apple-sm bg-apple-indigo/10 font-display text-headline text-apple-indigo">
                    {merchant?.store_name?.[0]?.toUpperCase() ?? "M"}
                  </div>
                  <div>
                    <p className="text-footnote text-secondary">
                      {merchant?.store_name ?? "Merchant"}
                    </p>
                    <p className="text-caption-1 text-tertiary">
                      {merchant?.store_domain ?? ""}
                    </p>
                  </div>
                </div>

                {/* Campaign name */}
                <h3 className="font-display text-headline text-primary group-hover:text-apple-blue transition-colors duration-150">
                  {campaign.name}
                </h3>
                {campaign.description && (
                  <p className="mt-1.5 line-clamp-2 text-subheadline text-secondary">
                    {campaign.description}
                  </p>
                )}

                {/* Commission tiers preview */}
                {tiers.length > 0 && (
                  <div className="mt-4 flex flex-wrap gap-2">
                    {tiers.slice(0, 3).map((tier) => (
                      <span
                        key={tier.id}
                        className="rounded-pill bg-apple-green/10 px-3 py-1 text-caption-1 font-medium text-apple-green"
                      >
                        {tier.name}: {formatPercent(tier.percent, 0)}
                      </span>
                    ))}
                    {topTier && (
                      <span className="text-caption-1 text-tertiary self-center">
                        Up to {formatPercent(topTier.percent, 0)}
                      </span>
                    )}
                  </div>
                )}

                {/* Apply status / CTA */}
                <div className="mt-4 pt-4 border-t border-separator">
                  {applicationStatus === "approved" ? (
                    <span className="badge-success">Approved</span>
                  ) : applicationStatus === "pending" ? (
                    <span className="badge-warning">Application Pending</span>
                  ) : applicationStatus === "rejected" ? (
                    <span className="badge-error">Not Accepted</span>
                  ) : (
                    <span className="text-subheadline font-semibold text-apple-blue group-hover:underline">
                      Apply Now
                    </span>
                  )}
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
