"use client";

import Link from "next/link";
import { Check, CircleDollarSign, Pencil, SearchX, X } from "lucide-react";
import { useState, useTransition } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/shared/components/table";
import { Button, Input } from "@/shared/components/form";
import { formatProductPrice } from "@/features/products/domain/entities/product";
import { computeMarginPercent } from "../../domain/rules/pricing-rules";
import type { PricingEntryDto } from "../../data/dto/pricing-dto";
import { updateProductPricesAction } from "../../data/mutations/update-prices";

export type PricingTableProps = {
  entries: PricingEntryDto[];
  isFiltered?: boolean;
  onClearFilters?: () => void;
};

const PriceRowEditor = ({ entry, onSaved }: { entry: PricingEntryDto; onSaved: () => void }) => {
  const [isPending, startTransition] = useTransition();
  const [selling, setSelling] = useState(String(entry.sellingPrice));
  const [purchase, setPurchase] = useState(
    entry.purchasePrice === null || entry.purchasePrice === undefined ? "" : String(entry.purchasePrice),
  );
  const [error, setError] = useState<string | null>(null);

  const handleSave = () => {
    setError(null);
    startTransition(async () => {
      const result = await updateProductPricesAction(entry.productId, {
        sellingPrice: selling === "" ? 0 : parseFloat(selling),
        purchasePrice: purchase === "" ? null : parseFloat(purchase),
      });
      if (!result.success) {
        setError(result.error || "Failed to update prices.");
        return;
      }
      onSaved();
    });
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <Input
          type="number"
          min="0"
          step="0.01"
          value={selling}
          onChange={(e) => setSelling(e.target.value)}
          aria-label={`Selling price for ${entry.name}`}
          className="h-9 text-xs tabular-nums"
        />
        <Input
          type="number"
          min="0"
          step="0.01"
          value={purchase}
          onChange={(e) => setPurchase(e.target.value)}
          placeholder="Cost"
          aria-label={`Purchase price for ${entry.name}`}
          className="h-9 text-xs tabular-nums"
        />
        <Button
          variant="primary"
          onClick={handleSave}
          disabled={isPending}
          aria-label={`Save prices for ${entry.name}`}
          className="h-9 px-3 text-xs"
        >
          <Check size={14} />
        </Button>
      </div>
      {error && (
        <p className="text-[11px] text-danger" role="alert">
          {error}
        </p>
      )}
    </div>
  );
};

export const PricingTable = ({
  entries,
  isFiltered = false,
  onClearFilters,
}: PricingTableProps) => {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [savedMessage, setSavedMessage] = useState<string | null>(null);

  if (entries.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-border bg-surface-card p-12 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-surface-alt text-text-muted">
          {isFiltered ? <SearchX size={24} /> : <CircleDollarSign size={24} />}
        </div>
        <h3 className="mt-4 text-base font-semibold text-text-primary">
          {isFiltered ? "No matching items" : "No priced items yet"}
        </h3>
        <p className="mt-1 max-w-sm text-sm text-text-secondary">
          {isFiltered
            ? "No catalogue items matched your search query or filter criteria."
            : "Add products or services to manage their prices here."}
        </p>
        {isFiltered && onClearFilters ? (
          <button
            type="button"
            onClick={onClearFilters}
            className="mt-4 inline-flex h-9 items-center justify-center rounded-lg border border-border bg-surface-alt px-4 text-xs font-medium text-text-primary transition-colors hover:border-text-muted hover:bg-surface cursor-pointer"
          >
            Clear filters
          </button>
        ) : null}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {savedMessage && (
        <div className="rounded-lg border border-success/40 bg-success/10 p-3 text-sm text-success" role="status">
          {savedMessage}
        </div>
      )}
      <div className="overflow-hidden rounded-xl border border-border bg-surface-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[26%]">Item</TableHead>
              <TableHead className="w-[12%]">Category</TableHead>
              <TableHead className="w-[7%] text-center">Unit</TableHead>
              <TableHead className="w-[13%] text-right">Selling Price</TableHead>
              <TableHead className="w-[13%] text-right">Purchase Cost</TableHead>
              <TableHead className="w-[9%] text-center">Margin</TableHead>
              <TableHead className="w-[12%] text-right">Update Prices</TableHead>
              <TableHead className="w-[8%] text-right">Open</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {entries.map((entry) => {
              const margin = computeMarginPercent(entry.sellingPrice, entry.purchasePrice);
              const isEditing = editingId === entry.productId;
              const detailHref =
                entry.type === "PRODUCT" ? `/products/${entry.productId}` : `/services/${entry.productId}`;

              return (
                <TableRow key={entry.productId}>
                  <TableCell>
                    <Link
                      href={detailHref}
                      className="block truncate text-sm font-medium text-text-primary hover:text-primary-light hover:underline"
                    >
                      {entry.name}
                    </Link>
                    <p className="text-[11px] text-text-muted">
                      {entry.type === "PRODUCT" ? "Product" : "Service"} · {entry.currency} · {entry.taxRate}% tax excl.
                    </p>
                  </TableCell>

                  <TableCell>
                    <span className="inline-flex items-center rounded-md border border-border/70 bg-surface-alt px-2 py-0.5 text-xs text-text-secondary">
                      {entry.category || "General"}
                    </span>
                  </TableCell>

                  <TableCell className="text-center">
                    <span className="text-xs font-mono text-text-secondary">{entry.unit}</span>
                  </TableCell>

                  <TableCell className="text-right font-medium text-sm text-text-primary tabular-nums">
                    {formatProductPrice(entry.sellingPrice, entry.currency)}
                  </TableCell>

                  <TableCell className="text-right text-sm text-text-secondary tabular-nums">
                    {entry.purchasePrice === null || entry.purchasePrice === undefined
                      ? "—"
                      : formatProductPrice(entry.purchasePrice, entry.currency)}
                  </TableCell>

                  <TableCell className="text-center">
                    <span className="text-xs font-mono text-text-secondary">
                      {margin === null ? "—" : `${margin}%`}
                    </span>
                  </TableCell>

                  <TableCell className="text-right">
                    {isEditing ? (
                      <div className="flex items-start justify-end gap-2">
                        <div className="w-64">
                          <PriceRowEditor
                            entry={entry}
                            onSaved={() => {
                              setEditingId(null);
                              setSavedMessage(`Prices updated for ${entry.name}. Future documents use the new defaults.`);
                            }}
                          />
                        </div>
                        <button
                          type="button"
                          onClick={() => setEditingId(null)}
                          aria-label={`Cancel editing ${entry.name}`}
                          className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-border/60 text-text-secondary transition-colors hover:border-text-muted hover:bg-surface-alt hover:text-text-primary cursor-pointer"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => {
                          setSavedMessage(null);
                          setEditingId(entry.productId);
                        }}
                        aria-label={`Edit prices for ${entry.name}`}
                        className="inline-flex h-8 items-center justify-center gap-1 rounded-lg border border-border/60 px-2.5 text-text-secondary transition-colors hover:border-text-muted hover:bg-surface-alt hover:text-text-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-focus cursor-pointer"
                      >
                        <Pencil size={13} />
                        <span className="text-xs">Edit</span>
                      </button>
                    )}
                  </TableCell>

                  <TableCell className="text-right">
                    <Link
                      href={`${detailHref}/edit`}
                      aria-label={`Open ${entry.name}`}
                      className="inline-flex h-8 items-center justify-center rounded-lg border border-border/60 px-2.5 text-xs font-medium text-text-secondary transition-colors hover:border-text-muted hover:bg-surface-alt hover:text-text-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-focus"
                    >
                      Open
                    </Link>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};
