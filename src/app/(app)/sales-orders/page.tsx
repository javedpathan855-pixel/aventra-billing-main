import { getSalesOrders } from "@/features/sales-orders";
import { SalesOrderListPage } from "@/features/sales-orders/presentation/page/SalesOrderListPage";

export const dynamic = "force-dynamic";

export default async function SalesOrdersRoute() {
  const { orders, metrics } = await getSalesOrders();
  return <SalesOrderListPage initialOrders={orders} metrics={metrics} />;
}
