import * as React from "react";
import { toast } from "sonner";
import {
  checkFundingTrustline,
  establishTrustline,
  type FundingAsset,
} from "@/components/tw-blocks/wallet-kit/trustline-check";

/**
 * Pre-funding trustline guard shared by the fund-escrow dialog, form and
 * button (#418).
 *
 * `ensureTrustline` must be awaited before submitting the fund transaction:
 * it resolves `true` when funding can proceed and `false` when the wallet is
 * missing the trustline. In that case `missingAsset` is set and the UI shows
 * `<TrustlinePrompt>` so the user can establish it, instead of submitting a
 * transaction that would fail on-chain.
 */
export function useFundingTrustline(
  walletAddress: string | null | undefined,
  trustline: { address?: string; name?: string } | undefined,
) {
  const [missingAsset, setMissingAsset] = React.useState<FundingAsset | null>(null);
  const [accountNotFound, setAccountNotFound] = React.useState(false);
  const [isEstablishing, setIsEstablishing] = React.useState(false);

  const ensureTrustline = React.useCallback(async (): Promise<boolean> => {
    if (!walletAddress) return true; // the fund mutation reports the missing wallet
    const result = await checkFundingTrustline(walletAddress, trustline);
    if (result.status === "missing") {
      setMissingAsset(result.asset);
      setAccountNotFound(result.reason === "account-not-found");
      return false;
    }
    setMissingAsset(null);
    setAccountNotFound(false);
    return true;
  }, [walletAddress, trustline]);

  const establish = React.useCallback(async () => {
    if (!walletAddress || !missingAsset) return;
    try {
      setIsEstablishing(true);
      await establishTrustline(walletAddress, missingAsset);
      toast.success(`${missingAsset.name} trustline added. You can now fund the escrow.`);
      setMissingAsset(null);
    } catch (error) {
      toast.error(
        `Could not add the ${missingAsset.name} trustline: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    } finally {
      setIsEstablishing(false);
    }
  }, [walletAddress, missingAsset]);

  const dismiss = React.useCallback(() => setMissingAsset(null), []);

  return { ensureTrustline, missingAsset, accountNotFound, isEstablishing, establish, dismiss };
}
