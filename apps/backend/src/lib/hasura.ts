import { env } from "../config/env";
import { getRequestId } from "./requestLogger";

interface HasuraResponse<T> {
  data?: T;
  errors?: Array<{ message: string }>;
}

export interface HasuraRequestOptions {
  /**
   * Correlation ID for the originating request. When omitted, the ID from the
   * active request context (if any) is used so status updates in the
   * refund→dispute→changelog chain stay traceable.
   */
  requestId?: string;
}

export interface HasuraClient {
  request<T>(
    query: string,
    variables?: Record<string, unknown>,
    options?: HasuraRequestOptions
  ): Promise<T>;
}

function requireHasuraConfig(): { url: string; adminSecret: string } {
  const url = env.HASURA_GRAPHQL_URL;
  const adminSecret = env.HASURA_ADMIN_SECRET;

  if (!url || !adminSecret) {
    throw new Error(
      "HASURA_GRAPHQL_URL and HASURA_GRAPHQL_ADMIN_SECRET must be configured for Hasura requests"
    );
  }

  return { url, adminSecret };
}

/**
 * Creates the backend-only Hasura admin client.
 *
 * The admin secret is read from validated server environment configuration and
 * is sent only in the request header. It is never included in logs, errors, or
 * the returned client object.
 */
export function createHasuraClient(): HasuraClient {
  return {
    async request<T>(
      query: string,
      variables: Record<string, unknown> = {},
      options: HasuraRequestOptions = {}
    ): Promise<T> {
      const { url, adminSecret } = requireHasuraConfig();
      const requestId = options.requestId ?? getRequestId();
      const headers: Record<string, string> = {
        "content-type": "application/json",
        "x-hasura-admin-secret": adminSecret,
      };
      if (requestId) {
        headers["x-request-id"] = requestId;
      }

      const response = await fetch(url, {
        method: "POST",
        headers,
        body: JSON.stringify({ query, variables }),
      });

      const json = (await response.json()) as HasuraResponse<T>;
      if (!response.ok || json.errors?.length) {
        const detail = json.errors?.map(({ message }) => message).join("; ") ?? response.statusText;
        const context = requestId ? ` (requestId=${requestId})` : "";
        throw new Error(`Hasura request failed${context}: ${detail}`);
      }
      if (json.data === undefined) {
        const context = requestId ? ` (requestId=${requestId})` : "";
        throw new Error(`Hasura request returned no data${context}`);
      }
      return json.data;
    },
  };
}

export const hasuraClient = createHasuraClient();

export async function hasuraRequest<T>(
  query: string,
  variables: Record<string, unknown> = {},
  options: HasuraRequestOptions = {}
): Promise<T> {
  return hasuraClient.request<T>(query, variables, options);
}

export interface EscrowStatusRow {
  id: string;
  contract_id: string;
  status: string;
  updated_at: string;
}

interface EscrowStatusQueryResult {
  escrow_transactions: EscrowStatusRow[];
}

/**
 * Fetches a sample of recent escrow transactions from Hasura so their stored
 * status can be reconciled against Trustless Work's live state.
 *
 * This is a read-only helper used by the reconciliation job; it does not touch
 * the webhook write path that remains the single authoritative writer of
 * `escrow_transactions.status`.
 */
export async function fetchRecentEscrowStatuses(
  limit = 50,
  options: HasuraRequestOptions = {}
): Promise<EscrowStatusRow[]> {
  const query = `
    query RecentEscrowStatuses($limit: Int!) {
      escrow_transactions(order_by: { updated_at: desc }, limit: $limit) {
        id
        contract_id
        status
        updated_at
      }
    }
  `;

  const data = await hasuraRequest<EscrowStatusQueryResult>(query, { limit }, options);
  return data.escrow_transactions ?? [];
}
