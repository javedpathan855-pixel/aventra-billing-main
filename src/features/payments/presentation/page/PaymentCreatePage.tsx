"use client";

import Link from "next/link";
import { ArrowLeft, Banknote, X } from "lucide-react";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  PAYMENT_METHODS,
  formatCurrency,
  roundCurrency,
  type PaymentMethod,
} from "../../domain/payment";
import { recordPaymentAction } from "../../data/mutations/payment-mutations";
import type { PayableInvoiceOption } from "../../data/queries/get-payable-invoices";
import {
  Button,
  Checkbox,
  DatePicker,
  FieldError,
  FormError,
  Input,
  Label,
  Select,
  Textarea,
} from "@/shared/components/form";

const getTodayDateString = (): string => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

export type PaymentCustomerOption = {
  id: string;
  name: string;
  email: string;
};

export type PaymentCreatePageProps = {
  initialCustomers?: PaymentCustomerOption[];
  initialInvoices?: PayableInvoiceOption[];
  preselectedInvoiceId?: string;
  preselectedCustomerId?: string;
};

export const PaymentCreatePage = ({
  initialCustomers = [],
  initialInvoices = [],
  preselectedInvoiceId,
  preselectedCustomerId,
}: PaymentCreatePageProps) => {
  const router = useRouter();
  const today = useMemo(() => getTodayDateString(), []);

  const [selectedCustomerId, setSelectedCustomerId] = useState(
    () =>
      preselectedCustomerId ||
      initialInvoices.find((inv) => inv.id === preselectedInvoiceId)?.customerId ||
      "",
  );
  const [selectedInvoiceIds, setSelectedInvoiceIds] = useState<Set<string>>(
    () => new Set(preselectedInvoiceId ? [preselectedInvoiceId] : []),
  );
  const [allocations, setAllocations] = useState<Record<string, number>>({});
  const [amount, setAmount] = useState(0);
  const [amountTouched, setAmountTouched] = useState(false);
  const [paymentDate, setPaymentDate] = useState(today);
  const [method, setMethod] = useState<PaymentMethod>("Bank Transfer");
  const [reference, setReference] = useState("");
  const [notes, setNotes] = useState("");
  // One idempotency key per form instance: repeated submissions of the same
  // form return the original payment instead of duplicating it.
  const [idempotencyKey] = useState(() => crypto.randomUUID());

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const customerInvoices = useMemo(
    () =>
      selectedCustomerId
        ? initialInvoices.filter((inv) => inv.customerId === selectedCustomerId)
        : initialInvoices,
    [initialInvoices, selectedCustomerId],
  );

  const selectedInvoices = useMemo(
    () => customerInvoices.filter((inv) => selectedInvoiceIds.has(inv.id)),
    [customerInvoices, selectedInvoiceIds],
  );

  const allocationTotal = useMemo(
    () =>
      roundCurrency(
        selectedInvoices.reduce(
          (sum, inv) => sum + (allocations[inv.id] ?? inv.remainingBalance),
          0,
        ),
      ),
    [selectedInvoices, allocations],
  );

  const effectiveAmount = amountTouched ? amount : allocationTotal;
  const allocationGap = roundCurrency(effectiveAmount - allocationTotal);

  const handleSelectCustomer = (customerId: string) => {
    setSelectedCustomerId(customerId);
    setSelectedInvoiceIds(new Set());
    setAllocations({});
    setAmount(0);
    setAmountTouched(false);
    setErrors({});
    setSubmitError(null);
  };

  const toggleInvoice = (invoiceId: string) => {
    setSelectedInvoiceIds((prev) => {
      const next = new Set(prev);
      if (next.has(invoiceId)) {
        next.delete(invoiceId);
      } else {
        next.add(invoiceId);
      }
      return next;
    });
    setErrors({});
    setSubmitError(null);
  };

  const setAllocation = (invoiceId: string, value: number) => {
    setAllocations((prev) => ({ ...prev, [invoiceId]: value }));
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};
    if (!selectedCustomerId) {
      newErrors.customerId = "Select the customer who paid.";
    }
    if (!paymentDate) {
      newErrors.paymentDate = "Payment date is required.";
    } else if (paymentDate > today) {
      newErrors.paymentDate = "Payment date cannot be in the future.";
    }
    if (!(effectiveAmount > 0)) {
      newErrors.amount = "Amount received must be greater than zero.";
    }
    if (selectedInvoices.length === 0) {
      newErrors.allocations = "Allocate the payment to at least one invoice.";
    }
    for (const inv of selectedInvoices) {
      const lineAmount = allocations[inv.id] ?? inv.remainingBalance;
      if (!(lineAmount > 0)) {
        newErrors[`amount-${inv.id}`] = "Allocation must be greater than zero.";
      } else if (roundCurrency(lineAmount) > roundCurrency(inv.remainingBalance) + 0.001) {
        newErrors[`amount-${inv.id}`] =
          `Exceeds the outstanding balance (${formatCurrency(inv.remainingBalance)}).`;
      }
    }
    if (Math.abs(allocationGap) > 0.001) {
      newErrors.amount =
        allocationGap > 0
          ? `Unallocated remainder (${formatCurrency(allocationGap)}) is not permitted. Allocate the full amount.`
          : `Allocations exceed the received amount by ${formatCurrency(Math.abs(allocationGap))}.`;
    }

    setErrors(newErrors);
    if (Object.keys(newErrors).length > 0) {
      setSubmitError(Object.values(newErrors)[0] || "Please review the highlighted form errors.");
      return false;
    }
    return true;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;
    setIsSubmitting(true);
    setSubmitError(null);

    try {
      const result = await recordPaymentAction({
        customerId: selectedCustomerId,
        amount: roundCurrency(effectiveAmount),
        paymentDate,
        method,
        reference: reference.trim() || undefined,
        notes: notes.trim() || undefined,
        idempotencyKey,
        allocations: selectedInvoices.map((inv) => ({
          invoiceId: inv.id,
          amount: roundCurrency(allocations[inv.id] ?? inv.remainingBalance),
        })),
      });

      if (!result.success) {
        setSubmitError(result.error || "Failed to record payment.");
        if (result.fieldErrors) {
          setErrors(result.fieldErrors);
        }
        setIsSubmitting(false);
        return;
      }

      router.push(`/payments/${result.data?.id ?? ""}`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "An unexpected server error occurred.";
      setSubmitError(msg);
      setIsSubmitting(false);
    }
  };

  return (
    <section className="space-y-6">
      <div>
        <Link
          href="/payments"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-primary-light transition-colors hover:text-primary-foreground focus-visible:outline focus-visible:outline-2 focus-visible:outline-focus"
        >
          <ArrowLeft size={16} />
          <span>Back to Payments</span>
        </Link>
      </div>

      <header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="font-heading text-2xl sm:text-3xl font-bold tracking-tight text-text-primary">
            Record Payment
          </h1>
          <p className="mt-1 text-sm text-text-secondary">
            Record customer cash received and allocate it in full to open invoices.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2.5">
          <Button
            variant="primary"
            disabled={isSubmitting}
            onClick={handleSubmit}
            className="h-10 px-5 text-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-focus"
          >
            <Banknote size={16} />
            <span>{isSubmitting ? "Recording..." : "Record Payment"}</span>
          </Button>
        </div>
      </header>

      {submitError && <FormError message={submitError} />}

      <div className="rounded-xl border border-border bg-surface-card p-4 sm:p-6 space-y-4">
        <h2 className="font-heading text-lg font-semibold text-text-primary">
          1. Payment Details
        </h2>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="payment-customer">Customer *</Label>
            <Select
              id="payment-customer"
              value={selectedCustomerId}
              onChange={handleSelectCustomer}
              className="mt-1 h-10"
            >
              <option value="">Select customer</option>
              {initialCustomers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </Select>
            {errors.customerId && (
              <FieldError id="payment-customer-error" message={errors.customerId} />
            )}
          </div>

          <div>
            <Label htmlFor="payment-method">Payment Method *</Label>
            <Select
              id="payment-method"
              value={method}
              onChange={(val) => setMethod(val as PaymentMethod)}
              className="mt-1 h-10"
            >
              {PAYMENT_METHODS.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </Select>
          </div>

          <div>
            <Label htmlFor="payment-amount">Amount Received (₹) *</Label>
            <Input
              id="payment-amount"
              type="number"
              min="0"
              step="0.01"
              value={amountTouched ? amount || "" : allocationTotal || ""}
              onChange={(e) => {
                setAmount(parseFloat(e.target.value) || 0);
                setAmountTouched(true);
              }}
              placeholder="0.00"
              startIcon={<span className="text-xs">₹</span>}
              className="mt-1 h-10 text-sm tabular-nums"
            />
            {errors.amount && <FieldError id="payment-amount-error" message={errors.amount} />}
          </div>

          <div>
            <Label htmlFor="payment-date">Payment Date *</Label>
            <div className="mt-1">
              <DatePicker
                id="payment-date"
                value={paymentDate}
                onChange={setPaymentDate}
                maxDate={today}
                aria-invalid={Boolean(errors.paymentDate)}
                aria-describedby={errors.paymentDate ? "payment-date-error" : undefined}
              />
            </div>
            {errors.paymentDate && (
              <FieldError id="payment-date-error" message={errors.paymentDate} />
            )}
          </div>

          <div>
            <Label htmlFor="payment-reference">Reference / Transaction No.</Label>
            <Input
              id="payment-reference"
              type="text"
              value={reference}
              onChange={(e) => setReference(e.target.value)}
              placeholder="e.g. UPI ref, cheque no."
              className="mt-1 h-10 text-sm"
            />
          </div>

          <div className="sm:col-span-2">
            <Label htmlFor="payment-notes">Notes</Label>
            <Textarea
              id="payment-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Optional remarks"
              rows={2}
              className="mt-1 text-sm"
            />
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-surface-card p-4 sm:p-6 space-y-4">
        <h2 className="font-heading text-lg font-semibold text-text-primary">
          2. Allocate to Invoices
        </h2>

        {!selectedCustomerId ? (
          <div className="rounded-lg border border-dashed border-border p-4 text-center text-xs text-text-muted">
            Select a customer above to list their open invoices.
          </div>
        ) : customerInvoices.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border p-4 text-center text-xs text-text-muted">
            No open invoices for this customer. Nothing is due.
          </div>
        ) : (
          <div className="divide-y divide-border/60">
            {customerInvoices.map((inv) => {
              const checked = selectedInvoiceIds.has(inv.id);
              const lineAmount = allocations[inv.id] ?? inv.remainingBalance;
              return (
                <div key={inv.id} className="flex flex-wrap items-center gap-3 py-3 text-sm">
                  <Checkbox
                    id={`allocate-${inv.id}`}
                    checked={checked}
                    onChange={() => toggleInvoice(inv.id)}
                    aria-label={`Allocate to invoice ${inv.invoiceNumber}`}
                  />
                  <div className="min-w-0 flex-1">
                    <label htmlFor={`allocate-${inv.id}`} className="cursor-pointer font-medium text-text-primary">
                      {inv.invoiceNumber}
                    </label>
                    <p className="text-xs text-text-muted">
                      Total {formatCurrency(inv.total)} · Outstanding{" "}
                      {formatCurrency(inv.remainingBalance)} · {inv.status}
                    </p>
                  </div>
                  <div className="w-40">
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      aria-label={`Allocation amount for invoice ${inv.invoiceNumber}`}
                      value={checked ? lineAmount || "" : ""}
                      disabled={!checked}
                      onChange={(e) => setAllocation(inv.id, parseFloat(e.target.value) || 0)}
                      placeholder="0.00"
                      className="h-9 text-sm tabular-nums"
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {errors.allocations && <FieldError id="payment-allocations-error" message={errors.allocations} />}
        {Object.keys(errors)
          .filter((key) => key.startsWith("amount-"))
          .map((key) => (
            <FieldError key={key} id={`payment-${key}-error`} message={errors[key] ?? ""} />
          ))}

        <div className="flex justify-between items-center rounded-lg bg-surface-alt px-3.5 py-3 text-base font-bold">
          <span className="text-sm text-text-secondary">
            Allocated {formatCurrency(allocationTotal)} of {formatCurrency(effectiveAmount)}
          </span>
          <span className="text-primary-light text-lg tabular-nums">
            {formatCurrency(allocationTotal)}
          </span>
        </div>
      </div>

      <div className="flex flex-col-reverse gap-3 pt-2 sm:flex-row sm:items-center sm:justify-end">
        <Link
          href="/payments"
          className="inline-flex h-10 items-center justify-center gap-1.5 rounded-lg border border-border bg-surface-alt px-4 text-sm font-medium text-text-secondary transition-colors hover:border-text-muted hover:text-text-primary"
        >
          <X size={15} />
          <span>Cancel</span>
        </Link>

        <Button
          variant="primary"
          disabled={isSubmitting}
          onClick={handleSubmit}
          className="h-10 px-5 text-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-focus"
        >
          <Banknote size={16} />
          <span>{isSubmitting ? "Recording..." : "Record Payment"}</span>
        </Button>
      </div>
    </section>
  );
};
