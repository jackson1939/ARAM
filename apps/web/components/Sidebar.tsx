'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { clsx } from 'clsx';
import { X } from 'lucide-react';
import {
  LayoutDashboard, CheckSquare, Building2, BarChart3,
  BookOpen, FileText, MonitorPlay, Activity,
} from 'lucide-react';

const adminNav = [
  { href: '/admin/dashboard',    label: 'Dashboard',    icon: LayoutDashboard, section: 'Operación' },
  { href: '/admin/validacion',   label: 'Validación',   icon: CheckSquare },
  { href: '/admin/empresas',     label: 'Empresas',     icon: Building2 },
  { href: '/admin/educacion',    label: 'Educación',    icon: BookOpen },
  { href: '/admin/reportes',     label: 'Reportes',     icon: BarChart3,       section: 'Reportería' },
  { href: '/admin/monitoreo',    label: 'Monitoreo',    icon: Activity },
  { href: '/admin/demostracion', label: 'Demostración', icon: MonitorPlay },
];

const empresaNav = [
  { href: '/empresa/dashboard',    label: 'Mi impacto',   icon: LayoutDashboard, section: 'Mi empresa' },
  { href: '/empresa/educacion',    label: 'Educación',    icon: BookOpen },
  { href: '/empresa/reportes',     label: 'Reportes',     icon: FileText },
  { href: '/empresa/demostracion', label: 'Demostración', icon: MonitorPlay },
];

interface SidebarProps {
  rol:       'admin' | 'empresa';
  collapsed?: boolean;
  onClose?:  () => void;
}

export function Sidebar({ rol, collapsed = false, onClose }: SidebarProps) {
  const pathname = usePathname();
  const nav      = rol === 'admin' ? adminNav : empresaNav;
  let lastSection = '';

  return (
    <aside className={clsx(
      'bg-card border-r border-border-default flex flex-col h-screen sticky top-0 transition-all duration-200 overflow-hidden',
      collapsed ? 'w-[60px]' : 'w-[248px]',
    )}>
      {/* Brand */}
      <div className={clsx(
        'flex items-center border-b border-border-default transition-all duration-200',
        collapsed ? 'px-3 py-5 justify-center' : 'px-5 py-5',
        onClose ? 'justify-between' : '',
      )}>
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-9 h-9 bg-[var(--green)] rounded-[11px] flex items-center justify-center shrink-0">
            <svg viewBox="0 0 24 24" className="w-5 h-5 stroke-white fill-none stroke-2 [stroke-linecap:round] [stroke-linejoin:round]">
              <path d="M4 20c0-9 7-15 16-15 0 9-6 15-15 15-1 0-1 0-1 0z"/>
              <path d="M4 20c4-6 8-9 12-11"/>
            </svg>
          </div>
          {!collapsed && (
            <div className="overflow-hidden">
              <p className="font-display font-bold text-[16px] text-black-heading tracking-tight leading-none mb-1 whitespace-nowrap">ARAM</p>
              <p className="font-mono text-[10px] font-medium tracking-[0.16em] uppercase text-muted-text leading-none">
                {rol === 'admin' ? 'Administración' : 'Empresa'}
              </p>
            </div>
          )}
        </div>

        {/* Close button — mobile only */}
        {onClose && !collapsed && (
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-[7px] flex items-center justify-center text-body-text hover:bg-bg-page transition-colors shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Nav */}
      <nav className={clsx('flex-1 py-3 overflow-y-auto transition-all duration-200', collapsed ? 'px-2' : 'px-3')}>
        {nav.map(({ href, label, icon: Icon, section }) => {
          const active      = pathname === href;
          const showSection = !collapsed && section && section !== lastSection;
          if (section) lastSection = section;

          return (
            <div key={href}>
              {showSection && (
                <p className="font-mono text-[10px] font-medium tracking-[0.14em] uppercase text-muted-text px-3 pt-4 pb-2">
                  {section}
                </p>
              )}
              <Link
                href={href}
                title={collapsed ? label : undefined}
                data-tour={`nav-${href.split('/').pop()}`}
                onClick={onClose}
                className={clsx(
                  'relative flex items-center gap-3 rounded-[9px] text-[14px] transition-colors mb-0.5',
                  collapsed ? 'justify-center px-0 py-2.5' : 'px-3 py-2.5',
                  active
                    ? 'bg-green-light text-[#1E3D2A] dark:text-[#4BAF47] font-bold'
                    : 'text-body-text font-semibold hover:bg-[var(--alt)] hover:text-black-heading',
                )}
              >
                {active && !collapsed && (
                  <span className="absolute left-0 top-2 bottom-2 w-[3px] bg-[var(--green)] rounded-r-[3px]" />
                )}
                <Icon className="w-[18px] h-[18px] shrink-0" strokeWidth={2} />
                {!collapsed && <span className="truncate">{label}</span>}
              </Link>
            </div>
          );
        })}
      </nav>
    </aside>
  );
}
