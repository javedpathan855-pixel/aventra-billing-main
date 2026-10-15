import { Layers, Plus, Trash2 } from "lucide-react";
import type { ChangeEvent } from "react";
import type {
  PurchaseReturnItem,
  ReturnDisposition,
} from "../../domain/entities/purchase-return";
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

export type PurchaseReturnItemsSectionProps = {
  items: PurchaseReturnItem[];
  onUpdateLine: (id: string, patch: Partial<PurchaseReturnItem>) => void;
  onAddLine: () => void;
  onRemoveLine: (id: string) => void;
  availableProducts?: ProductDto[];
  remainingByBillItemId?: Record<string, number>;
  errors?: Record<string, string>;
};

const taxOptions = [
  { value: "0", label: "0%" },
  { value: "5", label: "5%" },
  { value: "12", label: "12%" },
  { value: "18", label: "18%" },
  { value: "28", label: "28%" },
];

const dispositionOptions = [
  { value: "RESTOCK", label: "Restock" },
  { value: "DAMAGED", label: "Damaged" },
  { value: "QUARANTINE", label: "Quarantine" },
];

const formatCurrencyExact = (val: number): string =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(val);

/**
 * Purchase return line editor. Follows the invoice/order/bill items layout
 * (proportional fixed columns, stacked product/description cell, compact
 * numeric fields, icon-only row removal). Return quantities are validated
 * against remaining bill quantities on the server; the billed quantity
 * column is a read-only reference.
 */
