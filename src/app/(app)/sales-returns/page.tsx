import { getSalesReturns } from "@/features/sales-returns";
import { SalesReturnListPage } from "@/features/sales-returns/presentation/page/SalesReturnListPage";

export const dynamic = "force-dynamic";

export default async function SalesReturnsRoute() {
  const returns = await getSalesReturns();
  return <SalesReturnListPage initialReturns={returns} />;
}
