"use client";

import { DisputeHistoryTable } from "@/components/dispute/DisputeHistoryTable";

/** Dispute history for the signed-in user, paginated server-side (#417). */
export default function DisputesPage() {
  return (
    <div className="p-6 space-y-6 max-w-5xl">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold dark:text-white">Dispute history</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Every dispute you have raised, newest first.
        </p>
      </div>
      <DisputeHistoryTable />
    </div>
  );
}
