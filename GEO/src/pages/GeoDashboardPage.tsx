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
  startCrawl,
  getCrawlStatus,
  getMentions,
  startMentionDiscovery,
  getMentionStats,
  buildCanonicalEntity,
  fetchCanonicalEntity,
  detectGaps,
  fetchGapIssues,
  generateReinforcementPlan,
  fetchReinforcementTasks,
  updateTaskStatus,
  runSimulation,
  fetchSimulationRuns,
  analyzeNonMentions,
  fetchReasoningAnalyses,
  fetchDriftReport,
  APIError,
  type BusinessProfileResponse,
  type GeoScoreResponse,
  type ScoreBreakdownResponse,
  type PromptResultsResponse,
  type PromptResultDetail,
  type CrawlStatusResponse,
  type CanonicalEntityResponse,
  type GapDetectionResult,
  type GapIssueResponse,
  type ReinforcementPlanResponse,
  type TaskResponse as TaskResponseType,
  type SimulationListResponse,
  type ReasoningListResponse,
  type DriftReportResponse,
} from "../utils/api";

type GeoDashboardPageProps = {
  onLogout?: () => void;
  onBackToSetup?: () => void;
  onNavigateBIS?: () => void;
};

export default function GeoDashboardPage({
  onLogout,
  onBackToSetup,
  onNavigateBIS,
}: GeoDashboardPageProps) {
  // =========================================================================
  // STATE MANAGEMENT
  // =========================================================================

  // Business Profile
  const [businessProfile, setBusinessProfile] =
    useState<BusinessProfileResponse | null>(null);
  const [isLoadingProfile, setIsLoadingProfile] = useState(true);
  const [profileError, setProfileError] = useState<string>("");

  // GEO Score
  const [geoScore, setGeoScore] = useState<GeoScoreResponse | null>(null);
  const [isLoadingScore, setIsLoadingScore] = useState(false);
  const [scoreError, setScoreError] = useState<string>("");

  // Score Breakdown
  const [scoreBreakdown, setScoreBreakdown] =
    useState<ScoreBreakdownResponse | null>(null);

  // Prompt Results
  const [promptResults, setPromptResults] =
    useState<PromptResultsResponse | null>(null);
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

  // Crawl States
  const [isCrawling, setIsCrawling] = useState(false);
  const [crawlStatus, setCrawlStatus] = useState<CrawlStatusResponse | null>(
    null,
  );
  const [crawlError, setCrawlError] = useState<string>("");

  // Mention Discovery States
  const [isDiscovering, setIsDiscovering] = useState(false);
  const [discoveryError, setDiscoveryError] = useState<string>("");
  const [discoveryResult, setDiscoveryResult] = useState<any>(null);
  const [mentionStats, setMentionStats] = useState<any>(null);

  // UI States
  const [activeSection, setActiveSection] = useState<
    | "overview"
    | "evidence"
    | "prompts"
    | "entity"
    | "gaps"
    | "simulation"
    | "visibility"
    | "drift"
  >("overview");
  const [activeEvidenceTab, setActiveEvidenceTab] = useState<
    "website" | "reviews" | "mentions"
  >("website");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  // Intelligence States
  const [canonicalEntity, setCanonicalEntity] =
    useState<CanonicalEntityResponse | null>(null);
  const [isBuildingEntity, setIsBuildingEntity] = useState(false);
  const [entityError, setEntityError] = useState("");

  const [gapResult, setGapResult] = useState<GapDetectionResult | null>(null);
  const [isDetectingGaps, setIsDetectingGaps] = useState(false);
  const [gapError, setGapError] = useState("");

  const [reinforcementPlan, setReinforcementPlan] =
    useState<ReinforcementPlanResponse | null>(null);
  const [isGeneratingPlan, setIsGeneratingPlan] = useState(false);

  const [simulationRuns, setSimulationRuns] =
    useState<SimulationListResponse | null>(null);
  const [isRunningSimulation, setIsRunningSimulation] = useState(false);
  const [simulationError, setSimulationError] = useState("");

  const [reasoningAnalyses, setReasoningAnalyses] =
    useState<ReasoningListResponse | null>(null);
  const [driftReport, setDriftReport] = useState<DriftReportResponse | null>(
    null,
  );
  const [isAnalyzingReasoning, setIsAnalyzingReasoning] = useState(false);

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
      loadIntelligenceData();
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
          setProfileError(
            "No business profile found. Please complete setup first.",
          );
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
        setScoreError(
          "No GEO score found. Run prompts and compute score first.",
        );
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
        setWebsiteContent(content.content || []);
      } catch (err) {
        console.error("Failed to load website content:", err);
      }

      // Load Google reviews - skip if Google not connected
      // Reviews require a valid Google Location ID from OAuth connection
      // so we skip this call since the user may not have connected Google
      setGoogleReviews([]);

      // Load brand mentions
      try {
        const mentions = await getMentions(businessProfile.id);
        setBrandMentions(mentions.mentions || []);
      } catch (err) {
        console.error("Failed to load brand mentions:", err);
      }

      // Load mention stats
      try {
        const stats = await getMentionStats(businessProfile.id);
        setMentionStats(stats);
      } catch (err) {
        console.error("Failed to load mention stats:", err);
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
      const summary = await runGeoPrompts(businessProfile.id);

      // Check for fatal errors (e.g., API quota exceeded)
      if (summary.error) {
        if (
          summary.error.includes("insufficient_quota") ||
          summary.error.includes("exceeded your current quota")
        ) {
          setPromptsError(
            "OpenAI API quota exceeded. Please check your billing at https://platform.openai.com/account/billing and add credits.",
          );
        } else if (summary.error.includes("invalid_api_key")) {
          setPromptsError(
            "Invalid OpenAI API key. Please update the key in the backend .env file.",
          );
        } else {
          setPromptsError(
            `GEO analysis aborted: ${summary.error.substring(0, 200)}`,
          );
        }
      } else if (summary.failed > 0 && summary.succeeded === 0) {
        setPromptsError(
          `All ${summary.failed} prompts failed. Check backend logs for details.`,
        );
      } else if (summary.failed > 0) {
        setPromptsError(
          `GEO analysis completed: ${summary.succeeded} succeeded, ${summary.failed} failed out of ${summary.total} prompts.`,
        );
      }

      // Reload results
      await loadPromptResults();
      setIsRunningPrompts(false);
    } catch (error) {
      console.error("Failed to run prompts:", error);
      if (error instanceof APIError) {
        setPromptsError(
          `GEO analysis failed: ${error.message} (HTTP ${error.status})`,
        );
      } else {
        setPromptsError(
          `GEO analysis failed: ${error instanceof Error ? error.message : "Unknown error"}`,
        );
      }
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
      } else if (error instanceof APIError) {
        setScoreError(
          `Score computation failed: ${error.message} (HTTP ${error.status})`,
        );
      } else {
        setScoreError(
          `Score computation failed: ${error instanceof Error ? error.message : "Unknown error"}`,
        );
      }
    } finally {
      setIsComputingScore(false);
    }
  }

  // =========================================================================
  // CRAWL HANDLER
  // =========================================================================

  async function handleStartCrawl() {
    if (!businessProfile?.id || !businessProfile?.website) return;
    try {
      setIsCrawling(true);
      setCrawlError("");
      setCrawlStatus(null);

      // Start the crawl
      await startCrawl(businessProfile.id);

      // Poll for status every 5 seconds
      const pollInterval = setInterval(async () => {
        try {
          const status = await getCrawlStatus(businessProfile.id);
          setCrawlStatus(status);

          if (status.status === "completed" || status.status === "failed") {
            clearInterval(pollInterval);
            setIsCrawling(false);

            if (status.status === "completed") {
              // Reload evidence data to show crawled content
              await loadEvidenceData();
            } else if (status.error) {
              setCrawlError(status.error);
            }
          }
        } catch (err) {
          clearInterval(pollInterval);
          setIsCrawling(false);
          setCrawlError(
            err instanceof Error ? err.message : "Failed to check crawl status",
          );
        }
      }, 5000);
    } catch (error) {
      setIsCrawling(false);
      if (error instanceof APIError) {
        setCrawlError(`Crawl failed: ${error.message} (HTTP ${error.status})`);
      } else {
        setCrawlError(
          error instanceof Error ? error.message : "Failed to start crawl",
        );
      }
    }
  }

  // =========================================================================
  // MENTION DISCOVERY HANDLER
  // =========================================================================

  async function handleDiscoverMentions() {
    if (!businessProfile?.id) return;
    try {
      setIsDiscovering(true);
      setDiscoveryError("");
      setDiscoveryResult(null);

      const result = await startMentionDiscovery({
        entity_id: businessProfile.id,
        use_google: true,
        use_bing: true,
        max_results_per_query: 10,
      });

      setDiscoveryResult(result);

      // Reload evidence data to show discovered mentions
      await loadEvidenceData();
      // Load stats
      try {
        const stats = await getMentionStats(businessProfile.id);
        setMentionStats(stats);
      } catch (_e) {
        /* stats optional */
      }
      setIsDiscovering(false);
    } catch (error) {
      setIsDiscovering(false);
      if (error instanceof APIError) {
        setDiscoveryError(
          `Discovery failed: ${error.message} (HTTP ${error.status})`,
        );
      } else {
        setDiscoveryError(
          error instanceof Error
            ? error.message
            : "Failed to discover mentions",
        );
      }
    }
  }

  // =========================================================================
  // INTELLIGENCE DATA LOADING
  // =========================================================================

  async function loadIntelligenceData() {
    if (!businessProfile?.id) return;
    // Load canonical entity (non-blocking)
    try {
      const entity = await fetchCanonicalEntity(businessProfile.id);
      setCanonicalEntity(entity);
    } catch {
      /* not built yet */
    }
    // Load gap issues
    try {
      const gaps = await fetchGapIssues(businessProfile.id);
      setGapResult(gaps);
    } catch {
      /* not detected yet */
    }
    // Load reinforcement tasks
    try {
      const plan = await fetchReinforcementTasks(businessProfile.id);
      setReinforcementPlan(plan);
    } catch {
      /* not generated yet */
    }
    // Load simulation runs
    try {
      const runs = await fetchSimulationRuns(businessProfile.id);
      setSimulationRuns(runs);
    } catch {
      /* no runs yet */
    }
    // Load reasoning analyses
    try {
      const analyses = await fetchReasoningAnalyses(businessProfile.id);
      setReasoningAnalyses(analyses);
    } catch {
      /* not analyzed yet */
    }
    // Load drift
    try {
      const drift = await fetchDriftReport(businessProfile.id);
      setDriftReport(drift);
    } catch {
      /* no drift data */
    }
  }

  async function handleBuildEntity() {
    if (!businessProfile?.id) return;
    try {
      setIsBuildingEntity(true);
      setEntityError("");
      const entity = await buildCanonicalEntity(businessProfile.id);
      setCanonicalEntity(entity);
    } catch (error) {
      setEntityError(
        error instanceof APIError ? error.message : "Failed to build entity",
      );
    } finally {
      setIsBuildingEntity(false);
    }
  }

  async function handleDetectGaps() {
    if (!businessProfile?.id) return;
    try {
      setIsDetectingGaps(true);
      setGapError("");
      const result = await detectGaps(businessProfile.id);
      setGapResult(result);
    } catch (error) {
      setGapError(
        error instanceof APIError ? error.message : "Failed to detect gaps",
      );
    } finally {
      setIsDetectingGaps(false);
    }
  }

  async function handleGeneratePlan() {
    if (!businessProfile?.id) return;
    try {
      setIsGeneratingPlan(true);
      const plan = await generateReinforcementPlan(businessProfile.id);
      setReinforcementPlan(plan);
    } catch {
      /* ignore */
    } finally {
      setIsGeneratingPlan(false);
    }
  }

  async function handleTaskStatusToggle(taskId: string, currentStatus: string) {
    const newStatus = currentStatus === "completed" ? "pending" : "completed";
    try {
      await updateTaskStatus(taskId, newStatus);
      if (businessProfile?.id) {
        const plan = await fetchReinforcementTasks(businessProfile.id);
        setReinforcementPlan(plan);
      }
    } catch {
      /* ignore */
    }
  }

  async function handleRunSimulation() {
    if (!businessProfile?.id) return;
    try {
      setIsRunningSimulation(true);
      setSimulationError("");
      await runSimulation(businessProfile.id);
      const runs = await fetchSimulationRuns(businessProfile.id);
      setSimulationRuns(runs);
    } catch (error) {
      setSimulationError(
        error instanceof APIError ? error.message : "Simulation failed",
      );
    } finally {
      setIsRunningSimulation(false);
    }
  }

  async function handleAnalyzeReasoning(simulationRunId: string) {
    if (!businessProfile?.id) return;
    try {
      setIsAnalyzingReasoning(true);
      await analyzeNonMentions(businessProfile.id, simulationRunId);
      const analyses = await fetchReasoningAnalyses(businessProfile.id);
      setReasoningAnalyses(analyses);
      const drift = await fetchDriftReport(businessProfile.id);
      setDriftReport(drift);
    } catch {
      /* ignore */
    } finally {
      setIsAnalyzingReasoning(false);
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
    if (score >= 80)
      return "bg-green-500/20 text-green-400 border-green-500/30";
    if (score >= 60)
      return "bg-yellow-500/20 text-yellow-400 border-yellow-500/30";
    if (score >= 40)
      return "bg-orange-500/20 text-orange-400 border-orange-500/30";
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
          <h2 className="text-2xl font-semibold text-red-400 mb-2">
            Profile Error
          </h2>
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
            <h3 className="text-xl font-semibold text-yellow-400 mb-2">
              GEO Score Not Available
            </h3>
            <p className="text-gray-400 mb-6">
              {scoreError ||
                "Run GEO analysis and compute score to see your results."}
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
              disabled={
                isComputingScore ||
                !promptResults ||
                promptResults.total_results === 0
              }
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
              <div
                className={`text-7xl font-bold ${getScoreColor(geoScore.final_geo_score)}`}
              >
                {geoScore.final_geo_score.toFixed(2)}
              </div>
              <div className="text-2xl text-gray-400">/ 100</div>
            </div>
            <div
              className={`inline-block px-6 py-2 rounded-full border ${getScoreHealthColor(geoScore.final_geo_score)}`}
            >
              {getScoreHealthStatus(geoScore.final_geo_score)}
            </div>
            <div className="mt-4 text-sm text-gray-400">
              Computed {new Date(geoScore.computed_at).toLocaleString()}
            </div>
            <div className="mt-2 text-xs text-gray-500">
              Based on {geoScore.prompt_results_count} prompt results • Method:{" "}
              {geoScore.computation_method}
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
                <span className="text-sm font-bold text-blue-400">
                  {geoScore.presence_score.toFixed(2)} / 100
                </span>
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
                <span className="text-sm font-bold text-green-400">
                  {geoScore.accuracy_score.toFixed(2)} / 100
                </span>
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
                <span className="text-sm font-bold text-purple-400">
                  {geoScore.trust_score.toFixed(2)} / 100
                </span>
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
                <span className="text-sm font-medium">
                  Hallucination Penalty
                </span>
                <span className="text-sm font-bold text-red-400">
                  {geoScore.hallucination_penalty.toFixed(2)} / 0
                </span>
              </div>
              <div className="relative h-3 bg-gray-800 rounded-full overflow-hidden">
                <div
                  className="absolute top-0 left-0 h-full bg-gradient-to-r from-red-600 to-red-500 rounded-full transition-all duration-500"
                  style={{
                    width: `${Math.abs(geoScore.hallucination_penalty) * 10}%`,
                  }}
                ></div>
              </div>
              <div className="mt-1 text-xs text-gray-500">Range: -10 to 0</div>
            </div>
          </div>

          {/* Formula */}
          <div className="mt-6 p-4 bg-gray-900/50 rounded-lg border border-gray-800">
            <div className="text-xs font-mono text-gray-400 mb-2">Formula:</div>
            <div className="text-sm font-mono text-gray-300">
              {geoScore.formula}
            </div>
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
                <h4 className="text-sm font-semibold mb-3 text-blue-400">
                  Presence Details
                </h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-400">Mentions:</span>
                    <span className="text-white">
                      {scoreBreakdown.breakdowns.presence.mentions_count || 0}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Directories:</span>
                    <span className="text-white">
                      {scoreBreakdown.breakdowns.presence.directory_count || 0}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Citations:</span>
                    <span className="text-white">
                      {scoreBreakdown.breakdowns.presence.citation_count || 0}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Accuracy Breakdown */}
            {scoreBreakdown.breakdowns.accuracy && (
              <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
                <h4 className="text-sm font-semibold mb-3 text-green-400">
                  Accuracy Details
                </h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-400">NAP Consistency:</span>
                    <span className="text-white">
                      {scoreBreakdown.breakdowns.accuracy.nap_consistency_score?.toFixed(
                        2,
                      ) || 0}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Name Variants:</span>
                    <span className="text-white">
                      {scoreBreakdown.breakdowns.accuracy.name_variants || 0}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Contradictions:</span>
                    <span className="text-white">
                      {scoreBreakdown.breakdowns.accuracy.contradiction_count ||
                        0}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Trust Breakdown */}
            {scoreBreakdown.breakdowns.trust && (
              <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
                <h4 className="text-sm font-semibold mb-3 text-purple-400">
                  Trust Details
                </h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-400">Sentiment:</span>
                    <span className="text-white">
                      {scoreBreakdown.breakdowns.trust.sentiment_score?.toFixed(
                        2,
                      ) || 0}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Reviews:</span>
                    <span className="text-white">
                      {scoreBreakdown.breakdowns.trust.review_count || 0}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Trust Signals:</span>
                    <span className="text-white">
                      {scoreBreakdown.breakdowns.trust.signal_count || 0}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Hallucination Breakdown */}
            {scoreBreakdown.breakdowns.hallucination && (
              <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
                <h4 className="text-sm font-semibold mb-3 text-red-400">
                  Penalty Details
                </h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-400">Uncited Claims:</span>
                    <span className="text-white">
                      {scoreBreakdown.breakdowns.hallucination.uncited_count ||
                        0}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Low Confidence:</span>
                    <span className="text-white">
                      {scoreBreakdown.breakdowns.hallucination
                        .low_confidence_count || 0}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Contradictions:</span>
                    <span className="text-white">
                      {scoreBreakdown.breakdowns.hallucination
                        .contradiction_count || 0}
                    </span>
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
              <h3 className="text-lg font-semibold mb-4">
                Website Content ({websiteContent.length} pages)
              </h3>
              {websiteContent.length > 0 ? (
                <div className="space-y-3">
                  {websiteContent.slice(0, 10).map((page: any, index) => (
                    <div
                      key={index}
                      className="p-4 bg-gray-900/50 rounded-lg border border-gray-800"
                    >
                      <div className="flex justify-between items-start mb-2">
                        <a
                          href={page.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm font-medium text-indigo-400 hover:text-indigo-300"
                        >
                          {page.title || page.url}
                        </a>
                        <span className="text-xs text-gray-500">
                          {page.word_count || 0} words
                        </span>
                      </div>
                      {page.meta_description && (
                        <p className="text-xs text-gray-400 line-clamp-2">
                          {page.meta_description}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <p className="text-gray-400 mb-4">
                    No website content found. Run website crawl first.
                  </p>
                  <button
                    onClick={handleStartCrawl}
                    disabled={isCrawling || !businessProfile?.website}
                    className="px-5 py-2.5 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
                  >
                    {isCrawling ? "Crawling..." : "🌐 Crawl Website Now"}
                  </button>
                </div>
              )}
            </div>
          ) : activeEvidenceTab === "reviews" ? (
            <div>
              <h3 className="text-lg font-semibold mb-4">
                Google Reviews ({googleReviews.length} reviews)
              </h3>
              {googleReviews.length > 0 ? (
                <div className="space-y-3">
                  {googleReviews.slice(0, 10).map((review: any, index) => (
                    <div
                      key={index}
                      className="p-4 bg-gray-900/50 rounded-lg border border-gray-800"
                    >
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex items-center gap-2">
                          <span className="text-yellow-400">★</span>
                          <span className="text-sm font-medium">
                            {review.rating || 0}/5
                          </span>
                        </div>
                        <span className="text-xs text-gray-500">
                          {review.created_at
                            ? new Date(review.created_at).toLocaleDateString()
                            : "N/A"}
                        </span>
                      </div>
                      {review.comment && (
                        <p className="text-sm text-gray-300 line-clamp-3">
                          {review.comment}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-400 text-center py-8">
                  No reviews found. Connect Google Business and sync reviews.
                </p>
              )}
            </div>
          ) : (
            <div>
              <h3 className="text-lg font-semibold mb-4">
                Brand Mentions ({brandMentions.length} mentions)
              </h3>

              {/* Discovery Result Feedback */}
              {discoveryResult && (
                <div className="mb-4 p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-sm">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-emerald-400 font-semibold">
                      Discovery Complete
                    </span>
                    {discoveryResult.engines_used && (
                      <span className="text-xs text-gray-400">
                        via {discoveryResult.engines_used.join(", ")}
                        {discoveryResult.sentiment_engine === "vader"
                          ? " + VADER"
                          : ""}
                      </span>
                    )}
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                    <div>
                      <span className="text-gray-400">Queries:</span>{" "}
                      <span className="text-white">
                        {discoveryResult.queries_executed}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-400">Scraped:</span>{" "}
                      <span className="text-white">
                        {discoveryResult.results_scraped}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-400">New:</span>{" "}
                      <span className="text-emerald-400">
                        +{discoveryResult.new_mentions}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-400">Total:</span>{" "}
                      <span className="text-white">
                        {discoveryResult.total_mentions}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Mention Stats */}
              {mentionStats && mentionStats.total_mentions > 0 && (
                <div className="mb-4 grid grid-cols-2 md:grid-cols-4 gap-3">
                  {Object.entries(mentionStats.by_type || {}).map(
                    ([type, count]) => (
                      <div
                        key={type}
                        className="p-3 bg-gray-900/50 rounded-lg border border-gray-800 text-center"
                      >
                        <div className="text-lg font-bold text-indigo-400">
                          {count as number}
                        </div>
                        <div className="text-xs text-gray-400 capitalize">
                          {type}
                        </div>
                      </div>
                    ),
                  )}
                </div>
              )}

              {brandMentions.length > 0 ? (
                <div className="space-y-3">
                  {brandMentions.slice(0, 20).map((mention: any, index) => (
                    <div
                      key={index}
                      className="p-4 bg-gray-900/50 rounded-lg border border-gray-800"
                    >
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex items-center gap-2">
                          <span
                            className={`text-xs px-2 py-0.5 rounded font-medium ${
                              mention.mention_type === "directory"
                                ? "bg-blue-500/20 text-blue-400"
                                : mention.mention_type === "review"
                                  ? "bg-yellow-500/20 text-yellow-400"
                                  : mention.mention_type === "article"
                                    ? "bg-purple-500/20 text-purple-400"
                                    : mention.mention_type === "comparison"
                                      ? "bg-orange-500/20 text-orange-400"
                                      : mention.mention_type === "social"
                                        ? "bg-pink-500/20 text-pink-400"
                                        : "bg-gray-500/20 text-gray-400"
                            }`}
                          >
                            {mention.mention_type || "other"}
                          </span>
                          <span className="text-sm font-medium text-indigo-400">
                            {mention.source_domain || "Unknown"}
                          </span>
                        </div>
                        <span
                          className={`text-xs px-2 py-1 rounded ${
                            mention.sentiment === "positive"
                              ? "bg-green-500/20 text-green-400"
                              : mention.sentiment === "negative"
                                ? "bg-red-500/20 text-red-400"
                                : mention.sentiment === "neutral"
                                  ? "bg-gray-500/20 text-gray-300"
                                  : "bg-gray-500/20 text-gray-400"
                          }`}
                        >
                          {mention.sentiment || "unknown"}
                        </span>
                      </div>
                      {mention.page_title && (
                        <p className="text-sm text-white font-medium mb-1 line-clamp-1">
                          {mention.page_title}
                        </p>
                      )}
                      {mention.extracted_snippet && (
                        <p className="text-xs text-gray-400 line-clamp-2">
                          {mention.extracted_snippet}
                        </p>
                      )}
                      <div className="flex items-center justify-between mt-2">
                        {mention.source_url && (
                          <a
                            href={mention.source_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-indigo-400 hover:text-indigo-300"
                          >
                            View Source
                          </a>
                        )}
                        {mention.discovery_method && (
                          <span className="text-xs text-gray-500">
                            {mention.discovery_method}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <p className="text-gray-400 mb-4">
                    No brand mentions found. Run mention discovery first.
                  </p>
                  <button
                    onClick={handleDiscoverMentions}
                    disabled={isDiscovering}
                    className="px-5 py-2.5 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
                  >
                    {isDiscovering
                      ? "Discovering..."
                      : "🔍 Discover Mentions Now"}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    );
  }

  // ── Structured response renderer ──────────────────────────────────────────
  function renderValue(val: any): React.ReactNode {
    if (val === null || val === undefined)
      return <span className="text-gray-500 italic">—</span>;
    if (typeof val === "boolean")
      return (
        <span
          className={`px-2 py-0.5 rounded text-xs font-semibold ${val ? "bg-green-500/20 text-green-400" : "bg-red-500/20 text-red-400"}`}
        >
          {val ? "Yes" : "No"}
        </span>
      );
    if (typeof val === "number")
      return <span className="text-indigo-300 font-semibold">{val}</span>;

    // Object with text + optional source_url  (citation-style)
    if (
      typeof val === "object" &&
      !Array.isArray(val) &&
      (val.text || val.value)
    ) {
      const text = val.text ?? val.value ?? "";
      const url = val.source_url ?? val.url ?? null;
      return (
        <span className="inline-flex flex-col gap-1">
          <span className="text-gray-100">{String(text)}</span>
          {url && (
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-indigo-400 hover:text-indigo-300 underline underline-offset-2 w-fit"
            >
              {url.length > 60 ? url.slice(0, 60) + "…" : url}
            </a>
          )}
        </span>
      );
    }

    // Plain array
    if (Array.isArray(val)) {
      if (val.length === 0)
        return <span className="text-gray-500 italic">None</span>;
      return (
        <ul className="space-y-2 mt-1">
          {val.map((item: any, i: number) => (
            <li key={i} className="flex gap-2">
              <span className="text-indigo-500 mt-1 shrink-0">▸</span>
              <span className="text-gray-200">{renderValue(item)}</span>
            </li>
          ))}
        </ul>
      );
    }

    // Nested object → render each key recursively
    if (typeof val === "object") {
      return (
        <div className="space-y-2 pl-3 border-l border-white/10">
          {Object.entries(val).map(([k, v]) => (
            <div key={k}>
              <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide">
                {k.replace(/_/g, " ")}
              </span>
              <div className="mt-0.5 text-sm">{renderValue(v)}</div>
            </div>
          ))}
        </div>
      );
    }

    return <span className="text-gray-100">{String(val)}</span>;
  }

  function renderStructuredResponse(data: Record<string, any>) {
    const entries = Object.entries(data);
    if (entries.length === 0) return null;

    // Score-like scalar values go in a summary row
    const scalars = entries.filter(
      ([, v]) => typeof v !== "object" || v === null,
    );
    const complex = entries.filter(
      ([, v]) => typeof v === "object" && v !== null,
    );

    return (
      <div className="space-y-4">
        {scalars.length > 0 && (
          <div className="flex flex-wrap gap-3">
            {scalars.map(([k, v]) => (
              <div
                key={k}
                className="flex flex-col px-4 py-2 bg-indigo-500/10 border border-indigo-500/20 rounded-xl min-w-[100px]"
              >
                <span className="text-xs text-indigo-300 uppercase tracking-wide mb-1">
                  {k.replace(/_/g, " ")}
                </span>
                <span className="text-sm font-semibold text-white">
                  {renderValue(v)}
                </span>
              </div>
            ))}
          </div>
        )}
        {complex.map(([k, v]) => (
          <div
            key={k}
            className="rounded-xl bg-white/3 border border-white/8 p-4"
          >
            <div className="text-xs font-bold text-indigo-300 uppercase tracking-widest mb-3">
              {k.replace(/_/g, " ")}
            </div>
            <div className="text-sm text-gray-200">{renderValue(v)}</div>
          </div>
        ))}
      </div>
    );
  }

  const CATEGORY_META: Record<string, { icon: string; color: string }> = {
    entity_definition: { icon: "🏢", color: "indigo" },
    trust_signals: { icon: "🔒", color: "emerald" },
    local_discovery: { icon: "📍", color: "amber" },
    content_quality: { icon: "✍️", color: "purple" },
    ai_readiness: { icon: "🤖", color: "cyan" },
  };

  function renderPromptResults() {
    if (isLoadingPrompts) {
      return (
        <div className="rounded-3xl border border-white/10 bg-white/5 p-12 flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500" />
          <p className="text-gray-400">Loading prompt results…</p>
        </div>
      );
    }

    if (promptsError || !promptResults || promptResults.total_results === 0) {
      return (
        <div className="rounded-3xl border border-white/10 bg-white/5 p-10 flex flex-col items-center gap-6">
          <div className="text-5xl">📋</div>
          <div className="text-center">
            <h3 className="text-xl font-semibold text-yellow-400 mb-2">
              No Prompt Results
            </h3>
            <p className="text-gray-400">
              {promptsError || "Run GEO analysis to generate results."}
            </p>
          </div>
          <button
            onClick={handleRunPrompts}
            disabled={isRunningPrompts}
            className="px-6 py-3 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition disabled:opacity-50 font-semibold"
          >
            {isRunningPrompts ? "Running Analysis…" : "Run GEO Analysis"}
          </button>
        </div>
      );
    }

    const categories = Object.keys(promptResults.categories);
    const activeCategory = selectedCategory || categories[0];
    const categoryResults = promptResults.categories[activeCategory] || [];
    const meta = CATEGORY_META[activeCategory] ?? {
      icon: "📋",
      color: "indigo",
    };

    const completedCount = categoryResults.filter(
      (r) => r.execution_status === "COMPLETED",
    ).length;
    const failedCount = categoryResults.filter(
      (r) => r.execution_status === "FAILED",
    ).length;

    return (
      <div className="space-y-6">
        {/* ── Summary bar ── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            {
              label: "Total Prompts",
              value: promptResults.total_results,
              color: "text-white",
            },
            {
              label: "Categories",
              value: categories.length,
              color: "text-indigo-400",
            },
            {
              label: "Completed",
              value: Object.values(promptResults.categories)
                .flat()
                .filter((r: any) => r.execution_status === "COMPLETED").length,
              color: "text-emerald-400",
            },
            {
              label: "Failed",
              value: Object.values(promptResults.categories)
                .flat()
                .filter((r: any) => r.execution_status === "FAILED").length,
              color: "text-red-400",
            },
          ].map(({ label, value, color }) => (
            <div
              key={label}
              className="rounded-2xl border border-white/10 bg-white/5 p-4 text-center"
            >
              <div className={`text-2xl font-bold ${color}`}>{value}</div>
              <div className="text-xs text-gray-400 mt-1">{label}</div>
            </div>
          ))}
        </div>

        {/* ── Category tabs ── */}
        <div className="rounded-2xl border border-white/10 bg-white/5 p-1.5">
          <div className="flex flex-wrap gap-1.5">
            {categories.map((cat) => {
              const m = CATEGORY_META[cat] ?? { icon: "📋", color: "indigo" };
              const isActive = cat === activeCategory;
              return (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition-all ${
                    isActive
                      ? "bg-indigo-600 text-white shadow-lg shadow-indigo-500/20"
                      : "text-white/60 hover:text-white hover:bg-white/8"
                  }`}
                >
                  <span>{m.icon}</span>
                  <span className="capitalize">{cat.replace(/_/g, " ")}</span>
                  <span
                    className={`text-xs px-1.5 py-0.5 rounded-full ${isActive ? "bg-white/20 text-white" : "bg-white/10 text-gray-400"}`}
                  >
                    {promptResults.categories[cat].length}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* ── Category header ── */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-2xl">{meta.icon}</span>
            <div>
              <h3 className="font-bold text-lg capitalize">
                {activeCategory.replace(/_/g, " ")}
              </h3>
              <p className="text-xs text-gray-400">
                {categoryResults.length} prompts · {completedCount} completed ·{" "}
                {failedCount} failed
              </p>
            </div>
          </div>
          {/* mini progress bar */}
          <div className="hidden sm:flex items-center gap-2">
            <div className="w-32 h-2 rounded-full bg-white/10 overflow-hidden">
              <div
                className="h-full bg-emerald-500 rounded-full transition-all"
                style={{
                  width: `${categoryResults.length ? (completedCount / categoryResults.length) * 100 : 0}%`,
                }}
              />
            </div>
            <span className="text-xs text-gray-400">
              {categoryResults.length
                ? Math.round((completedCount / categoryResults.length) * 100)
                : 0}
              %
            </span>
          </div>
        </div>

        {/* ── Prompt cards ── */}
        <div className="space-y-4">
          {categoryResults.map((result: PromptResultDetail, index: number) => {
            const isCompleted = result.execution_status === "COMPLETED";
            const isFailed = result.execution_status === "FAILED";
            return (
              <div
                key={index}
                className={`rounded-2xl border p-6 transition-all ${
                  isFailed
                    ? "border-red-500/20 bg-red-500/5"
                    : "border-white/10 bg-white/5 hover:bg-white/7"
                }`}
              >
                {/* Card header */}
                <div className="flex items-start justify-between gap-4 mb-5">
                  <div className="flex items-start gap-3">
                    <div
                      className={`shrink-0 w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold ${
                        isCompleted
                          ? "bg-emerald-500/20 text-emerald-400"
                          : isFailed
                            ? "bg-red-500/20 text-red-400"
                            : "bg-yellow-500/20 text-yellow-400"
                      }`}
                    >
                      {index + 1}
                    </div>
                    <div>
                      <h4 className="font-semibold text-white leading-tight">
                        {result.prompt_title}
                      </h4>
                      <p className="text-xs text-gray-400 mt-0.5 leading-relaxed">
                        {(result as any).prompt_description || ""}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {result.confidence_score !== undefined && (
                      <div className="flex flex-col items-center px-3 py-1.5 bg-white/5 rounded-xl border border-white/10">
                        <span className="text-xs text-gray-400">
                          Confidence
                        </span>
                        <span
                          className={`text-sm font-bold ${
                            result.confidence_score >= 0.8
                              ? "text-emerald-400"
                              : result.confidence_score >= 0.5
                                ? "text-yellow-400"
                                : "text-red-400"
                          }`}
                        >
                          {(result.confidence_score * 100).toFixed(0)}%
                        </span>
                      </div>
                    )}
                    <span
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold uppercase tracking-wide ${
                        isCompleted
                          ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/20"
                          : isFailed
                            ? "bg-red-500/15 text-red-400 border border-red-500/20"
                            : "bg-yellow-500/15 text-yellow-400 border border-yellow-500/20"
                      }`}
                    >
                      {result.execution_status}
                    </span>
                  </div>
                </div>

                {/* Structured response */}
                {result.structured_response &&
                  Object.keys(result.structured_response).length > 0 && (
                    <div className="mb-5">
                      <div className="flex items-center gap-2 mb-3">
                        <div className="w-1 h-4 rounded-full bg-indigo-500" />
                        <span className="text-xs font-bold text-indigo-300 uppercase tracking-widest">
                          Analysis Results
                        </span>
                      </div>
                      {renderStructuredResponse(result.structured_response)}
                    </div>
                  )}

                {/* Citations */}
                {result.cited_sources && result.cited_sources.length > 0 && (
                  <div className="mb-4">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-1 h-4 rounded-full bg-purple-500" />
                      <span className="text-xs font-bold text-purple-300 uppercase tracking-widest">
                        Sources & Citations
                      </span>
                      <span className="text-xs text-gray-500">
                        ({result.cited_sources.length})
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {result.cited_sources.map((src: any, idx: number) => (
                        <div
                          key={idx}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-500/10 border border-purple-500/20 rounded-lg text-xs max-w-xs"
                        >
                          <span className="text-purple-400 shrink-0">🔗</span>
                          {src.source_url ? (
                            <a
                              href={src.source_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-purple-300 hover:text-purple-200 truncate"
                            >
                              {src.source_url
                                .replace(/^https?:\/\/(www\.)?/, "")
                                .slice(0, 50)}
                            </a>
                          ) : src.review_id ? (
                            <span className="text-gray-400">
                              Review #{src.review_id}
                            </span>
                          ) : src.mention_id ? (
                            <span className="text-gray-400">
                              Mention #{src.mention_id}
                            </span>
                          ) : null}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Timing */}
                <div className="flex items-center gap-4 pt-3 border-t border-white/5 text-xs text-gray-500">
                  <span>
                    ⏱{" "}
                    {result.execution_duration_ms
                      ? `${(result.execution_duration_ms / 1000).toFixed(1)}s`
                      : "—"}
                  </span>
                  {result.retry_count > 0 && (
                    <span className="text-yellow-500">
                      ↩ {result.retry_count} retr
                      {result.retry_count === 1 ? "y" : "ies"}
                    </span>
                  )}
                  <span className="ml-auto opacity-50">{result.prompt_id}</span>
                </div>

                {/* Error */}
                {result.error_message && (
                  <div className="mt-3 p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-xs text-red-400 flex gap-2">
                    <span className="shrink-0">⚠</span>
                    <span>{result.error_message}</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // =========================================================================
  // INTELLIGENCE TAB RENDERS
  // =========================================================================

  function renderEntityProfile() {
    return (
      <div className="space-y-6">
        <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold">
              🧠 Canonical Entity Profile
            </h3>
            <button
              onClick={handleBuildEntity}
              disabled={isBuildingEntity}
              className="px-5 py-2.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition disabled:opacity-50 text-sm font-medium"
            >
              {isBuildingEntity
                ? "Building..."
                : canonicalEntity
                  ? "Rebuild Entity"
                  : "Build Entity"}
            </button>
          </div>
          {entityError && (
            <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-sm text-red-400">
              {entityError}
            </div>
          )}
          {!canonicalEntity ? (
            <div className="text-center py-12 text-gray-400">
              <div className="text-5xl mb-4">🧠</div>
              <p>
                No canonical entity built yet. Run GEO analysis first, then
                click "Build Entity".
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Identity */}
              <div className="grid gap-4 md:grid-cols-2">
                <div className="p-4 bg-gray-900/50 rounded-xl border border-white/5">
                  <div className="text-xs font-bold text-indigo-400 uppercase mb-2">
                    Primary Category
                  </div>
                  <div className="text-white font-semibold">
                    {canonicalEntity.primary_category}
                  </div>
                </div>
                <div className="p-4 bg-gray-900/50 rounded-xl border border-white/5">
                  <div className="text-xs font-bold text-purple-400 uppercase mb-2">
                    Version
                  </div>
                  <div className="text-white font-semibold">
                    v{canonicalEntity.version}
                  </div>
                  {canonicalEntity.computed_at && (
                    <div className="text-xs text-gray-500 mt-1">
                      Built{" "}
                      {new Date(canonicalEntity.computed_at).toLocaleString()}
                    </div>
                  )}
                </div>
              </div>

              {/* Positioning */}
              {canonicalEntity.positioning_statement && (
                <div className="p-4 bg-gray-900/50 rounded-xl border border-white/5">
                  <div className="text-xs font-bold text-green-400 uppercase mb-2">
                    Positioning Statement
                  </div>
                  <div className="text-gray-300 text-sm">
                    {canonicalEntity.positioning_statement}
                  </div>
                </div>
              )}

              {/* Secondary Categories */}
              {canonicalEntity.secondary_categories.length > 0 && (
                <div className="p-4 bg-gray-900/50 rounded-xl border border-white/5">
                  <div className="text-xs font-bold text-blue-400 uppercase mb-2">
                    Secondary Categories
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {canonicalEntity.secondary_categories.map((cat, i) => (
                      <span
                        key={i}
                        className="px-3 py-1 bg-blue-500/15 text-blue-300 rounded-full text-xs"
                      >
                        {cat}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Services */}
              {canonicalEntity.services.length > 0 && (
                <div className="p-4 bg-gray-900/50 rounded-xl border border-white/5">
                  <div className="text-xs font-bold text-amber-400 uppercase mb-3">
                    Services ({canonicalEntity.services.length})
                  </div>
                  <div className="grid gap-2">
                    {canonicalEntity.services.map((svc: any, i: number) => (
                      <div
                        key={i}
                        className="flex items-center justify-between p-2 bg-white/5 rounded-lg text-sm"
                      >
                        <span className="text-white">{svc.name || svc}</span>
                        {svc.confidence && (
                          <span className="text-xs text-gray-400">
                            {(svc.confidence * 100).toFixed(0)}%
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Approved Terms / Vocabulary */}
              {canonicalEntity.approved_terms.length > 0 && (
                <div className="p-4 bg-gray-900/50 rounded-xl border border-white/5">
                  <div className="text-xs font-bold text-cyan-400 uppercase mb-2">
                    Approved Vocabulary
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {canonicalEntity.approved_terms.map((term, i) => (
                      <span
                        key={i}
                        className="px-2 py-1 bg-cyan-500/10 text-cyan-300 border border-cyan-500/20 rounded text-xs font-mono"
                      >
                        {term}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* ICP */}
              {Object.keys(canonicalEntity.icp).length > 0 && (
                <div className="p-4 bg-gray-900/50 rounded-xl border border-white/5">
                  <div className="text-xs font-bold text-pink-400 uppercase mb-2">
                    Ideal Customer Profile
                  </div>
                  <div className="grid gap-2 text-sm">
                    {Object.entries(canonicalEntity.icp).map(([key, val]) => (
                      <div key={key} className="flex gap-2">
                        <span className="text-gray-400 capitalize min-w-[120px]">
                          {key.replace(/_/g, " ")}:
                        </span>
                        <span className="text-gray-300">
                          {Array.isArray(val)
                            ? (val as string[]).join(", ")
                            : String(val)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Geo Scope */}
              {Object.keys(canonicalEntity.geo_scope).length > 0 && (
                <div className="p-4 bg-gray-900/50 rounded-xl border border-white/5">
                  <div className="text-xs font-bold text-emerald-400 uppercase mb-2">
                    Geographic Scope
                  </div>
                  <div className="grid gap-2 text-sm">
                    {Object.entries(canonicalEntity.geo_scope).map(
                      ([key, val]) => (
                        <div key={key} className="flex gap-2">
                          <span className="text-gray-400 capitalize min-w-[120px]">
                            {key.replace(/_/g, " ")}:
                          </span>
                          <span className="text-gray-300">
                            {Array.isArray(val)
                              ? (val as string[]).join(", ")
                              : String(val)}
                          </span>
                        </div>
                      ),
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    );
  }

  function renderGapsAndActions() {
    const severityColor: Record<string, string> = {
      critical: "bg-red-500/15 text-red-400 border-red-500/20",
      high: "bg-orange-500/15 text-orange-400 border-orange-500/20",
      medium: "bg-yellow-500/15 text-yellow-400 border-yellow-500/20",
      low: "bg-blue-500/15 text-blue-400 border-blue-500/20",
    };
    const impactColor: Record<string, string> = {
      high: "bg-red-500/15 text-red-300",
      medium: "bg-yellow-500/15 text-yellow-300",
      low: "bg-green-500/15 text-green-300",
    };

    return (
      <div className="space-y-6">
        {/* Gap Detection */}
        <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold">⚠️ Gap Detection</h3>
            <div className="flex gap-2">
              <button
                onClick={handleDetectGaps}
                disabled={isDetectingGaps}
                className="px-5 py-2.5 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition disabled:opacity-50 text-sm font-medium"
              >
                {isDetectingGaps ? "Detecting..." : "Detect Gaps"}
              </button>
              <button
                onClick={handleGeneratePlan}
                disabled={
                  isGeneratingPlan || !gapResult || gapResult.total_issues === 0
                }
                className="px-5 py-2.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition disabled:opacity-50 text-sm font-medium"
              >
                {isGeneratingPlan ? "Generating..." : "Generate Action Plan"}
              </button>
            </div>
          </div>
          {gapError && (
            <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-sm text-red-400">
              {gapError}
            </div>
          )}

          {/* Severity Summary */}
          {gapResult && gapResult.total_issues > 0 && (
            <div className="grid grid-cols-4 gap-3 mb-6">
              {[
                {
                  label: "Critical",
                  count: gapResult.critical,
                  color: "text-red-400",
                },
                {
                  label: "High",
                  count: gapResult.high,
                  color: "text-orange-400",
                },
                {
                  label: "Medium",
                  count: gapResult.medium,
                  color: "text-yellow-400",
                },
                { label: "Low", count: gapResult.low, color: "text-blue-400" },
              ].map((s) => (
                <div
                  key={s.label}
                  className="text-center p-3 bg-gray-900/50 rounded-xl"
                >
                  <div className={`text-2xl font-bold ${s.color}`}>
                    {s.count}
                  </div>
                  <div className="text-xs text-gray-400">{s.label}</div>
                </div>
              ))}
            </div>
          )}

          {/* Gap Issues */}
          {!gapResult || gapResult.total_issues === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <div className="text-5xl mb-4">✅</div>
              <p>
                No gap issues found. Build the canonical entity and click
                "Detect Gaps" to analyze.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {gapResult.issues.map((issue: GapIssueResponse) => (
                <div
                  key={issue.id}
                  className="p-4 bg-gray-900/50 rounded-xl border border-white/5"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <h4 className="text-white font-medium text-sm">
                        {issue.title}
                      </h4>
                      <p className="text-gray-400 text-xs mt-1">
                        {issue.description}
                      </p>
                    </div>
                    <div className="flex gap-2 shrink-0">
                      <span
                        className={`px-2 py-1 rounded text-xs font-bold uppercase border ${severityColor[issue.severity] || ""}`}
                      >
                        {issue.severity}
                      </span>
                      <span className="px-2 py-1 rounded text-xs bg-gray-700 text-gray-300">
                        {issue.gap_type.replace(/_/g, " ")}
                      </span>
                    </div>
                  </div>
                  {issue.affected_dimensions.length > 0 && (
                    <div className="flex gap-1 mt-2">
                      {issue.affected_dimensions.map((dim, i) => (
                        <span
                          key={i}
                          className="text-xs px-2 py-0.5 bg-indigo-500/10 text-indigo-300 rounded"
                        >
                          {dim}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Linked reinforcement tasks */}
                  {reinforcementPlan &&
                    reinforcementPlan.tasks.filter(
                      (t) => t.gap_issue_id === issue.id,
                    ).length > 0 && (
                      <div className="mt-3 pt-3 border-t border-white/5 space-y-2">
                        <div className="text-xs font-bold text-indigo-400 uppercase">
                          Action Tasks
                        </div>
                        {reinforcementPlan.tasks
                          .filter((t) => t.gap_issue_id === issue.id)
                          .map((task: TaskResponseType) => (
                            <div
                              key={task.id}
                              className="flex items-center gap-3 p-2 bg-white/5 rounded-lg"
                            >
                              <button
                                onClick={() =>
                                  handleTaskStatusToggle(task.id, task.status)
                                }
                                className={`w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 transition ${
                                  task.status === "completed"
                                    ? "bg-green-600 border-green-600 text-white"
                                    : "border-gray-500 hover:border-indigo-400"
                                }`}
                              >
                                {task.status === "completed" && "✓"}
                              </button>
                              <div className="flex-1 min-w-0">
                                <div
                                  className={`text-sm ${task.status === "completed" ? "line-through text-gray-500" : "text-white"}`}
                                >
                                  {task.title}
                                </div>
                                {task.implementation_hint && (
                                  <div className="text-xs text-gray-500 mt-0.5 truncate">
                                    {task.implementation_hint}
                                  </div>
                                )}
                              </div>
                              <span
                                className={`px-2 py-0.5 rounded text-xs font-medium ${impactColor[task.impact] || ""}`}
                              >
                                {task.impact}
                              </span>
                            </div>
                          ))}
                      </div>
                    )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  function renderPromptSimulation() {
    return (
      <div className="space-y-6">
        <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold">🔬 Prompt Simulation</h3>
            <button
              onClick={handleRunSimulation}
              disabled={isRunningSimulation}
              className="px-5 py-2.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition disabled:opacity-50 text-sm font-medium"
            >
              {isRunningSimulation ? (
                <>
                  <span className="inline-block animate-spin mr-2">⏳</span>
                  Running Simulation...
                </>
              ) : (
                "Run Full Simulation"
              )}
            </button>
          </div>
          {simulationError && (
            <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-sm text-red-400">
              {simulationError}
            </div>
          )}

          {/* Latest Run Summary */}
          {simulationRuns && simulationRuns.runs.length > 0 ? (
            <div className="space-y-4">
              {(() => {
                const latest = simulationRuns.runs[0];
                const mentionRate =
                  latest.total_prompts > 0
                    ? (latest.mentioned_count / latest.total_prompts) * 100
                    : 0;
                return (
                  <div className="p-5 bg-gradient-to-br from-emerald-900/20 to-cyan-900/20 rounded-2xl border border-white/10">
                    <div className="text-xs uppercase text-emerald-400 font-bold mb-3">
                      Latest Simulation
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="text-center">
                        <div className="text-3xl font-bold text-emerald-400">
                          {mentionRate.toFixed(0)}%
                        </div>
                        <div className="text-xs text-gray-400">
                          Mention Rate
                        </div>
                      </div>
                      <div className="text-center">
                        <div className="text-3xl font-bold text-green-400">
                          {latest.mentioned_count}
                        </div>
                        <div className="text-xs text-gray-400">Mentioned</div>
                      </div>
                      <div className="text-center">
                        <div className="text-3xl font-bold text-red-400">
                          {latest.not_mentioned_count}
                        </div>
                        <div className="text-xs text-gray-400">
                          Not Mentioned
                        </div>
                      </div>
                      <div className="text-center">
                        <div className="text-3xl font-bold text-gray-300">
                          {(latest.total_duration_ms / 1000).toFixed(1)}s
                        </div>
                        <div className="text-xs text-gray-400">Duration</div>
                      </div>
                    </div>
                    {latest.avg_confidence && (
                      <div className="mt-3 text-center text-sm text-gray-400">
                        Avg Confidence:{" "}
                        <span className="text-white font-semibold">
                          {(latest.avg_confidence * 100).toFixed(0)}%
                        </span>
                      </div>
                    )}
                    <div className="mt-2 text-center text-xs text-gray-500">
                      {latest.created_at
                        ? new Date(latest.created_at).toLocaleString()
                        : ""}
                    </div>
                  </div>
                );
              })()}

              {/* Per-prompt breakdown from snapshot */}
              {simulationRuns.runs[0].prompt_results_snapshot.length > 0 && (
                <div>
                  <h4 className="text-sm font-semibold mb-3 text-gray-300">
                    Per-Prompt Results
                  </h4>
                  <div className="space-y-2">
                    {simulationRuns.runs[0].prompt_results_snapshot.map(
                      (p: any, i: number) => (
                        <div
                          key={i}
                          className="flex items-center gap-3 p-3 bg-gray-900/50 rounded-xl"
                        >
                          <span
                            className={`w-3 h-3 rounded-full shrink-0 ${p.mentioned ? "bg-green-400" : "bg-red-400"}`}
                          />
                          <span className="text-sm text-white flex-1 truncate">
                            {p.prompt_id}
                          </span>
                          {p.confidence != null && (
                            <span className="text-xs text-gray-400">
                              {(p.confidence * 100).toFixed(0)}%
                            </span>
                          )}
                          <span className="text-xs text-gray-500">
                            {p.duration_ms
                              ? `${(p.duration_ms / 1000).toFixed(1)}s`
                              : ""}
                          </span>
                        </div>
                      ),
                    )}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-12 text-gray-400">
              <div className="text-5xl mb-4">🔬</div>
              <p>
                No simulation runs yet. Click "Run Full Simulation" to test how
                AI engines mention your business.
              </p>
            </div>
          )}
        </div>
      </div>
    );
  }

  function renderVisibilityResults() {
    return (
      <div className="space-y-6">
        <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
          <h3 className="text-lg font-semibold mb-6">📊 Visibility Results</h3>

          {simulationRuns && simulationRuns.runs.length > 0 ? (
            <div className="space-y-4">
              {/* Mention Rate Trend */}
              <div className="p-4 bg-gray-900/50 rounded-xl border border-white/5">
                <div className="text-xs font-bold text-emerald-400 uppercase mb-3">
                  Mention Rate Over Time
                </div>
                <div className="flex items-end gap-2 h-32">
                  {simulationRuns.runs
                    .slice()
                    .reverse()
                    .map((run, i) => {
                      const rate =
                        run.total_prompts > 0
                          ? (run.mentioned_count / run.total_prompts) * 100
                          : 0;
                      return (
                        <div
                          key={run.id}
                          className="flex-1 flex flex-col items-center gap-1"
                        >
                          <span className="text-xs text-gray-400">
                            {rate.toFixed(0)}%
                          </span>
                          <div
                            className="w-full bg-gradient-to-t from-emerald-600 to-emerald-400 rounded-t min-h-[4px]"
                            style={{ height: `${Math.max(rate, 4)}%` }}
                          />
                          <span className="text-[10px] text-gray-500">
                            Run {i + 1}
                          </span>
                        </div>
                      );
                    })}
                </div>
              </div>

              {/* Run History Table */}
              <div className="p-4 bg-gray-900/50 rounded-xl border border-white/5">
                <div className="text-xs font-bold text-indigo-400 uppercase mb-3">
                  Simulation History ({simulationRuns.total_runs} runs)
                </div>
                <div className="space-y-2">
                  {simulationRuns.runs.map((run) => {
                    const rate =
                      run.total_prompts > 0
                        ? (run.mentioned_count / run.total_prompts) * 100
                        : 0;
                    return (
                      <div
                        key={run.id}
                        className="flex items-center gap-4 p-3 bg-white/5 rounded-lg text-sm"
                      >
                        <span className="text-gray-400 text-xs w-32">
                          {run.created_at
                            ? new Date(run.created_at).toLocaleDateString()
                            : "—"}
                        </span>
                        <span className="text-white font-medium">
                          {rate.toFixed(0)}% mentioned
                        </span>
                        <span className="text-green-400">
                          {run.mentioned_count} ✓
                        </span>
                        <span className="text-red-400">
                          {run.not_mentioned_count} ✗
                        </span>
                        <span className="text-gray-500 ml-auto text-xs">
                          {(run.total_duration_ms / 1000).toFixed(1)}s
                        </span>
                        <button
                          onClick={() => handleAnalyzeReasoning(run.id)}
                          disabled={isAnalyzingReasoning}
                          className="px-3 py-1 bg-purple-600 text-white rounded text-xs hover:bg-purple-700 transition disabled:opacity-50"
                        >
                          Analyze
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Non-mention Analyses */}
              {reasoningAnalyses && reasoningAnalyses.total > 0 && (
                <div className="p-4 bg-gray-900/50 rounded-xl border border-white/5">
                  <div className="text-xs font-bold text-purple-400 uppercase mb-3">
                    Non-Mention Analyses ({reasoningAnalyses.total})
                  </div>
                  <div className="space-y-2">
                    {reasoningAnalyses.analyses.map((a) => (
                      <div key={a.id} className="p-3 bg-white/5 rounded-lg">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs font-mono text-gray-400">
                            {a.prompt_id}
                          </span>
                          <span className="px-2 py-0.5 rounded text-xs bg-purple-500/15 text-purple-300">
                            {a.reinforcement_class.replace(/_/g, " ")}
                          </span>
                          {a.confidence && (
                            <span className="text-xs text-gray-500">
                              {(a.confidence * 100).toFixed(0)}% conf
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-gray-300">{a.root_cause}</p>
                        {a.suggested_actions.length > 0 && (
                          <div className="mt-2 flex flex-wrap gap-1">
                            {a.suggested_actions.map((action, i) => (
                              <span
                                key={i}
                                className="text-xs px-2 py-0.5 bg-indigo-500/10 text-indigo-300 rounded"
                              >
                                {action}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-12 text-gray-400">
              <div className="text-5xl mb-4">📊</div>
              <p>
                No visibility data yet. Run a simulation first to see results.
              </p>
            </div>
          )}
        </div>
      </div>
    );
  }

  function renderDriftMonitor() {
    return (
      <div className="space-y-6">
        <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
          <h3 className="text-lg font-semibold mb-6">📈 Drift Monitor</h3>

          {driftReport ? (
            <div className="space-y-4">
              {/* Drift Status */}
              <div
                className={`p-5 rounded-2xl border ${
                  driftReport.has_drift
                    ? "bg-yellow-500/10 border-yellow-500/30"
                    : "bg-green-500/10 border-green-500/30"
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className="text-3xl">
                    {driftReport.has_drift ? "⚠️" : "✅"}
                  </span>
                  <div>
                    <div
                      className={`font-semibold ${driftReport.has_drift ? "text-yellow-400" : "text-green-400"}`}
                    >
                      {driftReport.has_drift
                        ? "Drift Detected"
                        : "No Significant Drift"}
                    </div>
                    <div className="text-xs text-gray-400">
                      {driftReport.simulation_runs_compared} simulation runs
                      compared
                      {driftReport.entity_version &&
                        ` • Entity v${driftReport.entity_version}`}
                    </div>
                  </div>
                </div>
              </div>

              {/* Drift Alerts */}
              {driftReport.alerts.length > 0 && (
                <div className="p-4 bg-gray-900/50 rounded-xl border border-white/5">
                  <div className="text-xs font-bold text-yellow-400 uppercase mb-3">
                    Drift Alerts
                  </div>
                  <div className="space-y-2">
                    {driftReport.alerts.map((alert: any, i: number) => (
                      <div
                        key={i}
                        className="p-3 bg-yellow-500/5 border border-yellow-500/10 rounded-lg"
                      >
                        <div className="text-sm text-yellow-300">
                          {alert.message || alert.type || JSON.stringify(alert)}
                        </div>
                        {alert.detail && (
                          <div className="text-xs text-gray-400 mt-1">
                            {alert.detail}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Mention Rate Trend */}
              {driftReport.mention_rate_trend.length > 0 && (
                <div className="p-4 bg-gray-900/50 rounded-xl border border-white/5">
                  <div className="text-xs font-bold text-emerald-400 uppercase mb-3">
                    Mention Rate Trend
                  </div>
                  <div className="flex items-end gap-2 h-24">
                    {driftReport.mention_rate_trend.map(
                      (point: any, i: number) => (
                        <div
                          key={i}
                          className="flex-1 flex flex-col items-center gap-1"
                        >
                          <span className="text-xs text-gray-400">
                            {typeof point.rate === "number"
                              ? `${(point.rate * 100).toFixed(0)}%`
                              : `${point.mention_rate || 0}%`}
                          </span>
                          <div
                            className="w-full bg-gradient-to-t from-emerald-600 to-emerald-400 rounded-t min-h-[4px]"
                            style={{
                              height: `${Math.max((point.rate || point.mention_rate || 0) * 100, 4)}%`,
                            }}
                          />
                        </div>
                      ),
                    )}
                  </div>
                </div>
              )}

              {/* Confidence Trend */}
              {driftReport.confidence_trend.length > 0 && (
                <div className="p-4 bg-gray-900/50 rounded-xl border border-white/5">
                  <div className="text-xs font-bold text-blue-400 uppercase mb-3">
                    Confidence Trend
                  </div>
                  <div className="flex items-end gap-2 h-24">
                    {driftReport.confidence_trend.map(
                      (point: any, i: number) => (
                        <div
                          key={i}
                          className="flex-1 flex flex-col items-center gap-1"
                        >
                          <span className="text-xs text-gray-400">
                            {typeof point.confidence === "number"
                              ? `${(point.confidence * 100).toFixed(0)}%`
                              : ""}
                          </span>
                          <div
                            className="w-full bg-gradient-to-t from-blue-600 to-blue-400 rounded-t min-h-[4px]"
                            style={{
                              height: `${Math.max((point.confidence || 0) * 100, 4)}%`,
                            }}
                          />
                        </div>
                      ),
                    )}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-12 text-gray-400">
              <div className="text-5xl mb-4">📈</div>
              <p>
                No drift data available. Run at least 2 simulations to detect
                drift.
              </p>
            </div>
          )}
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
    { id: "entity", label: "AI Entity Profile", icon: "🧠" },
    { id: "gaps", label: "Gaps & Actions", icon: "⚠️" },
    { id: "simulation", label: "Prompt Simulation", icon: "🔬" },
    { id: "visibility", label: "Visibility Results", icon: "📊" },
    { id: "drift", label: "Drift Monitor", icon: "📈" },
  ];

  return (
    <div className="min-h-screen bg-[#0b0b0f] text-white px-4 md:px-6 py-6 md:py-10">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <header className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-wider text-indigo-400 mb-1">
              GEO DASHBOARD
            </p>
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
            disabled={
              isComputingScore ||
              !promptResults ||
              promptResults.total_results === 0
            }
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
          <button
            onClick={handleStartCrawl}
            disabled={isCrawling || !businessProfile?.website}
            className="px-5 py-2.5 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
          >
            {isCrawling ? (
              <>
                <span className="inline-block animate-spin mr-2">🔄</span>
                Crawling
                {crawlStatus ? ` (${crawlStatus.pages_in_db} pages)` : "..."}
              </>
            ) : (
              "🌐 Crawl Website"
            )}
          </button>
          <button
            onClick={handleDiscoverMentions}
            disabled={isDiscovering}
            className="px-5 py-2.5 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
          >
            {isDiscovering ? (
              <>
                <span className="inline-block animate-spin mr-2">🔍</span>
                Discovering...
              </>
            ) : (
              "🔍 Discover Mentions"
            )}
          </button>
          {onNavigateBIS && (
            <button
              onClick={onNavigateBIS}
              className="px-5 py-2.5 bg-cyan-600 text-white rounded-lg hover:bg-cyan-700 transition text-sm font-medium"
            >
              🔍 Brand Intelligence Scan
            </button>
          )}
          {(crawlError || discoveryError) && (
            <div className="w-full mt-2 p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-sm text-red-400">
              {crawlError || discoveryError}
            </div>
          )}
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
        {activeSection === "entity" && renderEntityProfile()}
        {activeSection === "gaps" && renderGapsAndActions()}
        {activeSection === "simulation" && renderPromptSimulation()}
        {activeSection === "visibility" && renderVisibilityResults()}
        {activeSection === "drift" && renderDriftMonitor()}
      </div>
    </div>
  );
}
