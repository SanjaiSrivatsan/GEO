import { useMemo, useState, useEffect, useCallback } from "react";
import {
  AlertTriangle,
  ArrowRight,
  Check,
  CheckCircle2,
  LogOut,
  MessageSquare,
  RefreshCw,
  Search,
  ShieldCheck,
} from "lucide-react";
import type { BusinessDetails } from "../types";
import { getGoogleAuthUrl, getGoogleConnectionStatus, getGoogleLocations } from "../utils/api";

type ConnectGooglePageProps = {
  onConnect: (details: BusinessDetails) => void;
  onSkip?: () => void;
  onLogout?: () => void;
};

type LocationStatus = "Verified" | "Needs attention" | "Limited access" | "Not eligible";

type GoogleProfile = BusinessDetails & {
  id: string;
  city: string;
  state: string;
  reviews: number;
  status: LocationStatus;
};

type ConnectionError = "oauth_failed" | "token_expired" | "permissions" | "rate_limit";

const statusStyles: Record<LocationStatus, { icon: string; badgeClass: string }> = {
  Verified: { icon: "✅", badgeClass: "bg-emerald-400/10 text-emerald-200" },
  "Needs attention": { icon: "⚠️", badgeClass: "bg-amber-400/10 text-amber-200" },
  "Limited access": { icon: "🔒", badgeClass: "bg-slate-500/20 text-slate-300" },
  "Not eligible": { icon: "⛔", badgeClass: "bg-rose-500/10 text-rose-200" },
};

const errorCopy: Record<ConnectionError, { title: string; description: string; actionLabel: string }> = {
  oauth_failed: {
    title: "Google sign-in failed",
    description: "Something interrupted Google OAuth. Try connecting again.",
    actionLabel: "Try again",
  },
  token_expired: {
    title: "Session expired — reconnect Google",
    description: "Refresh your Google connection so GEO can keep syncing.",
    actionLabel: "Reconnect",
  },
  permissions: {
    title: "We can’t access some locations",
    description: "Ask an admin for access or switch to a different Google account.",
    actionLabel: "Switch account",
  },
  rate_limit: {
    title: "Google is busy right now",
    description: "Wait a moment and retry to finish connecting.",
    actionLabel: "Retry",
  },
};

const valueHighlights = [
  {
    title: "Reviews",
    detail: "Spot keywords, sentiment, and reply faster.",
    icon: MessageSquare,
  },
  {
    title: "Business info",
    detail: "Keep hours, categories, and details consistent.",
    icon: ShieldCheck,
  },
  {
    title: "Fresh updates",
    detail: "Track Q&A, posts, and changes—so nothing goes stale.",
    icon: RefreshCw,
  },
];

