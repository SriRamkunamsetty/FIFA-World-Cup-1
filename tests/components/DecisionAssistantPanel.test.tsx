import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DecisionAssistantPanel } from '@/components/DecisionAssistantPanel';

function streamingResponse(chunks: string[]) {
  const encoder = new TextEncoder();
  const body = new ReadableStream<Uint8Array>({
    start(controller) {
      for (const chunk of chunks) controller.enqueue(encoder.encode(chunk));
      controller.close();
    },
  });
  return { ok: true, body };
}

describe('DecisionAssistantPanel', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('shows suggested questions before any message is sent', () => {
    render(<DecisionAssistantPanel csrfToken="test-token" />);
    expect(screen.getByText(/what should i do about the busiest gate/i)).toBeInTheDocument();
  });

  it('streams the assistant reply into the chat after asking a question', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(streamingResponse(['Gate A ', 'is busy.'])));

    const user = userEvent.setup();
    render(<DecisionAssistantPanel csrfToken="test-token" />);

    await user.click(screen.getByText(/what should i do about the busiest gate/i));

    await waitFor(() => expect(screen.getByText(/Gate A is busy\./)).toBeInTheDocument());
  });

  it('disables the ask button while a token has not loaded yet and shows a message on send attempt', async () => {
    vi.stubGlobal('fetch', vi.fn());
    const user = userEvent.setup();
    render(<DecisionAssistantPanel csrfToken={null} />);

    await user.type(screen.getByLabelText(/ask the decision assistant/i), 'Hello');
    await user.click(screen.getByRole('button', { name: /ask/i }));

    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent(/still setting up/i));
  });
});
