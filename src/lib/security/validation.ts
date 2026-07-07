import { z } from 'zod';
import { SUPPORTED_LANGUAGES, type LanguageCode } from '@/types/domain';

const languageCodes = SUPPORTED_LANGUAGES.map((l) => l.code) as [LanguageCode, ...LanguageCode[]];

/** Shared so the AI response schema (client.ts) validates against the same literal union. */
export const languageCodeSchema = z.enum(languageCodes);

/**
 * Every API route parses its input through one of these schemas before
 * touching any business logic or AI call. Nothing that reaches a handler
 * body is untyped or unchecked.
 *
 * Design note: the client is never trusted to supply operational facts
 * (gate density, wait times, accessibility queue state, etc.) — those
 * always come from the server-side simulation/live-signals module. Only
 * free-text intent (a chat question, a broadcast draft) crosses the trust
 * boundary from the client, and it is always length-capped here.
 */

export const chatMessageSchema = z.object({
  role: z.enum(['user', 'assistant']),
  content: z.string().min(1).max(2000),
});

export const decisionAssistantRequestSchema = z.object({
  message: z
    .string()
    .trim()
    .min(1, 'Message cannot be empty.')
    .max(500, 'Keep questions under 500 characters.'),
  history: z.array(chatMessageSchema).max(12).optional().default([]),
});

export type DecisionAssistantRequest = z.infer<typeof decisionAssistantRequestSchema>;

export const broadcastRequestSchema = z.object({
  message: z
    .string()
    .trim()
    .min(1, 'Message cannot be empty.')
    .max(300, 'Keep broadcasts under 300 characters so they translate cleanly.'),
  languages: z.array(languageCodeSchema).min(1, 'Choose at least one language.').max(languageCodes.length),
});

export type BroadcastRequest = z.infer<typeof broadcastRequestSchema>;
