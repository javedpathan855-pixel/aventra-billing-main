import { getCustomers } from "@/features/customers/data/queries/get-customers";
import { getPayableInvoices } from "@/features/payments/data/queries/get-payable-invoices";
import { PaymentCreatePage } from "@/features/payments/presentation/page/PaymentCreatePage";

export const dynamic = "force-dynamic";

type NewPaymentPageProps = {
  searchParams?: Promise<{ invoiceId?: string; customerId?: string }> | { invoiceId?: string; customerId?: string };
};

const NewPaymentPage = async ({ searchParams }: NewPaymentPageProps) => {
  const resolvedParams = searchParams ? await searchParams : undefined;
  const rawInvoiceId = resolvedParams?.invoiceId;
  const rawCustomerId = resolvedParams?.customerId;

  const [{ customers }] = await Promise.all([getCustomers()]);

  // Authoritative server-side validation of preselected references.
  const customerIds = new Set(customers.map((c) => c.id));
  const validCustomerId =
    rawCustomerId && customerIds.has(rawCustomerId) ? rawCustomerId : undefined;

  const eligibleInvoices = await getPayableInvoices({
    customerId: validCustomerId,
  });
  const validInvoiceId =
    rawInvoiceId && eligibleInvoices.some((inv) => inv.id === rawInvoiceId)
      ? rawInvoiceId
      : undefined;
  const impliedCustomerId =
    validCustomerId ??
    eligibleInvoices.find((inv) => inv.id === validInvoiceId)?.customerId;

  return (
    <PaymentCreatePage
      initialCustomers={customers.map((c) => ({
        id: c.id,
        name: c.name,
        email: c.email || "",
      }))}
      initialInvoices={eligibleInvoices}
      preselectedInvoiceId={validInvoiceId}
      preselectedCustomerId={impliedCustomerId}
    />
  );
};

export default NewPaymentPage;
