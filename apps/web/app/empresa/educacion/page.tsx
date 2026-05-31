'use client';

import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import {
  LayoutDashboard, CheckSquare, Building2, BarChart3,
  Activity, Plus, BookOpen, Video, Image as ImageIcon,
  ChevronRight, PlayCircle,
} from 'lucide-react';
import { useState, useEffect } from 'react';

interface TutorialCard {
  tourId:   string;
  href:     string;
  title:    string;
  desc:     string;
  steps:    number;
  duration: string;
  icon:     React.ReactNode;
  roles:    ('admin' | 'empresa')[];
  color:    string;
}

const TUTORIALS: TutorialCard[] = [
  { tourId: 'nueva-recoleccion-admin',  href: '/admin/dashboard',   title: 'Crear una recolección',   desc: 'Registrá materiales usando el formulario de extracción IA desde el header.',                                          steps: 2, duration: '1 min', icon: <Plus className="w-5 h-5"/>,          roles: ['admin'],           color: '#4BAF47' },
  { tourId: 'nueva-recoleccion-empresa',href: '/empresa/dashboard',  title: 'Crear una recolección',   desc: 'Registrá recolecciones con texto, foto o video. La IA extrae los datos automáticamente.',                          steps: 2, duration: '1 min', icon: <Plus className="w-5 h-5"/>,          roles: ['empresa'],         color: '#4BAF47' },
  { tourId: 'admin-dashboard',          href: '/admin/dashboard',   title: 'Panel de control',        desc: 'Explorá las métricas globales, canales de entrada e impacto ambiental del sistema.',                               steps: 5, duration: '2 min', icon: <LayoutDashboard className="w-5 h-5"/>,roles: ['admin'],           color: '#066AAB' },
  { tourId: 'empresa-dashboard',        href: '/empresa/dashboard',  title: 'Mi impacto ambiental',    desc: 'Conocé tus métricas: CO₂ evitado, agua ahorrada y árboles equivalentes.',                                         steps: 4, duration: '2 min', icon: <LayoutDashboard className="w-5 h-5"/>,roles: ['empresa'],         color: '#066AAB' },
  { tourId: 'admin-validacion',         href: '/admin/validacion',  title: 'Validar extracciones',    desc: 'Aprobá o rechazá extracciones pendientes desde el calendario mensual.',                                            steps: 4, duration: '2 min', icon: <CheckSquare className="w-5 h-5"/>,    roles: ['admin'],           color: '#F57F17' },
  { tourId: 'admin-empresas',           href: '/admin/empresas',    title: 'Gestionar empresas',      desc: 'Creá empresas aliadas y generá credenciales de acceso para sus usuarios.',                                         steps: 4, duration: '2 min', icon: <Building2 className="w-5 h-5"/>,      roles: ['admin'],           color: '#7B3FC4' },
  { tourId: 'admin-reportes',           href: '/admin/reportes',    title: 'Generar reportes',        desc: 'Filtrá por período y empresa, previsualizá datos y descargá PDFs.',                                               steps: 5, duration: '2 min', icon: <BarChart3 className="w-5 h-5"/>,      roles: ['admin'],           color: '#0088CC' },
  { tourId: 'empresa-reportes',         href: '/empresa/reportes',  title: 'Mis reportes',            desc: 'Filtrá por año, mes o rango personalizado y descargá tu reporte de impacto en PDF.',                              steps: 3, duration: '1 min', icon: <BarChart3 className="w-5 h-5"/>,      roles: ['empresa'],         color: '#0088CC' },
  { tourId: 'admin-monitoreo',          href: '/admin/monitoreo',   title: 'Monitorear canales',      desc: 'Revisá la actividad de Telegram, WhatsApp y Web en tiempo real.',                                                  steps: 3, duration: '1 min', icon: <Activity className="w-5 h-5"/>,       roles: ['admin'],           color: '#D32F2F' },
];

interface ContenidoItem { id: string; titulo: string; tipo: string; url: string | null; tags: string[] | null; }

