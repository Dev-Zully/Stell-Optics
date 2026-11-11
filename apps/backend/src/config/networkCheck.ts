/**
 * Network configuration assertion (#414).
 *
 * Called at startup (index.ts) to fail fast when the frontend and backend
 * disagree on the Stellar network (testnet vs mainnet). Mismatched networks
 * cause refunds to submit against the wrong ledger, so this must never be
 * silently ignored.
 *
 * Reads FRONTEND_TRUSTLESS_NETWORK (optional — unset means the frontend
 * isn't configured yet, e.g. local dev) and STELLAR_NETWORK from env.
 */
import { env } from "../config/env";

export function assertNetworkConfigMatches(): void {
  const frontend = env.FRONTEND_TRUSTLESS_NETWORK;
  const backend = env.STELLAR_NETWORK;

  if (!frontend) {
    return;
  }

  if (frontend !== backend) {
    const message = `❌ Network mismatch: frontend is configured for '${frontend}' but the backend STELLAR_NETWORK is '${backend}'. Both must agree (testnet or mainnet) before refunds can execute safely.`;
    console.error(message);
    throw new Error(message);
  }
}
