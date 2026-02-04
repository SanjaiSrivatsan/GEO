/**
 * GEO Dashboard Page - Step 17
 * 
 * Comprehensive dashboard for visualizing GEO scores, prompt results, and evidence data.
 * Uses ONLY real API data - no mocks or placeholders.
 * 
 * Dashboard Sections:
 * 1. GEO Score Overview - Primary score with color-coded health indicator
 * 2. Score Breakdown - 4 dimensions (Presence, Accuracy, Trust, Penalty)
 * 3. Evidence Panels - Website Content, Google Reviews, Brand Mentions
 * 4. Prompt Results Viewer - All 22 prompts grouped by category
 * 5. Actions - Re-run analysis, Recompute score
 */

import { useState, useEffect } from "react";
import {
  getCurrentBusinessProfile,
  getGeoScore,
  computeGeoScore,
  getScoreBreakdown,
  getPromptResults,
  runGeoPrompts,
  getCrawlContent,
  syncGoogleReviews,
  getMentions,
  APIError,
  type BusinessProfileResponse,
  type GeoScoreResponse,
  type ScoreBreakdownResponse,
  type PromptResultsResponse,
  type PromptResultDetail,
} from "../utils/api";

type GeoDashboardPageProps = {
  onLogout?: () => void;
  onBackToSetup?: () => void;
};