export default function ConnectGooglePage({ onConnect, onSkip, onLogout }: ConnectGooglePageProps) {
  const [selectedProfiles, setSelectedProfiles] = useState<Set<string>>(new Set());
  const [googleProfiles, setGoogleProfiles] = useState<GoogleProfile[]>([]);
  const [connectionState, setConnectionState] = useState<"disconnected" | "connecting" | "connected">("disconnected");
  const [connectedEmail, setConnectedEmail] = useState("");
  const [connectionIssue, setConnectionIssue] = useState<ConnectionError | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState<"All" | "Verified" | "Needs attention">("All");
  const [isSyncing, setIsSyncing] = useState(false);
  const [formError, setFormError] = useState("");

  const filteredProfiles = useMemo(() => {
    return googleProfiles.filter((profile) => {
      const matchesSearch =
        !searchTerm ||
        profile.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        profile.city.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus =
        filterStatus === "All" ||
        (filterStatus === "Verified" && profile.status === "Verified") ||
        (filterStatus === "Needs attention" && profile.status === "Needs attention");
      return matchesSearch && matchesStatus;
    });
  }, [filterStatus, searchTerm, googleProfiles]);

  const permissionIssueActive = connectionState === "connected" && googleProfiles.some((profile) => profile.status === "Limited access");

  const loadLocations = useCallback(async () => {
    try {
      const response = await getGoogleLocations();
      const mappedProfiles: GoogleProfile[] = response.locations.map((loc) => ({
        id: loc.google_location_id,
        name: loc.name,
        category: loc.category,
        primaryLocation: loc.full_address,
        website: loc.website || "",
        brandVoice: "",
        mainGoal: "",
        city: loc.city,
        state: loc.state,
        reviews: 0,
        status:
          loc.verification_state === "VERIFIED"
            ? "Verified"
            : loc.status === "OPEN"
            ? "Verified"
            : "Needs attention",
      }));
      setGoogleProfiles(mappedProfiles);
      const verifiedIds = mappedProfiles
        .filter((p) => p.status === "Verified")
        .map((p) => p.id);
      setSelectedProfiles(new Set(verifiedIds));
    } catch {
      setConnectionIssue("oauth_failed");
      setFormError("Connected, but failed to load locations from Google.");
    }
  }, []);

  // Detect OAuth callback params in the URL (?google_connected=true or ?google_error=...)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const googleConnected = params.get("google_connected");
    const googleError = params.get("google_error");

    if (googleConnected === "true") {
      const email = params.get("email") || "";
      setConnectedEmail(email);
      setConnectionState("connected");
      // Clean the URL so a page refresh doesn't replay this
      window.history.replaceState({}, "", window.location.pathname);
      loadLocations();
    } else if (googleError) {
      setConnectionIssue("oauth_failed");
      setFormError(decodeURIComponent(googleError.replace(/\+/g, " ")));
      window.history.replaceState({}, "", window.location.pathname);
    } else {
      // Check if already connected (page refresh / returning user)
      getGoogleConnectionStatus()
        .then((status) => {
          if (status.connected && status.email) {
            setConnectedEmail(status.email);
            setConnectionState("connected");
            loadLocations();
          }
        })
        .catch(() => {
          // Not connected yet — ignore
        });
    }
  }, [loadLocations]);

  const banners = useMemo(() => {
    const items: Array<{ type: ConnectionError; title: string; description: string; actionLabel: string }> = [];
    if (connectionIssue) {
      items.push({ type: connectionIssue, ...errorCopy[connectionIssue] });
    }
    if (permissionIssueActive && !items.find((banner) => banner.type === "permissions")) {
      items.push({ type: "permissions", ...errorCopy.permissions });
    }
    return items;
  }, [connectionIssue, permissionIssueActive]);

  const handleGoogleSignIn = async () => {
    setConnectionIssue(null);
    setConnectionState("connecting");
    setFormError("");
    try {
      // Get the OAuth URL from the backend (includes user identity in state parameter)
      const { authorization_url } = await getGoogleAuthUrl();
      // Redirect the browser to Google's consent screen
      window.location.href = authorization_url;
    } catch {
      setConnectionIssue("oauth_failed");
      setConnectionState("disconnected");
      setFormError("Failed to get Google sign-in URL. Is the backend running?");
    }
  };

  const handleSwitchAccount = () => {
    setSelectedProfiles(new Set<string>());
    setConnectedEmail("");
    setConnectionState("disconnected");
    setConnectionIssue(null);
    setGoogleProfiles([]);
  };

  const toggleProfile = (profileId: string, status: LocationStatus) => {
    if (status === "Limited access" || status === "Not eligible") {
      setConnectionIssue("permissions");
      return;
    }
    setSelectedProfiles((prev) => {
      const next = new Set(prev);
      if (next.has(profileId)) {
        next.delete(profileId);
      } else {
        next.add(profileId);
      }
      return next;
    });
  };

  const handleStartSync = async () => {
    if (selectedProfiles.size === 0) {
      setFormError("Select at least one location to start syncing.");
      return;
    }
    setFormError("");
    setIsSyncing(true);
    try {
      // Build BusinessDetails from the first selected profile to pass into the app flow
      const firstSelected = googleProfiles.find((p) => selectedProfiles.has(p.id));
      const details: BusinessDetails = firstSelected
        ? {
            name: firstSelected.name,
            category: firstSelected.category,
            primaryLocation: `${firstSelected.city}, ${firstSelected.state}`,
            website: firstSelected.website || "",
            brandVoice: "",
            mainGoal: "",
          }
        : { name: "", category: "", primaryLocation: "", website: "", brandVoice: "", mainGoal: "" };
      onConnect(details);
    } catch {
      setFormError("Failed to proceed. Please try again.");
    } finally {
      setIsSyncing(false);
    }
  };

  const selectedCount = selectedProfiles.size;
  const syncCountLabel = connectionState === "connected" ? selectedCount : 0;
  const startSyncDisabled = connectionState !== "connected" || selectedCount === 0 || isSyncing;

  const handleBannerAction = (type: ConnectionError) => {
    if (type === "permissions") {
      handleSwitchAccount();
      return;
    }
    if (type === "token_expired") {
      setConnectionIssue(null);
      handleGoogleSignIn();
      return;
    }
    if (type === "oauth_failed" || type === "rate_limit") {
      setConnectionIssue(null);
      handleGoogleSignIn();
    }
  };

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="mx-auto flex max-w-6xl flex-col gap-10 px-6 py-10">
        <header className="flex flex-col gap-4 border-b border-white/10 pb-6 md:flex-row md:items-center md:justify-between">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-black/70 px-4 py-2 -ml-6 md:-ml-16 transform -translate-x-4 md:-translate-x-14">
            <span className="rounded-lg bg-black px-3 py-1 text-base font-display uppercase tracking-[0.4em] text-[#7bf542] font-black">
              GEO
            </span>
            <span className="text-base font-display uppercase tracking-[0.4em] text-white font-black">AI</span>
          </div>
          <button
            type="button"
            onClick={onLogout}
            className="inline-flex items-center gap-2 rounded-full border border-white/20 px-4 py-2 text-sm font-semibold text-white/80 hover:border-white hover:text-white"
          >
            <LogOut size={14} />
            Logout
          </button>
        </header>

        <section className="flex flex-col gap-2">
          <p className="text-xs uppercase tracking-[0.4em] text-[#7bf542]">Step 1 · Connect</p>
          <div className="space-y-3">
            <h1 className="text-3xl font-display font-semibold">Connect Google Business</h1>
            <p className="text-base text-white/80">
              Pick the locations you want GEO to improve. We’ll pull your business info, reviews, and updates.
            </p>
            <p className="text-sm text-white/60">Read-only access. You stay in control.</p>
          </div>
        </section>

        {banners.length > 0 ? (
          <div className="space-y-3">
            {banners.map((banner) => (
              <div
                key={banner.type}
                className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-amber-400/30 bg-amber-400/10 px-4 py-3 text-sm text-amber-100"
              >
                <div className="flex items-center gap-2">
                  <AlertTriangle size={16} className="text-amber-200" />
                  <div>
                    <p className="font-semibold">{banner.title}</p>
                    <p className="text-xs text-amber-100/80">{banner.description}</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => handleBannerAction(banner.type)}
                  className="rounded-full border border-amber-200/40 px-3 py-1 text-xs font-semibold text-amber-50 transition hover:border-amber-100"
                >
                  {banner.actionLabel}
                </button>
              </div>
            ))}
          </div>
        ) : null}

        <div className="grid gap-10 lg:grid-cols-[1.1fr_0.9fr] lg:gap-14">
          <div className="space-y-8">
            <section className="rounded-3xl border border-white/10 bg-gradient-to-r from-white/10 to-transparent p-6">
              <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div className="flex items-start gap-4">
                  <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white text-black">
                    <GoogleLogoIcon />
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-[0.3em] text-white/60">Google Business</p>
                    <h2 className="text-xl font-semibold">Sign in to see your locations</h2>
                    <p className="text-sm text-white/70">Connect once to import your locations securely.</p>
                  </div>
                </div>
                <div className="flex-1 space-y-3 md:flex-none">
                  {connectionState === "connected" ? (
                    <div className="flex flex-col items-start gap-2 text-sm text-emerald-200">
                      <span className="inline-flex items-center gap-2 rounded-full border border-emerald-400/40 bg-emerald-400/10 px-3 py-1 text-emerald-50">
                        <CheckCircle2 size={16} />
                        Connected as {connectedEmail}
                      </span>
                      <button
                        type="button"
                        onClick={handleSwitchAccount}
                        className="text-xs font-semibold text-white/70 underline-offset-4 hover:text-white hover:underline"
                      >
                        Switch account
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={handleGoogleSignIn}
                      disabled={connectionState === "connecting"}
                      className="flex w-full items-center justify-center gap-2 rounded-full border border-white/30 px-5 py-3 text-sm font-semibold text-white transition hover:border-white hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {connectionState === "connecting" ? "Opening Google…" : "Continue with Google"}
                    </button>
                  )}
                  <p className="text-xs text-white/60">We never post or reply without your approval.</p>
                </div>
              </div>
            </section>

            {connectionState === "connected" ? (
              <section className="rounded-3xl border border-white/10 bg-white/5 p-6">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <h2 className="text-lg font-semibold">Choose locations to connect</h2>
                    <p className="text-sm text-white/60">
                      Select the locations you want to win in AI + local search.
                    </p>
                  </div>
                  <span className="rounded-full border border-white/15 px-3 py-1 text-xs text-white/70">
                    {selectedCount} selected
                  </span>
                </div>

                <div className="mt-5 flex flex-wrap items-center gap-3">
                  <div className="relative min-w-[200px] flex-1">
                    <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-white/40" />
                    <input
                      type="search"
                      value={searchTerm}
                      onChange={(event) => setSearchTerm(event.target.value)}
                      placeholder="Search locations"
                      className="w-full rounded-full border border-white/15 bg-black/40 py-2 pl-9 pr-3 text-sm text-white placeholder:text-white/40 focus:border-white focus:outline-none"
                    />
                  </div>
                  <div className="flex gap-2">
                    {(["All", "Verified", "Needs attention"] as const).map((status) => (
                      <button
                        key={status}
                        type="button"
                        onClick={() => setFilterStatus(status)}
                        className={`rounded-full px-3 py-1 text-xs font-semibold ${
                          filterStatus === status
                            ? "bg-white text-black"
                            : "border border-white/15 text-white/70 hover:border-white/40"
                        }`}
                      >
                        {status}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="mt-6 space-y-3">
                  {filteredProfiles.length === 0 ? (
                    <div className="rounded-2xl border border-white/10 bg-black/40 p-6 text-center">
                      <h3 className="text-lg font-semibold">No locations found</h3>
                      <p className="mt-2 text-sm text-white/70">
                        We couldn’t find locations in this Google account. Try another account or check permissions.
                      </p>
                      <div className="mt-4 flex flex-wrap items-center justify-center gap-3 text-sm">
                        <button
                          type="button"
                          onClick={handleSwitchAccount}
                          className="rounded-full border border-white/30 px-4 py-2 text-white/80 hover:border-white hover:text-white"
                        >
                          Switch account
                        </button>
                        <button
                          type="button"
                          className="rounded-full border border-white/10 px-4 py-2 text-white/70 hover:border-white/30"
                        >
                          Help
                        </button>
                      </div>
                    </div>
                  ) : (
                    filteredProfiles.map((profile) => {
                      const isSelected = selectedProfiles.has(profile.id);
                      const statusStyle = statusStyles[profile.status];
                      const isDisabled = profile.status === "Limited access" || profile.status === "Not eligible";
                      return (
                        <button
                          key={profile.id}
                          type="button"
                          onClick={() => toggleProfile(profile.id, profile.status)}
                          disabled={isDisabled}
                          className={`flex w-full items-center justify-between gap-4 rounded-2xl border px-5 py-4 text-left transition ${
                            isSelected
                              ? "border-[#7bf542]/80 bg-[#7bf542]/10"
                              : "border-white/10 bg-white/5 hover:border-white/30"
                          } ${isDisabled ? "cursor-not-allowed opacity-60" : ""}`}
                        >
                          <div>
                            <p className="text-base font-semibold">{profile.name}</p>
                            <p className="text-sm text-white/70">
                              {profile.city}, {profile.state}
                            </p>
                            <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-white/60">
                              <span>{profile.reviews} reviews</span>
                              <span className="text-white/30">•</span>
                              <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] ${statusStyle.badgeClass}`}>
                                <span>{statusStyle.icon}</span>
                                {profile.status}
                              </span>
                              {profile.status === "Needs attention" ? (
                                <>
                                  <span className="text-white/30">•</span>
                                  <span>Profile needs updates</span>
                                </>
                              ) : null}
                            </div>
                          </div>
                          <span
                            className={`flex h-6 w-6 items-center justify-center rounded-full border ${
                              isSelected ? "border-[#7bf542] bg-[#7bf542]/20 text-[#7bf542]" : "border-white/20 text-white/40"
                            }`}
                          >
                            {isSelected ? <Check size={14} /> : null}
                          </span>
                        </button>
                      );
                    })
                  )}
                </div>
              </section>
            ) : (
              <section className="rounded-3xl border border-dashed border-white/20 p-10 text-center text-white/70">
                <p className="text-lg font-semibold text-white">
                  Connect Google to pick your locations.
                </p>
                <p className="mt-2 text-sm">
                  OAuth keeps your business data secure. Once connected, we’ll list every location tied to this account.
                </p>
              </section>
            )}
          </div>

          <aside className="space-y-6">
            <section className="rounded-3xl border border-white/10 bg-gradient-to-b from-white/10 to-black/60 p-6">
              <div>
                <p className="text-sm font-semibold text-white">What GEO improves</p>
                <p className="text-sm text-white/60">Fresh data keeps your recommendations accurate.</p>
              </div>
              <ul className="mt-6 space-y-4">
                {valueHighlights.map((highlight) => (
                  <li key={highlight.title} className="flex items-start gap-3 rounded-2xl border border-white/10 bg-black/40 p-4">
                    <span className="rounded-full bg-white/10 p-2 text-[#7bf542]">
                      <highlight.icon size={16} />
                    </span>
                    <div>
                      <p className="text-sm font-semibold text-white">{highlight.title}</p>
                      <p className="text-xs text-white/60">{highlight.detail}</p>
                    </div>
                  </li>
                ))}
              </ul>
              <p className="mt-4 text-xs text-white/60">You’re setting the foundation assistants trust.</p>
            </section>

            <section className="rounded-3xl border border-white/10 bg-white/5 p-6">
              <div className="space-y-3">
                <button
                  type="button"
                  onClick={handleStartSync}
                  disabled={startSyncDisabled}
                  className="flex w-full items-center justify-center gap-2 rounded-full border border-[#7bf542] bg-[#7bf542]/10 px-5 py-3 text-sm font-semibold text-[#7bf542] transition hover:bg-[#7bf542]/20 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isSyncing ? (
                    "Starting sync..."
                  ) : (
                    <>
                      Start sync ({syncCountLabel || 0} {syncCountLabel === 1 ? "location" : "locations"})
                      <ArrowRight size={14} />
                    </>
                  )}
                </button>
                {onSkip ? (
                  <button
                    type="button"
                    onClick={onSkip}
                    className="w-full rounded-full border border-white/10 px-5 py-3 text-sm font-semibold text-white/70 transition hover:border-white/30 hover:text-white"
                  >
                    Not now
                  </button>
                ) : null}
                {formError ? (
                  <p className="text-xs text-rose-300">{formError}</p>
                ) : null}
                {isSyncing ? (
                  <p className="text-xs text-white/70">
                    Nice — syncing now. Next: we’ll show your first quick wins.
                  </p>
                ) : (
                  <p className="text-xs text-white/60">Next: Quick Wins</p>
                )}
              </div>
            </section>
          </aside>
        </div>
      </div>
    </div>
  );
}

function GoogleLogoIcon() {
  return (
    <svg viewBox="0 0 533.5 544.3" className="h-7 w-7" aria-hidden="true">
      <path
        d="M533.5 278.4c0-18.6-1.5-37.2-4.6-55.4H272.1v105.1h147.1c-6.2 34.4-26.1 64-55.7 83.6v69.3h89.6c52.5-48.3 80.4-119.5 80.4-202.6z"
        fill="#4285f4"
      />
      <path
        d="M272.1 544.3c75.6 0 139.2-25.1 185.6-68.3l-89.6-69.3c-24.9 16.7-56.7 26.4-96 26.4-73.7 0-136.1-49.8-158.4-116.8H21.7v73.4c46.2 90.4 140.8 154.6 250.4 154.6z"
        fill="#34a853"
      />
      <path
        d="M113.7 316.3c-11.4-34-11.4-70.7 0-104.7V138.2H21.7c-43.3 85.9-43.3 187.1 0 273l92-69.1z"
        fill="#fbbc05"
      />
      <path
        d="M272.1 107.7c39.7-.6 77.9 14 107 40.9l79.7-79.7C407 24 342.5-.2 272.1 0 162.5 0 67.9 64.2 21.7 154.6l92 73.4c22.3-67.1 84.7-120.3 158.4-120.3z"
        fill="#ea4335"
      />
    </svg>
  );
}
