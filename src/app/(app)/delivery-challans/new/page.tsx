import { getDeliverableSalesOrders } from "@/features/delivery-challans";
import { getSalesSettings, formatDeliveryChallanNumber } from "@/features/sales-settings";
import { DeliveryChallanCreatePage } from "@/features/delivery-challans/presentation/page/DeliveryChallanCreatePage";

export const dynamic = "force-dynamic";

export default async function NewDeliveryChallanRoute() {
  const [deliverableOrders, salesSettings] = await Promise.all([
    getDeliverableSalesOrders(),
    getSalesSettings(),
  ]);

  let previewNumber = "DC-0001";
  try {
    previewNumber = formatDeliveryChallanNumber({
      prefix: salesSettings.deliveryChallanPrefix,
      suffix: salesSettings.deliveryChallanSuffix,
      padding: salesSettings.deliveryChallanPadding,
      nextNumber: salesSettings.deliveryChallanNextNumber,
    });
  } catch {
    previewNumber = "DC-0001";
  }

  return (
    <DeliveryChallanCreatePage
      deliverableOrders={deliverableOrders}
      defaultNumberPreview={previewNumber}
      defaultInstructions={salesSettings.defaultDeliveryInstructions}
      defaultTerms={salesSettings.defaultDeliveryTerms}
    />
  );
}
