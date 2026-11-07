import { NextResponse } from "next/server";
import {
  API_REQUEST_TIMEOUT_DEFAULT_MS,
  API_REQUEST_TIMEOUT_MAX_MS,
  API_REQUEST_TIMEOUT_MIN_MS,
} from "./constants";

export type ApiErrorCode =
  | "BAD_REQUEST"
  | "UNAUTHORIZED"
  | "UNSUPPORTED_MEDIA_TYPE"
  | "METHOD_NOT_ALLOWED"
  | "UPSTREAM_ERROR"
  | "GATEWAY_TIMEOUT"
  | "INTERNAL_ERROR"
  | "CONFIG_ERROR";

export interface ApiProxyResult<T = unknown> {
  ok: boolean;
  status: number;
  data: T;
  requestId?: string;
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function getRequiredEnv(name: string): string | null {
  const value = process.env[name]?.trim();
  if (!value) {
    console.error(`[api] Missing required env: ${name}`);
    return null;
  }

  return value.replace(/\/+$/, "");
}

export function getErrorMessage(data: unknown, fallback: string): string {
  if (isRecord(data)) {
    if (typeof data.error === "string" && data.error.trim()) {
      return data.error;
    }
    if (typeof data.message === "string" && data.message.trim()) {
      return data.message;
    }
  }

  return fallback;
}

export function getProxyError(
  data: unknown,
  fallback: string,
): { error: string; code?: string } {
  const error = getErrorMessage(data, fallback);
  if (isRecord(data) && typeof data.code === "string" && data.code.trim()) {
    return { error, code: data.code };
  }
  return { error };
}

export async function readResponseData(response: Response): Promise<unknown> {
  if (response.status === 204 || response.status === 205) {
    return null;
  }

  const contentType = response.headers.get("content-type") ?? "";

  if (contentType.includes("application/json")) {
    try {
      return await response.json();
    } catch {
      const text = await response.text().catch(() => "");
      return text ? { raw: text } : null;
    }
  }

  const text = await response.text().catch(() => "");
  return text ? { raw: text } : null;
}

export function resolveRequestTimeoutMs(): number {
  const raw = Number(process.env.API_REQUEST_TIMEOUT_MS ?? API_REQUEST_TIMEOUT_DEFAULT_MS);
  if (!Number.isFinite(raw)) return API_REQUEST_TIMEOUT_DEFAULT_MS;
  return Math.min(Math.max(Math.trunc(raw), API_REQUEST_TIMEOUT_MIN_MS), API_REQUEST_TIMEOUT_MAX_MS);
}

export function redactUrl(url: string): string {
  try {
    const parsed = new URL(url);
    const sensitive = ["token", "key", "secret", "password", "signature", "access_token", "id_token"];
    for (const key of sensitive) {
      if (parsed.searchParams.has(key)) parsed.searchParams.set(key, "[REDACTED]");
    }
    return parsed.toString();
  } catch {
    return "[invalid-url]";
  }
}

export function getRequestId(request: Request): string {
  const incoming = request.headers.get("x-request-id")?.trim();
  if (incoming) return incoming.slice(0, 128);
  const globalCrypto = globalThis.crypto;
  if (globalCrypto?.randomUUID) return globalCrypto.randomUUID();
  return `req_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

export function getClientIp(request: Request): string | null {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    return first || null;
  }
  return request.headers.get("x-real-ip")?.trim() || null;
}

export function getAuthorizationHeader(request: Request): string | null {
  const value = request.headers.get("authorization")?.trim();
  return value || null;
}

export function requireAuthorizationHeader(request: Request): { authorization: string } | { error: NextResponse } {
  const authorization = getAuthorizationHeader(request);
  if (!authorization) {
    return { error: jsonError("Authorization header is required", 401, "UNAUTHORIZED") };
  }
  return { authorization };
}

export function isJsonRequest(request: Request): boolean {
  const contentType = request.headers.get("content-type") ?? "";
  return contentType.toLowerCase().includes("application/json");
}

export function requireJsonContentType(request: Request): NextResponse | null {
  if (!isJsonRequest(request)) {
    return jsonError("Content-Type must be application/json", 415, "UNSUPPORTED_MEDIA_TYPE");
  }
  return null;
}

export function buildJsonHeaders(
  request?: Request,
  extra?: HeadersInit,
): Headers {
  const headers = new Headers(extra);
  if (!headers.has("Content-Type")) headers.set("Content-Type", "application/json");
  if (!headers.has("Accept")) headers.set("Accept", "application/json");
  if (request) {
    const requestId = getRequestId(request);
    if (!headers.has("X-Request-Id")) headers.set("X-Request-Id", requestId);
  }
  return headers;
}

export async function proxyJsonRequest(
  url: string,
  init: RequestInit,
  fallbackError: string,
  options?: { request?: Request },
): Promise<ApiProxyResult> {
  const timeoutMs = resolveRequestTimeoutMs();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  const requestId = options?.request ? getRequestId(options.request) : undefined;

  try {
    const headers = new Headers(init.headers);
    if (requestId && !headers.has("X-Request-Id")) headers.set("X-Request-Id", requestId);
    if (!headers.has("Accept")) headers.set("Accept", "application/json");

    const response = await fetch(url, {
      ...init,
      headers,
      signal: init.signal ?? controller.signal,
    });

    const data = await readResponseData(response);

    if (!response.ok) {
      return {
        ok: false,
        status: response.status,
        requestId,
        data: {
          ...getProxyError(data, fallbackError),
          upstreamStatus: response.status,
        },
      };
    }

    return {
      ok: true,
      status: response.status,
      requestId,
      data,
    };
  } catch (error) {
    const isAbort = error instanceof Error && error.name === "AbortError";
    const reason = error instanceof Error ? error.message : "Unknown request error";
    console.error(`[api] Proxy request failed`, {
      url: redactUrl(url),
      requestId,
      reason,
      timeout: isAbort,
    });

    return {
      ok: false,
      status: isAbort ? 504 : 502,
      requestId,
      data: {
        error: isAbort
          ? `Upstream request timed out: ${fallbackError}`
          : `Upstream request failed: ${fallbackError}`,
        code: isAbort ? "GATEWAY_TIMEOUT" : "UPSTREAM_ERROR",
      },
    };
  } finally {
    clearTimeout(timeout);
  }
}

export function withNoStore(headers?: HeadersInit): Headers {
  const merged = new Headers(headers);
  merged.set("Cache-Control", "no-store");
  return merged;
}

export function withSecurityHeaders(headers?: HeadersInit): Headers {
  const merged = withNoStore(headers);
  if (!merged.has("X-Content-Type-Options")) merged.set("X-Content-Type-Options", "nosniff");
  if (!merged.has("X-Frame-Options")) merged.set("X-Frame-Options", "DENY");
  if (!merged.has("Referrer-Policy")) merged.set("Referrer-Policy", "no-referrer");
  return merged;
}

export function jsonSuccess(data: unknown, init?: ResponseInit): NextResponse {
  const headers = withSecurityHeaders(init?.headers);
  return NextResponse.json(data ?? { success: true }, { ...init, headers });
}

export function jsonError(message: string, status: number, code?: ApiErrorCode): NextResponse {
  const headers = withSecurityHeaders();
  return NextResponse.json(code ? { error: message, code } : { error: message }, { status, headers });
}

export function methodNotAllowed(allowed: string[]): NextResponse {
  const headers = withSecurityHeaders({ Allow: allowed.join(", ") });
  return NextResponse.json(
    { error: "Method not allowed", code: "METHOD_NOT_ALLOWED" as ApiErrorCode },
    { status: 405, headers },
  );
}

export function optionsResponse(allowed: string[]): NextResponse {
  return new NextResponse(null, {
    status: 204,
    headers: withSecurityHeaders({
      Allow: allowed.join(", "),
      "Access-Control-Allow-Methods": allowed.join(", "),
      "Access-Control-Allow-Headers": "Authorization, Content-Type, X-Request-Id",
      "Access-Control-Max-Age": "86400",
    }),
  });
}

export function proxyErrorResponse(result: ApiProxyResult): NextResponse {
  const payload = isRecord(result.data) ? result.data : { error: "Upstream request failed" };
  return NextResponse.json(payload, {
    status: result.status,
    headers: withSecurityHeaders(result.requestId ? { "X-Request-Id": result.requestId } : undefined),
  });
}