export const PurchaseReturnItemsSection = ({
  items,
  onUpdateLine,
  onAddLine,
  onRemoveLine,
  availableProducts,
  remainingByBillItemId = {},
  errors = {},
}: PurchaseReturnItemsSectionProps) => {
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
        purchaseBillItemId: undefined,
        item: "",
        description: "",
        hsnSac: "",
        billedQuantity: 0,
        returnQuantity: 0,
        unitPrice: 0,
        taxRate: 18,
      });
      return;
    }

    if (productName === "__custom__") {
      onUpdateLine(lineId, {
        productId: undefined,
        purchaseBillItemId: undefined,
        item: "Custom Product",
      });
      return;
    }

    if (isCatalogueProvided) {
      const realItem = productsList.find((p) => p.name === productName);
      if (realItem) {
        onUpdateLine(lineId, {
          productId: realItem.id,
          purchaseBillItemId: undefined,
          item: realItem.name,
          description: realItem.description || realItem.name,
          hsnSac: realItem.hsnSac || "",
          billedQuantity: 0,
          unitPrice: realItem.purchasePrice ?? realItem.sellingPrice ?? 0,
          taxRate: realItem.taxRate ?? 18,
        });
        return;
      }
      onUpdateLine(lineId, {
        productId: undefined,
        purchaseBillItemId: undefined,
        item: productName,
      });
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
            Return Items
          </h2>
          <p className="mt-0.5 text-xs text-text-secondary">
            Quantities sent back to the supplier, priced as originally billed.
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
        <Table className="min-w-[980px] table-fixed text-xs">
          <TableHeader>
            <TableRow>
              <TableHead scope="col" className="w-[3%] min-w-[32px] pb-3 text-center">
                #
              </TableHead>
              <TableHead scope="col" className="w-[27%] min-w-[220px] pb-3 pr-3">
                Item / Description
              </TableHead>
              <TableHead scope="col" className="w-[7%] min-w-[64px] pb-3 pr-3 text-center">
                Billed
              </TableHead>
              <TableHead scope="col" className="w-[8%] min-w-[76px] pb-3 pr-3 text-center">
                Return
              </TableHead>
              <TableHead scope="col" className="w-[11%] min-w-[104px] pb-3 pr-3">
                Unit Price
              </TableHead>
              <TableHead scope="col" className="w-[7%] min-w-[68px] pb-3 pr-3">
                Disc%
              </TableHead>
              <TableHead scope="col" className="w-[8%] min-w-[80px] pb-3 pr-3">
                Tax
              </TableHead>
              <TableHead scope="col" className="w-[10%] min-w-[100px] pb-3 pr-3 text-right">
                Amount
              </TableHead>
              <TableHead scope="col" className="w-[11%] min-w-[110px] pb-3 pr-3">
                Disposition
              </TableHead>
              <TableHead scope="col" className="w-[4%] min-w-[36px] pb-3 text-center">
                <span className="sr-only">Row action</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((line, index) => {
              const gross = line.returnQuantity * line.unitPrice;
              const discAmt = gross * ((line.discount || 0) / 100);
              const taxable = Math.max(0, gross - discAmt);
              const taxAmt = taxable * ((line.taxRate || 0) / 100);
              const lineTotal = taxable + taxAmt;

              const isMatchedItem = isCatalogueProvided
                ? productsList.some((p) => p.name === line.item)
                : false;

              const remaining =
                line.purchaseBillItemId !== null &&
                line.purchaseBillItemId !== undefined
                  ? remainingByBillItemId[line.purchaseBillItemId]
                  : undefined;

              return (
                <TableRow key={line.id} className="align-top hover:bg-surface-alt/30 transition-colors">
                  {/* # */}
                  <TableCell className="py-3.5 text-center font-medium text-text-secondary pt-5">
                    {index + 1}
                  </TableCell>

                  {/* ITEM / DESCRIPTION */}
                  <TableCell className="py-3.5 pr-3">
                    <div className="space-y-1.5">
                      <Label htmlFor={`pr-item-${line.id}`} className="sr-only">
                        {`Select product for item ${index + 1}`}
                      </Label>
                      <Select
                        id={`pr-item-${line.id}`}
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
                        errors[`items.${index}.item`]) && (
                        <p className="text-[11px] text-danger" role="alert">
                          {errors[`item-${index}`] ||
                            errors[`items.${index}.item`]}
                        </p>
                      )}
                    </div>
                  </TableCell>

                  {/* BILLED (reference) */}
                  <TableCell className="py-3.5 pr-3 pt-5 text-center font-mono text-text-secondary">
                    {line.billedQuantity}
                  </TableCell>

                  {/* RETURN QTY */}
                  <TableCell className="py-3.5 pr-3 pt-4">
                    <Input
                      type="number"
                      aria-label={`Return quantity for item ${index + 1}`}
                      min="0"
                      step="any"
                      value={line.returnQuantity}
                      onChange={(e: ChangeEvent<HTMLInputElement>) =>
                        onUpdateLine(line.id, {
                          returnQuantity: Math.max(
                            0,
                            parseFloat(e.target.value) || 0,
                          ),
                        })
                      }
                      className="h-9 px-2 text-center text-xs"
                    />
                    {remaining !== undefined && (
                      <p className="mt-1 text-[11px] text-text-muted text-center">
                        of {remaining} left
                      </p>
                    )}
                    {errors[`items.${index}.returnQuantity`] && (
                      <p className="mt-1 text-[11px] text-danger" role="alert">
                        {errors[`items.${index}.returnQuantity`]}
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
                    <Label htmlFor={`pr-tax-${line.id}`} className="sr-only">
                      {`Tax rate for item ${index + 1}`}
                    </Label>
                    <Select
                      id={`pr-tax-${line.id}`}
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

                  {/* DISPOSITION */}
                  <TableCell className="py-3.5 pr-3 pt-4">
                    <Label htmlFor={`pr-disposition-${line.id}`} className="sr-only">
                      {`Disposition for item ${index + 1}`}
                    </Label>
                    <Select
                      id={`pr-disposition-${line.id}`}
                      value={line.disposition}
                      onChange={(val) =>
                        onUpdateLine(line.id, { disposition: val as ReturnDisposition })
                      }
                      options={dispositionOptions}
                      className="h-9 text-xs"
                    />
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
