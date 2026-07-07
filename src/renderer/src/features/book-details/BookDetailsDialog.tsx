import type { Audiobook, AudiobookMarker } from "@shared/types";
import { Dialog, DialogBody, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { BookDetailsPanel } from "./BookDetailsPanel";

interface BookDetailsDialogProps {
  open: boolean;
  selectedBook?: Audiobook;
  statusMessage: string;
  onOpenChange: (open: boolean) => void;
  onRevealInFolder: (bookId: string) => void | Promise<void>;
  onRemoveBook: () => void | Promise<void>;
  onJumpToMarker: (marker: AudiobookMarker) => void | Promise<void>;
  onRemoveMarker: (marker: AudiobookMarker) => void | Promise<void>;
}

export function BookDetailsDialog({
  open,
  selectedBook,
  statusMessage,
  onOpenChange,
  onRevealInFolder,
  onRemoveBook,
  onJumpToMarker,
  onRemoveMarker
}: BookDetailsDialogProps) {
  async function handleJumpToMarker(marker: AudiobookMarker): Promise<void> {
    await onJumpToMarker(marker);
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Book details</DialogTitle>
          <DialogDescription>Review markers, file details, and library actions for the selected audiobook.</DialogDescription>
        </DialogHeader>
        <DialogBody>
          <BookDetailsPanel
            selectedBook={selectedBook}
            statusMessage={statusMessage}
            onRevealInFolder={onRevealInFolder}
            onRemoveBook={onRemoveBook}
            onJumpToMarker={handleJumpToMarker}
            onRemoveMarker={onRemoveMarker}
          />
        </DialogBody>
      </DialogContent>
    </Dialog>
  );
}
