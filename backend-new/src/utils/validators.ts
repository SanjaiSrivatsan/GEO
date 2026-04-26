import { z } from 'zod';

// Auth Validators
export const RegisterSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

export const LoginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

// Business Profile Validators
export const CreateBusinessProfileSchema = z.object({
  name: z.string().min(1, 'Business name is required'),
  category: z.string().min(1, 'Category is required'),
  primaryLocation: z.string().min(1, 'Location is required'),
  website: z.string().url('Invalid website URL').optional(),
  brandVoice: z.string().optional(),
  mainGoal: z.string().optional(),
});

export const UpdateBusinessProfileSchema = CreateBusinessProfileSchema.partial();

// MongoDB ObjectId Validator
export const MongoIdSchema = z.object({
  id: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid MongoDB ObjectId'),
});

// Pagination Validator
export const PaginationSchema = z.object({
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().positive().max(100).optional().default(10),
  sort: z.string().optional(),
});

// Crawl Validator
export const CrawlSchema = z.object({
  businessId: z.string(),
  url: z.string().url('Invalid URL'),
});

// Geo Score Validator
export const GeoScoreSchema = z.object({
  businessId: z.string(),
});

// Gap Detection Validator
export const GapDetectionSchema = z.object({
  businessId: z.string(),
});

// BIS Scan Validator
export const BISScanSchema = z.object({
  businessName: z.string().min(1, 'Business name is required'),
});

// Export types for use in controllers
export type RegisterRequest = z.infer<typeof RegisterSchema>;
export type LoginRequest = z.infer<typeof LoginSchema>;
export type CreateBusinessProfileRequest = z.infer<typeof CreateBusinessProfileSchema>;
export type UpdateBusinessProfileRequest = z.infer<typeof UpdateBusinessProfileSchema>;
export type PaginationParams = z.infer<typeof PaginationSchema>;
