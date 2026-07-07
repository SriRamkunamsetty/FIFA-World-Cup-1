import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { OperationalBriefing } from '@/components/OperationalBriefing';

describe('OperationalBriefing', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('requests and displays the briefing text when the button is clicked', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ briefing: 'Gate A needs attention.', generatedAt: '2026-06-15T19:00:00.000Z' }),
      }),
    );

    const user = userEvent.setup();
    render(<OperationalBriefing csrfToken="test-token" />);

    await user.click(screen.getByRole('button', { name: /generate situation briefing/i }));

    await waitFor(() => expect(screen.getByText('Gate A needs attention.')).toBeInTheDocument());
    expect(screen.getByRole('button', { name: /refresh briefing/i })).toBeInTheDocument();
  });

  it('shows an error message when the request fails', async () => {
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValue({ ok: false, json: async () => ({ error: 'Could not generate the briefing.' }) }),
    );

    const user = userEvent.setup();
    render(<OperationalBriefing csrfToken="test-token" />);
    await user.click(screen.getByRole('button', { name: /generate situation briefing/i }));

    await waitFor(() =>
      expect(screen.getByRole('alert')).toHaveTextContent('Could not generate the briefing.'),
    );
  });

  it('shows a setup message instead of calling fetch when no CSRF token is available yet', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    const user = userEvent.setup();
    render(<OperationalBriefing csrfToken={null} />);
    await user.click(screen.getByRole('button', { name: /generate situation briefing/i }));

    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent(/still setting up/i));
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
