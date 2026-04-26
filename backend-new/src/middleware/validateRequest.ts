import { Request, Response, NextFunction } from 'express';
import { ZodSchema, ZodError } from 'zod';
import { ApiError } from './errorHandler.js';

export function validateRequest(schema: { body?: ZodSchema; params?: ZodSchema; query?: ZodSchema }) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const errors: Record<string, string[]> = {};

    // Validate body
    if (schema.body) {
      const result = schema.body.safeParse(req.body);
      if (!result.success) {
        const parsed = result.error as ZodError;
        errors.body = parsed.errors.map((e) => `${e.path.join('.')}: ${e.message}`);
      }
    }

    // Validate params
    if (schema.params) {
      const result = schema.params.safeParse(req.params);
      if (!result.success) {
        const parsed = result.error as ZodError;
        errors.params = parsed.errors.map((e) => `${e.path.join('.')}: ${e.message}`);
      }
    }

    // Validate query
    if (schema.query) {
      const result = schema.query.safeParse(req.query);
      if (!result.success) {
        const parsed = result.error as ZodError;
        errors.query = parsed.errors.map((e) => `${e.path.join('.')}: ${e.message}`);
      }
    }

    if (Object.keys(errors).length > 0) {
      throw new ApiError(400, 'VALIDATION_ERROR', 'Validation failed', errors);
    }

    next();
  };
}
