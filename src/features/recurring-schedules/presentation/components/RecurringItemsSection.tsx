import { Layers, Plus, Trash2 } from "lucide-react";
import type { ChangeEvent } from "react";
import { formatCurrency, roundCurrency } from "@/shared/lib/money";
import type { RecurringScheduleLineItem } from "../../domain/recurring-schedule";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/shared/components/table";
import { Button, FormError, Input, Select } from "@/shared/components/form";

export type CatalogueProductOption = {
  id: string;
  name: string;
  type: "PRODUCT" | "SERVICE";
  sku?: string | null;
  description?: string | null;
  sellingPrice: number;
  hsnSac?: string | null;
  taxRate: number;
  unit?: string | null;
};

export type RecurringItemsSectionProps = {
  items: RecurringScheduleLineItem[];
  onUpdateLine: (id: string, patch: Partial<RecurringScheduleLineItem>) => void;
  onRemoveLine: (id: string) => void;
  onAddLine?: () => void;
  availableProducts?: CatalogueProductOption[];
  errors: Record<string, string>;
};

const lineTotal = (line: RecurringScheduleLineItem): number => {
  const taxable = roundCurrency(line.quantity * line.unitPrice * (1 - line.discount / 100));
  return roundCurrency(taxable * (1 + line.taxRate / 100));
};

