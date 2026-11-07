# Frontend API Routes (`apps/frontend/src/app/api`)

These Next.js route handlers act as a thin, secured proxy/config layer for the frontend.

## Enhancements applied
- Centralized API utilities in `_lib/http.ts` (timeouts, JSON/content-type guards, auth checks, request IDs, URL redaction, standardized JSON responses, and upstream proxy handling).
- Added shared constants in `_lib/constants.ts` and a reusable health handler in `_lib/health-route.ts`.
- Standardized route behavior: request validation, `no-store` + basic security headers, explicit method handling (`OPTIONS`/405), and consistent error shapes with optional codes.
- Preserved upstream status codes where applicable and added request ID propagation.
- Added health endpoints: `GET /api/health` and `GET /api/v1/health` (503 when required upstream env config is missing).
- Added versioned aliases under `/api/v1/*` that delegate to existing handlers for backward-compatible adoption.

## Endpoints
- `POST /api/auth/forgot-password` (also `/api/v1/auth/forgot-password`) -> webhook proxy
- `POST /api/auth/reset-password` (also `/api/v1/auth/reset-password`) -> backend proxy
- `POST /api/auth/sync-user` (also `/api/v1/auth/sync-user`) -> backend proxy, requires `Authorization`
- `GET  /api/auth/validate-reset-token` (also `/api/v1/auth/validate-reset-token`) -> backend proxy
- `DELETE /api/users/me` (also `/api/v1/users/me`) -> backend proxy, requires `Authorization`
- `GET /api/feature-flags` (also `/api/v1/feature-flags`) -> local env-driven flags
- `GET|HEAD /api/health` (also `/api/v1/health`) -> config/health status

## Notes
- `API_REQUEST_TIMEOUT_MS` is clamped to a safe range (1s–60s, default 15s).
- Proxy failures return 502 (or 504 on timeout) with a sanitized error payload.
- `POST` JSON routes enforce `Content-Type: application/json`.
- Validation is handled by `src/lib/server/validation.ts` (Zod) before forwarding requests.
