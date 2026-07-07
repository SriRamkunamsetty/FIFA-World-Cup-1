import type { Metadata, Viewport } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'StadiumOps Copilot — Tournament Organizer Console',
  description:
    'An AI command center for FIFA World Cup 2026 tournament organizers: crowd & navigation guidance, multilingual broadcasts, accessibility triage, and real-time decision support in one console.',
};

export const viewport: Viewport = {
  themeColor: '#0b1c26',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-pitch-bg text-ink antialiased">
        <a href="#main-content" className="skip-link">
          Skip to main content
        </a>
        {children}
      </body>
    </html>
  );
}
