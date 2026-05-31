'use client';

import { useState, useEffect } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import toast from 'react-hot-toast';

interface PublicStats {
  total_kg: number;
  co2_kg: number;
  total_empresas: number;
}

function Skel({ w = 'w-16', h = 'h-[0.9em]', className = '' }: { w?: string; h?: string; className?: string }) {
  return (
    <span
      className={`inline-block rounded-[5px] animate-pulse ${w} ${h} ${className}`}
      style={{ background: 'rgba(255,255,255,0.18)' }}
    />
  );
}

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail]         = useState('');
  const [password, setPassword]   = useState('');
  const [loading, setLoading]     = useState(false);
  const [role, setRole]           = useState<'empresa' | 'admin'>('empresa');
  const [stats, setStats]         = useState<PublicStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetch('/api/public-stats')
      .then(r => { if (!r.ok) throw new Error(`${r.status}`); return r.json(); })
      .then((d: PublicStats) => { setStats(d); setIsLoading(false); })
      .catch(e => { console.warn('[public-stats]', e); setIsLoading(false); });
  }, []);

  const DEMO = {
    empresa: { email: 'empresa@demo.com',   password: '12345'   },
    admin:   { email: 'admin@fundares.org', password: 'Admin123!' },
  } as const;

  function handleRoleChange(r: 'empresa' | 'admin') {
    setRole(r);
    setEmail(DEMO[r].email);
    setPassword(DEMO[r].password);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    const result = await signIn('credentials', {
      email,
      password,
      redirect: false,
    });

    if (result?.error || !result?.ok) {
      toast.error('Credenciales incorrectas');
      setLoading(false);
      return;
    }

    const sessionRes = await fetch('/api/auth/session');
    const session    = await sessionRes.json();
    const rol        = session?.user?.rol;

    router.push(rol === 'admin' ? '/admin/dashboard' : '/empresa/dashboard');
    router.refresh();
  }

  return (
    <>
      {/* ── Back link ── */}
      <Link
        href="/"
        className="absolute top-5 left-5 z-20 inline-flex items-center gap-2 text-[13px] font-semibold text-body-text hover:text-[var(--green)] bg-card border border-border-default rounded-[8px] px-3 py-2 shadow-card transition-colors"
      >
        <svg className="w-[14px] h-[14px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M19 12H5M11 18l-6-6 6-6"/>
        </svg>
        Inicio
      </Link>

      {/* ── Left panel: form ── */}
      <div className="w-full lg:w-[42%] lg:min-w-[380px] flex items-center justify-center min-h-screen bg-bg-page px-10 py-14 relative z-10">
        <div className="w-full max-w-[380px]">

          {/* Brand */}
          <div className="flex items-center gap-3 mb-12">
            <div className="w-[42px] h-[42px] bg-[var(--green)] rounded-[11px] flex items-center justify-center flex-shrink-0">
              <svg viewBox="0 0 24 24" className="w-5 h-5 fill-none stroke-white stroke-2 [stroke-linecap:round] [stroke-linejoin:round]">
                <path d="M12 22V12M12 12C12 7 7 5 3 7M12 12C12 7 17 5 21 7"/>
                <circle cx="12" cy="12" r="2"/>
              </svg>
            </div>
            <div>
              <p className="font-display font-bold text-[20px] text-black-heading tracking-tight leading-none">ARAM</p>
              <p className="font-mono text-[10px] font-medium tracking-[0.16em] uppercase text-muted-text mt-1">Asistente de Recolección Automatizada Multicanal</p>
            </div>
          </div>

          <h1 className="font-display font-extrabold text-[30px] text-black-heading tracking-tight leading-tight mb-2">
            Iniciar sesión
          </h1>
          <p className="text-[14.5px] text-body-text mb-8">
            Ingresá con tu cuenta para continuar.
          </p>

          {/* Role toggle */}
          <div className="flex gap-1.5 bg-[var(--alt)] border border-border-default rounded-input p-1 mb-6">
            {(['empresa', 'admin'] as const).map(r => (
              <button
                key={r}
                type="button"
                onClick={() => handleRoleChange(r)}
                className={[
                  'flex-1 py-2 text-[13px] font-bold rounded-[7px] transition-all',
                  role === r
                    ? 'bg-card text-[var(--forest)] shadow-[0_1px_3px_rgba(40,38,28,0.08)]'
                    : 'text-muted-text hover:text-body-text',
                ].join(' ')}
              >
                {r === 'empresa' ? 'Empresa' : 'Administración'}
              </button>
            ))}
          </div>

          {/* Demo hint */}
          <div className="bg-[var(--alt)] border border-border-default rounded-input px-4 py-3 mb-7 text-[12.5px] text-body-text space-y-1.5">
            <p className="font-bold text-black-heading">Acceso demo</p>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-muted-text">Email:</span>
              <code className="font-mono text-[11.5px] bg-card border border-border-default rounded px-1.5 py-0.5 text-[var(--green)]">
                {DEMO[role].email}
              </code>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-muted-text">Contraseña:</span>
              <code className="font-mono text-[11.5px] bg-card border border-border-default rounded px-1.5 py-0.5 text-[var(--green)]">
                {DEMO[role].password}
              </code>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-[13px] font-bold text-black-heading mb-1.5">Email</label>
              <input
                type="email"
                required
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="w-full border border-border-default rounded-input px-3.5 py-3 text-sm text-black-heading placeholder:text-muted-text outline-none focus:border-[var(--green)] focus:ring-2 focus:ring-[var(--green)]/20 transition-colors bg-card"
                placeholder={DEMO[role].email}
              />
            </div>

            <div>
              <label className="block text-[13px] font-bold text-black-heading mb-1.5">Contraseña</label>
              <input
                type="password"
                required
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="w-full border border-border-default rounded-input px-3.5 py-3 text-sm text-black-heading placeholder:text-muted-text outline-none focus:border-[var(--green)] focus:ring-2 focus:ring-[var(--green)]/20 transition-colors bg-card"
                placeholder="••••••••"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 bg-[var(--green)] hover:bg-[var(--forest-2)] text-white font-bold text-[15px] rounded-input transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_4px_14px_rgba(47,125,79,0.3)] hover:-translate-y-px mt-1"
            >
              {loading ? 'Entrando…' : 'Iniciar sesión'}
            </button>
          </form>

          <p className="font-mono text-[11.5px] text-muted-text text-center tracking-[0.04em] mt-10">
            ARAM · Santa Cruz, Bolivia
          </p>
        </div>
      </div>

      {/* ── Right panel: brand ── */}
      <div className="hidden lg:flex flex-1 relative overflow-hidden bg-[var(--forest)] items-center justify-center">

        {/* SVG doodle pattern */}
        <svg aria-hidden="true" className="absolute inset-0 w-full h-full pointer-events-none" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <symbol id="lp-leaf" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
              <path d="M11 20A7 7 0 019 6c4-2 7-1 9-1 0 4-1 7-3 9a7 7 0 01-4 6z"/>
              <path d="M11 20c0-5 2-9 6-12"/>
            </symbol>
            <symbol id="lp-recycle" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
              <path d="M7 19H4.8a1.8 1.8 0 01-1.6-2.7L5 13"/>
              <path d="M9.3 5.5l1.4-2.4a1.8 1.8 0 013.1 0l1.6 2.8"/>
              <path d="M14.5 17h4.7a1.8 1.8 0 001.6-2.7l-1-1.8"/>
              <path d="M9 19l2 2-2 2"/>
            </symbol>
            <symbol id="lp-bottle" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 2h6M8 4l-1 3v13a2 2 0 002 2h6a2 2 0 002-2V7l-1-3"/>
              <line x1="7" y1="11" x2="17" y2="11"/>
            </symbol>
            <symbol id="lp-box" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 16V8l-9-5-9 5v8l9 5 9-5z"/>
              <polyline points="3.3 7 12 12 20.7 7"/>
              <line x1="12" y1="22" x2="12" y2="12"/>
            </symbol>
            <pattern id="lp-tile" x="0" y="0" width="108" height="100" patternUnits="userSpaceOnUse">
              <g transform="translate(16,18) rotate(-14)"><use href="#lp-leaf" width="20" height="20" x="-10" y="-10"/></g>
              <g transform="translate(74,12) rotate(20)"><use href="#lp-recycle" width="18" height="18" x="-9" y="-9"/></g>
              <g transform="translate(92,58) rotate(-8)"><use href="#lp-bottle" width="16" height="16" x="-8" y="-8"/></g>
              <g transform="translate(34,62) rotate(10)"><use href="#lp-box" width="20" height="20" x="-10" y="-10"/></g>
              <circle cx="60" cy="40" r="2" fill="#fff"/>
              <circle cx="90" cy="86" r="2" fill="#fff"/>
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#lp-tile)" opacity="0.16"/>
        </svg>

        {/* Content */}
        <div className="relative z-10 flex flex-col items-center text-center px-14 max-w-[520px]">
          <div className="w-[84px] h-[84px] rounded-[22px] bg-white/12 backdrop-blur-sm border border-white/14 grid place-items-center mb-8">
            <svg viewBox="0 0 24 24" className="w-10 h-10 fill-none stroke-white stroke-2 [stroke-linecap:round] [stroke-linejoin:round]">
              <path d="M12 22V12M12 12C12 7 7 5 3 7M12 12C12 7 17 5 21 7"/>
              <circle cx="12" cy="12" r="2"/>
            </svg>
          </div>

          <p className="font-mono text-[12px] font-medium tracking-[0.2em] uppercase text-[#4BAF47] mb-5">
            Datos de reciclaje, con rigor
          </p>

          <h2 className="font-display font-extrabold text-[46px] text-white tracking-tight leading-none mb-6">
            Fundares
          </h2>

          <p className="text-[16px] leading-[1.7] text-[rgba(231,239,226,0.74)] max-w-[400px]">
            Asistente de Recolección Automatizada Multicanal para empresas aliadas.
          </p>

          {/* Stats — real data */}
          <div className="flex justify-center gap-10 mt-10 pt-8 border-t border-white/12 w-full">
            {[
              {
                value: isLoading ? null : (stats
                  ? stats.total_kg >= 1000
                    ? `${(stats.total_kg / 1000).toFixed(1)} t`
                    : `${stats.total_kg} kg`
                  : '—'),
                label: 'reciclado',
              },
              {
                value: isLoading ? null : (stats ? String(stats.total_empresas) : '—'),
                label: 'empresas',
              },
              {
                value: isLoading ? null : (stats
                  ? stats.co2_kg >= 1000
                    ? `${(stats.co2_kg / 1000).toFixed(1)} t`
                    : `${stats.co2_kg} kg`
                  : '—'),
                label: 'CO₂ evitado',
              },
            ].map(s => (
              <div key={s.label} className="text-center">
                {s.value === null
                  ? <Skel w="w-14" h="h-8" className="mb-1" />
                  : <span className="font-display font-extrabold text-[30px] text-white block tracking-tight leading-none">{s.value}</span>
                }
                <span className="font-mono text-[11px] text-[rgba(231,239,226,0.6)] tracking-[0.08em] uppercase mt-1.5 block">{s.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
