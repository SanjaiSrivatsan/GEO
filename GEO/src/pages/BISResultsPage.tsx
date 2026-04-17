/**
 * BIS Results Page — Brand Intelligence System
 *
 * Standalone page (separate from the GEO Dashboard) that displays
 * the full results of a Brand Intelligence Scan:
 *   1. Scan Summary Header
 *   2. Source Breakdown
 *   3. Mentions Feed (filterable)
 *   4. Analytics
 *   5. Scraping Log History
 */

import { useState, useEffect } from "react";
import {
  fetchBISResults,
  fetchBISMentions,
  startBISScan,
  getCurrentBusinessProfile,
  APIError,
  type BISResultsResponse,
  type BISMentionResponse,
  type BISScanSummaryResponse,
} from "../utils/api";

type BISResultsPageProps = {
  businessName: string;
  onBack: () => void;
  onLogout?: () => void;
};

const SENTIMENT_COLORS: Record<string, string> = {
  positive: "bg-green-500/20 text-green-400 border-green-500/30",
  neutral: "bg-gray-500/20 text-gray-400 border-gray-500/30",
  negative: "bg-red-500/20 text-red-400 border-red-500/30",
  mixed: "bg-amber-500/20 text-amber-400 border-amber-500/30",
};

const SOURCE_ICONS: Record<string, string> = {
  google_cse: "🔎",
  youtube: "▶️",
  news: "📰",
  justdial: "📍",
  web_search: "🌐",
};

