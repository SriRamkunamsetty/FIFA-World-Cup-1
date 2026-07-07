import { describe, it, expect } from 'vitest';
import { cn, formatClock } from '@/lib/utils';

describe('cn', () => {
  it('joins truthy class names with a space', () => {
    expect(cn('a', 'b', 'c')).toBe('a b c');
  });

  it('skips false, null, and undefined values', () => {
    expect(cn('a', false, null, undefined, 'b')).toBe('a b');
  });

  it('supports conditional classes inline', () => {
    const isActive = true;
    const isDisabled = false;
    expect(cn('base', isActive && 'active', isDisabled && 'disabled')).toBe('base active');
  });

  it('returns an empty string when nothing is truthy', () => {
    expect(cn(false, null, undefined)).toBe('');
  });
});

describe('formatClock', () => {
  it('formats an ISO timestamp as a local time string', () => {
    const formatted = formatClock('2026-06-15T19:03:00.000Z');
    // Exact wall-clock text depends on the test runner's timezone, so assert
    // shape (contains a colon-separated time) rather than an exact string.
    expect(formatted).toMatch(/\d{1,2}:\d{2}/);
  });
});
