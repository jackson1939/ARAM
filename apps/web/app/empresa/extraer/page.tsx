'use client';

import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import { ImagePlus, Video, Leaf, AlertCircle, FileText, X, Loader2 } from 'lucide-react';
import type { TabId, ExtractionResult } from './types';

// Mock Data
const MOCK_SUCCESS_HIGH: ExtractionResult = {
  confidence: "high",
  empresa: "Industrias Plastex S.R.L.",
  fecha: "15 de marzo de 2025",
  notas: "Entrega en planta central, turno mañana.",
  materiales: [
    { material: "PET Transparente", cantidad: 320, unidad: "kg" },
    { material: "HDPE Colorido", cantidad: 85, unidad: "kg" },
    { material: "Papel Kraft", cantidad: 210, unidad: "kg" },
  ]
};

const MOCK_SUCCESS_MEDIUM: ExtractionResult = {
  confidence: "medium",
  empresa: "Empresa ABC",
  fecha: "—",
  notas: null,
  materiales: [
    { material: "Vidrio", cantidad: 50, unidad: "kg" },
  ]
};

const MOCK_ERROR: ExtractionResult = {
  confidence: "low",
  reasons: [
    "No se identificó ninguna empresa o razón social",
    "La fecha del evento no está presente en el texto",
    "No se detectaron materiales ni cantidades recicladas",
  ]
};

const MOCKS = [MOCK_SUCCESS_HIGH, MOCK_SUCCESS_MEDIUM, MOCK_ERROR];

export default function ExtraerPage() {
  const [activeTab, setActiveTab] = useState<TabId>('texto');
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<ExtractionResult | null>(null);
  const [mockIndex, setMockIndex] = useState(0);

  const containerRef = useRef<HTMLDivElement>(null);
  const headerRef = useRef<HTMLDivElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const outputRef = useRef<HTMLDivElement>(null);

  // GSAP: Page mount animations
  useGSAP(() => {
    const tl = gsap.timeline();
    tl.fromTo(headerRef.current, { opacity: 0, y: -20 }, { opacity: 1, y: 0, duration: 0.6, ease: "power2.out" })
      .fromTo(cardRef.current, { opacity: 0, y: 30 }, { opacity: 1, y: 0, duration: 0.7, ease: "power2.out" }, "-=0.45")
      .fromTo(outputRef.current, { opacity: 0 }, { opacity: 1, duration: 0.5, ease: "power2.out" }, "-=0.35");
  }, { scope: containerRef });

  const handleSubmit = () => {
    setIsLoading(true);
    setResult(null);
    
    // GSAP: Button loading pulse
    gsap.to(".submit-btn", { opacity: 0.7, yoyo: true, repeat: -1, duration: 0.6, id: "loading" });

    setTimeout(() => {
      gsap.killTweensOf(".submit-btn");
      gsap.set(".submit-btn", { opacity: 1 });
      setResult(MOCKS[mockIndex]);
      setMockIndex((prev) => (prev + 1) % MOCKS.length);
      setIsLoading(false);
    }, 2000);
  };

  return (
    <div ref={containerRef} className="p-6 text-body-text">
      <div className="space-y-8 max-w-3xl">
        <div ref={headerRef}>
          <h1 className="text-black-heading text-3xl font-extrabold tracking-tight">Cargar recolección</h1>
          <p className="mt-2 text-sm">Registrá los materiales recolectados mediante texto, imagen o video.</p>
        </div>

        <div ref={cardRef} className="bg-card rounded-card shadow-card overflow-hidden">
          <TabSwitcher activeTab={activeTab} onChange={setActiveTab} />
          <div className="p-6 md:p-8">
            <AnimatePresence mode="wait">
              {activeTab === 'texto' && <TextoTab key="texto" onSubmit={handleSubmit} isLoading={isLoading} />}
              {activeTab === 'imagen' && <ImagenTab key="imagen" onSubmit={handleSubmit} isLoading={isLoading} />}
              {activeTab === 'video' && <VideoTab key="video" onSubmit={handleSubmit} isLoading={isLoading} />}
            </AnimatePresence>
          </div>
        </div>

        <div ref={outputRef}>
          <AnimatePresence mode="wait">
            {!result ? (
              <EmptyState key="empty" />
            ) : result.confidence === 'low' ? (
              <ErrorState key="error" result={result} />
            ) : (
              <SuccessState key="success" result={result} />
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}

// --- Componentes Internos ---

function TabSwitcher({ activeTab, onChange }: { activeTab: TabId; onChange: (tab: TabId) => void }) {
  const tabs: { id: TabId; label: string }[] = [
    { id: 'texto', label: 'Texto' },
    { id: 'imagen', label: 'Imagen' },
    { id: 'video', label: 'Video' },
  ];
  const containerRef = useRef<HTMLDivElement>(null);
  const indicatorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current || !indicatorRef.current) return;
    const activeEl = containerRef.current.querySelector(`[data-tab="${activeTab}"]`) as HTMLElement;
    if (activeEl) {
      // GSAP: Tab indicator slide
      gsap.to(indicatorRef.current, {
        left: activeEl.offsetLeft,
        width: activeEl.offsetWidth,
        duration: 0.3,
        ease: "power2.out",
      });
    }
  }, [activeTab]);

  return (
    <div className="relative flex border-b border-border-default" ref={containerRef} role="tablist">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          data-tab={tab.id}
          role="tab"
          aria-selected={activeTab === tab.id}
          onClick={() => onChange(tab.id)}
          className={`flex-1 py-4 text-sm transition-colors duration-200 outline-none focus-visible:bg-bg-page ${
            activeTab === tab.id ? 'text-green-primary font-bold' : 'text-body-text font-normal hover:text-black-heading'
          }`}
        >
          {tab.label}
        </button>
      ))}
      <div ref={indicatorRef} className="absolute bottom-0 h-0.5 bg-green-primary" style={{ left: 0, width: 0 }} />
    </div>
  );
}

