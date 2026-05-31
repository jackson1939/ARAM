'use client';

import React, { useRef, useEffect } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';

export default function LandingPage() {
  const containerRef = useRef<HTMLDivElement>(null);
  const tickerRef = useRef<HTMLDivElement>(null);

  useGSAP(() => {
    // Reveal animations
    const elements = gsap.utils.toArray('.anim-fade-up') as HTMLElement[];
    elements.forEach((el, index) => {
      gsap.to(el, {
        scrollTrigger: {
          trigger: el,
          start: 'top 85%',
        },
        opacity: 1,
        y: 0,
        duration: 0.7,
        ease: 'power3.out',
        delay: (index % 5) * 0.1
      });
    });

    // Ticker animation
    if (tickerRef.current) {
      gsap.to(tickerRef.current, {
        xPercent: -50,
        ease: 'none',
        duration: 20,
        repeat: -1,
      });
    }

    // Number counters
    const counters = gsap.utils.toArray('.count-up') as HTMLElement[];
    counters.forEach(counter => {
      const target = parseFloat(counter.getAttribute('data-target') || '0');
      const suffix = counter.getAttribute('data-suffix') || '';
      
      gsap.to(counter, {
        scrollTrigger: {
          trigger: counter,
          start: 'top 80%',
        },
        innerHTML: target,
        duration: 2,
        ease: 'power3.out',
        snap: { innerHTML: 0.1 },
        onUpdate: function() {
          counter.innerHTML = Number(this.targets()[0].innerHTML).toFixed(1) + suffix;
        }
      });
    });

    // Mini bars animation
    const bars = gsap.utils.toArray('.mini-bar-fill') as HTMLElement[];
    bars.forEach(bar => {
      const targetWidth = bar.getAttribute('data-width') || '100%';
      gsap.fromTo(bar, 
        { width: '0%' },
        {
          scrollTrigger: {
            trigger: bar,
            start: 'top 85%'
          },
          width: targetWidth,
          duration: 1.2,
          ease: 'power3.out'
        }
      );
    });

  }, { scope: containerRef });

  return (
    <div ref={containerRef} className="min-h-screen bg-bg-page font-sans text-body-text overflow-x-hidden selection:bg-green-primary/20">
      
      {/* NAV */}
      <nav className="fixed top-0 left-0 right-0 z-[100] flex items-center justify-between px-6 md:px-12 h-16 bg-bg-page/85 backdrop-blur-md border-b border-border-default/60">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 bg-green-primary rounded-lg flex items-center justify-center shrink-0">
            <svg viewBox="0 0 24 24" className="w-5 h-5 stroke-white fill-none stroke-2 [stroke-linecap:round] [stroke-linejoin:round]">
              <path d="M12 22V12M12 12C12 7 7 5 3 7M12 12C12 7 17 5 21 7"/><circle cx="12" cy="12" r="2"/>
            </svg>
          </div>
          <div>
            <div className="text-[17px] font-extrabold text-black-heading tracking-tight">Fundares</div>
            <div className="text-[11px] font-medium text-body-text tracking-[0.08em] uppercase">Plataforma de reciclaje</div>
          </div>
        </div>
        <Link 
          href="/login" 
          className="flex items-center gap-2 bg-black-heading text-white text-[13px] font-bold py-2.5 px-5 rounded-[5px] transition-all duration-300 hover:bg-green-primary hover:-translate-y-px group"
        >
          Iniciar sesión
          <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 stroke-current fill-none stroke-[2.5] [stroke-linecap:round] [stroke-linejoin:round] transition-transform duration-200 group-hover:translate-x-1">
            <path d="M5 12h14M13 6l6 6-6 6"/>
          </svg>
        </Link>
      </nav>

      {/* HERO */}
      <section className="relative min-h-screen grid grid-cols-1 lg:grid-cols-2 gap-0 pt-16">
        {/* Background Noise & Blobs */}
        <div className="absolute inset-0 pointer-events-none opacity-40 z-[1]" style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='0.03'/%3E%3C/svg%3E\")" }}></div>
        <div className="absolute right-[-10%] top-1/2 -translate-y-1/2 w-[55%] h-[85%] rounded-[40%_60%_55%_45%] bg-green-light opacity-70 z-0"></div>
        <div className="absolute left-[-5%] bottom-[-10%] w-[30%] h-[30%] rounded-full bg-green-primary/5 z-0"></div>

        {/* Hero Left */}
        <div className="flex flex-col justify-center px-8 md:px-16 py-20 relative z-10">
          <motion.div initial={{ opacity: 0, y: 32 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }} className="inline-flex items-center gap-2 bg-green-light border border-green-primary/30 text-green-primary text-[11px] font-bold tracking-[0.1em] uppercase py-1.5 px-3.5 rounded-full mb-7 w-fit">
            <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 stroke-current fill-none stroke-[2.5] [stroke-linecap:round] [stroke-linejoin:round]"><path d="M12 22C6.477 22 2 17.523 2 12S6.477 2 12 2s10 4.477 10 10-4.477 10-10 10z"/><path d="M8 12l2 2 4-4"/></svg>
            Plataforma de Sostenibilidad
          </motion.div>

          <motion.h1 initial={{ opacity: 0, y: 32 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, delay: 0.1, ease: [0.22, 1, 0.36, 1] }} className="text-[clamp(40px,4vw,62px)] font-black text-[#1A1D17] leading-[1.05] tracking-tight mb-6">
            Datos de reciclaje,<br/>
            <span className="block text-[#2F7D4F]">sin esfuerzo.</span>
          </motion.h1>

          <motion.p initial={{ opacity: 0, y: 32 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, delay: 0.2, ease: [0.22, 1, 0.36, 1] }} className="text-base leading-[1.75] text-body-text max-w-[440px] mb-10">
            Fundares centraliza la recolección de datos crudos de empresas aliadas. Registrá, validá y medí el impacto ambiental de tu organización — todo en un solo lugar.
          </motion.p>

          <motion.div initial={{ opacity: 0, y: 32 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, delay: 0.3, ease: [0.22, 1, 0.36, 1] }} className="flex items-center gap-4 flex-wrap mb-14">
            <Link href="/login" className="inline-flex items-center gap-2.5 bg-green-primary text-white text-sm font-bold py-4 px-7 rounded-[5px] shadow-[0_8px_32px_rgba(75,175,71,0.35)] transition-all duration-300 hover:bg-black-heading hover:shadow-[0_12px_40px_rgba(36,35,29,0.25)] hover:-translate-y-0.5 group">
              Acceder a la plataforma
              <svg viewBox="0 0 24 24" className="w-4 h-4 stroke-current fill-none stroke-[2.5] [stroke-linecap:round] [stroke-linejoin:round] transition-transform duration-200 group-hover:translate-x-1"><path d="M5 12h14M13 6l6 6-6 6"/></svg>
            </Link>
            <a href="#como-funciona" className="inline-flex items-center gap-2 bg-transparent text-black-heading text-sm font-semibold py-4 px-6 rounded-[5px] border-[1.5px] border-border-default transition-all duration-200 hover:border-green-primary hover:text-green-primary hover:bg-green-light">
              Ver cómo funciona
            </a>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 32 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, delay: 0.4, ease: [0.22, 1, 0.36, 1] }} className="flex items-center gap-5">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-body-text">
              <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 stroke-green-primary fill-none stroke-[2.5] [stroke-linecap:round] [stroke-linejoin:round]"><path d="M12 22C6.477 22 2 17.523 2 12S6.477 2 12 2s10 4.477 10 10-4.477 10-10 10z"/><path d="M8 12l2 2 4-4"/></svg> Validación IA
            </div>
            <div className="w-px h-4 bg-border-default"></div>
            <div className="flex items-center gap-1.5 text-xs font-semibold text-body-text">
              <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 stroke-green-primary fill-none stroke-[2.5] [stroke-linecap:round] [stroke-linejoin:round]"><path d="M12 22C6.477 22 2 17.523 2 12S6.477 2 12 2s10 4.477 10 10-4.477 10-10 10z"/><path d="M8 12l2 2 4-4"/></svg> Datos en tiempo real
            </div>
            <div className="w-px h-4 bg-border-default"></div>
            <div className="flex items-center gap-1.5 text-xs font-semibold text-body-text">
              <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 stroke-green-primary fill-none stroke-[2.5] [stroke-linecap:round] [stroke-linejoin:round]"><path d="M12 22C6.477 22 2 17.523 2 12S6.477 2 12 2s10 4.477 10 10-4.477 10-10 10z"/><path d="M8 12l2 2 4-4"/></svg> Bolivia & LATAM
            </div>
          </motion.div>
        </div>

        {/* Hero Right Visuals */}
        <div className="hidden lg:flex items-center justify-center p-20 relative z-10">
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 1, delay: 0.2, ease: [0.22, 1, 0.36, 1] }} className="relative w-full max-w-[380px]">
            
            {/* Float 1 */}
            <motion.div animate={{ y: [0, -10, 0], rotate: [2, 2, 2] }} transition={{ repeat: Infinity, duration: 4, ease: "easeInOut" }} className="absolute -top-7 -right-6 z-20 bg-white rounded-xl shadow-[0_16px_48px_rgba(0,0,0,0.12)] p-3.5 px-4 min-w-[140px]">
              <div className="text-[10px] font-bold text-body-text tracking-[0.06em] uppercase mb-1.5">CO₂ evitado hoy</div>
              <div className="text-[22px] font-black text-green-primary tracking-tight leading-none count-up" data-target="1.4" data-suffix="t">0.0t</div>
              <div className="text-[10px] font-semibold text-body-text mt-0.5">+12% vs. ayer</div>
            </motion.div>

            {/* Main Card */}
            <div className="bg-white rounded-2xl shadow-card p-7 relative z-10">
              <div className="flex items-center justify-between mb-5">
                <div className="text-[13px] font-bold text-black-heading tracking-tight">Resumen del mes</div>
                <div className="flex items-center gap-1.5 bg-green-light text-green-primary text-[11px] font-bold py-1 px-2.5 rounded-full">
                  <motion.div animate={{ opacity: [1, 0.5, 1], scale: [1, 0.8, 1] }} transition={{ repeat: Infinity, duration: 1.5, ease: "easeInOut" }} className="w-1.5 h-1.5 rounded-full bg-green-primary"></motion.div>
                  En vivo
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 mb-4">
                <div className="bg-bg-page rounded-lg p-4">
                  <div className="text-[26px] font-black text-black-heading tracking-tight leading-none count-up" data-target="4.2" data-suffix="t">0.0t</div>
                  <div className="text-[11px] font-semibold text-body-text mt-1 tracking-wide">Material total</div>
                  <div className="text-[10px] font-bold text-green-primary mt-1.5 flex items-center gap-1">
                    <svg viewBox="0 0 24 24" className="w-2.5 h-2.5 stroke-current fill-none stroke-[2.5] [stroke-linecap:round] [stroke-linejoin:round]"><path d="M12 19V5M5 12l7-7 7 7"/></svg>
                    +18% este mes
                  </div>
                </div>
                <div className="bg-bg-page rounded-lg p-4">
                  <div className="text-[26px] font-black text-black-heading tracking-tight leading-none count-up" data-target="23" data-suffix="">0</div>
                  <div className="text-[11px] font-semibold text-body-text mt-1 tracking-wide">Empresas activas</div>
                  <div className="text-[10px] font-bold text-green-primary mt-1.5 flex items-center gap-1">
                    <svg viewBox="0 0 24 24" className="w-2.5 h-2.5 stroke-current fill-none stroke-[2.5] [stroke-linecap:round] [stroke-linejoin:round]"><path d="M12 19V5M5 12l7-7 7 7"/></svg>
                    3 nuevas
                  </div>
                </div>
              </div>

              <div className="mb-1">
                <div className="text-[11px] font-bold text-body-text uppercase tracking-[0.06em] mb-3">Por material</div>
                
                {[{l: 'Plástico', w: '72%', c: 'bg-green-primary', v: '72%'}, {l: 'Papel', w: '48%', c: 'bg-[#066AAB]', v: '48%'}, {l: 'Vidrio', w: '31%', c: 'bg-warning-amber', v: '31%'}, {l: 'Metal', w: '19%', c: 'bg-[#878680]', v: '19%'}].map((bar, i) => (
                  <div key={i} className="flex items-center gap-2.5 mb-2.5">
                    <div className="text-[11px] font-semibold text-body-text w-[60px] shrink-0">{bar.l}</div>
                    <div className="flex-1 h-2 bg-bg-page rounded-full overflow-hidden">
                      <div className={`mini-bar-fill h-full rounded-full ${bar.c}`} data-width={bar.w} style={{ width: '0%' }}></div>
                    </div>
                    <div className="text-[11px] font-bold text-black-heading w-9 text-right shrink-0">{bar.v}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Float 2 */}
            <motion.div animate={{ y: [0, -8, 0], rotate: [-1.5, -1.5, -1.5] }} transition={{ repeat: Infinity, duration: 5, ease: "easeInOut" }} className="absolute -bottom-6 -left-5 z-20 bg-[#1A1D17] rounded-xl shadow-[0_16px_48px_rgba(0,0,0,0.2)] p-3.5 px-4">
              <div className="text-[10px] font-bold text-white/50 tracking-[0.06em] uppercase mb-2">Últimas recolecciones</div>
              <div className="flex flex-col gap-1.5">
                {[
                  {a: 'PX', n: 'Plastex S.R.L.', k: '320 kg', c: '#4BAF47'},
                  {a: 'AB', n: 'Empresa ABC', k: '85 kg', c: '#066AAB'},
                  {a: 'EC', n: 'EcoComm', k: '210 kg', c: '#F57F17'},
                ].map((co, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <div className="w-5 h-5 rounded-md flex items-center justify-center text-[9px] font-black text-white shrink-0" style={{ background: co.c }}>{co.a}</div>
                    <div className="text-[11px] font-semibold text-white/85 flex-1 min-w-[90px]">{co.n}</div>
                    <div className="text-[11px] font-bold text-green-primary">{co.k}</div>
                  </div>
                ))}
              </div>
            </motion.div>

          </motion.div>
        </div>
      </section>

      {/* TICKER DIVIDER */}
      <div className="w-full py-5 px-12 border-y border-border-default bg-[#F6F4EC] overflow-hidden">
        <div ref={tickerRef} className="flex items-center gap-10 whitespace-nowrap w-fit">
          {[1,2].map((group) => (
            <React.Fragment key={group}>
              <div className="flex items-center gap-2.5 text-xs font-bold text-body-text tracking-[0.06em] uppercase shrink-0"><svg viewBox="0 0 24 24" className="w-3.5 h-3.5 stroke-green-primary fill-none stroke-2 [stroke-linecap:round] [stroke-linejoin:round] shrink-0"><path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z"/></svg>Extracción con IA</div>
              <div className="w-1 h-1 rounded-full bg-border-default shrink-0"></div>
              <div className="flex items-center gap-2.5 text-xs font-bold text-body-text tracking-[0.06em] uppercase shrink-0"><svg viewBox="0 0 24 24" className="w-3.5 h-3.5 stroke-green-primary fill-none stroke-2 [stroke-linecap:round] [stroke-linejoin:round] shrink-0"><path d="M3 3h18v18H3z"/><path d="M3 9h18M9 21V9"/></svg>Datos estructurados</div>
              <div className="w-1 h-1 rounded-full bg-border-default shrink-0"></div>
              <div className="flex items-center gap-2.5 text-xs font-bold text-body-text tracking-[0.06em] uppercase shrink-0"><svg viewBox="0 0 24 24" className="w-3.5 h-3.5 stroke-green-primary fill-none stroke-2 [stroke-linecap:round] [stroke-linejoin:round] shrink-0"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/></svg>Múltiples formatos</div>
              <div className="w-1 h-1 rounded-full bg-border-default shrink-0"></div>
              <div className="flex items-center gap-2.5 text-xs font-bold text-body-text tracking-[0.06em] uppercase shrink-0"><svg viewBox="0 0 24 24" className="w-3.5 h-3.5 stroke-green-primary fill-none stroke-2 [stroke-linecap:round] [stroke-linejoin:round] shrink-0"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>Tiempo real</div>
              <div className="w-1 h-1 rounded-full bg-border-default shrink-0"></div>
              <div className="flex items-center gap-2.5 text-xs font-bold text-body-text tracking-[0.06em] uppercase shrink-0"><svg viewBox="0 0 24 24" className="w-3.5 h-3.5 stroke-green-primary fill-none stroke-2 [stroke-linecap:round] [stroke-linejoin:round] shrink-0"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/></svg>Validación automática</div>
              <div className="w-1 h-1 rounded-full bg-border-default shrink-0"></div>
              <div className="flex items-center gap-2.5 text-xs font-bold text-body-text tracking-[0.06em] uppercase shrink-0"><svg viewBox="0 0 24 24" className="w-3.5 h-3.5 stroke-green-primary fill-none stroke-2 [stroke-linecap:round] [stroke-linejoin:round] shrink-0"><path d="M22 11.08V12a10 10 0 11-5.93-9.14"/></svg>Impacto medible</div>
              <div className="w-1 h-1 rounded-full bg-border-default shrink-0"></div>
            </React.Fragment>
          ))}
        </div>
      </div>

      {/* FEATURES */}
      <section className="py-24 px-6 md:px-12 max-w-7xl mx-auto">
        <div className="anim-fade-up opacity-0 translate-y-8 flex items-center gap-3 mb-4">
          <div className="w-8 h-[2px] bg-green-primary rounded-full"></div>
          <div className="text-[11px] font-bold text-green-primary tracking-[0.1em] uppercase">Qué hace Fundares</div>
        </div>
        <h2 className="anim-fade-up opacity-0 translate-y-8 text-[clamp(28px,3vw,44px)] font-black text-black-heading tracking-tight leading-[1.1] mb-4">
          Una plataforma.<br/>Todo el ciclo de datos.
        </h2>
        <p className="anim-fade-up opacity-0 translate-y-8 text-[15px] text-body-text leading-[1.7] max-w-[480px] mb-16">
          Desde el mensaje del recolector hasta el reporte certificado — sin hojas de cálculo, sin pérdida de información.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            { n: '01', i: <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/>, bg: 'bg-green-light', c: 'stroke-green-primary', t: 'Extracción inteligente', d: 'Pegá texto, subí una foto o un video del comprobante. La IA extrae empresa, fecha, materiales y cantidades automáticamente.' },
            { n: '02', i: <path d="M18 20V10M12 20V4M6 20v-6"/>, bg: 'bg-[#EBF4FF]', c: 'stroke-[#066AAB]', t: 'Métricas de impacto', d: 'Visualizá en tiempo real los kilogramos reciclados, CO₂ evitado y litros de agua ahorrados por empresa y período.' },
            { n: '03', i: <><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/></>, bg: 'bg-warning-light', c: 'stroke-warning-amber', t: 'Gestión de empresas', d: 'Administrá todas las organizaciones aliadas, sus usuarios y niveles de acceso desde un panel centralizado.' },
            { n: '04', i: <><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/></>, bg: 'bg-[#FFF0F0]', c: 'stroke-[#E53E3E]', t: 'Flujo de validación', d: 'Cada recolección pasa por un proceso de aprobación configurable antes de sumarse a los reportes oficiales.' },
            { n: '05', i: <><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M9 21V9"/></>, bg: 'bg-green-light', c: 'stroke-green-primary', t: 'Reportes certificados', d: 'Generá reportes en PDF con firma digital para presentar ante autoridades, clientes y auditorías de sostenibilidad.' },
            { n: '06', i: <><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></>, bg: 'bg-[#EBF4FF]', c: 'stroke-[#066AAB]', t: 'Historial completo', d: 'Accedé al historial completo de recolecciones con filtros por empresa, fecha, material y estado de validación.' }
          ].map((feat, i) => (
            <div key={i} className="anim-fade-up opacity-0 translate-y-8 bg-[#FFFFFF] border border-[#E2DFD1] rounded-[14px] p-8 shadow-[0_2px_8px_rgba(40,38,28,0.06)] transition-all duration-300 hover:-translate-y-1.5 hover:shadow-[0_40px_80px_rgba(0,0,0,0.12)] hover:border-[#4BAF47]/30 relative overflow-hidden group cursor-default">
              <div className="absolute inset-0 bg-gradient-to-br from-green-light to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100"></div>
              <div className="absolute right-6 top-6 text-5xl font-black text-green-primary/5 tracking-[-0.05em]">{feat.n}</div>
              <div className={`w-12 h-12 rounded-[10px] flex items-center justify-center mb-6 relative z-10 ${feat.bg}`}>
                <svg viewBox="0 0 24 24" className={`w-5.5 h-5.5 fill-none stroke-2 [stroke-linecap:round] [stroke-linejoin:round] ${feat.c}`}>{feat.i}</svg>
              </div>
              <h3 className="text-[17px] font-extrabold text-black-heading mb-2.5 tracking-[-0.02em] relative z-10">{feat.t}</h3>
              <p className="text-sm leading-[1.75] text-body-text relative z-10">{feat.d}</p>
            </div>
          ))}
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section id="como-funciona" className="bg-[#1A1D17] py-24 px-6 md:px-12 relative overflow-hidden">
        <div className="absolute -bottom-16 -right-16 w-[300px] h-[300px] rounded-full bg-green-primary/10"></div>
        <div className="max-w-7xl mx-auto">
          <div className="anim-fade-up opacity-0 translate-y-8 flex items-center gap-3 mb-4">
            <div className="w-8 h-[2px] bg-green-primary rounded-full"></div>
            <div className="text-[11px] font-bold text-green-primary/80 tracking-[0.1em] uppercase">Proceso</div>
          </div>
          <h2 className="anim-fade-up opacity-0 translate-y-8 text-[clamp(28px,3vw,44px)] font-black text-white tracking-tight leading-[1.1] mb-4">
            De dato crudo<br/>a reporte en minutos.
          </h2>
          <p className="anim-fade-up opacity-0 translate-y-8 text-[15px] text-[#A8A9A0] leading-[1.7] max-w-[400px]">
            Cuatro pasos simples que convierten información caótica en datos estructurados y certificados.
          </p>

          <div className="anim-fade-up opacity-0 translate-y-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-px bg-white/10 rounded-[5px] overflow-hidden mt-16">
            {[
              { n: '01', i: <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/>, t: 'La empresa carga', d: 'Texto, imagen o video del comprobante de recolección.' },
              { n: '02', i: <><path d="M12 2a10 10 0 110 20 10 10 0 010-20z"/><path d="M12 8v4l3 3"/></>, t: 'La IA extrae', d: 'Datos estructurados: empresa, fecha, materiales y cantidades.' },
              { n: '03', i: <><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/></>, t: 'Fundares valida', d: 'Revisión y aprobación antes de registrarlo oficialmente.' },
              { n: '04', i: <><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><path d="M14 2v6h6M16 13H8M16 17H8M10 9H8"/></>, t: 'Reporte generado', d: 'PDF certificado con impacto calculado listo para compartir.', noArrow: true }
            ].map((step, i) => (
              <div key={i} className="bg-[#1A1D17] p-9 px-7 relative">
                <div className="w-10 h-10 rounded-[10px] border border-green-primary/40 flex items-center justify-center text-sm font-black text-green-primary mb-6">{step.n}</div>
                <div className="mb-4">
                  <svg viewBox="0 0 24 24" className="w-6 h-6 stroke-white/40 fill-none stroke-[1.5] [stroke-linecap:round] [stroke-linejoin:round]">{step.i}</svg>
                </div>
                <h3 className="text-[15px] font-extrabold text-white mb-2 tracking-[-0.01em]">{step.t}</h3>
                <p className="text-[13px] leading-[1.7] text-[#A8A9A0]">{step.d}</p>
                {!step.noArrow && (
                  <div className="hidden lg:flex absolute -right-3 top-1/2 -translate-y-1/2 w-6 h-6 bg-green-primary rounded-full items-center justify-center z-10">
                    <svg viewBox="0 0 24 24" className="w-2.5 h-2.5 stroke-white fill-none stroke-[3] [stroke-linecap:round] [stroke-linejoin:round]"><path d="M5 12h14M13 6l6 6-6 6"/></svg>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 px-6 md:px-12 flex items-center justify-center">
        <div className="anim-fade-up opacity-0 translate-y-8 w-full max-w-[720px] bg-green-primary rounded-2xl p-16 text-center relative overflow-hidden shadow-[0_40px_80px_rgba(75,175,71,0.25)]">
          <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent"></div>
          <div className="absolute -bottom-10 -right-10 w-[200px] h-[200px] rounded-full bg-black-heading/15"></div>
          
          <h2 className="text-4xl font-black text-white tracking-[-0.03em] leading-[1.1] mb-4 relative z-10">¿Tu empresa ya recicla?<br/>Empezá a medirlo.</h2>
          <p className="text-[15px] text-white/80 leading-[1.7] mb-9 relative z-10">Solicitá acceso a Fundares y convertí cada recolección en datos que generan impacto real.</p>
          <Link href="/login" className="inline-flex items-center gap-2.5 bg-black-heading text-white font-sans text-[15px] font-bold py-4 px-9 rounded-[5px] shadow-[0_12px_32px_rgba(0,0,0,0.3)] transition-all duration-300 hover:bg-white hover:text-black-heading hover:-translate-y-0.5 relative z-10">
            Solicitar acceso
            <svg viewBox="0 0 24 24" className="w-4 h-4 stroke-current fill-none stroke-[2.5] [stroke-linecap:round] [stroke-linejoin:round]"><path d="M5 12h14M13 6l6 6-6 6"/></svg>
          </Link>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="bg-[#1A1D17] border-t border-white/5 py-12 px-6 md:px-12">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-green-primary rounded-[7px] flex items-center justify-center">
              <svg viewBox="0 0 24 24" className="w-[18px] h-[18px] stroke-white fill-none stroke-2 [stroke-linecap:round] [stroke-linejoin:round]"><path d="M12 22V12M12 12C12 7 7 5 3 7M12 12C12 7 17 5 21 7"/><circle cx="12" cy="12" r="2"/></svg>
            </div>
            <div className="text-[15px] font-extrabold text-white">Fundares</div>
          </div>
          <div className="text-xs font-medium text-[#878680]/60">© {new Date().getFullYear()} Fundación Amigos de la Naturaleza. Todos los derechos reservados.</div>
          <div className="flex gap-6">
            <a href="#" className="text-xs font-semibold text-[#878680]/60 tracking-[0.02em] transition-colors duration-200 hover:text-green-primary">Privacidad</a>
            <a href="#" className="text-xs font-semibold text-[#878680]/60 tracking-[0.02em] transition-colors duration-200 hover:text-green-primary">Términos</a>
            <a href="#" className="text-xs font-semibold text-[#878680]/60 tracking-[0.02em] transition-colors duration-200 hover:text-green-primary">Contacto</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
