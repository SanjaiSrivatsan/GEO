# GEO Platform - Service Module Component Guide

## Overview

Every service in the GEO backend is designed as an independent, reusable component. This guide shows how to use each service independently or combine them for advanced features.

---

## 1. AuthService - User Authentication

### Purpose

Handles user registration, authentication, and JWT token management.

### Independent Usage

```typescript
import { AuthService } from "./services/AuthService";

// Register a new user
const user = await AuthService.createUser("user@example.com", "SecurePass123!");

// Create access token
const token = AuthService.createAccessToken(user._id);

// Verify token
const userId = AuthService.verifyAccessToken(token);

// Authenticate user
const authenticatedUser = await AuthService.authenticateUser(
  "user@example.com",
  "SecurePass123!",
);
```

### Integrated Usage

Used by all protected routes via middleware for JWT validation.

### API Endpoints

- `POST /auth/register` - Create new user
- `POST /auth/login` - Authenticate user
- `GET /auth/me` - Get current user

---

## 2. CrawlerService - Website Content Extraction

### Purpose

Crawls websites to extract and store content for analysis.

### Independent Usage

```typescript
import { CrawlerService } from "./services/CrawlerService";

// Start crawling
const result = await CrawlerService.crawlWebsite(
  businessId,
  "https://website.com",
  { maxPages: 50, timeout: 30000 },
);

// Get crawl status
const status = await CrawlerService.getCrawlStatus(businessId);

// Retrieve crawled content
const content = await CrawlerService.getCrawlContent(businessId);
```

### Integrated Usage

- Can be called via `/api/crawl/start` endpoint
- Called by gap detection service for content analysis
- Content stored in WebsiteContent model

### Output Structure

```json
{
  "businessId": "507f1f77bcf86cd799439011",
  "status": "completed",
  "pagesCrawled": 15,
  "pages": [{ "id": "...", "url": "...", "title": "...", "textLength": 5000 }]
}
```

---

## 3. BISService - Brand Intelligence System

### Purpose

Scans multiple sources for brand mentions and sentiment analysis.

### Independent Usage

```typescript
import { BISService } from "./services/BISService";

// Run BIS scan
const mentions = await BISService.runBISScan(businessId, "Business Name");

// Get mentions
const savedMentions = await BISService.getMentions(businessId);

// Query specific source
const googleResults = await BISService.queryGoogleCSE("Business Name");
```

### Sources

- Google Custom Search
- YouTube
- NewsAPI
- Reddit (simulated)
- Social media

### Integrated Usage

- Provides sentiment data for trust score calculation
- Used by GeoScoringService

---

## 4. GeoScoringService - Scoring Algorithm

### Purpose

Computes GEO score using weighted formula:
`GEO_SCORE = (Presence × 0.35) + (Accuracy × 0.35) + (Trust × 0.20) + HallucinationPenalty`

### Independent Usage

```typescript
import { GeoScoringService } from "./services/GeoScoringService";

// Compute full score
const score = await GeoScoringService.computeGeoScore(businessId, userId);

// Get individual dimension scores
const presence = GeoScoringService.calculatePresenceScore(
  promptResults,
  mentions,
);
const accuracy = GeoScoringService.calculateAccuracyScore(
  promptResults,
  mentions,
);
const trust = GeoScoringService.calculateTrustScore(reviews, mentions, prompts);
```

### Score Dimensions

- **Presence (35%)**: How visible business is online
- **Accuracy (35%)**: How consistent information is
- **Trust (20%)**: How trustworthy information is
- **Hallucination Penalty (-10 to 0)**: AI accuracy reduction

### Output

```json
{
  "finalGeoScore": 87.5,
  "presenceScore": 90,
  "accuracyScore": 85,
  "trustScore": 80,
  "hallucinationPenalty": -5,
  "breakdown": { "detailed": "metrics" }
}
```

---

## 5. GapDetectionService - Consistency Analysis

### Purpose

Identifies 6 types of data inconsistencies and gaps.

### Gap Types

1. **CATEGORY_MISMATCH** - Business category undefined
2. **SERVICE_DRIFT** - Services don't match category
3. **VERTICAL_ABSENCE** - Missing in specific verticals
4. **MISSING_FAQ** - No FAQ content
5. **WEAK_GEO_BINDING** - Location info incomplete
6. **INCONSISTENT_VOCABULARY** - Terminology inconsistencies

### Independent Usage

```typescript
import { GapDetectionService } from "./services/GapDetectionService";

// Detect all gaps
const gaps = await GapDetectionService.detectAllGaps(businessId);

// Detect specific gap
const categoryGap = await GapDetectionService.detectCategoryMismatch(
  businessId,
  canonical,
);

// Filter by severity
const criticalGaps = await GapDetectionService.getGaps(businessId, "CRITICAL");

// Update gap status
await GapDetectionService.updateGapStatus(gapId, "resolved");
```

### Integration Points

