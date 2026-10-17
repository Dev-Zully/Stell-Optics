import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Disputes | TrueStub",
};

export default function DisputesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
