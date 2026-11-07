import { getFeatureFlags } from "@/lib/featureFlags";
import {
  jsonSuccess,
  methodNotAllowed,
  optionsResponse,
  withSecurityHeaders,
} from "@/app/api/_lib/http";

// Read env at request time so flags can be toggled without a rebuild.
export const dynamic = "force-dynamic";

export async function GET() {
  const headers = withSecurityHeaders();
  return jsonSuccess(getFeatureFlags(), { headers });
}

export async function OPTIONS() {
  return optionsResponse(["GET", "OPTIONS"]);
}

export async function POST() {
  return methodNotAllowed(["GET", "OPTIONS"]);
}

export async function PUT() {
  return methodNotAllowed(["GET", "OPTIONS"]);
}

export async function PATCH() {
  return methodNotAllowed(["GET", "OPTIONS"]);
}

export async function DELETE() {
  return methodNotAllowed(["GET", "OPTIONS"]);
}
