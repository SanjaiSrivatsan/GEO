// Auth Types
export interface RegisterRequest {
  email: string;
  password: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface AuthResponse {
  user: UserResponse;
  token: TokenResponse;
}

export interface UserResponse {
  _id: string;
  email: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface TokenResponse {
  accessToken: string;
  tokenType: string;
  expiresIn: number;
}

// Business Profile Types
export interface CreateBusinessProfileRequest {
  name: string;
  category: string;
  primaryLocation: string;
  website?: string;
  brandVoice?: string;
  mainGoal?: string;
}

export interface BusinessProfileResponse {
  _id: string;
  userId: string;
  name: string;
  category: string;
  primaryLocation: string;
  website?: string;
  brandVoice?: string;
  mainGoal?: string;
  crawlStatus: string;
  crawlStartedAt?: Date;
  crawlCompletedAt?: Date;
  crawlError?: string;
  totalPagesCrawled: string;
  createdAt: Date;
  updatedAt: Date;
}

// GEO Score Types
export interface GeoScoreResponse {
  _id: string;
  businessProfileId: string;
  userId: string;
  presenceScore: number;
  accuracyScore: number;
  trustScore: number;
  hallucinationPenalty: number;
  finalGeoScore: number;
  presenceBreakdown?: Record<string, any>;
  accuracyBreakdown?: Record<string, any>;
  trustBreakdown?: Record<string, any>;
  hallucinationBreakdown?: Record<string, any>;
  promptResultsCount: number;
  computationMethod: string;
  computedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

// Crawl Types
export interface StartCrawlRequest {
  businessProfileId: string;
}

export interface CrawlStatusResponse {
  businessProfileId: string;
  status: string;
  startedAt?: Date;
  completedAt?: Date;
  error?: string;
  pageCount: number;
}

// Generic Response
export interface ApiResponse<T> {
  data?: T;
  error?: string;
  code?: string;
  statusCode?: number;
  message?: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  limit: number;
  offset: number;
}
