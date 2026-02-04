/**
 * API Utility Functions
 * Centralized fetch wrapper with authentication and error handling
 */

import { getAuthToken, removeAuthToken } from './auth';

// Backend API base URL
const API_BASE_URL = 'http://localhost:8000/api';

/**
 * Custom error class for API errors
 */
export class APIError extends Error {
  status: number;
  data?: any;
  
  constructor(
    message: string,
    status: number,
    data?: any
  ) {
    super(message);
    this.name = 'APIError';
    this.status = status;
    this.data = data;
  }
}

/**
 * Make an authenticated API request
 * Automatically adds Authorization header if token exists
 * Handles 401 errors by clearing token and redirecting to login
 */
export async function fetchAPI<T = any>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const token = getAuthToken();
  
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  
  // Merge in any custom headers
  if (options.headers) {
    Object.assign(headers, options.headers);
  }
  
  // Add Authorization header if token exists
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  
  const url = `${API_BASE_URL}${endpoint}`;
  
  try {
    const response = await fetch(url, {
      ...options,
      headers,
    });
    
    // Handle 401 Unauthorized (token expired or invalid)
    if (response.status === 401) {
      removeAuthToken();
      // Redirect to login page
      window.location.href = '/';
      throw new APIError('Session expired. Please login again.', 401);
    }
    
    // Parse response
    const data = await response.json().catch(() => null);
    
    // Handle error responses
    if (!response.ok) {
      throw new APIError(
        data?.detail || `Request failed with status ${response.status}`,
        response.status,
        data
      );
    }
    
    return data as T;
  } catch (error) {
    // Re-throw APIError as-is
    if (error instanceof APIError) {
      throw error;
    }
    
    // Network or other errors
    throw new APIError(
      error instanceof Error ? error.message : 'Network error',
      0
    );
  }
}

/**
 * Authentication API Types
 */
export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
}

export interface UserResponse {
  id: string;
  email: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface TokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
}

export interface AuthResponse {
  user: UserResponse;
  token: TokenResponse;
}

/**
 * Login user with email and password
 * @returns User info and JWT token
 */
