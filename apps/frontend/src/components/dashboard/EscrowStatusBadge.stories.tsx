import type { Meta, StoryObj } from "@storybook/react";
import { EscrowStatusBadge } from "./EscrowStatusBadge";

const meta: Meta<typeof EscrowStatusBadge> = {
  title: "Dashboard/EscrowStatusBadge",
  component: EscrowStatusBadge,
  tags: ["autodocs"],
  argTypes: {
    status: {
      control: "select",
      options: [
        "PENDING",
        "ACTIVE",
        "FUNDED",
        "COMPLETED",
        "RELEASED",
        "DISPUTED",
        "IN_DISPUTE",
        "RESOLVED",
        "CANCELLED",
      ],
    },
  },
};

export default meta;
type Story = StoryObj<typeof EscrowStatusBadge>;

export const Pending: Story = { args: { status: "PENDING" } };

export const Funded: Story = { args: { status: "FUNDED" } };

export const Released: Story = { args: { status: "RELEASED" } };

export const InDispute: Story = { args: { status: "in_dispute" } };

export const Resolved: Story = { args: { status: "RESOLVED" } };

export const Cancelled: Story = { args: { status: "CANCELLED" } };

/** Unrecognised statuses fall back to a neutral badge showing the raw value. */
export const UnknownStatus: Story = { args: { status: "awaiting_review" } };

export const AllStatuses: Story = {
  render: () => (
    <div className="flex flex-wrap gap-2">
      {["PENDING", "ACTIVE", "FUNDED", "COMPLETED", "RELEASED", "DISPUTED", "RESOLVED", "CANCELLED"].map(
        (status) => (
          <EscrowStatusBadge key={status} status={status} />
        ),
      )}
    </div>
  ),
};