- Provides input for reinforcement tasks
- Called after canonical entity creation

---

## 6. GeoPromptService - LLM Prompt Execution

### Purpose

Manages and executes prompt templates via LLM (Groq).

### Prompt Categories

- ENTITY_DEFINITION
- CATEGORY_VISIBILITY
- COMPARISON_ALTERNATIVES
- TRUST_REVIEWS
- LOCAL_DISCOVERY

### Independent Usage

```typescript
import { GeoPromptService } from "./services/GeoPromptService";

// Get all prompts
const prompts = await GeoPromptService.getPromptLibrary("ENTITY_DEFINITION");

// Execute single prompt
const result = await GeoPromptService.executePrompt(businessId, promptId);

// Execute all prompts
const results = await GeoPromptService.executeAllPrompts(businessId);

// Get results
const promptResults = await GeoPromptService.getResults(businessId);
```

### Output

```json
{
  "resultId": "507f1f77bcf86cd799439012",
  "promptId": "507f1f77bcf86cd799439013",
  "status": "completed",
  "result": { "entities": ["..."], "confidence": 0.92 }
}
```

---

## 7. GroqService - LLM Integration

### Purpose

Calls external LLM (Groq API) with retry logic.

### Independent Usage

```typescript
import { GroqService } from "./services/GroqService";

// Call LLM directly
const response = await GroqService.callLLM(
  "What are the main business categories?",
  "You are a business analyst.",
  0.7, // temperature
  1000, // maxTokens
);

// Includes automatic retry on rate limit (exponential backoff)
```

### Features

- Retry on rate limit with exponential backoff
- Max 3 retries
- Configurable temperature and token limits

---

## 8. CanonicalEntityService - Entity Synthesis

### Purpose

Creates authoritative entity representation from multiple sources.

### Independent Usage

```typescript
import { CanonicalEntityService } from "./services/CanonicalEntityService";

// Build canonical entity
const entity = await CanonicalEntityService.buildEntity(businessId);

// Get entity
const existing = await CanonicalEntityService.getEntity(businessId);

// Update entity
const updated = await CanonicalEntityService.updateEntity(businessId, updates);
```

### Components

- Primary category definition
- Services with confidence scores
- Vocabulary clusters
- Approved terminology

---

## 9. ReinforcementService - Action Generation

### Purpose

Generates actionable tasks to improve GEO score.

### Independent Usage

```typescript
import { ReinforcementService } from "./services/ReinforcementService";

// Generate tasks
const tasks = await ReinforcementService.generateTasks(businessId, gaps);

// Get tasks by priority
const criticalTasks = await ReinforcementService.getTasks(
  businessId,
  "critical",
);

// Update task status
await ReinforcementService.updateTaskStatus(taskId, "in_progress");
```

### Task Types

- High priority: Fix critical gaps
- Medium priority: Optimize accuracy
- Low priority: Enhance content

---

## 10. SimulationService - Scenario Analysis

### Purpose

Projects GEO score improvements based on hypothetical changes.

### Independent Usage

```typescript
import { SimulationService } from "./services/SimulationService";

// Run scenario simulation
const projection = await SimulationService.runSimulation(businessId, {
  expandServices: true,
  improveAccuracy: true,
});

// Get projected scores
// Includes: current vs projected, improvement potential
```

---

## 11. ReasoningService - Analysis Engine

### Purpose

Provides reasoning and drift analysis.

### Independent Usage

```typescript
import { ReasoningService } from "./services/ReasoningService";

// Analyze reasoning
const analysis = await ReasoningService.analyzeReasoning(businessId);

// Get drift report
const driftReport = await ReasoningService.getDriftReport(businessId);
```

### Output

```json
{
  "findings": ["Finding 1", "Finding 2"],
  "recommendations": ["Recommendation 1", "Recommendation 2"],
  "driftDetected": true,
  "severity": "medium"
}
```

---

## 12. GoogleService - Google Business Integration

### Purpose

OAuth integration with Google Business Profile APIs.

### Independent Usage

```typescript
import { GoogleService } from "./services/GoogleService";

// Get OAuth URL
const authUrl = await GoogleService.getOAuthUrl(businessId);

// Exchange code for token
const token = await GoogleService.handleOAuthCallback(businessId, code);

// Get locations
const locations = await GoogleService.getLocations(businessId);

// Get reviews
const reviews = await GoogleService.getReviews(businessId);
```

---

## Component Integration Patterns

### Pattern 1: Sequential Analysis

```typescript
// 1. Crawl
const crawlResult = await CrawlerService.crawlWebsite(id, url);

// 2. Execute prompts
const promptResults = await GeoPromptService.executeAllPrompts(id);

// 3. Get mentions
const mentions = await BISService.runBISScan(id, name);

// 4. Calculate score
const score = await GeoScoringService.computeGeoScore(id, userId);

// 5. Detect gaps
const gaps = await GapDetectionService.detectAllGaps(id);

// 6. Generate tasks
const tasks = await ReinforcementService.generateTasks(id, gaps);
```

