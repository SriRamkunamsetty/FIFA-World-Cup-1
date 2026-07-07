import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MatchStatusBar } from '@/components/MatchStatusBar';
import { buildLiveSignalsFixture } from '../fixtures/liveSignals';

describe('MatchStatusBar', () => {
  it('shows a loading title when signals are not yet available', () => {
    render(<MatchStatusBar signals={null} />);
    expect(screen.getByText(/loading match/i)).toBeInTheDocument();
  });

  it('shows the matchup, venue, and live status once signals arrive', () => {
    render(<MatchStatusBar signals={buildLiveSignalsFixture()} />);

    expect(screen.getByRole('heading', { name: /argentina vs japan/i })).toBeInTheDocument();
    expect(screen.getByText(/hard rock stadium/i)).toBeInTheDocument();
    expect(screen.getByText('live')).toBeInTheDocument();
  });

  it('renders a weather advisory banner only when one is present', () => {
    const { rerender } = render(
      <MatchStatusBar
        signals={buildLiveSignalsFixture({
          weather: { condition: 'Clear', tempCelsius: 28, advisory: null },
        })}
      />,
    );
    expect(screen.queryByRole('status', { name: '' })).not.toHaveTextContent(/advisory/i);

    rerender(
      <MatchStatusBar
        signals={buildLiveSignalsFixture({
          weather: {
            condition: 'Heat advisory',
            tempCelsius: 34,
            advisory: 'Extra hydration stations recommended.',
          },
        })}
      />,
    );
    expect(screen.getByText('Extra hydration stations recommended.')).toBeInTheDocument();
  });

  it('shows the transit state for each line', () => {
    render(<MatchStatusBar signals={buildLiveSignalsFixture()} />);
    expect(screen.getByText(/metrorail/i)).toBeInTheDocument();
    expect(screen.getByText('on-time')).toBeInTheDocument();
  });
});
