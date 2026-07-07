import type { Audiobook, AudiobookMarker } from "@shared/types";
import { Dialog, DialogBody, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { MarkerComposer } from "./MarkerComposer";
import { MarkerListPanel } from "./MarkerListPanel";

interface MarkersDialogProps {
  open: boolean;
  selectedBook?: Audiobook;
  markerLabel: string;
  currentTime: number;
  onOpenChange: (open: boolean) => void;
  onMarkerLabelChange: (value: string) => void;
  onAddMarker: () => void | Promise<void>;
  onJumpToMarker: (marker: AudiobookMarker) => void | Promise<void>;
  onRemoveMarker: (marker: AudiobookMarker) => void | Promise<void>;
}

export function MarkersDialog({
  open,
  selectedBook,
  markerLabel,
  currentTime,
  onOpenChange,
  onMarkerLabelChange,
  onAddMarker,
  onJumpToMarker,
  onRemoveMarker
}: MarkersDialogProps) {
  async function handleJumpToMarker(marker: AudiobookMarker): Promise<void> {
    await onJumpToMarker(marker);
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle>Markers</DialogTitle>
          <DialogDescription>Save the current timestamp or jump back to a saved place.</DialogDescription>
        </DialogHeader>
        <DialogBody>
          <div className="grid gap-4 md:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
            <MarkerComposer
              selectedBook={selectedBook}
              markerLabel={markerLabel}
              currentTime={currentTime}
              onMarkerLabelChange={onMarkerLabelChange}
              onAddMarker={onAddMarker}
            />
            <MarkerListPanel selectedBook={selectedBook} onJumpToMarker={handleJumpToMarker} onRemoveMarker={onRemoveMarker} />
          </div>
        </DialogBody>
      </DialogContent>
    </Dialog>
  );
}
