import { Search } from "lucide-react";
import { Input, Select } from "@/shared/components/form";

export type SalesOrderFilterBarProps = {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  statusFilter: string;
  onStatusChange: (status: string) => void;
};

const statusOptions = [
  { value: "all", label: "All Statuses" },
  { value: "Draft", label: "Draft" },
  { value: "Confirmed", label: "Confirmed" },
  { value: "PartiallyFulfilled", label: "Partially Fulfilled" },
  { value: "Fulfilled", label: "Fulfilled" },
  { value: "Cancelled", label: "Cancelled" },
];

export const SalesOrderFilterBar = ({
  searchQuery,
  onSearchChange,
  statusFilter,
  onStatusChange,
}: SalesOrderFilterBarProps) => {
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
          placeholder="Search by order #, customer, reference..."
          className="pl-9 h-10 text-sm"
        />
      </div>

      {/* Status Filter */}
      <div className="w-full sm:w-52">
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
