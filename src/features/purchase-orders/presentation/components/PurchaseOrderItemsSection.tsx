import { Layers, Plus, Trash2 } from "lucide-react";
import type { ChangeEvent } from "react";
import type { PurchaseOrderItem } from "../../domain/entities/purchase-order";
import type { ProductDto } from "@/features/products";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/shared/components/table";
import { Button, Input, Label, Select } from "@/shared/components/form";

export type PurchaseOrderItemsSectionProps = {
  items: PurchaseOrderItem[];
  onUpdateLine: (id: string, patch: Partial<PurchaseOrderItem>) => void;
  onAddLine: () => void;
  onRemoveLine: (id: string) => void;
  availableProducts?: ProductDto[];
  errors?: Record<string, string>;
};

const taxOptions = [
  { value: "0", label: "0%" },
  { value: "5", label: "5%" },
  { value: "12", label: "12%" },
  { value: "18", label: "18%" },
  { value: "28", label: "28%" },
];

const formatCurrencyExact = (val: number): string =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(val);

/**
 * Purchase order line-item editor. Follows the Create Invoice items section
 * layout (proportional fixed columns, stacked product/description cell,
 * compact numeric fields, icon-only row removal) while keeping purchasing
 * behavior: purchase-price-first catalogue pricing, fractional quantities,
 * and productId tracking for server-side ownership validation.
 *
 * The invoice component itself is not reused: it is private to the invoices
 * feature and bound to invoice line-item semantics, so a direct import would
 * breach feature boundaries.
 */
