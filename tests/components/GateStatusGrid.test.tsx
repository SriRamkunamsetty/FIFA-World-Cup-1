import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { GateStatusGrid } from '@/components/GateStatusGrid';
import { buildLiveSignalsFixture } from '../fixtures/liveSignals';

describe('GateStatusGrid', () => {
  it('shows a loading state when signals are not yet available', () => {
    render(<GateStatusGrid signals={null} />);
    expect(screen.getByRole('status')).toHaveTextContent(/loading gate status/i);
  });

  it('renders a card for every gate, with its label and accessibility flag', () => {
    render(<GateStatusGrid signals={buildLiveSignalsFixture()} />);

    expect(screen.getByRole('heading', { name: /gate a — north plaza/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /gate c — east riverside/i })).toBeInTheDocument();
    expect(screen.getByText(/no accessible path/i)).toBeInTheDocument();
  });
});
