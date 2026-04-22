// Auth Types
export interface AuthPayload {
  userId: string;
  iat?: number;
  exp?: number;
}

export interface RegisterRequest {
  email: string;
  password: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface TokenResponse {
  accessToken: string;
  tokenType: string;
  expiresIn: number;
}

export interface UserResponse {
  id: string;
  email: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface AuthResponse {
  user: UserResponse;
  token: TokenResponse;
}

// Business Types
export enum CrawlStatus {
  NOT_STARTED = 'not_started',
  PENDING = 'pending',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  FAILED = 'failed',
}

export interface BusinessProfileRequest {
  name: string;
  category: string;
  primaryLocation: string;
  website?: string;
  brandVoice?: string;
  mainGoal?: string;
}

export interface BusinessProfileResponse {
  id: string;
  userId: string;
  name: string;
  category: string;
  primaryLocation: string;
  website?: string;
  brandVoice?: string;
  mainGoal?: string;
  crawlStatus: CrawlStatus;
  totalPagesCrawled: number;
  createdAt: Date;
  updatedAt: Date;
}

// GEO Score Types
export interface GeoScoreBreakdown {
  presenceScore: number;
  accuracyScore: number;
  trustScore: number;
  hallucinationPenalty: number;
  finalGeoScore: number;
}

export interface GeoScoreResponse extends GeoScoreBreakdown {
  id: string;
  businessProfileId: string;
  presenceBreakdown?: Record<string, unknown>;
  accuracyBreakdown?: Record<string, unknown>;
  trustBreakdown?: Record<string, unknown>;
  hallucinationBreakdown?: Record<string, unknown>;
  computedAt: Date;
}

// Gap Issue Types
export enum GapSeverity {
  CRITICAL = 'critical',
  HIGH = 'high',
  MEDIUM = 'medium',
  LOW = 'low',
}

export interface GapIssueResponse {
  id: string;
  businessProfileId: string;
  gapType: string;
  severity: GapSeverity;
  title: string;
  description: string;
  evidence?: Record<string, unknown>;
  affectedDimensions?: string[];
  createdAt: Date;
}

// Brand Mention Types
export interface BrandMentionResponse {
  id: string;
  businessProfileId: string;
  mentionText: string;
  sourceType: string;
  sourceUrl: string;
  mentionType: string;
  sentiment: 'positive' | 'negative' | 'neutral';
  postedDate: Date;
}

// Error Types
export interface ApiError {
  code: string;
  message: string;
  statusCode: number;
  details?: unknown;
}

// Pagination
export interface PaginationParams {
  page?: number;
  limit?: number;
  sort?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}
