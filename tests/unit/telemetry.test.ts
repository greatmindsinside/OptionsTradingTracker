import { beforeEach, describe, expect, it } from 'vitest';

import { env } from '@/utils/env';
import { track } from '@/utils/telemetry';

describe('telemetry utility', () => {
  beforeEach(() => {
    // Reset mock calls via vi.fn mocks defined in tests/setup.ts
    type FnMock = { mockReset: () => void; mock?: { calls: unknown[] } };
    const mocked = window.localStorage as unknown as { getItem: FnMock; setItem: FnMock };
    mocked.getItem.mockReset?.();
    mocked.setItem.mockReset?.();
  });

  it('does not persist when analytics disabled', () => {
    env.features.analytics = false;
    track('journal_edit_open', { id: 'e1' });
    const mocked = window.localStorage as unknown as { setItem: { mock?: { calls: unknown[] } } };
    expect(mocked.setItem.mock?.calls.length ?? 0).toBe(0);
  });

  it('persists when analytics enabled', () => {
    env.features.analytics = true;
    track('journal_edit_open', { id: 'e1' });
    const mocked = window.localStorage as unknown as { setItem: { mock?: { calls: unknown[] } } };
    expect((mocked.setItem.mock?.calls.length ?? 0) > 0).toBe(true);
  });
});
