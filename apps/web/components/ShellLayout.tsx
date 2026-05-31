'use client';

import { useState, Suspense } from 'react';
import { Sidebar } from '@/components/Sidebar';
import { AppHeader } from '@/components/AppHeader';
import { DoodleBackground } from '@/components/DoodleBackground';
import { DrawerProvider } from '@/components/Drawer';
import { TourStarter } from '@/components/TourStarter';

interface ShellLayoutProps {
  children: React.ReactNode;
  rol: 'admin' | 'empresa';
  userName?: string | null;
  userEmail?: string | null;
}

export function ShellLayout({ children, rol, userName, userEmail }: ShellLayoutProps) {
  const [collapsed,   setCollapsed]   = useState(false);
  const [mobileOpen,  setMobileOpen]  = useState(false);

  function toggleSidebar() {
    // On mobile toggle overlay; on desktop toggle collapsed
    if (window.innerWidth < 768) {
      setMobileOpen(v => !v);
    } else {
      setCollapsed(v => !v);
    }
  }

  return (
    <DrawerProvider>
      <Suspense><TourStarter /></Suspense>

      <div className="flex min-h-screen">

        {/* ── Mobile backdrop ── */}
        {mobileOpen && (
          <div
            className="fixed inset-0 z-40 bg-black/40 backdrop-blur-[2px] md:hidden"
            onClick={() => setMobileOpen(false)}
          />
        )}

        {/* ── Sidebar ── */}
        {/* Desktop: sticky, collapsible */}
        <div className="hidden md:block">
          <Sidebar rol={rol} collapsed={collapsed} />
        </div>

        {/* Mobile: fixed overlay, slides in from left */}
        <div className={[
          'fixed top-0 left-0 h-full z-50 md:hidden transition-transform duration-300',
          mobileOpen ? 'translate-x-0' : '-translate-x-full',
        ].join(' ')}>
          <Sidebar rol={rol} collapsed={false} onClose={() => setMobileOpen(false)} />
        </div>

        {/* ── Main content ── */}
        <div className="flex flex-col flex-1 min-w-0">
          <AppHeader
            onToggleSidebar={toggleSidebar}
            userName={userName}
            userEmail={userEmail}
            rol={rol}
          />
          <main className="relative flex-1 overflow-auto">
            <DoodleBackground />
            <div className="relative z-10">{children}</div>
          </main>
        </div>
      </div>
    </DrawerProvider>
  );
}
