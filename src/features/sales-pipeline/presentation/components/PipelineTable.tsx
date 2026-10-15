import React from "react";
import Link from "next/link";
import { formatCurrency } from "@/shared/lib/money";
import { formatDate } from "@/shared/lib/date";
import type { SalesOpportunity } from "../../domain/entities/sales-opportunity";
import { isOpportunityOverdue } from "../../domain/rules/sales-pipeline-rules";
import { OpportunityStageBadge } from "./OpportunityStageBadge";
import { cn } from "@/shared/utils/cn";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableCell,
  TableHead,
} from "@/shared/components/table";
import { Button } from "@/shared/components/form";
import { Eye, AlertTriangle, Layers, Calendar } from "lucide-react";

export interface PipelineTableProps {
  opportunities: SalesOpportunity[];
}

export const PipelineTable = ({ opportunities }: PipelineTableProps) => {
  if (opportunities.length === 0) {
    return (
      <div className="rounded-xl border border-border bg-surface p-12 text-center shadow-xs">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-surface-alt text-text-muted">
          <Layers size={24} />
        </div>
        <h3 className="mt-4 text-base font-semibold text-text-primary">
          No opportunities found
        </h3>
        <p className="mx-auto mt-1 max-w-sm text-sm text-text-muted">
          No sales opportunities match your filters. Create a new opportunity to start tracking deals.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-surface shadow-xs">
      <Table>
        <TableHeader>
          <TableRow className="border-b border-border/80 bg-surface-alt/40 hover:bg-surface-alt/40">
            <TableHead className="font-semibold text-text-secondary">Deal / Title</TableHead>
            <TableHead className="font-semibold text-text-secondary">Customer</TableHead>
            <TableHead className="font-semibold text-text-secondary">Stage</TableHead>
            <TableHead className="text-right font-semibold text-text-secondary">Value</TableHead>
            <TableHead className="text-right font-semibold text-text-secondary">Prob. %</TableHead>
            <TableHead className="text-right font-semibold text-text-secondary">Weighted</TableHead>
            <TableHead className="font-semibold text-text-secondary">Expected Close</TableHead>
            <TableHead className="font-semibold text-text-secondary">Next Follow-Up</TableHead>
            <TableHead className="text-right font-semibold text-text-secondary">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {opportunities.map((opp) => {
            const overdue = isOpportunityOverdue(opp.nextFollowUpDate, opp.stage);

            return (
              <TableRow
                key={opp.id}
                className="transition-colors hover:bg-surface-alt/50"
              >
                {/* Title */}
                <TableCell className="font-medium text-text-primary">
                  <div className="flex flex-col">
                    <Link
                      href={`/sales-pipeline/${opp.id}`}
                      className="font-semibold text-text-primary hover:text-primary-light"
                    >
                      {opp.title}
                    </Link>
                    {opp.source && (
                      <span className="text-[11px] text-text-muted">
                        Source: {opp.source}
                      </span>
                    )}
                  </div>
                </TableCell>

                {/* Customer */}
                <TableCell className="text-text-secondary">
                  <div className="flex flex-col">
                    <span className="font-medium text-text-primary">{opp.customerName}</span>
                    {opp.contactPerson && (
                      <span className="text-[11px] text-text-muted">
                        Contact: {opp.contactPerson}
                      </span>
                    )}
                  </div>
                </TableCell>

                {/* Stage */}
                <TableCell>
                  <OpportunityStageBadge stage={opp.stage} />
                </TableCell>

                {/* Estimated Value */}
                <TableCell className="text-right font-bold text-text-primary">
                  {formatCurrency(opp.estimatedValue)}
                </TableCell>

                {/* Probability */}
                <TableCell className="text-right font-medium text-text-secondary">
                  {opp.probability}%
                </TableCell>

                {/* Weighted Value */}
                <TableCell className="text-right font-medium text-text-secondary">
                  {formatCurrency(opp.weightedValue)}
                </TableCell>

                {/* Expected Close */}
                <TableCell className="text-xs text-text-secondary">
                  {opp.expectedCloseDate ? (
                    <span className="flex items-center gap-1">
                      <Calendar size={12} className="text-text-muted" />
                      {formatDate(opp.expectedCloseDate)}
                    </span>
                  ) : (
                    <span className="text-text-muted">—</span>
                  )}
                </TableCell>

                {/* Next Follow-Up */}
                <TableCell className="text-xs">
                  {opp.nextFollowUpDate ? (
                    <div className="flex items-center gap-1">
                      {overdue && <AlertTriangle size={12} className="text-danger" />}
                      <span
                        className={cn(overdue ? "font-semibold text-danger" : "text-text-secondary")}
                      >
                        {formatDate(opp.nextFollowUpDate)}
                      </span>
                    </div>
                  ) : (
                    <span className="text-text-muted">—</span>
                  )}
                </TableCell>

                {/* Actions */}
                <TableCell className="text-right">
                  <Link href={`/sales-pipeline/${opp.id}`}>
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      className="h-8 px-2.5 text-xs font-medium"
                      title="View Opportunity"
                    >
                      <Eye size={14} />
                      View
                    </Button>
                  </Link>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
};
