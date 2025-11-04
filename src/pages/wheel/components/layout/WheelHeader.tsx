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
import React from 'react'; // React for JSX
import { useNavigate } from 'react-router-dom'; // client-side navigation
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

  return (
    // Top-level header container (styled via page-header* classes in CSS)
    <header className="page-header">
      {/* Centers content and constrains width */}
      <div className="page-header__inner">
        {/* Brand/title for the page; test id consumed by E2E tests */}
        <h1 className="page-header__brand" data-testid="wheel.title">
          💰 Wheel To Tendies Pipeline
        </h1>

        {/* Search section: ticker filter input */}
        <div className="page-header__search">
          {/* Wrapper provides icon + input layout and styles the input surface */}
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

        {/* Right-aligned action buttons */}
        <div className="page-header__actions">
          {/* Primary action: open the Actions drawer on the Import tab */}
          <button
            onClick={() => openActions('Import')} // open drawer focused on Import
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
    </header>
  );
};
