import {
  buildJsonHeaders,
  getRequiredEnv,
  jsonError,
  jsonSuccess,
  methodNotAllowed,
  optionsResponse,
  proxyErrorResponse,
  proxyJsonRequest,
} from "@/app/api/_lib/http";
import { parseOr400, validateResetTokenSchema } from "@/lib/server/validation";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const parsed = parseOr400(validateResetTokenSchema, {
      token: searchParams.get("token") ?? "",
    });
    if (parsed.error) return parsed.error;
    const { token } = parsed.data;

    const backendUrl = getRequiredEnv("BACKEND_URL");
    if (!backendUrl) {
      return jsonError("Backend URL configuration error", 500, "CONFIG_ERROR");
    }

    const url = `${backendUrl}/api/auth/validate-reset-token?token=${encodeURIComponent(token)}`;
    const result = await proxyJsonRequest(
      url,
      { method: "GET", headers: buildJsonHeaders(request) },
      "Failed to validate token",
      { request },
    );

    if (!result.ok) {
      return proxyErrorResponse(result);
    }

    return jsonSuccess(result.data ?? { valid: true }, { status: result.status });
  } catch (error) {
    console.error("[api/validate-reset-token] Unhandled error:", error);
    return jsonError("Internal server error", 500, "INTERNAL_ERROR");
  }
}

export async function OPTIONS() {
  return optionsResponse(["GET", "OPTIONS"]);
}

export async function POST() {
  return methodNotAllowed(["GET", "OPTIONS"]);
}

export async function PUT() {
  return methodNotAllowed(["GET", "OPTIONS"]);
}

export async function PATCH() {
  return methodNotAllowed(["GET", "OPTIONS"]);
}

export async function DELETE() {
  return methodNotAllowed(["GET", "OPTIONS"]);
}
