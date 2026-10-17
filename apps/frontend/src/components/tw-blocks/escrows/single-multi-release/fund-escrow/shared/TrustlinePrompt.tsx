import * as React from "react";
import { AlertTriangle, Loader2 } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import type { FundingAsset } from "@/components/tw-blocks/wallet-kit/trustline-check";

type TrustlinePromptProps = {
  asset: FundingAsset;
  accountNotFound: boolean;
  isEstablishing: boolean;
  onEstablish: () => void;
  onDismiss: () => void;
};

/**
 * Shown when the funding wallet has no trustline for the escrow's asset
 * (#418). Lets the user establish it before any funding transaction is sent.
 */
export const TrustlinePrompt = ({
  asset,
  accountNotFound,
  isEstablishing,
  onEstablish,
  onDismiss,
}: TrustlinePromptProps) => (
  <Alert role="alert" className="mt-4">
    <AlertTriangle className="h-4 w-4" />
    <AlertTitle>{asset.name} trustline required</AlertTitle>
    <AlertDescription>
      {accountNotFound ? (
        <p>
          This wallet isn&apos;t active on the Stellar {asset.network} network yet. Fund it
          with XLM first, then add a {asset.name} trustline before funding this escrow.
        </p>
      ) : (
        <>
          <p>
            Your wallet must trust {asset.name} before it can send it. Add the trustline
            (a one-time transaction that reserves 0.5 XLM), then fund the escrow.
          </p>
          <div className="mt-3 flex gap-2">
            <Button
              type="button"
              size="sm"
              onClick={onEstablish}
              disabled={isEstablishing}
              className="cursor-pointer"
            >
              {isEstablishing ? (
                <div className="flex items-center">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span className="ml-2">Adding trustline...</span>
                </div>
              ) : (
                `Add ${asset.name} trustline`
              )}
            </Button>
            <Button type="button" size="sm" variant="ghost" onClick={onDismiss} disabled={isEstablishing}>
              Cancel
            </Button>
          </div>
        </>
      )}
    </AlertDescription>
  </Alert>
);
