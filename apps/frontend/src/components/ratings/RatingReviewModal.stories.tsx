import type { Meta, StoryObj } from "@storybook/react";
import { fn, screen, userEvent, within } from "@storybook/test";
import { RatingReviewModal } from "./RatingReviewModal";

const meta: Meta<typeof RatingReviewModal> = {
  title: "Ratings/RatingReviewModal",
  component: RatingReviewModal,
  tags: ["autodocs"],
  args: {
    escrowId: "escrow-123",
    reviewerId: "user-buyer",
    reviewerName: "Alex",
    revieweeId: "user-seller",
    revieweeName: "Jordan",
    role: "buyer",
    onSubmitReview: fn(),
  },
};

export default meta;
type Story = StoryObj<typeof RatingReviewModal>;

const openModal: Story["play"] = async ({ canvasElement }) => {
  await userEvent.click(within(canvasElement).getByRole("button"));
};

export const Trigger: Story = {};

export const SellerTrigger: Story = {
  args: { role: "seller", revieweeName: "Alex" },
};

export const Open: Story = {
  play: openModal,
};

export const WithComment: Story = {
  play: async (context) => {
    await openModal(context);
    await userEvent.click(await screen.findByRole("button", { name: /Rate 4 of 5 stars/ }));
    await userEvent.type(
      screen.getByRole("textbox"),
      "Smooth transfer, tickets arrived well before the event.",
    );
  },
};

export const ModerationNotice: Story = {
  play: async (context) => {
    await openModal(context);
    await userEvent.type(await screen.findByRole("textbox"), "kys");
    await userEvent.click(screen.getByRole("button", { name: /submit/i }));
  },
};