const tabVariants = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.3, ease: "easeOut" as const } },
  exit: { opacity: 0, y: -8, transition: { duration: 0.2, ease: "easeIn" as const } },
};

function TextoTab({ onSubmit, isLoading }: { onSubmit: () => void; isLoading: boolean }) {
  const [text, setText] = useState('');
  const handleExtract = () => {
    // GSAP: Micro-bounce at action
    gsap.fromTo(".submit-btn", { scaleY: 0.95 }, { scaleY: 1, duration: 0.12, ease: "power1.out" });
    onSubmit();
  };

  return (
    <motion.div variants={tabVariants} initial="hidden" animate="visible" exit="exit" className="space-y-6">
      <motion.textarea
        rows={5}
        value={text}
        onChange={(e) => setText(e.target.value)}
        whileFocus={{ scale: 1.005 }}
        transition={{ type: "spring" as const, stiffness: 300, damping: 20 }}
        placeholder={`Pegá el mensaje del recolector…\nej: Empresa ABC entregó 50 kg de papel el 15/03`}
        className="w-full resize-y rounded-input border border-border-default p-4 text-[14px] text-black-heading placeholder:text-body-text focus:border-green-primary focus:outline-none focus:ring-1 focus:ring-green-primary transition-shadow"
      />
      <SubmitButton onClick={handleExtract} disabled={!text.trim() || isLoading} isLoading={isLoading} text="Extraer" loadingText="Extrayendo…" />
    </motion.div>
  );
}

const uploadVariants = {
  idle: { scale: 1, borderColor: "#E3E3E3", backgroundColor: "#EDF7ED" },
  hover: { scale: 1.02, borderColor: "#4BAF47", backgroundColor: "#EDF7ED" },
  dragging: { scale: 1.03, borderColor: "#4BAF47", backgroundColor: "#EDF7ED" },
};
const spring = { type: "spring" as const, stiffness: 280, damping: 22 };

