"use client";

import { Layers, Plus, Trash2 } from "lucide-react";
import type { ChangeEvent } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/shared/components/table";
import { Button, Input } from "@/shared/components/form";
import { cn } from "@/shared/utils/cn";

export type ChallanLineState = {
  salesOrderItemId: string | null;
  productId: string | null;
  item: string;
  description: string;
  hsnSac: string;
  unit: string;
  orderedQuantity: number;
  previouslyDeliveredQuantity: number;
  remainingDeliverableQuantity: number;
  deliveredQuantity: string;
};

export type DeliveryChallanItemsSectionProps = {
  items: ChallanLineState[];
  onUpdateLine: <K extends keyof ChallanLineState>(
    index: number,
    field: K,
    value: ChallanLineState[K],
  ) => void;
  onAddLine: () => void;
  onRemoveLine: (index: number) => void;
  fieldErrors?: Record<string, string>;
};

export const DeliveryChallanItemsSection = ({
  items,
  onUpdateLine,
  onAddLine,
  onRemoveLine,
  fieldErrors = {},
}: DeliveryChallanItemsSectionProps) => {
  return (
    <section className="rounded-xl border border-border bg-surface-card p-5 sm:p-6 transition-colors">
      {/* Section Header */}
      <div className="flex items-center gap-3">
        <div
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-border/70 bg-surface-alt/70 text-primary-light"
          aria-hidden="true"
        >
          <Layers size={19} />
        </div>
        <div>
          <h2 className="font-heading text-lg font-semibold tracking-tight text-text-primary">
            Delivery Items
          </h2>
          <p className="mt-0.5 text-xs text-text-secondary">
            Specify dispatched quantities against ordered balances.
          </p>
        </div>
      </div>

      {fieldErrors.items && (
        <p className="mt-3 text-xs text-danger" role="alert">
          {fieldErrors.items}
        </p>
      )}

      {/* Items Table */}
      {items.length === 0 ? (
        <div className="mt-5 rounded-lg border border-dashed border-border p-8 text-center text-text-muted text-sm">
          No items selected. Select an active sales order above or click &quot;Add
          Custom Item&quot;.
        </div>
      ) : (
        <div className="mt-5 overflow-x-auto rounded-lg border border-border bg-surface-card">
          <Table className="w-full">
            <TableHeader>
              <TableRow className="border-b border-border bg-surface-alt/70 text-[11px] font-semibold uppercase tracking-wider text-text-secondary">
                <TableHead className="w-[30%] min-w-60 px-3 py-2.5">
                  Item &amp; Description
                </TableHead>
                <TableHead className="w-[10%] min-w-20 px-3 py-2.5">
                  HSN/SAC
                </TableHead>
                <TableHead className="w-[9%] min-w-20 px-3 py-2.5 text-right">
                  Ordered
                </TableHead>
                <TableHead className="w-[9%] min-w-20 px-3 py-2.5 text-right">
                  Prev. Del.
                </TableHead>
                <TableHead className="w-[10%] min-w-21.25 px-3 py-2.5 text-right">
                  Remaining
                </TableHead>
                <TableHead className="w-[12%] min-w-22.5 px-3 py-2.5 text-right">
                  Delivered Qty *
                </TableHead>
                <TableHead className="w-[8%] min-w-16 px-3 py-2.5 text-center">
                  Unit
                </TableHead>
                <TableHead className="w-[4%] min-w-10 px-2 py-2.5 text-center">
                  <span className="sr-only">Actions</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((it, idx) => {
                const qty = parseFloat(it.deliveredQuantity) || 0;
                const itemError = fieldErrors[`items.${idx}.item`];
                const qtyError = fieldErrors[`items.${idx}.deliveredQuantity`];
                const isOver =
                  it.salesOrderItemId !== null &&
                  qty > it.remainingDeliverableQuantity + 0.0001;

                return (
                  <TableRow
                    key={it.salesOrderItemId ?? `manual-${idx}`}
                    className="border-b border-border/80 hover:bg-surface-alt/40 transition-colors align-top"
                  >
                    {/* Item Details Column */}
                    <TableCell className="px-3 py-3">
                      <div className="space-y-1.5">
                        {it.salesOrderItemId ? (
                          <div>
                            <span className="font-medium text-xs text-text-primary block">
                              {it.item}
                            </span>
                            {it.description && (
                              <span className="text-xs text-text-secondary truncate block max-w-56">
                                {it.description}
                              </span>
                            )}
                          </div>
                        ) : (
                          <>
                            <Input
                              type="text"
                              value={it.item}
                              onChange={(e: ChangeEvent<HTMLInputElement>) =>
                                onUpdateLine(idx, "item", e.target.value)
                              }
                              placeholder="Item name or service..."
                              className={cn(
                                "h-9 text-xs font-medium",
                                itemError && "border-danger focus:border-danger",
                              )}
                            />
                            <Input
                              type="text"
                              value={it.description}
                              onChange={(e: ChangeEvent<HTMLInputElement>) =>
                                onUpdateLine(idx, "description", e.target.value)
                              }
                              placeholder="Description (optional)"
                              className="h-8 text-xs text-text-secondary"
                            />
                          </>
                        )}

                        {itemError && (
                          <p className="text-[11px] text-danger">{itemError}</p>
                        )}
                      </div>
                    </TableCell>

                    {/* HSN/SAC Column */}
                    <TableCell className="px-3 py-3">
                      {it.salesOrderItemId ? (
                        <span className="font-mono text-xs text-text-secondary">
                          {it.hsnSac || "—"}
                        </span>
                      ) : (
                        <Input
                          type="text"
                          value={it.hsnSac}
                          onChange={(e: ChangeEvent<HTMLInputElement>) =>
                            onUpdateLine(idx, "hsnSac", e.target.value)
                          }
                          placeholder="HSN"
                          className="h-9 font-mono text-xs"
                        />
                      )}
                    </TableCell>

                    {/* Ordered Quantity Column */}
                    <TableCell className="px-3 py-3 text-right font-mono text-xs text-text-secondary pt-5">
                      {it.orderedQuantity}
                    </TableCell>

                    {/* Previously Delivered Column */}
                    <TableCell className="px-3 py-3 text-right font-mono text-xs text-text-muted pt-5">
                      {it.previouslyDeliveredQuantity}
                    </TableCell>

                    {/* Remaining Column */}
                    <TableCell className="px-3 py-3 text-right font-mono text-xs font-semibold text-success pt-5">
                      {it.salesOrderItemId ? it.remainingDeliverableQuantity : "—"}
                    </TableCell>

                    {/* Delivered Quantity Column */}
                    <TableCell className="px-3 py-3">
                      <Input
                        type="number"
                        min="0"
                        step="any"
                        value={it.deliveredQuantity}
                        onChange={(e: ChangeEvent<HTMLInputElement>) =>
                          onUpdateLine(idx, "deliveredQuantity", e.target.value)
                        }
                        className={cn(
                          "h-9 text-xs text-right font-mono",
                          (qtyError || isOver) && "border-danger focus:border-danger",
                        )}
                      />
                      {isOver && (
                        <p className="mt-1 text-[11px] text-danger">
                          Exceeds {it.remainingDeliverableQuantity}!
                        </p>
                      )}
                      {qtyError && (
                        <p className="mt-1 text-[11px] text-danger">{qtyError}</p>
                      )}
                    </TableCell>

                    {/* Unit Column */}
                    <TableCell className="px-3 py-3 text-center font-mono text-xs text-text-muted pt-5">
                      {it.unit}
                    </TableCell>

                    {/* Row Delete Action */}
                    <TableCell className="px-2 py-3 text-center">
                      <Button
                        type="button"
                        variant="secondary"
                        onClick={() => onRemoveLine(idx)}
                        disabled={items.length <= 1}
                        className="h-8 w-8 rounded-lg p-0 border-transparent hover:border-danger/30 hover:bg-danger/10 hover:text-danger disabled:opacity-40 disabled:hover:bg-transparent"
                        title={
                          items.length <= 1
                            ? "Delivery challans must contain at least one line"
                            : "Remove line item"
                        }
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

      {/* Add Item Action */}
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
