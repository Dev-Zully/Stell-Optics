"use client";

import { useMemo, useState } from "react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/chart-utils";
import { summarizeEarnings, type EarningsPeriod, type PayoutEscrow } from "@/lib/earnings";

const PERIODS: { value: EarningsPeriod; label: string }[] = [
  { value: "day", label: "Daily" },
  { value: "week", label: "Weekly" },
  { value: "month", label: "Monthly" },
];

const formatBucketLabel = (key: string, period: EarningsPeriod) =>
  new Date(`${key}T00:00:00Z`).toLocaleDateString("en-US", {
    timeZone: "UTC",
    month: "short",
    ...(period === "month" ? { year: "2-digit" } : { day: "numeric" }),
  });

export function SellerEarnings({ escrows }: { escrows: PayoutEscrow[] }) {
  const [period, setPeriod] = useState<EarningsPeriod>("month");
  const summary = useMemo(() => summarizeEarnings(escrows, period), [escrows, period]);
  const data = summary.buckets.map((b) => ({ ...b, label: formatBucketLabel(b.key, period) }));

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="p-4">
          <p className="text-sm text-muted-foreground">Confirmed earnings</p>
          <p className="text-3xl font-bold" data-testid="total-earnings">
            {summary.confirmedTotal.toLocaleString()} USDC
          </p>
        </Card>
        <Card className="p-4 border-amber-300 bg-amber-50 dark:bg-amber-950/20">
          <div className="flex items-center gap-2">
            <p className="text-sm text-muted-foreground">Pending / at-risk</p>
            <span className="rounded-full bg-amber-200 px-2 py-0.5 text-xs font-medium text-amber-900 dark:bg-amber-900 dark:text-amber-100">
              Pending
            </span>
          </div>
          <p className="text-3xl font-bold text-amber-700 dark:text-amber-400" data-testid="pending-earnings">
            {summary.pendingTotal.toLocaleString()} USDC
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Not yet available — awaiting release or under dispute.
          </p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-muted-foreground">Completed sales</p>
          <p className="text-3xl font-bold">{summary.count}</p>
        </Card>
      </div>

      <Card className="p-4 space-y-4">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <h2 className="font-semibold">Payouts by period</h2>
          <div className="flex gap-1" role="group" aria-label="Group payouts by">
            {PERIODS.map((p) => (
              <Button
                key={p.value}
                size="sm"
                variant={period === p.value ? "default" : "outline"}
                onClick={() => setPeriod(p.value)}
              >
                {p.label}
              </Button>
            ))}
          </div>
        </div>

        {data.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-10">
            No released escrows yet.
          </p>
        ) : (
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="label" />
                <YAxis tickFormatter={(v: number) => formatCurrency(v)} width={70} />
                <Tooltip formatter={(v) => [`${Number(v).toLocaleString()} USDC`, "Earned"]} />
                <Bar dataKey="total" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </Card>

      <Card className="p-4">
        <h2 className="font-semibold mb-3">Breakdown</h2>
        <table className="w-full text-sm">
          <thead className="text-left text-muted-foreground">
            <tr>
              <th className="py-1">Period starting</th>
              <th className="py-1">Sales</th>
              <th className="py-1 text-right">Earned</th>
            </tr>
          </thead>
          <tbody>
            {[...summary.buckets].reverse().map((b) => (
              <tr key={b.key} className="border-t">
                <td className="py-1.5">{formatBucketLabel(b.key, period)}</td>
                <td className="py-1.5">{b.count}</td>
                <td className="py-1.5 text-right">{b.total.toLocaleString()} USDC</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
