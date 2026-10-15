import { getEligibleInvoicesForDebit } from "@/features/debit-notes/data/queries/get-eligible-invoices-for-debit";
import { getDebitNoteById } from "@/features/debit-notes/data/queries/get-debit-note-by-id";
import { getBillingSettings } from "@/features/billing-settings/data/queries/get-billing-settings";
import { getSupplierTaxContext } from "@/features/invoices/data/queries/get-supplier-tax-context";
import { DebitNoteCreatePage } from "@/features/debit-notes/presentation/page/DebitNoteCreatePage";

export const dynamic = "force-dynamic";

type NewDebitNotePageProps = {
  searchParams?:
    | Promise<{ invoiceId?: string; edit?: string }>
    | { invoiceId?: string; edit?: string };
};

const NewDebitNotePage = async ({ searchParams }: NewDebitNotePageProps) => {
  const resolvedParams = searchParams ? await searchParams : undefined;
  const rawInvoiceId = resolvedParams?.invoiceId;
  const editId = resolvedParams?.edit;

  const [existingDebitNote, billingSettings, supplierTax] = await Promise.all([
    editId ? getDebitNoteById(editId) : Promise.resolve(null),
    getBillingSettings("DEBIT_NOTE"),
    getSupplierTaxContext(),
  ]);

  const eligibleInvoices = await getEligibleInvoicesForDebit({
    includeInvoiceId: existingDebitNote?.invoiceId,
  });

  // Authoritative server-side validation of preselected invoice parameter
  const validPreselectedId =
    rawInvoiceId && eligibleInvoices.some((inv) => inv.id === rawInvoiceId)
      ? rawInvoiceId
      : undefined;

  return (
    <DebitNoteCreatePage
      eligibleInvoices={eligibleInvoices}
      preselectedInvoiceId={validPreselectedId}
      previewDebitNoteNumber={billingSettings.previewNumber}
      initialDefaultNotes={billingSettings.defaultNotes || ""}
      initialDefaultTerms={billingSettings.defaultTerms || ""}
      supplierName={supplierTax.organizationName}
      existingDebitNote={existingDebitNote ?? undefined}
    />
  );
};

export default NewDebitNotePage;
