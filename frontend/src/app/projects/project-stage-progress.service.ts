import { Injectable, signal } from '@angular/core';

const STORAGE_KEY = 'constructora.project-stages';

type StageSelections = Record<string, string>;

/**
 * Etapa en la que se encuentra cada proyecto.
 *
 * El backend expone las etapas del proyecto (`/api/projects/{id}/stages`)
 * pero todavía no guarda cuál es la etapa en curso. Mientras ese dato no
 * exista en la API, la selección se conserva en el navegador para que el
 * listado siga mostrando la etapa elegida al recargar la página.
 */
@Injectable({ providedIn: 'root' })
export class ProjectStageProgressService {
  private readonly selections = signal<StageSelections>(loadSelections());

  /** Etapa elegida para el proyecto, o null si nunca se ha cambiado. */
  stageId(projectId: string): string | null {
    return this.selections()[projectId] ?? null;
  }

  select(projectId: string, stageId: string): void {
    this.persist({ ...this.selections(), [projectId]: stageId });
  }

  /** Olvida la etapa de un proyecto (por ejemplo, cuando se elimina). */
  clear(projectId: string): void {
    if (!(projectId in this.selections())) {
      return;
    }
    const next = { ...this.selections() };
    delete next[projectId];
    this.persist(next);
  }

  private persist(next: StageSelections): void {
    this.selections.set(next);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      // Si el navegador bloquea el almacenamiento, la selección sigue en memoria.
    }
  }
}

function loadSelections(): StageSelections {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return {};
    }
    const parsed: unknown = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? (parsed as StageSelections) : {};
  } catch {
    return {};
  }
}
