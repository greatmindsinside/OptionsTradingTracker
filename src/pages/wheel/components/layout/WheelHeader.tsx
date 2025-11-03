import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useWheelUIStore } from '@/stores/useWheelUIStore';

export const WheelHeader: React.FC = () => {
  const navigate = useNavigate();
  const q = useWheelUIStore(s => s.searchQuery);
  const setQ = useWheelUIStore(s => s.setSearchQuery);
  const openActions = useWheelUIStore(s => s.openActions);
  const importing = useWheelUIStore(s => s.importing);

  return (
    <header className="wheel-header">
      <div className="wheel-header__inner">
        <h1 className="wheel-header__brand" data-testid="wheel.title">
          💰 Wheel To Tendies Pipeline
        </h1>
        <div className="wheel-header__search">
          <div className="wheel-header__search-wrapper">
            <svg
              className="wheel-header__search-icon"
              viewBox="0 0 20 20"
              fill="none"
              stroke="currentColor"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M8 16a8 8 0 100-16 8 8 0 000 16zM15 15l5 5"
              />
            </svg>
            <input
              id="ticker-filter"
              type="search"
              value={q}
              onChange={e => setQ(e.target.value)}
              placeholder="Search tickers..."
              className="wheel-header__search-input"
              aria-label="Filter tickers"
            />
          </div>
        </div>
        <div className="wheel-header__actions">
          <button
            onClick={() => openActions('Import')}
            className="wheel-header__btn wheel-header__btn--primary"
            data-testid="wheel.action.open"
            disabled={importing}
            aria-busy={importing}
          >
            {importing ? '⏳ Importing...' : '💸 Premium Printer'}
          </button>
          <button
            onClick={() => navigate('/journal')}
            className="wheel-header__btn wheel-header__btn--secondary"
          >
            � Journal
          </button>
        </div>
      </div>
    </header>
  );
};
