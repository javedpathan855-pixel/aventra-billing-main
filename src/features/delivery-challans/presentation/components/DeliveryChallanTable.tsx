import Link from "next/link";
import { Eye, Truck } from "lucide-react";
import type { DeliveryChallan } from "../../domain/entities/delivery-challan";
import { DeliveryChallanStatusBadge } from "./DeliveryChallanStatusBadge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/shared/components/table";

export type DeliveryChallanTableProps = {
  challans: DeliveryChallan[];
};

export const DeliveryChallanTable = ({ challans }: DeliveryChallanTableProps) => {
  if (challans.length === 0) {
    return (
      <div className="rounded-xl border border-border bg-surface-card p-12 text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-surface-alt text-text-muted">
          <Truck size={24} />
        </div>
        <h3 className="mt-4 text-base font-semibold text-text-primary">
          No delivery challans found
        </h3>
        <p className="mt-1 text-sm text-text-secondary max-w-sm mx-auto">
          No delivery documents match your search or filter criteria. Create a new dispatch challan against a sales order to begin.
        </p>
        <div className="mt-6">
          <Link
            href="/delivery-challans/new"
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary-light"
          >
            Create Delivery Challan
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-surface-card">
      <Table>
        <TableHeader>
          <TableRow className="border-b border-border/80 bg-surface-alt/40 hover:bg-surface-alt/40">
            <TableHead className="font-semibold text-text-secondary">
              Challan #
            </TableHead>
            <TableHead className="font-semibold text-text-secondary">
              Customer
            </TableHead>
            <TableHead className="font-semibold text-text-secondary">
              Order #
            </TableHead>
            <TableHead className="font-semibold text-text-secondary">
              Date
            </TableHead>
            <TableHead className="font-semibold text-text-secondary">
              Transport / Vehicle
            </TableHead>
            <TableHead className="font-semibold text-text-secondary text-right">
              Total Units
            </TableHead>
            <TableHead className="font-semibold text-text-secondary">
              Status
            </TableHead>
            <TableHead className="font-semibold text-text-secondary text-right">
              Actions
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {challans.map((challan) => {
            const totalDelivered = challan.items.reduce(
              (acc, it) => acc + it.deliveredQuantity,
              0,
            );
            const formattedDate = new Date(challan.challanDate).toLocaleDateString(
              "en-IN",
              {
                year: "numeric",
                month: "short",
                day: "numeric",
              },
            );

            return (
              <TableRow
                key={challan.id}
                className="border-b border-border/60 hover:bg-surface-alt/50 transition-colors"
              >
                <TableCell className="font-mono font-medium text-text-primary">
                  <Link
                    href={`/delivery-challans/${challan.id}`}
                    className="hover:text-primary-light transition-colors"
                  >
                    {challan.challanNumber}
                  </Link>
                </TableCell>
                <TableCell>
                  <div className="font-medium text-text-primary">
                    {challan.customerName}
                  </div>
                  {challan.customerAddress && (
                    <div className="text-xs text-text-secondary truncate max-w-50">
                      {challan.customerAddress}
                    </div>
                  )}
                </TableCell>
                <TableCell className="text-sm font-mono text-text-secondary">
                  {challan.salesOrderNumber ? (
                    <Link
                      href={`/sales-orders/${challan.salesOrderId}`}
                      className="hover:text-primary-light transition-colors"
                    >
                      {challan.salesOrderNumber}
                    </Link>
                  ) : (
                    "—"
                  )}
                </TableCell>
                <TableCell className="text-sm text-text-secondary whitespace-nowrap">
                  {formattedDate}
                </TableCell>
                <TableCell className="text-sm text-text-secondary">
                  <div>{challan.transporterName || "Direct Dispatch"}</div>
                  {challan.vehicleNumber && (
                    <div className="text-xs font-mono text-text-muted">
                      {challan.vehicleNumber}
                    </div>
                  )}
                </TableCell>
                <TableCell className="text-right font-medium text-text-primary whitespace-nowrap">
                  {totalDelivered}
                </TableCell>
                <TableCell>
                  <DeliveryChallanStatusBadge status={challan.status} />
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-2">
                    <Link
                      href={`/delivery-challans/${challan.id}`}
                      className="rounded p-1 text-text-muted hover:text-primary-light hover:bg-surface-alt transition-colors"
                      title="View challan details"
                    >
                      <Eye size={15} />
                    </Link>
                  </div>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
};
