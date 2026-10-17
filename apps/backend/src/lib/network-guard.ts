/**
 * Mainnet submission guard (#415).
 *
 * Refund execution signs and submits real Stellar transactions. Configuring
 * STELLAR_NETWORK / TRUSTLESS_WORK_API_URL correctly is the first line of
 * defence; this guard is the second: outside `NODE_ENV=production`, any
 * attempt to submit against mainnet is refused, even if the network config was
 * misconfigured. CI runners are always treated as non-production, so a CI job
 * cannot move real funds even with `NODE_ENV=production` set by mistake.
 *
 * A configuration is considered mainnet when EITHER signal points to it:
 *   - STELLAR_NETWORK=mainnet (signs with the PUBLIC network passphrase), or
 *   - TRUSTLESS_WORK_API_URL is Trustless Work's production API host.
 */

/** Trustless Work's production (mainnet) API host. Dev/testnet is dev.api.trustlesswork.com. */
export const TRUSTLESS_WORK_MAINNET_HOSTS = ["api.trustlesswork.com"] as const;

export interface NetworkGuardConfig {
  nodeEnv: string | undefined;
  stellarNetwork: string | undefined;
  trustlessWorkApiUrl: string | undefined;
  /** Raw `CI` env var — set to a truthy value by GitHub Actions and most CI providers. */
  ci?: string | undefined;
}

export class MainnetSubmissionBlockedError extends Error {
  constructor(public readonly reasons: string[]) {
    super(
      `Refusing to submit a mainnet transaction outside production (${reasons.join("; ")}). ` +
        "Set STELLAR_NETWORK=testnet and point TRUSTLESS_WORK_API_URL at https://dev.api.trustlesswork.com " +
        "for non-production environments.",
    );
    this.name = "MainnetSubmissionBlockedError";
  }
}

function isTruthyFlag(value: string | undefined): boolean {
  if (!value) return false;
  return !["0", "false", "no", "off"].includes(value.trim().toLowerCase());
}

/** Returns the reasons this configuration targets mainnet (empty when it does not). */
export function mainnetSignals(config: NetworkGuardConfig): string[] {
  const reasons: string[] = [];
  if (config.stellarNetwork === "mainnet") {
    reasons.push("STELLAR_NETWORK=mainnet");
  }
  if (config.trustlessWorkApiUrl) {
    try {
      const host = new URL(config.trustlessWorkApiUrl).hostname.toLowerCase();
      if ((TRUSTLESS_WORK_MAINNET_HOSTS as readonly string[]).includes(host)) {
        reasons.push(`TRUSTLESS_WORK_API_URL points at ${host}`);
      }
    } catch {
      // Malformed URLs are rejected by env validation; nothing to flag here.
    }
  }
  return reasons;
}

/** True only for a real production deployment (never on a CI runner). */
export function isProductionEnvironment(config: NetworkGuardConfig): boolean {
  return config.nodeEnv === "production" && !isTruthyFlag(config.ci);
}

/**
 * Throws `MainnetSubmissionBlockedError` when a non-production environment
 * would submit against mainnet. Call immediately before any on-chain
 * submission.
 */
export function assertMainnetSubmissionAllowed(config: NetworkGuardConfig): void {
  const reasons = mainnetSignals(config);
  if (reasons.length === 0 || isProductionEnvironment(config)) return;

  const envLabel = isTruthyFlag(config.ci) ? `CI=${config.ci}` : `NODE_ENV=${config.nodeEnv ?? "unset"}`;
  throw new MainnetSubmissionBlockedError([envLabel, ...reasons]);
}
