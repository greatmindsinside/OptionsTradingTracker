import React, { useEffect, useState } from 'react';

interface KeyboardShortcut {
  key: string;
  description: string;
  category: string;
}

interface KeyboardShortcutsProps {
  children: React.ReactNode;
  shortcuts?: KeyboardShortcut[];
}

const DEFAULT_SHORTCUTS: KeyboardShortcut[] = [
  { key: '/', description: 'Focus search', category: 'Navigation' },
  { key: 'n', description: 'New entry', category: 'Actions' },
  { key: '?', description: 'Show/hide shortcuts', category: 'Help' },
  { key: 'Esc', description: 'Close modal/menu', category: 'Navigation' },
  { key: 'Ctrl/Cmd + K', description: 'Command palette', category: 'Navigation' },
  { key: 'Ctrl/Cmd + P', description: 'Print', category: 'Actions' },
  { key: 'Ctrl/Cmd + E', description: 'Export CSV', category: 'Actions' },
  { key: 'Arrow Up/Down', description: 'Navigate table rows', category: 'Navigation' },
  { key: 'Enter', description: 'Select row', category: 'Navigation' },
  { key: 'Delete', description: 'Delete selected', category: 'Actions' },
];

export const KeyboardShortcutsProvider: React.FC<KeyboardShortcutsProps> = ({
  children,
  shortcuts = DEFAULT_SHORTCUTS,
}) => {
  const [showShortcuts, setShowShortcuts] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Press '?' to toggle shortcuts
      if (
        (e.key === '?' && !e.target) ||
        (e.target as HTMLElement)?.tagName === 'INPUT' ||
        (e.target as HTMLElement)?.tagName === 'TEXTAREA'
      ) {
        if (
          (e.target as HTMLElement)?.tagName !== 'INPUT' &&
          (e.target as HTMLElement)?.tagName !== 'TEXTAREA'
        ) {
          e.preventDefault();
          setShowShortcuts(prev => !prev);
        }
      }

      // Press '/' to focus search
      if (
        e.key === '/' &&
        (e.target as HTMLElement)?.tagName !== 'INPUT' &&
        (e.target as HTMLElement)?.tagName !== 'TEXTAREA'
      ) {
        e.preventDefault();
        const searchInput = document.getElementById('sym') as HTMLInputElement;
        if (searchInput) {
          searchInput.focus();
        }
      }

      // Press 'n' for new entry
      if (
        e.key === 'n' &&
        !e.ctrlKey &&
        !e.metaKey &&
        (e.target as HTMLElement)?.tagName !== 'INPUT' &&
        (e.target as HTMLElement)?.tagName !== 'TEXTAREA'
      ) {
        e.preventDefault();
        const newEntryButton = document.querySelector(
          '[aria-label="Create new journal entry"]'
        ) as HTMLButtonElement;
        if (newEntryButton) {
          newEntryButton.click();
        }
      }

      // Press 'Esc' to close shortcuts overlay
      if (e.key === 'Escape' && showShortcuts) {
        setShowShortcuts(false);
      }

      // Press 'Ctrl/Cmd + K' for command palette (placeholder)
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        // Command palette would go here
        console.log('Command palette triggered');
      }

      // Press 'Ctrl/Cmd + P' for print
      if ((e.ctrlKey || e.metaKey) && e.key === 'p') {
        e.preventDefault();
        window.print();
      }

      // Press 'Ctrl/Cmd + E' for export
      if ((e.ctrlKey || e.metaKey) && e.key === 'e') {
        e.preventDefault();
        const exportButton = document.querySelector(
          '[aria-label="Export journal entries to CSV"]'
        ) as HTMLButtonElement;
        if (exportButton) {
          exportButton.click();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showShortcuts]);

  const groupedShortcuts = shortcuts.reduce(
    (acc, shortcut) => {
      if (!acc[shortcut.category]) {
        acc[shortcut.category] = [];
      }
      acc[shortcut.category].push(shortcut);
      return acc;
    },
    {} as Record<string, KeyboardShortcut[]>
  );

  return (
    <>
      {children}
      {showShortcuts && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm"
          onClick={() => setShowShortcuts(false)}
        >
          <div
            className="relative w-full max-w-2xl rounded-2xl border border-zinc-700 bg-zinc-900 p-6 shadow-2xl"
            onClick={e => e.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-xl font-bold text-zinc-100">Keyboard Shortcuts</h2>
              <button
                onClick={() => setShowShortcuts(false)}
                className="rounded px-3 py-1 text-sm text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200"
              >
                Esc
              </button>
            </div>

            <div className="space-y-4">
              {Object.entries(groupedShortcuts).map(([category, items]) => (
                <div key={category}>
                  <h3 className="mb-2 text-sm font-semibold tracking-wide text-zinc-500 uppercase">
                    {category}
                  </h3>
                  <div className="space-y-2">
                    {items.map((shortcut, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between rounded px-3 py-2 hover:bg-zinc-800"
                      >
                        <span className="text-sm text-zinc-300">{shortcut.description}</span>
                        <kbd className="rounded border border-zinc-700 bg-zinc-800 px-2 py-1 font-mono text-xs text-zinc-300">
                          {shortcut.key}
                        </kbd>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-6 text-center text-xs text-zinc-500">
              Press{' '}
              <kbd className="rounded border border-zinc-700 bg-zinc-800 px-2 py-1 text-xs">?</kbd>{' '}
              to toggle this menu
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default KeyboardShortcutsProvider;
