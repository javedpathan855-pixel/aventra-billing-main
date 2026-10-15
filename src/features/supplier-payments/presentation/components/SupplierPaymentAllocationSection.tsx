import { ReceiptText } from "lucide-react";
import type { ChangeEvent } from "react";
import { Checkbox, Input, Label } from "@/shared/components/form";
import { formatCurrency } from "../../domain/supplier-payment";
import type { PayableBillOption } from "../../data/queries/get-payable-bills";

export type AllocationDraft = {
  purchaseBillId: string;
  amount: number;
};

export type SupplierPaymentAllocationSectionProps = {
  payableBills?: PayableBillOption[];
  allocations?: AllocationDraft[];
  onToggleBill?: (billId: string) => void;
  onAllocationAmountChange?: (billId: string, amount: number) => void;
  errors?: Record<string, string>;
};

export const SupplierPaymentAllocationSection = ({
  payableBills = [],
  allocations = [],
  onToggleBill = () => {},
  onAllocationAmountChange = () => {},
  errors = {},
}: SupplierPaymentAllocationSectionProps) => {
  const allocatedByBill = new Map(
    allocations.map((line) => [line.purchaseBillId, line.amount]),
  );
  const allocatedTotal = allocations.reduce((sum, line) => sum + line.amount, 0);

  return (
    <section className="rounded-xl border border-border bg-surface-card p-5 sm:p-6 transition-colors">
      {/* Section Header */}
      <div className="flex items-center gap-3">
        <div
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-border/70 bg-surface-alt/70 text-primary-light"
          aria-hidden="true"
        >
          <ReceiptText size={19} />
        </div>
        <div>
          <h2 className="font-heading text-lg font-semibold tracking-tight text-text-primary">
            Allocate to Bills
          </h2>
          <p className="mt-0.5 text-xs text-text-secondary">
            Apply the full payment across outstanding bills. Overpayment is
            rejected.
          </p>
        </div>
      </div>

      {errors.allocations && (
        <p className="mt-3 text-xs text-danger" role="alert">
          {errors.allocations}
        </p>
      )}

      {payableBills.length === 0 ? (
        <div className="mt-5 rounded-lg border border-dashed border-border p-6 text-center text-xs text-text-muted">
          No outstanding bills for this supplier. Confirmed bills with a
          remaining balance will appear here.
        </div>
      ) : (
        <div className="mt-5 space-y-3">
          {payableBills.map((bill, index) => {
            const selected = allocatedByBill.has(bill.id);
            const amount = allocatedByBill.get(bill.id) ?? 0;

            return (
              <div
                key={bill.id}
                className="rounded-lg border border-border/60 bg-surface-alt/30 p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
              >
                <label className="flex min-w-0 flex-1 cursor-pointer items-start gap-2.5">
                  <Checkbox
                    id={`sp-alloc-check-${bill.id}`}
                    checked={selected}
                    onChange={() => onToggleBill(bill.id)}
                    className="mt-0.5"
                    aria-label={`Allocate to bill ${bill.billNumber}`}
                  />
                  <span className="min-w-0">
                    <span className="font-mono font-semibold text-text-primary block">
                      {bill.billNumber}
                    </span>
                    <span className="text-text-muted block">
                      Billed {bill.billDate} • Due {bill.dueDate} • Total{" "}
                      {formatCurrency(bill.total)}
                    </span>
                    <span className="text-text-secondary block">
                      Outstanding: {formatCurrency(bill.remainingBalance)}
                    </span>
                  </span>
                </label>

                <div className="w-full sm:w-40 shrink-0">
                  <Label htmlFor={`sp-alloc-${bill.id}`} className="sr-only">
                    {`Allocation amount for bill ${bill.billNumber}`}
                  </Label>
                  <Input
                    id={`sp-alloc-${bill.id}`}
                    type="number"
                    aria-label={`Allocation amount for bill ${bill.billNumber}`}
                    min="0"
                    max={bill.remainingBalance}
                    step="0.01"
                    disabled={!selected}
                    value={selected ? amount : ""}
                    onChange={(e: ChangeEvent<HTMLInputElement>) => {
                      const val = parseFloat(e.target.value);
                      onAllocationAmountChange(
                        bill.id,
                        isNaN(val)
                          ? 0
                          : Math.min(
                              bill.remainingBalance,
                              Math.max(0, val),
                            ),
                      );
                    }}
                    placeholder="0.00"
                    startIcon={<span className="text-xs">₹</span>}
                    className="h-9 text-xs tabular-nums"
                  />
                  {errors[`amount-${index}`] && (
                    <p className="mt-1 text-[11px] text-danger" role="alert">
                      {errors[`amount-${index}`]}
                    </p>
                  )}
                </div>
              </div>
            );
          })}

          <div className="flex items-center justify-between rounded-lg border border-border/60 bg-surface-alt/40 px-4 py-3 text-sm">
            <span className="font-medium text-text-secondary">
              Total allocated
            </span>
            <span className="font-mono font-semibold text-text-primary tabular-nums">
              {formatCurrency(allocatedTotal)}
            </span>
          </div>
        </div>
      )}
    </section>
  );
};
