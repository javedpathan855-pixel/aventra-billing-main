"use client";

import { Package, Plus, Trash2 } from "lucide-react";
import type { ChangeEvent } from "react";
import type { ReturnDisposition } from "../../domain/entities/sales-return";
import { calculateReturnLineTotals } from "../../domain/rules/sales-return-rules";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/shared/components/table";
import { Button, Input, Select } from "@/shared/components/form";
import { cn } from "@/shared/utils/cn";
import { formatCurrency } from "@/shared/lib/money";

export type ReturnLineState = {
  invoiceItemId: string | null;
  productId: string | null;
  item: string;
  description: string;
  hsnSac: string;
  unit: string;
  soldQuantity: number;
  previouslyReturnedQuantity: number;
  remainingReturnableQuantity: number;
  returnQuantity: string;
  unitPrice: number;
  discount: number;
  taxRate: number;
  disposition: ReturnDisposition;
  reason: string;
};

const dispositionOptions = [
  { value: "RESTOCK", label: "Restock (Sellable Inventory)" },
  { value: "DAMAGED", label: "Damaged (Non-Sellable / Write-Off)" },
  { value: "QUARANTINE", label: "Quarantine (Inspection Required)" },
];

export type SalesReturnItemsSectionProps = {
  items: ReturnLineState[];
  onUpdateLine: <K extends keyof ReturnLineState>(
    index: number,
    field: K,
    value: ReturnLineState[K],
  ) => void;
  onAddLine: () => void;
  onRemoveLine: (index: number) => void;
  fieldErrors?: Record<string, string>;
};

