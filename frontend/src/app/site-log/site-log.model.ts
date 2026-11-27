export type SiteLogType = 'AVANCE' | 'NOVEDAD' | 'RETRASO';
export type SiteLogStatus = 'ABIERTO' | 'EN_PROCESO' | 'RESUELTO';

/** Respuesta exacta de la API; los campos calculados los resuelve el backend. */
export interface SiteLogEntry {
  id: string;
  projectId: string;
  projectName: string;
  type: SiteLogType;
  status: SiteLogStatus;
  what: string;
  how: string;
  when: string;
  where: string;
  why: string | null;
  author: string;
  assigneeId: string | null;
  assigneeName: string | null;
  createdAt: string;
  updatedAt: string;
  photos: number;
}

/** Cuerpo compartido por POST y PUT; el proyecto va en la URL. */
export interface SiteLogRecordRequest {
  type: SiteLogType;
  status: SiteLogStatus;
  when: string;
  where: string;
  what: string;
  how: string;
  why: string | null;
  assigneeId: string | null;
}
