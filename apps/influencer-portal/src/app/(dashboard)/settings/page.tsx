"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

interface Profile {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  bio: string | null;
  website: string | null;
  instagram_handle: string | null;
  tiktok_handle: string | null;
  youtube_channel: string | null;
  stripe_account_id: string | null;
  stripe_onboarding_complete: boolean;
}

export default function SettingsPage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [connectingStripe, setConnectingStripe] = useState(false);

  // Form state
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [bio, setBio] = useState("");
  const [website, setWebsite] = useState("");
  const [instagram, setInstagram] = useState("");
  const [tiktok, setTiktok] = useState("");
  const [youtube, setYoutube] = useState("");

  useEffect(() => {
    async function fetchProfile() {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) return;

      const { data } = await supabase
        .from("influencers")
        .select("*")
        .eq("id", user.id)
        .single();

      if (data) {
        setProfile(data as Profile);
        setFirstName(data.first_name ?? "");
        setLastName(data.last_name ?? "");
        setBio(data.bio ?? "");
        setWebsite(data.website ?? "");
        setInstagram(data.instagram_handle ?? "");
        setTiktok(data.tiktok_handle ?? "");
        setYoutube(data.youtube_channel ?? "");
      }

      setLoading(false);
    }

    fetchProfile();
  }, []);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaved(false);
    setSaving(true);

    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return;

    const { error: updateError } = await supabase
      .from("influencers")
      .update({
        first_name: firstName,
        last_name: lastName,
        bio: bio || null,
        website: website || null,
        instagram_handle: instagram || null,
        tiktok_handle: tiktok || null,
        youtube_channel: youtube || null,
      })
      .eq("id", user.id);

    setSaving(false);

    if (updateError) {
      setError(updateError.message);
    } else {
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    }
  }

  async function handleStripeConnect() {
    setConnectingStripe(true);

    try {
      const response = await fetch("/api/stripe/connect", {
        method: "POST",
      });

      const data = await response.json();

      if (data.url) {
        window.location.href = data.url;
      } else {
        setError("Failed to create Stripe Connect link. Please try again.");
        setConnectingStripe(false);
      }
    } catch {
      setError("Failed to connect to Stripe. Please try again.");
      setConnectingStripe(false);
    }
  }

  if (loading) {
    return (
      <div>
        <div className="mb-8">
          <h1 className="font-display text-title-1 text-primary">Settings</h1>
        </div>
        <div className="apple-card animate-pulse">
          <div className="space-y-6">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i}>
                <div className="h-4 w-24 rounded bg-surface mb-2" />
                <div className="h-10 w-full rounded-apple-md bg-surface" />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Page header */}
      <div className="mb-8">
        <h1 className="font-display text-title-1 text-primary">Settings</h1>
        <p className="mt-1 text-callout text-secondary">
          Manage your profile and payment settings.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Profile form */}
        <div className="lg:col-span-2">
          <form onSubmit={handleSave} className="apple-card">
            <h2 className="font-display text-title-3 text-primary mb-6">
              Profile Information
            </h2>

            {/* Error / success alerts */}
            {error && (
              <div className="mb-6 rounded-apple-md bg-apple-red/10 px-4 py-3 text-subheadline text-apple-red">
                {error}
              </div>
            )}
            {saved && (
              <div className="mb-6 rounded-apple-md bg-apple-green/10 px-4 py-3 text-subheadline text-apple-green">
                Profile updated successfully.
              </div>
            )}

            <div className="space-y-5">
              {/* Name row */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label
                    htmlFor="firstName"
                    className="mb-1.5 block text-subheadline font-medium text-primary"
                  >
                    First name
                  </label>
                  <input
                    id="firstName"
                    type="text"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    className="apple-input"
                    required
                  />
                </div>
                <div>
                  <label
                    htmlFor="lastName"
                    className="mb-1.5 block text-subheadline font-medium text-primary"
                  >
                    Last name
                  </label>
                  <input
                    id="lastName"
                    type="text"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    className="apple-input"
                    required
                  />
                </div>
              </div>

              {/* Email (read-only) */}
              <div>
                <label className="mb-1.5 block text-subheadline font-medium text-primary">
                  Email
                </label>
                <input
                  type="email"
                  value={profile?.email ?? ""}
                  disabled
                  className="apple-input bg-surface text-secondary cursor-not-allowed"
                />
                <p className="mt-1 text-caption-1 text-tertiary">
                  Email cannot be changed from this page.
                </p>
              </div>

              {/* Bio */}
              <div>
                <label
                  htmlFor="bio"
                  className="mb-1.5 block text-subheadline font-medium text-primary"
                >
                  Bio
                </label>
                <textarea
                  id="bio"
                  rows={3}
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  placeholder="Tell merchants about yourself..."
                  className="apple-input resize-none"
                />
              </div>

              {/* Website */}
              <div>
                <label
                  htmlFor="website"
                  className="mb-1.5 block text-subheadline font-medium text-primary"
                >
                  Website
                </label>
                <input
                  id="website"
                  type="url"
                  value={website}
                  onChange={(e) => setWebsite(e.target.value)}
                  placeholder="https://yoursite.com"
                  className="apple-input"
                />
              </div>

              {/* Social handles */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div>
                  <label
                    htmlFor="instagram"
                    className="mb-1.5 block text-subheadline font-medium text-primary"
                  >
                    Instagram
                  </label>
                  <input
                    id="instagram"
                    type="text"
                    value={instagram}
                    onChange={(e) => setInstagram(e.target.value)}
                    placeholder="@handle"
                    className="apple-input"
                  />
                </div>
                <div>
                  <label
                    htmlFor="tiktok"
                    className="mb-1.5 block text-subheadline font-medium text-primary"
                  >
                    TikTok
                  </label>
                  <input
                    id="tiktok"
                    type="text"
                    value={tiktok}
                    onChange={(e) => setTiktok(e.target.value)}
                    placeholder="@handle"
                    className="apple-input"
                  />
                </div>
                <div>
                  <label
                    htmlFor="youtube"
                    className="mb-1.5 block text-subheadline font-medium text-primary"
                  >
                    YouTube
                  </label>
                  <input
                    id="youtube"
                    type="text"
                    value={youtube}
                    onChange={(e) => setYoutube(e.target.value)}
                    placeholder="Channel name"
                    className="apple-input"
                  />
                </div>
              </div>
            </div>

            {/* Save button */}
            <div className="mt-8 flex justify-end">
              <button type="submit" disabled={saving} className="btn-primary">
                {saving ? (
                  <span className="flex items-center gap-2">
                    <svg
                      className="h-5 w-5 animate-spin"
                      viewBox="0 0 24 24"
                      fill="none"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
                      />
                    </svg>
                    Saving...
                  </span>
                ) : (
                  "Save Changes"
                )}
              </button>
            </div>
          </form>
        </div>

        {/* Stripe Connect sidebar */}
        <div className="lg:col-span-1">
          <div className="apple-card">
            <h2 className="font-display text-title-3 text-primary mb-4">
              Payouts
            </h2>

            {profile?.stripe_onboarding_complete ? (
              <div>
                <div className="mb-4 flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-apple-green/10">
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="text-apple-green"
                    >
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  </div>
                  <span className="text-subheadline font-medium text-apple-green">
                    Stripe Connected
                  </span>
                </div>
                <p className="text-subheadline text-secondary">
                  Your Stripe account is connected. Payouts will be sent
                  directly to your bank account.
                </p>
              </div>
            ) : (
              <div>
                <p className="mb-4 text-subheadline text-secondary">
                  Connect your Stripe account to receive commission payouts
                  directly to your bank account.
                </p>

                <button
                  onClick={handleStripeConnect}
                  disabled={connectingStripe}
                  className="btn-primary w-full"
                >
                  {connectingStripe ? (
                    <span className="flex items-center gap-2">
                      <svg
                        className="h-5 w-5 animate-spin"
                        viewBox="0 0 24 24"
                        fill="none"
                      >
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                        />
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
                        />
                      </svg>
                      Connecting...
                    </span>
                  ) : (
                    <span className="flex items-center gap-2">
                      <svg
                        width="20"
                        height="20"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <rect
                          x="1"
                          y="4"
                          width="22"
                          height="16"
                          rx="2"
                          ry="2"
                        />
                        <line x1="1" y1="10" x2="23" y2="10" />
                      </svg>
                      Connect Stripe Account
                    </span>
                  )}
                </button>

                <p className="mt-3 text-caption-1 text-tertiary text-center">
                  You&apos;ll be redirected to Stripe to complete onboarding.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
