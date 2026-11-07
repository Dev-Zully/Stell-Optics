import {
  buildJsonHeaders,
  getRequiredEnv,
  jsonError,
  jsonSuccess,
  methodNotAllowed,
  optionsResponse,
  proxyErrorResponse,
  proxyJsonRequest,
  requireAuthorizationHeader,
  requireJsonContentType,
} from "@/app/api/_lib/http";
import { parseOr400, readJson, syncUserSchema } from "@/lib/server/validation";

export async function POST(request: Request) {
  try {
    const auth = requireAuthorizationHeader(request);
    if ("error" in auth) return auth.error;

    const contentTypeError = requireJsonContentType(request);
    if (contentTypeError) return contentTypeError;

    const backendUrl = getRequiredEnv("BACKEND_URL");
    if (!backendUrl) {
      console.warn("[api/sync-user] BACKEND_URL not set — skipping user sync");
      return jsonSuccess({ success: true, synced: false, disabled: true });
    }

    const parsedBody = parseOr400(syncUserSchema, (await readJson(request)) ?? {});
    if (parsedBody.error) return parsedBody.error;
    const body = parsedBody.data;

    const result = await proxyJsonRequest(
      `${backendUrl}/api/auth/sync-user`,
      {
        method: "POST",
        headers: buildJsonHeaders(request, { Authorization: auth.authorization }),
        body: JSON.stringify(body),
      },
      "Failed to sync user",
      { request },
    );

    if (!result.ok) {
      return proxyErrorResponse(result);
    }

    return jsonSuccess(result.data ?? { success: true }, { status: result.status });
  } catch (error) {
    console.error("[api/sync-user] Unhandled error:", error);
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
