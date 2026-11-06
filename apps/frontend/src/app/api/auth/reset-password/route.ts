import { NextResponse } from "next/server";
import {
  parseOr400,
  readJson,
  resetPasswordSchema,
} from "@/lib/server/validation";
import {
  getRequiredEnv,
  jsonError,
  proxyJsonRequest,
} from "@/app/api/_lib/http";

export async function POST(request: Request) {
  try {
    const parsed = parseOr400(resetPasswordSchema, await readJson(request));
    if (parsed.error) return parsed.error;
    const { token, newPassword } = parsed.data;

    const backendUrl = getRequiredEnv("BACKEND_URL");
    if (!backendUrl) {
      return jsonError("Backend URL configuration error", 500);
    }

    const result = await proxyJsonRequest(
      `${backendUrl}/api/auth/reset-password`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ token, newPassword }),
      },
      "Failed to reset password",
    );

    if (!result.ok) {
      return NextResponse.json(
        {
          error:
            result.data && typeof result.data === "object" && "error" in result.data
              ? String((result.data as { error?: string }).error ?? "Failed to reset password")
              : "Failed to reset password",
        },
        { status: result.status },
      );
    }

    return NextResponse.json(result.data ?? { success: true });
  } catch (error) {
    console.error("Reset password API error:", error);
    return jsonError("Internal server error", 500);
  }
}
