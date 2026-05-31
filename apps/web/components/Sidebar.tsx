'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { clsx } from 'clsx';
import {
  LayoutDashboard, CheckSquare, Building2, BarChart3,
  BookOpen, FileText, PlusCircle, Database, MonitorPlay,
} from 'lucide-react';

const adminNav = [
  { href: '/admin/dashboard',     label: 'Dashboard',        icon: LayoutDashboard },
  { href: '/admin/validacion',    label: 'Validación',       icon: CheckSquare },
  { href: '/admin/empresas',      label: 'Empresas',         icon: Building2 },
  { href: '/empresa/extraer',     label: 'Recolectar',       icon: PlusCircle },
  { href: '/empresa/educacion',   label: 'Educación',        icon: BookOpen },
  { href: '/admin/reportes',      label: 'Reportes',         icon: BarChart3 },
  { href: '/admin/ingreso-datos', label: 'Ingreso de datos', icon: Database },
  { href: '/admin/demostracion',  label: 'Demostración',     icon: MonitorPlay },
];

const empresaNav = [
  { href: '/empresa/dashboard',     label: 'Dashboard',        icon: LayoutDashboard },
  { href: '/empresa/extraer',       label: 'Recolectar',       icon: PlusCircle },
  { href: '/empresa/educacion',     label: 'Educación',        icon: BookOpen },
  { href: '/empresa/reportes',      label: 'Reportes',         icon: FileText },
  { href: '/empresa/ingreso-datos', label: 'Ingreso de datos', icon: Database },
  { href: '/empresa/demostracion',  label: 'Demostración',     icon: MonitorPlay },
];

interface SidebarProps {
  rol: 'admin' | 'empresa';
  collapsed?: boolean;
}

export function Sidebar({ rol, collapsed = false }: SidebarProps) {
  const pathname = usePathname();
  const nav      = rol === 'admin' ? adminNav : empresaNav;

  return (
    <aside
      className={clsx(
        'shrink-0 bg-white border-r border-border-default flex flex-col h-screen sticky top-0 transition-all duration-200 overflow-hidden',
        collapsed ? 'w-[60px]' : 'w-60',
      )}
    >
      {/* Brand */}
      <div className={clsx(
        'flex items-center gap-3 border-b border-border-default transition-all duration-200',
        collapsed ? 'px-3 py-5 justify-center' : 'px-5 py-6',
      )}>
        <div className="w-9 h-9 bg-[#4BAF47] rounded-[8px] flex items-center justify-center shrink-0">
          <svg viewBox="0 0 24 24" className="w-5 h-5 stroke-white fill-none stroke-2 [stroke-linecap:round] [stroke-linejoin:round]">
            <path d="M4 20c0-9 7-15 16-15 0 9-6 15-15 15-1 0-1 0-1 0z"/>
            <path d="M4 20c4-6 8-9 12-11"/>
          </svg>
        </div>
        {!collapsed && (
          <div className="overflow-hidden">
            <p className="font-extrabold text-[15px] text-black-heading tracking-tight leading-none mb-1 whitespace-nowrap">Fundares</p>
            <p className="text-[11px] font-semibold text-body-text uppercase tracking-widest leading-none capitalize">{rol}</p>
          </div>
        )}
      </div>

      {/* Nav */}
      <nav className={clsx('flex-1 py-4 space-y-0.5 transition-all duration-200', collapsed ? 'px-2' : 'px-3')}>
        {nav.map(({ href, label, icon: Icon }) => {
          const active = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              title={collapsed ? label : undefined}
              className={clsx(
                'flex items-center gap-3 rounded-[7px] text-sm transition-colors',
                collapsed ? 'justify-center px-0 py-2.5' : 'px-3 py-2.5',
                active
                  ? 'bg-green-light text-[#4BAF47] font-bold'
                  : 'text-body-text font-semibold hover:bg-bg-page hover:text-black-heading',
              )}
            >
              <Icon className="w-4 h-4 shrink-0" />
              {!collapsed && <span className="truncate">{label}</span>}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
