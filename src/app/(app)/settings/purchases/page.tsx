import { getPurchaseSettings } from "@/features/purchase-settings";
import { PurchaseSettingsPage } from "@/features/purchase-settings/presentation/page/PurchaseSettingsPage";

export const dynamic = "force-dynamic";

export default async function PurchaseSettingsRoutePage() {
  const settings = await getPurchaseSettings();

  return <PurchaseSettingsPage initialSettings={settings} />;
}
