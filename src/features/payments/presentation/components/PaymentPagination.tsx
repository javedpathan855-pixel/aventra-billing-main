import { Pagination, type PaginationProps } from "@/shared/components/table/Pagination";

export type PaymentPaginationProps = Omit<PaginationProps, "itemName">;

export const PaymentPagination = (props: PaymentPaginationProps) => (
  <Pagination {...props} itemName="payments" />
);
