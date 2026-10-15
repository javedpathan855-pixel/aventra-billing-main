"use client";

import React, { useState, useTransition, useMemo } from "react";
import { useRouter } from "next/navigation";
import type {
  SalesOpportunity,
  OpportunityMetrics,
  OpportunityStage,
} from "../../domain/entities/sales-opportunity";
import {
  isOpportunityOverdue,
  calculatePipelineMetrics,
} from "../../domain/rules/sales-pipeline-rules";
import { PipelineMetricsCards } from "../components/PipelineMetricsCards";
import {
  PipelineFilterBar,
  type PipelineViewMode,
} from "../components/PipelineFilterBar";
import { PipelineKanbanBoard } from "../components/PipelineKanbanBoard";
import { PipelineTable } from "../components/PipelineTable";
import { MarkLostModal } from "../components/MarkLostModal";
import { updateOpportunityStageAction } from "../../data/mutations/update-opportunity-stage";

export interface SalesPipelinePageProps {
  initialOpportunities: SalesOpportunity[];
  initialMetrics: OpportunityMetrics;
}

export const SalesPipelinePage = ({
  initialOpportunities,
}: SalesPipelinePageProps) => {
  const router = useRouter();
  const [, startTransition] = useTransition();

  const [opportunities, setOpportunities] = useState<SalesOpportunity[]>(initialOpportunities);
  const metrics = useMemo(
    () => calculatePipelineMetrics(opportunities),
    [opportunities],
  );

  const [searchQuery, setSearchQuery] = useState("");
  const [stageFilter, setStageFilter] = useState("all");
  const [isOverdueOnly, setIsOverdueOnly] = useState(false);
  const [viewMode, setViewMode] = useState<PipelineViewMode>("kanban");

  // Modals state
  const [lostModalOpp, setLostModalOpp] = useState<SalesOpportunity | null>(null);

  // Filtered opportunities
  const filteredOpportunities = useMemo(() => {
    return opportunities.filter((opp) => {
      // Search
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchesTitle = opp.title.toLowerCase().includes(query);
        const matchesCustomer = opp.customerName.toLowerCase().includes(query);
        const matchesContact = opp.contactPerson?.toLowerCase().includes(query) ?? false;
        if (!matchesTitle && !matchesCustomer && !matchesContact) return false;
      }

      // Stage
      if (stageFilter !== "all" && opp.stage !== stageFilter) {
        return false;
      }

      // Overdue
      if (isOverdueOnly) {
        if (!isOpportunityOverdue(opp.nextFollowUpDate, opp.stage)) {
          return false;
        }
      }

      return true;
    });
  }, [opportunities, searchQuery, stageFilter, isOverdueOnly]);

  const handleQuickMoveStage = async (
    opp: SalesOpportunity,
    newStage: OpportunityStage,
  ) => {
    if (newStage === "LOST") {
      setLostModalOpp(opp);
      return;
    }

    const res = await updateOpportunityStageAction(opp.id, {
      stage: newStage,
    });

    if (res.success && res.data) {
      const updated = res.data;
      setOpportunities((prev) =>
        prev.map((o) => (o.id === updated.id ? updated : o)),
      );
      startTransition(() => {
        router.refresh();
      });
    }
  };

  const handleConfirmLost = async (oppId: string, lossReason: string) => {
    const res = await updateOpportunityStageAction(oppId, {
      stage: "LOST",
      lossReason,
    });

    if (res.success && res.data) {
      const updated = res.data;
      setOpportunities((prev) =>
        prev.map((o) => (o.id === updated.id ? updated : o)),
      );
      startTransition(() => {
        router.refresh();
      });
      return { success: true };
    }
    return { success: false, error: res.error };
  };

  return (
    <div className="flex w-full flex-col gap-6 p-6">
      {/* Header */}
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold tracking-tight text-text-primary">
          Sales Pipeline & Opportunities
        </h1>
        <p className="text-sm text-text-muted">
          Manage deal stages, forecast revenue probabilities, track customer opportunities, and prevent overdue follow-ups.
        </p>
      </div>

      {/* KPI Cards */}
      <PipelineMetricsCards metrics={metrics} />

      {/* Filter and View Controls Bar */}
      <PipelineFilterBar
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        stageFilter={stageFilter}
        onStageChange={setStageFilter}
        isOverdueOnly={isOverdueOnly}
        onToggleOverdueOnly={() => setIsOverdueOnly((prev) => !prev)}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        onNewOpportunity={() => router.push("/sales-pipeline/new")}
      />

      {/* Main Content: Kanban or Table */}
      {viewMode === "kanban" ? (
        <PipelineKanbanBoard
          opportunities={filteredOpportunities}
          onQuickMoveStage={handleQuickMoveStage}
          onOpenLostModal={(opp) => setLostModalOpp(opp)}
        />
      ) : (
        <PipelineTable opportunities={filteredOpportunities} />
      )}

      {/* Mark as Lost Modal */}
      <MarkLostModal
        isOpen={!!lostModalOpp}
        opportunity={lostModalOpp}
        onClose={() => setLostModalOpp(null)}
        onConfirm={handleConfirmLost}
      />
    </div>
  );
};
