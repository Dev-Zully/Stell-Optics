import * as React from "react";
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Loader2 } from "lucide-react";
import { useFundEscrow } from "./useFundEscrow";
import { TrustlinePrompt } from "../shared/TrustlinePrompt";

export const FundEscrowDialog = () => {
  const { form, handleSubmit, isSubmitting, trustlineGuard } = useFundEscrow();

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button type="button" className="cursor-pointer w-full">
          Fund
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Fund Escrow</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={handleSubmit}>
            <FormField
              control={form.control}
              name="amount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Amount</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      placeholder="Enter amount"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {trustlineGuard.missingAsset && (
              <TrustlinePrompt
                asset={trustlineGuard.missingAsset}
                accountNotFound={trustlineGuard.accountNotFound}
                isEstablishing={trustlineGuard.isEstablishing}
                onEstablish={trustlineGuard.establish}
                onDismiss={trustlineGuard.dismiss}
              />
            )}

            <div className="mt-4">
              <Button
                type="submit"
                disabled={isSubmitting}
                className="cursor-pointer"
              >
                {isSubmitting ? (
                  <div className="flex items-center">
                    <Loader2 className="h-5 w-5 animate-spin" />
                    <span className="ml-2">Funding...</span>
                  </div>
                ) : (
                  "Fund"
                )}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};
