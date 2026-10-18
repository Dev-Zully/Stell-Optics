import type { Meta, StoryObj } from "@storybook/react";
import { fn } from "@storybook/test";
import { DisputeArbitrationCard } from "./DisputeArbitrationCard";

const meta: Meta<typeof DisputeArbitrationCard> = {
  title: "Dispute/DisputeArbitrationCard",
  component: DisputeArbitrationCard,
  tags: ["autodocs"],
  args: {
    contractId: "CCONTRACT...ESCROW",
    engagementId: "engagement-42",
    evidenceUrl: "https://example.com/evidence.png",
    openedDate: "Oct 12, 2026",
    onEscalate: fn(),
    onResolve: fn(),
    onWithdraw: fn(),
  },
  argTypes: {
    status: {
      control: "select",
      options: ["open", "escalated", "under_review", "resolved", "withdrawn"],
    },
  },
};

export default meta;
type Story = StoryObj<typeof DisputeArbitrationCard>;

export const Open: Story = {
  args: { status: "open" },
};

export const Escalated: Story = {
  args: { status: "escalated" },
};

export const UnderReview: Story = {
  args: { status: "under_review" },
};

export const Resolved: Story = {
  args: { status: "resolved" },
};

export const Withdrawn: Story = {
  args: { status: "withdrawn" },
};

export const NoActionsAvailable: Story = {
  args: {
    status: "open",
    evidenceUrl: undefined,
    onEscalate: undefined,
    onResolve: undefined,
    onWithdraw: undefined,
  },
};
