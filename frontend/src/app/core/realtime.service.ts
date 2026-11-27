import { inject, Injectable, NgZone } from '@angular/core';
import { AuthService } from '../auth/auth.service';
import { ProjectChangeEvent } from '../projects/project.model';

/**
 * Se suscribe al flujo SSE del backend. `fetch` permite enviar el JWT en la
 * cabecera (EventSource no lo permite). Solo recibe metadatos: cada componente
 * decide qué debe volver a consultar. Si el stream se corta, reconecta.
 */
@Injectable({ providedIn: 'root' })
export class RealtimeService {

  private readonly auth = inject(AuthService);
  private readonly zone = inject(NgZone);

  changes(onEvent: (event: ProjectChangeEvent) => void, projectId?: string): () => void {
    let stopped = false;
    let controller: AbortController | null = null;
    let retryTimer: number | undefined;

    const connect = async (): Promise<void> => {
      if (stopped) {
        return;
      }
      const token = this.auth.session()?.accessToken;
      if (!token) {
        return;
      }

      controller = new AbortController();
      const url = projectId
        ? `/api/projects/events?projectId=${encodeURIComponent(projectId)}`
        : '/api/projects/events';

      try {
        const response = await fetch(url, {
          headers: { Accept: 'text/event-stream', Authorization: `Bearer ${token}` },
          signal: controller.signal
        });
        if (!response.ok || !response.body) {
          throw new Error(`No se pudo abrir el canal de cambios (${response.status})`);
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';
        while (!stopped) {
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
              // `fetch` no está instrumentado por zone.js: se vuelve a la zona
              // de Angular para que la señal actualice la vista de inmediato.
              this.zone.run(() => onEvent(JSON.parse(data) as ProjectChangeEvent));
            } catch {
              // Un evento malformado no debe romper el canal.
            }
          }
        }
      } catch {
        // Se reconecta más abajo; mientras tanto la UI sigue funcionando.
      } finally {
        controller = null;
        if (!stopped) {
          retryTimer = window.setTimeout(() => void connect(), 3000);
        }
      }
    };

    void connect();
    return () => {
      stopped = true;
      if (retryTimer !== undefined) {
        window.clearTimeout(retryTimer);
      }
      controller?.abort();
    };
  }
}
