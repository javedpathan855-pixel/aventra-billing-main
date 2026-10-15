import { Pagination, type PaginationProps } from "@/shared/components/table/Pagination";

export type RecurringPaginationProps = Omit<PaginationProps, "itemName">;

export const RecurringPagination = (props: RecurringPaginationProps) => (
  <Pagination {...props} itemName="schedules" />
);