export default function BISResultsPage({
  businessName,
  onBack,
  onLogout,
}: BISResultsPageProps) {
  const [businessId, setBusinessId] = useState<string>("");
  const [results, setResults] = useState<BISResultsResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  // Scan state
  const [isScanning, setIsScanning] = useState(false);
  const [scanSummary, setScanSummary] = useState<BISScanSummaryResponse | null>(
    null,
  );

  // Mention filter state
  const [filterSource, setFilterSource] = useState<string>("");
  const [filterSentiment, setFilterSentiment] = useState<string>("");
  const [filterType, setFilterType] = useState<string>("");
  const [filteredMentions, setFilteredMentions] = useState<
    BISMentionResponse[]
  >([]);
  const [isFiltering, setIsFiltering] = useState(false);

  // Active UI section
  const [activeTab, setActiveTab] = useState<"mentions" | "analytics" | "logs">(
    "mentions",
  );

  useEffect(() => {
    async function init() {
      try {
        setIsLoading(true);
        setError("");
        const profile = await getCurrentBusinessProfile();
        setBusinessId(profile.id);
        const data = await fetchBISResults(profile.id);
        setResults(data);
        setFilteredMentions(data.mentions);
      } catch (err) {
        if (err instanceof APIError && err.status === 404) {
          setError("No BIS data found. Run a Brand Intelligence Scan first.");
        } else {
          setError("Failed to load BIS results.");
        }
      } finally {
        setIsLoading(false);
      }
    }
    init();
  }, []);

  async function loadResults() {
    if (!businessId) return;
    try {
      setIsLoading(true);
      setError("");
      const data = await fetchBISResults(businessId);
      setResults(data);
      setFilteredMentions(data.mentions);
    } catch (err) {
      if (err instanceof APIError && err.status === 404) {
        setError("No BIS data found. Run a Brand Intelligence Scan first.");
      } else {
        setError("Failed to load BIS results.");
      }
    } finally {
      setIsLoading(false);
    }
  }

  async function handleRunScan() {
    try {
      setIsScanning(true);
      setError("");
      const summary = await startBISScan(businessId);
      setScanSummary(summary);
      // Reload full results after scan
      await loadResults();
    } catch (err) {
      setError(err instanceof APIError ? err.message : "Scan failed.");
    } finally {
      setIsScanning(false);
    }
  }

  async function handleApplyFilters() {
    if (!results?.brand) return;
    try {
      setIsFiltering(true);
      const filters: Record<string, string> = {};
      if (filterSource) filters.source_type = filterSource;
      if (filterSentiment) filters.sentiment = filterSentiment;
      if (filterType) filters.mention_type = filterType;

      const resp = await fetchBISMentions(results.brand.id, filters);
      setFilteredMentions(resp.mentions);
    } catch {
      // fall back to client-side filter
      let m = results?.mentions ?? [];
      if (filterSource) m = m.filter((x) => x.source_type === filterSource);
      if (filterSentiment) m = m.filter((x) => x.sentiment === filterSentiment);
      if (filterType) m = m.filter((x) => x.mention_type === filterType);
      setFilteredMentions(m);
    } finally {
      setIsFiltering(false);
    }
  }

  function resetFilters() {
    setFilterSource("");
    setFilterSentiment("");
    setFilterType("");
    setFilteredMentions(results?.mentions ?? []);
  }

  // ---------------------------------------------------------------------------
  // Render helpers
  // ---------------------------------------------------------------------------

  function renderScanSummary() {
    const stats = results?.stats;
    if (!stats && !scanSummary) return null;

    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          label="Total Mentions"
          value={stats?.total_mentions ?? scanSummary?.total_mentions ?? 0}
        />
        <StatCard
          label="Sources Scanned"
          value={
            stats
              ? Object.keys(stats.by_source).length
              : scanSummary
                ? Object.keys(scanSummary.sources).length
                : 0
          }
        />
        <StatCard
          label="Positive"
          value={stats?.by_sentiment?.positive ?? 0}
          color="text-green-400"
        />
        <StatCard
          label="Negative"
          value={stats?.by_sentiment?.negative ?? 0}
          color="text-red-400"
        />
      </div>
    );
  }

  function renderSourceBreakdown() {
    const stats = results?.stats;
    if (!stats) return null;

    const total = stats.total_mentions || 1;
    return (
      <div className="space-y-3">
        <h3 className="text-lg font-semibold">Source Breakdown</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {Object.entries(stats.by_source).map(([src, count]) => (
            <div
              key={src}
              className="p-4 rounded-xl bg-white/5 border border-white/10 flex items-center gap-3"
            >
              <span className="text-2xl">{SOURCE_ICONS[src] ?? "📌"}</span>
              <div className="flex-1">
                <p className="text-sm font-medium capitalize">
                  {src.replace(/_/g, " ")}
                </p>
                <div className="mt-1 h-1.5 rounded-full bg-white/10 overflow-hidden">
                  <div
                    className="h-full bg-indigo-500 rounded-full"
                    style={{ width: `${Math.round((count / total) * 100)}%` }}
                  />
                </div>
              </div>
              <span className="text-sm font-bold text-indigo-400">{count}</span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  function renderMentionsFeed() {
    return (
      <div className="space-y-4">
        {/* Filters */}
        <div className="flex flex-wrap gap-3 items-end">
          <FilterSelect
            label="Source"
            value={filterSource}
            onChange={setFilterSource}
            options={[
              "google_cse",
              "youtube",
              "news",
              "justdial",
              "web_search",
            ]}
          />
          <FilterSelect
            label="Sentiment"
            value={filterSentiment}
            onChange={setFilterSentiment}
            options={["positive", "neutral", "negative", "mixed"]}
          />
          <FilterSelect
            label="Type"
            value={filterType}
            onChange={setFilterType}
            options={["direct", "indirect", "competitor", "industry"]}
          />
          <button
            onClick={handleApplyFilters}
            disabled={isFiltering}
            className="px-4 py-2 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition disabled:opacity-50"
          >
            {isFiltering ? "Filtering..." : "Apply"}
          </button>
          <button
            onClick={resetFilters}
            className="px-4 py-2 text-sm bg-gray-700 text-gray-300 rounded-lg hover:bg-gray-600 transition"
          >
            Reset
          </button>
          <span className="ml-auto text-sm text-gray-400">
            {filteredMentions.length} mention
            {filteredMentions.length !== 1 ? "s" : ""}
          </span>
        </div>

        {/* Mention cards */}
        <div className="space-y-3 max-h-[600px] overflow-y-auto pr-1">
          {filteredMentions.length === 0 ? (
            <p className="text-gray-500 text-sm py-8 text-center">
              No mentions match the current filters.
            </p>
          ) : (
            filteredMentions.map((m) => (
              <div
                key={m.id}
                className="p-4 rounded-xl border border-white/10 bg-white/5 space-y-2"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <span>{SOURCE_ICONS[m.source_type] ?? "📌"}</span>
                    <span className="text-sm font-semibold capitalize">
                      {m.source_type.replace(/_/g, " ")}
                    </span>
                    <span
                      className={`px-2 py-0.5 text-xs rounded-full border ${SENTIMENT_COLORS[m.sentiment] ?? SENTIMENT_COLORS.neutral}`}
                    >
                      {m.sentiment}
                    </span>
                    <span className="px-2 py-0.5 text-xs rounded-full bg-white/10 text-gray-300">
                      {m.mention_type}
                    </span>
                  </div>
                  <span className="text-xs text-gray-500 whitespace-nowrap">
                    {m.discovered_at
                      ? new Date(m.discovered_at).toLocaleDateString()
                      : "—"}
                  </span>
                </div>
                {m.title && (
                  <p className="text-sm font-medium text-white/90">{m.title}</p>
                )}
                <p className="text-sm text-gray-400 line-clamp-3">
                  {m.snippet}
                </p>
                <div className="flex items-center gap-4 text-xs text-gray-500">
                  <span>{m.source_domain}</span>
                  <span>Relevance {(m.relevance_score * 100).toFixed(0)}%</span>
                  <span>Sentiment {(m.sentiment_score * 100).toFixed(0)}%</span>
                  {m.source_url && (
                    <a
                      href={m.source_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-indigo-400 hover:underline ml-auto"
                    >
                      Open source ↗
                    </a>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    );
  }

  function renderAnalytics() {
    const stats = results?.stats;
    if (!stats)
      return (
        <p className="text-gray-500 text-sm">No analytics data available.</p>
      );

    return (
      <div className="space-y-6">
        {/* Sentiment distribution */}
        <div>
          <h3 className="text-lg font-semibold mb-3">Sentiment Distribution</h3>
          <div className="flex gap-2 h-8">
            {(["positive", "neutral", "negative", "mixed"] as const).map(
              (s) => {
                const count = stats.by_sentiment?.[s] ?? 0;
                const pct = stats.total_mentions
                  ? (count / stats.total_mentions) * 100
                  : 0;
                if (pct === 0) return null;
                const colors: Record<string, string> = {
                  positive: "bg-green-500",
                  neutral: "bg-gray-500",
                  negative: "bg-red-500",
                  mixed: "bg-amber-500",
                };
                return (
                  <div
                    key={s}
                    className={`${colors[s]} rounded-lg flex items-center justify-center text-xs font-semibold`}
                    style={{ width: `${pct}%`, minWidth: pct > 0 ? "2rem" : 0 }}
                    title={`${s}: ${count}`}
                  >
                    {pct >= 10 ? `${Math.round(pct)}%` : ""}
                  </div>
                );
              },
            )}
          </div>
          <div className="flex gap-4 mt-2 text-xs text-gray-400">
            {Object.entries(stats.by_sentiment ?? {}).map(([s, c]) => (
              <span key={s} className="capitalize">
                {s}: {c}
              </span>
            ))}
          </div>
        </div>

        {/* Mention Type breakdown */}
        <div>
          <h3 className="text-lg font-semibold mb-3">Mention Types</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {Object.entries(stats.by_type ?? {}).map(([t, c]) => (
              <div
                key={t}
                className="p-3 rounded-xl bg-white/5 border border-white/10 text-center"
              >
                <p className="text-xs text-gray-400 capitalize">{t}</p>
                <p className="text-xl font-bold text-white mt-1">{c}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Top Domains */}
        <div>
          <h3 className="text-lg font-semibold mb-3">Top Domains</h3>
          <div className="space-y-2">
            {(stats.top_domains ?? []).map((d, i) => (
              <div
                key={d.domain}
                className="flex items-center gap-3 p-3 rounded-xl bg-white/5 border border-white/10"
              >
                <span className="text-sm font-bold text-indigo-400 w-6 text-center">
                  {i + 1}
                </span>
                <span className="flex-1 text-sm truncate">{d.domain}</span>
                <span className="text-sm font-semibold">{d.count}</span>
              </div>
            ))}
            {(!stats.top_domains || stats.top_domains.length === 0) && (
              <p className="text-gray-500 text-sm">No domain data.</p>
            )}
          </div>
        </div>
      </div>
    );
  }

  function renderLogs() {
    const logs = results?.logs ?? [];
    if (logs.length === 0)
      return (
        <p className="text-gray-500 text-sm">No scraping logs available.</p>
      );

    return (
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-gray-400 border-b border-white/10">
              <th className="pb-2 pr-4">Source</th>
              <th className="pb-2 pr-4">Status</th>
              <th className="pb-2 pr-4">Queries</th>
              <th className="pb-2 pr-4">Found</th>
              <th className="pb-2 pr-4">Stored</th>
              <th className="pb-2 pr-4">Duration</th>
              <th className="pb-2">Time</th>
            </tr>
          </thead>
          <tbody>
            {logs.map((log) => (
              <tr key={log.id} className="border-b border-white/5">
                <td className="py-2 pr-4 capitalize">
                  {log.source_type.replace(/_/g, " ")}
                </td>
                <td className="py-2 pr-4">
                  <span
                    className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                      log.status === "success"
                        ? "bg-green-500/20 text-green-400"
                        : log.status === "partial"
                          ? "bg-amber-500/20 text-amber-400"
                          : "bg-red-500/20 text-red-400"
                    }`}
                  >
                    {log.status}
                  </span>
                </td>
                <td className="py-2 pr-4">{log.queries_executed}</td>
                <td className="py-2 pr-4">{log.results_found}</td>
                <td className="py-2 pr-4">{log.results_stored}</td>
                <td className="py-2 pr-4">
                  {(log.duration_ms / 1000).toFixed(1)}s
                </td>
                <td className="py-2 text-gray-500 text-xs">
                  {log.started_at
                    ? new Date(log.started_at).toLocaleString()
                    : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // Main render
  // ---------------------------------------------------------------------------

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#0b0b0f] text-white flex items-center justify-center">
        <div className="text-center space-y-3">
          <div className="inline-block w-8 h-8 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin" />
          <p className="text-gray-400">Loading Brand Intelligence data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0b0b0f] text-white px-4 md:px-6 py-6 md:py-10">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <header className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-wider text-indigo-400 mb-1">
              BRAND INTELLIGENCE SYSTEM
            </p>
            <h1 className="text-2xl md:text-3xl font-bold mb-1">
              {businessName}
            </h1>
            {results?.brand?.last_scanned_at && (
              <p className="text-sm text-gray-400">
                Last scanned:{" "}
                {new Date(results.brand.last_scanned_at).toLocaleString()}
              </p>
            )}
          </div>
          <div className="flex flex-wrap gap-3">
            <button
              onClick={handleRunScan}
              disabled={isScanning}
              className="px-5 py-2.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
            >
              {isScanning ? (
                <>
                  <span className="inline-block animate-spin mr-2">⏳</span>
                  Scanning...
                </>
              ) : (
                "🔍 Run BIS Scan"
              )}
            </button>
            <button
              onClick={onBack}
              className="px-4 py-2 text-sm bg-gray-800 text-gray-300 rounded-lg hover:bg-gray-700 transition"
            >
              ← Back to Dashboard
            </button>
            {onLogout && (
              <button
                onClick={onLogout}
                className="px-4 py-2 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700 transition"
              >
                Logout
              </button>
            )}
          </div>
        </header>

        {/* Error banner */}
        {error && (
          <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
            {error}
          </div>
        )}

        {/* Scan summary banner */}
        {scanSummary && (
          <div className="p-4 rounded-xl bg-green-500/10 border border-green-500/30 text-green-400 text-sm">
            Scan complete — {scanSummary.total_mentions} mentions found across{" "}
            {Object.keys(scanSummary.sources).length} sources.
          </div>
        )}

        {/* Summary cards */}
        {renderScanSummary()}

        {/* Source breakdown */}
        {renderSourceBreakdown()}

        {/* Tab bar for lower panels */}
        <div className="flex gap-2 border-b border-white/10 pb-1">
          {(["mentions", "analytics", "logs"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 text-sm font-semibold rounded-t-lg transition capitalize ${
                activeTab === tab
                  ? "bg-white/10 text-white border-b-2 border-indigo-500"
                  : "text-gray-400 hover:text-white"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Tab content */}
        <div className="p-4 rounded-2xl border border-white/10 bg-white/5">
          {activeTab === "mentions" && renderMentionsFeed()}
          {activeTab === "analytics" && renderAnalytics()}
          {activeTab === "logs" && renderLogs()}
        </div>
      </div>
    </div>
  );
}

// =============================================================================
// Small helper components
// =============================================================================

function StatCard({
  label,
  value,
  color = "text-white",
}: {
  label: string;
  value: number | string;
  color?: string;
}) {
  return (
    <div className="p-4 rounded-xl bg-white/5 border border-white/10 text-center">
      <p className="text-xs text-gray-400 uppercase tracking-wider">{label}</p>
      <p className={`text-2xl font-bold mt-1 ${color}`}>{value}</p>
    </div>
  );
}

function FilterSelect({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: string[];
}) {
  return (
    <div>
      <label className="text-xs text-gray-400 block mb-1">{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="bg-white/10 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
      >
        <option value="">All</option>
        {options.map((o) => (
          <option key={o} value={o} className="bg-gray-900 capitalize">
            {o.replace(/_/g, " ")}
          </option>
        ))}
      </select>
    </div>
  );
}
