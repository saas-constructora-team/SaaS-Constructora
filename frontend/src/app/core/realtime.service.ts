import { inject, Injectable, NgZone } from '@angular/core';
import { AuthService } from '../auth/auth.service';
import { ProjectChangeEvent } from '../projects/project.model';

interface ProjectChangeSubscriber {
  onEvent: (event: ProjectChangeEvent) => void;
  projectId?: string;
  onConnected?: () => void;
}

/**
 * Un único canal SSE por pestaña, compartido por todos los componentes.
 * `fetch` permite enviar el JWT en la cabecera (EventSource no lo permite).
 * Solo recibe metadatos: cada componente decide qué debe volver a consultar.
 * El callback `onConnected` avisa de la apertura y de cada reconexión para
 * que la UI pueda resincronizarse cuando estuvo fuera de línea.
 */
@Injectable({ providedIn: 'root' })
export class RealtimeService {

  private readonly auth = inject(AuthService);
  private readonly zone = inject(NgZone);
  private readonly subscribers = new Set<ProjectChangeSubscriber>();
  private controller: AbortController | null = null;
  private retryTimer: number | undefined;

  changes(
    onEvent: (event: ProjectChangeEvent) => void,
    projectId?: string,
    onConnected?: () => void
  ): () => void {
    const subscriber: ProjectChangeSubscriber = { onEvent, projectId, onConnected };
    this.subscribers.add(subscriber);
    this.connectIfNeeded();

    return () => {
      this.subscribers.delete(subscriber);
      if (this.subscribers.size === 0) {
        this.stop();
      }
    };
  }

  private connectIfNeeded(): void {
    if (this.controller || this.retryTimer !== undefined || this.subscribers.size === 0) {
      return;
    }
    void this.connect();
  }

  private scheduleRetry(): void {
    if (this.retryTimer !== undefined || this.controller || this.subscribers.size === 0) {
      return;
    }
    this.retryTimer = window.setTimeout(() => {
      this.retryTimer = undefined;
      void this.connect();
    }, 3000);
  }

  private stop(): void {
    if (this.retryTimer !== undefined) {
      window.clearTimeout(this.retryTimer);
      this.retryTimer = undefined;
    }
    this.controller?.abort();
    this.controller = null;
  }

  private async connect(): Promise<void> {
    if (this.controller || this.subscribers.size === 0) {
      return;
    }
    const token = this.auth.session()?.accessToken;
    if (!token) {
      this.scheduleRetry();
      return;
    }

    const controller = new AbortController();
    this.controller = controller;

    try {
      const response = await fetch('/api/projects/events', {
        headers: { Accept: 'text/event-stream', Authorization: `Bearer ${token}` },
        signal: controller.signal
      });
      if (!response.ok || !response.body) {
        throw new Error(`No se pudo abrir el canal de cambios (${response.status})`);
      }

      this.notifyConnected();

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      while (!controller.signal.aborted) {
        const { done, value } = await reader.read();
        if (done) {
          break;
        }
        buffer += decoder.decode(value, { stream: true });
        const blocks = buffer.split('\n\n');
        buffer = blocks.pop() ?? '';
        for (const block of blocks) {
          const data = block.split('\n')
            .filter(line => line.startsWith('data:'))
            .map(line => line.slice(5).trimStart())
            .join('\n');
          if (!data || data === 'connected') {
            continue;
          }
          try {
            this.dispatch(JSON.parse(data) as ProjectChangeEvent);
          } catch {
            // Un evento malformado no debe romper el canal.
          }
        }
      }
    } catch {
      // Se reconecta más abajo; mientras tanto la UI sigue funcionando.
    } finally {
      if (this.controller === controller) {
        this.controller = null;
      }
      if (!controller.signal.aborted) {
        this.scheduleRetry();
      }
    }
  }

  private dispatch(event: ProjectChangeEvent): void {
    for (const subscriber of [...this.subscribers]) {
      if (subscriber.projectId && event.projectId !== subscriber.projectId) {
        continue;
      }
      this.runInZone(() => subscriber.onEvent(event));
    }
  }

  private notifyConnected(): void {
    for (const subscriber of [...this.subscribers]) {
      if (subscriber.onConnected) {
        this.runInZone(subscriber.onConnected);
      }
    }
  }

  private runInZone(callback: () => void): void {
    try {
      // `fetch` no está instrumentado por zone.js: se vuelve a la zona de
      // Angular para que las señales actualicen la vista de inmediato.
      this.zone.run(callback);
    } catch {
      // Un fallo de un componente no afecta a los demás ni al canal.
    }
  }
}
