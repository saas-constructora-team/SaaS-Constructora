/** Tipos derivados del contrato del backend: TaskResponse, TaskBoardResponse. */
import { StageColor } from '../projects/project.model';

export type AreaTipo =
  | 'OBRA_INGENIERIA'
  | 'COMPRAS_ALMACEN'
  | 'DISENO_ARQUITECTURA'
  | 'LEGAL_TRAMITES'
  | 'CONTABILIDAD_FINANZAS'
  | 'PERSONALIZADA';

export type PermisoSst =
  | 'TRABAJO_EN_ALTURAS'
  | 'ESPACIO_CONFINADO'
  | 'TRABAJO_EN_CALIENTE'
  | 'OTRO';

export type CapituloPresupuestal =
  | 'CIMENTACION'
  | 'ESTRUCTURA'
  | 'MAMPOSTERIA'
  | 'ACABADOS'
  | 'INSTALACIONES'
  | 'OTRO';

export type UnidadMedida = 'M2' | 'M3' | 'ML' | 'KG' | 'UNIDAD' | 'GLOBAL';

export type CategoriaInsumo =
  | 'MATERIALES'
  | 'ALQUILER_MAQUINARIA'
  | 'HERRAMIENTAS'
  | 'DOTACION_EPP';

export type Disciplina =
  | 'ARQUITECTONICO'
  | 'ESTRUCTURAL'
  | 'HIDROSANITARIO'
  | 'ELECTRICO'
  | 'REDES_GAS';

export type TipoDocumentoContable =
  | 'FACTURA'
  | 'ACTA_CORTE_OBRA'
  | 'ANTICIPO'
  | 'CUENTA_COBRO';

export interface AssignedUser {
  assignmentId: string;
  userId: string;
}

export interface TaskStatusInfo {
  id: string;
  name: string;
  color: string;
  order: number;
  isDefault: boolean;
  isSystem: boolean;
}

export interface TaskArea {
  id: string;
  name: string;
  tipo: AreaTipo;
}

export interface AreaDetails {
  frenteObra: string | null;
  capituloPresupuestal: CapituloPresupuestal | null;
  unidadMedida: UnidadMedida | null;
  cantidadProgramada: number | null;
  contratistaId: string | null;
  requierePermisoSst: boolean;
  permisosSst: PermisoSst[] | null;
  codigoRequisicion: string | null;
  fechaRequeridaEnObra: string | null;
  categoriaInsumo: CategoriaInsumo | null;
  presupuestoEstimado: number | null;
  proveedorSugerido: string | null;
  disciplina: Disciplina | null;
  codigoPlano: string | null;
  versionPlano: string | null;
  entidad: string | null;
  numeroRadicado: string | null;
  tipoDocumento: TipoDocumentoContable | null;
  numeroDocumento: string | null;
  monto: number | null;
}

export interface Task {
  id: string;
  projectId: string;
  title: string;
  description: string | null;
  status: TaskStatusInfo;
  area: TaskArea | null;
  assignee: AssignedUser | null;
  validator: AssignedUser | null;
  fechaFinPrevista: string | null;
  areaDetails: AreaDetails | null;
  createdBy: string;
  createdAt: string;
  stageId: string | null;
}

/** Etapa de un proyecto visible, tal como la devuelve el tablero. */
export interface BoardStage {
  id: string;
  projectId: string;
  name: string;
  order: number;
  color: StageColor;
  closed: boolean;
}

/** Contrato de POST /api/projects/{projectId}/tasks (campos opcionales incluidos). */
export interface CreateTaskRequest {
  title: string;
  description: string | null;
  statusId: string | null;
  areaId: string | null;
  assigneeUserId: string | null;
  validatorUserId: string | null;
  fechaFinPrevista: string | null;
  areaDetails: AreaDetails | null;
  stageId: string | null;
}

/** Contrato de PATCH /api/tasks/{taskId}/stage. */
export interface MoveTaskRequest {
  stageId: string | null;
}

/** Respuesta de GET /api/tasks/board. */
export interface TaskBoard {
  stages: BoardStage[];
  tasks: Task[];
  truncated: boolean;
}
