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
  forgotPasswordSchema,
  parseOr400,
  readJson,
} from "@/lib/server/validation";

export async function POST(request: Request) {
  try {
    const contentTypeError = requireJsonContentType(request);
    if (contentTypeError) return contentTypeError;

    const parsed = parseOr400(forgotPasswordSchema, await readJson(request));
    if (parsed.error) return parsed.error;
    const { email } = parsed.data;

    const webhookUrl = getRequiredEnv("NEXT_PUBLIC_WEBHOOK_URL");
    if (!webhookUrl) {
      return jsonError("Webhook URL configuration error", 500, "CONFIG_ERROR");
    }

    const result = await proxyJsonRequest(
      `${webhookUrl}/webhooks/forgot-password`,
      {
        method: "POST",
        headers: buildJsonHeaders(request),
        body: JSON.stringify({ email }),
      },
      "Failed to process request",
      { request },
    );

    if (!result.ok) {
      return proxyErrorResponse(result);
    }

    return jsonSuccess(result.data ?? { success: true }, { status: result.status });
  } catch (error) {
    console.error("[api/forgot-password] Unhandled error:", error);
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
