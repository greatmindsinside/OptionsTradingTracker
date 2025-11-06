import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { TradeTab } from '@/pages/wheel/components/drawers/TradeTab';
import { env } from '@/utils/env';

// Mock stores
vi.mock('@/store/journal', () => ({
  useJournal: () => ({ add: vi.fn() }),
}));
vi.mock('@/stores/useEntriesStore', () => ({
  useEntriesStore: () => ({ addEntry: vi.fn() }),
}));
vi.mock('@/stores/useWheelUIStore', () => ({
  useWheelUIStore: () => ({ closeActions: vi.fn() }),
}));
vi.mock('@/stores/useWheelStore', () => ({
  useWheelStore: () => ({ reloadFn: null }),
}));

describe('TradeTab - DTE Feature', () => {
  beforeEach(() => {
    // Reset feature flag
    env.features.tradeDTE = false;
  });

  it('renders numeric DTE input when feature flag is disabled', () => {
    env.features.tradeDTE = false;
    render(<TradeTab />);

    // Should show "DTE" label and number input
    expect(screen.getByText(/^DTE$/i)).toBeInTheDocument();
    const dteInput = screen.getByLabelText(/^DTE$/i);
    expect(dteInput).toHaveAttribute('type', 'number');
  });

  it('renders date picker when feature flag is enabled', () => {
    env.features.tradeDTE = true;
    render(<TradeTab />);

    // Should show "Expiration" label and date input
    expect(screen.getByText(/^Expiration$/i)).toBeInTheDocument();
    const expInput = screen.getByLabelText(/^Expiration$/i);
    expect(expInput).toHaveAttribute('type', 'date');
  });

  it('shows DTE chip when feature flag is enabled', () => {
    env.features.tradeDTE = true;
    render(<TradeTab />);

    // Should show "DTE:" text somewhere in the UI
    expect(screen.getByText(/DTE:/)).toBeInTheDocument();
  });

  it('shows Advanced toggle when feature flag is enabled', () => {
    env.features.tradeDTE = true;
    render(<TradeTab />);

    // Should have "Advanced" button
    const advBtn = screen.getByRole('button', { name: /Advanced/i });
    expect(advBtn).toBeInTheDocument();
  });

  it('toggles Advanced input visibility', async () => {
    env.features.tradeDTE = true;
    const user = userEvent.setup();
    render(<TradeTab />);

    // Advanced input should not be visible initially
    expect(screen.queryByLabelText(/DTE \(advanced\)/i)).not.toBeInTheDocument();

    // Click Advanced button
    const advBtn = screen.getByRole('button', { name: /Advanced/i });
    await user.click(advBtn);

    // Now Advanced input should be visible
    expect(screen.getByLabelText(/DTE \(advanced\)/i)).toBeInTheDocument();

    // Button text should change to "Hide Advanced"
    expect(screen.getByRole('button', { name: /Hide Advanced/i })).toBeInTheDocument();
  });

  it('displays past date warning when expiration is in the past', async () => {
    env.features.tradeDTE = true;
    const user = userEvent.setup();
    render(<TradeTab />);

    // Set a past date
    const expInput = screen.getByLabelText(/^Expiration$/i) as HTMLInputElement;
    await user.clear(expInput);
    await user.type(expInput, '2024-01-01');

    // Should show warning text (wait for state update)
    expect(await screen.findByText(/Past date selected/i)).toBeInTheDocument();
  });
});
