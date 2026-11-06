import { NextResponse } from "next/server";
import { getRequiredEnv, jsonError, proxyJsonRequest } from "@/app/api/_lib/http";

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
    const authorization = request.headers.get("authorization");

    if (!authorization) {
      return NextResponse.json(
        { error: "Authorization header is required" },
        { status: 401 },
      );
    }

    const backendUrl = getRequiredEnv("BACKEND_URL");
    if (!backendUrl) {
      return jsonError("Backend URL configuration error", 500);
    }

    const result = await proxyJsonRequest(
      `${backendUrl}/api/users/me`,
      {
        method: "DELETE",
        headers: {
          Authorization: authorization,
          "Content-Type": "application/json",
        },
      },
      "Failed to delete user",
    );

    if (!result.ok) {
      return NextResponse.json(
        {
          error:
            result.data && typeof result.data === "object" && "error" in result.data
              ? String((result.data as { error?: string }).error ?? "Failed to delete user")
              : "Failed to delete user",
        },
        { status: result.status },
      );
    }

    return NextResponse.json(result.data ?? { success: true, deleted: true });
  } catch (error) {
    console.error("Delete user API error:", error);
    return jsonError("Internal server error", 500);
  }
}
