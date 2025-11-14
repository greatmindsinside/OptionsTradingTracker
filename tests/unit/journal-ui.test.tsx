import { render } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';

import { JournalDrawer } from '@/pages/journal/components/drawers/JournalDrawer';
import { useJournalUIStore } from '@/stores/useJournalUIStore';
import type { Entry } from '@/types/entry';
import { env } from '@/utils/env';

function makeEntry(partial: Partial<Entry> = {}): Entry {
  return {
    id: 'e1',
    ts: new Date().toISOString(),
    account_id: 'acct-1',
    symbol: 'TEST',
    type: 'sell_to_open',
    qty: 1,
    amount: 100,
    strike: 50,
    expiration: new Date().toISOString(),
    underlying_price: 49,
    notes: 'n',
    ...partial,
  } as Entry;
}

describe('useJournalUIStore', () => {
  beforeEach(() => {
    useJournalUIStore.setState({ editOpen: false, selected: null });
  });

  it('opens and closes editor state', () => {
    const e = makeEntry();
    useJournalUIStore.getState().openEdit(e);
    expect(useJournalUIStore.getState().editOpen).toBe(true);
    expect(useJournalUIStore.getState().selected?.id).toBe('e1');

    useJournalUIStore.getState().closeEdit();
    expect(useJournalUIStore.getState().editOpen).toBe(false);
    expect(useJournalUIStore.getState().selected).toBeNull();
  });
});

describe('JournalDrawer (render smoke)', () => {
  beforeEach(() => {
    env.features.journalEditDrawer = true;
    useJournalUIStore.setState({ editOpen: false, selected: null });
  });

  it('does not render when closed', () => {
    const { queryByRole } = render(<JournalDrawer />);
    expect(queryByRole('dialog')).toBeNull();
  });

  it('renders when open', () => {
    useJournalUIStore.getState().openEdit(makeEntry());
    const { queryByRole } = render(<JournalDrawer />);
    expect(queryByRole('dialog')).not.toBeNull();
  });
});
