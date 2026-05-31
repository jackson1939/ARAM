'use client';

import {
  createContext,
  useCallback,
  useContext,
  useState,
  useRef,
  useEffect,
  type ReactNode,
} from 'react';
import { X, Maximize2, Minimize2 } from 'lucide-react';

// ── Types ──────────────────────────────────────────────────────────────────────

interface DrawerConfig {
  title: string;
  children: ReactNode;
}

interface DrawerCtx {
  open:  (config: DrawerConfig) => void;
  close: () => void;
}

// ── Context ────────────────────────────────────────────────────────────────────

const DrawerContext = createContext<DrawerCtx>({
  open:  () => {},
  close: () => {},
});

export function useDrawer() {
  return useContext(DrawerContext);
}

// ── Provider + Panel ───────────────────────────────────────────────────────────

export function DrawerProvider({ children }: { children: ReactNode }) {
  const [config,   setConfig]   = useState<DrawerConfig | null>(null);
  const [visible,  setVisible]  = useState(false);   // controls CSS translate
  const [mounted,  setMounted]  = useState(false);   // keeps DOM alive during exit
  const [expanded, setExpanded] = useState(false);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const open = useCallback((cfg: DrawerConfig) => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    setConfig(cfg);
    setExpanded(false);
    setMounted(true);
    // allow one frame for mount before triggering transition
    requestAnimationFrame(() => requestAnimationFrame(() => setVisible(true)));
  }, []);

  const close = useCallback(() => {
    setVisible(false);
    closeTimer.current = setTimeout(() => {
      setMounted(false);
      setConfig(null);
    }, 300);
  }, []);

  // Close on Escape
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape' && visible) close();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [visible, close]);

  const width = expanded ? 'w-[min(820px,90vw)]' : 'w-[min(480px,95vw)]';

  return (
    <DrawerContext.Provider value={{ open, close }}>
      {children}

      {mounted && (
        <>
          {/* Backdrop */}
          <div
            onClick={close}
            className={[
              'fixed inset-0 z-40 bg-black/30 backdrop-blur-[2px] transition-opacity duration-300',
              visible ? 'opacity-100' : 'opacity-0',
            ].join(' ')}
          />

          {/* Panel */}
          <aside
            className={[
              'fixed top-0 right-0 h-full z-50 flex flex-col',
              'bg-card border-l border-border-default shadow-[−8px_0_40px_rgba(0,0,0,0.12)]',
              'transition-all duration-300 ease-out',
              width,
              visible ? 'translate-x-0' : 'translate-x-full',
            ].join(' ')}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-border-default flex-shrink-0">
              <h2 className="font-extrabold text-[15px] text-black-heading tracking-tight truncate pr-4">
                {config?.title}
              </h2>
              <div className="flex items-center gap-1 flex-shrink-0">
                <button
                  onClick={() => setExpanded(v => !v)}
                  className="w-8 h-8 rounded-[7px] flex items-center justify-center text-body-text hover:bg-bg-page hover:text-black-heading transition-colors"
                  aria-label={expanded ? 'Reducir' : 'Expandir'}
                  title={expanded ? 'Reducir' : 'Expandir'}
                >
                  {expanded ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
                </button>
                <button
                  onClick={close}
                  className="w-8 h-8 rounded-[7px] flex items-center justify-center text-body-text hover:bg-bg-page hover:text-black-heading transition-colors"
                  aria-label="Cerrar"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto">
              {config?.children}
            </div>
          </aside>
        </>
      )}
    </DrawerContext.Provider>
  );
}