function ImagenTab({ onSubmit, isLoading }: { onSubmit: () => void; isLoading: boolean }) {
  const [file, setFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleExtract = () => {
    gsap.fromTo(".submit-btn", { scaleY: 0.95 }, { scaleY: 1, duration: 0.12, ease: "power1.out" });
    onSubmit();
  };

  return (
    <motion.div variants={tabVariants} initial="hidden" animate="visible" exit="exit" className="space-y-6">
      {!file ? (
        <motion.div
          variants={uploadVariants}
          initial="idle"
          whileHover="hover"
          animate={isDragging ? "dragging" : "idle"}
          transition={spring}
          onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={(e) => { e.preventDefault(); setIsDragging(false); if (e.dataTransfer.files[0]) setFile(e.dataTransfer.files[0]); }}
          onClick={() => fileInputRef.current?.click()}
          className="border-2 border-dashed rounded-input py-12 px-6 flex flex-col items-center justify-center cursor-pointer text-center"
        >
          <ImagePlus className="text-green-primary w-10 h-10 mb-4" aria-hidden="true" />
          <p className="text-[14px] font-semibold text-body-text">Seleccioná una imagen JPG, PNG o WEBP</p>
          <p className="text-[12px] font-normal text-body-text mt-1">o arrastrá el archivo aquí</p>
          <input type="file" ref={fileInputRef} className="hidden" accept="image/jpeg,image/png,image/webp" onChange={(e) => e.target.files && setFile(e.target.files[0])} />
        </motion.div>
      ) : (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="relative rounded-card overflow-hidden h-48 bg-bg-page flex items-center justify-center">
          <img src={URL.createObjectURL(file)} alt="Preview" className="w-full h-full object-cover" />
          <div className="absolute inset-x-0 bottom-0 bg-black/60 p-3"><p className="text-white text-sm truncate">{file.name}</p></div>
          <button onClick={() => setFile(null)} className="absolute top-2 right-2 bg-black/50 hover:bg-black/70 text-white rounded-full p-1 transition-colors" aria-label="Remove image">
            <X size={16} />
          </button>
        </motion.div>
      )}
      <SubmitButton onClick={handleExtract} disabled={!file || isLoading} isLoading={isLoading} text="Extraer" loadingText="Subiendo y extrayendo…" />
    </motion.div>
  );
}

function VideoTab({ onSubmit, isLoading }: { onSubmit: () => void; isLoading: boolean }) {
  const [file, setFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleExtract = () => {
    gsap.fromTo(".submit-btn", { scaleY: 0.95 }, { scaleY: 1, duration: 0.12, ease: "power1.out" });
    onSubmit();
  };

  return (
    <motion.div variants={tabVariants} initial="hidden" animate="visible" exit="exit" className="space-y-6">
      {!file ? (
        <div className="space-y-3">
          <motion.div
            variants={uploadVariants}
            initial="idle"
            whileHover="hover"
            animate={isDragging ? "dragging" : "idle"}
            transition={spring}
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={(e) => { e.preventDefault(); setIsDragging(false); if (e.dataTransfer.files[0]) setFile(e.dataTransfer.files[0]); }}
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed rounded-input py-12 px-6 flex flex-col items-center justify-center cursor-pointer text-center"
          >
            <Video className="text-green-primary w-10 h-10 mb-4" aria-hidden="true" />
            <p className="text-[14px] font-semibold text-body-text">Seleccioná un video MP4, MOV, AVI o MKV</p>
            <p className="text-[12px] font-normal text-body-text mt-1">o arrastrá el archivo aquí</p>
            <input type="file" ref={fileInputRef} className="hidden" accept="video/mp4,video/quicktime,video/x-msvideo,video/x-matroska" onChange={(e) => e.target.files && setFile(e.target.files[0])} />
          </motion.div>
          <p className="text-[13px] text-body-text text-center">Máx. 2 minutos · Tamaño recomendado &lt; 100 MB</p>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-8 bg-bg-page rounded-input border border-border-default">
          <motion.div initial={{ opacity: 0, scale: 0.7, y: 8 }} animate={{ opacity: 1, scale: 1, y: 0 }} transition={spring} className="bg-green-light text-green-primary font-semibold rounded-full px-4 py-1.5 flex items-center space-x-2">
            <FileText size={16} />
            <span className="truncate max-w-[200px] text-sm">{file.name}</span>
            <button onClick={() => setFile(null)} className="ml-2 hover:opacity-70" aria-label="Remove video"><X size={14}/></button>
          </motion.div>
        </div>
      )}
      <SubmitButton onClick={handleExtract} disabled={!file || isLoading} isLoading={isLoading} text="Extraer" loadingText="Subiendo y extrayendo…" />
    </motion.div>
  );
}

function SubmitButton({ onClick, disabled, isLoading, text, loadingText }: { onClick: () => void; disabled: boolean; isLoading: boolean; text: string; loadingText: string }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`submit-btn w-full flex items-center justify-center rounded-card px-6 py-[14px] font-semibold text-white transition-all duration-300 ease-in-out ${
        disabled && !isLoading ? 'bg-green-primary opacity-45 cursor-not-allowed' : 'bg-green-primary hover:bg-[image:var(--gradient-brand)] cursor-pointer'
      }`}
    >
      {isLoading ? (<><Loader2 className="animate-spin mr-2" size={18} />{loadingText}</>) : text}
    </button>
  );
}

// --- Salida de Resultados ---

function EmptyState() {
  const leafRef = useRef<SVGSVGElement>(null);
  useGSAP(() => {
    // GSAP: Idle leaf float
    gsap.to(leafRef.current, { y: -6, repeat: -1, yoyo: true, duration: 2, ease: "sine.inOut" });
  });

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="border-2 border-dashed border-border-default bg-bg-page rounded-card py-12 px-6 text-center flex flex-col items-center">
      <Leaf ref={leafRef} className="text-green-primary w-12 h-12 mb-4" aria-hidden="true" />
      <p className="text-body-text text-[15px] font-normal">El resultado aparecerá aquí</p>
    </motion.div>
  );
}

