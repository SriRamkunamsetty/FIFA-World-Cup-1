import { z } from 'zod';

/**
 * Validate process.env once, at import time, instead of trusting
 * `process.env.X!` scattered across the codebase. Anything malformed fails
 * fast and loud instead of causing a confusing runtime error deep in a
 * request handler.
 */
const envSchema = z.object({
  ANTHROPIC_API_KEY: z.string().min(1).optional(),
  ANTHROPIC_MODEL: z.string().min(1).default('claude-sonnet-4-6'),
  CSRF_SECRET: z
    .string()
    .default('dev-only-insecure-secret-change-me')
    .refine((v) => v.length >= 16, {
      message: 'CSRF_SECRET should be at least 16 characters long.',
    }),
  RATE_LIMIT_MAX: z.coerce.number().int().positive().default(20),
  RATE_LIMIT_WINDOW_MS: z.coerce.number().int().positive().default(60_000),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  // Fail fast with a readable message rather than an opaque crash later.
  console.error('Invalid environment configuration:', parsed.error.flatten().fieldErrors);
  throw new Error('Invalid environment configuration. Check .env.example for required values.');
}

export const env = parsed.data;

/** Whether a real Anthropic API key is configured. */
export const hasRealAiProvider = Boolean(env.ANTHROPIC_API_KEY);
