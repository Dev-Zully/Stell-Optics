/**
 * Global API response shape (#449).
 *
 * Declares the consistent envelope every JSON response should follow so the
 * frontend can handle errors uniformly:
 *
 *   Success:  { data: T, meta?: {...} }
 *   Error:    { error: { code: string, message: string, details?: unknown } }
 *
 * Declared as a global ambient type so route handlers can reference `ApiResponse<T>`
 * without importing it per file.
 */
declare global {
  namespace Api {
    interface Meta {
      requestId?: string;
      timestamp?: string;
      page?: { limit: number; offset: number; total: number; hasMore: boolean };
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    interface SuccessResponse<T = any> {
      data: T;
      meta?: Meta;
    }

    interface ErrorBody {
      code: string;
      message: string;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      details?: any;
    }

    interface ErrorResponse {
      error: ErrorBody;
    }

    type ApiResponse<T = unknown> = SuccessResponse<T> | ErrorResponse;
  }
}

export {};