function SuccessState({ result }: { result: ExtractionResult }) {
  const cardRef = useRef<HTMLDivElement>(null);
  const isHigh = result.confidence === 'high';
  const borderColor = isHigh ? 'border-green-primary' : 'border-warning-amber';
  
  useGSAP(() => {
    // GSAP: Result card mount & table row stagger
    gsap.fromTo(cardRef.current, { opacity: 0, x: -16 }, { opacity: 1, x: 0, duration: 0.5, ease: "power3.out" });
    gsap.fromTo(".table-row", { opacity: 0, y: 8 }, { opacity: 1, y: 0, stagger: 0.07, duration: 0.3, delay: 0.2 });
  }, [result]);

  return (
    <motion.div exit={{ opacity: 0, y: 10 }} ref={cardRef} className={`bg-card rounded-card shadow-card border-l-[3px] ${borderColor} overflow-hidden`} role="status" aria-live="polite">
      <div className="p-6 md:p-8 space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-black-heading font-bold text-[16px]">Resultado</h2>
          <motion.span 
            initial={{ opacity: 0, scale: 0.85 }} 
            animate={{ opacity: 1, scale: 1 }} 
            transition={{ ...spring, delay: 0.3 }}
            className={`font-semibold rounded-full px-3 py-1 text-xs ${isHigh ? 'bg-green-light text-green-primary' : 'bg-warning-light text-warning-amber'}`}
          >
            {isHigh ? 'Alta confianza' : 'Confianza media'}
          </motion.span>
        </div>

        <dl className="grid grid-cols-1 md:grid-cols-2 gap-y-4 gap-x-8">
          <div className="border-b border-border-default pb-3">
            <dt className="text-body-text font-semibold text-[13px] uppercase tracking-[0.05em] mb-1">Empresa</dt>
            <dd className="text-black-heading font-bold text-[14px]">{result.empresa || '—'}</dd>
          </div>
          <div className="border-b border-border-default pb-3">
            <dt className="text-body-text font-semibold text-[13px] uppercase tracking-[0.05em] mb-1">Fecha</dt>
            <dd className="text-black-heading font-bold text-[14px]">{result.fecha || '—'}</dd>
          </div>
          {result.notas && (
            <div className="md:col-span-2 border-b border-border-default pb-3">
              <dt className="text-body-text font-semibold text-[13px] uppercase tracking-[0.05em] mb-1">Notas</dt>
              <dd className="text-black-heading font-bold text-[14px]">{result.notas}</dd>
            </div>
          )}
        </dl>

        {result.materiales && result.materiales.length > 0 && (
          <div className="mt-6 rounded-input overflow-hidden border border-border-default">
            <div className="bg-bg-page grid grid-cols-3 px-4 py-[10px]">
              <div className="text-body-text font-semibold text-[12px] uppercase">Material</div>
              <div className="text-body-text font-semibold text-[12px] uppercase text-right">Cantidad</div>
              <div className="text-body-text font-semibold text-[12px] uppercase text-right">Unidad</div>
            </div>
            <div>
              {result.materiales.map((m, idx) => (
                <div key={idx} className={`table-row grid grid-cols-3 px-4 py-[10px] text-black-heading font-medium text-[14px] border-t border-border-default ${idx % 2 !== 0 ? 'bg-alt' : 'bg-card'}`}>
                  <div>{m.material}</div>
                  <div className="text-right">{m.cantidad}</div>
                  <div className="text-right">{m.unidad}</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
}

function ErrorState({ result }: { result: ExtractionResult }) {
  const cardRef = useRef<HTMLDivElement>(null);

  useGSAP(() => {
    // GSAP: Error shake
    gsap.fromTo(cardRef.current, { opacity: 0, x: -16 }, { opacity: 1, x: 0, duration: 0.4 });
    gsap.to(cardRef.current, { keyframes: { x: [0, -4, 4, -3, 3, 0] }, duration: 0.4, ease: "power1.inOut", delay: 0.1 });
  }, [result]);

  return (
    <motion.div exit={{ opacity: 0, y: 10 }} ref={cardRef} className="bg-card rounded-card border-l-[3px] border-error-red p-6 md:p-8" role="status" aria-live="polite">
      <h2 className="text-error-red font-bold text-[16px] mb-1">No se pudo extraer</h2>
      <p className="text-body-text font-normal text-[14px] mb-4">Revisá los siguientes puntos:</p>
      <ul className="space-y-2">
        {result.reasons?.map((reason, idx) => (
          <motion.li 
            key={idx}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.4 + idx * 0.06 }}
            className="flex items-start"
          >
            <AlertCircle className="text-error-red w-[14px] h-[14px] mt-0.5 mr-2 shrink-0" aria-hidden="true" />
            <span className="text-body-text text-[14px] leading-tight">{reason}</span>
          </motion.li>
        ))}
      </ul>
    </motion.div>
  );
}
