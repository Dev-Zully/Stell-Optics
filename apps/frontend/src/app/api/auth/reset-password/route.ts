import {
  buildJsonHeaders,
  getRequiredEnv,
  jsonError,
  jsonSuccess,
  methodNotAllowed,
  optionsResponse,
  proxyErrorResponse,
  proxyJsonRequest,
  requireJsonContentType,
} from "@/app/api/_lib/http";
import {
  parseOr400,
  readJson,
  resetPasswordSchema,
} from "@/lib/server/validation";

export async function POST(request: Request) {
  try {
    const contentTypeError = requireJsonContentType(request);
    if (contentTypeError) return contentTypeError;

    const parsed = parseOr400(resetPasswordSchema, await readJson(request));
    if (parsed.error) return parsed.error;
    const { token, newPassword } = parsed.data;

    const backendUrl = getRequiredEnv("BACKEND_URL");
    if (!backendUrl) {
      return jsonError("Backend URL configuration error", 500, "CONFIG_ERROR");
    }

    const result = await proxyJsonRequest(
      `${backendUrl}/api/auth/reset-password`,
      {
        method: "POST",
        headers: buildJsonHeaders(request),
        body: JSON.stringify({ token, newPassword }),
      },
      "Failed to reset password",
      { request },
    );

    if (!result.ok) {
      return proxyErrorResponse(result);
    }

    return jsonSuccess(result.data ?? { success: true }, { status: result.status });
  } catch (error) {
    console.error("[api/reset-password] Unhandled error:", error);
    return jsonError("Internal server error", 500, "INTERNAL_ERROR");
  }
}

export async function OPTIONS() {
  return optionsResponse(["POST", "OPTIONS"]);
}

export async function GET() {
  return methodNotAllowed(["POST", "OPTIONS"]);
}

export async function PUT() {
  return methodNotAllowed(["POST", "OPTIONS"]);
}

export async function PATCH() {
  return methodNotAllowed(["POST", "OPTIONS"]);
}

export async function DELETE() {
  return methodNotAllowed(["POST", "OPTIONS"]);
}
