import { getRecurringSchedules } from "@/features/recurring-schedules/data/queries/get-recurring-schedules";
import { RecurringScheduleListPage } from "@/features/recurring-schedules/presentation/page/RecurringScheduleListPage";

export const dynamic = "force-dynamic";

const RecurringInvoicesRoute = async () => {
  const { schedules } = await getRecurringSchedules();
  return <RecurringScheduleListPage initialSchedules={schedules} />;
};

export default RecurringInvoicesRoute;
