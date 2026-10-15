import type { SupplierPaymentStatus } from "../../domain/supplier-payment";
import { cn } from "@/shared/utils/cn";

const statusDotClass: Record<SupplierPaymentStatus, string> = {
  Active: "bg-success",
  Reversed: "bg-text-muted",
};

const statusBadgeClass: Record<SupplierPaymentStatus, string> = {
  Active: "bg-success/10 text-success border-success/25",
  Reversed: "bg-surface-alt text-text-muted border-border",
};

export const SupplierPaymentStatusBadge = ({
  status,
}: {
  status: SupplierPaymentStatus;
}) => (
  <span
    className={cn(
      "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium tracking-tight",
      statusBadgeClass[status] || statusBadgeClass.Active,
    )}
  >
    <span
      className={cn(
        "h-1.5 w-1.5 rounded-full shrink-0",
        statusDotClass[status] || statusDotClass.Active,
      )}
      aria-hidden="true"
    />
    <span>{status}</span>
  </span>
);
