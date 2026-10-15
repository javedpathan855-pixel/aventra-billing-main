import { getCustomers } from "@/features/customers/data/queries/get-customers";
import { getProducts } from "@/features/products/data/queries/get-products";
import { getRecurringScheduleById } from "@/features/recurring-schedules/data/queries/get-recurring-schedules";
import { getBillingSettings } from "@/features/billing-settings/data/queries/get-billing-settings";
import { getSupplierTaxContext } from "@/features/invoices/data/queries/get-supplier-tax-context";
import { RecurringScheduleCreatePage } from "@/features/recurring-schedules/presentation/page/RecurringScheduleCreatePage";

export const dynamic = "force-dynamic";

type NewRecurringSchedulePageProps = {
  searchParams?: Promise<{ edit?: string }> | { edit?: string };
};

const formatCustomerAddress = (billingAddress: {
  addressLine1?: string | null;
  addressLine2?: string | null;
  city?: string | null;
  state?: string | null;
  pinCode?: string | null;
}): string => {
  const parts = [
    billingAddress.addressLine1?.trim(),
    billingAddress.addressLine2?.trim(),
    billingAddress.city?.trim(),
    billingAddress.state?.trim(),
    billingAddress.pinCode?.trim(),
  ].filter(Boolean);
  return parts.join(", ");
};

const NewRecurringSchedulePage = async ({ searchParams }: NewRecurringSchedulePageProps) => {
  const resolvedParams = searchParams ? await searchParams : undefined;
  const editId = resolvedParams?.edit;

  const [{ customers }, { products }, supplierTax, invoiceSettings, recurringSettings, existing] =
    await Promise.all([
      getCustomers(),
      getProducts({ status: "ACTIVE" }),
      getSupplierTaxContext(),
      getBillingSettings("INVOICE"),
      getBillingSettings("RECURRING_INVOICE"),
      editId ? getRecurringScheduleById(editId) : Promise.resolve(null),
    ]);

  return (
    <RecurringScheduleCreatePage
      initialCustomers={customers.map((c) => ({
        id: c.id,
        name: c.name,
        email: c.email || "",
        address: formatCustomerAddress(c.billingAddress),
        gstin: c.gstin || "",
        placeOfSupply: c.placeOfSupply,
        paymentTerms: c.paymentTerms,
        contactPerson: c.contactPerson || undefined,
        phone: c.phone || undefined,
        pan: c.pan || undefined,
        state: c.billingAddress.state,
      }))}
      initialProducts={products.map((p) => ({
        id: p.id,
        name: p.name,
        type: p.type,
        sku: p.sku,
        description: p.description,
        sellingPrice: p.sellingPrice,
        hsnSac: p.hsnSac,
        taxRate: p.taxRate,
        unit: p.unit,
      }))}
      supplierState={supplierTax.state}
      supplierGstin={supplierTax.gstNumber}
      initialInvoiceNumber={invoiceSettings.previewNumber}
      initialDefaultNotes={recurringSettings.defaultNotes || ""}
      initialDefaultTerms={recurringSettings.defaultTerms || ""}
      existingSchedule={existing?.schedule ?? undefined}
    />
  );
};

export default NewRecurringSchedulePage;
