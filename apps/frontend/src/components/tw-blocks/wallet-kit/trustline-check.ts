/**
 * Pre-funding trustline check (#418).
 *
 * A Stellar account can only hold a non-native asset (USDC, EURC, …) after it
 * has established a trustline to that asset's issuer. Funding an escrow in an
 * asset the wallet has no trustline for fails on-chain with a confusing error,
 * so the funding flows call `checkFundingTrustline` first. When the trustline
 * is missing, they prompt the user to establish it with
 * `establishTrustline`, which builds, signs and submits a `changeTrust` op.
 *
 * Builds on the network-aware asset registry in ./trustlines.ts.
 */
import {
  Asset,
  BASE_FEE,
  Horizon,
  Networks,
  Operation,
  TransactionBuilder,
} from "stellar-sdk";
import { kit } from "./wallet-kit";
import { getActiveNetwork, trustlines, type TrustlineAssetDefinition } from "./trustlines";

type StellarNetwork = "testnet" | "mainnet";

const HORIZON_URLS: Record<StellarNetwork, string> = {
  testnet: "https://horizon-testnet.stellar.org",
  mainnet: "https://horizon.stellar.org",
};

const NETWORK_PASSPHRASES: Record<StellarNetwork, string> = {
  testnet: Networks.TESTNET,
  mainnet: Networks.PUBLIC,
};

/** The asset the wallet needs a trustline for (classic code + issuer). */
export interface FundingAsset {
  code: string;
  issuer: string;
  name: string;
  network: StellarNetwork;
}

export type TrustlineCheckResult =
  /** Native XLM, or an asset the registry doesn't know — nothing to check. */
  | { status: "not-required" }
  | { status: "present"; asset: FundingAsset }
  | { status: "missing"; asset: FundingAsset; reason: "no-trustline" | "account-not-found" };

/**
 * Resolves an escrow's trustline (contract address or issuer) to a classic
 * asset from the registry. Returns `undefined` for native XLM or an unknown
 * asset.
 */
export function resolveFundingAsset(
  trustline: { address?: string; name?: string } | undefined,
  network: StellarNetwork = getActiveNetwork(),
): FundingAsset | undefined {
  if (!trustline?.address) return undefined;

  const match = (trustlines as TrustlineAssetDefinition[]).find(
    (t) =>
      t.network === network &&
      (t.address === trustline.address || t.issuer === trustline.address),
  );
  if (!match || match.issuer === "native") return undefined;

  return { code: match.symbol, issuer: match.issuer, name: match.name, network };
}

/** True when `balances` contains a trustline for `asset`. */
export function hasTrustlineFor(
  balances: Array<{ asset_type: string; asset_code?: string; asset_issuer?: string }>,
  asset: FundingAsset,
): boolean {
  return balances.some(
    (b) =>
      b.asset_type !== "native" &&
      b.asset_code === asset.code &&
      b.asset_issuer === asset.issuer,
  );
}

/**
 * Checks whether `walletAddress` can hold the escrow's funding asset. Call
 * before submitting any fund-escrow transaction.
 */
export async function checkFundingTrustline(
  walletAddress: string,
  trustline: { address?: string; name?: string } | undefined,
  network: StellarNetwork = getActiveNetwork(),
): Promise<TrustlineCheckResult> {
  const asset = resolveFundingAsset(trustline, network);
  if (!asset) return { status: "not-required" };

  const server = new Horizon.Server(HORIZON_URLS[network]);
  try {
    const account = await server.loadAccount(walletAddress);
    return hasTrustlineFor(account.balances, asset)
      ? { status: "present", asset }
      : { status: "missing", asset, reason: "no-trustline" };
  } catch (err) {
    const status = (err as { response?: { status?: number } })?.response?.status;
    if (status === 404) {
      return { status: "missing", asset, reason: "account-not-found" };
    }
    throw err;
  }
}

/**
 * Builds, signs (via the connected wallet) and submits a `changeTrust`
 * operation establishing a trustline for `asset`. Resolves with the tx hash.
 */
export async function establishTrustline(
  walletAddress: string,
  asset: FundingAsset,
): Promise<string> {
  const server = new Horizon.Server(HORIZON_URLS[asset.network]);
  const networkPassphrase = NETWORK_PASSPHRASES[asset.network];

  const account = await server.loadAccount(walletAddress);
  const tx = new TransactionBuilder(account, { fee: BASE_FEE, networkPassphrase })
    .addOperation(Operation.changeTrust({ asset: new Asset(asset.code, asset.issuer) }))
    .setTimeout(180)
    .build();

  const { signedTxXdr } = await kit.signTransaction(tx.toXDR(), {
    address: walletAddress,
    networkPassphrase,
  });

  const result = await server.submitTransaction(
    TransactionBuilder.fromXDR(signedTxXdr, networkPassphrase),
  );
  return result.hash;
}
