import Link from "next/link";
import { Eye, Pencil } from "lucide-react";
import {
  formatDebitNoteCurrency,
  formatDebitNoteDate,
  type DebitNote,
} from "../../domain/debit-note";
import { DebitNoteStatusBadge } from "./DebitNoteStatusBadge";
import { cn } from "@/shared/utils/cn";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/shared/components/table/Table";
import { Checkbox } from "@/shared/components/form/Checkbox";

export type DebitNoteTableProps = {
  debitNotes: DebitNote[];
  selectedIds: Set<string>;
  onToggleSelect: (id: string) => void;
  onToggleSelectAll: () => void;
  allOnPageSelected: boolean;
};

export const DebitNoteTable = ({
  debitNotes,
  selectedIds,
  onToggleSelect,
  onToggleSelectAll,
  allOnPageSelected,
}: DebitNoteTableProps) => (
  <div className="overflow-hidden rounded-xl border border-border bg-surface-card transition-colors">
    <Table className="min-w-[960px]">
      <TableHeader>
        <TableRow>
          <TableHead className="w-12 px-4 py-3.5 text-center">
            <label htmlFor="select-all-debit-notes" className="sr-only">
              Select all debit notes on this page
            </label>
            <Checkbox
              id="select-all-debit-notes"
              checked={allOnPageSelected && debitNotes.length > 0}
              onChange={onToggleSelectAll}
              className="rounded border-border bg-input transition-colors focus:ring-focus"
            />
          </TableHead>
          <TableHead className="px-4 py-3.5">Debit Note No.</TableHead>
          <TableHead className="px-4 py-3.5">Original Invoice</TableHead>
          <TableHead className="px-4 py-3.5">Customer</TableHead>
          <TableHead className="px-4 py-3.5">Issue Date</TableHead>
          <TableHead className="px-4 py-3.5">Reason</TableHead>
          <TableHead className="px-4 py-3.5 text-right">Amount</TableHead>
          <TableHead className="px-4 py-3.5">Status</TableHead>
          <TableHead className="px-4 py-3.5 text-right">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {debitNotes.map((note) => {
          const isSelected = selectedIds.has(note.id);

          return (
            <TableRow
              key={note.id}
              className={cn(
                "transition-colors",
                isSelected
                  ? "bg-surface-alt/50 hover:bg-surface-alt/70"
                  : "hover:bg-surface-alt/40",
              )}
            >
              {/* Checkbox */}
              <TableCell className="w-12 px-4 py-3.5 text-center">
                <label htmlFor={`select-debit-note-${note.id}`} className="sr-only">
                  Select debit note {note.debitNoteNumber}
                </label>
                <Checkbox
                  id={`select-debit-note-${note.id}`}
                  checked={isSelected}
                  onChange={() => onToggleSelect(note.id)}
                  className="rounded border-border bg-input transition-colors focus:ring-focus"
                />
              </TableCell>

              {/* Debit Note Number */}
              <TableCell className="px-4 py-3.5 font-medium text-text-primary whitespace-nowrap">
                <Link
                  href={`/debit-notes/${note.id}`}
                  className="hover:text-primary-light transition-colors"
                >
                  {note.debitNoteNumber}
                </Link>
              </TableCell>

              {/* Original Invoice */}
              <TableCell className="px-4 py-3.5 whitespace-nowrap">
                <Link
                  href={`/invoices/${note.invoiceId}`}
                  className="text-primary-light hover:underline font-medium text-xs sm:text-sm"
                >
                  {note.invoiceNumber || "View Invoice"}
                </Link>
              </TableCell>

              {/* Customer */}
              <TableCell className="px-4 py-3.5">
                <p className="font-medium text-text-primary leading-snug">{note.customerName}</p>
                {note.customerEmail && (
                  <p className="text-xs text-text-muted leading-tight mt-0.5">
                    {note.customerEmail}
                  </p>
                )}
              </TableCell>

              {/* Issue Date */}
              <TableCell className="px-4 py-3.5 text-text-secondary whitespace-nowrap">
                {formatDebitNoteDate(note.issueDate)}
              </TableCell>

              {/* Reason */}
              <TableCell className="px-4 py-3.5 text-text-secondary max-w-[180px] truncate">
                <span title={note.reason}>{note.reason}</span>
              </TableCell>

              {/* Amount */}
              <TableCell className="px-4 py-3.5 text-right font-medium text-text-primary whitespace-nowrap tabular-nums">
                {formatDebitNoteCurrency(note.total)}
              </TableCell>

              {/* Status */}
              <TableCell className="px-4 py-3.5 whitespace-nowrap">
                <DebitNoteStatusBadge status={note.status} />
              </TableCell>

              {/* Actions */}
              <TableCell className="px-4 py-3.5 text-right whitespace-nowrap">
                <div className="flex items-center justify-end gap-1">
                  <Link
                    href={`/debit-notes/${note.id}`}
                    aria-label={`View debit note ${note.debitNoteNumber}`}
                    className="inline-flex h-8 w-8 items-center justify-center rounded-md text-text-secondary transition-colors hover:bg-surface-alt hover:text-text-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-focus"
                  >
                    <Eye size={15} />
                  </Link>
                  {note.status === "Draft" && (
                    <Link
                      href={`/debit-notes/new?edit=${note.id}`}
                      aria-label={`Edit draft debit note ${note.debitNoteNumber}`}
                      className="inline-flex h-8 w-8 items-center justify-center rounded-md text-text-secondary transition-colors hover:bg-surface-alt hover:text-text-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-focus"
                    >
                      <Pencil size={15} />
                    </Link>
                  )}
                </div>
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  </div>
);
