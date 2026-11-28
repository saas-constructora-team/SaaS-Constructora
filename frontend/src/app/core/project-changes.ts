import { ProjectChangeEvent } from '../projects/project.model';
import { RealtimeService } from './realtime.service';

export interface WatchProjectChangesOptions {
  /** Si se indica, solo se aceptan eventos de ese proyecto. */
  projectId?: string | null;
  /** Secciones permitidas. Si se omite, se aceptan todas. */
  sections?: ProjectChangeEvent['section'][];
  /** Secciones que se ignoran aunque pasen el filtro anterior. */
  excludeSections?: ProjectChangeEvent['section'][];
  /** Recibe el evento que originó la recarga; en reconexión se llama sin él. */
  onReload: (event?: ProjectChangeEvent) => void;
  debounceMs?: number;
}

/**
 * Suscripción común a cambios del backend: filtra por proyecto/sección,
 * agrupa las recargas en un solo timer y vuelve a consultar al reconectar.
 * Devuelve una función que cancela el canal y limpia el timer pendiente.
 */
export function watchProjectChanges(
  realtime: RealtimeService,
  options: WatchProjectChangesOptions
): () => void {
  let timer: number | undefined;
  let pendingEvent: ProjectChangeEvent | undefined;

  const scheduleReload = (event?: ProjectChangeEvent): void => {
    pendingEvent = event ?? pendingEvent;
    if (timer !== undefined) {
      window.clearTimeout(timer);
    }
    timer = window.setTimeout(() => {
      timer = undefined;
      options.onReload(pendingEvent);
      pendingEvent = undefined;
    }, options.debounceMs ?? 150);
  };

  const stop = realtime.changes(
    event => {
      if (options.projectId && event.projectId !== options.projectId) {
        return;
      }
      if (options.sections && !options.sections.includes(event.section)) {
        return;
      }
      if (options.excludeSections?.includes(event.section)) {
        return;
      }
      scheduleReload(event);
    },
    options.projectId || undefined,
    () => scheduleReload()
  );

  return () => {
    stop();
    if (timer !== undefined) {
      window.clearTimeout(timer);
      timer = undefined;
    }
  };
}
