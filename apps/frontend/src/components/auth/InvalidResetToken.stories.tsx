import type { Meta, StoryObj } from "@storybook/react";
import InvalidResetToken from "./InvalidResetToken";

const meta: Meta<typeof InvalidResetToken> = {
  title: "Auth/InvalidResetToken",
  component: InvalidResetToken,
  tags: ["autodocs"],
};

export default meta;
type Story = StoryObj<typeof InvalidResetToken>;

export const Default: Story = {};
