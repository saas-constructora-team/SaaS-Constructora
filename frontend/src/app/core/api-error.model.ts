/** Espejo del record `ApiError` devuelto por el backend. */
export interface ApiError {
  timestamp: string;
  status: number;
  error: string;
  message: string;
  code: string;
  details: Record<string, string>;
}
