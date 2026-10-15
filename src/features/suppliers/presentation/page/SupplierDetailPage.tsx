"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import {
  ArrowLeft,
  Edit2,
  Mail,
  MapPin,
  Phone,
  Power,
  ShieldCheck,
  Trash2,
  Wallet,
} from "lucide-react";
import type { SupplierDto } from "../../data/dto/supplier-dto";
import {
  formatSupplierAddress,
  getSupplierInitials,
} from "../../domain/entities/supplier";
import { updateSupplierStatusAction } from "../../data/mutations/update-supplier-status";
import { deleteSupplierAction } from "../../data/mutations/delete-supplier";
import { Avatar } from "@/shared/components/Avatar";
import { Button } from "@/shared/components/form";
import { ConfirmDialog } from "@/shared/components/ConfirmDialog";

export type SupplierDetailPageProps = {
  supplier: SupplierDto;
};

export const SupplierDetailPage = ({ supplier }: SupplierDetailPageProps) => {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [actionError, setActionError] = useState<string | null>(null);
  const [statusDialogOpen, setStatusDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  const initials = getSupplierInitials(supplier.name);
  const isActive = supplier.status === "ACTIVE";
  const targetStatus = isActive ? "INACTIVE" : "ACTIVE";

  const handleStatusConfirm = () => {
    setActionError(null);
    startTransition(async () => {
      const res = await updateSupplierStatusAction(supplier.id, targetStatus);
      setStatusDialogOpen(false);
      if (!res.success) {
        setActionError(res.error || "Failed to update supplier status.");
        return;
      }
      router.refresh();
    });
  };

  const handleDeleteConfirm = () => {
    setActionError(null);
    startTransition(async () => {
      const res = await deleteSupplierAction(supplier.id);
      setDeleteDialogOpen(false);
      if (!res.success) {
        setActionError(res.error || "Failed to delete supplier.");
        return;
      }
      router.push("/suppliers");
    });
  };

  return (
    <div className="space-y-6">
      {/* Top Breadcrumb & Title */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div className="space-y-1">
          <Link
            href="/suppliers"
            className="inline-flex items-center gap-1.5 text-xs font-medium text-text-muted hover:text-text-primary transition-colors"
          >
            <ArrowLeft size={14} />
            <span>Back to Suppliers</span>
          </Link>
          <div className="flex items-center gap-3 pt-1">
            <Avatar
              label={initials}
              className="h-10 w-10 border border-border/80 bg-surface-alt text-sm font-bold text-primary-light"
            />
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold tracking-tight text-text-primary">
                  {supplier.name}
                </h1>
                <span
                  className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${
                    isActive
                      ? "bg-success/15 text-success"
                      : "border border-border/80 bg-surface-alt text-text-muted"
                  }`}
                >
                  <span
                    className={`h-1.5 w-1.5 rounded-full ${
                      isActive ? "bg-success" : "bg-text-muted"
                    }`}
                    aria-hidden="true"
                  />
                  {isActive ? "Active" : "Inactive"}
                </span>
                {supplier.gstin && (
                  <span className="inline-flex items-center rounded-md border border-border/80 bg-surface-alt px-2.5 py-0.5 font-mono text-xs font-medium text-text-secondary">
                    {supplier.gstin}
                  </span>
                )}
              </div>
              <p className="text-xs text-text-muted">
                Created {new Date(supplier.createdAt).toLocaleDateString()}
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="secondary"
            disabled={isPending}
            onClick={() => setStatusDialogOpen(true)}
            className="h-10 px-4 text-sm"
            aria-label={isActive ? "Deactivate supplier" : "Activate supplier"}
          >
            <Power size={16} />
            <span>{isActive ? "Deactivate" : "Activate"}</span>
          </Button>
          <Button
            type="button"
            variant="secondary"
            disabled={isPending}
            onClick={() => setDeleteDialogOpen(true)}
            className="h-10 px-4 text-sm text-danger hover:text-danger"
            aria-label={`Delete ${supplier.name}`}
          >
            <Trash2 size={16} />
            <span>Delete</span>
          </Button>
          <Link
            href={`/suppliers/${supplier.id}/edit`}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground shadow-xs transition-colors hover:bg-primary-light focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
          >
            <Edit2 size={16} />
            <span>Edit Supplier</span>
          </Link>
        </div>
      </div>

      {/* Action Error Banner */}
      {actionError && (
        <div
          role="alert"
          className="rounded-lg border border-danger/40 bg-danger/10 px-4 py-3 text-sm text-danger"
        >
          {actionError}
        </div>
      )}

      {/* Grid of Details Sections */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Contact Information */}
        <div className="rounded-xl border border-border bg-surface-card p-5 sm:p-6 space-y-4">
          <div className="flex items-center gap-3 border-b border-border/60 pb-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-surface-alt text-primary-light">
              <Phone size={18} />
            </div>
            <h2 className="text-base font-semibold text-text-primary">
              Contact Information
            </h2>
          </div>
          <dl className="space-y-3 text-sm">
            <div className="flex justify-between gap-4">
              <dt className="text-text-muted">Contact person</dt>
              <dd className="font-medium text-text-primary">
                {supplier.contactPerson || "—"}
              </dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-text-muted">Email</dt>
              <dd className="font-medium text-text-primary">
                {supplier.email ? (
                  <a
                    href={`mailto:${supplier.email}`}
                    className="hover:underline text-primary-light"
                  >
                    {supplier.email}
                  </a>
                ) : (
                  "—"
                )}
              </dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-text-muted">Phone</dt>
              <dd className="font-medium text-text-primary">
                {supplier.phone || "—"}
              </dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-text-muted">Alternate phone</dt>
              <dd className="font-medium text-text-primary">
                {supplier.alternatePhone || "—"}
              </dd>
            </div>
          </dl>
        </div>

        {/* Tax & Compliance */}
        <div className="rounded-xl border border-border bg-surface-card p-5 sm:p-6 space-y-4">
          <div className="flex items-center gap-3 border-b border-border/60 pb-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-surface-alt text-primary-light">
              <ShieldCheck size={18} />
            </div>
            <h2 className="text-base font-semibold text-text-primary">
              Tax &amp; Compliance
            </h2>
          </div>
          <dl className="space-y-3 text-sm">
            <div className="flex justify-between gap-4">
              <dt className="text-text-muted">GST treatment</dt>
              <dd className="font-medium text-text-primary">
                {supplier.gstTreatment.replace(/_/g, " ")}
              </dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-text-muted">GSTIN</dt>
              <dd className="font-mono font-medium text-text-primary">
                {supplier.gstin || "—"}
              </dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-text-muted">PAN</dt>
              <dd className="font-mono font-medium text-text-primary">
                {supplier.pan || "—"}
              </dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-text-muted">Currency</dt>
              <dd className="font-medium text-text-primary">{supplier.currency}</dd>
            </div>
          </dl>
        </div>

        {/* Addresses */}
        <div className="rounded-xl border border-border bg-surface-card p-5 sm:p-6 space-y-4">
          <div className="flex items-center gap-3 border-b border-border/60 pb-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-surface-alt text-primary-light">
              <MapPin size={18} />
            </div>
            <h2 className="text-base font-semibold text-text-primary">Addresses</h2>
          </div>
          <div className="space-y-3 text-sm">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-text-muted">
                Billing address
              </p>
              <p className="mt-1 text-text-primary">
                {formatSupplierAddress(supplier.billingAddress) || "—"}
              </p>
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-text-muted">
                Shipping address
                {supplier.sameAsBillingAddress && (
                  <span className="ml-2 normal-case text-text-muted">
                    (same as billing)
                  </span>
                )}
              </p>
              <p className="mt-1 text-text-primary">
                {formatSupplierAddress(supplier.shippingAddress) || "—"}
              </p>
            </div>
          </div>
        </div>

        {/* Commercial Terms & Notes */}
        <div className="rounded-xl border border-border bg-surface-card p-5 sm:p-6 space-y-4">
          <div className="flex items-center gap-3 border-b border-border/60 pb-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-surface-alt text-primary-light">
              <Wallet size={18} />
            </div>
            <h2 className="text-base font-semibold text-text-primary">
              Commercial Terms &amp; Notes
            </h2>
          </div>
          <dl className="space-y-3 text-sm">
            <div className="flex justify-between gap-4">
              <dt className="text-text-muted">Payment terms</dt>
              <dd className="font-medium text-text-primary">
                {supplier.paymentTerms || "—"}
              </dd>
            </div>
          </dl>
          <div>
            <p className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-text-muted">
              <Mail size={13} />
              Internal notes
            </p>
            <p className="mt-1 whitespace-pre-wrap text-sm text-text-primary">
              {supplier.internalNotes || "—"}
            </p>
          </div>
        </div>
      </div>

      {/* Status Change Confirmation */}
      <ConfirmDialog
        open={statusDialogOpen}
        title={isActive ? "Deactivate supplier?" : "Activate supplier?"}
        description={
          isActive
            ? `${supplier.name} will be marked inactive and hidden from new purchase workflows. Existing records are preserved.`
            : `${supplier.name} will be marked active again.`
        }
        confirmLabel={isActive ? "Deactivate" : "Activate"}
        variant={isActive ? "danger" : "primary"}
        isConfirming={isPending}
        onConfirm={handleStatusConfirm}
        onClose={() => setStatusDialogOpen(false)}
      />

      {/* Delete Confirmation */}
      <ConfirmDialog
        open={deleteDialogOpen}
        title={`Delete ${supplier.name}?`}
        description="This permanently removes the supplier record. This action cannot be undone."
        confirmLabel="Delete"
        variant="danger"
        isConfirming={isPending}
        onConfirm={handleDeleteConfirm}
        onClose={() => setDeleteDialogOpen(false)}
      />
    </div>
  );
};
