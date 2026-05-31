export interface TourStep {
  element?: string;
  title?: string;
  intro: string;
  position?: 'top' | 'bottom' | 'left' | 'right' | 'auto';
  waitForClick?: boolean;
}

export interface TourDef {
  tourId: string;
  title: string;
  steps: TourStep[];
  /** Navigate here before starting the tour */
  href?: string;
}

export const TOURS: TourDef[] = [
  // ── Admin ────────────────────────────────────────────────────────────────────

  {
    tourId: 'admin-dashboard',
    title: 'Panel de control',
    href: '/admin/dashboard',
    steps: [
      { element: '[data-tour="metric-cards"]',     title: 'Métricas globales',     intro: 'Estas tarjetas muestran en tiempo real el total reciclado, empresas activas, recolectores y estado de extracciones.' },
      { element: '[data-tour="chart-materiales"]', title: 'Reciclaje por material', intro: 'Distribución de los materiales reciclados en el período. Se actualiza con cada validación.' },
      { element: '[data-tour="canales-panel"]',    title: 'Canales de entrada',     intro: 'Proporción de mensajes recibidos por cada canal: Telegram, WhatsApp y Web.' },
      { element: '[data-tour="impact-cards"]',     title: 'Impacto ambiental',      intro: 'CO₂ evitado, agua ahorrada y árboles equivalentes calculados automáticamente desde los materiales validados.' },
      { element: '[data-tour="actividad"]',        title: 'Actividad reciente',     intro: 'Las últimas 8 extracciones procesadas por el sistema con su estado actual.' },
    ],
  },

  {
    tourId: 'admin-validacion',
    title: 'Validar extracciones',
    href: '/admin/validacion',
    steps: [
      { element: '[data-tour="nav-validacion"]',   title: 'Validación en el menú',  intro: 'Accedé a la validación de extracciones desde el menú lateral.' },
      { element: '[data-tour="calendario"]',       title: 'Calendario mensual',     intro: 'Cada día con extracciones pendientes muestra un badge verde. Hacé click en cualquier día para ver sus extracciones.' },
      { element: '[data-tour="cal-nav"]',          title: 'Navegación de meses',    intro: 'Usá las flechas para moverte entre meses y encontrar extracciones anteriores.' },
      { element: '[data-tour="cal-legend"]',       title: 'Referencias del calendar', intro: 'El color verde sólido indica días con extracciones. El verde claro es el día de hoy.' },
    ],
  },

  {
    tourId: 'admin-empresas',
    title: 'Gestionar empresas',
    href: '/admin/empresas',
    steps: [
      { element: '[data-tour="nav-empresas"]',     title: 'Empresas en el menú',    intro: 'Gestioná empresas y sus usuarios de acceso desde aquí.' },
      { element: '[data-tour="empresas-lista"]',   title: 'Lista de empresas',      intro: 'Seleccioná una empresa para ver sus detalles y usuarios. El panel izquierdo lista todas las empresas registradas.' },
      { element: '[data-tour="btn-nueva-empresa"]',title: 'Nueva empresa',          intro: 'Creá una nueva empresa aliada. Abre un formulario con nombre y email de contacto.' },
      { element: '[data-tour="empresas-detalle"]', title: 'Detalle de empresa',     intro: 'Al seleccionar una empresa, podés ver sus usuarios con acceso y crear nuevas credenciales.' },
    ],
  },

  {
    tourId: 'admin-reportes',
    title: 'Generar reportes',
    href: '/admin/reportes',
    steps: [
      { element: '[data-tour="nav-reportes"]',     title: 'Reportes en el menú',    intro: 'Accedé a la generación de reportes por empresa y período.' },
      { element: '[data-tour="filtro-tipo"]',      title: 'Tipo de período',        intro: 'Elegí entre ver datos por Año completo, un Mes específico, o un rango de fechas Personalizado.' },
      { element: '[data-tour="filtro-fecha"]',     title: 'Selector de fecha',      intro: 'Navegá por años o meses con las flechas. En modo personalizado usás date pickers.' },
      { element: '[data-tour="empresa-selector"]', title: 'Seleccionar empresa',    intro: 'Elegí "Todas las empresas" para ver datos consolidados, o una empresa específica para habilitar la descarga de PDF.' },
      { element: '[data-tour="btn-descargar"]',    title: 'Descargar PDF',          intro: 'Disponible al seleccionar una empresa. Genera el reporte del período seleccionado en PDF.' },
    ],
  },

  {
    tourId: 'admin-monitoreo',
    title: 'Monitorear canales',
    href: '/admin/monitoreo',
    steps: [
      { element: '[data-tour="nav-monitoreo"]',    title: 'Monitoreo en el menú',   intro: 'Monitoreá la actividad de los diferentes canales de entrada de datos.' },
      { element: '[data-tour="canales-nav"]',      title: 'Lista de canales',       intro: 'Seleccioná un canal para filtrar toda la información. "Todos" muestra el consolidado.' },
      { element: '[data-tour="stats-cards"]',      title: 'Estadísticas del canal', intro: 'Mensajes recibidos, extracciones por estado, kg totales y usuarios únicos del canal seleccionado.' },
    ],
  },

  {
    tourId: 'nueva-recoleccion-admin',
    title: 'Crear recolección (admin)',
    href: '/admin/dashboard',
    steps: [
      { element: '[data-tour="btn-nueva-recoleccion"]', title: '+ Nueva recolección', intro: 'Hacé click en este botón para abrir el formulario de recolección con IA.', waitForClick: true },
      { element: '[data-tour="form-tabs"]',             title: 'Modo de entrada',     intro: 'Elegí cómo ingresar los datos: texto libre, imagen o video. La IA interpreta cada formato automáticamente.' },
      { element: '[data-tour="btn-extraer"]',           title: 'Extraer con IA',      intro: 'Presioná para que la IA analice el contenido y extraiga empresa, fecha y materiales. Luego podés revisar y corregir antes de guardar.' },
    ],
  },

  // ── Empresa ──────────────────────────────────────────────────────────────────

  {
    tourId: 'empresa-dashboard',
    title: 'Mi impacto ambiental',
    href: '/empresa/dashboard',
    steps: [
      { element: '[data-tour="metric-cards"]',     title: 'Tus métricas',           intro: 'Resumen de tu impacto: total reciclado, CO₂ evitado, agua ahorrada y árboles equivalentes.' },
      { element: '[data-tour="chart-mensual"]',    title: 'Evolución mensual',      intro: 'Tu actividad de reciclaje mes a mes en los últimos 12 meses.' },
      { element: '[data-tour="chart-material"]',   title: 'Por tipo de material',   intro: 'Distribución de los materiales que tu empresa ha reciclado.' },
      { element: '[data-tour="ultimas-recolecciones"]', title: 'Últimas recolecciones', intro: 'Las recolecciones validadas más recientes de tu empresa.' },
    ],
  },

  {
    tourId: 'empresa-reportes',
    title: 'Descargar mi reporte',
    href: '/empresa/reportes',
    steps: [
      { element: '[data-tour="nav-reportes"]',     title: 'Reportes en el menú',    intro: 'Accedé a tus reportes personalizados desde el menú lateral.' },
      { element: '[data-tour="filtro-tipo"]',      title: 'Elegí el período',       intro: 'Filtrá por año, mes o un rango de fechas personalizado.' },
      { element: '[data-tour="btn-descargar"]',    title: 'Descargar PDF',          intro: 'Descargá el reporte PDF del período seleccionado con todas tus métricas de impacto.' },
    ],
  },

  {
    tourId: 'nueva-recoleccion-empresa',
    title: 'Crear recolección',
    href: '/empresa/dashboard',
    steps: [
      { element: '[data-tour="btn-nueva-recoleccion"]', title: '+ Nueva recolección', intro: 'Hacé click en este botón para abrir el formulario de recolección con IA.', waitForClick: true },
      { element: '[data-tour="form-tabs"]',             title: 'Modo de entrada',     intro: 'Elegí cómo ingresar los datos: texto libre, imagen o video. La IA interpreta cada formato automáticamente.' },
      { element: '[data-tour="btn-extraer"]',           title: 'Extraer con IA',      intro: 'Presioná para que la IA analice el contenido y extraiga empresa, fecha y materiales. Luego podés revisar y corregir antes de guardar.' },
    ],
  },
];

export function getTour(tourId: string): TourDef | undefined {
  return TOURS.find(t => t.tourId === tourId);
}