### Pattern 2: Parallel Execution

```typescript
// All can run in parallel
const [crawl, prompts, mentions] = await Promise.all([
  CrawlerService.crawlWebsite(id, url),
  GeoPromptService.executeAllPrompts(id),
  BISService.runBISScan(id, name),
]);

// Then compute score
const score = await GeoScoringService.computeGeoScore(id, userId);
```

### Pattern 3: On-Demand Components

```typescript
// User can call specific analysis
if (userRequest.includes("simulate")) {
  const projection = await SimulationService.runSimulation(id, params);
}

if (userRequest.includes("reasoning")) {
  const analysis = await ReasoningService.analyzeReasoning(id);
}

if (userRequest.includes("google")) {
  const locations = await GoogleService.getLocations(id);
}
```

---

## Testing Individual Modules

### Unit Test Template

```typescript
import { YourService } from "./services/YourService";
import { YourModel } from "./models/YourModel";

describe("YourService", () => {
  beforeEach(() => {
    // Mock database
    jest.mock("./models/YourModel");
  });

  test("should perform operation independently", async () => {
    const result = await YourService.staticMethod(param);
    expect(result).toBeDefined();
  });
});
```

### Integration Test Template

```typescript
test("YourService integratedwith OtherService", async () => {
  const step1 = await ServiceA.method();
  const step2 = await ServiceB.method(step1.output);
  expect(step2).toBeDefined();
});
```

---

## Module Dependency Map

```
AuthService (standalone)
├── Used by: All protected routes (middleware)

CrawlerService (standalone)
├── Used by: GapDetectionService
└── Called via: /api/crawl endpoints

BISService (standalone)
├── Used by: GeoScoringService
└── Called via: /api/bis endpoints

GeoPromptService
├── Depends on: GroqService
├── Used by: GeoScoringService
└── Called via: /api/geo/prompts endpoints

GroqService (utility)
├── Used by: GeoPromptService

GeoScoringService
├── Depends on: GeoPromptResult, BrandMention, GoogleReview
├── Used by: Business analysis workflows
└── Called via: /api/geo/score endpoints

GapDetectionService
├── Depends on: CrawlerService (implicit)
├── Produces input for: ReinforcementService
└── Called via: /api/gap-detection endpoints

CanonicalEntityService (standalone)
├── Used by: Gap detection workflows

ReinforcementService
├── Depends on: GapDetectionService results
└── Called via: /api/reinforcement endpoints

SimulationService (standalone)
└── Called via: /api/simulation endpoints

ReasoningService (standalone)
└── Called via: /api/reasoning endpoints

GoogleService (standalone)
└── Called via: /api/google endpoints
```

---

## Performance Characteristics

| Service                | Execution Time | Cacheable | Dependencies     |
| ---------------------- | -------------- | --------- | ---------------- |
| AuthService            | <50ms          | No        | None             |
| CrawlerService         | 5-60s          | Yes (URL) | WebContent model |
| BISService             | 2-30s          | Yes (1h)  | External APIs    |
| GeoScoringService      | 100-500ms      | Yes (1h)  | Queries          |
| GapDetectionService    | 50-200ms       | Yes (1h)  | Entities         |
| GeoPromptService       | 2-10s          | Yes (24h) | GroqService      |
| GroqService            | 1-5s           | Yes (24h) | LLM API          |
| CanonicalEntityService | 100-300ms      | Yes (1h)  | Models           |
| ReinforcementService   | 50-100ms       | Yes (1h)  | Gaps             |
| SimulationService      | 200-500ms      | Yes (1h)  | Models           |
| ReasoningService       | 100-300ms      | Yes (1h)  | Analysis         |
| GoogleService          | 500-2000ms     | Yes (1h)  | Google APIs      |

---

## Recommended Usage Scenarios

### Scenario 1: Quick Health Check (5-10 seconds)

```
1. AuthService.authenticateUser()
2. GeoScoringService (if exists)
3. Return current status
```

### Scenario 2: Full Analysis (30-60 seconds)

```
1. CrawlerService.crawlWebsite()
2. BISService.runBISScan()
3. GeoPromptService.executeAllPrompts()
4. GeoScoringService.computeGeoScore()
5. GapDetectionService.detectAllGaps()
6. ReinforcementService.generateTasks()
```

### Scenario 3: Custom Analysis

```
User selects which modules to run:
- SimulationService for projections
- ReasoningService for analysis
- GoogleService for reviews
```

---

## Deployment Tips

- **Services are stateless**: Deploy multiple instances
- **Use caching**: Leverage Redis for frequently called services
- **Parallel execution**: Call independent services concurrently
- **Error isolation**: Service failures don't crash API
- **Monitoring**: Each service has independent success/failure metrics

---

**Component Architecture**: Fully modular, independently testable, scalable
**Status**: PRODUCTION READY ✓
**Last Updated**: 2026-04-18
