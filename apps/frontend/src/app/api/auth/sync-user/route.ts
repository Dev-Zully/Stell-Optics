import { NextResponse } from "next/server";
import { parseOr400, readJson, syncUserSchema } from "@/lib/server/validation";
import { getRequiredEnv, jsonError, proxyJsonRequest } from "@/app/api/_lib/http";

export async function POST(request: Request) {
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
      console.warn("BACKEND_URL not set — skipping user sync");
      return NextResponse.json({ success: true, synced: false, disabled: true });
    }

    const parsedBody = parseOr400(syncUserSchema, (await readJson(request)) ?? {});
    if (parsedBody.error) return parsedBody.error;
    const body = parsedBody.data;

    const result = await proxyJsonRequest(
      `${backendUrl}/api/auth/sync-user`,
      {
        method: "POST",
        headers: {
          Authorization: authorization,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      },
      "Failed to sync user",
    );

    if (!result.ok) {
      return NextResponse.json(
        {
          error:
            result.data && typeof result.data === "object" && "error" in result.data
              ? String((result.data as { error?: string }).error ?? "Failed to sync user")
              : "Failed to sync user",
        },
        { status: result.status },
      );
    }

    return NextResponse.json(result.data ?? { success: true });
  } catch (error) {
    console.error("Sync user API error:", error);
    return jsonError("Internal server error", 500);
  }
}
