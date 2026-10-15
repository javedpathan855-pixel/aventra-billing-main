import { Layers, Plus, Trash2 } from "lucide-react";
import type { ChangeEvent } from "react";
import type { SalesOrderItem } from "../../domain/entities/sales-order";
import type { ProductDto } from "@/features/products";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/shared/components/table";
import { Button, Input, Select } from "@/shared/components/form";

const formatCurrencyExact = (val: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(val);

export type SalesOrderItemsSectionProps = {
  items: SalesOrderItem[];
  onUpdateLine: (id: string, patch: Partial<SalesOrderItem>) => void;
  onAddLine: () => void;
  onRemoveLine: (id: string) => void;
  availableProducts?: ProductDto[];
  errors?: Record<string, string>;
};

export const SalesOrderItemsSection = ({
  items,
  onUpdateLine,
  onAddLine,
  onRemoveLine,
  availableProducts,
  errors = {},
}: SalesOrderItemsSectionProps) => {
  const isCatalogueProvided = availableProducts !== undefined;
  const hasLiveCatalogue = Boolean(availableProducts && availableProducts.length > 0);
  const productsList = availableProducts ?? [];

  const handleSelectProduct = (lineId: string, productName: string) => {
    if (!productName) {
      onUpdateLine(lineId, {
        productId: undefined,
        item: "",
        description: "",
        hsnSac: "",
        unitPrice: 0,
        taxRate: 18,
      });
      return;
    }

    if (isCatalogueProvided) {
      const realItem = productsList.find((p) => p.name === productName);
      if (realItem) {
        onUpdateLine(lineId, {
          productId: realItem.id,
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
            Order Items
          </h2>
          <p className="mt-0.5 text-xs text-text-secondary">
            Add products or services committed in this sales order.
          </p>
        </div>
      </div>

      {errors.items && (
        <p className="mt-3 text-xs text-danger" role="alert">
          {errors.items}
        </p>
      )}

      {/* Items Table */}
      <div className="mt-5 overflow-x-auto rounded-lg border border-border bg-surface-card">
        <Table className="w-full">
          <TableHeader>
            <TableRow className="border-b border-border bg-surface-alt/70 text-[11px] font-semibold uppercase tracking-wider text-text-secondary">
              <TableHead className="w-[34%] min-w-60 px-3 py-2.5">
                Item &amp; Description
              </TableHead>
              <TableHead className="w-[11%] min-w-22.5 px-3 py-2.5">
                HSN/SAC
              </TableHead>
              <TableHead className="w-[10%] min-w-20 px-3 py-2.5">
                Qty
              </TableHead>
              <TableHead className="w-[14%] min-w-27.5 px-3 py-2.5">
                Rate (₹)
              </TableHead>
              <TableHead className="w-[11%] min-w-21.25 px-3 py-2.5">
                Disc (%)
              </TableHead>
              <TableHead className="w-[10%] min-w-21.25 px-3 py-2.5">
                Tax
              </TableHead>
              <TableHead className="w-[10%] min-w-23.75 px-3 py-2.5 text-right">
                Amount
              </TableHead>
              <TableHead className="w-[4%] min-w-10 px-2 py-2.5 text-center">
                <span className="sr-only">Actions</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((line, index) => {
              const lineError =
                errors[`item_${index}`] || errors[`items.${index}.item`];
              const qtyError = errors[`items.${index}.quantity`];
              const priceError = errors[`items.${index}.unitPrice`];

              const qty = line.quantity || 0;
              const price = line.unitPrice || 0;
              const disc = line.discount || 0;
              const rate = line.taxRate || 0;

              const gross = qty * price;
              const discAmt = gross * (disc / 100);
              const taxable = Math.max(0, gross - discAmt);
              const taxAmt = taxable * (rate / 100);
              const lineTotal = taxable + taxAmt;

              return (
                <TableRow
                  key={line.id}
                  className="border-b border-border/80 hover:bg-surface-alt/40 transition-colors align-top"
                >
                  {/* Item Details Column */}
                  <TableCell className="px-3 py-3">
                    <div className="space-y-1.5">
                      {hasLiveCatalogue ? (
                        <Select
                          value={line.item}
                          onChange={(val: string) =>
                            handleSelectProduct(line.id, val)
                          }
                          options={[
                            { value: "", label: "Select product..." },
                            ...productsList.map((p) => ({
                              value: p.name,
                              label: `${p.name} (₹${p.sellingPrice})`,
                            })),
                          ]}
                          className={`h-9 text-xs font-medium ${
                            lineError ? "border-danger focus:border-danger" : ""
                          }`}
                        />
                      ) : (
                        <Input
                          type="text"
                          value={line.item}
                          onChange={(e: ChangeEvent<HTMLInputElement>) =>
                            onUpdateLine(line.id, { item: e.target.value })
                          }
                          placeholder="Item name or service..."
                          className={`h-9 text-xs font-medium ${
                            lineError ? "border-danger focus:border-danger" : ""
                          }`}
                        />
                      )}

                      <Input
                        type="text"
                        value={line.description || ""}
                        onChange={(e: ChangeEvent<HTMLInputElement>) =>
                          onUpdateLine(line.id, { description: e.target.value })
                        }
                        placeholder="Description (optional)"
                        className="h-8 text-xs text-text-secondary"
                      />

                      {lineError && (
                        <p className="text-[11px] text-danger">{lineError}</p>
                      )}
                    </div>
                  </TableCell>

                  {/* HSN/SAC Column */}
                  <TableCell className="px-3 py-3">
                    <Input
                      type="text"
                      value={line.hsnSac || ""}
                      onChange={(e: ChangeEvent<HTMLInputElement>) =>
                        onUpdateLine(line.id, { hsnSac: e.target.value })
                      }
                      placeholder="HSN"
                      className="h-9 font-mono text-xs"
                    />
                  </TableCell>

                  {/* Quantity Column */}
                  <TableCell className="px-3 py-3">
                    <Input
                      type="number"
                      min="0.001"
                      step="any"
                      value={line.quantity === 0 ? "" : line.quantity}
                      onChange={(e: ChangeEvent<HTMLInputElement>) =>
                        onUpdateLine(line.id, {
                          quantity: parseFloat(e.target.value) || 0,
                        })
                      }
                      className={`h-9 text-xs text-right font-mono ${
                        qtyError ? "border-danger focus:border-danger" : ""
                      }`}
                    />
                    {qtyError && (
                      <p className="mt-1 text-[11px] text-danger">{qtyError}</p>
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
                        value={line.unitPrice === 0 ? "" : line.unitPrice}
                        onChange={(e: ChangeEvent<HTMLInputElement>) =>
                          onUpdateLine(line.id, {
                            unitPrice: parseFloat(e.target.value) || 0,
                          })
                        }
                        className={`h-9 pl-6 text-xs text-right font-mono ${
                          priceError ? "border-danger focus:border-danger" : ""
                        }`}
                      />
                    </div>
                    {priceError && (
                      <p className="mt-1 text-[11px] text-danger">{priceError}</p>
                    )}
                  </TableCell>

                  {/* Discount Column */}
                  <TableCell className="px-3 py-3">
                    <div className="relative">
                      <Input
                        type="number"
                        min="0"
                        max="100"
                        step="0.1"
                        value={line.discount === 0 ? "" : line.discount}
                        onChange={(e: ChangeEvent<HTMLInputElement>) =>
                          onUpdateLine(line.id, {
                            discount: parseFloat(e.target.value) || 0,
                          })
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
                      value={String(line.taxRate || 18)}
                      onChange={(val: string) =>
                        onUpdateLine(line.id, {
                          taxRate: parseFloat(val) || 0,
                        })
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

                  {/* Calculated Line Total Column */}
                  <TableCell className="px-3 py-3 text-right">
                    <div className="font-mono text-xs font-semibold text-text-primary pt-2">
                      {formatCurrencyExact(lineTotal)}
                    </div>
                    {taxAmt > 0 && (
                      <div className="text-[10px] text-text-muted">
                        incl. {formatCurrencyExact(taxAmt)} tax
                      </div>
                    )}
                  </TableCell>

                  {/* Row Delete Action */}
                  <TableCell className="px-2 py-3 text-center">
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={() => onRemoveLine(line.id)}
                      disabled={items.length <= 1}
                      className="h-8 w-8 rounded-lg p-0 border-transparent hover:border-danger/30 hover:bg-danger/10 hover:text-danger disabled:opacity-40 disabled:hover:bg-transparent"
                      title={
                        items.length <= 1
                          ? "Sales orders must contain at least one line"
                          : "Remove line item"
                      }
                      aria-label={`Remove line ${index + 1}`}
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

      {/* Add Item Action */}
      <div className="mt-4 flex items-center justify-between">
        <Button
          type="button"
          variant="secondary"
          onClick={onAddLine}
          className="h-9 gap-1.5 px-3 text-xs font-semibold"
        >
          <Plus size={14} />
          Add Item
        </Button>
      </div>
    </section>
  );
};
