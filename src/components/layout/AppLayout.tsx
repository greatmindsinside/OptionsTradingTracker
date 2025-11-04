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
      {/* Let each page control its own width/centering. Avoid constraining here. */}
      <main className="w-full">
        <Outlet />
      </main>
    </div>
  );
}
