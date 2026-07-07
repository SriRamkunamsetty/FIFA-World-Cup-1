import { describe, it, expect } from 'vitest';
import { decisionAssistantRequestSchema, broadcastRequestSchema } from '@/lib/security/validation';

describe('decisionAssistantRequestSchema', () => {
  it('accepts a valid message with no history', () => {
    const result = decisionAssistantRequestSchema.safeParse({ message: 'What about Gate A?' });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.history).toEqual([]);
  });

  it('rejects an empty message', () => {
    const result = decisionAssistantRequestSchema.safeParse({ message: '' });
    expect(result.success).toBe(false);
  });

  it('rejects a message over 500 characters', () => {
    const result = decisionAssistantRequestSchema.safeParse({ message: 'a'.repeat(501) });
    expect(result.success).toBe(false);
  });

  it('rejects history longer than 12 turns', () => {
    const history = Array.from({ length: 13 }, (_, i) => ({
      role: i % 2 === 0 ? ('user' as const) : ('assistant' as const),
      content: `turn ${i}`,
    }));
    const result = decisionAssistantRequestSchema.safeParse({ message: 'hi', history });
    expect(result.success).toBe(false);
  });

  it('rejects an unknown role in history', () => {
    const result = decisionAssistantRequestSchema.safeParse({
      message: 'hi',
      history: [{ role: 'system', content: 'nope' }],
    });
    expect(result.success).toBe(false);
  });
});

describe('broadcastRequestSchema', () => {
  it('accepts a valid message with supported languages', () => {
    const result = broadcastRequestSchema.safeParse({
      message: 'Gate B closing soon.',
      languages: ['en', 'es'],
    });
    expect(result.success).toBe(true);
  });

  it('rejects an empty languages array', () => {
    const result = broadcastRequestSchema.safeParse({ message: 'Gate B closing soon.', languages: [] });
    expect(result.success).toBe(false);
  });

  it('rejects an unsupported language code', () => {
    const result = broadcastRequestSchema.safeParse({ message: 'Gate B closing soon.', languages: ['de'] });
    expect(result.success).toBe(false);
  });

  it('rejects a message over 300 characters', () => {
    const result = broadcastRequestSchema.safeParse({ message: 'a'.repeat(301), languages: ['en'] });
    expect(result.success).toBe(false);
  });

  it('trims whitespace from the message', () => {
    const result = broadcastRequestSchema.safeParse({
      message: '  Gate B closing soon.  ',
      languages: ['en'],
    });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.message).toBe('Gate B closing soon.');
  });
});
