/**
 * WheelHeader — top bar for the Wheel page.
 *
 * Step-by-step:
 * 1) Get helpers:
 *    - useNavigate from react-router for in-app navigation.
 *    - useWheelUIStore to read/write Wheel UI state (search text, opening the Actions drawer, importing state).
 * 2) Read state from the store:
 *    - searchQuery (q) and its setter (setQ) to control the ticker search input.
 *    - openActions to open the Actions drawer on the Wheel page.
 *    - importing to disable buttons and set aria-busy while an import runs.
 * 3) Render page chrome:
 *    - <header> with wheel-header* CSS classes that style the dark header.
 *    - Brand title "Wheel To Tendies Pipeline" with a test id for E2E tests.
 * 4) Render search:
 *    - Magnifying-glass icon (decorative, aria-hidden).
 *    - Controlled <input type="search"> bound to q; updates store onChange; labeled for a11y.
 * 5) Render actions:
 *    - Primary button opens the Actions drawer to the "Import" tab; disabled and aria-busy when importing.
 *    - Secondary button navigates to the Journal page via react-router.
 * 6) Testing hooks:
 *    - data-testid attributes on brand and open-actions button to support UI tests.
 */
import React, { useEffect, useMemo, useRef, useState } from 'react'; // React for JSX
import { useNavigate } from 'react-router-dom'; // client-side navigation

import { useTerminalStore } from '@/stores/useTerminalStore'; // Observer Effect Terminal
import { useWheelUIStore } from '@/stores/useWheelUIStore'; // global UI state for Wheel page (Zustand)

/**
 * Renders the header with brand, ticker search, and action buttons.
 */
export const WheelHeader: React.FC = () => {
  const navigate = useNavigate(); // programmatic route changes (/journal, etc.)

  // Current ticker search text (controlled input value)
  const q = useWheelUIStore(s => s.searchQuery);
  // Setter to update the search text in the store (called on input change)
  const setQ = useWheelUIStore(s => s.setSearchQuery);
  // Opens the Actions drawer; accepts a tab name like 'Import' | 'Trade' | 'Data'
  const openActions = useWheelUIStore(s => s.openActions);
  // True while an import is running; used to disable buttons and mark busy state
  const importing = useWheelUIStore(s => s.importing);

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
    if (isUnlocked) return; // Already unlocked

    const normalizedInput = hiddenInput.toLowerCase().trim();
    const words = normalizedInput.split(/\s+/);
    const lastWord = words[words.length - 1] || '';

    // Check if last word matches any sequence step
    if (requiredSequence.includes(lastWord)) {
      addSequenceStep(lastWord);

      // Reset sequence if no input for 5 seconds
      if (sequenceTimeoutRef.current) {
        clearTimeout(sequenceTimeoutRef.current);
      }
      sequenceTimeoutRef.current = setTimeout(() => {
        resetSequence();
        setHiddenInput('');
      }, 5000);
    }

    // Check if sequence is complete
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
        // Show brief "ACCESS GRANTED" message
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
      // Only capture if not typing in an input/textarea
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      // Capture letters and spaces
      if (e.key.length === 1 && /[a-zA-Z\s]/.test(e.key)) {
        setHiddenInput(prev => prev + e.key);
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, []);

  // Logo click sequence mechanism (Option A)
  const [logoClickSequence, setLogoClickSequence] = useState<string[]>([]);
  const logoSequenceTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handleLogoClick = (e: React.MouseEvent) => {
    // If already unlocked, clicking logo opens/closes terminal
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

    // Divide logo into three invisible clickable areas
    // Left third: Heisenberg, Middle third: Schrödinger, Right third: Bohr
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

      // Check if sequence is complete
      if (newSequence.length >= 3) {
        const normalized = newSequence.slice(-3).map(s => s.toLowerCase().trim());
        const isComplete = normalized.every((s, idx) => s === requiredSequence[idx]);

        if (isComplete && !isUnlocked) {
          unlock();
          openTerminal();
          return [];
        }
      }

      // Reset sequence if timeout
      if (logoSequenceTimeoutRef.current) {
        clearTimeout(logoSequenceTimeoutRef.current);
      }
      logoSequenceTimeoutRef.current = setTimeout(() => {
        setLogoClickSequence([]);
      }, 5000);

      return newSequence;
    });
  };

  return (
    // Top-level header container (styled via page-header* classes in CSS)
    <header className="page-header">
      {/* keeps content centered to page width */}
      <div className="page-header__inner">
        {/* left: brand/logo */}
        <h1
          className="page-header__brand"
          data-testid="wheel.title"
          onClick={handleLogoClick}
          style={{ cursor: 'pointer', position: 'relative' }}
          title={
            !isUnlocked && logoClickSequence.length > 0
              ? `Sequence: ${logoClickSequence.length}/3`
              : undefined
          }
        >
          <img
            src="/branding/wheel-to-tendies.png"
            alt="Wheel to Tendies logo"
            className="page-header__brand-image"
            loading="eager"
            decoding="sync"
            onError={e => {
              const img = e.currentTarget as HTMLImageElement;
              // Prevent infinite loop then swap to a local fallback icon
              img.onerror = null;
              img.src = '/vite.svg';
            }}
          />
          {/* Hidden input for keyboard sequence (Option B) */}
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
        </h1>

        {/* center: search (stays centered between brand and buttons) */}
        <div className="page-header__center">
          <div className="page-header__search">
            <div className="page-header__search-wrapper">
              {/* Decorative search icon (no accessibility impact) */}
              <svg
                className="page-header__search-icon"
                viewBox="0 0 20 20"
                fill="none"
                stroke="currentColor"
                aria-hidden="true"
              >
                {/* Simple magnifying glass path; stroke settings produce rounded corners */}
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M8 16a8 8 0 100-16 8 8 0 000 16zM15 15l5 5"
                />
              </svg>

              {/* Controlled search input bound to store value q */}
              <input
                id="ticker-filter" // for label association or testing
                type="search" // enables platform search affordances
                value={q} // controlled value from store
                onChange={e => setQ(e.target.value)} // update store on type
                placeholder="Search tickers..." // hint text
                className="page-header__search-input" // CSS module/class for styling
                aria-label="Filter tickers" // accessible name for screen readers
              />
            </div>
          </div>

          {/* right: actions */}
        </div>
        <div className="page-header__tools">
          <div className="page-header__actions">
            {/* Primary action: open the Actions drawer on the Trade tab */}
            <button
              onClick={() => openActions('Trade')} // open drawer focused on Trade
              className="page-header__btn page-header__btn--primary" // styled primary button
              data-testid="wheel.action.open" // E2E locator
              disabled={importing} // prevent clicks during import
              aria-busy={importing} // announce busy state to AT
            >
              {/* Swap label while importing */}
              {importing ? '⏳ Importing...' : '💸 Premium Printer'}
            </button>

            {/* Secondary action: navigate to the Journal page */}
            <button
              onClick={() => navigate('/journal')} // route to /journal
              className="page-header__btn page-header__btn--secondary" // secondary style
            >
              Journal
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
