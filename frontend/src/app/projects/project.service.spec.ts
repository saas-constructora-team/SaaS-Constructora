import { HttpErrorResponse } from '@angular/common/http';
import { projectErrorMessage } from './project.service';

describe('projectErrorMessage', () => {

  function httpError(status: number, body: unknown): HttpErrorResponse {
    return new HttpErrorResponse({ status, error: body });
  }

  it('muestra un mensaje amable para el 503 etiquetado sin filtrar el texto de Hikari', () => {
    const message = projectErrorMessage(httpError(503, {
      timestamp: '2026-11-27T10:00:00Z',
      status: 503,
      error: 'Service Unavailable',
      message: 'Unable to acquire JDBC Connection [HikariPool-7 - Connection is not available]',
      code: 'SERVICE_UNAVAILABLE',
      details: {}
    }));

    expect(message).toContain('no está disponible');
    expect(message).not.toContain('HikariPool');
    expect(message).not.toContain('JDBC');
  });

  it('no muestra mensajes del body en errores 500', () => {
    const message = projectErrorMessage(httpError(500, {
      status: 500,
      error: 'Internal Server Error',
      message: 'secreto interno',
      code: 'INTERNAL_ERROR',
      details: {}
    }));

    expect(message).not.toContain('secreto interno');
  });

  it('conserva el mensaje del backend en conflictos 409', () => {
    const message = projectErrorMessage(httpError(409, {
      status: 409,
      error: 'Conflict',
      message: 'Otra persona realizó un cambio antes',
      code: 'CONFLICT',
      details: {}
    }));

    expect(message).toBe('Otra persona realizó un cambio antes');
  });

  it('usa los detalles de validación del contrato ApiError', () => {
    const message = projectErrorMessage(httpError(400, {
      status: 400,
      error: 'Bad Request',
      message: 'La solicitud contiene datos inválidos',
      code: 'VALIDATION_ERROR',
      details: { name: 'El nombre es obligatorio' }
    }));

    expect(message).toBe('El nombre es obligatorio');
  });
});
