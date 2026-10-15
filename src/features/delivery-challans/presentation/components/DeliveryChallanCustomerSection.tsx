"use client";

import Link from "next/link";
import { Mail, MapPin, Search, ShoppingCart, Truck, Users } from "lucide-react";
import type { ChangeEvent } from "react";
import { DatePicker, Input, Label, Select, Textarea } from "@/shared/components/form";
import { cn } from "@/shared/utils/cn";
import type { DeliverableSalesOrder } from "../../domain/entities/delivery-challan";

export type DeliveryChallanCustomerSectionProps = {
  deliverableOrders: DeliverableSalesOrder[];
  selectedOrderId: string;
  onSelectOrder: (orderId: string) => void;
  customerName: string;
  onCustomerNameChange: (val: string) => void;
  customerEmail: string;
  onCustomerEmailChange: (val: string) => void;
  challanNumberPreview: string;
  challanDate: string;
  onChallanDateChange: (val: string) => void;
  dispatchDate: string;
  onDispatchDateChange: (val: string) => void;
  deliveryReason: string;
  onDeliveryReasonChange: (val: string) => void;
  customerAddress: string;
  onCustomerAddressChange: (val: string) => void;
  deliveryAddress: string;
  onDeliveryAddressChange: (val: string) => void;
  fieldErrors?: Record<string, string>;
};

