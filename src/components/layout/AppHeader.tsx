import { NavLink } from 'react-router-dom';

/**
 * AppHeader (global)
 * - Shown on all pages
 * - Provides brand and top-level navigation (Wheel, Journal)
 * - Keep page-specific tools in each page's own subheader
 */
export function AppHeader() {
  return (
    <header className="sticky top-0 z-30 border-b border-zinc-800/70 bg-black/70 backdrop-blur">
      <div className="mx-auto flex h-14 w-full max-w-6xl items-center justify-between px-4">
        {/* Brand */}
        <div className="font-semibold text-zinc-200">Options Tracker</div>

        {/* Global navigation */}
        <nav className="flex gap-3 text-sm">
          <NavLink
            to="/"
            end
            className={({ isActive }) =>
              `rounded px-2 py-1 ${
                isActive ? 'bg-zinc-800 text-zinc-100' : 'text-zinc-400 hover:text-zinc-200'
              }`
            }
          >
            Wheel
          </NavLink>
          <NavLink
            to="/journal"
            className={({ isActive }) =>
              `rounded px-2 py-1 ${
                isActive ? 'bg-zinc-800 text-zinc-100' : 'text-zinc-400 hover:text-zinc-200'
              }`
            }
          >
            Journal
          </NavLink>
        </nav>

        {/* Right side reserved for future (theme/profile/etc.) */}
        <div />
      </div>
    </header>
  );
}