export const PurchaseOrderItemsSection = ({
  items,
  onUpdateLine,
  onAddLine,
  onRemoveLine,
  availableProducts,
  errors = {},
}: PurchaseOrderItemsSectionProps) => {
  const isCatalogueProvided = availableProducts !== undefined;
  const hasLiveCatalogue = Boolean(
    availableProducts && availableProducts.length > 0,
  );
  const productsList = availableProducts ?? [];

  const productOptions = [
    { value: "", label: "Search product..." },
    ...productsList.map((p) => ({
      value: p.name,
      label: `[${p.type === "PRODUCT" ? "Product" : "Service"}] ${p.name}${p.sku ? ` (${p.sku})` : ""} — ₹${p.purchasePrice ?? p.sellingPrice ?? 0}${p.unit ? ` / ${p.unit}` : ""}`,
    })),
    ...(!isCatalogueProvided
      ? [{ value: "__loading__", label: "Loading catalogue…", disabled: true }]
      : !hasLiveCatalogue
        ? [{ value: "__no_items__", label: "No products in catalogue", disabled: true }]
        : []),
    { value: "__custom__", label: "Custom product..." },
  ];

  const handleSelectProduct = (lineId: string, productName: string) => {
    if (!productName) {
      onUpdateLine(lineId, {
        productId: undefined,
        item: "",
        description: "",
        hsnSac: "",
        unit: "",
        unitPrice: 0,
        taxRate: 18,
      });
      return;
    }

    if (productName === "__custom__") {
      onUpdateLine(lineId, { productId: undefined, item: "Custom Product" });
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
          unit: realItem.unit || "",
          unitPrice: realItem.purchasePrice ?? realItem.sellingPrice ?? 0,
          taxRate: realItem.taxRate ?? 18,
        });
        return;
      }
      onUpdateLine(lineId, { productId: undefined, item: productName });
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
            Add products to this purchase order.
          </p>
        </div>
      </div>

      {errors.items && (
        <p className="mt-3 text-xs text-danger" role="alert">
          {errors.items}
        </p>
      )}

      {/* Items Entry Table with Proportional Balanced Column Widths */}
      <div className="mt-5">
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
            {items.map((line, index) => {
              const gross = line.quantity * line.unitPrice;
              const discAmt = gross * ((line.discount || 0) / 100);
              const taxable = Math.max(0, gross - discAmt);
              const taxAmt = taxable * ((line.taxRate || 0) / 100);
              const lineTotal = taxable + taxAmt;

              const isMatchedItem = isCatalogueProvided
                ? productsList.some((p) => p.name === line.item)
                : false;

              return (
                <TableRow key={line.id} className="align-top hover:bg-surface-alt/30 transition-colors">
                  {/* # */}
                  <TableCell className="py-3.5 text-center font-medium text-text-secondary pt-5">
                    {index + 1}
                  </TableCell>

                  {/* ITEM / DESCRIPTION */}
                  <TableCell className="py-3.5 pr-3">
                    <div className="space-y-1.5">
                      <Label htmlFor={`po-item-${line.id}`} className="sr-only">
                        {`Select product for item ${index + 1}`}
                      </Label>
                      <Select
                        id={`po-item-${line.id}`}
                        value={isMatchedItem ? line.item : line.item ? "__custom__" : ""}
                        onChange={(val) => handleSelectProduct(line.id, val)}
                        placeholder="Search product..."
                        options={productOptions}
                        className="h-9 text-xs"
                      />

                      {!isMatchedItem && line.item !== "" && (
                        <Input
                          type="text"
                          aria-label={`Item name for item ${index + 1}`}
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
                        aria-label={`Description for item ${index + 1}`}
                        value={line.description || ""}
                        onChange={(e: ChangeEvent<HTMLInputElement>) =>
                          onUpdateLine(line.id, { description: e.target.value })
                        }
                        placeholder="Add a description (optional)"
                        className="h-8 px-2.5 text-xs text-text-secondary"
                      />

                      {(errors[`item-${index}`] ||
                        errors[`items.${index}.item`] ||
                        errors[`item_${index}`]) && (
                        <p className="text-[11px] text-danger" role="alert">
                          {errors[`item-${index}`] ||
                            errors[`items.${index}.item`] ||
                            errors[`item_${index}`]}
                        </p>
                      )}
                    </div>
                  </TableCell>

                  {/* HSN / SAC */}
                  <TableCell className="py-3.5 pr-3 pt-4">
                    <Input
                      type="text"
                      aria-label={`HSN or SAC code for item ${index + 1}`}
                      value={line.hsnSac || ""}
                      onChange={(e: ChangeEvent<HTMLInputElement>) =>
                        onUpdateLine(line.id, { hsnSac: e.target.value })
                      }
                      placeholder="123456"
                      className="h-9 px-2.5 text-xs"
                    />
                  </TableCell>

                  {/* QTY */}
                  <TableCell className="py-3.5 pr-3 pt-4">
                    <Input
                      type="number"
                      aria-label={`Quantity for item ${index + 1}`}
                      min="0"
                      step="any"
                      value={line.quantity}
                      onChange={(e: ChangeEvent<HTMLInputElement>) =>
                        onUpdateLine(line.id, {
                          quantity: Math.max(0, parseFloat(e.target.value) || 0),
                        })
                      }
                      className="h-9 px-2 text-center text-xs"
                    />
                    {line.unit ? (
                      <span className="block mt-0.5 text-[10px] text-center font-mono text-text-muted">
                        {line.unit}
                      </span>
                    ) : null}
                    {errors[`items.${index}.quantity`] && (
                      <p className="mt-1 text-[11px] text-danger" role="alert">
                        {errors[`items.${index}.quantity`]}
                      </p>
                    )}
                  </TableCell>

                  {/* UNIT PRICE */}
                  <TableCell className="py-3.5 pr-3 pt-4">
                    <Input
                      type="number"
                      aria-label={`Unit price for item ${index + 1}`}
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
                    {errors[`items.${index}.unitPrice`] && (
                      <p className="mt-1 text-[11px] text-danger" role="alert">
                        {errors[`items.${index}.unitPrice`]}
                      </p>
                    )}
                  </TableCell>

                  {/* DISCOUNT */}
                  <TableCell className="py-3.5 pr-3 pt-4">
                    <div className="relative">
                      <Input
                        type="number"
                        aria-label={`Discount percentage for item ${index + 1}`}
                        min="0"
                        max="100"
                        step="any"
                        value={line.discount}
                        onChange={(e: ChangeEvent<HTMLInputElement>) =>
                          onUpdateLine(line.id, {
                            discount: Math.min(
                              100,
                              Math.max(0, parseFloat(e.target.value) || 0),
                            ),
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

                  {/* TAX */}
                  <TableCell className="py-3.5 pr-3 pt-4">
                    <Label htmlFor={`po-tax-${line.id}`} className="sr-only">
                      {`Tax rate for item ${index + 1}`}
                    </Label>
                    <Select
                      id={`po-tax-${line.id}`}
                      value={String(line.taxRate ?? 18)}
                      onChange={(val) =>
                        onUpdateLine(line.id, { taxRate: parseFloat(val) || 0 })
                      }
                      options={taxOptions}
                      className="h-9 text-xs"
                    />
                  </TableCell>

                  {/* AMOUNT */}
                  <TableCell className="py-3.5 pr-3 pt-5 text-right font-medium text-text-primary whitespace-nowrap text-xs sm:text-sm tabular-nums">
                    {formatCurrencyExact(lineTotal)}
                  </TableCell>

                  {/* REMOVE ACTION */}
                  <TableCell className="py-3.5 text-center pt-4">
                    <Button
                      type="button"
                      variant="secondary"
                      aria-label={`Remove item ${index + 1}`}
                      onClick={() => onRemoveLine(line.id)}
                      disabled={items.length <= 1}
                      className="h-8 w-8 p-0 hover:text-danger disabled:opacity-25"
                    >
                      <Trash2 size={15} />
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {/* Add Item button */}
      <Button
        type="button"
        variant="secondary"
        onClick={onAddLine}
        className="mt-4 px-3.5 py-2 text-xs"
      >
        <Plus size={14} className="text-primary-light" />
        <span>Add Item</span>
      </Button>
    </section>
  );
};
