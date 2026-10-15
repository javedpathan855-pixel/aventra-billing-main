"use client";

import Link from "next/link";
import { ArrowLeft, CheckCircle2, WalletCards, X } from "lucide-react";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { SupplierDto } from "@/features/suppliers";
import {
  allocatedTotal,
  roundCurrency,
  validateSupplierPaymentAllocations,
  type SupplierPaymentMethod,
} from "../../domain/supplier-payment";
import { getTodayDateString } from "../../domain/rules/supplier-payment-rules";
import type { PayableBillOption } from "../../data/queries/get-payable-bills";
import { formatSupplierAddress } from "@/features/suppliers";
import { recordSupplierPaymentAction } from "../../data/mutations/supplier-payment-mutations";
import {
  SupplierPaymentDetailsSection,
  type SampleSupplier,
} from "../components/SupplierPaymentDetailsSection";
import {
  SupplierPaymentAllocationSection,
  type AllocationDraft,
} from "../components/SupplierPaymentAllocationSection";
import { Button } from "@/shared/components/form";

export type SupplierPaymentCreatePageProps = {
  initialSuppliers?: SupplierDto[];
  initialPayableBills?: PayableBillOption[];
  preselectedSupplierId?: string;
};

export const SupplierPaymentCreatePage = ({
  initialSuppliers = [],
  initialPayableBills = [],
  preselectedSupplierId = "",
}: SupplierPaymentCreatePageProps) => {
  const router = useRouter();

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const formattedSuppliers: SampleSupplier[] = useMemo(() => {
    return initialSuppliers.map((s) => ({
      id: s.id,
      name: s.name,
      email: s.email || "",
      address: formatSupplierAddress(s.billingAddress),
      gstin: s.gstin || "",
      phone: s.phone || undefined,
      contactPerson: s.contactPerson || undefined,
      pan: s.pan || undefined,
      state: s.billingAddress.state,
      placeOfSupply: s.billingAddress.state || "",
      gstTreatment: s.gstTreatment,
      paymentTerms: s.paymentTerms || undefined,
    }));
  }, [initialSuppliers]);

  const preselectedSupplier = preselectedSupplierId
    ? (formattedSuppliers.find((s) => s.id === preselectedSupplierId) || null)
    : null;

  const [supplierName, setSupplierName] = useState(
    preselectedSupplier?.name || "",
  );
  const [method, setMethod] = useState<SupplierPaymentMethod>("Other");
  const [amount, setAmount] = useState(0);
  const [paymentDate, setPaymentDate] = useState(getTodayDateString());
  const [reference, setReference] = useState("");
  const [notes, setNotes] = useState("");
  const [allocations, setAllocations] = useState<AllocationDraft[]>(() => {
    if (!preselectedSupplier) {
      return [];
    }
    return initialPayableBills
      .filter((bill) => bill.supplierId === preselectedSupplier.id)
      .map((bill) => ({
        purchaseBillId: bill.id,
        amount: bill.remainingBalance,
      }));
  });
  const [idempotencyKey] = useState(() => crypto.randomUUID());

  const selectedSupplier = formattedSuppliers.find(
    (s) => s.name === supplierName,
  );
  const supplierPayableBills = useMemo(() => {
    if (!selectedSupplier?.id) {
      return [];
    }
    return initialPayableBills.filter(
      (bill) => bill.supplierId === selectedSupplier.id,
    );
  }, [initialPayableBills, selectedSupplier]);

  const allocationTotal = allocatedTotal(allocations);

  const handleSupplierSelect = (supplier: SampleSupplier | null) => {
    setSupplierName(supplier?.name || "");
    setAllocations([]);
  };

  const handleToggleBill = (billId: string) => {
    setAllocations((prev) => {
      if (prev.some((line) => line.purchaseBillId === billId)) {
        return prev.filter((line) => line.purchaseBillId !== billId);
      }
      const bill = supplierPayableBills.find((b) => b.id === billId);
      return [
        ...prev,
        { purchaseBillId: billId, amount: bill?.remainingBalance || 0 },
      ];
    });
  };

  const handleAllocationAmountChange = (billId: string, value: number) => {
    setAllocations((prev) =>
      prev.map((line) =>
        line.purchaseBillId === billId ? { ...line, amount: value } : line,
      ),
    );
  };

  const handleSave = async () => {
    setSubmitError(null);
    const newErrors: Record<string, string> = {};

    if (!selectedSupplier?.id) {
      newErrors.supplier = "Please select a supplier.";
    }

    Object.assign(
      newErrors,
      validateSupplierPaymentAllocations(allocations),
    );

    if (roundCurrency(amount) !== allocationTotal) {
      newErrors.amount =
        "Payment amount must equal the sum of bill allocations.";
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      const firstKey = Object.keys(newErrors)[0];
      setSubmitError(newErrors[firstKey]);
      return;
    }

    setErrors({});
    setIsSubmitting(true);

    try {
      const res = await recordSupplierPaymentAction({
        supplierId: selectedSupplier!.id!,
        amount: roundCurrency(amount),
        paymentDate,
        method,
        reference: reference || undefined,
        notes: notes || undefined,
        idempotencyKey,
        allocations: allocations.map((line) => ({
          purchaseBillId: line.purchaseBillId,
          amount: roundCurrency(line.amount),
        })),
      });

      if (!res.success || !res.data) {
        if (res.fieldErrors) {
          setErrors(res.fieldErrors);
        }
        throw new Error(res.error || "Failed to record supplier payment.");
      }

      router.push(`/supplier-payments/${res.data.id}`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to save payment.";
      setSubmitError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section className="space-y-6">
      <div>
        <Link
          href="/supplier-payments"
          className="inline-flex items-center gap-1.5 text-xs font-medium text-text-secondary hover:text-text-primary transition-colors"
        >
          <ArrowLeft size={14} />
          Back to Supplier Payments
        </Link>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-text-primary">
            Record Supplier Payment
          </h1>
          <p className="mt-1 text-sm text-text-secondary">
            Pay posted purchase bills in full. The payment amount must equal
            the allocated total; overpayment is rejected.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 self-start sm:self-auto">
          <Button
            type="button"
            variant="primary"
            onClick={handleSave}
            disabled={isSubmitting}
            className="h-10 px-4 text-sm font-medium"
          >
            <WalletCards size={16} />
            <span>{isSubmitting ? "Saving..." : "Record Payment"}</span>
          </Button>
        </div>
      </div>

      {submitError && (
        <div
          className="flex items-center justify-between rounded-xl border border-danger/40 bg-danger/10 p-4 text-sm text-danger"
          role="alert"
        >
          <span>{submitError}</span>
          <Button
            type="button"
            variant="link"
            onClick={() => setSubmitError(null)}
            className="h-auto p-1 text-danger hover:text-danger/80"
            aria-label="Dismiss error"
          >
            <X size={16} />
          </Button>
        </div>
      )}

      <div className="space-y-6">
        <SupplierPaymentDetailsSection
          selectedSupplier={supplierName}
          onSelectSupplier={handleSupplierSelect}
          suppliers={formattedSuppliers}
          method={method}
          onMethodChange={setMethod}
          amount={amount}
          onAmountChange={setAmount}
          paymentDate={paymentDate}
          onPaymentDateChange={setPaymentDate}
          reference={reference}
          onReferenceChange={setReference}
          notes={notes}
          onNotesChange={setNotes}
          errors={errors}
        />

        <SupplierPaymentAllocationSection
          payableBills={supplierPayableBills}
          allocations={allocations}
          onToggleBill={handleToggleBill}
          onAllocationAmountChange={handleAllocationAmountChange}
          errors={errors}
        />

        <div className="flex flex-col-reverse sm:flex-row items-center justify-between gap-3 border-t border-border/80 pt-6">
          <Link
            href="/supplier-payments"
            className="inline-flex h-10 w-full sm:w-auto items-center justify-center gap-1.5 rounded-lg border border-border bg-surface-alt px-4 text-sm font-medium text-text-secondary transition-colors hover:border-text-muted hover:text-text-primary"
          >
            <X size={15} />
            <span>Cancel</span>
          </Link>

          <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
            <Button
              type="button"
              variant="primary"
              onClick={handleSave}
              disabled={isSubmitting}
              className="w-full sm:w-auto h-10 px-5 text-sm font-medium"
            >
              <CheckCircle2 size={16} />
              <span>{isSubmitting ? "Saving..." : "Record Payment"}</span>
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
};
