import {
  buildJsonHeaders,
  jsonSuccess,
  methodNotAllowed,
  optionsResponse,
  withSecurityHeaders,
} from "./http";

type HealthStatus = "ok" | "degraded" | "misconfigured";

function envPresence(name: string) {
  return Boolean(process.env[name]?.trim());
}

export async function GET() {
  const checks = {
    backendUrl: envPresence("BACKEND_URL"),
    webhookUrl: envPresence("NEXT_PUBLIC_WEBHOOK_URL"),
  };

  const configured = Object.values(checks).every(Boolean);
  const status: HealthStatus = configured ? "ok" : "misconfigured";

  const payload = {
    status,
    service: "stelloptics-frontend-api",
    timestamp: new Date().toISOString(),
    checks,
  };

  const headers = buildJsonHeaders(undefined, withSecurityHeaders());
  return jsonSuccess(payload, { status: configured ? 200 : 503, headers });
}

export async function HEAD() {
  return new Response(null, { status: 200, headers: withSecurityHeaders() });
}

export async function OPTIONS() {
  return optionsResponse(["GET", "HEAD", "OPTIONS"]);
}

export async function POST() {
  return methodNotAllowed(["GET", "HEAD", "OPTIONS"]);
}

export async function PUT() {
  return methodNotAllowed(["GET", "HEAD", "OPTIONS"]);
}

export async function PATCH() {
  return methodNotAllowed(["GET", "HEAD", "OPTIONS"]);
}

export async function DELETE() {
  return methodNotAllowed(["GET", "HEAD", "OPTIONS"]);
}
