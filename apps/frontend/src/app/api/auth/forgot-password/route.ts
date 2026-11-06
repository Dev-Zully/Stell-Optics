import { NextResponse } from "next/server";
import {
  forgotPasswordSchema,
  parseOr400,
  readJson,
} from "@/lib/server/validation";
import {
  getRequiredEnv,
  jsonError,
  proxyJsonRequest,
} from "@/app/api/_lib/http";

export async function POST(request: Request) {
  try {
    const parsed = parseOr400(forgotPasswordSchema, await readJson(request));
    if (parsed.error) return parsed.error;
    const { email } = parsed.data;

    const webhookUrl = getRequiredEnv("NEXT_PUBLIC_WEBHOOK_URL");
    if (!webhookUrl) {
      return jsonError("Webhook URL configuration error", 500);
    }

    const result = await proxyJsonRequest(
      `${webhookUrl}/webhooks/forgot-password`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email }),
      },
      "Failed to process request",
    );

    if (!result.ok) {
      return NextResponse.json(
        {
          error: result.data && typeof result.data === "object" && "error" in result.data
            ? String((result.data as { error?: string }).error ?? "Failed to process request")
            : "Failed to process request",
        },
        { status: result.status },
      );
    }

    return NextResponse.json(result.data ?? { success: true });
  } catch (error) {
    console.error("Forgot password API error:", error);
    return jsonError("Internal server error", 500);
  }
}
