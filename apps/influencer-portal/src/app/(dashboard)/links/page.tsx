"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { formatNumber } from "@adltix/utils";

interface AffiliateLink {
  id: string;
  short_code: string;
  discount_code: string;
  total_clicks: number;
  total_orders: number;
  total_revenue: number;
  created_at: string;
  campaign: {
    name: string;
    status: string;
  } | null;
}

export default function LinksPage() {
  const [links, setLinks] = useState<AffiliateLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    async function fetchLinks() {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) return;

      const { data } = await supabase
        .from("affiliate_links")
        .select(
          `
          id,
          short_code,
          discount_code,
          total_clicks,
          total_orders,
          total_revenue,
          created_at,
          campaign:campaigns(name, status)
        `
        )
        .eq("influencer_id", user.id)
        .order("created_at", { ascending: false });

      setLinks((data as any[]) ?? []);
      setLoading(false);
    }

    fetchLinks();
  }, []);

  function getFullUrl(shortCode: string) {
    const base =
      typeof window !== "undefined"
        ? window.location.origin
        : "https://influencer.adltix.com";
    return `${base}/r/${shortCode}`;
  }

  async function copyToClipboard(text: string, linkId: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(linkId);
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      // Fallback: select a temporary input
      const input = document.createElement("input");
      input.value = text;
      document.body.appendChild(input);
      input.select();
      document.execCommand("copy");
      document.body.removeChild(input);
      setCopiedId(linkId);
      setTimeout(() => setCopiedId(null), 2000);
    }
  }

  if (loading) {
    return (
      <div>
        <div className="mb-8">
          <h1 className="font-display text-title-1 text-primary">
            Affiliate Links
          </h1>
          <p className="mt-1 text-callout text-secondary">
            Manage and share your affiliate links.
          </p>
        </div>
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="apple-card animate-pulse"
            >
              <div className="h-5 w-48 rounded bg-surface mb-3" />
              <div className="h-4 w-72 rounded bg-surface mb-2" />
              <div className="flex gap-6 mt-4">
                <div className="h-4 w-20 rounded bg-surface" />
                <div className="h-4 w-20 rounded bg-surface" />
                <div className="h-4 w-20 rounded bg-surface" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Page header */}
      <div className="mb-8">
        <h1 className="font-display text-title-1 text-primary">
          Affiliate Links
        </h1>
        <p className="mt-1 text-callout text-secondary">
          Share these links to earn commissions. Clicks are tracked
          automatically.
        </p>
      </div>

      {links.length === 0 ? (
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
            <path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71" />
            <path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71" />
          </svg>
          <p className="text-callout text-secondary">No affiliate links yet</p>
          <p className="mt-1 text-footnote text-tertiary">
            Apply to campaigns to get your unique affiliate links
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {links.map((link) => {
            const fullUrl = getFullUrl(link.short_code);
            const isCopied = copiedId === link.id;

            return (
              <div key={link.id} className="apple-card">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div className="flex-1">
                    {/* Campaign name */}
                    <h3 className="font-display text-headline text-primary">
                      {link.campaign?.name ?? "Campaign"}
                    </h3>

                    {/* Link URL */}
                    <div className="mt-2 flex items-center gap-2">
                      <code className="rounded-apple-sm bg-surface px-3 py-1.5 text-footnote text-secondary font-mono break-all">
                        {fullUrl}
                      </code>
                      <button
                        onClick={() => copyToClipboard(fullUrl, link.id)}
                        className={`flex-shrink-0 rounded-apple-sm px-3 py-1.5 text-footnote font-medium transition-all duration-150 ease-apple ${
                          isCopied
                            ? "bg-apple-green/10 text-apple-green"
                            : "bg-apple-blue/10 text-apple-blue hover:bg-apple-blue/20"
                        }`}
                      >
                        {isCopied ? (
                          <span className="flex items-center gap-1">
                            <svg
                              width="14"
                              height="14"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            >
                              <polyline points="20 6 9 17 4 12" />
                            </svg>
                            Copied
                          </span>
                        ) : (
                          <span className="flex items-center gap-1">
                            <svg
                              width="14"
                              height="14"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            >
                              <rect
                                x="9"
                                y="9"
                                width="13"
                                height="13"
                                rx="2"
                                ry="2"
                              />
                              <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
                            </svg>
                            Copy
                          </span>
                        )}
                      </button>
                    </div>

                    {/* Discount code */}
                    {link.discount_code && (
                      <p className="mt-2 text-caption-1 text-tertiary">
                        Discount code:{" "}
                        <span className="font-mono font-medium text-secondary">
                          {link.discount_code}
                        </span>
                      </p>
                    )}
                  </div>

                  {/* Stats */}
                  <div className="flex gap-6 sm:gap-8">
                    <div className="text-center">
                      <p className="font-display text-title-3 text-primary">
                        {formatNumber(link.total_clicks ?? 0)}
                      </p>
                      <p className="text-caption-1 text-tertiary">Clicks</p>
                    </div>
                    <div className="text-center">
                      <p className="font-display text-title-3 text-primary">
                        {formatNumber(link.total_orders ?? 0)}
                      </p>
                      <p className="text-caption-1 text-tertiary">Orders</p>
                    </div>
                    <div className="text-center">
                      <p className="font-display text-title-3 text-apple-green">
                        ${formatNumber(link.total_revenue ?? 0)}
                      </p>
                      <p className="text-caption-1 text-tertiary">Revenue</p>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
