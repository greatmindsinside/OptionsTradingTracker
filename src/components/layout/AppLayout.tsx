import { Outlet } from 'react-router-dom';
import { AppHeader } from '@/components/layout/AppHeader';

/**
 * AppLayout
 * - Renders the global AppHeader
 * - Provides a centered content area for pages
 * - Pages can render their own subheaders/toolbars under the global header
 */
export function AppLayout() {
  return (
    <div className="min-h-screen bg-black text-zinc-100">
      <AppHeader />
      <main className="mx-auto w-full max-w-6xl px-4 py-6">
        <Outlet />
      </main>
    </div>
  );
}
