import type { Meta, StoryObj } from "@storybook/react";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "./table";
import { Badge } from "./badge";

const rows = [
  { id: "PUR-1042", event: "Summer Sound Festival", amount: "250 USDC", status: "Funded" },
  { id: "PUR-1043", event: "City Derby Final", amount: "1,200 XLM", status: "Pending" },
  { id: "PUR-1044", event: "Opera Night", amount: "90 EURC", status: "Released" },
];

const meta: Meta<typeof Table> = {
  title: "UI/Table",
  component: Table,
  tags: ["autodocs"],
};

export default meta;
type Story = StoryObj<typeof Table>;

export const Default: Story = {
  render: () => (
    <Table>
      <TableCaption>Recent escrows</TableCaption>
      <TableHeader>
        <TableRow>
          <TableHead>Purchase ID</TableHead>
          <TableHead>Event</TableHead>
          <TableHead>Amount</TableHead>
          <TableHead className="text-right">Status</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((row) => (
          <TableRow key={row.id}>
            <TableCell className="font-mono">{row.id}</TableCell>
            <TableCell>{row.event}</TableCell>
            <TableCell>{row.amount}</TableCell>
            <TableCell className="text-right">
              <Badge variant="outline">{row.status}</Badge>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  ),
};

export const Empty: Story = {
  render: () => (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Purchase ID</TableHead>
          <TableHead>Event</TableHead>
          <TableHead>Amount</TableHead>
          <TableHead className="text-right">Status</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        <TableRow>
          <TableCell colSpan={4} className="h-24 text-center text-muted-foreground">
            No escrows yet.
          </TableCell>
        </TableRow>
      </TableBody>
    </Table>
  ),
};
