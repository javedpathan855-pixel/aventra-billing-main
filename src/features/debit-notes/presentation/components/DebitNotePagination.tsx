import { Pagination, type PaginationProps } from "@/shared/components/table/Pagination";

export type DebitNotePaginationProps = Omit<PaginationProps, "itemName">;

export const DebitNotePagination = (props: DebitNotePaginationProps) => (
  <Pagination {...props} itemName="debit notes" />
);
