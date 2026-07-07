'use client';

import { useState, type FormEvent } from 'react';
import { Card } from './ui/Card';
import { SUPPORTED_LANGUAGES, type LanguageCode, type BroadcastResult } from '@/types/domain';

interface BroadcastComposerProps {
  csrfToken: string | null;
}

const DEFAULT_LANGUAGES: LanguageCode[] = ['en', 'es', 'fr'];

export function BroadcastComposer({ csrfToken }: BroadcastComposerProps) {
  const [message, setMessage] = useState('');
  const [languages, setLanguages] = useState<LanguageCode[]>(DEFAULT_LANGUAGES);
  const [result, setResult] = useState<BroadcastResult | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function toggleLanguage(code: LanguageCode) {
    setLanguages((prev) => (prev.includes(code) ? prev.filter((l) => l !== code) : [...prev, code]));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!message.trim() || languages.length === 0 || isSubmitting) return;
    if (!csrfToken) {
      setError('Still setting up this session — try again in a moment.');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const res = await fetch('/api/broadcast', {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'x-csrf-token': csrfToken },
        body: JSON.stringify({ message, languages }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Could not translate the broadcast.');
      setResult(data as BroadcastResult);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not translate the broadcast.');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Card as="section" aria-labelledby="broadcast-heading">
      <h2
        id="broadcast-heading"
        className="font-display text-lg font-extrabold uppercase tracking-tight text-ink"
      >
        Multilingual Broadcast
      </h2>
      <p className="mt-1 text-xs text-ink-muted">
        Draft one announcement in English — get it translated for PA and push, plus a plain-language version.
      </p>

      <form onSubmit={handleSubmit} className="mt-3 flex flex-col gap-3">
        <div>
          <label htmlFor="broadcast-message" className="mb-1 block text-sm text-ink-muted">
            Announcement text
          </label>
          <textarea
            id="broadcast-message"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            maxLength={300}
            rows={3}
            placeholder="e.g. Gate B will close in 10 minutes. Please use Gate A or Gate D."
            className="w-full rounded-md border border-pitch-line bg-pitch-bg px-3 py-2 text-sm text-ink placeholder:text-ink-muted"
          />
          <p className="mt-1 text-right text-xs text-ink-muted">{message.length}/300</p>
        </div>

        <fieldset>
          <legend className="mb-1 text-sm text-ink-muted">Translate into</legend>
          <div className="flex flex-wrap gap-2">
            {SUPPORTED_LANGUAGES.map((lang) => {
              const checked = languages.includes(lang.code);
              return (
                <label
                  key={lang.code}
                  className={`cursor-pointer rounded-sm border px-2.5 py-1 text-xs font-medium ${
                    checked
                      ? 'border-floodlight bg-floodlight/15 text-ink'
                      : 'border-pitch-line text-ink-muted'
                  }`}
                >
                  <input
                    type="checkbox"
                    className="sr-only"
                    checked={checked}
                    onChange={() => toggleLanguage(lang.code)}
                  />
                  {lang.label}
                </label>
              );
            })}
          </div>
        </fieldset>

        {error && (
          <p role="alert" className="text-sm text-alert-soft">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={isSubmitting || !message.trim() || languages.length === 0}
          className="self-start rounded-md bg-floodlight px-4 py-2 text-sm font-semibold text-pitch-bg disabled:opacity-50"
        >
          {isSubmitting ? 'Translating…' : 'Translate & preview'}
        </button>
      </form>

      {result && (
        <div className="mt-4 space-y-2 border-t border-pitch-line pt-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-ink-muted">
              Plain-language version (screen-reader friendly)
            </p>
            <p lang="en" className="text-sm text-ink">
              {result.plainLanguageVersion}
            </p>
          </div>
          {result.translations.map((t) => (
            <div key={t.language}>
              <p className="text-xs font-semibold uppercase tracking-wide text-ink-muted">
                {SUPPORTED_LANGUAGES.find((l) => l.code === t.language)?.label ?? t.language}
              </p>
              <p lang={t.language} className="text-sm text-ink">
                {t.text}
              </p>
            </div>
          ))}
          {result.cached && (
            <p className="text-xs italic text-ink-muted">Served from cache — identical request.</p>
          )}
        </div>
      )}
    </Card>
  );
}
