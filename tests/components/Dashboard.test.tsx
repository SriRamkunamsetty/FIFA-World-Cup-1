import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { Dashboard } from '@/components/Dashboard';
import { buildLiveSignalsFixture } from '../fixtures/liveSignals';

describe('Dashboard', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('wires up the CSRF token, live signals, and every panel on load', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: RequestInfo | URL) => {
        const url = typeof input === 'string' ? input : input.toString();
        if (url.includes('/api/csrf-token')) {
          return { ok: true, json: async () => ({ token: 'test-token' }) } as Response;
        }
        if (url.includes('/api/live-signals')) {
          return { ok: true, json: async () => buildLiveSignalsFixture() } as Response;
        }
        return { ok: true, json: async () => ({}) } as Response;
      }),
    );

    render(<Dashboard />);

    await waitFor(() =>
      expect(screen.getByRole('heading', { name: /argentina vs japan/i })).toBeInTheDocument(),
    );

    expect(screen.getByRole('heading', { name: /operational intelligence briefing/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /gate & crowd status/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /ai decision assistant/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /multilingual broadcast/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /accessibility insights/i })).toBeInTheDocument();
    expect(screen.getByText(/unofficial hackathon prototype/i)).toBeInTheDocument();
  });

  it('shows an inline error banner when live signals fail to load', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: RequestInfo | URL) => {
        const url = typeof input === 'string' ? input : input.toString();
        if (url.includes('/api/live-signals')) throw new Error('network down');
        return { ok: true, json: async () => ({ token: 'test-token' }) } as Response;
      }),
    );

    render(<Dashboard />);

    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent(/temporarily unavailable/i));
  });
});
