import { getDebitNotes } from "@/features/debit-notes/data/queries/get-debit-notes";
import { DebitNoteListPage } from "@/features/debit-notes/presentation/page/DebitNoteListPage";

export const dynamic = "force-dynamic";

const DebitNotesRoute = async () => {
  const { debitNotes } = await getDebitNotes();
  return <DebitNoteListPage initialDebitNotes={debitNotes} />;
};

export default DebitNotesRoute;
