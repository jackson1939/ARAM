'use client';

import { useState } from 'react';
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
  const [collapsed, setCollapsed] = useState(false);

  return (
    <DrawerProvider>
      <TourStarter />
      <div className="flex min-h-screen">
        <Sidebar rol={rol} collapsed={collapsed} />
        <div className="flex flex-col flex-1 min-w-0">
          <AppHeader
            onToggleSidebar={() => setCollapsed(v => !v)}
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
