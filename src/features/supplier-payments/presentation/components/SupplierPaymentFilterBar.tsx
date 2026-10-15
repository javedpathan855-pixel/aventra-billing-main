import { Search } from "lucide-react";
import { Input, Select } from "@/shared/components/form";
import { SUPPLIER_PAYMENT_METHODS } from "../../domain/supplier-payment";

export type SupplierPaymentFilterBarProps = {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  statusFilter: string;
  onStatusChange: (status: string) => void;
  methodFilter: string;
  onMethodChange: (method: string) => void;
};

const statusOptions = [
  { value: "all", label: "All Statuses" },
  { value: "Active", label: "Active" },
  { value: "Reversed", label: "Reversed" },
];

export const SupplierPaymentFilterBar = ({
  searchQuery,
  onSearchChange,
  statusFilter,
  onStatusChange,
  methodFilter,
  onMethodChange,
}: SupplierPaymentFilterBarProps) => {
  return (
    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
      {/* Search Input */}
      <div className="relative flex-1">
        <Search
          size={16}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted"
        />
        <Input
          type="text"
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Search by supplier, reference, notes..."
          className="pl-9 h-10 text-sm"
        />
      </div>

      {/* Method Filter */}
      <div className="w-full sm:w-48">
        <Select
          value={methodFilter}
          onChange={onMethodChange}
          options={[
            { value: "all", label: "All Methods" },
            ...SUPPLIER_PAYMENT_METHODS.map((method) => ({
              value: method,
              label: method,
            })),
          ]}
          className="h-10 text-sm"
        />
      </div>

      {/* Status Filter */}
      <div className="w-full sm:w-44">
        <Select
          value={statusFilter}
          onChange={onStatusChange}
          options={statusOptions}
          className="h-10 text-sm"
        />
      </div>
    </div>
  );
};
