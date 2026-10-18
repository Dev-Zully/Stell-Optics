import type { Meta, StoryObj } from "@storybook/react";
import { fn } from "@storybook/test";
import { StarRating } from "./StarRating";

const meta: Meta<typeof StarRating> = {
  title: "Ratings/StarRating",
  component: StarRating,
  tags: ["autodocs"],
  argTypes: {
    size: {
      control: "select",
      options: ["sm", "md", "lg"],
    },
  },
};

export default meta;
type Story = StoryObj<typeof StarRating>;

export const Default: Story = {
  args: { rating: 4 },
};

export const HalfStar: Story = {
  args: { rating: 3.5, showNumber: true },
};

export const Empty: Story = {
  args: { rating: 0 },
};

export const WithReviewCount: Story = {
  args: { rating: 4.7, showNumber: true, reviewCount: 128 },
};

export const Small: Story = {
  args: { rating: 4, size: "sm" },
};

export const Large: Story = {
  args: { rating: 4, size: "lg" },
};

export const Interactive: Story = {
  args: { rating: 3, interactive: true, size: "lg", onChange: fn() },
};