export const RecurringItemsSection = ({
  items,
  onUpdateLine,
  onRemoveLine,
  onAddLine,
  availableProducts,
  errors,
}: RecurringItemsSectionProps) => {
  const isCatalogueProvided = availableProducts !== undefined;
  const hasLiveCatalogue = Boolean(availableProducts && availableProducts.length > 0);
  const productsList = availableProducts ?? [];

  // Mirrors Create Invoice: selecting a catalogue entry fills the snapshot
  // fields (name, description, HSN, rate, tax). Snapshots are authoritative —
  // later catalogue changes never rewrite the schedule or its invoices.
  const handleSelectProduct = (lineId: string, productName: string) => {
    if (!productName) {
      onUpdateLine(lineId, { item: "", description: "", hsnSac: "", unitPrice: 0, taxRate: 0 });
      return;
    }

    if (isCatalogueProvided) {
      const realItem = productsList.find((p) => p.name === productName);
      if (realItem) {
        onUpdateLine(lineId, {
          item: realItem.name,
          description: realItem.description || realItem.name,
          hsnSac: realItem.hsnSac || "",
          unitPrice: realItem.sellingPrice,
          taxRate: realItem.taxRate,
        });
        return;
      }
      onUpdateLine(lineId, { item: productName });
      return;
    }

    onUpdateLine(lineId, { item: productName });
  };

  return (
    <div className="space-y-4 rounded-xl border border-border bg-surface-card p-4 sm:p-5 transition-colors">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-border/70 bg-surface-alt/70 text-primary-light"
            aria-hidden="true"
          >
            <Layers size={19} />
          </div>
          <div>
            <h2 className="font-heading text-lg font-semibold text-text-primary">
              Recurring Line Items
            </h2>
            <p className="text-xs text-text-secondary">
              Frozen snapshot for every generated invoice. Editing the schedule changes future invoices only.
            </p>
          </div>
        </div>
        {onAddLine && (
          <Button
            variant="secondary"
            onClick={onAddLine}
            className="px-3 py-1.5 text-xs self-start sm:self-auto"
          >
            <Plus size={14} />
            <span>Add Line</span>
          </Button>
        )}
      </div>

      {errors.items && <FormError message={errors.items} />}

      <div className="overflow-x-auto">
        <Table className="min-w-[860px] table-fixed text-xs">
          <TableHeader>
            <TableRow>
              <TableHead scope="col" className="w-[4%] min-w-[36px] pb-3 text-center">
                #
              </TableHead>
              <TableHead scope="col" className="w-[36%] min-w-[240px] pb-3 pr-3">
                Item / Description
              </TableHead>
              <TableHead scope="col" className="w-[11%] min-w-[100px] pb-3 pr-3">
                HSN / SAC
              </TableHead>
              <TableHead scope="col" className="w-[8%] min-w-[75px] pb-3 pr-3 text-center">
                Qty
              </TableHead>
              <TableHead scope="col" className="w-[13%] min-w-[120px] pb-3 pr-3">
                Unit Price
              </TableHead>
              <TableHead scope="col" className="w-[8%] min-w-[80px] pb-3 pr-3">
                Discount
              </TableHead>
              <TableHead scope="col" className="w-[9%] min-w-[90px] pb-3 pr-3">
                Tax
              </TableHead>
              <TableHead scope="col" className="w-[11%] min-w-[110px] pb-3 pr-3 text-right">
                Amount
              </TableHead>
              <TableHead scope="col" className="w-[4%] min-w-[40px] pb-3 text-center">
                <span className="sr-only">Row action</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="py-8 text-center text-sm text-text-muted">
                  No line items added. Click &ldquo;Add Line&rdquo; to begin.
                </TableCell>
              </TableRow>
            ) : (
              items.map((line, idx) => {
                const isMatchedItem = isCatalogueProvided
                  ? productsList.some((p) => p.name === line.item)
                  : false;

                return (
                  <TableRow key={line.id} className="align-top hover:bg-surface-alt/30 transition-colors">
                    <TableCell className="py-3.5 text-center font-medium text-text-secondary pt-5">
                      {idx + 1}
                    </TableCell>

                    {/* ITEM / DESCRIPTION */}
                    <TableCell className="py-3.5 pr-3">
                      <div className="space-y-1.5">
                        <Select
                          aria-label={`Select product or service for item ${idx + 1}`}
                          value={isMatchedItem ? line.item : line.item ? "__custom__" : ""}
                          onChange={(val) => {
                            if (val === "__custom__") {
                              onUpdateLine(line.id, { item: "Custom Service" });
                            } else {
                              handleSelectProduct(line.id, val);
                            }
                          }}
                          placeholder="Search product or service..."
                          className="h-9 text-xs"
                        >
                          <option value="">Search product or service...</option>
                          {hasLiveCatalogue ? (
                            productsList.map((p) => (
                              <option key={p.id} value={p.name}>
                                {`[${p.type === "PRODUCT" ? "Product" : "Service"}] ${p.name}${p.sku ? ` (${p.sku})` : ""} — ₹${p.sellingPrice}${p.unit ? ` / ${p.unit}` : ""}`}
                              </option>
                            ))
                          ) : isCatalogueProvided ? (
                            <option value="__no_items__" disabled>
                              No products or services in catalogue
                            </option>
                          ) : (
                            <option value="__loading__" disabled>
                              Loading catalogue…
                            </option>
                          )}
                          <option value="__custom__">Custom product/service...</option>
                        </Select>

                        {!isMatchedItem && line.item !== "" && (
                          <Input
                            type="text"
                            aria-label={`Item or service name for item ${idx + 1}`}
                            value={line.item}
                            onChange={(e: ChangeEvent<HTMLInputElement>) =>
                              onUpdateLine(line.id, { item: e.target.value })
                            }
                            placeholder="Item name"
                            className="h-8 px-2.5 text-xs"
                          />
                        )}

                        <Input
                          type="text"
                          aria-label={`Description for item ${idx + 1}`}
                          value={line.description}
                          onChange={(e: ChangeEvent<HTMLInputElement>) =>
                            onUpdateLine(line.id, { description: e.target.value })
                          }
                          placeholder="Add a description (optional)"
                          className="h-8 px-2.5 text-xs text-text-secondary"
                        />

                        {errors[`item-${idx}`] && (
                          <p className="text-[11px] text-danger" role="alert">
                            {errors[`item-${idx}`]}
                          </p>
                        )}
                      </div>
                    </TableCell>

                    {/* HSN / SAC */}
                    <TableCell className="py-3.5 pr-3 pt-4">
                      <Input
                        type="text"
                        aria-label={`HSN or SAC code for item ${idx + 1}`}
                        value={line.hsnSac || ""}
                        onChange={(e: ChangeEvent<HTMLInputElement>) =>
                          onUpdateLine(line.id, { hsnSac: e.target.value })
                        }
                        placeholder="123456"
                        className="h-9 px-2.5 text-xs"
                      />
                    </TableCell>

                    {/* QTY — fractional quantities supported per the recurring
                        line-item domain (Decimal 12,3); Create Invoice clamps
                        to integers in its UI. */}
                    <TableCell className="py-3.5 pr-3 pt-4">
                      <Input
                        type="number"
                        aria-label={`Quantity for item ${idx + 1}`}
                        min="0.001"
                        step="any"
                        value={line.quantity || ""}
                        onChange={(e: ChangeEvent<HTMLInputElement>) =>
                          onUpdateLine(line.id, {
                            quantity: Math.max(0, parseFloat(e.target.value) || 0),
                          })
                        }
                        className="h-9 px-2 text-center text-xs"
                      />
                      {errors[`quantity-${idx}`] && (
                        <p className="mt-1 text-[11px] text-danger" role="alert">
                          {errors[`quantity-${idx}`]}
                        </p>
                      )}
                    </TableCell>

                    {/* UNIT PRICE */}
                    <TableCell className="py-3.5 pr-3 pt-4">
                      <Input
                        type="number"
                        aria-label={`Unit price for item ${idx + 1}`}
                        min="0"
                        step="0.01"
                        value={line.unitPrice === 0 ? "0.00" : line.unitPrice}
                        onChange={(e: ChangeEvent<HTMLInputElement>) =>
                          onUpdateLine(line.id, {
                            unitPrice: Math.max(0, parseFloat(e.target.value) || 0),
                          })
                        }
                        placeholder="0.00"
                        startIcon={<span className="text-xs">₹</span>}
                        className="h-9 text-xs tabular-nums"
                      />
                      {errors[`price-${idx}`] && (
                        <p className="mt-1 text-[11px] text-danger" role="alert">
                          {errors[`price-${idx}`]}
                        </p>
                      )}
                    </TableCell>

                    {/* DISCOUNT */}
                    <TableCell className="py-3.5 pr-3 pt-4">
                      <div className="relative">
                        <Input
                          type="number"
                          aria-label={`Discount percentage for item ${idx + 1}`}
                          min="0"
                          max="100"
                          step="1"
                          value={line.discount}
                          onChange={(e: ChangeEvent<HTMLInputElement>) =>
                            onUpdateLine(line.id, {
                              discount: Math.min(100, Math.max(0, parseFloat(e.target.value) || 0)),
                            })
                          }
                          className="h-9 pr-6 text-xs tabular-nums"
                        />
                        <span
                          className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-text-muted"
                          aria-hidden="true"
                        >
                          %
                        </span>
                      </div>
                    </TableCell>

                    {/* TAX — GST slab selector, identical to Create Invoice */}
                    <TableCell className="py-3.5 pr-3 pt-4">
                      <Select
                        aria-label={`Tax rate for item ${idx + 1}`}
                        value={String(line.taxRate)}
                        onChange={(val) =>
                          onUpdateLine(line.id, { taxRate: parseFloat(val) || 0 })
                        }
                        className="h-9 text-xs"
                      >
                        <option value="0">0%</option>
                        <option value="5">5%</option>
                        <option value="12">12%</option>
                        <option value="18">18%</option>
                        <option value="28">28%</option>
                      </Select>
                    </TableCell>

                    {/* AMOUNT */}
                    <TableCell className="py-3.5 pr-3 pt-5 text-right font-medium text-text-primary whitespace-nowrap text-xs sm:text-sm tabular-nums">
                      {formatCurrency(lineTotal(line))}
                    </TableCell>

                    {/* REMOVE ACTION */}
                    <TableCell className="py-3.5 text-center pt-4">
                      <button
                        type="button"
                        aria-label={`Remove item ${idx + 1}`}
                        onClick={() => onRemoveLine(line.id)}
                        disabled={items.length <= 1}
                        className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-text-muted transition-colors hover:bg-surface-alt hover:text-danger disabled:pointer-events-none disabled:opacity-25 cursor-pointer"
                      >
                        <Trash2 size={15} />
                      </button>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};