export default function GeoDashboardPage({
  onLogout,
  onBackToSetup,
}: GeoDashboardPageProps) {
  // =========================================================================
  // STATE MANAGEMENT
  // =========================================================================

  // Business Profile
  const [businessProfile, setBusinessProfile] = useState<BusinessProfileResponse | null>(null);
  const [isLoadingProfile, setIsLoadingProfile] = useState(true);
  const [profileError, setProfileError] = useState<string>("");

  // GEO Score
  const [geoScore, setGeoScore] = useState<GeoScoreResponse | null>(null);
  const [isLoadingScore, setIsLoadingScore] = useState(false);
  const [scoreError, setScoreError] = useState<string>("");

  // Score Breakdown
  const [scoreBreakdown, setScoreBreakdown] = useState<ScoreBreakdownResponse | null>(null);

  // Prompt Results
  const [promptResults, setPromptResults] = useState<PromptResultsResponse | null>(null);
  const [isLoadingPrompts, setIsLoadingPrompts] = useState(false);
  const [promptsError, setPromptsError] = useState<string>("");

  // Evidence Data
  const [websiteContent, setWebsiteContent] = useState<any[]>([]);
  const [googleReviews, setGoogleReviews] = useState<any[]>([]);
  const [brandMentions, setBrandMentions] = useState<any[]>([]);
  const [isLoadingEvidence, setIsLoadingEvidence] = useState(false);

  // Action States
  const [isRunningPrompts, setIsRunningPrompts] = useState(false);
  const [isComputingScore, setIsComputingScore] = useState(false);

  // UI States
  const [activeSection, setActiveSection] = useState<"overview" | "evidence" | "prompts">("overview");
  const [activeEvidenceTab, setActiveEvidenceTab] = useState<"website" | "reviews" | "mentions">("website");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  // =========================================================================
  // DATA LOADING
  // =========================================================================

  // Load business profile on mount
  useEffect(() => {
    loadBusinessProfile();
  }, []);

  // Load GEO score when profile is loaded
  useEffect(() => {
    if (businessProfile?.id) {
      loadGeoScore();
      loadPromptResults();
      loadEvidenceData();
    }
  }, [businessProfile?.id]);

  async function loadBusinessProfile() {
    try {
      setIsLoadingProfile(true);
      setProfileError("");
      const profile = await getCurrentBusinessProfile();
      setBusinessProfile(profile);
    } catch (error) {
      console.error("Failed to load business profile:", error);
      if (error instanceof APIError) {
        if (error.status === 404) {
          setProfileError("No business profile found. Please complete setup first.");
        } else if (error.status === 401) {
          setProfileError("Session expired. Please login again.");
        } else {
          setProfileError("Failed to load business profile.");
        }
      } else {
        setProfileError("Network error. Please check your connection.");
      }
    } finally {
      setIsLoadingProfile(false);
    }
  }

  async function loadGeoScore() {
    if (!businessProfile?.id) return;

    try {
      setIsLoadingScore(true);
      setScoreError("");
      
      // Try to get existing score
      const score = await getGeoScore(businessProfile.id);
      setGeoScore(score);
      
      // Also load detailed breakdown
      const breakdown = await getScoreBreakdown(businessProfile.id);
      setScoreBreakdown(breakdown);
    } catch (error) {
      console.error("Failed to load GEO score:", error);
      if (error instanceof APIError && error.status === 404) {
        setScoreError("No GEO score found. Run prompts and compute score first.");
      } else {
        setScoreError("Failed to load GEO score.");
      }
    } finally {
      setIsLoadingScore(false);
    }
  }

  async function loadPromptResults() {
    if (!businessProfile?.id) return;

    try {
      setIsLoadingPrompts(true);
      setPromptsError("");
      const results = await getPromptResults(businessProfile.id);
      setPromptResults(results);
    } catch (error) {
      console.error("Failed to load prompt results:", error);
      if (error instanceof APIError && error.status === 404) {
        setPromptsError("No prompt results found. Run GEO analysis first.");
      } else {
        setPromptsError("Failed to load prompt results.");
      }
    } finally {
      setIsLoadingPrompts(false);
    }
  }

  async function loadEvidenceData() {
    if (!businessProfile?.id) return;

    try {
      setIsLoadingEvidence(true);

      // Load website content
      try {
        const content = await getCrawlContent(businessProfile.id);
        setWebsiteContent(content.items || []);
      } catch (err) {
        console.error("Failed to load website content:", err);
      }

      // Load Google reviews (if available)
      try {
        const reviews = await syncGoogleReviews(businessProfile.id);
        setGoogleReviews(reviews.reviews || []);
      } catch (err) {
        console.error("Failed to load Google reviews:", err);
      }

      // Load brand mentions
      try {
        const mentions = await getMentions(businessProfile.id);
        setBrandMentions(mentions.mentions || []);
      } catch (err) {
        console.error("Failed to load brand mentions:", err);
      }
    } catch (error) {
      console.error("Failed to load evidence data:", error);
    } finally {
      setIsLoadingEvidence(false);
    }
  }

  // =========================================================================
  // ACTIONS
  // =========================================================================

  async function handleRunPrompts() {
    if (!businessProfile?.id) return;

    try {
      setIsRunningPrompts(true);
      setPromptsError("");
      await runGeoPrompts(businessProfile.id);
      
      // Wait a bit then reload results
      setTimeout(() => {
        loadPromptResults();
        setIsRunningPrompts(false);
      }, 2000);
    } catch (error) {
      console.error("Failed to run prompts:", error);
      setPromptsError("Failed to run GEO analysis. Please try again.");
      setIsRunningPrompts(false);
    }
  }

  async function handleComputeScore() {
    if (!businessProfile?.id) return;

    try {
      setIsComputingScore(true);
      setScoreError("");
      const score = await computeGeoScore(businessProfile.id);
      setGeoScore(score);
      
      // Also reload breakdown
      const breakdown = await getScoreBreakdown(businessProfile.id);
      setScoreBreakdown(breakdown);
    } catch (error) {
      console.error("Failed to compute score:", error);
      if (error instanceof APIError && error.status === 400) {
        setScoreError("No prompt results found. Run GEO analysis first.");
      } else {
        setScoreError("Failed to compute score. Please try again.");
      }
    } finally {
      setIsComputingScore(false);
    }
  }

  // =========================================================================
  // UTILITY FUNCTIONS
  // =========================================================================

  function getScoreColor(score: number): string {
    if (score >= 80) return "text-green-400";
    if (score >= 60) return "text-yellow-400";
    if (score >= 40) return "text-orange-400";
    return "text-red-400";
  }

  function getScoreHealthStatus(score: number): string {
    if (score >= 80) return "Excellent";
    if (score >= 60) return "Good";
    if (score >= 40) return "Fair";
    return "Needs Improvement";
  }

  function getScoreHealthColor(score: number): string {
    if (score >= 80) return "bg-green-500/20 text-green-400 border-green-500/30";
    if (score >= 60) return "bg-yellow-500/20 text-yellow-400 border-yellow-500/30";
    if (score >= 40) return "bg-orange-500/20 text-orange-400 border-orange-500/30";
    return "bg-red-500/20 text-red-400 border-red-500/30";
  }

  // =========================================================================
  // LOADING & ERROR STATES
  // =========================================================================

  if (isLoadingProfile) {
    return (
      <div className="min-h-screen bg-[#0b0b0f] text-gray-300 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500 mb-4"></div>
          <p className="text-gray-400">Loading business profile...</p>
        </div>
      </div>
    );
  }

  if (profileError) {
    return (
      <div className="min-h-screen bg-[#0b0b0f] text-gray-300 flex items-center justify-center">
        <div className="text-center max-w-md">
          <div className="text-red-400 text-5xl mb-4">⚠️</div>
          <h2 className="text-2xl font-semibold text-red-400 mb-2">Profile Error</h2>
          <p className="text-gray-400 mb-6">{profileError}</p>
          <div className="flex gap-3 justify-center">
            <button
              onClick={() => window.location.reload()}
              className="px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition"
            >
              Retry
            </button>
            {onBackToSetup && (
              <button
                onClick={onBackToSetup}
                className="px-6 py-3 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition"
              >
                Back to Setup
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // =========================================================================
  // RENDER SECTIONS
  // =========================================================================

  function renderScoreOverview() {
    if (isLoadingScore) {
      return (
        <div className="rounded-3xl border border-white/10 bg-white/5 p-8 text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500 mb-4"></div>
          <p className="text-gray-400">Loading GEO score...</p>
        </div>
      );
    }

    if (scoreError || !geoScore) {
      return (
        <div className="rounded-3xl border border-white/10 bg-white/5 p-8">
          <div className="text-center mb-6">
            <div className="text-yellow-400 text-5xl mb-4">⚡</div>
            <h3 className="text-xl font-semibold text-yellow-400 mb-2">GEO Score Not Available</h3>
            <p className="text-gray-400 mb-6">
              {scoreError || "Run GEO analysis and compute score to see your results."}
            </p>
          </div>
          <div className="flex gap-3 justify-center">
            <button
              onClick={handleRunPrompts}
              disabled={isRunningPrompts}
              className="px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isRunningPrompts ? "Running Analysis..." : "Run GEO Analysis"}
            </button>
            <button
              onClick={handleComputeScore}
              disabled={isComputingScore || !promptResults || promptResults.total_results === 0}
              className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isComputingScore ? "Computing..." : "Compute Score"}
            </button>
          </div>
        </div>
      );
    }

    return (
      <div className="space-y-6">
        {/* Primary Score Display */}
        <div className="rounded-3xl border border-white/10 bg-gradient-to-br from-indigo-900/20 to-purple-900/20 p-8">
          <div className="text-center">
            <div className="mb-4">
              <div className={`text-7xl font-bold ${getScoreColor(geoScore.final_geo_score)}`}>
                {geoScore.final_geo_score.toFixed(2)}
              </div>
              <div className="text-2xl text-gray-400">/ 100</div>
            </div>
            <div className={`inline-block px-6 py-2 rounded-full border ${getScoreHealthColor(geoScore.final_geo_score)}`}>
              {getScoreHealthStatus(geoScore.final_geo_score)}
            </div>
            <div className="mt-4 text-sm text-gray-400">
              Computed {new Date(geoScore.computed_at).toLocaleString()}
            </div>
            <div className="mt-2 text-xs text-gray-500">
              Based on {geoScore.prompt_results_count} prompt results • Method: {geoScore.computation_method}
            </div>
          </div>
        </div>

        {/* Score Breakdown */}
        <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
          <h3 className="text-lg font-semibold mb-6">Score Breakdown</h3>
          
          <div className="space-y-4">
            {/* Presence Score */}
            <div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-medium">Presence Score</span>
                <span className="text-sm font-bold text-blue-400">{geoScore.presence_score.toFixed(2)} / 100</span>
              </div>
              <div className="relative h-3 bg-gray-800 rounded-full overflow-hidden">
                <div
                  className="absolute top-0 left-0 h-full bg-gradient-to-r from-blue-500 to-blue-400 rounded-full transition-all duration-500"
                  style={{ width: `${geoScore.presence_score}%` }}
                ></div>
              </div>
              <div className="mt-1 text-xs text-gray-500">Weight: 35%</div>
            </div>

            {/* Accuracy Score */}
            <div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-medium">Accuracy Score</span>
                <span className="text-sm font-bold text-green-400">{geoScore.accuracy_score.toFixed(2)} / 100</span>
              </div>
              <div className="relative h-3 bg-gray-800 rounded-full overflow-hidden">
                <div
                  className="absolute top-0 left-0 h-full bg-gradient-to-r from-green-500 to-green-400 rounded-full transition-all duration-500"
                  style={{ width: `${geoScore.accuracy_score}%` }}
                ></div>
              </div>
              <div className="mt-1 text-xs text-gray-500">Weight: 35%</div>
            </div>

            {/* Trust Score */}
            <div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-medium">Trust Score</span>
                <span className="text-sm font-bold text-purple-400">{geoScore.trust_score.toFixed(2)} / 100</span>
              </div>
              <div className="relative h-3 bg-gray-800 rounded-full overflow-hidden">
                <div
                  className="absolute top-0 left-0 h-full bg-gradient-to-r from-purple-500 to-purple-400 rounded-full transition-all duration-500"
                  style={{ width: `${geoScore.trust_score}%` }}
                ></div>
              </div>
              <div className="mt-1 text-xs text-gray-500">Weight: 20%</div>
            </div>

            {/* Hallucination Penalty */}
            <div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-medium">Hallucination Penalty</span>
                <span className="text-sm font-bold text-red-400">{geoScore.hallucination_penalty.toFixed(2)} / 0</span>
              </div>
              <div className="relative h-3 bg-gray-800 rounded-full overflow-hidden">
                <div
                  className="absolute top-0 left-0 h-full bg-gradient-to-r from-red-600 to-red-500 rounded-full transition-all duration-500"
                  style={{ width: `${Math.abs(geoScore.hallucination_penalty) * 10}%` }}
                ></div>
              </div>
              <div className="mt-1 text-xs text-gray-500">Range: -10 to 0</div>
            </div>
          </div>

          {/* Formula */}
          <div className="mt-6 p-4 bg-gray-900/50 rounded-lg border border-gray-800">
            <div className="text-xs font-mono text-gray-400 mb-2">Formula:</div>
            <div className="text-sm font-mono text-gray-300">{geoScore.formula}</div>
            <div className="mt-3 text-xs font-mono text-gray-500">
              {geoScore.total_calculation_string}
            </div>
          </div>
        </div>

        {/* Detailed Breakdowns */}
        {scoreBreakdown && (
          <div className="grid gap-6 md:grid-cols-2">
            {/* Presence Breakdown */}
            {scoreBreakdown.breakdowns.presence && (
              <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
                <h4 className="text-sm font-semibold mb-3 text-blue-400">Presence Details</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-400">Mentions:</span>
                    <span className="text-white">{scoreBreakdown.breakdowns.presence.mentions_count || 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Directories:</span>
                    <span className="text-white">{scoreBreakdown.breakdowns.presence.directory_count || 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Citations:</span>
                    <span className="text-white">{scoreBreakdown.breakdowns.presence.citation_count || 0}</span>
                  </div>
                </div>
              </div>
            )}

            {/* Accuracy Breakdown */}
            {scoreBreakdown.breakdowns.accuracy && (
              <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
                <h4 className="text-sm font-semibold mb-3 text-green-400">Accuracy Details</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-400">NAP Consistency:</span>
                    <span className="text-white">{scoreBreakdown.breakdowns.accuracy.nap_consistency_score?.toFixed(2) || 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Name Variants:</span>
                    <span className="text-white">{scoreBreakdown.breakdowns.accuracy.name_variants || 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Contradictions:</span>
                    <span className="text-white">{scoreBreakdown.breakdowns.accuracy.contradiction_count || 0}</span>
                  </div>
                </div>
              </div>
            )}

            {/* Trust Breakdown */}
            {scoreBreakdown.breakdowns.trust && (
              <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
                <h4 className="text-sm font-semibold mb-3 text-purple-400">Trust Details</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-400">Sentiment:</span>
                    <span className="text-white">{scoreBreakdown.breakdowns.trust.sentiment_score?.toFixed(2) || 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Reviews:</span>
                    <span className="text-white">{scoreBreakdown.breakdowns.trust.review_count || 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Trust Signals:</span>
                    <span className="text-white">{scoreBreakdown.breakdowns.trust.signal_count || 0}</span>
                  </div>
                </div>
              </div>
            )}

            {/* Hallucination Breakdown */}
            {scoreBreakdown.breakdowns.hallucination && (
              <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
                <h4 className="text-sm font-semibold mb-3 text-red-400">Penalty Details</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-400">Uncited Claims:</span>
                    <span className="text-white">{scoreBreakdown.breakdowns.hallucination.uncited_count || 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Low Confidence:</span>
                    <span className="text-white">{scoreBreakdown.breakdowns.hallucination.low_confidence_count || 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Contradictions:</span>
                    <span className="text-white">{scoreBreakdown.breakdowns.hallucination.contradiction_count || 0}</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  function renderEvidencePanels() {
    const tabs = [
      { id: "website", label: "Website Content", count: websiteContent.length },
      { id: "reviews", label: "Google Reviews", count: googleReviews.length },
      { id: "mentions", label: "Brand Mentions", count: brandMentions.length },
    ];

    return (
      <div className="space-y-6">
        {/* Tab Navigation */}
        <div className="flex flex-wrap gap-2 rounded-2xl border border-white/10 bg-white/5 p-2">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveEvidenceTab(tab.id as any)}
              className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                activeEvidenceTab === tab.id
                  ? "bg-indigo-600 text-white"
                  : "text-white/70 hover:text-white hover:bg-white/10"
              }`}
            >
              {tab.label} ({tab.count})
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
          {isLoadingEvidence ? (
            <div className="text-center py-12">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-indigo-500 mb-4"></div>
              <p className="text-gray-400">Loading evidence data...</p>
            </div>
          ) : activeEvidenceTab === "website" ? (
            <div>
              <h3 className="text-lg font-semibold mb-4">Website Content ({websiteContent.length} pages)</h3>
              {websiteContent.length > 0 ? (
                <div className="space-y-3">
                  {websiteContent.slice(0, 10).map((page: any, index) => (
                    <div key={index} className="p-4 bg-gray-900/50 rounded-lg border border-gray-800">
                      <div className="flex justify-between items-start mb-2">
                        <a
                          href={page.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm font-medium text-indigo-400 hover:text-indigo-300"
                        >
                          {page.title || page.url}
                        </a>
                        <span className="text-xs text-gray-500">{page.word_count || 0} words</span>
                      </div>
                      {page.meta_description && (
                        <p className="text-xs text-gray-400 line-clamp-2">{page.meta_description}</p>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-400 text-center py-8">No website content found. Run website crawl first.</p>
              )}
            </div>
          ) : activeEvidenceTab === "reviews" ? (
            <div>
              <h3 className="text-lg font-semibold mb-4">Google Reviews ({googleReviews.length} reviews)</h3>
              {googleReviews.length > 0 ? (
                <div className="space-y-3">
                  {googleReviews.slice(0, 10).map((review: any, index) => (
                    <div key={index} className="p-4 bg-gray-900/50 rounded-lg border border-gray-800">
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex items-center gap-2">
                          <span className="text-yellow-400">★</span>
                          <span className="text-sm font-medium">{review.rating || 0}/5</span>
                        </div>
                        <span className="text-xs text-gray-500">
                          {review.created_at ? new Date(review.created_at).toLocaleDateString() : "N/A"}
                        </span>
                      </div>
                      {review.comment && (
                        <p className="text-sm text-gray-300 line-clamp-3">{review.comment}</p>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-400 text-center py-8">No reviews found. Connect Google Business and sync reviews.</p>
              )}
            </div>
          ) : (
            <div>
              <h3 className="text-lg font-semibold mb-4">Brand Mentions ({brandMentions.length} mentions)</h3>
              {brandMentions.length > 0 ? (
                <div className="space-y-3">
                  {brandMentions.slice(0, 10).map((mention: any, index) => (
                    <div key={index} className="p-4 bg-gray-900/50 rounded-lg border border-gray-800">
                      <div className="flex justify-between items-start mb-2">
                        <span className="text-sm font-medium text-indigo-400">{mention.source_platform || "Unknown"}</span>
                        <span className={`text-xs px-2 py-1 rounded ${
                          mention.sentiment === "POSITIVE"
                            ? "bg-green-500/20 text-green-400"
                            : mention.sentiment === "NEGATIVE"
                            ? "bg-red-500/20 text-red-400"
                            : "bg-gray-500/20 text-gray-400"
                        }`}>
                          {mention.sentiment || "NEUTRAL"}
                        </span>
                      </div>
                      {mention.snippet && (
                        <p className="text-sm text-gray-300 line-clamp-2">{mention.snippet}</p>
                      )}
                      {mention.source_url && (
                        <a
                          href={mention.source_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-indigo-400 hover:text-indigo-300 mt-2 inline-block"
                        >
                          View Source →
                        </a>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-400 text-center py-8">No brand mentions found. Run mention discovery first.</p>
              )}
            </div>
          )}
        </div>
      </div>
    );
  }

  function renderPromptResults() {
    if (isLoadingPrompts) {
      return (
        <div className="rounded-3xl border border-white/10 bg-white/5 p-8 text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500 mb-4"></div>
          <p className="text-gray-400">Loading prompt results...</p>
        </div>
      );
    }

    if (promptsError || !promptResults || promptResults.total_results === 0) {
      return (
        <div className="rounded-3xl border border-white/10 bg-white/5 p-8">
          <div className="text-center mb-6">
            <div className="text-yellow-400 text-5xl mb-4">📋</div>
            <h3 className="text-xl font-semibold text-yellow-400 mb-2">No Prompt Results</h3>
            <p className="text-gray-400 mb-6">
              {promptsError || "Run GEO analysis to generate prompt results."}
            </p>
          </div>
          <div className="flex justify-center">
            <button
              onClick={handleRunPrompts}
              disabled={isRunningPrompts}
              className="px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isRunningPrompts ? "Running Analysis..." : "Run GEO Analysis"}
            </button>
          </div>
        </div>
      );
    }

    const categories = Object.keys(promptResults.categories);
    const activeCategory = selectedCategory || categories[0];
    const categoryResults = promptResults.categories[activeCategory] || [];

    return (
      <div className="space-y-6">
        {/* Category Navigation */}
        <div className="rounded-2xl border border-white/10 bg-white/5 p-2">
          <div className="flex flex-wrap gap-2">
            {categories.map((category) => (
              <button
                key={category}
                onClick={() => setSelectedCategory(category)}
                className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                  category === activeCategory
                    ? "bg-indigo-600 text-white"
                    : "text-white/70 hover:text-white hover:bg-white/10"
                }`}
              >
                {category.replace(/_/g, " ")} ({promptResults.categories[category].length})
              </button>
            ))}
          </div>
        </div>

        {/* Prompt Results */}
        <div className="space-y-4">
          {categoryResults.map((result: PromptResultDetail, index) => (
            <div key={index} className="rounded-2xl border border-white/10 bg-white/5 p-6">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h4 className="text-lg font-semibold mb-1">{result.prompt_title}</h4>
                  <p className="text-sm text-gray-400">{result.prompt_description || "No description"}</p>
                </div>
                <div className="flex items-center gap-3">
                  <div className={`px-3 py-1 rounded-full text-xs font-semibold ${
                    result.execution_status === "COMPLETED"
                      ? "bg-green-500/20 text-green-400"
                      : result.execution_status === "FAILED"
                      ? "bg-red-500/20 text-red-400"
                      : "bg-yellow-500/20 text-yellow-400"
                  }`}>
                    {result.execution_status}
                  </div>
                  {result.confidence_score !== undefined && (
                    <div className="text-sm text-gray-400">
                      Confidence: {(result.confidence_score * 100).toFixed(0)}%
                    </div>
                  )}
                </div>
              </div>

              {/* Structured Response */}
              {result.structured_response && (
                <div className="mb-4">
                  <div className="text-sm font-medium text-gray-300 mb-2">Structured Result:</div>
                  <div className="p-4 bg-gray-900/50 rounded-lg border border-gray-800">
                    <pre className="text-xs text-gray-300 overflow-x-auto max-h-60">
                      {JSON.stringify(result.structured_response, null, 2)}
                    </pre>
                  </div>
                </div>
              )}

              {/* Citations */}
              {result.cited_sources && result.cited_sources.length > 0 && (
                <div>
                  <div className="text-sm font-medium text-gray-300 mb-2">
                    Citations ({result.cited_sources.length}):
                  </div>
                  <div className="space-y-2">
                    {result.cited_sources.slice(0, 3).map((source: any, idx) => (
                      <div key={idx} className="p-3 bg-gray-900/30 rounded-lg border border-gray-800 text-xs">
                        {source.source_url && (
                          <a
                            href={source.source_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-indigo-400 hover:text-indigo-300"
                          >
                            {source.source_url}
                          </a>
                        )}
                        {source.review_id && <span className="text-gray-400">Review ID: {source.review_id}</span>}
                        {source.mention_id && <span className="text-gray-400">Mention ID: {source.mention_id}</span>}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Error Message */}
              {result.error_message && (
                <div className="mt-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-sm text-red-400">
                  Error: {result.error_message}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    );
  }

  // =========================================================================
  // MAIN RENDER
  // =========================================================================

  const sections = [
    { id: "overview", label: "GEO Score", icon: "🎯" },
    { id: "evidence", label: "Evidence", icon: "📊" },
    { id: "prompts", label: "Prompt Results", icon: "📋" },
  ];

  return (
    <div className="min-h-screen bg-[#0b0b0f] text-white px-4 md:px-6 py-6 md:py-10">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <header className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-wider text-indigo-400 mb-1">GEO DASHBOARD</p>
            <h1 className="text-2xl md:text-3xl font-bold mb-2">
              {businessProfile?.name || "Your Business"}
            </h1>
            <p className="text-sm text-gray-400">
              {businessProfile?.category} • {businessProfile?.primary_location}
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            {onBackToSetup && (
              <button
                onClick={onBackToSetup}
                className="px-4 py-2 text-sm bg-gray-800 text-gray-300 rounded-lg hover:bg-gray-700 transition"
              >
                Back to Setup
              </button>
            )}
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

        {/* Section Navigation */}
        <div className="flex flex-wrap gap-2 p-2 rounded-2xl border border-white/10 bg-white/5">
          {sections.map((section) => (
            <button
              key={section.id}
              onClick={() => setActiveSection(section.id as any)}
              className={`rounded-full px-5 py-2.5 text-sm font-semibold transition ${
                activeSection === section.id
                  ? "bg-indigo-600 text-white shadow-lg"
                  : "text-white/70 hover:text-white hover:bg-white/10"
              }`}
            >
              <span className="mr-2">{section.icon}</span>
              {section.label}
            </button>
          ))}
        </div>

        {/* Actions Bar */}
        <div className="flex flex-wrap gap-3 p-4 rounded-2xl border border-white/10 bg-white/5">
          <button
            onClick={handleRunPrompts}
            disabled={isRunningPrompts}
            className="px-5 py-2.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
          >
            {isRunningPrompts ? (
              <>
                <span className="inline-block animate-spin mr-2">⏳</span>
                Running Analysis...
              </>
            ) : (
              "🔄 Re-run GEO Analysis"
            )}
          </button>
          <button
            onClick={handleComputeScore}
            disabled={isComputingScore || !promptResults || promptResults.total_results === 0}
            className="px-5 py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 transition disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
          >
            {isComputingScore ? (
              <>
                <span className="inline-block animate-spin mr-2">⚙️</span>
                Computing...
              </>
            ) : (
              "🧮 Recompute Score"
            )}
          </button>
          {promptResults && promptResults.total_results > 0 && (
            <div className="ml-auto flex items-center gap-2 text-sm text-gray-400">
              <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>
              {promptResults.total_results} prompt results available
            </div>
          )}
        </div>

        {/* Section Content */}
        {activeSection === "overview" && renderScoreOverview()}
        {activeSection === "evidence" && renderEvidencePanels()}
        {activeSection === "prompts" && renderPromptResults()}
      </div>
    </div>
  );
}
