'use client';

import { useState, useRef, type FormEvent } from 'react';
import { Card } from './ui/Card';
import type { DecisionAssistantMessage } from '@/types/domain';

const SUGGESTIONS = [
  'What should I do about the busiest gate right now?',
  'Any transit issues fans should know about?',
  'Do we need more staff anywhere in the next 10 minutes?',
];

interface DecisionAssistantPanelProps {
  csrfToken: string | null;
}

export function DecisionAssistantPanel({ csrfToken }: DecisionAssistantPanelProps) {
  const [messages, setMessages] = useState<DecisionAssistantMessage[]>([]);
  const [input, setInput] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const listEndRef = useRef<HTMLDivElement>(null);

  async function sendMessage(message: string) {
    if (!message.trim() || isStreaming) return;
    if (!csrfToken) {
      setError('Still setting up this session — try again in a moment.');
      return;
    }

    setError(null);
    const history = messages.slice(-10);
    const nextMessages: DecisionAssistantMessage[] = [...messages, { role: 'user', content: message }];
    setMessages(nextMessages);
    setInput('');
    setIsStreaming(true);

    try {
      const res = await fetch('/api/decision-assistant', {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'x-csrf-token': csrfToken },
        body: JSON.stringify({ message, history }),
      });

      if (!res.ok || !res.body) {
        const data = await res.json().catch(() => ({ error: 'Something went wrong.' }));
        throw new Error(data.error ?? 'Something went wrong.');
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let assistantText = '';

      setMessages((prev) => [...prev, { role: 'assistant', content: '' }]);

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        assistantText += decoder.decode(value, { stream: true });
        setMessages((prev) => {
          const updated = [...prev];
          updated[updated.length - 1] = { role: 'assistant', content: assistantText };
          return updated;
        });
        listEndRef.current?.scrollIntoView?.({ block: 'end' });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.');
    } finally {
      setIsStreaming(false);
    }
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    sendMessage(input);
  }

  return (
    <Card as="section" aria-labelledby="assistant-heading" className="flex h-full flex-col">
      <h2
        id="assistant-heading"
        className="font-display text-lg font-extrabold uppercase tracking-tight text-ink"
      >
        AI Decision Assistant
      </h2>
      <p className="mt-1 text-xs text-ink-muted">
        Ask about gates, transit, or staffing. Answers are grounded in the live operations data on this
        screen.
      </p>

      <div
        className="mt-3 flex-1 space-y-3 overflow-y-auto rounded-md bg-pitch-raised p-3"
        style={{ maxHeight: 320 }}
      >
        {messages.length === 0 && (
          <div className="flex flex-col gap-2">
            {SUGGESTIONS.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => sendMessage(s)}
                className="rounded-md border border-pitch-line px-3 py-2 text-left text-sm text-ink-muted hover:border-floodlight hover:text-ink"
              >
                {s}
              </button>
            ))}
          </div>
        )}

        <div aria-live="polite" className="space-y-3">
          {messages.map((message, index) => (
            <div
              key={index}
              className={
                message.role === 'user'
                  ? 'ml-auto max-w-[85%] rounded-md bg-floodlight/15 px-3 py-2 text-sm text-ink'
                  : 'mr-auto max-w-[85%] rounded-md bg-pitch-surface px-3 py-2 text-sm text-ink'
              }
            >
              <span className="sr-only">{message.role === 'user' ? 'You said: ' : 'Assistant said: '}</span>
              {message.content || (isStreaming && index === messages.length - 1 ? '…' : '')}
            </div>
          ))}
        </div>
        <div ref={listEndRef} />
      </div>

      {error && (
        <p role="alert" className="mt-2 text-sm text-alert-soft">
          {error}
        </p>
      )}

      <form onSubmit={handleSubmit} className="mt-3 flex gap-2">
        <label htmlFor="assistant-input" className="sr-only">
          Ask the decision assistant a question
        </label>
        <input
          id="assistant-input"
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask a question…"
          maxLength={500}
          disabled={isStreaming}
          className="flex-1 rounded-md border border-pitch-line bg-pitch-bg px-3 py-2 text-sm text-ink placeholder:text-ink-muted disabled:opacity-60"
        />
        <button
          type="submit"
          disabled={isStreaming || !input.trim()}
          className="rounded-md bg-floodlight px-4 py-2 text-sm font-semibold text-pitch-bg disabled:opacity-50"
        >
          {isStreaming ? 'Thinking…' : 'Ask'}
        </button>
      </form>
    </Card>
  );
}
