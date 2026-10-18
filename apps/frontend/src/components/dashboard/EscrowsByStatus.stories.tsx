import type { Meta, StoryObj } from "@storybook/react";
import { EscrowsByStatus } from "./EscrowsByStatus";
import type { EscrowData } from "./RoleEscrowDashboard";

const baseEscrow = {
  contractId: "CBIELTK6YBZJU5UP2WWQEUCYKLPU6AUNZ2BQ4WWFEIE3USCIHMXQDAMA",
  asset: { code: "USDC" },
  marker: "GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5",
  createdAt: "2026-09-01T12:00:00Z",
  updatedAt: "2026-09-02T12:00:00Z",
};

const escrows: EscrowData[] = [
  { ...baseEscrow, id: "esc-1", status: "pending", amount: 120 },
  { ...baseEscrow, id: "esc-2", status: "funded", amount: 250 },
  { ...baseEscrow, id: "esc-3", status: "funded", amount: 80 },
  { ...baseEscrow, id: "esc-4", status: "transfer_confirmed", amount: 300 },
  { ...baseEscrow, id: "esc-5", status: "completed", amount: 450 },
  { ...baseEscrow, id: "esc-6", status: "cancelled", amount: 60 },
];

const meta: Meta<typeof EscrowsByStatus> = {
  title: "Dashboard/EscrowsByStatus",
  component: EscrowsByStatus,
  tags: ["autodocs"],
  args: { escrows },
  argTypes: {
    userRole: { control: "select", options: ["guest", "event", "admin"] },
  },
};

export default meta;
type Story = StoryObj<typeof EscrowsByStatus>;

export const Guest: Story = { args: { userRole: "guest" } };

export const EventOrganizer: Story = { args: { userRole: "event" } };

export const Admin: Story = { args: { userRole: "admin" } };

export const Empty: Story = { args: { userRole: "guest", escrows: [] } };
