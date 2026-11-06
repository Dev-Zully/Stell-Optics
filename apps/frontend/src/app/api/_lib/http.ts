import { NextResponse } from "next/server";

export function getRequiredEnv(name: string): string | null {
  const value = process.env[name]?.trim();
  if (!value) {
    console.error(`${name} is not configured`);
    return null;
  }

  return value.replace(/\/+$/, "");
}

export function getErrorMessage(data: unknown, fallback: string): string {
  if (typeof data === "object" && data !== null) {
    const obj = data as Record<string, unknown>;
    if (typeof obj.error === "string" && obj.error.trim()) {
      return obj.error;
    }
    if (typeof obj.message === "string" && obj.message.trim()) {
      return obj.message;
    }
  }

  return fallback;
}

export async function readResponseData(response: Response): Promise<unknown> {
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

export async function proxyJsonRequest(
  url: string,
  init: RequestInit,
  fallbackError: string,
): Promise<{
  ok: boolean;
  status: number;
  data: unknown;
}> {
  const timeoutMs = Number(process.env.API_REQUEST_TIMEOUT_MS ?? 15000);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      ...init,
      signal: controller.signal,
    });

    const data = await readResponseData(response);

    if (!response.ok) {
      return {
        ok: false,
        status: response.status,
        data: {
          error: getErrorMessage(data, fallbackError),
          raw: data,
        },
      };
    }

    return {
      ok: true,
      status: response.status,
      data,
    };
  } catch (error) {
    const reason = error instanceof Error ? error.message : "Unknown request error";
    console.error(`Proxy request failed for ${url}:`, reason);

    return {
      ok: false,
      status: 502,
      data: {
        error: `Upstream request failed: ${fallbackError}`,
      },
    };
  } finally {
    clearTimeout(timeout);
  }
}

export function jsonError(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}
