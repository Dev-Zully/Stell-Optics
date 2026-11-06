import { NextResponse } from "next/server";
import { parseOr400, validateResetTokenSchema } from "@/lib/server/validation";
import { getRequiredEnv, jsonError, proxyJsonRequest } from "@/app/api/_lib/http";

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
      return jsonError("Backend URL configuration error", 500);
    }

    const url = `${backendUrl}/api/auth/validate-reset-token?token=${encodeURIComponent(token)}`;
    const result = await proxyJsonRequest(url, { method: "GET" }, "Failed to validate token");

    if (!result.ok) {
      return NextResponse.json(
        {
          error:
            result.data && typeof result.data === "object" && "error" in result.data
              ? String((result.data as { error?: string }).error ?? "Failed to validate token")
              : "Failed to validate token",
        },
        { status: result.status },
      );
    }

    return NextResponse.json(result.data ?? { valid: true });
  } catch (error) {
    console.error("Validate token API error:", error);
    return jsonError("Internal server error", 500);
  }
}
