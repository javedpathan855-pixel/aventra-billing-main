import { getReturnableInvoices } from "@/features/sales-returns";
import { getSalesSettings, formatSalesReturnNumber } from "@/features/sales-settings";
import { SalesReturnCreatePage } from "@/features/sales-returns/presentation/page/SalesReturnCreatePage";

export const dynamic = "force-dynamic";

export default async function NewSalesReturnRoute() {
  const [returnableInvoices, salesSettings] = await Promise.all([
    getReturnableInvoices(),
    getSalesSettings(),
  ]);

  let previewNumber = "SR-0001";
  try {
    previewNumber = formatSalesReturnNumber({
      prefix: salesSettings.salesReturnPrefix,
      suffix: salesSettings.salesReturnSuffix,
      padding: salesSettings.salesReturnPadding,
      nextNumber: salesSettings.salesReturnNextNumber,
    });
  } catch {
    previewNumber = "SR-0001";
  }

  return (
    <SalesReturnCreatePage
      returnableInvoices={returnableInvoices}
      defaultNumberPreview={previewNumber}
      defaultReason={salesSettings.defaultReturnReason}
      defaultPolicy={salesSettings.defaultReturnPolicy}
    />
  );
}
