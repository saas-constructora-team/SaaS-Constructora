export type SiteLogType = 'AVANCE' | 'NOVEDAD' | 'RETRASO';
export type SiteLogStatus = 'ABIERTO' | 'EN_PROCESO' | 'RESUELTO';

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
  why: string;
  author: string;
  assigneeId: string | null;
  assigneeName: string | null;
  createdAt: string;
  photos: number;
}
