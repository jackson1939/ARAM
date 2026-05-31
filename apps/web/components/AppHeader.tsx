'use client';

import { usePathname } from 'next/navigation';
import { signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Menu, Plus, LogOut, ChevronDown, Sun, Moon } from 'lucide-react';
import { useState } from 'react';
import { useTheme } from '@/components/ThemeProvider';
import { useDrawer } from '@/components/Drawer';
import { NuevaRecoleccionForm } from '@/components/NuevaRecoleccionForm';

interface PageMeta {
  title: string;
  showAction?: boolean;
}

const PAGE_META: Record<string, PageMeta> = {
  '/admin/dashboard':       { title: 'Dashboard',        showAction: true  },
  '/admin/validacion':      { title: 'Validación' },
  '/admin/empresas':        { title: 'Empresas' },
  '/admin/reportes':        { title: 'Reportes' },
  '/admin/ingreso-datos':   { title: 'Ingreso de datos', showAction: true  },
  '/admin/monitoreo':       { title: 'Monitoreo' },
  '/admin/demostracion':    { title: 'Demostración' },
  '/empresa/dashboard':     { title: 'Mi impacto',       showAction: true  },
  '/empresa/extraer':       { title: 'Recolectar' },
  '/empresa/educacion':     { title: 'Educación' },
  '/empresa/reportes':      { title: 'Reportes' },
  '/empresa/ingreso-datos': { title: 'Ingreso de datos', showAction: true  },
  '/empresa/demostracion':  { title: 'Demostración' },
};

interface AppHeaderProps {
  onToggleSidebar: () => void;
  userName?: string | null;
  userEmail?: string | null;
  rol: 'admin' | 'empresa';
}

export function AppHeader({ onToggleSidebar, userName, userEmail, rol }: AppHeaderProps) {
  const pathname  = usePathname();
  const router    = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const { theme, toggle: toggleTheme } = useTheme();
  const drawer = useDrawer();

  const meta     = PAGE_META[pathname] ?? { title: 'Fundares' };
  const initials = (userName ?? userEmail ?? 'U')
    .split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);

  function openRecoleccion() {
    drawer.open({
      title: 'Nueva recolección',
      children: <NuevaRecoleccionForm />,
      defaultExpanded: true,
    });
  }

  async function handleLogout() {
    setMenuOpen(false);
    await signOut({ redirect: false });
    router.push('/login');
    router.refresh();
  }

  return (
    <header className="sticky top-0 z-20 h-14 bg-card/90 backdrop-blur-sm border-b border-border-default flex items-center justify-between px-4 gap-4">

      {/* Left */}
      <div className="flex items-center gap-3 min-w-0">
        <button
          onClick={onToggleSidebar}
          className="w-8 h-8 rounded-[7px] flex items-center justify-center text-body-text hover:bg-bg-page hover:text-black-heading transition-colors flex-shrink-0"
          aria-label="Toggle sidebar"
        >
          <Menu className="w-4 h-4" />
        </button>
        <h1 className="font-extrabold text-[16px] text-black-heading tracking-tight truncate">
          {meta.title}
        </h1>
      </div>

      {/* Right */}
      <div className="flex items-center gap-2 flex-shrink-0">

        {/* Theme toggle */}
        <button
          onClick={toggleTheme}
          className="w-8 h-8 rounded-[7px] flex items-center justify-center text-body-text hover:bg-bg-page transition-colors flex-shrink-0"
          aria-label="Toggle theme"
        >
          {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
        </button>

        {/* Nueva recolección */}
        {meta.showAction && (
          <button
            onClick={openRecoleccion}
            className="inline-flex items-center gap-1.5 bg-[#4BAF47] hover:bg-[#3d9a3a] text-white text-[13px] font-bold px-3 py-1.5 rounded-[7px] transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            Nueva recolección
          </button>
        )}

        {/* User menu */}
        <div className="relative">
          <button
            onClick={() => setMenuOpen(v => !v)}
            className="flex items-center gap-2 pl-2 pr-1.5 py-1 rounded-[7px] hover:bg-bg-page transition-colors"
          >
            <div className="w-7 h-7 rounded-full bg-green-light text-[#4BAF47] grid place-items-center text-[11px] font-extrabold flex-shrink-0">
              {initials}
            </div>
            <div className="hidden sm:block text-left">
              <div className="text-[12px] font-bold text-black-heading leading-none">
                {userName ?? userEmail ?? rol}
              </div>
              <div className="text-[11px] text-body-text leading-none mt-0.5 capitalize">{rol}</div>
            </div>
            <ChevronDown className="w-3 h-3 text-body-text" />
          </button>

          {menuOpen && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
              <div className="absolute right-0 top-full mt-1.5 w-48 bg-card border border-border-default rounded-[9px] shadow-card z-20 py-1 overflow-hidden">
                <div className="px-3 py-2.5 border-b border-border-default">
                  <div className="text-[12px] font-bold text-black-heading truncate">{userName ?? '—'}</div>
                  <div className="text-[11px] text-body-text truncate">{userEmail ?? '—'}</div>
                </div>
                <button
                  onClick={handleLogout}
                  className="flex items-center gap-2 w-full px-3 py-2.5 text-[13px] font-semibold text-body-text hover:bg-bg-page hover:text-black-heading transition-colors"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  Cerrar sesión
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
