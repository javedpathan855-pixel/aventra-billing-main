import { getPayments } from "@/features/payments/data/queries/get-payments";
import { PaymentListPage } from "@/features/payments/presentation/page/PaymentListPage";

export const dynamic = "force-dynamic";

const PaymentsRoute = async () => {
  const { payments } = await getPayments();
  return <PaymentListPage initialPayments={payments} />;
};

export default PaymentsRoute;
