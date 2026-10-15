import { getSalesSettings } from "@/features/sales-settings";
import { SalesSettingsPage } from "@/features/sales-settings/presentation/page/SalesSettingsPage";

export const dynamic = "force-dynamic";

export default async function SalesSettingsRoutePage() {
  const settings = await getSalesSettings();

  return <SalesSettingsPage initialSettings={settings} />;
}
