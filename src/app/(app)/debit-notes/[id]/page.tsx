import { notFound } from "next/navigation";
import { getDebitNoteById } from "@/features/debit-notes/data/queries/get-debit-note-by-id";
import { getSupplierTaxContext } from "@/features/invoices/data/queries/get-supplier-tax-context";
import { DebitNoteDetailPage } from "@/features/debit-notes/presentation/page/DebitNoteDetailPage";

export const dynamic = "force-dynamic";

type DebitNoteDetailRouteProps = {
  params: Promise<{ id: string }> | { id: string };
};

const DebitNoteDetailRoute = async ({ params }: DebitNoteDetailRouteProps) => {
  const resolvedParams = await params;
  const [debitNote, supplierTax] = await Promise.all([
    getDebitNoteById(resolvedParams.id),
    getSupplierTaxContext(),
  ]);

  if (!debitNote) {
    notFound();
  }

  return (
    <DebitNoteDetailPage
      initialDebitNote={debitNote}
      supplierName={supplierTax.organizationName}
    />
  );
};

export default DebitNoteDetailRoute;
