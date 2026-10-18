import type { Meta, StoryObj } from "@storybook/react";
import { ApolloClient, ApolloLink, InMemoryCache } from "@apollo/client";
import { ApolloProvider } from "@apollo/client/react";
import { RealTimeEscrowStatus } from "./RealTimeEscrowStatus";
import type { EscrowSubscriptionResult } from "@/hooks/useEscrowSubscription";

// Every story passes `subscription`, so the component's internal subscription
// is skipped — the client only exists to satisfy useSubscription's context.
const client = new ApolloClient({
  cache: new InMemoryCache(),
  link: ApolloLink.empty(),
});

// Always 5 minutes before render, so the relative label stays "5 minutes ago"
// across visual snapshots.
const updatedAt = new Date(Date.now() - 5 * 60 * 1000).toISOString();

function escrowWith(
  status: string,
  fundingStatuses: string[],
): EscrowSubscriptionResult {
  return {
    loading: false,
    error: undefined,
    escrow: {
      id: "esc-1",
      status,
      updated_at: updatedAt,
      transaction_hash: null,
      escrow_transaction_users: fundingStatuses.map((funding_status, i) => ({
        id: `user-${i}`,
        funding_status,
        funded_at: null,
        transaction_hash: null,
      })),
    },
  };
}

const meta: Meta<typeof RealTimeEscrowStatus> = {
  title: "Escrow/RealTimeEscrowStatus",
  component: RealTimeEscrowStatus,
  tags: ["autodocs"],
  args: { escrowId: "esc-1" },
  decorators: [
    (Story) => (
      <ApolloProvider client={client}>
        <Story />
      </ApolloProvider>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof RealTimeEscrowStatus>;

export const Loading: Story = {
  args: { subscription: { escrow: null, loading: true, error: undefined } },
};

export const ConnectionError: Story = {
  args: {
    subscription: {
      escrow: null,
      loading: false,
      error: new Error("WebSocket closed"),
    },
  },
};

export const Pending: Story = {
  args: { subscription: escrowWith("pending", ["pending", "pending"]) },
};

export const PartiallyFunded: Story = {
  args: { subscription: escrowWith("funded", ["funded", "pending"]) },
};

export const Released: Story = {
  args: { subscription: escrowWith("released", ["funded", "funded"]) },
};

export const Disputed: Story = {
  args: { subscription: escrowWith("disputed", ["funded", "funded"]) },
};