export const DeliveryChallanCustomerSection = ({
  deliverableOrders,
  selectedOrderId,
  onSelectOrder,
  customerName,
  onCustomerNameChange,
  customerEmail,
  onCustomerEmailChange,
  challanNumberPreview,
  challanDate,
  onChallanDateChange,
  dispatchDate,
  onDispatchDateChange,
  deliveryReason,
  onDeliveryReasonChange,
  customerAddress,
  onCustomerAddressChange,
  deliveryAddress,
  onDeliveryAddressChange,
  fieldErrors = {},
}: DeliveryChallanCustomerSectionProps) => {
  const selectedOrder =
    deliverableOrders.find((o) => o.id === selectedOrderId) || null;

  const orderOptions = [
    { value: "", label: "— Select Confirmed Sales Order (Optional) —" },
    ...deliverableOrders.map((o) => ({
      value: o.id,
      label: `${o.orderNumber} - ${o.customerName} (${
        o.items.filter((i) => i.remainingDeliverableQuantity > 0).length
      } pending items)`,
    })),
  ];

  return (
    <section className="rounded-xl border border-border bg-surface-card p-5 sm:p-6 transition-colors space-y-6">
      {/* 1. Section Header */}
      <div className="flex items-center gap-3">
        <div
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-border/70 bg-surface-alt/70 text-primary-light"
          aria-hidden="true"
        >
          <Truck size={19} />
        </div>
        <div>
          <h2 className="font-heading text-lg font-semibold tracking-tight text-text-primary">
            Dispatch &amp; Customer Details
          </h2>
          <p className="mt-0.5 text-xs text-text-secondary">
            Select a confirmed sales order and specify challan dates and delivery reason.
          </p>
        </div>
      </div>

      {/* 2. Order Selector + Snapshot */}
      <div className="space-y-4">
        <div className="w-full max-w-2xl">
          <div className="mb-1.5 flex items-center justify-between">
            <Label
              htmlFor="delivery-challan-order-select"
              className="text-xs font-semibold tracking-wide uppercase text-text-secondary"
            >
              Source Sales Order
            </Label>
            <Link
              href="/sales-orders"
              target="_blank"
              className="text-xs font-semibold text-primary-light hover:text-primary transition-colors"
            >
              View Sales Orders &rarr;
            </Link>
          </div>

          <div className="relative">
            <Select
              id="delivery-challan-order-select"
              value={selectedOrderId}
              onChange={onSelectOrder}
              options={orderOptions}
            />
            <Search
              size={14}
              className="pointer-events-none absolute right-8 top-1/2 -translate-y-1/2 text-text-muted"
              aria-hidden="true"
            />
          </div>
          <p className="mt-1 text-xs text-text-muted">
            Selecting an order pre-fills customer details, delivery location, and pending item balances.
          </p>
        </div>

        {/* Selected Order Snapshot Card */}
        {selectedOrder ? (
          <div className="rounded-xl border border-border/80 bg-surface-alt/40 p-4 transition-colors">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/60 pb-3">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-text-primary text-sm sm:text-base">
                  {selectedOrder.customerName}
                </span>
                <span className="rounded-full bg-surface-card border border-border px-2 py-0.5 text-[10px] font-medium text-text-secondary">
                  Order: {selectedOrder.orderNumber}
                </span>
              </div>
              <div className="flex items-center gap-3 text-xs">
                {selectedOrder.customerGstin ? (
                  <span className="rounded bg-surface-card px-2 py-0.5 font-mono text-[11px] font-medium text-text-secondary border border-border/60">
                    GSTIN: {selectedOrder.customerGstin}
                  </span>
                ) : (
                  <span className="text-text-muted text-[11px]">Unregistered</span>
                )}
              </div>
            </div>

            <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4 text-xs">
              <div className="flex items-start gap-2">
                <Mail size={14} className="mt-0.5 shrink-0 text-text-muted" />
                <div className="min-w-0">
                  <span className="text-text-muted block text-[10px] uppercase tracking-wider font-medium">
                    Billing Email
                  </span>
                  <span className="text-text-primary font-medium truncate block">
                    {selectedOrder.customerEmail || "—"}
                  </span>
                </div>
              </div>

              <div className="flex items-start gap-2">
                <ShoppingCart size={14} className="mt-0.5 shrink-0 text-text-muted" />
                <div className="min-w-0">
                  <span className="text-text-muted block text-[10px] uppercase tracking-wider font-medium">
                    Reference Sale
                  </span>
                  <span className="text-text-primary font-medium block font-mono">
                    {selectedOrder.orderNumber}
                  </span>
                </div>
              </div>

              <div className="flex items-start gap-2">
                <MapPin size={14} className="mt-0.5 shrink-0 text-text-muted" />
                <div className="min-w-0">
                  <span className="text-text-muted block text-[10px] uppercase tracking-wider font-medium">
                    Billing Address
                  </span>
                  <span className="text-text-secondary line-clamp-2 leading-relaxed">
                    {selectedOrder.customerAddress || "No billing address provided"}
                  </span>
                </div>
              </div>

              <div className="flex items-start gap-2">
                <Truck size={14} className="mt-0.5 shrink-0 text-text-muted" />
                <div className="min-w-0">
                  <span className="text-text-muted block text-[10px] uppercase tracking-wider font-medium">
                    Pending Lines
                  </span>
                  <span className="text-text-primary font-medium block">
                    {
                      selectedOrder.items.filter(
                        (i) => i.remainingDeliverableQuantity > 0,
                      ).length
                    }{" "}
                    of {selectedOrder.items.length} items
                  </span>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="rounded-xl border border-dashed border-border/80 bg-surface-alt/20 p-4 text-center">
            <Users size={20} className="mx-auto text-text-muted mb-1" />
            <p className="text-xs text-text-secondary">
              No sales order selected yet. Choose an order above to load address snapshots and pending balances, or enter details manually below.
            </p>
          </div>
        )}

        {/* Manual Customer Fallback only when no order is selected.
            When an order is selected, customer details come from the
            snapshot card above instead of duplicating inputs. */}
        {!selectedOrderId && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label
                htmlFor="delivery-challan-customer-name"
                className="text-xs font-semibold tracking-wide uppercase text-text-secondary"
              >
                Customer / Consignee Name <span className="text-danger">*</span>
              </Label>
              <Input
                id="delivery-challan-customer-name"
                type="text"
                value={customerName}
                onChange={(e: ChangeEvent<HTMLInputElement>) =>
                  onCustomerNameChange(e.target.value)
                }
                placeholder="e.g. Acme Corporation"
                className={cn("mt-1.5 h-10 text-sm", fieldErrors.customerName && "border-danger focus:border-danger")}
              />
              {fieldErrors.customerName && (
                <p className="mt-1 text-xs text-danger">{fieldErrors.customerName}</p>
              )}
            </div>

            <div>
              <Label
                htmlFor="delivery-challan-customer-email"
                className="text-xs font-semibold tracking-wide uppercase text-text-secondary"
              >
                Customer Email
              </Label>
              <Input
                id="delivery-challan-customer-email"
                type="email"
                value={customerEmail}
                onChange={(e: ChangeEvent<HTMLInputElement>) =>
                  onCustomerEmailChange(e.target.value)
                }
                placeholder="customer@example.com"
                className="mt-1.5 h-10 text-sm"
              />
              {fieldErrors.customerEmail && (
                <p className="mt-1 text-xs text-danger">{fieldErrors.customerEmail}</p>
              )}
            </div>
          </div>
        )}
      </div>

      {/* 3. Parameter Fields Row */}
      <div className="border-t border-border/80 pt-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <Label
              htmlFor="delivery-challan-number"
              className="text-xs font-semibold tracking-wide uppercase text-text-secondary"
            >
              Challan Number
            </Label>
            <div className="mt-1.5">
              <Input
                id="delivery-challan-number"
                type="text"
                value={challanNumberPreview}
                readOnly
                placeholder="DC-0001"
                className="font-mono text-sm bg-surface-alt/40 cursor-not-allowed"
              />
            </div>
            <p className="mt-1 text-[11px] text-text-muted">
              Auto-allocated on save.
            </p>
          </div>

          <div>
            <Label
              htmlFor="delivery-challan-date"
              className="text-xs font-semibold tracking-wide uppercase text-text-secondary"
            >
              Challan Date <span className="text-danger">*</span>
            </Label>
            <div className="mt-1.5">
              <DatePicker
                id="delivery-challan-date"
                value={challanDate}
                onChange={onChallanDateChange}
                className={cn(fieldErrors.challanDate && "border-danger focus:border-danger")}
              />
              {fieldErrors.challanDate && (
                <p className="mt-1 text-xs text-danger">{fieldErrors.challanDate}</p>
              )}
            </div>
          </div>

          <div>
            <Label
              htmlFor="delivery-challan-dispatch-date"
              className="text-xs font-semibold tracking-wide uppercase text-text-secondary"
            >
              Expected Dispatch
            </Label>
            <div className="mt-1.5">
              <DatePicker
                id="delivery-challan-dispatch-date"
                value={dispatchDate}
                onChange={onDispatchDateChange}
              />
            </div>
          </div>

          <div>
            <Label
              htmlFor="delivery-challan-reason"
              className="text-xs font-semibold tracking-wide uppercase text-text-secondary"
            >
              Delivery Reason
            </Label>
            <div className="mt-1.5">
              <Input
                id="delivery-challan-reason"
                type="text"
                value={deliveryReason}
                onChange={(e: ChangeEvent<HTMLInputElement>) =>
                  onDeliveryReasonChange(e.target.value)
                }
                placeholder="e.g. Supply against Sales Order"
                className="text-sm"
              />
            </div>
          </div>
        </div>
      </div>

      {/* 4. Address Row — manual entry only; order-linked addresses
          come from the snapshot above. */}
      {!selectedOrderId && (
        <div className="border-t border-border/80 pt-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label
                htmlFor="delivery-challan-customer-address"
                className="text-xs font-semibold tracking-wide uppercase text-text-secondary"
              >
                Billing Address
              </Label>
              <Textarea
                id="delivery-challan-customer-address"
                rows={2}
                value={customerAddress}
                onChange={(e: ChangeEvent<HTMLTextAreaElement>) =>
                  onCustomerAddressChange(e.target.value)
                }
                placeholder="Customer registered address..."
                className="mt-1.5 text-sm"
              />
            </div>

            <div>
              <Label
                htmlFor="delivery-challan-delivery-address"
                className="text-xs font-semibold tracking-wide uppercase text-text-secondary"
              >
                Destination Delivery Address
              </Label>
              <Textarea
                id="delivery-challan-delivery-address"
                rows={2}
                value={deliveryAddress}
                onChange={(e: ChangeEvent<HTMLTextAreaElement>) =>
                  onDeliveryAddressChange(e.target.value)
                }
                placeholder="Physical warehouse/site delivery location..."
                className="mt-1.5 text-sm"
              />
            </div>
          </div>
        </div>
      )}
    </section>
  );
};