export default function EducacionPage() {
  const router = useRouter();
  const { data: session } = useSession();
  const rol = (session?.user?.rol ?? 'empresa') as 'admin' | 'empresa';

  const [contenido, setContenido] = useState<ContenidoItem[]>([]);
  const [activeRole, setActiveRole] = useState<'admin' | 'empresa'>(rol);

  useEffect(() => { setActiveRole(rol); }, [rol]);

  useEffect(() => {
    fetch('/api/educacion').then(r => r.json()).then((j: { data: ContenidoItem[] }) => setContenido(j.data ?? [])).catch(() => {});
  }, []);

  const myTutorials = TUTORIALS.filter(t => t.roles.includes(activeRole));
  const iconoTipo: Record<string, React.ReactNode> = { articulo: <BookOpen className="w-4 h-4 text-[#4BAF47]"/>, video: <Video className="w-4 h-4 text-[#4BAF47]"/>, infografia: <ImageIcon className="w-4 h-4 text-[#4BAF47]"/> };

  return (
    <div className="p-6 h-[calc(100vh-56px)] overflow-y-auto space-y-8">
      <div>
        <h1 className="text-2xl font-extrabold text-black-heading tracking-tight">Educación</h1>
        <p className="text-sm text-body-text mt-1">Guías interactivas para aprender a usar el sistema.</p>
      </div>

      {rol === 'admin' && (
        <div className="flex rounded-[10px] bg-bg-page p-1 gap-1 w-fit border border-border-default">
          {(['admin', 'empresa'] as const).map(r => (
            <button key={r} onClick={() => setActiveRole(r)}
              className={['px-4 py-1.5 text-[13px] font-bold rounded-[7px] transition-colors capitalize', activeRole === r ? 'bg-card text-black-heading shadow-sm' : 'text-body-text hover:text-black-heading'].join(' ')}>
              Vista {r}
            </button>
          ))}
        </div>
      )}

      <section>
        <div className="flex items-center gap-2 mb-4">
          <PlayCircle className="w-5 h-5 text-[#4BAF47]"/>
          <h2 className="font-extrabold text-[16px] text-black-heading">Guías interactivas</h2>
          <span className="text-[11px] font-bold text-body-text bg-bg-page border border-border-default px-2 py-0.5 rounded-full ml-1">{myTutorials.length} guías</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {myTutorials.map(card => (
            <div key={card.tourId} className="bg-card border border-border-default rounded-[12px] p-5 flex flex-col gap-3 hover:shadow-card hover:-translate-y-0.5 transition-all duration-200 group">
              <div className="flex items-start justify-between">
                <div className="w-10 h-10 rounded-[9px] grid place-items-center flex-shrink-0" style={{ background: card.color + '18', color: card.color }}>{card.icon}</div>
                <div className="text-right">
                  <span className="text-[11px] font-bold text-body-text">{card.steps} pasos</span>
                  <span className="text-[11px] text-body-text mx-1">·</span>
                  <span className="text-[11px] font-bold text-body-text">{card.duration}</span>
                </div>
              </div>
              <div className="flex-1">
                <h3 className="font-extrabold text-[14px] text-black-heading mb-1">{card.title}</h3>
                <p className="text-[13px] text-body-text leading-relaxed">{card.desc}</p>
              </div>
              <button onClick={() => router.push(`${card.href}?tour=${card.tourId}`)}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-[9px] text-[13px] font-bold transition-colors border"
                style={{ background: card.color + '12', color: card.color, borderColor: card.color + '30' }}>
                <PlayCircle className="w-4 h-4"/>
                Iniciar tour
                <ChevronRight className="w-3.5 h-3.5 opacity-70 group-hover:translate-x-0.5 transition-transform"/>
              </button>
            </div>
          ))}
        </div>
      </section>

      {contenido.length > 0 && (
        <section>
          <div className="flex items-center gap-2 mb-4">
            <BookOpen className="w-5 h-5 text-[#4BAF47]"/>
            <h2 className="font-extrabold text-[16px] text-black-heading">Contenido educativo</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {contenido.map(item => (
              <div key={item.id} className="bg-card border border-border-default rounded-[12px] p-5 flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <div className="w-9 h-9 bg-green-light rounded-[8px] grid place-items-center">{iconoTipo[item.tipo ?? 'articulo']}</div>
                  <span className="text-[11px] font-bold text-body-text bg-bg-page border border-border-default px-2 py-0.5 rounded-full capitalize">{item.tipo}</span>
                </div>
                <h3 className="font-bold text-[14px] text-black-heading leading-snug">{item.titulo}</h3>
                {item.tipo === 'video' && item.url && (
                  <div className="aspect-video rounded-[8px] overflow-hidden bg-black">
                    <iframe src={item.url.replace('watch?v=', 'embed/')} className="w-full h-full" allowFullScreen/>
                  </div>
                )}
                {item.tags && item.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {item.tags.map(t => <span key={t} className="text-[11px] bg-bg-page text-body-text px-2 py-0.5 rounded-full border border-border-default">{t}</span>)}
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
