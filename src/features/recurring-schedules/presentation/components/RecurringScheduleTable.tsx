import Link from "next/link";
import { Eye, Pencil } from "lucide-react";
import type { RecurringSchedule } from "../../domain/recurring-schedule";
import { RecurringStatusBadge } from "./RecurringStatusBadge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/shared/components/table/Table";

export type RecurringScheduleTableProps = {
  schedules: RecurringSchedule[];
};

export const RecurringScheduleTable = ({
  schedules,
}: RecurringScheduleTableProps) => (
  <div className="overflow-hidden rounded-xl border border-border bg-surface-card transition-colors">
    <Table className="min-w-[960px]">
      <TableHeader>
        <TableRow>
          <TableHead className="px-4 py-3.5">Schedule</TableHead>
          <TableHead className="px-4 py-3.5">Customer</TableHead>
          <TableHead className="px-4 py-3.5">Frequency</TableHead>
          <TableHead className="px-4 py-3.5">Next Run</TableHead>
          <TableHead className="px-4 py-3.5 text-right">Generated</TableHead>
          <TableHead className="px-4 py-3.5">Last Result</TableHead>
          <TableHead className="px-4 py-3.5">Status</TableHead>
          <TableHead className="px-4 py-3.5 text-right">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {schedules.map((schedule) => (
          <TableRow key={schedule.id} className="transition-colors hover:bg-surface-alt/40">
            <TableCell className="px-4 py-3.5 font-medium text-text-primary whitespace-nowrap">
              <Link
                href={`/recurring-invoices/${schedule.id}`}
                className="hover:text-primary-light transition-colors"
              >
                {schedule.name}
              </Link>
            </TableCell>
            <TableCell className="px-4 py-3.5">
              <p className="font-medium text-text-primary leading-snug">{schedule.customerName}</p>
            </TableCell>
            <TableCell className="px-4 py-3.5 text-text-secondary whitespace-nowrap">
              {schedule.frequency}
            </TableCell>
            <TableCell className="px-4 py-3.5 text-text-secondary whitespace-nowrap tabular-nums">
              {schedule.nextRunDate}
            </TableCell>
            <TableCell className="px-4 py-3.5 text-right font-medium text-text-primary whitespace-nowrap tabular-nums">
              {schedule.successCount}
            </TableCell>
            <TableCell className="px-4 py-3.5 text-text-secondary max-w-[220px] truncate">
              <span title={schedule.lastResult ?? ""}>{schedule.lastResult || "—"}</span>
            </TableCell>
            <TableCell className="px-4 py-3.5 whitespace-nowrap">
              <RecurringStatusBadge status={schedule.status} />
            </TableCell>
            <TableCell className="px-4 py-3.5 text-right whitespace-nowrap">
              <div className="flex items-center justify-end gap-1">
                <Link
                  href={`/recurring-invoices/${schedule.id}`}
                  aria-label={`View schedule ${schedule.name}`}
                  className="inline-flex h-8 w-8 items-center justify-center rounded-md text-text-secondary transition-colors hover:bg-surface-alt hover:text-text-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-focus"
                >
                  <Eye size={15} />
                </Link>
                {(schedule.status === "Active" || schedule.status === "Paused") && (
                  <Link
                    href={`/recurring-invoices/new?edit=${schedule.id}`}
                    aria-label={`Edit schedule ${schedule.name}`}
                    className="inline-flex h-8 w-8 items-center justify-center rounded-md text-text-secondary transition-colors hover:bg-surface-alt hover:text-text-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-focus"
                  >
                    <Pencil size={15} />
                  </Link>
                )}
              </div>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  </div>
);
