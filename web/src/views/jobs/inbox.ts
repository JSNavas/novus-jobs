import { JobStatus } from '../../types';

/**
 * LA BANDEJA DE OFERTAS, que es lo que de verdad es este dashboard.
 *
 * Cada estado tiene su propia ruta y su entrada en el menú, en vez de vivir
 * escondido en un desplegable: "¿dónde estaban las que guardé?" no puede
 * costar dos clics y acordarse de un filtro. El menú es el mapa de lo que hay.
 *
 * El orden es el del recorrido real de una oferta: llega (Nuevas), la lees
 * (Vistas), te interesa (Guardadas) o no (Descartadas).
 */
export interface InboxView {
  status: JobStatus;
  path: string;
  title: string;
  /** Qué significa esta lista, en una línea bajo el título. */
  subtitle: string;
  /** Lo que se enseña cuando la lista está vacía. Distinto para cada una. */
  empty: string;
}

export const INBOX_VIEWS: readonly InboxView[] = [
  {
    status: JobStatus.New,
    path: '/',
    title: 'Nuevas',
    subtitle: 'Ofertas recién encontradas que todavía no has mirado',
    // Sin las horas escritas a mano: las pone la página con lo que diga la API.
    empty: 'No hay ofertas nuevas.',
  },
  {
    status: JobStatus.Seen,
    path: '/vistas',
    title: 'Vistas',
    subtitle: 'Las que ya leíste y dejaste pendientes de decidir',
    empty: 'Aquí van las que marcas como vistas: leídas, pero sin decidir todavía.',
  },
  {
    status: JobStatus.Saved,
    path: '/guardadas',
    title: 'Guardadas',
    subtitle: 'Las que te interesan y en las que vas a postularte',
    empty: 'Aquí van las que guardas para postularte. Todavía no has guardado ninguna.',
  },
  {
    status: JobStatus.Dismissed,
    path: '/descartadas',
    title: 'Descartadas',
    subtitle: 'Las que apartaste. No se borran: puedes devolverlas a nuevas',
    empty: 'Aquí van las que descartas. No se borran: puedes devolverlas a nuevas.',
  },
];

/**
 * Dónde se enseña el número.
 *
 * Solo en Nuevas y Guardadas, que son las dos listas sobre las que se actúa:
 * cuántas quedan por mirar y cuántas hay que trabajar. "Vistas" y
 * "Descartadas" son el archivo — su número no cambia ninguna decisión, y un
 * contador que nadie usa es ruido que compite con los que sí importan.
 */
export function showsCount(view: InboxView): boolean {
  return view.status === JobStatus.New || view.status === JobStatus.Saved;
}

export function viewByPath(pathname: string): InboxView {
  return INBOX_VIEWS.find((v) => v.path === pathname) ?? INBOX_VIEWS[0]!;
}
