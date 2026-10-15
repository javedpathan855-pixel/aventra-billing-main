import React from "react";
import { Search, LayoutGrid, List, Plus, AlertCircle } from "lucide-react";
import { Input, Select, Button } from "@/shared/components/form";
import { cn } from "@/shared/utils/cn";

export type PipelineViewMode = "kanban" | "table";

export interface PipelineFilterBarProps {
  searchQuery: string;
  onSearchChange: (val: string) => void;
  stageFilter: string;
  onStageChange: (val: string) => void;
  isOverdueOnly: boolean;
  onToggleOverdueOnly: () => void;
  viewMode: PipelineViewMode;
  onViewModeChange: (mode: PipelineViewMode) => void;
  onNewOpportunity: () => void;
}

const stageOptions = [
  { value: "all", label: "All Stages" },
  { value: "NEW_LEAD", label: "New Lead" },
  { value: "QUALIFIED", label: "Qualified" },
  { value: "PROPOSAL", label: "Proposal" },
  { value: "NEGOTIATION", label: "Negotiation" },
  { value: "WON", label: "Won" },
  { value: "LOST", label: "Lost" },
];

export const PipelineFilterBar = ({
  searchQuery,
  onSearchChange,
  stageFilter,
  onStageChange,
  isOverdueOnly,
  onToggleOverdueOnly,
  viewMode,
  onViewModeChange,
  onNewOpportunity,
}: PipelineFilterBarProps) => {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex flex-1 flex-col gap-3 sm:flex-row sm:items-center">
        {/* Search */}
        <div className="relative flex-1">
          <Search
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted"
          />
          <Input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search deals, contacts, company..."
            className="h-10 pl-9 text-sm"
          />
        </div>

        {/* Stage Filter */}
        <div className="w-full sm:w-48">
          <Select
            value={stageFilter}
            onChange={onStageChange}
            options={stageOptions}
            className="h-10 text-sm"
          />
        </div>

        {/* Overdue toggle */}
        <Button
          type="button"
          variant="secondary"
          size="md"
          onClick={onToggleOverdueOnly}
          className={cn(
            "h-10 px-3.5 text-xs font-medium whitespace-nowrap",
            isOverdueOnly &&
              "border-danger/30 bg-danger/10 text-danger hover:bg-danger/20",
          )}
        >
          <AlertCircle size={14} />
          Overdue Follow-ups
        </Button>
      </div>

      <div className="flex items-center gap-2">
        {/* View Mode Toggle */}
        <div className="flex items-center rounded-lg border border-border bg-surface p-0.5">
          <Button
            type="button"
            variant={viewMode === "kanban" ? "primary" : "secondary"}
            size="sm"
            onClick={() => onViewModeChange("kanban")}
            className={cn(
              "h-8 px-2.5 text-xs font-medium",
              viewMode !== "kanban" && "border-none text-text-muted hover:text-text-primary",
            )}
            title="Kanban Board View"
          >
            <LayoutGrid size={14} />
            Kanban
          </Button>
          <Button
            type="button"
            variant={viewMode === "table" ? "primary" : "secondary"}
            size="sm"
            onClick={() => onViewModeChange("table")}
            className={cn(
              "h-8 px-2.5 text-xs font-medium",
              viewMode !== "table" && "border-none text-text-muted hover:text-text-primary",
            )}
            title="Table View"
          >
            <List size={14} />
            Table
          </Button>
        </div>

        {/* New Opportunity */}
        <Button
          type="button"
          variant="primary"
          size="md"
          onClick={onNewOpportunity}
          className="h-10 px-4 text-sm font-medium whitespace-nowrap"
        >
          <Plus size={16} />
          New Opportunity
        </Button>
      </div>
    </div>
  );
};
