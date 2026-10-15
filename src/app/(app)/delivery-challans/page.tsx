import { getDeliveryChallans } from "@/features/delivery-challans";
import { DeliveryChallanListPage } from "@/features/delivery-challans/presentation/page/DeliveryChallanListPage";

export const dynamic = "force-dynamic";

export default async function DeliveryChallansRoute() {
  const challans = await getDeliveryChallans();
  return <DeliveryChallanListPage initialChallans={challans} />;
}
