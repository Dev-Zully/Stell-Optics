import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { fundEscrowSchema, type FundEscrowValues } from "./schema";
import { toast } from "sonner";
import { FundEscrowPayload } from "@trustless-work/escrow";
import { useEscrowContext } from "@/components/tw-blocks/providers/EscrowProvider";
import { useEscrowsMutations } from "@/components/tw-blocks/tanstack/useEscrowsMutations";
import {
  ErrorResponse,
  handleError,
} from "@/components/tw-blocks/handle-errors/handle";
import { useWalletContext } from "@/components/tw-blocks/wallet-kit/WalletProvider";
import { useFundingTrustline } from "../shared/useFundingTrustline";

export function useFundEscrow() {
  const { fundEscrow } = useEscrowsMutations();
  const { selectedEscrow, updateEscrow } = useEscrowContext();
  const { walletAddress } = useWalletContext();
  const trustlineGuard = useFundingTrustline(walletAddress, selectedEscrow?.trustline);

  const form = useForm<FundEscrowValues>({
    resolver: zodResolver(fundEscrowSchema),
    defaultValues: {
      amount: 0,
    },
    mode: "onChange",
  });

  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const handleSubmit = form.handleSubmit(async (payload) => {
    let awaitingTrustline = false;
    try {
      setIsSubmitting(true);

      // Confirm the wallet can hold the escrow's asset before funding (#418);
      // otherwise prompt for the trustline instead of failing on-chain.
      if (!(await trustlineGuard.ensureTrustline())) {
        awaitingTrustline = true;
        return;
      }

      /**
       * Create the final payload for the fund escrow mutation
       *
       * @param payload - The payload from the form
       * @returns The final payload for the fund escrow mutation
       */
      const finalPayload: FundEscrowPayload = {
        amount:
          typeof payload.amount === "string"
            ? Number(payload.amount)
            : payload.amount,
        contractId: selectedEscrow?.contractId || "",
        signer: walletAddress || "",
      };

      /**
       * Call the fund escrow mutation
       *
       * @param payload - The final payload for the fund escrow mutation
       * @param type - The type of the escrow
       * @param address - The address of the escrow
       */
      await fundEscrow.mutateAsync({
        payload: finalPayload,
        type: selectedEscrow?.type || "multi-release",
        address: walletAddress || "",
      });

      updateEscrow({
        ...selectedEscrow,
        balance: (selectedEscrow?.balance || 0) + finalPayload.amount,
      });

      toast.success("Escrow funded successfully");

      // do something with the response ...
    } catch (error) {
      toast.error(handleError(error as ErrorResponse).message);
    } finally {
      setIsSubmitting(false);
      // Keep the entered amount while the trustline prompt is open.
      if (!awaitingTrustline) form.reset();
    }
  });

  return { form, handleSubmit, isSubmitting, trustlineGuard };
}
