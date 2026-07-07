import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BroadcastComposer } from '@/components/BroadcastComposer';

describe('BroadcastComposer', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('disables the submit button until a message is entered', async () => {
    render(<BroadcastComposer csrfToken="test-token" />);
    const button = screen.getByRole('button', { name: /translate & preview/i });
    expect(button).toBeDisabled();

    const user = userEvent.setup();
    await user.type(screen.getByLabelText(/announcement text/i), 'Gate B closing soon.');
    expect(button).toBeEnabled();
  });

  it('disables the submit button when every language is deselected', async () => {
    const user = userEvent.setup();
    render(<BroadcastComposer csrfToken="test-token" />);

    await user.type(screen.getByLabelText(/announcement text/i), 'Gate B closing soon.');
    await user.click(screen.getByText('English'));
    await user.click(screen.getByText('Spanish'));
    await user.click(screen.getByText('French'));

    expect(screen.getByRole('button', { name: /translate & preview/i })).toBeDisabled();
  });

  it('shows the translated result after a successful submission', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          original: 'Gate B closing soon.',
          translations: [{ language: 'es', text: 'La puerta B cierra pronto.' }],
          plainLanguageVersion: 'Gate B is closing soon.',
          cached: false,
        }),
      }),
    );

    const user = userEvent.setup();
    render(<BroadcastComposer csrfToken="test-token" />);

    await user.type(screen.getByLabelText(/announcement text/i), 'Gate B closing soon.');
    await user.click(screen.getByRole('button', { name: /translate & preview/i }));

    await waitFor(() => expect(screen.getByText('La puerta B cierra pronto.')).toBeInTheDocument());
    expect(screen.getByText('Gate B is closing soon.')).toBeInTheDocument();
  });

  it('shows an error message when the request fails', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ ok: false, json: async () => ({ error: 'Could not translate.' }) }),
    );

    const user = userEvent.setup();
    render(<BroadcastComposer csrfToken="test-token" />);

    await user.type(screen.getByLabelText(/announcement text/i), 'Gate B closing soon.');
    await user.click(screen.getByRole('button', { name: /translate & preview/i }));

    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('Could not translate.'));
  });
});
