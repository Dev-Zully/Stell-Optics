import { summarizeEarnings, type PayoutEscrow } from "./earnings";

const e = (id: string, amount: number, releasedAt?: string, status = "released"): PayoutEscrow => ({
  id,
  listingName: id,
  amount,
  currency: "USDC",
  status,
  releasedAt,
});

const escrows = [
  e("a", 100, "2026-03-02T10:00:00Z"), // Monday
  e("b", 50, "2026-03-04T10:00:00Z"), // same week
  e("c", 200, "2026-04-15T10:00:00Z"),
  e("pending", 999, undefined, "funded"),
  e("disputed", 999, "2026-03-05T10:00:00Z", "disputed"),
];

describe("summarizeEarnings", () => {
  it("totals only released escrows", () => {
    const s = summarizeEarnings(escrows, "month");
    expect(s.total).toBe(350);
    expect(s.count).toBe(3);
  });

  it("buckets by month, oldest first", () => {
    const s = summarizeEarnings(escrows, "month");
    expect(s.buckets).toEqual([
      { key: "2026-03-01", total: 150, count: 2 },
      { key: "2026-04-01", total: 200, count: 1 },
    ]);
  });

  it("buckets by ISO week (Monday start)", () => {
    const s = summarizeEarnings(escrows, "week");
    expect(s.buckets[0]).toEqual({ key: "2026-03-02", total: 150, count: 2 });
  });

  it("buckets by day", () => {
    expect(summarizeEarnings(escrows, "day").buckets).toHaveLength(3);
  });

  it("returns an empty summary with no payouts", () => {
    expect(summarizeEarnings([], "month")).toEqual({ total: 0, count: 0, buckets: [] });
  });
});

describe("summarizeEarnings disputed/pending handling (#427)", () => {
  const mixed = [
    e("released-1", 100, "2026-03-02T10:00:00Z", "released"),
    e("completed-1", 250, "2026-03-03T10:00:00Z", "completed"),
    e("disputed-1", 500, "2026-03-04T10:00:00Z", "disputed"),
    e("funded-1", 300, undefined, "funded"),
    e("pending-1", 150, undefined, "pending"),
  ];

  it("(a) confirmed total only includes released/completed amounts", () => {
    const s = summarizeEarnings(mixed, "month");
    expect(s.total).toBe(350);
    expect(s.count).toBe(2);
  });

  it("(b) disputed escrows never contribute to confirmed total or count", () => {
    const withDisputed = summarizeEarnings(
      [e("released-1", 100, "2026-03-02T10:00:00Z", "released"), e("disputed-1", 500, "2026-03-04T10:00:00Z", "disputed")],
      "month",
    );
    const withoutDisputed = summarizeEarnings(
      [e("released-1", 100, "2026-03-02T10:00:00Z", "released")],
      "month",
    );
    expect(withDisputed.total).toBe(withoutDisputed.total);
    expect(withDisputed.count).toBe(withoutDisputed.count);
    expect(withDisputed.total).toBe(100);
    expect(withDisputed.count).toBe(1);
  });

  it("(c) pending total/bucket captures disputed amounts separately", () => {
    const s = summarizeEarnings(mixed, "month");
    expect(s.pendingTotal).toBe(950);
    expect(s.pendingCount).toBe(3);
    expect(s.pendingBuckets).toEqual([
      { key: "2026-03-01", total: 500, count: 1 },
      { key: "unreleased", total: 450, count: 2 },
    ]);
  });

  it("keeps disputed amounts out of confirmed buckets", () => {
    const s = summarizeEarnings(mixed, "month");
    expect(s.buckets).toEqual([
      { key: "2026-03-01", total: 350, count: 2 },
    ]);
  });
});