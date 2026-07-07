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

  it('marks an insight as dispatched locally when the action button is clicked', async () => {
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

    const dispatchButton = await screen.findByRole('button', { name: /mark as dispatched/i });
    await user.click(dispatchButton);

    expect(screen.getByText(/marked as dispatched/i)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /mark as dispatched/i })).not.toBeInTheDocument();
  });
});
