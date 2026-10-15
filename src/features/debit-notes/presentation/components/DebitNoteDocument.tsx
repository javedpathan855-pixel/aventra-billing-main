import {
  calculateDebitNoteTotals,
  formatDebitNoteCurrency,
  formatDebitNoteDate,
  lineSubtotal,
  type DebitNote,
} from "../../domain/debit-note";

export const DebitNoteDocument = ({
  debitNote,
  supplierName,
}: {
  debitNote: DebitNote;
  supplierName?: string;
}) => {
  const totals = calculateDebitNoteTotals(debitNote);

  return (
    <article
      className="overflow-hidden rounded-2xl bg-doc-paper text-doc-ink shadow-xl border border-doc-line/40"
      aria-label={`Debit note ${debitNote.debitNoteNumber} document`}
    >
      {/* Header */}
      <div className="bg-doc-header px-6 py-7 text-doc-header-text sm:px-10">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-doc-faint">
            {supplierName || "Aventra Billing"}
          </p>
          <span className="rounded-md border border-doc-line/60 bg-doc-paper/10 px-2.5 py-0.5 text-xs font-semibold uppercase tracking-widest text-doc-faint">
            Debit Note · {debitNote.status}
          </span>
        </div>
        <div className="mt-3 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 className="font-heading text-3xl font-bold">{debitNote.debitNoteNumber}</h2>
            <p className="mt-1 text-xs text-doc-faint">
              Reason: {debitNote.reason}
            </p>
          </div>
          <p className="text-sm text-doc-faint">
            Issued {formatDebitNoteDate(debitNote.issueDate)}
          </p>
        </div>
      </div>

      {/* Parties & References */}
      <div className="grid gap-6 px-6 py-7 sm:grid-cols-2 sm:px-10 border-b border-doc-line">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-doc-muted">
            Debited to
          </p>
          <p className="mt-2 font-semibold">{debitNote.customerName}</p>
          {debitNote.customerEmail && (
            <p className="text-sm text-doc-muted">{debitNote.customerEmail}</p>
          )}
          {debitNote.customerAddress && (
            <p className="text-sm text-doc-muted">{debitNote.customerAddress}</p>
          )}
          {debitNote.customerGstin && (
            <p className="text-sm text-doc-muted">GSTIN: {debitNote.customerGstin}</p>
          )}
          {debitNote.customerPlaceOfSupply && (
            <p className="text-sm text-doc-muted">
              Place of Supply: {debitNote.customerPlaceOfSupply}
            </p>
          )}
        </div>

        <div className="sm:text-right">
          <p className="text-xs font-semibold uppercase tracking-widest text-doc-muted">
            Original Invoice Reference
          </p>
          <p className="mt-2 text-base font-bold text-doc-ink">
            {debitNote.invoiceNumber || debitNote.invoiceId}
          </p>
          <p className="mt-1 text-xs text-doc-muted">
            Tax Treatment: {debitNote.taxMode === "IGST" ? "Inter-State (IGST)" : "Intra-State (CGST + SGST)"}
          </p>
        </div>
      </div>

      {/* Items Table */}
      <div className="overflow-x-auto px-6 sm:px-10">
        <table className="w-full min-w-[520px] text-sm">
          <thead>
            <tr className="border-b border-doc-line text-left text-xs uppercase tracking-widest text-doc-muted">
              <th className="py-3">Item / Description</th>
              <th className="py-3 text-right">Qty</th>
              <th className="py-3 text-right">Rate</th>
              <th className="py-3 text-right">Discount</th>
              <th className="py-3 text-right">Tax Rate</th>
              <th className="py-3 text-right">Debit Amount</th>
            </tr>
          </thead>
          <tbody>
            {debitNote.items.map((line) => (
              <tr key={line.id} className="border-b border-doc-line">
                <td className="py-4">
                  <p className="font-semibold">{line.item}</p>
                  {line.description && (
                    <p className="text-xs text-doc-muted">{line.description}</p>
                  )}
                  {line.hsnSac && (
                    <p className="text-[11px] text-doc-faint">HSN/SAC: {line.hsnSac}</p>
                  )}
                </td>
                <td className="py-4 text-right tabular-nums">{line.quantity}</td>
                <td className="py-4 text-right tabular-nums">
                  {formatDebitNoteCurrency(line.unitPrice)}
                </td>
                <td className="py-4 text-right tabular-nums">
                  {line.discount > 0 ? `${line.discount}%` : "—"}
                </td>
                <td className="py-4 text-right tabular-nums">{line.taxRate}%</td>
                <td className="py-4 text-right font-semibold tabular-nums">
                  {formatDebitNoteCurrency(lineSubtotal(line))}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Totals Section */}
      <div className="ml-auto max-w-sm space-y-3 px-6 py-7 sm:px-10">
        <div className="flex justify-between text-sm text-doc-muted">
          <span>Subtotal</span>
          <span>{formatDebitNoteCurrency(totals.subtotal)}</span>
        </div>
        {totals.discount > 0 && (
          <div className="flex justify-between text-sm text-doc-muted">
            <span>Discount</span>
            <span>−{formatDebitNoteCurrency(totals.discount)}</span>
          </div>
        )}
        <div className="flex justify-between text-sm text-doc-muted">
          <span>Taxable Value</span>
          <span>{formatDebitNoteCurrency(totals.taxable)}</span>
        </div>
        {debitNote.taxMode === "IGST" ? (
          <div className="flex justify-between text-sm text-doc-muted">
            <span>IGST</span>
            <span>{formatDebitNoteCurrency(totals.igst)}</span>
          </div>
        ) : (
          <>
            <div className="flex justify-between text-sm text-doc-muted">
              <span>CGST</span>
              <span>{formatDebitNoteCurrency(totals.cgst)}</span>
            </div>
            <div className="flex justify-between text-sm text-doc-muted">
              <span>SGST</span>
              <span>{formatDebitNoteCurrency(totals.sgst)}</span>
            </div>
          </>
        )}
        <div className="flex justify-between rounded-xl bg-doc-total-band px-4 py-4 text-lg font-bold">
          <span>Total Debit</span>
          <span>{formatDebitNoteCurrency(totals.total)}</span>
        </div>
      </div>

      {/* Notes & Terms */}
      {(debitNote.notes || debitNote.terms) && (
        <div className="grid gap-5 border-t border-doc-line bg-doc-card px-6 py-6 text-sm sm:grid-cols-2 sm:px-10">
          <div>
            <p className="font-semibold">Notes</p>
            <p className="mt-1 text-doc-muted">{debitNote.notes || "—"}</p>
          </div>
          <div>
            <p className="font-semibold">Terms</p>
            <p className="mt-1 text-doc-muted">{debitNote.terms || "—"}</p>
          </div>
        </div>
      )}
    </article>
  );
};
