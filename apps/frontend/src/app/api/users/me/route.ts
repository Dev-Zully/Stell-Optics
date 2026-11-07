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
} from "@/app/api/_lib/http";

/**
 * DELETE /api/users/me
 *
 * Proxies the account-deletion request to the backend, which holds the
 * Hasura admin-secret and performs the data anonymization server-side
 * before deleting the Firebase Auth account.
 *
 * The frontend sends its Firebase ID token as a Bearer token; the backend
 * verifies it and uses the decoded uid/email to locate and anonymize the
 * user's row.
 */
export async function DELETE(request: Request) {
  try {
    const auth = requireAuthorizationHeader(request);
    if ("error" in auth) return auth.error;

    const backendUrl = getRequiredEnv("BACKEND_URL");
    if (!backendUrl) {
      return jsonError("Backend URL configuration error", 500, "CONFIG_ERROR");
    }

    const result = await proxyJsonRequest(
      `${backendUrl}/api/users/me`,
      {
        method: "DELETE",
        headers: buildJsonHeaders(request, { Authorization: auth.authorization }),
      },
      "Failed to delete user",
      { request },
    );

    if (!result.ok) {
      return proxyErrorResponse(result);
    }

    return jsonSuccess(result.data ?? { success: true, deleted: true }, { status: result.status });
  } catch (error) {
    console.error("[api/users/me] Unhandled error:", error);
    return jsonError("Internal server error", 500, "INTERNAL_ERROR");
  }
}

export async function OPTIONS() {
  return optionsResponse(["DELETE", "OPTIONS"]);
}

export async function GET() {
  return methodNotAllowed(["DELETE", "OPTIONS"]);
}

export async function POST() {
  return methodNotAllowed(["DELETE", "OPTIONS"]);
}

export async function PUT() {
  return methodNotAllowed(["DELETE", "OPTIONS"]);
}

export async function PATCH() {
  return methodNotAllowed(["DELETE", "OPTIONS"]);
}
