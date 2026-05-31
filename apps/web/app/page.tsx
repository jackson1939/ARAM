'use client';

import React, { useRef, useState, useEffect } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import { useTheme } from '@/components/ThemeProvider';

// ── Easing ──────────────────────────────────────────────────────────────────
const EASE = [0.22, 1, 0.36, 1] as const;

// ── Data ─────────────────────────────────────────────────────────────────────
const FEATURES = [
  { n: '01', bg: 'bg-green-light', ic: 'text-green-mid', path: <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/>, t: 'Extracción inteligente', d: 'Pegá el texto del recolector, subí una foto del comprobante o un video. La IA identifica empresa, fecha, materiales y cantidades, y devuelve un nivel de confianza.', api: 'POST /api/extraer' },
  { n: '02', bg: 'bg-rust-light',  ic: 'text-rust',      path: <><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/></>, t: 'Flujo de validación', d: 'Cada extracción pasa por aprobación humana: corregir empresa, material, cantidad o fecha antes de registrarla oficialmente.', api: 'POST /api/validar' },
  { n: '03', bg: 'bg-slate-light', ic: 'text-slate',     path: <path d="M18 20V10M12 20V4M6 20v-6"/>, t: 'Métricas de impacto', d: 'CO₂ evitado, litros de agua ahorrados y árboles equivalentes — calculados por factores reales según material, por empresa y por período.', api: 'GET /api/metricas' },
  { n: '04', bg: 'bg-clay-light',  ic: 'text-clay',      path: <><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.9M16 3.1a4 4 0 010 7.8"/></>, t: 'Gestión de empresas', d: 'Administrá las organizaciones aliadas, sus usuarios, contactos y niveles de acceso desde un panel central.', api: '/api/empresas' },
  { n: '05', bg: 'bg-green-light', ic: 'text-green-mid', path: <><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><path d="M14 2v6h6M16 13H8M16 17H8"/></>, t: 'Reportes certificados', d: 'Generá PDFs con el impacto calculado, listos para autoridades, clientes y auditorías de sostenibilidad. Por empresa o consolidados.', api: '/api/reporte' },
  { n: '06', bg: 'bg-[var(--amber-wash)]', ic: 'text-[var(--amber)]', path: <path d="M21 11.5a8.4 8.4 0 01-.9 3.8 8.5 8.5 0 01-7.6 4.7 8.4 8.4 0 01-3.8-.9L3 21l1.9-5.7a8.4 8.4 0 01-.9-3.8 8.5 8.5 0 014.7-7.6 8.4 8.4 0 013.8-.9h.5a8.48 8.48 0 018 8z"/>, t: 'Captura por WhatsApp', d: 'Los recolectores envían sus reportes por el canal que ya usan. El webhook recibe el mensaje y arranca la extracción automáticamente.', api: '/api/webhook/whatsapp' },
];

const MARQUEE_ITEMS = ['Extracción con IA', 'Datos estructurados', 'Texto · imagen · video', 'Validación humana', 'Tiempo real', 'Impacto medible'];

// ── Component ─────────────────────────────────────────────────────────────────
export default function LandingPage() {
  const containerRef = useRef<HTMLDivElement>(null);
  const chipRef      = useRef<HTMLDivElement>(null);
  const leaf1Ref     = useRef<HTMLDivElement>(null);
  const visualRef    = useRef<HTMLDivElement>(null);
  const [scrolled, setScrolled] = useState(false);
  const { theme, toggle: toggleTheme } = useTheme();

  // Nav scroll state
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useGSAP(() => {
    // Floating chip
    if (chipRef.current) {
      gsap.to(chipRef.current, { y: -9, duration: 3, ease: 'sine.inOut', yoyo: true, repeat: -1, delay: 1.4 });
    }
    // Leaf parallax
    if (leaf1Ref.current) {
      gsap.to(leaf1Ref.current, { y: -26, duration: 6, ease: 'sine.inOut', yoyo: true, repeat: -1 });
    }
    // Panel parallax on scroll
    if (visualRef.current) {
      gsap.to(visualRef.current, {
        yPercent: -6, ease: 'none',
        scrollTrigger: { trigger: '.hero-section', start: 'top top', end: 'bottom top', scrub: 0.6 },
      });
    }
    // Scroll reveals
    const reveals = gsap.utils.toArray('[data-reveal]') as HTMLElement[];
    reveals.forEach((el, i) => {
      gsap.fromTo(el,
        { opacity: 0, y: 22 },
        { opacity: 1, y: 0, duration: 0.75, ease: 'power3.out', delay: el.dataset.delay ? parseFloat(el.dataset.delay) : 0,
          scrollTrigger: { trigger: el, start: 'top 86%' } }
      );
    });
    // Steps stagger
    gsap.utils.toArray<HTMLElement>('.step-item').forEach((el, i) => {
      gsap.fromTo(el,
        { opacity: 0, y: 24 },
        { opacity: 1, y: 0, duration: 0.6, ease: 'power3.out', delay: i * 0.1,
          scrollTrigger: { trigger: '.steps-grid', start: 'top 82%' } }
      );
    });
  }, { scope: containerRef });

  return (
    <div ref={containerRef} className="min-h-screen font-sans overflow-x-hidden" style={{ background: 'var(--bg)', color: 'var(--bt)' }}>

      {/* ── NAV ── */}
      <nav className={[
        'fixed top-0 left-0 right-0 z-[80] flex items-center justify-between h-[72px] px-10 transition-all duration-300',
        scrolled ? 'border-b backdrop-blur-[14px] shadow-sm' : 'border-b border-transparent',
      ].join(' ')}
        style={scrolled ? { background: 'rgba(246,244,236,0.86)', borderColor: 'var(--bd)' } : {}}
      >
        {/* Brand */}
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-[var(--green)] rounded-[10px] grid place-items-center shrink-0">
            <svg viewBox="0 0 24 24" className="w-5 h-5 stroke-white fill-none stroke-2 [stroke-linecap:round] [stroke-linejoin:round]">
              <path d="M12 22V12M12 12C12 7 7 5 3 7M12 12C12 7 17 5 21 7"/><circle cx="12" cy="12" r="2"/>
            </svg>
          </div>
          <div>
            <div className="font-display font-bold text-[18px] tracking-tight" style={{ color: 'var(--bk)' }}>Fundares</div>
            <div className="font-mono text-[9.5px] tracking-[0.16em] uppercase" style={{ color: 'var(--ink3)' }}>Plataforma de reciclaje</div>
          </div>
        </div>

        {/* Links */}
        <div className="flex items-center gap-8">
          <a href="#que-hace" className="hidden md:block text-[13.5px] font-semibold transition-colors hover:text-[var(--green)]" style={{ color: 'var(--bt)' }}>Qué hace</a>
          <a href="#proceso"  className="hidden md:block text-[13.5px] font-semibold transition-colors hover:text-[var(--green)]" style={{ color: 'var(--bt)' }}>Proceso</a>
          <button
            onClick={toggleTheme}
            className="w-9 h-9 rounded-[8px] border grid place-items-center transition-colors hover:border-[var(--bdd)]"
            style={{ borderColor: 'var(--bd)', background: 'var(--card)', color: 'var(--bt)' }}
            aria-label="Toggle theme"
          >
            {theme === 'dark' ? (
              <svg viewBox="0 0 24 24" className="w-4 h-4 fill-none stroke-current stroke-2 [stroke-linecap:round] [stroke-linejoin:round]">
                <circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41"/>
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" className="w-4 h-4 fill-none stroke-current stroke-2 [stroke-linecap:round] [stroke-linejoin:round]">
                <path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z"/>
              </svg>
            )}
          </button>
          <Link href="/login" className="inline-flex items-center gap-2 font-bold text-[13.5px] px-4 py-2 rounded-[9px] transition-all hover:-translate-y-px group" style={{ background: 'var(--bk)', color: 'var(--bg)' }}>
            Iniciar sesión
            <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 stroke-current fill-none stroke-[2.4] [stroke-linecap:round] transition-transform group-hover:translate-x-1">
              <path d="M5 12h14M13 6l6 6-6 6"/>
            </svg>
          </Link>
        </div>
      </nav>

      {/* ── HERO ── */}
      <header className="hero-section relative pt-[150px] pb-[90px] px-10 overflow-hidden">
        {/* Organic blobs */}
        <div ref={leaf1Ref} className="absolute pointer-events-none z-[-1]" style={{ width: 560, height: 520, borderRadius: '46% 54% 58% 42% / 52% 44% 56% 48%', filter: 'blur(2px)', background: 'var(--gl)', right: -140, top: 40, opacity: 0.55 }} />
        <div className="absolute pointer-events-none z-[-1]" style={{ width: 300, height: 300, borderRadius: '50%', background: 'var(--clay-wash)', left: -120, bottom: -60, opacity: 0.45 }} />

        <div className="max-w-[1240px] mx-auto grid grid-cols-1 lg:grid-cols-2 gap-[60px] items-center">
          {/* Left copy */}
          <div>
            <motion.div initial={{ opacity: 0, y: 22 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.85, ease: EASE, delay: 0.05 }}
              className="inline-flex items-center gap-2.5 font-mono text-[11px] tracking-[0.18em] uppercase mb-7" style={{ color: 'var(--green)' }}>
              <span className="w-[18px] h-[1.5px] inline-block" style={{ background: 'currentColor' }} />
              Fundación para el Reciclaje · Bolivia
            </motion.div>

            <motion.h1 initial={{ opacity: 0, y: 22 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.85, ease: EASE, delay: 0.15 }}
              className="font-display font-black leading-[1.0] tracking-[-0.035em] mb-2"
              style={{ fontSize: 'clamp(42px,5vw,70px)', color: 'var(--bk)' }}>
              Cada kilo<br/>reciclado,<br/>
              <span className="font-medium italic" style={{ color: 'var(--green)' }}>con rigor.</span>
            </motion.h1>

            <motion.p initial={{ opacity: 0, y: 22 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.85, ease: EASE, delay: 0.28 }}
              className="text-[17.5px] leading-[1.7] max-w-[460px] mt-6 mb-9" style={{ color: 'var(--bt)' }}>
              Fundares convierte el mensaje desordenado del recolector — texto, foto o video — en datos validados, métricas de impacto y reportes certificados.
            </motion.p>

            <motion.div initial={{ opacity: 0, y: 22 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.85, ease: EASE, delay: 0.4 }}
              className="flex items-center gap-4 flex-wrap mb-11">
              <Link href="/login" className="inline-flex items-center gap-2 font-bold text-[15px] py-3.5 px-7 rounded-[9px] text-white transition-all hover:opacity-90 hover:-translate-y-px group shadow-green" style={{ background: 'var(--green)' }}>
                Acceder a la plataforma
                <svg viewBox="0 0 24 24" className="w-4 h-4 stroke-current fill-none stroke-[2.4] [stroke-linecap:round] transition-transform group-hover:translate-x-1"><path d="M5 12h14M13 6l6 6-6 6"/></svg>
              </Link>
              <a href="#proceso" className="inline-flex items-center gap-2 font-semibold text-[15px] py-3.5 px-6 rounded-[9px] border-[1.5px] transition-all hover:border-[var(--green)] hover:text-[var(--green)]" style={{ color: 'var(--bk)', borderColor: 'var(--bdd)' }}>
                Ver cómo funciona
              </a>
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 22 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.85, ease: EASE, delay: 0.5 }}
              className="flex items-center gap-5 flex-wrap text-[13px] font-semibold" style={{ color: 'var(--bt)' }}>
              {[
                { icon: <><circle cx="12" cy="12" r="10"/><path d="M8 12l2.5 2.5L16 9"/></>, label: 'Validación con IA' },
                { icon: <><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></>, label: 'Datos en tiempo real' },
                { icon: <path d="M12 2l8 4v6c0 5-3.5 8-8 10-4.5-2-8-5-8-10V6z"/>, label: 'Reportes certificados' },
              ].map((item, i) => (
                <React.Fragment key={item.label}>
                  {i > 0 && <div className="w-px h-4" style={{ background: 'var(--bdd)' }} />}
                  <div className="flex items-center gap-2">
                    <svg viewBox="0 0 24 24" className="w-4 h-4 fill-none stroke-[2.2] [stroke-linecap:round] [stroke-linejoin:round]" style={{ stroke: 'var(--green)' }}>{item.icon}</svg>
                    {item.label}
                  </div>
                </React.Fragment>
              ))}
            </motion.div>
          </div>

          {/* Right visual */}
          <div ref={visualRef} className="hidden lg:block relative">
            <motion.div initial={{ opacity: 0, y: 22 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.85, ease: EASE, delay: 0.35 }}>
              {/* Main panel */}
              <div className="relative rounded-[20px] p-7 shadow-[0_30px_70px_-24px_rgba(30,40,28,0.28)] border" style={{ background: 'var(--card)', borderColor: 'var(--bd)' }}>
                <div className="flex items-center justify-between mb-6">
                  <div className="font-bold text-[13px]" style={{ color: 'var(--bk)' }}>Impacto · {new Date().toLocaleString('es-BO', { month: 'long', year: 'numeric' })}</div>
                  <span className="inline-flex items-center gap-1.5 font-mono text-[11px] px-2.5 py-1 rounded-full" style={{ background: 'var(--gl)', color: 'var(--green)' }}>
                    <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: 'var(--gp)' }} />
                    en vivo
                  </span>
                </div>

                <div className="flex items-baseline gap-3 mb-1">
                  <span className="font-display font-black leading-none tracking-[-0.04em]" style={{ fontSize: 52, color: 'var(--bk)' }}>4.2</span>
                  <span className="text-[18px] font-bold" style={{ color: 'var(--ink3)' }}>toneladas recicladas</span>
                </div>
                <div className="font-mono text-[12.5px] mb-6" style={{ color: 'var(--ink3)' }}>+18% frente a febrero · 23 empresas activas</div>

                {/* Donut + legend */}
                <div className="flex items-center gap-6 py-5 border-t border-b" style={{ borderColor: 'var(--bd)' }}>
                  <svg className="-rotate-90 shrink-0" width="104" height="104" viewBox="0 0 36 36">
                    <circle cx="18" cy="18" r="15.5" fill="none" stroke="var(--alt)" strokeWidth="5"/>
                    <circle cx="18" cy="18" r="15.5" fill="none" stroke="var(--mat-plastico)" strokeWidth="5" strokeDasharray="38 100" strokeDashoffset="0"/>
                    <circle cx="18" cy="18" r="15.5" fill="none" stroke="var(--mat-papel)"    strokeWidth="5" strokeDasharray="26 100" strokeDashoffset="-38"/>
                    <circle cx="18" cy="18" r="15.5" fill="none" stroke="var(--mat-vidrio)"   strokeWidth="5" strokeDasharray="18 100" strokeDashoffset="-64"/>
                    <circle cx="18" cy="18" r="15.5" fill="none" stroke="var(--mat-metal)"    strokeWidth="5" strokeDasharray="18 100" strokeDashoffset="-82"/>
                  </svg>
                  <div className="flex flex-col gap-2.5 flex-1">
                    {[['var(--mat-plastico)', 'Plástico', '38%'], ['var(--mat-papel)', 'Papel', '26%'], ['var(--mat-vidrio)', 'Vidrio', '18%'], ['var(--mat-metal)', 'Metal', '18%']].map(([c, n, p]) => (
                      <div key={n} className="flex items-center gap-2.5 text-[12.5px]">
                        <span className="w-2.5 h-2.5 rounded-[3px] shrink-0" style={{ background: c }} />
                        <span className="flex-1 font-semibold" style={{ color: 'var(--bt)' }}>{n}</span>
                        <span className="font-mono font-semibold" style={{ color: 'var(--bk)' }}>{p}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Ledger */}
                <div className="mt-5">
                  <div className="font-mono text-[9.5px] tracking-[0.14em] uppercase mb-3" style={{ color: 'var(--ink3)' }}>Últimas recolecciones</div>
                  {[['var(--mat-vidrio)', 'PX', 'Industrias Plastex S.R.L.', '320 kg'], ['var(--slate)', 'AB', 'Empresa ABC', '85 kg'], ['var(--clay)', 'EC', 'EcoComm Santa Cruz', '210 kg']].map(([bg, av, nm, kg]) => (
                    <div key={nm} className="flex items-center gap-3 py-2.5 border-b border-dashed last:border-0" style={{ borderColor: 'var(--bd)' }}>
                      <div className="w-7 h-7 rounded-[8px] grid place-items-center font-display text-[10px] font-bold text-white shrink-0" style={{ background: bg }}>{av}</div>
                      <div className="flex-1 text-[12.5px] font-semibold" style={{ color: 'var(--bk)' }}>{nm}</div>
                      <div className="font-mono text-[12px] font-semibold" style={{ color: 'var(--green)' }}>{kg}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Floating chip */}
              <div ref={chipRef} className="absolute -left-7 -bottom-6 z-10 flex items-center gap-3 rounded-[14px] px-4 py-3.5 shadow-[0_30px_70px_-24px_rgba(30,40,28,0.55)]" style={{ background: 'var(--bk)' }}>
                <div className="w-[30px] h-[30px] rounded-[8px] grid place-items-center shrink-0" style={{ background: 'var(--green)' }}>
                  <svg viewBox="0 0 24 24" className="w-4 h-4 stroke-white fill-none stroke-[2.5] [stroke-linecap:round] [stroke-linejoin:round]"><path d="M5 12l5 5L20 7"/></svg>
                </div>
                <div>
                  <div className="font-mono text-[10px] tracking-[0.08em] uppercase" style={{ color: 'rgba(246,244,236,0.6)' }}>CO₂ evitado hoy</div>
                  <div className="font-bold text-[13px]" style={{ color: 'var(--bg)' }}>1.4 t · validado</div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </header>

      {/* ── MARQUEE ── */}
      <div className="border-t border-b overflow-hidden py-4" style={{ borderColor: 'var(--bd)', background: 'var(--card)' }}>
        <style>{`
          @keyframes lp-scroll { to { transform: translateX(-50%); } }
          .lp-marquee-track { display:flex; gap:44px; white-space:nowrap; width:max-content; animation:lp-scroll 28s linear infinite; }
        `}</style>
        <div className="lp-marquee-track">
          {[...MARQUEE_ITEMS, ...MARQUEE_ITEMS].map((item, i) => (
            <React.Fragment key={i}>
              <span className="inline-flex items-center gap-3 font-mono text-[12px] tracking-[0.08em] uppercase font-medium" style={{ color: 'var(--bt)' }}>
                <svg viewBox="0 0 24 24" className="w-[15px] h-[15px] fill-none stroke-[1.8] [stroke-linecap:round] shrink-0" style={{ stroke: 'var(--clay)' }}>
                  <path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/>
                </svg>
                {item}
              </span>
              <span className="w-1 h-1 rounded-full shrink-0 my-auto" style={{ background: 'var(--bdd)' }} />
            </React.Fragment>
          ))}
        </div>
      </div>

      {/* ── FEATURES ── */}
      <section className="max-w-[1240px] mx-auto px-10 py-[104px]" id="que-hace">
        {/* Intro */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-end mb-16">
          <div data-reveal>
            <div className="inline-flex items-center gap-2.5 font-mono text-[11px] tracking-[0.18em] uppercase mb-5" style={{ color: 'var(--green)' }}>
              <span className="w-[18px] h-[1.5px] inline-block" style={{ background: 'currentColor' }} />
              Qué hace Fundares
            </div>
            <h2 className="font-display font-black tracking-[-0.03em] leading-tight" style={{ fontSize: 'clamp(32px,3.6vw,50px)', color: 'var(--bk)' }}>
              Todo el ciclo del dato,<br/>en un solo lugar.
            </h2>
          </div>
          <p data-reveal data-delay="0.1" className="text-[16px] leading-[1.7]" style={{ color: 'var(--bt)' }}>
            Desde el mensaje del recolector hasta el reporte firmado. Sin hojas de cálculo, sin información perdida, sin doble carga.
          </p>
        </div>

        {/* List */}
        <div className="border-t" style={{ borderColor: 'var(--bdd)' }}>
          {FEATURES.map((feat) => (
            <div key={feat.n} data-reveal className="grid grid-cols-1 md:grid-cols-[64px_1fr_1.1fr] gap-8 py-10 border-b transition-all duration-300 hover:px-4 cursor-default" style={{ borderColor: 'var(--bd)' }}>
              <div className="font-mono text-[13px] pt-1.5" style={{ color: 'var(--clay)' }}>{feat.n}</div>
              <div>
                <h3 className="font-display font-bold text-[23px] tracking-[-0.02em] flex items-center gap-3" style={{ color: 'var(--bk)' }}>
                  <span className={`w-10 h-10 rounded-[11px] grid place-items-center shrink-0 ${feat.bg} ${feat.ic}`}>
                    <svg viewBox="0 0 24 24" className="w-5 h-5 fill-none stroke-current stroke-[1.9] [stroke-linecap:round] [stroke-linejoin:round]">{feat.path}</svg>
                  </span>
                  {feat.t}
                </h3>
              </div>
              <div>
                <p className="text-[14.5px] leading-[1.7] mb-3" style={{ color: 'var(--bt)' }}>{feat.d}</p>
                <span className="inline-flex items-center gap-2 font-mono text-[11px] px-2.5 py-1 rounded-[6px]" style={{ background: 'var(--slate-wash)', color: 'var(--slate)' }}>
                  <svg viewBox="0 0 24 24" className="w-3 h-3 fill-none stroke-current stroke-2 [stroke-linecap:round]"><path d="M4 17l6-6-6-6M12 19h8"/></svg>
                  {feat.api}
                </span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section id="proceso" className="relative overflow-hidden" style={{ background: 'var(--forest)' }}>
        {/* Blob */}
        <div className="absolute pointer-events-none" style={{ width: 440, height: 440, borderRadius: '50%', background: 'rgba(75,175,71,0.16)', right: -120, bottom: -160, filter: 'blur(20px)' }} />
        <div className="max-w-[1240px] mx-auto px-10 py-[104px] relative z-10">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-end mb-12">
            <div data-reveal>
              <div className="inline-flex items-center gap-2 font-mono text-[11px] tracking-[0.2em] uppercase mb-5" style={{ color: 'var(--gp)' }}>
                — Proceso
              </div>
              <h2 className="font-display font-black tracking-[-0.03em] leading-tight text-white" style={{ fontSize: 'clamp(32px,3.6vw,50px)' }}>
                De dato crudo a reporte,<br/>en minutos.
              </h2>
            </div>
            <p data-reveal data-delay="0.1" className="text-[16px] leading-[1.7]" style={{ color: 'rgba(231,239,226,0.72)' }}>
              Cuatro pasos que convierten información caótica de campo en datos estructurados, validados y certificados.
            </p>
          </div>

          <div className="steps-grid grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 border-t" style={{ borderColor: 'rgba(255,255,255,0.12)' }}>
            {[
              { n: '01', t: 'La empresa carga',  d: 'Texto, imagen o video del comprobante de recolección.',                        icon: <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/> },
              { n: '02', t: 'La IA extrae',       d: 'Empresa, fecha, materiales y cantidades, con nivel de confianza.',              icon: <><path d="M12 2a10 10 0 110 20 10 10 0 010-20z"/><path d="M12 8v4l3 3"/></> },
              { n: '03', t: 'Fundares valida',    d: 'Revisión y aprobación humana antes del registro oficial.',                     icon: <><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/></> },
              { n: '04', t: 'Reporte generado',   d: 'PDF certificado con impacto calculado, listo para compartir.', last: true,     icon: <><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><path d="M14 2v6h6"/></> },
            ].map((step, i) => (
              <div key={step.n} className="step-item relative p-9 px-7 border-r last:border-r-0 md:border-b lg:border-b-0" style={{ borderColor: 'rgba(255,255,255,0.1)', opacity: 0 }}>
                <div className="w-10 h-10 rounded-[11px] border grid place-items-center font-display font-bold text-sm mb-6" style={{ borderColor: 'rgba(75,175,71,0.5)', color: 'var(--gp)' }}>{step.n}</div>
                <svg viewBox="0 0 24 24" className="w-6 h-6 fill-none stroke-[1.6] [stroke-linecap:round] [stroke-linejoin:round] mb-4" style={{ stroke: 'rgba(231,239,226,0.55)' }}>{step.icon}</svg>
                <h4 className="font-display font-bold text-[17px] text-white mb-2 tracking-tight">{step.t}</h4>
                <p className="text-[13.5px] leading-[1.65]" style={{ color: 'rgba(231,239,226,0.62)' }}>{step.d}</p>
                {!step.last && (
                  <div className="hidden lg:grid absolute -right-2.5 top-12 w-5 h-5 rounded-full place-items-center z-10" style={{ background: 'var(--gp)' }}>
                    <svg viewBox="0 0 24 24" className="w-2.5 h-2.5 stroke-[var(--forest)] fill-none stroke-[3] [stroke-linecap:round]"><path d="M5 12h14M13 6l6 6-6 6"/></svg>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── STATS ── */}
      <div className="border-t border-b" style={{ background: 'var(--alt)', borderColor: 'var(--bd)' }}>
        <div className="max-w-[1240px] mx-auto px-10 py-16 grid grid-cols-2 lg:grid-cols-4 gap-8">
          {[
            { val: '42.6', u: 't',  label: 'reciclado acumulado' },
            { val: '23',   u: '',   label: 'empresas aliadas' },
            { val: '68',   u: 't',  label: 'CO₂ evitado' },
            { val: '640',  u: 'k',  label: 'litros de agua ahorrados' },
          ].map((s, i) => (
            <div key={s.label} data-reveal className={i < 3 ? 'border-r pr-8' : ''} style={{ borderColor: 'var(--bd)' }}>
              <div className="font-display font-black leading-none tracking-[-0.04em] mb-2" style={{ fontSize: 'clamp(38px,4.2vw,58px)', color: 'var(--bk)' }}>
                {s.val}<span style={{ color: 'var(--green)', fontSize: '0.5em' }}>{s.u}</span>
              </div>
              <div className="text-[13px] font-semibold" style={{ color: 'var(--bt)' }}>{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── CTA ── */}
      <section className="max-w-[1240px] mx-auto px-10 py-[104px]">
        <div data-reveal className="relative rounded-[28px] px-14 py-[72px] overflow-hidden" style={{ background: 'var(--forest)' }}>
          {/* Grain */}
          <div className="absolute inset-0 pointer-events-none opacity-40" style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='120'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.045'/%3E%3C/svg%3E\")", mixBlendMode: 'multiply' }} />
          {/* Leaf blob */}
          <div className="absolute pointer-events-none" style={{ width: 360, height: 360, borderRadius: '46% 54% 58% 42% / 52% 44% 56% 48%', background: 'rgba(75,175,71,0.18)', filter: 'blur(8px)', right: -80, top: '50%', transform: 'translateY(-50%)' }} />
          <div className="relative z-10 max-w-[560px]">
            <h2 className="font-display font-black leading-[1.05] tracking-[-0.03em] text-white mb-5" style={{ fontSize: 'clamp(30px,3.6vw,46px)' }}>
              ¿Tu empresa ya recicla?<br/>
              <span className="font-medium italic" style={{ color: 'var(--gp)' }}>Empezá a medirlo.</span>
            </h2>
            <p className="text-[16px] leading-[1.7] mb-8" style={{ color: 'rgba(231,239,226,0.74)' }}>
              Solicitá acceso a Fundares y convertí cada recolección en datos que generan impacto real y verificable.
            </p>
            <div className="flex items-center gap-4 flex-wrap">
              <Link href="/login" className="inline-flex items-center gap-2 font-bold text-[15px] py-3.5 px-7 rounded-[9px] transition-all hover:-translate-y-px group" style={{ background: 'var(--gp)', color: '#fff' }}>
                Solicitar acceso
                <svg viewBox="0 0 24 24" className="w-4 h-4 stroke-current fill-none stroke-[2.4] [stroke-linecap:round] transition-transform group-hover:translate-x-1"><path d="M5 12h14M13 6l6 6-6 6"/></svg>
              </Link>
              <a href="#que-hace" className="inline-flex items-center gap-2 font-semibold text-[15px] py-3.5 px-6 rounded-[9px] border-[1.5px] transition-all hover:border-white/60 text-white" style={{ borderColor: 'rgba(255,255,255,0.3)' }}>
                Ver el sistema
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="px-10 py-12" style={{ background: 'var(--bk)' }}>
        <div className="max-w-[1240px] mx-auto flex flex-col md:flex-row md:items-center justify-between gap-6 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-green-primary rounded-[7px] grid place-items-center">
              <svg viewBox="0 0 24 24" className="w-[18px] h-[18px] stroke-white fill-none stroke-2 [stroke-linecap:round] [stroke-linejoin:round]"><path d="M12 22V12M12 12C12 7 7 5 3 7M12 12C12 7 17 5 21 7"/><circle cx="12" cy="12" r="2"/></svg>
            </div>
            <div>
              <div className="font-display font-bold text-[15px]" style={{ color: 'var(--bg)' }}>Fundares</div>
              <div className="font-mono text-[9.5px] tracking-[0.16em] uppercase" style={{ color: 'rgba(246,244,236,0.4)' }}>Plataforma de reciclaje</div>
            </div>
          </div>
          <div className="font-mono text-[12px]" style={{ color: 'rgba(246,244,236,0.45)' }}>© {new Date().getFullYear()} Fundación para el Reciclaje · Santa Cruz, Bolivia</div>
          <div className="flex gap-6">
            {['Privacidad', 'Términos', 'Contacto'].map(l => (
              <a key={l} href="#" className="text-[12.5px] font-semibold transition-colors hover:text-[var(--gp)]" style={{ color: 'rgba(246,244,236,0.5)' }}>{l}</a>
            ))}
          </div>
        </div>
      </footer>
    </div>
  );
}
