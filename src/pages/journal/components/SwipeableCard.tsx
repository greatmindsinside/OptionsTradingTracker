import React from 'react';

import { useSwipeable } from '@/hooks/useSwipeable';
import type { Entry } from '@/types/entry';

interface SwipeableCardProps {
  entry: Entry;
  onEdit: (entry: Entry) => void;
  onOpenSidebar: (entry: Entry) => void;
  children: React.ReactNode;
}

export const SwipeableCard: React.FC<SwipeableCardProps> = ({
  entry,
  onEdit,
  onOpenSidebar,
  children,
}) => {
  const swipeable = useSwipeable({
    onSwipeLeft: () => {
      // Swipe left to show actions/sidebar
      onOpenSidebar(entry);
    },
    onSwipeRight: () => {
      // Swipe right to edit
      onEdit(entry);
    },
    threshold: 50,
  });

  return (
    <div
      ref={swipeable.ref as React.RefObject<HTMLDivElement>}
      data-testid="journal.entry"
      className="rounded-xl border border-zinc-700/60 bg-zinc-900/60 p-4 shadow-lg transition-transform"
    >
      {children}
    </div>
  );
};
