import { t, type TranslationKey } from '../../i18n';
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
  /**
   * Las tres cadenas van como CLAVE y no como texto: esta lista se construye al
   * importar el módulo, cuando todavía no se sabe en qué idioma habla el
   * usuario. El texto se resuelve al pintar, con `titleOf` y compañía.
   */
  titleKey: TranslationKey;
  subtitleKey: TranslationKey;
  /** Lo que se enseña cuando la lista está vacía. Distinto para cada una. */
  emptyKey: TranslationKey;
}

export const INBOX_VIEWS: readonly InboxView[] = [
  {
    status: JobStatus.New,
    path: '/nuevas',
    titleKey: 'inbox.new.title',
    subtitleKey: 'inbox.new.subtitle',
    // Sin las horas escritas a mano: las pone la página con lo que diga la API.
    emptyKey: 'inbox.new.empty',
  },
  {
    status: JobStatus.Seen,
    path: '/vistas',
    titleKey: 'inbox.seen.title',
    subtitleKey: 'inbox.seen.subtitle',
    emptyKey: 'inbox.seen.empty',
  },
  {
    status: JobStatus.Saved,
    path: '/guardadas',
    titleKey: 'inbox.saved.title',
    subtitleKey: 'inbox.saved.subtitle',
    emptyKey: 'inbox.saved.empty',
  },
  {
    status: JobStatus.Dismissed,
    path: '/descartadas',
    titleKey: 'inbox.dismissed.title',
    subtitleKey: 'inbox.dismissed.subtitle',
    emptyKey: 'inbox.dismissed.empty',
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

/**
 * La raíz ya no es la bandeja: es el dashboard. «Nuevas» vive en `/nuevas`.
 * Quien llegue a `/` con un enlace viejo lo redirige el router, no esto.
 */
export function viewByPath(pathname: string): InboxView {
  return INBOX_VIEWS.find((v) => v.path === pathname) ?? INBOX_VIEWS[0]!;
}

/** El texto de una vista, ya en el idioma del usuario. */
export const titleOf = (view: InboxView): string => t(view.titleKey);
export const subtitleOf = (view: InboxView): string => t(view.subtitleKey);
export const emptyOf = (view: InboxView): string => t(view.emptyKey);
