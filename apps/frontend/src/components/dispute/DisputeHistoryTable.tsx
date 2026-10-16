"use client";

import { ChevronLeft, ChevronRight, Scale } from "lucide-react";
import { useEffect, useState } from "react";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DISPUTE_PAGE_SIZE_OPTIONS,
  type DisputeHistoryPage,
  type DisputePageSize,
  fetchDisputeHistory,
} from "@/lib/dispute-history-api";

/**
 * Dispute history for the current user (#417).
 *
 * Paginated server-side: only one bounded page (`limit` ≤ 50) is fetched and
 * rendered at a time, so a user with many past disputes never loads an
 * unbounded list. Controls mirror EscrowTable / WalletAddressTable.
 */

const stateBadgeVariant = {
  OPEN: "outline",
  ESCALATED: "destructive",
  RESOLVED: "default",
  WITHDRAWN: "secondary",
} as const;

function DisputeRowSkeleton() {
  return (
    <TableRow>
      <TableCell><Skeleton className="h-4 w-24" /></TableCell>
      <TableCell><Skeleton className="h-4 w-28" /></TableCell>
      <TableCell><Skeleton className="h-4 w-40" /></TableCell>
      <TableCell><Skeleton className="h-5 w-20 rounded-full" /></TableCell>
      <TableCell><Skeleton className="h-4 w-24" /></TableCell>
    </TableRow>
  );
}

function shortId(id: string): string {
  return id.length > 12 ? `${id.slice(0, 6)}…${id.slice(-4)}` : id;
}

export function DisputeHistoryTable() {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<DisputePageSize>(10);
  const [data, setData] = useState<DisputeHistoryPage | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    setIsLoading(true);
    setError(null);

    fetchDisputeHistory({ limit: pageSize, offset: (page - 1) * pageSize }, controller.signal)
      .then((result) => {
        // If the current page went out of range (e.g. total shrank), step back.
        if (result.disputes.length === 0 && result.pagination.total > 0 && page > 1) {
          setPage(Math.max(1, Math.ceil(result.pagination.total / pageSize)));
          return;
        }
        setData(result);
      })
      .catch((err: unknown) => {
        if (controller.signal.aborted) return;
        setError(err instanceof Error ? err.message : "Failed to load disputes");
      })
      .finally(() => {
        if (!controller.signal.aborted) setIsLoading(false);
      });

    return () => controller.abort();
  }, [page, pageSize, reloadKey]);

  const disputes = data?.disputes ?? [];
  const totalItems = data?.pagination.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const startIndex = (page - 1) * pageSize;

  return (
    <div className="rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Dispute</TableHead>
            <TableHead>Escrow</TableHead>
            <TableHead>Reason</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Opened</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading ? (
            Array.from({ length: Math.min(pageSize, 5) }).map((_, i) => <DisputeRowSkeleton key={i} />)
          ) : error ? (
            <TableRow>
              <TableCell colSpan={5}>
                <EmptyState
                  icon={Scale}
                  variant="error"
                  title="Couldn't load your disputes"
                  description={error}
                  actionLabel="Retry"
                  onAction={() => setReloadKey((k) => k + 1)}
                />
              </TableCell>
            </TableRow>
          ) : disputes.length === 0 ? (
            <TableRow>
              <TableCell colSpan={5}>
                <EmptyState
                  icon={Scale}
                  title="No disputes yet"
                  description="Disputes you raise on an escrow will appear here."
                />
              </TableCell>
            </TableRow>
          ) : (
            disputes.map((dispute) => (
              <TableRow key={dispute.disputeId}>
                <TableCell className="font-mono text-xs" title={dispute.disputeId}>
                  {shortId(dispute.disputeId)}
                </TableCell>
                <TableCell className="font-mono text-xs" title={dispute.escrowId}>
                  {shortId(dispute.escrowId)}
                </TableCell>
                <TableCell className="max-w-xs truncate" title={dispute.reason}>
                  {dispute.reason}
                </TableCell>
                <TableCell>
                  <Badge variant={stateBadgeVariant[dispute.state] ?? "outline"}>
                    {dispute.state.charAt(0) + dispute.state.slice(1).toLowerCase()}
                  </Badge>
                </TableCell>
                <TableCell className="text-sm text-gray-500 dark:text-gray-400">
                  {format(new Date(dispute.openedAt), "MMM d, yyyy")}
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>

      {/* Pagination controls */}
      <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200 dark:border-slate-700">
        <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
          <span>Rows per page:</span>
          <select
            value={pageSize}
            onChange={(e) => {
              setPageSize(Number(e.target.value) as DisputePageSize);
              setPage(1);
            }}
            className="rounded border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-900 px-2 py-1 text-sm text-gray-900 dark:text-gray-300"
            aria-label="Rows per page"
          >
            {DISPUTE_PAGE_SIZE_OPTIONS.map((size) => (
              <option key={size} value={size}>{size}</option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-3 text-sm text-gray-500 dark:text-gray-400">
          <span>
            {totalItems === 0
              ? "0 results"
              : `${startIndex + 1}–${Math.min(startIndex + pageSize, totalItems)} of ${totalItems}`}
          </span>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={isLoading || page <= 1}
              aria-label="Previous page"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={isLoading || !data?.pagination.hasMore}
              aria-label="Next page"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