export const SalesReturnItemsSection = ({
  items,
  onUpdateLine,
  onAddLine,
  onRemoveLine,
  fieldErrors = {},
}: SalesReturnItemsSectionProps) => {
  return (
    <section className="rounded-xl border border-border bg-surface-card p-5 sm:p-6 transition-colors space-y-4">
      {/* 1. Section Header */}
      <div className="flex items-center gap-3">
        <div
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-border/70 bg-surface-alt/70 text-primary-light"
          aria-hidden="true"
        >
          <Package size={19} />
        </div>
        <div>
          <h2 className="font-heading text-lg font-semibold tracking-tight text-text-primary">
            Return Items
          </h2>
          <p className="mt-0.5 text-xs text-text-secondary">
            Specify products, eligible quantities, return quantities, price, tax, and inventory disposition.
          </p>
        </div>
      </div>

      {fieldErrors.items && (
        <p className="mt-3 text-xs text-danger" role="alert">
          {fieldErrors.items}
        </p>
      )}

      {/* 2. Items Table using shared components */}
      {items.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border p-8 text-center text-text-muted text-sm">
          No items selected. Select an invoice above or click &quot;Add Custom Item&quot;.
        </div>
      ) : (
        <div className="mt-5 overflow-x-auto rounded-lg border border-border bg-surface-card">
          <Table className="w-full">
            <TableHeader>
              <TableRow className="border-b border-border bg-surface-alt/70 text-[11px] font-semibold uppercase tracking-wider text-text-secondary">
                <TableHead className="min-w-56 px-3 py-2.5">
                  Item &amp; Description
                </TableHead>
                <TableHead className="w-24 px-3 py-2.5 text-right">
                  Sold Qty
                </TableHead>
                <TableHead className="w-24 px-3 py-2.5 text-right">
                  Prev. Ret.
                </TableHead>
                <TableHead className="w-24 px-3 py-2.5 text-right">
                  Eligible
                </TableHead>
                <TableHead className="w-28 px-3 py-2.5 text-right">
                  Return Qty *
                </TableHead>
                <TableHead className="w-32 px-3 py-2.5 text-right">
                  Rate (₹)
                </TableHead>
                <TableHead className="w-20 px-3 py-2.5 text-right">
                  Disc (%)
                </TableHead>
                <TableHead className="w-24 px-3 py-2.5 text-right">
                  Tax
                </TableHead>
                <TableHead className="w-48 px-3 py-2.5">
                  Disposition
                </TableHead>
                <TableHead className="w-28 px-3 py-2.5 text-right">
                  Amount
                </TableHead>
                <TableHead className="w-10 px-2 py-2.5 text-center">
                  <span className="sr-only">Actions</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((it, idx) => {
                const qty = parseFloat(it.returnQuantity) || 0;
                const lineCalc = calculateReturnLineTotals({
                  quantity: qty,
                  unitPrice: it.unitPrice,
                  discount: it.discount,
                  taxRate: it.taxRate,
                });

                const isOver =
                  it.remainingReturnableQuantity < 900000 &&
                  qty > it.remainingReturnableQuantity + 0.0001;

                return (
                  <TableRow
                    key={idx}
                    className="border-b border-border/80 hover:bg-surface-alt/40 transition-colors align-top"
                  >
                    {/* Item Details Column */}
                    <TableCell className="px-3 py-3">
                      <div className="space-y-1.5">
                        <Input
                          value={it.item}
                          onChange={(e: ChangeEvent<HTMLInputElement>) =>
                            onUpdateLine(idx, "item", e.target.value)
                          }
                          placeholder="Item name"
                          className="h-9 text-xs font-medium"
                        />
                        <Input
                          value={it.description}
                          onChange={(e: ChangeEvent<HTMLInputElement>) =>
                            onUpdateLine(idx, "description", e.target.value)
                          }
                          placeholder="Optional description"
                          className="h-8 text-[11px] text-text-muted"
                        />
                      </div>
                    </TableCell>

                    {/* Sold Quantity Column */}
                    <TableCell className="px-3 py-3 text-right font-mono text-xs text-text-secondary pt-5">
                      {it.soldQuantity} {it.unit}
                    </TableCell>

                    {/* Previously Returned Column */}
                    <TableCell className="px-3 py-3 text-right font-mono text-xs text-text-muted pt-5">
                      {it.previouslyReturnedQuantity} {it.unit}
                    </TableCell>

                    {/* Eligible Remaining Column */}
                    <TableCell className="px-3 py-3 text-right font-mono text-xs font-semibold text-success pt-5">
                      {it.remainingReturnableQuantity > 900000
                        ? "—"
                        : `${it.remainingReturnableQuantity} ${it.unit}`}
                    </TableCell>

                    {/* Return Quantity Column */}
                    <TableCell className="px-3 py-3">
                      <Input
                        type="number"
                        min="0"
                        step="any"
                        value={it.returnQuantity}
                        onChange={(e: ChangeEvent<HTMLInputElement>) =>
                          onUpdateLine(idx, "returnQuantity", e.target.value)
                        }
                        className={cn(
                          "h-9 text-right font-mono text-xs",
                          isOver && "border-danger focus:border-danger text-danger",
                        )}
                      />
                      {isOver && (
                        <span className="text-[10px] text-danger block mt-1">
                          Exceeds {it.remainingReturnableQuantity}!
                        </span>
                      )}
                    </TableCell>

                    {/* Unit Price Column */}
                    <TableCell className="px-3 py-3">
                      <div className="relative">
                        <span className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-text-muted">
                          ₹
                        </span>
                        <Input
                          type="number"
                          min="0"
                          step="0.01"
                          value={it.unitPrice}
                          onChange={(e: ChangeEvent<HTMLInputElement>) =>
                            onUpdateLine(
                              idx,
                              "unitPrice",
                              parseFloat(e.target.value) || 0,
                            )
                          }
                          className="h-9 pl-6 text-xs text-right font-mono"
                        />
                      </div>
                    </TableCell>

                    {/* Discount Column */}
                    <TableCell className="px-3 py-3">
                      <div className="relative">
                        <Input
                          type="number"
                          min="0"
                          max="100"
                          step="0.1"
                          value={it.discount}
                          onChange={(e: ChangeEvent<HTMLInputElement>) =>
                            onUpdateLine(
                              idx,
                              "discount",
                              parseFloat(e.target.value) || 0,
                            )
                          }
                          className="h-9 pr-6 text-xs text-right font-mono"
                        />
                        <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-text-muted">
                          %
                        </span>
                      </div>
                    </TableCell>

                    {/* Tax Rate Column */}
                    <TableCell className="px-3 py-3">
                      <Select
                        value={String(it.taxRate)}
                        onChange={(val: string) =>
                          onUpdateLine(idx, "taxRate", parseFloat(val) || 0)
                        }
                        options={[
                          { value: "0", label: "0%" },
                          { value: "5", label: "5%" },
                          { value: "12", label: "12%" },
                          { value: "18", label: "18%" },
                          { value: "28", label: "28%" },
                        ]}
                        className="h-9 text-xs"
                      />
                    </TableCell>

                    {/* Disposition Column */}
                    <TableCell className="px-3 py-3">
                      <Select
                        value={it.disposition}
                        onChange={(val: string) =>
                          onUpdateLine(idx, "disposition", val as ReturnDisposition)
                        }
                        options={dispositionOptions}
                        className="h-9 text-xs"
                      />
                    </TableCell>

                    {/* Line Total Column */}
                    <TableCell className="px-3 py-3 text-right">
                      <div className="font-mono text-xs font-semibold text-text-primary pt-2">
                        {formatCurrency(lineCalc.lineTotal)}
                      </div>
                      {lineCalc.taxAmount > 0 && (
                        <div className="text-[10px] text-text-muted">
                          incl. {formatCurrency(lineCalc.taxAmount)} tax
                        </div>
                      )}
                    </TableCell>

                    {/* Row Delete Action */}
                    <TableCell className="px-2 py-3 text-center">
                      <Button
                        type="button"
                        variant="secondary"
                        onClick={() => onRemoveLine(idx)}
                        className="h-8 w-8 rounded-lg p-0 border-transparent hover:border-danger/30 hover:bg-danger/10 hover:text-danger"
                        title="Remove item"
                        aria-label={`Remove line ${idx + 1}`}
                      >
                        <Trash2 size={14} />
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}

      {/* 3. Add Item Action matching SalesOrderItemsSection */}
      <div className="mt-4 flex items-center justify-between">
        <Button
          type="button"
          variant="secondary"
          onClick={onAddLine}
          className="h-9 gap-1.5 px-3 text-xs font-semibold"
        >
          <Plus size={14} />
          Add Custom Item
        </Button>
      </div>
    </section>
  );
};
