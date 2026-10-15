import { CalendarDays } from "lucide-react";
import { DatePicker, Label, Select } from "@/shared/components/form";

export type SupplierFilterOption = {
  id: string;
  name: string;
};

export type PurchaseReportFilterBarProps = {
  fromDate: string;
  onFromDateChange: (date: string) => void;
  toDate: string;
  onToDateChange: (date: string) => void;
  supplierId: string;
  onSupplierChange: (supplierId: string) => void;
  suppliers?: SupplierFilterOption[];
};

export const PurchaseReportFilterBar = ({
  fromDate,
  onFromDateChange,
  toDate,
  onToDateChange,
  supplierId,
  onSupplierChange,
  suppliers = [],
}: PurchaseReportFilterBarProps) => {
  return (
    <div className="rounded-xl border border-border bg-surface-card p-5 sm:p-6 space-y-4">
      <div className="flex items-center gap-2 border-b border-border/60 pb-3">
        <CalendarDays size={18} className="text-primary-light" />
        <h2 className="text-base font-semibold text-text-primary">
          Report Filters
        </h2>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <div>
          <Label htmlFor="pr-from-date">From Date</Label>
          <DatePicker
            id="pr-from-date"
            value={fromDate}
            onChange={onFromDateChange}
            maxDate={toDate || undefined}
            className="mt-1.5"
          />
        </div>
        <div>
          <Label htmlFor="pr-to-date">To Date</Label>
          <DatePicker
            id="pr-to-date"
            value={toDate}
            onChange={onToDateChange}
            minDate={fromDate || undefined}
            className="mt-1.5"
          />
        </div>
        <div>
          <Label htmlFor="pr-supplier">Supplier</Label>
          <Select
            id="pr-supplier"
            value={supplierId}
            onChange={onSupplierChange}
            options={[
              { value: "all", label: "All Suppliers" },
              ...suppliers.map((s) => ({ value: s.id, label: s.name })),
            ]}
            className="mt-1.5 h-10 text-sm"
          />
        </div>
      </div>
    </div>
  );
};
