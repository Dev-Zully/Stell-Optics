import type { Meta, StoryObj } from "@storybook/react";
import { fn, screen, userEvent, within } from "@storybook/test";
import { RaiseDisputeModal } from "./RaiseDisputeModal";

const meta: Meta<typeof RaiseDisputeModal> = {
  title: "Dispute/RaiseDisputeModal",
  component: RaiseDisputeModal,
  tags: ["autodocs"],
  args: {
    contractId: "CCONTRACT...ESCROW",
    engagementId: "engagement-42",
    userRole: "buyer",
    onDisputeRaised: fn(),
  },
};

export default meta;
type Story = StoryObj<typeof RaiseDisputeModal>;

const openModal: Story["play"] = async ({ canvasElement }) => {
  await userEvent.click(within(canvasElement).getByRole("button"));
};

export const Trigger: Story = {};

export const Open: Story = {
  play: openModal,
};

export const Filled: Story = {
  play: async (context) => {
    await openModal(context);
    await userEvent.type(
      await screen.findByLabelText(/statement/i),
      "The seller never transferred the tickets before the agreed deadline.",
    );
    await userEvent.type(screen.getByRole("textbox", { name: /evidence/i }), "https://example.com/chat.png");
  },
};
