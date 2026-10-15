import { notFound } from "next/navigation";
import { getPaymentById } from "@/features/payments/data/queries/get-payments";
import { PaymentDetailPage } from "@/features/payments/presentation/page/PaymentDetailPage";

export const dynamic = "force-dynamic";

type PaymentDetailRouteProps = {
  params: Promise<{ id: string }> | { id: string };
};

const PaymentDetailRoute = async ({ params }: PaymentDetailRouteProps) => {
  const resolvedParams = await params;
  const payment = await getPaymentById(resolvedParams.id);

  if (!payment) {
    notFound();
  }

  return <PaymentDetailPage initialPayment={payment} />;
};

export default PaymentDetailRoute;
