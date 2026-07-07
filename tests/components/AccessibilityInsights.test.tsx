import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AccessibilityInsights } from '@/components/AccessibilityInsights';

describe('AccessibilityInsights', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('loads and displays prioritized insights when the button is clicked', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          insights: [
            {
              id: 'acc-0',
              type: 'wheelchair-escort',
              gateId: 'gate-c',
              status: 'open',
              minutesOpen: 18,
              note: 'test',
              priority: 'high',
              recommendedAction: 'Dispatch a mobility-assist volunteer to gate-c.',
            },
          ],
        }),
      }),
    );

    const user = userEvent.setup();
    render(<AccessibilityInsights csrfToken="test-token" />);

    await user.click(screen.getByRole('button', { name: /get prioritized actions/i }));

    await waitFor(() =>
      expect(screen.getByText('Dispatch a mobility-assist volunteer to gate-c.')).toBeInTheDocument(),
    );
    expect(screen.getByText(/high priority/i)).toBeInTheDocument();
  });

  it('shows an error message when the request fails', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ ok: false, json: async () => ({ error: 'Could not load insights.' }) }),
    );

    const user = userEvent.setup();
    render(<AccessibilityInsights csrfToken="test-token" />);
    await user.click(screen.getByRole('button', { name: /get prioritized actions/i }));

    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('Could not load insights.'));
  });
});
