import { notFound } from "next/navigation";
import { getInvoiceById } from "@/features/invoices/data/queries/get-invoice-by-id";
import { getCreditNotes } from "@/features/credit-notes/data/queries/get-credit-notes";
import { getDebitNotes } from "@/features/debit-notes/data/queries/get-debit-notes";
import { getPaymentsForInvoice } from "@/features/payments/data/queries/get-payments";
import { InvoiceDetailPage } from "@/features/invoices/presentation/page/InvoiceDetailPage";

export const dynamic = "force-dynamic";

type InvoiceDetailRouteProps = {
  params: Promise<{ id: string }> | { id: string };
};

const InvoiceDetailRoute = async ({ params }: InvoiceDetailRouteProps) => {
  const resolvedParams = await params;
  const invoice = await getInvoiceById(resolvedParams.id);

  if (!invoice) {
    notFound();
  }

  const { creditNotes } = await getCreditNotes({ invoiceId: invoice.id });
  const relatedCreditNotes = creditNotes.map((cn) => ({
    id: cn.id,
    creditNoteNumber: cn.creditNoteNumber,
    issueDate: cn.issueDate,
    total: cn.total,
    status: cn.status,
  }));

  const { debitNotes } = await getDebitNotes({ invoiceId: invoice.id });
  const relatedDebitNotes = debitNotes.map((dn) => ({
    id: dn.id,
    debitNoteNumber: dn.debitNoteNumber,
    issueDate: dn.issueDate,
    total: dn.total,
    status: dn.status,
  }));

  const relatedPayments = await getPaymentsForInvoice(invoice.id);

  return (
    <InvoiceDetailPage
      initialInvoice={invoice}
      relatedCreditNotes={relatedCreditNotes}
      relatedDebitNotes={relatedDebitNotes}
      relatedPayments={relatedPayments.map((payment) => ({
        id: payment.id,
        customerName: payment.customerName,
        paymentDate: payment.paymentDate,
        amount: payment.amount,
        allocatedAmount: payment.allocations
          .filter((line) => line.invoiceId === invoice.id)
          .reduce((sum, line) => sum + line.amount, 0),
        status: payment.status,
      }))}
    />
  );
};

export default InvoiceDetailRoute;

