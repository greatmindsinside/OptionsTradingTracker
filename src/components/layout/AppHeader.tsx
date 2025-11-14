import React, { useEffect, useMemo, useRef, useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';

import { useFilterStore } from '@/stores/useFilterStore';
import { useTerminalStore } from '@/stores/useTerminalStore';
import { useWheelUIStore } from '@/stores/useWheelUIStore';

/**
 * AppHeader (global)
 * - Shown on all pages
 * - Provides brand logo, tab navigation (Wheel | Journal), search bar, and contextual action buttons
 * - Search works for both ticker search (Wheel) and journal entry search (Journal)
 * - Action buttons change contextually based on current page
 */
export function AppHeader() {
  const location = useLocation();
  const isWheelPage = location.pathname === '/' || location.pathname === '/wheel';
  const isJournalPage = location.pathname === '/journal';

  // Search state - use appropriate store based on page
  const wheelSearchQuery = useWheelUIStore(s => s.searchQuery);
  const setWheelSearchQuery = useWheelUIStore(s => s.setSearchQuery);
  const journalSearchQuery = useFilterStore(s => s.symbol);
  const setJournalSearchQuery = useFilterStore(s => s.setFilters);

  // Current search value based on page
  const searchValue = isWheelPage ? wheelSearchQuery : journalSearchQuery;
  const setSearchValue = (value: string) => {
    if (isWheelPage) {
      setWheelSearchQuery(value);
    } else {
      setJournalSearchQuery({ symbol: value });
    }
  };

  // Wheel page actions
  const openActions = useWheelUIStore(s => s.openActions);
  const importing = useWheelUIStore(s => s.importing);

  // Journal page actions
  const [, setJournalNewEntryOpen] = useState(false);

  // Observer Effect Terminal trigger mechanism
  const {
    isUnlocked,
    unlock,
    open: openTerminal,
    addSequenceStep,
    resetSequence,
  } = useTerminalStore();
  const [hiddenInput, setHiddenInput] = useState('');
  const sequenceTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const requiredSequence = useMemo(() => ['heisenberg', 'schrödinger', 'bohr'], []);

  // Handle hidden input sequence detection
  useEffect(() => {
    if (isUnlocked) return;

    const normalizedInput = hiddenInput.toLowerCase().trim();
    const words = normalizedInput.split(/\s+/);
    const lastWord = words[words.length - 1] || '';

    if (requiredSequence.includes(lastWord)) {
      addSequenceStep(lastWord);

      if (sequenceTimeoutRef.current) {
        clearTimeout(sequenceTimeoutRef.current);
      }
      sequenceTimeoutRef.current = setTimeout(() => {
        resetSequence();
        setHiddenInput('');
      }, 5000);
    }

    const { sequenceProgress } = useTerminalStore.getState();
    if (sequenceProgress.length >= 3) {
      const normalizedProgress = sequenceProgress.map(s => s.toLowerCase().trim());
      const isComplete = normalizedProgress
        .slice(-3)
        .every((step, idx) => step === requiredSequence[idx]);

      if (isComplete && !isUnlocked) {
        unlock();
        openTerminal();
        setHiddenInput('');
        resetSequence();
        const message = document.createElement('div');
        message.textContent = 'ACCESS GRANTED';
        message.style.cssText = `
          position: fixed;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          background: rgba(0, 255, 136, 0.9);
          color: #0a0e27;
          padding: 1rem 2rem;
          border-radius: 4px;
          font-family: 'Courier New', monospace;
          font-weight: bold;
          z-index: 10000;
          animation: fadeInOut 2s ease-in-out;
        `;
        document.body.appendChild(message);
        setTimeout(() => {
          message.remove();
        }, 2000);
      }
    }
  }, [
    hiddenInput,
    isUnlocked,
    unlock,
    openTerminal,
    addSequenceStep,
    resetSequence,
    requiredSequence,
  ]);

  // Handle keyboard input for sequence
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      if (e.key.length === 1 && /[a-zA-Z\s]/.test(e.key)) {
        setHiddenInput(prev => prev + e.key);
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, []);

  // Logo click sequence mechanism
  const [logoClickSequence, setLogoClickSequence] = useState<string[]>([]);
  const logoSequenceTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handleLogoClick = (e: React.MouseEvent) => {
    if (isUnlocked) {
      const { isOpen, open, close } = useTerminalStore.getState();
      if (isOpen) {
        close();
      } else {
        open();
      }
      return;
    }

    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const width = rect.width;

    let step = '';
    if (x < width / 3) {
      step = 'heisenberg';
    } else if (x < (width * 2) / 3) {
      step = 'schrödinger';
    } else {
      step = 'bohr';
    }

    setLogoClickSequence(prev => {
      const newSequence = [...prev, step];

      if (newSequence.length >= 3) {
        const normalized = newSequence.slice(-3).map(s => s.toLowerCase().trim());
        const isComplete = normalized.every((s, idx) => s === requiredSequence[idx]);

        if (isComplete && !isUnlocked) {
          unlock();
          openTerminal();
          return [];
        }
      }

      if (logoSequenceTimeoutRef.current) {
        clearTimeout(logoSequenceTimeoutRef.current);
      }
      logoSequenceTimeoutRef.current = setTimeout(() => {
        setLogoClickSequence([]);
      }, 5000);

      return newSequence;
    });
  };

  // Handle contextual action button
  const handleActionClick = () => {
    if (isWheelPage) {
      openActions('Trade');
    } else if (isJournalPage) {
      setJournalNewEntryOpen(true);
      // Trigger the new entry modal - we'll need to expose this from JournalPage
      // For now, we'll dispatch a custom event that JournalPage can listen to
      window.dispatchEvent(new CustomEvent('journal:new-entry'));
    }
  };

  return (
    <header className="sticky top-0 z-30 border-b border-zinc-800/70 bg-black/70 backdrop-blur">
      <div className="mx-auto flex h-12 w-full max-w-7xl items-center gap-4 px-4">
        {/* Logo */}
        <div
          className="flex items-center"
          onClick={handleLogoClick}
          style={{ cursor: 'pointer', position: 'relative' }}
          title={
            !isUnlocked && logoClickSequence.length > 0
              ? `Sequence: ${logoClickSequence.length}/3`
              : undefined
          }
          data-testid="wheel.title"
        >
          <img
            src="/branding/wheel-to-tendies.png"
            alt="Wheel to Tendies logo"
            className="h-10 max-h-10 w-auto object-contain"
            loading="eager"
            decoding="sync"
            onError={e => {
              const img = e.currentTarget as HTMLImageElement;
              img.onerror = null;
              img.src = '/vite.svg';
            }}
          />
          <input
            type="text"
            value={hiddenInput}
            onChange={() => {}}
            style={{
              position: 'absolute',
              opacity: 0,
              pointerEvents: 'none',
              width: 0,
              height: 0,
            }}
            aria-hidden="true"
            tabIndex={-1}
          />
        </div>

        {/* Tab Navigation */}
        <nav className="flex gap-1 text-sm">
          <NavLink
            to="/"
            end
            className={({ isActive }) =>
              `rounded px-3 py-1.5 font-medium transition-colors ${
                isActive
                  ? 'bg-zinc-800 text-zinc-100'
                  : 'text-zinc-400 hover:bg-zinc-800/50 hover:text-zinc-200'
              }`
            }
          >
            Wheel
          </NavLink>
          <NavLink
            to="/journal"
            className={({ isActive }) =>
              `rounded px-3 py-1.5 font-medium transition-colors ${
                isActive
                  ? 'bg-zinc-800 text-zinc-100'
                  : 'text-zinc-400 hover:bg-zinc-800/50 hover:text-zinc-200'
              }`
            }
          >
            Journal
          </NavLink>
        </nav>

        {/* Search Bar */}
        <div className="flex flex-1 items-center justify-center">
          <div className="relative w-full max-w-md">
            <input
              type="search"
              value={searchValue}
              onChange={e => setSearchValue(e.target.value)}
              placeholder={
                isWheelPage ? 'Search tickers...' : 'Search symbol, notes, type, amount...'
              }
              className="w-full rounded-lg border border-zinc-700 bg-zinc-900/50 px-4 py-1.5 text-sm text-zinc-100 placeholder:text-zinc-500 focus:border-zinc-600 focus:ring-1 focus:ring-zinc-600 focus:outline-none"
              aria-label={isWheelPage ? 'Filter tickers' : 'Search journal entries'}
            />
          </div>
        </div>

        {/* Contextual Action Button */}
        <div className="flex items-center">
          {isWheelPage && (
            <button
              onClick={handleActionClick}
              className="rounded-lg bg-zinc-800 px-4 py-1.5 text-sm font-medium text-zinc-100 transition-colors hover:bg-zinc-700 disabled:cursor-not-allowed disabled:opacity-50"
              disabled={importing}
              aria-busy={importing}
              data-testid="wheel.action.open"
            >
              {importing ? '⏳ Importing...' : '💸 Premium Printer'}
            </button>
          )}
          {isJournalPage && (
            <button
              onClick={handleActionClick}
              className="rounded-lg bg-zinc-800 px-4 py-1.5 text-sm font-medium text-zinc-100 transition-colors hover:bg-zinc-700"
              aria-label="Create new journal entry"
              title="Create a new journal entry"
            >
              New Entry
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
