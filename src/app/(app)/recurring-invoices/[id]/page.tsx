import { notFound } from "next/navigation";
import { getRecurringScheduleById } from "@/features/recurring-schedules/data/queries/get-recurring-schedules";
import { RecurringScheduleDetailPage } from "@/features/recurring-schedules/presentation/page/RecurringScheduleDetailPage";

export const dynamic = "force-dynamic";

type RecurringScheduleDetailRouteProps = {
  params: Promise<{ id: string }> | { id: string };
};

const RecurringScheduleDetailRoute = async ({ params }: RecurringScheduleDetailRouteProps) => {
  const resolvedParams = await params;
  const detail = await getRecurringScheduleById(resolvedParams.id);

  if (!detail) {
    notFound();
  }

  return (
    <RecurringScheduleDetailPage
      initialSchedule={detail.schedule}
      initialOccurrences={detail.occurrences}
    />
  );
};

export default RecurringScheduleDetailRoute;