export async function login(email: string, password: string): Promise<AuthResponse> {
  return fetchAPI<AuthResponse>('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
}

/**
 * Register new user account
 * @returns User info and JWT token
 */
export async function register(email: string, password: string): Promise<AuthResponse> {
  return fetchAPI<AuthResponse>('/auth/register', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
}

/**
 * Get current authenticated user
 * @returns User info
 */
export async function getCurrentUser(): Promise<UserResponse> {
  return fetchAPI<UserResponse>('/auth/me', {
    method: 'GET',
  });
}

/**
 * Business Profile API Types
 */
export interface BusinessProfileCreate {
  name: string;
  category: string;
  primary_location: string;
  website?: string;
  brand_voice?: string;
  main_goal?: string;
}

export interface BusinessProfileResponse {
  id: string;
  user_id: string;
  name: string;
  category: string;
  primary_location: string;
  website: string;
  brand_voice: string;
  main_goal: string;
  created_at: string;
  updated_at: string;
}

export interface BusinessProfileCreateResponse {
  profile: BusinessProfileResponse;
  message: string;
}

/**
 * Create a new business profile
 * @param profileData Business profile data
 * @returns Created business profile with entity_id
 */
export async function createBusinessProfile(
  profileData: BusinessProfileCreate
): Promise<BusinessProfileCreateResponse> {
  return fetchAPI<BusinessProfileCreateResponse>('/business/profiles', {
    method: 'POST',
    body: JSON.stringify(profileData),
  });
}

/**
 * Get all business profiles for current user
 * @returns List of business profiles
 */
export async function getBusinessProfiles(): Promise<BusinessProfileResponse[]> {
  return fetchAPI<BusinessProfileResponse[]>('/business/profiles', {
    method: 'GET',
  });
}

/**
 * Get the current user's active business profile
 * @returns Current business profile details
 */
export async function getCurrentBusinessProfile(): Promise<BusinessProfileResponse> {
  return fetchAPI<BusinessProfileResponse>('/business/profiles/current', {
    method: 'GET',
  });
}

/**
 * Get a specific business profile by ID
 * @param profileId Business profile UUID
 * @returns Business profile details
 */
export async function getBusinessProfile(profileId: string): Promise<BusinessProfileResponse> {
  return fetchAPI<BusinessProfileResponse>(`/business/profiles/${profileId}`, {
    method: 'GET',
  });
}

/**
 * Crawl API Types
 */
export interface StartCrawlRequest {
  entity_id: string;
}

export interface StartCrawlResponse {
  status: string;
  message: string;
  entity_id: string;
}

export interface CrawlStatusResponse {
  entity_id: string;
  status: string;
  started_at: string | null;
  completed_at: string | null;
  error: string | null;
  total_pages: number;
  pages_in_db: number;
}

export interface ContentItem {
  id: string;
  url: string;
  page_type: string;
  title: string;
  meta_description: string;
  h1_tags: string[];
  h2_tags: string[];
  cleaned_text: string;
  word_count: number;
  extracted_name: string | null;
  extracted_address: string | null;
  extracted_phone: string | null;
  crawled_at: string | null;
}

export interface CrawlContentResponse {
  entity_id: string;
  total_pages: number;
  content: ContentItem[];
}

/**
 * Start website crawl for a business entity
 * @param entityId Business profile UUID
 * @returns Crawl start confirmation
 */
export async function startCrawl(entityId: string): Promise<StartCrawlResponse> {
  return fetchAPI<StartCrawlResponse>('/crawl/start', {
    method: 'POST',
    body: JSON.stringify({ entity_id: entityId }),
  });
}

/**
 * Get crawl status for a business entity
 * @param entityId Business profile UUID
 * @returns Current crawl status and progress
 */
export async function getCrawlStatus(entityId: string): Promise<CrawlStatusResponse> {
  return fetchAPI<CrawlStatusResponse>(`/crawl/status/${entityId}`, {
    method: 'GET',
  });
}

/**
 * Get crawled content for a business entity
 * @param entityId Business profile UUID
 * @param pageType Optional filter by page type (homepage, about, services, etc.)
 * @returns List of crawled pages with content
 */
export async function getCrawlContent(
  entityId: string,
  pageType?: string
): Promise<CrawlContentResponse> {
  const params = pageType ? `?page_type=${pageType}` : '';
  return fetchAPI<CrawlContentResponse>(`/crawl/content/${entityId}${params}`, {
    method: 'GET',
  });
}


// ============================================
// Google Business Profile API Functions
// ============================================

export interface GoogleAuthUrlResponse {
  authorization_url: string;
  state: string;
}

export interface GoogleConnectionStatus {
  connected: boolean;
  email: string | null;
  connected_at: string | null;
  last_synced_at: string | null;
}

export interface GoogleLocation {
  google_location_id: string;
  name: string;
  category: string;
  full_address: string;
  city: string;
  state: string;
  country: string;
  website: string | null;
  phone: string | null;
  status: string;
  verification_state: string;
}

export interface LocationsResponse {
  locations: GoogleLocation[];
  total: number;
}

export interface SelectLocationRequest {
  google_location_id: string;
  business_profile_id: string;
}

export interface SelectLocationResponse {
  success: boolean;
  message: string;
  location_id: string;
}

export interface ReviewSyncResponse {
  status: string;
  new_reviews: number;
  updated_reviews: number;
  total_reviews: number;
  average_rating: string | null;
}

/**
 * Get Google OAuth authorization URL
 * @returns Authorization URL and state for CSRF protection
 */
export async function getGoogleAuthUrl(): Promise<GoogleAuthUrlResponse> {
  return fetchAPI<GoogleAuthUrlResponse>('/google/auth/url', {
    method: 'GET',
  });
}

/**
 * Get Google connection status
 * @returns Connection status with email and timestamps
 */
export async function getGoogleConnectionStatus(): Promise<GoogleConnectionStatus> {
  return fetchAPI<GoogleConnectionStatus>('/google/connection/status', {
    method: 'GET',
  });
}

/**
 * Disconnect Google account
 * @returns Success confirmation
 */
export async function disconnectGoogle(): Promise<{ success: boolean; message: string }> {
  return fetchAPI<{ success: boolean; message: string }>('/google/disconnect', {
    method: 'POST',
  });
}

/**
 * Get Google Business Profile locations
 * @returns List of user's GBP locations
 */
export async function getGoogleLocations(): Promise<LocationsResponse> {
  return fetchAPI<LocationsResponse>('/google/locations', {
    method: 'GET',
  });
}

/**
 * Select and link a Google location to business profile
 * @param request Location selection details
 * @returns Selection confirmation with location ID
 */
export async function selectGoogleLocation(
  request: SelectLocationRequest
): Promise<SelectLocationResponse> {
  return fetchAPI<SelectLocationResponse>('/google/location/select', {
    method: 'POST',
    body: JSON.stringify(request),
  });
}

/**
 * Sync reviews for a Google location
 * @param googleLocationId Google location ID
 * @returns Sync result with review counts
 */
export async function syncGoogleReviews(
  googleLocationId: string
): Promise<ReviewSyncResponse> {
  return fetchAPI<ReviewSyncResponse>(
    `/google/reviews/sync?google_location_id=${googleLocationId}`,
    {
      method: 'POST',
    }
  );
}


// ============================================
// Brand Mention Discovery API Functions
// ============================================

export interface StartDiscoveryRequest {
  entity_id: string;
  use_google?: boolean;
  use_bing?: boolean;
  max_results_per_query?: number;
}

export interface DiscoveryStatusResponse {
  status: string;
  queries_executed: number;
  results_scraped: number;
  new_mentions: number;
  updated_mentions: number;
  skipped_duplicates: number;
  total_mentions: number;
}

export interface MentionItem {
  id: string;
  source_url: string;
  source_domain: string;
  page_title: string | null;
  extracted_snippet: string | null;
  mention_type: string;
  sentiment: string;
  status: string;
  search_query: string | null;
  search_position: string | null;
  discovery_method: string | null;
  discovered_at: string;
}

export interface MentionsListResponse {
  entity_id: string;
  total: number;
  mentions: MentionItem[];
}

export interface MentionStatsResponse {
  total_mentions: number;
  by_type: Record<string, number>;
  by_sentiment: Record<string, number>;
  by_status: Record<string, number>;
  top_domains: Array<{ domain: string; count: number }>;
}

/**
 * Start brand mention discovery for a business entity
 * @param request Discovery configuration
 * @returns Discovery status and results summary
 */
export async function startMentionDiscovery(
  request: StartDiscoveryRequest
): Promise<DiscoveryStatusResponse> {
  return fetchAPI<DiscoveryStatusResponse>('/mentions/discover', {
    method: 'POST',
    body: JSON.stringify(request),
  });
}

/**
 * Get brand mentions for a business entity
 * @param entityId Business profile UUID
 * @param filters Optional filters (type, sentiment, status, limit)
 * @returns List of brand mentions
 */
export async function getMentions(
  entityId: string,
  filters?: {
    mention_type?: string;
    sentiment?: string;
    status?: string;
    limit?: number;
  }
): Promise<MentionsListResponse> {
  const params = new URLSearchParams();
  if (filters?.mention_type) params.append('mention_type', filters.mention_type);
  if (filters?.sentiment) params.append('sentiment', filters.sentiment);
  if (filters?.status) params.append('status', filters.status);
  if (filters?.limit) params.append('limit', filters.limit.toString());
  
  const queryString = params.toString();
  const url = `/mentions/${entityId}${queryString ? `?${queryString}` : ''}`;
  
  return fetchAPI<MentionsListResponse>(url, {
    method: 'GET',
  });
}

/**
 * Get mention statistics for a business entity
 * @param entityId Business profile UUID
 * @returns Mention statistics
 */
export async function getMentionStats(
  entityId: string
): Promise<MentionStatsResponse> {
  return fetchAPI<MentionStatsResponse>(`/mentions/${entityId}/stats`, {
    method: 'GET',
  });
}

// ============================================================================
// GEO PROMPTS API (Step 15)
// ============================================================================

/**
 * GEO Prompt Execution Types
 */

export interface RunPromptsRequest {
  entity_id: string;
  category_filter?: string | null;
}

export interface PromptExecutionResult {
  prompt_id: string;
  status: string;
  duration_ms: number;
}

export interface ExecutionSummary {
  total: number;
  succeeded: number;
  failed: number;
  duration_ms: number;
  results: PromptExecutionResult[];
}

export interface CitationItem {
  type: 'website' | 'review' | 'mention';
  url?: string;
  id?: string;
  path?: string;
}

export interface PromptResultDetail {
  result_id: string;
  prompt_id: string;
  prompt_title: string;
  prompt_category: string;
  execution_status: string;
  execution_timestamp: string;
  execution_duration_ms: number;
  raw_response?: string;
  structured_response?: Record<string, any>;
  confidence_score?: number;
  cited_sources?: CitationItem[];
  validation_passed?: string;
  validation_errors?: Record<string, any>;
  error_message?: string;
  retry_count: number;
}

export interface PromptResultsResponse {
  business_id: string;
  business_name: string;
  total_results: number;
  categories: Record<string, PromptResultDetail[]>;
}

export interface PromptLibraryItem {
  prompt_id: string;
  category: string;
  title: string;
  description?: string;
  temperature: number;
  scoring_weight: number;
  execution_order: number;
  is_active: string;
}

/**
 * Execute all GEO prompts for a business entity
 * @param entityId Business profile UUID
 * @param categoryFilter Optional category filter
 * @returns Execution summary
 */
export async function runGeoPrompts(
  entityId: string,
  categoryFilter?: string
): Promise<ExecutionSummary> {
  return fetchAPI<ExecutionSummary>('/geo/prompts/run', {
    method: 'POST',
    body: JSON.stringify({
      entity_id: entityId,
      category_filter: categoryFilter || null,
    }),
  });
}

/**
 * Get GEO prompt execution results for a business entity
 * @param entityId Business profile UUID
 * @param category Optional category filter
 * @returns Prompt results grouped by category
 */
export async function getPromptResults(
  entityId: string,
  category?: string
): Promise<PromptResultsResponse> {
  const params = new URLSearchParams();
  if (category) params.append('category', category);
  
  const queryString = params.toString();
  const url = `/geo/prompts/results/${entityId}${queryString ? `?${queryString}` : ''}`;
  
  return fetchAPI<PromptResultsResponse>(url, {
    method: 'GET',
  });
}

/**
 * Get the GEO prompt library (all available prompts)
 * @returns List of all prompts in the library
 */
export async function getPromptLibrary(): Promise<PromptLibraryItem[]> {
  return fetchAPI<PromptLibraryItem[]>('/geo/prompts/library', {
    method: 'GET',
  });
}


// ============================================================================
// GEO SCORING (Step 16)
// ============================================================================

/**
 * Request to compute GEO score
 */
export interface ComputeScoreRequest {
  entity_id: string;
}

/**
 * Score breakdown for a dimension
 */
export interface ScoreBreakdown {
  score: number;
  weight: number;
  contribution: number;
  details?: Record<string, any>;
}

/**
 * Detailed GEO score response with full breakdowns
 */
export interface GeoScoreResponse {
  score_id: string;
  business_profile_id: string;
  business_name: string;
  
  // Core scores (0-100 scale)
  presence_score: number;
  accuracy_score: number;
  trust_score: number;
  hallucination_penalty: number;  // -10 to 0
  final_geo_score: number;
  
  // Detailed breakdowns (JSON)
  presence_breakdown?: Record<string, any>;
  accuracy_breakdown?: Record<string, any>;
  trust_breakdown?: Record<string, any>;
  hallucination_breakdown?: Record<string, any>;
  
  // Metadata
  prompt_results_count: number;
  computation_method: string;
  computed_at: string;
  
  // Explanation
  formula: string;
  calculation: Record<string, any>;
  total_calculation_string: string;
}

/**
 * Score breakdown response (simplified)
 */
export interface ScoreBreakdownResponse {
  business_profile_id: string;
  business_name: string;
  final_geo_score: number;
  computed_at: string;
  breakdowns: {
    presence?: Record<string, any>;
    accuracy?: Record<string, any>;
    trust?: Record<string, any>;
    hallucination?: Record<string, any>;
  };
  metadata: {
    prompt_results_count: number;
    computation_method: string;
  };
}

/**
 * Compute GEO score for a business entity
 * Runs deterministic scoring engine on all completed prompt results
 * 
 * @param entityId Business profile UUID
 * @returns Full GEO score with transparent breakdowns
 */
export async function computeGeoScore(
  entityId: string
): Promise<GeoScoreResponse> {
  return fetchAPI<GeoScoreResponse>('/geo/score/compute', {
    method: 'POST',
    body: JSON.stringify({
      entity_id: entityId,
    }),
  });
}

/**
 * Get the latest GEO score for a business entity
 * 
 * @param entityId Business profile UUID
 * @returns Latest GEO score with all components
 */
export async function getGeoScore(
  entityId: string
): Promise<GeoScoreResponse> {
  return fetchAPI<GeoScoreResponse>(`/geo/score/${entityId}`, {
    method: 'GET',
  });
}

/**
 * Get detailed score breakdown for a business entity
 * Returns granular details for each dimension
 * 
 * @param entityId Business profile UUID
 * @returns Detailed breakdowns for all dimensions
 */
export async function getScoreBreakdown(
  entityId: string
): Promise<ScoreBreakdownResponse> {
  return fetchAPI<ScoreBreakdownResponse>(`/geo/score/breakdown/${entityId}`, {
    method: 'GET',
  });
}
