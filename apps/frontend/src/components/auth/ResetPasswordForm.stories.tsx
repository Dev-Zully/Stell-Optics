import type { Meta, StoryObj } from "@storybook/react";
import { fn } from "@storybook/test";
import ResetPasswordForm from "./ResetPasswordForm";

const meta: Meta<typeof ResetPasswordForm> = {
  title: "Auth/ResetPasswordForm",
  component: ResetPasswordForm,
  tags: ["autodocs"],
  args: {
    onSubmit: fn(async () => {}),
    isValidToken: true,
  },
  decorators: [
    (Story) => (
      <div className="max-w-md">
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof ResetPasswordForm>;

export const Default: Story = {};

/** Submit is disabled when the reset token from the email link is invalid. */
export const InvalidToken: Story = { args: { isValidToken: false } };
